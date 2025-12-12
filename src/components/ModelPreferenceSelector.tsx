'use client'

import { useState, useEffect, useMemo } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { ChevronDown, ChevronRight, Check, Search, Star, AlertCircle, Zap, Lock, GripVertical } from 'lucide-react'
import { usePreferences } from '../hooks/usePreferences'
import { useChatModels } from '../hooks/useChatModels'
import { useEnhancedApiKeysData } from '../hooks/useEnhancedApiKeysData'
import { PROVIDER_ICONS } from '../lib/provider-icons'

interface SelectedModelsConfig {
  chat_models: string[]  // Models selected for chat
  mcp_models: string[]   // Models selected for MCP client
  max_chat_models: number  // How many models to show in chat
  max_mcp_models: number   // How many models to show in MCP
}

export default function ModelPreferenceSelector() {
  const { preferences, updatePreferences } = usePreferences()
  const { models: allModels, loading: modelsLoading } = useChatModels()
  const { modelsDevProviders, apiKeys } = useEnhancedApiKeysData()
  const [isExpanded, setIsExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Create provider logo mapping from modelsDevProviders
  const providerLogoMap = useMemo(() => {
    const map: Record<string, string> = {}
    modelsDevProviders.forEach(provider => {
      if (provider.logo || provider.logo_url) {
        // Normalize provider ID
        const normalizedId = provider.id === 'xai' ? 'x-ai' : provider.id
        map[normalizedId] = provider.logo || provider.logo_url || ''
        // Also map by name (lowercase)
        map[provider.name.toLowerCase()] = provider.logo || provider.logo_url || ''
      }
    })
    return map
  }, [modelsDevProviders])

  // Get current selections from preferences
  const savedChatModels = preferences?.mcp_settings?.saved_chat_models || []
  const [selectedChatModels, setSelectedChatModels] = useState<string[]>(savedChatModels)
  const [selectedMcpModels, setSelectedMcpModels] = useState<string[]>([])
  const [maxChatModels, setMaxChatModels] = useState(10)
  const [maxMcpModels, setMaxMcpModels] = useState(5)

  // Quota and availability state
  const [quotas, setQuotas] = useState<{
    premium: { total: number; used: number; remaining: number }
    normal: { total: number; used: number; remaining: number }
    eco: { total: number; used: number; remaining: number }
  } | null>(null)
  const [modelAvailability, setModelAvailability] = useState<Record<string, {
    status: 'available' | 'fallback' | 'locked' | 'unavailable'
    primary_source?: 'cli' | 'api' | 'admin'
    perspectives_needed?: number
    tier?: string
  }>>({})
  const [loadingQuotas, setLoadingQuotas] = useState(false)

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

  // Fetch quotas when expanded
  useEffect(() => {
    if (isExpanded && !quotas) {
      fetchQuotas()
    }
  }, [isExpanded, quotas])

  const fetchQuotas = async () => {
    try {
      setLoadingQuotas(true)
      const response = await fetch('/api/models/available')
      if (response.ok) {
        const data = await response.json()
        setQuotas(data.subscription.perspectives)

        // Build availability map from models
        const availabilityMap: Record<string, any> = {}
        data.models?.forEach((model: any) => {
          availabilityMap[model.model_id] = {
            status: model.availability.status,
            primary_source: model.availability.primary_source,
            perspectives_needed: model.availability.perspectives_needed,
            tier: model.tier
          }
        })
        setModelAvailability(availabilityMap)
      }
    } catch (error) {
      console.error('Failed to fetch quotas:', error)
    } finally {
      setLoadingQuotas(false)
    }
  }

  // Sort models based on API keys display_order, then by tier for admin keys
  const sortedModels = useMemo(() => {
    return [...allModels].sort((a, b) => {
      // Find API keys for each model
      const aApiKey = apiKeys.find(k => k.provider.toLowerCase() === a.provider.toLowerCase())
      const bApiKey = apiKeys.find(k => k.provider.toLowerCase() === b.provider.toLowerCase())

      // If both have API keys, sort by display_order
      if (aApiKey && bApiKey) {
        const aOrder = aApiKey.display_order ?? 999
        const bOrder = bApiKey.display_order ?? 999
        if (aOrder !== bOrder) return aOrder - bOrder
      }

      // If only one has API key, prioritize it
      if (aApiKey && !bApiKey) return -1
      if (!aApiKey && bApiKey) return 1

      // If neither has API keys, sort by tier (premium > normal > eco) then by name
      if (!aApiKey && !bApiKey) {
        const tierOrder = { premium: 1, normal: 2, eco: 3 }
        const aTierOrder = tierOrder[a.tier as keyof typeof tierOrder] || 4
        const bTierOrder = tierOrder[b.tier as keyof typeof tierOrder] || 4
        if (aTierOrder !== bTierOrder) return aTierOrder - bTierOrder
      }

      // Final fallback: sort by name
      return a.name.localeCompare(b.name)
    })
  }, [allModels, apiKeys])

  // Filter models by search query
  const filteredModels = sortedModels.filter(model =>
    model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    model.provider.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Group models by provider, maintaining sorted order
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

  const handleChatModelDragEnd = (result: DropResult) => {
    if (!result.destination) return

    const items = Array.from(selectedChatModels)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    setSelectedChatModels(items)
  }

  const handleMcpModelDragEnd = (result: DropResult) => {
    if (!result.destination) return

    const items = Array.from(selectedMcpModels)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    setSelectedMcpModels(items)
  }

  const savePreferences = async () => {
    try {
      setIsSaving(true)
      await updatePreferences({
        mcp_settings: {
          default_temperature: preferences?.mcp_settings?.default_temperature ?? 0.7,
          default_max_tokens: preferences?.mcp_settings?.default_max_tokens ?? 4000,
          auto_select_model: preferences?.mcp_settings?.auto_select_model ?? false,
          memory_settings: preferences?.mcp_settings?.memory_settings ?? {
            enable_conversation_memory: true,
            enable_project_memory: true,
            max_conversation_history: 10,
            auto_extract_patterns: true
          },
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

  const getProviderLogo = (provider: string, providerName: string, modelProviderLogo?: string) => {
    // Try to get logo from multiple sources
    const logoUrl = modelProviderLogo ||
                    providerLogoMap[provider.toLowerCase()] ||
                    providerLogoMap[providerName.toLowerCase()]

    if (logoUrl) {
      return (
        <img
          src={logoUrl}
          alt={providerName}
          className="w-6 h-6 rounded object-contain"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
            const fallback = document.createElement('div')
            fallback.className = 'w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600'
            fallback.textContent = providerName[0]?.toUpperCase() || '?'
            e.currentTarget.parentElement?.appendChild(fallback)
          }}
        />
      )
    }

    const providerIcon = PROVIDER_ICONS[provider.toLowerCase()] || PROVIDER_ICONS[providerName.toLowerCase()]
    if (providerIcon) {
      return (
        <div className="w-6 h-6 flex items-center justify-center text-lg">
          {providerIcon}
        </div>
      )
    }

    // Fallback to first letter
    return (
      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600">
        {providerName[0]?.toUpperCase() || '?'}
      </div>
    )
  }

  const getAvailabilityIndicator = (modelId: string) => {
    const availability = modelAvailability[modelId]
    if (!availability) return null

    const { status, primary_source, perspectives_needed, tier } = availability

    // Status icon
    let statusIcon
    let statusColor = ''
    switch (status) {
      case 'available':
        statusIcon = <Check className="w-3 h-3" />
        statusColor = 'text-slate-900'
        break
      case 'fallback':
        statusIcon = <Zap className="w-3 h-3" />
        statusColor = 'text-slate-900'
        break
      case 'locked':
        statusIcon = <Lock className="w-3 h-3" />
        statusColor = 'text-slate-400'
        break
      case 'unavailable':
        statusIcon = <AlertCircle className="w-3 h-3" />
        statusColor = 'text-slate-900'
        break
    }

    // Source and cost badge - using explicit classes for Tailwind
    let sourceBadge
    if (primary_source === 'cli') {
      sourceBadge = <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-900">CLI • FREE</span>
    } else if (primary_source === 'api') {
      sourceBadge = <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-900">API • FREE</span>
    } else if (primary_source === 'admin') {
      // Use tier-based colors but show generic "PLAN" label instead of internal tier names
      const tierStyles = {
        premium: 'bg-slate-100 text-slate-900',
        normal: 'bg-slate-100 text-slate-900',
        eco: 'bg-slate-100 text-slate-900'
      }
      const tierStyle = tierStyles[tier as keyof typeof tierStyles] || 'bg-slate-100 text-slate-700'

      sourceBadge = <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs ${tierStyle}`}>
        {perspectives_needed} PLAN
      </span>
    } else if (status === 'locked') {
      sourceBadge = <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-700">Upgrade Required</span>
    } else if (status === 'unavailable') {
      sourceBadge = <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-900">Unavailable</span>
    }

    return (
      <div className="flex items-center gap-2">
        <span className={`flex items-center ${statusColor}`}>
          {statusIcon}
        </span>
        {sourceBadge}
      </div>
    )
  }

  const getModelDetails = (modelId: string) => {
    return allModels.find(m => m.id === modelId)
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-400" />
          )}
          <div className="text-left">
            <h3 className="text-lg font-semibold text-slate-900">Model Preferences</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              Select and reorder models for Chat and MCP Client (drag to reorder)
            </p>
          </div>
        </div>
        <div className="text-sm text-slate-500">
          {selectedChatModels.length} for Chat · {selectedMcpModels.length} for MCP
        </div>
      </button>

      {isExpanded && (
        <div className="px-6 pb-6 border-t border-slate-100">
          <div className="mt-4 space-y-4">
            {/* Quota Display */}
            {loadingQuotas ? (
              <div className="text-center py-2 text-slate-500">Loading quotas...</div>
            ) : quotas && (
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg">
                <div>
                  <div className="text-xs font-medium text-slate-600 mb-1">Premium</div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-slate-900">
                      {quotas.premium.remaining}/{quotas.premium.total}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1">
                    <div
                      className="bg-slate-100 h-1.5 rounded-full transition-all"
                      style={{ width: `${(quotas.premium.remaining / quotas.premium.total) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-600 mb-1">Normal</div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-slate-900">
                      {quotas.normal.remaining}/{quotas.normal.total}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1">
                    <div
                      className="bg-slate-100 h-1.5 rounded-full transition-all"
                      style={{ width: `${(quotas.normal.remaining / quotas.normal.total) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-600 mb-1">Eco</div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-slate-900">
                      {quotas.eco.remaining}/{quotas.eco.total}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1">
                    <div
                      className="bg-slate-100 h-1.5 rounded-full transition-all"
                      style={{ width: `${(quotas.eco.remaining / quotas.eco.total) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Selected Chat Models - Draggable */}
            {selectedChatModels.length > 0 && (
              <div className="p-4 bg-slate-100 rounded-lg border border-slate-200">
                <h4 className="font-semibold text-slate-900 mb-3">Selected for Chat ({selectedChatModels.length}) - Drag to Reorder</h4>
                <DragDropContext onDragEnd={handleChatModelDragEnd}>
                  <Droppable droppableId="chat-models">
                    {(provided, snapshot) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`space-y-2 ${snapshot.isDraggingOver ? 'bg-slate-100 rounded-lg p-2' : ''}`}
                      >
                        {selectedChatModels.map((modelId, index) => {
                          const model = getModelDetails(modelId)
                          if (!model) return null

                          return (
                            <Draggable key={modelId} draggableId={modelId} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`flex items-center gap-3 p-3 bg-white border rounded-lg ${
                                    snapshot.isDragging ? 'shadow-lg ring-2 ring-slate-900' : 'border-slate-200'
                                  } transition-all cursor-move`}
                                >
                                  <GripVertical className="w-4 h-4 text-slate-400" />
                                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-xs font-semibold text-slate-900">
                                    {index + 1}
                                  </div>
                                  {model.providerWebsite ? (
                                    <a href={model.providerWebsite} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity" title={`Visit ${model.providerName} website`}>
                                      {getProviderLogo(model.provider, model.providerName, model.providerLogo)}
                                    </a>
                                  ) : (
                                    getProviderLogo(model.provider, model.providerName, model.providerLogo)
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm text-slate-900 truncate">{model.name}</div>
                                    {model.providerWebsite ? (
                                      <a href={model.providerWebsite} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-900 hover:text-slate-900 hover:underline">
                                        {model.providerName}
                                      </a>
                                    ) : (
                                      <div className="text-xs text-slate-500">{model.providerName}</div>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => toggleModelForChat(modelId)}
                                    className="p-1 text-slate-900 hover:text-slate-900"
                                    title="Remove from chat"
                                  >
                                    ✕
                                  </button>
                                </div>
                              )}
                            </Draggable>
                          )
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>
            )}

            {/* Selected MCP Models - Draggable */}
            {selectedMcpModels.length > 0 && (
              <div className="p-4 bg-slate-100 rounded-lg border border-slate-200">
                <h4 className="font-semibold text-slate-900 mb-3">Selected for MCP ({selectedMcpModels.length}) - Drag to Reorder</h4>
                <DragDropContext onDragEnd={handleMcpModelDragEnd}>
                  <Droppable droppableId="mcp-models">
                    {(provided, snapshot) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`space-y-2 ${snapshot.isDraggingOver ? 'bg-slate-100 rounded-lg p-2' : ''}`}
                      >
                        {selectedMcpModels.map((modelId, index) => {
                          const model = getModelDetails(modelId)
                          if (!model) return null

                          return (
                            <Draggable key={modelId} draggableId={modelId} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`flex items-center gap-3 p-3 bg-white border rounded-lg ${
                                    snapshot.isDragging ? 'shadow-lg ring-2 ring-slate-900' : 'border-slate-200'
                                  } transition-all cursor-move`}
                                >
                                  <GripVertical className="w-4 h-4 text-slate-400" />
                                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-xs font-semibold text-slate-900">
                                    {index + 1}
                                  </div>
                                  {model.providerWebsite ? (
                                    <a href={model.providerWebsite} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity" title={`Visit ${model.providerName} website`}>
                                      {getProviderLogo(model.provider, model.providerName, model.providerLogo)}
                                    </a>
                                  ) : (
                                    getProviderLogo(model.provider, model.providerName, model.providerLogo)
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm text-slate-900 truncate">{model.name}</div>
                                    {model.providerWebsite ? (
                                      <a href={model.providerWebsite} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-900 hover:text-slate-900 hover:underline">
                                        {model.providerName}
                                      </a>
                                    ) : (
                                      <div className="text-xs text-slate-500">{model.providerName}</div>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => toggleModelForMcp(modelId)}
                                    className="p-1 text-slate-900 hover:text-slate-900"
                                    title="Remove from MCP"
                                  >
                                    ✕
                                  </button>
                                </div>
                              )}
                            </Draggable>
                          )
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>
            )}

            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search models or providers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              />
            </div>

            {/* Max models settings */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Max Chat Models
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={maxChatModels}
                  onChange={(e) => setMaxChatModels(parseInt(e.target.value) || 10)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Max MCP Models
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={maxMcpModels}
                  onChange={(e) => setMaxMcpModels(parseInt(e.target.value) || 5)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
              </div>
            </div>

            {/* Models by provider */}
            {modelsLoading ? (
              <div className="text-center py-8 text-slate-500">Loading models...</div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {Object.entries(modelsByProvider).map(([provider, models]) => {
                  const firstModel = models[0]
                  return (
                    <div key={provider} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        {firstModel.providerWebsite ? (
                          <a href={firstModel.providerWebsite} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity" title={`Visit ${firstModel.providerName} website`}>
                            {getProviderLogo(firstModel.provider, firstModel.providerName, firstModel.providerLogo)}
                          </a>
                        ) : (
                          getProviderLogo(firstModel.provider, firstModel.providerName, firstModel.providerLogo)
                        )}
                        {firstModel.providerWebsite ? (
                          <a href={firstModel.providerWebsite} target="_blank" rel="noopener noreferrer" className="font-semibold text-slate-900 hover:text-slate-900 hover:underline">
                            {firstModel.providerName}
                          </a>
                        ) : (
                          <h4 className="font-semibold text-slate-900">{firstModel.providerName}</h4>
                        )}
                        <span className="text-sm text-slate-500">({models.length} models)</span>
                      </div>

                      <div className="space-y-2">
                        {models.map(model => (
                          <div key={model.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded">
                            <div className="flex-1">
                              <div className="font-medium text-sm text-slate-900">{model.name}</div>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {getAvailabilityIndicator(model.id)}
                                {model.price && (
                                  <div className="text-xs text-slate-500">
                                    ${model.price.input.toFixed(2)}/M in ${model.price.output.toFixed(2)}/M out
                                  </div>
                                )}
                                {model.features?.supportsImages && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-900">
                                    Vision
                                  </span>
                                )}
                                {model.features?.supportsReasoning && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-900">
                                    Reasoning
                                  </span>
                                )}
                                {model.tier === 'api' && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-900">
                                    API
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => toggleModelForChat(model.id)}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                  selectedChatModels.includes(model.id)
                                    ? 'bg-slate-100 text-slate-900 hover:bg-slate-100'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                {selectedChatModels.includes(model.id) && <Check className="w-3 h-3 inline mr-1" />}
                                Chat
                              </button>

                              <button
                                onClick={() => toggleModelForMcp(model.id)}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                  selectedMcpModels.includes(model.id)
                                    ? 'bg-slate-100 text-slate-900 hover:bg-slate-100'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
                  )
                })}

                {Object.keys(modelsByProvider).length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    {searchQuery ? 'No models found matching your search' : 'No models available'}
                  </div>
                )}
              </div>
            )}

            {/* Save button */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={savePreferences}
                disabled={isSaving}
                className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-700 disabled:bg-slate-300 transition-colors flex items-center gap-2"
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
