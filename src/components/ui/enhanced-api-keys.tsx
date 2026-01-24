'use client'

import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { usePreferences } from '../../hooks/usePreferences'
import { useEnhancedApiKeysData } from '../../hooks/useEnhancedApiKeysData'
import { createClient } from '../../app/utils/supabase/client'
import { Plus, Eye, EyeOff, Edit3, Trash2, AlertCircle, Check, CheckCircle, ChevronDown, ChevronRight, Terminal, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'
import { AnimatePresence } from 'framer-motion'
import { ProviderConfig } from '../../types/providers'
import { PROVIDER_ICONS } from '../../lib/provider-icons'
// Use API endpoint instead of direct modelsDevService import to avoid server-side imports in client component
import { getModelTier } from '../../lib/model-tiers'
import ModelSourcePriorityPicker from '../ModelSourcePriorityPicker'
import ModelPriorityWaterfall from '../ModelPriorityWaterfall'

// Recommended models per provider - these are the flagship models for each
const RECOMMENDED_MODELS: Record<string, string> = {
  'anthropic': 'claude-sonnet-4-5-20250514',
  'openai': 'gpt-4.1',
  'google': 'gemini-2.5-pro',
  'x-ai': 'grok-3',
  'groq': 'llama-3.3-70b-versatile',
  'cerebras': 'llama-3.3-70b',
  'together': 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
  'openrouter': 'anthropic/claude-sonnet-4'
}

// Lazy load Advanced mode components to reduce initial bundle size
const ModelPreferenceSelector = lazy(() => import('../ModelPreferenceSelector'))

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

// Helper function to format time ago
function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
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
    quota,
    modelTiers,
    loading: dataLoading,
    error: dataError,
    refresh,
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
  const [showOnboarding, setShowOnboarding] = useState(true)

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

  // PERFORMANCE FIX: Disabled redundant model fetching - models are already loaded in initial fetch
  // These useEffect hooks were causing 10+ sequential API calls (15-20s load time)
  // The initial fetch in useEnhancedApiKeysData already includes all provider models

  // // Preload models for existing providers in parallel
  // useEffect(() => {
  //   if (apiKeys.length > 0) {
  //     const uniqueProviders = [...new Set(apiKeys.map(key => key.provider))]
  //     const providersToFetch = uniqueProviders.filter(provider =>
  //       !providerModels[provider] && !loadingModels[provider]
  //     )

  //     if (providersToFetch.length > 0) {
  //       // Use the hook's fetchProviderModels function which handles loading states internally
  //       Promise.allSettled(
  //         providersToFetch.map(provider => fetchProviderModels(provider))
  //       )
  //     }
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [apiKeys.length, fetchProviderModels])

  // // Preload models for all available providers to show in "All Available Models" section
  // useEffect(() => {
  //   if (modelsDevProviders.length > 0) {
  //     const providersToFetch = modelsDevProviders.filter(provider =>
  //       (!provider.models || provider.models.length === 0) && !loadingModels[provider.id]
  //     )

  //     if (providersToFetch.length > 0) {
  //       providersToFetch.forEach(provider => {
  //         fetchProviderModels(provider.id)
  //       })
  //     }
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [modelsDevProviders.length, fetchProviderModels])

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

        console.log('[EnhancedApiKeys] Saving API key update:', {
          id: editingKey.id,
          provider: editingKey.provider,
          oldModel: editingKey.default_model,
          newModel: formData.default_model,
          updateData
        })

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

        console.log('[EnhancedApiKeys] API key update response:', response.status, response.ok)

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

      await refresh()
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
      await refresh()
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
      if (!currentPreferred && apiKey.is_preferred && apiKey.default_model && apiKey.provider) {
        // Adding to preferences
        await addModelToProvider(apiKey.provider, apiKey.default_model)
      } else if (currentPreferred && apiKey.is_preferred && apiKey.default_model && apiKey.provider) {
        // Removing from preferences
        await removeModelFromProvider(apiKey.provider, apiKey.default_model)
      }

      await refresh()
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
      await refresh() // Refresh the list after reordering
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Handle moving API key up or down in priority
  const handleMoveKey = async (keyId: string, direction: 'up' | 'down') => {
    const currentIndex = apiKeys.findIndex(key => key.id === keyId)
    if (currentIndex === -1) return
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= apiKeys.length) return

    // Create new array with swapped positions
    const items = Array.from(apiKeys)
    const [movedItem] = items.splice(currentIndex, 1)
    items.splice(newIndex, 0, movedItem)

    // Send the new order to the server
    const orderedIds = items.map(item => item.id)
    await reorderApiKeys(orderedIds)
  }

  if (authLoading || loading || preferencesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
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
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard" className="flex items-center gap-1 hover:text-slate-900 transition-colors">
          <Home className="w-4 h-4" />
          <span>Dashboard</span>
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-slate-900 font-medium">Models</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Models</h1>
        <p className="text-slate-500 text-sm">Manage your AI providers and API keys</p>
      </div>

      <AnimatePresence>
        {error && (
          <div
            className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center space-x-2"
          >
          <AlertCircle className="w-5 h-5 text-slate-900" />
          <span className="text-slate-900 font-medium">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-slate-600 hover:text-slate-900"
          >
            ×
          </button>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {success && (
          <div
            className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center space-x-2"
          >
          <Check className="w-5 h-5 text-slate-900" />
          <span className="text-slate-900 font-medium">{success}</span>
          <button
            onClick={() => setSuccess(null)}
            className="ml-auto text-slate-600 hover:text-slate-900"
          >
            ×
          </button>
          </div>
        )}
      </AnimatePresence>

      {/* Setup Progress Card - Show only for new users without API keys */}
      {showOnboarding && apiKeys.length === 0 && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 relative">
          <button
            onClick={() => setShowOnboarding(false)}
            className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 text-lg"
            title="Dismiss"
          >
            ×
          </button>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <h3 className="text-sm font-semibold text-slate-900">Get Started</h3>
              <p className="text-xs text-slate-600">Add an API key to start using Polydev</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
              >
                Add API Key
              </button>
              <Link
                href="/dashboard/mcp-tokens"
                className="px-4 py-2 bg-white text-slate-700 text-sm font-medium rounded-lg border border-slate-300 hover:bg-slate-50"
              >
                Connect IDE
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Model Priority Waterfall */}
      <ModelPriorityWaterfall
        apiKeys={apiKeys}
        quota={quota}
        modelTiers={modelTiers}
        cliStatuses={cliStatuses}
        modelsDevProviders={modelsDevProviders}
        onRefresh={refresh}
        onEditKey={async (key) => {
          setEditingKey(key)
          setUpdateApiKey(false)
          setFormData({
            provider: key.provider,
            api_key: '',
            api_base: key.api_base || '',
            default_model: key.default_model || '',
            is_preferred: key.is_preferred || false,
            monthly_budget: key.monthly_budget ?? null,
            reasoning_level: (key as any).reasoning_level || 1
          })
          setShowAddForm(true)
          // Fetch models for this provider so dropdown is populated
          if (key.provider) {
            await fetchProviderModels(key.provider)
          }
        }}
        onAddKey={() => setShowAddForm(true)}
        onDeleteKey={deleteApiKey}
      />

      {/* Add/Edit Form Modal */}
      {(showAddForm || editingKey) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 pt-20 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-md w-full my-8 p-6 max-h-[90vh] overflow-y-auto border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {editingKey ? 'Edit API Key' : 'Add API Key'}
            </h3>
            
            <div className="space-y-4">
              {/* Provider Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">
                  Provider
                </label>
                <div className="relative">
                  <select
                    value={formData.provider}
                    onChange={async (e) => {
                      const providerId = e.target.value
                      // Auto-set recommended model for the provider
                      const recommendedModel = RECOMMENDED_MODELS[providerId] || ''
                      setFormData(prev => ({...prev, provider: providerId, default_model: recommendedModel}))
                      if (providerId) {
                        await fetchProviderModels(providerId)
                      }
                    }}
                    className="w-full px-3 py-2 pl-10 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 bg-white max-h-48 overflow-y-auto"
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
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
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
                        <h4 className="text-sm font-medium text-slate-900">
                          {providerData.displayName}
                        </h4>
                        <p className="text-sm text-slate-600 mt-1">
                          {'enhancedDescription' in providerData ? providerData.enhancedDescription : providerData.description}
                        </p>
                        <div className="mt-2 text-xs text-slate-600">
                          <div>API URL: <code className="bg-slate-100 px-1 rounded">{providerData.baseUrl}</code></div>
                          <div className="mt-1">Models: {'modelCount' in providerData ? providerData.modelCount : 'Multiple'} available</div>
                          <div className="mt-1">Auth: {formData.provider === 'openrouter' ? 'API Key Optional (Credits Available)' : 'API Key Required'}</div>
                          {providerData.modelsDevData && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {'supportsVision' in providerData && providerData.supportsVision && <span className="bg-slate-100 text-slate-900 px-1 rounded text-xs border border-slate-200">Vision</span>}
                              {'supportsTools' in providerData && providerData.supportsTools && <span className="bg-slate-100 text-slate-900 px-1 rounded text-xs border border-slate-200">Tools</span>}
                              {'supportsReasoning' in providerData && providerData.supportsReasoning && <span className="bg-slate-100 text-slate-900 px-1 rounded text-xs border border-slate-200">Reasoning</span>}
                              {'supportsPromptCaching' in providerData && providerData.supportsPromptCaching && <span className="bg-slate-100 text-slate-900 px-1 rounded text-xs border border-slate-200">Cache</span>}
                            </div>
                          )}
                          {providerData.websiteUrl && (
                            <div className="mt-1">
                              Website: <a href={providerData.websiteUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-900">
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
                <label className="block text-sm font-medium text-slate-900 mb-1">
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
                          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 bg-white"
                        />
                        <p className="text-xs text-slate-600">
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
                  <label className="block text-sm font-medium text-slate-900 flex items-center space-x-2">
                    <span>API Key</span>
                    {formData.provider === 'openrouter' ? (
                      <span className="bg-slate-100 text-slate-900 px-3 py-1 rounded-full text-xs font-medium border border-slate-200">
                        ✓ Optional
                      </span>
                    ) : (
                      <span className="bg-slate-100 text-slate-900 px-3 py-1 rounded-full text-xs font-medium border border-slate-200">
                        ● Required
                      </span>
                    )}
                  </label>
                  {editingKey && (
                    <button
                      type="button"
                      onClick={() => setUpdateApiKey(!updateApiKey)}
                      className="text-xs text-slate-600 hover:text-slate-900 underline"
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 bg-white"
                  />
                ) : (
                  <div className="w-full px-3 py-2 border border-slate-300 rounded-md bg-slate-50 text-slate-600 text-sm">
                    API key will remain unchanged
                  </div>
                )}
                <p className="text-xs text-slate-600 mt-1 flex items-center space-x-1">
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
                <label className="block text-sm font-medium text-slate-900 mb-1">
                  Default Model
                </label>
                {/* Show warning if current model is not in the options list */}
                {formData.default_model &&
                 !loadingModels[formData.provider] &&
                 (providerModels[formData.provider] || []).length > 0 &&
                 !(providerModels[formData.provider] || []).some(m => m.id === formData.default_model) && (
                  <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800">
                    Current model "{formData.default_model}" is outdated or not available. Please select a new model.
                  </div>
                )}
                <select
                  value={formData.default_model}
                  onChange={(e) => setFormData(prev => ({...prev, default_model: e.target.value}))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 bg-white max-h-48 overflow-y-auto"
                  style={{
                    fontSize: '14px',
                    lineHeight: '1.2'
                  }}
                >
                  <option value="">Select model</option>
                  {loadingModels[formData.provider] && (
                    <option disabled>Loading models...</option>
                  )}
                  {/* Show current model if not in the list (for backwards compatibility) */}
                  {formData.default_model &&
                   !(providerModels[formData.provider] || []).some(m => m.id === formData.default_model) && (
                    <option value={formData.default_model} className="text-amber-600">
                      {formData.default_model} (outdated - please select new)
                    </option>
                  )}
                  {(providerModels[formData.provider] || []).map(model => {
                    const inputCost = (model.input_cost_per_million || 0) // Already per 1M tokens
                    const outputCost = (model.output_cost_per_million || 0) // Already per 1M tokens
                    const modelTierInfo = getModelTier(model.id)
                    const tierBadge = modelTierInfo
                      ? ` [${modelTierInfo.tier.charAt(0).toUpperCase() + modelTierInfo.tier.slice(1)}]`
                      : ''
                    const priceText = inputCost > 0 || outputCost > 0
                      ? ` - $${inputCost.toFixed(2)}/$${outputCost.toFixed(2)} per 1M`
                      : ''
                    const isRecommended = RECOMMENDED_MODELS[formData.provider] === model.id
                    const recommendedBadge = isRecommended ? ' ⭐ Recommended' : ''
                    return (
                      <option key={model.id} value={model.id}>
                        {model.display_name || model.name}{recommendedBadge}{tierBadge}{priceText}
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

                return (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-slate-900">
                          {modelTierInfo.tier.charAt(0).toUpperCase() + modelTierInfo.tier.slice(1)} Perspective Tier
                        </span>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full font-medium bg-slate-100 text-slate-900 border border-slate-200">
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
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="text-sm font-medium text-slate-900">
                        Model Pricing
                      </h4>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-white rounded-md p-2 border border-slate-200">
                        <div className="text-xs text-slate-600 font-medium">Input</div>
                        <div className="text-lg font-bold text-slate-900">
                          ${inputCost.toFixed(2)}
                        </div>
                        <div className="text-xs text-slate-600">per 1M tokens</div>
                      </div>
                      <div className="bg-white rounded-md p-2 border border-slate-200">
                        <div className="text-xs text-slate-600 font-medium">Output</div>
                        <div className="text-lg font-bold text-slate-900">
                          ${outputCost.toFixed(2)}
                        </div>
                        <div className="text-xs text-slate-600">per 1M tokens</div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-slate-600">
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
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Reasoning Level: {formData.reasoning_level}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max={selectedModel.reasoning_levels || 5}
                      value={formData.reasoning_level}
                      onChange={(e) => setFormData(prev => ({...prev, reasoning_level: parseInt(e.target.value)}))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider"
                      style={{
                        background: `linear-gradient(to right, #0f172a 0%, #0f172a ${((formData.reasoning_level - 1) / ((selectedModel.reasoning_levels || 5) - 1)) * 100}%, #cbd5e1 ${((formData.reasoning_level - 1) / ((selectedModel.reasoning_levels || 5) - 1)) * 100}%, #cbd5e1 100%)`
                      }}
                    />
                    <div className="flex justify-between text-xs">
                      <span>Faster</span>
                      <span>More thorough</span>
                    </div>
                    <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-xs text-slate-900">
                        <strong>⚡ Reasoning Model:</strong> This model supports advanced reasoning. Higher levels provide more thorough analysis but take longer to respond.
                      </p>
                      <div className="mt-1 text-xs text-slate-600">
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
                  className="rounded border-slate-300"
                />
                <label htmlFor="is_preferred" className="text-sm text-slate-900">
                  Add to my model preferences
                </label>
              </div>


              {/* Budget Limit */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">
                  Budget Limit (USD/month) - Optional
                </label>
                <input
                  type="number"
                  value={formData.monthly_budget || ''}
                  onChange={(e) => setFormData(prev => ({...prev, monthly_budget: e.target.value ? parseFloat(e.target.value) : null}))}
                  placeholder="e.g. 100.00"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 bg-white"
                />
                <p className="text-xs text-slate-600 mt-1">
                  Set a monthly spending limit for this provider (leave empty for no limit)
                </p>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={saveApiKey}
                disabled={saving || !formData.default_model || (formData.provider !== 'openrouter' && !editingKey && !formData.api_key.trim())}
                className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-700 disabled:opacity-50 flex items-center space-x-2"
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
                    reasoning_level: 1
                  })
                }}
                className="text-slate-600 px-4 py-2 hover:text-slate-900"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
