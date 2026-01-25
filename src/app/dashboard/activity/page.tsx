'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Activity,
  Download,
  Calendar,
  DollarSign,
  MessageCircle,
  RefreshCw,
  Filter,
  Coins,
  Home,
  ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import { AnimatePresence } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'

// Provider logo URLs for displaying in analytics
const PROVIDER_LOGOS: Record<string, string> = {
  'openai': 'https://avatars.githubusercontent.com/u/14957082?s=200&v=4',
  'gpt': 'https://avatars.githubusercontent.com/u/14957082?s=200&v=4',
  'anthropic': 'https://avatars.githubusercontent.com/u/76263028?s=200&v=4',
  'claude': 'https://avatars.githubusercontent.com/u/76263028?s=200&v=4',
  'google': 'https://cdn.worldvectorlogo.com/logos/google-g-2015.svg',
  'gemini': 'https://cdn.worldvectorlogo.com/logos/google-g-2015.svg',
  'deepseek': 'https://avatars.githubusercontent.com/u/159560534?s=200&v=4',
  'xai': 'https://avatars.githubusercontent.com/u/165790280?s=200&v=4',
  'x-ai': 'https://avatars.githubusercontent.com/u/165790280?s=200&v=4',
  'grok': 'https://avatars.githubusercontent.com/u/165790280?s=200&v=4',
  'mistral': 'https://avatars.githubusercontent.com/u/132372032?s=200&v=4',
  'together': 'https://avatars.githubusercontent.com/u/59926009?s=200&v=4',
  'cerebras': 'https://avatars.githubusercontent.com/u/76206399?s=200&v=4',
  'perplexity': 'https://avatars.githubusercontent.com/u/83043819?s=200&v=4',
  'cohere': 'https://avatars.githubusercontent.com/u/30046380?s=200&v=4',
  'huggingface': 'https://huggingface.co/front/assets/huggingface_logo-noborder.svg',
  'zhipu': 'https://z-cdn.chatglm.cn/z-ai/static/logo.svg',
  'zai': 'https://z-cdn.chatglm.cn/z-ai/static/logo.svg',
  'glm': 'https://z-cdn.chatglm.cn/z-ai/static/logo.svg',
  'groq': 'https://avatars.githubusercontent.com/u/76236773?s=200&v=4',
  'meta': 'https://avatars.githubusercontent.com/u/69631?s=200&v=4',
  'llama': 'https://avatars.githubusercontent.com/u/69631?s=200&v=4',
  'qwen': 'https://cdn.worldvectorlogo.com/logos/alibaba-group-holding-limited.svg',
  'alibaba': 'https://cdn.worldvectorlogo.com/logos/alibaba-group-holding-limited.svg',
}

// Get provider logo URL from model or provider name
function getProviderLogo(name: string): string | null {
  if (!name) return null
  const normalized = name.toLowerCase()
  
  for (const [key, url] of Object.entries(PROVIDER_LOGOS)) {
    if (normalized.includes(key)) {
      return url
    }
  }
  return null
}

// Get provider abbreviation for fallback
function getProviderAbbrev(name: string): string {
  if (!name) return '?'
  const normalized = name.toLowerCase()
  
  if (normalized.includes('gpt') || normalized.includes('openai')) return 'OA'
  if (normalized.includes('claude') || normalized.includes('anthropic')) return 'A'
  if (normalized.includes('gemini') || normalized.includes('google')) return 'G'
  if (normalized.includes('deepseek')) return 'DS'
  if (normalized.includes('grok') || normalized.includes('xai') || normalized.includes('x-ai')) return 'xi'
  if (normalized.includes('mistral')) return 'M'
  if (normalized.includes('llama') || normalized.includes('meta')) return 'L'
  if (normalized.includes('glm') || normalized.includes('zhipu') || normalized.includes('zai')) return 'Z'
  if (normalized.includes('qwen') || normalized.includes('alibaba')) return 'Q'
  if (normalized.includes('groq')) return 'GQ'
  if (normalized.includes('cerebras')) return 'CB'
  if (normalized.includes('perplexity')) return 'PP'
  if (normalized.includes('cohere')) return 'CO'
  
  return name.substring(0, 2).toUpperCase()
}

// Logo component with fallback
function ProviderLogo({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const logoUrl = getProviderLogo(name)
  const abbrev = getProviderAbbrev(name)
  const sizeClass = size === 'sm' ? 'w-5 h-5' : 'w-7 h-7'
  const innerSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
  const textSize = size === 'sm' ? 'text-[9px]' : 'text-[10px]'
  
  return (
    <div className={`${sizeClass} rounded-md overflow-hidden flex items-center justify-center bg-white border border-slate-200 flex-shrink-0`}>
      {logoUrl ? (
        <img
          src={logoUrl}
          alt=""
          className={`${innerSize} object-contain`}
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
            const fallback = target.nextElementSibling as HTMLElement
            if (fallback) fallback.style.display = 'flex'
          }}
        />
      ) : null}
      <div 
        className={`${sizeClass} bg-gradient-to-br from-slate-600 to-indigo-600 rounded-md flex items-center justify-center text-white font-bold ${textSize} ${logoUrl ? 'hidden' : ''}`}
      >
        {abbrev}
      </div>
    </div>
  )
}

interface UsageData {
  summary: {
    totalCost: number
    totalTokens: number
    totalSessions: number
    avgCostPerSession: number
    avgTokensPerSession: number
    providerStats: Array<{
      provider: string
      cost: number
      tokens: number
      sessions: number
      avgCostPerSession: number
    }>
    modelStats: Array<{
      model: string
      cost: number
      tokens: number
      sessions: number
      avgCostPerSession: number
    }>
    timeSeries: Array<{
      cost: number
      tokens: number
      sessions: number
      date: string
    }>
  }
  previousPeriod?: {
    totalCost: number
    totalTokens: number
    totalSessions: number
  }
  comparison?: {
    costChange: number
    costChangePercent: number
    tokensChange: number
    tokensChangePercent: number
    sessionsChange: number
    sessionsChangePercent: number
  }
  sessions: Array<{
    id: string
    createdAt: string
    provider: string
    model: string
    tokens: number
    cost: number
    source: string
    app: string
    finishReason: string
    tps?: number
    messages: any[]
  }>
  filters: {
    timeframe: string
    provider?: string
    model?: string
    startDate: string
    endDate: string
    groupBy: string
  }
  meta: {
    totalResults: number
    generatedAt: string
    userId: string
  }
}

// Credits data interface
interface CreditsData {
  balance: {
    current: number
    promotional: number
    total: number
    totalSpent: number
    totalPurchased: number
  }
  period: {
    from: string
    to: string
    totalCreditsUsed: number
    totalRequests: number
  }
  tierBreakdown: {
    premium: { requests: number; credits: number; estimatedCost: number }
    normal: { requests: number; credits: number; estimatedCost: number }
    eco: { requests: number; credits: number; estimatedCost: number }
  }
  tierCosts: {
    premium: number
    normal: number
    eco: number
  }
  modelBreakdown: Array<{
    model: string
    tier: string
    requests: number
    credits: number
    estimatedCost: number
  }>
  sourceBreakdown: Record<string, { requests: number; credits: number }>
  dailyUsage: Array<{ date: string; credits: number; requests: number }>
  recentTransactions: Array<{
    date: string
    model: string
    tier: string
    credits: number
    source: string
  }>
}

// Cache for activity data to prevent duplicate fetching
const activityCache = {
  data: new Map<string, UsageData>(),
  timestamps: new Map<string, number>(),
  CACHE_DURATION: 2 * 60 * 1000 // 2 minutes
}

let activeRequest: Promise<UsageData> | null = null

export default function ActivityPage() {
  const { user } = useAuth()
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [creditsData, setCreditsData] = useState<CreditsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [creditsLoading, setCreditsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(true)
  const debounceTimerRef = useRef<NodeJS.Timeout>()

  // Filter states
  const [timeframe, setTimeframe] = useState('30d')
  const [provider, setProvider] = useState('')
  const [model, setModel] = useState('')
  const [costMin, setCostMin] = useState('')
  const [costMax, setCostMax] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [groupBy, setGroupBy] = useState('day')
  const [includeComparison, setIncludeComparison] = useState(true)

  // Create cache key from current filters
  const getCacheKey = useCallback(() => {
    const filters = {
      timeframe,
      provider,
      model,
      costMin,
      costMax,
      startDate,
      endDate,
      groupBy,
      includeComparison
    }
    return JSON.stringify(filters)
  }, [timeframe, provider, model, costMin, costMax, startDate, endDate, groupBy, includeComparison])

  const fetchData = useCallback(async () => {
    if (!user || !isMountedRef.current) return

    const cacheKey = getCacheKey()
    const now = Date.now()

    // Check cache first
    if (activityCache.data.has(cacheKey) &&
        activityCache.timestamps.has(cacheKey) &&
        (now - activityCache.timestamps.get(cacheKey)!) < activityCache.CACHE_DURATION) {
      const cachedData = activityCache.data.get(cacheKey)!
      if (isMountedRef.current) {
        setUsageData(cachedData)
        setLoading(false)
        setError(null)
      }
      return
    }

    // Prevent duplicate requests
    if (activeRequest) {
      try {
        const data = await activeRequest
        if (isMountedRef.current) {
          setUsageData(data)
          setLoading(false)
          setError(null)
        }
      } catch (err) {
        // Request already handled error state
      }
      return
    }

    activeRequest = (async (): Promise<UsageData> => {
      try {
        if (isMountedRef.current) {
          setLoading(true)
          setError(null)
        }

        const params = new URLSearchParams()

        if (startDate && endDate) {
          params.set('start_date', startDate)
          params.set('end_date', endDate)
        } else {
          params.set('timeframe', timeframe)
        }

        if (provider) params.set('provider', provider)
        if (model) params.set('model', model)
        if (costMin) params.set('cost_min', costMin)
        if (costMax) params.set('cost_max', costMax)
        params.set('group_by', groupBy)
        params.set('include_comparison', includeComparison.toString())

        const response = await fetch(`/api/usage/comprehensive?${params.toString()}`)

        if (!response.ok) {
          if (response.status === 401) {
            window.location.href = '/auth/signin'
            throw new Error('Authentication required')
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()

        // Cache the result
        activityCache.data.set(cacheKey, data)
        activityCache.timestamps.set(cacheKey, now)

        if (isMountedRef.current) {
          setUsageData(data)
          setError(null)
        }

        return data
      } catch (error) {
        console.error('Error fetching activity data:', error)
        if (isMountedRef.current) {
          setError(error instanceof Error ? error.message : 'Failed to load activity data')
        }
        throw error
      } finally {
        activeRequest = null
        if (isMountedRef.current) {
          setLoading(false)
        }
      }
    })()

    try {
      await activeRequest
    } catch (error) {
      // Error already handled above
    }
  }, [user, getCacheKey, timeframe, provider, model, costMin, costMax, startDate, endDate, groupBy, includeComparison])

  // Fetch credits accounting data
  const fetchCreditsData = useCallback(async () => {
    if (!user || !isMountedRef.current) return

    try {
      setCreditsLoading(true)
      const response = await fetch(`/api/usage/credits?timeframe=${timeframe}`)
      
      if (response.ok) {
        const data = await response.json()
        if (isMountedRef.current) {
          setCreditsData(data)
        }
      }
    } catch (error) {
      console.error('Error fetching credits data:', error)
    } finally {
      if (isMountedRef.current) {
        setCreditsLoading(false)
      }
    }
  }, [user, timeframe])

  const downloadCSV = async () => {
    if (!user) return
    
    try {
      const params = new URLSearchParams()
      
      if (startDate && endDate) {
        params.set('start_date', startDate)
        params.set('end_date', endDate)
      } else {
        params.set('timeframe', timeframe)
      }
      
      if (provider) params.set('provider', provider)
      if (model) params.set('model', model)
      if (costMin) params.set('cost_min', costMin)
      if (costMax) params.set('cost_max', costMax)
      params.set('format', 'csv')

      const response = await fetch(`/api/usage/comprehensive?${params.toString()}`)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `activity-export-${new Date().toISOString().slice(0, 10)}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error downloading CSV:', error)
    }
  }

  // Debounced fetch function for filter changes
  const debouncedFetch = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      fetchData()
    }, 300) // 300ms debounce
  }, [fetchData])

  // Initial load when user changes
  useEffect(() => {
    isMountedRef.current = true
    if (user) {
      fetchData()
      fetchCreditsData()
    }
    return () => {
      isMountedRef.current = false
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [user, fetchData, fetchCreditsData])

  // Debounced refetch when filters change
  useEffect(() => {
    if (user) {
      debouncedFetch()
      fetchCreditsData()
    }
  }, [user, timeframe, provider, model, costMin, costMax, startDate, endDate, groupBy, includeComparison, debouncedFetch, fetchCreditsData])

  // Memoize expensive calculations (moved before conditional returns to fix hook order)
  const summary = useMemo(() => {
    return usageData?.summary || {
      totalCost: 0,
      totalTokens: 0,
      totalSessions: 0,
      avgCostPerSession: 0,
      avgTokensPerSession: 0,
      providerStats: [],
      modelStats: [],
      timeSeries: []
    }
  }, [usageData?.summary])

  const comparison = useMemo(() => usageData?.comparison, [usageData?.comparison])
  const sessions = useMemo(() => usageData?.sessions || [], [usageData?.sessions])

  // Memoize filtered sessions for performance
  const filteredSessions = useMemo(() => {
    return sessions.slice(0, 100) // Limit to first 100 for performance
  }, [sessions])

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground">Please sign in to view activity</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-center">
          <p className="text-slate-900 font-medium mb-2">Error loading activity data</p>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
        <Button onClick={fetchData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard" className="flex items-center gap-1 hover:text-slate-900 transition-colors">
          <Home className="w-4 h-4" />
          <span>Dashboard</span>
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-slate-900 font-medium">Activity</span>
      </nav>

      {/* Header - Settings-like card style */}
      <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Activity Analytics</h1>
              <p className="text-slate-600">
                Comprehensive usage analytics across all your AI interactions
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button onClick={fetchData} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={downloadCSV} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div>
        <Card className="shadow hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
          <p className="text-sm text-slate-600">Filter your activity data by various criteria</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="timeframe">Time Period</Label>
              <select
                id="timeframe"
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
              >
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="1y">Last Year</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <Input
                id="provider"
                placeholder="Filter by provider..."
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                placeholder="Filter by model..."
                value={model}
                onChange={(e) => setModel(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="groupBy">Group By</Label>
              <select
                id="groupBy"
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
              >
                <option value="hour">Hour</option>
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="costMin">Min Cost (USD)</Label>
              <Input
                id="costMin"
                type="number"
                step="0.0001"
                placeholder="0.0000"
                value={costMin}
                onChange={(e) => setCostMin(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="costMax">Max Cost (USD)</Label>
              <Input
                id="costMax"
                type="number"
                step="0.0001"
                placeholder="No limit"
                value={costMax}
                onChange={(e) => setCostMax(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
        </Card>
      </div>

      {/* Empty State for New Users */}
      {summary.totalSessions === 0 && summary.totalTokens === 0 && (
        <Card className="shadow hover:shadow-lg transition-shadow bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No activity yet</h3>
            <p className="text-slate-600 mb-4 max-w-md mx-auto">
              Make your first request to see analytics here. Connect your IDE and start getting AI perspectives.
            </p>
            <div className="flex gap-3 justify-center">
              <Link
                href="/dashboard/mcp-tokens"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
              >
                Connect IDE
              </Link>
              <Link
                href="/docs"
                className="px-4 py-2 bg-white text-slate-700 rounded-lg hover:bg-slate-100 font-medium text-sm border border-slate-200"
              >
                View Docs
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {(summary.totalSessions > 0 || summary.totalTokens > 0) && (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalSessions.toLocaleString()}</div>
            {comparison && (
              <p className="text-xs text-muted-foreground">
                <span className="text-slate-900 font-medium">
                  {comparison.sessionsChangePercent >= 0 ? '+' : ''}{comparison.sessionsChangePercent}%
                </span>
                {' '}from previous period
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalTokens.toLocaleString()}</div>
            {comparison && (
              <p className="text-xs text-muted-foreground">
                <span className="text-slate-900 font-medium">
                  {comparison.tokensChangePercent >= 0 ? '+' : ''}{comparison.tokensChangePercent}%
                </span>
                {' '}from previous period
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.totalCost.toFixed(4)}</div>
            {comparison && (
              <p className="text-xs text-muted-foreground">
                <span className="text-slate-900 font-medium">
                  {comparison.costChangePercent >= 0 ? '+' : ''}{comparison.costChangePercent}%
                </span>
                {' '}from previous period
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Cost/Session</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.avgCostPerSession.toFixed(4)}</div>
            <p className="text-xs text-muted-foreground">
              {summary.avgTokensPerSession} avg tokens/session
            </p>
          </CardContent>
        </Card>
      </div>
      )}

      {/* Analytics Tabs */}
      {(summary.totalSessions > 0 || summary.totalTokens > 0) && (
      <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
        <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="credits">Credits</TabsTrigger>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  Top Providers by Cost
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {summary.providerStats.slice(0, 5).map((provider, index) => (
                    <div key={provider.provider} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-slate-500">#{index + 1}</span>
                        <ProviderLogo name={provider.provider} size="sm" />
                        <span>{provider.provider}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">${provider.cost.toFixed(4)}</div>
                        <div className="text-xs text-muted-foreground">
                          {provider.sessions} sessions
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  Top Models by Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {summary.modelStats.slice(0, 5).map((model, index) => (
                    <div key={model.model} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-slate-500">#{index + 1}</span>
                        <ProviderLogo name={model.model} size="sm" />
                        <span className="truncate max-w-[180px]" title={model.model}>
                          {model.model}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{model.tokens.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">
                          ${model.cost.toFixed(4)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="credits" className="space-y-4">
          {creditsLoading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : creditsData ? (
            <>
              {/* Credits Balance Summary */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Available Credits</CardTitle>
                    <Coins className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{creditsData.balance.total.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                      {creditsData.balance.promotional.toLocaleString()} promotional
                    </p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Credits Used (Period)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{creditsData.period.totalCreditsUsed.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                      {creditsData.period.totalRequests} requests
                    </p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Spent (All Time)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{creditsData.balance.totalSpent.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">credits</p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Credit Costs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-amber-600">Premium</span>
                        <span className="font-medium">{creditsData.tierCosts.premium} credits</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-600">Normal</span>
                        <span className="font-medium">{creditsData.tierCosts.normal} credits</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-600">Credits Tier</span>
                        <span className="font-medium">{creditsData.tierCosts.eco} credit</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tier Breakdown */}
              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Coins className="h-5 w-5 mr-2" />
                      Usage by Tier
                    </CardTitle>
                    <CardDescription>Credits consumed by model tier</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {creditsData.tierBreakdown.premium.credits > 0 && (
                      <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                        <div>
                          <div className="font-medium text-amber-800">Premium</div>
                          <div className="text-sm text-amber-600">{creditsData.tierBreakdown.premium.requests} requests</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-amber-700">{creditsData.tierBreakdown.premium.credits}</div>
                          <div className="text-xs text-amber-600">credits</div>
                        </div>
                      </div>
                      )}
                      {creditsData.tierBreakdown.normal.credits > 0 && (
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div>
                          <div className="font-medium text-blue-800">Normal</div>
                          <div className="text-sm text-blue-600">{creditsData.tierBreakdown.normal.requests} requests</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-blue-700">{creditsData.tierBreakdown.normal.credits}</div>
                          <div className="text-xs text-blue-600">credits</div>
                        </div>
                      </div>
                      )}
                      {creditsData.tierBreakdown.eco.credits > 0 && (
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div>
                          <div className="font-medium text-green-800">Credits Tier</div>
                          <div className="text-sm text-green-600">{creditsData.tierBreakdown.eco.requests} requests</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-green-700">{creditsData.tierBreakdown.eco.credits}</div>
                          <div className="text-xs text-green-600">credits</div>
                        </div>
                      </div>
                      )}
                      {creditsData.tierBreakdown.premium.credits === 0 && 
                       creditsData.tierBreakdown.normal.credits === 0 && 
                       creditsData.tierBreakdown.eco.credits === 0 && (
                        <div className="text-center py-4 text-muted-foreground">
                          No credits used in this period
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle>Credits by Model</CardTitle>
                    <CardDescription>Top models by credits consumed</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {creditsData.modelBreakdown
                        .filter(model => model.credits > 0)
                        .slice(0, 8)
                        .map((model, index) => (
                        <div key={model.model} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                            <ProviderLogo name={model.model} size="sm" />
                            <span className="truncate max-w-[160px]" title={model.model}>{model.model}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{model.credits}</div>
                            <div className="text-xs text-muted-foreground">{model.requests} req</div>
                          </div>
                        </div>
                      ))}
                      {creditsData.modelBreakdown.filter(model => model.credits > 0).length === 0 && (
                        <div className="text-center py-4 text-muted-foreground">
                          No credits used by any model
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Transactions */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle>Recent Credit Transactions</CardTitle>
                  <CardDescription>Last 50 credit deductions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-slate-500">
                          <th className="py-2 pr-4">Date</th>
                          <th className="py-2 pr-4">Model</th>
                          <th className="py-2 pr-4">Credits</th>
                          <th className="py-2 pr-4">Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {creditsData.recentTransactions
                          .filter(tx => tx.credits > 0)
                          .map((tx, index) => (
                          <tr key={index} className="border-t border-slate-200">
                            <td className="py-2 pr-4 text-xs">{new Date(tx.date).toLocaleString()}</td>
                            <td className="py-2 pr-4">
                              <div className="flex items-center gap-2">
                                <ProviderLogo name={tx.model} size="sm" />
                                <span className="truncate max-w-[150px] text-xs" title={tx.model}>{tx.model}</span>
                              </div>
                            </td>
                            <td className="py-2 pr-4 font-medium">-{tx.credits}</td>
                            <td className="py-2 pr-4">
                              <Badge variant="outline" className="text-xs">{tx.source.replace('_', ' ')}</Badge>
                            </td>
                          </tr>
                        ))}
                        {creditsData.recentTransactions.filter(tx => tx.credits > 0).length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-muted-foreground">
                              No credit transactions found for this period
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No credits data available
            </div>
          )}
        </TabsContent>

        <TabsContent value="providers" className="space-y-4">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Provider Statistics</CardTitle>
              <CardDescription>Detailed breakdown by AI provider</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="py-2 pr-4">Provider</th>
                      <th className="py-2 pr-4">Sessions</th>
                      <th className="py-2 pr-4">Tokens</th>
                      <th className="py-2 pr-4">Total Cost</th>
                      <th className="py-2 pr-4">Avg Cost/Session</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.providerStats.map((provider) => (
                      <tr key={provider.provider} className="border-t border-slate-200">
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-2">
                            <ProviderLogo name={provider.provider} size="sm" />
                            <span className="font-medium">{provider.provider}</span>
                          </div>
                        </td>
                        <td className="py-2 pr-4">{provider.sessions.toLocaleString()}</td>
                        <td className="py-2 pr-4">{provider.tokens.toLocaleString()}</td>
                        <td className="py-2 pr-4">${provider.cost.toFixed(4)}</td>
                        <td className="py-2 pr-4">${provider.avgCostPerSession.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Model Statistics</CardTitle>
              <CardDescription>Detailed breakdown by AI model</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="py-2 pr-4">Model</th>
                      <th className="py-2 pr-4">Sessions</th>
                      <th className="py-2 pr-4">Tokens</th>
                      <th className="py-2 pr-4">Total Cost</th>
                      <th className="py-2 pr-4">Avg Cost/Session</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.modelStats.map((model) => (
                      <tr key={model.model} className="border-t border-slate-200">
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-2">
                            <ProviderLogo name={model.model} size="sm" />
                            <span className="font-medium truncate max-w-[200px]" title={model.model}>{model.model}</span>
                          </div>
                        </td>
                        <td className="py-2 pr-4">{model.sessions.toLocaleString()}</td>
                        <td className="py-2 pr-4">{model.tokens.toLocaleString()}</td>
                        <td className="py-2 pr-4">${model.cost.toFixed(4)}</td>
                        <td className="py-2 pr-4">${model.avgCostPerSession.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                Usage Timeline
              </CardTitle>
              <CardDescription>Activity over time (grouped by {groupBy})</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Sessions</th>
                      <th className="py-2 pr-4">Tokens</th>
                      <th className="py-2 pr-4">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.timeSeries.map((item) => (
                      <tr key={item.date} className="border-t border-slate-200">
                        <td className="py-2 pr-4">{new Date(item.date).toLocaleDateString()}</td>
                        <td className="py-2 pr-4">{item.sessions.toLocaleString()}</td>
                        <td className="py-2 pr-4">{item.tokens.toLocaleString()}</td>
                        <td className="py-2 pr-4">${item.cost.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Individual Sessions</CardTitle>
              <CardDescription>
                Detailed view of each AI interaction ({sessions.length} total sessions, showing first 100)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Provider / Model</th>
                      <th className="py-2 pr-4">App</th>
                      <th className="py-2 pr-4">Tokens</th>
                      <th className="py-2 pr-4">Cost</th>
                      <th className="py-2 pr-4">Speed</th>
                      <th className="py-2 pr-4">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSessions.map((session) => (
                      <tr key={session.id} className="border-t border-slate-200">
                        <td className="py-2 pr-4">{new Date(session.createdAt).toLocaleString()}</td>
                        <td className="py-2 pr-4">{session.provider} / {session.model}</td>
                        <td className="py-2 pr-4">{session.app}</td>
                        <td className="py-2 pr-4">{session.tokens.toLocaleString()}</td>
                        <td className="py-2 pr-4">${session.cost.toFixed(4)}</td>
                        <td className="py-2 pr-4">{session.tps ? `${session.tps} tps` : '—'}</td>
                        <td className="py-2 pr-4">
                          <Badge variant="outline">
                            {session.source}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {filteredSessions.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-muted-foreground">
                          No sessions found for the selected criteria
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        </Tabs>
      </div>
      )}
    </div>
  )
}