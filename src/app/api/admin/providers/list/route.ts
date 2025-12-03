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

    // CORRECT: Only return providers that have admin API keys configured
    // Step 1: Get all active admin API keys
    const { data: adminKeys, error: adminKeysError } = await adminClient
      .from('user_api_keys')
      .select('provider')
      .eq('is_admin_key', true)
      .eq('active', true)

    if (adminKeysError) {
      console.error('Error fetching admin keys:', adminKeysError)
      return NextResponse.json({ error: 'Failed to fetch admin keys' }, { status: 500 })
    }

    // Step 2: Get unique provider names from admin keys
    const adminProviderNames = [...new Set(adminKeys?.map(k => k.provider.toLowerCase()) || [])]
    console.log('[Providers API] Admin key providers:', adminProviderNames)

    // Step 3: Fetch matching providers from registry
    // Match by id OR name (case-insensitive) to handle naming variations
    const { data: allProviders, error: providersError } = await adminClient
      .from('providers_registry')
      .select('id, name, display_name, logo_url')
      .eq('is_active', true)
      .order('display_name')

    if (providersError) {
      console.error('Error fetching providers:', providersError)
      return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 })
    }

    // Step 4: Filter to only providers that match admin keys
    // Use EXACT matching only - no substring matching to prevent false positives
    // e.g., "google-vertex-anthropic" should NOT match admin key "anthropic"
    const providers = (allProviders || []).filter(p => {
      const normalizedId = p.id.toLowerCase().replace(/[^a-z0-9]/g, '')
      const normalizedName = p.name.toLowerCase().replace(/[^a-z0-9]/g, '')
      return adminProviderNames.some(adminKey => {
        const normalizedAdminKey = adminKey.replace(/[^a-z0-9]/g, '')
        // Only exact matches - no includes() to prevent partial matching
        return normalizedId === normalizedAdminKey ||
               normalizedName === normalizedAdminKey
      })
    })

    const error = null // For compatibility with existing code below

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