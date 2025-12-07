import { useState, useEffect } from 'react'

export interface UserPreferences {
  user_id: string
  default_provider: string
  default_model: string
  preferred_providers: string[]
  usage_preference: 'auto' | 'api_keys' | 'cli'
  source_priority?: ('cli' | 'api' | 'admin')[] // Priority order for model sources (default: ['cli', 'api', 'admin'])
  model_preferences: {
    [provider: string]: {
      models: string[]
      order: number
    }
  }
  mcp_settings: {
    default_temperature: number
    default_max_tokens: number
    auto_select_model: boolean
    saved_chat_models?: string[]
    saved_mcp_models?: string[]
    max_chat_models?: number
    max_mcp_models?: number
    perspectives_per_message?: number // Number of models to query simultaneously (1-10)
    tier_priority?: string[] // Order of tiers: ['normal', 'eco', 'premium']
    provider_priority?: string[] // Global provider order: ['anthropic', 'openai', 'google', ...]
    model_order?: { [tier: string]: string[] } // User's model order preference per tier: { 'normal': ['model-id-1', 'model-id-2'], ... }
    memory_settings: {
      enable_conversation_memory: boolean
      enable_project_memory: boolean
      max_conversation_history: number
      auto_extract_patterns: boolean
    }
  }
}

export function usePreferences() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPreferences = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/preferences', {
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch preferences: ${response.status}`)
      }
      
      const data = await response.json()
      setPreferences(data.preferences)
      setError(null)
    } catch (err) {
      console.error('Error fetching preferences:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch preferences')
    } finally {
      setLoading(false)
    }
  }

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    try {
      const response = await fetch('/api/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updates),
      })
      
      if (!response.ok) {
        throw new Error(`Failed to update preferences: ${response.status}`)
      }
      
      const data = await response.json()
      setPreferences(data.preferences)
      return data.preferences
    } catch (err) {
      console.error('Error updating preferences:', err)
      throw err
    }
  }

  useEffect(() => {
    fetchPreferences()
  }, [])

  return {
    preferences,
    loading,
    error,
    refetch: fetchPreferences,
    updatePreferences
  }
}