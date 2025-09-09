'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { createClient } from '../../utils/supabase/client'

interface ApiKey {
  id: string
  provider: 'openai' | 'anthropic' | 'google'
  key_name: string | null
  active: boolean
  created_at: string
}

interface PerspectivesConfig {
  default_mode: 'managed' | 'byo'
  default_models: string[]
  default_project_memory: 'none' | 'light' | 'full'
  max_messages: number
  temperature: number
  max_tokens: number
}

const PROVIDER_INFO = {
  openai: {
    name: 'OpenAI',
    icon: '🤖',
    models: ['gpt-4', 'gpt-3.5-turbo'],
    keyFormat: 'sk-...',
    docs: 'https://platform.openai.com/api-keys'
  },
  anthropic: {
    name: 'Anthropic',
    icon: '🧠',
    models: ['claude-3-sonnet', 'claude-3-haiku'],
    keyFormat: 'sk-ant-...',
    docs: 'https://console.anthropic.com/account/keys'
  },
  google: {
    name: 'Google AI',
    icon: '💎',
    models: ['gemini-pro', 'gemini-1.5-pro'],
    keyFormat: 'AI...',
    docs: 'https://aistudio.google.com/app/apikey'
  }
}

export default function PerspectivesSettings() {
  const { user, loading: authLoading, isAuthenticated } = useAuth()
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [config, setConfig] = useState<PerspectivesConfig>({
    default_mode: 'managed',
    default_models: ['gpt-4', 'claude-3-sonnet', 'gemini-pro'],
    default_project_memory: 'light',
    max_messages: 10,
    temperature: 0.7,
    max_tokens: 2000
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [showAddKey, setShowAddKey] = useState(false)
  const [newKey, setNewKey] = useState({
    provider: 'openai' as keyof typeof PROVIDER_INFO,
    key_name: '',
    api_key: ''
  })

  const supabase = createClient()

  useEffect(() => {
    if (user) {
      loadApiKeys()
      loadConfig()
    }
  }, [user])

  const loadApiKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('user_api_keys')
        .select('id, provider, key_name, active, created_at')
        .order('created_at', { ascending: false })

      if (error) throw error
      setApiKeys(data || [])
    } catch (error: any) {
      console.error('Error loading API keys:', error)
      setMessage('Failed to load API keys')
    }
  }

  const loadConfig = async () => {
    // Load from localStorage for now, could be stored in database
    const saved = localStorage.getItem('perspectives_config')
    if (saved) {
      setConfig({ ...config, ...JSON.parse(saved) })
    }
  }

  const saveConfig = async () => {
    setLoading(true)
    try {
      localStorage.setItem('perspectives_config', JSON.stringify(config))
      setMessage('Configuration saved successfully')
    } catch (error) {
      setMessage('Failed to save configuration')
    } finally {
      setLoading(false)
    }
  }

  const addApiKey = async () => {
    if (!newKey.api_key.trim()) {
      setMessage('Please enter an API key')
      return
    }

    setLoading(true)
    try {
      // In production, encrypt the key before storing
      const { error } = await supabase
        .from('user_api_keys')
        .insert({
          provider: newKey.provider,
          key_name: newKey.key_name || null,
          encrypted_key: newKey.api_key // Would encrypt this in production
        })

      if (error) throw error

      setMessage('API key added successfully')
      setNewKey({ provider: 'openai', key_name: '', api_key: '' })
      setShowAddKey(false)
      loadApiKeys()
    } catch (error: any) {
      setMessage(error.message || 'Failed to add API key')
    } finally {
      setLoading(false)
    }
  }

  const toggleKeyActive = async (keyId: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from('user_api_keys')
        .update({ active })
        .eq('id', keyId)

      if (error) throw error
      
      setApiKeys(prev => 
        prev.map(key => 
          key.id === keyId ? { ...key, active } : key
        )
      )
      setMessage(`API key ${active ? 'enabled' : 'disabled'}`)
    } catch (error: any) {
      setMessage('Failed to update API key')
    }
  }

  const deleteApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return

    try {
      const { error } = await supabase
        .from('user_api_keys')
        .delete()
        .eq('id', keyId)

      if (error) throw error
      
      setApiKeys(prev => prev.filter(key => key.id !== keyId))
      setMessage('API key deleted successfully')
    } catch (error: any) {
      setMessage('Failed to delete API key')
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Authentication Required
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Please sign in to manage your perspectives settings.
          </p>
          <a
            href="/auth"
            className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign In
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Perspectives Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Configure your multi-LLM perspectives tool, manage API keys, and set defaults.
          </p>
        </div>

        {/* Message */}
        {message && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-blue-800 dark:text-blue-200">{message}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Configuration Panel */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Default Configuration
            </h2>

            <div className="space-y-4">
              {/* Mode Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Default Mode
                </label>
                <select
                  value={config.default_mode}
                  onChange={(e) => setConfig(prev => ({ ...prev, default_mode: e.target.value as 'managed' | 'byo' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="managed">Managed (Use our API keys)</option>
                  <option value="byo">BYO (Bring Your Own keys)</option>
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {config.default_mode === 'managed' 
                    ? 'Uses our hosted API keys with usage limits'
                    : 'Uses your own API keys with no usage limits'
                  }
                </p>
              </div>

              {/* Project Memory */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Project Memory
                </label>
                <select
                  value={config.default_project_memory}
                  onChange={(e) => setConfig(prev => ({ ...prev, default_project_memory: e.target.value as 'none' | 'light' | 'full' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="none">None</option>
                  <option value="light">Light (recent files)</option>
                  <option value="full">Full (TF-IDF similarity)</option>
                </select>
              </div>

              {/* Model Settings */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Max Messages
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={config.max_messages}
                  onChange={(e) => setConfig(prev => ({ ...prev, max_messages: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Temperature
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={config.temperature}
                    onChange={(e) => setConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Max Tokens
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="8000"
                    step="100"
                    value={config.max_tokens}
                    onChange={(e) => setConfig(prev => ({ ...prev, max_tokens: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>

              <button
                onClick={saveConfig}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 px-4 rounded-md font-medium transition-colors"
              >
                {loading ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>

          {/* API Keys Panel */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                BYO Models
              </h2>
              <button
                onClick={() => setShowAddKey(!showAddKey)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors"
              >
                + Add Key
              </button>
            </div>

            {/* Add Key Form */}
            {showAddKey && (
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Provider
                    </label>
                    <select
                      value={newKey.provider}
                      onChange={(e) => setNewKey(prev => ({ ...prev, provider: e.target.value as keyof typeof PROVIDER_INFO }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white text-sm"
                    >
                      {Object.entries(PROVIDER_INFO).map(([key, info]) => (
                        <option key={key} value={key}>
                          {info.icon} {info.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Key Name (optional)
                    </label>
                    <input
                      type="text"
                      value={newKey.key_name}
                      onChange={(e) => setNewKey(prev => ({ ...prev, key_name: e.target.value }))}
                      placeholder="My API Key"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      API Key
                    </label>
                    <input
                      type="password"
                      value={newKey.api_key}
                      onChange={(e) => setNewKey(prev => ({ ...prev, api_key: e.target.value }))}
                      placeholder={PROVIDER_INFO[newKey.provider].keyFormat}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white text-sm"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Get your key from: <a href={PROVIDER_INFO[newKey.provider].docs} target="_blank" className="text-blue-600 hover:underline">{PROVIDER_INFO[newKey.provider].name} Console</a>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={addApiKey}
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md text-sm font-medium transition-colors"
                    >
                      Add Key
                    </button>
                    <button
                      onClick={() => setShowAddKey(false)}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Keys List */}
            <div className="space-y-3">
              {apiKeys.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  <p>No API keys added yet.</p>
                  <p className="text-sm">Add your first key to use BYO mode.</p>
                </div>
              ) : (
                apiKeys.map(key => (
                  <div key={key.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{PROVIDER_INFO[key.provider].icon}</span>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {PROVIDER_INFO[key.provider].name}
                          {key.key_name && (
                            <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                              ({key.key_name})
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Added {new Date(key.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => toggleKeyActive(key.id, !key.active)}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                          key.active
                            ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300'
                        }`}
                      >
                        {key.active ? 'Active' : 'Inactive'}
                      </button>
                      <button
                        onClick={() => deleteApiKey(key.id)}
                        className="px-2 py-1 bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 rounded text-xs font-medium transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Usage Info */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Usage & Billing
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Managed Mode</h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• No setup required</li>
                <li>• Usage-based billing</li>
                <li>• Rate limits apply</li>
                <li>• All models included</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">BYO Mode</h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Use your own API keys</li>
                <li>• Direct billing from providers</li>
                <li>• No rate limits from us</li>
                <li>• Full control over usage</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}