'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { ArrowLeft, Search, Eye, Brain, Zap, Image, Settings, DollarSign, Edit, Plus, X, Home, Copy, Trash2 } from 'lucide-react'

interface ModelRegistryEntry {
  id: string
  provider_id: string
  name: string
  display_name: string
  friendly_id: string
  provider_model_id: string
  max_tokens: number
  context_length: number
  input_cost_per_million: number
  output_cost_per_million: number
  cache_read_cost_per_million: number | null
  cache_write_cost_per_million: number | null
  supports_vision: boolean
  supports_tools: boolean
  supports_streaming: boolean
  supports_reasoning: boolean
  reasoning_levels: number | null
  model_family: string
  model_version: string
  is_active: boolean
  models_dev_metadata: any
  created_at: string
  updated_at: string
}

export default function ModelsManagement() {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [models, setModels] = useState<ModelRegistryEntry[]>([])
  const [filteredModels, setFilteredModels] = useState<ModelRegistryEntry[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterProvider, setFilterProvider] = useState('')
  const [filterCapability, setFilterCapability] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'cost' | 'context'>('name')
  const [sortDesc, setSortDesc] = useState(false)
  const [editingModel, setEditingModel] = useState<ModelRegistryEntry | null>(null)
  const [showEditForm, setShowEditForm] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAdminAccess()
  }, [])

  useEffect(() => {
    if (isAdmin) {
      loadModelsData()
    }
  }, [isAdmin])

  useEffect(() => {
    filterAndSortModels()
  }, [models, searchTerm, filterProvider, filterCapability, sortBy, sortDesc])

  async function checkAdminAccess() {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      setUser(user)

      const legacyAdminEmails = new Set(['admin@polydev.ai', 'venkat@polydev.ai', 'gvsfans@gmail.com'])
      const isLegacyAdmin = legacyAdminEmails.has(user.email || '')

      let isNewAdmin = false
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('email', user.email)
          .single()

        isNewAdmin = profile?.is_admin || false
      } catch (error) {
        console.log('Profile not found, checking legacy admin access')
      }

      if (!isNewAdmin && !isLegacyAdmin) {
        router.push('/admin')
        return
      }

      setIsAdmin(true)
    } catch (error) {
      console.error('Error checking admin access:', error)
      router.push('/admin')
    } finally {
      setLoading(false)
    }
  }

  async function loadModelsData() {
    try {
      const { data: modelsData, error } = await supabase
        .from('models_registry')
        .select('*')
        .order('display_name')

      if (error) {
        console.error('Error loading models:', error)
        return
      }

      if (modelsData) {
        setModels(modelsData)
        console.log('📊 Loaded', modelsData.length, 'models from registry')
      }
    } catch (error) {
      console.error('Error loading models data:', error)
    }
  }

  function filterAndSortModels() {
    let filtered = models.filter(model => {
      const matchesSearch = !searchTerm ||
        model.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        model.provider_id.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesProvider = !filterProvider || model.provider_id === filterProvider

      const matchesCapability = !filterCapability || (
        (filterCapability === 'vision' && model.supports_vision) ||
        (filterCapability === 'reasoning' && model.supports_reasoning) ||
        (filterCapability === 'tools' && model.supports_tools) ||
        (filterCapability === 'streaming' && model.supports_streaming)
      )

      return matchesSearch && matchesProvider && matchesCapability
    })

    // Sort models
    filtered.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'name':
          comparison = a.display_name.localeCompare(b.display_name)
          break
        case 'cost':
          comparison = (a.input_cost_per_million || 0) - (b.input_cost_per_million || 0)
          break
        case 'context':
          comparison = (a.context_length || 0) - (b.context_length || 0)
          break
      }

      return sortDesc ? -comparison : comparison
    })

    setFilteredModels(filtered)
  }

  const uniqueProviders = [...new Set(models.map(m => m.provider_id))].sort()

  async function toggleModelStatus(modelId: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from('models_registry')
        .update({ is_active: !currentStatus })
        .eq('id', modelId)

      if (error) throw error

      await logActivity('toggle_model', `${!currentStatus ? 'Activated' : 'Deactivated'} model: ${modelId}`)
      await loadModelsData()
    } catch (error) {
      console.error('Error toggling model status:', error)
      alert('Error updating model: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  async function updateModel(modelData: Partial<ModelRegistryEntry>) {
    if (!editingModel) return

    try {
      const { error } = await supabase
        .from('models_registry')
        .update(modelData)
        .eq('id', editingModel.id)

      if (error) throw error

      await logActivity('update_model', `Updated model: ${editingModel.display_name}`)
      setEditingModel(null)
      setShowEditForm(false)
      await loadModelsData()
    } catch (error) {
      console.error('Error updating model:', error)
      alert('Error updating model: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  async function createModel(modelData: Omit<ModelRegistryEntry, 'id' | 'created_at' | 'updated_at'>) {
    try {
      // Generate ID based on provider_id/name pattern
      const id = `${modelData.provider_id}/${modelData.name}`

      const modelWithId = {
        ...modelData,
        id
      }

      const { error } = await supabase
        .from('models_registry')
        .insert([modelWithId])

      if (error) throw error

      await logActivity('create_model', `Created new model: ${modelData.display_name}`)
      setShowCreateForm(false)
      await loadModelsData()
    } catch (error) {
      console.error('Error creating model:', error)
      alert('Error creating model: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  async function duplicateModel(model: ModelRegistryEntry) {
    try {
      // Generate a unique name for the duplicate
      let copyNumber = 1
      let newName = `${model.name}-copy`
      let newDisplayName = `${model.display_name} (Copy)`

      // Check if a model with this name already exists
      const { data: existingModels } = await supabase
        .from('models_registry')
        .select('name')
        .like('name', `${model.name}-copy%`)

      if (existingModels && existingModels.length > 0) {
        copyNumber = existingModels.length + 1
        newName = `${model.name}-copy-${copyNumber}`
        newDisplayName = `${model.display_name} (Copy ${copyNumber})`
      }

      const newId = `${model.provider_id}/${newName}`

      const duplicatedModel = {
        ...model,
        id: newId,
        name: newName,
        display_name: newDisplayName,
        friendly_id: newName,
        provider_model_id: model.provider_model_id || newName,
        is_active: false, // Set duplicates as inactive by default
      }

      // Remove timestamps as they'll be auto-generated
      const { created_at, updated_at, ...modelData } = duplicatedModel

      const { error } = await supabase
        .from('models_registry')
        .insert([modelData])

      if (error) throw error

      await logActivity('duplicate_model', `Duplicated model: ${model.display_name} -> ${newDisplayName}`)
      await loadModelsData()
      alert(`Model duplicated successfully as "${newDisplayName}"`)
    } catch (error) {
      console.error('Error duplicating model:', error)
      alert('Error duplicating model: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  async function deleteModel(modelId: string) {
    try {
      const { error } = await supabase
        .from('models_registry')
        .delete()
        .eq('id', modelId)

      if (error) throw error

      await logActivity('delete_model', `Deleted model: ${modelId}`)
      setShowEditForm(false)
      setEditingModel(null)
      await loadModelsData()
    } catch (error) {
      console.error('Error deleting model:', error)
      alert('Error deleting model: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  async function logActivity(action: string, details: string) {
    try {
      await supabase
        .from('admin_activity_log')
        .insert([{
          admin_email: user?.email,
          action,
          details
        }])
    } catch (error) {
      console.error('Error logging activity:', error)
    }
  }

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return 'N/A'
    return `$${amount.toFixed(2)}`
  }

  const formatContextLength = (length: number | null) => {
    if (!length) return 'N/A'
    if (length >= 1000000) return `${(length / 1000000).toFixed(1)}M`
    if (length >= 1000) return `${(length / 1000).toFixed(0)}K`
    return length.toString()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-lg text-slate-900">Access denied.</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/admin')}
                className="mr-4 p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                title="Back to Admin Portal"
              >
                <Home className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Models Registry</h1>
                <p className="text-slate-600 mt-1">Comprehensive AI model database with pricing and capabilities</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-slate-600">
                {filteredModels.length} of {models.length} models
              </div>
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Model
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Create Model Form - Inline */}
        {showCreateForm && (
          <div className="mb-8 bg-white rounded-lg shadow-sm border p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-slate-900">Create New Model</h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-slate-600 hover:text-slate-900"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <ModelCreateForm
              onSave={createModel}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        )}

        {/* Filters and Search */}
        <div className="mb-8 bg-white p-6 rounded-lg shadow-sm border">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="h-5 w-5 absolute left-3 top-3 text-slate-600" />
              <input
                type="text"
                placeholder="Search models..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {/* Provider Filter */}
            <select
              value={filterProvider}
              onChange={(e) => setFilterProvider(e.target.value)}
              className="border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="">All Providers</option>
              {uniqueProviders.map(provider => (
                <option key={provider} value={provider}>{provider}</option>
              ))}
            </select>

            {/* Capability Filter */}
            <select
              value={filterCapability}
              onChange={(e) => setFilterCapability(e.target.value)}
              className="border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="">All Capabilities</option>
              <option value="vision">Vision Support</option>
              <option value="reasoning">Reasoning Models</option>
              <option value="tools">Tool Support</option>
              <option value="streaming">Streaming Support</option>
            </select>

            {/* Sort */}
            <div className="flex space-x-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'cost' | 'context')}
                className="flex-1 border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="name">Sort by Name</option>
                <option value="cost">Sort by Cost</option>
                <option value="context">Sort by Context</option>
              </select>
              <button
                onClick={() => setSortDesc(!sortDesc)}
                className={`px-3 py-2 rounded-md ${sortDesc ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-900'}`}
              >
                {sortDesc ? '↓' : '↑'}
              </button>
            </div>
          </div>
        </div>

        {/* Models Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredModels.map((model) => (
            <div key={model.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              {/* Model Header */}
              <div className="p-6 border-b">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">
                      {model.display_name}
                    </h3>
                    <p className="text-sm text-slate-600 font-mono mb-2">{model.name}</p>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs bg-slate-100 text-slate-900 border border-slate-200 px-2 py-1 rounded">
                        {model.provider_id}
                      </span>
                      <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-900 border border-slate-200">
                        {model.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => duplicateModel(model)}
                      className="p-2 rounded-md text-slate-900 hover:bg-slate-50"
                      title="Duplicate model"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingModel(model)
                        setShowEditForm(true)
                      }}
                      className="p-2 rounded-md text-slate-900 hover:bg-slate-50"
                      title="Edit model"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => toggleModelStatus(model.id, model.is_active)}
                      className="p-2 rounded-md text-slate-900 hover:bg-slate-50"
                      title={model.is_active ? 'Deactivate model' : 'Activate model'}
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="p-4 bg-slate-50">
                <div className="flex items-center mb-2">
                  <DollarSign className="h-4 w-4 text-slate-900 mr-2" />
                  <span className="text-sm font-medium text-slate-900">Per Million Tokens</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-600">Input:</span>
                    <span className="ml-1 font-semibold">{formatCurrency(model.input_cost_per_million)}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Output:</span>
                    <span className="ml-1 font-semibold">{formatCurrency(model.output_cost_per_million)}</span>
                  </div>
                  {model.cache_read_cost_per_million && (
                    <div>
                      <span className="text-slate-600">Cache Read:</span>
                      <span className="ml-1 font-semibold">{formatCurrency(model.cache_read_cost_per_million)}</span>
                    </div>
                  )}
                  {model.cache_write_cost_per_million && (
                    <div>
                      <span className="text-slate-600">Cache Write:</span>
                      <span className="ml-1 font-semibold">{formatCurrency(model.cache_write_cost_per_million)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Capabilities */}
              <div className="p-4">
                <div className="flex flex-wrap gap-2 mb-4">
                  {model.supports_vision && (
                    <div className="flex items-center text-xs bg-slate-100 text-slate-900 border border-slate-200 px-2 py-1 rounded">
                      <Image className="h-3 w-3 mr-1" />
                      Vision
                    </div>
                  )}
                  {model.supports_reasoning && (
                    <div className="flex items-center text-xs bg-slate-100 text-slate-900 border border-slate-200 px-2 py-1 rounded">
                      <Brain className="h-3 w-3 mr-1" />
                      Reasoning {model.reasoning_levels && `(L${model.reasoning_levels})`}
                    </div>
                  )}
                  {model.supports_tools && (
                    <div className="flex items-center text-xs bg-slate-100 text-slate-900 border border-slate-200 px-2 py-1 rounded">
                      <Settings className="h-3 w-3 mr-1" />
                      Tools
                    </div>
                  )}
                  {model.supports_streaming && (
                    <div className="flex items-center text-xs bg-slate-100 text-slate-900 border border-slate-200 px-2 py-1 rounded">
                      <Zap className="h-3 w-3 mr-1" />
                      Streaming
                    </div>
                  )}
                </div>

                {/* Technical Specs */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-600">Context:</span>
                    <span className="ml-1 font-medium">{formatContextLength(model.context_length)}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Max Output:</span>
                    <span className="ml-1 font-medium">{formatContextLength(model.max_tokens)}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-600">Family:</span>
                    <span className="ml-1 font-medium">{model.model_family} {model.model_version}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredModels.length === 0 && (
          <div className="text-center py-12">
            <div className="text-slate-600 mb-4">No models found matching your filters</div>
            <button
              onClick={() => {
                setSearchTerm('')
                setFilterProvider('')
                setFilterCapability('')
              }}
              className="text-slate-900 hover:text-slate-700"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Model Edit Form Modal */}
      {showEditForm && editingModel && (
        <ModelEditForm
          model={editingModel}
          onSave={updateModel}
          onCancel={() => {
            setShowEditForm(false)
            setEditingModel(null)
          }}
          onDelete={deleteModel}
        />
      )}

    </div>
  )
}

// Validation helpers
function generateFriendlyId(displayName: string): string {
  return displayName
    .toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with dashes
    .replace(/[^a-z0-9-]/g, '')     // Remove non-alphanumeric except dashes
    .replace(/-+/g, '-')            // Replace multiple dashes with single
    .replace(/^-|-$/g, '')          // Remove leading/trailing dashes
}

function validateFriendlyId(friendlyId: string): { valid: boolean; error?: string } {
  if (!friendlyId) {
    return { valid: false, error: 'Friendly ID is required' }
  }
  if (friendlyId !== friendlyId.toLowerCase()) {
    return { valid: false, error: 'Friendly ID must be lowercase' }
  }
  if (/\s/.test(friendlyId)) {
    return { valid: false, error: 'Friendly ID cannot contain spaces' }
  }
  if (!/^[a-z0-9-]+$/.test(friendlyId)) {
    return { valid: false, error: 'Friendly ID can only contain lowercase letters, numbers, and dashes' }
  }
  if (friendlyId.startsWith('-') || friendlyId.endsWith('-')) {
    return { valid: false, error: 'Friendly ID cannot start or end with a dash' }
  }
  return { valid: true }
}

function validateDisplayName(displayName: string, friendlyId: string): { valid: boolean; error?: string } {
  if (!displayName) {
    return { valid: false, error: 'Display Name is required' }
  }
  if (displayName === friendlyId) {
    return { valid: false, error: 'Display Name should be different from Friendly ID (use proper capitalization like "Claude Sonnet 4.5")' }
  }
  if (displayName === displayName.toLowerCase()) {
    return { valid: false, error: 'Display Name should have proper capitalization (e.g., "Claude Sonnet 4.5" not "claude sonnet 4.5")' }
  }
  return { valid: true }
}

// Model Edit Form Component
function ModelEditForm({ model, onSave, onCancel, onDelete }: {
  model: ModelRegistryEntry
  onSave: (model: Partial<ModelRegistryEntry>) => void
  onCancel: () => void
  onDelete?: (modelId: string) => void
}) {
  const [formErrors, setFormErrors] = useState<{ friendlyId?: string; displayName?: string }>({})
  const [formData, setFormData] = useState({
    name: model.name || '',
    display_name: model.display_name || '',
    friendly_id: model.friendly_id || '',
    provider_model_id: model.provider_model_id || '',
    model_family: model.model_family || '',
    model_version: model.model_version || '',
    input_cost_per_million: model.input_cost_per_million || 0,
    output_cost_per_million: model.output_cost_per_million || 0,
    cache_read_cost_per_million: model.cache_read_cost_per_million || null,
    cache_write_cost_per_million: model.cache_write_cost_per_million || null,
    context_length: model.context_length || 0,
    max_tokens: model.max_tokens || 0,
    supports_vision: model.supports_vision || false,
    supports_tools: model.supports_tools || false,
    supports_streaming: model.supports_streaming || false,
    supports_reasoning: model.supports_reasoning || false,
    reasoning_levels: model.reasoning_levels || null,
    is_active: model.is_active || false
  })

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${model.display_name}"? This action cannot be undone.`)) {
      onDelete?.(model.id)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate friendly_id
    const friendlyIdValidation = validateFriendlyId(formData.friendly_id)
    const displayNameValidation = validateDisplayName(formData.display_name, formData.friendly_id)

    const errors: { friendlyId?: string; displayName?: string } = {}
    if (!friendlyIdValidation.valid) {
      errors.friendlyId = friendlyIdValidation.error
    }
    if (!displayNameValidation.valid) {
      errors.displayName = displayNameValidation.error
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setFormErrors({})
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Edit Model: {model.name}</h3>
              <p className="text-sm text-slate-600 mt-1">{model.provider_id} • {model.model_family}</p>
            </div>
            <button
              onClick={onCancel}
              className="text-slate-600 hover:text-slate-900 p-2"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div>
              <h4 className="text-lg font-medium text-slate-900 mb-4">Basic Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Model Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    placeholder="gpt-4o, claude-3-5-sonnet"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    value={formData.display_name}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, display_name: e.target.value }))
                      if (formErrors.displayName) setFormErrors(prev => ({ ...prev, displayName: undefined }))
                    }}
                    className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 ${
                      formErrors.displayName ? 'border-red-500 bg-red-50' : 'border-slate-300'
                    }`}
                    placeholder="GPT-4o, Claude 3.5 Sonnet"
                    required
                  />
                  {formErrors.displayName && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.displayName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Friendly ID *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.friendly_id}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, friendly_id: e.target.value }))
                        if (formErrors.friendlyId) setFormErrors(prev => ({ ...prev, friendlyId: undefined }))
                      }}
                      className={`flex-1 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 ${
                        formErrors.friendlyId ? 'border-red-500 bg-red-50' : 'border-slate-300'
                      }`}
                      placeholder="gpt-4o, claude-3-5-sonnet"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (formData.display_name) {
                          setFormData(prev => ({ ...prev, friendly_id: generateFriendlyId(formData.display_name) }))
                          setFormErrors(prev => ({ ...prev, friendlyId: undefined }))
                        }
                      }}
                      className="px-3 py-2 text-sm bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 whitespace-nowrap"
                      title="Auto-generate from Display Name"
                    >
                      ⚡ Auto
                    </button>
                  </div>
                  {formErrors.friendlyId && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.friendlyId}</p>
                  )}
                  <p className="mt-1 text-xs text-slate-500">Lowercase letters, numbers, and dashes only (e.g., claude-sonnet-4-5)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Provider Model ID
                  </label>
                  <input
                    type="text"
                    value={formData.provider_model_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, provider_model_id: e.target.value }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    placeholder="Provider-specific model identifier"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Model Family
                  </label>
                  <input
                    type="text"
                    value={formData.model_family}
                    onChange={(e) => setFormData(prev => ({ ...prev, model_family: e.target.value }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    placeholder="GPT, Claude, Gemini"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Model Version
                  </label>
                  <input
                    type="text"
                    value={formData.model_version}
                    onChange={(e) => setFormData(prev => ({ ...prev, model_version: e.target.value }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    placeholder="4o, 3.5, pro"
                  />
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium">Active</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Pricing (Per Million Tokens) */}
            <div>
              <h4 className="text-lg font-medium text-slate-900 mb-4 flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-slate-900" />
                Pricing (Per Million Tokens)
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Input Cost ($/1M tokens)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.input_cost_per_million}
                    onChange={(e) => setFormData(prev => ({ ...prev, input_cost_per_million: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    placeholder="15.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Output Cost ($/1M tokens)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.output_cost_per_million}
                    onChange={(e) => setFormData(prev => ({ ...prev, output_cost_per_million: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    placeholder="75.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Cache Read Cost ($/1M tokens)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cache_read_cost_per_million || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, cache_read_cost_per_million: e.target.value ? parseFloat(e.target.value) : null }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    placeholder="1.50 (optional)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Cache Write Cost ($/1M tokens)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cache_write_cost_per_million || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, cache_write_cost_per_million: e.target.value ? parseFloat(e.target.value) : null }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    placeholder="18.75 (optional)"
                  />
                </div>
              </div>
            </div>

            {/* Technical Specifications */}
            <div>
              <h4 className="text-lg font-medium text-slate-900 mb-4">Technical Specifications</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Context Length
                  </label>
                  <input
                    type="number"
                    value={formData.context_length}
                    onChange={(e) => setFormData(prev => ({ ...prev, context_length: parseInt(e.target.value) || 0 }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    placeholder="200000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Max Output Tokens
                  </label>
                  <input
                    type="number"
                    value={formData.max_tokens}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_tokens: parseInt(e.target.value) || 0 }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    placeholder="32000"
                  />
                </div>
              </div>
            </div>

            {/* Capabilities */}
            <div>
              <h4 className="text-lg font-medium text-slate-900 mb-4">Capabilities</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.supports_vision}
                      onChange={(e) => setFormData(prev => ({ ...prev, supports_vision: e.target.checked }))}
                      className="mr-3"
                    />
                    <Image className="h-4 w-4 mr-2 text-slate-900" />
                    Vision Support
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.supports_tools}
                      onChange={(e) => setFormData(prev => ({ ...prev, supports_tools: e.target.checked }))}
                      className="mr-3"
                    />
                    <Settings className="h-4 w-4 mr-2 text-slate-900" />
                    Tool Support
                  </label>
                </div>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.supports_streaming}
                      onChange={(e) => setFormData(prev => ({ ...prev, supports_streaming: e.target.checked }))}
                      className="mr-3"
                    />
                    <Zap className="h-4 w-4 mr-2 text-slate-900" />
                    Streaming Support
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.supports_reasoning}
                      onChange={(e) => setFormData(prev => ({ ...prev, supports_reasoning: e.target.checked }))}
                      className="mr-3"
                    />
                    <Brain className="h-4 w-4 mr-2 text-slate-900" />
                    Reasoning Support
                  </label>
                </div>
              </div>

              {formData.supports_reasoning && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Reasoning Levels (1-5)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={formData.reasoning_levels || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, reasoning_levels: e.target.value ? parseInt(e.target.value) : null }))}
                    className="w-32 border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    placeholder="5"
                  />
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex justify-between pt-6 border-t">
              {onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-6 py-2 text-white bg-slate-900 rounded-md hover:bg-slate-700 inline-flex items-center"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Model
                </button>
              )}
              <div className={`flex space-x-3 ${!onDelete ? 'ml-auto' : ''}`}>
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-6 py-2 text-slate-900 bg-slate-100 rounded-md hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Model Create Form Component
function ModelCreateForm({ onSave, onCancel }: {
  onSave: (model: Omit<ModelRegistryEntry, 'id' | 'created_at' | 'updated_at'>) => void
  onCancel: () => void
}) {
  const [formErrors, setFormErrors] = useState<{ friendlyId?: string; displayName?: string }>({})
  const [formData, setFormData] = useState({
    provider_id: '',
    name: '',
    display_name: '',
    friendly_id: '',
    provider_model_id: '',
    max_tokens: 4096,
    context_length: 8192,
    input_cost_per_million: 0,
    output_cost_per_million: 0,
    cache_read_cost_per_million: null as number | null,
    cache_write_cost_per_million: null as number | null,
    supports_vision: false,
    supports_tools: false,
    supports_streaming: false,
    supports_reasoning: false,
    reasoning_levels: null as number | null,
    model_family: '',
    model_version: '',
    is_active: true,
    models_dev_metadata: {}
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.provider_id || !formData.name || !formData.display_name) {
      alert('Please fill in required fields: Provider ID, Name, and Display Name')
      return
    }

    // Validate friendly_id and display_name
    const friendlyIdValidation = validateFriendlyId(formData.friendly_id)
    const displayNameValidation = validateDisplayName(formData.display_name, formData.friendly_id)

    const errors: { friendlyId?: string; displayName?: string } = {}
    if (!friendlyIdValidation.valid) {
      errors.friendlyId = friendlyIdValidation.error
    }
    if (!displayNameValidation.valid) {
      errors.displayName = displayNameValidation.error
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setFormErrors({})
    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div>
              <h4 className="text-lg font-medium text-slate-900 mb-4">Basic Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Provider ID *
                  </label>
                  <select
                    value={formData.provider_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, provider_id: e.target.value }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    required
                  >
                    <option value="">Select a provider...</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="google">Google</option>
                    <option value="google-vertex">Google Vertex AI</option>
                    <option value="mistral">Mistral</option>
                    <option value="groq">Groq</option>
                    <option value="deepseek">DeepSeek</option>
                    <option value="xai">xAI</option>
                    <option value="openrouter">OpenRouter</option>
                    <option value="fireworks-ai">Fireworks AI</option>
                    <option value="togetherai">Together AI</option>
                    <option value="huggingface">Hugging Face</option>
                    <option value="nvidia">NVIDIA</option>
                    <option value="amazon-bedrock">Amazon Bedrock</option>
                    <option value="azure">Azure OpenAI</option>
                    <option value="cerebras">Cerebras</option>
                    <option value="deepinfra">DeepInfra</option>
                    <option value="alibaba">Alibaba</option>
                    <option value="baseten">Baseten</option>
                    <option value="chutes">Chutes</option>
                    <option value="cloudflare-workers-ai">Cloudflare Workers AI</option>
                    <option value="fastrouter">FastRouter</option>
                    <option value="github-copilot">GitHub Copilot</option>
                    <option value="github-models">GitHub Models</option>
                    <option value="google-vertex-anthropic">Google Vertex Anthropic</option>
                    <option value="inception">Inception</option>
                    <option value="inference">Inference</option>
                    <option value="llama">Llama</option>
                    <option value="lmstudio">LM Studio</option>
                    <option value="modelscope">ModelScope</option>
                    <option value="moonshotai">Moonshot AI</option>
                    <option value="moonshotai-cn">Moonshot AI (CN)</option>
                    <option value="morph">Morph</option>
                    <option value="opencode">OpenCode</option>
                    <option value="requesty">Requesty</option>
                    <option value="submodel">Submodel</option>
                    <option value="synthetic">Synthetic</option>
                    <option value="upstage">Upstage</option>
                    <option value="v0">V0</option>
                    <option value="venice">Venice</option>
                    <option value="vercel">Vercel</option>
                    <option value="wandb">Weights & Biases</option>
                    <option value="zai">ZAI</option>
                    <option value="zhipuai">Zhipu AI</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Model Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    placeholder="gpt-4, claude-3-opus, etc."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    value={formData.display_name}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, display_name: e.target.value }))
                      if (formErrors.displayName) setFormErrors(prev => ({ ...prev, displayName: undefined }))
                    }}
                    className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 ${
                      formErrors.displayName ? 'border-red-500 bg-red-50' : 'border-slate-300'
                    }`}
                    placeholder="GPT-4, Claude 3 Opus, etc."
                    required
                  />
                  {formErrors.displayName && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.displayName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Friendly ID *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.friendly_id}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, friendly_id: e.target.value }))
                        if (formErrors.friendlyId) setFormErrors(prev => ({ ...prev, friendlyId: undefined }))
                      }}
                      className={`flex-1 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 ${
                        formErrors.friendlyId ? 'border-red-500 bg-red-50' : 'border-slate-300'
                      }`}
                      placeholder="gpt-4, claude-3-opus"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (formData.display_name) {
                          setFormData(prev => ({ ...prev, friendly_id: generateFriendlyId(formData.display_name) }))
                          setFormErrors(prev => ({ ...prev, friendlyId: undefined }))
                        }
                      }}
                      className="px-3 py-2 text-sm bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 whitespace-nowrap"
                      title="Auto-generate from Display Name"
                    >
                      ⚡ Auto
                    </button>
                  </div>
                  {formErrors.friendlyId && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.friendlyId}</p>
                  )}
                  <p className="mt-1 text-xs text-slate-500">Lowercase letters, numbers, and dashes only (e.g., claude-sonnet-4-5)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Provider Model ID
                  </label>
                  <input
                    type="text"
                    value={formData.provider_model_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, provider_model_id: e.target.value }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    placeholder="Provider-specific model identifier"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Model Family
                  </label>
                  <input
                    type="text"
                    value={formData.model_family}
                    onChange={(e) => setFormData(prev => ({ ...prev, model_family: e.target.value }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    placeholder="GPT, Claude, Gemini, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Model Version
                  </label>
                  <input
                    type="text"
                    value={formData.model_version}
                    onChange={(e) => setFormData(prev => ({ ...prev, model_version: e.target.value }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    placeholder="v1, turbo, pro, etc."
                  />
                </div>
              </div>
            </div>

            {/* Pricing Information */}
            <div>
              <h4 className="text-lg font-medium text-slate-900 mb-4">Pricing (per million tokens)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Input Cost per Million Tokens ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.input_cost_per_million}
                    onChange={(e) => setFormData(prev => ({ ...prev, input_cost_per_million: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Output Cost per Million Tokens ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.output_cost_per_million}
                    onChange={(e) => setFormData(prev => ({ ...prev, output_cost_per_million: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Cache Read Cost per Million Tokens ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cache_read_cost_per_million || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, cache_read_cost_per_million: e.target.value ? parseFloat(e.target.value) : null }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Cache Write Cost per Million Tokens ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cache_write_cost_per_million || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, cache_write_cost_per_million: e.target.value ? parseFloat(e.target.value) : null }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>

            {/* Model Specifications */}
            <div>
              <h4 className="text-lg font-medium text-slate-900 mb-4">Model Specifications</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Context Length (tokens)
                  </label>
                  <input
                    type="number"
                    value={formData.context_length}
                    onChange={(e) => setFormData(prev => ({ ...prev, context_length: parseInt(e.target.value) || 0 }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    placeholder="8192"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Max Output Tokens
                  </label>
                  <input
                    type="number"
                    value={formData.max_tokens}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_tokens: parseInt(e.target.value) || 0 }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    placeholder="4096"
                  />
                </div>
              </div>
            </div>

            {/* Capabilities */}
            <div>
              <h4 className="text-lg font-medium text-slate-900 mb-4">Capabilities</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.supports_vision}
                      onChange={(e) => setFormData(prev => ({ ...prev, supports_vision: e.target.checked }))}
                      className="mr-3"
                    />
                    <Image className="h-4 w-4 mr-2 text-slate-900" />
                    Vision Support
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.supports_tools}
                      onChange={(e) => setFormData(prev => ({ ...prev, supports_tools: e.target.checked }))}
                      className="mr-3"
                    />
                    <Settings className="h-4 w-4 mr-2 text-slate-900" />
                    Tool Support
                  </label>
                </div>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.supports_streaming}
                      onChange={(e) => setFormData(prev => ({ ...prev, supports_streaming: e.target.checked }))}
                      className="mr-3"
                    />
                    <Zap className="h-4 w-4 mr-2 text-slate-900" />
                    Streaming Support
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.supports_reasoning}
                      onChange={(e) => setFormData(prev => ({ ...prev, supports_reasoning: e.target.checked }))}
                      className="mr-3"
                    />
                    <Brain className="h-4 w-4 mr-2 text-slate-900" />
                    Reasoning Support
                  </label>
                </div>
              </div>

              {formData.supports_reasoning && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Reasoning Levels (1-5)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={formData.reasoning_levels || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, reasoning_levels: e.target.value ? parseInt(e.target.value) : null }))}
                    className="w-32 border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    placeholder="5"
                  />
                </div>
              )}

              <div className="mt-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="mr-3"
                  />
                  <Eye className="h-4 w-4 mr-2 text-slate-900" />
                  Active (Available for use)
                </label>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2 text-slate-900 bg-slate-100 rounded-md hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-700"
              >
                Create Model
              </button>
            </div>
    </form>
  )
}