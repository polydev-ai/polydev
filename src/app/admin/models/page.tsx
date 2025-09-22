'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { ArrowLeft, Plus, Edit, Trash2, Save, X, Eye, EyeOff } from 'lucide-react'

interface ModelProvider {
  id: string
  name: string
  api_endpoint: string
  api_key: string
  enabled: boolean
  pricing_per_token: number
  max_requests_per_minute: number
  timeout_seconds: number
  supports_streaming: boolean
  created_at: string
  updated_at: string
}

interface ModelMapping {
  id: string
  provider_id: string
  model_name: string
  display_name: string
  context_window: number
  max_output_tokens: number
  pricing_input: number
  pricing_output: number
  enabled: boolean
  created_at: string
  provider?: ModelProvider
}

export default function ModelsManagement() {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [providers, setProviders] = useState<ModelProvider[]>([])
  const [models, setModels] = useState<ModelMapping[]>([])
  const [editingProvider, setEditingProvider] = useState<ModelProvider | null>(null)
  const [editingModel, setEditingModel] = useState<ModelMapping | null>(null)
  const [showProviderForm, setShowProviderForm] = useState(false)
  const [showModelForm, setShowModelForm] = useState(false)
  const [showApiKeys, setShowApiKeys] = useState<{[key: string]: boolean}>({})

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAdminAccess()
  }, [])

  useEffect(() => {
    if (isAdmin) {
      loadData()
    }
  }, [isAdmin])

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

  async function loadData() {
    try {
      const [providersResult, modelsResult] = await Promise.all([
        supabase.from('providers_registry').select('*').order('name'),
        supabase.from('model_mappings').select(`
          *,
          provider:providers_registry(*)
        `).order('display_name')
      ])

      if (providersResult.data) {
        setProviders(providersResult.data)
      }

      if (modelsResult.data) {
        setModels(modelsResult.data)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  async function saveProvider(provider: Partial<ModelProvider>) {
    try {
      if (editingProvider?.id) {
        // Update existing provider
        const { error } = await supabase
          .from('providers_registry')
          .update(provider)
          .eq('id', editingProvider.id)

        if (error) throw error

        await logActivity('update_provider', `Updated provider: ${provider.name}`)
      } else {
        // Create new provider
        const { error } = await supabase
          .from('providers_registry')
          .insert([provider])

        if (error) throw error

        await logActivity('create_provider', `Created new provider: ${provider.name}`)
      }

      setEditingProvider(null)
      setShowProviderForm(false)
      await loadData()
    } catch (error) {
      console.error('Error saving provider:', error)
      alert('Error saving provider: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  async function deleteProvider(providerId: string) {
    if (!confirm('Are you sure you want to delete this provider? All associated models will also be deleted.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('providers_registry')
        .delete()
        .eq('id', providerId)

      if (error) throw error

      await logActivity('delete_provider', `Deleted provider with ID: ${providerId}`)
      await loadData()
    } catch (error) {
      console.error('Error deleting provider:', error)
      alert('Error deleting provider: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  async function saveModel(model: Partial<ModelMapping>) {
    try {
      if (editingModel?.id) {
        // Update existing model
        const { error } = await supabase
          .from('model_mappings')
          .update(model)
          .eq('id', editingModel.id)

        if (error) throw error

        await logActivity('update_model', `Updated model: ${model.display_name}`)
      } else {
        // Create new model
        const { error } = await supabase
          .from('model_mappings')
          .insert([model])

        if (error) throw error

        await logActivity('create_model', `Created new model: ${model.display_name}`)
      }

      setEditingModel(null)
      setShowModelForm(false)
      await loadData()
    } catch (error) {
      console.error('Error saving model:', error)
      alert('Error saving model: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  async function deleteModel(modelId: string) {
    if (!confirm('Are you sure you want to delete this model?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('model_mappings')
        .delete()
        .eq('id', modelId)

      if (error) throw error

      await logActivity('delete_model', `Deleted model with ID: ${modelId}`)
      await loadData()
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

  const toggleApiKeyVisibility = (providerId: string) => {
    setShowApiKeys(prev => ({
      ...prev,
      [providerId]: !prev[providerId]
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-red-600">Access denied.</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/admin')}
                className="mr-4 p-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Models & Providers</h1>
                <p className="text-gray-600 mt-1">Manage AI model providers and configurations</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Providers Section */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Providers</h2>
            <button
              onClick={() => {
                setEditingProvider(null)
                setShowProviderForm(true)
              }}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Provider
            </button>
          </div>

          <div className="bg-white shadow-sm border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Endpoint</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">API Key</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate Limit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {providers.map((provider) => (
                  <tr key={provider.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {provider.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {provider.api_endpoint}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono">
                          {showApiKeys[provider.id]
                            ? provider.api_key
                            : '••••••••••••••••'
                          }
                        </span>
                        <button
                          onClick={() => toggleApiKeyVisibility(provider.id)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          {showApiKeys[provider.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        provider.enabled
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {provider.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {provider.max_requests_per_minute}/min
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => {
                          setEditingProvider(provider)
                          setShowProviderForm(true)
                        }}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteProvider(provider.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Models Section */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Models</h2>
            <button
              onClick={() => {
                setEditingModel(null)
                setShowModelForm(true)
              }}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Model
            </button>
          </div>

          <div className="bg-white shadow-sm border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Display Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Context Window</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pricing (In/Out)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {models.map((model) => (
                  <tr key={model.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {model.display_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                      {model.model_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {model.provider?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {model.context_window?.toLocaleString() || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${model.pricing_input?.toFixed(6) || 0} / ${model.pricing_output?.toFixed(6) || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        model.enabled
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {model.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => {
                          setEditingModel(model)
                          setShowModelForm(true)
                        }}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteModel(model.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Provider Form Modal */}
      {showProviderForm && (
        <ProviderForm
          provider={editingProvider}
          onSave={saveProvider}
          onCancel={() => {
            setShowProviderForm(false)
            setEditingProvider(null)
          }}
        />
      )}

      {/* Model Form Modal */}
      {showModelForm && (
        <ModelForm
          model={editingModel}
          providers={providers}
          onSave={saveModel}
          onCancel={() => {
            setShowModelForm(false)
            setEditingModel(null)
          }}
        />
      )}
    </div>
  )
}

// Provider Form Component
function ProviderForm({ provider, onSave, onCancel }: {
  provider: ModelProvider | null
  onSave: (provider: Partial<ModelProvider>) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    name: provider?.name || '',
    api_endpoint: provider?.api_endpoint || '',
    api_key: provider?.api_key || '',
    enabled: provider?.enabled ?? true,
    pricing_per_token: provider?.pricing_per_token || 0,
    max_requests_per_minute: provider?.max_requests_per_minute || 60,
    timeout_seconds: provider?.timeout_seconds || 30,
    supports_streaming: provider?.supports_streaming ?? true
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {provider ? 'Edit Provider' : 'Add New Provider'}
            </h3>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="OpenAI, Anthropic, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Endpoint</label>
              <input
                type="url"
                required
                value={formData.api_endpoint}
                onChange={(e) => setFormData(prev => ({ ...prev, api_endpoint: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://api.openai.com/v1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
              <input
                type="password"
                required
                value={formData.api_key}
                onChange={(e) => setFormData(prev => ({ ...prev, api_key: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="sk-..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pricing per Token</label>
                <input
                  type="number"
                  step="0.000001"
                  value={formData.pricing_per_token}
                  onChange={(e) => setFormData(prev => ({ ...prev, pricing_per_token: parseFloat(e.target.value) || 0 }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Requests/Min</label>
                <input
                  type="number"
                  value={formData.max_requests_per_minute}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_requests_per_minute: parseInt(e.target.value) || 60 }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timeout (seconds)</label>
                <input
                  type="number"
                  value={formData.timeout_seconds}
                  onChange={(e) => setFormData(prev => ({ ...prev, timeout_seconds: parseInt(e.target.value) || 30 }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center space-x-4 pt-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                    className="mr-2"
                  />
                  Enabled
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.supports_streaming}
                    onChange={(e) => setFormData(prev => ({ ...prev, supports_streaming: e.target.checked }))}
                    className="mr-2"
                  />
                  Supports Streaming
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {provider ? 'Update' : 'Create'} Provider
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Model Form Component
function ModelForm({ model, providers, onSave, onCancel }: {
  model: ModelMapping | null
  providers: ModelProvider[]
  onSave: (model: Partial<ModelMapping>) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    provider_id: model?.provider_id || '',
    model_name: model?.model_name || '',
    display_name: model?.display_name || '',
    context_window: model?.context_window || 4096,
    max_output_tokens: model?.max_output_tokens || 1024,
    pricing_input: model?.pricing_input || 0,
    pricing_output: model?.pricing_output || 0,
    enabled: model?.enabled ?? true
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {model ? 'Edit Model' : 'Add New Model'}
            </h3>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
              <select
                required
                value={formData.provider_id}
                onChange={(e) => setFormData(prev => ({ ...prev, provider_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a provider</option>
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Model Name</label>
                <input
                  type="text"
                  required
                  value={formData.model_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, model_name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="gpt-4o, claude-3-opus"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  value={formData.display_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="GPT-4o, Claude 3 Opus"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Context Window</label>
                <input
                  type="number"
                  value={formData.context_window}
                  onChange={(e) => setFormData(prev => ({ ...prev, context_window: parseInt(e.target.value) || 4096 }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Output Tokens</label>
                <input
                  type="number"
                  value={formData.max_output_tokens}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_output_tokens: parseInt(e.target.value) || 1024 }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Input Pricing (per token)</label>
                <input
                  type="number"
                  step="0.000001"
                  value={formData.pricing_input}
                  onChange={(e) => setFormData(prev => ({ ...prev, pricing_input: parseFloat(e.target.value) || 0 }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Output Pricing (per token)</label>
                <input
                  type="number"
                  step="0.000001"
                  value={formData.pricing_output}
                  onChange={(e) => setFormData(prev => ({ ...prev, pricing_output: parseFloat(e.target.value) || 0 }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.enabled}
                  onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="mr-2"
                />
                Enabled
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-6">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                {model ? 'Update' : 'Create'} Model
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}