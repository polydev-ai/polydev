import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const providerId = searchParams.get('provider')
    const includeModels = searchParams.get('include_models') === 'true'
    const modelsOnly = searchParams.get('models_only') === 'true'
    const reasoning = searchParams.get('reasoning') === 'true'
    const vision = searchParams.get('vision') === 'true'
    const search = searchParams.get('search')
    const modelId = searchParams.get('model_id')

    const supabase = await createClient()

    // Handle different query types
    if (modelsOnly) {
      let query = supabase
        .from('models_registry')
        .select('*')
        .eq('is_active', true)

      if (reasoning) {
        query = query.eq('supports_reasoning', true)
      } else if (vision) {
        query = query.eq('supports_vision', true)
      } else if (search) {
        query = query.or(`name.ilike.%${search}%,display_name.ilike.%${search}%,friendly_id.ilike.%${search}%`)
      } else if (modelId) {
        query = query.eq('id', modelId)
      } else if (providerId) {
        query = query.eq('provider_id', providerId)
      }

      const { data: models, error: modelsError } = await query.order('name')
      
      if (modelsError) {
        console.error('Error fetching models:', modelsError)
        throw modelsError
      }
      
      return NextResponse.json({ models: models || [] })
    }

    // Get providers
    const { data: providers, error: providersError } = await supabase
      .from('providers_registry')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (providersError) {
      console.error('Error fetching providers:', providersError)
      throw providersError
    }
    
    if (providerId) {
      const provider = providers?.find(p => p.id === providerId)
      if (!provider) {
        return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
      }

      let response: any = { provider }
      
      if (includeModels) {
        console.log(`DEBUG: Getting models for provider ${providerId}`)
        const { data: models, error: modelsError } = await supabase
          .from('models_registry')
          .select('*')
          .eq('is_active', true)
          .eq('provider_id', providerId)
          .order('name')
          
        if (modelsError) {
          console.error('Error fetching provider models:', modelsError)
        }
        
        console.log(`DEBUG: Found ${(models || []).length} models for provider ${providerId}`)
        response.models = models || []
      }

      return NextResponse.json(response)
    }

    // Return all providers
    let response: any = { providers: providers || [] }
    
    if (includeModels) {
      const { data: allModels, error: modelsError } = await supabase
        .from('models_registry')
        .select('*')
        .eq('is_active', true)
        .order('name')
        
      if (modelsError) {
        console.error('Error fetching all models:', modelsError)
      }
      
      response.models = allModels || []
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in models-dev providers API:', error)
    return NextResponse.json({
      error: 'Failed to get provider data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}