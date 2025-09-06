'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { createClient } from '../../app/utils/supabase/client'
import { Plus, Eye, EyeOff, Edit3, Trash2, Settings, TrendingUp, AlertCircle, Check, Filter, Star, StarOff, ChevronDown, ChevronRight, GripVertical, Terminal, CheckCircle, XCircle, Wrench, Clock, RefreshCw } from 'lucide-react'
import { CLINE_PROVIDERS, ProviderConfig } from '../../types/providers'
import { PROVIDER_ICONS } from '../../lib/openrouter-providers'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'

interface ApiKey {
  id: string
  provider: string
  key_preview: string
  active: boolean
  api_base?: string
  default_model?: string
  additional_models?: string[]
  is_preferred?: boolean
  budget_limit?: number
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
}

interface CLIProviderInfo {
  name: string
  provider: string
  defaultPaths: string[]
  authCommand: string
  description: string
}

export default function EnhancedApiKeysPage() {
  const { user, loading: authLoading, reAuthenticateForCLI, validateCLITools, cliValidationInProgress } = useAuth()
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [providers, setProviders] = useState<ProviderConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null)
  const [showApiKey, setShowApiKey] = useState<{[keyId: string]: boolean}>({})
  const [expandedProviders, setExpandedProviders] = useState<{[provider: string]: boolean}>({})
  const [updateApiKey, setUpdateApiKey] = useState(false)
  
  // CLI Configuration State
  const [cliConfigs, setCliConfigs] = useState<CLIConfig[]>([])
  const [showCliSettings, setShowCliSettings] = useState(false)
  const [editingCliConfig, setEditingCliConfig] = useState<CLIConfig | null>(null)
  const [cliLoading, setCliLoading] = useState(false)
  
  // MCP Token State for bidirectional CLI status reporting
  const [mcpToken, setMcpToken] = useState<string>('')
  const [mcpTokenLoading, setMcpTokenLoading] = useState(false)
  const [showMcpSetup, setShowMcpSetup] = useState(false)
  const [statusLogs, setStatusLogs] = useState<any[]>([])
  const [realTimeConnected, setRealTimeConnected] = useState(false)
  const [lastStatusUpdate, setLastStatusUpdate] = useState<Date | null>(null)
  
  // Form state with new fields
  const [formData, setFormData] = useState({
    provider: 'openai',
    api_key: '',
    api_base: '',
    default_model: '',
    is_preferred: false,
    additional_models: [] as string[],
    budget_limit: null as number | null
  })

  const supabase = createClient()

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

  const fetchData = async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      
      // Fetch API keys
      const { data: keysData, error: keysError } = await supabase
        .from('user_api_keys')
        .select('*')
        .eq('user_id', user.id)
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })

      if (keysError) throw keysError

      // Fetch user preferences
      const { data: prefsData, error: prefsError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single()
      
      // Only show providers that have API keys
      const providersWithKeys = Object.values(CLINE_PROVIDERS).filter(provider => 
        (keysData || []).some(key => key.provider === provider.id)
      )

      // Fetch CLI configurations
      const { data: cliData, error: cliError } = await supabase
        .from('cli_provider_configurations')
        .select('*')
        .eq('user_id', user.id)

      setApiKeys(keysData || [])
      setPreferences(prefsError ? null : prefsData)
      setProviders(providersWithKeys)
      setCliConfigs(cliError ? [] : cliData || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  const updatePreferenceOrder = async (newPreferences: Record<string, ModelPreference>) => {
    try {
      const response = await fetch('/api/preferences/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reorderedPreferences: newPreferences })
      })
      
      if (!response.ok) throw new Error('Failed to update preference order')
      
      setPreferences(prev => prev ? { ...prev, model_preferences: newPreferences } : null)
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

  const addModelToProvider = async (provider: string, model: string) => {
    if (!preferences) return
    
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

  // CLI Configuration Functions
  const fetchCliConfigs = async () => {
    if (!user?.id) return
    
    try {
      setCliLoading(true)
      const response = await fetch('/api/cli-config')
      
      if (!response.ok) throw new Error('Failed to fetch CLI configurations')
      
      const data = await response.json()
      setCliConfigs(data.configs || [])
      
      if (data.detected && data.message) {
        setSuccess(data.message)
      }
      
      // Auto-check status for enabled CLI tools after loading configs
      setTimeout(() => {
        checkAllCliStatuses()
      }, 1000) // Small delay to let configs render first
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCliLoading(false)
    }
  }

  const saveCLIConfig = async (provider: string, cliPath: string, enabled: boolean) => {
    try {
      setCliLoading(true)
      
      const response = await fetch('/api/cli-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: provider,
          custom_path: cliPath,
          enabled
        })
      })

      if (!response.ok) throw new Error('Failed to save CLI configuration')
      
      const result = await response.json()
      
      // Update local state
      setCliConfigs(prev => {
        const existing = prev.find(c => c.provider === provider)
        if (existing) {
          return prev.map(c => c.provider === provider ? { ...c, custom_path: cliPath, enabled, status: result.verified ? 'available' : 'unavailable' } : c)
        } else {
          return [...prev, {
            user_id: user!.id,
            provider,
            custom_path: cliPath,
            enabled,
            status: result.verified ? 'available' : 'unavailable'
          }]
        }
      })
      
      setSuccess(result.message)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCliLoading(false)
    }
  }

  const checkCLIStatus = async (provider: string) => {
    try {
      setCliConfigs(prev => prev.map(c => 
        c.provider === provider ? { ...c, status: 'checking' } : c
      ))

      // Trigger re-authentication flow for comprehensive CLI validation
      if (reAuthenticateForCLI) {
        await reAuthenticateForCLI()
        return
      }

      // Fallback: Use serverless validation with user guidance
      const response = await fetch('/api/cli-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          server: provider === 'claude_code' ? 'claude-code-cli-bridge' : 
                 provider === 'codex_cli' ? 'cross-llm-bridge-test' :
                 'gemini-cli-bridge',
          tool: provider === 'claude_code' ? 'check_claude_code_status' : 
                provider === 'codex_cli' ? 'check_codex_status' :
                'check_gemini_status',
          args: {}
        })
      })

      if (!response.ok) throw new Error('Failed to check CLI status')
      
      const result = await response.json()
      
      // Use the structured response from the new endpoint
      const isAvailable = result.available === true
      const resultText = result.result || ''
      
      // Determine installation and authentication status from structured response
      const isInstalled = !resultText.includes('not configured')
      const isAuthenticated = isAvailable
      
      let newStatus: 'available' | 'unavailable' | 'not_installed'
      let statusMessage = ''
      
      if (!isInstalled) {
        newStatus = 'not_installed'
        statusMessage = `${provider} is not installed`
      } else if (!isAuthenticated) {
        newStatus = 'unavailable'
        statusMessage = `${provider} is installed but not authenticated`
      } else {
        newStatus = 'available'
        statusMessage = `${provider} is installed and authenticated`
      }
      
      // Update local state with detailed status
      setCliConfigs(prev => prev.map(c => 
        c.provider === provider ? { 
          ...c, 
          status: newStatus,
          last_checked_at: new Date().toISOString(),
          statusMessage
        } : c
      ))
      
      // Update server with real status from MCP
      const config = cliConfigs.find(c => c.provider === provider)
      if (config?.id) {
        try {
          await fetch('/api/cli-config', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: config.id,
              status: newStatus,
              last_checked_at: new Date().toISOString()
            })
          })
        } catch (updateErr) {
          console.warn('Failed to update server status:', updateErr)
        }
      }
      
    } catch (err: any) {
      setCliConfigs(prev => prev.map(c => 
        c.provider === provider ? { ...c, status: 'unavailable' } : c
      ))
      setError(`Failed to check ${provider} status: ${err.message}`)
    }
  }

  // Check all enabled CLI tools automatically
  const checkAllCliStatuses = async () => {
    const enabledConfigs = cliConfigs.filter(c => c.enabled)
    for (const config of enabledConfigs) {
      await checkCLIStatus(config.provider)
      // Small delay between checks to avoid overwhelming MCP
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  // MCP Token Management Functions
  const fetchMcpToken = async () => {
    if (!user?.id) return
    
    try {
      setMcpTokenLoading(true)
      const response = await fetch('/api/mcp-tokens')
      
      if (!response.ok) throw new Error('Failed to fetch MCP token')
      
      const data = await response.json()
      setMcpToken(data.token)
      
      // Set up instructions for user
      if (data.setup_instructions) {
        console.log('MCP Setup Instructions:', data.setup_instructions)
      }
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setMcpTokenLoading(false)
    }
  }

  const regenerateMcpToken = async () => {
    if (!user?.id) return
    
    try {
      setMcpTokenLoading(true)
      // First revoke old token
      await fetch('/api/mcp-tokens', { method: 'DELETE' })
      
      // Generate new token
      await fetchMcpToken()
      setSuccess('MCP token regenerated successfully! Please update your local MCP bridge configuration.')
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setMcpTokenLoading(false)
    }
  }

  const fetchStatusLogs = async (provider?: string) => {
    try {
      const url = provider 
        ? `/api/cli-status-update?provider=${provider}&limit=20`
        : '/api/cli-status-update?limit=50'
      
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch status logs')
      
      const data = await response.json()
      setStatusLogs(data.logs || [])
      
    } catch (err: any) {
      console.error('Failed to fetch status logs:', err.message)
    }
  }

  // Simulate real-time connection status (in real implementation, use WebSocket or polling)
  const checkRealTimeConnection = async () => {
    try {
      const response = await fetch('/api/health')
      setRealTimeConnected(response.ok)
      if (response.ok) {
        setLastStatusUpdate(new Date())
      }
    } catch {
      setRealTimeConnected(false)
    }
  }

  const saveApiKey = async () => {
    try {
      setSaving(true)
      
      let response
      if (editingKey) {
        // Update existing API key
        const updateData: any = {
          api_base: formData.api_base,
          default_model: formData.default_model,
          is_preferred: formData.is_preferred,
          additional_models: formData.additional_models,
          budget_limit: formData.budget_limit
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
      } else {
        // Create new API key
        response = await fetch('/api/api-keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })
      }
      
      if (!response.ok) throw new Error('Failed to save API key')
      
      await fetchData()
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
        additional_models: [],
        budget_limit: null
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const deleteApiKey = async (id: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/api-keys/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete API key')
      await fetchData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const togglePreferred = async (id: string, currentPreferred: boolean) => {
    try {
      const response = await fetch(`/api/api-keys/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_preferred: !currentPreferred })
      })
      if (!response.ok) throw new Error('Failed to update preference')
      await fetchData()
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

    // Optimistically update the UI
    setApiKeys(items)

    // Send the new order to the server
    const orderedIds = items.map(item => item.id)
    await reorderApiKeys(orderedIds)
  }

  if (authLoading || loading) {
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">API Keys & Model Preferences</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Manage your API keys and configure model preferences in one place
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add API Key</span>
        </button>
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

      {/* CLI Providers Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div 
          className="p-6 cursor-pointer"
          onClick={() => setShowCliSettings(!showCliSettings)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Terminal className="w-5 h-5" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                CLI Providers
              </h2>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  validateCLITools?.()
                }}
                disabled={cliValidationInProgress}
                className="px-3 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded-md disabled:opacity-50"
              >
                {cliValidationInProgress ? 'Validating...' : 'Check All'}
              </button>
              <span className="text-sm text-gray-500">
                {cliConfigs.filter(c => c.enabled && c.status === 'available').length} active
              </span>
              {showCliSettings ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Use CLI tools for authentication-free access to Claude Code, Codex CLI, and Gemini CLI
          </p>
          {cliValidationInProgress && (
            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Validating CLI tools...</strong> This may open a validation window for comprehensive status checking.
                </p>
              </div>
            </div>
          )}
        </div>
        
        {showCliSettings && (
          <div className="px-6 pb-6 border-t border-gray-200 dark:border-gray-700">
            
            {/* MCP Token Setup Section */}
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 flex items-center space-x-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                    <span>MCP Bridge Connection</span>
                    {realTimeConnected && (
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">Connected</span>
                    )}
                  </h3>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                    Configure your local MCP bridge to automatically report CLI tool status to Polydev.
                    {lastStatusUpdate && (
                      <span className="block text-xs text-blue-600 dark:text-blue-400 mt-1">
                        Last update: {lastStatusUpdate.toLocaleTimeString()}
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setShowMcpSetup(!showMcpSetup)}
                  disabled={mcpTokenLoading}
                  className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-1"
                >
                  {mcpTokenLoading && <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>}
                  <span>{showMcpSetup ? 'Hide Setup' : 'Setup MCP'}</span>
                </button>
              </div>
              
              {showMcpSetup && (
                <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded border">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        MCP Authentication Token
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="password"
                          value={mcpToken}
                          readOnly
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 font-mono text-xs"
                          placeholder="Click 'Generate Token' to create your MCP token"
                        />
                        <button
                          onClick={fetchMcpToken}
                          disabled={mcpTokenLoading}
                          className="px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          {mcpToken ? 'Regenerate' : 'Generate'}
                        </button>
                      </div>
                    </div>
                    
                    {mcpToken && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Environment Variable Setup
                          </label>
                          <div className="bg-gray-100 dark:bg-gray-900 p-3 rounded font-mono text-xs overflow-x-auto">
                            <div className="mb-2">export POLYDEV_MCP_TOKEN="{mcpToken}"</div>
                            <div>export POLYDEV_API_URL="https://polydev.com/api/cli-status-update"</div>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Copy to Clipboard
                          </label>
                          <button
                            onClick={() => navigator.clipboard.writeText(`export POLYDEV_MCP_TOKEN="${mcpToken}"\nexport POLYDEV_API_URL="https://polydev.com/api/cli-status-update"`)}
                            className="text-sm bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700"
                          >
                            Copy Environment Variables
                          </button>
                        </div>
                        
                        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                          <p><strong>Next steps:</strong></p>
                          <p>1. Add the environment variables to your shell profile (~/.bashrc, ~/.zshrc, etc.)</p>
                          <p>2. Restart your terminal or reload your shell</p>
                          <p>3. Your MCP bridge will now automatically report CLI tool status</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-6 space-y-4">
              {CLI_PROVIDERS.map((cliProvider) => {
                const config = cliConfigs.find(c => c.provider === cliProvider.provider)
                const isEnabled = config?.enabled || false
                const status = config?.status || 'unchecked'
                const customPath = config?.custom_path || cliProvider.defaultPaths[0]

                return (
                  <div key={cliProvider.provider} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  saveCLIConfig(cliProvider.provider, customPath, true)
                                } else {
                                  saveCLIConfig(cliProvider.provider, customPath, false)
                                }
                              }}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
                            />
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              {cliProvider.name}
                            </h3>
                          </div>
                          
                          {status === 'checking' && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          )}
                          
                          {status === 'available' && (
                            <div className="flex items-center space-x-1 text-green-600">
                              <CheckCircle className="w-4 h-4" />
                              <span className="text-xs">Available</span>
                            </div>
                          )}
                          
                          {status === 'unavailable' && (
                            <div className="flex items-center space-x-1 text-yellow-600">
                              <XCircle className="w-4 h-4" />
                              <span className="text-xs">Not Authenticated</span>
                            </div>
                          )}
                          
                          {status === 'not_installed' && (
                            <div className="flex items-center space-x-1 text-red-600">
                              <XCircle className="w-4 h-4" />
                              <span className="text-xs">Not Installed</span>
                            </div>
                          )}
                          
                          {status === 'unchecked' && (
                            <div className="flex items-center space-x-1 text-gray-500">
                              <Clock className="w-4 h-4" />
                              <span className="text-xs">Unchecked</span>
                            </div>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                          {cliProvider.description}
                        </p>
                        
                        {isEnabled && (
                          <div className="mt-3 space-y-2">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                CLI Path
                              </label>
                              <div className="mt-1 flex space-x-2">
                                <input
                                  type="text"
                                  value={customPath}
                                  onChange={(e) => {
                                    const newPath = e.target.value
                                    setCliConfigs(prev => prev.map(c => 
                                      c.provider === cliProvider.provider 
                                        ? { ...c, custom_path: newPath }
                                        : c
                                    ))
                                  }}
                                  onBlur={() => saveCLIConfig(cliProvider.provider, customPath, isEnabled)}
                                  className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                  placeholder={cliProvider.defaultPaths[0]}
                                />
                                <button
                                  onClick={() => checkCLIStatus(cliProvider.provider)}
                                  className="px-3 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-md flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                  disabled={status === 'checking' || cliValidationInProgress}
                                >
                                  <Wrench className="w-3 h-3" />
                                  <span>
                                    {cliValidationInProgress ? 'Validating...' : 'Check Status'}
                                  </span>
                                </button>
                              </div>
                            </div>
                            
                            {/* Status-based guidance */}
                            {status === 'not_installed' && (
                              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
                                <p className="text-sm text-red-800 dark:text-red-200">
                                  <strong>Installation required:</strong> {cliProvider.name} is not installed on your system. Please install it first.
                                  {cliProvider.provider === 'claude_code' && (
                                    <span className="block mt-1">Visit <a href="https://claude.ai/code" target="_blank" rel="noopener noreferrer" className="underline">claude.ai/code</a> for installation instructions.</span>
                                  )}
                                  {cliProvider.provider === 'codex_cli' && (
                                    <span className="block mt-1">Install from <a href="https://github.com/ai-codex/codex-cli" target="_blank" rel="noopener noreferrer" className="underline">GitHub</a>.</span>
                                  )}
                                  {cliProvider.provider === 'gemini_cli' && (
                                    <span className="block mt-1">Install using your preferred package manager.</span>
                                  )}
                                </p>
                              </div>
                            )}
                            
                            {status === 'unavailable' && (
                              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-3">
                                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                  <strong>Authentication required:</strong> {config?.statusMessage || `${cliProvider.name} is installed but not authenticated.`}
                                  <span className="block mt-1">Please run <code className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">{cliProvider.authCommand}</code> to authenticate.</span>
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
              <button
                onClick={fetchCliConfigs}
                disabled={cliLoading}
                className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 flex items-center space-x-1"
              >
                <Settings className="w-3 h-3" />
                <span>{cliLoading ? 'Detecting...' : 'Auto-detect CLI tools'}</span>
              </button>
            </div>
          </div>
        )}
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
                    const providerConfig = CLINE_PROVIDERS[key.provider as keyof typeof CLINE_PROVIDERS]
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
                                    <span className="font-medium text-gray-900 dark:text-white capitalize">
                                      {providerConfig?.name || key.provider}
                                    </span>
                                    {key.is_preferred && (
                                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                                    )}
                                    <button
                                      onClick={() => toggleProviderExpanded(key.id)}
                                      className="text-gray-400 hover:text-gray-600"
                                    >
                                      {expandedProviders[key.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                    </button>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    {key.budget_limit && (
                                      <span className="text-sm text-green-600 dark:text-green-400">
                                        ${key.budget_limit}/month
                                      </span>
                                    )}
                                    <span className="text-sm text-gray-500">
                                      {key.key_preview}
                                    </span>
                                  </div>
                                </div>
                                
                                {expandedProviders[key.id] && (
                                  <div className="mt-3 space-y-2 pl-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                      <div>API URL: <span className="font-mono text-xs">{key.api_base || providerConfig?.baseUrl}</span></div>
                                      <div>Default Model: <span className="font-mono text-xs">{key.default_model}</span></div>
                                      {key.additional_models && key.additional_models.length > 0 && (
                                        <div className="md:col-span-2">
                                          <span>Additional Models: </span>
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {key.additional_models.map(model => (
                                              <span key={model} className="bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded text-xs">
                                                {model}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex space-x-2 pt-2">
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
                                            additional_models: key.additional_models || [],
                                            budget_limit: key.budget_limit ?? null
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
                <select
                  value={formData.provider}
                  onChange={(e) => setFormData(prev => ({...prev, provider: e.target.value, default_model: ''}))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                >
                  {Object.entries(CLINE_PROVIDERS).map(([id, provider]) => (
                    <option key={id} value={id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Provider Information */}
              {formData.provider && CLINE_PROVIDERS[formData.provider as keyof typeof CLINE_PROVIDERS] && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {PROVIDER_ICONS[formData.provider as keyof typeof PROVIDER_ICONS] && (
                        <img 
                          src={PROVIDER_ICONS[formData.provider as keyof typeof PROVIDER_ICONS]} 
                          alt={CLINE_PROVIDERS[formData.provider as keyof typeof CLINE_PROVIDERS].name}
                          className="w-6 h-6"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        {CLINE_PROVIDERS[formData.provider as keyof typeof CLINE_PROVIDERS].name}
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        {CLINE_PROVIDERS[formData.provider as keyof typeof CLINE_PROVIDERS].description}
                      </p>
                      <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                        <div>API URL: <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">{CLINE_PROVIDERS[formData.provider as keyof typeof CLINE_PROVIDERS].baseUrl}</code></div>
                        <div className="mt-1">Models: {CLINE_PROVIDERS[formData.provider as keyof typeof CLINE_PROVIDERS].modelCount} available</div>
                        <div className="mt-1">Auth: {CLINE_PROVIDERS[formData.provider as keyof typeof CLINE_PROVIDERS].authType === 'api_key' ? 'API Key Required' : CLINE_PROVIDERS[formData.provider as keyof typeof CLINE_PROVIDERS].authType}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* API Base URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  API Base URL
                </label>
                <div className="space-y-2">
                  <input
                    type="url"
                    value={formData.api_base || CLINE_PROVIDERS[formData.provider as keyof typeof CLINE_PROVIDERS]?.baseUrl || ''}
                    onChange={(e) => setFormData(prev => ({...prev, api_base: e.target.value}))}
                    placeholder={CLINE_PROVIDERS[formData.provider as keyof typeof CLINE_PROVIDERS]?.baseUrl || 'Enter custom API base URL'}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Default: {CLINE_PROVIDERS[formData.provider as keyof typeof CLINE_PROVIDERS]?.baseUrl || 'No default URL'}
                  </p>
                </div>
              </div>

              {/* API Key */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    API Key
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
                    placeholder="Enter your API key"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  />
                ) : (
                  <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm">
                    API key will remain unchanged
                  </div>
                )}
              </div>

              {/* Default Model */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Default Model
                </label>
                <select
                  value={formData.default_model}
                  onChange={(e) => setFormData(prev => ({...prev, default_model: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                >
                  <option value="">Select model</option>
                  {Object.keys(CLINE_PROVIDERS[formData.provider as keyof typeof CLINE_PROVIDERS]?.supportedModels || {}).map(model => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>

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

              {/* Additional Models */}
              {formData.is_preferred && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Additional Models (Optional)
                  </label>
                  <select
                    multiple
                    value={formData.additional_models}
                    onChange={(e) => setFormData(prev => ({...prev, additional_models: Array.from(e.target.selectedOptions, option => option.value)}))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  >
                    {Object.keys(CLINE_PROVIDERS[formData.provider as keyof typeof CLINE_PROVIDERS]?.supportedModels || {}).map(model => (
                      <option key={model} value={model} disabled={model === formData.default_model}>
                        {model}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Hold Cmd/Ctrl to select multiple</p>
                </div>
              )}

              {/* Budget Limit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Budget Limit (USD/month) - Optional
                </label>
                <input
                  type="number"
                  value={formData.budget_limit || ''}
                  onChange={(e) => setFormData(prev => ({...prev, budget_limit: e.target.value ? parseFloat(e.target.value) : null}))}
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
                disabled={saving || (!editingKey ? !formData.api_key.trim() : (updateApiKey && !formData.api_key.trim())) || !formData.default_model}
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
                    additional_models: [],
                    budget_limit: null
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
    </div>
  )
}