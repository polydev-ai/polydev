'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users, 
  Gift, 
  Link, 
  Copy, 
  Check,
  MessageSquare,
  Trophy,
  Calendar
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Referral {
  id: string
  referral_code: string
  referred_user_id: string | null
  status: 'pending' | 'completed'
  bonus_messages: number
  created_at: string
  completed_at: string | null
}

interface ReferralData {
  referrals: Referral[]
  totalBonusMessages: number
  totalReferrals: number
  completedReferrals: number
}

export default function ReferralsPage() {
  const [referralData, setReferralData] = useState<ReferralData | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [redeeming, setRedeeming] = useState(false)
  const [redeemCode, setRedeemCode] = useState('')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchReferrals()
  }, [])

  const fetchReferrals = async () => {
    try {
      const response = await fetch('/api/referrals')
      if (response.ok) {
        const data = await response.json()
        setReferralData(data)
      }
    } catch (error) {
      console.error('Failed to fetch referrals:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateReferralCode = async () => {
    setGenerating(true)
    try {
      const response = await fetch('/api/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate' })
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: 'Referral code generated!',
          description: `Your new code: ${data.referralCode}`
        })
        await fetchReferrals()
      } else {
        const error = await response.json()
        toast({
          title: 'Error',
          description: error.error || 'Failed to generate referral code',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate referral code',
        variant: 'destructive'
      })
    } finally {
      setGenerating(false)
    }
  }

  const redeemReferralCode = async () => {
    if (!redeemCode.trim()) return

    setRedeeming(true)
    try {
      const response = await fetch('/api/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'redeem',
          referralCode: redeemCode.trim().toUpperCase()
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        toast({
          title: 'Success!',
          description: data.message
        })
        setRedeemCode('')
        await fetchReferrals()
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to redeem referral code',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to redeem referral code',
        variant: 'destructive'
      })
    } finally {
      setRedeeming(false)
    }
  }

  const copyToClipboard = async (text: string, code: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedCode(code)
      toast({
        title: 'Copied!',
        description: 'Referral link copied to clipboard'
      })
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive'
      })
    }
  }

  const getReferralUrl = (code: string) => {
    return `${window.location.origin}/signup?ref=${code}`
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

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Referral Program</h1>
        <p className="text-gray-600">
          Invite friends and earn 100 bonus messages each month for every successful referral!
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{referralData?.totalReferrals || 0}</div>
            <div className="text-sm text-gray-600">Total Referrals</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Trophy className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{referralData?.completedReferrals || 0}</div>
            <div className="text-sm text-gray-600">Successful</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <MessageSquare className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{referralData?.totalBonusMessages || 0}</div>
            <div className="text-sm text-gray-600">Bonus Messages</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Gift className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">100</div>
            <div className="text-sm text-gray-600">Per Referral</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="refer" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="refer">Share & Earn</TabsTrigger>
          <TabsTrigger value="redeem">Redeem Code</TabsTrigger>
        </TabsList>

        <TabsContent value="refer" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="h-5 w-5" />
                Generate Referral Code
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={generateReferralCode}
                disabled={generating}
                className="mb-4"
              >
                {generating ? 'Generating...' : 'Generate New Code'}
              </Button>
              <p className="text-sm text-gray-600">
                Generate a unique referral code to share with friends. Each successful signup gives you both 100 bonus messages per month!
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your Referral Codes</CardTitle>
            </CardHeader>
            <CardContent>
              {referralData?.referrals.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No referral codes yet. Generate one above to get started!
                </p>
              ) : (
                <div className="space-y-4">
                  {referralData?.referrals.map((referral) => (
                    <div key={referral.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                            {referral.referral_code}
                          </code>
                          <Badge variant={referral.status === 'completed' ? 'default' : 'secondary'}>
                            {referral.status}
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(getReferralUrl(referral.referral_code), referral.referral_code)}
                        >
                          {copiedCode === referral.referral_code ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        {getReferralUrl(referral.referral_code)}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(referral.created_at).toLocaleDateString()}
                        </span>
                        {referral.status === 'completed' && (
                          <span className="text-green-600">
                            +{referral.bonus_messages} messages earned
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="redeem" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Redeem Referral Code
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Input
                    placeholder="Enter referral code"
                    value={redeemCode}
                    onChange={(e) => setRedeemCode(e.target.value)}
                    className="mb-2"
                  />
                  <Button 
                    onClick={redeemReferralCode}
                    disabled={redeeming || !redeemCode.trim()}
                    className="w-full"
                  >
                    {redeeming ? 'Redeeming...' : 'Redeem Code'}
                  </Button>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Enter a friend's referral code above</li>
                    <li>• You'll get 100 bonus messages this month</li>
                    <li>• Your friend will also get 100 bonus messages</li>
                    <li>• This bonus applies to your monthly message limit</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}