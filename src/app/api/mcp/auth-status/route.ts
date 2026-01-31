import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { createHash } from 'crypto'

// Vercel configuration
export const dynamic = 'force-dynamic'
export const maxDuration = 10

/**
 * MCP Authentication Status Endpoint
 * Used by MCP clients to check authentication status and get account info
 * Works universally across all IDEs (Claude Desktop, Cursor, Continue, Windsurf, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        authenticated: false,
        error: 'missing_token',
        message: 'No authentication token provided'
      }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')

    // Validate token format
    if (!token.startsWith('polydev_') && !token.startsWith('pd_')) {
      return NextResponse.json({
        authenticated: false,
        error: 'invalid_token_format',
        message: 'Token must start with "polydev_" or "pd_"'
      }, { status: 401 })
    }

    const supabase = await createClient()

    // Check service role for bypassing RLS
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    let supabaseService = supabase

    if (serviceRoleKey && serviceRoleKey !== 'your_service_role_key') {
      const { createClient: createServiceClient } = await import('@supabase/supabase-js')
      supabaseService = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey
      )
    }

    // Look up token in mcp_access_tokens table
    const { data: tokenData, error: tokenError } = await supabaseService
      .from('mcp_access_tokens')
      .select('user_id, expires_at, client_id')
      .eq('token', token)
      .single()

    if (tokenError || !tokenData) {
      // Try mcp_user_tokens table (for manually generated tokens)
      const tokenHash = createHash('sha256').update(token).digest('hex')
      const { data: userToken, error: userTokenError } = await supabaseService
        .from('mcp_user_tokens')
        .select('user_id, active')
        .eq('token_hash', tokenHash)
        .single()

      if (userTokenError || !userToken || !userToken.active) {
        return NextResponse.json({
          authenticated: false,
          error: 'invalid_token',
          message: 'Token not found or inactive'
        }, { status: 401 })
      }

      // Get user info for manually generated token
      const { data: profile } = await supabaseService
        .from('profiles')
        .select('email, credits, subscription_tier, enabled_models')
        .eq('id', userToken.user_id)
        .single()

      if (!profile) {
        return NextResponse.json({
          authenticated: false,
          error: 'user_not_found',
          message: 'User profile not found'
        }, { status: 401 })
      }

      // Get CLI subscriptions
      const { data: cliStatuses } = await supabaseService
        .from('user_cli_statuses')
        .select('provider_id, status, authenticated')
        .eq('user_id', userToken.user_id)
        .eq('authenticated', true)

      const cliSubscriptions = cliStatuses?.map(s => s.provider_id) || []

      // Get today's usage
      const today = new Date().toISOString().split('T')[0]
      const { data: usageData } = await supabaseService
        .from('mcp_usage')
        .select('credits_used')
        .eq('user_id', userToken.user_id)
        .gte('created_at', `${today}T00:00:00Z`)

      const creditsUsedToday = usageData?.reduce((sum, u) => sum + (u.credits_used || 0), 0) || 0

      return NextResponse.json({
        authenticated: true,
        email: profile.email,
        credits_remaining: profile.credits || 0,
        credits_used_today: creditsUsedToday,
        subscription_tier: profile.subscription_tier || 'Free',
        enabled_models: profile.enabled_models || ['GLM-4.7', 'Gemini 3 Flash', 'Grok 4.1 Fast Reasoning', 'GPT-5 Mini'],
        cli_subscriptions: cliSubscriptions
      })
    }

    // Check token expiration
    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json({
        authenticated: false,
        error: 'token_expired',
        message: 'Token has expired. Please generate a new one.',
        reauth_url: 'https://polydev.ai/dashboard/mcp-tools'
      }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabaseService
      .from('profiles')
      .select('email, credits, subscription_tier, enabled_models')
      .eq('id', tokenData.user_id)
      .single()

    if (!profile) {
      return NextResponse.json({
        authenticated: false,
        error: 'user_not_found',
        message: 'User profile not found'
      }, { status: 401 })
    }

    // Get CLI subscriptions
    const { data: cliStatuses } = await supabaseService
      .from('user_cli_statuses')
      .select('provider_id, status, authenticated')
      .eq('user_id', tokenData.user_id)
      .eq('authenticated', true)

    const cliSubscriptions = cliStatuses?.map(s => s.provider_id) || []

    // Get today's usage
    const today = new Date().toISOString().split('T')[0]
    const { data: usageData } = await supabaseService
      .from('mcp_usage')
      .select('credits_used')
      .eq('user_id', tokenData.user_id)
      .gte('created_at', `${today}T00:00:00Z`)

    const creditsUsedToday = usageData?.reduce((sum, u) => sum + (u.credits_used || 0), 0) || 0

    return NextResponse.json({
      authenticated: true,
      email: profile.email,
      credits_remaining: profile.credits || 0,
      credits_used_today: creditsUsedToday,
      subscription_tier: profile.subscription_tier || 'Free',
      token_expires_at: tokenData.expires_at,
      enabled_models: profile.enabled_models || ['GLM-4.7', 'Gemini 3 Flash', 'Grok 4.1 Fast Reasoning', 'GPT-5 Mini'],
      cli_subscriptions: cliSubscriptions,
      client_id: tokenData.client_id
    })

  } catch (error) {
    console.error('[MCP Auth Status] Error:', error)
    return NextResponse.json({
      authenticated: false,
      error: 'server_error',
      message: 'Internal server error'
    }, { status: 500 })
  }
}

// CORS support
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}
