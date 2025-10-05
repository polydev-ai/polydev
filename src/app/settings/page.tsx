'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useAuth } from '../../hooks/useAuth'
import { useMemorySettings } from '../../hooks/useMemorySettings'
import { createClient } from '../utils/supabase/client'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
}

// Global cache for settings data
const settingsCache = {
  profile: null as any,
  timestamp: 0,
  CACHE_DURATION: 3 * 60 * 1000, // 3 minutes
}

export default function Settings() {
  const { user, loading } = useAuth()
  const { memorySettings, updateMemorySettings, loading: memoryLoading } = useMemorySettings()
  const [profile, setProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [memoryMessage, setMemoryMessage] = useState('')
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    company: '',
    role: '',
    timezone: '',
    theme: 'system',
    emailNotifications: true,
    securityNotifications: true,
    marketingEmails: false
  })
  const isMountedRef = useRef(true)

  const supabase = createClient()

  // Memoized profile loading with caching
  const loadProfile = useCallback(async () => {
    if (!user?.id) return

    // Check cache first
    const now = Date.now()
    if (settingsCache.profile &&
        (now - settingsCache.timestamp) < settingsCache.CACHE_DURATION) {
      const cached = settingsCache.profile
      setProfile(cached)
      setFormData({
        displayName: cached.display_name || '',
        email: user?.email || '',
        company: cached.company || '',
        role: cached.role || '',
        timezone: cached.timezone || '',
        theme: cached.theme || 'system',
        emailNotifications: cached.email_notifications ?? true,
        securityNotifications: cached.security_notifications ?? true,
        marketingEmails: cached.marketing_emails ?? false
      })
      return
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data && isMountedRef.current) {
        // Update cache
        settingsCache.profile = data
        settingsCache.timestamp = now

        setProfile(data)
        setFormData({
          displayName: data.display_name || '',
          email: user?.email || '',
          company: data.company || '',
          role: data.role || '',
          timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          theme: data.theme || 'system',
          emailNotifications: data.email_notifications ?? true,
          securityNotifications: data.security_notifications ?? true,
          marketingEmails: data.marketing_emails ?? false
        })
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }, [user, supabase])

  // Optimized useEffect with cleanup
  useEffect(() => {
    isMountedRef.current = true
    if (user) {
      loadProfile()
    }

    return () => {
      isMountedRef.current = false
    }
  }, [user, loadProfile])

  // Memoized form handlers to prevent re-renders
  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const updateProfile = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user?.id,
          email: user?.email || formData.email,
          display_name: formData.displayName,
          company: formData.company,
          role: formData.role,
          timezone: formData.timezone,
          theme: formData.theme,
          email_notifications: formData.emailNotifications,
          security_notifications: formData.securityNotifications,
          marketing_emails: formData.marketingEmails,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      // Clear cache after successful update
      settingsCache.profile = null
      settingsCache.timestamp = 0

      setMessage('Profile updated successfully!')
      await loadProfile()
    } catch (error: any) {
      setMessage(error.message || 'Error updating profile')
    } finally {
      setIsLoading(false)
    }
  }, [user, formData, supabase, loadProfile])

  const handleMemorySettingChange = useCallback(async (setting: keyof typeof memorySettings, value: boolean | number) => {
    setMemoryMessage('')

    try {
      const result = await updateMemorySettings({ [setting]: value })
      if (result.success) {
        setMemoryMessage('Memory settings updated successfully!')
      } else {
        setMemoryMessage(result.error || 'Failed to update memory settings')
      }
    } catch (error) {
      setMemoryMessage('Failed to update memory settings')
    }
  }, [updateMemorySettings])

  // Memoized computations for UI state
  const memoizedState = useMemo(() => {
    const isFormValid = formData.displayName.trim().length > 0
    const hasChanges = profile && (
      profile.display_name !== formData.displayName ||
      profile.company !== formData.company ||
      profile.role !== formData.role ||
      profile.timezone !== formData.timezone ||
      profile.theme !== formData.theme ||
      profile.email_notifications !== formData.emailNotifications ||
      profile.security_notifications !== formData.securityNotifications ||
      profile.marketing_emails !== formData.marketingEmails
    )

    return {
      isFormValid,
      hasChanges,
      showSaveButton: isFormValid && hasChanges && !isLoading
    }
  }, [formData, profile, isLoading])

  const deleteAccount = useCallback(async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return
    }

    const confirmText = prompt('Type "DELETE" to confirm account deletion:')
    if (confirmText !== 'DELETE') {
      return
    }

    try {
      setIsLoading(true)
      
      // Delete profile data
      await supabase
        .from('profiles')
        .delete()
        .eq('id', user?.id)

      // Delete user account
      const { error } = await supabase.auth.admin.deleteUser(user?.id!)
      
      if (error) throw error
      
      alert('Account deleted successfully. You will be redirected to the home page.')
      window.location.href = '/'
    } catch (error: any) {
      setMessage(error.message || 'Error deleting account')
      setIsLoading(false)
    }
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    )
  }

  return (
    <motion.div
      className="min-h-screen bg-white py-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div className="bg-white rounded-lg shadow mb-8 hover:shadow-lg transition-shadow" variants={itemVariants}>
          <div className="px-6 py-4 border-b border-slate-200">
            <h1 className="text-2xl font-bold text-slate-900">Account Settings</h1>
            <p className="text-slate-600">Manage your account preferences and profile information</p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Navigation */}
          <motion.div className="lg:col-span-1" variants={itemVariants}>
            <nav className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="p-4">
                <h2 className="text-sm font-medium text-slate-600 uppercase tracking-wide mb-3">
                  Settings
                </h2>
                <ul className="space-y-2">
                  <li>
                    <button className="w-full text-left px-3 py-2 text-sm font-medium text-slate-900 bg-slate-100 rounded-lg">
                      Profile
                    </button>
                  </li>
                  <li>
                    <Link
                      href="/dashboard/models"
                      className="w-full inline-block text-left px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      Models
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/dashboard/billing"
                      className="w-full inline-block text-left px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      Billing
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/dashboard/security"
                      className="w-full inline-block text-left px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      Security
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/dashboard/memory"
                      className="w-full inline-block text-left px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      Memory
                    </Link>
                  </li>
                </ul>
              </div>
            </nav>
          </motion.div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <form onSubmit={updateProfile} className="space-y-8">
              {/* Profile Information */}
              <motion.div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow" variants={itemVariants}>
                <div className="px-6 py-4 border-b border-slate-200">
                  <h3 className="text-lg font-medium text-slate-900">Profile Information</h3>
                  <p className="text-sm text-slate-600">Update your personal details and preferences</p>
                </div>
                <div className="px-6 py-4 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="displayName" className="block text-sm font-medium text-slate-900 mb-2">
                        Display Name
                      </label>
                      <input
                        type="text"
                        id="displayName"
                        value={formData.displayName}
                        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                        placeholder="Your display name"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-slate-900 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={formData.email}
                        disabled
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-500"
                      />
                      <p className="text-xs text-slate-600 mt-1">Email cannot be changed</p>
                    </div>
                    <div>
                      <label htmlFor="company" className="block text-sm font-medium text-slate-900 mb-2">
                        Company
                      </label>
                      <input
                        type="text"
                        id="company"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                        placeholder="Your company name"
                      />
                    </div>
                    <div>
                      <label htmlFor="role" className="block text-sm font-medium text-slate-900 mb-2">
                        Role
                      </label>
                      <select
                        id="role"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                      >
                        <option value="">Select your role</option>
                        <option value="developer">Developer</option>
                        <option value="data-scientist">Data Scientist</option>
                        <option value="product-manager">Product Manager</option>
                        <option value="researcher">Researcher</option>
                        <option value="student">Student</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="timezone" className="block text-sm font-medium text-slate-900 mb-2">
                        Timezone
                      </label>
                      <select
                        id="timezone"
                        value={formData.timezone}
                        onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                      >
                        <option value="America/New_York">Eastern Time (EST)</option>
                        <option value="America/Chicago">Central Time (CST)</option>
                        <option value="America/Denver">Mountain Time (MST)</option>
                        <option value="America/Los_Angeles">Pacific Time (PST)</option>
                        <option value="Europe/London">London (GMT)</option>
                        <option value="Europe/Paris">Paris (CET)</option>
                        <option value="Asia/Tokyo">Tokyo (JST)</option>
                        <option value="Asia/Shanghai">Shanghai (CST)</option>
                        <option value="UTC">UTC</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="theme" className="block text-sm font-medium text-slate-900 mb-2">
                        Theme Preference
                      </label>
                      <select
                        id="theme"
                        value={formData.theme}
                        onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                      >
                        <option value="system">System Default</option>
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                      </select>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Notification Preferences */}
              <motion.div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow" variants={itemVariants}>
                <div className="px-6 py-4 border-b border-slate-200">
                  <h3 className="text-lg font-medium text-slate-900">Notification Preferences</h3>
                  <p className="text-sm text-slate-600">Manage how you receive notifications</p>
                </div>
                <div className="px-6 py-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-slate-900">Email Notifications</h4>
                      <p className="text-sm text-slate-600">Receive notifications about your account activity</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.emailNotifications}
                        onChange={(e) => setFormData({ ...formData, emailNotifications: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-slate-900">Security Notifications</h4>
                      <p className="text-sm text-slate-600">Receive alerts about security events</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.securityNotifications}
                        onChange={(e) => setFormData({ ...formData, securityNotifications: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-slate-900">Marketing Emails</h4>
                      <p className="text-sm text-slate-600">Receive updates about new features and promotions</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.marketingEmails}
                        onChange={(e) => setFormData({ ...formData, marketingEmails: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                    </label>
                  </div>
                </div>
              </motion.div>

              {/* Memory Settings */}
              <motion.div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow" variants={itemVariants}>
                <div className="px-6 py-4 border-b border-slate-200">
                  <h3 className="text-lg font-medium text-slate-900">Memory Settings</h3>
                  <p className="text-sm text-slate-600">Configure how AI remembers your conversations and projects</p>
                </div>
                <div className="px-6 py-4 space-y-6">
                  {memoryMessage && (
                    <div className={`p-3 rounded-lg text-sm ${
                      memoryMessage.includes('successfully')
                        ? 'bg-slate-100 text-slate-900'
                        : 'bg-slate-100 text-slate-900'
                    }`}>
                      {memoryMessage}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-slate-900">Conversation Memory</h4>
                        <p className="text-sm text-slate-600">Remember conversations to provide better context in future chats</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={memorySettings.enable_conversation_memory}
                          onChange={(e) => handleMemorySettingChange('enable_conversation_memory', e.target.checked)}
                          disabled={memoryLoading}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900 peer-disabled:opacity-50"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-slate-900">Project Memory</h4>
                        <p className="text-sm text-slate-600">Remember project-specific information and patterns</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={memorySettings.enable_project_memory}
                          onChange={(e) => handleMemorySettingChange('enable_project_memory', e.target.checked)}
                          disabled={memoryLoading}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900 peer-disabled:opacity-50"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-slate-900">Auto-Extract Patterns</h4>
                        <p className="text-sm text-slate-600">Automatically identify and learn from recurring patterns</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={memorySettings.auto_extract_patterns}
                          onChange={(e) => handleMemorySettingChange('auto_extract_patterns', e.target.checked)}
                          disabled={memoryLoading}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900 peer-disabled:opacity-50"></div>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="max-conversation-history" className="block text-sm font-medium text-slate-900 mb-2">
                          Max Conversation History
                        </label>
                        <select
                          id="max-conversation-history"
                          value={memorySettings.max_conversation_history}
                          onChange={(e) => handleMemorySettingChange('max_conversation_history', parseInt(e.target.value))}
                          disabled={memoryLoading}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent disabled:opacity-50"
                        >
                          <option value={5}>5 conversations</option>
                          <option value={10}>10 conversations</option>
                          <option value={20}>20 conversations</option>
                          <option value={50}>50 conversations</option>
                          <option value={100}>100 conversations</option>
                        </select>
                        <p className="text-xs text-slate-600 mt-1">Number of recent conversations to remember</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Action Buttons */}
              <motion.div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow" variants={itemVariants}>
                <div className="px-6 py-4">
                  {message && (
                    <div className={`mb-4 p-3 rounded-lg text-sm ${
                      message.includes('successfully')
                        ? 'bg-slate-100 text-slate-900'
                        : 'bg-slate-100 text-slate-900'
                    }`}>
                      {message}
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <button
                      type="button"
                      onClick={deleteAccount}
                      className="px-4 py-2 text-sm font-medium text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    >
                      Delete Account
                    </button>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-6 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </form>
          </div>
        </div>
      </div>
    </motion.div>
  )
}