'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Zap,
  TrendingUp,
  Crown,
  Star,
  Leaf,
  MessageCircle,
  Calendar,
  Activity,
  RefreshCw,
  Gift,
  ArrowRight,
  Terminal,
  Globe,
  Key,
  Database
} from 'lucide-react'
import Link from 'next/link'

interface QuotaData {
  planTier: 'free' | 'plus' | 'pro'
  currentMonth: string
  limits: {
    messages: number | null
    premium: number
    normal: number
    eco: number
  }
  used: {
    messages: number
    premium: number
    normal: number
    eco: number
  }
  remaining: {
    messages: number | null
    bonusMessages: number
    premium: number
    normal: number
    eco: number
  }
  percentages: {
    messages: number
    premium: number
    normal: number
    eco: number
  }
  bonusMessages: number
  tierUsage: {
    premium: { count: number, cost: number }
    normal: { count: number, cost: number }
    eco: { count: number, cost: number }
  }
  sourceUsage: {
    cli: { count: number, cost: number, requests: number }
    web: { count: number, cost: number, requests: number }
    user_key: { count: number, cost: number, requests: number }
    admin_credits: { count: number, cost: number, requests: number }
  }
  updatedAt: string
}

const PLAN_NAMES = {
  free: 'Free Plan',
  plus: 'Plus Plan',
  pro: 'Pro Plan'
}

const TIER_ICONS = {
  premium: Crown,
  normal: Star,
  eco: Leaf
}

const TIER_COLORS = {
  premium: {
    bg: 'from-purple-500 to-pink-600',
    badge: 'bg-purple-100 text-purple-800',
    progress: 'bg-purple-500'
  },
  normal: {
    bg: 'from-blue-500 to-cyan-600',
    badge: 'bg-blue-100 text-blue-800',
    progress: 'bg-blue-500'
  },
  eco: {
    bg: 'from-green-500 to-emerald-600',
    badge: 'bg-green-100 text-green-800',
    progress: 'bg-green-500'
  }
}

export default function CreditsPage() {
  const [quotaData, setQuotaData] = useState<QuotaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchQuotaData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/user/quota')

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/auth/signin'
          return
        }
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      setQuotaData(data)
      setError(null)
    } catch (err: any) {
      console.error('Error fetching quota data:', err)
      setError('Failed to load quota information')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuotaData()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    )
  }

  if (error || !quotaData) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">{error || 'Failed to load quota data'}</p>
            <Button onClick={fetchQuotaData} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentPlan = PLAN_NAMES[quotaData.planTier]
  const nextResetDate = quotaData.currentMonth
    ? new Date(new Date(quotaData.currentMonth).setMonth(new Date(quotaData.currentMonth).getMonth() + 1))
    : new Date()

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Message & Perspective Quotas</h1>
          <p className="text-muted-foreground mt-2">
            Track your usage across Premium, Normal, and Eco perspectives
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-lg px-4 py-2">
            <Calendar className="h-4 w-4 mr-2" />
            {currentPlan}
          </Badge>
          <Button onClick={fetchQuotaData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Plan Overview */}
      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Your Plan</span>
            {quotaData.planTier === 'free' && (
              <Link href="/dashboard/subscription">
                <Button size="sm" className="bg-gradient-to-r from-orange-500 to-amber-500">
                  Upgrade <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            )}
          </CardTitle>
          <CardDescription>Current billing period and usage limits</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Messages this month</p>
              <p className="text-2xl font-bold">
                {quotaData.used.messages}
                {quotaData.limits.messages && ` / ${quotaData.limits.messages}`}
              </p>
              {!quotaData.limits.messages && (
                <Badge variant="secondary">Unlimited</Badge>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Bonus Messages</p>
              <p className="text-2xl font-bold flex items-center">
                <Gift className="h-5 w-5 mr-2 text-green-600" />
                {quotaData.bonusMessages}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Reset Date</p>
              <p className="text-lg font-semibold">{nextResetDate.toLocaleDateString()}</p>
              <p className="text-xs text-muted-foreground">
                {Math.ceil((nextResetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days remaining
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total API Calls</p>
              <p className="text-2xl font-bold">
                {quotaData.tierUsage.premium.count + quotaData.tierUsage.normal.count + quotaData.tierUsage.eco.count}
              </p>
            </div>
          </div>

          {quotaData.limits.messages && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Monthly message usage</span>
                <span className="font-medium">{quotaData.percentages.messages.toFixed(1)}%</span>
              </div>
              <Progress value={quotaData.percentages.messages} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="perspectives" className="space-y-6">
        <TabsList>
          <TabsTrigger value="perspectives">Perspectives</TabsTrigger>
          <TabsTrigger value="usage-breakdown">Usage Breakdown</TabsTrigger>
          <TabsTrigger value="request-sources">Request Sources</TabsTrigger>
          <TabsTrigger value="bonus-credits">Bonus Messages</TabsTrigger>
        </TabsList>

        <TabsContent value="perspectives" className="space-y-4">
          {/* Perspective Tier Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Premium Tier */}
            <Card className="border-2 border-purple-200">
              <CardHeader className={`bg-gradient-to-r ${TIER_COLORS.premium.bg} text-white rounded-t-lg`}>
                <CardTitle className="flex items-center">
                  <Crown className="h-5 w-5 mr-2" />
                  Premium Perspectives
                </CardTitle>
                <CardDescription className="text-purple-100">
                  Highest quality models (GPT-5, Claude Sonnet 4, Gemini Pro)
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Used</span>
                    <span className="text-2xl font-bold">{quotaData.used.premium}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Limit</span>
                    <span className="text-lg">{quotaData.limits.premium}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Remaining</span>
                    <Badge className={TIER_COLORS.premium.badge}>{quotaData.remaining.premium}</Badge>
                  </div>
                </div>
                <Progress value={quotaData.percentages.premium} className="h-2" />
                <div className="text-xs text-muted-foreground">
                  {quotaData.percentages.premium.toFixed(1)}% used
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <p className="text-lg font-semibold">{quotaData.tierUsage.premium.count} API calls</p>
                  <p className="text-xs text-muted-foreground">Est. cost: ${quotaData.tierUsage.premium.cost.toFixed(4)}</p>
                </div>
              </CardContent>
            </Card>

            {/* Normal Tier */}
            <Card className="border-2 border-blue-200">
              <CardHeader className={`bg-gradient-to-r ${TIER_COLORS.normal.bg} text-white rounded-t-lg`}>
                <CardTitle className="flex items-center">
                  <Star className="h-5 w-5 mr-2" />
                  Normal Perspectives
                </CardTitle>
                <CardDescription className="text-blue-100">
                  Balanced performance (GPT-5 Mini, Claude Haiku, Gemini Flash)
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Used</span>
                    <span className="text-2xl font-bold">{quotaData.used.normal}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Limit</span>
                    <span className="text-lg">{quotaData.limits.normal}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Remaining</span>
                    <Badge className={TIER_COLORS.normal.badge}>{quotaData.remaining.normal}</Badge>
                  </div>
                </div>
                <Progress value={quotaData.percentages.normal} className="h-2" />
                <div className="text-xs text-muted-foreground">
                  {quotaData.percentages.normal.toFixed(1)}% used
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <p className="text-lg font-semibold">{quotaData.tierUsage.normal.count} API calls</p>
                  <p className="text-xs text-muted-foreground">Est. cost: ${quotaData.tierUsage.normal.cost.toFixed(4)}</p>
                </div>
              </CardContent>
            </Card>

            {/* Eco Tier */}
            <Card className="border-2 border-green-200">
              <CardHeader className={`bg-gradient-to-r ${TIER_COLORS.eco.bg} text-white rounded-t-lg`}>
                <CardTitle className="flex items-center">
                  <Leaf className="h-5 w-5 mr-2" />
                  Eco Perspectives
                </CardTitle>
                <CardDescription className="text-green-100">
                  Cost-effective models (Llama, Mistral, Phi)
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Used</span>
                    <span className="text-2xl font-bold">{quotaData.used.eco}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Limit</span>
                    <span className="text-lg">{quotaData.limits.eco}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Remaining</span>
                    <Badge className={TIER_COLORS.eco.badge}>{quotaData.remaining.eco}</Badge>
                  </div>
                </div>
                <Progress value={quotaData.percentages.eco} className="h-2" />
                <div className="text-xs text-muted-foreground">
                  {quotaData.percentages.eco.toFixed(1)}% used
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <p className="text-lg font-semibold">{quotaData.tierUsage.eco.count} API calls</p>
                  <p className="text-xs text-muted-foreground">Est. cost: ${quotaData.tierUsage.eco.cost.toFixed(4)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="usage-breakdown" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Usage Summary</CardTitle>
              <CardDescription>Detailed breakdown of your API usage by perspective tier</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Usage Chart */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium flex items-center">
                        <Crown className="h-4 w-4 mr-2 text-purple-600" />
                        Premium
                      </span>
                      <Badge variant="outline">{quotaData.tierUsage.premium.count} calls</Badge>
                    </div>
                    <Progress
                      value={(quotaData.tierUsage.premium.count / Math.max(1, quotaData.tierUsage.premium.count + quotaData.tierUsage.normal.count + quotaData.tierUsage.eco.count)) * 100}
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      ${quotaData.tierUsage.premium.cost.toFixed(4)} estimated cost
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium flex items-center">
                        <Star className="h-4 w-4 mr-2 text-blue-600" />
                        Normal
                      </span>
                      <Badge variant="outline">{quotaData.tierUsage.normal.count} calls</Badge>
                    </div>
                    <Progress
                      value={(quotaData.tierUsage.normal.count / Math.max(1, quotaData.tierUsage.premium.count + quotaData.tierUsage.normal.count + quotaData.tierUsage.eco.count)) * 100}
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      ${quotaData.tierUsage.normal.cost.toFixed(4)} estimated cost
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium flex items-center">
                        <Leaf className="h-4 w-4 mr-2 text-green-600" />
                        Eco
                      </span>
                      <Badge variant="outline">{quotaData.tierUsage.eco.count} calls</Badge>
                    </div>
                    <Progress
                      value={(quotaData.tierUsage.eco.count / Math.max(1, quotaData.tierUsage.premium.count + quotaData.tierUsage.normal.count + quotaData.tierUsage.eco.count)) * 100}
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      ${quotaData.tierUsage.eco.cost.toFixed(4)} estimated cost
                    </p>
                  </div>
                </div>

                {/* Total Cost */}
                <div className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Estimated Cost</p>
                      <p className="text-3xl font-bold">
                        ${(quotaData.tierUsage.premium.cost + quotaData.tierUsage.normal.cost + quotaData.tierUsage.eco.cost).toFixed(4)}
                      </p>
                    </div>
                    <Activity className="h-12 w-12 text-gray-400" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Based on {quotaData.tierUsage.premium.count + quotaData.tierUsage.normal.count + quotaData.tierUsage.eco.count} total API calls this month
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="request-sources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Request Source Breakdown</CardTitle>
              <CardDescription>Track your usage by request source: CLI, Web, API Keys, and Platform Credits</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Source Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* CLI Requests */}
                  <div className="p-4 border rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium flex items-center">
                        <Terminal className="h-4 w-4 mr-2 text-blue-600" />
                        CLI Tools
                      </span>
                      <Badge variant="outline" className="bg-blue-100 text-blue-800">
                        {quotaData.sourceUsage?.cli?.requests || 0} requests
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Perspectives</span>
                        <span className="text-lg font-bold">{quotaData.sourceUsage?.cli?.count || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Est. Cost</span>
                        <span className="text-sm font-semibold">${(quotaData.sourceUsage?.cli?.cost || 0).toFixed(4)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Web Requests */}
                  <div className="p-4 border rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium flex items-center">
                        <Globe className="h-4 w-4 mr-2 text-green-600" />
                        Web Dashboard
                      </span>
                      <Badge variant="outline" className="bg-green-100 text-green-800">
                        {quotaData.sourceUsage?.web?.requests || 0} requests
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Perspectives</span>
                        <span className="text-lg font-bold">{quotaData.sourceUsage?.web?.count || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Est. Cost</span>
                        <span className="text-sm font-semibold">${(quotaData.sourceUsage?.web?.cost || 0).toFixed(4)}</span>
                      </div>
                    </div>
                  </div>

                  {/* User Keys */}
                  <div className="p-4 border rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium flex items-center">
                        <Key className="h-4 w-4 mr-2 text-purple-600" />
                        Your API Keys
                      </span>
                      <Badge variant="outline" className="bg-purple-100 text-purple-800">
                        {quotaData.sourceUsage?.user_key?.requests || 0} requests
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Perspectives</span>
                        <span className="text-lg font-bold">{quotaData.sourceUsage?.user_key?.count || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Est. Cost</span>
                        <span className="text-sm font-semibold">${(quotaData.sourceUsage?.user_key?.cost || 0).toFixed(4)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Admin Credits */}
                  <div className="p-4 border rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium flex items-center">
                        <Database className="h-4 w-4 mr-2 text-amber-600" />
                        Platform Credits
                      </span>
                      <Badge variant="outline" className="bg-amber-100 text-amber-800">
                        {quotaData.sourceUsage?.admin_credits?.requests || 0} requests
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Perspectives</span>
                        <span className="text-lg font-bold">{quotaData.sourceUsage?.admin_credits?.count || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Est. Cost</span>
                        <span className="text-sm font-semibold">${(quotaData.sourceUsage?.admin_credits?.cost || 0).toFixed(4)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Source Distribution */}
                <div className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border">
                  <h3 className="text-lg font-semibold mb-4">Request Distribution</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Total Requests by Source</p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center">
                            <Terminal className="h-3 w-3 mr-2 text-blue-600" />
                            CLI
                          </span>
                          <span className="font-medium">{quotaData.sourceUsage?.cli?.requests || 0}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center">
                            <Globe className="h-3 w-3 mr-2 text-green-600" />
                            Web
                          </span>
                          <span className="font-medium">{quotaData.sourceUsage?.web?.requests || 0}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center">
                            <Key className="h-3 w-3 mr-2 text-purple-600" />
                            User Keys
                          </span>
                          <span className="font-medium">{quotaData.sourceUsage?.user_key?.requests || 0}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center">
                            <Database className="h-3 w-3 mr-2 text-amber-600" />
                            Platform
                          </span>
                          <span className="font-medium">{quotaData.sourceUsage?.admin_credits?.requests || 0}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Total Cost by Source</p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>CLI</span>
                          <span className="font-medium">${(quotaData.sourceUsage?.cli?.cost || 0).toFixed(4)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Web</span>
                          <span className="font-medium">${(quotaData.sourceUsage?.web?.cost || 0).toFixed(4)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>User Keys</span>
                          <span className="font-medium">${(quotaData.sourceUsage?.user_key?.cost || 0).toFixed(4)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Platform</span>
                          <span className="font-medium">${(quotaData.sourceUsage?.admin_credits?.cost || 0).toFixed(4)}</span>
                        </div>
                        <div className="pt-2 border-t flex items-center justify-between font-bold">
                          <span>Total</span>
                          <span>${((quotaData.sourceUsage?.cli?.cost || 0) + (quotaData.sourceUsage?.web?.cost || 0) + (quotaData.sourceUsage?.user_key?.cost || 0) + (quotaData.sourceUsage?.admin_credits?.cost || 0)).toFixed(4)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start">
                      <Terminal className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-sm mb-1">CLI Tools</h4>
                        <p className="text-xs text-muted-foreground">
                          Requests made through CLI tools like Claude Code, Codex CLI, and Gemini CLI using MCP authentication tokens.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start">
                      <Globe className="h-5 w-5 text-green-600 mr-3 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-sm mb-1">Web Dashboard</h4>
                        <p className="text-xs text-muted-foreground">
                          Requests made directly through the web dashboard interface using your browser session.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-start">
                      <Key className="h-5 w-5 text-purple-600 mr-3 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-sm mb-1">Your API Keys</h4>
                        <p className="text-xs text-muted-foreground">
                          Requests using your own configured API keys (OpenAI, Anthropic, Google, etc.) for direct provider access.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start">
                      <Database className="h-5 w-5 text-amber-600 mr-3 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-sm mb-1">Platform Credits</h4>
                        <p className="text-xs text-muted-foreground">
                          Requests fulfilled using platform-provided API keys when your keys are unavailable or not configured.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bonus-credits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Gift className="h-5 w-5 mr-2 text-green-600" />
                Bonus Messages
              </CardTitle>
              <CardDescription>
                Extra messages from promotions and bonuses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Available Bonus Messages</p>
                      <p className="text-4xl font-bold text-green-600">{quotaData.bonusMessages}</p>
                    </div>
                    <Gift className="h-16 w-16 text-green-600 opacity-50" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-4">
                    Bonus messages are used automatically when your regular quota is exhausted
                  </p>
                </div>

                {quotaData.bonusMessages === 0 && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      You don't have any bonus messages currently. Check back later for promotions!
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upgrade CTA for Free Users */}
      {quotaData.planTier === 'free' && (
        <Card className="border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold mb-2">Need more perspectives?</h3>
                <p className="text-muted-foreground">
                  Upgrade to Plus or Pro for higher limits and more API calls
                </p>
              </div>
              <Link href="/dashboard/subscription">
                <Button className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">
                  <Zap className="h-4 w-4 mr-2" />
                  Upgrade Now
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
