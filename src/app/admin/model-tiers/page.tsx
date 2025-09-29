'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Pencil, Plus, Trash2, Settings } from 'lucide-react'

interface ModelTier {
  id: string
  provider: string
  model_name: string
  display_name: string
  tier: 'premium' | 'normal' | 'eco'
  max_output_tokens: number
  active: boolean
}

export default function ModelTiersPage() {
  const [models, setModels] = useState<ModelTier[]>([])
  const [loading, setLoading] = useState(true)
  const [editingModel, setEditingModel] = useState<ModelTier | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState(false)
  const [globalMaxTokens, setGlobalMaxTokens] = useState(32000)
  const [savingGlobal, setSavingGlobal] = useState(false)
  const { toast } = useToast()

  const [newModel, setNewModel] = useState({
    provider: '',
    model_name: '',
    display_name: '',
    tier: 'normal' as 'premium' | 'normal' | 'eco',
    max_output_tokens: 8000
  })

  useEffect(() => {
    fetchModels()
    fetchGlobalSettings()
  }, [])

  const fetchModels = async () => {
    try {
      const response = await fetch('/api/admin/model-tiers')
      const data = await response.json()
      if (data.success) {
        setModels(data.models)
      }
    } catch (error) {
      console.error('Error fetching models:', error)
      toast({
        title: 'Error',
        description: 'Failed to load model tiers',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchGlobalSettings = async () => {
    try {
      const response = await fetch('/api/admin/global-settings')
      const data = await response.json()
      if (data.success) {
        setGlobalMaxTokens(data.settings.max_tokens)
      }
    } catch (error) {
      console.error('Error fetching global settings:', error)
    }
  }

  const handleSaveGlobalMax = async () => {
    setSavingGlobal(true)
    try {
      const response = await fetch('/api/admin/global-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_tokens: globalMaxTokens })
      })

      const data = await response.json()
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Global max tokens updated',
        })
        setIsGlobalSettingsOpen(false)
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update global settings',
        variant: 'destructive'
      })
    } finally {
      setSavingGlobal(false)
    }
  }

  const handleUpdate = async (id: string, updates: Partial<ModelTier>) => {
    try {
      const response = await fetch('/api/admin/model-tiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          id,
          ...updates
        })
      })

      const data = await response.json()
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Model tier updated',
        })
        await fetchModels()
        setIsEditDialogOpen(false)
        setEditingModel(null)
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update model tier',
        variant: 'destructive'
      })
    }
  }

  const handleCreate = async () => {
    try {
      const response = await fetch('/api/admin/model-tiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          ...newModel
        })
      })

      const data = await response.json()
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Model tier created',
        })
        await fetchModels()
        setIsAddDialogOpen(false)
        setNewModel({
          provider: '',
          model_name: '',
          display_name: '',
          tier: 'normal',
          max_output_tokens: 8000
        })
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create model tier',
        variant: 'destructive'
      })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this model tier?')) return

    try {
      const response = await fetch('/api/admin/model-tiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          id
        })
      })

      const data = await response.json()
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Model tier deleted',
        })
        await fetchModels()
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete model tier',
        variant: 'destructive'
      })
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'premium': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'normal': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'eco': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const groupedModels = {
    premium: models.filter(m => m.tier === 'premium'),
    normal: models.filter(m => m.tier === 'normal'),
    eco: models.filter(m => m.tier === 'eco')
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Model Tiers Management</h1>
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Model Tiers Management</h1>
          <p className="text-muted-foreground mt-2">
            Configure model tiers and their max output tokens
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isGlobalSettingsOpen} onOpenChange={setIsGlobalSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Global Max Tokens
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]" onInteractOutside={(e) => e.preventDefault()}>
              <DialogHeader>
                <DialogTitle>Global Max Output Tokens</DialogTitle>
                <DialogDescription>
                  Set the absolute maximum output tokens for all models. User and model-specific settings will be capped by this limit.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="global-max">Global Maximum (Absolute Ceiling)</Label>
                  <Input
                    id="global-max"
                    type="number"
                    min="1000"
                    max="200000"
                    value={globalMaxTokens}
                    onChange={(e) => setGlobalMaxTokens(parseInt(e.target.value) || 32000)}
                  />
                  <p className="text-xs text-muted-foreground">
                    All user preferences and model-specific limits will be capped at this value. Range: 1,000 - 200,000 tokens.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsGlobalSettingsOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveGlobalMax} disabled={savingGlobal}>
                  {savingGlobal ? 'Saving...' : 'Save'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Model
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Add New Model Tier</DialogTitle>
              <DialogDescription>
                Add a new model with its tier and max output tokens
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="new-provider">Provider ID</Label>
                <Input
                  id="new-provider"
                  value={newModel.provider}
                  onChange={(e) => setNewModel({ ...newModel, provider: e.target.value })}
                  placeholder="e.g., anthropic, openai, google"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-model-name">Model ID</Label>
                <Input
                  id="new-model-name"
                  value={newModel.model_name}
                  onChange={(e) => setNewModel({ ...newModel, model_name: e.target.value })}
                  placeholder="e.g., claude-3-opus-20240229"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-display-name">Display Name</Label>
                <Input
                  id="new-display-name"
                  value={newModel.display_name}
                  onChange={(e) => setNewModel({ ...newModel, display_name: e.target.value })}
                  placeholder="e.g., Claude 3 Opus"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-tier">Tier</Label>
                <Select value={newModel.tier} onValueChange={(value: any) => setNewModel({ ...newModel, tier: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="eco">Eco</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-max-tokens">Max Output Tokens</Label>
                <Input
                  id="new-max-tokens"
                  type="number"
                  value={newModel.max_output_tokens}
                  onChange={(e) => setNewModel({ ...newModel, max_output_tokens: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-6">
        {(['premium', 'normal', 'eco'] as const).map((tier) => (
          <Card key={tier}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTierColor(tier)}`}>
                  {tier.toUpperCase()}
                </span>
                <span className="text-muted-foreground text-sm">
                  ({groupedModels[tier].length} models)
                </span>
              </CardTitle>
              <CardDescription>
                {tier === 'premium' && 'Highest quality, highest cost models'}
                {tier === 'normal' && 'Balanced quality and cost models'}
                {tier === 'eco' && 'Budget-friendly, faster models'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {groupedModels[tier].map((model) => (
                  <div key={model.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{model.display_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {model.provider} / {model.model_name}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Max tokens:</span>{' '}
                        <span className="font-medium">{model.max_output_tokens?.toLocaleString() || 'N/A'}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingModel(model)
                          setIsEditDialogOpen(true)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(model.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {groupedModels[tier].length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No {tier} tier models configured
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Edit Model Tier</DialogTitle>
            <DialogDescription>
              Update the model's tier and max output tokens
            </DialogDescription>
          </DialogHeader>
          {editingModel && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-display-name">Display Name</Label>
                <Input
                  id="edit-display-name"
                  value={editingModel.display_name}
                  onChange={(e) => setEditingModel({ ...editingModel, display_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-tier">Tier</Label>
                <Select value={editingModel.tier} onValueChange={(value: any) => setEditingModel({ ...editingModel, tier: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="eco">Eco</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-max-tokens">Max Output Tokens</Label>
                <Input
                  id="edit-max-tokens"
                  type="number"
                  value={editingModel.max_output_tokens}
                  onChange={(e) => setEditingModel({ ...editingModel, max_output_tokens: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="text-muted-foreground">
                  <strong>Provider:</strong> {editingModel.provider}
                </p>
                <p className="text-muted-foreground">
                  <strong>Model ID:</strong> {editingModel.model_name}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditDialogOpen(false)
              setEditingModel(null)
            }}>Cancel</Button>
            <Button onClick={() => editingModel && handleUpdate(editingModel.id, {
              display_name: editingModel.display_name,
              tier: editingModel.tier,
              max_output_tokens: editingModel.max_output_tokens
            })}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}