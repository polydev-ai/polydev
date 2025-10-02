import { useState, useEffect, useRef } from 'react'
import { useDashboardModels, type DashboardModel } from './useDashboardModels'

interface AdminProvidedModel {
  id: string
  provider: string
  keyId: string
  keyName: string
  priorityOrder: number
  monthlyBudget: number | null
  currentUsage: number
  isAdminProvided: boolean
  active: boolean
}

/**
 * Hook to fetch all available models for chat:
 * - User's personal models (from their API keys)
 * - Admin-provided models (available to all users)
 *
 * Includes deduplication: if same model exists in both sources, user's version takes precedence
 */
export function useChatModels() {
  const { models: userModels, loading: userLoading, error: userError, hasModels: hasUserModels, refresh: refreshUserModels } = useDashboardModels()

  const [adminModels, setAdminModels] = useState<DashboardModel[]>([])
  const [adminLoading, setAdminLoading] = useState(true)
  const [adminError, setAdminError] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true

    const fetchAdminModels = async () => {
      try {
        setAdminLoading(true)

        const response = await fetch('/api/models/admin-provided')
        if (!response.ok) {
          throw new Error('Failed to fetch admin-provided models')
        }

        const { adminModels: rawAdminModels } = await response.json()

        // Transform admin models to DashboardModel format
        // Fetch provider logos and metadata from models.dev API
        const transformedAdminModels: DashboardModel[] = []

        // Batch fetch provider data for all unique providers
        const uniqueProviders = [...new Set(rawAdminModels.map((m: any) => m.provider as string))] as string[]
        const providerDataMap = new Map<string, any>()

        await Promise.allSettled(
          uniqueProviders.map(async (providerId: string) => {
            try {
              const response = await fetch(`/api/models-dev/providers?provider=${encodeURIComponent(providerId)}&rich=true`)
              if (response.ok) {
                const data = await response.json()
                const providerData = Array.isArray(data) ? data[0] : data
                providerDataMap.set(providerId, providerData)
              }
            } catch (error) {
              console.warn(`Failed to fetch provider data for ${providerId}:`, error)
            }
          })
        )

        for (const adminModel of rawAdminModels || []) {
          const providerData = providerDataMap.get(adminModel.provider)

          // Find model-specific data from provider's models array
          let modelData: any = null
          if (providerData?.models && Array.isArray(providerData.models)) {
            // Try to find exact match by model ID
            modelData = providerData.models.find((m: any) =>
              m.id === adminModel.id || m.friendly_id === adminModel.id
            )
          }

          transformedAdminModels.push({
            id: adminModel.id,
            name: adminModel.displayName || modelData?.name || formatModelName(adminModel.id),
            provider: adminModel.provider,
            providerName: providerData?.name || formatProviderName(adminModel.provider),
            providerLogo: providerData?.logo || providerData?.logo_url,
            tier: adminModel.tier || 'admin',
            isConfigured: true,
            price: modelData?.pricing ? {
              input: modelData.pricing.input,
              output: modelData.pricing.output
            } : undefined,
            features: modelData ? {
              supportsImages: modelData.supportsVision,
              supportsTools: modelData.supportsTools,
              supportsStreaming: modelData.supportsStreaming,
              supportsReasoning: modelData.supportsReasoning
            } : undefined,
            contextWindow: modelData?.contextWindow,
            maxTokens: modelData?.maxTokens,
            description: `${adminModel.displayName || modelData?.name || formatModelName(adminModel.id)} - Admin Provided (${adminModel.keyName})`
          })
        }

        if (isMountedRef.current) {
          setAdminModels(transformedAdminModels)
          setAdminError(null)
        }
      } catch (err) {
        console.error('Error fetching admin models:', err)
        if (isMountedRef.current) {
          setAdminError(err instanceof Error ? err.message : 'Failed to fetch admin models')
          setAdminModels([])
        }
      } finally {
        if (isMountedRef.current) {
          setAdminLoading(false)
        }
      }
    }

    fetchAdminModels()

    return () => {
      isMountedRef.current = false
    }
  }, [refreshTrigger])

  // Merge user models and admin models with deduplication
  const allModels = (() => {
    const modelMap = new Map<string, DashboardModel>()

    // First, add all admin models
    for (const model of adminModels) {
      modelMap.set(model.id, model)
    }

    // Then, add user models (these will override admin models if same ID)
    for (const model of userModels) {
      modelMap.set(model.id, model)
    }

    return Array.from(modelMap.values())
  })()

  const refresh = async () => {
    await refreshUserModels()
    setRefreshTrigger(prev => prev + 1)
  }

  return {
    models: allModels,
    loading: userLoading || adminLoading,
    error: userError || adminError,
    hasModels: allModels.length > 0,
    hasUserModels,
    hasAdminModels: adminModels.length > 0,
    userModels,
    adminModels,
    refresh
  }
}

function formatModelName(modelId: string): string {
  return modelId
    .replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim()
}

function formatProviderName(providerId: string): string {
  const providerNames: Record<string, string> = {
    'openai': 'OpenAI',
    'anthropic': 'Anthropic',
    'google': 'Google',
    'gemini': 'Google Gemini',
    'mistral': 'Mistral AI',
    'cohere': 'Cohere',
    'meta': 'Meta',
    'x-ai': 'xAI',
    'xai': 'xAI',
    'groq': 'Groq',
    'together': 'Together AI',
    'fireworks': 'Fireworks AI'
  }

  return providerNames[providerId.toLowerCase()] || providerId.charAt(0).toUpperCase() + providerId.slice(1)
}
