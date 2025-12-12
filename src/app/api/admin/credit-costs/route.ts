'use server'

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/app/utils/supabase/server'

// Helper function to check admin access
async function checkAdminAccess(adminClient: any, userId: string, userEmail: string): Promise<boolean> {
  const legacyAdminEmails = new Set(['admin@polydev.ai', 'venkat@polydev.ai', 'gvsfans@gmail.com']);
  if (legacyAdminEmails.has(userEmail)) return true;

  try {
    const { data: profile } = await adminClient
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();
    return profile?.is_admin || false;
  } catch (error) {
    return false;
  }
}

const DEFAULT_CREDIT_COSTS = {
  eco: 1,
  normal: 4,
  premium: 20
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Check admin access
    const isAdmin = await checkAdminAccess(adminClient, user.id, user.email || '')
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Get credit costs from admin_pricing_config
    const { data: config, error } = await adminClient
      .from('admin_pricing_config')
      .select('config_value')
      .eq('config_key', 'model_tier_credit_costs')
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('[Credit Costs API] Error fetching config:', error)
      throw error
    }

    const creditCosts = config?.config_value || DEFAULT_CREDIT_COSTS

    return NextResponse.json({
      success: true,
      creditCosts
    })

  } catch (error) {
    console.error('[Credit Costs API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error', creditCosts: DEFAULT_CREDIT_COSTS },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Check admin access
    const isAdmin = await checkAdminAccess(adminClient, user.id, user.email || '')
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { eco, normal, premium } = body

    // Validate values
    if (typeof eco !== 'number' || eco < 0) {
      return NextResponse.json({ error: 'Invalid eco credit cost' }, { status: 400 })
    }
    if (typeof normal !== 'number' || normal < 0) {
      return NextResponse.json({ error: 'Invalid normal credit cost' }, { status: 400 })
    }
    if (typeof premium !== 'number' || premium < 0) {
      return NextResponse.json({ error: 'Invalid premium credit cost' }, { status: 400 })
    }

    const newCosts = { eco, normal, premium }

    // Check if config exists
    const { data: existingConfig } = await adminClient
      .from('admin_pricing_config')
      .select('id')
      .eq('config_key', 'model_tier_credit_costs')
      .single()

    if (existingConfig) {
      // Update existing config
      const { error: updateError } = await adminClient
        .from('admin_pricing_config')
        .update({
          config_value: newCosts,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('config_key', 'model_tier_credit_costs')

      if (updateError) {
        console.error('[Credit Costs API] Error updating config:', updateError)
        throw updateError
      }
    } else {
      // Insert new config
      const { error: insertError } = await adminClient
        .from('admin_pricing_config')
        .insert({
          config_key: 'model_tier_credit_costs',
          config_value: newCosts,
          updated_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (insertError) {
        console.error('[Credit Costs API] Error inserting config:', insertError)
        throw insertError
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Credit costs updated successfully',
      creditCosts: newCosts
    })

  } catch (error) {
    console.error('[Credit Costs API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
