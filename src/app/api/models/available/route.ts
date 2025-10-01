import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { detectClientSource, getExcludedProviders } from '@/lib/client-detection'

interface ModelAvailability {
  model_id: string
  model_name: string
  display_name: string
  provider: string
  tier: 'premium' | 'normal' | 'eco'
  active: boolean
  cost_per_1k_input: number
  cost_per_1k_output: number
  availability: {
    status: 'available' | 'fallback' | 'locked' | 'unavailable'
    sources: Array<{
      type: 'cli' | 'api' | 'admin'
      available: boolean
      priority: number
      cost: 'free' | 'perspective' | 'credits'
      reason?: string
    }>
    primary_source?: 'cli' | 'api' | 'admin'
    perspectives_needed?: number
    fallback?: {
      model_id: string
      model_name: string
      reason: string
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Detect client source automatically from headers
    const clientSource = detectClientSource(request)

    // Get optional manual exclusion from query params
    const searchParams = request.nextUrl.searchParams
    const excludeProvider = searchParams.get('exclude_provider')

    // Step 1: Get user's subscription and quotas
    const { data: quotaData } = await supabase
      .from('user_perspective_quotas')
      .select(`
        plan_tier,
        premium_perspectives_limit,
        premium_perspectives_used,
        normal_perspectives_limit,
        normal_perspectives_used,
        eco_perspectives_limit,
        eco_perspectives_used,
        current_month_start,
        last_reset_date
      `)
      .eq('user_id', user.id)
      .single()

    if (!quotaData) {
      return NextResponse.json({ error: 'User quotas not found' }, { status: 404 })
    }

    const quotas = {
      tier: quotaData.plan_tier,
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
      },
      reset_date: quotaData.current_month_start
    }

    // Step 2: Get all active models from model_tiers
    const { data: models, error: modelsError } = await supabase
      .from('model_tiers')
      .select('*')
      .eq('active', true)
      .order('tier', { ascending: true })
      .order('provider', { ascending: true })

    if (modelsError) {
      console.error('Error fetching models:', modelsError)
      return NextResponse.json({ error: 'Failed to fetch models' }, { status: 500 })
    }

    // Step 3: Get user's source priority
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('source_priority')
      .eq('user_id', user.id)
      .single()

    const sourcePriority = (preferences?.source_priority as string[]) || ['cli', 'api', 'admin']

    // Step 4: Get CLI availability
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

    // Step 5: Get user's API keys
    const { data: userApiKeys } = await supabase
      .from('user_api_keys')
      .select('provider, active, priority_order')
      .eq('user_id', user.id)
      .eq('is_admin_key', false)
      .eq('active', true)

    const userKeysAvailable = new Set(
      userApiKeys?.map(k => k.provider.toLowerCase()) || []
    )

    // Step 6: Get admin API keys (for admin-provided models)
    const { data: adminKeys } = await supabase
      .from('user_api_keys')
      .select('provider, active')
      .eq('is_admin_key', true)
      .eq('active', true)

    const adminKeysAvailable = new Set(
      adminKeys?.map(k => k.provider.toLowerCase()) || []
    )

    // Step 7: Determine provider exclusions based on client source
    const autoExclusions = new Set<string>(
      getExcludedProviders(clientSource).map(p => p.toLowerCase())
    )

    if (excludeProvider) {
      autoExclusions.add(excludeProvider.toLowerCase())
    }

    // Step 8: Build availability for each model
    const availableModels: ModelAvailability[] = models?.map(model => {
      const provider = model.provider.toLowerCase()
      const tier = model.tier as 'premium' | 'normal' | 'eco'
      const tierQuota = quotas[tier]

      // Check if provider is excluded
      const isExcluded = autoExclusions.has(provider)

      // Build sources array based on priority
      const sources = sourcePriority.map((sourceType, index) => {
        if (sourceType === 'cli') {
          const available = !isExcluded && cliAvailable.has(provider)
          return {
            type: 'cli' as const,
            available,
            priority: index + 1,
            cost: 'free' as const,
            reason: !available ? (isExcluded ? 'Provider excluded' : 'CLI not installed') : undefined
          }
        } else if (sourceType === 'api') {
          const available = !isExcluded && userKeysAvailable.has(provider)
          return {
            type: 'api' as const,
            available,
            priority: index + 1,
            cost: 'free' as const,
            reason: !available ? (isExcluded ? 'Provider excluded' : 'No API key configured') : undefined
          }
        } else if (sourceType === 'admin') {
          const hasAdminKey = adminKeysAvailable.has(provider)
          const hasQuota = tierQuota.remaining > 0
          const available = !isExcluded && hasAdminKey && hasQuota

          return {
            type: 'admin' as const,
            available,
            priority: index + 1,
            cost: 'perspective' as const,
            reason: !available ? (
              isExcluded ? 'Provider excluded' :
              !hasAdminKey ? 'No admin key available' :
              !hasQuota ? `${tier} quota exhausted` :
              undefined
            ) : undefined
          }
        }

        return {
          type: sourceType as any,
          available: false,
          priority: index + 1,
          cost: 'free' as const,
          reason: 'Unknown source type'
        }
      })

      // Determine primary source (first available in priority order)
      const primarySource = sources.find(s => s.available)

      // Determine overall availability status
      let status: 'available' | 'fallback' | 'locked' | 'unavailable' = 'unavailable'

      if (primarySource) {
        status = 'available'
      } else if (isExcluded) {
        status = 'unavailable' // Excluded by client source
      } else {
        // Check if fallback to lower tier is possible
        const hasAnySource = sources.some(s => s.type !== 'admin' || adminKeysAvailable.has(provider))
        const quotaExhausted = tierQuota.remaining === 0

        if (hasAnySource && quotaExhausted) {
          status = 'fallback' // Could use this model with lower tier
        } else if (quotaData.plan_tier === 'free' && tier === 'premium') {
          status = 'locked' // Requires upgrade
        } else {
          status = 'unavailable'
        }
      }

      return {
        model_id: model.id,
        model_name: model.model_name,
        display_name: model.display_name,
        provider: model.provider,
        tier,
        active: model.active,
        cost_per_1k_input: parseFloat(model.cost_per_1k_input),
        cost_per_1k_output: parseFloat(model.cost_per_1k_output),
        availability: {
          status,
          sources,
          primary_source: primarySource?.type,
          perspectives_needed: primarySource?.cost === 'perspective' ? 1 : 0
        }
      }
    }) || []

    return NextResponse.json({
      subscription: {
        tier: quotas.tier,
        perspectives: quotas,
        reset_date: quotas.reset_date
      },
      models: availableModels,
      meta: {
        total: availableModels.length,
        available: availableModels.filter(m => m.availability.status === 'available').length,
        client_source: clientSource,
        auto_exclusions: Array.from(autoExclusions),
        generated_at: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Models available error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
