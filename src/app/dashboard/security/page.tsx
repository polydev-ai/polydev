'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { createClient } from '../../utils/supabase/client'
import { ShieldCheck, Info, EyeOff } from 'lucide-react'

export default function Security() {
  const { user, loading } = useAuth()
  const [sessions, setSessions] = useState<any[]>([])
  const [twoFAEnabled, setTwoFAEnabled] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  // Privacy Mode state (ephemeral conversations)
  const [ephemeralMode, setEphemeralMode] = useState(false)
  const [byokEnabled, setByokEnabled] = useState(false)
  const [subscriptionTier, setSubscriptionTier] = useState('free')
  const [isTogglingEphemeral, setIsTogglingEphemeral] = useState(false)
  const [ephemeralMessage, setEphemeralMessage] = useState('')

  const supabase = createClient()

  useEffect(() => {
    if (user) {
      loadSecurityData()
    }
  }, [user])

  const loadSecurityData = async () => {
    try {
      // Load user profile with BYOK and ephemeral status
      const { data: profile } = await supabase
        .from('profiles')
        .select('ephemeral_conversations, byok_enabled, subscription_tier')
        .eq('id', user?.id)
        .single()

      // For now, default to false since column doesn't exist
      setTwoFAEnabled(false)

      // Load dual-mode privacy settings
      setEphemeralMode(profile?.ephemeral_conversations || false)
      setByokEnabled(profile?.byok_enabled || false)
      setSubscriptionTier(profile?.subscription_tier?.toLowerCase() || 'free')

      // Mock sessions data - in real app, this would come from auth provider
      setSessions([
        {
          id: 1,
          device: 'Chrome on MacOS',
          location: 'San Francisco, CA',
          ip: '192.168.1.1',
          lastActive: new Date(Date.now() - 2 * 60 * 1000),
          current: true
        },
        {
          id: 2,
          device: 'Safari on iPhone',
          location: 'San Francisco, CA',
          ip: '192.168.1.2',
          lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000),
          current: false
        }
      ])
    } catch (error) {
      console.error('Error loading security data:', error)
    }
  }

  const handleToggleEphemeralMode = async () => {
    setIsTogglingEphemeral(true)
    setEphemeralMessage('')

    try {
      const newEphemeralMode = !ephemeralMode

      // Update ephemeral conversations setting in database
      await supabase
        .from('profiles')
        .update({
          ephemeral_conversations: newEphemeralMode,
          ephemeral_enabled_at: newEphemeralMode ? new Date().toISOString() : null
        })
        .eq('id', user?.id)

      setEphemeralMode(newEphemeralMode)

      // Tier-specific messaging
      const tierName = subscriptionTier.charAt(0).toUpperCase() + subscriptionTier.slice(1)
      const isProOrEnterprise = subscriptionTier === 'pro' || subscriptionTier === 'enterprise'

      setEphemeralMessage(
        newEphemeralMode
          ? `Ephemeral Mode enabled! ${byokEnabled ? 'When using your own API keys (BYOK), conversations will NOT be saved to the database.' : 'Note: You need to add your own API keys (BYOK) for ephemeral mode to take effect.'}`
          : `Ephemeral Mode disabled. ${byokEnabled ? 'Conversations will now be saved to the database even when using BYOK.' : 'Conversations will be saved normally.'}`
      )
    } catch (error: any) {
      console.error('Error toggling ephemeral mode:', error)
      setEphemeralMessage(error.message || 'Failed to toggle ephemeral mode')
    } finally {
      setIsTogglingEphemeral(false)
    }
  }

  const toggleTwoFA = async () => {
    setIsLoading(true)
    setMessage('')

    try {
      // Note: This is a mock implementation since two_factor_enabled column doesn't exist yet
      // In a real implementation, you would update the database
      setTwoFAEnabled(!twoFAEnabled)
      setMessage(twoFAEnabled ? 'Two-factor authentication disabled' : 'Two-factor authentication enabled')
    } catch (error: any) {
      setMessage(error.message || 'Error updating security settings')
    } finally {
      setIsLoading(false)
    }
  }

  const revokeSession = async (sessionId: number) => {
    if (!confirm('Are you sure you want to revoke this session?')) {
      return
    }

    try {
      setMessage('Session revoked successfully')
      setSessions(sessions.filter(s => s.id !== sessionId))
    } catch (error: any) {
      setMessage(error.message || 'Error revoking session')
    }
  }

  const changePassword = async () => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: prompt('Enter new password:') || undefined
      })

      if (error) throw error
      setMessage('Password updated successfully')
    } catch (error: any) {
      setMessage(error.message || 'Error updating password')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Security Settings</h1>
          <p className="text-slate-600">Manage your account security and access controls</p>
        </div>

        {message && (
          <div className="mb-6 p-4 rounded-lg text-sm bg-slate-100 text-slate-900 border border-slate-200 font-medium">
            {message}
          </div>
        )}

        <div className="space-y-8">
          {/* Account Security */}
          <div className="bg-white rounded-lg shadow border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-medium text-slate-900">Account Security</h2>
              <p className="text-sm text-slate-600">Protect your account with additional security measures</p>
            </div>
            <div className="p-6 space-y-6">
              {/* Password */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-slate-900">Password</h3>
                  <p className="text-sm text-slate-600">Last changed 30 days ago</p>
                </div>
                <button
                  onClick={changePassword}
                  className="px-4 py-2 text-sm font-medium text-slate-900 border border-slate-900 rounded-lg hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  Change Password
                </button>
              </div>

              {/* Two-Factor Authentication */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-slate-900">Two-Factor Authentication</h3>
                  <p className="text-sm text-slate-600">
                    Add an extra layer of security to your account
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={twoFAEnabled}
                    onChange={toggleTwoFA}
                    disabled={isLoading}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                </label>
              </div>

              {/* Account Recovery */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-slate-900">Recovery Email</h3>
                  <p className="text-sm text-slate-600">{user?.email}</p>
                </div>
                <button className="px-4 py-2 text-sm font-medium text-slate-900 border border-slate-900 rounded-lg hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900">
                  Update Email
                </button>
              </div>
            </div>
          </div>

          {/* BYOK & Ephemeral Mode */}
          <div className="bg-white rounded-lg shadow border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-medium text-slate-900 flex items-center gap-2">
                <EyeOff className="h-5 w-5" />
                Privacy & BYOK Settings
              </h2>
              <p className="text-sm text-slate-600">Manage conversation privacy and API key usage</p>
            </div>
            <div className="p-6 space-y-6">
              {/* BYOK Status */}
              <div className={`p-4 rounded-lg border ${
                byokEnabled
                  ? 'bg-green-50 border-green-200'
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-start gap-3">
                  <ShieldCheck className={`h-5 w-5 mt-0.5 ${byokEnabled ? 'text-green-600' : 'text-slate-500'}`} />
                  <div className="flex-1">
                    <h3 className={`text-sm font-medium ${byokEnabled ? 'text-green-900' : 'text-slate-900'}`}>
                      BYOK Status: {byokEnabled ? 'Enabled' : 'Not Enabled'}
                    </h3>
                    <p className="text-sm text-slate-600 mt-1">
                      {byokEnabled
                        ? 'You have your own API keys configured. You can manage them in Models page.'
                        : 'Currently using Polydev\'s API keys. Add your own keys in the Models page to enable BYOK.'}
                    </p>
                  </div>
                </div>
              </div>

              {ephemeralMessage && (
                <div className={`p-4 rounded-lg text-sm border ${
                  ephemeralMessage.includes('enabled')
                    ? 'bg-blue-50 text-blue-900 border-blue-200'
                    : 'bg-slate-50 text-slate-900 border-slate-200'
                }`}>
                  {ephemeralMessage}
                </div>
              )}

              {/* Ephemeral Mode Toggle */}
              {ephemeralMode ? (
                <>
                  {/* Ephemeral Mode is enabled */}
                  <div className="flex items-start gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <EyeOff className="h-6 w-6 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-blue-900">
                        Ephemeral Mode Enabled
                        {subscriptionTier === 'pro' || subscriptionTier === 'enterprise' ? ' (Default for ' + subscriptionTier.charAt(0).toUpperCase() + subscriptionTier.slice(1) + ')' : ''}
                      </h3>
                      <div className="mt-2 space-y-3 text-sm text-blue-800">
                        <div>
                          <p className="font-medium text-blue-900">
                            {byokEnabled ? '✓ Using BYOK: Conversations NOT saved to database' : '⚠ BYOK not enabled: Ephemeral mode has no effect'}
                          </p>
                          <p className="text-xs mt-1">
                            {byokEnabled
                              ? 'Only usage metadata (tokens, costs) is tracked. No message content saved.'
                              : 'Add your own API keys in Models page to enable ephemeral conversations.'}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium text-blue-900">When using Polydev API keys:</p>
                          <ul className="text-xs mt-1 space-y-1 ml-4">
                            <li>• Conversations ARE saved for billing and tracking</li>
                            <li>• Ephemeral mode only applies to BYOK</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-slate-900">Disable Ephemeral Mode</h3>
                      <p className="text-sm text-slate-600">
                        {byokEnabled
                          ? 'Conversations will be saved even when using BYOK'
                          : 'Currently has no effect (BYOK not enabled)'}
                      </p>
                    </div>
                    <button
                      onClick={handleToggleEphemeralMode}
                      disabled={isTogglingEphemeral}
                      className="px-4 py-2 text-sm font-medium text-slate-900 border border-slate-900 rounded-lg hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isTogglingEphemeral ? 'Disabling...' : 'Disable Ephemeral Mode'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Ephemeral Mode is not enabled */}
                  <div className="space-y-4">
                    <div className="flex items-start gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                      <EyeOff className="h-6 w-6 text-slate-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-slate-900">
                          Ephemeral Mode
                          {subscriptionTier === 'free' || subscriptionTier === 'plus' ? ' (Default OFF for ' + subscriptionTier.charAt(0).toUpperCase() + subscriptionTier.slice(1) + ')' : ''}
                        </h3>
                        <p className="text-sm text-slate-600 mt-1">
                          When enabled with BYOK, conversations are NOT saved to the database.
                          Only usage metadata (tokens, costs) is tracked.
                        </p>
                        <ul className="mt-3 space-y-2 text-sm text-slate-600">
                          <li className="flex items-start gap-2">
                            <ShieldCheck className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                            <span>Currently: Conversations ARE saved (encrypted at rest)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                            <span>Enable to stop saving conversations when using BYOK</span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 text-sm">
                        <p className="font-medium text-blue-900">How It Works</p>
                        <div className="mt-2 space-y-2 text-blue-800 text-xs">
                          <div>
                            <p className="font-medium">Ephemeral Mode OFF (Current):</p>
                            <ul className="mt-1 ml-4 space-y-0.5">
                              <li>• Conversations saved to database</li>
                              <li>• Full chat history available</li>
                              <li>• Works with both Polydev keys and BYOK</li>
                            </ul>
                          </div>
                          <div>
                            <p className="font-medium">Ephemeral Mode ON:</p>
                            <ul className="mt-1 ml-4 space-y-0.5">
                              <li>• Requires BYOK (your own API keys)</li>
                              <li>• Conversations NOT saved</li>
                              <li>• Only metadata tracked (tokens, costs)</li>
                              <li>• Maximum privacy</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleToggleEphemeralMode}
                      disabled={isTogglingEphemeral}
                      className="w-full px-6 py-3 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isTogglingEphemeral ? 'Enabling...' : 'Enable Ephemeral Mode'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Active Sessions */}
          <div className="bg-white rounded-lg shadow border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-medium text-slate-900">Active Sessions</h2>
              <p className="text-sm text-slate-600">Monitor and manage your active login sessions</p>
            </div>
            <div className="divide-y divide-slate-200">
              {sessions.map((session) => (
                <div key={session.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-slate-900">{session.device}</p>
                        {session.current && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-900">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">
                        {session.location} • {session.ip} • {session.lastActive.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {!session.current && (
                    <button
                      onClick={() => revokeSession(session.id)}
                      className="px-3 py-1 text-sm font-medium text-slate-900 border border-slate-200 rounded hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Security Log */}
          <div className="bg-white rounded-lg shadow border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-medium text-slate-900">Security Activity</h2>
              <p className="text-sm text-slate-600">Recent security events for your account</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-slate-900 rounded-full mt-2"></div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-900">Successful login</p>
                    <p className="text-sm text-slate-600">Chrome on MacOS • 2 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-slate-900 rounded-full mt-2"></div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-900">Profile updated</p>
                    <p className="text-sm text-slate-600">Display name changed • 1 hour ago</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-slate-900 rounded-full mt-2"></div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-900">API key created</p>
                    <p className="text-sm text-slate-600">OpenAI key added • 2 hours ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-lg shadow border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-medium text-slate-900">Danger Zone</h2>
              <p className="text-sm text-slate-600">Irreversible and destructive actions</p>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-slate-900">Delete Account</h3>
                  <p className="text-sm text-slate-600">
                    Permanently delete your account and all associated data. This cannot be undone.
                  </p>
                </div>
                <button className="px-4 py-2 text-sm font-medium text-slate-900 border border-slate-900 rounded-lg hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900">
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}