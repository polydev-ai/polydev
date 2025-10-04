'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '../../../hooks/useAuth'
import { Settings, Save, RefreshCw, Check, AlertCircle } from 'lucide-react'
import TierPriorityPicker from '../../../components/TierPriorityPicker'

interface UserPreferences {
  id?: string
  user_id: string
  usage_preference: 'auto' | 'api_keys' | 'credits' | 'cli'
  prefer_own_keys?: boolean
  mcp_settings: {
    default_temperature?: number
    default_max_tokens?: number
    auto_select_model?: boolean
    perspectives_per_message?: number
    use_cli_tools?: boolean
  }
}

export default function PreferencesPage() {
  const { user, loading: authLoading } = useAuth()
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (user) {
      fetchPreferences()
    }
  }, [user])

  const fetchPreferences = async () => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/preferences', {
        credentials: 'include'
      })
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch preferences')
      }
      
      // Ensure usage_preference has a default value if not set
      const preferencesWithDefaults = {
        ...data.preferences,
        usage_preference: data.preferences.usage_preference || 'auto'
      }
      setPreferences(preferencesWithDefaults)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const savePreferences = async () => {
    if (!preferences) return
    
    try {
      setSaving(true)
      
      const response = await fetch('/api/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(preferences)
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save preferences')
      }
      
      setPreferences(data.preferences)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const updatePreference = (key: keyof UserPreferences, value: any) => {
    if (!preferences) return
    
    setPreferences(prev => ({
      ...prev!,
      [key]: value
    }))
  }

  const updateMCPSetting = (key: string, value: any) => {
    if (!preferences) return
    
    setPreferences(prev => ({
      ...prev!,
      mcp_settings: {
        ...prev!.mcp_settings,
        [key]: value
      }
    }))
  }


  if (authLoading || loading) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3"></div>
          <div className="h-32 bg-slate-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!preferences) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="text-center text-slate-600">
          <Settings className="w-16 h-16 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Failed to load preferences</h3>
          <button
            onClick={fetchPreferences}
            className="text-slate-900 hover:text-slate-700 flex items-center space-x-2 mx-auto underline"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-4">
          General Preferences
        </h1>
        <p className="text-slate-600 mb-6">
          Configure your general preferences and MCP client settings. Model preferences are now managed on the <Link href="/dashboard/models" className="text-slate-900 hover:text-slate-700 underline">Models page</Link>.
        </p>

        {error && (
          <div className="bg-slate-50 border border-slate-200 text-slate-900 px-4 py-3 rounded mb-6 flex items-center space-x-2 font-medium">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-slate-600 hover:text-slate-900"
            >
              ×
            </button>
          </div>
        )}

        {success && (
          <div className="bg-slate-50 border border-slate-200 text-slate-900 px-4 py-3 rounded mb-6 flex items-center space-x-2 font-medium">
            <Check className="w-5 h-5" />
            <span>Preferences saved successfully!</span>
          </div>
        )}
      </div>

      <div className="space-y-8">
        {/* Default Settings */}
        <div className="bg-white shadow border border-slate-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">
            Default Settings
          </h2>

          <div className="text-sm text-slate-600 mb-4">
            Provider and model preferences are now managed in the <Link href="/dashboard/models" className="text-slate-900 hover:text-slate-700 underline">Models page</Link>.
          </div>

          {/* Usage Method Preference */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-slate-900 mb-3">
              Preferred Usage Method
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  value: 'auto',
                  title: 'Auto (Recommended)',
                  description: 'Use API keys when available, fallback to credits',
                  icon: '🔄'
                },
                {
                  value: 'api_keys',
                  title: 'Own API Keys',
                  description: 'Prefer your configured API keys',
                  icon: '🔑'
                },
                {
                  value: 'credits',
                  title: 'Credits',
                  description: 'Use purchased credits',
                  icon: '💰'
                },
                {
                  value: 'cli',
                  title: 'CLI Tools',
                  description: 'Use local CLI tools when possible',
                  icon: '💻'
                }
              ].map((option) => (
                <div
                  key={option.value}
                  onClick={() => updatePreference('usage_preference', option.value)}
                  className={`
                    relative cursor-pointer rounded-lg p-4 border transition-all
                    ${preferences.usage_preference === option.value
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-slate-200 hover:border-slate-300'
                    }
                  `}
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">{option.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <h4 className="text-sm font-medium text-slate-900">
                          {option.title}
                        </h4>
                        {preferences.usage_preference === option.value && (
                          <Check className="w-4 h-4 text-slate-900 ml-2" />
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        {option.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-md">
              <p className="text-xs text-slate-900">
                <strong>Auto (Recommended):</strong> Automatically uses your API keys when available and configured,
                falls back to credits when API keys are not available. This provides the best balance of cost and convenience.
              </p>
            </div>
          </div>

          {/* Prefer Own Keys Toggle */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="prefer_own_keys"
                checked={preferences.prefer_own_keys || false}
                onChange={(e) => updatePreference('prefer_own_keys', e.target.checked)}
                className="mt-1 rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-4 h-4"
              />
              <div className="flex-1">
                <label htmlFor="prefer_own_keys" className="block text-sm font-medium text-slate-900 cursor-pointer">
                  Use my API keys only
                </label>
                <p className="text-xs text-slate-600 mt-1">
                  When enabled, requests will only use your configured API keys and never fall back to platform credits.
                  This gives you complete control over which keys are used for your requests.
                </p>
                {preferences.prefer_own_keys && (
                  <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded">
                    <p className="text-xs text-slate-900">
                      ⚠️ <strong>Note:</strong> If all your API keys are unavailable (exceeded limits, disabled, or not configured),
                      requests will fail instead of using platform credits.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CLI Tools Toggle */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="use_cli_tools"
                checked={preferences.mcp_settings.use_cli_tools !== false}
                onChange={(e) => updateMCPSetting('use_cli_tools', e.target.checked)}
                className="mt-1 rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-4 h-4"
              />
              <div className="flex-1">
                <label htmlFor="use_cli_tools" className="block text-sm font-medium text-slate-900 cursor-pointer">
                  Enable CLI Tools Integration
                </label>
                <p className="text-xs text-slate-600 mt-1">
                  When enabled, the platform will detect and use local CLI tools (Claude Code, Cline, etc.) for MCP requests when available.
                  This provides faster response times and doesn't count against your API quota.
                </p>
                {preferences.mcp_settings.use_cli_tools !== false && (
                  <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded">
                    <p className="text-xs text-slate-900">
                      ℹ️ <strong>Note:</strong> CLI tools will only be used when they are detected and properly configured on your system.
                      The platform will automatically fallback to API-based models if CLI tools are unavailable.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* MCP Settings */}
        <div className="bg-white shadow border border-slate-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">
            MCP Client Settings
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">
                Default Temperature
              </label>
              <input
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={preferences.mcp_settings.default_temperature || 0.7}
                onChange={(e) => updateMCPSetting('default_temperature', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 bg-white"
              />
              <p className="text-xs text-slate-600 mt-1">
                Controls randomness (0-2)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">
                Default Max Tokens
              </label>
              <input
                type="number"
                min="1"
                max="32000"
                value={preferences.mcp_settings.default_max_tokens || 4000}
                onChange={(e) => updateMCPSetting('default_max_tokens', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 bg-white"
              />
              <p className="text-xs text-slate-600 mt-1">
                Maximum response length
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">
                Perspectives per Message
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={preferences.mcp_settings.perspectives_per_message || 2}
                onChange={(e) => updateMCPSetting('perspectives_per_message', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 bg-white"
              />
              <p className="text-xs text-slate-600 mt-1">
                Number of models to query (1-10)
              </p>
            </div>

            <div>
              <label className="flex items-center space-x-2 mt-6">
                <input
                  type="checkbox"
                  checked={preferences.mcp_settings.auto_select_model !== false}
                  onChange={(e) => updateMCPSetting('auto_select_model', e.target.checked)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <span className="text-sm font-medium text-slate-900">
                  Auto-select best model
                </span>
              </label>
              <p className="text-xs text-slate-600 mt-1">
                Automatically choose the best model based on request
              </p>
            </div>
          </div>
        </div>

        {/* Tier Fallback Priority */}
        <TierPriorityPicker />

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={savePreferences}
            disabled={saving}
            className="bg-slate-900 text-white px-6 py-3 rounded-lg hover:bg-slate-700 disabled:opacity-50 flex items-center space-x-2"
          >
            {saving ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Save Preferences</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}