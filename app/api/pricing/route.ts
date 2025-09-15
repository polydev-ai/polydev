import { NextResponse } from 'next/server'
import { getModelPricingPer1K, getModelPricingByFriendlyPer1K, listResolvedPricing } from '../../../lib/pricing'
import { supabaseServer } from '../../../lib/supabaseServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const providerParam = searchParams.get('provider') || ''
    const provider = providerParam.toLowerCase()
    const model = searchParams.get('model') || undefined
    const friendly = searchParams.get('friendly') || undefined
    const limitParam = searchParams.get('limit') || undefined
    const limit = limitParam ? Number(limitParam) : undefined

    if (!provider) {
      return NextResponse.json({ error: 'provider is required' }, { status: 400 })
    }

    // Single-model by exact provider+model (OpenRouter: pass vendor/model, e.g., x-ai/grok-4)
    if (model) {
      let pricing = await getModelPricingPer1K(provider, model)
      // If missing and provider looks like a vendor, try OpenRouter vendor/model
      if (!pricing && provider !== 'openrouter') {
        const vendor = normalizeVendor(provider)
        pricing = await getModelPricingPer1K('openrouter', `${vendor}/${model}`)
      }
      if (!pricing) return NextResponse.json({ provider, model, pricing: null })
      return NextResponse.json({ provider, model, pricing })
    }

    // Single-model by friendly id
    if (friendly) {
      let pricing = await getModelPricingByFriendlyPer1K(provider, friendly)
      if (!pricing && provider !== 'openrouter') {
        const vendor = normalizeVendor(provider)
        pricing = await getModelPricingPer1K('openrouter', `${vendor}/${friendly}`)
      }
      if (!pricing) return NextResponse.json({ provider, friendly, pricing: null })
      return NextResponse.json({ provider, friendly, pricing })
    }

    // Lists / discovery via unified view
    let rows = await listResolvedPricing({ providerId: provider, limit })

    // If empty and provider looks like a vendor (e.g., xai/x-ai), fallback to OpenRouter vendor slice
    if ((!rows || rows.length === 0) && provider !== 'openrouter') {
      const vendor = normalizeVendor(provider)
      const { data, error } = await supabaseServer
        .from('model_pricing_openrouter_expanded')
        .select('*')
        .eq('vendor', vendor)
        .limit(limit ?? 500)
      if (!error && data && data.length > 0) {
        rows = (data as any[]).map((r) => ({
          provider_id: provider,
          model_id: `${r.vendor}/${r.vendor_model}`,
          friendly_id: r.friendly_id,
          name: r.name,
          display_name: r.display_name ?? r.name ?? r.friendly_id ?? `${r.vendor}/${r.vendor_model}`,
          input_cost_per_1k: Number(r.input_cost_per_1k ?? 0),
          output_cost_per_1k: Number(r.output_cost_per_1k ?? 0),
          max_tokens: r.max_tokens,
          context_length: r.context_length,
          supports_streaming: r.supports_streaming,
          supports_tools: r.supports_tools,
          supports_reasoning: r.supports_reasoning,
          supports_vision: r.supports_vision,
          model_family: r.model_family,
          model_version: r.model_version,
          is_active: r.is_active,
          updated_at: r.updated_at,
        }))
      }
    }

    return NextResponse.json({ provider, count: rows.length, models: rows })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'unknown error' }, { status: 500 })
  }
}

function normalizeVendor(input: string) {
  const s = input.toLowerCase()
  if (s === 'xai' || s === 'x.ai' || s === 'x-ai') return 'x-ai'
  return s
}
