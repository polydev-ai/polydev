'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users, 
  Gift, 
  Copy, 
  CheckCircle, 
  TrendingUp,
  Calendar,
  Share2,
  Award
} from 'lucide-react'

interface ReferralStats {
  totalReferrals: number
  pendingReferrals: number
  completedReferrals: number
  bonusMessages: number
  thisMonthReferrals: number
}

interface ReferralCode {
  code: string
  created_at: string
  uses_remaining: number
  total_uses: number
}

export default function ReferralsPage() {
  const [stats, setStats] = useState<ReferralStats>({
    totalReferrals: 0,
    pendingReferrals: 0,
    completedReferrals: 0,
    bonusMessages: 0,
    thisMonthReferrals: 0
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
        setStats(data.stats)
        setReferralCodes(data.codes)
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
        setMessage({ type: 'success', text: `Generated new referral code: ${data.code}` })
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
        body: JSON.stringify({ action: 'redeem', code: redeemCode.trim() })
      })

      if (response.ok) {
        const data = await response.json()
        setMessage({ type: 'success', text: `Successfully redeemed! You received ${data.bonusMessages} bonus messages.` })
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Referral Program</h1>
          <p className="text-muted-foreground mt-1">
            Earn 100 bonus messages for each successful referral!
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          <Gift className="h-4 w-4 mr-1" />
          {stats.bonusMessages} Bonus Messages
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReferrals}</div>
            <p className="text-xs text-muted-foreground">All time referrals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.thisMonthReferrals}</div>
            <p className="text-xs text-muted-foreground">Referrals this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedReferrals}</div>
            <p className="text-xs text-muted-foreground">Successfully completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bonus Messages</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.bonusMessages}</div>
            <p className="text-xs text-muted-foreground">Total earned messages</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="generate" className="w-full">
        <TabsList>
          <TabsTrigger value="generate">My Referral Codes</TabsTrigger>
          <TabsTrigger value="redeem">Redeem Code</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-4">
          <Card>
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
            <Card>
              <CardHeader>
                <CardTitle>Your Referral Codes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {referralCodes.map((code, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
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
                  className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
      </Tabs>
    </div>
  )
}