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

    // Get provider_id from query params for filtering
    const { searchParams } = new URL(request.url)
    const providerId = searchParams.get('provider_id')

    // Build query
    let query = serviceClient
      .from('models_registry')
      .select(`
        id,
        provider_id,
        name,
        display_name,
        friendly_id,
        provider_model_id,
        providers_registry!inner(
          id,
          name,
          display_name,
          logo_url
        )
      `)
      .eq('is_active', true)

    // Apply provider filter if specified
    if (providerId) {
      query = query.eq('provider_id', providerId)
    }

    query = query.order('display_name')

    const { data: models, error } = await query

    if (error) {
      console.error('Error fetching models:', error)
      return NextResponse.json({ error: 'Failed to fetch models' }, { status: 500 })
    }

    // Transform the data to flatten provider info
    const transformedModels = models?.map(model => ({
      id: model.id,
      provider_id: model.provider_id,
      name: model.name,
      display_name: model.display_name,
      friendly_id: model.friendly_id,
      provider_model_id: model.provider_model_id,
      provider_name: (model.providers_registry as any)?.name,
      provider_display_name: (model.providers_registry as any)?.display_name,
      provider_logo_url: (model.providers_registry as any)?.logo_url
    }))

    return NextResponse.json({ models: transformedModels })
  } catch (error) {
    console.error('Error in models list API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}