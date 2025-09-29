'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertCircle, Plus, Trash2, Edit, Key, DollarSign, Activity, ArrowUp, ArrowDown, BarChart3 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'

interface ApiKey {
  id: string
  provider: string
  key_name: string
  key_preview: string
  priority_order: number
  monthly_budget: number | null
  daily_limit: number | null
  rate_limit_rpm: number | null
  current_usage: number
  daily_usage: number
  active: boolean
  last_used_at: string | null
  created_at: string
  user_email?: string
}

interface ProviderStats {
  count: number
  totalUsage: number
  totalBudget: number
  activeKeys: number
}

const PROVIDERS = [
  { id: 'anthropic', name: 'Anthropic', description: 'Claude models' },
  { id: 'openai', name: 'OpenAI', description: 'GPT models' },
  { id: 'xai', name: 'xAI', description: 'Grok models' },
  { id: 'google', name: 'Google', description: 'Gemini models' },
  { id: 'cerebras', name: 'Cerebras', description: 'Fast inference models' },
  { id: 'zai', name: 'ZAI', description: 'Zero-latency AI models' }
]

export default function ProvidersAdminPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [stats, setStats] = useState<Record<string, ProviderStats>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedProvider, setSelectedProvider] = useState<string>('anthropic')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null)
  const [providersRegistry, setProvidersRegistry] = useState<Array<{ id: string, name: string, logo: string, display_name: string }>>([])

  // Form state
  const [formData, setFormData] = useState({
    provider: 'anthropic',
    key_name: '',
    encrypted_key: '',
    monthly_budget: '',
    daily_limit: '',
    rate_limit_rpm: '',
    priority_order: ''
  })

  useEffect(() => {
    loadApiKeys()
    loadProvidersRegistry()
  }, [])

  const loadProvidersRegistry = async () => {
    try {
      const response = await fetch('/api/models-dev/providers?rich=true')
      if (!response.ok) {
        throw new Error('Failed to fetch providers')
      }
      const data = await response.json()
      if (Array.isArray(data)) {
        setProvidersRegistry(data)
      }
    } catch (err) {
      console.error('Error loading providers registry:', err)
    }
  }

  const loadApiKeys = async () => {
    try {
      const response = await fetch('/api/admin/providers')
      const data = await response.json()

      if (data.success) {
        setApiKeys(data.apiKeys)
        setStats(data.stats)
      } else {
        setError('Failed to load API keys')
      }
    } catch (err) {
      setError('Error loading API keys')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenEdit = (key: ApiKey) => {
    setEditingKey(key)
    setFormData({
      provider: key.provider,
      key_name: key.key_name,
      encrypted_key: '', // Don't populate for security
      monthly_budget: key.monthly_budget?.toString() || '',
      daily_limit: key.daily_limit?.toString() || '',
      rate_limit_rpm: key.rate_limit_rpm?.toString() || '',
      priority_order: key.priority_order?.toString() || '1'
    })
    setShowEditDialog(true)
  }

  const handleAddKey = async () => {
    try {
      const response = await fetch('/api/admin/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_key',
          ...formData,
          monthly_budget: formData.monthly_budget ? Number(formData.monthly_budget) : null,
          daily_limit: formData.daily_limit ? Number(formData.daily_limit) : null,
          rate_limit_rpm: formData.rate_limit_rpm ? Number(formData.rate_limit_rpm) : null,
          priority_order: formData.priority_order ? Number(formData.priority_order) : 1,
          encrypted_key: btoa(formData.encrypted_key) // Base64 encode
        })
      })

      const data = await response.json()

      if (data.success) {
        setShowAddDialog(false)
        setFormData({
          provider: 'anthropic',
          key_name: '',
          encrypted_key: '',
          monthly_budget: '',
          daily_limit: '',
          rate_limit_rpm: '',
          priority_order: ''
        })
        loadApiKeys()
      } else {
        setError(data.error || 'Failed to add API key')
      }
    } catch (err) {
      setError('Error adding API key')
    }
  }

  const handleUpdateKey = async () => {
    if (!editingKey) return

    try {
      const response = await fetch('/api/admin/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_key',
          keyId: editingKey.id,
          key_name: formData.key_name,
          encrypted_key: formData.encrypted_key ? btoa(formData.encrypted_key) : undefined,
          monthly_budget: formData.monthly_budget ? Number(formData.monthly_budget) : null,
          daily_limit: formData.daily_limit ? Number(formData.daily_limit) : null,
          rate_limit_rpm: formData.rate_limit_rpm ? Number(formData.rate_limit_rpm) : null,
          priority_order: formData.priority_order ? Number(formData.priority_order) : 1
        })
      })

      const data = await response.json()

      if (data.success) {
        setShowEditDialog(false)
        setEditingKey(null)
        setFormData({
          provider: 'anthropic',
          key_name: '',
          encrypted_key: '',
          monthly_budget: '',
          daily_limit: '',
          rate_limit_rpm: '',
          priority_order: ''
        })
        loadApiKeys()
      } else {
        setError(data.error || 'Failed to update API key')
      }
    } catch (err) {
      setError('Error updating API key')
    }
  }

  const handleDeleteKey = async (keyId: string, userId: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return

    try {
      const response = await fetch('/api/admin/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_key',
          keyId,
          user_id: userId
        })
      })

      const data = await response.json()

      if (data.success) {
        loadApiKeys()
      } else {
        setError(data.error || 'Failed to delete API key')
      }
    } catch (err) {
      setError('Error deleting API key')
    }
  }

  const handleToggleActive = async (keyId: string, currentActive: boolean) => {
    try {
      const response = await fetch('/api/admin/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_active',
          keyId,
          active: !currentActive
        })
      })

      const data = await response.json()

      if (data.success) {
        loadApiKeys()
      } else {
        setError(data.error || 'Failed to toggle key status')
      }
    } catch (err) {
      setError('Error toggling key status')
    }
  }

  const handleResetUsage = async (keyId: string) => {
    if (!confirm('Are you sure you want to reset usage for this key?')) return

    try {
      const response = await fetch('/api/admin/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_usage',
          keyId
        })
      })

      const data = await response.json()

      if (data.success) {
        loadApiKeys()
      } else {
        setError(data.error || 'Failed to reset usage')
      }
    } catch (err) {
      setError('Error resetting usage')
    }
  }

  const handleReorderKey = async (keyId: string, direction: 'up' | 'down') => {
    const providerKeys = apiKeys
      .filter(key => key.provider === selectedProvider)
      .sort((a, b) => a.priority_order - b.priority_order)

    const currentIndex = providerKeys.findIndex(key => key.id === keyId)
    if (currentIndex === -1) return

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= providerKeys.length) return

    // Swap priority orders
    const keyOrders = providerKeys.map((key, index) => {
      let newOrder = key.priority_order
      if (index === currentIndex) {
        newOrder = providerKeys[newIndex].priority_order
      } else if (index === newIndex) {
        newOrder = providerKeys[currentIndex].priority_order
      }
      return { keyId: key.id, priority_order: newOrder }
    })

    try {
      const response = await fetch('/api/admin/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reorder_keys',
          provider: selectedProvider,
          user_id: providerKeys[0]?.user_email, // Assuming admin user
          keyOrders
        })
      })

      const data = await response.json()

      if (data.success) {
        loadApiKeys()
      } else {
        setError(data.error || 'Failed to reorder keys')
      }
    } catch (err) {
      setError('Error reordering keys')
    }
  }

  const getProviderKeys = (provider: string) => {
    return apiKeys
      .filter(key => key.provider === provider)
      .sort((a, b) => a.priority_order - b.priority_order)
  }

  const getProviderLogo = (providerId: string) => {
    const providerInfo = providersRegistry.find(p =>
      p.id === providerId ||
      p.name.toLowerCase() === providerId.toLowerCase() ||
      providerId.toLowerCase().includes(p.id)
    )
    return providerInfo?.logo || 'https://models.dev/logos/default.svg'
  }

  const formatUsage = (current: number | null | undefined, limit: number | null | undefined) => {
    const currentVal = current || 0
    if (!limit) return `$${currentVal.toFixed(2)}`
    const percentage = (currentVal / limit) * 100
    return `$${currentVal.toFixed(2)} / $${limit.toFixed(2)} (${percentage.toFixed(1)}%)`
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Provider API Keys</h1>
          <p className="text-gray-600 mt-2">Manage API keys for different providers with ordered fallback</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={() => window.location.href = '/admin/providers/analytics'}>
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add API Key
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] flex flex-col overflow-hidden" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader className="shrink-0">
              <DialogTitle>Add New API Key</DialogTitle>
              <DialogDescription>
                Add a new API key for a provider. Keys will be tried in priority order.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 overflow-y-auto flex-1 px-1">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="provider" className="text-right">Provider</Label>
                <Select value={formData.provider} onValueChange={(value) => setFormData({...formData, provider: value})}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <img
                          src={getProviderLogo(formData.provider)}
                          alt={formData.provider}
                          className="w-5 h-5 object-contain"
                        />
                        <span>{PROVIDERS.find(p => p.id === formData.provider)?.name}</span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map(provider => (
                      <SelectItem key={provider.id} value={provider.id}>
                        <div className="flex items-center gap-2">
                          <img
                            src={getProviderLogo(provider.id)}
                            alt={provider.name}
                            className="w-5 h-5 object-contain"
                          />
                          <span>{provider.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="key_name" className="text-right">Key Name</Label>
                <Input
                  id="key_name"
                  value={formData.key_name}
                  onChange={(e) => setFormData({...formData, key_name: e.target.value})}
                  className="col-span-3"
                  placeholder="My API Key"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="encrypted_key" className="text-right">API Key</Label>
                <Input
                  id="encrypted_key"
                  type="password"
                  value={formData.encrypted_key}
                  onChange={(e) => setFormData({...formData, encrypted_key: e.target.value})}
                  className="col-span-3"
                  placeholder="sk-..."
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="priority_order" className="text-right">Priority Order</Label>
                <Input
                  id="priority_order"
                  type="number"
                  value={formData.priority_order}
                  onChange={(e) => setFormData({...formData, priority_order: e.target.value})}
                  className="col-span-3"
                  placeholder="1"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="monthly_budget" className="text-right">Monthly Budget ($)</Label>
                <Input
                  id="monthly_budget"
                  type="number"
                  value={formData.monthly_budget}
                  onChange={(e) => setFormData({...formData, monthly_budget: e.target.value})}
                  className="col-span-3"
                  placeholder="100"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="daily_limit" className="text-right">Daily Limit ($)</Label>
                <Input
                  id="daily_limit"
                  type="number"
                  value={formData.daily_limit}
                  onChange={(e) => setFormData({...formData, daily_limit: e.target.value})}
                  className="col-span-3"
                  placeholder="10"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="rate_limit_rpm" className="text-right">Rate Limit (RPM)</Label>
                <Input
                  id="rate_limit_rpm"
                  type="number"
                  value={formData.rate_limit_rpm}
                  onChange={(e) => setFormData({...formData, rate_limit_rpm: e.target.value})}
                  className="col-span-3"
                  placeholder="100"
                />
              </div>
            </div>
            <DialogFooter className="shrink-0">
              <Button onClick={handleAddKey}>Add Key</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit API Key Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-[500px] flex flex-col overflow-hidden" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader className="shrink-0">
              <DialogTitle>Edit API Key</DialogTitle>
              <DialogDescription>
                Update the API key settings. Leave API Key field empty to keep the existing key.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 overflow-y-auto flex-1 px-1">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit_provider" className="text-right">Provider</Label>
                <Input
                  id="edit_provider"
                  value={PROVIDERS.find(p => p.id === formData.provider)?.name || formData.provider}
                  disabled
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit_key_name" className="text-right">Key Name</Label>
                <Input
                  id="edit_key_name"
                  value={formData.key_name}
                  onChange={(e) => setFormData({...formData, key_name: e.target.value})}
                  className="col-span-3"
                  placeholder="My API Key"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit_encrypted_key" className="text-right">API Key</Label>
                <Input
                  id="edit_encrypted_key"
                  type="password"
                  value={formData.encrypted_key}
                  onChange={(e) => setFormData({...formData, encrypted_key: e.target.value})}
                  className="col-span-3"
                  placeholder="Leave empty to keep existing"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit_priority_order" className="text-right">Priority Order</Label>
                <Input
                  id="edit_priority_order"
                  type="number"
                  value={formData.priority_order}
                  onChange={(e) => setFormData({...formData, priority_order: e.target.value})}
                  className="col-span-3"
                  placeholder="1"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit_monthly_budget" className="text-right">Monthly Budget ($)</Label>
                <Input
                  id="edit_monthly_budget"
                  type="number"
                  value={formData.monthly_budget}
                  onChange={(e) => setFormData({...formData, monthly_budget: e.target.value})}
                  className="col-span-3"
                  placeholder="100"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit_daily_limit" className="text-right">Daily Limit ($)</Label>
                <Input
                  id="edit_daily_limit"
                  type="number"
                  value={formData.daily_limit}
                  onChange={(e) => setFormData({...formData, daily_limit: e.target.value})}
                  className="col-span-3"
                  placeholder="10"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit_rate_limit_rpm" className="text-right">Rate Limit (RPM)</Label>
                <Input
                  id="edit_rate_limit_rpm"
                  type="number"
                  value={formData.rate_limit_rpm}
                  onChange={(e) => setFormData({...formData, rate_limit_rpm: e.target.value})}
                  className="col-span-3"
                  placeholder="100"
                />
              </div>
            </div>
            <DialogFooter className="shrink-0">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
              <Button onClick={handleUpdateKey}>Update Key</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Provider Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total API Keys</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apiKeys.length}</div>
            <p className="text-xs text-muted-foreground">
              {apiKeys.filter(key => key.active).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Monthly Usage</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${Object.values(stats).reduce((sum, stat) => sum + stat.totalUsage, 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all providers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Providers</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(stats).length}
            </div>
            <p className="text-xs text-muted-foreground">
              With configured keys
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Provider Tabs */}
      <Tabs value={selectedProvider} onValueChange={setSelectedProvider}>
        <TabsList className="grid w-full grid-cols-6">
          {PROVIDERS.map(provider => (
            <TabsTrigger key={provider.id} value={provider.id} className="flex items-center gap-2">
              <img
                src={getProviderLogo(provider.id)}
                alt={provider.name}
                className="w-4 h-4 object-contain"
              />
              <span>{provider.name}</span>
              {stats[provider.id] && (
                <Badge variant="secondary" className="ml-1">
                  {stats[provider.id].count}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {PROVIDERS.map(provider => (
          <TabsContent key={provider.id} value={provider.id} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src={getProviderLogo(provider.id)}
                      alt={provider.name}
                      className="w-6 h-6 object-contain"
                    />
                    <span>{provider.name} API Keys</span>
                  </div>
                  <Badge variant="outline">
                    {getProviderKeys(provider.id).length} keys
                  </Badge>
                </CardTitle>
                <CardDescription>{provider.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {getProviderKeys(provider.id).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No API keys configured for {provider.name}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {getProviderKeys(provider.id).map((key, index) => (
                      <Card key={key.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="flex flex-col items-center space-y-1">
                                <Badge variant="outline">#{key.priority_order}</Badge>
                                <div className="flex flex-col space-y-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleReorderKey(key.id, 'up')}
                                    disabled={index === 0}
                                  >
                                    <ArrowUp className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleReorderKey(key.id, 'down')}
                                    disabled={index === getProviderKeys(provider.id).length - 1}
                                  >
                                    <ArrowDown className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <h3 className="font-medium">{key.key_name}</h3>
                                  <Badge variant={key.active ? "default" : "secondary"}>
                                    {key.active ? "Active" : "Inactive"}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-500">{key.key_preview}</p>
                                <div className="grid grid-cols-2 gap-4 mt-2">
                                  <div>
                                    <p className="text-xs text-gray-500">Monthly Usage</p>
                                    <p className="text-sm">{formatUsage(key.current_usage, key.monthly_budget)}</p>
                                    {key.monthly_budget && (
                                      <Progress
                                        value={(key.current_usage / key.monthly_budget) * 100}
                                        className="h-2 mt-1"
                                      />
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500">Daily Usage</p>
                                    <p className="text-sm">{formatUsage(key.daily_usage, key.daily_limit)}</p>
                                    {key.daily_limit && (
                                      <Progress
                                        value={(key.daily_usage / key.daily_limit) * 100}
                                        className="h-2 mt-1"
                                      />
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenEdit(key)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleActive(key.id, key.active)}
                              >
                                {key.active ? "Disable" : "Enable"}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleResetUsage(key.id)}
                              >
                                Reset Usage
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteKey(key.id, key.user_email || '')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}