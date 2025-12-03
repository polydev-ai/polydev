import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '../../../../utils/supabase/server'

export async function GET(request: Request) {
  try {
    console.log('[Models API] Starting request...')

    // Authenticate user with SSR client (handles cookies properly)
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    console.log('[Models API] User authenticated:', user?.id ? 'yes' : 'no')
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin access
    const { data: profile } = await supabase
      .from('users')
      .select('tier')
      .eq('user_id', user.id)
      .single()

    if (profile?.tier !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Use admin client to fetch data (bypasses RLS)
    const adminClient = createAdminClient()

    // Get provider_id from query params for filtering
    const { searchParams } = new URL(request.url)
    const providerId = searchParams.get('provider_id')
    console.log('[Models API] provider_id param:', providerId)

    // Build query
    let query = adminClient
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
      console.log('[Models API] Filtering by provider_id:', providerId)
      query = query.eq('provider_id', providerId)
    }

    query = query.order('display_name')

    const { data: models, error } = await query

    console.log('[Models API] Query result:', { modelCount: models?.length || 0, error: error?.message })

    if (error) {
      console.error('[Models API] Error fetching models:', error)
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

    console.log('[Models API] Returning', transformedModels?.length || 0, 'models')
    return NextResponse.json({ models: transformedModels })
  } catch (error) {
    console.error('Error in models list API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}