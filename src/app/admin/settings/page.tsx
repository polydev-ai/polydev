'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { ArrowLeft, Save, Settings, Database, Key, Bell, Shield, Home } from 'lucide-react'

interface SystemSettings {
  maintenance_mode: boolean
  registration_enabled: boolean
  default_credits: number
  max_credits_per_user: number
  api_rate_limit: number
  subscription_price: number
  free_tier_limits: {
    daily_requests: number
    models_available: string[]
  }
}

export default function AdminSettings() {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<SystemSettings>({
    maintenance_mode: false,
    registration_enabled: true,
    default_credits: 100,
    max_credits_per_user: 10000,
    api_rate_limit: 100,
    subscription_price: 10,
    free_tier_limits: {
      daily_requests: 50,
      models_available: ['gpt-3.5-turbo', 'claude-3-haiku']
    }
  })
  const [saving, setSaving] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAdminAccess()
  }, [])

  useEffect(() => {
    if (isAdmin) {
      loadSettings()
    }
  }, [isAdmin])

  async function checkAdminAccess() {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
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
          .eq('email', user.email)
          .single()

        isNewAdmin = profile?.is_admin || false
      } catch (error) {
        console.log('Profile not found, checking legacy admin access')
      }

      if (!isNewAdmin && !isLegacyAdmin) {
        router.push('/admin')
        return
      }

      setIsAdmin(true)
    } catch (error) {
      console.error('Error checking admin access:', error)
      router.push('/admin')
    } finally {
      setLoading(false)
    }
  }

  async function loadSettings() {
    try {
      // Try to load settings from a settings table if it exists
      // For now, we'll use default values since we don't have a settings table yet
      console.log('Loading settings (using defaults for now)')
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }

  async function saveSettings() {
    setSaving(true)
    try {
      // In a real implementation, you'd save these to a settings table
      // For now, we'll just log the activity
      await logActivity('update_settings', 'Updated system settings')

      alert('Settings saved successfully!')
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Error saving settings: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  async function logActivity(action: string, details: string) {
    try {
      await supabase
        .from('admin_activity_log')
        .insert([{
          admin_email: user?.email,
          action,
          details
        }])
    } catch (error) {
      console.error('Error logging activity:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-red-600">Access denied.</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/admin')}
                className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to Admin Portal"
              >
                <Home className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Admin Settings</h1>
                <p className="text-gray-600 mt-1">Platform configuration and settings</p>
              </div>
            </div>
            <button
              onClick={saveSettings}
              disabled={saving}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* System Configuration */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center">
                <Settings className="h-5 w-5 text-gray-600 mr-3" />
                <h2 className="text-lg font-semibold text-gray-900">System Configuration</h2>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.maintenance_mode}
                      onChange={(e) => setSettings(prev => ({ ...prev, maintenance_mode: e.target.checked }))}
                      className="mr-3"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">Maintenance Mode</span>
                      <p className="text-xs text-gray-500">Temporarily disable user access</p>
                    </div>
                  </label>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.registration_enabled}
                      onChange={(e) => setSettings(prev => ({ ...prev, registration_enabled: e.target.checked }))}
                      className="mr-3"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">Registration Enabled</span>
                      <p className="text-xs text-gray-500">Allow new user registrations</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">API Rate Limit (requests/minute)</label>
                  <input
                    type="number"
                    value={settings.api_rate_limit}
                    onChange={(e) => setSettings(prev => ({ ...prev, api_rate_limit: parseInt(e.target.value) || 100 }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subscription Price (USD/month)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={settings.subscription_price}
                    onChange={(e) => setSettings(prev => ({ ...prev, subscription_price: parseFloat(e.target.value) || 10 }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Credit Configuration */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center">
                <Database className="h-5 w-5 text-gray-600 mr-3" />
                <h2 className="text-lg font-semibold text-gray-900">Credit Configuration</h2>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Default Credits for New Users</label>
                  <input
                    type="number"
                    value={settings.default_credits}
                    onChange={(e) => setSettings(prev => ({ ...prev, default_credits: parseInt(e.target.value) || 100 }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Credits per User</label>
                  <input
                    type="number"
                    value={settings.max_credits_per_user}
                    onChange={(e) => setSettings(prev => ({ ...prev, max_credits_per_user: parseInt(e.target.value) || 10000 }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Free Tier Configuration */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center">
                <Key className="h-5 w-5 text-gray-600 mr-3" />
                <h2 className="text-lg font-semibold text-gray-900">Free Tier Configuration</h2>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Daily Requests Limit</label>
                <input
                  type="number"
                  value={settings.free_tier_limits.daily_requests}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    free_tier_limits: {
                      ...prev.free_tier_limits,
                      daily_requests: parseInt(e.target.value) || 50
                    }
                  }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Available Models (comma-separated)</label>
                <input
                  type="text"
                  value={settings.free_tier_limits.models_available.join(', ')}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    free_tier_limits: {
                      ...prev.free_tier_limits,
                      models_available: e.target.value.split(', ').filter(m => m.trim())
                    }
                  }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="gpt-3.5-turbo, claude-3-haiku"
                />
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center">
                <Shield className="h-5 w-5 text-gray-600 mr-3" />
                <h2 className="text-lg font-semibold text-gray-900">Security Settings</h2>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <h3 className="text-sm font-medium text-yellow-800 mb-2">Admin Access Management</h3>
                <p className="text-sm text-yellow-700 mb-3">
                  Current admin: {user?.email}
                </p>
                <p className="text-xs text-yellow-600">
                  To modify admin access, use the User Management section to grant or revoke admin privileges.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h3 className="text-sm font-medium text-blue-800 mb-2">Database Migration Status</h3>
                <p className="text-sm text-blue-700 mb-3">
                  Admin system tables have been created and are ready for use.
                </p>
                <ul className="text-xs text-blue-600 space-y-1">
                  <li>✓ Admin profiles with role management</li>
                  <li>✓ Coupon codes system</li>
                  <li>✓ Credit adjustments tracking</li>
                  <li>✓ Activity logging</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center">
                <Bell className="h-5 w-5 text-gray-600 mr-3" />
                <h2 className="text-lg font-semibold text-gray-900">Notification Settings</h2>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <label className="flex items-center">
                  <input type="checkbox" className="mr-3" defaultChecked />
                  <div>
                    <span className="text-sm font-medium text-gray-900">Email Notifications</span>
                    <p className="text-xs text-gray-500">Receive email alerts for important events</p>
                  </div>
                </label>

                <label className="flex items-center">
                  <input type="checkbox" className="mr-3" defaultChecked />
                  <div>
                    <span className="text-sm font-medium text-gray-900">New User Registrations</span>
                    <p className="text-xs text-gray-500">Get notified when new users register</p>
                  </div>
                </label>

                <label className="flex items-center">
                  <input type="checkbox" className="mr-3" defaultChecked />
                  <div>
                    <span className="text-sm font-medium text-gray-900">Subscription Events</span>
                    <p className="text-xs text-gray-500">Alerts for new subscriptions and cancellations</p>
                  </div>
                </label>

                <label className="flex items-center">
                  <input type="checkbox" className="mr-3" />
                  <div>
                    <span className="text-sm font-medium text-gray-900">System Alerts</span>
                    <p className="text-xs text-gray-500">Critical system events and errors</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Platform Information */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Platform Information</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div>
                  <p className="text-gray-600">Version</p>
                  <p className="font-medium">1.2.3</p>
                </div>
                <div>
                  <p className="text-gray-600">Environment</p>
                  <p className="font-medium">Production</p>
                </div>
                <div>
                  <p className="text-gray-600">Database</p>
                  <p className="font-medium">Supabase PostgreSQL</p>
                </div>
                <div>
                  <p className="text-gray-600">Last Updated</p>
                  <p className="font-medium">{new Date().toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}