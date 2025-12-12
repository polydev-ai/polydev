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

export async function GET() {
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

    const { data: config, error } = await adminClient
      .from('admin_pricing_config')
      .select('*')
      .eq('config_key', 'global_max_output_tokens')
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching global settings:', error)
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      settings: config?.config_value || { max_tokens: 32000 }
    })
  } catch (error) {
    console.error('Error in admin global-settings API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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
    const { max_tokens } = body

    if (!max_tokens || max_tokens < 1000 || max_tokens > 200000) {
      return NextResponse.json({
        error: 'Max tokens must be between 1000 and 200000'
      }, { status: 400 })
    }

    const { data, error } = await adminClient
      .from('admin_pricing_config')
      .upsert({
        config_key: 'global_max_output_tokens',
        config_value: { max_tokens },
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'config_key'
      })
      .select()
      .single()

    if (error) {
      console.error('Error updating global settings:', error)
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }

    return NextResponse.json({ success: true, settings: data.config_value })
  } catch (error) {
    console.error('Error in admin global-settings POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
