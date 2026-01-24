'use client'

import { useState, useCallback, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronRight, Key, Coins, Zap, Edit3, Plus, Trash2 } from 'lucide-react'
import { usePreferences } from '../hooks/usePreferences'
import { useDebouncedCallback } from 'use-debounce'

interface ApiKey {
  id: string
  provider: string
  key_preview: string
  encrypted_key: string | null
  active: boolean
  api_base?: string
  default_model?: string
  is_preferred?: boolean
  is_primary?: boolean
  monthly_budget?: number
  display_order?: number
  created_at: string
  last_used_at?: string
}

interface PerspectiveQuota {
  user_id: string
  messages_per_month: number
  messages_used: number
  premium_perspectives_limit: number
  premium_perspectives_used: number
  normal_perspectives_limit: number
  normal_perspectives_used: number
  eco_perspectives_limit: number
  eco_perspectives_used: number
  last_reset_date: string
}

interface ModelTier {
  id: string
  provider: string
  model_name: string
  display_name: string
  tier: string
  active: boolean
  display_order?: number
}

interface CLIStatus {
  provider: string
  status: 'available' | 'unavailable' | 'not_installed' | 'unchecked' | 'checking'
  enabled?: boolean
}

interface ModelsDevProvider {
  id: string
  name: string
  display_name?: string
  logo?: string
  logo_url?: string
}

interface Props {
  apiKeys: ApiKey[]
  quota: PerspectiveQuota | null
  modelTiers: ModelTier[]
  cliStatuses: CLIStatus[]
  modelsDevProviders: ModelsDevProvider[]
  onRefresh: () => Promise<void>
  onEditKey?: (key: ApiKey) => void
  onAddKey?: () => void
  onDeleteKey?: (keyId: string) => void
}

// Provider to CLI mapping
const PROVIDER_CLI_MAP: Record<string, { cliId: string; cliName: string; model: string }> = {
  'anthropic': { cliId: 'claude_code', cliName: 'Claude Code', model: 'claude-sonnet-4' },
  'openai': { cliId: 'codex_cli', cliName: 'Codex CLI', model: 'gpt-4.1' },
  'google': { cliId: 'gemini_cli', cliName: 'Gemini CLI', model: 'gemini-2.5-flash' }
}

export default function ModelPriorityWaterfall({ apiKeys, quota, modelTiers, cliStatuses, modelsDevProviders, onRefresh, onEditKey, onAddKey, onDeleteKey }: Props) {
  const { preferences, updatePreferences } = usePreferences()
  const [saving, setSaving] = useState(false)
  const [creditsExpanded, setCreditsExpanded] = useState(false)

  const perspectivesPerMessage = (preferences?.mcp_settings as any)?.perspectives_per_message || 2
  const tierPriority = (preferences?.mcp_settings as any)?.tier_priority || ['normal', 'eco', 'premium']
  const modelOrder = (preferences?.mcp_settings as any)?.model_order || {} as { [tier: string]: string[] }

  // Filter to only show eco tier (single-tier system)
  const visibleTiers = tierPriority.filter((tier: string) => tier === 'eco')

  // Debounced perspective slider update
  const debouncedUpdatePerspectives = useDebouncedCallback(async (value: number) => {
    try {
      setSaving(true)
      await updatePreferences({
        mcp_settings: {
          ...(preferences?.mcp_settings as any),
          perspectives_per_message: value
        }
      })
    } finally {
      setSaving(false)
    }
  }, 500)

  // Get API keys sorted by display_order
  const sortedApiKeys = useMemo(() => {
    return [...apiKeys]
      .filter(key => key.active)
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
  }, [apiKeys])

  // Check if CLI is available for a provider
  const getCliStatus = (providerId: string) => {
    const cliMapping = PROVIDER_CLI_MAP[providerId]
    if (!cliMapping) return null
    
    const cliStatus = (cliStatuses || []).find(cli => cli.provider === cliMapping.cliId)
    return {
      ...cliMapping,
      available: cliStatus?.status === 'available' && cliStatus?.enabled !== false,
      status: cliStatus?.status || 'unchecked'
    }
  }

  // API key reordering
  const moveApiKey = useCallback(async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === sortedApiKeys.length - 1) return

    const newIndex = direction === 'up' ? index - 1 : index + 1
    const reordered = [...sortedApiKeys]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(newIndex, 0, moved)

    const apiKeyIds = reordered.map(key => key.id)

    try {
      setSaving(true)
      const response = await fetch('/api/api-keys/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKeyIds })
      })

      if (!response.ok) throw new Error('Failed to reorder')
      await onRefresh()
    } finally {
      setSaving(false)
    }
  }, [sortedApiKeys, onRefresh])

  // Tier reordering
  const moveTier = useCallback(async (tier: string, direction: 'up' | 'down') => {
    const index = tierPriority.indexOf(tier)
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === tierPriority.length - 1) return

    const newIndex = direction === 'up' ? index - 1 : index + 1
    const reordered = [...tierPriority]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(newIndex, 0, moved)

    try {
      setSaving(true)
      await updatePreferences({
        mcp_settings: {
          ...(preferences?.mcp_settings as any),
          tier_priority: reordered
        }
      })
    } finally {
      setSaving(false)
    }
  }, [tierPriority, preferences, updatePreferences])

  // Helper to get sorted models for a tier
  const getSortedModelsForTier = useCallback((tier: string): ModelTier[] => {
    const tierModels = (modelTiers || []).filter(m => m.tier === tier && m.active)
    const userOrder = modelOrder[tier] || []

    return [...tierModels].sort((a, b) => {
      const aUserIdx = userOrder.indexOf(a.id)
      const bUserIdx = userOrder.indexOf(b.id)

      if (aUserIdx !== -1 && bUserIdx !== -1) return aUserIdx - bUserIdx
      if (aUserIdx !== -1) return -1
      if (bUserIdx !== -1) return 1
      return (a.display_order || 0) - (b.display_order || 0)
    })
  }, [modelTiers, modelOrder])

  // Model reordering within a tier
  const moveModelInTier = useCallback(async (tier: string, modelId: string, direction: 'up' | 'down') => {
    const tierModels = getSortedModelsForTier(tier)
    const currentIndex = tierModels.findIndex(m => m.id === modelId)

    if (direction === 'up' && currentIndex === 0) return
    if (direction === 'down' && currentIndex === tierModels.length - 1) return

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    const reordered = [...tierModels]
    const [moved] = reordered.splice(currentIndex, 1)
    reordered.splice(newIndex, 0, moved)

    const newModelOrder = {
      ...modelOrder,
      [tier]: reordered.map(m => m.id)
    }

    try {
      setSaving(true)
      await updatePreferences({
        mcp_settings: {
          ...(preferences?.mcp_settings as any),
          model_order: newModelOrder
        }
      })
    } finally {
      setSaving(false)
    }
  }, [getSortedModelsForTier, modelOrder, preferences, updatePreferences])

  // Hardcoded logo URLs for providers not in the external registry
  const PROVIDER_LOGO_FALLBACKS: Record<string, string> = {
    'zai': 'https://z-cdn.chatglm.cn/z-ai/static/logo.svg',
    'zhipuai': 'https://z-cdn.chatglm.cn/z-ai/static/logo.svg',
    'zai-coding-plan': 'https://z-cdn.chatglm.cn/z-ai/static/logo.svg',
    'z-ai': 'https://z-cdn.chatglm.cn/z-ai/static/logo.svg',
  }

  // Get provider logo
  const getProviderLogo = (providerId: string) => {
    const pid = providerId.toLowerCase().replace(/[-_\s]/g, '')
    const provider = modelsDevProviders.find(p => {
      const pId = p.id.toLowerCase().replace(/[-_\s]/g, '')
      const pName = p.name.toLowerCase().replace(/[-_\s]/g, '')
      return pId === pid || pName === pid || pId.includes(pid) || pid.includes(pId)
    })
    // Check external registry first, then hardcoded fallbacks
    return provider?.logo || provider?.logo_url || PROVIDER_LOGO_FALLBACKS[providerId.toLowerCase()]
  }

  // Get provider display name
  const getProviderDisplayName = (providerId: string) => {
    const displayNames: Record<string, string> = {
      'openai': 'OpenAI',
      'anthropic': 'Anthropic',
      'google': 'Google',
      'x-ai': 'xAI',
      'groq': 'Groq',
      'cerebras': 'Cerebras',
      'together': 'Together',
      'openrouter': 'OpenRouter',
      'zai-coding-plan': 'ZAI'
    }
    return displayNames[providerId] || providerId
  }

  // Get unique providers for a tier
  const getProvidersForTier = (tier: string) => {
    return [...new Set((modelTiers || [])
      .filter(m => m.tier === tier && m.active)
      .map(m => m.provider))]
  }

  const getTierQuota = (tier: string) => {
    if (!quota) return { total: 0, used: 0 }
    switch (tier) {
      case 'premium': return { total: quota.premium_perspectives_limit, used: quota.premium_perspectives_used }
      case 'normal': return { total: quota.normal_perspectives_limit, used: quota.normal_perspectives_used }
      case 'eco': return { total: quota.eco_perspectives_limit, used: quota.eco_perspectives_used }
      default: return { total: 0, used: 0 }
    }
  }

  // Build selection preview based on perspectives count
  const selectionPreview = useMemo(() => {
    const selected: Array<{ provider: string; source: 'cli' | 'api' | 'credits'; name: string; tier?: string }> = []
    let remaining = perspectivesPerMessage

    // First: CLI/API from user's API keys (CLI preferred if available)
    for (const key of sortedApiKeys) {
      if (remaining <= 0) break
      const cli = getCliStatus(key.provider)
      if (cli?.available) {
        selected.push({ provider: key.provider, source: 'cli', name: cli.cliName })
      } else {
        selected.push({ provider: key.provider, source: 'api', name: `${getProviderDisplayName(key.provider)} API` })
      }
      remaining--
    }

    // Then: Credits by tier priority
    for (const tier of tierPriority) {
      if (remaining <= 0) break
      const tierModels = getSortedModelsForTier(tier)
      for (const model of tierModels) {
        if (remaining <= 0) break
        // Skip if already covered
        if (selected.some(s => s.provider === model.provider)) continue
        selected.push({ provider: model.provider, source: 'credits', name: model.display_name, tier })
        remaining--
      }
    }

    return selected
  }, [perspectivesPerMessage, sortedApiKeys, tierPriority, modelTiers, cliStatuses])

  return (
    <div className="space-y-4">
      {/* Perspectives Selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="font-medium text-slate-900">Perspectives</span>
            <span className="text-slate-500 text-sm">per request</span>
          </div>
          <div className="text-3xl font-bold text-slate-900 tabular-nums">{perspectivesPerMessage}</div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm text-slate-400 w-3">1</span>
          <input
            type="range"
            min="1"
            max="10"
            value={perspectivesPerMessage}
            onChange={(e) => debouncedUpdatePerspectives(parseInt(e.target.value))}
            className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
            disabled={saving}
          />
          <span className="text-sm text-slate-400 w-4">10</span>
        </div>

        {/* Cost + Models Preview */}
        {(() => {
          const creditsUsed = selectionPreview.filter(s => s.source === 'credits').length
          const freeCount = selectionPreview.filter(s => s.source === 'cli' || s.source === 'api').length
          return (
            <div className="flex items-center justify-between text-sm border-t border-slate-100 pt-4">
              <div className="flex items-center gap-2 text-slate-600">
                <Coins className="w-4 h-4 text-amber-500" />
                <span>{creditsUsed} credit{creditsUsed !== 1 ? 's' : ''}/req</span>
                {freeCount > 0 && <span className="text-slate-400">({freeCount} free)</span>}
              </div>
              <div className="flex items-center gap-1.5">
                {selectionPreview.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 text-sm">
                    {getProviderLogo(item.provider) && <img src={getProviderLogo(item.provider)} alt="" className="w-4 h-4 rounded" />}
                    <span className="text-slate-700">{getProviderDisplayName(item.provider)}</span>
                  </div>
                ))}
                {selectionPreview.length > 5 && (
                  <span className="text-slate-500 text-sm">+{selectionPreview.length - 5}</span>
                )}
              </div>
            </div>
          )
        })()}
      </div>

      {/* Your API Keys */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-slate-500" />
            <span className="font-medium text-slate-900">API Keys</span>
            <span className="text-sm text-slate-400">({sortedApiKeys.length})</span>
          </div>
          {onAddKey && (
            <button
              onClick={onAddKey}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-700"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          )}
        </div>

        <div className="p-3 space-y-1">
          {sortedApiKeys.length > 0 ? (
            sortedApiKeys.map((key, idx) => {
              const cli = getCliStatus(key.provider)
              const cliAvailable = cli?.available
              const isSelected = idx < perspectivesPerMessage

              return (
                <div
                  key={key.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    isSelected ? 'bg-slate-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                    isSelected ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {idx + 1}
                  </div>

                  {getProviderLogo(key.provider) && (
                    <img src={getProviderLogo(key.provider)} alt="" className="w-6 h-6 rounded" />
                  )}

                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-slate-900">{getProviderDisplayName(key.provider)}</span>
                    {cliAvailable && <span className="ml-2 text-xs text-slate-400 uppercase tracking-wide">CLI</span>}
                  </div>

                  <div className="flex items-center gap-0.5">
                    {onEditKey && (
                      <button onClick={() => onEditKey(key)} className="p-1.5 hover:bg-slate-200 rounded" title="Edit">
                        <Edit3 className="w-4 h-4 text-slate-400" />
                      </button>
                    )}
                    {onDeleteKey && (
                      <button onClick={() => onDeleteKey(key.id)} className="p-1.5 hover:bg-red-50 rounded" title="Delete">
                        <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-500" />
                      </button>
                    )}
                    <button
                      onClick={() => moveApiKey(idx, 'up')}
                      disabled={idx === 0 || saving}
                      className="p-1.5 hover:bg-slate-200 rounded disabled:opacity-30"
                    >
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    </button>
                    <button
                      onClick={() => moveApiKey(idx, 'down')}
                      disabled={idx === sortedApiKeys.length - 1 || saving}
                      className="p-1.5 hover:bg-slate-200 rounded disabled:opacity-30"
                    >
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="p-6 text-center text-slate-500">
              <p>No API keys yet.</p>
              {onAddKey && (
                <button onClick={onAddKey} className="mt-2 text-slate-900 font-medium hover:underline">
                  + Add your first API key
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Credits Section */}
      <div className="bg-white rounded-xl border border-slate-200">
        <button
          onClick={() => setCreditsExpanded(!creditsExpanded)}
          className="w-full px-5 py-4 flex items-center gap-2 text-left hover:bg-slate-50 rounded-xl"
        >
          <Coins className="w-4 h-4 text-slate-500" />
          <span className="font-medium text-slate-900 flex-1">Credits</span>
          {(() => {
            const { total, used } = getTierQuota('eco')
            return <span className="text-sm text-slate-500">{total - used} / {total}</span>
          })()}
          <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${creditsExpanded ? 'rotate-90' : ''}`} />
        </button>

        {creditsExpanded && (
          <div className="px-5 pb-4 border-t border-slate-100">
            <div className="mt-4 space-y-3">
              {visibleTiers.map((tier: string) => {
                const { total, used } = getTierQuota(tier)
                const percentage = total > 0 ? (used / total) * 100 : 0
                const sortedModels = getSortedModelsForTier(tier)

                return (
                  <div key={tier}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full ${percentage >= 90 ? 'bg-red-400' : percentage >= 70 ? 'bg-amber-400' : 'bg-slate-400'}`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                    {sortedModels.length > 0 && (
                      <div className="space-y-1">
                        {sortedModels.slice(0, 5).map((model, idx) => (
                          <div key={model.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 group">
                            <span className="text-slate-400 w-4 text-sm">{idx + 1}</span>
                            {getProviderLogo(model.provider) && (
                              <img src={getProviderLogo(model.provider)} alt="" className="w-5 h-5 rounded" />
                            )}
                            <span className="text-slate-700 flex-1 truncate">{model.display_name}</span>
                            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
                              <button onClick={() => moveModelInTier(tier, model.id, 'up')} disabled={idx === 0} className="p-1 hover:bg-slate-200 rounded disabled:opacity-30">
                                <ChevronUp className="w-4 h-4 text-slate-400" />
                              </button>
                              <button onClick={() => moveModelInTier(tier, model.id, 'down')} disabled={idx === sortedModels.length - 1} className="p-1 hover:bg-slate-200 rounded disabled:opacity-30">
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              </button>
                            </div>
                          </div>
                        ))}
                        {sortedModels.length > 5 && (
                          <div className="text-sm text-slate-400 px-3 py-1">+{sortedModels.length - 5} more</div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {saving && (
        <div className="flex items-center justify-center gap-2 py-3 text-sm text-slate-500">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-300 border-t-slate-600" />
          <span>Saving...</span>
        </div>
      )}
    </div>
  )
}
