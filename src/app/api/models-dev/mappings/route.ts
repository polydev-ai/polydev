import { NextRequest, NextResponse } from 'next/server'
import { modelsDevService } from '@/lib/models-dev-integration'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const friendlyId = searchParams.get('friendly_id')
    const providerId = searchParams.get('provider_id')

    // Get specific model mapping
    if (friendlyId) {
      const mapping = await modelsDevService.getModelByFriendlyId(friendlyId)
      if (!mapping) {
        return NextResponse.json({ error: 'Model mapping not found' }, { status: 404 })
      }

      // If provider is specified, return just the provider-specific mapping
      if (providerId) {
        const providerMapping = mapping.providers[providerId]
        if (!providerMapping) {
          return NextResponse.json({ error: 'Provider mapping not found' }, { status: 404 })
        }

        return NextResponse.json({
          friendly_id: mapping.friendly_id,
          display_name: mapping.display_name,
          provider_id: providerId,
          ...providerMapping
        })
      }

      return NextResponse.json({ mapping })
    }

    // Get all mappings
    const mappings = await modelsDevService.getModelMappings()
    
    return NextResponse.json({ mappings })
  } catch (error) {
    console.error('Error in models-dev mappings API:', error)
    return NextResponse.json({
      error: 'Failed to get model mappings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Helper endpoint for getting provider-specific model ID
export async function POST(request: NextRequest) {
  try {
    const { friendlyId, providerId } = await request.json()

    if (!friendlyId || !providerId) {
      return NextResponse.json({
        error: 'Missing required parameters: friendlyId and providerId'
      }, { status: 400 })
    }

    const apiModelId = await modelsDevService.getProviderSpecificModelId(friendlyId, providerId)
    const pricing = await modelsDevService.getModelPricing(friendlyId, providerId)

    if (!apiModelId) {
      return NextResponse.json({
        error: 'Model mapping not found for this provider'
      }, { status: 404 })
    }

    return NextResponse.json({
      friendly_id: friendlyId,
      provider_id: providerId,
      api_model_id: apiModelId,
      pricing
    })
  } catch (error) {
    console.error('Error in models-dev mappings POST:', error)
    return NextResponse.json({
      error: 'Failed to get model mapping',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}