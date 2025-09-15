import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { modelsDevService } from '@/lib/models-dev-integration'

const normalizeId = (pid: string) => (pid === 'xai' ? 'x-ai' : pid)

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)
    const providerParam = searchParams.get('provider')
    const includeModels = searchParams.get('include_models') === 'true'
    const modelsOnly = searchParams.get('models_only') === 'true'
    const rich = searchParams.get('rich') === 'true'

    // Fetch providers
    const { data: providers, error: pErr } = await supabase
      .from('providers_registry')
      .select('*')
      .eq('is_active', true)

    if (pErr) {
      return NextResponse.json({ error: pErr.message }, { status: 500 })
    }

    // Normalize and de-duplicate providers by id
    const providerMap = new Map<string, any>()
    for (const p of providers || []) {
      const id = normalizeId(p.id)
      const existing = providerMap.get(id)
      if (!existing) {
        providerMap.set(id, { ...p, id })
      } else {
        // Prefer entry with non-empty description or base_url
        const score = (val: any) => ((val?.description?.length || 0) + (val?.base_url?.length || 0))
        providerMap.set(id, score(p) > score(existing) ? { ...p, id } : existing)
      }
    }

    const allProviders = Array.from(providerMap.values())

    // If a specific provider requested, filter early
    let filteredProviders = allProviders
    if (providerParam) {
      const pid = normalizeId(providerParam)
      filteredProviders = allProviders.filter(p => p.id === pid)
    }

    // Optionally fetch models for the selected set
    let modelsByProvider: Record<string, any[]> = {}
    if (includeModels || modelsOnly || rich) {
      const selectedIds = filteredProviders.map(p => p.id)
      // Also include original provider IDs to handle normalization mismatch
      const originalIds = filteredProviders.map(p => {
        const originalProvider = (providers || []).find(orig => normalizeId(orig.id) === p.id)
        return originalProvider?.id
      }).filter(Boolean)
      const allIds = [...selectedIds, ...originalIds]
      
      const { data: models, error: mErr } = await supabase
        .from('models_registry')
        .select('*')
        .in('provider_id', allIds)
        .eq('is_active', true)

      if (mErr) {
        return NextResponse.json({ error: mErr.message }, { status: 500 })
      }
      // Enrich pricing for models missing costs using models.dev limits/pricing
      const modelsArr = models || []
      const enriched = await Promise.all(modelsArr.map(async (m: any) => {
        if (m.input_cost_per_million == null || m.output_cost_per_million == null) {
          try {
            const limits = await modelsDevService.getModelLimits(m.friendly_id || m.id, normalizeId(m.provider_id))
            if (limits?.pricing) {
              m.input_cost_per_million = limits.pricing.input
              m.output_cost_per_million = limits.pricing.output
            }
          } catch {}
        }
        return m
      }))

      modelsByProvider = enriched.reduce((acc: Record<string, any[]>, m: any) => {
        const pid = normalizeId(m.provider_id)
        if (!acc[pid]) acc[pid] = []
        acc[pid].push(m)
        return acc
      }, {})
    }

    // Models-only response
    if (modelsOnly) {
      const list = (providerParam
        ? (modelsByProvider[normalizeId(providerParam)] || [])
        : Object.values(modelsByProvider).flat())
        .map(toClientModel)

      return NextResponse.json({ models: list })
    }

    // Single provider response
    if (providerParam && includeModels) {
      const pid = normalizeId(providerParam)
      const provider = filteredProviders[0]
      if (!provider) {
        return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
      }
      return NextResponse.json({ provider: toClientProvider(provider), models: (modelsByProvider[pid] || []).map(toClientModel) })
    }

    // Rich array response with nested models
    if (rich) {
      const richList = filteredProviders.map(p => ({
        ...toClientProvider(p),
        models: (modelsByProvider[p.id] || []).map(toClientModel),
        modelsCount: (modelsByProvider[p.id] || []).length,
      }))
      return NextResponse.json(richList)
    }

    // Default: provider registry summary
    return NextResponse.json({ providers: filteredProviders.map(toClientProvider) })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}

function toClientProvider(p: any) {
  return {
    id: p.id,
    name: p.display_name || p.name,
    description: p.description || undefined,
    logo: p.logo_url || undefined,
    website: p.website || undefined,
    baseUrl: p.base_url || undefined,
    supportsStreaming: !!p.supports_streaming,
    supportsTools: !!p.supports_tools,
    supportsVision: !!p.supports_images,
  }
}

function toClientModel(m: any) {
  return {
    id: m.friendly_id || m.id,
    provider_id: normalizeId(m.provider_id),
    name: m.display_name || m.name,
    maxTokens: m.max_tokens || undefined,
    contextWindow: m.context_length || undefined,
    pricing: {
      input: m.input_cost_per_million ?? 0,
      output: m.output_cost_per_million ?? 0,
      cacheRead: m.cache_read_cost_per_million ?? null,
      cacheWrite: m.cache_write_cost_per_million ?? null,
    },
    supportsVision: !!m.supports_vision,
    supportsTools: !!m.supports_tools,
    supportsStreaming: !!m.supports_streaming,
    supportsReasoning: !!m.supports_reasoning,
    description: m.models_dev_metadata?.description || undefined,
  }
}
