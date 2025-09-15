import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Query models registry with actual provider extraction
    const { data: models, error } = await supabase
      .from('models_registry')
      .select('id, name, provider_id, models_dev_metadata')
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching models registry:', error)
      return NextResponse.json({ error: 'Failed to fetch models registry' }, { status: 500 })
    }

    // Process models to extract actual provider from original_id
    const processedModels = models?.map(model => {
      let actualProvider = model.provider_id
      
      // Extract actual provider from models_dev_metadata.original_id
      if (model.models_dev_metadata?.original_id) {
        const originalId = model.models_dev_metadata.original_id
        const parts = originalId.split('/')
        if (parts.length >= 2) {
          actualProvider = parts[0] // e.g., "anthropic" from "anthropic/claude-sonnet-4"
        }
      }
      
      return {
        id: model.id,
        name: model.name,
        provider_id: model.provider_id,
        actual_provider: actualProvider
      }
    }) || []

    return NextResponse.json({ 
      models: processedModels,
      meta: {
        total: processedModels.length,
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Models registry error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}