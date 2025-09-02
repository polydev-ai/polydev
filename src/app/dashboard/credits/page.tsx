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
import { formatDistanceToNow } from 'date-fns'

interface CreditBalance {
  balance: number
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

export default function CreditsPage() {
  const [creditBalance, setCreditBalance] = useState<CreditBalance | null>(null)
  const [budgetInfo, setBudgetInfo] = useState<BudgetInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(false)

  useEffect(() => {
    fetchCreditData()
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

      const { checkoutUrl } = await response.json()
      window.location.href = checkoutUrl
      
    } catch (error) {
      console.error('Error purchasing credits:', error)
      toast.error('Failed to initiate purchase')
    } finally {
      setPurchasing(false)
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
                              {formatDistanceToNow(new Date(purchase.created_at), { addSuffix: true })}
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
                          <p className="font-medium">{usage.model_id}</p>
                          <p className="text-sm text-muted-foreground">
                            {usage.prompt_tokens + usage.completion_tokens} tokens
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${usage.total_cost.toFixed(4)}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(usage.request_timestamp), { addSuffix: true })}
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
          <AnalyticsDashboard creditBalance={creditBalance} />
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
function AnalyticsDashboard({ creditBalance }: { creditBalance: CreditBalance | null }) {
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
                  <span className="font-medium">{model.model}</span>
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