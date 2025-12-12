'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useAuth } from '../../hooks/useAuth'
import { usePreferences } from '../../hooks/usePreferences'
import { createClient } from '../utils/supabase/client'
import { 
  User, 
  Bell, 
  Sliders, 
  Shield, 
  CreditCard, 
  Layers,
  Settings as SettingsIcon,
  Check,
  RefreshCw
} from 'lucide-react'

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
  const { preferences, updatePreferences, loading: preferencesLoading } = usePreferences()
  const [activeSection, setActiveSection] = useState('profile')
  const [profile, setProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [mcpMessage, setMcpMessage] = useState('')
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

  // Handle MCP preference updates
  const handleMCPSettingChange = useCallback(async (key: string, value: any) => {
    setMcpMessage('')

    try {
      const currentMcpSettings = preferences?.mcp_settings
      const updatedSettings = {
        default_temperature: currentMcpSettings?.default_temperature ?? 0.7,
        default_max_tokens: currentMcpSettings?.default_max_tokens ?? 4000,
        auto_select_model: currentMcpSettings?.auto_select_model ?? false,
        memory_settings: currentMcpSettings?.memory_settings ?? {
          enable_conversation_memory: true,
          enable_project_memory: true,
          max_conversation_history: 10,
          auto_extract_patterns: true
        },
        saved_chat_models: currentMcpSettings?.saved_chat_models,
        saved_mcp_models: currentMcpSettings?.saved_mcp_models,
        perspectives_per_message: currentMcpSettings?.perspectives_per_message,
        [key]: value
      }
      await updatePreferences({ mcp_settings: updatedSettings })
      setMcpMessage('MCP settings updated successfully!')
      setTimeout(() => setMcpMessage(''), 3000)
    } catch (error) {
      setMcpMessage('Failed to update MCP settings')
    }
  }, [preferences, updatePreferences])

  // Handle usage preference change
  const handleUsagePreferenceChange = useCallback(async (value: string) => {
    setMcpMessage('')
    
    try {
      await updatePreferences({ usage_preference: value as any })
      setMcpMessage('Usage preference updated!')
      setTimeout(() => setMcpMessage(''), 3000)
    } catch (error) {
      setMcpMessage('Failed to update usage preference')
    }
  }, [updatePreferences])

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
            <nav className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow sticky top-8">
              <div className="p-4">
                <h2 className="text-sm font-medium text-slate-600 uppercase tracking-wide mb-3">
                  Settings
                </h2>
                <ul className="space-y-1">
                  {[
                    { id: 'profile', label: 'Profile', icon: User },
                    { id: 'notifications', label: 'Notifications', icon: Bell },
                    { id: 'mcp', label: 'AI & MCP', icon: Sliders },
                  ].map((item) => (
                    <li key={item.id}>
                      <button
                        onClick={() => setActiveSection(item.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                          activeSection === item.id
                            ? 'font-medium text-slate-900 bg-slate-100'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <item.icon className="w-4 h-4" />
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
                
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <h2 className="text-sm font-medium text-slate-600 uppercase tracking-wide mb-3">
                    Dashboard
                  </h2>
                  <ul className="space-y-1">
                    {[
                      { href: '/dashboard/models', label: 'Models', icon: Layers },
                      { href: '/dashboard/billing', label: 'Billing', icon: CreditCard },
                      { href: '/dashboard/security', label: 'Security', icon: Shield },
                    ].map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                          <item.icon className="w-4 h-4" />
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </nav>
          </motion.div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            {/* Profile Section */}
            {activeSection === 'profile' && (
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

                {/* Action Buttons for Profile */}
                <motion.div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow" variants={itemVariants}>
                  <div className="px-6 py-4">
                    {message && (
                      <div className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${
                        message.includes('successfully')
                          ? 'bg-green-50 text-green-800 border border-green-200'
                          : 'bg-red-50 text-red-800 border border-red-200'
                      }`}>
                        {message.includes('successfully') ? <Check className="w-4 h-4" /> : null}
                        {message}
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <button
                        type="button"
                        onClick={deleteAccount}
                        className="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        Delete Account
                      </button>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="px-6 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </form>
            )}

            {/* Notifications Section */}
            {activeSection === 'notifications' && (
              <form onSubmit={updateProfile} className="space-y-8">
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

                {/* Save button for notifications */}
                <motion.div className="flex justify-end" variants={itemVariants}>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </motion.div>
              </form>
            )}

            {/* MCP & AI Settings Section */}
            {activeSection === 'mcp' && (
              <div className="space-y-8">
                {mcpMessage && (
                  <motion.div 
                    className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                      mcpMessage.includes('successfully') || mcpMessage.includes('updated')
                        ? 'bg-green-50 text-green-800 border border-green-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                    variants={itemVariants}
                  >
                    {mcpMessage.includes('successfully') || mcpMessage.includes('updated') ? <Check className="w-4 h-4" /> : null}
                    {mcpMessage}
                  </motion.div>
                )}

                {/* Usage Method Preference */}
                <motion.div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow" variants={itemVariants}>
                  <div className="px-6 py-4 border-b border-slate-200">
                    <h3 className="text-lg font-medium text-slate-900">Usage Method</h3>
                    <p className="text-sm text-slate-600">Choose how AI requests are processed</p>
                  </div>
                  <div className="px-6 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { value: 'auto', title: 'Auto', description: 'Smart fallback between API keys and credits', icon: '🔄' },
                        { value: 'api_keys', title: 'API Keys Only', description: 'Use your configured API keys', icon: '🔑' },
                        { value: 'credits', title: 'Credits Only', description: 'Use purchased platform credits', icon: '💰' },
                        { value: 'cli', title: 'CLI Tools', description: 'Prefer local CLI tools when available', icon: '💻' }
                      ].map((option) => (
                        <div
                          key={option.value}
                          onClick={() => handleUsagePreferenceChange(option.value)}
                          className={`relative cursor-pointer rounded-lg p-4 border transition-all ${
                            preferences?.usage_preference === option.value
                              ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <span className="text-2xl">{option.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-medium text-slate-900">{option.title}</h4>
                                {preferences?.usage_preference === option.value && (
                                  <Check className="w-4 h-4 text-slate-900" />
                                )}
                              </div>
                              <p className="text-xs text-slate-600 mt-1">{option.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>

                {/* MCP Client Settings */}
                <motion.div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow" variants={itemVariants}>
                  <div className="px-6 py-4 border-b border-slate-200">
                    <h3 className="text-lg font-medium text-slate-900">MCP Client Settings</h3>
                    <p className="text-sm text-slate-600">Configure default model parameters</p>
                  </div>
                  <div className="px-6 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          Default Temperature
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="2"
                          step="0.1"
                          value={preferences?.mcp_settings?.default_temperature ?? 0.7}
                          onChange={(e) => handleMCPSettingChange('default_temperature', parseFloat(e.target.value))}
                          disabled={preferencesLoading}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 bg-white disabled:opacity-50"
                        />
                        <p className="text-xs text-slate-600 mt-1">Controls randomness (0-2)</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          Default Max Tokens
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="32000"
                          value={preferences?.mcp_settings?.default_max_tokens ?? 4000}
                          onChange={(e) => handleMCPSettingChange('default_max_tokens', parseInt(e.target.value))}
                          disabled={preferencesLoading}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 bg-white disabled:opacity-50"
                        />
                        <p className="text-xs text-slate-600 mt-1">Maximum response length</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          Perspectives per Message
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={preferences?.mcp_settings?.perspectives_per_message ?? 2}
                          onChange={(e) => handleMCPSettingChange('perspectives_per_message', parseInt(e.target.value))}
                          disabled={preferencesLoading}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 bg-white disabled:opacity-50"
                        />
                        <p className="text-xs text-slate-600 mt-1">Models to query (1-10)</p>
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-200 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-slate-900">Auto-select Best Model</h4>
                          <p className="text-sm text-slate-600">Automatically choose optimal model based on request</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferences?.mcp_settings?.auto_select_model !== false}
                            onChange={(e) => handleMCPSettingChange('auto_select_model', e.target.checked)}
                            disabled={preferencesLoading}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900 peer-disabled:opacity-50"></div>
                        </label>
                      </div>

                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}