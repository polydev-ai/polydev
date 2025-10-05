'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  Users,
  Copy,
  CheckCircle,
  Calendar,
  Share2,
  DollarSign
} from 'lucide-react'

interface ReferralTier {
  id: string
  name: string
  minReferrals: number
  bonusMultiplier: number
  creditsBonus: number
  features: string[]
}

interface ReferralStats {
  totalReferrals: number
  pendingReferrals: number
  completedReferrals: number
  bonusMessages: number
  thisMonthReferrals: number
  currentTier: ReferralTier
  nextTier?: ReferralTier
  lifetime_value: number
}

interface ReferralCode {
  code: string
  created_at: string
  uses_remaining: number
  total_uses: number
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
}

export default function ReferralsPage() {
  const [stats, setStats] = useState<ReferralStats>({
    totalReferrals: 0,
    pendingReferrals: 0,
    completedReferrals: 0,
    bonusMessages: 0,
    thisMonthReferrals: 0,
    currentTier: { id: 'bronze', name: 'Bronze Referrer', minReferrals: 0, bonusMultiplier: 1.0, creditsBonus: 100, features: ['Basic referral tracking', '100 credits per referral'] },
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

  const fetchReferralData = async () => {
    try {
      const response = await fetch('/api/referrals')
      if (response.ok) {
        const data = await response.json()
        
        // Map API response to expected stats format
        const mappedStats = {
          totalReferrals: data.stats?.totalReferrals || data.totalReferrals || 0,
          pendingReferrals: data.stats?.pendingReferrals || (data.referrals || []).filter((r: any) => r.status === 'pending').length,
          completedReferrals: data.stats?.completedReferrals || data.completedReferrals || 0,
          bonusMessages: data.stats?.bonusMessages || data.totalBonusMessages || 0,
          thisMonthReferrals: data.stats?.thisMonthReferrals || (data.referrals || []).filter((r: any) => {
            const referralMonth = new Date(r.created_at).toISOString().substring(0, 7)
            const currentMonth = new Date().toISOString().substring(0, 7)
            return referralMonth === currentMonth
          }).length,
          currentTier: data.stats?.currentTier || { 
            id: 'bronze', 
            name: 'Bronze Referrer', 
            minReferrals: 0, 
            bonusMultiplier: 1.0, 
            creditsBonus: 100, 
            features: ['Basic referral tracking', '100 credits per referral'] 
          },
          nextTier: data.stats?.nextTier,
          lifetime_value: data.stats?.lifetime_value || 0
        }
        
        setStats(mappedStats)
        
        // Map referrals to expected code format
        const codes = (data.codes || data.referrals || []).map((referral: any) => ({
          code: referral.code || referral.referral_code,
          created_at: referral.created_at,
          uses_remaining: referral.uses_remaining || (referral.status === 'pending' ? 1 : 0),
          total_uses: referral.total_uses || (referral.status === 'completed' ? 1 : 0)
        }))
        
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
        fetchReferralData()
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
        fetchReferralData()
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
            Earn 100 bonus messages for each successful referral!
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          
          {stats.bonusMessages} Bonus Messages
        </Badge>
      </motion.div>

      {/* Message Display */}
      {message && (
        <div className="p-4 rounded-lg bg-slate-50 text-slate-900 border border-slate-200 font-medium">
          {message.text}
          <button
            onClick={() => setMessage(null)}
            className="ml-2 text-sm underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tier Progress Card */}
      <motion.div variants={itemVariants}>
      <Card className="mb-6 bg-slate-50 border-slate-200 hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            
            Current Tier: {stats.currentTier.name}
            <Badge variant="secondary" className="ml-auto bg-slate-100 text-slate-900">
              {stats.completedReferrals} / {stats.nextTier?.minReferrals || stats.currentTier.minReferrals + '+'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Progress to {stats.nextTier?.name || 'Max Level'}</span>
              <span>{Math.round(((stats.completedReferrals - stats.currentTier.minReferrals) / ((stats.nextTier?.minReferrals || stats.completedReferrals + 1) - stats.currentTier.minReferrals)) * 100)}%</span>
            </div>
            <Progress
              value={stats.nextTier ?
                ((stats.completedReferrals - stats.currentTier.minReferrals) / (stats.nextTier.minReferrals - stats.currentTier.minReferrals)) * 100
                : 100
              }
              className="h-2"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="flex items-center gap-2">
              
              <span>{stats.currentTier.creditsBonus} credits per referral</span>
            </div>
            <div className="flex items-center gap-2">
              
              <span>{Math.round((stats.currentTier.bonusMultiplier - 1) * 100)}% bonus multiplier</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-slate-900" />
              <span>${stats.lifetime_value.toFixed(2)} lifetime value</span>
            </div>
          </div>

          <div>
            <p className="font-medium text-sm mb-2">Tier Benefits:</p>
            <div className="flex flex-wrap gap-1">
              {stats.currentTier.features.map((feature, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {feature}
                </Badge>
              ))}
            </div>
          </div>

          {stats.nextTier && (
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground">
                <strong>Next tier ({stats.nextTier.name}):</strong> {stats.nextTier.minReferrals - stats.completedReferrals} more referrals needed
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      </motion.div>

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
            <CardTitle className="text-sm font-medium">Bonus Messages</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.bonusMessages}</div>
            <p className="text-xs text-muted-foreground">Total earned messages</p>
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
                Generate a unique referral code to share with friends. When they sign up and use your code, 
                you both get bonus messages!
              </p>
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
                
                Redeem Referral Code
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Have a referral code from a friend? Enter it here to get bonus messages!
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value)}
                  placeholder="Enter referral code"
                  className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
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
                  <div className="text-2xl font-bold text-slate-900">{stats.bonusMessages}</div>
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

              {/* Tier Progress */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  
                  Tier Progression
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Current: {stats.currentTier.name}</span>
                    <span>Next: {stats.nextTier?.name || 'Max Level Reached!'}</span>
                  </div>
                  <Progress 
                    value={stats.nextTier ? 
                      Math.max(0, ((stats.completedReferrals - stats.currentTier.minReferrals) / (stats.nextTier.minReferrals - stats.currentTier.minReferrals)) * 100)
                      : 100
                    }
                    className="h-3"
                  />
                  <div className="text-xs text-muted-foreground">
                    {stats.nextTier 
                      ? `${stats.nextTier.minReferrals - stats.completedReferrals} more referrals to reach ${stats.nextTier.name}`
                      : 'Congratulations! You have reached the highest tier.'
                    }
                  </div>
                </div>
              </div>

              {/* Earnings Breakdown */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Earnings Breakdown
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="flex justify-between py-1">
                      <span>Credits per referral:</span>
                      <span className="font-medium">{stats.currentTier.creditsBonus}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>Bonus multiplier:</span>
                      <span className="font-medium">{stats.currentTier.bonusMultiplier}x</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>Effective per referral:</span>
                      <span className="font-medium text-slate-900">
                        {Math.floor(stats.currentTier.creditsBonus * stats.currentTier.bonusMultiplier)} credits
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between py-1">
                      <span>Total earned:</span>
                      <span className="font-medium">{stats.bonusMessages} credits</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>Lifetime value:</span>
                      <span className="font-medium">${stats.lifetime_value.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>Average per referral:</span>
                      <span className="font-medium">
                        ${stats.completedReferrals > 0 ? (stats.lifetime_value / stats.completedReferrals).toFixed(2) : '0.00'}
                      </span>
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