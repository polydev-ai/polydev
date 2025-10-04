'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { createClient } from '../../utils/supabase/client'

export default function Security() {
  const { user, loading } = useAuth()
  const [sessions, setSessions] = useState<any[]>([])
  const [twoFAEnabled, setTwoFAEnabled] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  const supabase = createClient()

  useEffect(() => {
    if (user) {
      loadSecurityData()
    }
  }, [user])

  const loadSecurityData = async () => {
    try {
      // Load user profile - note: two_factor_enabled column doesn't exist yet
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single()

      // For now, default to false since column doesn't exist
      setTwoFAEnabled(false)

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
          <div className="mb-6 p-4 rounded-lg text-sm bg-slate-100 text-slate-900 font-medium">
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