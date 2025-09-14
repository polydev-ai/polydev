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
  const { preferences, loading: preferencesLoading, error: preferencesError } = usePreferences()
  const [models, setModels] = useState<DashboardModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
          setModels([])
          setError(null)
          return
        }

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

            for (const mId of preferredModels) {
              const modelData = (providerModels || []).find((m: any) => m.friendly_id === mId || m.id === mId)
              if (modelData) {
                const price = (modelData.input_cost_per_million != null && modelData.output_cost_per_million != null)
                  ? { input: Number(modelData.input_cost_per_million), output: Number(modelData.output_cost_per_million) }
                  : undefined
                
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
  }, [preferences, preferencesLoading, preferencesError])

  return {
    models,
    loading: loading || preferencesLoading,
    error: error || preferencesError,
    hasModels: models.length > 0
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
