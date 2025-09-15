import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { createClient as createServerClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    
    const timeframe = searchParams.get('timeframe') || '30d'
    const provider = searchParams.get('provider')
    const model = searchParams.get('model')
    const costMin = searchParams.get('cost_min') ? parseFloat(searchParams.get('cost_min')!) : undefined
    const costMax = searchParams.get('cost_max') ? parseFloat(searchParams.get('cost_max')!) : undefined
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const format = searchParams.get('format') || 'json'
    const groupBy = searchParams.get('group_by') || 'day'
    const includeComparison = searchParams.get('include_comparison') === 'true'

    const serviceSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let dateFrom = new Date()
    let dateTo = new Date()

    if (startDate && endDate) {
      dateFrom = new Date(startDate)
      dateTo = new Date(endDate)
    } else {
      switch (timeframe) {
        case '24h':
          dateFrom = new Date(Date.now() - 24 * 60 * 60 * 1000)
          break
        case '7d':
          dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
        case '30d':
          dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          break
        case '90d':
          dateFrom = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
          break
        case '1y':
          dateFrom = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
          break
        default:
          dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      }
    }

    let query = serviceSupabase
      .from('usage_sessions')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', dateFrom.toISOString())
      .lte('created_at', dateTo.toISOString())

    if (provider) {
      query = query.eq('provider', provider)
    }

    if (model) {
      query = query.eq('model_name', model)
    }

    if (costMin !== undefined) {
      query = query.gte('cost', costMin)
    }

    if (costMax !== undefined) {
      query = query.lte('cost', costMax)
    }

    query = query.order('created_at', { ascending: false })

    const { data: sessions, error: sessionsError } = await query

    if (sessionsError) {
      console.error('[Usage Comprehensive] Error fetching sessions:', sessionsError)
      return NextResponse.json({ error: 'Failed to fetch usage data' }, { status: 500 })
    }

    let comparisonData = null
    if (includeComparison) {
      const comparisonDateFrom = new Date(dateFrom.getTime() - (dateTo.getTime() - dateFrom.getTime()))
      const comparisonDateTo = new Date(dateFrom.getTime())

      let comparisonQuery = serviceSupabase
        .from('usage_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', comparisonDateFrom.toISOString())
        .lte('created_at', comparisonDateTo.toISOString())

      if (provider) comparisonQuery = comparisonQuery.eq('provider', provider)
      if (model) comparisonQuery = comparisonQuery.eq('model_name', model)
      if (costMin !== undefined) comparisonQuery = comparisonQuery.gte('cost', costMin)
      if (costMax !== undefined) comparisonQuery = comparisonQuery.lte('cost', costMax)

      const { data: comparisonSessions } = await comparisonQuery
      comparisonData = comparisonSessions || []
    }

    const aggregateData = (data: any[]) => {
      const totalCost = data.reduce((sum, session) => sum + (parseFloat(session.cost) || 0), 0)
      const totalTokens = data.reduce((sum, session) => sum + (session.tokens_used || session.total_tokens || 0), 0)
      const totalSessions = data.length

      const providerStats = data.reduce((acc, session) => {
        const provider = session.provider || 'unknown'
        if (!acc[provider]) {
          acc[provider] = { cost: 0, tokens: 0, sessions: 0 }
        }
        acc[provider].cost += parseFloat(session.cost) || 0
        acc[provider].tokens += session.tokens_used || session.total_tokens || 0
        acc[provider].sessions += 1
        return acc
      }, {} as Record<string, { cost: number; tokens: number; sessions: number }>)

      const modelStats = data.reduce((acc, session) => {
        const model = session.model_name || 'unknown'
        if (!acc[model]) {
          acc[model] = { cost: 0, tokens: 0, sessions: 0 }
        }
        acc[model].cost += parseFloat(session.cost) || 0
        acc[model].tokens += session.tokens_used || session.total_tokens || 0
        acc[model].sessions += 1
        return acc
      }, {} as Record<string, { cost: number; tokens: number; sessions: number }>)

      const timeSeriesData = data.reduce((acc, session) => {
        const date = new Date(session.created_at)
        let key: string

        switch (groupBy) {
          case 'hour':
            key = date.toISOString().slice(0, 13) + ':00:00.000Z'
            break
          case 'day':
            key = date.toISOString().slice(0, 10)
            break
          case 'week':
            const weekStart = new Date(date)
            weekStart.setDate(date.getDate() - date.getDay())
            key = weekStart.toISOString().slice(0, 10)
            break
          case 'month':
            key = date.toISOString().slice(0, 7)
            break
          default:
            key = date.toISOString().slice(0, 10)
        }

        if (!acc[key]) {
          acc[key] = { cost: 0, tokens: 0, sessions: 0, date: key }
        }
        acc[key].cost += parseFloat(session.cost) || 0
        acc[key].tokens += session.tokens_used || session.total_tokens || 0
        acc[key].sessions += 1
        return acc
      }, {} as Record<string, { cost: number; tokens: number; sessions: number; date: string }>)

      return {
        totalCost: parseFloat(totalCost.toFixed(6)),
        totalTokens,
        totalSessions,
        avgCostPerSession: totalSessions > 0 ? parseFloat((totalCost / totalSessions).toFixed(6)) : 0,
        avgTokensPerSession: totalSessions > 0 ? Math.round(totalTokens / totalSessions) : 0,
        providerStats: Object.entries(providerStats).map(([provider, stats]) => {
          const typedStats = stats as { cost: number; tokens: number; sessions: number }
          return {
            provider,
            cost: parseFloat(typedStats.cost.toFixed(6)),
            tokens: typedStats.tokens,
            sessions: typedStats.sessions,
            avgCostPerSession: typedStats.sessions > 0 ? parseFloat((typedStats.cost / typedStats.sessions).toFixed(6)) : 0
          }
        }).sort((a, b) => b.cost - a.cost),
        modelStats: Object.entries(modelStats).map(([model, stats]) => {
          const typedStats = stats as { cost: number; tokens: number; sessions: number }
          return {
            model,
            cost: parseFloat(typedStats.cost.toFixed(6)),
            tokens: typedStats.tokens,
            sessions: typedStats.sessions,
            avgCostPerSession: typedStats.sessions > 0 ? parseFloat((typedStats.cost / typedStats.sessions).toFixed(6)) : 0
          }
        }).sort((a, b) => b.cost - a.cost),
        timeSeries: Object.values(timeSeriesData).sort((a, b) => {
          const typedA = a as { cost: number; tokens: number; sessions: number; date: string }
          const typedB = b as { cost: number; tokens: number; sessions: number; date: string }
          return typedA.date.localeCompare(typedB.date)
        })
      }
    }

    const currentPeriod = aggregateData(sessions || [])
    const previousPeriod = comparisonData ? aggregateData(comparisonData) : null

    const comparison = previousPeriod ? {
      costChange: currentPeriod.totalCost - previousPeriod.totalCost,
      costChangePercent: previousPeriod.totalCost > 0 ? 
        parseFloat(((currentPeriod.totalCost - previousPeriod.totalCost) / previousPeriod.totalCost * 100).toFixed(2)) : 0,
      tokensChange: currentPeriod.totalTokens - previousPeriod.totalTokens,
      tokensChangePercent: previousPeriod.totalTokens > 0 ? 
        parseFloat(((currentPeriod.totalTokens - previousPeriod.totalTokens) / previousPeriod.totalTokens * 100).toFixed(2)) : 0,
      sessionsChange: currentPeriod.totalSessions - previousPeriod.totalSessions,
      sessionsChangePercent: previousPeriod.totalSessions > 0 ? 
        parseFloat(((currentPeriod.totalSessions - previousPeriod.totalSessions) / previousPeriod.totalSessions * 100).toFixed(2)) : 0
    } : null

    const responseData = {
      summary: currentPeriod,
      previousPeriod,
      comparison,
      sessions: sessions?.map(session => ({
        id: session.id,
        createdAt: session.created_at,
        provider: session.provider,
        model: session.model_name,
        tokens: session.tokens_used || session.total_tokens || 0,
        cost: parseFloat(session.cost) || 0,
        source: session.metadata?.fallback_method === 'credits' ? 'Credits' : 
                (session.metadata?.fallback_method === 'cli' ? 'CLI' : 'API'),
        app: session.metadata?.app || 'Polydev Multi-LLM Platform',
        finishReason: session.metadata?.finish || 'stop',
        tps: session.metadata?.tps || null
      })) || [],
      filters: {
        timeframe,
        provider,
        model,
        costMin,
        costMax,
        startDate: dateFrom.toISOString(),
        endDate: dateTo.toISOString(),
        groupBy
      },
      meta: {
        totalResults: sessions?.length || 0,
        generatedAt: new Date().toISOString(),
        userId: user.id
      }
    }

    if (format === 'csv') {
      const csvHeaders = [
        'Date',
        'Provider',
        'Model',
        'Tokens Used',
        'Cost (USD)',
        'Source',
        'App',
        'Finish Reason',
        'TPS'
      ]

      const csvRows = responseData.sessions.map(session => [
        new Date(session.createdAt).toISOString(),
        session.provider || '',
        session.model || '',
        session.tokens.toString(),
        session.cost.toFixed(6),
        session.source || '',
        session.app || '',
        session.finishReason || '',
        session.tps?.toString() || ''
      ])

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n')

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="usage-export-${dateFrom.toISOString().slice(0, 10)}-to-${dateTo.toISOString().slice(0, 10)}.csv"`
        }
      })
    }

    return NextResponse.json(responseData)

  } catch (error) {
    console.error('[Usage Comprehensive] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch comprehensive usage data' },
      { status: 500 }
    )
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