import { NextResponse } from 'next/server'
import { modelsDevService } from '@/lib/models-dev-integration'

export async function GET() {
  try {
    // Get all providers from models.dev
    const providers = await modelsDevService.getProviders()
    
    // Transform to legacy CLINE_PROVIDERS format for compatibility
    const legacyProviders: Record<string, any> = {}
    
    for (const provider of providers) {
      const config = await modelsDevService.getLegacyProviderConfig(provider.id)
      if (config) {
        legacyProviders[provider.id] = config
      }
    }
    
    return NextResponse.json(legacyProviders)
  } catch (error) {
    console.error('Failed to fetch models.dev providers:', error)
    return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 })
  }
}