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
  Coins,
  Zap,
  Star,
  Sparkles,
  Home,
  RefreshCw
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface CreditCosts {
  eco: number
  normal: number
  premium: number
}

interface ModelTier {
  display_name: string
  tier: string
  provider: string
}

export default function CreditCostConfiguration() {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [creditCosts, setCreditCosts] = useState<CreditCosts>({ eco: 1, normal: 4, premium: 20 })
  const [originalCosts, setOriginalCosts] = useState<CreditCosts>({ eco: 1, normal: 4, premium: 20 })
  const [modelTiers, setModelTiers] = useState<ModelTier[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAdminAccess()
  }, [])

  useEffect(() => {
    if (isAdmin) {
      loadCreditCosts()
      loadModelTiers()
    }
  }, [isAdmin])

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/signin')
        return
      }

      setUser(user)

      const legacyAdminEmails = new Set(['admin@polydev.ai', 'venkat@polydev.ai', 'gvsfans@gmail.com'])
      const isLegacyAdmin = legacyAdminEmails.has(user.email || '')

      let isNewAdmin = false
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single()
        isNewAdmin = profile?.is_admin || false
      } catch (error) {
        console.log('Profile not found, checking legacy admin access')
      }

      if (!isNewAdmin && !isLegacyAdmin) {
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

  const loadCreditCosts = async () => {
    try {
      const response = await fetch('/api/admin/credit-costs')
      const data = await response.json()

      if (data.success && data.creditCosts) {
        setCreditCosts(data.creditCosts)
        setOriginalCosts(data.creditCosts)
      }
    } catch (error) {
      console.error('Error loading credit costs:', error)
      setMessage({ type: 'error', text: 'Failed to load credit costs' })
    }
  }

  const loadModelTiers = async () => {
    try {
      const response = await fetch('/api/admin/model-tiers')
      const data = await response.json()

      if (data.success && data.models) {
        setModelTiers(data.models.filter((m: any) => m.active))
      }
    } catch (error) {
      console.error('Error loading model tiers:', error)
    }
  }

  const saveCreditCosts = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/credit-costs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creditCosts)
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to save credit costs')
      }

      setOriginalCosts(creditCosts)
      setMessage({ type: 'success', text: 'Credit costs saved successfully!' })
    } catch (error) {
      console.error('Error saving credit costs:', error)
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to save credit costs' })
    } finally {
      setSaving(false)
    }
  }

  const resetToDefaults = () => {
    setCreditCosts({ eco: 1, normal: 4, premium: 20 })
  }

  const hasChanges = JSON.stringify(creditCosts) !== JSON.stringify(originalCosts)

  const getModelsForTier = (tier: string) => {
    return modelTiers.filter(m => m.tier === tier)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-4">
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            <Home className="h-4 w-4" />
            Back to Admin Portal
          </button>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Coins className="h-8 w-8 text-slate-900" />
              Credit Cost Configuration
            </h1>
            <p className="text-slate-600 mt-2">
              Define how many credits each model tier costs per API call
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={resetToDefaults}
              disabled={saving}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
            <Button
              onClick={saveCreditCosts}
              disabled={saving || !hasChanges}
              className="bg-slate-900 hover:bg-slate-800"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {message && (
          <Alert className={`mb-6 ${message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
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

        {/* Credit Cost Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Eco Tier */}
          <Card className="border-2 border-green-200 bg-green-50/30">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-green-600" />
                  Eco Models
                </div>
                <Badge className="bg-green-100 text-green-800 border-green-300">Low Cost</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="eco-cost" className="text-sm font-medium">Credits per Call</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    id="eco-cost"
                    type="number"
                    min="0"
                    step="1"
                    value={creditCosts.eco}
                    onChange={(e) => setCreditCosts({ ...creditCosts, eco: parseInt(e.target.value) || 0 })}
                    className="text-2xl font-bold text-center h-14"
                  />
                  <span className="text-sm text-slate-600">credits</span>
                </div>
              </div>
              <div className="pt-2 border-t border-green-200">
                <p className="text-xs text-slate-600 mb-2">Models in this tier:</p>
                <div className="flex flex-wrap gap-1">
                  {getModelsForTier('eco').slice(0, 5).map(m => (
                    <Badge key={m.display_name} variant="outline" className="text-xs">
                      {m.display_name}
                    </Badge>
                  ))}
                  {getModelsForTier('eco').length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{getModelsForTier('eco').length - 5} more
                    </Badge>
                  )}
                  {getModelsForTier('eco').length === 0 && (
                    <span className="text-xs text-slate-500">No models configured</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Normal Tier */}
          <Card className="border-2 border-blue-200 bg-blue-50/30">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-blue-600" />
                  Normal Models
                </div>
                <Badge className="bg-blue-100 text-blue-800 border-blue-300">Standard</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="normal-cost" className="text-sm font-medium">Credits per Call</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    id="normal-cost"
                    type="number"
                    min="0"
                    step="1"
                    value={creditCosts.normal}
                    onChange={(e) => setCreditCosts({ ...creditCosts, normal: parseInt(e.target.value) || 0 })}
                    className="text-2xl font-bold text-center h-14"
                  />
                  <span className="text-sm text-slate-600">credits</span>
                </div>
              </div>
              <div className="pt-2 border-t border-blue-200">
                <p className="text-xs text-slate-600 mb-2">Models in this tier:</p>
                <div className="flex flex-wrap gap-1">
                  {getModelsForTier('normal').slice(0, 5).map(m => (
                    <Badge key={m.display_name} variant="outline" className="text-xs">
                      {m.display_name}
                    </Badge>
                  ))}
                  {getModelsForTier('normal').length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{getModelsForTier('normal').length - 5} more
                    </Badge>
                  )}
                  {getModelsForTier('normal').length === 0 && (
                    <span className="text-xs text-slate-500">No models configured</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Premium Tier */}
          <Card className="border-2 border-purple-200 bg-purple-50/30">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  Premium Models
                </div>
                <Badge className="bg-purple-100 text-purple-800 border-purple-300">High Performance</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="premium-cost" className="text-sm font-medium">Credits per Call</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    id="premium-cost"
                    type="number"
                    min="0"
                    step="1"
                    value={creditCosts.premium}
                    onChange={(e) => setCreditCosts({ ...creditCosts, premium: parseInt(e.target.value) || 0 })}
                    className="text-2xl font-bold text-center h-14"
                  />
                  <span className="text-sm text-slate-600">credits</span>
                </div>
              </div>
              <div className="pt-2 border-t border-purple-200">
                <p className="text-xs text-slate-600 mb-2">Models in this tier:</p>
                <div className="flex flex-wrap gap-1">
                  {getModelsForTier('premium').slice(0, 5).map(m => (
                    <Badge key={m.display_name} variant="outline" className="text-xs">
                      {m.display_name}
                    </Badge>
                  ))}
                  {getModelsForTier('premium').length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{getModelsForTier('premium').length - 5} more
                    </Badge>
                  )}
                  {getModelsForTier('premium').length === 0 && (
                    <span className="text-xs text-slate-500">No models configured</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Section */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-3">How Credit Costs Work</h3>
          <div className="space-y-3 text-sm text-slate-700">
            <p>
              <strong>Credits are deducted per API call.</strong> When a user makes a request, the system
              checks which model tier is being used and deducts the corresponding credits.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="bg-white p-4 rounded-lg border">
                <div className="font-medium text-green-700 mb-1">Eco Tier</div>
                <p className="text-xs text-slate-600">
                  Fast, lightweight models ideal for simple tasks. Lower cost per call.
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <div className="font-medium text-blue-700 mb-1">Normal Tier</div>
                <p className="text-xs text-slate-600">
                  Balanced models for everyday use. Good quality at moderate cost.
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <div className="font-medium text-purple-700 mb-1">Premium Tier</div>
                <p className="text-xs text-slate-600">
                  Top-tier models (GPT-4, Claude Opus, etc.). Highest quality output.
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Changes take effect immediately for all new API calls. Existing conversations are not affected.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
