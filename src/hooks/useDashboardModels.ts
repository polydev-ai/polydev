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

      try {
        setLoading(true)
        const dashboardModels: DashboardModel[] = []
        let cliResults: any[] = []

        // First, check CLI availability to inform tier decisions
        try {
          const cliResponse = await fetch('/api/cli-detect', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: 'dashboard-check',
              mcp_token: 'temp-token'
            })
          })
          
          if (cliResponse.ok) {
            cliResults = await cliResponse.json()
            console.log('CLI availability check:', cliResults)
          }
        } catch (cliError) {
          console.warn('Failed to check CLI availability:', cliError)
        }

        // Get API keys to determine what's available
        let apiKeys: any[] = []
        try {
          const apiKeysResponse = await fetch('/api/api-keys', { credentials: 'include' })
          if (apiKeysResponse.ok) {
            const apiKeysData = await apiKeysResponse.json()
            apiKeys = apiKeysData.apiKeys || []
          }
        } catch (apiKeyError) {
          console.warn('Failed to fetch API keys:', apiKeyError)
        }

        // Second, extract models from user preferences
        if (preferences?.model_preferences && Object.keys(preferences.model_preferences).length > 0) {
          for (const [providerId, providerPref] of Object.entries(preferences.model_preferences)) {
          // Skip if providerPref is null or undefined
          if (!providerPref) {
            continue
          }
          
          const providerConfig = CLINE_PROVIDERS[providerId as keyof typeof CLINE_PROVIDERS]
          
          // Check if this provider has an API key
          const hasApiKey = apiKeys.some(key => key.provider === providerId && key.active)
          
          // Handle both old format (string) and new format (object with models array)
          let models: string[] = []
          
          if (typeof providerPref === 'string') {
            // Old format: provider_id: "model_name"
            models = [providerPref]
          } else if (typeof providerPref === 'object' && Array.isArray(providerPref.models)) {
            // New format: provider_id: { models: ["model1", "model2"], order: 1 }
            models = providerPref.models
          } else {
            // Skip invalid formats
            continue
          }
          
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
                    id: modelData.friendly_id || modelData.id,
                    name: modelData.display_name || modelData.name,
                    provider: providerId,
                    providerName: providerConfig?.name || providerId,
                    tier: getTierFromProvider(providerId, cliResults, hasApiKey),
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
                tier: getTierFromProvider(providerId, cliResults, hasApiKey),
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
                tier: getTierFromProvider(providerId, cliResults, hasApiKey),
                description: `${formatModelName(modelId)} - ${providerConfig?.name || providerId}`
              })
            }
          }
        }
        }

        // Third, fetch API keys to include models that aren't in preferences yet
        try {
          const providersInPreferences = new Set(Object.keys(preferences?.model_preferences || {}))
          
          for (const apiKey of apiKeys) {
            // Skip if this provider is already in preferences
            if (providersInPreferences.has(apiKey.provider)) {
              continue
            }
            
            // Skip if not active
            if (!apiKey.active) {
              continue
            }
              
              const providerConfig = CLINE_PROVIDERS[apiKey.provider as keyof typeof CLINE_PROVIDERS]
              const modelId = apiKey.default_model
              
              if (modelId) {
                // Try to get model details from models.dev API if available
                try {
                  const response = await fetch(`/api/models-dev/providers?provider=${apiKey.provider}&include_models=true`)
                  if (response.ok) {
                    const data = await response.json()
                    
                    const modelsArray = Array.isArray(data.models) ? data.models : []
                    const modelData = modelsArray.find((m: any) => m.id === modelId || m.friendly_id === modelId)
                    
                    if (modelData) {
                      dashboardModels.push({
                        id: modelData.friendly_id || modelData.id,
                        name: modelData.display_name || modelData.name,
                        provider: apiKey.provider,
                        providerName: providerConfig?.name || apiKey.provider,
                        tier: getTierFromProvider(apiKey.provider, cliResults, true),
                        price: modelData.input_cost_per_million && modelData.output_cost_per_million ? {
                          input: modelData.input_cost_per_million / 1000,
                          output: modelData.output_cost_per_million / 1000
                        } : undefined,
                        features: {
                          supportsImages: modelData.supports_vision,
                          supportsTools: modelData.supports_tools,
                          supportsStreaming: true,
                          supportsReasoning: modelData.supports_reasoning
                        },
                        contextWindow: modelData.context_length,
                        maxTokens: modelData.max_tokens,
                        description: `${modelData.display_name || modelData.name} - ${providerConfig?.name || apiKey.provider}`
                      })
                      continue
                    }
                  }
                } catch (fetchError) {
                  console.warn(`Failed to fetch model details for ${modelId} from ${apiKey.provider}:`, fetchError)
                }
                
                // Fallback: create basic model info
                if (providerConfig?.supportedModels?.[modelId]) {
                  const modelInfo = providerConfig.supportedModels[modelId]
                  dashboardModels.push({
                    id: modelId,
                    name: formatModelName(modelId),
                    provider: apiKey.provider,
                    providerName: providerConfig.name,
                    tier: getTierFromProvider(apiKey.provider, cliResults, true),
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
                    provider: apiKey.provider,
                    providerName: providerConfig?.name || apiKey.provider,
                    tier: getTierFromProvider(apiKey.provider, cliResults, true),
                    description: `${formatModelName(modelId)} - ${providerConfig?.name || apiKey.provider}`
                  })
                }
              }
          }
        } catch (apiKeyFetchError) {
          console.warn('Failed to process API keys for missing providers:', apiKeyFetchError)
        }

        // Fourth, add CLI status indicators to model descriptions
        if (cliResults.length > 0) {
          // Check Claude Code CLI
          const claudeCodeCli = cliResults.find((cli: any) => cli.provider === 'claude_code')
          if (claudeCodeCli?.status === 'available' && claudeCodeCli?.authenticated) {
            // Add CLI indicator to existing Anthropic models
            dashboardModels.forEach(model => {
              if (model.provider === 'anthropic') {
                model.description = `${model.description} (CLI Available: Claude Code)`
              }
            })
          }
          
          // Check Codex CLI
          const codexCli = cliResults.find((cli: any) => cli.provider === 'codex_cli')
          if (codexCli?.status === 'available' && codexCli?.authenticated) {
            // Add CLI indicator to existing OpenAI models
            dashboardModels.forEach(model => {
              if (model.provider === 'openai') {
                model.description = `${model.description} (CLI Available: Codex CLI)`
              }
            })
          }
          
          // Check Gemini CLI
          const geminiCli = cliResults.find((cli: any) => cli.provider === 'gemini_cli')
          if (geminiCli?.status === 'available' && geminiCli?.authenticated) {
            // Add CLI indicator to existing Google models
            dashboardModels.forEach(model => {
              if (model.provider === 'google') {
                model.description = `${model.description} (CLI Available: Gemini CLI)`
              }
            })
          } else if (geminiCli?.status === 'unavailable' && geminiCli?.message?.includes('Node.js compatibility')) {
            // Show compatibility issue for Google models
            dashboardModels.forEach(model => {
              if (model.provider === 'google') {
                model.description = `${model.description} (Gemini CLI: Node.js compatibility issue)`
              }
            })
          }
        }

        // Sort models by provider preference order and then by name
        dashboardModels.sort((a, b) => {
          const modelPreferences = preferences?.model_preferences || {}
          const aProviderPref = modelPreferences[a.provider]
          const bProviderPref = modelPreferences[b.provider]
          
          // Handle both old format (string) and new format (object with order)
          const aOrder = (aProviderPref && typeof aProviderPref === 'object' && typeof aProviderPref.order === 'number') ? aProviderPref.order : 999
          const bOrder = (bProviderPref && typeof bProviderPref === 'object' && typeof bProviderPref.order === 'number') ? bProviderPref.order : 999
          
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

// Helper function to determine tier based on provider and CLI availability
function getTierFromProvider(providerId: string, cliResults?: any[], hasApiKey: boolean = false): 'cli' | 'api' | 'credits' {
  // Direct CLI providers
  const directCliProviders = ['claude-code', 'cline', 'vscode-lm']
  if (directCliProviders.includes(providerId)) {
    return 'cli'
  }
  
  // Check if provider has CLI available (prioritize CLI over API/credits)
  if (cliResults) {
    // Anthropic models can use Claude Code CLI
    if (providerId === 'anthropic') {
      const claudeCodeCli = cliResults.find((cli: any) => cli.provider === 'claude_code')
      if (claudeCodeCli?.status === 'available' && claudeCodeCli?.authenticated) {
        return 'cli'
      }
    }
    
    // OpenAI models can use Codex CLI
    if (providerId === 'openai') {
      const codexCli = cliResults.find((cli: any) => cli.provider === 'codex_cli')
      if (codexCli?.status === 'available' && codexCli?.authenticated) {
        return 'cli'
      }
    }
    
    // Google models can use Gemini CLI
    if (providerId === 'google') {
      const geminiCli = cliResults.find((cli: any) => cli.provider === 'gemini_cli')
      if (geminiCli?.status === 'available' && geminiCli?.authenticated) {
        return 'cli'
      }
    }
  }
  
  // If CLI is not available, check if they have API key
  const apiProviders = ['anthropic', 'openai', 'google', 'gemini', 'mistral', 'bedrock', 'vertex']
  if (apiProviders.includes(providerId)) {
    return hasApiKey ? 'api' : 'credits'
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