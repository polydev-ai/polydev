'use server'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  try {
    // Use SSR client to authenticate user via cookies
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use admin client for data queries (bypasses RLS)
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

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

    // Extract unique provider names that have admin keys
    const providersWithAdminKeys = [...new Set(adminKeyProviders?.map(k => k.provider) || [])]

    if (providersWithAdminKeys.length === 0) {
      // No admin keys configured - return empty list
      return NextResponse.json({ providers: [] })
    }

    // Fetch provider details (logos, display names) only for providers with admin keys
    const { data: providers, error } = await adminClient
      .from('providers_registry')
      .select('id, name, display_name, logo_url')
      .eq('is_active', true)
      .in('name', providersWithAdminKeys)
      .order('display_name')

    if (error) {
      console.error('Error fetching providers:', error)
      return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 })
    }

    return NextResponse.json({ providers })
  } catch (error) {
    console.error('Error in providers list API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}