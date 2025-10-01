'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, Check, Search, Star } from 'lucide-react'
import { usePreferences } from '../hooks/usePreferences'
import { useChatModels } from '../hooks/useChatModels'
import { PROVIDER_ICONS } from '../lib/openrouter-providers'
import Image from 'next/image'

interface SelectedModelsConfig {
  chat_models: string[]  // Models selected for chat
  mcp_models: string[]   // Models selected for MCP client
  max_chat_models: number  // How many models to show in chat
  max_mcp_models: number   // How many models to show in MCP
}

export default function ModelPreferenceSelector() {
  const { preferences, updatePreferences } = usePreferences()
  const { models: allModels, loading: modelsLoading } = useChatModels()
  const [isExpanded, setIsExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Get current selections from preferences
  const savedChatModels = preferences?.mcp_settings?.saved_chat_models || []
  const [selectedChatModels, setSelectedChatModels] = useState<string[]>(savedChatModels)
  const [selectedMcpModels, setSelectedMcpModels] = useState<string[]>([])
  const [maxChatModels, setMaxChatModels] = useState(10)
  const [maxMcpModels, setMaxMcpModels] = useState(5)

  // Update local state when preferences load
  useEffect(() => {
    if (preferences?.mcp_settings?.saved_chat_models) {
      setSelectedChatModels(preferences.mcp_settings.saved_chat_models)
    }
    // Load MCP models from preferences if available
    const mcpModels = (preferences?.mcp_settings as any)?.saved_mcp_models || []
    setSelectedMcpModels(mcpModels)

    const maxChat = (preferences?.mcp_settings as any)?.max_chat_models || 10
    const maxMcp = (preferences?.mcp_settings as any)?.max_mcp_models || 5
    setMaxChatModels(maxChat)
    setMaxMcpModels(maxMcp)
  }, [preferences])

  // Filter models by search query
  const filteredModels = allModels.filter(model =>
    model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    model.provider.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Group models by provider
  const modelsByProvider = filteredModels.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = []
    }
    acc[model.provider].push(model)
    return acc
  }, {} as Record<string, typeof allModels>)

  const toggleModelForChat = (modelId: string) => {
    setSelectedChatModels(prev =>
      prev.includes(modelId)
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    )
  }

  const toggleModelForMcp = (modelId: string) => {
    setSelectedMcpModels(prev =>
      prev.includes(modelId)
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    )
  }

  const savePreferences = async () => {
    try {
      setIsSaving(true)
      await updatePreferences({
        mcp_settings: {
          ...preferences?.mcp_settings,
          saved_chat_models: selectedChatModels,
          saved_mcp_models: selectedMcpModels,
          max_chat_models: maxChatModels,
          max_mcp_models: maxMcpModels
        }
      })
    } catch (error) {
      console.error('Failed to save model preferences:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const getProviderLogo = (provider: string) => {
    const providerConfig = PROVIDER_ICONS[provider.toLowerCase()]

    if (providerConfig?.logo) {
      return (
        <div className="w-6 h-6 relative">
          <Image
            src={providerConfig.logo}
            alt={provider}
            fill
            className="object-contain"
          />
        </div>
      )
    }

    // Fallback to first letter
    return (
      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
        {provider[0].toUpperCase()}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
          <div className="text-left">
            <h3 className="text-lg font-semibold text-gray-900">Model Preferences</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Select which models to use in Chat and MCP Client
            </p>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          {selectedChatModels.length} for Chat · {selectedMcpModels.length} for MCP
        </div>
      </button>

      {isExpanded && (
        <div className="px-6 pb-6 border-t border-gray-100">
          <div className="mt-4 space-y-4">
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search models or providers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Max models settings */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Chat Models
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={maxChatModels}
                  onChange={(e) => setMaxChatModels(parseInt(e.target.value) || 10)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max MCP Models
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={maxMcpModels}
                  onChange={(e) => setMaxMcpModels(parseInt(e.target.value) || 5)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Models by provider */}
            {modelsLoading ? (
              <div className="text-center py-8 text-gray-500">Loading models...</div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {Object.entries(modelsByProvider).map(([provider, models]) => (
                  <div key={provider} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      {getProviderLogo(provider)}
                      <h4 className="font-semibold text-gray-900 capitalize">{provider}</h4>
                      <span className="text-sm text-gray-500">({models.length} models)</span>
                    </div>

                    <div className="space-y-2">
                      {models.map(model => (
                        <div key={model.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-900">{model.name}</div>
                            {model.price && (
                              <div className="text-xs text-gray-500">
                                ${model.price.input}/M in · ${model.price.output}/M out
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => toggleModelForChat(model.id)}
                              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                selectedChatModels.includes(model.id)
                                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {selectedChatModels.includes(model.id) && <Check className="w-3 h-3 inline mr-1" />}
                              Chat
                            </button>

                            <button
                              onClick={() => toggleModelForMcp(model.id)}
                              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                selectedMcpModels.includes(model.id)
                                  ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {selectedMcpModels.includes(model.id) && <Check className="w-3 h-3 inline mr-1" />}
                              MCP
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {Object.keys(modelsByProvider).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    {searchQuery ? 'No models found matching your search' : 'No models available'}
                  </div>
                )}
              </div>
            )}

            {/* Save button */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={savePreferences}
                disabled={isSaving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Star className="w-4 h-4" />
                    Save Preferences
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
