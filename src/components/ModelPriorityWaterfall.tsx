'use client'

import { useState, useCallback, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronRight, Terminal, Key, Coins, Info, Sparkles, Check, Zap, AlertCircle, Crown, Edit3, Plus, Trash2 } from 'lucide-react'
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
  viewMode?: 'simple' | 'advanced'
}

// Provider to CLI mapping
const PROVIDER_CLI_MAP: Record<string, { cliId: string; cliName: string; model: string }> = {
  'anthropic': { cliId: 'claude_code', cliName: 'Claude Code', model: 'claude-sonnet-4' },
  'openai': { cliId: 'codex_cli', cliName: 'Codex CLI', model: 'gpt-4.1' },
  'google': { cliId: 'gemini_cli', cliName: 'Gemini CLI', model: 'gemini-2.5-flash' }
}

export default function ModelPriorityWaterfall({ apiKeys, quota, modelTiers, cliStatuses, modelsDevProviders, onRefresh, onEditKey, onAddKey, onDeleteKey, viewMode = 'simple' }: Props) {
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

  // Get provider logo
  const getProviderLogo = (providerId: string) => {
    const pid = providerId.toLowerCase().replace(/[-_\s]/g, '')
    const provider = modelsDevProviders.find(p => {
      const pId = p.id.toLowerCase().replace(/[-_\s]/g, '')
      const pName = p.name.toLowerCase().replace(/[-_\s]/g, '')
      return pId === pid || pName === pid || pId.includes(pid) || pid.includes(pId)
    })
    return provider?.logo || provider?.logo_url
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
      {/* Perspectives Selector - Hero Section */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Perspectives per Request</h2>
              <p className="text-sm text-slate-400">How many AI models respond to each query</p>
            </div>
            {/* Tooltip */}
            <div className="group relative">
              <Info className="w-4 h-4 text-slate-500 cursor-help" />
              <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-slate-800 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 text-xs">
                <p className="font-medium mb-1">💡 What are perspectives?</p>
                <p className="text-slate-300">Each perspective is a response from a different AI model. More perspectives = more diverse opinions, but uses more credits (1 credit per model).</p>
                <p className="text-slate-400 mt-2">Recommended: 2-3 perspectives for balanced cost and diversity.</p>
              </div>
            </div>
          </div>
          <div className="text-4xl font-bold tabular-nums bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            {perspectivesPerMessage}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400 font-medium">1</span>
          <input
            type="range"
            min="1"
            max="10"
            value={perspectivesPerMessage}
            onChange={(e) => debouncedUpdatePerspectives(parseInt(e.target.value))}
            className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-white"
            disabled={saving}
          />
          <span className="text-sm text-slate-400 font-medium">10</span>
        </div>

        {/* Selected Models Preview */}
        <div className="mt-4 pt-4 border-t border-slate-700/50">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-slate-300">Will query these {perspectivesPerMessage} model{perspectivesPerMessage > 1 ? 's' : ''}:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectionPreview.map((item, idx) => (
              <div 
                key={idx} 
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
                  item.source === 'cli' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                  item.source === 'api' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                  'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                }`}
              >
                {getProviderLogo(item.provider) && <img src={getProviderLogo(item.provider)} alt="" className="w-4 h-4 rounded" />}
                <span>{getProviderDisplayName(item.provider)}</span>
                <span className="text-[10px] opacity-60">
                  {item.source === 'cli' ? 'CLI' : item.source === 'api' ? 'API' : item.tier}
                </span>
              </div>
            ))}
            {selectionPreview.length === 0 && (
              <span className="text-slate-500 text-sm">No models configured</span>
            )}
          </div>
          {/* Source Legend */}
          <div className="flex flex-wrap gap-4 mt-3 text-[10px] text-slate-500">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>CLI = Uses your installed CLI tool (free)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              <span>API = Direct API with your key (you pay provider)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              <span>Credits = Polydev credits (1 credit per request)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Your API Keys - Priority Order */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Key className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">Your API Keys</h3>
              <p className="text-xs text-slate-500">Reorder to set priority. CLI auto-selected when available.</p>
            </div>
            {onAddKey && (
              <button
                onClick={onAddKey}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            )}
          </div>
        </div>

        <div className="p-4 space-y-2">
          {sortedApiKeys.length > 0 ? (
            sortedApiKeys.map((key, idx) => {
              const cli = getCliStatus(key.provider)
              const hasCli = !!cli
              const cliAvailable = cli?.available
              const isSelected = idx < perspectivesPerMessage
              
              return (
                <div 
                  key={key.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                    isSelected 
                      ? cliAvailable 
                        ? 'bg-emerald-50 border-emerald-200' 
                        : 'bg-blue-50 border-blue-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  {/* Position number */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
                    isSelected ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {idx + 1}
                  </div>

                  {/* Provider logo */}
                  {getProviderLogo(key.provider) && (
                    <img src={getProviderLogo(key.provider)} alt="" className="w-8 h-8 rounded-lg" />
                  )}

                  {/* Provider info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{getProviderDisplayName(key.provider)}</span>
                      {isSelected && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          cliAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          WILL USE
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">{key.key_preview}</div>
                  </div>

                  {/* CLI Status */}
                  {hasCli && (
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                      cliAvailable 
                        ? 'bg-emerald-100 border border-emerald-200' 
                        : 'bg-slate-100 border border-slate-200'
                    }`}>
                      <Terminal className={`w-4 h-4 ${cliAvailable ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <span className={`text-xs font-medium ${cliAvailable ? 'text-emerald-700' : 'text-slate-500'}`}>
                        {cli.cliName}
                      </span>
                      {cliAvailable ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                  )}

                  {/* Edit/Delete buttons */}
                  <div className="flex gap-1">
                    {onEditKey && (
                      <button
                        onClick={() => onEditKey(key)}
                        className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors"
                        title="Edit API key"
                      >
                        <Edit3 className="w-4 h-4 text-slate-500" />
                      </button>
                    )}
                    {onDeleteKey && (
                      <button
                        onClick={() => onDeleteKey(key.id)}
                        className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                        title="Delete API key"
                      >
                        <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-500" />
                      </button>
                    )}
                  </div>

                  {/* Reorder buttons */}
                  <div className="flex gap-1">
                    <button
                      onClick={() => moveApiKey(idx, 'up')}
                      disabled={idx === 0 || saving}
                      className="p-1.5 hover:bg-slate-200 rounded-lg disabled:opacity-30 transition-colors"
                      title="Move up"
                    >
                      <ChevronUp className="w-4 h-4 text-slate-600" />
                    </button>
                    <button
                      onClick={() => moveApiKey(idx, 'down')}
                      disabled={idx === sortedApiKeys.length - 1 || saving}
                      className="p-1.5 hover:bg-slate-200 rounded-lg disabled:opacity-30 transition-colors"
                      title="Move down"
                    >
                      <ChevronDown className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="font-semibold text-slate-900 mb-2">Get Started with Polydev</h4>
                <p className="text-sm text-slate-600 mb-4">Add your first API key to start getting AI perspectives, or use Polydev Credits without any API keys.</p>
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  {onAddKey && (
                    <button
                      onClick={onAddKey}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add API Key
                    </button>
                  )}
                  <a
                    href="/dashboard/api-tokens"
                    className="px-4 py-2 bg-white text-slate-700 rounded-lg hover:bg-slate-100 font-medium text-sm border border-slate-200 flex items-center justify-center gap-2"
                  >
                    <Coins className="w-4 h-4" />
                    Use Credits Instead
                  </a>
                </div>
                
                <div className="mt-4 pt-4 border-t border-blue-100">
                  <p className="text-xs text-slate-500">💡 Tip: CLI tools (Claude Code, Codex CLI, Gemini CLI) are auto-detected and prioritized when available.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Credits Section - Collapsible */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setCreditsExpanded(!creditsExpanded)}
          className="w-full p-4 flex items-center gap-3 text-left hover:bg-slate-50 transition-colors"
        >
          <div className="p-2 bg-purple-50 rounded-lg">
            <Crown className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900">Credits Tier Priority</h3>
            <p className="text-xs text-slate-500">Perspective quota usage order</p>
          </div>
          <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${creditsExpanded ? 'rotate-90' : ''}`} />
        </button>

        {creditsExpanded && (
          <div className="p-4 pt-0 border-t border-slate-100">
            <div className="space-y-3 mt-3">
              {visibleTiers.map((tier: string, tierIdx: number) => {
                const { total, used } = getTierQuota(tier)
                const remaining = total - used
                const percentage = total > 0 ? (used / total) * 100 : 0
                const tierProviders = getProvidersForTier(tier)
                const sortedModels = getSortedModelsForTier(tier)
                
                return (
                  <div key={tier} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    {/* Tier Header */}
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-base font-semibold text-slate-900">Credits</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                percentage >= 90 ? 'bg-red-400' : percentage >= 70 ? 'bg-amber-400' : 'bg-emerald-400'
                              }`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-slate-600 tabular-nums">
                            {remaining} / {total}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Tier Providers */}
                    {tierProviders.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        {tierProviders.map(provider => {
                          const logo = getProviderLogo(provider)
                          return (
                            <div key={provider} className="flex items-center gap-1.5 bg-white px-2 py-1 rounded border border-slate-200">
                              {logo ? (
                                <img src={logo} alt={provider} className="w-4 h-4 object-contain" />
                              ) : (
                                <div className="w-4 h-4 bg-slate-200 rounded flex items-center justify-center text-[8px] font-bold text-slate-600">
                                  {provider.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <span className="text-xs text-slate-700 font-medium">{getProviderDisplayName(provider)}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Models (drag to reorder) */}
                    {sortedModels.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-slate-500 mb-2">Models (drag to reorder):</div>
                        {sortedModels.map((model, modelIdx) => {
                          const logo = getProviderLogo(model.provider)
                          return (
                            <div key={model.id} className="flex items-center gap-2 bg-white px-3 py-2 rounded border border-slate-200 hover:border-slate-300 transition-colors group">
                              <span className="text-xs font-bold text-slate-400 w-5 text-center">{modelIdx + 1}</span>
                              {logo ? (
                                <img src={logo} alt={model.provider} className="w-4 h-4 object-contain" />
                              ) : (
                                <div className="w-4 h-4 bg-slate-200 rounded flex items-center justify-center text-[7px] font-bold text-slate-500">
                                  {model.provider.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <span className="text-sm text-slate-700 flex-1">{model.display_name}</span>
                              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => moveModelInTier(tier, model.id, 'up')}
                                  disabled={modelIdx === 0 || saving}
                                  className="p-1 hover:bg-slate-100 rounded disabled:opacity-30 transition-colors"
                                  title="Move up"
                                >
                                  <ChevronUp className="w-3 h-3 text-slate-500" />
                                </button>
                                <button
                                  onClick={() => moveModelInTier(tier, model.id, 'down')}
                                  disabled={modelIdx === sortedModels.length - 1 || saving}
                                  className="p-1 hover:bg-slate-100 rounded disabled:opacity-30 transition-colors"
                                  title="Move down"
                                >
                                  <ChevronDown className="w-3 h-3 text-slate-500" />
                                </button>
                              </div>
                            </div>
                          )
                        })}
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
        <div className="flex items-center justify-center gap-2 py-2 text-sm text-slate-500">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-300 border-t-slate-600" />
          <span>Saving...</span>
        </div>
      )}
    </div>
  )
}
