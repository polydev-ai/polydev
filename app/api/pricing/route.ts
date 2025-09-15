// Next.js App Router API
// GET /api/pricing?provider=openrouter
// GET /api/pricing?provider=openrouter&model=x-ai/grok-4
// GET /api/pricing?provider=openrouter&friendly=grok-4
// Returns USD per 1K costs for single model or list via model_pricing_resolved

import { NextResponse } from 'next/server'
import { getModelPricingPer1K, getModelPricingByFriendlyPer1K, listResolvedPricing } from '../../../lib/pricing'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const provider = searchParams.get('provider') || undefined
    const model = searchParams.get('model') || undefined
    const friendly = searchParams.get('friendly') || undefined
    const limitParam = searchParams.get('limit') || undefined
    const limit = limitParam ? Number(limitParam) : undefined

    if (!provider) {
      return NextResponse.json({ error: 'provider is required' }, { status: 400 })
    }

    // Single-model by exact provider+model (OpenRouter: pass vendor/model)
    if (model) {
      const pricing = await getModelPricingPer1K(provider, model)
      if (!pricing) return NextResponse.json({ provider, model, pricing: null })
      return NextResponse.json({ provider, model, pricing })
    }

    // Single-model by friendly id
    if (friendly) {
      const pricing = await getModelPricingByFriendlyPer1K(provider, friendly)
      if (!pricing) return NextResponse.json({ provider, friendly, pricing: null })
      return NextResponse.json({ provider, friendly, pricing })
    }

    // Lists / discovery via unified view
    const rows = await listResolvedPricing({ providerId: provider, limit })
    return NextResponse.json({ provider, count: rows.length, models: rows })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'unknown error' }, { status: 500 })
  }
}
