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

    // First, get unique providers that have admin API keys configured
    const { data: adminKeyProviders, error: keysError } = await adminClient
      .from('user_api_keys')
      .select('provider')
      .eq('is_admin_key', true)
      .eq('active', true)

    if (keysError) {
      console.error('Error fetching admin key providers:', keysError)
      return NextResponse.json({ error: 'Failed to fetch admin key providers' }, { status: 500 })
    }

    // Extract unique provider names that have admin keys (normalized to lowercase for comparison)
    const providersWithAdminKeys = [...new Set(adminKeyProviders?.map(k => k.provider.toLowerCase()) || [])]
    console.log('[Providers API] Admin key providers:', providersWithAdminKeys)

    if (providersWithAdminKeys.length === 0) {
      console.log('[Providers API] No admin keys configured, returning empty list')
      // No admin keys configured - return empty list
      return NextResponse.json({ providers: [] })
    }

    // Fetch ALL active provider details first
    const { data: allProviders, error } = await adminClient
      .from('providers_registry')
      .select('id, name, display_name, logo_url')
      .eq('is_active', true)
      .order('display_name')

    if (error) {
      console.error('Error fetching providers:', error)
      return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 })
    }

    // Filter case-insensitively: match if provider name (lowercase) matches any admin key provider
    // This handles mismatches like "openai" vs "OpenAI", "x-ai" vs "xAI", etc.
    const providers = (allProviders || []).filter(p => {
      const normalizedName = p.name.toLowerCase().replace(/[^a-z0-9]/g, '')
      return providersWithAdminKeys.some(adminKey => {
        const normalizedAdminKey = adminKey.replace(/[^a-z0-9]/g, '')
        return normalizedName === normalizedAdminKey ||
               normalizedName.includes(normalizedAdminKey) ||
               normalizedAdminKey.includes(normalizedName)
      })
    })

    console.log('[Providers API] Matched providers:', providers.map(p => ({ id: p.id, name: p.name })))
    console.log('[Providers API] Returning', providers.length, 'providers')
    return NextResponse.json({ providers })
  } catch (error) {
    console.error('Error in providers list API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}