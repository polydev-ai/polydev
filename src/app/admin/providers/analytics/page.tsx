'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle, BarChart3, TrendingUp, AlertTriangle, DollarSign, Activity, Clock } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'

interface ProviderAnalytics {
  keyUsageStats: any[]
  providerOverview: any[]
  usageTrends: any[]
  errorAnalysis: any[]
  costBreakdown: any[]
}

const PROVIDERS = [
  { id: 'all', name: 'All Providers' },
  { id: 'anthropic', name: 'Anthropic' },
  { id: 'openai', name: 'OpenAI' },
  { id: 'xai', name: 'xAI' },
  { id: 'google', name: 'Google' },
  { id: 'cerebras', name: 'Cerebras' },
  { id: 'zai', name: 'ZAI' }
]

const TIME_RANGES = [
  { id: '1h', name: 'Last Hour' },
  { id: '6h', name: 'Last 6 Hours' },
  { id: '1d', name: 'Last Day' },
  { id: '7d', name: 'Last 7 Days' },
  { id: '30d', name: 'Last 30 Days' }
]

export default function ProviderAnalyticsPage() {
  const [analytics, setAnalytics] = useState<ProviderAnalytics>({
    keyUsageStats: [],
    providerOverview: [],
    usageTrends: [],
    errorAnalysis: [],
    costBreakdown: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedProvider, setSelectedProvider] = useState('all')
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d')
  const [availableQueries, setAvailableQueries] = useState<any>(null)

  useEffect(() => {
    loadAvailableQueries()
  }, [])

  useEffect(() => {
    if (availableQueries) {
      loadAnalytics()
    }
  }, [selectedProvider, selectedTimeRange, availableQueries])

  const loadAvailableQueries = async () => {
    try {
      const response = await fetch(`/api/admin/provider-analytics?provider=${selectedProvider}&timeRange=${selectedTimeRange}`)
      const data = await response.json()

      if (data.success) {
        setAvailableQueries(data.availableQueries)
      } else {
        setError('Failed to load query templates')
      }
    } catch (err) {
      setError('Error loading query templates')
    }
  }

  const loadAnalytics = async () => {
    if (!availableQueries) return

    setLoading(true)
    setError('')

    try {
      // Note: In a real implementation, these queries would be executed
      // using the Supabase MCP server tools like mcp__supabase__execute_sql
      // For now, we'll show the query structure and mock some data

      console.log('Available MCP Queries:')
      Object.entries(availableQueries).forEach(([key, query]: [string, any]) => {
        console.log(`${key}:`, query.mcpQuery)
      })

      // Mock data for demonstration
      const mockAnalytics = {
        keyUsageStats: [
          {
            id: '1',
            provider: 'anthropic',
            key_name: 'Claude Primary Key',
            priority_order: 1,
            monthly_budget: 500,
            current_usage: 125.50,
            total_calls: 1250,
            successful_calls: 1225,
            total_cost: 125.50,
            total_tokens: 2500000
          },
          {
            id: '2',
            provider: 'anthropic',
            key_name: 'Claude Backup Key',
            priority_order: 2,
            monthly_budget: 300,
            current_usage: 45.25,
            total_calls: 450,
            successful_calls: 445,
            total_cost: 45.25,
            total_tokens: 900000
          }
        ],
        providerOverview: [
          {
            provider: 'anthropic',
            total_keys: 3,
            active_keys: 2,
            total_usage: 170.75,
            total_budget: 800,
            avg_utilization: 21.34
          },
          {
            provider: 'openai',
            total_keys: 2,
            active_keys: 2,
            total_usage: 85.30,
            total_budget: 400,
            avg_utilization: 21.33
          }
        ],
        usageTrends: [],
        errorAnalysis: [
          {
            provider: 'anthropic',
            key_name: 'Claude Primary Key',
            error_type: 'rate_limit',
            error_count: 25,
            error_percentage: 2.0
          }
        ],
        costBreakdown: [
          {
            provider: 'anthropic',
            key_name: 'Claude Primary Key',
            monthly_budget: 500,
            current_usage: 125.50,
            budget_utilization: 25.1,
            api_calls: 1250,
            total_cost: 125.50,
            avg_cost_per_call: 0.10
          }
        ]
      }

      // Filter by selected provider if not 'all'
      if (selectedProvider !== 'all') {
        Object.keys(mockAnalytics).forEach(key => {
          if (Array.isArray(mockAnalytics[key as keyof typeof mockAnalytics])) {
            mockAnalytics[key as keyof typeof mockAnalytics] = mockAnalytics[key as keyof typeof mockAnalytics].filter(
              (item: any) => item.provider === selectedProvider
            )
          }
        })
      }

      setAnalytics(mockAnalytics)

    } catch (err) {
      setError('Error loading analytics data')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Provider Analytics</h1>
          <p className="text-gray-600 mt-2">Monitor API key usage, costs, and performance</p>
        </div>
        <div className="flex space-x-4">
          <Select value={selectedProvider} onValueChange={setSelectedProvider}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROVIDERS.map(provider => (
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
            <div className="text-2xl font-bold">
              {formatCurrency(analytics.providerOverview.reduce((sum, p) => sum + (p.total_usage || 0), 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              This {selectedTimeRange}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Calls</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.keyUsageStats.reduce((sum, k) => sum + (k.total_calls || 0), 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.keyUsageStats.reduce((sum, k) => sum + (k.successful_calls || 0), 0).toLocaleString()} successful
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Keys</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.providerOverview.reduce((sum, p) => sum + (p.active_keys || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              of {analytics.providerOverview.reduce((sum, p) => sum + (p.total_keys || 0), 0)} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.keyUsageStats.length > 0 ?
                formatPercentage(
                  analytics.keyUsageStats.reduce((sum, k) =>
                    sum + ((k.successful_calls || 0) / (k.total_calls || 1) * 100), 0
                  ) / analytics.keyUsageStats.length
                ) : '0%'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Across all keys
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="usage" className="space-y-4">
        <TabsList>
          <TabsTrigger value="usage">Key Usage</TabsTrigger>
          <TabsTrigger value="costs">Cost Breakdown</TabsTrigger>
          <TabsTrigger value="errors">Error Analysis</TabsTrigger>
          <TabsTrigger value="queries">MCP Queries</TabsTrigger>
        </TabsList>

        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Key Usage Statistics</CardTitle>
              <CardDescription>Usage metrics for each API key</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.keyUsageStats.map((key, index) => (
                  <Card key={key.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium">{key.key_name}</h3>
                            <Badge variant="outline">#{key.priority_order}</Badge>
                            <Badge variant="secondary">{key.provider}</Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500">API Calls</p>
                              <p className="font-medium">{key.total_calls?.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Success Rate</p>
                              <p className="font-medium">
                                {formatPercentage((key.successful_calls || 0) / (key.total_calls || 1) * 100)}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500">Total Cost</p>
                              <p className="font-medium">{formatCurrency(key.total_cost || 0)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Tokens Used</p>
                              <p className="font-medium">{key.total_tokens?.toLocaleString()}</p>
                            </div>
                          </div>
                          {key.monthly_budget && (
                            <div className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span>Budget Usage</span>
                                <span>{formatCurrency(key.current_usage)} / {formatCurrency(key.monthly_budget)}</span>
                              </div>
                              <Progress
                                value={(key.current_usage / key.monthly_budget) * 100}
                                className="h-2"
                              />
                            </div>
                          )}
                        </div>
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
                {analytics.costBreakdown.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{item.key_name}</span>
                        <Badge variant="secondary">{item.provider}</Badge>
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.api_calls} calls • {formatCurrency(item.avg_cost_per_call)} avg/call
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="text-lg font-bold">{formatCurrency(item.total_cost)}</div>
                      <div className="text-sm text-gray-500">
                        {formatPercentage(item.budget_utilization)} of budget
                      </div>
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
                  No errors found in the selected time range
                </div>
              ) : (
                <div className="space-y-4">
                  {analytics.errorAnalysis.map((error, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                        <div>
                          <div className="font-medium">{error.key_name}</div>
                          <div className="text-sm text-gray-500">{error.provider}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-red-600">{error.error_type}</div>
                        <div className="text-sm text-gray-500">
                          {error.error_count} errors ({formatPercentage(error.error_percentage)})
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Available MCP Queries</CardTitle>
              <CardDescription>
                Use these SQL queries with the Supabase MCP server (mcp__supabase__execute_sql)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {availableQueries && (
                <div className="space-y-6">
                  {Object.entries(availableQueries).map(([key, query]: [string, any]) => (
                    <div key={key} className="space-y-2">
                      <h3 className="font-medium">{key}</h3>
                      <p className="text-sm text-gray-600">{query.description}</p>
                      <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                        <code>{query.mcpQuery}</code>
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}