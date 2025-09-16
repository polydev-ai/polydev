'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  Zap, 
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  Activity
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow, isValid, parseISO } from 'date-fns'

interface CreditBalance {
  balance: number
  promotional_balance: number
  totalPurchased: number
  totalSpent: number
  hasOpenRouterKey: boolean
  openRouterKeyActive: boolean
  purchaseHistory: any[]
  recentUsage: any[]
  analytics: {
    totalSpent: number
    totalRequests: number
    avgCostPerRequest: number
    topModels: any[]
  }
  createdAt: string
  updatedAt: string
}

interface BudgetInfo {
  budget: {
    daily_limit: number | null
    weekly_limit: number | null
    monthly_limit: number | null
    preferred_models: string[]
    auto_top_up_enabled: boolean
    auto_top_up_threshold: number | null
    auto_top_up_amount: number | null
  }
  currentSpending: {
    daily: { amount: number, limit: number | null, percentage: number }
    weekly: { amount: number, limit: number | null, percentage: number }
    monthly: { amount: number, limit: number | null, percentage: number }
  }
  alerts: {
    dailyWarning: boolean
    weeklyWarning: boolean
    monthlyWarning: boolean
    dailyExceeded: boolean
    weeklyExceeded: boolean
    monthlyExceeded: boolean
  }
}

// Helper function for safe date formatting
const formatSafeDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'Unknown date'

  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString)
    if (!isValid(date)) return 'Invalid date'
    return formatDistanceToNow(date, { addSuffix: true })
  } catch (error) {
    console.warn('Invalid date:', dateString)
    return 'Invalid date'
  }
}

// Provider logo mapping using real models.dev logos
const getProviderLogo = (provider: string, providersRegistry: Array<{ id: string, name: string, logo_url: string, display_name: string }>) => {
  const providerKey = provider?.toLowerCase() || ''
  const providerInfo = providersRegistry.find(p =>
    p.id === providerKey ||
    p.name.toLowerCase() === providerKey ||
    providerKey.includes(p.id)
  )
  return providerInfo?.logo_url || 'https://models.dev/logos/default.svg'
}

// Get model logo based on actual model provider
const getModelLogo = (model: string, provider: string, providersRegistry: Array<{ id: string, name: string, logo_url: string, display_name: string }>, modelsRegistry: Array<{ id: string, name: string, provider_id: string, actual_provider: string }>) => {
  // Find the model in the registry
  const modelInfo = modelsRegistry.find(m => m.id === model || m.name === model)

  if (modelInfo?.actual_provider) {
    // Use the actual provider (e.g., "anthropic" for Claude models)
    return getProviderLogo(modelInfo.actual_provider, providersRegistry)
  }

  // Fallback to session provider
  return getProviderLogo(provider, providersRegistry)
}

// Format timestamp with proper error handling
const formatTimestamp = (timestamp: string | number | null | undefined): string => {
  if (!timestamp) return '—'

  try {
    let date: Date

    // Handle different timestamp formats
    if (typeof timestamp === 'number') {
      // Unix timestamp (seconds or milliseconds)
      date = new Date(timestamp > 1000000000000 ? timestamp : timestamp * 1000)
    } else if (typeof timestamp === 'string') {
      // ISO string or other date string
      date = new Date(timestamp)
    } else {
      return '—'
    }

    if (isNaN(date.getTime())) {
      console.warn('Invalid timestamp:', timestamp)
      return '—'
    }

    return date.toLocaleString()
  } catch (error) {
    console.warn('Error formatting timestamp:', timestamp, error)
    return '—'
  }
}

export default function CreditsPage() {
  const [creditBalance, setCreditBalance] = useState<CreditBalance | null>(null)
  const [budgetInfo, setBudgetInfo] = useState<BudgetInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(false)
  // Credit sessions state declared before any conditional returns
  const [creditSessions, setCreditSessions] = useState<any[]>([])
  const [csTimeframe, setCsTimeframe] = useState('month')
  const [csLimit, setCsLimit] = useState(100)
  const [csOffset, setCsOffset] = useState(0)
  const [csTotal, setCsTotal] = useState<number | null>(null)
  const [csProvider, setCsProvider] = useState<string>('')
  const [csModel, setCsModel] = useState<string>('')
  const [csProviderOptions, setCsProviderOptions] = useState<Array<{ name: string, count: number, bySource: { api: number, cli: number, credits: number } }>>([])
  const [csModelOptions, setCsModelOptions] = useState<Array<{ name: string, count: number, bySource: { api: number, cli: number, credits: number } }>>([])
  const [csUseCustomRange, setCsUseCustomRange] = useState(false)
  const [csFromDate, setCsFromDate] = useState<string>('')
  const [csToDate, setCsToDate] = useState<string>('')
  // Provider registry data
  const [providersRegistry, setProvidersRegistry] = useState<Array<{ id: string, name: string, logo_url: string, display_name: string }>>([])
  const [modelsRegistry, setModelsRegistry] = useState<Array<{ id: string, name: string, provider_id: string, actual_provider: string }>>([])

  useEffect(() => {
    fetchCreditData()
    fetchProvidersRegistry()
    fetchModelsRegistry()
  }, [])

  const fetchCreditData = async () => {
    try {
      setLoading(true)
      
      const [balanceRes, budgetRes] = await Promise.all([
        fetch('/api/credits/balance'),
        fetch('/api/credits/budget')
      ])

      if (balanceRes.ok) {
        const balanceData = await balanceRes.json()
        setCreditBalance(balanceData)
      }

      if (budgetRes.ok) {
        const budgetData = await budgetRes.json()
        setBudgetInfo(budgetData)
      }
    } catch (error) {
      console.error('Error fetching credit data:', error)
      toast.error('Failed to load credit information')
    } finally {
      setLoading(false)
    }
  }

  const handlePurchaseCredits = async (packageIndex: number) => {
    try {
      setPurchasing(true)
      
      const response = await fetch('/api/credits/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageIndex,
          successUrl: `${window.location.origin}/dashboard/credits?success=true`,
          cancelUrl: `${window.location.origin}/dashboard/credits?canceled=true`
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { url } = await response.json()
      window.location.href = url
      
    } catch (error) {
      console.error('Error purchasing credits:', error)
      toast.error('Failed to initiate purchase')
    } finally {
      setPurchasing(false)
    }
  }

  const fetchProvidersRegistry = async () => {
    try {
      const response = await fetch('/api/providers/registry')
      if (response.ok) {
        const data = await response.json()
        setProvidersRegistry(data.providers || [])
      }
    } catch (error) {
      console.error('Error fetching providers registry:', error)
    }
  }

  const fetchModelsRegistry = async () => {
    try {
      const response = await fetch('/api/models/registry')
      if (response.ok) {
        const data = await response.json()
        setModelsRegistry(data.models || [])
      }
    } catch (error) {
      console.error('Error fetching models registry:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-500" />
      default: return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  // Load credit sessions for table
  useEffect(() => {
    const loadCreditSessions = async () => {
      try {
        const now = new Date()
        let from: string | undefined
        let to: string | undefined
        if (csUseCustomRange && csFromDate) from = new Date(csFromDate).toISOString()
        if (csUseCustomRange && csToDate) to = new Date(csToDate).toISOString()
        if (!csUseCustomRange) {
          if (csTimeframe === 'day') from = new Date(now.getTime() - 24*60*60*1000).toISOString()
          if (csTimeframe === 'week') from = new Date(now.getTime() - 7*24*60*60*1000).toISOString()
          if (csTimeframe === 'month') from = new Date(now.getTime() - 30*24*60*60*1000).toISOString()
          if (csTimeframe === 'year') from = new Date(now.getTime() - 365*24*60*60*1000).toISOString()
        }
        const params = new URLSearchParams()
        params.set('onlyCredits', 'true')
        params.set('limit', String(csLimit))
        params.set('offset', String(csOffset))
        params.set('includeCount', 'true')
        if (csProvider) params.set('provider', csProvider)
        if (csModel) params.set('model', csModel)
        if (from) params.set('from', from)
        if (to) params.set('to', to)
        const res = await fetch(`/api/usage/sessions?${params.toString()}`)
        if (res.ok) {
          const data = await res.json()
          setCreditSessions(data.items || [])
          setCsTotal(typeof data.total === 'number' ? data.total : null)
        }
      } catch (e) {
        console.error('Error loading credit sessions:', e)
      }
    }
    loadCreditSessions()
  }, [csTimeframe, csLimit, csOffset, csUseCustomRange, csFromDate, csToDate, csProvider, csModel])

  // Load distinct provider/model options for dropdowns (narrow providers by model and models by provider)
  useEffect(() => {
    const loadDistinctOptions = async () => {
      try {
        const now = new Date()
        let from: string | undefined
        let to: string | undefined
        if (csUseCustomRange && csFromDate) from = new Date(csFromDate).toISOString()
        if (csUseCustomRange && csToDate) to = new Date(csToDate).toISOString()
        if (!csUseCustomRange) {
          if (csTimeframe === 'day') from = new Date(now.getTime() - 24*60*60*1000).toISOString()
          if (csTimeframe === 'week') from = new Date(now.getTime() - 7*24*60*60*1000).toISOString()
          if (csTimeframe === 'month') from = new Date(now.getTime() - 30*24*60*60*1000).toISOString()
          if (csTimeframe === 'year') from = new Date(now.getTime() - 365*24*60*60*1000).toISOString()
        }
        const paramsBase = new URLSearchParams()
        paramsBase.set('onlyCredits', 'true')
        paramsBase.set('source', 'credits')
        if (from) paramsBase.set('from', from)
        if (to) paramsBase.set('to', to)

        // Providers, narrowed by model if selected
        const paramsProviders = new URLSearchParams(paramsBase)
        if (csModel) paramsProviders.set('model', csModel)
        const resProviders = await fetch(`/api/usage/distinct?${paramsProviders.toString()}`)
        if (resProviders.ok) {
          const dataP = await resProviders.json()
          setCsProviderOptions((dataP.providers || []) as typeof csProviderOptions)
        }

        // Models, narrowed by provider if selected
        const paramsModels = new URLSearchParams(paramsBase)
        if (csProvider) paramsModels.set('provider', csProvider)
        const resModels = await fetch(`/api/usage/distinct?${paramsModels.toString()}`)
        if (resModels.ok) {
          const dataM = await resModels.json()
          setCsModelOptions((dataM.models || []) as typeof csModelOptions)
        }
      } catch (e) {
        console.error('Error loading distinct options:', e)
      }
    }
    loadDistinctOptions()
  }, [csTimeframe, csUseCustomRange, csFromDate, csToDate, csProvider, csModel])

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Credits & Billing</h1>
          <p className="text-muted-foreground">
            Manage your credits, view usage analytics, and configure budgets
          </p>
        </div>
        <Button onClick={() => window.location.reload()}>
          <Activity className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Alert Messages */}
      {budgetInfo?.alerts && (
        <div className="space-y-2">
          {budgetInfo.alerts.dailyExceeded && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
              <AlertCircle className="w-5 h-5" />
              Daily spending limit exceeded
            </div>
          )}
          {budgetInfo.alerts.weeklyExceeded && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
              <AlertCircle className="w-5 h-5" />
              Weekly spending limit exceeded
            </div>
          )}
          {budgetInfo.alerts.monthlyExceeded && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
              <AlertCircle className="w-5 h-5" />
              Monthly spending limit exceeded
            </div>
          )}
        </div>
      )}

      {/* Credit Balance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${creditBalance?.balance?.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-muted-foreground">
              Available credits
            </p>
            {creditBalance?.promotional_balance && creditBalance.promotional_balance > 0 && (
              <p className="text-xs text-green-600 mt-1">
                +${creditBalance.promotional_balance.toFixed(2)} promotional
              </p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Purchased</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${creditBalance?.totalPurchased?.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-muted-foreground">
              Lifetime purchases
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${creditBalance?.totalSpent?.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-muted-foreground">
              On AI requests
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Status</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant={creditBalance?.hasOpenRouterKey && creditBalance?.openRouterKeyActive ? "default" : "secondary"}>
                {creditBalance?.hasOpenRouterKey && creditBalance?.openRouterKeyActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              OpenRouter integration
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="purchase" className="space-y-6">
        <TabsList>
          <TabsTrigger value="purchase">Purchase Credits</TabsTrigger>
          <TabsTrigger value="overview">Recent Purchases</TabsTrigger>
          <TabsTrigger value="budget">Budget Settings</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Purchases */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Purchases</CardTitle>
                <CardDescription>Your latest credit purchases</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {creditBalance?.purchaseHistory?.length ? (
                    creditBalance.purchaseHistory.map((purchase) => (
                      <div key={purchase.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(purchase.status)}
                          <div>
                            <p className="font-medium">${purchase.amount}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatSafeDate(purchase.date)}
                            </p>
                          </div>
                        </div>
                        <Badge variant={purchase.status === 'completed' ? 'default' : 'secondary'}>
                          {purchase.status}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-4">No purchases yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Usage */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Usage</CardTitle>
                <CardDescription>Your latest AI model requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {creditBalance?.recentUsage?.length ? (
                    creditBalance.recentUsage.map((usage) => (
                      <div key={usage.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{usage.model || 'Unknown Model'}</p>
                          <p className="text-sm text-muted-foreground">
                            {usage.tokens || 0} tokens • {usage.tool || usage.type || 'Unknown'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${(usage.cost || 0).toFixed(4)}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatSafeDate(usage.date)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-4">No usage history yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="purchase" className="space-y-6">
          <CreditPurchaseCards onPurchase={handlePurchaseCredits} purchasing={purchasing} />
        </TabsContent>

        <TabsContent value="budget" className="space-y-6">
          <BudgetSettings budgetInfo={budgetInfo} onUpdate={fetchCreditData} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <AnalyticsDashboard creditBalance={creditBalance} providersRegistry={providersRegistry} modelsRegistry={modelsRegistry} />

          {/* Credit Usage Only */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Credit Usage (Polydev Credits)</CardTitle>
                  <CardDescription>Only requests billed via Polydev credits</CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={csTimeframe}
                    onChange={(e) => { setCsTimeframe(e.target.value); setCsOffset(0) }}
                    className="px-3 py-2 border rounded-md"
                  >
                    <option value="day">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="year">This Year</option>
                  </select>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={csUseCustomRange} onChange={(e) => { setCsUseCustomRange(e.target.checked); setCsOffset(0) }} /> Custom range
                  </label>
                  {csUseCustomRange && (
                    <>
                      <input type="datetime-local" value={csFromDate} onChange={(e) => { setCsFromDate(e.target.value); setCsOffset(0) }} className="px-3 py-2 border rounded-md" />
                      <input type="datetime-local" value={csToDate} onChange={(e) => { setCsToDate(e.target.value); setCsOffset(0) }} className="px-3 py-2 border rounded-md" />
                    </>
                  )}
                  <select
                    value={csProvider}
                    onChange={(e) => { setCsProvider(e.target.value); setCsOffset(0) }}
                    className="px-3 py-2 border rounded-md"
                  >
                    <option value="">All Providers</option>
                    {csProviderOptions.map((p) => (
                      <option key={p.name} value={p.name}>{`${p.name} (${p.bySource.credits || 0})`}</option>
                    ))}
                  </select>
                  <span className="text-xs text-muted-foreground">{csProviderOptions.length} providers</span>
                  <select
                    value={csModel}
                    onChange={(e) => { setCsModel(e.target.value); setCsOffset(0) }}
                    className="px-3 py-2 border rounded-md max-w-[260px]"
                  >
                    <option value="">All Models</option>
                    {csModelOptions.map((m) => (
                      <option key={m.name} value={m.name}>{`${m.name} (${m.bySource.credits || 0})`}</option>
                    ))}
                  </select>
                  <span className="text-xs text-muted-foreground">{csModelOptions.length} models</span>
                  <select
                    value={csLimit}
                    onChange={(e) => { setCsLimit(Number(e.target.value)); setCsOffset(0) }}
                    className="px-3 py-2 border rounded-md"
                  >
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                  </select>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground hidden md:inline">
                      Page {Math.floor(csOffset / csLimit) + 1}{csTotal ? ` of ${Math.max(1, Math.ceil(csTotal / csLimit))}` : ''}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => setCsOffset(Math.max(0, csOffset - csLimit))} disabled={csOffset === 0}>Prev</Button>
                    <Button variant="outline" size="sm" onClick={() => setCsOffset(csOffset + csLimit)} disabled={csTotal !== null ? (csOffset + csLimit >= (csTotal || 0)) : (creditSessions.length < csLimit)}>Next</Button>
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
                    </tr>
                  </thead>
                  <tbody>
                    {creditSessions.map((u: any) => (
                      <tr key={u.id} className="border-t border-gray-200 dark:border-gray-700">
                        <td className="py-2 pr-4">{formatTimestamp(u.createdAt || u.timestamp || u.date)}</td>
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 dark:bg-gray-800 rounded-md">
                              <img src={getProviderLogo(u.provider, providersRegistry)} alt={u.provider} className="w-3 h-3" />
                              <span className="text-xs font-medium">{u.provider || '—'}</span>
                            </div>
                            <span className="text-muted-foreground text-xs">→</span>
                            <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-md">
                              <img src={getModelLogo(u.model, u.provider, providersRegistry, modelsRegistry)} alt={u.model} className="w-3 h-3" />
                              <span className="text-xs font-medium">{u.model || '—'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-2 pr-4">{u.app || '—'}</td>
                        <td className="py-2 pr-4">{u.tokens?.toLocaleString?.() || u.tokens || 0}</td>
                        <td className="py-2 pr-4">${(u.cost || 0).toFixed(4)}</td>
                        <td className="py-2 pr-4">{u.tps ? `${u.tps} tps` : '—'}</td>
                        <td className="py-2 pr-4">{u.finish || '—'}</td>
                      </tr>
                    ))}
                    {creditSessions.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-4 text-center text-muted-foreground">No credit-based requests yet</td>
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

// Credit Purchase Cards Component
function CreditPurchaseCards({ onPurchase, purchasing }: { onPurchase: (index: number) => void, purchasing: boolean }) {
  const [packages, setPackages] = useState([])

  useEffect(() => {
    fetch('/api/credits/purchase')
      .then(res => res.json())
      .then(data => setPackages(data.packages || []))
      .catch(console.error)
  }, [])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {packages.map((pkg: any, index) => (
        <Card key={index} className={`relative ${pkg.popular ? 'border-blue-500 shadow-lg' : ''}`}>
          {pkg.popular && (
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-blue-500">Most Popular</Badge>
            </div>
          )}
          <CardHeader className="text-center">
            <CardTitle>${pkg.amount}</CardTitle>
            <CardDescription>{pkg.description}</CardDescription>
            {pkg.bonus > 0 && (
              <Badge variant="secondary" className="mx-auto w-fit">
                +${pkg.bonus} Bonus ({pkg.savings}% savings)
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold">${pkg.totalCredits}</div>
              <p className="text-sm text-muted-foreground">Total Credits</p>
            </div>
            <div className="text-center text-2xl font-bold text-green-600">
              ${(pkg.price / 100).toFixed(2)}
            </div>
            <Button 
              onClick={() => onPurchase(index)} 
              disabled={purchasing}
              className="w-full"
              variant={pkg.popular ? "default" : "outline"}
            >
              {purchasing ? 'Processing...' : 'Purchase Credits'}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Budget Settings Component (simplified for now)
function BudgetSettings({ budgetInfo, onUpdate }: { budgetInfo: BudgetInfo | null, onUpdate: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Budget Settings
        </CardTitle>
        <CardDescription>Configure spending limits and preferences</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Daily Spending */}
          {budgetInfo?.currentSpending.daily && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Daily Spending</label>
                <span className="text-sm text-muted-foreground">
                  ${budgetInfo.currentSpending.daily.amount.toFixed(2)}
                  {budgetInfo.currentSpending.daily.limit && ` / $${budgetInfo.currentSpending.daily.limit.toFixed(2)}`}
                </span>
              </div>
              {budgetInfo.currentSpending.daily.limit && (
                <Progress value={budgetInfo.currentSpending.daily.percentage} className="h-2" />
              )}
            </div>
          )}

          {/* Weekly Spending */}
          {budgetInfo?.currentSpending.weekly && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Weekly Spending</label>
                <span className="text-sm text-muted-foreground">
                  ${budgetInfo.currentSpending.weekly.amount.toFixed(2)}
                  {budgetInfo.currentSpending.weekly.limit && ` / $${budgetInfo.currentSpending.weekly.limit.toFixed(2)}`}
                </span>
              </div>
              {budgetInfo.currentSpending.weekly.limit && (
                <Progress value={budgetInfo.currentSpending.weekly.percentage} className="h-2" />
              )}
            </div>
          )}

          {/* Monthly Spending */}
          {budgetInfo?.currentSpending.monthly && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Monthly Spending</label>
                <span className="text-sm text-muted-foreground">
                  ${budgetInfo.currentSpending.monthly.amount.toFixed(2)}
                  {budgetInfo.currentSpending.monthly.limit && ` / $${budgetInfo.currentSpending.monthly.limit.toFixed(2)}`}
                </span>
              </div>
              {budgetInfo.currentSpending.monthly.limit && (
                <Progress value={budgetInfo.currentSpending.monthly.percentage} className="h-2" />
              )}
            </div>
          )}

          <Button variant="outline" className="w-full">
            Configure Budget Limits
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Analytics Dashboard Component (simplified for now)
function AnalyticsDashboard({
  creditBalance,
  providersRegistry,
  modelsRegistry
}: {
  creditBalance: CreditBalance | null,
  providersRegistry: Array<{ id: string, name: string, logo_url: string, display_name: string }>,
  modelsRegistry: Array<{ id: string, name: string, provider_id: string, actual_provider: string }>
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Usage Summary</CardTitle>
          <CardDescription>Last 30 days</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span>Total Requests</span>
            <span className="font-medium">{creditBalance?.analytics.totalRequests || 0}</span>
          </div>
          <div className="flex justify-between">
            <span>Total Spent</span>
            <span className="font-medium">${creditBalance?.analytics.totalSpent.toFixed(4) || '0.0000'}</span>
          </div>
          <div className="flex justify-between">
            <span>Avg Cost/Request</span>
            <span className="font-medium">${creditBalance?.analytics.avgCostPerRequest.toFixed(4) || '0.0000'}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Models</CardTitle>
          <CardDescription>Most used models</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {creditBalance?.analytics.topModels?.length ? (
              creditBalance.analytics.topModels.map((model: any, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    <img src={getModelLogo(model.model, '', providersRegistry, modelsRegistry)} alt={model.model} className="w-4 h-4" />
                    <span className="font-medium">{model.model}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {model.requests} requests • ${model.cost.toFixed(4)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">No usage data yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
