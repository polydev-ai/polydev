'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { createClient } from '../../app/utils/supabase/client'
import { Plus, Eye, EyeOff, Edit3, Trash2, Settings, TrendingUp, AlertCircle, Check, Filter, GripVertical, Star, StarOff, ChevronDown, ChevronRight } from 'lucide-react'
import { CLINE_PROVIDERS, ProviderConfig } from '../../types/providers'
import { PROVIDER_ICONS } from '../../lib/openrouter-providers'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'

interface ApiKey {
  id: string
  provider: string
  key_preview: string
  active: boolean
  api_base?: string
  default_model?: string
  is_preferred?: boolean
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

export default function EnhancedApiKeysPage() {
  const { user, loading: authLoading } = useAuth()
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [providers, setProviders] = useState<ProviderConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null)
  const [showApiKey, setShowApiKey] = useState<{[keyId: string]: boolean}>({})
  const [expandedProviders, setExpandedProviders] = useState<{[provider: string]: boolean}>({})
  
  // Form state with new fields
  const [formData, setFormData] = useState({
    provider: 'openai',
    api_key: '',
    api_base: '',
    default_model: '',
    is_preferred: false,
    additional_models: [] as string[]
  })

  const supabase = createClient()

  const fetchData = async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      
      // Fetch API keys
      const { data: keysData, error: keysError } = await supabase
        .from('user_api_keys')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (keysError) throw keysError

      // Fetch user preferences
      const { data: prefsData, error: prefsError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single()
      
      // Use CLINE_PROVIDERS directly
      const providersData = Object.values(CLINE_PROVIDERS)

      setApiKeys(keysData || [])
      setPreferences(prefsError ? null : prefsData)
      setProviders(providersData)
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

  const handleDragEnd = (result: any) => {
    if (!result.destination || !preferences) return

    const items = Object.entries(preferences.model_preferences || {})
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    // Rebuild preferences with new order
    const newPreferences: Record<string, ModelPreference> = {}
    items.forEach(([provider, pref], index) => {
      newPreferences[provider] = {
        ...pref,
        order: index + 1
      }
    })

    updatePreferenceOrder(newPreferences)
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

  const saveApiKey = async () => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (!response.ok) throw new Error('Failed to save API key')
      
      await fetchData()
      setShowAddForm(false)
      setFormData({
        provider: 'openai',
        api_key: '',
        api_base: '',
        default_model: '',
        is_preferred: false,
        additional_models: []
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
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

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const sortedPreferences = preferences?.model_preferences 
    ? Object.entries(preferences.model_preferences).sort(([,a], [,b]) => (a.order || 0) - (b.order || 0))
    : []

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
        </div>
      )}

      {/* Model Preferences Section */}
      {sortedPreferences && sortedPreferences.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Model Preferences (Drag to Reorder)</span>
          </h2>
          
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="preferences">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                  {sortedPreferences.map(([provider, pref], index) => (
                    <Draggable key={provider} draggableId={provider} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`border rounded-lg p-4 ${snapshot.isDragging ? 'shadow-lg' : ''} bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600`}
                        >
                          <div className="flex items-center space-x-3">
                            <div {...provided.dragHandleProps} className="text-gray-400 hover:text-gray-600">
                              <GripVertical className="w-5 h-5" />
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-sm font-medium">
                                    #{pref.order}
                                  </span>
                                  <span className="font-medium text-gray-900 dark:text-white capitalize">
                                    {provider}
                                  </span>
                                  <button
                                    onClick={() => toggleProviderExpanded(provider)}
                                    className="text-gray-400 hover:text-gray-600"
                                  >
                                    {expandedProviders[provider] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                  </button>
                                </div>
                                <span className="text-sm text-gray-500">
                                  {pref.models?.length || 0} model{(pref.models?.length || 0) !== 1 ? 's' : ''}
                                </span>
                              </div>
                              
                              {expandedProviders[provider] && (
                                <div className="mt-3 space-y-2">
                                  <div className="flex flex-wrap gap-2">
                                    {pref.models?.map((model, modelIndex) => (
                                      <div key={model} className="flex items-center space-x-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded px-2 py-1">
                                        <span className="text-sm">{model}</span>
                                        <button
                                          onClick={() => removeModelFromProvider(provider, model)}
                                          className="text-red-400 hover:text-red-600"
                                        >
                                          ×
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                  
                                  {/* Add model dropdown */}
                                  <select
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        addModelToProvider(provider, e.target.value)
                                        e.target.value = ''
                                      }
                                    }}
                                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800"
                                  >
                                    <option value="">Add model...</option>
                                    {Object.keys(CLINE_PROVIDERS[provider as keyof typeof CLINE_PROVIDERS]?.supportedModels || {}).map(model => (
                                      <option key={model} value={model} disabled={pref.models?.includes(model)}>
                                        {model}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      )}

      {/* API Keys List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your API Keys</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Manage your API keys for different providers</p>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {apiKeys.map((key) => (
            <div key={key.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-3">
                    {PROVIDER_ICONS[key.provider] && (
                      <img 
                        src={PROVIDER_ICONS[key.provider]} 
                        alt={key.provider} 
                        className="w-8 h-8 rounded"
                      />
                    )}
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white capitalize flex items-center space-x-2">
                        <span>{key.provider}</span>
                        {key.is_preferred && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
                      </h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                        <span>{key.key_preview}</span>
                        <button
                          onClick={() => setShowApiKey(prev => ({...prev, [key.id]: !prev[key.id]}))}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {showApiKey[key.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                        {key.api_base && (
                          <div>API URL: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs">{key.api_base}</code></div>
                        )}
                        {!key.api_base && CLINE_PROVIDERS[key.provider as keyof typeof CLINE_PROVIDERS] && (
                          <div>API URL: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs">{CLINE_PROVIDERS[key.provider as keyof typeof CLINE_PROVIDERS].baseUrl}</code></div>
                        )}
                        {key.default_model && (
                          <div>Default Model: <span className="font-mono text-xs">{key.default_model}</span></div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => togglePreferred(key.id, key.is_preferred || false)}
                    className={`p-2 rounded-lg ${key.is_preferred ? 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' : 'text-gray-400 hover:text-gray-600'}`}
                    title={key.is_preferred ? 'Remove from preferences' : 'Add to preferences'}
                  >
                    {key.is_preferred ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
                  </button>
                  
                  <button
                    onClick={() => setEditingKey(key)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => deleteApiKey(key.id)}
                    className="p-2 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {key.default_model && (
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Default Model: {key.default_model}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {(showAddForm || editingKey) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full mx-4 p-6">
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  API Key
                </label>
                <input
                  type="password"
                  value={formData.api_key}
                  onChange={(e) => setFormData(prev => ({...prev, api_key: e.target.value}))}
                  placeholder="Enter your API key"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
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
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={saveApiKey}
                disabled={!formData.api_key.trim() || !formData.default_model}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
              >
                <Check className="w-4 h-4" />
                <span>{editingKey ? 'Update' : 'Save'}</span>
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setEditingKey(null)
                  setFormData({
                    provider: 'openai',
                    api_key: '',
                    api_base: '',
                    default_model: '',
                    is_preferred: false,
                    additional_models: []
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