'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Crown,
  CreditCard,
  MessageSquare,
  Terminal,
  Calendar,
  DollarSign,
  Check,
  X,
  Sparkles,
  Users,
  Gift
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface SubscriptionData {
  subscription: {
    id: string
    plan_type: 'free' | 'pro'
    status: string
    current_period_start: string | null
    current_period_end: string | null
    cancel_at_period_end: boolean
  } | null
  messageUsage: {
    messages_sent: number
    messages_limit: number
    cli_usage_allowed: boolean
  }
  credits: {
    balance: number
    promotional_balance: number
    monthly_allocation: number
    total_spent: number
  }
  referralStats: {
    totalReferrals: number
    completedReferrals: number
    totalBonusMessages: number
  }
}

export default function SubscriptionPage() {
  const [data, setData] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchSubscriptionData()
  }, [])

  const fetchSubscriptionData = async () => {
    try {
      const [subRes, referralRes] = await Promise.all([
        fetch('/api/subscription'),
        fetch('/api/referrals')
      ])

      if (subRes.ok && referralRes.ok) {
        const subData = await subRes.json()
        const refData = await referralRes.json()
        
        setData({
          ...subData,
          referralStats: {
            totalReferrals: refData.totalReferrals,
            completedReferrals: refData.completedReferrals,
            totalBonusMessages: refData.totalBonusMessages
          }
        })
      }
    } catch (error) {
      console.error('Failed to fetch subscription data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async () => {
    setUpgrading(true)
    try {
      const response = await fetch('/api/subscription/upgrade', {
        method: 'POST'
      })

      if (response.ok) {
        const { checkoutUrl } = await response.json()
        window.location.href = checkoutUrl
      } else {
        const error = await response.json()
        toast({
          title: 'Error',
          description: error.error || 'Failed to create checkout session',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to upgrade subscription',
        variant: 'destructive'
      })
    } finally {
      setUpgrading(false)
    }
  }

  const handleManageSubscription = async () => {
    try {
      const response = await fetch('/api/subscription/portal', {
        method: 'POST'
      })

      if (response.ok) {
        const { portalUrl } = await response.json()
        window.location.href = portalUrl
      } else {
        toast({
          title: 'Error',
          description: 'Failed to open customer portal',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to manage subscription',
        variant: 'destructive'
      })
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  const isPro = data?.subscription?.plan_type === 'pro'
  const isActive = data?.subscription?.status === 'active'
  const messageUsagePercent = data?.messageUsage ? 
    (data.messageUsage.messages_sent / data.messageUsage.messages_limit) * 100 : 0
  const totalCredits = (data?.credits.balance || 0) + (data?.credits.promotional_balance || 0)

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Subscription & Usage</h1>
        <p className="text-gray-600">
          Manage your subscription and track your usage across all Polydev services
        </p>
      </div>

      {/* Current Plan Card */}
      <Card className={`mb-8 ${isPro && isActive ? 'border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50' : ''}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {isPro ? (
                <>
                  <Crown className="h-6 w-6 text-yellow-600" />
                  Polydev Pro
                </>
              ) : (
                <>
                  <Sparkles className="h-6 w-6 text-gray-600" />
                  Free Plan
                </>
              )}
            </CardTitle>
            <Badge 
              variant={isPro && isActive ? "default" : "secondary"}
              className={isPro && isActive ? "bg-yellow-600" : ""}
            >
              {isPro ? (isActive ? 'Active' : data?.subscription?.status) : 'Free'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Messages */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Messages</span>
              </div>
              {isPro ? (
                <div className="text-2xl font-bold text-green-600">Unlimited</div>
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {data?.messageUsage.messages_sent} / {data?.messageUsage.messages_limit}
                  </div>
                  <Progress value={messageUsagePercent} className="mt-2" />
                  {data?.referralStats.totalBonusMessages > 0 && (
                    <div className="text-xs text-gray-600 mt-1">
                      +{data.referralStats.totalBonusMessages} from referrals
                    </div>
                  )}
                </>
              )}
            </div>

            {/* CLI Access */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Terminal className="h-4 w-4 text-purple-600" />
                <span className="font-medium">CLI Access</span>
              </div>
              <div className={`text-2xl font-bold flex items-center gap-2 ${isPro ? 'text-green-600' : 'text-gray-400'}`}>
                {isPro ? (
                  <>
                    <Check className="h-6 w-6" />
                    Available
                  </>
                ) : (
                  <>
                    <X className="h-6 w-6" />
                    Pro Only
                  </>
                )}
              </div>
            </div>

            {/* Credits */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="font-medium">Credits</span>
              </div>
              <div className="text-2xl font-bold">
                ${totalCredits.toFixed(3)}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {isPro && (
                  <div>+${data?.credits.monthly_allocation || 0} monthly</div>
                )}
                <div>Lifetime spent: ${data?.credits.total_spent.toFixed(3) || '0.000'}</div>
              </div>
            </div>
          </div>

          {/* Pro Features Comparison */}
          <div className="border-t pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Free Plan */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Free Plan</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    50 messages per month
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    +100 messages per referral
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    Basic AI models
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    $1 promotional credit
                  </li>
                  <li className="flex items-center gap-2">
                    <X className="h-4 w-4 text-red-500" />
                    CLI access
                  </li>
                  <li className="flex items-center gap-2">
                    <X className="h-4 w-4 text-red-500" />
                    Monthly credit allocation
                  </li>
                </ul>
              </div>

              {/* Pro Plan */}
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-4 border border-yellow-200">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Crown className="h-4 w-4 text-yellow-600" />
                  Pro Plan - $20/month
                </h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <strong>Unlimited messages</strong>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <strong>CLI model access</strong>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <strong>$5 monthly credits</strong>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    Priority processing
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    Advanced AI models
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    Premium support
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="border-t pt-6 mt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              {!isPro ? (
                <Button 
                  onClick={handleUpgrade}
                  disabled={upgrading}
                  className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700"
                  size="lg"
                >
                  {upgrading ? 'Loading...' : 'Upgrade to Pro - $20/month'}
                </Button>
              ) : (
                <Button 
                  onClick={handleManageSubscription}
                  variant="outline"
                  size="lg"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Manage Subscription
                </Button>
              )}
              <Button variant="outline" size="lg" asChild>
                <a href="/dashboard/referrals">
                  <Users className="h-4 w-4 mr-2" />
                  Refer Friends
                </a>
              </Button>
            </div>
          </div>

          {/* Billing Period */}
          {isPro && data?.subscription?.current_period_end && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>
                  Current billing period ends on {new Date(data.subscription.current_period_end).toLocaleDateString()}
                </span>
                {data.subscription.cancel_at_period_end && (
                  <Badge variant="outline" className="ml-2">
                    Cancels at period end
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Referral Stats */}
      {data?.referralStats.totalReferrals > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-purple-600" />
              Referral Program Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {data.referralStats.totalReferrals}
                </div>
                <div className="text-sm text-gray-600">Total Referrals</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {data.referralStats.completedReferrals}
                </div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  +{data.referralStats.totalBonusMessages}
                </div>
                <div className="text-sm text-gray-600">Bonus Messages</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}