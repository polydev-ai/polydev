import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { detectClientSource, getExcludedProviders } from '@/lib/client-detection'

interface ValidationRequest {
  model_ids: string[]
  perspective_count?: number // If not provided, defaults to model_ids.length
}

interface ValidationWarning {
  model_id: string
  model_name: string
  issue: 'quota_exceeded' | 'not_available' | 'requires_upgrade' | 'provider_excluded'
  suggested_alternative?: {
    model_id: string
    model_name: string
    tier: string
  }
  message: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Detect client source automatically from headers
    const clientSource = detectClientSource(request)

    const body: ValidationRequest = await request.json()
    const { model_ids, perspective_count } = body

    if (!model_ids || model_ids.length === 0) {
      return NextResponse.json({ error: 'model_ids is required' }, { status: 400 })
    }

    const requestedCount = perspective_count || model_ids.length

    // Step 1: Get user quotas
    const { data: quotaData } = await supabase
      .from('user_perspective_quotas')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!quotaData) {
      return NextResponse.json({ error: 'User quotas not found' }, { status: 404 })
    }

    const quotas = {
      premium: {
        total: quotaData.premium_perspectives_limit,
        used: quotaData.premium_perspectives_used,
        remaining: quotaData.premium_perspectives_limit - quotaData.premium_perspectives_used
      },
      normal: {
        total: quotaData.normal_perspectives_limit,
        used: quotaData.normal_perspectives_used,
        remaining: quotaData.normal_perspectives_limit - quotaData.normal_perspectives_used
      },
      eco: {
        total: quotaData.eco_perspectives_limit,
        used: quotaData.eco_perspectives_used,
        remaining: quotaData.eco_perspectives_limit - quotaData.eco_perspectives_used
      }
    }

    // Step 2: Get requested models details
    const { data: models } = await supabase
      .from('model_tiers')
      .select('*')
      .in('id', model_ids)

    if (!models || models.length === 0) {
      return NextResponse.json({ error: 'No valid models found' }, { status: 404 })
    }

    // Step 3: Get user's CLI and API key availability
    const { data: cliConfigs } = await supabase
      .from('cli_provider_configurations')
      .select('provider, enabled, status')
      .eq('user_id', user.id)
      .eq('enabled', true)

    const cliAvailable = new Set(
      cliConfigs
        ?.filter(c => c.status === 'available')
        .map(c => c.provider.toLowerCase()) || []
    )

    const { data: userApiKeys } = await supabase
      .from('user_api_keys')
      .select('provider')
      .eq('user_id', user.id)
      .eq('is_admin_key', false)
      .eq('active', true)

    const userKeysAvailable = new Set(
      userApiKeys?.map(k => k.provider.toLowerCase()) || []
    )

    // Step 4: Determine provider exclusions based on client source
    const autoExclusions = new Set<string>(
      getExcludedProviders(clientSource).map(p => p.toLowerCase())
    )

    // Step 5: Calculate actual perspective costs
    let premiumNeeded = 0
    let normalNeeded = 0
    let ecoNeeded = 0
    const warnings: ValidationWarning[] = []
    const costBreakdown: Array<{
      model_id: string
      model_name: string
      tier: string
      cost: number
      source: 'cli' | 'api' | 'admin'
    }> = []

    for (const model of models) {
      const provider = model.provider.toLowerCase()
      const tier = model.tier as 'premium' | 'normal' | 'eco'
      const isExcluded = autoExclusions.has(provider)

      // Check if model is excluded by client source
      if (isExcluded) {
        warnings.push({
          model_id: model.id,
          model_name: model.display_name,
          issue: 'provider_excluded',
          message: `${model.display_name} excluded (${provider} provider not allowed for ${clientSource})`
        })
        continue
      }

      // Determine cost based on available sources
      const hasCLI = cliAvailable.has(provider)
      const hasAPIKey = userKeysAvailable.has(provider)

      if (hasCLI || hasAPIKey) {
        // FREE via CLI or user's own API key
        costBreakdown.push({
          model_id: model.id,
          model_name: model.display_name,
          tier,
          cost: 0,
          source: hasCLI ? 'cli' : 'api'
        })
      } else {
        // Will use admin key - costs perspectives
        if (tier === 'premium') {
          premiumNeeded++
        } else if (tier === 'normal') {
          normalNeeded++
        } else if (tier === 'eco') {
          ecoNeeded++
        }

        costBreakdown.push({
          model_id: model.id,
          model_name: model.display_name,
          tier,
          cost: 1,
          source: 'admin'
        })
      }
    }

    // Step 6: Validate quotas
    const valid =
      premiumNeeded <= quotas.premium.remaining &&
      normalNeeded <= quotas.normal.remaining &&
      ecoNeeded <= quotas.eco.remaining

    // Step 7: If invalid, suggest alternatives
    if (!valid) {
      // Find models that exceeded quota
      if (premiumNeeded > quotas.premium.remaining) {
        const premiumModels = models.filter(m => m.tier === 'premium')

        // Suggest Normal alternatives from same providers
        const { data: alternatives } = await supabase
          .from('model_tiers')
          .select('*')
          .in('provider', premiumModels.map(m => m.provider))
          .eq('tier', 'normal')
          .eq('active', true)
          .limit(3)

        premiumModels.forEach(model => {
          const alt = alternatives?.find(a => a.provider === model.provider)
          warnings.push({
            model_id: model.id,
            model_name: model.display_name,
            issue: 'quota_exceeded',
            suggested_alternative: alt ? {
              model_id: alt.id,
              model_name: alt.display_name,
              tier: alt.tier
            } : undefined,
            message: `${model.display_name} requires Premium perspective but quota exhausted (${quotas.premium.remaining} remaining)`
          })
        })
      }

      if (normalNeeded > quotas.normal.remaining) {
        const normalModels = models.filter(m => m.tier === 'normal')

        const { data: alternatives } = await supabase
          .from('model_tiers')
          .select('*')
          .in('provider', normalModels.map(m => m.provider))
          .eq('tier', 'eco')
          .eq('active', true)
          .limit(3)

        normalModels.forEach(model => {
          const alt = alternatives?.find(a => a.provider === model.provider)
          warnings.push({
            model_id: model.id,
            model_name: model.display_name,
            issue: 'quota_exceeded',
            suggested_alternative: alt ? {
              model_id: alt.id,
              model_name: alt.display_name,
              tier: alt.tier
            } : undefined,
            message: `${model.display_name} requires Normal perspective but quota exhausted (${quotas.normal.remaining} remaining)`
          })
        })
      }
    }

    return NextResponse.json({
      valid,
      warnings,
      estimated_usage: {
        premium_perspectives: premiumNeeded,
        normal_perspectives: normalNeeded,
        eco_perspectives: ecoNeeded
      },
      cost_breakdown: costBreakdown,
      quotas_remaining: {
        premium: quotas.premium.remaining,
        normal: quotas.normal.remaining,
        eco: quotas.eco.remaining
      },
      can_fulfill: valid && warnings.filter(w => w.issue === 'provider_excluded').length < model_ids.length
    })

  } catch (error) {
    console.error('Perspectives validation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
