import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || 'month' // day, week, month, year
    const includeDetails = searchParams.get('details') === 'true'

    // Calculate date range based on timeframe
    const now = new Date()
    let startDate: Date
    
    switch (timeframe) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
    }

    // Get comprehensive usage sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('usage_sessions')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(includeDetails ? 1000 : 100)

    if (sessionsError) {
      return NextResponse.json({ error: sessionsError.message }, { status: 500 })
    }

    // Get monthly summary for current period
    const { data: monthlySummary } = await supabase
      .from('monthly_usage_summary')
      .select('*')
      .eq('user_id', user.id)
      .eq('year', now.getFullYear())
      .eq('month', now.getMonth() + 1)
      .single()

    // Get current credit balance
    const { data: credits } = await supabase
      .from('user_credits')
      .select('balance, promotional_balance, total_purchased, total_spent, promotional_total')
      .eq('user_id', user.id)
      .single()

    // Get active promotional credits
    const { data: activePromoCredits } = await supabase
      .from('promotional_credits')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .gt('amount', 'used_amount')

    // Calculate statistics
    const stats = {
      total_messages: 0,
      api_key_messages: 0,
      credit_messages: 0,
      cli_tool_messages: 0,
      total_tokens: 0,
      total_cost_usd: 0,
      total_credits_used: 0,
      promotional_credits_used: 0,
      unique_models: new Set(),
      unique_providers: new Set(),
      unique_tools: new Set()
    }

    // Process sessions
    sessions?.forEach(session => {
      stats.total_messages += session.message_count || 0
      stats.total_tokens += session.total_tokens || 0
      stats.total_cost_usd += parseFloat(session.cost_usd || '0')
      stats.total_credits_used += parseFloat(session.cost_credits || '0')
      stats.promotional_credits_used += parseFloat(session.promotional_credits_used || '0')

      if (session.model_name) stats.unique_models.add(session.model_name)
      if (session.provider) stats.unique_providers.add(session.provider)
      if (session.tool_name) stats.unique_tools.add(session.tool_name)

      switch (session.session_type) {
        case 'api_key':
          stats.api_key_messages += session.message_count || 0
          break
        case 'credits':
          stats.credit_messages += session.message_count || 0
          break
        case 'cli_tool':
          stats.cli_tool_messages += session.message_count || 0
          break
      }
    })

    // Group sessions by type and tool for breakdown
    type BreakdownItem = {
      messages: number
      tokens: number
      cost_usd: number
      cost_credits: number
      sessions: number
    }
    
    type BreakdownData = {
      api_keys: Record<string, BreakdownItem>
      credits: Record<string, BreakdownItem>
      cli_tools: Record<string, BreakdownItem>
    }
    
    const breakdown: BreakdownData = {
      api_keys: {},
      credits: {},
      cli_tools: {}
    }

    sessions?.forEach(session => {
      const key = session.session_type as keyof BreakdownData
      const toolKey = session.tool_name || session.provider || 'unknown'
      
      if (!breakdown[key][toolKey]) {
        breakdown[key][toolKey] = {
          messages: 0,
          tokens: 0,
          cost_usd: 0,
          cost_credits: 0,
          sessions: 0
        }
      }

      const item = breakdown[key][toolKey]
      item.messages += session.message_count || 0
      item.tokens += session.total_tokens || 0
      item.cost_usd += parseFloat(session.cost_usd || '0')
      item.cost_credits += parseFloat(session.cost_credits || '0')
      item.sessions += 1
    })

    // Daily/hourly breakdown for charts
    type TimeSeriesItem = {
      messages: number
      tokens: number
      cost_usd: number
      cost_credits: number
      api_key: number
      credits: number
      cli_tools: number
    }
    
    const timeSeriesData: Record<string, TimeSeriesItem> = {}
    sessions?.forEach(session => {
      const date = new Date(session.created_at)
      const key = timeframe === 'day' 
        ? date.getHours().toString().padStart(2, '0') + ':00'
        : date.toISOString().split('T')[0]

      if (!timeSeriesData[key]) {
        timeSeriesData[key] = {
          messages: 0,
          tokens: 0,
          cost_usd: 0,
          cost_credits: 0,
          api_key: 0,
          credits: 0,
          cli_tools: 0
        }
      }

      const item = timeSeriesData[key]
      item.messages += session.message_count || 0
      item.tokens += session.total_tokens || 0
      item.cost_usd += parseFloat(session.cost_usd || '0')
      item.cost_credits += parseFloat(session.cost_credits || '0')
      
      switch (session.session_type) {
        case 'api_key':
          item.api_key += session.message_count || 0
          break
        case 'credits':
          item.credits += session.message_count || 0
          break
        case 'cli_tool':
          item.cli_tools += session.message_count || 0
          break
      }
    })

    const response = {
      timeframe,
      period: {
        start: startDate.toISOString(),
        end: now.toISOString()
      },
      summary: {
        total_messages: stats.total_messages,
        total_tokens: stats.total_tokens,
        total_cost_usd: parseFloat(stats.total_cost_usd.toFixed(4)),
        total_credits_used: parseFloat(stats.total_credits_used.toFixed(4)),
        promotional_credits_used: parseFloat(stats.promotional_credits_used.toFixed(4)),
        usage_paths: {
          api_key_messages: stats.api_key_messages,
          credit_messages: stats.credit_messages,
          cli_tool_messages: stats.cli_tool_messages
        },
        unique_models: Array.from(stats.unique_models),
        unique_providers: Array.from(stats.unique_providers),
        unique_tools: Array.from(stats.unique_tools)
      },
      current_balance: {
        total: (credits?.balance || 0) + (credits?.promotional_balance || 0),
        purchased: credits?.balance || 0,
        promotional: credits?.promotional_balance || 0,
        lifetime_purchased: credits?.total_purchased || 0,
        lifetime_spent: credits?.total_spent || 0,
        promotional_total: credits?.promotional_total || 0
      },
      breakdown,
      time_series: timeSeriesData,
      monthly_summary: monthlySummary,
      active_promotional_credits: activePromoCredits?.map(pc => ({
        id: pc.id,
        amount: pc.amount,
        used: pc.used_amount,
        remaining: pc.amount - pc.used_amount,
        reason: pc.reason,
        expires_at: pc.expires_at,
        granted_at: pc.granted_at
      })) || []
    }

    if (includeDetails) {
      response.sessions = sessions?.map(session => ({
        id: session.id,
        session_type: session.session_type,
        tool_name: session.tool_name,
        model_name: session.model_name,
        provider: session.provider,
        message_count: session.message_count,
        total_tokens: session.total_tokens,
        cost_credits: session.cost_credits,
        cost_usd: session.cost_usd,
        created_at: session.created_at,
        metadata: session.metadata
      }))
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Comprehensive usage fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Track CLI usage (called by CLI monitoring system)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // This endpoint can be called by CLI monitoring or service integrations
    const authHeader = request.headers.get('authorization')
    const isServiceRole = authHeader?.startsWith('Bearer ') && 
      authHeader.includes(process.env.SUPABASE_SERVICE_ROLE_KEY || '')

    let userId: string

    if (isServiceRole) {
      // Service role request - user_id should be in body
      const { user_id } = await request.json()
      userId = user_id
    } else {
      // Regular user request
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      userId = user.id
    }

    const {
      session_type,
      tool_name,
      model_name,
      provider,
      message_count = 1,
      input_tokens = 0,
      output_tokens = 0,
      cost_usd = 0,
      cost_credits = 0,
      promotional_credits_used = 0,
      metadata = {}
    } = await request.json()

    if (!session_type || !['api_key', 'credits', 'cli_tool'].includes(session_type)) {
      return NextResponse.json({ 
        error: 'Valid session_type required (api_key, credits, cli_tool)' 
      }, { status: 400 })
    }

    // Use service role for tracking
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    )

    // Track the usage session
    const { data: sessionId, error } = await serviceClient.rpc('track_usage_session', {
      p_user_id: userId,
      p_session_type: session_type,
      p_tool_name: tool_name,
      p_model_name: model_name,
      p_provider: provider,
      p_message_count: message_count,
      p_input_tokens: input_tokens,
      p_output_tokens: output_tokens,
      p_cost_usd: cost_usd,
      p_cost_credits: cost_credits,
      p_metadata: metadata
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      session_id: sessionId,
      message: 'Usage tracked successfully'
    })

  } catch (error) {
    console.error('Usage tracking error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}