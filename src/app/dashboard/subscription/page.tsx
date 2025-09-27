'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  CreditCard,
  Crown,
  MessageSquare,
  Zap,
  Calendar,
  DollarSign,
  Settings,
  CheckCircle,
  X,
  MessageCircle
} from 'lucide-react'

interface Subscription {
  tier: 'free' | 'pro'
  status: 'active' | 'past_due' | 'canceled' | 'trialing'
  current_period_end: string | null
  cancel_at_period_end: boolean
  stripe_customer_id: string | null
}

interface MessageUsage {
  messages_sent: number
  messages_limit: number
  month_year: string
  actual_messages_sent?: number
  breakdown?: {
    chat_messages: number
    mcp_calls: number
  }
}

interface ProfileStats {
  totalChats: number
  totalTokens: number
  favoriteModel: string
  joinedDays: number
  lastActive: string
}

interface Credits {
  balance: number
  promotional_balance: number
  monthly_allocation: number
  total_spent: number
}

// Global cache for subscription data to prevent duplicate fetching
const subscriptionCache = {
  data: null as any,
  timestamp: 0,
  CACHE_DURATION: 2 * 60 * 1000, // 2 minutes for subscription data
}

let activeRequest: Promise<any> | null = null

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [messageUsage, setMessageUsage] = useState<MessageUsage | null>(null)
  const [credits, setCredits] = useState<Credits | null>(null)
  const [profileStats, setProfileStats] = useState<ProfileStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const isMountedRef = useRef(true)

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

    return () => {
      isMountedRef.current = false
    }
  }, [fetchSubscriptionData])

  // Memoized handlers to prevent unnecessary re-renders
  const handleUpgrade = useCallback(async () => {
    setIsUpgrading(true)
    try {
      const response = await fetch('/api/subscription/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
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
    const isActive = subscription?.status === 'active'
    const totalCredits = ((credits?.balance || 0) + (credits?.promotional_balance || 0))
    const currentPeriodEndDate = subscription?.current_period_end
      ? new Date(subscription.current_period_end).toLocaleDateString()
      : null

    return {
      actualMessagesSent,
      messageUsagePercentage,
      isPro,
      isActive,
      totalCredits,
      currentPeriodEndDate
    }
  }, [subscription, messageUsage, credits])

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
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
    isActive,
    totalCredits,
    currentPeriodEndDate
  } = computedValues

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            Subscription
            {isPro && <Crown className="h-6 w-6 text-yellow-500" />}
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your Polydev subscription and usage
          </p>
        </div>
        <Badge variant={isPro ? "default" : "secondary"} className="text-sm">
          {isPro ? 'Pro Plan' : 'Free Plan'}
        </Badge>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
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
      <Card>
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
                    <Crown className="h-5 w-5 text-yellow-500" />
                    Polydev Pro
                  </>
                ) : (
                  'Free Plan'
                )}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isPro
                  ? `$20/month • ${isActive ? 'Active' : subscription?.status}`
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
            {!isPro ? (
              <Button onClick={handleUpgrade} disabled={isUpgrading}>
                {isUpgrading ? 'Upgrading...' : 'Upgrade to Pro'}
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

      {/* Usage Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Message Usage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Message Usage</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {actualMessagesSent}
              {!isPro && ` / ${messageUsage?.messages_limit || 200}`}
            </div>
            <p className="text-xs text-muted-foreground">
              {isPro ? 'Messages sent this month' : 'Messages this month'}
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
            {!isPro && messageUsage && (
              <Progress value={messageUsagePercentage} className="mt-2" />
            )}
          </CardContent>
        </Card>

        {/* Credit Balance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credit Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalCredits.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {isPro ? 'Monthly allocation + purchased' : 'Available credits'}
            </p>
            {credits?.promotional_balance && credits.promotional_balance > 0 && (
              <p className="text-xs text-green-600">
                +${credits.promotional_balance.toFixed(2)} promotional
              </p>
            )}
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

        {/* Monthly Allocation */}
        {isPro && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Credit</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${credits?.monthly_allocation?.toFixed(2) || '5.00'}
              </div>
              <p className="text-xs text-muted-foreground">
                Allocated each month
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Plan Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Free Plan */}
        <Card className={!isPro ? 'border-orange-300 bg-orange-50/30' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Free Plan
              {!isPro && <Badge className="bg-orange-500 text-white">Current</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-2xl font-bold">$0 forever</div>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                1000 free messages to get started
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Query GPT-5, Claude Opus 4, Gemini 2.5 Pro
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Compare responses side-by-side
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Works with Cursor, Claude Code, Continue
              </li>
              <li className="flex items-center gap-2">
                <X className="h-4 w-4 text-red-500" />
                Limited to 3 models
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Pro Plan */}
        <Card className={isPro ? 'border-orange-500 bg-orange-50/30' : 'hover:border-orange-200'}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-orange-500" />
                Pro Plan
              </div>
              {isPro && <Badge className="bg-orange-500 text-white">Current</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-2xl font-bold">$20/month</div>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Unlimited messages
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                340+ models from 37+ providers
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Advanced project memory with encryption
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Priority model access (GPT-5, Claude Opus 4)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Cost optimization routing
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Priority support & team features
              </li>
            </ul>
            {!isPro && (
              <Button
                className="w-full bg-gradient-to-r from-orange-500 to-violet-500 hover:from-orange-600 hover:to-violet-600"
                onClick={handleUpgrade}
                disabled={isUpgrading}
              >
                <Zap className="h-4 w-4 mr-2" />
                {isUpgrading ? 'Processing...' : 'Upgrade to Pro'}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}