import { useState, useEffect } from 'react'
import { usePreferences } from './usePreferences'

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

// Simple in-memory cache with TTL
const providerCache: Record<string, { data: any; timestamp: number }> = {}
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export function useDashboardModels() {
  const { preferences, loading: preferencesLoading, error: preferencesError } = usePreferences()
  const [models, setModels] = useState<DashboardModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [legacyProviders, setLegacyProviders] = useState<Record<string, any>>({})

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

        // Check CLI availability (cached for 1 minute to avoid repeated calls)
        const cliCacheKey = 'cli-availability'
        const cliCached = providerCache[cliCacheKey]
        const cliCacheTTL = 60 * 1000 // 1 minute for CLI status
        
        if (cliCached && (Date.now() - cliCached.timestamp) < cliCacheTTL) {
          cliResults = cliCached.data
          console.log('[useDashboardModels] Using cached CLI availability:', cliResults.length, 'CLIs')
        } else {
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
              // Cache CLI results
              providerCache[cliCacheKey] = { data: cliResults, timestamp: Date.now() }
              console.log('[useDashboardModels] Fetched CLI availability:', cliResults.length, 'CLIs')
            }
          } catch (cliError) {
            console.warn('Failed to check CLI availability:', cliError)
          }
        }

        // Get API keys (cached for 2 minutes)
        let apiKeys: any[] = []
        const apiKeysCacheKey = 'api-keys'
        const apiKeysCached = providerCache[apiKeysCacheKey]
        const apiKeysCacheTTL = 2 * 60 * 1000 // 2 minutes
        
        if (apiKeysCached && (Date.now() - apiKeysCached.timestamp) < apiKeysCacheTTL) {
          apiKeys = apiKeysCached.data
          console.log('[useDashboardModels] Using cached API keys:', apiKeys.length, 'keys')
        } else {
          try {
            const apiKeysResponse = await fetch('/api/api-keys', { credentials: 'include' })
            if (apiKeysResponse.ok) {
              const apiKeysData = await apiKeysResponse.json()
              apiKeys = apiKeysData.apiKeys || []
              // Cache API keys
              providerCache[apiKeysCacheKey] = { data: apiKeys, timestamp: Date.now() }
              console.log('[useDashboardModels] Fetched API keys:', apiKeys.length, 'keys')
            }
          } catch (apiKeyError) {
            console.warn('Failed to fetch API keys:', apiKeyError)
          }
        }

        // Only collect providers that user actually has configured models for
        const activeProviders = new Set<string>()
        
        // Collect providers from preferences
        if (preferences?.model_preferences && Object.keys(preferences.model_preferences).length > 0) {
          for (const [providerId, providerPref] of Object.entries(preferences.model_preferences)) {
            if (providerPref) {
              activeProviders.add(providerId)
            }
          }
        }
        
        // Collect providers from API keys (only if they have active keys)
        for (const apiKey of apiKeys) {
          if (apiKey.active) {
            activeProviders.add(apiKey.provider)
          }
        }

        // Only fetch legacy providers data for providers we actually need
        let legacyProvidersData = {}
        const providerDataCache: Record<string, any> = {}

        if (activeProviders.size > 0) {
          // Check cache first, then fetch only missing providers
          const now = Date.now()
          const needsFetch: string[] = []
          
          // Check which providers need fetching
          for (const providerId of activeProviders) {
            const cached = providerCache[providerId]
            if (!cached || (now - cached.timestamp) > CACHE_TTL) {
              needsFetch.push(providerId)
            } else {
              // Use cached data
              providerDataCache[providerId] = cached.data
              legacyProvidersData = { ...legacyProvidersData, [providerId]: cached.data }
            }
          }
          
          // Only fetch providers that aren't cached or are stale
          if (needsFetch.length > 0) {
            console.log(`[useDashboardModels] Fetching ${needsFetch.length} providers:`, needsFetch.join(', '))
            const fetchPromises = needsFetch.map(async (providerId) => {
              try {
                const response = await fetch(`/api/models-dev/providers?provider=${providerId}&include_models=true`)
                if (response.ok) {
                  const data = await response.json()
                  // Cache the result
                  providerCache[providerId] = { data, timestamp: now }
                  providerDataCache[providerId] = data
                  legacyProvidersData = { ...legacyProvidersData, [providerId]: data }
                }
              } catch (fetchError) {
                console.warn(`Failed to fetch provider data for ${providerId}:`, fetchError)
              }
            })
            
            await Promise.all(fetchPromises)
          } else {
            console.log(`[useDashboardModels] Using cached data for all ${activeProviders.size} providers`)
          }
          
          setLegacyProviders(legacyProvidersData)
        }
        
        // Now process models from user preferences using cached data
        if (preferences?.model_preferences && Object.keys(preferences.model_preferences).length > 0) {
          for (const [providerId, providerPref] of Object.entries(preferences.model_preferences)) {
          // Skip if providerPref is null or undefined
          if (!providerPref) {
            continue
          }
          
          const providerConfig = (legacyProvidersData as any)[providerId]
          const cachedProviderData = providerDataCache[providerId]
          
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
            
            // Try to get model details from cached data first
            if (cachedProviderData && cachedProviderData.models) {
              const modelsArray = Array.isArray(cachedProviderData.models) ? cachedProviderData.models : []
              const modelData = modelsArray.find((m: any) => m.id === modelId || m.friendly_id === modelId)
              
              if (modelData) {
                // Helper function to get the correct logo based on model creator
                const getModelCreatorLogo = (modelData: any, cachedProviderData: any, providerConfig: any, currentProviderId: string, modelId?: string) => {
                  console.log(`[Logo Debug] Processing model ${modelId} for provider ${currentProviderId}`, {
                    originalId: modelData.models_dev_metadata?.original_id || modelData.original_id,
                    cachedLogo: cachedProviderData?.logo,
                    configLogo: providerConfig?.logo_url
                  })
                  
                  // First priority: Check if model has original_id indicating different creator
                  const originalId = modelData.models_dev_metadata?.original_id || modelData.original_id
                  if (originalId && originalId.includes('/')) {
                    const creatorId = originalId.split('/')[0] // Extract "anthropic" from "anthropic/claude-sonnet-4"
                    if (creatorId && creatorId !== currentProviderId) {
                      const logoUrl = `https://models.dev/logos/${creatorId}.svg`
                      console.log(`[Logo Debug] Using creator logo for ${modelId}: ${logoUrl}`)
                      return logoUrl
                    }
                  }
                  
                  // Second priority: Model name-based detection for original creators
                  if (modelId) {
                    const modelLower = modelId.toLowerCase()
                    
                    // Claude models -> Anthropic logo
                    if (modelLower.includes('claude')) {
                      const logoUrl = `https://models.dev/logos/anthropic.svg`
                      console.log(`[Logo Debug] Using Anthropic logo for Claude model ${modelId}: ${logoUrl}`)
                      return logoUrl
                    }
                    
                    // Grok models -> xAI logo
                    if (modelLower.includes('grok')) {
                      const logoUrl = `https://models.dev/logos/xai.svg`
                      console.log(`[Logo Debug] Using xAI logo for Grok model ${modelId}: ${logoUrl}`)
                      return logoUrl
                    }
                    
                    // GPT models -> OpenAI logo
                    if (modelLower.includes('gpt') || modelLower.includes('o1') || modelLower.includes('davinci') || modelLower.includes('curie') || modelLower.includes('babbage') || modelLower.includes('ada')) {
                      const logoUrl = `https://models.dev/logos/openai.svg`
                      console.log(`[Logo Debug] Using OpenAI logo for GPT model ${modelId}: ${logoUrl}`)
                      return logoUrl
                    }
                    
                    // Gemini models -> Google logo
                    if (modelLower.includes('gemini')) {
                      const logoUrl = `https://models.dev/logos/google.svg`
                      console.log(`[Logo Debug] Using Google logo for Gemini model ${modelId}: ${logoUrl}`)
                      return logoUrl
                    }
                    
                    // Llama models -> Meta logo
                    if (modelLower.includes('llama')) {
                      const logoUrl = `https://models.dev/logos/meta.svg`
                      console.log(`[Logo Debug] Using Meta logo for Llama model ${modelId}: ${logoUrl}`)
                      return logoUrl
                    }
                    
                    // Mistral models -> Mistral logo
                    if (modelLower.includes('mistral') || modelLower.includes('mixtral')) {
                      const logoUrl = `https://models.dev/logos/mistralai.svg`
                      console.log(`[Logo Debug] Using Mistral logo for Mistral model ${modelId}: ${logoUrl}`)
                      return logoUrl
                    }
                  }
                  
                  // Fallback to provider logo only if no model creator identified
                  const fallbackLogo = cachedProviderData?.logo || providerConfig?.logo_url
                  console.log(`[Logo Debug] Using fallback provider logo for ${modelId}: ${fallbackLogo}`)
                  return fallbackLogo
                }

                dashboardModels.push({
                  id: modelData.friendly_id || modelData.id,
                  name: modelData.display_name || modelData.name,
                  provider: providerId,
                  providerName: providerConfig?.name || providerId,
                  providerLogo: getModelCreatorLogo(modelData, cachedProviderData, providerConfig, providerId, modelId),
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
            
            // Fallback: create basic model info from models.dev if available
            if (providerConfig?.supportedModels?.[modelId]) {
              const modelInfo = providerConfig.supportedModels[modelId]
              // Use smart logo resolution even in fallback
              const getLogoForFallback = (modelId: string, providerId: string, providerConfig: any) => {
                console.log(`[Logo Debug Fallback] Processing model ${modelId} for provider ${providerId}`)
                const modelLower = modelId.toLowerCase()
                
                // Claude models -> Anthropic logo
                if (modelLower.includes('claude')) {
                  const logoUrl = `https://models.dev/logos/anthropic.svg`
                  console.log(`[Logo Debug Fallback] Using Anthropic logo for Claude: ${logoUrl}`)
                  return logoUrl
                }
                
                // Grok models -> xAI logo
                if (modelLower.includes('grok')) {
                  const logoUrl = `https://models.dev/logos/xai.svg`
                  console.log(`[Logo Debug Fallback] Using xAI logo for Grok: ${logoUrl}`)
                  return logoUrl
                }
                
                // GPT models -> OpenAI logo
                if (modelLower.includes('gpt') || modelLower.includes('o1')) {
                  const logoUrl = `https://models.dev/logos/openai.svg`
                  console.log(`[Logo Debug Fallback] Using OpenAI logo for GPT: ${logoUrl}`)
                  return logoUrl
                }
                
                // Gemini models -> Google logo
                if (modelLower.includes('gemini')) {
                  const logoUrl = `https://models.dev/logos/google.svg`
                  console.log(`[Logo Debug Fallback] Using Google logo for Gemini: ${logoUrl}`)
                  return logoUrl
                }
                
                const fallbackLogo = providerConfig?.logo_url
                console.log(`[Logo Debug Fallback] Using provider fallback logo: ${fallbackLogo}`)
                return fallbackLogo
              }
              
              dashboardModels.push({
                id: modelId,
                name: formatModelName(modelId),
                provider: providerId,
                providerName: providerConfig.name,
                providerLogo: getLogoForFallback(modelId, providerId, providerConfig),
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
              const getLogoForMinimalFallback = (modelId: string, providerId: string, providerConfig: any) => {
                console.log(`[Logo Debug Minimal] Processing model ${modelId} for provider ${providerId}`)
                const modelLower = modelId.toLowerCase()
                
                // Claude models -> Anthropic logo
                if (modelLower.includes('claude')) {
                  const logoUrl = `https://models.dev/logos/anthropic.svg`
                  console.log(`[Logo Debug Minimal] Using Anthropic logo for Claude: ${logoUrl}`)
                  return logoUrl
                }
                
                // Grok models -> xAI logo
                if (modelLower.includes('grok')) {
                  const logoUrl = `https://models.dev/logos/xai.svg`
                  console.log(`[Logo Debug Minimal] Using xAI logo for Grok: ${logoUrl}`)
                  return logoUrl
                }
                
                // GPT models -> OpenAI logo
                if (modelLower.includes('gpt') || modelLower.includes('o1')) {
                  const logoUrl = `https://models.dev/logos/openai.svg`
                  console.log(`[Logo Debug Minimal] Using OpenAI logo for GPT: ${logoUrl}`)
                  return logoUrl
                }
                
                // Gemini models -> Google logo
                if (modelLower.includes('gemini')) {
                  const logoUrl = `https://models.dev/logos/google.svg`
                  console.log(`[Logo Debug Minimal] Using Google logo for Gemini: ${logoUrl}`)
                  return logoUrl
                }
                
                const fallbackLogo = providerConfig?.logo_url
                console.log(`[Logo Debug Minimal] Using provider minimal logo: ${fallbackLogo}`)
                return fallbackLogo
              }
              
              dashboardModels.push({
                id: modelId,
                name: formatModelName(modelId),
                provider: providerId,
                providerName: providerConfig?.name || providerId,
                providerLogo: getLogoForMinimalFallback(modelId, providerId, providerConfig),
                tier: getTierFromProvider(providerId, cliResults, hasApiKey),
                description: `${formatModelName(modelId)} - ${providerConfig?.name || providerId}`
              })
            }
          }
        }
        }

        // Third, process API keys to include models that aren't in preferences yet
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
              
              const providerConfig = (legacyProvidersData as any)[apiKey.provider]
              const cachedProviderData = providerDataCache[apiKey.provider]
              const modelId = apiKey.default_model
              
              if (modelId) {
                // Try to get model details from cached data first
                if (cachedProviderData && cachedProviderData.models) {
                  const modelsArray = Array.isArray(cachedProviderData.models) ? cachedProviderData.models : []
                  const modelData = modelsArray.find((m: any) => m.id === modelId || m.friendly_id === modelId)
                  
                  if (modelData) {
                    // Helper function to get the correct logo based on model creator
                    const getModelCreatorLogo = (modelData: any, cachedProviderData: any, providerConfig: any, currentProviderId: string, modelId?: string) => {
                      // First priority: Check if model has original_id indicating different creator
                      const originalId = modelData.models_dev_metadata?.original_id || modelData.original_id
                      if (originalId && originalId.includes('/')) {
                        const creatorId = originalId.split('/')[0] // Extract "anthropic" from "anthropic/claude-sonnet-4"
                        if (creatorId && creatorId !== currentProviderId) {
                          return `https://models.dev/logos/${creatorId}.svg`
                        }
                      }
                      
                      // Second priority: Model name-based detection for original creators
                      if (modelId) {
                        const modelLower = modelId.toLowerCase()
                        
                        // Claude models -> Anthropic logo
                        if (modelLower.includes('claude')) {
                          return `https://models.dev/logos/anthropic.svg`
                        }
                        
                        // Grok models -> xAI logo
                        if (modelLower.includes('grok')) {
                          return `https://models.dev/logos/xai.svg`
                        }
                        
                        // GPT models -> OpenAI logo
                        if (modelLower.includes('gpt') || modelLower.includes('o1')) {
                          return `https://models.dev/logos/openai.svg`
                        }
                        
                        // Gemini models -> Google logo
                        if (modelLower.includes('gemini')) {
                          return `https://models.dev/logos/google.svg`
                        }
                      }
                      
                      // Fallback to provider logo
                      return cachedProviderData?.logo || providerConfig?.logo_url
                    }

                    dashboardModels.push({
                      id: modelData.friendly_id || modelData.id,
                      name: modelData.display_name || modelData.name,
                      provider: apiKey.provider,
                      providerName: providerConfig?.name || apiKey.provider,
                      providerLogo: getModelCreatorLogo(modelData, cachedProviderData, providerConfig, apiKey.provider, modelId),
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

        // Remove duplicates based on id + provider combination with better logic
        const modelMap = new Map<string, DashboardModel>()
        
        for (const model of dashboardModels) {
          const key = `${model.id}::${model.provider}`
          const existing = modelMap.get(key)
          
          if (!existing) {
            modelMap.set(key, model)
            console.log(`[Deduplication] Added new model: ${key}`)
          } else {
            // If duplicate found, prefer the one with more complete information
            const currentScore = (model.price ? 2 : 0) + (model.features ? 2 : 0) + (model.contextWindow ? 1 : 0) + (model.maxTokens ? 1 : 0) + (model.description ? 1 : 0)
            const existingScore = (existing.price ? 2 : 0) + (existing.features ? 2 : 0) + (existing.contextWindow ? 1 : 0) + (existing.maxTokens ? 1 : 0) + (existing.description ? 1 : 0)
            
            console.log(`[Deduplication] Duplicate found for ${key}:`, {
              currentScore,
              existingScore,
              currentHasPrice: !!model.price,
              existingHasPrice: !!existing.price
            })
            
            if (currentScore > existingScore) {
              modelMap.set(key, model)
              console.log(`[Deduplication] Replaced with better model: ${key}`)
            } else {
              console.log(`[Deduplication] Kept existing model: ${key}`)
            }
          }
        }
        
        const uniqueModels = Array.from(modelMap.values())
        
        console.log(`[useDashboardModels] Deduplicated models from ${dashboardModels.length} to ${uniqueModels.length}`)

        // Sort models by provider preference order and then by name
        uniqueModels.sort((a, b) => {
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

        setModels(uniqueModels)
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
  const apiProviders = ['anthropic', 'openai', 'google', 'gemini', 'mistral', 'bedrock', 'vertex', 'groq', 'deepseek', 'xai', 'moonshotai']
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