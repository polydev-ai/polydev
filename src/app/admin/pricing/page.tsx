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
  DollarSign,
  Edit,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  CreditCard,
  Coins
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface PricingConfig {
  subscription_pricing: {
    free_tier: {
      name: string
      price_cents: number
      price_display: string
      message_limit: number
      credits_allocation: number
      features: string[]
      limitations: string[]
    }
    plus_tier: {
      name: string
      price_cents: number
      price_display: string
      billing_interval: string
      stripe_price_id_monthly: string
      stripe_price_id_annual: string
      message_limit: number | null
      credits_allocation: number
      features: string[]
    }
    pro_tier: {
      name: string
      price_cents: number
      price_display: string
      billing_interval: string
      stripe_price_id_monthly: string
      stripe_price_id_annual: string
      message_limit: number | null
      credits_allocation: number
      features: string[]
    }
  }
  credit_packages: {
    packages: Array<{
      name: string
      credits: number
      price_cents: number
      price_display: string
      stripe_price_id: string
    }>
  }
}

export default function AdminPricing() {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState<PricingConfig | null>(null)
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAdminAccess()
    loadPricingConfig()
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

  const loadPricingConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_pricing_config')
        .select('*')

      if (error) throw error

      const configObj: any = {}
      data?.forEach(item => {
        configObj[item.config_key] = item.config_value
      })

      setConfig(configObj as PricingConfig)
    } catch (error) {
      console.error('Error loading pricing config:', error)
      setMessage({ type: 'error', text: 'Failed to load pricing configuration' })
    }
  }

  const updateConfig = async (configKey: string, newValue: any) => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('admin_pricing_config')
        .update({
          config_value: newValue,
          updated_by: user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('config_key', configKey)

      if (error) throw error

      // Update local state
      setConfig(prev => prev ? {
        ...prev,
        [configKey]: newValue
      } : null)

      setMessage({ type: 'success', text: 'Configuration updated successfully!' })
      setEditingSection(null)

      // Sync with Stripe if needed
      if (configKey === 'subscription_pricing' || configKey === 'credit_packages') {
        await syncWithStripe()
      }

    } catch (error) {
      console.error('Error updating config:', error)
      setMessage({ type: 'error', text: 'Failed to update configuration' })
    } finally {
      setSaving(false)
    }
  }

  const syncWithStripe = async () => {
    try {
      const response = await fetch('/api/admin/pricing/sync-stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        throw new Error('Failed to sync with Stripe')
      }

      setMessage({ type: 'success', text: 'Successfully synced with Stripe!' })
    } catch (error) {
      console.error('Error syncing with Stripe:', error)
      setMessage({ type: 'error', text: 'Failed to sync with Stripe' })
    }
  }

  const updateSubscriptionPrice = (tier: 'free_tier' | 'pro_tier', field: string, value: any) => {
    if (!config) return

    const newConfig = {
      ...config.subscription_pricing,
      [tier]: {
        ...config.subscription_pricing[tier],
        [field]: value
      }
    }

    updateConfig('subscription_pricing', newConfig)
  }

  const updateCreditPackage = (packageIndex: number, field: string, value: any) => {
    if (!config) return

    const newPackages = [...config.credit_packages.packages]
    newPackages[packageIndex] = {
      ...newPackages[packageIndex],
      [field]: value
    }

    updateConfig('credit_packages', {
      packages: newPackages
    })
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
              <DollarSign className="h-8 w-8 text-green-600" />
              Pricing Management
            </h1>
            <p className="text-gray-600 mt-2">
              Manage subscription tiers, credit packages, and sync with Stripe
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

        {config && (
          <div className="grid grid-cols-1 gap-8">
            {/* Subscription Tiers */}
            <div>
              <h2 className="text-2xl font-semibold flex items-center gap-2 mb-6">
                <CreditCard className="h-6 w-6" />
                Subscription Tiers
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Free Tier */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Free Plan
                      <Badge variant="secondary">$0</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="free-messages">Message Limit</Label>
                      <Input
                        id="free-messages"
                        type="number"
                        value={config.subscription_pricing.free_tier.message_limit}
                        onChange={(e) => updateSubscriptionPrice('free_tier', 'message_limit', parseInt(e.target.value))}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Plus Tier */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Plus Plan
                      <Badge className="bg-orange-500 text-white">
                        {config.subscription_pricing.plus_tier?.price_display}/month
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="plus-price">Price (cents)</Label>
                        <Input
                          id="plus-price"
                          type="number"
                          value={config.subscription_pricing.plus_tier?.price_cents}
                          onChange={(e) => {
                            const cents = parseInt(e.target.value)
                            const display = `$${(cents / 100).toFixed(0)}`
                            updateSubscriptionPrice('plus_tier' as any, 'price_cents', cents)
                            updateSubscriptionPrice('plus_tier' as any, 'price_display', display)
                          }}
                        />
                      </div>
                      <div>
                        <Label htmlFor="plus-messages">Messages/Month</Label>
                        <Input
                          id="plus-messages"
                          value="Unlimited"
                          disabled
                          className="bg-gray-100"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="plus-stripe-id">Stripe Price ID</Label>
                      <Input
                        id="plus-stripe-id"
                        value={config.subscription_pricing.plus_tier?.stripe_price_id_monthly}
                        onChange={(e) => updateSubscriptionPrice('plus_tier' as any, 'stripe_price_id_monthly', e.target.value)}
                        placeholder="price_1234567890"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Pro Tier */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Pro Plan
                      <Badge className="bg-purple-500 text-white">
                        {config.subscription_pricing.pro_tier.price_display}/month
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="pro-price">Price (cents)</Label>
                        <Input
                          id="pro-price"
                          type="number"
                          value={config.subscription_pricing.pro_tier.price_cents}
                          onChange={(e) => {
                            const cents = parseInt(e.target.value)
                            const display = `$${(cents / 100).toFixed(0)}`
                            updateSubscriptionPrice('pro_tier', 'price_cents', cents)
                            updateSubscriptionPrice('pro_tier', 'price_display', display)
                          }}
                        />
                      </div>
                      <div>
                        <Label htmlFor="pro-messages">Messages/Month</Label>
                        <Input
                          id="pro-messages"
                          value="Unlimited"
                          disabled
                          className="bg-gray-100"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="pro-stripe-id">Stripe Price ID</Label>
                      <Input
                        id="pro-stripe-id"
                        value={config.subscription_pricing.pro_tier.stripe_price_id_monthly}
                        onChange={(e) => updateSubscriptionPrice('pro_tier', 'stripe_price_id_monthly', e.target.value)}
                        placeholder="price_1234567890"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Credit Packages */}
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <Coins className="h-6 w-6" />
                Credit Packages
              </h2>

              {config.credit_packages.packages.map((pkg, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {pkg.name}
                      <Badge variant="outline">{pkg.price_display}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`package-${index}-credits`}>Credits</Label>
                        <Input
                          id={`package-${index}-credits`}
                          type="number"
                          value={pkg.credits}
                          onChange={(e) => updateCreditPackage(index, 'credits', parseInt(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`package-${index}-price`}>Price (cents)</Label>
                        <Input
                          id={`package-${index}-price`}
                          type="number"
                          value={pkg.price_cents}
                          onChange={(e) => {
                            const cents = parseInt(e.target.value)
                            const display = `$${(cents / 100).toFixed(2)}`
                            updateCreditPackage(index, 'price_cents', cents)
                            updateCreditPackage(index, 'price_display', display)
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor={`package-${index}-name`}>Package Name</Label>
                      <Input
                        id={`package-${index}-name`}
                        value={pkg.name}
                        onChange={(e) => updateCreditPackage(index, 'name', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`package-${index}-stripe-id`}>Stripe Price ID</Label>
                      <Input
                        id={`package-${index}-stripe-id`}
                        value={pkg.stripe_price_id}
                        onChange={(e) => updateCreditPackage(index, 'stripe_price_id', e.target.value)}
                        placeholder="price_1234567890"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <Button
            onClick={syncWithStripe}
            disabled={saving}
            size="lg"
            className="bg-green-600 hover:bg-green-700"
          >
            {saving ? 'Syncing...' : 'Sync All Changes with Stripe'}
          </Button>
        </div>
      </div>
    </div>
  )
}