'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Save,
  AlertCircle,
  CheckCircle,
  Layers
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface TierLimits {
  tier: 'free' | 'plus' | 'pro'
  messages_per_month: number | null
  premium_perspectives_limit: number
  normal_perspectives_limit: number
  eco_perspectives_limit: number
}

interface ModelTier {
  display_name: string
  tier: string
}

export default function AdminTierLimits() {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tierLimits, setTierLimits] = useState<TierLimits[]>([])
  const [modelTiers, setModelTiers] = useState<ModelTier[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAdminAccess()
    loadTierLimits()
    loadModelTiers()
  }, [])

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/signin')
        return
      }

      setUser(user)

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (!profile?.is_admin) {
        router.push('/')
        return
      }

      setIsAdmin(true)
    } catch (error) {
      console.error('Error checking admin access:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const loadTierLimits = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_tier_limits')
        .select('*')
        .order('tier')

      if (error) throw error

      setTierLimits(data || [])
    } catch (error) {
      console.error('Error loading tier limits:', error)
      setMessage({ type: 'error', text: 'Failed to load tier limits' })
    }
  }

  const loadModelTiers = async () => {
    try {
      const { data, error } = await supabase
        .from('model_tiers')
        .select('display_name, tier')
        .order('tier', { ascending: true })
        .order('display_name', { ascending: true })

      if (error) throw error

      setModelTiers(data || [])
    } catch (error) {
      console.error('Error loading model tiers:', error)
    }
  }

  const updateTierLimit = async (tier: 'free' | 'plus' | 'pro', field: string, value: any) => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('admin_tier_limits')
        .update({
          [field]: value,
          updated_by: user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('tier', tier)

      if (error) throw error

      // Update local state
      setTierLimits(prev => prev.map(limit =>
        limit.tier === tier ? { ...limit, [field]: value } : limit
      ))

      setMessage({ type: 'success', text: 'Tier limits updated successfully!' })
    } catch (error) {
      console.error('Error updating tier limits:', error)
      setMessage({ type: 'error', text: 'Failed to update tier limits' })
    } finally {
      setSaving(false)
    }
  }

  const getTierConfig = (tier: 'free' | 'plus' | 'pro') => {
    return tierLimits.find(t => t.tier === tier)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  const freeTier = getTierConfig('free')
  const plusTier = getTierConfig('plus')
  const proTier = getTierConfig('pro')

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-4">
          <button
            onClick={() => router.push('/admin')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Admin Portal
          </button>
        </div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Layers className="h-8 w-8 text-blue-600" />
              Tier Limits Configuration
            </h1>
            <p className="text-gray-600 mt-2">
              Configure message and perspective limits for each subscription tier
            </p>
          </div>
        </div>

        {message && (
          <Alert className={`mb-6 ${message.type === 'success' ? 'border-green-500' : 'border-red-500'}`}>
            {message.type === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {message.text}
              <button
                onClick={() => setMessage(null)}
                className="ml-2 text-sm underline"
              >
                Dismiss
              </button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Free Tier */}
          {freeTier && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Free Plan
                  <Badge variant="secondary">$0/month</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="free-messages">Messages per Month</Label>
                  <Input
                    id="free-messages"
                    type="number"
                    value={freeTier.messages_per_month || ''}
                    onChange={(e) => updateTierLimit('free', 'messages_per_month', parseInt(e.target.value) || null)}
                  />
                </div>
                <div>
                  <Label htmlFor="free-premium">Premium Perspectives</Label>
                  <Input
                    id="free-premium"
                    type="number"
                    value={freeTier.premium_perspectives_limit}
                    onChange={(e) => updateTierLimit('free', 'premium_perspectives_limit', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="free-normal">Normal Perspectives</Label>
                  <Input
                    id="free-normal"
                    type="number"
                    value={freeTier.normal_perspectives_limit}
                    onChange={(e) => updateTierLimit('free', 'normal_perspectives_limit', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="free-eco">Eco Perspectives</Label>
                  <Input
                    id="free-eco"
                    type="number"
                    value={freeTier.eco_perspectives_limit}
                    onChange={(e) => updateTierLimit('free', 'eco_perspectives_limit', parseInt(e.target.value))}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Plus Tier */}
          {plusTier && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Plus Plan
                  <Badge className="bg-orange-500 text-white">$25/month</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="plus-messages">Messages per Month</Label>
                  <Input
                    id="plus-messages"
                    type="text"
                    value={plusTier.messages_per_month === null ? 'Unlimited' : plusTier.messages_per_month}
                    disabled
                    className="bg-gray-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">Plus tier has unlimited messages</p>
                </div>
                <div>
                  <Label htmlFor="plus-premium">Premium Perspectives</Label>
                  <Input
                    id="plus-premium"
                    type="number"
                    value={plusTier.premium_perspectives_limit}
                    onChange={(e) => updateTierLimit('plus', 'premium_perspectives_limit', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="plus-normal">Normal Perspectives</Label>
                  <Input
                    id="plus-normal"
                    type="number"
                    value={plusTier.normal_perspectives_limit}
                    onChange={(e) => updateTierLimit('plus', 'normal_perspectives_limit', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="plus-eco">Eco Perspectives</Label>
                  <Input
                    id="plus-eco"
                    type="number"
                    value={plusTier.eco_perspectives_limit}
                    onChange={(e) => updateTierLimit('plus', 'eco_perspectives_limit', parseInt(e.target.value))}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pro Tier */}
          {proTier && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Pro Plan
                  <Badge className="bg-purple-500 text-white">$60/month</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="pro-messages">Messages per Month</Label>
                  <Input
                    id="pro-messages"
                    type="text"
                    value={proTier.messages_per_month === null ? 'Unlimited' : proTier.messages_per_month}
                    disabled
                    className="bg-gray-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">Pro tier has unlimited messages</p>
                </div>
                <div>
                  <Label htmlFor="pro-premium">Premium Perspectives</Label>
                  <Input
                    id="pro-premium"
                    type="number"
                    value={proTier.premium_perspectives_limit}
                    onChange={(e) => updateTierLimit('pro', 'premium_perspectives_limit', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="pro-normal">Normal Perspectives</Label>
                  <Input
                    id="pro-normal"
                    type="number"
                    value={proTier.normal_perspectives_limit}
                    onChange={(e) => updateTierLimit('pro', 'normal_perspectives_limit', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="pro-eco">Eco Perspectives</Label>
                  <Input
                    id="pro-eco"
                    type="number"
                    value={proTier.eco_perspectives_limit}
                    onChange={(e) => updateTierLimit('pro', 'eco_perspectives_limit', parseInt(e.target.value))}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Understanding Limits</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p><strong>Messages:</strong> Each user request counts as 1 message (web chat, CLI, or MCP request)</p>
            <p><strong>Perspectives:</strong> Each model API call counts as 1 perspective (one message can trigger multiple perspectives)</p>
            <p><strong>Tiers:</strong></p>
            <ul className="list-disc ml-6 space-y-1">
              <li>
                <strong>Premium:</strong> {modelTiers.filter(m => m.tier === 'premium').length > 0
                  ? modelTiers.filter(m => m.tier === 'premium').map(m => m.display_name).join(', ')
                  : 'No models configured'}
              </li>
              <li>
                <strong>Normal:</strong> {modelTiers.filter(m => m.tier === 'normal').length > 0
                  ? modelTiers.filter(m => m.tier === 'normal').map(m => m.display_name).join(', ')
                  : 'No models configured'}
              </li>
              <li>
                <strong>Eco:</strong> {modelTiers.filter(m => m.tier === 'eco').length > 0
                  ? modelTiers.filter(m => m.tier === 'eco').map(m => m.display_name).join(', ')
                  : 'No models configured'}
              </li>
            </ul>
            <p className="mt-4 text-xs text-blue-600">
              Changes take effect immediately on user page refresh. Users will see updated limits in their dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}