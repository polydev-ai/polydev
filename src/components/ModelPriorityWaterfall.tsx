'use client'

import { useState, useCallback } from 'react'
import { ChevronUp, ChevronDown, Terminal, Key, Crown, Info, Workflow, Settings } from 'lucide-react'
import { usePreferences } from '../hooks/usePreferences'
import { useDebouncedCallback } from 'use-debounce'

interface ApiKey {
  id: string
  provider: string
  key_preview: string
  display_order?: number
  active: boolean
  default_model?: string
  api_base?: string
  encrypted_key?: string | null
  is_preferred?: boolean
  is_primary?: boolean
  monthly_budget?: number
  created_at?: string
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
  display_name: string
  tier: string
  active: boolean
}

interface CLIStatus {
  provider: string
  status: 'available' | 'unavailable' | 'not_installed' | 'unchecked' | 'checking'
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
}

export default function ModelPriorityWaterfall({ apiKeys, quota, modelTiers, cliStatuses, modelsDevProviders, onRefresh }: Props) {
  const { preferences, updatePreferences } = usePreferences()
  const [saving, setSaving] = useState(false)

  const perspectivesPerMessage = (preferences?.mcp_settings as any)?.perspectives_per_message || 2
  const tierPriority = (preferences?.mcp_settings as any)?.tier_priority || ['normal', 'eco', 'premium']
  const providerPriority = (preferences?.mcp_settings as any)?.provider_priority || []

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

  // API key reordering
  const moveApiKey = useCallback(async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === apiKeys.length - 1) return

    const newIndex = direction === 'up' ? index - 1 : index + 1
    const reordered = [...apiKeys]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(newIndex, 0, moved)

    // API expects just an array of IDs - order determines display_order
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
  }, [apiKeys, onRefresh])

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

  // Get unique providers from active tiers (these are ALL admin-provided models)
  const activeProviders = [...new Set((modelTiers || []).map(t => t.provider))]

  // Provider reordering (GLOBAL across all tiers)
  // Works with allProviders (all admin providers), not just providerPriority
  const moveProvider = useCallback(async (provider: string, direction: 'up' | 'down') => {
    // Build current full list: providers in priority order + new unsorted providers
    const currentSorted = providerPriority.filter((p: string) => activeProviders.includes(p))
    const currentUnsorted = activeProviders.filter(p => !providerPriority.includes(p))
    const currentAll = [...currentSorted, ...currentUnsorted]

    const index = currentAll.indexOf(provider)
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === currentAll.length - 1) return

    const newIndex = direction === 'up' ? index - 1 : index + 1
    const reordered = [...currentAll]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(newIndex, 0, moved)

    try {
      setSaving(true)
      await updatePreferences({
        mcp_settings: {
          ...(preferences?.mcp_settings as any),
          provider_priority: reordered  // Save complete new order
        }
      })
    } finally {
      setSaving(false)
    }
  }, [providerPriority, activeProviders, preferences, updatePreferences])

  const detectedCLI = (cliStatuses || []).filter(cli => cli.status === 'available')

  const getTierQuota = (tier: string) => {
    if (!quota) return { total: 0, used: 0 }
    switch (tier) {
      case 'premium':
        return { total: quota.premium_perspectives_limit, used: quota.premium_perspectives_used }
      case 'normal':
        return { total: quota.normal_perspectives_limit, used: quota.normal_perspectives_used }
      case 'eco':
        return { total: quota.eco_perspectives_limit, used: quota.eco_perspectives_used }
      default:
        return { total: 0, used: 0 }
    }
  }

  // Show ALL admin providers, sorted by providerPriority where available
  // Providers in providerPriority come first (in that order), then any new providers at the end
  const sortedProviders = providerPriority.filter((p: string) => activeProviders.includes(p))
  const unsortedProviders = activeProviders.filter(p => !providerPriority.includes(p))
  const allProviders = [...sortedProviders, ...unsortedProviders]

  // Helper to get provider logo - improved matching
  const getProviderLogo = (providerId: string) => {
    const pid = providerId.toLowerCase().replace(/[-_\s]/g, '')
    const provider = modelsDevProviders.find(p => {
      const pId = p.id.toLowerCase().replace(/[-_\s]/g, '')
      const pName = p.name.toLowerCase().replace(/[-_\s]/g, '')
      return pId === pid || pName === pid || pId.includes(pid) || pid.includes(pId)
    })
    return provider?.logo || provider?.logo_url
  }

  // Helper to get provider display name - improved matching
  const getProviderDisplayName = (providerId: string) => {
    const pid = providerId.toLowerCase().replace(/[-_\s]/g, '')
    const provider = modelsDevProviders.find(p => {
      const pId = p.id.toLowerCase().replace(/[-_\s]/g, '')
      const pName = p.name.toLowerCase().replace(/[-_\s]/g, '')
      return pId === pid || pName === pid || pId.includes(pid) || pid.includes(pId)
    })
    return provider?.display_name || provider?.name || providerId
  }

  // Helper to get models for a tier
  const getModelsForTier = (tier: string) => {
    return (modelTiers || [])
      .filter(m => m.tier === tier)
      .map(m => m.display_name || m.provider)
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow duration-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg">
            <Workflow className="w-5 h-5 text-slate-700" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Model Routing Priority</h3>
            <p className="text-xs text-slate-500 mt-0.5">How your requests are routed in order</p>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="mb-6 p-5 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl border border-slate-200/60">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-white rounded-lg shadow-sm">
            <Settings className="w-3.5 h-3.5 text-slate-600" />
          </div>
          <h4 className="text-sm font-semibold text-slate-700">Settings</h4>
        </div>
        <div className="flex items-center gap-4">
          <label className="text-sm text-slate-600 font-medium">Perspectives per message</label>
          <div className="flex-1 flex items-center gap-3">
            <input
              type="range"
              min="1"
              max="10"
              value={perspectivesPerMessage}
              onChange={(e) => debouncedUpdatePerspectives(parseInt(e.target.value))}
              className="flex-1 max-w-xs h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider:bg-slate-700"
              disabled={saving}
            />
            <span className="text-sm font-bold text-slate-900 bg-white px-3 py-1 rounded-lg shadow-sm border border-slate-200 min-w-[2.5rem] text-center">
              {perspectivesPerMessage}
            </span>
          </div>
          <div className="group relative">
            <Info className="w-4 h-4 text-slate-400 cursor-help" />
            <div className="absolute hidden group-hover:block bottom-full right-0 mb-2 w-48 p-2 bg-slate-900 text-white text-xs rounded-lg shadow-lg">
              Number of models to query simultaneously
            </div>
          </div>
        </div>
      </div>

      {/* 1. CLI Tools */}
      <div className="mb-4 p-4 bg-gradient-to-br from-blue-50/50 to-blue-100/30 rounded-xl border-l-4 border-blue-500">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-500 text-white font-bold text-sm shadow-sm flex-shrink-0">
            1
          </div>
          <div className="p-1.5 bg-white rounded-lg shadow-sm">
            <Terminal className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-slate-900">CLI Tools</h4>
            <p className="text-xs text-slate-600">Highest Priority · Always FREE</p>
          </div>
        </div>
        {detectedCLI.length > 0 ? (
          <div className="ml-11 mt-2 px-3 py-2 bg-white rounded-lg border border-blue-200/60 shadow-sm">
            <span className="text-xs font-medium text-slate-600">Active: </span>
            <span className="text-sm text-slate-900 font-medium">{detectedCLI.map(cli => cli.provider).join(', ')}</span>
          </div>
        ) : (
          <div className="ml-11 text-sm text-slate-500 italic">No CLI tools detected</div>
        )}
      </div>

      {/* 2. User API Keys */}
      <div className="mb-4 p-4 bg-gradient-to-br from-green-50/50 to-green-100/30 rounded-xl border-l-4 border-green-500">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-green-500 text-white font-bold text-sm shadow-sm flex-shrink-0">
            2
          </div>
          <div className="p-1.5 bg-white rounded-lg shadow-sm">
            <Key className="w-4 h-4 text-green-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-slate-900">Your API Keys</h4>
            <p className="text-xs text-slate-600">Your Models · Always FREE</p>
          </div>
        </div>
        {apiKeys.length > 0 ? (
          <div className="ml-11 mt-2 space-y-2">
            {apiKeys.map((key, idx) => {
              const logo = getProviderLogo(key.provider)
              const displayName = getProviderDisplayName(key.provider)
              const modelName = key.default_model || 'Default'
              return (
                <div key={key.id} className="flex items-center gap-3 px-3 py-2 bg-white rounded-lg border border-green-200/60 shadow-sm hover:shadow-md transition-all">
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded">{idx + 1}</span>
                  {logo && <img src={logo} alt={displayName} className="w-5 h-5 rounded" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">{displayName}</span>
                      <span className="text-xs text-slate-500">· {modelName}</span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">{key.key_preview}</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => moveApiKey(idx, 'up')}
                      disabled={idx === 0 || saving}
                      className="p-1.5 hover:bg-green-50 rounded-lg disabled:opacity-30 transition-colors"
                      title="Move up"
                    >
                      <ChevronUp className="w-4 h-4 text-slate-600" />
                    </button>
                    <button
                      onClick={() => moveApiKey(idx, 'down')}
                      disabled={idx === apiKeys.length - 1 || saving}
                      className="p-1.5 hover:bg-green-50 rounded-lg disabled:opacity-30 transition-colors"
                      title="Move down"
                    >
                      <ChevronDown className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="ml-11 text-sm text-slate-500 italic">No API keys configured</div>
        )}
      </div>

      {/* 3. Admin Keys (Perspectives) */}
      <div className="p-4 bg-gradient-to-br from-purple-50/50 to-purple-100/30 rounded-xl border-l-4 border-purple-500">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-purple-500 text-white font-bold text-sm shadow-sm flex-shrink-0">
            3
          </div>
          <div className="p-1.5 bg-white rounded-lg shadow-sm">
            <Crown className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-slate-900">Admin Keys</h4>
            <p className="text-xs text-slate-600">Uses Your Perspective Quota</p>
          </div>
        </div>

        {/* Tier Priority */}
        <div className="ml-11 mb-4">
          <h5 className="text-xs font-semibold text-slate-700 mb-3 uppercase tracking-wide">Tier Priority</h5>
          <div className="space-y-2">
            {tierPriority.map((tier: string, idx: number) => {
              const { total, used } = getTierQuota(tier)
              const percentage = total > 0 ? (used / total) * 100 : 0
              const remaining = total - used
              const tierModels = getModelsForTier(tier)
              return (
                <div key={tier} className="bg-white border border-purple-200/60 rounded-lg p-3 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded">{idx + 1}</span>
                    <span className="text-sm capitalize font-semibold text-slate-900">{tier}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              percentage >= 90 ? 'bg-red-400' : percentage >= 70 ? 'bg-amber-400' : 'bg-emerald-400'
                            }`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                        <div className="text-xs font-medium text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                          {remaining} / {total}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => moveTier(tier, 'up')}
                        disabled={idx === 0 || saving}
                        className="p-1.5 hover:bg-purple-50 rounded-lg disabled:opacity-30 transition-colors"
                        title="Move up"
                      >
                        <ChevronUp className="w-4 h-4 text-slate-600" />
                      </button>
                      <button
                        onClick={() => moveTier(tier, 'down')}
                        disabled={idx === tierPriority.length - 1 || saving}
                        className="p-1.5 hover:bg-purple-50 rounded-lg disabled:opacity-30 transition-colors"
                        title="Move down"
                      >
                        <ChevronDown className="w-4 h-4 text-slate-600" />
                      </button>
                    </div>
                  </div>
                  {tierModels.length > 0 && (
                    <div className="ml-9 text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded">
                      <span className="font-medium">Models:</span> {tierModels.join(', ')}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Provider Priority (GLOBAL) */}
        <div className="ml-11">
          <h5 className="text-xs font-semibold text-slate-700 mb-3 uppercase tracking-wide">Provider Priority · Global</h5>
          <div className="space-y-2">
            {allProviders.map((provider: string, idx: number) => {
              const logo = getProviderLogo(provider)
              const displayName = getProviderDisplayName(provider)
              const providerModels = (modelTiers || [])
                .filter(m => m.provider.toLowerCase() === provider.toLowerCase())
                .map(m => `${m.display_name} (${m.tier})`)
              return (
                <div key={provider} className="bg-white border border-purple-200/60 rounded-lg p-3 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded">{idx + 1}</span>
                    {logo && <img src={logo} alt={displayName} className="w-6 h-6 rounded shadow-sm" />}
                    <span className="text-sm font-medium text-slate-900 flex-1">{displayName}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => moveProvider(provider, 'up')}
                        disabled={idx === 0 || saving}
                        className="p-1.5 hover:bg-purple-50 rounded-lg disabled:opacity-30 transition-colors"
                        title="Move up"
                      >
                        <ChevronUp className="w-4 h-4 text-slate-600" />
                      </button>
                      <button
                        onClick={() => moveProvider(provider, 'down')}
                        disabled={idx === allProviders.length - 1 || saving}
                        className="p-1.5 hover:bg-purple-50 rounded-lg disabled:opacity-30 transition-colors"
                        title="Move down"
                      >
                        <ChevronDown className="w-4 h-4 text-slate-600" />
                      </button>
                    </div>
                  </div>
                  {providerModels.length > 0 && (
                    <div className="ml-9 mt-2 text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded">
                      {providerModels.join(', ')}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {saving && (
        <div className="mt-6 flex items-center justify-center gap-3 px-4 py-3 bg-slate-50 rounded-lg border border-slate-200">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-300 border-t-slate-900"></div>
          <span className="text-sm font-medium text-slate-700">Saving changes...</span>
        </div>
      )}
    </div>
  )
}
