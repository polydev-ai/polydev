import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'

/**
 * GET /api/models/admin-provided
 * Returns all admin-managed models available to users for chat.
 * These are models configured by admins (is_admin_key = true) and marked as active.
 * Resolves actual model IDs from model_tiers table based on tier priority.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's tier priority preference (default: normal -> eco -> premium)
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('mcp_settings')
      .eq('user_id', user.id)
      .single()

    const tierPriority = (preferences?.mcp_settings as any)?.tier_priority || ['normal', 'eco', 'premium']

    // Fetch all active model tiers
    const { data: modelTiers, error: tiersError } = await supabase
      .from('model_tiers')
      .select('tier, provider, model_name, display_name')
      .eq('active', true)

    if (tiersError) {
      console.error('Error fetching model tiers:', tiersError)
      return NextResponse.json({ error: 'Failed to fetch model tiers' }, { status: 500 })
    }

    // Create a lookup map for models by provider and tier
    const modelsByProvider = new Map<string, Map<string, any>>()

    for (const model of modelTiers || []) {
      const providerKey = model.provider.toLowerCase()
      if (!modelsByProvider.has(providerKey)) {
        modelsByProvider.set(providerKey, new Map())
      }
      modelsByProvider.get(providerKey)!.set(model.tier, model)
    }

    // Fetch all active admin-managed keys
    const { data: adminKeys, error } = await supabase
      .from('user_api_keys')
      .select('id, provider, key_name, default_model, priority_order, monthly_budget, current_usage, active')
      .eq('is_admin_key', true)
      .eq('active', true)
      .order('priority_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching admin-provided models:', error)
      return NextResponse.json({ error: 'Failed to fetch admin models' }, { status: 500 })
    }

    // Transform admin keys into model format with resolved model IDs
    const adminModels = (adminKeys || []).map(key => {
      const providerKey = key.provider.toLowerCase()
      const providerModels = modelsByProvider.get(providerKey)

      // Try to find model based on tier priority
      let resolvedModel = null
      if (providerModels) {
        for (const tier of tierPriority) {
          if (providerModels.has(tier)) {
            resolvedModel = providerModels.get(tier)
            break
          }
        }
      }

      // If we have a resolved model, use its model_name as the ID
      const modelId = resolvedModel?.model_name || key.default_model || `${key.provider}-unknown`

      return {
        id: modelId,
        provider: key.provider,
        keyId: key.id,
        keyName: key.key_name,
        priorityOrder: key.priority_order,
        monthlyBudget: key.monthly_budget,
        currentUsage: key.current_usage,
        isAdminProvided: true,
        active: key.active,
        tier: resolvedModel?.tier || 'normal',
        displayName: resolvedModel?.display_name
      }
    })

    return NextResponse.json({
      success: true,
      adminModels
    })
  } catch (error) {
    console.error('Error in GET /api/models/admin-provided:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
