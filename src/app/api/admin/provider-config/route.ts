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

// Admin API for managing provider configuration (max tokens, etc.)
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

    const url = new URL(request.url)
    const provider = url.searchParams.get('provider')

    let query = adminClient
      .from('provider_configurations')
      .select('*')
      .order('provider_name', { ascending: true })

    if (provider) {
      query = query.eq('provider_name', provider)
    }

    const { data: configs, error } = await query

    if (error) {
      console.error('Error fetching provider configs:', error)
      return NextResponse.json({ error: 'Failed to fetch provider configs' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      configs: configs || []
    })
  } catch (error) {
    console.error('Error in admin provider-config API:', error)
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
    const { provider_name, max_output_tokens_premium, max_output_tokens_normal, max_output_tokens_eco, max_output_tokens_default } = body

    if (!provider_name) {
      return NextResponse.json({ error: 'Provider name is required' }, { status: 400 })
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (max_output_tokens_premium !== undefined) updateData.max_output_tokens_premium = max_output_tokens_premium
    if (max_output_tokens_normal !== undefined) updateData.max_output_tokens_normal = max_output_tokens_normal
    if (max_output_tokens_eco !== undefined) updateData.max_output_tokens_eco = max_output_tokens_eco
    if (max_output_tokens_default !== undefined) updateData.max_output_tokens_default = max_output_tokens_default

    const { data, error } = await adminClient
      .from('provider_configurations')
      .update(updateData)
      .eq('provider_name', provider_name)
      .select()
      .single()

    if (error) {
      console.error('Error updating provider config:', error)
      return NextResponse.json({ error: 'Failed to update provider config' }, { status: 500 })
    }

    return NextResponse.json({ success: true, config: data })
  } catch (error) {
    console.error('Error in admin provider-config POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
