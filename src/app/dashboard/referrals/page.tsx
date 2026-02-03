'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { FeatureGate } from '@/components/FeatureGate'
import {
  Users,
  Copy,
  CheckCircle,
  Calendar,
  Share2,
  Gift,
  Coins
} from 'lucide-react'

// Simple flat rewards - matches referralSystem.ts
const REFERRAL_REWARDS = {
  REFERRER_CREDITS: 500,
  NEW_USER_CREDITS: 200
}

interface ReferralStats {
  totalReferrals: number
  pendingReferrals: number
  completedReferrals: number
  totalCreditsEarned: number
  thisMonthReferrals: number
  lifetime_value: number
}

interface ReferralCode {
  code: string
  created_at: string
  uses_remaining: number
  total_uses: number
}

// PERFORMANCE: Cache for referral data to reduce API calls
const referralsCache = {
  stats: null as ReferralStats | null,
  codes: null as ReferralCode[] | null,
  timestamp: 0,
  CACHE_DURATION: 5 * 60 * 1000 // 5 minutes
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
}

function ReferralsContent() {
  const [stats, setStats] = useState<ReferralStats>({
    totalReferrals: 0,
    pendingReferrals: 0,
    completedReferrals: 0,
    totalCreditsEarned: 0,
    thisMonthReferrals: 0,
    lifetime_value: 0
  })
  const [referralCodes, setReferralCodes] = useState<ReferralCode[]>([])
  const [redeemCode, setRedeemCode] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isRedeeming, setIsRedeeming] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    fetchReferralData()
  }, [])

  const fetchReferralData = async (forceRefresh = false) => {
    try {
      // Check cache first (unless force refresh)
      const now = Date.now()
      if (!forceRefresh &&
          referralsCache.stats &&
          referralsCache.codes &&
          (now - referralsCache.timestamp) < referralsCache.CACHE_DURATION) {
        setStats(referralsCache.stats)
        setReferralCodes(referralsCache.codes)
        return
      }

      const response = await fetch('/api/referrals')
      if (response.ok) {
        const data = await response.json()

        // Map API response to expected stats format
        const mappedStats = {
          totalReferrals: data.stats?.totalReferrals || data.totalReferrals || 0,
          pendingReferrals: data.stats?.pendingReferrals || (data.referrals || []).filter((r: any) => r.status === 'pending').length,
          completedReferrals: data.stats?.completedReferrals || data.completedReferrals || 0,
          totalCreditsEarned: data.stats?.totalCreditsEarned || data.totalBonusMessages || 0,
          thisMonthReferrals: data.stats?.thisMonthReferrals || (data.referrals || []).filter((r: any) => {
            const referralMonth = new Date(r.created_at).toISOString().substring(0, 7)
            const currentMonth = new Date().toISOString().substring(0, 7)
            return referralMonth === currentMonth
          }).length,
          lifetime_value: data.stats?.lifetime_value || 0
        }

        // Map referrals to expected code format
        const codes = (data.codes || data.referrals || []).map((referral: any) => ({
          code: referral.code || referral.referral_code,
          created_at: referral.created_at,
          uses_remaining: referral.uses_remaining || (referral.status === 'pending' ? 1 : 0),
          total_uses: referral.total_uses || (referral.status === 'completed' ? 1 : 0)
        }))

        // Update cache
        referralsCache.stats = mappedStats
        referralsCache.codes = codes
        referralsCache.timestamp = now

        setStats(mappedStats)
        setReferralCodes(codes)
      }
    } catch (error) {
      console.error('Failed to fetch referral data:', error)
    }
  }

  const generateReferralCode = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate' })
      })

      if (response.ok) {
        const data = await response.json()
        setMessage({ type: 'success', text: `Generated new referral code: ${data.referralCode}` })
        fetchReferralData(true) // Force refresh after generating
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Failed to generate code' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to generate referral code' })
    } finally {
      setIsGenerating(false)
    }
  }

  const redeemReferralCode = async () => {
    if (!redeemCode.trim()) return

    setIsRedeeming(true)
    try {
      const response = await fetch('/api/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'redeem', referralCode: redeemCode.trim() })
      })

      if (response.ok) {
        const data = await response.json()
        setMessage({ type: 'success', text: data.message || 'Successfully redeemed referral code!' })
        setRedeemCode('')
        fetchReferralData(true) // Force refresh after redeeming
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Failed to redeem code' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to redeem referral code' })
    } finally {
      setIsRedeeming(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setMessage({ type: 'success', text: 'Copied to clipboard!' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to copy to clipboard' })
    }
  }

  const shareReferralCode = (code: string) => {
    const shareUrl = `${window.location.origin}/signup?ref=${code}`
    copyToClipboard(shareUrl)
  }

  return (
    <motion.div
      className="container mx-auto p-6 space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div className="flex items-center justify-between" variants={itemVariants}>
        <div>
          <h1 className="text-3xl font-bold">Referral Program</h1>
          <p className="text-muted-foreground mt-1">
            Earn {REFERRAL_REWARDS.REFERRER_CREDITS} credits for each successful referral!
          </p>
        </div>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          <Coins className="h-4 w-4 mr-1" />
          {stats.totalCreditsEarned} Credits Earned
        </Badge>
      </motion.div>

      {/* Rewards Info Card */}
      <motion.div variants={itemVariants}>
        <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
          <CardContent className="py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-full">
                  <Gift className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-900">{REFERRAL_REWARDS.REFERRER_CREDITS} credits</div>
                  <div className="text-sm text-purple-700">You earn per referral</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-full">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-900">{REFERRAL_REWARDS.NEW_USER_CREDITS} credits</div>
                  <div className="text-sm text-green-700">Your friend receives</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Message Display */}
      {message && (
        <div className={`p-4 rounded-lg font-medium ${
          message.type === 'success'
            ? 'bg-green-50 text-green-900 border border-green-200'
            : 'bg-red-50 text-red-900 border border-red-200'
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

      {/* Stats Cards */}
      <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" variants={itemVariants}>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReferrals}</div>
            <p className="text-xs text-muted-foreground">All time referrals</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.thisMonthReferrals}</div>
            <p className="text-xs text-muted-foreground">Referrals this month</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedReferrals}</div>
            <p className="text-xs text-muted-foreground">Successfully completed</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits Earned</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCreditsEarned}</div>
            <p className="text-xs text-muted-foreground">Total credits from referrals</p>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
      <Tabs defaultValue="generate" className="w-full">
        <TabsList>
          <TabsTrigger value="generate">My Referral Codes</TabsTrigger>
          <TabsTrigger value="redeem">Redeem Code</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-4">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                Generate Referral Code
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Generate a unique referral code to share with friends. When they sign up using your code:
              </p>
              <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                <li>You earn <strong>{REFERRAL_REWARDS.REFERRER_CREDITS} credits</strong></li>
                <li>Your friend gets <strong>{REFERRAL_REWARDS.NEW_USER_CREDITS} credits</strong> to start</li>
                <li>Both of you receive email notifications</li>
              </ul>
              <Button
                onClick={generateReferralCode}
                disabled={isGenerating}
                className="w-full sm:w-auto"
              >
                {isGenerating ? 'Generating...' : 'Generate New Code'}
              </Button>
            </CardContent>
          </Card>

          {referralCodes.length > 0 && (
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Your Referral Codes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {referralCodes.map((code, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <code className="px-2 py-1 bg-slate-100 rounded text-sm font-mono">
                          {code.code}
                        </code>
                        <Badge variant={code.uses_remaining > 0 ? "default" : "secondary"}>
                          {code.uses_remaining} uses left
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(code.code)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => shareReferralCode(code.code)}
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="redeem" className="space-y-4">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Redeem Referral Code
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Have a referral code from a friend? Enter it below to receive <strong>{REFERRAL_REWARDS.NEW_USER_CREDITS} free credits</strong>!
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                  placeholder="Enter referral code"
                  className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 uppercase"
                />
                <Button
                  onClick={redeemReferralCode}
                  disabled={isRedeeming || !redeemCode.trim()}
                >
                  {isRedeeming ? 'Redeeming...' : 'Redeem'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Referral Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-2xl font-bold text-slate-900">{stats.completedReferrals}</div>
                  <div className="text-sm text-slate-600">Successful Referrals</div>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-2xl font-bold text-slate-900">{stats.totalCreditsEarned}</div>
                  <div className="text-sm text-slate-600">Credits Earned</div>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-2xl font-bold text-slate-900">{stats.thisMonthReferrals}</div>
                  <div className="text-sm text-slate-600">This Month</div>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-2xl font-bold text-slate-900">${stats.lifetime_value.toFixed(2)}</div>
                  <div className="text-sm text-slate-600">Lifetime Value</div>
                </div>
              </div>

              {/* Conversion Rate */}
              {stats.totalReferrals > 0 && (
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Conversion Rate</span>
                    <span className="text-lg font-bold">
                      {Math.round((stats.completedReferrals / stats.totalReferrals) * 100)}%
                    </span>
                  </div>
                  <Progress
                    value={(stats.completedReferrals / stats.totalReferrals) * 100}
                    className="h-2"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    {stats.completedReferrals} completed out of {stats.totalReferrals} total referrals
                  </div>
                </div>
              )}

              {/* Earnings Breakdown */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Coins className="h-4 w-4" />
                  Earnings Summary
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="flex justify-between py-1">
                      <span>Credits per referral:</span>
                      <span className="font-medium">{REFERRAL_REWARDS.REFERRER_CREDITS}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>Total referrals:</span>
                      <span className="font-medium">{stats.completedReferrals}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between py-1">
                      <span>Total earned:</span>
                      <span className="font-medium">{stats.totalCreditsEarned} credits</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>Lifetime value:</span>
                      <span className="font-medium">${stats.lifetime_value.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </motion.div>
    </motion.div>
  )
}


export default function ReferralsPage() {
  return (
    <FeatureGate feature="referrals">
      <ReferralsContent />
    </FeatureGate>
  )
}
