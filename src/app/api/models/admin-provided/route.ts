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
      .maybeSingle()

    const tierPriority = (preferences?.mcp_settings as any)?.tier_priority || ['normal', 'eco', 'premium']

    // Fetch all active model tiers (these are the admin-provided models available to all users)
    const { data: modelTiers, error: tiersError } = await supabase
      .from('model_tiers')
      .select('id, tier, provider, model_name, display_name')
      .eq('active', true)

    if (tiersError) {
      console.error('Error fetching model tiers:', tiersError)
      return NextResponse.json({ error: 'Failed to fetch model tiers' }, { status: 500 })
    }

    // Transform model tiers directly into admin models
    // Each tier+provider combination represents an available admin model
    const adminModels = (modelTiers || []).map(model => {
      return {
        id: model.model_name, // Use model_name as the ID (e.g., "claude-sonnet-4-20250514")
        provider: model.provider,
        keyId: `admin-${model.id}`, // Use tier ID as keyId
        keyName: `Admin - ${model.display_name}`,
        priorityOrder: 0,
        monthlyBudget: null,
        currentUsage: 0,
        isAdminProvided: true,
        active: true,
        tier: model.tier,
        displayName: model.display_name
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
