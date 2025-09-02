'use client'

import React, { useState, useEffect } from 'react'
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
  X
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
}

interface Credits {
  balance: number
  promotional_balance: number
  monthly_allocation: number
  total_spent: number
}

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [messageUsage, setMessageUsage] = useState<MessageUsage | null>(null)
  const [credits, setCredits] = useState<Credits | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    fetchSubscriptionData()
  }, [])

  const fetchSubscriptionData = async () => {
    try {
      const response = await fetch('/api/subscription')
      if (response.ok) {
        const data = await response.json()
        setSubscription(data.subscription)
        setMessageUsage(data.messageUsage)
        setCredits(data.credits)
      } else {
        setMessage({ type: 'error', text: 'Failed to load subscription data' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load subscription data' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpgrade = async () => {
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
  }

  const openBillingPortal = async () => {
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
        setMessage({ type: 'error', text: error.error || 'Failed to open billing portal' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to open billing portal' })
    }
  }

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

  const messageUsagePercentage = messageUsage 
    ? Math.min((messageUsage.messages_sent / messageUsage.messages_limit) * 100, 100)
    : 0

  const isPro = subscription?.tier === 'pro'
  const isActive = subscription?.status === 'active'

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
            onClick={() => setMessage(null)}
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
            {subscription?.current_period_end && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">
                  {subscription.cancel_at_period_end ? 'Cancels on' : 'Renews on'}
                </p>
                <p className="text-sm font-medium">
                  {new Date(subscription.current_period_end).toLocaleDateString()}
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
              {messageUsage?.messages_sent || 0}
              {!isPro && ` / ${messageUsage?.messages_limit || 50}`}
            </div>
            <p className="text-xs text-muted-foreground">
              {isPro ? 'Unlimited messages' : 'Messages this month'}
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
              ${credits?.balance?.toFixed(2) || '0.00'}
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Free Plan
              <Badge variant="secondary">Current</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-2xl font-bold">$0/month</div>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                50 messages per month
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                100 bonus messages per referral
              </li>
              <li className="flex items-center gap-2">
                <X className="h-4 w-4 text-red-500" />
                No CLI access
              </li>
              <li className="flex items-center gap-2">
                <X className="h-4 w-4 text-red-500" />
                No monthly credits
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Pro Plan */}
        <Card className={isPro ? 'border-blue-500' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                Pro Plan
              </div>
              {isPro && <Badge>Current</Badge>}
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
                CLI model access
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                $5 monthly credits
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Priority support
              </li>
            </ul>
            {!isPro && (
              <Button className="w-full" onClick={handleUpgrade} disabled={isUpgrading}>
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