import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '../../../../utils/supabase/server'

export async function GET(request: Request) {
  try {
    // Authenticate user with SSR client (handles cookies properly)
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin access
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Use admin client to fetch data (bypasses RLS)
    const adminClient = createAdminClient()

    // Fetch active providers with logos
    const { data: providers, error } = await adminClient
      .from('providers_registry')
      .select('id, name, display_name, logo_url')
      .eq('is_active', true)
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