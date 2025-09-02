'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { createClient } from '../../utils/supabase/client'
import { Plus, Eye, EyeOff, Edit3, Trash2, Settings, TrendingUp, AlertCircle, Check, Filter } from 'lucide-react'
import { COMPREHENSIVE_PROVIDERS, ProviderConfiguration, getAllProviders } from '../../../types/providers'

interface ApiKey {
  id: string
  provider: string
  key_preview: string
  active: boolean
  api_base?: string
  default_model?: string
  created_at: string
  last_used_at?: string
}

interface ProviderConfig {
  id: string
  provider_name: string
  base_url?: string
  api_key_required: boolean
  supports_streaming: boolean
  supports_tools: boolean
  supports_images: boolean
  supports_prompt_cache: boolean
  authentication_method: string
  models: any[]
}

export default function ApiKeysPage() {
  const { user, loading: authLoading } = useAuth()
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [providers, setProviders] = useState<ProviderConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null)
  const [showApiKey, setShowApiKey] = useState<{[keyId: string]: boolean}>({})
  
  // Filter state
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [tierFilter, setTierFilter] = useState<string>('all')
  const [authFilter, setAuthFilter] = useState<string>('all')
  const [tagFilter, setTagFilter] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  
  // Validation state
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({})

  // Form state
  const [formData, setFormData] = useState({
    provider: 'openai',
    api_key: '',
    api_base: '',
    default_model: ''
  })

  const supabase = createClient()

  // API Key validation functions
  const validateApiKey = (provider: string, apiKey: string): string | null => {
    if (!apiKey || !apiKey.trim()) {
      return null // Empty keys are handled elsewhere
    }

    const key = apiKey.trim()
    
    // Provider-specific validation patterns
    switch (provider) {
      case 'openai':
      case 'openai-native':
        if (!key.startsWith('sk-') && !key.startsWith('sk-proj-')) {
          return 'OpenAI API keys should start with "sk-" or "sk-proj-"'
        }
        if (key.length < 20) {
          return 'OpenAI API keys should be at least 20 characters long'
        }
        break
        
      case 'anthropic':
        if (!key.startsWith('sk-ant-')) {
          return 'Anthropic API keys should start with "sk-ant-"'
        }
        if (key.length < 30) {
          return 'Anthropic API keys should be at least 30 characters long'
        }
        break
        
      case 'gemini':
      case 'google':
        if (key.length < 20) {
          return 'Google API keys should be at least 20 characters long'
        }
        if (!/^[A-Za-z0-9_-]+$/.test(key)) {
          return 'Google API keys should contain only letters, numbers, hyphens, and underscores'
        }
        break
        
      case 'groq':
        if (!key.startsWith('gsk_')) {
          return 'Groq API keys should start with "gsk_"'
        }
        if (key.length < 20) {
          return 'Groq API keys should be at least 20 characters long'
        }
        break
        
      case 'deepseek':
        if (!key.startsWith('sk-')) {
          return 'DeepSeek API keys should start with "sk-"'
        }
        if (key.length < 20) {
          return 'DeepSeek API keys should be at least 20 characters long'
        }
        break
        
      case 'xai':
        if (!key.startsWith('xai-')) {
          return 'xAI API keys should start with "xai-"'
        }
        if (key.length < 20) {
          return 'xAI API keys should be at least 20 characters long'
        }
        break
        
      default:
        // Generic validation for unknown providers
        if (key.length < 10) {
          return 'API key seems too short (minimum 10 characters)'
        }
        if (key.length > 200) {
          return 'API key seems too long (maximum 200 characters)'
        }
        if (!/^[A-Za-z0-9_.-]+$/.test(key)) {
          return 'API key contains invalid characters'
        }
        break
    }
    
    return null // Valid
  }

  const handleApiKeyChange = (value: string) => {
    setFormData(prev => ({...prev, api_key: value}))
    
    // Clear existing validation error
    if (validationErrors.api_key) {
      setValidationErrors(prev => ({...prev, api_key: ''}))
    }
    
    // Validate on change (with debounce-like effect)
    if (value.trim()) {
      setTimeout(() => {
        const error = validateApiKey(formData.provider, value)
        if (error) {
          setValidationErrors(prev => ({...prev, api_key: error}))
        }
      }, 500)
    }
  }

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch API keys
      const { data: keysData, error: keysError } = await supabase
        .from('user_api_keys')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (keysError) throw keysError

      // Convert COMPREHENSIVE_PROVIDERS to the format expected by the component
      const providersData = Object.values(COMPREHENSIVE_PROVIDERS).map(provider => ({
        id: provider.id,
        provider_name: provider.id,
        display_name: provider.name,
        base_url: provider.baseUrl || '',
        api_key_required: provider.authType === 'api_key',
        supports_streaming: provider.features?.streaming !== false,
        supports_tools: provider.features?.tools === true,
        supports_images: provider.features?.images === true,
        supports_prompt_cache: false, // TODO: Add caching support to features interface
        authentication_method: provider.authType,
        models: Object.entries(provider.supportedModels).map(([id, model]) => ({
          id,
          name: id.includes('_') ? id.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : id,
          maxTokens: model.maxTokens || 4096,
          contextWindow: model.contextWindow || 4096,
          inputPrice: model.inputPrice || 0,
          outputPrice: model.outputPrice || 0
        }))
      }))

      setApiKeys(keysData || [])
      setProviders(providersData)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Removed old handleProviderChange - using new one below

  const saveApiKey = async () => {
    const provider = COMPREHENSIVE_PROVIDERS[formData.provider]
    
    // Remove key name validation
    
    if (provider?.authType === 'api_key' && !formData.api_key.trim()) {
      setError('API key is required for this provider')
      return
    }

    // Validate API key format if provided
    if (formData.api_key.trim()) {
      const validationError = validateApiKey(formData.provider, formData.api_key)
      if (validationError) {
        setError(`Invalid API key: ${validationError}`)
        setValidationErrors(prev => ({...prev, api_key: validationError}))
        return
      }
    }

    try {
      setLoading(true)
      
      // Encrypt the API key (in production, use proper encryption)
      const encryptedKey = formData.api_key ? btoa(formData.api_key) : null
      const keyPreview = formData.api_key && formData.api_key.length > 8 
        ? `${formData.api_key.slice(0, 8)}...${formData.api_key.slice(-4)}`
        : formData.api_key 
        ? `${formData.api_key.slice(0, 4)}***`
        : 'No API Key'

      const providerInfo = COMPREHENSIVE_PROVIDERS[formData.provider]
      const keyData = {
        user_id: user?.id,
        provider: formData.provider,
        key_name: `${providerInfo?.name || formData.provider} Key`,
        encrypted_key: encryptedKey,
        key_preview: keyPreview,
        api_base: formData.api_base || null,
        default_model: formData.default_model || null,
        active: true
      }

      if (editingKey) {
        const { error } = await supabase
          .from('user_api_keys')
          .update(keyData)
          .eq('id', editingKey.id)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('user_api_keys')
          .insert(keyData)
        
        if (error) throw error
      }

      setShowAddForm(false)
      setEditingKey(null)
      setFormData({
        provider: 'openai',
        api_key: '',
        api_base: '',
        default_model: ''
      })
      await fetchData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleKeyActive = async (keyId: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from('user_api_keys')
        .update({ active: !active })
        .eq('id', keyId)

      if (error) throw error
      await fetchData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const deleteKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key? This cannot be undone.')) return

    try {
      const { error } = await supabase
        .from('user_api_keys')
        .delete()
        .eq('id', keyId)

      if (error) throw error
      await fetchData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const editKey = (key: ApiKey) => {
    setEditingKey(key)
    setFormData({
      provider: key.provider,
      api_key: '', // Don't populate for security
      api_base: key.api_base || '',
      default_model: key.default_model || ''
    })
    setShowAddForm(true)
  }

  const getProviderInfo = (provider: string) => {
    return COMPREHENSIVE_PROVIDERS[provider] || {
      name: provider.charAt(0).toUpperCase() + provider.slice(1),
      authType: 'api_key'
    }
  }

  const handleProviderChange = (providerId: string) => {
    const providerConfig = COMPREHENSIVE_PROVIDERS[providerId]
    setFormData(prev => ({
      ...prev,
      provider: providerId,
      api_base: providerConfig?.baseUrl || '',
      default_model: providerConfig?.defaultModel || ''
    }))
    // Clear validation errors when provider changes
    setValidationErrors({})
  }

  const getUsageColor = (current: number, budget: number) => {
    const percentage = (current / budget) * 100
    if (percentage >= 90) return 'text-red-600 bg-red-50'
    if (percentage >= 75) return 'text-yellow-600 bg-yellow-50'
    return 'text-green-600 bg-green-50'
  }

  const handleProviderClick = (provider: any) => {
    // Always open the add API key form with the provider pre-selected (no external links)
    setFormData(prev => ({
      ...prev,
      provider: provider.id,
      api_base: provider.baseUrl || provider.openRouterUrl || '',
      default_model: provider.defaultModel || ''
    }))
    setShowAddForm(true)
    setEditingKey(null)
  }

  if (authLoading || loading) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          API Keys Management
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Manage your API keys for all supported LLM providers. These keys are encrypted and used securely across Polydev services.
        </p>
        
        {/* Filter Section */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Filter className="w-4 h-4" />
            <span>Filter Providers</span>
          </button>
        </div>

        {showFilters && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
                >
                  <option value="all">All Categories</option>
                  <option value="api">API Providers</option>
                  <option value="cli">CLI Providers</option>
                  <option value="local">Local Providers</option>
                  <option value="cloud">Cloud Providers</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tier
                </label>
                <select
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
                >
                  <option value="all">All Tiers</option>
                  <option value="premium">Premium</option>
                  <option value="standard">Standard</option>
                  <option value="community">Community</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Authentication
                </label>
                <select
                  value={authFilter}
                  onChange={(e) => setAuthFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
                >
                  <option value="all">All Auth Types</option>
                  <option value="api_key">API Key</option>
                  <option value="cli">CLI</option>
                  <option value="oauth">OAuth</option>
                  <option value="local">Local</option>
                  <option value="cloud_credentials">Cloud Credentials</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Features
                </label>
                <select
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
                >
                  <option value="all">All Features</option>
                  <option value="core">Core</option>
                  <option value="reasoning">Reasoning</option>
                  <option value="vision">Vision</option>
                  <option value="coding">Coding</option>
                  <option value="fast-inference">Fast Inference</option>
                  <option value="enterprise">Enterprise</option>
                  <option value="open-source">Open Source</option>
                  <option value="experimental">Experimental</option>
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Comprehensive Provider Support</h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Add API keys for OpenAI, Anthropic, Google, Azure, AWS Bedrock, Mistral, Cohere, and many more providers. 
                Configure custom endpoints, rate limits, and budgets for each key.
              </p>
            </div>
          </div>
        </div>
      </div>

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

      {/* API Keys List */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Your API Keys
          </h2>
          <button
            onClick={() => {
              setShowAddForm(true)
              setEditingKey(null)
              setFormData({
                provider: 'openai',
                api_key: '',
                api_base: '',
                default_model: ''
              })
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add API Key</span>
          </button>
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
            <h3 className="font-medium text-gray-900 dark:text-white mb-4">
              {editingKey ? 'Edit API Key' : 'Add New API Key'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Provider Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Provider *
                </label>
                <select
                  value={formData.provider}
                  onChange={(e) => handleProviderChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                >
                  {Object.entries(COMPREHENSIVE_PROVIDERS).filter(([id, config]) => {
                    if (categoryFilter !== 'all' && config.category !== categoryFilter) return false
                    if (tierFilter !== 'all' && config.tier !== tierFilter) return false
                    if (authFilter !== 'all' && config.authType !== authFilter) return false
                    if (tagFilter !== 'all' && !config.tags?.includes(tagFilter)) return false
                    return true
                  }).map(([id, config]) => (
                    <option key={id} value={id}>
                      {config.name} ({config.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Removed Key Name field */}
            </div>

            {/* API Key - only show for providers that require it */}
            {COMPREHENSIVE_PROVIDERS[formData.provider]?.authType === 'api_key' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    API Key * {editingKey && <span className="text-xs text-gray-500">(leave empty to keep current)</span>}
                  </label>
                  <input
                    type="password"
                    value={formData.api_key}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    placeholder={editingKey ? "Enter new key to update" : "sk-... or your provider's API key format"}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 dark:bg-gray-800 dark:text-white font-mono text-sm ${
                      validationErrors.api_key 
                        ? 'border-red-300 dark:border-red-600 focus:ring-red-500' 
                        : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                    }`}
                  />
                  {validationErrors.api_key && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center space-x-1">
                      <AlertCircle className="w-4 h-4" />
                      <span>{validationErrors.api_key}</span>
                    </p>
                  )}
                </div>
              </div>
            )}
            
            {/* CLI/Cloud Provider Info */}
            {COMPREHENSIVE_PROVIDERS[formData.provider]?.authType !== 'api_key' && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      {providers.find(p => p.id === formData.provider)?.authentication_method === 'cli' ? 'CLI-based Provider' : 'Cloud-based Provider'}
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      {providers.find(p => p.id === formData.provider)?.authentication_method === 'cli' 
                        ? 'This provider uses CLI authentication. Make sure you have the CLI tool installed and authenticated.'
                        : 'This provider uses cloud credentials. Configure your cloud authentication separately.'
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* API Base URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  API Base URL
                </label>
                <input
                  type="text"
                  value={formData.api_base}
                  onChange={(e) => setFormData(prev => ({...prev, api_base: e.target.value}))}
                  placeholder="Custom endpoint (optional)"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
                />
              </div>

              {/* Default Model */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Default Model
                </label>
                <select
                  value={formData.default_model}
                  onChange={(e) => setFormData(prev => ({...prev, default_model: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
                >
                  <option value="">Select model (optional)</option>
                  {Object.entries(COMPREHENSIVE_PROVIDERS[formData.provider]?.supportedModels || {}).map(([modelId, modelInfo]) => (
                    <option key={modelId} value={modelId}>
                      {modelId}
                    </option>
                  ))}
                </select>
              </div>

              {/* Removed Rate Limit field */}
            </div>

            {/* Removed Monthly Budget field */}

            <div className="flex space-x-3">
              <button
                onClick={saveApiKey}
                disabled={(!formData.api_key.trim() && !editingKey) || !!validationErrors.api_key}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
              >
                <Check className="w-4 h-4" />
                <span>{editingKey ? 'Update' : 'Save'} API Key</span>
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setEditingKey(null)
                }}
                className="text-gray-600 dark:text-gray-300 px-4 py-2 hover:text-gray-900 dark:hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* API Keys Table */}
        <div className="overflow-x-auto">
          {apiKeys.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
              <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                <Settings className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-medium mb-2">No API keys configured</h3>
              <p className="text-sm">Add your first API key to start using Polydev services</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {apiKeys.map((key) => {
                const providerInfo = getProviderInfo(key.provider)
                
                return (
                  <div key={key.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                            {providerInfo.name.charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              {providerInfo.name} API Key
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {providerInfo.name} • {key.key_preview}
                            </p>
                          </div>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                            key.active 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {key.active ? 'Active' : 'Disabled'}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
                          {key.default_model && (
                            <span>Model: {key.default_model}</span>
                          )}
                          <span>
                            Added {new Date(key.created_at).toLocaleDateString()}
                          </span>
                          {key.last_used_at && (
                            <span>
                              Last used {new Date(key.last_used_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => editKey(key)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          title="Edit key"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleKeyActive(key.id, key.active)}
                          className={`p-2 rounded-lg ${
                            key.active 
                              ? 'text-red-600 hover:text-red-900 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
                              : 'text-green-600 hover:text-green-900 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20'
                          }`}
                          title={key.active ? 'Disable key' : 'Enable key'}
                        >
                          {key.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => deleteKey(key.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Delete key"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Provider Support Info */}
      <div className="mt-8 bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
        {(() => {
          let filteredProviders = Object.values(COMPREHENSIVE_PROVIDERS).filter(provider => {
            // Category filter
            if (categoryFilter !== 'all' && provider.category !== categoryFilter) {
              return false;
            }
            
            // Tier filter  
            if (tierFilter !== 'all' && provider.tier !== tierFilter) {
              return false;
            }
            
            // Auth type filter
            if (authFilter !== 'all' && provider.authType !== authFilter) {
              return false;
            }
            
            // Tag filter
            if (tagFilter !== 'all' && !provider.tags?.includes(tagFilter)) {
              return false;
            }
            
            return true;
          });
          
          return (
            <>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <span>Supported Providers ({filteredProviders.length})</span>
                </h3>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:border-gray-400 transition-colors"
                >
                  <Filter className="w-4 h-4" />
                  <span>Filter</span>
                </button>
              </div>

        {showFilters && (
          <div className="mb-6 p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <select 
                  value={categoryFilter} 
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="all">All Categories</option>
                  <option value="api">API</option>
                  <option value="cli">CLI</option>
                  <option value="local">Local</option>
                  <option value="cloud">Cloud</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Tier</label>
                <select 
                  value={tierFilter} 
                  onChange={(e) => setTierFilter(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="all">All Tiers</option>
                  <option value="premium">Premium</option>
                  <option value="standard">Standard</option>
                  <option value="community">Community</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Auth Type</label>
                <select 
                  value={authFilter} 
                  onChange={(e) => setAuthFilter(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="all">All Auth Types</option>
                  <option value="api_key">API Key</option>
                  <option value="oauth">OAuth</option>
                  <option value="cli">CLI</option>
                  <option value="local">Local</option>
                  <option value="cloud_credentials">Cloud Credentials</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Tag</label>
                <select 
                  value={tagFilter} 
                  onChange={(e) => setTagFilter(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="all">All Tags</option>
                  <option value="core">Core</option>
                  <option value="fast-inference">Fast Inference</option>
                  <option value="enterprise">Enterprise</option>
                  <option value="open-source">Open Source</option>
                  <option value="reasoning">Reasoning</option>
                  <option value="vision">Vision</option>
                  <option value="coding">Coding</option>
                  <option value="experimental">Experimental</option>
                  <option value="local">Local</option>
                  <option value="privacy">Privacy</option>
                  <option value="cli">CLI</option>
                  <option value="cloud">Cloud</option>
                </select>
              </div>
            </div>
          </div>
        )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredProviders.map(provider => (
            <div 
              key={provider.id} 
              className={`bg-white dark:bg-gray-900 p-3 rounded border transition-all duration-200 ${
                provider.clickable 
                  ? 'hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer transform hover:scale-105' 
                  : ''
              }`}
              onClick={provider.clickable ? () => handleProviderClick(provider) : undefined}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 flex items-center justify-center">
                    <img 
                      src={provider.iconUrl} 
                      alt={`${provider.name} logo`}
                      className="w-6 h-6 object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement
                        if (fallback) fallback.style.display = 'flex'
                      }}
                    />
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded flex items-center justify-center text-white font-bold text-xs hidden">
                      {provider.name.charAt(0)}
                    </div>
                  </div>
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                    {provider.name}
                  </h4>
                  {provider.clickable && (
                    <div className="text-blue-500 hover:text-blue-700">
                      <Plus className="w-3 h-3" />
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  {/* Tier badge */}
                  <span className={`px-1.5 py-0.5 text-xs rounded font-medium ${
                    provider.tier === 'premium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                    provider.tier === 'standard' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  }`}>
                    {provider.tier}
                  </span>
                  {/* Category badge */}
                  <span className={`px-1.5 py-0.5 text-xs rounded font-medium ${
                    provider.category === 'api' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' :
                    provider.category === 'openrouter' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                    'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200'
                  }`}>
                    {provider.category}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
                {provider.description || 'API Key Authentication'}
                {provider.clickable && (
                  <span className="block text-blue-500 text-xs mt-1">
                    Click to add API key or configure →
                  </span>
                )}
              </p>
              {/* Tags */}
              {provider.tags && provider.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {provider.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="px-1.5 py-0.5 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 text-xs rounded">
                      {tag}
                    </span>
                  ))}
                  {provider.tags.length > 3 && (
                    <span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 text-xs rounded">
                      +{provider.tags.length - 3} more
                    </span>
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-1 mt-2">
                {provider.features?.streaming !== false && (
                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs rounded">Stream</span>
                )}
                {provider.features?.tools === true && (
                  <span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 text-xs rounded">Tools</span>
                )}
                {provider.features?.images === true && (
                  <span className="px-1.5 py-0.5 bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 text-xs rounded">Images</span>
                )}
                {/* TODO: Add caching feature support */}
                {provider.features?.reasoning === true && (
                  <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 text-xs rounded">Reasoning</span>
                )}
                <span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 text-xs rounded">
                  {Object.keys(provider.supportedModels).length} models
                </span>
              </div>
            </div>
                ))}
              </div>
            </>
          );
        })()}
      </div>
    </div>
  )
}