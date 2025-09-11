import { NextResponse } from 'next/server'
import { modelsDevService } from '@/lib/models-dev-integration'

// Simple in-memory cache for API route
const apiCache: Record<string, { data: any; timestamp: number }> = {}
const API_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const providerId = searchParams.get('provider')
    const includeModels = searchParams.get('include_models') === 'true'
    const richData = searchParams.get('rich') === 'true'

    // Check cache first
    const cacheKey = providerId 
      ? `provider:${providerId}:models:${includeModels}:rich:${richData}` 
      : `providers:all:rich:${richData}`
    
    const cached = apiCache[cacheKey]
    const now = Date.now()
    
    if (cached && (now - cached.timestamp) < API_CACHE_TTL) {
      console.log(`[models-dev API] Cache hit for ${cacheKey}`)
      return NextResponse.json(cached.data)
    }

    let result: any

    if (richData) {
      // Return rich provider data for models page
      console.log(`[models-dev API] Fetching rich provider data${providerId ? ` for ${providerId}` : ' for all providers'}`)
      result = await modelsDevService.getRichProviderData(providerId || undefined)
    } else if (providerId) {
      // Get specific provider with models if requested
      if (includeModels) {
        console.log(`[models-dev API] Fetching provider ${providerId} with models`)
        const [providerConfig, models] = await Promise.all([
          modelsDevService.getLegacyProviderConfig(providerId),
          modelsDevService.getModels(providerId)
        ])
        
        result = {
          ...providerConfig,
          models: models || []
        }
      } else {
        console.log(`[models-dev API] Fetching provider ${providerId} config only`)
        result = await modelsDevService.getLegacyProviderConfig(providerId)
      }
    } else {
      // Get all providers from models.dev
      console.log(`[models-dev API] Fetching all providers`)
      const providers = await modelsDevService.getProviders()
      
      // Transform to legacy CLINE_PROVIDERS format for compatibility
      const legacyProviders: Record<string, any> = {}
      
      for (const provider of providers) {
        const config = await modelsDevService.getLegacyProviderConfig(provider.id)
        if (config) {
          legacyProviders[provider.id] = config
        }
      }
      
      result = legacyProviders
    }

    // Cache result
    apiCache[cacheKey] = { data: result, timestamp: now }
    console.log(`[models-dev API] Cached result for ${cacheKey}`)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to fetch models.dev providers:', error)
    return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 })
  }
}