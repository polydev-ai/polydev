import { useState, useEffect } from 'react'
import { usePreferences } from './usePreferences'

export interface MemorySettings {
  enable_conversation_memory: boolean
  enable_project_memory: boolean
  max_conversation_history: number
  auto_extract_patterns: boolean
}

export function useMemorySettings() {
  const { preferences, loading: preferencesLoading, error: preferencesError, refetch } = usePreferences()
  const [memorySettings, setMemorySettings] = useState<MemorySettings>({
    enable_conversation_memory: true,
    enable_project_memory: true,
    max_conversation_history: 10,
    auto_extract_patterns: true
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (preferences?.mcp_settings?.memory_settings) {
      setMemorySettings(preferences.mcp_settings.memory_settings)
    }
  }, [preferences])

  const updateMemorySettings = async (newSettings: Partial<MemorySettings>) => {
    try {
      setLoading(true)
      setError(null)

      const updatedSettings = { ...memorySettings, ...newSettings }
      
      const updatedMcpSettings = {
        ...preferences?.mcp_settings,
        memory_settings: updatedSettings
      }

      const response = await fetch('/api/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mcp_settings: updatedMcpSettings
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update memory settings')
      }

      const { preferences: updatedPreferences } = await response.json()
      setMemorySettings(updatedPreferences.mcp_settings.memory_settings)
      
      // Refetch preferences to update the main context
      await refetch()
      
      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update memory settings'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  return {
    memorySettings,
    loading: loading || preferencesLoading,
    error: error || preferencesError,
    updateMemorySettings
  }
}