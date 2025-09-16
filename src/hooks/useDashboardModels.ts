import { useState, useEffect } from 'react'
import { usePreferences } from './usePreferences'
import { modelsDevClientService } from '../lib/models-dev-client'

export interface DashboardModel {
  id: string
  name: string
  provider: string
  providerName: string
  providerLogo?: string
  tier: 'cli' | 'api' | 'credits'
  isConfigured?: boolean
  price?: {
    input: number
    output: number
  }
  features?: {
    supportsImages?: boolean
    supportsTools?: boolean
    supportsStreaming?: boolean
    supportsReasoning?: boolean
  }
  contextWindow?: number
  maxTokens?: number
  description?: string
}

export function useDashboardModels() {
  const { preferences, loading: preferencesLoading, error: preferencesError, refetch: refetchPreferences } = usePreferences()
  const [models, setModels] = useState<DashboardModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    const fetchDashboardModels = async () => {
      if (preferencesLoading) return

      if (preferencesError) {
        setError(preferencesError)
        setLoading(false)
        return
      }

      try {
        setLoading(true)

        // If no preferences, expose no models
        if (!preferences?.model_preferences || Object.keys(preferences.model_preferences).length === 0) {
          console.log('[useDashboardModels] No model preferences found')
          setModels([])
          setError(null)
          return
        }

        console.log('[useDashboardModels] Processing model preferences:', preferences.model_preferences)

        const dashboardModels: DashboardModel[] = []

        // Normalize certain provider IDs to avoid duplicates and missing data
        const normalizeProviderId = (pid: string) => pid === 'xai' ? 'x-ai' : pid

        for (const [rawProviderId, providerPref] of Object.entries(preferences.model_preferences)) {
          const providerId = normalizeProviderId(rawProviderId)
          if (!providerPref) continue

          // Normalize models list from preference record
          let preferredModels: string[] = []
          if (typeof providerPref === 'string') {
            preferredModels = [providerPref]
          } else if (typeof (providerPref as any) === 'object' && Array.isArray((providerPref as any).models)) {
            preferredModels = (providerPref as any).models as string[]
          }
          if (preferredModels.length === 0) continue

          try {
            // Prefer rich provider data for accurate logos and pricing
            let providerName = providerId
            let providerLogo: string | undefined
            let providerModels: any[] = []

            try {
              const richResp = await fetch(`/api/models-dev/providers?provider=${encodeURIComponent(providerId)}&rich=true`)
              if (richResp.ok) {
                const richData = await richResp.json()
                const rich = Array.isArray(richData) ? richData[0] : richData
                if (Array.isArray(rich.models)) {
                  providerModels = rich.models.map((m: any) => ({
                    friendly_id: m.id,
                    id: m.id,
                    name: m.name,
                    display_name: m.name,
                    context_length: m.contextWindow,
                    max_tokens: m.maxTokens,
                    input_cost_per_million: m.pricing?.input,
                    output_cost_per_million: m.pricing?.output,
                    supports_vision: m.supportsVision,
                    supports_tools: m.supportsTools,
                    supports_streaming: m.supportsStreaming,
                    supports_reasoning: m.supportsReasoning,
                    description: m.description,
                  }))
                }
                providerName = rich.name || providerId
                providerLogo = rich.logo || rich.logo_url
              }
            } catch (e) {
              // Ignore and fallback to registry-based API
            }

            if (providerModels.length === 0) {
              const { provider, models } = await modelsDevClientService.getProviderWithModels(providerId)
              providerModels = models || []
              providerName = (provider as any)?.display_name || (provider as any)?.name || providerId
              providerLogo = (provider as any)?.logo || (provider as any)?.logo_url
            }

            // Build a lookup with friendly and normalized keys for robust matching
            const modelLookup = new Map<string, any>()
            for (const m of providerModels || []) {
              const fid = String(m.friendly_id || m.id || '').toLowerCase()
              const pid = String(m.id || '').toLowerCase()
              const normalizedFid = toFriendlyId(fid)
              if (fid) modelLookup.set(fid, m)
              if (pid) modelLookup.set(pid, m)
              if (normalizedFid) modelLookup.set(normalizedFid, m)
            }

            for (const mId of preferredModels) {
              // Try direct and normalized matches first
              const candidates = [
                String(mId).toLowerCase(),
                toFriendlyId(String(mId).toLowerCase()),
              ]

              let modelData: any | undefined
              for (const key of candidates) {
                if (modelLookup.has(key)) {
                  modelData = modelLookup.get(key)
                  break
                }
              }

              // If still not found, best-effort: query mapping API for pricing by friendly id
              let mappingPricing: { input?: number; output?: number } | undefined
              if (!modelData) {
                try {
                  const fid = toFriendlyId(String(mId))
                  if (fid) {
                    const mapResp = await fetch(`/api/models-dev/mappings?friendly_id=${encodeURIComponent(fid)}&provider_id=${encodeURIComponent(providerId)}`)
                    if (mapResp.ok) {
                      const mj = await mapResp.json()
                      if (mj && mj.cost) {
                        mappingPricing = {
                          input: Number(mj.cost.input ?? 0),
                          output: Number(mj.cost.output ?? 0),
                        }
                      } else if (mj && mj.pricing && (mj.pricing.input != null)) {
                        mappingPricing = {
                          input: Number(mj.pricing.input ?? 0),
                          output: Number(mj.pricing.output ?? 0),
                        }
                      }
                    }
                  }
                } catch (_) {
                  // ignore mapping failures
                }
              }

              if (modelData) {
                const price = (modelData.input_cost_per_million != null && modelData.output_cost_per_million != null)
                  ? { input: Number(modelData.input_cost_per_million), output: Number(modelData.output_cost_per_million) }
                  : (mappingPricing && mappingPricing.input != null && mappingPricing.output != null
                      ? { input: Number(mappingPricing.input), output: Number(mappingPricing.output) }
                      : undefined)
                
                // Debug pricing
                console.log(`[useDashboardModels] ${mId} pricing debug:`, {
                  input_raw: modelData.input_cost_per_million,
                  output_raw: modelData.output_cost_per_million,
                  price_final: price,
                  provider: providerId
                })
                
                const modelEntry = {
                  id: modelData.friendly_id || modelData.id,
                  name: modelData.display_name || modelData.name,
                  provider: providerId,
                  providerName,
                  providerLogo,
                  // Avoid provider hardcoding; treat all added models as API-tier selections in UI
                  tier: 'api' as const,
                  // Normalize pricing to per 1M tokens in USD
                  price,
                  features: {
                    supportsImages: modelData.supports_vision,
                    supportsTools: modelData.supports_tools,
                    supportsStreaming: modelData.supports_streaming,
                    supportsReasoning: modelData.supports_reasoning
                  },
                  contextWindow: modelData.context_length,
                  maxTokens: modelData.max_tokens,
                  description: `${modelData.display_name || modelData.name} - ${providerName}`
                }
                dashboardModels.push(modelEntry)
              } else {
                // Minimal fallback entry if registry lacks details
                dashboardModels.push({
                  id: mId,
                  name: formatModelName(mId),
                  provider: providerId,
                  providerName,
                  providerLogo,
                  tier: 'api',
                  price: (mappingPricing && mappingPricing.input != null && mappingPricing.output != null)
                    ? { input: Number(mappingPricing.input), output: Number(mappingPricing.output) }
                    : undefined,
                  description: `${formatModelName(mId)} - ${providerName}`
                })
              }
            }
          } catch (e) {
            console.warn(`[useDashboardModels] Failed to fetch provider/models for ${providerId}:`, e)
          }
        }

        // Sort by provider order, then by name
        const modelPreferences = preferences?.model_preferences || {}
        dashboardModels.sort((a, b) => {
          const aOrder = (modelPreferences[a.provider] as any)?.order ?? 999
          const bOrder = (modelPreferences[b.provider] as any)?.order ?? 999
          if (aOrder !== bOrder) return aOrder - bOrder
          return a.name.localeCompare(b.name)
        })

        setModels(dashboardModels)
        setError(null)
      } catch (err) {
        console.error('Error fetching dashboard models:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch dashboard models')
        setModels([])
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardModels()
  }, [preferences, preferencesLoading, preferencesError, refreshTrigger])

  const refresh = async () => {
    await refetchPreferences()
    setRefreshTrigger(prev => prev + 1)
  }

  return {
    models,
    loading: loading || preferencesLoading,
    error: error || preferencesError,
    hasModels: models.length > 0,
    refresh
  }
}

// Simplified tier mapping independent of CLI/API keys
function getTierFromProvider(providerId: string): 'cli' | 'api' | 'credits' {
  const cliProviders = ['claude-code', 'cline', 'vscode-lm']
  if (cliProviders.includes(providerId)) return 'cli'

  const apiProviders = ['anthropic', 'openai', 'google', 'gemini', 'mistral', 'bedrock', 'vertex']
  if (apiProviders.includes(providerId)) return 'api'

  return 'credits'
}

function formatModelName(modelId: string): string {
  return modelId
    .replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim()
}

// Create a friendly, comparable model id by stripping provider prefixes and version/date suffixes
function toFriendlyId(modelId: string): string {
  return String(modelId)
    .replace(/^[^\/]+\//, '') // remove provider prefix like "openai/"
    .replace(/-\d{6,8}$/i, '') // remove dates like -20241022 or -241212
    .replace(/-v\d+$/i, '') // remove version suffix like -v2
    .toLowerCase()
}

function normalizeModelId(modelId: string): string {
  return toFriendlyId(modelId)
}
