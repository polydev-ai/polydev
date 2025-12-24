import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/app/utils/supabase/server'
import { createHash } from 'crypto'

/**
 * GET /api/model-preferences
 * Returns user's model preferences (provider -> default_model mapping)
 * and perspectives_per_message setting
 * Used by stdio-wrapper to pass user's preferred models to local CLIs
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

    // Get user preferences for perspectives_per_message setting
    const { data: userPrefs, error: prefsError } = await supabase
      .from('user_preferences')
      .select('mcp_settings')
      .eq('user_id', userId)
      .maybeSingle()

    if (prefsError) {
      console.error('[Model Preferences] User preferences fetch failed:', prefsError.message)
      // Non-fatal - continue with default
    }

    // Get perspectives_per_message from user settings (default 2, range 1-10)
    const perspectivesPerMessage = (userPrefs?.mcp_settings as any)?.perspectives_per_message || 2

    // Maps provider names to CLI tool IDs (only these have local CLI support)
    const providerToCliMap: Record<string, string> = {
      'anthropic': 'claude_code',
      'anthropic-ai': 'claude_code',
      'openai': 'codex_cli',
      'open-ai': 'codex_cli',
      'google': 'gemini_cli',
      'google-ai': 'gemini_cli'
    }

    const modelPreferences: Record<string, string> = {}
    const providerOrder: string[] = [] // CLI provider IDs in user's display_order
    
    // NEW: Full list of all providers (CLI + API-only) in user's order
    // Each entry: { provider: string, model: string, cliId: string | null }
    const allProviders: Array<{ provider: string; model: string; cliId: string | null }> = []
    const seenProviders = new Set<string>() // Track unique providers

    for (const key of apiKeys || []) {
      if (key.provider && key.default_model) {
        const providerLower = key.provider.toLowerCase()
        
        // Skip duplicate providers (keep first occurrence per display_order)
        if (seenProviders.has(providerLower)) {
          continue
        }
        seenProviders.add(providerLower)
        
        const cliId = providerToCliMap[providerLower] || null

        // Add to allProviders list (includes API-only providers)
        allProviders.push({
          provider: providerLower,
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

    console.log('[Model Preferences] Returning preferences:', modelPreferences)
    console.log('[Model Preferences] All providers:', allProviders)
    console.log('[Model Preferences] perspectives_per_message:', perspectivesPerMessage)

    return NextResponse.json({
      success: true,
      modelPreferences,
      providerOrder, // CLI provider IDs only (backwards compatibility)
      allProviders,  // NEW: Full list of all providers with CLI info
      perspectivesPerMessage,
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
