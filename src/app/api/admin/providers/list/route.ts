import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '../../../../utils/supabase/server'

export async function GET(request: NextRequest) {
  try {
    console.log('[Providers API] Starting request...')

    // Use shared SSR client to authenticate user via cookies
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    console.log('[Providers API] User authenticated:', user?.id ? 'yes' : 'no')
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use admin client for data queries (bypasses RLS)
    const adminClient = createAdminClient()

    // Check admin access
    const { data: profile } = await adminClient
      .from('users')
      .select('tier')
      .eq('user_id', user.id)
      .single()

    if (profile?.tier !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // FIX: Return ALL active providers from providers_registry
    // Previously we filtered by admin keys, but this caused "No models found"
    // when editing model_tiers that reference providers without admin keys (e.g., Google, Cerebras)
    const { data: providers, error } = await adminClient
      .from('providers_registry')
      .select('id, name, display_name, logo_url')
      .eq('is_active', true)
      .order('display_name')

    if (error) {
      console.error('Error fetching providers:', error)
      return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 })
    }

    console.log('[Providers API] Returning', providers?.length || 0, 'providers')
    return NextResponse.json({ providers: providers || [] })
  } catch (error) {
    console.error('Error in providers list API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}