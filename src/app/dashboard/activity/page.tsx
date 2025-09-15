'use client'

import { useState, useEffect } from 'react'
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
  TrendingUp,
  TrendingDown,
  DollarSign,
  Zap,
  MessageCircle,
  RefreshCw,
  Filter,
  BarChart3,
  PieChart,
  LineChart
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

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

export default function ActivityPage() {
  const { user } = useAuth()
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
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

  const fetchData = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      setError(null)
      
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
          return
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      setUsageData(data)
    } catch (error) {
      console.error('Error fetching activity data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load activity data')
    } finally {
      setLoading(false)
    }
  }

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

  useEffect(() => {
    fetchData()
  }, [user, timeframe, provider, model, costMin, costMax, startDate, endDate, groupBy, includeComparison])

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
          <p className="text-red-600 mb-2">Error loading activity data</p>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
        <Button onClick={fetchData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
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

  const comparison = usageData?.comparison
  const sessions = usageData?.sessions || []

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Activity Analytics</h1>
          <p className="text-muted-foreground">
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

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="timeframe">Time Period</Label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                  <SelectItem value="1y">Last Year</SelectItem>
                </SelectContent>
              </Select>
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
              <Select value={groupBy} onValueChange={setGroupBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hour">Hour</SelectItem>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                </SelectContent>
              </Select>
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

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalSessions.toLocaleString()}</div>
            {comparison && (
              <p className="text-xs text-muted-foreground">
                <span className={comparison.sessionsChangePercent >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {comparison.sessionsChangePercent >= 0 ? '+' : ''}{comparison.sessionsChangePercent}%
                </span>
                {' '}from previous period
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalTokens.toLocaleString()}</div>
            {comparison && (
              <p className="text-xs text-muted-foreground">
                <span className={comparison.tokensChangePercent >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {comparison.tokensChangePercent >= 0 ? '+' : ''}{comparison.tokensChangePercent}%
                </span>
                {' '}from previous period
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.totalCost.toFixed(4)}</div>
            {comparison && (
              <p className="text-xs text-muted-foreground">
                <span className={comparison.costChangePercent >= 0 ? 'text-red-600' : 'text-green-600'}>
                  {comparison.costChangePercent >= 0 ? '+' : ''}{comparison.costChangePercent}%
                </span>
                {' '}from previous period
              </p>
            )}
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

      {/* Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Top Providers by Cost
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {summary.providerStats.slice(0, 5).map((provider, index) => (
                    <div key={provider.provider} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">#{index + 1}</span>
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

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="h-5 w-5 mr-2" />
                  Top Models by Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {summary.modelStats.slice(0, 5).map((model, index) => (
                    <div key={model.model} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">#{index + 1}</span>
                        <span className="truncate max-w-[200px]" title={model.model}>
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

        <TabsContent value="providers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Provider Statistics</CardTitle>
              <CardDescription>Detailed breakdown by AI provider</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 dark:text-gray-400">
                      <th className="py-2 pr-4">Provider</th>
                      <th className="py-2 pr-4">Sessions</th>
                      <th className="py-2 pr-4">Tokens</th>
                      <th className="py-2 pr-4">Total Cost</th>
                      <th className="py-2 pr-4">Avg Cost/Session</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.providerStats.map((provider) => (
                      <tr key={provider.provider} className="border-t border-gray-200 dark:border-gray-700">
                        <td className="py-2 pr-4 font-medium">{provider.provider}</td>
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
          <Card>
            <CardHeader>
              <CardTitle>Model Statistics</CardTitle>
              <CardDescription>Detailed breakdown by AI model</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 dark:text-gray-400">
                      <th className="py-2 pr-4">Model</th>
                      <th className="py-2 pr-4">Sessions</th>
                      <th className="py-2 pr-4">Tokens</th>
                      <th className="py-2 pr-4">Total Cost</th>
                      <th className="py-2 pr-4">Avg Cost/Session</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.modelStats.map((model) => (
                      <tr key={model.model} className="border-t border-gray-200 dark:border-gray-700">
                        <td className="py-2 pr-4 font-medium">{model.model}</td>
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <LineChart className="h-5 w-5 mr-2" />
                Usage Timeline
              </CardTitle>
              <CardDescription>Activity over time (grouped by {groupBy})</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 dark:text-gray-400">
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Sessions</th>
                      <th className="py-2 pr-4">Tokens</th>
                      <th className="py-2 pr-4">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.timeSeries.map((item) => (
                      <tr key={item.date} className="border-t border-gray-200 dark:border-gray-700">
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
          <Card>
            <CardHeader>
              <CardTitle>Individual Sessions</CardTitle>
              <CardDescription>
                Detailed view of each AI interaction ({sessions.length} sessions)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 dark:text-gray-400">
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
                    {sessions.map((session) => (
                      <tr key={session.id} className="border-t border-gray-200 dark:border-gray-700">
                        <td className="py-2 pr-4">{new Date(session.createdAt).toLocaleString()}</td>
                        <td className="py-2 pr-4">{session.provider} / {session.model}</td>
                        <td className="py-2 pr-4">{session.app}</td>
                        <td className="py-2 pr-4">{session.tokens.toLocaleString()}</td>
                        <td className="py-2 pr-4">${session.cost.toFixed(4)}</td>
                        <td className="py-2 pr-4">{session.tps ? `${session.tps} tps` : '—'}</td>
                        <td className="py-2 pr-4">
                          <Badge
                            variant={
                              session.source === 'Credits' ? 'default' :
                              session.source === 'CLI' ? 'secondary' : 'outline'
                            }
                          >
                            {session.source}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {sessions.length === 0 && (
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
  )
}