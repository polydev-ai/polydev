import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  try {
    // Get user token from cookies for authentication
    const cookieStore = await cookies()
    const authCookie = cookieStore.get('sb-oxhutuxkthdxvciytwmb-auth-token')

    if (!authCookie) {
      return NextResponse.json({ error: 'Unauthorized - No auth token' }, { status: 401 })
    }

    let accessToken: string
    try {
      const authData = JSON.parse(authCookie.value)
      accessToken = authData.access_token
    } catch (e) {
      return NextResponse.json({ error: 'Invalid auth token' }, { status: 401 })
    }

    // Create user client to verify admin status
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      }
    )

    // Check admin access
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await userClient
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Use service role client to fetch data (bypasses RLS)
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch active providers with logos
    const { data: providers, error } = await serviceClient
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