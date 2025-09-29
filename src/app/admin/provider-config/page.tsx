'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

interface ProviderConfig {
  id: string
  provider_name: string
  display_name: string
  max_output_tokens_premium: number
  max_output_tokens_normal: number
  max_output_tokens_eco: number
  max_output_tokens_default: number
}

export default function ProviderConfigPage() {
  const [configs, setConfigs] = useState<ProviderConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchConfigs()
  }, [])

  const fetchConfigs = async () => {
    try {
      const response = await fetch('/api/admin/provider-config')
      const data = await response.json()
      if (data.success) {
        setConfigs(data.configs)
      }
    } catch (error) {
      console.error('Error fetching configs:', error)
      toast({
        title: 'Error',
        description: 'Failed to load provider configurations',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (providerName: string, field: string, value: number) => {
    setSaving(providerName)
    try {
      const response = await fetch('/api/admin/provider-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_name: providerName,
          [field]: value
        })
      })

      const data = await response.json()
      if (data.success) {
        toast({
          title: 'Success',
          description: `Updated ${field} for ${providerName}`,
        })
        await fetchConfigs()
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update configuration',
        variant: 'destructive'
      })
    } finally {
      setSaving(null)
    }
  }

  const handleInputChange = (providerName: string, field: string, value: string) => {
    const numValue = parseInt(value) || 0
    setConfigs(configs.map(config =>
      config.provider_name === providerName
        ? { ...config, [field]: numValue }
        : config
    ))
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Provider Configuration</h1>
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Provider Configuration</h1>
        <p className="text-muted-foreground mt-2">
          Configure max output tokens for each provider by tier (Premium, Normal, Eco)
        </p>
      </div>

      <div className="grid gap-6">
        {configs.map((config) => (
          <Card key={config.id}>
            <CardHeader>
              <CardTitle>{config.display_name}</CardTitle>
              <CardDescription>
                Configure maximum output token limits for different model tiers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`${config.provider_name}-premium`}>
                    Premium Tier
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id={`${config.provider_name}-premium`}
                      type="number"
                      value={config.max_output_tokens_premium}
                      onChange={(e) => handleInputChange(config.provider_name, 'max_output_tokens_premium', e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleUpdate(config.provider_name, 'max_output_tokens_premium', config.max_output_tokens_premium)}
                      disabled={saving === config.provider_name}
                    >
                      Save
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    High-end models (e.g., Claude Opus, GPT-4)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${config.provider_name}-normal`}>
                    Normal Tier
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id={`${config.provider_name}-normal`}
                      type="number"
                      value={config.max_output_tokens_normal}
                      onChange={(e) => handleInputChange(config.provider_name, 'max_output_tokens_normal', e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleUpdate(config.provider_name, 'max_output_tokens_normal', config.max_output_tokens_normal)}
                      disabled={saving === config.provider_name}
                    >
                      Save
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Mid-tier models (e.g., Claude Sonnet, GPT-4 Turbo)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${config.provider_name}-eco`}>
                    Eco Tier
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id={`${config.provider_name}-eco`}
                      type="number"
                      value={config.max_output_tokens_eco}
                      onChange={(e) => handleInputChange(config.provider_name, 'max_output_tokens_eco', e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleUpdate(config.provider_name, 'max_output_tokens_eco', config.max_output_tokens_eco)}
                      disabled={saving === config.provider_name}
                    >
                      Save
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Budget models (e.g., Claude Haiku, GPT-3.5)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${config.provider_name}-default`}>
                    Default
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id={`${config.provider_name}-default`}
                      type="number"
                      value={config.max_output_tokens_default}
                      onChange={(e) => handleInputChange(config.provider_name, 'max_output_tokens_default', e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleUpdate(config.provider_name, 'max_output_tokens_default', config.max_output_tokens_default)}
                      disabled={saving === config.provider_name}
                    >
                      Save
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    When tier is not specified
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">ℹ️ How it works:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>These limits apply globally to all users for each provider</li>
          <li>Users can override these in their preferences (up to these limits)</li>
          <li>Premium tier is for high-end models (highest cost, best quality)</li>
          <li>Normal tier is for mid-range models (balanced cost/quality)</li>
          <li>Eco tier is for budget models (lowest cost, faster responses)</li>
          <li>Default is used when the model tier cannot be determined</li>
        </ul>
      </div>
    </div>
  )
}