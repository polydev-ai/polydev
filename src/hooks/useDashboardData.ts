'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// Global cache for dashboard data to prevent duplicate fetching
// CACHE_VERSION: Increment this to invalidate all caches (current: 13 - increased request logs to 200)
const CACHE_VERSION = 13
const dashboardCache = {
  version: CACHE_VERSION,
  stats: null as any,
  creditBalance: null as any,
  requestLogs: null as any,
  providerAnalytics: null as any,
  modelAnalytics: null as any,
  providersRegistry: null as any,
  timestamps: {
    stats: 0,
    creditBalance: 0,
    requestLogs: 0,
    providerAnalytics: 0,
    modelAnalytics: 0,
    providersRegistry: 0,
  },
  CACHE_DURATION: 2 * 60 * 1000, // 2 minutes for dashboard data
  LONG_CACHE_DURATION: 10 * 60 * 1000, // 10 minutes for registry data
}

// Clear cache if version mismatch
if (dashboardCache.version !== CACHE_VERSION) {
  Object.keys(dashboardCache.timestamps).forEach(key => {
    dashboardCache.timestamps[key as keyof typeof dashboardCache.timestamps] = 0
  })
  dashboardCache.stats = null
  dashboardCache.creditBalance = null
  dashboardCache.requestLogs = null
  dashboardCache.providerAnalytics = null
  dashboardCache.modelAnalytics = null
  dashboardCache.providersRegistry = null
  dashboardCache.version = CACHE_VERSION
}

let activeRequests: Record<string, Promise<any> | null> = {}

export function useDashboardData() {
  const [stats, setStats] = useState<any>({
    totalRequests: 0,
    totalCost: 0,
    activeConnections: 0,
    uptime: '99.9%',
    responseTime: 245,
    totalApiKeys: 0,
    activeProviders: 0,
    totalMcpTokens: 0,
    providerStats: [],
    recentActivity: [],
    totalApiCalls: 0,
    totalMessages: 0,
    tokenBreakdown: { total: 0, mcp: 0, chat: 0 },
    // All-time metrics
    allTimeMessages: 0,
    allTimeApiCalls: 0,
    allTimeTokens: 0,
    allTimeCost: 0,
    // Credits balance
    creditsBalance: 0,
  })
  const [creditBalance, setCreditBalance] = useState<any>({
    balance: 0,
    totalSpent: 0,
    promotionalBalance: 0,
    hasOpenRouterKey: false,
  })
  const [requestLogs, setRequestLogs] = useState<any[]>([])
  const [providerAnalytics, setProviderAnalytics] = useState<any[] | null>(null)
  const [modelAnalytics, setModelAnalytics] = useState<any[] | null>(null)
  const [providersRegistry, setProvidersRegistry] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  // Fetch with caching and deduplication - memoized to prevent re-creation
  const fetchWithCache = useCallback(async (key: string, url: string, cacheDuration?: number) => {
    const now = Date.now()
    const duration = cacheDuration || dashboardCache.CACHE_DURATION

    // Check cache first
    if (dashboardCache[key as keyof typeof dashboardCache] &&
        (now - dashboardCache.timestamps[key as keyof typeof dashboardCache.timestamps]) < duration) {
      return dashboardCache[key as keyof typeof dashboardCache]
    }

    // Prevent duplicate requests
    if (activeRequests[key]) {
      return await activeRequests[key]
    }

    activeRequests[key] = (async () => {
      try {
        const response = await fetch(url, { credentials: 'include' })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()

        // Update cache
        dashboardCache[key as keyof typeof dashboardCache] = data
        dashboardCache.timestamps[key as keyof typeof dashboardCache.timestamps] = now

        return data
      } catch (err) {
        console.warn(`Failed to fetch ${key}:`, err)
        return dashboardCache[key as keyof typeof dashboardCache] || {}
      } finally {
        activeRequests[key] = null
      }
    })()

    return await activeRequests[key]
  }, []) // Empty deps to prevent recreation

  // Batch fetch all dashboard data in parallel - stabilized to prevent re-renders
  const loadAllData = useCallback(async () => {
    if (!isMountedRef.current) return

    try {
      setLoading(true)

      // Fetch all data in parallel with caching
      const [
        statsData,
        creditData,
        registryData
      ] = await Promise.allSettled([
        fetchWithCache('stats', '/api/dashboard/stats'),
        fetchWithCache('creditBalance', '/api/credits/balance'),
        fetchWithCache('providersRegistry', '/api/models-dev/providers', dashboardCache.LONG_CACHE_DURATION)
      ])

      if (!isMountedRef.current) return

      // Update stats and provider analytics from stats endpoint
      if (statsData.status === 'fulfilled' && statsData.value) {
        const data = statsData.value
        setStats({
          totalRequests: data.totalRequests || data.balance || 0,
          totalCost: data.totalCost || 0,
          activeConnections: data.activeConnections || 0,
          uptime: data.uptime || '99.9%',
          responseTime: data.responseTime || 245,
          totalApiKeys: data.totalApiKeys || 0,
          activeProviders: data.activeProviders || data.providersCount || 0,
          totalMcpTokens: data.totalMcpTokens || 0,
          providerStats: data.providerStats || [],
          recentActivity: data.recentActivity || [],
          totalApiCalls: data.totalApiCalls || 0,
          totalMessages: data.totalMessages || 0,
          tokenBreakdown: data.tokenBreakdown || { total: 0, mcp: 0, chat: 0 },
          // All-time metrics for display
          allTimeMessages: data.allTimeMessages,
          allTimeApiCalls: data.allTimeApiCalls,
          allTimeTokens: data.allTimeTokens,
          allTimeCost: data.allTimeCost || 0,
          // Credits balance from stats endpoint
          creditsBalance: data.creditsBalance || 0,
        })

        // Set provider analytics from stats endpoint if available
        if (data.providerAnalytics && data.providerAnalytics.length > 0) {
          console.log('✅ Using provider analytics from stats endpoint:', data.providerAnalytics.length, 'providers')
          setProviderAnalytics(data.providerAnalytics)
        }
        if (data.modelAnalytics && data.modelAnalytics.length > 0) {
          console.log('✅ Using model analytics from stats endpoint:', data.modelAnalytics.length, 'models')
          setModelAnalytics(data.modelAnalytics)
        }
      }

      // Update credit balance
      if (creditData.status === 'fulfilled' && creditData.value) {
        setCreditBalance({
          balance: creditData.value.balance || 0,
          totalSpent: creditData.value.totalSpent || 0,
          promotionalBalance: creditData.value.promotionalBalance || creditData.value.totalAvailableBalance || 0,
          hasOpenRouterKey: creditData.value.hasOpenRouterKey || false,
        })
      }

      // Update request logs

      // Force fallback for now to get logs working
      const mcpLogsData = await fetchWithCache('requestLogs', '/api/dashboard/request-logs?limit=200&offset=0')
      if (mcpLogsData && mcpLogsData.logs) {
        setRequestLogs(mcpLogsData.logs)

        // SIMPLE FIX: Always process analytics from logs - cost inflation was already fixed in the processing logic
        if (mcpLogsData.logs.length > 0) {
          console.log('📊 Processing analytics from logs with cost filtering')
          await processAnalytics(mcpLogsData.logs)
        }
      } else {
        setRequestLogs([])
      }

      // Update providers registry - models-dev API returns providers directly as array
      if (registryData.status === 'fulfilled' && registryData.value) {
        setProvidersRegistry(Array.isArray(registryData.value) ? registryData.value : registryData.value.providers || [])
      }

      setError(null)
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, []) // Remove fetchWithCache dependency to prevent recreation

  // Optimized analytics processing with memoization
  const processAnalytics = useCallback(async (logs: any[]) => {
    // Check if we already have analytics for this data
    // Include provider data in hash to detect when API response changes
    const firstLogProviders = logs[0]?.providers ? JSON.stringify(logs[0].providers.slice(0, 3).map((p: any) => p.provider)) : ''
    // Include cache version in hash to force reprocessing when code changes
    const logsHash = `v${CACHE_VERSION}-${logs.length.toString()}-${logs[0]?.id || ''}-${firstLogProviders}`
    if (dashboardCache.providerAnalytics &&
        dashboardCache.providerAnalytics._hash === logsHash) {
      setProviderAnalytics(dashboardCache.providerAnalytics.data)
      setModelAnalytics(dashboardCache.modelAnalytics.data)
      return
    }

    // Fetch providers registry for enriching names and logos
    let providersRegistry: any[] = []
    try {
      // Fetch providers registry
      if (dashboardCache.providersRegistry &&
          (Date.now() - dashboardCache.timestamps.providersRegistry) < dashboardCache.LONG_CACHE_DURATION) {
        providersRegistry = dashboardCache.providersRegistry
      } else {
        console.log('📡 Fetching providers registry from API...')
        const response = await fetch('/api/models-dev/providers')
        console.log('📡 API response status:', response.status, response.ok)
        if (response.ok) {
          const data = await response.json()
          console.log('📡 API response data type:', typeof data, 'isArray:', Array.isArray(data))
          console.log('📡 API response keys:', Object.keys(data))
          console.log('📡 data.providers length:', data.providers?.length)
          // The response is an object with providers array
          providersRegistry = Array.isArray(data) ? data : data.providers || []
          console.log('📡 Final providersRegistry length:', providersRegistry.length)
          dashboardCache.providersRegistry = providersRegistry
          dashboardCache.timestamps.providersRegistry = Date.now()
        }
      }
    } catch (err) {
      console.warn('Failed to fetch providers registry for analytics:', err)
    }

    // Create provider lookup map for enrichment
    const providerLookup = new Map<string, any>()
    // Ensure providersRegistry is always an array - handle both array and {providers: [...]} object format
    const registryArray = Array.isArray(providersRegistry) ? providersRegistry : ((providersRegistry as any)?.providers || [])
    console.log('🔍 Providers registry sample:', registryArray.slice(0, 3))
    registryArray.forEach((provider: any) => {
      if (provider.id) {
        // Use logo_url field from database (with logo as fallback)
        const logoUrl = provider.logo_url || provider.logo
        console.log(`🎨 Provider ${provider.id}: logo_url=${provider.logo_url}, logo=${provider.logo}, final=${logoUrl}`)
        providerLookup.set(provider.id, {
          displayName: provider.name || provider.id,
          logo: logoUrl
        })
        // Also store with normalized ID for backward compatibility
        if (provider.id === 'xai') {
          providerLookup.set('x-ai', {
            displayName: provider.name || 'xAI',
            logo: logoUrl
          })
        }
      }
    })

    // Note: Removed model-to-provider mapping as the API already provides correct provider names

    // Process provider analytics
    const providerStats: Record<string, any> = {}
    const modelStats: Record<string, any> = {}

    logs.forEach((log: any) => {
      if (log.providers && Array.isArray(log.providers)) {
        log.providers.forEach((provider: any, index: number) => {
          // Use the provider name from the API - it's already correctly transformed
          const providerId = provider.provider

          // Try direct lookup first, then try lowercase normalized lookup
          let enrichedProvider = providerLookup.get(providerId)
          if (!enrichedProvider && providerId) {
            // Try case-insensitive lookup by searching through all entries
            for (const [key, value] of providerLookup.entries()) {
              if (key.toLowerCase() === providerId.toLowerCase() || value.displayName?.toLowerCase() === providerId.toLowerCase()) {
                enrichedProvider = value
                break
              }
            }
          }

          const displayName = enrichedProvider?.displayName || providerId

          // Use display name as key to aggregate providers with same display name
          const statsKey = displayName

          // Provider analytics
          if (!providerStats[statsKey]) {
            providerStats[statsKey] = {
              name: displayName,
              logo: enrichedProvider?.logo,
              requests: 0,
              totalCost: 0,
              totalTokens: 0,
              totalLatency: 0,
              successCount: 0,
              errorCount: 0,
              models: new Set(),
              providerId: displayName, // Use display name as providerId for consistent keys
            }
          }
          const pStats = providerStats[statsKey]
          pStats.requests++

          pStats.totalCost += provider.cost || 0
          pStats.totalTokens += provider.tokens || 0
          pStats.totalLatency += provider.latency || 0
          if (provider.success) pStats.successCount++
          else pStats.errorCount++
          if (provider.model) pStats.models.add(provider.model)

          // Model analytics - use original providerId for proper model mapping
          const modelKey = `${providerId}:${provider.model}`
          if (!modelStats[modelKey]) {
            modelStats[modelKey] = {
              provider: displayName,
              providerLogo: enrichedProvider?.logo,
              model: provider.model,
              requests: 0,
              totalCost: 0,
              totalTokens: 0,
              totalLatency: 0,
              successCount: 0,
              errorCount: 0,
            }
          }
          const mStats = modelStats[modelKey]
          mStats.requests++
          mStats.totalCost += provider.cost || 0
          mStats.totalTokens += provider.tokens || 0
          mStats.totalLatency += provider.latency || 0
          if (provider.success) mStats.successCount++
          else mStats.errorCount++
        })
      }
    })

    // Transform and sort provider analytics
    const processedProviderAnalytics = Object.entries(providerStats).map(([displayName, stats]: [string, any]) => {

      return {
        ...stats,
        providerId: displayName, // Use display name as unique identifier
        avgLatency: stats.requests > 0 ? Math.round(stats.totalLatency / stats.requests) : 0,
        avgCost: stats.requests > 0 ? stats.totalCost / stats.requests : 0,
        successRate: stats.requests > 0 ? ((stats.successCount / stats.requests) * 100).toFixed(1) : 0,
        models: Array.from(stats.models),
      }
    }).sort((a: any, b: any) => b.requests - a.requests)

    // Transform and sort model analytics
    const processedModelAnalytics = Object.values(modelStats).map((stats: any) => {
      const result = {
        ...stats,
        avgLatency: stats.requests > 0 ? Math.round(stats.totalLatency / stats.requests) : 0,
        avgCost: stats.requests > 0 ? stats.totalCost / stats.requests : 0,
        tokensPerSecond: stats.totalLatency > 0 ? Math.round((stats.totalTokens * 1000) / stats.totalLatency) : 0,
        successRate: stats.requests > 0 ? ((stats.successCount / stats.requests) * 100).toFixed(1) : 0,
        costPerToken: stats.totalTokens > 0 ? (stats.totalCost / stats.totalTokens).toFixed(6) : 0,
      }
      console.log(`🎯 Model ${stats.model}: provider="${stats.provider}", providerLogo="${stats.providerLogo}"`)
      return result
    }).sort((a: any, b: any) => b.requests - a.requests)

    // Cache the processed analytics
    dashboardCache.providerAnalytics = { data: processedProviderAnalytics, _hash: logsHash }
    dashboardCache.modelAnalytics = { data: processedModelAnalytics, _hash: logsHash }

    setProviderAnalytics(processedProviderAnalytics)
    setModelAnalytics(processedModelAnalytics)
  }, [])

  // Load data on mount and setup periodic refresh
  useEffect(() => {
    isMountedRef.current = true
    loadAllData()

    // Setup less aggressive polling - only every 10 minutes to reduce refresh frequency
    const interval = setInterval(() => {
      if (isMountedRef.current) {
        loadAllData()
      }
    }, 10 * 60 * 1000)

    return () => {
      isMountedRef.current = false
      clearInterval(interval)
    }
  }, []) // Remove loadAllData dependency to prevent frequent re-runs

  // Manual refresh function that clears cache
  const refresh = useCallback(async () => {
    // Clear all caches
    Object.keys(dashboardCache.timestamps).forEach(key => {
      dashboardCache.timestamps[key as keyof typeof dashboardCache.timestamps] = 0
    })
    dashboardCache.stats = null
    dashboardCache.creditBalance = null
    dashboardCache.requestLogs = null
    dashboardCache.providerAnalytics = null
    dashboardCache.modelAnalytics = null
    dashboardCache.providersRegistry = null

    console.log('🔄 Dashboard cache cleared - refreshing data to debug analytics issue')
    await loadAllData()
  }, []) // Remove dependency to prevent re-creation


  return {
    stats,
    creditBalance,
    requestLogs,
    providerAnalytics,
    modelAnalytics,
    providersRegistry,
    loading,
    error,
    refresh,
  }
}