import { useState, useEffect, useRef } from 'react'
import { modelsDevClientService } from '../lib/models-dev-client'
import { normalizeProviderName } from '@/lib/provider-utils'

export interface DashboardModel {
  id: string
  name: string
  provider: string
  providerName: string
  providerLogo?: string
  providerWebsite?: string
  tier: 'cli' | 'api' | 'admin' | 'premium' | 'normal' | 'eco'
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

// Cache for models to prevent duplicate fetching
const modelsCache = {
  models: [] as DashboardModel[],
  timestamp: 0,
  loading: false,
  CACHE_DURATION: 5 * 60 * 1000 // 5 minutes
}

let activeRequest: Promise<void> | null = null

export function useDashboardModels() {
  const [models, setModels] = useState<DashboardModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true

    const fetchDashboardModels = async () => {
      // Check cache first
      const now = Date.now()
      if (modelsCache.models.length > 0 && (now - modelsCache.timestamp) < modelsCache.CACHE_DURATION) {
        setModels(modelsCache.models)
        setLoading(false)
        setError(null)
        return
      }

      // Prevent duplicate requests
      if (activeRequest) {
        await activeRequest
        if (isMountedRef.current && modelsCache.models.length > 0) {
          setModels(modelsCache.models)
          setLoading(false)
          setError(null)
        }
        return
      }

      activeRequest = (async () => {
      try {
        setLoading(true)

        // Fetch API keys directly from the database instead of using model_preferences
        const response = await fetch('/api/api-keys')
        if (!response.ok) {
          throw new Error('Failed to fetch API keys')
        }

        const { apiKeys } = await response.json()
        // Remove excessive logging
        // console.log('[useDashboardModels] Fetched API keys:', apiKeys)

        // If no API keys configured, show no models
        if (!apiKeys || apiKeys.length === 0) {
          // console.log('[useDashboardModels] No API keys found')
          setModels([])
          setError(null)
          return
        }

        const dashboardModels: DashboardModel[] = []

        // Batch provider data fetching to prevent duplicate requests
        const providerDataCache = new Map<string, any>()
        const uniqueProviders: string[] = [...new Set(apiKeys.map((key: any) => normalizeProviderName(key.provider)))] as string[]

        // Pre-fetch all provider data in parallel
        await Promise.allSettled(
          uniqueProviders.map(async (providerId: string) => {
            try {
              const richResp = await fetch(`/api/models-dev/providers?provider=${encodeURIComponent(providerId)}&rich=true`)
              if (richResp.ok) {
                const richData = await richResp.json()
                const rich = Array.isArray(richData) ? richData[0] : richData
                if (rich && Array.isArray(rich.models)) {
                  providerDataCache.set(providerId, {
                    name: rich.name || providerId,
                    logo: rich.logo || rich.logo_url,
                    website: rich.website,
                    models: rich.models.map((m: any) => ({
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
                  })
                }
              }
            } catch (e) {
              // Ignore individual provider failures
            }
          })
        )

        // Process each API key to create models
        for (const apiKey of apiKeys) {
          const providerId = normalizeProviderName(apiKey.provider)
          const defaultModel = apiKey.default_model

          if (!defaultModel) continue

          try {
            // Use cached provider data
            let providerName = providerId
            let providerLogo: string | undefined
            let providerWebsite: string | undefined
            let providerModels: any[] = []

            const cachedData = providerDataCache.get(providerId)
            if (cachedData) {
              providerName = cachedData.name
              providerLogo = cachedData.logo
              providerWebsite = cachedData.website
              providerModels = cachedData.models
            } else {
              // Fallback to registry-based API only if cache miss
              try {
                const { provider, models } = await modelsDevClientService.getProviderWithModels(providerId)
                providerModels = models || []
                providerName = (provider as any)?.display_name || (provider as any)?.name || providerId
                providerLogo = (provider as any)?.logo || (provider as any)?.logo_url
                providerWebsite = (provider as any)?.website
              } catch (e) {
                console.warn(`[useDashboardModels] Failed to fetch fallback for ${providerId}:`, e)
              }
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

            // Process the default model from this API key
            const mId = defaultModel

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

              // Remove excessive debug logging
              // console.log(`[useDashboardModels] ${mId} pricing debug:`, price)

              const modelEntry = {
                id: modelData.friendly_id || modelData.id,
                name: modelData.display_name || modelData.name,
                provider: providerId,
                providerName,
                providerLogo,
                providerWebsite,
                tier: 'api' as const,
                isConfigured: apiKey.active, // Mark as configured if API key is active
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
                providerWebsite,
                tier: 'api',
                isConfigured: apiKey.active,
                price: (mappingPricing && mappingPricing.input != null && mappingPricing.output != null)
                  ? { input: Number(mappingPricing.input), output: Number(mappingPricing.output) }
                  : undefined,
                description: `${formatModelName(mId)} - ${providerName}`
              })
            }
          } catch (e) {
            console.warn(`[useDashboardModels] Failed to fetch provider/models for ${providerId}:`, e)
          }
        }

        // Sort by API key display_order, then by name
        dashboardModels.sort((a, b) => {
          const aApiKey = apiKeys.find((k: any) => normalizeProviderName(k.provider) === a.provider)
          const bApiKey = apiKeys.find((k: any) => normalizeProviderName(k.provider) === b.provider)
          const aOrder = aApiKey?.display_order ?? 999
          const bOrder = bApiKey?.display_order ?? 999
          if (aOrder !== bOrder) return aOrder - bOrder
          return a.name.localeCompare(b.name)
        })

        // Update cache
        modelsCache.models = dashboardModels
        modelsCache.timestamp = Date.now()

        if (isMountedRef.current) {
          setModels(dashboardModels)
          setError(null)
        }
      } catch (err) {
        console.error('Error fetching dashboard models:', err)
        if (isMountedRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to fetch dashboard models')
          setModels([])
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false)
        }
        activeRequest = null
      }
      })()

      await activeRequest
    }

    fetchDashboardModels()

    return () => {
      isMountedRef.current = false
    }
  }, [refreshTrigger])

  const refresh = async () => {
    // Clear cache on manual refresh
    modelsCache.models = []
    modelsCache.timestamp = 0
    setRefreshTrigger(prev => prev + 1)
  }

  return {
    models,
    loading,
    error,
    hasModels: models.length > 0,
    refresh
  }
}

// Simplified tier mapping independent of CLI/API keys
function getTierFromProvider(providerId: string): 'cli' | 'api' | 'admin' {
  const cliProviders = ['claude-code', 'cline', 'vscode-lm']
  if (cliProviders.includes(providerId)) return 'cli'

  const apiProviders = ['anthropic', 'openai', 'google', 'gemini', 'mistral', 'bedrock', 'vertex']
  if (apiProviders.includes(providerId)) return 'api'

  return 'admin'
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
