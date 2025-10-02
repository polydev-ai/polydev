'use server'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Get authenticated user from request
async function getAuthenticatedUser(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()

    let accessToken = null

    for (const cookie of allCookies) {
      if (cookie.name.includes('auth-token')) {
        try {
          let decoded = cookie.value

          if (cookie.value.startsWith('base64-')) {
            decoded = Buffer.from(cookie.value.substring(7), 'base64').toString('utf-8')
          }

          const parsed = JSON.parse(decoded)
          if (parsed.access_token) {
            accessToken = parsed.access_token
            break
          }
        } catch (e) {
          continue
        }
      }
    }

    if (!accessToken) {
      return null
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: { user }, error } = await supabase.auth.getUser(accessToken)

    if (error || !user) {
      return null
    }

    return user
  } catch (error) {
    console.error('Error in getAuthenticatedUser:', error)
    return null
  }
}

function getTimeRangeHours(timeRange: string): number {
  const ranges: Record<string, number> = {
    '1h': 1,
    '6h': 6,
    '1d': 24,
    '7d': 168,
    '30d': 720
  }
  return ranges[timeRange] || 168
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const url = new URL(request.url)
    const provider = url.searchParams.get('provider')
    const timeRange = url.searchParams.get('timeRange') || '7d'
    const showAll = url.searchParams.get('showAll') === 'true'

    const hoursAgo = getTimeRangeHours(timeRange)
    const startTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString()

    // Get key usage stats with actual data from usage logs
    let keysQuery = supabase
      .from('user_api_keys')
      .select('id, provider, key_name, priority_order, monthly_budget, daily_limit, current_usage, daily_usage, active, last_used_at')
      .eq('is_admin_key', true)

    if (!showAll) {
      keysQuery = keysQuery.eq('user_id', user.id)
    }

    if (provider && provider !== 'all') {
      keysQuery = keysQuery.eq('provider', provider)
    }

    const { data: keys, error: keysError } = await keysQuery

    if (keysError) {
      console.error('Error fetching keys:', keysError)
      return NextResponse.json({ error: 'Failed to fetch keys' }, { status: 500 })
    }

    // Fetch usage logs for each key from perspective_usage
    const keyUsageStats = await Promise.all(
      (keys || []).map(async (key) => {
        const { data: logs } = await supabase
          .from('perspective_usage')
          .select('estimated_cost, input_tokens, output_tokens, status')
          .eq('provider_source_id', key.id)
          .gte('created_at', startTime)

        const totalCalls = logs?.length || 0
        const successfulCalls = logs?.filter(l => l.status !== 'error').length || 0
        const totalCost = logs?.reduce((sum, l) => sum + (l.estimated_cost || 0), 0) || 0
        const totalTokens = logs?.reduce((sum, l) => sum + (l.input_tokens || 0) + (l.output_tokens || 0), 0) || 0

        return {
          ...key,
          total_calls: totalCalls,
          successful_calls: successfulCalls,
          total_cost: totalCost,
          total_tokens: totalTokens,
          success_rate: totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0
        }
      })
    )

    // Calculate provider overview
    const providerGroups = keyUsageStats.reduce((acc: any, key) => {
      if (!acc[key.provider]) {
        acc[key.provider] = {
          provider: key.provider,
          total_keys: 0,
          active_keys: 0,
          total_usage: 0,
          total_budget: 0,
          total_calls: 0,
          successful_calls: 0
        }
      }

      acc[key.provider].total_keys++
      if (key.active) acc[key.provider].active_keys++
      acc[key.provider].total_usage += key.current_usage || 0
      acc[key.provider].total_budget += key.monthly_budget || 0
      acc[key.provider].total_calls += key.total_calls || 0
      acc[key.provider].successful_calls += key.successful_calls || 0

      return acc
    }, {})

    const providerOverview = Object.values(providerGroups).map((p: any) => ({
      ...p,
      avg_utilization: p.total_budget > 0 ? (p.total_usage / p.total_budget) * 100 : 0,
      success_rate: p.total_calls > 0 ? (p.successful_calls / p.total_calls) * 100 : 0
    }))

    // Get error analysis from perspective_usage
    const keyIds = (keys || []).map(k => k.id)
    let errorQuery = supabase
      .from('perspective_usage')
      .select('provider_source_id, error_message, status')
      .eq('status', 'error')
      .gte('created_at', startTime)

    if (keyIds.length > 0) {
      errorQuery = errorQuery.in('provider_source_id', keyIds)
    }

    const { data: errorLogs } = await errorQuery

    const errorsByKey = (errorLogs || []).reduce((acc: any, log) => {
      const key = keys?.find(k => k.id === log.provider_source_id)
      if (!key) return acc

      // Extract error type from error message (e.g., "HTTP 401", "timeout", etc.)
      const errorType = log.error_message?.split(':')[0]?.trim() || 'unknown'
      const errorKey = `${key.provider}:${key.key_name}:${errorType}`
      if (!acc[errorKey]) {
        acc[errorKey] = {
          provider: key.provider,
          key_name: key.key_name,
          error_type: errorType,
          error_count: 0
        }
      }
      acc[errorKey].error_count++
      return acc
    }, {})

    const errorAnalysis = Object.values(errorsByKey)

    // Cost breakdown
    const costBreakdown = keyUsageStats.map(key => ({
      provider: key.provider,
      key_name: key.key_name,
      monthly_budget: key.monthly_budget,
      current_usage: key.current_usage,
      budget_utilization: key.monthly_budget ? (key.current_usage / key.monthly_budget) * 100 : 0,
      api_calls: key.total_calls,
      total_cost: key.total_cost,
      avg_cost_per_call: key.total_calls > 0 ? key.total_cost / key.total_calls : 0
    }))

    // Get available providers from actual data
    const availableProviders = [...new Set((keys || []).map(k => k.provider))]
      .sort()
      .map(p => ({ id: p, name: p.charAt(0).toUpperCase() + p.slice(1) }))

    return NextResponse.json({
      success: true,
      data: {
        keyUsageStats,
        providerOverview,
        errorAnalysis,
        costBreakdown,
        availableProviders,
        timeRange,
        startTime
      }
    })

  } catch (error) {
    console.error('Error in provider analytics API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
