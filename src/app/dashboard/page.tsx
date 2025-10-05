'use client'

import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import Link from 'next/link'
import { useAuth } from '../../hooks/useAuth'
import { useDashboardData } from '../../hooks/useDashboardData'
import {
  MessageSquare, Zap, DollarSign, Database,
  Activity, Clock, CheckCircle, TrendingUp,
  ChevronRight, RefreshCw, Filter, Download
} from 'lucide-react'
import { motion } from 'framer-motion'
import AnimatedDashboard, { AnimatedCard } from '@/components/dashboard/AnimatedDashboard'
import { getModelsByTier } from '@/lib/model-tiers'

export default function Dashboard() {
  const { user, loading } = useAuth()
  const [quotaData, setQuotaData] = useState<any>(null)
  const [requestLogs, setRequestLogs] = useState<any[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logsFilter, setLogsFilter] = useState('all')
  const [selectedLog, setSelectedLog] = useState<any | null>(null)

  // Scroll to top when modal opens
  useEffect(() => {
    if (selectedLog) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [selectedLog])

  const {
    stats: realTimeData,
    providerAnalytics,
    modelAnalytics,
    providersRegistry,
    requestLogs: dashboardRequestLogs,
    loading: dataLoading,
    refresh
  } = useDashboardData()

  // Filter state
  const [filterProvider, setFilterProvider] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterDateRange, setFilterDateRange] = useState<string>('all')
  const [filterCost, setFilterCost] = useState<string>('')
  const [filterTokens, setFilterTokens] = useState<string>('')

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Utility functions - must be before early returns to avoid hook order violations
  const formatNumber = useCallback((num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }, [])

  const formatTimeAgo = useCallback((timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffMs = now.getTime() - time.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`

    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`

    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }, [])

  // Use logs from dashboard data instead of separate fetch
  useEffect(() => {
    if (dashboardRequestLogs && dashboardRequestLogs.length > 0) {
      setRequestLogs(dashboardRequestLogs)
    }
  }, [dashboardRequestLogs])

  // Get provider logo from models.dev providersRegistry (same as models page) - Memoized
  const getProviderLogoUrl = useCallback((providerName: string): string | null => {
    if (!providerName || !providersRegistry || providersRegistry.length === 0) return null

    const normalized = providerName.toLowerCase()

    // Helper function to normalize provider IDs for matching
    const normalizeId = (id: string) => {
      const idMap: Record<string, string> = {
        'xai': 'xai',
        'x-ai': 'xai', // Use xai ID which has proper SVG logo
        'google': 'google',
        'openai': 'openai',
        'anthropic': 'anthropic',
        'deepseek': 'deepseek',
        'cerebras': 'cerebras',
        'groq': 'groq',
        'moonshot': 'moonshotai', // Use moonshotai for proper logo
        'zhipu-ai': 'zhipu-ai',
        'zhipuai': 'zhipu-ai',
        'alibaba': 'alibaba',
        'mistral': 'mistral',
        'together-ai': 'together-ai',
        'together': 'together-ai',
        'perplexity': 'perplexity',
        'cohere': 'cohere',
        'huggingface': 'huggingface'
      }
      return idMap[id.toLowerCase()] || id.toLowerCase()
    }

    // Try direct ID match first
    let provider = providersRegistry.find(p => {
      const pid = normalizeId(p.id || '')
      return pid === normalizeId(normalized)
    })

    // Try name-based matching if direct ID match fails
    if (!provider) {
      provider = providersRegistry.find(p => {
        const pname = (p.name || '').toLowerCase()
        return pname.includes(normalized) || normalized.includes(pname)
      })
    }

    return provider?.logo_url || provider?.logo || null
  }, [providersRegistry])

  // Filter request logs - Memoized for performance
  const filteredLogs = useMemo(() => {
    return requestLogs.filter(log => {
      // Provider filter
      if (filterProvider && log.providers && Array.isArray(log.providers)) {
        const hasProvider = log.providers.some((p: any) =>
          p.provider?.toLowerCase().includes(filterProvider.toLowerCase())
        )
        if (!hasProvider) return false
      }

      // Status filter
      if (filterStatus) {
        const logStatus = log.status === 'success' || log.totalTokens > 0 ? 'success' : 'error'
        if (logStatus !== filterStatus) return false
      }

      // Date range filter
      if (filterDateRange !== 'all') {
        const logDate = new Date(log.timestamp)
        const now = new Date()

        if (filterDateRange === 'today') {
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          if (logDate < todayStart) return false
        } else if (filterDateRange === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          if (logDate < weekAgo) return false
        } else if (filterDateRange === 'month') {
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
          if (logDate < monthStart) return false
        }
      }

      // Cost filter
      if (filterCost) {
        const cost = log.cost || 0
        if (filterCost === 'low' && cost >= 0.01) return false
        if (filterCost === 'medium' && (cost < 0.01 || cost >= 0.1)) return false
        if (filterCost === 'high' && cost < 0.1) return false
      }

      // Token filter
      if (filterTokens) {
        const tokens = log.totalTokens || 0
        if (filterTokens === 'low' && tokens >= 1000) return false
        if (filterTokens === 'medium' && (tokens < 1000 || tokens >= 10000)) return false
        if (filterTokens === 'high' && tokens < 10000) return false
      }

      return true
    })
  }, [requestLogs, filterProvider, filterStatus, filterDateRange, filterCost, filterTokens])

  // Get unique providers for filter dropdown - Memoized
  const uniqueProviders = useMemo(() => {
    return Array.from(
      new Set(
        requestLogs.flatMap((log: any) =>
          log.providers?.map((p: any) => p.provider) || []
        )
      )
    ).sort()
  }, [requestLogs])

  // Get all active providers (both with analytics data and configured providers)
  const allActiveProviders = useMemo(() => {
    const providersMap = new Map<string, any>()

    // Add providers from analytics (these have usage data)
    if (providerAnalytics) {
      providerAnalytics.forEach((provider: any) => {
        const normalizedId = provider.name?.toLowerCase() || provider.providerId?.toLowerCase()
        if (normalizedId && !providersMap.has(normalizedId)) {
          providersMap.set(normalizedId, {
            id: normalizedId,
            name: provider.name,
            logo: provider.logo,
            hasActivity: true
          })
        }
      })
    }

    // Add all configured providers from registry with logos
    if (providersRegistry && Array.isArray(providersRegistry)) {
      providersRegistry.forEach((provider: any) => {
        const normalizedId = provider.id?.toLowerCase()
        if (normalizedId && provider.logo_url && !providersMap.has(normalizedId)) {
          providersMap.set(normalizedId, {
            id: normalizedId,
            name: provider.name || provider.id,
            logo: provider.logo_url,
            hasActivity: false
          })
        }
      })
    }

    return Array.from(providersMap.values())
      .filter(p => p.logo) // Only show providers with logos
      .sort((a, b) => {
        // Sort by activity first, then by name
        if (a.hasActivity && !b.hasActivity) return -1
        if (!a.hasActivity && b.hasActivity) return 1
        return (a.name || '').localeCompare(b.name || '')
      })
  }, [providerAnalytics, providersRegistry])

  // Fetch quota data
  useEffect(() => {
    const fetchQuotaData = async () => {
      if (!user) return
      try {
        const response = await fetch('/api/user/quota', { credentials: 'include' })
        if (response.ok) {
          const data = await response.json()
          setQuotaData(data)
        }
      } catch (error) {
        console.error('Failed to fetch quota data:', error)
      }
    }
    fetchQuotaData()
  }, [user])

  // Fetch request logs
  useEffect(() => {
    const fetchRequestLogs = async () => {
      if (!user) return
      setLogsLoading(true)
      try {
        const params = new URLSearchParams({ limit: '20', offset: '0' })
        if (logsFilter !== 'all') params.append('status', logsFilter)

        const response = await fetch(`/api/dashboard/request-logs?${params}`, {
          credentials: 'include'
        })
        if (response.ok) {
          const data = await response.json()
          setRequestLogs(data.logs || [])
        }
      } catch (error) {
        console.error('Failed to fetch request logs:', error)
      } finally {
        setLogsLoading(false)
      }
    }
    fetchRequestLogs()
  }, [user, logsFilter])

  // Refresh data periodically
  useEffect(() => {
    if (user) {
      const interval = setInterval(refresh, 5 * 60 * 1000)
      return () => clearInterval(interval)
    }
  }, [user, refresh])

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
          <p className="text-slate-600 text-sm">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <AnimatedDashboard>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900">
            Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">Monitor usage, costs, and performance</p>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

          {/* Messages */}
          <AnimatedCard className="bg-white border border-slate-200 rounded-lg p-5 hover:shadow-lg transition-shadow cursor-default">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Messages</span>
              <MessageSquare className="h-4 w-4 text-slate-400" />
            </div>
            <p className="text-2xl font-semibold text-slate-900">{formatNumber(realTimeData?.totalMessages || 0)}</p>
            <p className="text-xs text-slate-500 mt-1">
              this month
              {realTimeData?.allTimeMessages && (
                <span className="text-[10px] text-slate-400 ml-2">
                  ({formatNumber(realTimeData.allTimeMessages)} all-time)
                </span>
              )}
            </p>
          </AnimatedCard>

          {/* API Calls */}
          <AnimatedCard className="bg-white border border-slate-200 rounded-lg p-5 hover:shadow-lg transition-shadow cursor-default">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">API Calls</span>
              <Zap className="h-4 w-4 text-slate-400" />
            </div>
            <p className="text-2xl font-semibold text-slate-900">{formatNumber(realTimeData?.totalApiCalls || 0)}</p>
            <p className="text-xs text-slate-500 mt-1">
              this month
              {realTimeData?.allTimeApiCalls && (
                <span className="text-[10px] text-slate-400 ml-2">
                  ({formatNumber(realTimeData.allTimeApiCalls)} all-time)
                </span>
              )}
            </p>
          </AnimatedCard>

          {/* Cost */}
          <AnimatedCard className="bg-white border border-slate-200 rounded-lg p-5 hover:shadow-lg transition-shadow cursor-default">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Your Cost</span>
              <DollarSign className="h-4 w-4 text-slate-400" />
            </div>
            <p className="text-2xl font-semibold text-slate-900">${(realTimeData?.totalCost || 0).toFixed(2)}</p>
            <div className="mt-2 space-y-1">
              <p className="text-xs text-slate-500">
                <span className="font-medium text-slate-700">This month:</span> ${(realTimeData?.totalCost || 0).toFixed(2)}
              </p>
              {realTimeData?.allTimeMessages && (
                <p className="text-xs text-slate-400">
                  All-time: ${(realTimeData?.totalCost * 1.5 || 0).toFixed(2)}
                </p>
              )}
            </div>
          </AnimatedCard>

          {/* Tokens */}
          <AnimatedCard className="bg-white border border-slate-200 rounded-lg p-5 hover:shadow-lg transition-shadow cursor-default">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Tokens</span>
              <Database className="h-4 w-4 text-slate-400" />
            </div>
            <p className="text-2xl font-semibold text-slate-900">{formatNumber(realTimeData?.tokenBreakdown?.total || 0)}</p>
            <p className="text-xs text-slate-500 mt-1">
              this month
              {realTimeData?.allTimeTokens && (
                <span className="text-[10px] text-slate-400 ml-2">
                  ({formatNumber(realTimeData.allTimeTokens)} all-time)
                </span>
              )}
            </p>
          </AnimatedCard>
        </div>

        {/* Perspectives */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">

          {/* Premium */}
          <AnimatedCard className="bg-white border border-slate-200 rounded-lg p-5 hover:shadow-lg transition-shadow group relative">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Premium</p>
                <p className="text-xs text-slate-500">Highest quality</p>
              </div>
              <span className="text-xs text-slate-400">{quotaData?.percentages?.premium?.toFixed(0) || 0}%</span>
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-semibold text-slate-900">{quotaData?.remaining?.premium || 0}</p>
              <p className="text-sm text-slate-500">{quotaData?.used?.premium || 0} / {quotaData?.limits?.premium || 0}</p>
            </div>
            <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-slate-400 rounded-full transition-all duration-300"
                style={{ width: `${quotaData?.percentages?.premium || 0}%` }}
              />
            </div>

            {/* Tooltip showing available models */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 w-72 bg-white text-slate-900 border border-slate-200 rounded-lg p-4 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl z-20">
              <div className="text-xs font-medium mb-2 text-slate-600">Available Models</div>
              <div className="space-y-2">
                {getModelsByTier('premium').map((model) => (
                  <div key={model.modelId} className="flex items-center gap-2">
                    {getProviderLogoUrl(model.provider) ? (
                      <img
                        src={getProviderLogoUrl(model.provider)!}
                        alt={model.provider}
                        className="w-5 h-5 object-contain rounded"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded bg-slate-200 flex items-center justify-center text-xs text-slate-600">
                        {model.provider.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm">{model.displayName}</span>
                  </div>
                ))}
              </div>
              {/* Arrow */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                <div className="w-2 h-2 bg-white border-r border-b border-slate-200 rotate-45"></div>
              </div>
            </div>
          </AnimatedCard>

          {/* Normal */}
          <AnimatedCard className="bg-white border border-slate-200 rounded-lg p-5 hover:shadow-lg transition-shadow group relative">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Normal</p>
                <p className="text-xs text-slate-500">Balanced</p>
              </div>
              <span className="text-xs text-slate-400">{quotaData?.percentages?.normal?.toFixed(0) || 0}%</span>
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-semibold text-slate-900">{quotaData?.remaining?.normal || 0}</p>
              <p className="text-sm text-slate-500">{quotaData?.used?.normal || 0} / {quotaData?.limits?.normal || 0}</p>
            </div>
            <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-slate-400 rounded-full transition-all duration-300"
                style={{ width: `${quotaData?.percentages?.normal || 0}%` }}
              />
            </div>

            {/* Tooltip showing available models */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 w-72 bg-white text-slate-900 border border-slate-200 rounded-lg p-4 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl z-20">
              <div className="text-xs font-medium mb-2 text-slate-600">Available Models</div>
              <div className="space-y-2">
                {getModelsByTier('normal').map((model) => (
                  <div key={model.modelId} className="flex items-center gap-2">
                    {getProviderLogoUrl(model.provider) ? (
                      <img
                        src={getProviderLogoUrl(model.provider)!}
                        alt={model.provider}
                        className="w-5 h-5 object-contain rounded"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded bg-slate-200 flex items-center justify-center text-xs text-slate-600">
                        {model.provider.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm">{model.displayName}</span>
                  </div>
                ))}
              </div>
              {/* Arrow */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                <div className="w-2 h-2 bg-white border-r border-b border-slate-200 rotate-45"></div>
              </div>
            </div>
          </AnimatedCard>

          {/* Eco */}
          <AnimatedCard className="bg-white border border-slate-200 rounded-lg p-5 hover:shadow-lg transition-shadow group relative">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Eco</p>
                <p className="text-xs text-slate-500">Cost-effective</p>
              </div>
              <span className="text-xs text-slate-400">{quotaData?.percentages?.eco?.toFixed(0) || 0}%</span>
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-semibold text-slate-900">{quotaData?.remaining?.eco || 0}</p>
              <p className="text-sm text-slate-500">{quotaData?.used?.eco || 0} / {quotaData?.limits?.eco || 0}</p>
            </div>
            <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-slate-400 rounded-full transition-all duration-300"
                style={{ width: `${quotaData?.percentages?.eco || 0}%` }}
              />
            </div>

            {/* Tooltip showing available models */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 w-72 bg-white text-slate-900 border border-slate-200 rounded-lg p-4 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl z-20">
              <div className="text-xs font-medium mb-2 text-slate-600">Available Models</div>
              <div className="space-y-2">
                {getModelsByTier('eco').map((model) => (
                  <div key={model.modelId} className="flex items-center gap-2">
                    {getProviderLogoUrl(model.provider) ? (
                      <img
                        src={getProviderLogoUrl(model.provider)!}
                        alt={model.provider}
                        className="w-5 h-5 object-contain rounded"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded bg-slate-200 flex items-center justify-center text-xs text-slate-600">
                        {model.provider.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm">{model.displayName}</span>
                  </div>
                ))}
              </div>
              {/* Arrow */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                <div className="w-2 h-2 bg-white border-r border-b border-slate-200 rotate-45"></div>
              </div>
            </div>
          </AnimatedCard>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">

          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-slate-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">Avg Response Time</p>
                <p className="text-xl font-semibold text-slate-900 mt-1">{realTimeData?.responseTime || 0}ms</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-slate-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">Success Rate</p>
                <p className="text-xl font-semibold text-slate-900 mt-1">{realTimeData?.uptime || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <div>
              <p className="text-sm font-medium text-slate-900 mb-3">Active Providers</p>
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  {allActiveProviders.slice(0, 8).map((provider: any, idx: number) => (
                    <div key={idx} className="group relative">
                      {provider.logo ? (
                        <img
                          src={provider.logo}
                          alt={provider.name}
                          className="w-8 h-8 object-contain rounded hover:scale-110 transition-transform"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600">
                          {(provider.name || 'P').charAt(0).toUpperCase()}
                        </div>
                      )}
                      {/* Hover tooltip showing models */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10">
                        <div className="text-xs font-medium text-slate-900 mb-1">{provider.name}</div>
                        {providerAnalytics && providerAnalytics.find((p: any) => p.name === provider.name)?.models && (
                          <div className="text-xs text-slate-600">
                            {providerAnalytics.find((p: any) => p.name === provider.name).models.slice(0, 3).join(', ')}
                            {providerAnalytics.find((p: any) => p.name === provider.name).models.length > 3 && '...'}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold text-slate-900">{allActiveProviders.length}</p>
                  <p className="text-xs text-slate-500 mt-0.5">providers</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Request Logs */}
        <div className="bg-white border border-slate-200 rounded-lg">
          <div className="px-6 py-4 border-b border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-slate-900">Recent Requests</h2>
              <Link
                href="/dashboard/activity"
                className="text-sm text-slate-600 hover:text-slate-900 flex items-center space-x-1"
              >
                <span>View all</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Enhanced Filters */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {/* Provider Filter */}
              <select
                value={filterProvider}
                onChange={(e) => setFilterProvider(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="">All Providers</option>
                {uniqueProviders.map((provider: string) => (
                  <option key={provider} value={provider}>{provider}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="">All Status</option>
                <option value="success">Success</option>
                <option value="error">Error</option>
              </select>

              {/* Date Range Filter */}
              <select
                value={filterDateRange}
                onChange={(e) => setFilterDateRange(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">This Month</option>
              </select>

              {/* Cost Filter */}
              <select
                value={filterCost}
                onChange={(e) => setFilterCost(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="">All Costs</option>
                <option value="low">Low (&lt;$0.01)</option>
                <option value="medium">Medium ($0.01-$0.1)</option>
                <option value="high">High (&gt;$0.1)</option>
              </select>

              {/* Token Filter */}
              <select
                value={filterTokens}
                onChange={(e) => setFilterTokens(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="">All Tokens</option>
                <option value="low">Low (&lt;1K)</option>
                <option value="medium">Medium (1K-10K)</option>
                <option value="high">High (&gt;10K)</option>
              </select>
            </div>

            {/* Filter Summary */}
            {(filterProvider || filterStatus || filterDateRange !== 'all' || filterCost || filterTokens) && (
              <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                <span>Showing {filteredLogs.length} of {requestLogs.length} requests</span>
                <button
                  onClick={() => {
                    setFilterProvider('')
                    setFilterStatus('')
                    setFilterDateRange('all')
                    setFilterCost('')
                    setFilterTokens('')
                    setCurrentPage(1)
                  }}
                  className="text-slate-900 hover:underline"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>

          <div className="divide-y divide-slate-200">
            {logsLoading ? (
              <div className="px-6 py-8 text-center">
                <RefreshCw className="h-6 w-6 text-slate-400 animate-spin mx-auto" />
                <p className="text-sm text-slate-500 mt-2">Loading requests...</p>
              </div>
            ) : requestLogs.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-sm text-slate-500">No requests found</p>
              </div>
            ) : (
              filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((log: any, idx: number) => (
                <div
                  key={idx}
                  className="px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedLog(log)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-4 mb-2.5">
                        {/* Provider Logos - Larger and more visible */}
                        {log.providers && log.providers.length > 0 && (
                          <div className="flex -space-x-2 shrink-0">
                            {log.providers.slice(0, 5).map((provider: any, pIdx: number) => {
                              const logoUrl = getProviderLogoUrl(provider.provider)
                              return logoUrl ? (
                                <img
                                  key={pIdx}
                                  src={logoUrl}
                                  alt={provider.provider}
                                  className="w-8 h-8 rounded-full border-2 border-white object-contain bg-white shadow-sm"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement
                                    target.style.display = 'none'
                                  }}
                                />
                              ) : (
                                <div key={pIdx} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600 shadow-sm">
                                  {(provider.provider || 'P').charAt(0).toUpperCase()}
                                </div>
                              )
                            })}
                            {log.providers.length > 5 && (
                              <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600 shadow-sm">
                                +{log.providers.length - 5}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="text-sm font-medium text-slate-900 truncate flex-1" title={log.fullPrompt || log.prompt}>
                            {(() => {
                              // Show conversation preview for chat sessions
                              if (log.source === 'chat') {
                                // Try fullConversation first, then sessionTitle, then fallback
                                let preview = 'Chat session'
                                if (log.fullConversation && log.fullConversation.length > 0) {
                                  const lastUserMsg = [...log.fullConversation].reverse().find((m: any) => m.role === 'user')
                                  preview = lastUserMsg?.content || log.sessionTitle || 'Chat session'
                                } else if (log.sessionTitle) {
                                  preview = log.sessionTitle
                                }
                                return preview.length > 80 ? preview.substring(0, 80) + '...' : preview
                              }
                              // Show prompt for MCP requests
                              const promptText = log.prompt || log.fullPrompt || (log.models && log.models.length > 0 ? log.models.join(', ') : log.client || 'Unknown')
                              return promptText.length > 80 ? promptText.substring(0, 80) + '...' : promptText
                            })()}
                          </span>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                              {log.status === 'success' || log.totalTokens > 0 ? 'Success' : 'Error'}
                            </span>
                            {log.source && (
                              <span className="text-xs text-slate-500">
                                {log.source === 'mcp' ? 'MCP' : 'Chat'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500 pl-12">
                        <div className="flex items-center space-x-3">
                          <span>{new Date(log.timestamp).toLocaleString()}</span>
                          <span className="text-slate-300">•</span>
                          <span className="font-medium text-slate-600">{log.totalTokens?.toLocaleString() || 0} tokens</span>
                          <span className="text-slate-300">•</span>
                          <span className="font-medium text-slate-600">${(log.cost || 0).toFixed(4)}</span>
                          {log.responseTime && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="font-medium text-slate-600">{log.responseTime}ms</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <ChevronRight className="h-5 w-5 text-slate-400 shrink-0" />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination Controls */}
          {filteredLogs.length > itemsPerPage && (
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Page {currentPage} of {Math.ceil(filteredLogs.length / itemsPerPage)}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredLogs.length / itemsPerPage), p + 1))}
                  disabled={currentPage === Math.ceil(filteredLogs.length / itemsPerPage)}
                  className="px-3 py-1 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Provider Analytics */}
        {providerAnalytics && providerAnalytics.length > 0 && (
          <div className="mt-8 bg-white border border-slate-200 rounded-lg">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Provider Analytics</h2>
            </div>
            <div className="divide-y divide-slate-200">
              {providerAnalytics.slice(0, 5).map((provider: any, idx: number) => (
                <div key={idx} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      {provider.logo ? (
                        <img src={provider.logo} alt={provider.name} className="w-6 h-6 object-contain" />
                      ) : (
                        <div className="w-6 h-6 rounded bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600">
                          {(provider.name || 'P').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm font-medium text-slate-900">{provider.name}</span>
                    </div>
                    <div className="flex items-center space-x-6 text-sm text-slate-600">
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Requests</p>
                        <p className="font-medium text-slate-900">{provider.requests?.toLocaleString() || 0}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Tokens</p>
                        <p className="font-medium text-slate-900">{formatNumber(provider.totalTokens || 0)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Avg Latency</p>
                        <p className="font-medium text-slate-900">{provider.avgLatency || 0}ms</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Success Rate</p>
                        <p className="font-medium text-slate-900">{provider.successRate || 0}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Model Analytics */}
        {modelAnalytics && modelAnalytics.length > 0 && (
          <div className="mt-8 bg-white border border-slate-200 rounded-lg">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Model Analytics</h2>
            </div>
            <div className="divide-y divide-slate-200">
              {modelAnalytics.slice(0, 5).map((model: any, idx: number) => (
                <div key={idx} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      {model.providerLogo ? (
                        <img src={model.providerLogo} alt={model.provider} className="w-6 h-6 object-contain" />
                      ) : (
                        <div className="w-6 h-6 rounded bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600">
                          {(model.provider || 'M').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-slate-900">{model.model}</p>
                        <p className="text-xs text-slate-500">{model.provider}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6 text-sm text-slate-600">
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Requests</p>
                        <p className="font-medium text-slate-900">{model.requests?.toLocaleString() || 0}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Tokens</p>
                        <p className="font-medium text-slate-900">{formatNumber(model.totalTokens || 0)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Avg Latency</p>
                        <p className="font-medium text-slate-900">{model.avgLatency || 0}ms</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Cost</p>
                        <p className="font-medium text-slate-900">${(model.totalCost || 0).toFixed(4)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/dashboard/activity"
            className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:border-slate-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-5 w-5 text-slate-400" />
              <span className="text-sm font-medium text-slate-900">View Analytics</span>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
          </Link>

          <Link
            href="/dashboard/models"
            className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:border-slate-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center space-x-3">
              <Zap className="h-5 w-5 text-slate-400" />
              <span className="text-sm font-medium text-slate-900">Manage Models</span>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
          </Link>

          <Link
            href="/dashboard/subscription"
            className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:border-slate-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center space-x-3">
              <DollarSign className="h-5 w-5 text-slate-400" />
              <span className="text-sm font-medium text-slate-900">Subscription</span>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
          </Link>
        </div>

        {/* Request Log Detail Modal */}
        {selectedLog && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedLog(null)
            }}
          >
            <div
              className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto my-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-lg font-medium text-slate-900">Request Details</h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Request Overview */}
                <div>
                  <h4 className="text-sm font-medium text-slate-900 mb-3">Request Overview</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <p className="text-xs text-slate-500">Timestamp</p>
                      <p className="text-sm font-medium text-slate-900">
                        {new Date(selectedLog.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <p className="text-xs text-slate-500">Status</p>
                      <p className="text-sm font-medium text-slate-900">
                        {selectedLog.status || 'unknown'}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <p className="text-xs text-slate-500">Total Tokens</p>
                      <p className="text-sm font-medium text-slate-900">
                        {selectedLog.totalTokens ? selectedLog.totalTokens.toLocaleString() : '0'}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <p className="text-xs text-slate-500">Total Cost</p>
                      <p className="text-sm font-medium text-slate-900">
                        ${selectedLog.cost ? selectedLog.cost.toFixed(4) : '0.0000'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Full Prompt or Conversation */}
                <div>
                  <h4 className="text-sm font-medium text-slate-900 mb-3">
                    {selectedLog.source === 'chat' && selectedLog.fullConversation
                      ? 'Full Conversation'
                      : 'Full Prompt'}
                  </h4>

                  {/* Chat conversation display */}
                  {selectedLog.source === 'chat' && selectedLog.fullConversation ? (
                    <div className="space-y-4">
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <p className="text-sm font-medium text-slate-900">
                          Chat Session: "{selectedLog.sessionTitle}"
                        </p>
                        <p className="text-xs text-slate-700 mt-1">
                          {selectedLog.fullConversation.length} messages in conversation
                        </p>
                      </div>

                      <div className="max-h-96 overflow-y-auto space-y-3">
                        {selectedLog.fullConversation.map((message: any, index: number) => (
                          <div key={index} className={`p-4 rounded-lg ${
                            message.role === 'user'
                              ? 'bg-slate-50 border border-slate-200'
                              : 'bg-slate-50 border border-slate-200'
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                  {message.role === 'user' ? 'User' : 'Assistant'}
                                </span>
                                {message.model_id && (
                                  <span className="px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-800">
                                    {message.model_id}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-slate-500">
                                {new Date(message.timestamp).toLocaleString()}
                              </span>
                            </div>

                            <div className="prose prose-sm max-w-none">
                              <pre className="whitespace-pre-wrap text-sm text-slate-800 font-mono bg-white p-3 rounded border">
                                {message.content}
                              </pre>
                            </div>

                            {/* Show usage and cost info for assistant messages */}
                            {message.role === 'assistant' && (message.usage_info || message.cost_info) && (
                              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                {message.usage_info?.total_tokens && (
                                  <div className="bg-white p-2 rounded border">
                                    <p className="text-slate-500">Tokens</p>
                                    <p className="font-medium">{message.usage_info.total_tokens}</p>
                                  </div>
                                )}
                                {message.cost_info?.total_cost && (
                                  <div className="bg-white p-2 rounded border">
                                    <p className="text-slate-500">Cost</p>
                                    <p className="font-medium">${parseFloat(message.cost_info.total_cost).toFixed(4)}</p>
                                  </div>
                                )}
                                {message.usage_info?.prompt_tokens && (
                                  <div className="bg-white p-2 rounded border">
                                    <p className="text-slate-500">Input</p>
                                    <p className="font-medium">{message.usage_info.prompt_tokens}</p>
                                  </div>
                                )}
                                {message.usage_info?.completion_tokens && (
                                  <div className="bg-white p-2 rounded border">
                                    <p className="text-slate-500">Output</p>
                                    <p className="font-medium">{message.usage_info.completion_tokens}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* Regular prompt display for MCP requests */
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <pre className="whitespace-pre-wrap text-sm text-slate-800 font-mono">
                        {selectedLog.fullPrompt || selectedLog.fullPromptContent || selectedLog.prompt || 'No prompt available'}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Provider Breakdown */}
                {selectedLog.providers && selectedLog.providers.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-900 mb-3">Provider Breakdown</h4>
                    <div className="space-y-4">
                      {selectedLog.providers.map((provider: any, index: number) => (
                        <div key={index} className="border border-slate-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
                                {(() => {
                                  const logoUrl = getProviderLogoUrl(provider.provider)
                                  if (logoUrl) {
                                    return (
                                      <img
                                        src={logoUrl}
                                        alt={`${provider.provider} logo`}
                                        className="w-8 h-8 object-contain"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement
                                          target.style.display = 'none'
                                          const fallback = target.nextElementSibling as HTMLElement
                                          if (fallback) fallback.style.display = 'flex'
                                        }}
                                      />
                                    )
                                  }
                                  return null
                                })()}
                                <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-xs" style={{ display: getProviderLogoUrl(provider.provider) ? 'none' : 'flex' }}>
                                  {(provider.provider || 'P').charAt(0).toUpperCase()}
                                </div>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-slate-900">{provider.model || provider.provider}</div>
                                <div className="text-xs text-slate-500">{provider.provider}</div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                {provider.paymentMethod === 'credits' ? '💳 Credits' : '🔑 API Key'}
                              </span>
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                {provider.success ? 'Success' : 'Error'}
                              </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div>
                              <p className="text-slate-500">Tokens</p>
                              <p className="font-medium">{provider.tokens || 0}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Cost</p>
                              <p className="font-medium">${provider.cost ? provider.cost.toFixed(4) : '0.0000'}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Success</p>
                              <p className="font-medium">
                                <span className="px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-800">
                                  {provider.success ? 'Yes' : 'No'}
                                </span>
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-500">Latency</p>
                              <p className="font-medium">{provider.latency || 0}ms</p>
                            </div>
                          </div>

                          {/* Provider Response */}
                          {provider.response && (
                            <div className="mt-4">
                              <p className="text-xs text-slate-500 mb-2">Response</p>
                              <div className="bg-slate-50 p-3 rounded-lg max-h-40 overflow-y-auto">
                                <pre className="whitespace-pre-wrap text-xs text-slate-700 font-mono">
                                  {typeof provider.response === 'string'
                                    ? provider.response
                                    : JSON.stringify(provider.response, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Request Metadata */}
                <div>
                  <h4 className="text-sm font-medium text-slate-900 mb-3">Request Metadata</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <p className="text-xs text-slate-500">Client</p>
                      <p className="text-sm font-medium text-slate-900">
                        {selectedLog.client || 'Unknown'}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <p className="text-xs text-slate-500">Temperature</p>
                      <p className="text-sm font-medium text-slate-900">
                        {selectedLog.temperature || 'Default'}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <p className="text-xs text-slate-500">Max Tokens</p>
                      <p className="text-sm font-medium text-slate-900">
                        {selectedLog.maxTokens || 'Default'}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <p className="text-xs text-slate-500">Response Time</p>
                      <p className="text-sm font-medium text-slate-900">
                        {selectedLog.responseTime || 0}ms
                      </p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <p className="text-xs text-slate-500">Successful Providers</p>
                      <p className="text-sm font-medium text-slate-900">
                        {selectedLog.successfulProviders || 0}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <p className="text-xs text-slate-500">Failed Providers</p>
                      <p className="text-sm font-medium text-slate-900">
                        {selectedLog.failedProviders || 0}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <p className="text-xs text-slate-500">Payment Method</p>
                      <p className="text-sm font-medium text-slate-900">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                          {selectedLog.paymentMethod === 'credits' ? '💳 Credits' : '🔑 API Key'}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AnimatedDashboard>
  )
}
