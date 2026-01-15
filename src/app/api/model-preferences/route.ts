import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/app/utils/supabase/server'
import { createHash } from 'crypto'

// Hash token for secure lookup in mcp_user_tokens table
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * GET /api/model-preferences
 * Returns user's model preferences (provider -> default_model mapping)
 * and perspectives_per_message setting
 * Used by stdio-wrapper to pass user's preferred models to local CLIs
 *
 * Priority order:
 * 1. User's API keys (from user_api_keys table)
 * 2. Credits Tier Priority (from model_tiers table) - FALLBACK when no API keys
 *
 * Requires: Authorization header with MCP token (pd_xxx or polydev_xxx)
 */
export async function GET(request: NextRequest) {
  try {
    // Get MCP token from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    const mcpToken = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!mcpToken || (!mcpToken.startsWith('pd_') && !mcpToken.startsWith('polydev_') && !mcpToken.startsWith('poly_'))) {
      return NextResponse.json(
        { error: 'Invalid MCP token format' },
        { status: 401 }
      )
    }

    // Use admin client for service role access
    const supabase = createAdminClient()

    let userId: string | null = null

    // Check if it's an OAuth access token (starts with polydev_)
    if (mcpToken.startsWith('polydev_')) {
      const { data: tokenData, error: tokenError } = await supabase
        .from('mcp_access_tokens')
        .select('user_id, expires_at, revoked')
        .eq('token', mcpToken)
        .eq('revoked', false)
        .single()

      if (tokenError || !tokenData) {
        console.error('[Model Preferences] OAuth token lookup failed:', tokenError?.message || 'Token not found')
        return NextResponse.json(
          { error: 'Invalid or expired OAuth token' },
          { status: 401 }
        )
      }

      // Check if token is expired
      const tokenExpiry = new Date(tokenData.expires_at)
      if (tokenExpiry < new Date()) {
        console.error('[Model Preferences] OAuth token expired')
        return NextResponse.json(
          { error: 'Token expired' },
          { status: 401 }
        )
      }

      userId = tokenData.user_id
    }
    // Check if it's an MCP token (starts with pd_ or legacy poly_)
    else if (mcpToken.startsWith('pd_') || mcpToken.startsWith('poly_')) {
      // Use token hash for lookup (matches main MCP route)
      const tokenHash = createHash('sha256').update(mcpToken).digest('hex')

      const { data: tokenData, error: tokenError } = await supabase
        .from('mcp_user_tokens')
        .select('user_id, active')
        .eq('token_hash', tokenHash)
        .eq('active', true)
        .single()

      if (tokenError || !tokenData) {
        console.error('[Model Preferences] MCP token lookup failed:', tokenError?.message || 'Token not found')
        return NextResponse.json(
          { error: 'Invalid or revoked MCP token' },
          { status: 401 }
        )
      }

      userId = tokenData.user_id
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Unable to authenticate token' },
        { status: 401 }
      )
    }

    // Get user's API keys with default_model
    const { data: apiKeys, error: apiKeysError } = await supabase
      .from('user_api_keys')
      .select('provider, default_model, display_order')
      .eq('user_id', userId)
      .eq('active', true)
      .neq('is_admin_key', true) // Only fetch user's personal keys (exclude admin keys)
      .order('display_order', { ascending: true, nullsFirst: false })

    if (apiKeysError) {
      console.error('[Model Preferences] API keys fetch failed:', apiKeysError.message)
      return NextResponse.json(
        { error: 'Failed to fetch model preferences' },
        { status: 500 }
      )
    }

    // Get user preferences for perspectives_per_message and tier_priority settings
    const { data: userPrefs, error: prefsError } = await supabase
      .from('user_preferences')
      .select('mcp_settings')
      .eq('user_id', userId)
      .maybeSingle()

    if (prefsError) {
      console.error('[Model Preferences] User preferences fetch failed:', prefsError.message)
      // Non-fatal - continue with default
    }

    // DEBUG: Log what we got from user_preferences
    console.log('[Model Preferences] userPrefs:', JSON.stringify(userPrefs))
    console.log('[Model Preferences] mcp_settings:', JSON.stringify(userPrefs?.mcp_settings))
    console.log('[Model Preferences] perspectives_per_message raw:', (userPrefs?.mcp_settings as any)?.perspectives_per_message)

    // Get perspectives_per_message from user settings (default 2, range 1-10)
    const perspectivesPerMessage = (userPrefs?.mcp_settings as any)?.perspectives_per_message || 2
    console.log('[Model Preferences] Final perspectivesPerMessage:', perspectivesPerMessage)

    // Normalize provider names to prevent duplicates (gemini = google, x-ai = xai)
    const normalizeProvider = (provider: string): string => {
      const map: Record<string, string> = {
        'gemini': 'google',
        'google-ai': 'google', 
        'x-ai': 'xai',
        'open-ai': 'openai',
        'anthropic-ai': 'anthropic'
      }
      const lower = provider.toLowerCase()
      return map[lower] || lower
    }

    // Maps provider names to CLI tool IDs (only these have local CLI support)
    const providerToCliMap: Record<string, string> = {
      'anthropic': 'claude_code',
      'anthropic-ai': 'claude_code',
      'openai': 'codex_cli',
      'open-ai': 'codex_cli',
      'google': 'gemini_cli',
      'google-ai': 'gemini_cli',
      'gemini': 'gemini_cli'  // Support 'gemini' as provider name too
    }

    const modelPreferences: Record<string, string> = {}
    const providerOrder: string[] = [] // CLI provider IDs in user's display_order
    
    // NEW: Full list of all providers (CLI + API-only) in user's order
    // Each entry: { provider: string, model: string, cliId: string | null; tier?: string }
    const allProviders: Array<{ provider: string; model: string; cliId: string | null; tier?: string }> = []
    const seenProviders = new Set<string>() // Track unique providers

    // Check if user has API keys configured
    const hasApiKeys = apiKeys && apiKeys.length > 0

    // STEP 1: Add models from user's API keys first
    if (hasApiKeys) {
      console.log('[Model Preferences] Step 1: Using user API keys, count:', apiKeys.length)
      
      for (const key of apiKeys) {
        if (key.provider && key.default_model) {
          const providerLower = key.provider.toLowerCase()
          const normalizedProvider = normalizeProvider(providerLower)
          
          // Skip duplicate providers (keep first occurrence per display_order)
          // Use normalized name for deduplication (gemini = google, x-ai = xai)
          if (seenProviders.has(normalizedProvider)) {
            continue
          }
          seenProviders.add(normalizedProvider)
          
          const cliId = providerToCliMap[providerLower] || providerToCliMap[normalizedProvider] || null

          // Add to allProviders list (includes API-only providers)
          // Use normalized provider name for consistency with perspectives API
          allProviders.push({
            provider: normalizedProvider,
            model: key.default_model,
            cliId: cliId
          })

          if (cliId) {
            // Track CLI providers separately for backwards compatibility
            if (!providerOrder.includes(cliId)) {
              providerOrder.push(cliId)
            }
            
            if (!modelPreferences[cliId]) {
              modelPreferences[cliId] = key.default_model
            }
          }
        }
      }
      console.log('[Model Preferences] After API keys:', allProviders.length, 'models, covered providers:', Array.from(seenProviders))
    }
    
    // STEP 2: Supplement with Credits Tier models for uncovered providers
    // This ensures stdio-wrapper knows about ALL available providers for CLI routing
    const needMoreModels = allProviders.length < perspectivesPerMessage
    console.log('[Model Preferences] Step 2: Checking credits tier (have', allProviders.length, ', need', perspectivesPerMessage, ')')
    
    if (needMoreModels || !hasApiKeys) {
      // Get user's tier priority preference (default: normal -> eco -> premium)
      const tierPriority = (userPrefs?.mcp_settings as any)?.tier_priority || ['normal', 'eco', 'premium']
      console.log('[Model Preferences] User tier priority:', tierPriority)

      // Get user's custom model order per tier (if they've customized it in dashboard/models)
      const userModelOrder = (userPrefs?.mcp_settings as any)?.model_order || {}
      console.log('[Model Preferences] User custom model_order:', JSON.stringify(userModelOrder))

      // Query model_tiers for active models in user's preferred tiers
      const { data: tierModels, error: tierError } = await supabase
        .from('model_tiers')
        .select('id, model_name, display_name, provider, tier, display_order')
        .eq('active', true)
        .in('tier', tierPriority)
        .order('display_order', { ascending: true })

      if (tierError) {
        console.error('[Model Preferences] Error fetching model_tiers:', tierError.message)
      }

      if (tierModels && tierModels.length > 0) {
        // Sort by tier priority first, then by USER'S custom order (or fallback to display_order)
        const sortedTierModels = tierModels.sort((a, b) => {
          const aTierIndex = tierPriority.indexOf(a.tier)
          const bTierIndex = tierPriority.indexOf(b.tier)
          if (aTierIndex !== bTierIndex) return aTierIndex - bTierIndex

          // Check if user has custom order for this tier
          const tierOrder = userModelOrder[a.tier] as string[] | undefined
          if (tierOrder && tierOrder.length > 0) {
            // Use user's custom order (by model ID)
            const aIndex = tierOrder.indexOf(a.id)
            const bIndex = tierOrder.indexOf(b.id)
            // Models not in user's order go to the end
            const aPos = aIndex >= 0 ? aIndex : 999
            const bPos = bIndex >= 0 ? bIndex : 999
            return aPos - bPos
          }

          // Fallback to database display_order
          return (a.display_order ?? 999) - (b.display_order ?? 999)
        })

        console.log('[Model Preferences] Sorted models (respecting user order):', sortedTierModels.map(m => m.model_name))
        
        console.log('[Model Preferences] Found', sortedTierModels.length, 'models from Credits Tier')
        
        for (const model of sortedTierModels) {
          // Stop if we have enough models
          if (allProviders.length >= perspectivesPerMessage) {
            console.log('[Model Preferences] Reached perspectivesPerMessage limit:', perspectivesPerMessage)
            break
          }
          
          const providerLower = model.provider.toLowerCase()
          const normalizedProvider = normalizeProvider(providerLower)
          
          // Skip duplicate providers (keep first occurrence per priority)
          // Use normalized name for deduplication
          if (seenProviders.has(normalizedProvider)) {
            continue
          }
          seenProviders.add(normalizedProvider)
          
          const cliId = providerToCliMap[providerLower] || providerToCliMap[normalizedProvider] || null
          
          // Add to allProviders list
          allProviders.push({
            provider: normalizedProvider,
            model: model.model_name,
            cliId: cliId,
            tier: model.tier
          })
          
          console.log('[Model Preferences] Added credits tier model:', model.model_name, '(provider:', normalizedProvider, ', cliId:', cliId, ')')
          
          if (cliId) {
            // Track CLI providers for backwards compatibility
            if (!providerOrder.includes(cliId)) {
              providerOrder.push(cliId)
            }
            
            if (!modelPreferences[cliId]) {
              modelPreferences[cliId] = model.model_name
            }
          }
        }
      } else {
        console.log('[Model Preferences] No Credits Tier models found')
      }
    }

    console.log('[Model Preferences] Final allProviders:', allProviders.map(p => ({
      provider: p.provider,
      model: p.model,
      cliId: p.cliId,
      tier: p.tier
    })))
    console.log('[Model Preferences] Returning preferences:', modelPreferences)
    console.log('[Model Preferences] Provider order:', providerOrder)
    console.log('[Model Preferences] perspectives_per_message:', perspectivesPerMessage)
    console.log('[Model Preferences] Source:', hasApiKeys ? 'api_keys_plus_credits' : 'credits_tier_only')

    return NextResponse.json({
      success: true,
      modelPreferences,
      providerOrder, // CLI provider IDs only (backwards compatibility)
      allProviders,  // Full list of all providers with CLI info
      perspectivesPerMessage,
      source: hasApiKeys ? 'api_keys_plus_credits' : 'credits_tier_only', // NEW: Indicate where models came from
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[Model Preferences] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
