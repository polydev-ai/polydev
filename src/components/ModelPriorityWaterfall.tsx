'use client'

import { useState, useCallback } from 'react'
import { ChevronUp, ChevronDown, Terminal, Key, Crown, Info } from 'lucide-react'
import { usePreferences } from '../hooks/usePreferences'
import { useDebouncedCallback } from 'use-debounce'

interface ApiKey {
  id: string
  provider: string
  key_preview: string
  display_order?: number
  active: boolean
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

interface Props {
  apiKeys: ApiKey[]
  quota: PerspectiveQuota | null
  modelTiers: ModelTier[]
  cliStatuses: CLIStatus[]
  onRefresh: () => Promise<void>
}

export default function ModelPriorityWaterfall({ apiKeys, quota, modelTiers, cliStatuses, onRefresh }: Props) {
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

    // Update display_order for all keys
    const updates = reordered.map((key, idx) => ({
      id: key.id,
      display_order: idx
    }))

    try {
      setSaving(true)
      const response = await fetch('/api/api-keys/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: updates })
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

  // Provider reordering (GLOBAL across all tiers)
  const moveProvider = useCallback(async (provider: string, direction: 'up' | 'down') => {
    const index = providerPriority.indexOf(provider)
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === providerPriority.length - 1) return

    const newIndex = direction === 'up' ? index - 1 : index + 1
    const reordered = [...providerPriority]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(newIndex, 0, moved)

    try {
      setSaving(true)
      await updatePreferences({
        mcp_settings: {
          ...(preferences?.mcp_settings as any),
          provider_priority: reordered
        }
      })
    } finally {
      setSaving(false)
    }
  }, [providerPriority, preferences, updatePreferences])

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

  // Get unique providers from active tiers
  const activeProviders = [...new Set((modelTiers || []).map(t => t.provider))]
  const sortedProviders = providerPriority.filter((p: string) => activeProviders.includes(p))

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Model Routing Priority</h3>
      <p className="text-sm text-gray-500 mb-6">Shows how your requests are routed (in order)</p>

      {/* Settings */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">⚙️ Settings</h4>
        <div className="flex items-center gap-4">
          <label className="text-sm text-gray-600">Perspectives per message:</label>
          <input
            type="range"
            min="1"
            max="10"
            value={perspectivesPerMessage}
            onChange={(e) => debouncedUpdatePerspectives(parseInt(e.target.value))}
            className="flex-1 max-w-xs"
            disabled={saving}
          />
          <span className="text-sm font-medium text-gray-900 w-8">{perspectivesPerMessage}</span>
          <span title="Number of models to query simultaneously">
            <Info className="w-4 h-4 text-gray-400" />
          </span>
        </div>
      </div>

      {/* 1. CLI Tools */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">1️⃣</span>
          <Terminal className="w-5 h-5 text-purple-500" />
          <h4 className="font-medium text-gray-900">CLI TOOLS (Highest Priority - Always FREE)</h4>
        </div>
        {detectedCLI.length > 0 ? (
          <div className="ml-8 text-sm text-green-600">
            ✓ Detected: {detectedCLI.map(cli => cli.provider).join(', ')}
          </div>
        ) : (
          <div className="ml-8 text-sm text-gray-400">No CLI tools detected</div>
        )}
      </div>

      {/* 2. User API Keys */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">2️⃣</span>
          <Key className="w-5 h-5 text-blue-500" />
          <h4 className="font-medium text-gray-900">YOUR API KEYS (Your Models - Always FREE)</h4>
        </div>
        {apiKeys.length > 0 ? (
          <div className="ml-8 space-y-1">
            {apiKeys.map((key, idx) => (
              <div key={key.id} className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">{idx + 1}.</span>
                <span className="text-gray-900">{key.provider}</span>
                <span className="text-gray-400">- {key.key_preview}</span>
                <div className="flex gap-1 ml-auto">
                  <button
                    onClick={() => moveApiKey(idx, 'up')}
                    disabled={idx === 0 || saving}
                    className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveApiKey(idx, 'down')}
                    disabled={idx === apiKeys.length - 1 || saving}
                    className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="ml-8 text-sm text-gray-400">No API keys configured</div>
        )}
      </div>

      {/* 3. Admin Keys (Perspectives) */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">3️⃣</span>
          <Crown className="w-5 h-5 text-yellow-500" />
          <h4 className="font-medium text-gray-900">ADMIN KEYS (Uses Your Quota)</h4>
        </div>

        {/* Tier Priority */}
        <div className="ml-8 mb-3">
          <h5 className="text-sm font-medium text-gray-700 mb-2">Tier Priority:</h5>
          <div className="space-y-1">
            {tierPriority.map((tier: string, idx: number) => {
              const { total, used } = getTierQuota(tier)
              const percentage = total > 0 ? (used / total) * 100 : 0
              return (
                <div key={tier} className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">{idx + 1}.</span>
                  <span className="text-gray-900 capitalize w-20">{tier}</span>
                  <div className="flex-1 max-w-xs">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            percentage >= 90 ? 'bg-red-500' : percentage >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-24">{used}/{total}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => moveTier(tier, 'up')}
                      disabled={idx === 0 || saving}
                      className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveTier(tier, 'down')}
                      disabled={idx === tierPriority.length - 1 || saving}
                      className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Provider Priority (GLOBAL) */}
        <div className="ml-8">
          <h5 className="text-sm font-medium text-gray-700 mb-2">Provider Priority (applies to all tiers):</h5>
          <div className="space-y-1">
            {sortedProviders.map((provider: string, idx: number) => (
              <div key={provider} className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">{idx + 1}.</span>
                <span className="text-gray-900 capitalize">{provider}</span>
                <div className="flex gap-1 ml-auto">
                  <button
                    onClick={() => moveProvider(provider, 'up')}
                    disabled={idx === 0 || saving}
                    className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveProvider(provider, 'down')}
                    disabled={idx === sortedProviders.length - 1 || saving}
                    className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {saving && (
        <div className="mt-4 text-sm text-blue-600 flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          Saving changes...
        </div>
      )}
    </div>
  )
}
