'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Activity, 
  CreditCard, 
  Terminal, 
  Key, 
  Calendar,
  TrendingUp,
  Zap,
  Gift,
  MessageCircle,
  DollarSign,
  Settings,
  RefreshCw,
  ExternalLink
} from 'lucide-react'

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

interface CLIConfig {
  id: string
  tool_name: string
  cli_path: string
  enabled: boolean
  last_verified: string | null
  config_options: Record<string, any>
}

export default function UnifiedUsagePage() {
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [cliConfigs, setCliConfigs] = useState<CLIConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState('month')
  const [includeDetails, setIncludeDetails] = useState(false)
  const [sessionsList, setSessionsList] = useState<any[]>([])
  const [totalSessions, setTotalSessions] = useState<number | null>(null)
  const [sourceFilter, setSourceFilter] = useState<'all' | 'api' | 'cli' | 'credits'>('all')
  const [providerFilter, setProviderFilter] = useState<string>('')
  const [modelFilter, setModelFilter] = useState<string>('')
  const [providerOptions, setProviderOptions] = useState<Array<{ name: string, count: number, bySource: { api: number, cli: number, credits: number } }>>([])
  const [modelOptions, setModelOptions] = useState<Array<{ name: string, count: number, bySource: { api: number, cli: number, credits: number } }>>([])
  const [limit, setLimit] = useState(100)
  const [offset, setOffset] = useState(0)
  const [useCustomRange, setUseCustomRange] = useState(false)
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')

  const fetchUsageData = async () => {
    try {
      const params = new URLSearchParams()
      
      if (useCustomRange && fromDate && toDate) {
        params.set('start_date', new Date(fromDate).toISOString())
        params.set('end_date', new Date(toDate).toISOString())
      } else {
        params.set('timeframe', timeframe)
      }
      
      if (providerFilter) params.set('provider', providerFilter)
      if (modelFilter) params.set('model', modelFilter)
      params.set('group_by', 'day')
      params.set('include_comparison', 'true')

      const response = await fetch(`/api/usage/comprehensive?${params.toString()}`)
      
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/auth/signin'
          return
        }
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      setUsageData(data)
    } catch (error) {
      console.error('Error fetching usage data:', error)
      setUsageData(null)
    }
  }

  const fetchSessions = async () => {
    try {
      const now = new Date()
      let from: string | undefined
      let to: string | undefined
      if (useCustomRange && fromDate) from = new Date(fromDate).toISOString()
      if (useCustomRange && toDate) to = new Date(toDate).toISOString()
      if (!useCustomRange) {
        if (timeframe === 'day') from = new Date(now.getTime() - 24*60*60*1000).toISOString()
        if (timeframe === 'week') from = new Date(now.getTime() - 7*24*60*60*1000).toISOString()
        if (timeframe === 'month') from = new Date(now.getTime() - 30*24*60*60*1000).toISOString()
        if (timeframe === 'year') from = new Date(now.getTime() - 365*24*60*60*1000).toISOString()
      }

      const params = new URLSearchParams()
      params.set('limit', String(limit))
      params.set('offset', String(offset))
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      if (sourceFilter === 'credits') params.set('onlyCredits', 'true')
      if (sourceFilter === 'api') params.set('source', 'api')
      if (sourceFilter === 'cli') params.set('source', 'cli')
      if (sourceFilter === 'credits') params.set('source', 'credits')
      if (providerFilter) params.set('provider', providerFilter)
      if (modelFilter) params.set('model', modelFilter)
      params.set('includeCount', 'true')

      const res = await fetch(`/api/usage/sessions?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setSessionsList(data.items || [])
        setTotalSessions(typeof data.total === 'number' ? data.total : null)
      }
    } catch (e) {
      console.error('Error fetching sessions:', e)
    }
  }

  const fetchCLIConfigs = async () => {
    try {
      const response = await fetch('/api/cli-config')
      if (response.ok) {
        const data = await response.json()
        setCliConfigs(data.configs || [])
      }
    } catch (error) {
      console.error('Error fetching CLI configs:', error)
    }
  }

  const grantPromotionalCredits = async (amount: number, reason: string) => {
    try {
      const response = await fetch('/api/promotional-credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: 'current_user', // This would be handled by auth
          amount,
          reason
        })
      })
      
      if (response.ok) {
        await fetchUsageData() // Refresh data
      }
    } catch (error) {
      console.error('Error granting promotional credits:', error)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchUsageData(), fetchCLIConfigs(), fetchSessions()])
      setLoading(false)
    }
    loadData()
  }, [timeframe, includeDetails, sourceFilter, providerFilter, modelFilter, limit, offset, useCustomRange, fromDate, toDate])

  // Load distinct provider/model options based on timeframe/source and current filters
  useEffect(() => {
    const loadDistinct = async () => {
      try {
        const now = new Date()
        let from: string | undefined
        let to: string | undefined
        if (useCustomRange && fromDate) from = new Date(fromDate).toISOString()
        if (useCustomRange && toDate) to = new Date(toDate).toISOString()
        if (!useCustomRange) {
          if (timeframe === 'day') from = new Date(now.getTime() - 24*60*60*1000).toISOString()
          if (timeframe === 'week') from = new Date(now.getTime() - 7*24*60*60*1000).toISOString()
          if (timeframe === 'month') from = new Date(now.getTime() - 30*24*60*60*1000).toISOString()
          if (timeframe === 'year') from = new Date(now.getTime() - 365*24*60*60*1000).toISOString()
        }
        // Providers list
        const baseParams = new URLSearchParams()
        if (from) baseParams.set('from', from)
        if (to) baseParams.set('to', to)
        if (sourceFilter !== 'all') baseParams.set('source', sourceFilter)
        if (modelFilter) baseParams.set('model', modelFilter)
        const resProviders = await fetch(`/api/usage/distinct?${baseParams.toString()}`)
        if (resProviders.ok) {
          const dataP = await resProviders.json()
          setProviderOptions((dataP.providers || []) as typeof providerOptions)
        }
        // Models list narrowed by provider if selected (and without model itself to avoid over-filtering)
        const modelParams = new URLSearchParams()
        if (from) modelParams.set('from', from)
        if (to) modelParams.set('to', to)
        if (sourceFilter !== 'all') modelParams.set('source', sourceFilter)
        if (providerFilter) modelParams.set('provider', providerFilter)
        const resModels = await fetch(`/api/usage/distinct?${modelParams.toString()}`)
        if (resModels.ok) {
          const dataM = await resModels.json()
          setModelOptions((dataM.models || []) as typeof modelOptions)
        }
      } catch (e) {
        console.error('Error loading distinct options:', e)
      }
    }
    loadDistinct()
  }, [timeframe, useCustomRange, fromDate, toDate, sourceFilter, providerFilter, modelFilter])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const summary = usageData?.summary || {
    totalCost: 0,
    totalTokens: 0,
    totalSessions: 0,
    avgCostPerSession: 0,
    avgTokensPerSession: 0,
    providerStats: [],
    modelStats: [],
    timeSeries: []
  }

  const sessions = usageData?.sessions || []
  const comparison = usageData?.comparison
  const filters = usageData?.filters

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Usage & Billing</h1>
          <p className="text-muted-foreground">
            Comprehensive tracking across API keys, credits, and CLI tools
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="day">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={useCustomRange} onChange={(e) => { setUseCustomRange(e.target.checked); setOffset(0) }} /> Custom range
          </label>
          {useCustomRange && (
            <>
              <input type="datetime-local" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setOffset(0) }} className="px-3 py-2 border rounded-md" />
              <input type="datetime-local" value={toDate} onChange={(e) => { setToDate(e.target.value); setOffset(0) }} className="px-3 py-2 border rounded-md" />
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => { fetchUsageData(); fetchSessions() }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalSessions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {comparison && (
                <span className={comparison.sessionsChangePercent >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {comparison.sessionsChangePercent >= 0 ? '+' : ''}{comparison.sessionsChangePercent}% from previous period
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalTokens.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {comparison && (
                <span className={comparison.tokensChangePercent >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {comparison.tokensChangePercent >= 0 ? '+' : ''}{comparison.tokensChangePercent}% from previous period
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.totalCost.toFixed(4)}</div>
            <p className="text-xs text-muted-foreground">
              {comparison && (
                <span className={comparison.costChangePercent >= 0 ? 'text-red-600' : 'text-green-600'}>
                  {comparison.costChangePercent >= 0 ? '+' : ''}{comparison.costChangePercent}% from previous period
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Cost/Session</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.avgCostPerSession.toFixed(4)}</div>
            <p className="text-xs text-muted-foreground">
              {summary.avgTokensPerSession} avg tokens/session
            </p>
          </CardContent>
        </Card>
      </div>

      {/* All Requests */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Requests</CardTitle>
              <CardDescription>Across API, CLI, and Credits</CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value as any)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="all">All Sources</option>
                <option value="api">API</option>
                <option value="cli">CLI</option>
                <option value="credits">Credits</option>
              </select>
              <select
                value={providerFilter}
                onChange={(e) => { setProviderFilter(e.target.value); setOffset(0) }}
                className="px-3 py-2 border rounded-md"
              >
                <option value="">All Providers</option>
                {providerOptions.map((p) => {
                  const label = sourceFilter === 'all'
                    ? `${p.name} (A${p.bySource.api || 0}/CLI${p.bySource.cli || 0}/Cr${p.bySource.credits || 0})`
                    : `${p.name} (${p.count})`
                  return (
                    <option key={p.name} value={p.name}>{label}</option>
                  )
                })}
              </select>
              <span className="text-xs text-muted-foreground">{providerOptions.length} providers</span>
              <select
                value={modelFilter}
                onChange={(e) => { setModelFilter(e.target.value); setOffset(0) }}
                className="px-3 py-2 border rounded-md max-w-[260px]"
              >
                <option value="">All Models</option>
                {modelOptions.map((m) => {
                  const label = sourceFilter === 'all'
                    ? `${m.name} (A${m.bySource.api || 0}/CLI${m.bySource.cli || 0}/Cr${m.bySource.credits || 0})`
                    : `${m.name} (${m.count})`
                  return (
                    <option key={m.name} value={m.name}>{label}</option>
                  )
                })}
              </select>
              <span className="text-xs text-muted-foreground">{modelOptions.length} models</span>
              <select
                value={limit}
                onChange={(e) => { setLimit(Number(e.target.value)); setOffset(0) }}
                className="px-3 py-2 border rounded-md"
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground hidden md:inline">
                  Page {Math.floor(offset / limit) + 1}{totalSessions ? ` of ${Math.max(1, Math.ceil(totalSessions / limit))}` : ''}
                </span>
                <Button variant="outline" size="sm" onClick={() => setOffset(Math.max(0, offset - limit))} disabled={offset === 0}>Prev</Button>
                <Button variant="outline" size="sm" onClick={() => setOffset(offset + limit)} disabled={totalSessions !== null ? (offset + limit >= (totalSessions || 0)) : (sessionsList.length < limit)}>Next</Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400">
                  <th className="py-2 pr-4">Timestamp</th>
                  <th className="py-2 pr-4">Provider / Model</th>
                  <th className="py-2 pr-4">App</th>
                  <th className="py-2 pr-4">Tokens</th>
                  <th className="py-2 pr-4">Cost</th>
                  <th className="py-2 pr-4">Speed</th>
                  <th className="py-2 pr-4">Finish</th>
                  <th className="py-2 pr-4">Source</th>
                </tr>
              </thead>
              <tbody>
                {sessionsList.map((s) => (
                  <tr key={s.id} className="border-t border-gray-200 dark:border-gray-700">
                    <td className="py-2 pr-4">{new Date(s.createdAt).toLocaleString()}</td>
                    <td className="py-2 pr-4">{s.provider || '—'} / {s.model || '—'}</td>
                    <td className="py-2 pr-4">{s.app || '—'}</td>
                    <td className="py-2 pr-4">{s.tokens?.toLocaleString?.() || s.tokens || 0}</td>
                    <td className="py-2 pr-4">${(s.cost || 0).toFixed(4)}</td>
                    <td className="py-2 pr-4">{s.tps ? `${s.tps} tps` : '—'}</td>
                    <td className="py-2 pr-4">{s.finishReason || '—'}</td>
                    <td className="py-2 pr-4">
                      {s.source === 'Credits' ? (
                        <Badge variant="default">Credits</Badge>
                      ) : s.source === 'CLI' ? (
                        <Badge variant="secondary">CLI</Badge>
                      ) : (
                        <Badge variant="outline">API</Badge>
                      )}
                    </td>
                  </tr>
                ))}
                {sessionsList.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-4 text-center text-muted-foreground">No sessions</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="usage-paths">Usage Paths</TabsTrigger>
          <TabsTrigger value="cli-tools">CLI Tools</TabsTrigger>
          <TabsTrigger value="promotional">Promotional Credits</TabsTrigger>
          <TabsTrigger value="billing">Billing History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Usage Distribution</CardTitle>
                <CardDescription>
                  Messages sent across different usage paths
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center">
                      <Key className="h-4 w-4 mr-2" />
                      Own API Keys
                    </span>
                    <span>0</span>
                  </div>
                  <Progress 
                    value={0} 
                    className="h-2" 
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Polydev Credits
                    </span>
                    <span>0</span>
                  </div>
                  <Progress 
                    value={0} 
                    className="h-2" 
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center">
                      <Terminal className="h-4 w-4 mr-2" />
                      CLI Tools
                    </span>
                    <span>0</span>
                  </div>
                  <Progress 
                    value={0} 
                    className="h-2" 
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Models & Providers</CardTitle>
                <CardDescription>
                  Unique AI models and providers used
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Models ({summary.modelStats?.length || 0})</h4>
                  <div className="flex flex-wrap gap-1">
                    {(summary.modelStats || []).slice(0, 6).map((modelStat, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {modelStat.model}
                      </Badge>
                    ))}
                    {(summary.modelStats?.length || 0) > 6 && (
                      <Badge variant="secondary" className="text-xs">
                        +{(summary.modelStats?.length || 0) - 6} more
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Providers ({summary.providerStats?.length || 0})</h4>
                  <div className="flex flex-wrap gap-1">
                    {(summary.providerStats || []).map((providerStat, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {providerStat.provider}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Tools (0)</h4>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">
                      No tool data available
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="usage-paths" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* API Keys Usage */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Key className="h-5 w-5 mr-2" />
                  Own API Keys
                </CardTitle>
                <CardDescription>
                  Usage with your own API keys
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Messages</span>
                    <span className="font-medium">0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Est. Cost</span>
                    <span className="font-medium">${summary.total_cost_usd.toFixed(4)}</span>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(usageData?.breakdown.api_keys || {}).map(([provider, data]: [string, any]) => (
                      <div key={provider} className="flex justify-between text-sm">
                        <span>{provider}</span>
                        <span>{data.messages} msgs</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Credits Usage */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Polydev Credits
                </CardTitle>
                <CardDescription>
                  Usage with purchased credits
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Messages</span>
                    <span className="font-medium">0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Credits Used</span>
                    <span className="font-medium">{summary.total_credits_used.toFixed(2)}</span>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(usageData?.breakdown.credits || {}).map(([provider, data]: [string, any]) => (
                      <div key={provider} className="flex justify-between text-sm">
                        <span>{provider}</span>
                        <span>{data.cost_credits.toFixed(2)} credits</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CLI Tools Usage */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Terminal className="h-5 w-5 mr-2" />
                  CLI Tools
                </CardTitle>
                <CardDescription>
                  Usage via CLI integrations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Messages</span>
                    <span className="font-medium">0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Active CLIs</span>
                    <span className="font-medium">{cliConfigs.filter(c => c.enabled).length}</span>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(usageData?.breakdown.cli_tools || {}).map(([tool, data]: [string, any]) => (
                      <div key={tool} className="flex justify-between text-sm">
                        <span>{tool}</span>
                        <span>{data.messages} msgs</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cli-tools" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>CLI Tool Configurations</CardTitle>
              <CardDescription>
                Manage your CLI integrations for comprehensive usage tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cliConfigs.length === 0 ? (
                  <div className="text-center py-8">
                    <Terminal className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">No CLI tools configured</p>
                    <Button onClick={fetchCLIConfigs}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Auto-detect CLI Tools
                    </Button>
                  </div>
                ) : (
                  cliConfigs.map((config) => (
                    <div key={config.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Terminal className="h-5 w-5" />
                        <div>
                          <h4 className="font-medium">{config.tool_name.replace('_', ' ')}</h4>
                          <p className="text-sm text-muted-foreground">{config.cli_path}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {config.last_verified ? (
                          <Badge variant="default">Verified</Badge>
                        ) : (
                          <Badge variant="outline">Unverified</Badge>
                        )}
                        {config.enabled ? (
                          <Badge variant="default">Enabled</Badge>
                        ) : (
                          <Badge variant="secondary">Disabled</Badge>
                        )}
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="promotional" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Gift className="h-5 w-5 mr-2" />
                  Promotional Balance
                </CardTitle>
                <CardDescription>
                  Your current promotional credits
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-3xl font-bold">
                    ${balance.promotional.toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total granted: ${balance.promotional_total.toFixed(2)}
                  </div>
                  <Progress 
                    value={balance.promotional_total > 0 ? 
                      ((balance.promotional_total - balance.promotional) / balance.promotional_total) * 100 : 0
                    } 
                    className="h-2" 
                  />
                  <div className="text-xs text-muted-foreground">
                    Used: ${(balance.promotional_total - balance.promotional).toFixed(2)}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Promotions</CardTitle>
                <CardDescription>
                  Your current promotional credit grants
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {usageData?.active_promotional_credits.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No active promotional credits</p>
                  ) : (
                    usageData?.active_promotional_credits.map((credit) => (
                      <div key={credit.id} className="flex justify-between items-center p-3 border rounded">
                        <div>
                          <div className="font-medium">${credit.remaining.toFixed(2)} remaining</div>
                          <div className="text-sm text-muted-foreground">{credit.reason}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm">${credit.amount.toFixed(2)} total</div>
                          {credit.expires_at && (
                            <div className="text-xs text-muted-foreground">
                              Expires: {new Date(credit.expires_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Billing Summary</CardTitle>
              <CardDescription>
                Your lifetime usage and spending across all paths
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Total Purchased</div>
                  <div className="text-2xl font-bold">${balance.lifetime_purchased.toFixed(2)}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Total Spent</div>
                  <div className="text-2xl font-bold">${balance.lifetime_spent.toFixed(2)}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Current Balance</div>
                  <div className="text-2xl font-bold">${balance.total.toFixed(2)}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Promotional Total</div>
                  <div className="text-2xl font-bold">${balance.promotional_total.toFixed(2)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {usageData?.monthly_summary && (
            <Card>
              <CardHeader>
                <CardTitle>This Month</CardTitle>
                <CardDescription>
                  Current month usage summary
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">API Key Messages</div>
                    <div className="text-lg font-bold">{usageData.monthly_summary.api_key_messages}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Credit Messages</div>
                    <div className="text-lg font-bold">{usageData.monthly_summary.credit_messages}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">CLI Messages</div>
                    <div className="text-lg font-bold">{usageData.monthly_summary.cli_tool_messages}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <div className="flex justify-center">
        <Button asChild>
          <a href="/dashboard/credits" className="flex items-center">
            <CreditCard className="h-4 w-4 mr-2" />
            Purchase More Credits
            <ExternalLink className="h-4 w-4 ml-2" />
          </a>
        </Button>
      </div>
    </div>
  )
}
