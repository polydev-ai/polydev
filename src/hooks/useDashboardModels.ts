import { useState, useEffect } from 'react'
import { usePreferences } from './usePreferences'
import { CLINE_PROVIDERS } from '../types/providers'

export interface DashboardModel {
  id: string
  name: string
  provider: string
  providerName: string
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

      if (!preferences?.model_preferences || Object.keys(preferences.model_preferences).length === 0) {
        setModels([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const dashboardModels: DashboardModel[] = []

        // Extract models from user preferences
        for (const [providerId, providerPref] of Object.entries(preferences.model_preferences)) {
          // Skip if providerPref is null or undefined
          if (!providerPref || typeof providerPref !== 'object') {
            continue
          }
          
          const providerConfig = CLINE_PROVIDERS[providerId as keyof typeof CLINE_PROVIDERS]
          
          // Ensure providerPref.models is an array and iterate safely
          const models = Array.isArray(providerPref.models) ? providerPref.models : []
          
          for (const modelId of models) {
            // Skip if modelId is not a valid string
            if (!modelId || typeof modelId !== 'string') {
              continue
            }
            
            // Try to get model details from models.dev API if available
            try {
              const response = await fetch(`/api/models-dev/providers?provider=${providerId}&include_models=true`)
              if (response.ok) {
                const data = await response.json()
                
                // Safely check if models array exists and find the model
                const modelsArray = Array.isArray(data.models) ? data.models : []
                const modelData = modelsArray.find((m: any) => m.id === modelId || m.friendly_id === modelId)
                
                if (modelData) {
                  dashboardModels.push({
                    id: modelData.id,
                    name: modelData.display_name || modelData.name,
                    provider: providerId,
                    providerName: providerConfig?.name || providerId,
                    tier: getTierFromProvider(providerId),
                    price: modelData.input_cost_per_million && modelData.output_cost_per_million ? {
                      input: modelData.input_cost_per_million / 1000,
                      output: modelData.output_cost_per_million / 1000
                    } : undefined,
                    features: {
                      supportsImages: modelData.supports_vision,
                      supportsTools: modelData.supports_tools,
                      supportsStreaming: true, // Most models support streaming
                      supportsReasoning: modelData.supports_reasoning
                    },
                    contextWindow: modelData.context_length,
                    maxTokens: modelData.max_tokens,
                    description: `${modelData.display_name || modelData.name} - ${providerConfig?.name || providerId}`
                  })
                  continue
                }
              }
            } catch (fetchError) {
              console.warn(`Failed to fetch model details for ${modelId} from ${providerId}:`, fetchError)
            }
            
            // Fallback: create basic model info from CLINE_PROVIDERS if available
            if (providerConfig?.supportedModels?.[modelId]) {
              const modelInfo = providerConfig.supportedModels[modelId]
              dashboardModels.push({
                id: modelId,
                name: formatModelName(modelId),
                provider: providerId,
                providerName: providerConfig.name,
                tier: getTierFromProvider(providerId),
                price: {
                  input: modelInfo.inputPrice || 0,
                  output: modelInfo.outputPrice || 0
                },
                features: {
                  supportsImages: modelInfo.supportsImages,
                  supportsTools: providerConfig.supportsTools,
                  supportsStreaming: providerConfig.supportsStreaming,
                  supportsReasoning: providerConfig.supportsReasoning
                },
                contextWindow: modelInfo.contextWindow || 4000,
                maxTokens: modelInfo.maxTokens || 4000,
                description: modelInfo.description || `${formatModelName(modelId)} - ${providerConfig.name}`
              })
            } else {
              // Last fallback: create minimal model info
              dashboardModels.push({
                id: modelId,
                name: formatModelName(modelId),
                provider: providerId,
                providerName: providerConfig?.name || providerId,
                tier: getTierFromProvider(providerId),
                description: `${formatModelName(modelId)} - ${providerConfig?.name || providerId}`
              })
            }
          }
        }

        // Sort models by provider preference order and then by name
        dashboardModels.sort((a, b) => {
          const aProviderPref = preferences.model_preferences[a.provider]
          const bProviderPref = preferences.model_preferences[b.provider]
          
          const aOrder = (aProviderPref && typeof aProviderPref.order === 'number') ? aProviderPref.order : 999
          const bOrder = (bProviderPref && typeof bProviderPref.order === 'number') ? bProviderPref.order : 999
          
          if (aOrder !== bOrder) {
            return aOrder - bOrder
          }
          
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

// Helper function to determine tier based on provider
function getTierFromProvider(providerId: string): 'cli' | 'api' | 'credits' {
  const cliProviders = ['claude-code', 'cline', 'vscode-lm']
  if (cliProviders.includes(providerId)) {
    return 'cli'
  }
  
  const apiProviders = ['anthropic', 'openai', 'gemini', 'mistral', 'bedrock', 'vertex']
  if (apiProviders.includes(providerId)) {
    return 'api'
  }
  
  return 'credits'
}

// Helper function to format model names
function formatModelName(modelId: string): string {
  return modelId
    .replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim()
}