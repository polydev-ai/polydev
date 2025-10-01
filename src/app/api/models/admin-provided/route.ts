import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'

/**
 * GET /api/models/admin-provided
 * Returns all admin-managed models available to users for chat.
 * These are models configured by admins (is_admin_key = true) and marked as active.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all active admin-managed keys
    // These are available to ALL users for chat, not filtered by user_id
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

    // Transform admin keys into model format
    const adminModels = (adminKeys || []).map(key => ({
      id: key.default_model || `${key.provider}-default`,
      provider: key.provider,
      keyId: key.id,
      keyName: key.key_name,
      priorityOrder: key.priority_order,
      monthlyBudget: key.monthly_budget,
      currentUsage: key.current_usage,
      isAdminProvided: true,
      active: key.active
    }))

    return NextResponse.json({
      success: true,
      adminModels
    })
  } catch (error) {
    console.error('Error in GET /api/models/admin-provided:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
