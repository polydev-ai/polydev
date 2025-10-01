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
        // We'll need to fetch additional model metadata from models.dev API
        const transformedAdminModels: DashboardModel[] = []

        for (const adminModel of rawAdminModels || []) {
          transformedAdminModels.push({
            id: adminModel.id,
            name: formatModelName(adminModel.id),
            provider: adminModel.provider,
            providerName: formatProviderName(adminModel.provider),
            tier: 'api',
            isConfigured: true,
            description: `${formatModelName(adminModel.id)} - Admin Provided (${adminModel.keyName})`
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
