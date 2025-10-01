'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from './useAuth'
import { usePreferences } from './usePreferences'
import { createClient } from '../app/utils/supabase/client'

interface ApiKey {
  id: string
  provider: string
  key_preview: string
  encrypted_key: string | null
  active: boolean
  api_base?: string
  default_model?: string
  is_preferred?: boolean
  is_primary?: boolean
  monthly_budget?: number
  display_order?: number
  created_at: string
  last_used_at?: string
}

interface CLIConfig {
  user_id: string
  provider: string
  custom_path: string | null
  enabled: boolean
  status: 'available' | 'unavailable' | 'not_installed' | 'unchecked' | 'checking'
  last_checked_at?: string
  statusMessage?: string
  message?: string
  cli_version?: string
  authenticated?: boolean
  issue_type?: 'not_installed' | 'not_authenticated' | 'compatibility_issue' | 'environment_issue' | 'unknown'
  solutions?: string[]
  install_command?: string
  auth_command?: string
}

interface ApiKeyUsage {
  api_key_id: string
  total_cost: number
  monthly_cost: number
  token_count: number
  request_count: number
  last_used: string | null
}

interface ModelsDevProvider {
  id: string
  name: string
  display_name?: string
  description: string
  logo?: string
  logo_url?: string
  website?: string
  baseUrl?: string
  base_url?: string
  modelsCount?: number
  supportsStreaming?: boolean
  supportsTools?: boolean
  supportsVision?: boolean
  models?: any[]
}

// Global cache for enhanced API keys data to prevent duplicate fetching
const enhancedApiKeysCache = {
  apiKeys: null as ApiKey[] | null,
  legacyProviders: null as Record<string, any> | null,
  modelsDevProviders: null as ModelsDevProvider[] | null,
  cliStatuses: null as CLIConfig[] | null,
  apiKeyUsage: null as Record<string, ApiKeyUsage> | null,
  providerModels: null as Record<string, any[]> | null,
  timestamps: {
    apiKeys: 0,
    providers: 0,
    cliStatuses: 0,
    apiKeyUsage: 0,
    providerModels: 0,
  },
  CACHE_DURATION: 3 * 60 * 1000, // 3 minutes for API keys data
  LONG_CACHE_DURATION: 10 * 60 * 1000, // 10 minutes for provider registry
}

let activeRequests: Record<string, Promise<any> | null> = {}

export function useEnhancedApiKeysData() {
  const { user } = useAuth()
  const { preferences, loading: preferencesLoading } = usePreferences()
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [legacyProviders, setLegacyProviders] = useState<Record<string, any>>({})
  const [modelsDevProviders, setModelsDevProviders] = useState<ModelsDevProvider[]>([])
  const [cliStatuses, setCliStatuses] = useState<CLIConfig[]>([])
  const [apiKeyUsage, setApiKeyUsage] = useState<Record<string, ApiKeyUsage>>({})
  const [providerModels, setProviderModels] = useState<Record<string, any[]>>({})
  const [loadingModels, setLoadingModels] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(true)
  const supabase = createClient()

  // Fetch with caching and deduplication
  const fetchWithCache = useCallback(async (key: string, fetcher: () => Promise<any>, cacheDuration?: number) => {
    const now = Date.now()
    const duration = cacheDuration || enhancedApiKeysCache.CACHE_DURATION

    // Check cache first
    if (enhancedApiKeysCache[key as keyof typeof enhancedApiKeysCache] &&
        (now - enhancedApiKeysCache.timestamps[key as keyof typeof enhancedApiKeysCache.timestamps]) < duration) {
      return enhancedApiKeysCache[key as keyof typeof enhancedApiKeysCache]
    }

    // Prevent duplicate requests
    if (activeRequests[key]) {
      return await activeRequests[key]
    }

    activeRequests[key] = (async () => {
      try {
        const data = await fetcher()

        // Update cache
        enhancedApiKeysCache[key as keyof typeof enhancedApiKeysCache] = data
        enhancedApiKeysCache.timestamps[key as keyof typeof enhancedApiKeysCache.timestamps] = now

        return data
      } catch (err) {
        console.warn(`Failed to fetch ${key}:`, err)
        return enhancedApiKeysCache[key as keyof typeof enhancedApiKeysCache] || null
      } finally {
        activeRequests[key] = null
      }
    })()

    return await activeRequests[key]
  }, [])

  // Fetch provider models with caching
  const fetchProviderModels = useCallback(async (providerId: string) => {
    const cacheKey = `providerModels_${providerId}`

    try {
      setLoadingModels(prev => ({ ...prev, [providerId]: true }))

      const data = await fetchWithCache(cacheKey, async () => {
        const response = await fetch(`/api/models-dev/providers?provider=${providerId}&rich=true`)
        if (!response.ok) {
          throw new Error('Failed to fetch models')
        }
        const result = await response.json()
        const providerData = Array.isArray(result) ? result[0] : result
        return (providerData?.models || []).map((model: any) => ({
          id: model.id,
          provider_id: providerId,
          name: model.name,
          display_name: model.name,
          friendly_id: model.id,
          max_tokens: model.maxTokens,
          context_length: model.contextWindow,
          input_cost_per_million: model.pricing?.input,
          output_cost_per_million: model.pricing?.output,
          supports_vision: model.supportsVision,
          supports_tools: model.supportsTools,
          supports_reasoning: false,
          description: model.description
        }))
      })

      if (isMountedRef.current) {
        setProviderModels(prev => ({ ...prev, [providerId]: data || [] }))
      }

      return data || []
    } catch (error) {
      console.warn(`Failed to fetch models for provider ${providerId}:`, error)
      if (isMountedRef.current) {
        setProviderModels(prev => ({ ...prev, [providerId]: [] }))
      }
      return []
    } finally {
      if (isMountedRef.current) {
        setLoadingModels(prev => ({ ...prev, [providerId]: false }))
      }
    }
  }, [fetchWithCache])

  // Load all data in parallel with caching
  const loadAllData = useCallback(async () => {
    if (!user?.id || !isMountedRef.current) return

    try {
      setLoading(true)
      setError(null)

      // Fetch all data in parallel with caching
      const [
        apiKeysData,
        providersData,
        cliStatusData,
        usageData
      ] = await Promise.allSettled([
        fetchWithCache('apiKeys', async () => {
          const result = await supabase
            .from('user_api_keys')
            .select('*')
            .eq('user_id', user.id)
            .order('display_order', { ascending: true, nullsFirst: false })
            .order('created_at', { ascending: false })

          if (result.error) throw result.error
          return result.data || []
        }),

        fetchWithCache('providers', async () => {
          const response = await fetch('/api/models-dev/providers?rich=true')
          if (!response.ok) throw new Error('Failed to fetch providers')
          return await response.json()
        }, enhancedApiKeysCache.LONG_CACHE_DURATION),

        fetchWithCache('cliStatuses', async () => {
          const response = await fetch('/api/cli-status')
          if (!response.ok) {
            if (response.status === 401) {
              // Authentication required - return empty data instead of throwing
              console.warn('CLI status requires authentication, returning empty data')
              return {}
            }
            throw new Error('Failed to fetch CLI status')
          }
          return await response.json()
        }),

        fetchWithCache('apiKeyUsage', async () => {
          const response = await fetch('/api/usage/api-keys')
          if (!response.ok) {
            if (response.status === 401) {
              // Authentication required - return empty data instead of throwing
              console.warn('API key usage requires authentication, returning empty data')
              return {}
            }
            throw new Error('Failed to fetch usage')
          }
          const result = await response.json()
          return result.usage || {}
        })
      ])

      if (!isMountedRef.current) return

      // Process API keys
      if (apiKeysData.status === 'fulfilled') {
        setApiKeys(apiKeysData.value || [])
      }

      // Process providers data
      if (providersData.status === 'fulfilled' && providersData.value) {
        const data = providersData.value

        if (Array.isArray(data)) {
          // Normalize and de-duplicate providers by ID
          const normalizeId = (pid: string) => pid === 'xai' ? 'x-ai' : pid
          const dedupMap = new Map<string, any>()
          data.forEach((p: any) => {
            const nid = normalizeId(p.id)
            const existing = dedupMap.get(nid)
            if (!existing) {
              dedupMap.set(nid, { ...p, id: nid })
            } else {
              const existingScore = (existing.models?.length || 0) + (existing.description?.length || 0)
              const candidateScore = (p.models?.length || 0) + (p.description?.length || 0)
              if (candidateScore > existingScore) {
                dedupMap.set(nid, { ...p, id: nid })
              }
            }
          })
          setModelsDevProviders(Array.from(dedupMap.values()))

          // Convert rich data to legacy format for backward compatibility
          const legacyProvidersData: Record<string, any> = {}
          data.forEach((provider: any) => {
            if (provider.models) {
              const supportedModels: Record<string, any> = {}
              provider.models.forEach((model: any) => {
                supportedModels[model.id] = {
                  name: model.name,
                  maxTokens: model.maxTokens,
                  contextWindow: model.contextWindow,
                  supportsVision: model.supportsVision,
                  supportsTools: model.supportsTools,
                  pricing: model.pricing
                }
              })

              const nid = normalizeId(provider.id)
              legacyProvidersData[nid] = {
                name: provider.name,
                description: provider.description,
                website: provider.website,
                logo: provider.logo,
                baseUrl: provider.baseUrl,
                supportsStreaming: provider.supportsStreaming,
                supportsTools: provider.supportsTools,
                supportsVision: provider.supportsVision,
                supportedModels
              }
            }
          })
          setLegacyProviders(legacyProvidersData)
        }
      }

      // Process CLI status
      if (cliStatusData.status === 'fulfilled' && cliStatusData.value) {
        const transformedStatuses: CLIConfig[] = Object.entries(cliStatusData.value).map(([provider, config]: [string, any]) => ({
          user_id: user.id,
          provider,
          custom_path: config?.custom_path || null,
          enabled: config?.enabled || true,
          status: config?.status || 'unchecked',
          last_checked_at: config?.last_checked_at,
          statusMessage: config?.message,
          message: config?.message,
          cli_version: config?.cli_version,
          authenticated: config?.authenticated,
          issue_type: config?.issue_type,
          solutions: config?.solutions,
          install_command: config?.install_command,
          auth_command: config?.auth_command
        }))
        setCliStatuses(transformedStatuses)
      }

      // Process API key usage
      if (usageData.status === 'fulfilled' && usageData.value) {
        setApiKeyUsage(usageData.value)
      }

    } catch (err: any) {
      console.error('Failed to load enhanced API keys data:', err)
      if (isMountedRef.current) {
        setError(err.message || 'Failed to load data')
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [user, supabase, fetchWithCache])

  // Load data on mount and when user/preferences change
  useEffect(() => {
    isMountedRef.current = true
    if (user && !preferencesLoading) {
      loadAllData()
    }

    return () => {
      isMountedRef.current = false
    }
  }, [user, preferencesLoading, loadAllData])

  // Preload models for existing providers in parallel (optimized)
  useEffect(() => {
    if (apiKeys.length > 0 && !loading) {
      const uniqueProviders = [...new Set(apiKeys.map(key => key.provider))]
      const providersToFetch = uniqueProviders.filter(provider =>
        !providerModels[provider] && !loadingModels[provider]
      )

      if (providersToFetch.length > 0) {
        // Fetch all provider models in parallel with limited concurrency
        const batchSize = 3 // Limit concurrent requests
        const batches = []
        for (let i = 0; i < providersToFetch.length; i += batchSize) {
          batches.push(providersToFetch.slice(i, i + batchSize))
        }

        batches.forEach((batch, index) => {
          setTimeout(() => {
            Promise.allSettled(batch.map(provider => fetchProviderModels(provider)))
          }, index * 100) // Stagger requests to avoid overwhelming the API
        })
      }
    }
  }, [apiKeys, providerModels, loadingModels, loading, fetchProviderModels])

  // Manual refresh function that clears cache
  const refresh = useCallback(async () => {
    // Clear all caches
    Object.keys(enhancedApiKeysCache.timestamps).forEach(key => {
      enhancedApiKeysCache.timestamps[key as keyof typeof enhancedApiKeysCache.timestamps] = 0
    })
    enhancedApiKeysCache.apiKeys = null
    enhancedApiKeysCache.legacyProviders = null
    enhancedApiKeysCache.modelsDevProviders = null
    enhancedApiKeysCache.cliStatuses = null
    enhancedApiKeysCache.apiKeyUsage = null
    enhancedApiKeysCache.providerModels = null

    await loadAllData()
  }, [loadAllData])

  return {
    apiKeys,
    legacyProviders,
    modelsDevProviders,
    cliStatuses,
    setCliStatuses,
    apiKeyUsage,
    providerModels,
    loadingModels,
    loading,
    error,
    refresh,
    fetchProviderModels
  }
}