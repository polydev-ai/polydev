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

        for (const [providerId, providerPref] of Object.entries(preferences.model_preferences)) {
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
            const { provider, models: providerModels } = await modelsDevClientService.getProviderWithModels(providerId)
            const providerName = (provider as any)?.display_name || (provider as any)?.name || providerId
            const providerLogo = (provider as any)?.logo_url

            for (const mId of preferredModels) {
              const modelData = (providerModels || []).find((m: any) => m.friendly_id === mId || m.id === mId)
              if (modelData) {
                dashboardModels.push({
                  id: modelData.friendly_id || modelData.id,
                  name: modelData.display_name || modelData.name,
                  provider: providerId,
                  providerName,
                  providerLogo,
                  // Avoid provider hardcoding; treat all added models as API-tier selections in UI
                  tier: 'api',
                  price: (modelData.input_cost_per_million != null && modelData.output_cost_per_million != null)
                    ? { input: modelData.input_cost_per_million, output: modelData.output_cost_per_million }
                    : undefined,
                  features: {
                    supportsImages: modelData.supports_vision,
                    supportsTools: modelData.supports_tools,
                    supportsStreaming: modelData.supports_streaming,
                    supportsReasoning: modelData.supports_reasoning
                  },
                  contextWindow: modelData.context_length,
                  maxTokens: modelData.max_tokens,
                  description: `${modelData.display_name || modelData.name} - ${providerName}`
                })
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
