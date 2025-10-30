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
  CreditCard
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
      price_cents_monthly: number
      price_cents_annual: number
      price_display_monthly: string
      price_display_annual: string
      stripe_price_id_monthly: string
      stripe_price_id_annual: string
      message_limit: number | null
      features: string[]
    }
    pro_tier: {
      name: string
      price_cents_monthly: number
      price_cents_annual: number
      price_display_monthly: string
      price_display_annual: string
      stripe_price_id_monthly: string
      stripe_price_id_annual: string
      message_limit: number | null
      features: string[]
    }
    enterprise_tier: {
      name: string
      price_cents_monthly: number
      price_cents_annual: number
      price_display_monthly: string
      price_display_annual: string
      stripe_price_id_monthly: string
      stripe_price_id_annual: string
      message_limit: number | null
      features: string[]
    }
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

  const updateSubscriptionPrice = (tier: 'free_tier' | 'plus_tier' | 'pro_tier' | 'enterprise_tier', field: string, value: any) => {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
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
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
              <DollarSign className="h-8 w-8 text-slate-900" />
              Pricing Management
            </h1>
            <p className="text-slate-600 mt-2">
              Manage subscription tiers, credit packages, and sync with Stripe
            </p>
          </div>
        </div>

        {message && (
          <Alert className="mb-6 border-slate-300">
            <CheckCircle className="h-4 w-4 text-slate-900" />
            <AlertDescription className="text-slate-900">
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

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
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
                      <Label htmlFor="free-messages">Messages/Month</Label>
                      <Input
                        id="free-messages"
                        type="number"
                        value={config.subscription_pricing.free_tier.message_limit}
                        onChange={(e) => updateSubscriptionPrice('free_tier', 'message_limit', parseInt(e.target.value))}
                      />
                    </div>
                    <div className="border-t pt-4">
                      <Label className="text-sm font-semibold mb-3 block">Perspective Allocations</Label>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="free-premium" className="text-xs">Premium Perspectives</Label>
                          <Input
                            id="free-premium"
                            type="number"
                            placeholder="10"
                            className="text-sm"
                            disabled
                          />
                        </div>
                        <div>
                          <Label htmlFor="free-normal" className="text-xs">Normal Perspectives</Label>
                          <Input
                            id="free-normal"
                            type="number"
                            placeholder="40"
                            className="text-sm"
                            disabled
                          />
                        </div>
                        <div>
                          <Label htmlFor="free-eco" className="text-xs">Eco Perspectives</Label>
                          <Input
                            id="free-eco"
                            type="number"
                            placeholder="150"
                            className="text-sm"
                            disabled
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Plus Tier */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Plus Plan
                      <div className="flex flex-col items-end gap-1">
                        <Badge className="bg-slate-900 text-white">
                          {config.subscription_pricing.plus_tier?.price_display_monthly || '$25'}/month
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {config.subscription_pricing.plus_tier?.price_display_annual || '$20'}/month annual
                        </Badge>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="plus-messages">Messages/Month</Label>
                      <Input
                        id="plus-messages"
                        value="Unlimited"
                        disabled
                        className="bg-slate-100"
                      />
                    </div>
                    <div className="border-t pt-4">
                      <Label className="text-sm font-semibold mb-3 block">Pricing (Editable)</Label>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="plus-price-monthly" className="text-xs">Monthly Price (cents)</Label>
                          <Input
                            id="plus-price-monthly"
                            type="number"
                            value={config.subscription_pricing.plus_tier?.price_cents_monthly}
                            onChange={(e) => {
                              const cents = parseInt(e.target.value)
                              const display = `$${(cents / 100).toFixed(0)}`
                              updateSubscriptionPrice('plus_tier', 'price_cents_monthly', cents)
                              updateSubscriptionPrice('plus_tier', 'price_display_monthly', display)
                            }}
                            placeholder="2500 = $25"
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label htmlFor="plus-price-annual" className="text-xs">Annual Price Per Month (cents)</Label>
                          <Input
                            id="plus-price-annual"
                            type="number"
                            value={config.subscription_pricing.plus_tier?.price_cents_annual}
                            onChange={(e) => {
                              const cents = parseInt(e.target.value)
                              const display = `$${(cents / 100).toFixed(0)}`
                              updateSubscriptionPrice('plus_tier', 'price_cents_annual', cents)
                              updateSubscriptionPrice('plus_tier', 'price_display_annual', display)
                            }}
                            placeholder="2000 = $20/month"
                            className="text-sm"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="border-t pt-4">
                      <Label className="text-sm font-semibold mb-3 block">Perspective Allocations</Label>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="plus-premium" className="text-xs">Premium Perspectives</Label>
                          <Input
                            id="plus-premium"
                            type="number"
                            placeholder="400"
                            className="text-sm"
                            disabled
                          />
                        </div>
                        <div>
                          <Label htmlFor="plus-normal" className="text-xs">Normal Perspectives</Label>
                          <Input
                            id="plus-normal"
                            type="number"
                            placeholder="1600"
                            className="text-sm"
                            disabled
                          />
                        </div>
                        <div>
                          <Label htmlFor="plus-eco" className="text-xs">Eco Perspectives</Label>
                          <Input
                            id="plus-eco"
                            type="number"
                            placeholder="4000"
                            className="text-sm"
                            disabled
                          />
                        </div>
                      </div>
                    </div>
                    <div className="border-t pt-4">
                      <Label className="text-sm font-semibold mb-3 block">Stripe Configuration</Label>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="plus-stripe-monthly" className="text-xs">Monthly Price ID</Label>
                          <Input
                            id="plus-stripe-monthly"
                            value={config.subscription_pricing.plus_tier?.stripe_price_id_monthly}
                            onChange={(e) => updateSubscriptionPrice('plus_tier', 'stripe_price_id_monthly', e.target.value)}
                            placeholder="price_monthly_xxx"
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label htmlFor="plus-stripe-annual" className="text-xs">Annual Price ID</Label>
                          <Input
                            id="plus-stripe-annual"
                            value={config.subscription_pricing.plus_tier?.stripe_price_id_annual}
                            onChange={(e) => updateSubscriptionPrice('plus_tier', 'stripe_price_id_annual', e.target.value)}
                            placeholder="price_annual_xxx"
                            className="text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Pro Tier */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Pro Plan
                      <div className="flex flex-col items-end gap-1">
                        <Badge className="bg-slate-900 text-white">
                          {config.subscription_pricing.pro_tier.price_display_monthly || '$60'}/month
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {config.subscription_pricing.pro_tier.price_display_annual || '$50'}/month annual
                        </Badge>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="pro-messages">Messages/Month</Label>
                      <Input
                        id="pro-messages"
                        value="Unlimited"
                        disabled
                        className="bg-slate-100"
                      />
                    </div>
                    <div className="border-t pt-4">
                      <Label className="text-sm font-semibold mb-3 block">Pricing (Editable)</Label>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="pro-price-monthly" className="text-xs">Monthly Price (cents)</Label>
                          <Input
                            id="pro-price-monthly"
                            type="number"
                            value={config.subscription_pricing.pro_tier.price_cents_monthly}
                            onChange={(e) => {
                              const cents = parseInt(e.target.value)
                              const display = `$${(cents / 100).toFixed(0)}`
                              updateSubscriptionPrice('pro_tier', 'price_cents_monthly', cents)
                              updateSubscriptionPrice('pro_tier', 'price_display_monthly', display)
                            }}
                            placeholder="6000 = $60"
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label htmlFor="pro-price-annual" className="text-xs">Annual Price Per Month (cents)</Label>
                          <Input
                            id="pro-price-annual"
                            type="number"
                            value={config.subscription_pricing.pro_tier.price_cents_annual}
                            onChange={(e) => {
                              const cents = parseInt(e.target.value)
                              const display = `$${(cents / 100).toFixed(0)}`
                              updateSubscriptionPrice('pro_tier', 'price_cents_annual', cents)
                              updateSubscriptionPrice('pro_tier', 'price_display_annual', display)
                            }}
                            placeholder="5000 = $50/month"
                            className="text-sm"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="border-t pt-4">
                      <Label className="text-sm font-semibold mb-3 block">Perspective Allocations</Label>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="pro-premium" className="text-xs">Premium Perspectives</Label>
                          <Input
                            id="pro-premium"
                            type="number"
                            placeholder="1200"
                            className="text-sm"
                            disabled
                          />
                        </div>
                        <div>
                          <Label htmlFor="pro-normal" className="text-xs">Normal Perspectives</Label>
                          <Input
                            id="pro-normal"
                            type="number"
                            placeholder="4800"
                            className="text-sm"
                            disabled
                          />
                        </div>
                        <div>
                          <Label htmlFor="pro-eco" className="text-xs">Eco Perspectives</Label>
                          <Input
                            id="pro-eco"
                            type="number"
                            placeholder="10000"
                            className="text-sm"
                            disabled
                          />
                        </div>
                      </div>
                    </div>
                    <div className="border-t pt-4">
                      <Label className="text-sm font-semibold mb-3 block">Stripe Configuration</Label>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="pro-stripe-monthly" className="text-xs">Monthly Price ID</Label>
                          <Input
                            id="pro-stripe-monthly"
                            value={config.subscription_pricing.pro_tier.stripe_price_id_monthly}
                            onChange={(e) => updateSubscriptionPrice('pro_tier', 'stripe_price_id_monthly', e.target.value)}
                            placeholder="price_monthly_xxx"
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label htmlFor="pro-stripe-annual" className="text-xs">Annual Price ID</Label>
                          <Input
                            id="pro-stripe-annual"
                            value={config.subscription_pricing.pro_tier.stripe_price_id_annual}
                            onChange={(e) => updateSubscriptionPrice('pro_tier', 'stripe_price_id_annual', e.target.value)}
                            placeholder="price_annual_xxx"
                            className="text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Enterprise Tier */}
                <Card className="border-2 border-slate-900">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Enterprise Plan
                      <div className="flex flex-col items-end gap-1">
                        <Badge className="bg-slate-900 text-white">
                          {config.subscription_pricing.enterprise_tier.price_display_monthly || '$60'}/month
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {config.subscription_pricing.enterprise_tier.price_display_annual || '$50'}/month annual
                        </Badge>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="enterprise-messages">Messages/Month</Label>
                      <Input
                        id="enterprise-messages"
                        value="Unlimited"
                        disabled
                        className="bg-slate-100"
                      />
                    </div>
                    <div className="border-t pt-4">
                      <Label className="text-sm font-semibold mb-3 block">Pricing (Editable)</Label>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="enterprise-price-monthly" className="text-xs">Monthly Price (cents)</Label>
                          <Input
                            id="enterprise-price-monthly"
                            type="number"
                            value={config.subscription_pricing.enterprise_tier.price_cents_monthly}
                            onChange={(e) => {
                              const cents = parseInt(e.target.value)
                              const display = `$${(cents / 100).toFixed(0)}`
                              updateSubscriptionPrice('enterprise_tier', 'price_cents_monthly', cents)
                              updateSubscriptionPrice('enterprise_tier', 'price_display_monthly', display)
                            }}
                            placeholder="6000 = $60"
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label htmlFor="enterprise-price-annual" className="text-xs">Annual Price Per Month (cents)</Label>
                          <Input
                            id="enterprise-price-annual"
                            type="number"
                            value={config.subscription_pricing.enterprise_tier.price_cents_annual}
                            onChange={(e) => {
                              const cents = parseInt(e.target.value)
                              const display = `$${(cents / 100).toFixed(0)}`
                              updateSubscriptionPrice('enterprise_tier', 'price_cents_annual', cents)
                              updateSubscriptionPrice('enterprise_tier', 'price_display_annual', display)
                            }}
                            placeholder="5000 = $50/month"
                            className="text-sm"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="border-t pt-4">
                      <Label className="text-sm font-semibold mb-3 block">Perspective Allocations</Label>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="enterprise-premium" className="text-xs">Premium Perspectives</Label>
                          <Input
                            id="enterprise-premium"
                            type="number"
                            placeholder="1200"
                            className="text-sm"
                            disabled
                          />
                        </div>
                        <div>
                          <Label htmlFor="enterprise-normal" className="text-xs">Normal Perspectives</Label>
                          <Input
                            id="enterprise-normal"
                            type="number"
                            placeholder="5000"
                            className="text-sm"
                            disabled
                          />
                        </div>
                        <div>
                          <Label htmlFor="enterprise-eco" className="text-xs">Eco Perspectives</Label>
                          <Input
                            id="enterprise-eco"
                            type="number"
                            placeholder="20000"
                            className="text-sm"
                            disabled
                          />
                        </div>
                      </div>
                    </div>
                    <div className="border-t pt-4">
                      <Label className="text-sm font-semibold mb-3 block">Stripe Configuration</Label>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="enterprise-stripe-monthly" className="text-xs">Monthly Price ID</Label>
                          <Input
                            id="enterprise-stripe-monthly"
                            value={config.subscription_pricing.enterprise_tier.stripe_price_id_monthly}
                            onChange={(e) => updateSubscriptionPrice('enterprise_tier', 'stripe_price_id_monthly', e.target.value)}
                            placeholder="price_monthly_xxx"
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label htmlFor="enterprise-stripe-annual" className="text-xs">Annual Price ID</Label>
                          <Input
                            id="enterprise-stripe-annual"
                            value={config.subscription_pricing.enterprise_tier.stripe_price_id_annual}
                            onChange={(e) => updateSubscriptionPrice('enterprise_tier', 'stripe_price_id_annual', e.target.value)}
                            placeholder="price_annual_xxx"
                            className="text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <Button
            onClick={syncWithStripe}
            disabled={saving}
            size="lg"
            className="bg-slate-900 hover:bg-slate-700 text-white"
          >
            {saving ? 'Syncing...' : 'Sync All Changes with Stripe'}
          </Button>
        </div>
      </div>
    </div>
  )
}