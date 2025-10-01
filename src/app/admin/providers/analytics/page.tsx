'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle, BarChart3, TrendingUp, AlertTriangle, DollarSign, Activity, RefreshCw } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'

interface AnalyticsData {
  keyUsageStats: any[]
  providerOverview: any[]
  errorAnalysis: any[]
  costBreakdown: any[]
  availableProviders: { id: string; name: string }[]
  timeRange: string
  startTime: string
}

const TIME_RANGES = [
  { id: '1h', name: 'Last Hour' },
  { id: '6h', name: 'Last 6 Hours' },
  { id: '1d', name: 'Last Day' },
  { id: '7d', name: 'Last 7 Days' },
  { id: '30d', name: 'Last 30 Days' }
]

export default function ProviderAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    keyUsageStats: [],
    providerOverview: [],
    errorAnalysis: [],
    costBreakdown: [],
    availableProviders: [],
    timeRange: '7d',
    startTime: ''
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [selectedProvider, setSelectedProvider] = useState('all')
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d')

  useEffect(() => {
    loadAnalytics()
  }, [selectedProvider, selectedTimeRange])

  const loadAnalytics = async (forceRefresh = false) => {
    if (forceRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError('')

    try {
      const params = new URLSearchParams({
        timeRange: selectedTimeRange
      })

      if (selectedProvider !== 'all') {
        params.set('provider', selectedProvider)
      }

      const response = await fetch(`/api/admin/provider-analytics?${params}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load analytics')
      }

      if (result.success && result.data) {
        setAnalytics(result.data)
      } else {
        setError('Failed to load analytics data')
      }
    } catch (err: any) {
      console.error('Error loading analytics:', err)
      setError(err.message || 'Error loading analytics data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`
  const formatNumber = (num: number) => num.toLocaleString()

  const totalCost = analytics.providerOverview.reduce((sum, p) => sum + (p.total_usage || 0), 0)
  const totalCalls = analytics.keyUsageStats.reduce((sum, k) => sum + (k.total_calls || 0), 0)
  const successfulCalls = analytics.keyUsageStats.reduce((sum, k) => sum + (k.successful_calls || 0), 0)
  const totalKeys = analytics.providerOverview.reduce((sum, p) => sum + (p.total_keys || 0), 0)
  const activeKeys = analytics.providerOverview.reduce((sum, p) => sum + (p.active_keys || 0), 0)
  const avgSuccessRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="mb-4">
        <button
          onClick={() => window.location.href = '/admin/providers'}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Provider Keys
        </button>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Provider Analytics</h1>
          <p className="text-gray-600 mt-2">Monitor admin API key usage, costs, and performance</p>
        </div>
        <div className="flex space-x-3">
          <Select value={selectedProvider} onValueChange={setSelectedProvider}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Providers</SelectItem>
              {analytics.availableProviders.map(provider => (
                <SelectItem key={provider.id} value={provider.id}>
                  {provider.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_RANGES.map(range => (
                <SelectItem key={range.id} value={range.id}>
                  {range.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => loadAnalytics(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCost)}</div>
            <p className="text-xs text-muted-foreground">
              {TIME_RANGES.find(r => r.id === selectedTimeRange)?.name}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Calls</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalCalls)}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(successfulCalls)} successful
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Keys</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeKeys}</div>
            <p className="text-xs text-muted-foreground">of {totalKeys} total admin keys</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(avgSuccessRate)}</div>
            <p className="text-xs text-muted-foreground">Across all keys</p>
          </CardContent>
        </Card>
      </div>

      {analytics.keyUsageStats.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <BarChart3 className="w-12 h-12 mx-auto text-gray-400" />
              <div>
                <h3 className="text-lg font-semibold">No Analytics Data</h3>
                <p className="text-gray-600 mt-2">
                  No usage data found for the selected time range. Add admin API keys and use them to see analytics.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="usage" className="space-y-4">
          <TabsList>
            <TabsTrigger value="usage">Key Usage</TabsTrigger>
            <TabsTrigger value="costs">Cost Breakdown</TabsTrigger>
            <TabsTrigger value="errors">Error Analysis</TabsTrigger>
            <TabsTrigger value="providers">Provider Overview</TabsTrigger>
          </TabsList>

          <TabsContent value="usage" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>API Key Usage Statistics</CardTitle>
                <CardDescription>Detailed usage metrics for each admin API key</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.keyUsageStats.map((key) => (
                    <Card key={key.id}>
                      <CardContent className="pt-6">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-medium">{key.key_name}</h3>
                              <Badge variant="outline">#{key.priority_order}</Badge>
                              <Badge variant="secondary">{key.provider}</Badge>
                              {key.active ? (
                                <Badge variant="default">Active</Badge>
                              ) : (
                                <Badge variant="secondary">Inactive</Badge>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500">API Calls</p>
                              <p className="font-medium text-lg">{formatNumber(key.total_calls)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Success Rate</p>
                              <p className="font-medium text-lg">{formatPercentage(key.success_rate)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Total Cost</p>
                              <p className="font-medium text-lg">{formatCurrency(key.total_cost)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Tokens Used</p>
                              <p className="font-medium text-lg">{formatNumber(key.total_tokens)}</p>
                            </div>
                          </div>

                          {key.monthly_budget && (
                            <div className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Monthly Budget Usage</span>
                                <span className="font-medium">
                                  {formatCurrency(key.current_usage)} / {formatCurrency(key.monthly_budget)}
                                </span>
                              </div>
                              <Progress
                                value={(key.current_usage / key.monthly_budget) * 100}
                                className="h-2"
                              />
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="costs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cost Breakdown</CardTitle>
                <CardDescription>Detailed cost analysis by provider and key</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.costBreakdown
                    .sort((a, b) => b.total_cost - a.total_cost)
                    .map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{item.key_name}</span>
                            <Badge variant="secondary">{item.provider}</Badge>
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatNumber(item.api_calls)} calls • {formatCurrency(item.avg_cost_per_call)} avg/call
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="text-lg font-bold">{formatCurrency(item.total_cost)}</div>
                          {item.monthly_budget && (
                            <div className="text-sm text-gray-500">
                              {formatPercentage(item.budget_utilization)} of budget
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="errors" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Error Analysis</CardTitle>
                <CardDescription>API errors by type and frequency</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.errorAnalysis.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <TrendingUp className="w-12 h-12 mx-auto mb-3 text-green-500" />
                    <p className="font-medium">No errors found</p>
                    <p className="text-sm mt-1">All API calls were successful in the selected time range</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {analytics.errorAnalysis
                      .sort((a: any, b: any) => b.error_count - a.error_count)
                      .map((error: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-red-50 transition-colors">
                          <div className="flex items-center space-x-3">
                            <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0" />
                            <div>
                              <div className="font-medium">{error.key_name}</div>
                              <div className="text-sm text-gray-500">{error.provider}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="destructive" className="font-mono">{error.error_type}</Badge>
                            <div className="text-sm text-gray-500 mt-1">
                              {formatNumber(error.error_count)} errors
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="providers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Provider Overview</CardTitle>
                <CardDescription>Aggregated statistics by provider</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.providerOverview
                    .sort((a, b) => b.total_usage - a.total_usage)
                    .map((provider, index) => (
                      <Card key={index}>
                        <CardContent className="pt-6">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h3 className="text-lg font-semibold capitalize">{provider.provider}</h3>
                              <div className="text-right">
                                <div className="text-2xl font-bold">{formatCurrency(provider.total_usage)}</div>
                                <div className="text-sm text-gray-500">Total Cost</div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-gray-500">Total Keys</p>
                                <p className="font-medium text-lg">{provider.total_keys}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Active Keys</p>
                                <p className="font-medium text-lg">{provider.active_keys}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">API Calls</p>
                                <p className="font-medium text-lg">{formatNumber(provider.total_calls)}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Success Rate</p>
                                <p className="font-medium text-lg">{formatPercentage(provider.success_rate)}</p>
                              </div>
                            </div>

                            {provider.total_budget > 0 && (
                              <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-500">Budget Utilization</span>
                                  <span className="font-medium">
                                    {formatCurrency(provider.total_usage)} / {formatCurrency(provider.total_budget)}
                                  </span>
                                </div>
                                <Progress
                                  value={provider.avg_utilization}
                                  className="h-2"
                                />
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
