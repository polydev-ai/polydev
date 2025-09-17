import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../utils/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // Use service role for comprehensive access
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    let supabase = await createClient()

    if (serviceRoleKey && serviceRoleKey !== 'your_service_role_key') {
      const { createClient: createServiceClient } = await import('@supabase/supabase-js')
      supabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey
      )
    }

    // Get current user from regular client for auth
    const regularSupabase = await createClient()
    const { data: { user }, error: authError } = await regularSupabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status') // 'success', 'error', 'partial_success'
    const dateFrom = searchParams.get('from')
    const dateTo = searchParams.get('to')

    // Fetch MCP client requests
    let mcpQuery = supabase
      .from('mcp_request_logs')
      .select(`
        id,
        prompt,
        models_requested,
        total_tokens,
        total_cost,
        response_time_ms,
        status,
        successful_providers,
        failed_providers,
        provider_costs,
        provider_responses,
        provider_latencies,
        created_at,
        client_id,
        temperature,
        max_tokens_requested
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Apply filters to MCP requests
    if (status) {
      mcpQuery = mcpQuery.eq('status', status)
    }

    if (dateFrom) {
      mcpQuery = mcpQuery.gte('created_at', dateFrom)
    }

    if (dateTo) {
      mcpQuery = mcpQuery.lte('created_at', dateTo)
    }

    // Fetch chat logs (web chat requests)
    let chatQuery = supabase
      .from('chat_logs')
      .select(`
        id,
        session_id,
        models_used,
        message_count,
        total_tokens,
        total_cost,
        created_at
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Apply date filters to chat requests
    if (dateFrom) {
      chatQuery = chatQuery.gte('created_at', dateFrom)
    }

    if (dateTo) {
      chatQuery = chatQuery.lte('created_at', dateTo)
    }

    const [{ data: mcpLogs, error: mcpError }, { data: chatLogs, error: chatError }] = await Promise.all([
      mcpQuery,
      chatQuery
    ])

    if (mcpError) {
      console.error('[Request Logs API] MCP Error:', mcpError)
      return NextResponse.json({ error: 'Failed to fetch MCP request logs' }, { status: 500 })
    }

    if (chatError) {
      console.error('[Request Logs API] Chat Error:', chatError)
      return NextResponse.json({ error: 'Failed to fetch chat logs' }, { status: 500 })
    }

    // Transform MCP logs to unified format
    const transformedMcpLogs = mcpLogs?.map(log => ({
      id: log.id,
      timestamp: log.created_at,
      prompt: log.prompt.substring(0, 200) + (log.prompt.length > 200 ? '...' : ''),
      fullPrompt: log.prompt,
      models: log.models_requested,
      totalTokens: log.total_tokens,
      cost: parseFloat(log.total_cost || '0'),
      speed: log.response_time_ms ? (log.total_tokens / (log.response_time_ms / 1000)).toFixed(1) : '0',
      responseTime: log.response_time_ms,
      status: log.status,
      successfulProviders: log.successful_providers,
      failedProviders: log.failed_providers,
      client: log.client_id || 'MCP Client',
      temperature: log.temperature,
      maxTokens: log.max_tokens_requested,
      source: 'mcp',

      // Provider breakdown
      providers: Object.entries(log.provider_costs || {}).map(([key, cost]) => {
        const [provider, model] = key.split(':')
        const latency = log.provider_latencies?.[key] || 0
        const response = log.provider_responses?.[key]

        return {
          provider,
          model,
          cost: parseFloat(cost as string),
          latency,
          tokens: response?.tokens_used || 0,
          success: !!response,
          response: response?.content || null
        }
      }),

      // Overall metrics
      avgLatency: Object.values(log.provider_latencies || {}).length > 0
        ? Math.round(Object.values(log.provider_latencies as Record<string, number>).reduce((a, b) => a + b, 0) / Object.values(log.provider_latencies || {}).length)
        : 0,

      tokensPerSecond: log.response_time_ms
        ? parseFloat((log.total_tokens / (log.response_time_ms / 1000)).toFixed(1))
        : 0
    })) || []

    // Transform chat logs to unified format
    const transformedChatLogs = chatLogs?.map(log => ({
      id: log.id,
      timestamp: log.created_at,
      prompt: 'Web Chat Session',
      fullPrompt: `Chat session with ${log.message_count} messages`,
      models: log.models_used || [],
      totalTokens: log.total_tokens || 0,
      cost: parseFloat(log.total_cost || '0'),
      speed: '0', // Chat logs don't have response time per message
      responseTime: null,
      status: 'success', // Assume success for completed chat logs
      successfulProviders: 1,
      failedProviders: 0,
      client: 'Web Chat',
      temperature: null,
      maxTokens: null,
      source: 'chat',

      // Provider breakdown - reconstruct from models_used
      providers: (log.models_used || []).map((model: string) => ({
        provider: model.includes('/') ? model.split('/')[0] : 'unknown',
        model: model.includes('/') ? model.split('/')[1] : model,
        cost: parseFloat(log.total_cost || '0') / (log.models_used?.length || 1),
        latency: 0,
        tokens: Math.round((log.total_tokens || 0) / (log.models_used?.length || 1)),
        success: true,
        response: null
      })),

      // Overall metrics
      avgLatency: 0,
      tokensPerSecond: 0,
      messageCount: log.message_count
    })) || []

    // Combine and sort all logs by timestamp
    const allLogs = [...transformedMcpLogs, ...transformedChatLogs]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(offset, offset + limit)

    // Get total count for pagination
    const [{ count: mcpCount }, { count: chatCount }] = await Promise.all([
      supabase
        .from('mcp_request_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id),
      supabase
        .from('chat_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
    ])

    const totalCount = (mcpCount || 0) + (chatCount || 0)

    return NextResponse.json({
      logs: allLogs,
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore: totalCount > offset + limit
      }
    })

  } catch (error) {
    console.error('[Request Logs API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch request logs' },
      { status: 500 }
    )
  }
}