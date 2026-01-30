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
  Coins,
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
  planTier: 'free' | 'plus' | 'pro' | 'premium'
  currentMonth: string
  limits: {
    messages: number | null
    credits: number
  }
  used: {
    messages: number
    credits: number
  }
  remaining: {
    messages: number | null
    bonusMessages: number
    credits: number
  }
  percentages: {
    messages: number
    credits: number
  }
  bonusMessages: number
  totalRequests: number
  sourceUsage: {
    cli: { count: number, cost: number, requests: number }
    web: { count: number, cost: number, requests: number }
    user_key: { count: number, cost: number, requests: number }
    admin_credits: { count: number, cost: number, requests: number }
  }
  updatedAt: string
}

const PLAN_NAMES: Record<string, string> = {
  free: 'Free Plan',
  premium: 'Premium Plan',
  plus: 'Plus Plan (Legacy)',
  pro: 'Pro Plan (Legacy)'
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
      // Transform legacy data format to new simplified format
      const transformedData: QuotaData = {
        planTier: data.planTier,
        currentMonth: data.currentMonth,
        limits: {
          messages: data.limits?.messages ?? null,
          credits: data.limits?.eco ?? data.limits?.credits ?? 500
        },
        used: {
          messages: data.used?.messages ?? 0,
          credits: (data.tierUsage?.premium?.count ?? 0) + 
                   (data.tierUsage?.normal?.count ?? 0) + 
                   (data.tierUsage?.eco?.count ?? 0) +
                   (data.used?.credits ?? 0)
        },
        remaining: {
          messages: data.remaining?.messages ?? null,
          bonusMessages: data.remaining?.bonusMessages ?? data.bonusMessages ?? 0,
          credits: data.remaining?.eco ?? data.remaining?.credits ?? 0
        },
        percentages: {
          messages: data.percentages?.messages ?? 0,
          credits: data.percentages?.eco ?? data.percentages?.credits ?? 0
        },
        bonusMessages: data.bonusMessages ?? 0,
        totalRequests: (data.tierUsage?.premium?.count ?? 0) + 
                       (data.tierUsage?.normal?.count ?? 0) + 
                       (data.tierUsage?.eco?.count ?? 0),
        sourceUsage: data.sourceUsage ?? {
          cli: { count: 0, cost: 0, requests: 0 },
          web: { count: 0, cost: 0, requests: 0 },
          user_key: { count: 0, cost: 0, requests: 0 },
          admin_credits: { count: 0, cost: 0, requests: 0 }
        },
        updatedAt: data.updatedAt
      }
      setQuotaData(transformedData)
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
          <RefreshCw className="h-8 w-8 animate-spin text-slate-900" />
        </div>
      </div>
    )
  }

  if (error || !quotaData) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-slate-900 font-medium">{error || 'Failed to load quota data'}</p>
            <Button onClick={fetchQuotaData} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentPlan = PLAN_NAMES[quotaData.planTier] || 'Free Plan'
  const nextResetDate = quotaData.currentMonth
    ? new Date(new Date(quotaData.currentMonth).setMonth(new Date(quotaData.currentMonth).getMonth() + 1))
    : new Date()

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Credits & Usage</h1>
          <p className="text-muted-foreground mt-2">
            Track your credit usage across all AI models
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
      <Card className="border border-slate-200 bg-white">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Your Credits</span>
            {quotaData.planTier === 'free' && (
              <Link href="/dashboard/subscription">
                <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-700">
                  Upgrade <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            )}
          </CardTitle>
          <CardDescription>1 credit = 1 AI request (any model)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Credits Used</p>
              <p className="text-2xl font-bold">
                {quotaData.used.credits}
              </p>
              <p className="text-xs text-muted-foreground">this billing period</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Credits Remaining</p>
              <p className="text-2xl font-bold text-green-600">
                {quotaData.remaining.credits}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Bonus Credits</p>
              <p className="text-2xl font-bold flex items-center">
                <Gift className="h-5 w-5 mr-2 text-slate-900" />
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
          </div>

          {quotaData.limits.credits > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Credit usage</span>
                <span className="font-medium">{quotaData.percentages.credits.toFixed(1)}%</span>
              </div>
              <Progress value={quotaData.percentages.credits} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Models */}
      <Card className="border border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="h-5 w-5 mr-2" />
            Available Models
          </CardTitle>
          <CardDescription>
            All models cost 1 credit per request
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg bg-slate-50">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">GLM-4.7</span>
                <Badge variant="outline">1 credit</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Zhipu AI</p>
            </div>
            <div className="p-4 border rounded-lg bg-slate-50">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">Gemini 3 Flash</span>
                <Badge variant="outline">1 credit</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Google</p>
            </div>
            <div className="p-4 border rounded-lg bg-slate-50">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">Grok 4.1 Fast</span>
                <Badge variant="outline">1 credit</Badge>
              </div>
              <p className="text-xs text-muted-foreground">xAI</p>
            </div>
            <div className="p-4 border rounded-lg bg-slate-50">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">GPT-5 Mini</span>
                <Badge variant="outline">1 credit</Badge>
              </div>
              <p className="text-xs text-muted-foreground">OpenAI</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="usage" className="space-y-6">
        <TabsList>
          <TabsTrigger value="usage">Usage Summary</TabsTrigger>
          <TabsTrigger value="request-sources">Request Sources</TabsTrigger>
          <TabsTrigger value="bonus-credits">Bonus Credits</TabsTrigger>
        </TabsList>

        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Usage Summary</CardTitle>
              <CardDescription>Overview of your API usage this billing period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Usage Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium flex items-center">
                        <Coins className="h-4 w-4 mr-2 text-slate-900" />
                        Total Credits Used
                      </span>
                    </div>
                    <p className="text-3xl font-bold">{quotaData.used.credits}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      = {quotaData.used.credits} API requests
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium flex items-center">
                        <MessageCircle className="h-4 w-4 mr-2 text-slate-900" />
                        Messages Sent
                      </span>
                    </div>
                    <p className="text-3xl font-bold">{quotaData.used.messages}</p>
                    {quotaData.limits.messages && (
                      <p className="text-xs text-muted-foreground mt-1">
                        of {quotaData.limits.messages} limit
                      </p>
                    )}
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium flex items-center">
                        <Activity className="h-4 w-4 mr-2 text-slate-900" />
                        Total Requests
                      </span>
                    </div>
                    <p className="text-3xl font-bold">{quotaData.totalRequests}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      API calls this month
                    </p>
                  </div>
                </div>

                {/* Info Box */}
                <div className="p-6 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-start gap-4">
                    <Zap className="h-6 w-6 text-slate-900 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold mb-1">Simple Credit System</h4>
                      <p className="text-sm text-muted-foreground">
                        Every AI request costs exactly <strong>1 credit</strong>, regardless of which model you use. 
                        This makes it easy to track and budget your usage.
                      </p>
                    </div>
                  </div>
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
                  <div className="p-4 border rounded-lg bg-white border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium flex items-center">
                        <Terminal className="h-4 w-4 mr-2 text-slate-900" />
                        CLI Tools
                      </span>
                      <Badge variant="outline" className="bg-slate-100 text-slate-900">
                        {quotaData.sourceUsage?.cli?.requests || 0} requests
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Credits Used</span>
                        <span className="text-lg font-bold">{quotaData.sourceUsage?.cli?.count || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Web Requests */}
                  <div className="p-4 border rounded-lg bg-white border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium flex items-center">
                        <Globe className="h-4 w-4 mr-2 text-slate-900" />
                        Web Dashboard
                      </span>
                      <Badge variant="outline" className="bg-slate-100 text-slate-900">
                        {quotaData.sourceUsage?.web?.requests || 0} requests
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Credits Used</span>
                        <span className="text-lg font-bold">{quotaData.sourceUsage?.web?.count || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* User Keys */}
                  <div className="p-4 border rounded-lg bg-white border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium flex items-center">
                        <Key className="h-4 w-4 mr-2 text-slate-900" />
                        Your API Keys
                      </span>
                      <Badge variant="outline" className="bg-slate-100 text-slate-900">
                        {quotaData.sourceUsage?.user_key?.requests || 0} requests
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Credits Used</span>
                        <span className="text-lg font-bold">{quotaData.sourceUsage?.user_key?.count || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Admin Credits */}
                  <div className="p-4 border rounded-lg bg-white border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium flex items-center">
                        <Database className="h-4 w-4 mr-2 text-slate-900" />
                        Platform Credits
                      </span>
                      <Badge variant="outline" className="bg-slate-100 text-slate-900">
                        {quotaData.sourceUsage?.admin_credits?.requests || 0} requests
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Credits Used</span>
                        <span className="text-lg font-bold">{quotaData.sourceUsage?.admin_credits?.count || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-white border border-slate-200 rounded-lg">
                    <div className="flex items-start">
                      <Terminal className="h-5 w-5 text-slate-900 mr-3 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-sm mb-1">CLI Tools</h4>
                        <p className="text-xs text-muted-foreground">
                          Requests made through CLI tools like Claude Code, Codex CLI, and Gemini CLI using MCP authentication tokens.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-white border border-slate-200 rounded-lg">
                    <div className="flex items-start">
                      <Globe className="h-5 w-5 text-slate-900 mr-3 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-sm mb-1">Web Dashboard</h4>
                        <p className="text-xs text-muted-foreground">
                          Requests made directly through the web dashboard interface using your browser session.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-white border border-slate-200 rounded-lg">
                    <div className="flex items-start">
                      <Key className="h-5 w-5 text-slate-900 mr-3 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-sm mb-1">Your API Keys</h4>
                        <p className="text-xs text-muted-foreground">
                          Requests using your own configured API keys (OpenAI, Anthropic, Google, etc.) for direct provider access.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-white border border-slate-200 rounded-lg">
                    <div className="flex items-start">
                      <Database className="h-5 w-5 text-slate-900 mr-3 mt-0.5" />
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
                <Gift className="h-5 w-5 mr-2 text-slate-900" />
                Bonus Credits
              </CardTitle>
              <CardDescription>
                Extra credits from promotions and referrals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-6 bg-white rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Available Bonus Credits</p>
                      <p className="text-4xl font-bold text-slate-900">{quotaData.bonusMessages}</p>
                    </div>
                    <Gift className="h-16 w-16 text-slate-200 opacity-50" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-4">
                    Bonus credits are used automatically when your regular credits are exhausted
                  </p>
                </div>

                {quotaData.bonusMessages === 0 && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                    <p className="text-sm text-slate-900">
                      You don't have any bonus credits currently. Refer friends to earn more!
                    </p>
                    <Link href="/dashboard/referrals">
                      <Button variant="outline" size="sm" className="mt-3">
                        View Referral Program
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upgrade CTA for Free Users */}
      {quotaData.planTier === 'free' && (
        <Card className="border border-slate-200 bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold mb-2">Need more credits?</h3>
                <p className="text-muted-foreground">
                  Upgrade to Premium for 10,000 credits/month + unlimited messages
                </p>
              </div>
              <Link href="/dashboard/subscription">
                <Button className="bg-slate-900 text-white hover:bg-slate-700">
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
