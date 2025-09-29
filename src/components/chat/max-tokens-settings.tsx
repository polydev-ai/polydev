'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog'
import { Settings } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface MaxTokensSettingsProps {
  currentModel?: string
  currentMaxTokens?: number
}

export function MaxTokensSettings({ currentModel, currentMaxTokens }: MaxTokensSettingsProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const [settings, setSettings] = useState({
    max_output_tokens_custom: 0,
    max_output_tokens_premium: 0,
    max_output_tokens_normal: 0,
    max_output_tokens_eco: 0
  })

  useEffect(() => {
    if (open) {
      fetchSettings()
    }
  }, [open])

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/preferences')
      const data = await response.json()
      if (data.preferences) {
        setSettings({
          max_output_tokens_custom: data.preferences.max_output_tokens_custom || 0,
          max_output_tokens_premium: data.preferences.max_output_tokens_premium || 0,
          max_output_tokens_normal: data.preferences.max_output_tokens_normal || 0,
          max_output_tokens_eco: data.preferences.max_output_tokens_eco || 0
        })
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast({
        title: 'Error',
        description: 'Failed to load max tokens settings',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          max_output_tokens_custom: settings.max_output_tokens_custom || null,
          max_output_tokens_premium: settings.max_output_tokens_premium || null,
          max_output_tokens_normal: settings.max_output_tokens_normal || null,
          max_output_tokens_eco: settings.max_output_tokens_eco || null
        })
      })

      if (!response.ok) throw new Error('Failed to save settings')

      toast({
        title: 'Success',
        description: 'Max output tokens settings saved',
      })
      setOpen(false)
    } catch (error) {
      console.error('Error saving settings:', error)
      toast({
        title: 'Error',
        description: 'Failed to save max tokens settings',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Max Tokens
          {currentMaxTokens && (
            <span className="text-xs text-muted-foreground">
              ({currentMaxTokens})
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Max Output Tokens Settings</DialogTitle>
          <DialogDescription>
            Configure maximum output tokens for different model tiers. Leave at 0 to use system defaults.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-4 text-center text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="custom">
                Custom (All Models)
              </Label>
              <Input
                id="custom"
                type="number"
                min="0"
                max="32000"
                value={settings.max_output_tokens_custom || ''}
                onChange={(e) => setSettings({ ...settings, max_output_tokens_custom: parseInt(e.target.value) || 0 })}
                placeholder="e.g., 16000"
              />
              <p className="text-xs text-muted-foreground">
                Override all models with this limit. Set to 0 to use tier-specific settings.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="premium">
                Premium Tier
              </Label>
              <Input
                id="premium"
                type="number"
                min="0"
                max="32000"
                value={settings.max_output_tokens_premium || ''}
                onChange={(e) => setSettings({ ...settings, max_output_tokens_premium: parseInt(e.target.value) || 0 })}
                placeholder="Default: 16000"
              />
              <p className="text-xs text-muted-foreground">
                High-end models: Claude Opus, GPT-4, Gemini Pro
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="normal">
                Normal Tier
              </Label>
              <Input
                id="normal"
                type="number"
                min="0"
                max="32000"
                value={settings.max_output_tokens_normal || ''}
                onChange={(e) => setSettings({ ...settings, max_output_tokens_normal: parseInt(e.target.value) || 0 })}
                placeholder="Default: 8000"
              />
              <p className="text-xs text-muted-foreground">
                Mid-tier models: Claude Sonnet, GPT-4 Turbo, Grok
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="eco">
                Eco Tier
              </Label>
              <Input
                id="eco"
                type="number"
                min="0"
                max="32000"
                value={settings.max_output_tokens_eco || ''}
                onChange={(e) => setSettings({ ...settings, max_output_tokens_eco: parseInt(e.target.value) || 0 })}
                placeholder="Default: 4000"
              />
              <p className="text-xs text-muted-foreground">
                Budget models: Claude Haiku, GPT-3.5, Gemini Flash
              </p>
            </div>

            {currentModel && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="font-medium">Current Model:</p>
                <p className="text-muted-foreground">{currentModel}</p>
                {currentMaxTokens && (
                  <p className="text-muted-foreground mt-1">
                    Using: {currentMaxTokens} tokens
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}