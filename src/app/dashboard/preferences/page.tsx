'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '../../../hooks/useAuth'
import { PROVIDERS } from '../../../types/providers'
import { Settings, Save, RefreshCw, Check, AlertCircle } from 'lucide-react'

interface UserPreferences {
  id?: string
  user_id: string
  default_provider: string
  default_model: string
  preferred_providers: string[]
  model_preferences: Record<string, string>
  mcp_settings: {
    default_temperature?: number
    default_max_tokens?: number
    auto_select_model?: boolean
    memory_settings?: {
      enable_conversation_memory?: boolean
      enable_project_memory?: boolean
      max_conversation_history?: number
      auto_extract_patterns?: boolean
    }
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
      
      setPreferences(data.preferences)
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

  const updateMemorySetting = (key: string, value: any) => {
    if (!preferences) return
    
    setPreferences(prev => ({
      ...prev!,
      mcp_settings: {
        ...prev!.mcp_settings,
        memory_settings: {
          ...prev!.mcp_settings.memory_settings,
          [key]: value
        }
      }
    }))
  }

  const updateModelPreference = (provider: string, model: string) => {
    if (!preferences) return
    
    setPreferences(prev => ({
      ...prev!,
      model_preferences: {
        ...prev!.model_preferences,
        [provider]: model
      }
    }))
  }

  const togglePreferredProvider = (provider: string) => {
    if (!preferences) return
    
    const currentProviders = preferences.preferred_providers || []
    const isIncluded = currentProviders.includes(provider)
    
    if (isIncluded) {
      updatePreference('preferred_providers', currentProviders.filter(p => p !== provider))
    } else {
      updatePreference('preferred_providers', [...currentProviders, provider])
    }
  }

  if (authLoading || loading) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  if (!preferences) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <Settings className="w-16 h-16 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Failed to load preferences</h3>
          <button 
            onClick={fetchPreferences}
            className="text-blue-600 hover:text-blue-800 flex items-center space-x-2 mx-auto"
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Model Preferences
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Configure your default models and preferences for MCP clients and API requests.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-6 flex items-center space-x-2">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
            <button 
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded mb-6 flex items-center space-x-2">
            <Check className="w-5 h-5" />
            <span>Preferences saved successfully!</span>
          </div>
        )}
      </div>

      <div className="space-y-8">
        {/* Default Settings */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            Default Settings
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Default Provider
              </label>
              <select
                value={preferences.default_provider}
                onChange={(e) => updatePreference('default_provider', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                {Object.entries(PROVIDERS).map(([id, config]) => (
                  <option key={id} value={id}>
                    {config.name} ({config.authType === 'api_key' ? 'API Key' : config.authType})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Used when no specific provider is requested
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Default Model
              </label>
              <select
                value={preferences.default_model}
                onChange={(e) => updatePreference('default_model', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                {Object.entries(PROVIDERS[preferences.default_provider]?.supportedModels || {}).map(([modelId, model]) => (
                  <option key={modelId} value={modelId}>
                    {modelId}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Used when no specific model is requested
              </p>
            </div>
          </div>
        </div>

        {/* MCP Settings */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            MCP Client Settings
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Default Temperature
              </label>
              <input
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={preferences.mcp_settings.default_temperature || 0.7}
                onChange={(e) => updateMCPSetting('default_temperature', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Controls randomness (0-2)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Default Max Tokens
              </label>
              <input
                type="number"
                min="1"
                max="32000"
                value={preferences.mcp_settings.default_max_tokens || 4000}
                onChange={(e) => updateMCPSetting('default_max_tokens', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Maximum response length
              </p>
            </div>

            <div>
              <label className="flex items-center space-x-2 mt-6">
                <input
                  type="checkbox"
                  checked={preferences.mcp_settings.auto_select_model !== false}
                  onChange={(e) => updateMCPSetting('auto_select_model', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Auto-select best model
                </span>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Automatically choose the best model based on request
              </p>
            </div>
          </div>
        </div>

        {/* Memory Settings */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Memory & Context Settings
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Control how Polydev remembers and uses conversation history and project context to provide better responses.
            </p>
          </div>
          
          {/* Conversation Memory Section */}
          <div className="border-b border-gray-200 dark:border-gray-700 pb-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Conversation Memory
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={preferences.mcp_settings.memory_settings?.enable_conversation_memory !== false}
                      onChange={(e) => updateMemorySetting('enable_conversation_memory', e.target.checked)}
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Enable Conversation Memory
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
                    Remember recent conversations across MCP sessions for better context continuity
                  </p>
                </div>
              </div>
              
              <div className="ml-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Max Conversation History
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={preferences.mcp_settings.memory_settings?.max_conversation_history || 10}
                    onChange={(e) => updateMemorySetting('max_conversation_history', parseInt(e.target.value))}
                    disabled={preferences.mcp_settings.memory_settings?.enable_conversation_memory === false}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[3ch]">
                    {preferences.mcp_settings.memory_settings?.max_conversation_history || 10}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>Less memory</span>
                  <span>More context, higher costs</span>
                </div>
              </div>
            </div>
          </div>

          {/* Project Memory Section */}
          <div className="border-b border-gray-200 dark:border-gray-700 pb-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Project Memory
            </h3>
            <div className="space-y-4">
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={preferences.mcp_settings.memory_settings?.enable_project_memory !== false}
                    onChange={(e) => updateMemorySetting('enable_project_memory', e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Enable Project Memory
                  </span>
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
                  Dynamically sync and remember project structure, dependencies, and context
                </p>
              </div>

              <div className="ml-6">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={preferences.mcp_settings.memory_settings?.auto_extract_patterns !== false}
                    onChange={(e) => updateMemorySetting('auto_extract_patterns', e.target.checked)}
                    disabled={preferences.mcp_settings.memory_settings?.enable_project_memory === false}
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Auto-extract Patterns & Decisions
                  </span>
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
                  Automatically identify and remember coding patterns, architectural decisions, and preferences
                </p>
              </div>
            </div>
          </div>

          {/* Memory Management */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Memory Management
            </h3>
            <div className="flex flex-wrap gap-3">
              <Link 
                href="/dashboard/memory" 
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                View Stored Memories
              </Link>
              <button 
                onClick={() => {/* TODO: Implement clear memories */}}
                className="inline-flex items-center px-4 py-2 border border-red-300 dark:border-red-600 rounded-md shadow-sm text-sm font-medium text-red-700 dark:text-red-300 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Clear All Memories
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Manage your stored conversation history and project memories
            </p>
          </div>
        </div>

        {/* Provider Preferences */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            Provider-Specific Models
          </h2>
          
          <div className="space-y-4">
            {Object.entries(PROVIDERS).map(([providerId, config]) => (
              <div key={providerId} className="flex items-center space-x-4 p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                <div className="flex-shrink-0">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={preferences.preferred_providers?.includes(providerId) || false}
                      onChange={() => togglePreferredProvider(providerId)}
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                      {config.name.charAt(0)}
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {config.name}
                    </span>
                  </label>
                </div>
                
                <div className="flex-1">
                  <select
                    value={preferences.model_preferences?.[providerId] || ''}
                    onChange={(e) => updateModelPreference(providerId, e.target.value)}
                    disabled={!preferences.preferred_providers?.includes(providerId)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                  >
                    <option value="">Select preferred model...</option>
                    {Object.entries(config.supportedModels || {}).map(([modelId, model]) => (
                      <option key={modelId} value={modelId}>
                        {modelId}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400">
                  {config.authType === 'api_key' ? 'API Key' : config.authType}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={savePreferences}
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
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