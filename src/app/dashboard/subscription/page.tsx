'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  CreditCard,
  MessageSquare,
  Calendar,
  DollarSign,
  Settings,
  CheckCircle,
  X,
  MessageCircle,
  Coins,
  Gift,
  TrendingUp,
  Zap,
  BarChart3,
  Activity,
  Clock
} from 'lucide-react'

interface Subscription {
  tier: 'free' | 'plus' | 'pro'
  status: 'active' | 'past_due' | 'canceled' | 'trialing'
  current_period_end: string | null
  cancel_at_period_end: boolean
  stripe_customer_id: string | null
}

interface MessageUsage {
  messages_sent: number
  messages_limit: number
  messages_remaining?: number
  month_year: string
  actual_messages_sent?: number
  breakdown?: {
    chat_messages: number
    mcp_calls: number
  }
  allTime?: {
    total_messages: number
    chat_messages: number
    mcp_calls: number
  }
}

interface Credits {
  balance: number
  promotional_balance: number
  total_available: number
  monthly_allocation: number
  total_spent: number
  total_purchased: number
}

interface ProfileStats {
  totalChats: number
  totalTokens: number
  favoriteModel: string
  joinedDays: number
  lastActive: string
}

interface CreditsAnalytics {
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

// Global cache for subscription data to prevent duplicate fetching
const subscriptionCache = {
  data: null as any,
  timestamp: 0,
  CACHE_DURATION: 2 * 60 * 1000, // 2 minutes for subscription data
}

let activeRequest: Promise<any> | null = null

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
}

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [messageUsage, setMessageUsage] = useState<MessageUsage | null>(null)
  const [credits, setCredits] = useState<Credits | null>(null)
  const [profileStats, setProfileStats] = useState<ProfileStats | null>(null)
  const [creditsAnalytics, setCreditsAnalytics] = useState<CreditsAnalytics | null>(null)
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<'7d' | '30d' | '90d'>('30d')
  const [isLoading, setIsLoading] = useState(true)
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const isMountedRef = useRef(true)

  // Fetch credits analytics data
  const fetchCreditsAnalytics = useCallback(async (timeframe: string) => {
    try {
      const response = await fetch(`/api/usage/credits?timeframe=${timeframe}`)
      if (response.ok) {
        const data = await response.json()
        if (isMountedRef.current) {
          setCreditsAnalytics(data)
        }
      }
    } catch (error) {
      console.error('Failed to fetch credits analytics:', error)
    }
  }, [])

  // Fetch with caching and deduplication
  const fetchSubscriptionData = useCallback(async () => {
    const now = Date.now()

    // Check cache first
    if (subscriptionCache.data &&
        (now - subscriptionCache.timestamp) < subscriptionCache.CACHE_DURATION) {
      const cachedData = subscriptionCache.data
      setSubscription(cachedData.subscription)
      setMessageUsage(cachedData.messageUsage)
      setCredits(cachedData.credits)
      setProfileStats(cachedData.profileStats)
      setIsLoading(false)
      return
    }

    // Prevent duplicate requests
    if (activeRequest) {
      try {
        await activeRequest
      } catch (err) {
        // Handle silently, data will be set from cache or error state
      }
      return
    }

    activeRequest = (async () => {
      try {
        // Batch all requests for better performance
        const [subscriptionResponse, profileStatsResponse] = await Promise.all([
          fetch('/api/subscription'),
          fetch('/api/profile/stats')
        ])

        const results = {
          subscription: null,
          messageUsage: null,
          credits: null,
          profileStats: null
        }

        if (subscriptionResponse.ok) {
          const subscriptionData = await subscriptionResponse.json()
          results.subscription = subscriptionData.subscription
          results.messageUsage = subscriptionData.messageUsage
          results.credits = subscriptionData.credits
        } else {
          setMessage({ type: 'error', text: 'Failed to load subscription data' })
        }

        if (profileStatsResponse.ok) {
          const profileData = await profileStatsResponse.json()
          results.profileStats = profileData
        }

        // Update cache
        subscriptionCache.data = results
        subscriptionCache.timestamp = now

        if (isMountedRef.current) {
          setSubscription(results.subscription)
          setMessageUsage(results.messageUsage)
          setCredits(results.credits)
          setProfileStats(results.profileStats)
        }

      } catch (error) {
        console.error('Failed to fetch subscription data:', error)
        if (isMountedRef.current) {
          setMessage({ type: 'error', text: 'Failed to load subscription data' })
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false)
        }
        activeRequest = null
      }
    })()

    return activeRequest
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    fetchSubscriptionData()
    fetchCreditsAnalytics(analyticsTimeframe)

    return () => {
      isMountedRef.current = false
    }
  }, [fetchSubscriptionData, fetchCreditsAnalytics, analyticsTimeframe])

  // Handle timeframe change
  const handleTimeframeChange = useCallback((timeframe: '7d' | '30d' | '90d') => {
    setAnalyticsTimeframe(timeframe)
  }, [])

  // Memoized handlers to prevent unnecessary re-renders
  const handleUpgrade = useCallback(async (tier: 'plus' | 'pro' = 'plus', interval: 'month' | 'year' = 'month') => {
    setIsUpgrading(true)
    try {
      const response = await fetch('/api/subscription/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, interval })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl
        }
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Failed to start upgrade' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to start upgrade process' })
    } finally {
      setIsUpgrading(false)
    }
  }, [])

  const openBillingPortal = useCallback(async () => {
    try {
      const response = await fetch('/api/subscription/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.portalUrl) {
          window.open(data.portalUrl, '_blank')
        }
      } else {
        const error = await response.json()
        if (error.action === 'upgrade_required') {
          setMessage({ type: 'error', text: error.details || 'Please upgrade to Pro to access billing management.' })
        } else {
          setMessage({ type: 'error', text: error.error || 'Failed to open billing portal' })
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to open billing portal' })
    }
  }, [])

  const dismissMessage = useCallback(() => {
    setMessage(null)
  }, [])

  // Memoized computed values to prevent unnecessary recalculations
  const computedValues = useMemo(() => {
    const actualMessagesSent = messageUsage?.actual_messages_sent ?? messageUsage?.messages_sent ?? 0
    const messageUsagePercentage = messageUsage
      ? Math.min((actualMessagesSent / messageUsage.messages_limit) * 100, 100)
      : 0
    const isPro = subscription?.tier === 'pro'
    const isPlus = subscription?.tier === 'plus'
    const isFree = !isPro && !isPlus
    const isActive = subscription?.status === 'active'
    const currentPeriodEndDate = subscription?.current_period_end
      ? new Date(subscription.current_period_end).toLocaleDateString()
      : null

    return {
      actualMessagesSent,
      messageUsagePercentage,
      isPro,
      isPlus,
      isFree,
      isActive,
      currentPeriodEndDate
    }
  }, [subscription, messageUsage])

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const {
    actualMessagesSent,
    messageUsagePercentage,
    isPro,
    isPlus,
    isFree,
    isActive,
    currentPeriodEndDate
  } = computedValues

  return (
    <div
      className="container mx-auto p-6 space-y-6"
      
      
      
    >
      <div className="flex items-center justify-between" >
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            Subscription
            {isPro && <Badge variant="default" className="ml-2 bg-slate-900 text-white">Pro</Badge>}
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your Polydev subscription and usage
          </p>
        </div>
        <Badge variant={(isPro || isPlus) ? "default" : "secondary"} className="text-sm">
          {isPro ? 'Pro Plan' : isPlus ? 'Plus Plan' : 'Free Plan'}
        </Badge>
      </div>

      {/* Message Display */}
      {message && (
        <div className="p-4 rounded-lg bg-slate-100 text-slate-900 border border-slate-200 font-medium">
          {message.text}
          <button
            onClick={dismissMessage}
            className="ml-2 text-sm underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Current Plan Status */}
      <div >
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                {isPro ? (
                  <>
                    <Badge variant="default" className="bg-slate-900 text-white">Pro</Badge>
                    Polydev Pro
                  </>
                ) : isPlus ? (
                  <>
                    <Badge variant="default" className="bg-slate-900 text-white">Plus</Badge>
                    Polydev Plus
                  </>
                ) : (
                  'Free Plan'
                )}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isPro
                  ? `$50/month • ${isActive ? 'Active' : subscription?.status}`
                  : isPlus
                  ? `$25/month • ${isActive ? 'Active' : subscription?.status}`
                  : 'Limited features'
                }
              </p>
            </div>
            {currentPeriodEndDate && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">
                  {subscription?.cancel_at_period_end ? 'Cancels on' : 'Renews on'}
                </p>
                <p className="text-sm font-medium">
                  {currentPeriodEndDate}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {isFree ? (
              <Button onClick={() => handleUpgrade('plus', 'month')} disabled={isUpgrading}>
                {isUpgrading ? 'Upgrading...' : 'Upgrade to Plus'}
              </Button>
            ) : (
              <Button variant="outline" onClick={openBillingPortal}>
                <Settings className="h-4 w-4 mr-2" />
                Manage Billing
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Usage Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" >
        {/* Message Usage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Message Usage</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {actualMessagesSent} / {messageUsage?.messages_limit || 200}
            </div>
            <p className="text-xs text-muted-foreground">
              {messageUsage?.messages_remaining !== undefined && messageUsage.messages_remaining > 0 ? (
                <span className="text-green-600 font-medium">{messageUsage.messages_remaining} remaining</span>
              ) : (
                <span className="text-amber-600 font-medium">Limit reached</span>
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Includes web chat + MCP client calls
              {messageUsage?.breakdown && (
                <>
                  <br />
                  ({messageUsage.breakdown.chat_messages} chat, {messageUsage.breakdown.mcp_calls} MCP)
                </>
              )}
            </p>
            {messageUsage && (
              <Progress value={messageUsagePercentage} className="mt-2" />
            )}
          </CardContent>
        </Card>

        {/* Credits Balance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits Balance</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {credits?.total_available?.toFixed(0) || '0'} <span className="text-sm font-normal text-muted-foreground">credits</span>
            </div>
            <div className="space-y-1 mt-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Purchased credits</span>
                <span className="font-medium">{credits?.balance?.toFixed(0) || '0'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Gift className="h-3 w-3" /> Bonus credits
                </span>
                <span className="font-medium text-green-600">{credits?.promotional_balance?.toFixed(0) || '0'}</span>
              </div>
              <div className="flex justify-between text-xs pt-1 border-t">
                <span className="text-muted-foreground">Credits spent</span>
                <span className="font-medium">{credits?.total_spent?.toFixed(0) || '0'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chat Sessions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chat Sessions</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {messageUsage?.breakdown?.chat_messages || profileStats?.totalChats || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Web chat sessions only
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Credits Analytics Section */}
      {creditsAnalytics && (
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Credits Analytics
              </CardTitle>
              <div className="flex gap-1">
                {(['7d', '30d', '90d'] as const).map((tf) => (
                  <Button
                    key={tf}
                    variant={analyticsTimeframe === tf ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleTimeframeChange(tf)}
                    className="text-xs px-2 py-1 h-7"
                  >
                    {tf === '7d' ? '7 Days' : tf === '30d' ? '30 Days' : '90 Days'}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">Total Credits Used</p>
                <p className="text-2xl font-bold text-slate-900">
                  {creditsAnalytics.period.totalCreditsUsed.toLocaleString()}
                </p>
                <p className="text-xs text-slate-400">in selected period</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">Total Requests</p>
                <p className="text-2xl font-bold text-blue-600">
                  {creditsAnalytics.period.totalRequests.toLocaleString()}
                </p>
                <p className="text-xs text-slate-400">API calls made</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">Avg Credits/Request</p>
                <p className="text-2xl font-bold text-green-600">
                  {creditsAnalytics.period.totalRequests > 0 
                    ? (creditsAnalytics.period.totalCreditsUsed / creditsAnalytics.period.totalRequests).toFixed(1)
                    : '0'}
                </p>
                <p className="text-xs text-slate-400">efficiency metric</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">Available Balance</p>
                <p className="text-2xl font-bold text-amber-600">
                  {Math.round(creditsAnalytics.balance.total).toLocaleString()}
                </p>
                <p className="text-xs text-slate-400">credits remaining</p>
              </div>
            </div>

            {/* Tier Breakdown */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Usage by Model Tier
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {creditsAnalytics.tierBreakdown.premium.credits > 0 && (
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-amber-700">Premium</span>
                    <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-700 border-amber-200">
                      {creditsAnalytics.tierCosts.premium} credits/req
                    </Badge>
                  </div>
                  <p className="text-xl font-bold text-amber-900">{creditsAnalytics.tierBreakdown.premium.requests}</p>
                  <p className="text-xs text-amber-600">requests</p>
                  <p className="text-sm font-medium text-amber-700 mt-1">
                    {creditsAnalytics.tierBreakdown.premium.credits} credits
                  </p>
                </div>
                )}
                {creditsAnalytics.tierBreakdown.normal.credits > 0 && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-blue-700">Normal</span>
                    <Badge variant="outline" className="text-[10px] bg-blue-100 text-blue-700 border-blue-200">
                      {creditsAnalytics.tierCosts.normal} credits/req
                    </Badge>
                  </div>
                  <p className="text-xl font-bold text-blue-900">{creditsAnalytics.tierBreakdown.normal.requests}</p>
                  <p className="text-xs text-blue-600">requests</p>
                  <p className="text-sm font-medium text-blue-700 mt-1">
                    {creditsAnalytics.tierBreakdown.normal.credits} credits
                  </p>
                </div>
                )}
                {creditsAnalytics.tierBreakdown.eco.credits > 0 && (
                <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-green-700">Credits Tier</span>
                    <Badge variant="outline" className="text-[10px] bg-green-100 text-green-700 border-green-200">
                      {creditsAnalytics.tierCosts.eco} credit/req
                    </Badge>
                  </div>
                  <p className="text-xl font-bold text-green-900">{creditsAnalytics.tierBreakdown.eco.requests}</p>
                  <p className="text-xs text-green-600">requests</p>
                  <p className="text-sm font-medium text-green-700 mt-1">
                    {creditsAnalytics.tierBreakdown.eco.credits} credits
                  </p>
                </div>
                )}
              </div>
              {creditsAnalytics.tierBreakdown.premium.credits === 0 && 
               creditsAnalytics.tierBreakdown.normal.credits === 0 && 
               creditsAnalytics.tierBreakdown.eco.credits === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  No credits used in this period
                </div>
              )}
            </div>

            {/* Model Breakdown */}
            {creditsAnalytics.modelBreakdown.filter(m => m.credits > 0).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Top Models by Credits Used
                </h4>
                <div className="space-y-2">
                  {creditsAnalytics.modelBreakdown
                    .filter(model => model.credits > 0)
                    .slice(0, 5)
                    .map((model, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-slate-500 w-5">{idx + 1}.</span>
                        <div>
                          <p className="text-sm font-medium text-slate-900 truncate max-w-[200px]" title={model.model}>
                            {model.model}
                          </p>
                          <Badge variant="outline" className={`text-[10px] ${
                            model.tier === 'premium' ? 'bg-amber-50 text-amber-700' :
                            model.tier === 'eco' ? 'bg-green-50 text-green-700' :
                            'bg-blue-50 text-blue-700'
                          }`}>
                            {model.tier === 'eco' ? 'credits' : model.tier}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">{model.credits} credits</p>
                        <p className="text-xs text-slate-500">{model.requests} requests</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Source Breakdown */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Usage by Source
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(creditsAnalytics.sourceBreakdown)
                  .filter(([_, data]) => data.credits > 0 || data.requests > 0)
                  .map(([source, data]) => (
                  <div key={source} className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-500 capitalize mb-1">
                      {source === 'admin_key' ? 'Platform' : 
                       source === 'admin_credits' ? 'Credits' :
                       source === 'user_key' ? 'Your API Key' : 
                       source === 'user_cli' ? 'CLI' : source}
                    </p>
                    <p className="text-lg font-bold text-slate-900">{data.credits}</p>
                    <p className="text-[10px] text-slate-400">{data.requests} requests</p>
                  </div>
                ))}
              </div>
              {Object.entries(creditsAnalytics.sourceBreakdown).every(([_, data]) => data.credits === 0 && data.requests === 0) && (
                <div className="text-center py-4 text-muted-foreground">
                  No usage data for this period
                </div>
              )}
            </div>

            {/* Recent Transactions */}
            {creditsAnalytics.recentTransactions.filter(tx => tx.credits > 0).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Recent Transactions
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">Time</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">Model</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">Tier</th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-slate-500">Credits</th>
                      </tr>
                    </thead>
                    <tbody>
                      {creditsAnalytics.recentTransactions
                        .filter(tx => tx.credits > 0)
                        .slice(0, 10)
                        .map((tx, idx) => (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-2 px-3 text-xs text-slate-500">
                            {new Date(tx.date).toLocaleDateString()} {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-2 px-3 text-xs font-medium text-slate-900 truncate max-w-[150px]" title={tx.model}>
                            {tx.model}
                          </td>
                          <td className="py-2 px-3">
                            <Badge variant="outline" className={`text-[10px] ${
                              tx.tier === 'premium' ? 'bg-amber-50 text-amber-700' :
                              tx.tier === 'eco' ? 'bg-green-50 text-green-700' :
                              'bg-blue-50 text-blue-700'
                            }`}>
                              {tx.tier === 'eco' ? 'credits' : tx.tier}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 text-right text-xs font-medium text-slate-900">-{tx.credits}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Plan Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Free Plan */}
        <Card className={isFree ? 'border-slate-300 bg-slate-50/30' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Free Plan
              {isFree && <Badge className="bg-slate-500 text-white">Current</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-2xl font-bold">$0 forever</div>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-slate-900" />
                100 messages/month
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-slate-900" />
                500 credits to start
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-slate-900" />
                All AI models access
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-slate-900" />
                MCP integration
              </li>
              <li className="flex items-center gap-2">
                <X className="h-4 w-4 text-slate-400" />
                Credits don't rollover
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Plus Plan */}
        <Card className={isPlus ? 'border-slate-200 bg-white' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                Plus Plan
              </div>
              {isPlus && <Badge className="bg-slate-900 text-white">Current</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-2xl font-bold">$25/month</div>
            </div>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-slate-900" />
                20,000 credits/month
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-slate-900" />
                Credits rollover (while subscribed)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-slate-900" />
                All AI models access
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-slate-900" />
                BYOK (use your own API keys)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-slate-900" />
                Priority support
              </li>
            </ul>
            {!isPlus && !isPro && (
              <Button
                className="w-full bg-slate-900 text-white hover:bg-slate-700"
                onClick={() => handleUpgrade('plus', 'month')}
                disabled={isUpgrading}
              >
                {isUpgrading ? 'Processing...' : 'Upgrade to Plus - $25/mo'}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Pro Plan */}
        <Card className={isPro ? 'border-2 border-slate-900 bg-white' : 'border-2 border-slate-900'}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                Pro Plan
              </div>
              {isPro && <Badge className="bg-slate-900 text-white">Current</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-2xl font-bold">$50/month</div>
            </div>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-slate-900" />
                50,000 credits/month
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-slate-900" />
                Credits rollover (while subscribed)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-slate-900" />
                All AI models access
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-slate-900" />
                BYOK (use your own API keys)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-slate-900" />
                Priority support
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-slate-900" />
                Advanced analytics
              </li>
            </ul>
            {!isPro && (
              <Button
                className="w-full bg-slate-900 text-white hover:bg-slate-700"
                onClick={() => handleUpgrade('pro', 'month')}
                disabled={isUpgrading}
              >
                {isUpgrading ? 'Processing...' : 'Upgrade to Pro - $50/mo'}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}