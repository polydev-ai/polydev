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

    // Build query
    let query = supabase
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
      .range(offset, offset + limit - 1)

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    
    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }
    
    if (dateTo) {
      query = query.lte('created_at', dateTo)
    }

    const { data: requestLogs, error: logsError } = await query

    if (logsError) {
      console.error('[Request Logs API] Error:', logsError)
      return NextResponse.json({ error: 'Failed to fetch request logs' }, { status: 500 })
    }

    // Transform data to OpenRouter-style format
    const transformedLogs = requestLogs?.map(log => ({
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
      client: log.client_id,
      temperature: log.temperature,
      maxTokens: log.max_tokens_requested,
      
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

    // Get total count for pagination
    const { count } = await supabase
      .from('mcp_request_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    return NextResponse.json({
      logs: transformedLogs,
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasMore: (count || 0) > offset + limit
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