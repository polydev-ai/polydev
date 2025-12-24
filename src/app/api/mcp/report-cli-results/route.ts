import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

export const dynamic = 'force-dynamic'

// Hash token for secure lookup in mcp_user_tokens table
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

interface CliResult {
  provider_id: string  // claude_code, codex_cli, gemini_cli
  model: string
  content: string
  tokens_used: number
  latency_ms: number
  success: boolean
  error?: string
}

interface ReportCliResultsRequest {
  prompt: string
  cli_results: CliResult[]
  request_id?: string
  temperature?: number
  max_tokens?: number
}

/**
 * POST /api/mcp/report-cli-results
 *
 * Reports CLI tool results to be stored in Supabase for dashboard display.
 * Called by stdio-wrapper after local CLI execution.
 */
export async function POST(request: NextRequest) {
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

    // Parse request body
    const body: ReportCliResultsRequest = await request.json()

    if (!body.prompt || !body.cli_results || !Array.isArray(body.cli_results)) {
      return NextResponse.json(
        { error: 'prompt and cli_results array are required' },
        { status: 400 }
      )
    }

    // Use service role client
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // FIXED: Use hash-based lookup in mcp_user_tokens table (same as model-preferences)
    const tokenHash = hashToken(mcpToken)
    const { data: tokenData, error: tokenError } = await supabase
      .from('mcp_user_tokens')
      .select('user_id, active')
      .eq('token_hash', tokenHash)
      .eq('active', true)
      .maybeSingle()

    // Fallback: Also check legacy mcp_tokens table for backwards compatibility
    let userId: string | null = tokenData?.user_id || null
    
    if (!userId) {
      const { data: legacyToken, error: legacyError } = await supabase
        .from('mcp_tokens')
        .select('user_id')
        .eq('token', mcpToken)
        .eq('revoked', false)
        .maybeSingle()
      
      if (legacyToken) {
        userId = legacyToken.user_id
      }
    }

    if (!userId) {
      console.error('[Report CLI] Token lookup failed:', tokenError?.message || 'Token not found in either table')
      return NextResponse.json(
        { error: 'Invalid or revoked token' },
        { status: 401 }
      )
    }

    // Map CLI provider IDs to display names
    const cliToProviderMap: Record<string, { provider: string; displayName: string }> = {
      'claude_code': { provider: 'anthropic', displayName: 'Claude Code (CLI)' },
      'codex_cli': { provider: 'openai', displayName: 'Codex CLI' },
      'gemini_cli': { provider: 'google', displayName: 'Gemini CLI' }
    }

    // Build provider responses structure matching mcp_request_logs schema
    const providerResponses: Record<string, any> = {}
    const providerCosts: Record<string, number> = {}
    const providerLatencies: Record<string, number> = {}
    const modelsRequested: string[] = []

    let totalTokens = 0
    let totalLatency = 0
    let successCount = 0
    let failedCount = 0

    for (const result of body.cli_results) {
      const providerInfo = cliToProviderMap[result.provider_id] || {
        provider: result.provider_id,
        displayName: result.provider_id
      }

      const responseKey = `${providerInfo.provider}:${result.model}`

      providerResponses[responseKey] = {
        model: result.model,
        provider: providerInfo.provider,
        // Show both provider/CLI tool AND model name for clarity
        display_name: `${providerInfo.displayName} (${result.model})`,
        content: result.content,
        tokens_used: result.tokens_used || 0,
        latency_ms: result.latency_ms || 0,
        success: result.success,
        error: result.error || null,
        source: 'cli',  // Mark as CLI source
        cli_tool: result.provider_id,
        finish_reason: result.success ? 'stop' : 'error'
      }

      // CLI tools are free (user's own subscription)
      providerCosts[responseKey] = 0
      providerLatencies[responseKey] = result.latency_ms || 0

      modelsRequested.push(result.model)
      totalTokens += result.tokens_used || 0
      totalLatency = Math.max(totalLatency, result.latency_ms || 0)

      if (result.success) {
        successCount++
      } else {
        failedCount++
      }
    }

    // Insert into mcp_request_logs
    const { error: insertError } = await supabase
      .from('mcp_request_logs')
      .insert({
        user_id: userId,
        client_id: 'cli',  // Required NOT NULL field
        prompt: body.prompt,
        prompt_tokens: Math.floor(body.prompt.length / 4),
        max_tokens_requested: body.max_tokens || 20000,
        temperature: body.temperature || 0.7,
        models_requested: modelsRequested,
        provider_requests: {},  // jsonb field, not integer
        total_completion_tokens: totalTokens,
        total_prompt_tokens: Math.floor(body.prompt.length / 4) * successCount,
        total_tokens: totalTokens,
        provider_costs: providerCosts,
        total_cost: 0,  // CLI tools are free
        response_time_ms: totalLatency,
        first_token_time_ms: Math.min(...body.cli_results.map(r => r.latency_ms || totalLatency)),
        provider_latencies: providerLatencies,
        status: successCount === body.cli_results.length ? 'success' :
                successCount > 0 ? 'partial_success' : 'error',
        error_message: body.cli_results.filter(r => r.error).map(r => r.error).join('; ') || null,
        successful_providers: successCount,
        failed_providers: failedCount,
        store_responses: true,
        provider_responses: providerResponses,
        source_type: 'cli',  // Correct column name (not 'source')
        created_at: new Date().toISOString()
      })

    if (insertError) {
      console.error('[Report CLI] Failed to insert log:', insertError)
      return NextResponse.json(
        { error: 'Failed to store CLI results' },
        { status: 500 }
      )
    }

    console.log(`[Report CLI] Stored ${body.cli_results.length} CLI results for user ${userId}`)

    return NextResponse.json({
      success: true,
      stored: body.cli_results.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[Report CLI] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
