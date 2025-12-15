import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/app/utils/supabase/server'

/**
 * GET /api/model-preferences
 * Returns user's model preferences (provider -> default_model mapping)
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
    if (!mcpToken || (!mcpToken.startsWith('pd_') && !mcpToken.startsWith('polydev_'))) {
      return NextResponse.json(
        { error: 'Invalid MCP token format' },
        { status: 401 }
      )
    }

    // Use admin client for service role access
    const supabase = createAdminClient()

    // Find user by MCP token
    const { data: tokenData, error: tokenError } = await supabase
      .from('mcp_tokens')
      .select('user_id')
      .eq('token', mcpToken)
      .eq('revoked', false)
      .maybeSingle()

    if (tokenError || !tokenData) {
      console.error('[Model Preferences] Token lookup failed:', tokenError?.message || 'Token not found')
      return NextResponse.json(
        { error: 'Invalid or revoked token' },
        { status: 401 }
      )
    }

    const userId = tokenData.user_id

    // Get user's API keys with default_model
    const { data: apiKeys, error: apiKeysError } = await supabase
      .from('user_api_keys')
      .select('provider, default_model')
      .eq('user_id', userId)
      .eq('active', true)
      .order('display_order', { ascending: true })

    if (apiKeysError) {
      console.error('[Model Preferences] API keys fetch failed:', apiKeysError.message)
      return NextResponse.json(
        { error: 'Failed to fetch model preferences' },
        { status: 500 }
      )
    }

    // Build provider -> model mapping
    // Maps provider names to CLI tool IDs
    const providerToCliMap: Record<string, string> = {
      'anthropic': 'claude_code',
      'anthropic-ai': 'claude_code',
      'openai': 'codex_cli',
      'open-ai': 'codex_cli',
      'google': 'gemini_cli',
      'google-ai': 'gemini_cli'
    }

    const modelPreferences: Record<string, string> = {}

    for (const key of apiKeys || []) {
      if (key.provider && key.default_model) {
        const providerLower = key.provider.toLowerCase()
        const cliId = providerToCliMap[providerLower]

        if (cliId && !modelPreferences[cliId]) {
          // Only set the first match (respects display_order)
          modelPreferences[cliId] = key.default_model
        }
      }
    }

    console.log('[Model Preferences] Returning preferences:', modelPreferences)

    return NextResponse.json({
      success: true,
      modelPreferences,
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
