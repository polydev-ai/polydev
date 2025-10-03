'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { usePreferences } from '../../hooks/usePreferences'
import { useEnhancedApiKeysData } from '../../hooks/useEnhancedApiKeysData'
import { createClient } from '../../app/utils/supabase/client'
import { Plus, Eye, EyeOff, Edit3, Trash2, Settings, TrendingUp, AlertCircle, Check, Filter, Star, StarOff, ChevronDown, ChevronRight, GripVertical, Terminal, CheckCircle, XCircle, Wrench, Clock, RefreshCw, Copy, Crown, Leaf } from 'lucide-react'
import { ProviderConfig } from '../../types/providers'
import { PROVIDER_ICONS } from '../../lib/openrouter-providers'
// Use API endpoint instead of direct modelsDevService import to avoid server-side imports in client component
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { getModelTier } from '../../lib/model-tiers'
import ModelSourcePriorityPicker from '../ModelSourcePriorityPicker'
import ModelPreferenceSelector from '../ModelPreferenceSelector'

interface ApiKey {
  id: string
  provider: string
  key_preview: string
  encrypted_key: string | null
  active: boolean
  api_base?: string
  default_model?: string
  is_preferred?: boolean
  is_primary?: boolean
  monthly_budget?: number
  display_order?: number
  created_at: string
  last_used_at?: string
}

interface ModelPreference {
  models: string[]
  order: number
}

interface UserPreferences {
  model_preferences: Record<string, ModelPreference>
  default_provider: string
  preferred_providers: string[]
}

interface CLIConfig {
  id?: string
  user_id: string
  provider: string
  custom_path: string | null
  enabled: boolean
  status: 'available' | 'unavailable' | 'not_installed' | 'unchecked' | 'checking'
  last_checked_at?: string
  created_at?: string
  updated_at?: string
  statusMessage?: string
  message?: string
  cli_version?: string
  authenticated?: boolean
  issue_type?: 'not_installed' | 'not_authenticated' | 'compatibility_issue' | 'environment_issue' | 'unknown'
  solutions?: string[]
  install_command?: string
  auth_command?: string
}

interface CLIProviderInfo {
  name: string
  provider: string
  defaultPaths: string[]
  authCommand: string
  description: string
}

interface ApiKeyUsage {
  api_key_id: string
  total_cost: number
  monthly_cost: number
  token_count: number
  request_count: number
  last_used: string | null
}

interface ModelsDevProvider {
  id: string
  name: string
  display_name?: string
  description: string
  logo?: string
  logo_url?: string
  website?: string
  baseUrl?: string
  base_url?: string
  modelsCount?: number
  supportsStreaming?: boolean
  supportsTools?: boolean
  supportsVision?: boolean
  models?: ModelsDevModel[]
}

interface ModelsDevModel {
  id: string
  provider_id?: string
  name: string
  display_name?: string
  friendly_id?: string
  max_tokens?: number
  maxTokens?: number
  context_length?: number
  contextWindow?: number
  input_cost_per_million?: number
  output_cost_per_million?: number
  supports_vision?: boolean
  supportsVision?: boolean
  supports_tools?: boolean
  supportsTools?: boolean
  supports_reasoning?: boolean
  supportsReasoning?: boolean
  reasoning_levels?: number
  description?: string
  pricing?: {
    input?: number
    output?: number
    cacheRead?: number
    cacheWrite?: number
  }
}

export default function EnhancedApiKeysPage() {
  const { user, loading: authLoading } = useAuth()
  const { preferences, updatePreferences: updateUserPreferences, loading: preferencesLoading, refetch: refetchPreferences } = usePreferences()

  // Use optimized data hook
  const {
    apiKeys,
    legacyProviders,
    modelsDevProviders,
    cliStatuses,
    setCliStatuses,
    apiKeyUsage,
    providerModels,
    loadingModels,
    loading: dataLoading,
    error: dataError,
    refresh: refreshData,
    fetchProviderModels
  } = useEnhancedApiKeysData()

  // Local component state
  const [providers, setProviders] = useState<ProviderConfig[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null)
  const [showApiKey, setShowApiKey] = useState<{[keyId: string]: boolean}>({})
  const [expandedProviders, setExpandedProviders] = useState<{[provider: string]: boolean}>({})
  const [expandedAvailableProviders, setExpandedAvailableProviders] = useState<{[provider: string]: boolean}>({})
  const [allModelsExpanded, setAllModelsExpanded] = useState(false) // Minimized by default
  const [updateApiKey, setUpdateApiKey] = useState(false)
  const [syncingModels, setSyncingModels] = useState(false)
  const [hasCompletedInitialSync, setHasCompletedInitialSync] = useState(false)
  const [cliStatusLoading, setCliStatusLoading] = useState(false)

  // Combine loading states
  const loading = dataLoading || authLoading || preferencesLoading
  
  // Form state with new fields
  const [formData, setFormData] = useState({
    provider: 'openai',
    api_key: '',
    api_base: '',
    default_model: '',
    is_preferred: false,
    monthly_budget: null as number | null,
    reasoning_level: 5
  })

  const supabase = createClient()

  // Copy API key to clipboard
  const copyApiKey = async (apiKey: ApiKey) => {
    try {
      if (!apiKey.encrypted_key || apiKey.encrypted_key.trim() === '') {
        setError('No API key available to copy (Credits Only provider)')
        return
      }
      
      // Decrypt the API key
      const decryptedKey = atob(apiKey.encrypted_key)
      await navigator.clipboard.writeText(decryptedKey)
      setSuccess('API key copied to clipboard!')
      setTimeout(() => setSuccess(null), 2000)
    } catch (err) {
      console.error('Failed to copy API key:', err)
      setError('Failed to copy API key to clipboard')
    }
  }

  // Get enhanced provider display data by combining legacy providers with models.dev data
  const getProviderDisplayData = useCallback((rawProviderId: string) => {
    const normalizeId = (pid: string) => pid === 'xai' ? 'x-ai' : pid
    const providerId = normalizeId(rawProviderId)
    const legacyProvider = legacyProviders[providerId]
    const modelsDevProvider = modelsDevProviders.find(p => p.id === providerId)
    
    // If neither exists, return null
    if (!legacyProvider && !modelsDevProvider) return null
    
    // If only models.dev provider exists, create a basic provider config
    if (!legacyProvider && modelsDevProvider) {
      return {
        name: modelsDevProvider.name,
        displayName: modelsDevProvider.name,
        description: modelsDevProvider.description,
        logoUrl: modelsDevProvider.logo,
        websiteUrl: modelsDevProvider.website,
        baseUrl: modelsDevProvider.baseUrl || 'https://api.openai.com/v1',
        modelsCount: modelsDevProvider.modelsCount,
        modelsDevData: modelsDevProvider
      }
    }
    
    // If both exist, merge them with models.dev taking precedence for display data
    return {
      ...legacyProvider,
      // Use models.dev logo if available, fallback to PROVIDER_ICONS
      logoUrl: modelsDevProvider?.logo || PROVIDER_ICONS[providerId as keyof typeof PROVIDER_ICONS],
      // Use models.dev display name if available
      displayName: modelsDevProvider?.name || legacyProvider.name,
      // Enhanced description from models.dev
      enhancedDescription: modelsDevProvider?.description || legacyProvider.description,
      // Website URL from models.dev
      websiteUrl: modelsDevProvider?.website,
      // Base URL from models.dev
      baseUrl: modelsDevProvider?.baseUrl || legacyProvider.baseUrl,
      // Model count
      modelsCount: modelsDevProvider?.modelsCount,
      // Additional metadata
      modelsDevData: modelsDevProvider
    }
  }, [legacyProviders, modelsDevProviders])

  // Fetch and cache models for a specific provider
  // Use the optimized fetchProviderModels from the hook (no need to redefine)

  // Get models with pricing and capabilities from models.dev (legacy function for compatibility)
  const getProviderModelsWithPricing = useCallback(async (providerId: string) => {
    const models = await fetchProviderModels(providerId)
    return models.map((model: ModelsDevModel) => ({
      id: model.id,
      friendlyId: model.friendly_id || model.id,
      name: model.display_name || model.name,
      inputPrice: model.input_cost_per_million ? model.input_cost_per_million : 0, // Already per 1M tokens
      outputPrice: model.output_cost_per_million ? model.output_cost_per_million : 0,
      contextLength: model.context_length || model.contextWindow || 0,
      supportsVision: model.supports_vision || model.supportsVision || false,
      supportsTools: model.supports_tools || model.supportsTools || false,
      supportsReasoning: model.supports_reasoning || false,
      reasoningLevels: model.supports_reasoning ? 5 : null,
      cacheReadPrice: null, // Will be available from model metadata
      cacheWritePrice: null
    }))
  }, [fetchProviderModels])

  // CLI Provider Information
  const CLI_PROVIDERS: CLIProviderInfo[] = [
    {
      name: 'Claude Code',
      provider: 'claude_code',
      defaultPaths: ['/usr/local/bin/claude', '/opt/homebrew/bin/claude', '~/.local/bin/claude'],
      authCommand: 'claude auth',
      description: 'Use Claude Code CLI for Anthropic models'
    },
    {
      name: 'Codex CLI', 
      provider: 'codex_cli',
      defaultPaths: ['/usr/local/bin/codex', '/opt/homebrew/bin/codex', '~/.local/bin/codex'],
      authCommand: 'codex auth',
      description: 'Use Codex CLI for GPT models'
    },
    {
      name: 'Gemini CLI',
      provider: 'gemini_cli', 
      defaultPaths: ['/usr/local/bin/gcloud', '/opt/homebrew/bin/gcloud', '~/google-cloud-sdk/bin/gcloud'],
      authCommand: 'gcloud auth login',
      description: 'Use Google Cloud CLI for Gemini models'
    }
  ]


  // Auto-sync existing API key models to preferences
  const syncExistingModelsToPreferences = useCallback(async () => {
    // Use functional update to avoid stale closure
    setSyncingModels(prev => {
      if (prev) {
        console.log('[EnhancedApiKeys] Sync already in progress, skipping')
        return prev
      }
      return true
    })

    try {
      console.log('[EnhancedApiKeys] Calling model sync endpoint...')

      const response = await fetch('/api/sync-models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`)
      }

      const result = await response.json()
      console.log('[EnhancedApiKeys] Sync result:', result)

      if (result.synced) {
        console.log(`[EnhancedApiKeys] Successfully synced ${result.models.length} models:`, result.models)
        // Refresh preferences to reflect the changes
        await refetchPreferences()
        // Mark initial sync as completed to prevent repeated syncs
        setHasCompletedInitialSync(true)
      } else {
        console.log('[EnhancedApiKeys] No models needed syncing')
        setHasCompletedInitialSync(true)
      }
    } catch (error) {
      console.error('[EnhancedApiKeys] Error during sync:', error)
      setHasCompletedInitialSync(true) // Mark as completed even on error to prevent infinite retries
    } finally {
      setSyncingModels(false)
    }
  }, [refetchPreferences]) // Removed syncingModels from dependencies to prevent infinite loop


  // Sync existing models to preferences when API keys are loaded (ONCE only)
  useEffect(() => {
    // Only run if we haven't completed initial sync
    if (hasCompletedInitialSync) {
      return
    }

    // Check all conditions
    const shouldSync = apiKeys.length > 0 && preferences && !preferencesLoading && !syncingModels && user

    if (shouldSync) {
      console.log('[EnhancedApiKeys] Starting initial model sync...')
      syncExistingModelsToPreferences()
    }
  }, [apiKeys.length, preferences, preferencesLoading, syncingModels, user, hasCompletedInitialSync]) // Removed function from dependencies

  // Preload models for existing providers in parallel
  useEffect(() => {
    if (apiKeys.length > 0) {
      const uniqueProviders = [...new Set(apiKeys.map(key => key.provider))]
      const providersToFetch = uniqueProviders.filter(provider =>
        !providerModels[provider] && !loadingModels[provider]
      )

      if (providersToFetch.length > 0) {
        // Use the hook's fetchProviderModels function which handles loading states internally
        Promise.allSettled(
          providersToFetch.map(provider => fetchProviderModels(provider))
        )
      }
    }
  }, [apiKeys, providerModels, loadingModels, fetchProviderModels])

  // Preload models for all available providers to show in "All Available Models" section
  useEffect(() => {
    if (modelsDevProviders.length > 0) {
      const providersToFetch = modelsDevProviders.filter(provider =>
        (!provider.models || provider.models.length === 0) && !loadingModels[provider.id]
      )

      if (providersToFetch.length > 0) {
        providersToFetch.forEach(provider => {
          fetchProviderModels(provider.id)
        })
      }
    }
  }, [modelsDevProviders, loadingModels, fetchProviderModels])

  const updatePreferenceOrder = async (newPreferences: Record<string, ModelPreference>) => {
    try {
      const response = await fetch('/api/preferences/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reorderedPreferences: newPreferences })
      })

      if (!response.ok) throw new Error('Failed to update preference order')

      // Update through the shared hook to trigger refresh across all components
      await updateUserPreferences({ model_preferences: newPreferences })
      console.log('[EnhancedApiKeys] Updated model preferences:', newPreferences)
    } catch (err: any) {
      setError(err.message)
    }
  }


  const toggleProviderExpanded = (provider: string) => {
    setExpandedProviders(prev => ({
      ...prev,
      [provider]: !prev[provider]
    }))
  }

  const toggleAvailableProviderExpanded = (provider: string) => {
    setExpandedAvailableProviders(prev => ({
      ...prev,
      [provider]: !prev[provider]
    }))
  }

  const addModelToProvider = async (provider: string, model: string) => {
    if (!preferences) return

    console.log(`[EnhancedApiKeys] Adding model ${model} to provider ${provider}`)
    const currentPref = preferences.model_preferences?.[provider] || { models: [], order: Object.keys(preferences.model_preferences || {}).length + 1 }
    const updatedModels = [...currentPref.models, model].filter((m, i, arr) => arr.indexOf(m) === i) // Remove duplicates

    const newPreferences = {
      ...(preferences.model_preferences || {}),
      [provider]: {
        ...currentPref,
        models: updatedModels
      }
    }

    await updatePreferenceOrder(newPreferences)
  }

  const removeModelFromProvider = async (provider: string, model: string) => {
    if (!preferences) return

    console.log(`[EnhancedApiKeys] Removing model ${model} from provider ${provider}`)
    const currentPref = preferences.model_preferences?.[provider]
    if (!currentPref) return

    const updatedModels = currentPref.models.filter(m => m !== model)

    const newPreferences = {
      ...(preferences.model_preferences || {}),
      [provider]: {
        ...currentPref,
        models: updatedModels
      }
    }

    await updatePreferenceOrder(newPreferences)
  }

  // Refresh CLI statuses manually (fetchCliStatuses is now integrated into fetchData)
  const refreshCliStatuses = async () => {
    if (!user?.id) return
    
    try {
      setCliStatusLoading(true)
      
      const response = await fetch('/api/cli-status')
      if (!response.ok) throw new Error('Failed to fetch CLI status')
      
      const data = await response.json()
      
      const transformedStatuses: CLIConfig[] = Object.entries(data).map(([provider, config]: [string, any]) => ({
        user_id: user.id,
        provider,
        custom_path: config?.custom_path || null,
        enabled: config?.enabled || true,
        status: config?.status || 'unchecked',
        last_checked_at: config?.last_checked_at,
        statusMessage: config?.message,
        message: config?.message,
        cli_version: config?.cli_version,
        authenticated: config?.authenticated,
        issue_type: config?.issue_type,
        solutions: config?.solutions,
        install_command: config?.install_command,
        auth_command: config?.auth_command
      }))
      
      setCliStatuses(transformedStatuses)
      
    } catch (err: any) {
      console.error('Failed to fetch CLI status:', err.message)
      setCliStatuses([])
    } finally {
      setCliStatusLoading(false)
    }
  }

  const saveApiKey = async () => {
    try {
      setSaving(true)
      
      // Validate API key requirement based on provider
      if (formData.provider !== 'openrouter' && !editingKey && !formData.api_key.trim()) {
        setError('Please enter an API key for this provider, or use OpenRouter for credit-based model access.')
        return
      }
      
      let response
      if (editingKey) {
        // Update existing API key
        const updateData: any = {
          api_base: formData.api_base,
          default_model: formData.default_model,
          is_preferred: formData.is_preferred,
          monthly_budget: formData.monthly_budget
        }

        // Only include API key if user chose to update it
        if (updateApiKey && formData.api_key.trim()) {
          updateData.encrypted_key = btoa(formData.api_key)
          updateData.key_preview = formData.api_key.length > 8
            ? `${formData.api_key.slice(0, 8)}...${formData.api_key.slice(-4)}`
            : `${formData.api_key.slice(0, 4)}***`
        }

        response = await fetch(`/api/api-keys/${editingKey.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        })

        if (response.ok) {
          // Handle model preference changes for existing API key
          const previousPreferred = editingKey.is_preferred
          const currentPreferred = formData.is_preferred

          if (!previousPreferred && currentPreferred && formData.default_model && formData.provider) {
            // Adding to preferences
            await addModelToProvider(formData.provider, formData.default_model)
          } else if (previousPreferred && !currentPreferred && editingKey.default_model && editingKey.provider) {
            // Removing from preferences (use the old model in case it changed)
            await removeModelFromProvider(editingKey.provider, editingKey.default_model)
          } else if (currentPreferred && formData.default_model !== editingKey.default_model) {
            // Model changed but still preferred - remove old, add new
            if (editingKey.default_model && editingKey.provider) {
              await removeModelFromProvider(editingKey.provider, editingKey.default_model)
            }
            if (formData.default_model && formData.provider) {
              await addModelToProvider(formData.provider, formData.default_model)
            }
          }
        }
      } else {
        // Create new API key
        response = await fetch('/api/api-keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })
      }
      
      if (!response.ok) throw new Error('Failed to save API key')

      // If user checked "Add to my model preferences", add the model to their preferences
      if (formData.is_preferred && formData.default_model && formData.provider) {
        await addModelToProvider(formData.provider, formData.default_model)
      }

      await refreshData()
      setShowAddForm(false)
      setEditingKey(null)
      setUpdateApiKey(false)
      setSuccess(editingKey ? 'API key updated successfully!' : 'API key added successfully!')
      setTimeout(() => setSuccess(null), 3000)
      setFormData({
        provider: 'openai',
        api_key: '',
        api_base: '',
        default_model: '',
        is_preferred: false,
        monthly_budget: null,
        reasoning_level: 1
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const deleteApiKey = async (id: string) => {
    try {
      setSaving(true)
      const response = await fetch(`/api/api-keys/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete API key')
      await refreshData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const togglePreferred = async (id: string, currentPreferred: boolean) => {
    try {
      // Find the API key to get its provider and model
      const apiKey = apiKeys.find(key => key.id === id)
      if (!apiKey) throw new Error('API key not found')

      const response = await fetch(`/api/api-keys/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_preferred: !currentPreferred })
      })
      if (!response.ok) throw new Error('Failed to update preference')

      // Add or remove model from preferences based on the new preference state
      if (!currentPreferred && apiKey.default_model && apiKey.provider) {
        // Adding to preferences
        await addModelToProvider(apiKey.provider, apiKey.default_model)
      } else if (currentPreferred && apiKey.default_model && apiKey.provider) {
        // Removing from preferences
        await removeModelFromProvider(apiKey.provider, apiKey.default_model)
      }

      await refreshData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const reorderApiKeys = async (apiKeyIds: string[]) => {
    try {
      const response = await fetch('/api/api-keys/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKeyIds })
      })
      if (!response.ok) throw new Error('Failed to reorder API keys')
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return

    const items = Array.from(apiKeys)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    // Send the new order to the server
    const orderedIds = items.map(item => item.id)
    await reorderApiKeys(orderedIds)
  }

  if (authLoading || loading || preferencesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Group API keys by provider
  const groupedApiKeys = apiKeys.reduce((acc, key) => {
    if (!acc[key.provider]) {
      acc[key.provider] = []
    }
    acc[key.provider].push(key)
    return acc
  }, {} as Record<string, ApiKey[]>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Models</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Configure providers, manage API keys, and access AI models via API keys, CLI, or credits
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Provider</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          <span className="text-red-700 dark:text-red-300">{error}</span>
          <button 
            onClick={() => setError(null)}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center space-x-2">
          <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
          <span className="text-green-700 dark:text-green-300">{success}</span>
          <button
            onClick={() => setSuccess(null)}
            className="ml-auto text-green-600 hover:text-green-800"
          >
            ×
          </button>
        </div>
      )}

      {/* Model Source Priority Picker */}
      <ModelSourcePriorityPicker />

      {/* Model Preference Selector */}
      <ModelPreferenceSelector />

      {/* CLI Tools Status Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Terminal className="w-5 h-5" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                CLI Tools Status
              </h2>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={refreshCliStatuses}
                disabled={cliStatusLoading}
                className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2 text-sm"
              >
                {cliStatusLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Refreshing...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Refresh Status</span>
                  </>
                )}
              </button>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mt-1 mb-4">
            CLI status is automatically updated when MCP clients connect. Click "Refresh Status" to get latest data from server.
          </p>
          
          {/* Enhanced CLI Status Display */}
          <div className="grid grid-cols-1 gap-4">
            {CLI_PROVIDERS.map((cliProvider) => {
              const status = cliStatuses.find(s => s.provider === cliProvider.provider)
              const statusType = status?.status || 'unchecked'
              const lastChecked = status?.last_checked_at ? new Date(status.last_checked_at).toLocaleString() : null

              return (
                <div key={cliProvider.provider} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {cliProvider.name}
                        </h3>
                        {status?.cli_version && (
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
                            {status.cli_version}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {cliProvider.description}
                      </p>
                      
                      {/* Status Message */}
                      {status?.message && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                          {status.message}
                        </p>
                      )}
                      
                      {/* Issue Type and Solutions */}
                      {status?.issue_type && status?.solutions && status.solutions.length > 0 && (
                        <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                          <div className="flex items-start space-x-2">
                            <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                                Solutions to fix this issue:
                              </p>
                              <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                                {status.solutions.map((solution, index) => (
                                  <li key={index} className="flex items-start space-x-1">
                                    <span className="text-yellow-600 dark:text-yellow-400 mt-1">•</span>
                                    <span>{solution}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Quick Action Commands */}
                      {(status?.install_command || status?.auth_command) && (
                        <div className="mt-3 space-y-2">
                          {status.install_command && (
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                              <p className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">Install Command:</p>
                              <div className="flex items-center justify-between">
                                <code className="text-xs text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded flex-1 mr-2">
                                  {status.install_command}
                                </code>
                                <button
                                  onClick={() => navigator.clipboard.writeText(status.install_command || '')}
                                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                                  title="Copy to clipboard"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          )}
                          
                          {status.auth_command && (
                            <div className="p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                              <p className="text-xs font-medium text-green-800 dark:text-green-200 mb-1">Authentication Command:</p>
                              <div className="flex items-center justify-between">
                                <code className="text-xs text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-800 px-2 py-1 rounded flex-1 mr-2">
                                  {status.auth_command}
                                </code>
                                <button
                                  onClick={() => navigator.clipboard.writeText(status.auth_command || '')}
                                  className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
                                  title="Copy to clipboard"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {lastChecked && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                          Last checked: {lastChecked}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-1 ml-3">
                      {statusType === 'available' && (
                        <div className="flex items-center space-x-1 text-green-600">
                          <CheckCircle className="w-5 h-5" />
                          <div className="text-right">
                            <div className="text-xs font-medium">Available</div>
                            {status?.authenticated !== undefined && (
                              <div className="text-xs text-green-500">
                                {status.authenticated ? 'Authenticated' : 'Not Authenticated'}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {statusType === 'unavailable' && (
                        <div className="flex items-center space-x-1 text-yellow-600">
                          <XCircle className="w-5 h-5" />
                          <div className="text-right">
                            <div className="text-xs font-medium">Unavailable</div>
                            <div className="text-xs text-yellow-500">
                              {status?.issue_type === 'not_authenticated' ? 'Not Authenticated' :
                               status?.issue_type === 'compatibility_issue' ? 'Compatibility Issue' :
                               status?.issue_type === 'environment_issue' ? 'Environment Issue' :
                               'Issue Detected'}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {statusType === 'not_installed' && (
                        <div className="flex items-center space-x-1 text-red-600">
                          <XCircle className="w-5 h-5" />
                          <div className="text-right">
                            <div className="text-xs font-medium">Not Installed</div>
                            <div className="text-xs text-red-500">Install Required</div>
                          </div>
                        </div>
                      )}
                      
                      {statusType === 'unchecked' && (
                        <div className="flex items-center space-x-1 text-gray-500">
                          <Clock className="w-5 h-5" />
                          <div className="text-right">
                            <div className="text-xs">No Data</div>
                            <div className="text-xs text-gray-400">Click Refresh</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          
          {cliStatusLoading && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Refreshing CLI status...</strong> Getting latest data from server.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* API Keys Section */}
      {apiKeys.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>API Keys</span>
            <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">
              (Drag to reorder for MCP priority)
            </span>
          </h2>
          
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="api-keys">
              {(provided) => (
                <div 
                  className="space-y-3"
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {apiKeys.map((key, index) => {
                    const providerConfig = legacyProviders[key.provider]
                    return (
                      <Draggable key={key.id} draggableId={key.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`border rounded-lg p-4 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 ${
                              snapshot.isDragging ? 'shadow-lg bg-white dark:bg-gray-600' : ''
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div 
                                {...provided.dragHandleProps}
                                className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
                              >
                                <GripVertical className="w-5 h-5" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-sm font-medium">
                                      #{index + 1}
                                    </span>
                                    <div className="flex items-center space-x-2">
                                      {(() => {
                                        const providerData = getProviderDisplayData(key.provider)
                                        return providerData?.logoUrl && (
                                          <img 
                                            src={providerData.logoUrl} 
                                            alt={providerConfig?.name || key.provider}
                                            className="w-5 h-5 rounded"
                                            onError={(e) => {
                                              console.error(`Failed to load provider logo: ${providerData.logoUrl}`)
                                              e.currentTarget.style.display = 'none'
                                            }}
                                          />
                                        )
                                      })()}
                                      <span className="font-medium text-gray-900 dark:text-white capitalize">
                                        {providerConfig?.name || key.provider}
                                      </span>
                                    </div>
                                    {key.is_preferred && (
                                      <span title="Preferred provider">
                                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                                      </span>
                                    )}
                                    {key.is_primary && (
                                      <span title="Primary key for this provider">
                                        <Crown className="w-4 h-4 text-purple-600 fill-current" />
                                      </span>
                                    )}
                                    <button
                                      onClick={() => toggleProviderExpanded(key.id)}
                                      className="text-gray-400 hover:text-gray-600"
                                    >
                                      {expandedProviders[key.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                    </button>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    {/* Monthly Budget and Usage */}
                                    <div className="flex items-center space-x-3">
                                      {key.monthly_budget && (
                                        <span className="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded">
                                          ${key.monthly_budget}/month
                                        </span>
                                      )}
                                      {apiKeyUsage[key.id] && (
                                        <div className="flex items-center space-x-2">
                                          <span className="text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                                            ${apiKeyUsage[key.id].monthly_cost.toFixed(4)} used
                                          </span>
                                          {key.monthly_budget && (
                                            <span className="text-xs text-gray-500">
                                              ({((apiKeyUsage[key.id].monthly_cost / key.monthly_budget) * 100).toFixed(1)}%)
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <span className="text-sm text-gray-500 font-mono">
                                        {showApiKey[key.id] && key.encrypted_key 
                                          ? atob(key.encrypted_key) 
                                          : key.key_preview
                                        }
                                      </span>
                                      {key.encrypted_key && (
                                        <div className="flex items-center space-x-1">
                                          <button
                                            onClick={() => setShowApiKey(prev => ({...prev, [key.id]: !prev[key.id]}))}
                                            className="text-gray-400 hover:text-gray-600 p-1"
                                            title={showApiKey[key.id] ? "Hide API key" : "Show API key"}
                                          >
                                            {showApiKey[key.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                          </button>
                                          <button
                                            onClick={() => copyApiKey(key)}
                                            className="text-gray-400 hover:text-gray-600 p-1"
                                            title="Copy API key"
                                          >
                                            <Copy className="w-3 h-3" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                {expandedProviders[key.id] && (
                                  <div className="mt-3 space-y-2 pl-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                      <div>API URL: <span className="font-mono text-xs">{key.api_base || providerConfig?.baseUrl}</span></div>
                                      <div>Default Model: <span className="font-mono text-xs">{key.default_model}</span></div>
                                    </div>
                                    <div className="flex space-x-2 pt-2">
                                      <button
                                        className={`text-sm flex items-center space-x-1 ${key.is_primary ? 'text-purple-600 hover:text-purple-800' : 'text-gray-600 hover:text-purple-600'}`}
                                        onClick={async () => {
                                          try {
                                            const response = await fetch(`/api/api-keys/${key.id}`, {
                                              method: 'PUT',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({ is_primary: !key.is_primary })
                                            })
                                            if (response.ok) {
                                              refreshData()
                                            }
                                          } catch (error) {
                                            console.error('Error toggling primary key:', error)
                                          }
                                        }}
                                        title={key.is_primary ? 'Remove as primary' : 'Mark as primary'}
                                      >
                                        <Crown className={`w-3 h-3 ${key.is_primary ? 'fill-current' : ''}`} />
                                        <span>{key.is_primary ? 'Primary' : 'Set Primary'}</span>
                                      </button>
                                      <button
                                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center space-x-1"
                                        onClick={() => {
                                          setEditingKey(key)
                                          setUpdateApiKey(false) // Start with not updating the key
                                          setFormData({
                                            provider: key.provider,
                                            api_key: '', // Don't pre-fill for security
                                            api_base: key.api_base || '',
                                            default_model: key.default_model || '',
                                            is_preferred: key.is_preferred || false,
                                            monthly_budget: key.monthly_budget ?? null,
                                            reasoning_level: (key as any).reasoning_level || 1
                                          })
                                          setShowAddForm(true)
                                        }}
                                      >
                                        <Edit3 className="w-3 h-3" />
                                        <span>Edit</span>
                                      </button>
                                      <button
                                        className="text-red-600 hover:text-red-800 text-sm flex items-center space-x-1"
                                        onClick={() => deleteApiKey(key.id)}
                                      >
                                        <Trash2 className="w-3 h-3" />
                                        <span>Delete</span>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    )
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      )}


      {/* Add/Edit Form Modal */}
      {(showAddForm || editingKey) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full my-8 p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {editingKey ? 'Edit API Key' : 'Add API Key'}
            </h3>
            
            <div className="space-y-4">
              {/* Provider Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Provider
                </label>
                <div className="relative">
                  <select
                    value={formData.provider}
                    onChange={async (e) => {
                      const providerId = e.target.value
                      setFormData(prev => ({...prev, provider: providerId, default_model: ''}))
                      if (providerId) {
                        await fetchProviderModels(providerId)
                      }
                    }}
                    className="w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white max-h-48 overflow-y-auto"
                    style={{
                      fontSize: '14px',
                      lineHeight: '1.2'
                    }}
                  >
                    <option value="">Select a provider</option>
                    {modelsDevProviders.length > 0 ? (
                      modelsDevProviders.map((provider) => (
                        <option key={provider.id} value={provider.id}>
                          {provider.name}
                        </option>
                      ))
                    ) : (
                      Object.entries(legacyProviders).map(([id, provider]) => (
                        <option key={id} value={id}>
                          {provider.name}
                        </option>
                      ))
                    )}
                  </select>
                  {/* Show selected provider logo */}
                  {formData.provider && (() => {
                    const providerData = getProviderDisplayData(formData.provider)
                    return providerData?.logoUrl && (
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <img 
                          src={providerData.logoUrl} 
                          alt={providerData.displayName}
                          className="w-4 h-4"
                          onError={(e) => {
                            console.error(`Failed to load logo: ${providerData.logoUrl}`)
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      </div>
                    )
                  })()}
                </div>
              </div>

              {/* Provider Information */}
              {formData.provider && (() => {
                const providerData = getProviderDisplayData(formData.provider)
                return providerData && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        {providerData.logoUrl && (
                          <img 
                            src={providerData.logoUrl} 
                            alt={providerData.displayName}
                            className="w-6 h-6"
                            onError={(e) => {
                              console.error(`Failed to load provider logo: ${providerData.logoUrl}`)
                              // Fallback to Lucide icon if image fails to load
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          {providerData.displayName}
                        </h4>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                          {'enhancedDescription' in providerData ? providerData.enhancedDescription : providerData.description}
                        </p>
                        <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                          <div>API URL: <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">{providerData.baseUrl}</code></div>
                          <div className="mt-1">Models: {'modelCount' in providerData ? providerData.modelCount : 'Multiple'} available</div>
                          <div className="mt-1">Auth: {formData.provider === 'openrouter' ? 'API Key Optional (Credits Available)' : 'API Key Required'}</div>
                          {providerData.modelsDevData && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {'supportsVision' in providerData && providerData.supportsVision && <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-1 rounded text-xs">Vision</span>}
                              {'supportsTools' in providerData && providerData.supportsTools && <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 px-1 rounded text-xs">Tools</span>}
                              {'supportsReasoning' in providerData && providerData.supportsReasoning && <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 px-1 rounded text-xs">Reasoning</span>}
                              {'supportsPromptCaching' in providerData && providerData.supportsPromptCaching && <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-1 rounded text-xs">Cache</span>}
                            </div>
                          )}
                          {providerData.websiteUrl && (
                            <div className="mt-1">
                              Website: <a href={providerData.websiteUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-800">
                                {providerData.websiteUrl.replace(/^https?:\/\//, '')}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* API Base URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  API Base URL
                </label>
                <div className="space-y-2">
                  {(() => {
                    const providerData = getProviderDisplayData(formData.provider)
                    const defaultBaseUrl = providerData?.baseUrl || legacyProviders[formData.provider]?.baseUrl
                    return (
                      <>
                        <input
                          type="url"
                          value={formData.api_base || defaultBaseUrl || ''}
                          onChange={(e) => setFormData(prev => ({...prev, api_base: e.target.value}))}
                          placeholder={defaultBaseUrl || 'Enter custom API base URL'}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Default: {defaultBaseUrl || 'No default URL'}
                        </p>
                      </>
                    )
                  })()}
                </div>
              </div>

              {/* API Key */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center space-x-2">
                    <span>API Key</span>
                    {formData.provider === 'openrouter' ? (
                      <span className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full text-xs font-medium border border-emerald-200 dark:border-emerald-700 shadow-sm">
                        ✓ Optional
                      </span>
                    ) : (
                      <span className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 px-3 py-1 rounded-full text-xs font-medium border border-amber-200 dark:border-amber-700 shadow-sm">
                        ● Required
                      </span>
                    )}
                  </label>
                  {editingKey && (
                    <button
                      type="button"
                      onClick={() => setUpdateApiKey(!updateApiKey)}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      {updateApiKey ? 'Keep existing key' : 'Update API key'}
                    </button>
                  )}
                </div>
                {(!editingKey || updateApiKey) ? (
                  <input
                    type="password"
                    value={formData.api_key}
                    onChange={(e) => setFormData(prev => ({...prev, api_key: e.target.value}))}
                    placeholder={formData.provider === 'openrouter' ? "Enter your API key (optional - will use credits if not provided)" : "Enter your API key (required for this provider)"}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  />
                ) : (
                  <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm">
                    API key will remain unchanged
                  </div>
                )}
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center space-x-1">
                  <CheckCircle className="w-3 h-3" />
                  <span>
                    {formData.provider === 'openrouter' ? 
                      'Your OpenRouter API key is optional. When not provided, models will automatically use your Polydev credits.' :
                      !editingKey ?
                        'This provider requires your personal API key for direct access to their models.' :
                        'Leave empty to keep current API key, or enter new key to update.'
                    }
                  </span>
                </p>
              </div>

              {/* Default Model */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Default Model
                </label>
                <select
                  value={formData.default_model}
                  onChange={(e) => setFormData(prev => ({...prev, default_model: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white max-h-48 overflow-y-auto"
                  style={{
                    fontSize: '14px',
                    lineHeight: '1.2'
                  }}
                >
                  <option value="">Select model</option>
                  {loadingModels[formData.provider] && (
                    <option disabled>Loading models...</option>
                  )}
                  {(providerModels[formData.provider] || []).map(model => {
                    const inputCost = (model.input_cost_per_million || 0) // Already per 1M tokens
                    const outputCost = (model.output_cost_per_million || 0) // Already per 1M tokens
                    const modelTierInfo = getModelTier(model.id)
                    const tierBadge = modelTierInfo
                      ? ` [${modelTierInfo.tier === 'premium' ? '👑 Premium' : modelTierInfo.tier === 'normal' ? '⭐ Normal' : '🌿 Eco'}]`
                      : ''
                    const priceText = inputCost > 0 || outputCost > 0
                      ? ` - $${inputCost.toFixed(2)}/$${outputCost.toFixed(2)} per 1M`
                      : ''
                    return (
                      <option key={model.id} value={model.id}>
                        {model.display_name || model.name}{tierBadge}{priceText}
                      </option>
                    )
                  })}
                </select>
              </div>

              {/* Model Tier Badge Display */}
              {formData.default_model && (() => {
                const selectedModel = (providerModels[formData.provider] || []).find(m => m.id === formData.default_model)
                if (!selectedModel) return null

                const modelTierInfo = getModelTier(selectedModel.id)
                if (!modelTierInfo) return null

                const tierColors = {
                  premium: { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800', text: 'text-purple-800 dark:text-purple-200', badge: 'bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200' },
                  normal: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-800 dark:text-blue-200', badge: 'bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200' },
                  eco: { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', text: 'text-green-800 dark:text-green-200', badge: 'bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200' }
                }
                const colors = tierColors[modelTierInfo.tier]
                const TierIcon = modelTierInfo.tier === 'premium' ? Crown : modelTierInfo.tier === 'normal' ? Star : Leaf

                return (
                  <div className={`${colors.bg} border ${colors.border} rounded-lg p-3 mb-3`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <TierIcon className={`w-4 h-4 ${colors.text}`} />
                        <span className={`text-sm font-medium ${colors.text}`}>
                          {modelTierInfo.tier.charAt(0).toUpperCase() + modelTierInfo.tier.slice(1)} Perspective Tier
                        </span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${colors.badge}`}>
                        Uses {modelTierInfo.tier} quota
                      </span>
                    </div>
                  </div>
                )
              })()}

              {/* Model Pricing Display */}
              {formData.default_model && (() => {
                const selectedModel = (providerModels[formData.provider] || []).find(m => m.id === formData.default_model)
                if (!selectedModel) return null

                const inputCost = (selectedModel.input_cost_per_million || 0) // Already per 1M tokens
                const outputCost = (selectedModel.output_cost_per_million || 0) // Already per 1M tokens

                if (inputCost === 0 && outputCost === 0) return null

                return (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Model Pricing
                      </h4>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-white dark:bg-blue-800/30 rounded-md p-2 border border-blue-200 dark:border-blue-700">
                        <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">Input</div>
                        <div className="text-lg font-bold text-blue-800 dark:text-blue-200">
                          ${inputCost.toFixed(2)}
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400">per 1M tokens</div>
                      </div>
                      <div className="bg-white dark:bg-blue-800/30 rounded-md p-2 border border-blue-200 dark:border-blue-700">
                        <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">Output</div>
                        <div className="text-lg font-bold text-blue-800 dark:text-blue-200">
                          ${outputCost.toFixed(2)}
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400">per 1M tokens</div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-blue-700 dark:text-blue-300">
                      💡 Typical prompt (~500 tokens): ~$<span className="font-medium">{(inputCost * 500 / 1000).toFixed(6)}</span> input + response varies by length
                    </div>
                  </div>
                )
              })()}

              {/* Reasoning Level Slider for Reasoning Models */}
              {formData.default_model && (() => {
                const selectedModel = (providerModels[formData.provider] || []).find(m => m.id === formData.default_model)
                return selectedModel?.supports_reasoning ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Reasoning Level: {formData.reasoning_level}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max={selectedModel.reasoning_levels || 5}
                      value={formData.reasoning_level}
                      onChange={(e) => setFormData(prev => ({...prev, reasoning_level: parseInt(e.target.value)}))}
                      className="w-full h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer dark:bg-orange-700 slider"
                      style={{
                        background: `linear-gradient(to right, #ea580c 0%, #ea580c ${((formData.reasoning_level - 1) / ((selectedModel.reasoning_levels || 5) - 1)) * 100}%, #fed7aa ${((formData.reasoning_level - 1) / ((selectedModel.reasoning_levels || 5) - 1)) * 100}%, #fed7aa 100%)`
                      }}
                    />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>Faster</span>
                      <span>More thorough</span>
                    </div>
                    <div className="mt-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                      <p className="text-xs text-orange-800 dark:text-orange-300">
                        <strong>⚡ Reasoning Model:</strong> This model supports advanced reasoning. Higher levels provide more thorough analysis but take longer to respond.
                      </p>
                      <div className="mt-1 text-xs text-orange-600 dark:text-orange-400">
                        Level {formData.reasoning_level}: {
                          formData.reasoning_level === 1 ? "Quick reasoning" :
                          formData.reasoning_level === 2 ? "Basic reasoning" :
                          formData.reasoning_level === 3 ? "Moderate reasoning" :
                          formData.reasoning_level === 4 ? "Deep reasoning" :
                          "Maximum reasoning"
                        }
                      </div>
                    </div>
                  </div>
                ) : null
              })()}

              {/* Make Preferred Toggle */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_preferred"
                  checked={formData.is_preferred}
                  onChange={(e) => setFormData(prev => ({...prev, is_preferred: e.target.checked}))}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <label htmlFor="is_preferred" className="text-sm text-gray-700 dark:text-gray-300">
                  Add to my model preferences
                </label>
              </div>


              {/* Budget Limit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Budget Limit (USD/month) - Optional
                </label>
                <input
                  type="number"
                  value={formData.monthly_budget || ''}
                  onChange={(e) => setFormData(prev => ({...prev, monthly_budget: e.target.value ? parseFloat(e.target.value) : null}))}
                  placeholder="e.g. 100.00"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Set a monthly spending limit for this provider (leave empty for no limit)
                </p>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={saveApiKey}
                disabled={saving || !formData.default_model || (formData.provider !== 'openrouter' && !editingKey && !formData.api_key.trim())}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{editingKey ? 'Update' : 'Save'}</span>
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setEditingKey(null)
                  setUpdateApiKey(false)
                  setFormData({
                    provider: 'openai',
                    api_key: '',
                    api_base: '',
                    default_model: '',
                    is_preferred: false,
                                monthly_budget: null,
                    reasoning_level: 5
                  })
                }}
                className="text-gray-600 dark:text-gray-300 px-4 py-2 hover:text-gray-900 dark:hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* All Available Models Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
        <button
          onClick={() => setAllModelsExpanded(!allModelsExpanded)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center gap-3">
            {allModelsExpanded ? (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            )}
            <div className="text-left">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">All Available Models</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Browse all models from all providers
              </p>
            </div>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {modelsDevProviders.length} providers
          </div>
        </button>

        {allModelsExpanded && (
          <div className="px-6 pb-6 border-t border-gray-100 dark:border-gray-700">
            <div className="mt-4 space-y-4">
              {modelsDevProviders.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  Loading available models...
                </div>
              ) : (
                <div className="space-y-4">
            {modelsDevProviders.map((provider) => (
              <div key={provider.id} className="border rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                     onClick={() => toggleAvailableProviderExpanded(provider.id)}>
                  <div className="flex items-center space-x-3">
                    {provider.logo && (
                      <img
                        src={provider.logo}
                        alt={provider.name}
                        className="w-6 h-6 rounded"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    )}
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {provider.name}
                      </h3>
                      {provider.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {provider.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {provider.modelsCount || provider.models?.length || 0} models
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                      {expandedAvailableProviders[provider.id] ?
                        <ChevronDown className="w-4 h-4" /> :
                        <ChevronRight className="w-4 h-4" />
                      }
                    </button>
                  </div>
                </div>

                {/* Only show models when expanded */}
                {expandedAvailableProviders[provider.id] && (
                  <div className="px-4 pb-4">
                    {/* Load and display models for this provider */}
                    {provider.models && provider.models.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                        {provider.models.map((model) => (
                          <div key={model.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                            <div className="font-medium text-gray-900 dark:text-white text-sm">
                              {model.name}
                            </div>
                            {(model.pricing?.input || model.pricing?.output) && (
                              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                ${model.pricing.input?.toFixed(2) || '0.00'} / ${model.pricing.output?.toFixed(2) || '0.00'} per 1M tokens
                              </div>
                            )}
                            {model.contextWindow && (
                              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                {model.contextWindow.toLocaleString()} tokens
                              </div>
                            )}
                            <div className="flex items-center space-x-2 mt-2">
                              {(model.supportsVision || model.supports_vision) && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                  Vision
                                </span>
                              )}
                              {(model.supportsTools || model.supports_tools) && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  Tools
                                </span>
                              )}
                              {(model.supportsReasoning || model.supports_reasoning) && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                  Reasoning
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Show loading state or fetch button for providers without models */}
                    {(!provider.models || provider.models.length === 0) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          fetchProviderModels(provider.id)
                        }}
                        disabled={loadingModels[provider.id]}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 text-sm disabled:opacity-50 mt-3"
                      >
                        {loadingModels[provider.id] ? 'Loading models...' : 'Load models'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
