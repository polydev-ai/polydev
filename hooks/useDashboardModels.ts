import { useEffect, useMemo, useState, useCallback } from 'react'

export type DashboardModel = {
  providerId: string
  modelId: string
  friendlyId?: string | null
  displayName: string
  inputCostPer1K: number
  outputCostPer1K: number
  maxTokens?: number | null
  contextLength?: number | null
  supportsStreaming?: boolean | null
  supportsTools?: boolean | null
  supportsReasoning?: boolean | null
  supportsVision?: boolean | null
  modelFamily?: string | null
  modelVersion?: string | null
  isActive?: boolean | null
}

export type UseDashboardModelsOptions = {
  providers?: string[]
  limitPerProvider?: number
}

export type UseDashboardModelsResult = {
  modelsByProvider: Record<string, DashboardModel[]>
  loading: boolean
  error: string | null
  refresh: () => void
}

// Default providers; adjust to your project needs
const DEFAULT_PROVIDERS = [
  'openrouter',
  'openai',
  'groq',
  'mistral',
  'deepseek',
  'xai',
]

export function useDashboardModels(options?: UseDashboardModelsOptions): UseDashboardModelsResult {
  const providers = options?.providers ?? DEFAULT_PROVIDERS
  const limit = options?.limitPerProvider ?? 500

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const [data, setData] = useState<Record<string, DashboardModel[]>>({})

  const refresh = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      setError(null)
      try {
        const results = await Promise.all(
          providers.map(async (provider) => {
            const url = `/api/pricing?provider=${encodeURIComponent(provider)}&limit=${limit}`
            const res = await fetch(url)
            if (!res.ok) throw new Error(`Pricing fetch failed for ${provider}: ${res.status}`)
            const json = await res.json()
            const rows = (json?.models ?? []) as any[]
            const models: DashboardModel[] = rows.map((r) => ({
              providerId: r.provider_id,
              modelId: r.model_id,
              friendlyId: r.friendly_id ?? null,
              displayName: r.display_name || r.name || r.friendly_id || r.model_id,
              inputCostPer1K: Number(r.input_cost_per_1k ?? 0),
              outputCostPer1K: Number(r.output_cost_per_1k ?? 0),
              maxTokens: r.max_tokens ?? null,
              contextLength: r.context_length ?? null,
              supportsStreaming: r.supports_streaming ?? null,
              supportsTools: r.supports_tools ?? null,
              supportsReasoning: r.supports_reasoning ?? null,
              supportsVision: r.supports_vision ?? null,
              modelFamily: r.model_family ?? null,
              modelVersion: r.model_version ?? null,
              isActive: r.is_active ?? null,
            }))
            return [provider, models] as const
          })
        )
        if (cancelled) return
        const byProvider: Record<string, DashboardModel[]> = {}
        for (const [provider, models] of results) {
          byProvider[provider] = models
        }
        setData(byProvider)
      } catch (err: any) {
        if (cancelled) return
        setError(err?.message || 'Failed to load pricing')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [providers.join(','), limit, version])

  const modelsByProvider = useMemo(() => data, [data])

  return { modelsByProvider, loading, error, refresh }
}

