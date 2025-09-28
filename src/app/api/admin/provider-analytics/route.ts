'use server'

import { NextRequest, NextResponse } from 'next/server'

// This endpoint now serves as a wrapper/aggregator for data retrieved via Supabase MCP
// The actual data fetching will be done through MCP calls in the frontend components

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const provider = url.searchParams.get('provider')
    const userId = url.searchParams.get('userId')
    const timeRange = url.searchParams.get('timeRange') || '7d'

    // Return metadata about available analytics queries
    // The actual data will be fetched using MCP calls
    const availableQueries = {
      keyUsageStats: {
        description: 'Get usage statistics for API keys',
        mcpQuery: `
          SELECT
            uk.id,
            uk.provider,
            uk.key_name,
            uk.priority_order,
            uk.monthly_budget,
            uk.daily_limit,
            uk.current_usage,
            uk.daily_usage,
            uk.active,
            uk.last_used_at,
            COUNT(aul.id) as total_calls,
            SUM(CASE WHEN aul.success THEN 1 ELSE 0 END) as successful_calls,
            SUM(aul.cost) as total_cost,
            SUM(aul.tokens_used) as total_tokens
          FROM user_api_keys uk
          LEFT JOIN api_key_usage_logs aul ON uk.id = aul.api_key_id
          WHERE uk.provider = '${provider || 'anthropic'}'
          ${userId ? `AND uk.user_id = '${userId}'` : ''}
          AND aul.timestamp >= NOW() - INTERVAL '${timeRange}'
          GROUP BY uk.id
          ORDER BY uk.priority_order
        `
      },

      providerOverview: {
        description: 'Get overview statistics by provider',
        mcpQuery: `
          SELECT
            provider,
            COUNT(*) as total_keys,
            COUNT(CASE WHEN active THEN 1 END) as active_keys,
            SUM(current_usage) as total_usage,
            SUM(monthly_budget) as total_budget,
            AVG(current_usage / NULLIF(monthly_budget, 0) * 100) as avg_utilization
          FROM user_api_keys
          ${provider ? `WHERE provider = '${provider}'` : ''}
          ${userId ? `${provider ? 'AND' : 'WHERE'} user_id = '${userId}'` : ''}
          GROUP BY provider
          ORDER BY total_usage DESC
        `
      },

      usageTrends: {
        description: 'Get usage trends over time',
        mcpQuery: `
          SELECT
            DATE_TRUNC('hour', aul.timestamp) as hour,
            uk.provider,
            uk.key_name,
            COUNT(*) as calls,
            SUM(aul.cost) as cost,
            SUM(aul.tokens_used) as tokens,
            AVG(CASE WHEN aul.success THEN 1.0 ELSE 0.0 END) as success_rate
          FROM api_key_usage_logs aul
          JOIN user_api_keys uk ON aul.api_key_id = uk.id
          WHERE aul.timestamp >= NOW() - INTERVAL '${timeRange}'
          ${provider ? `AND uk.provider = '${provider}'` : ''}
          ${userId ? `AND uk.user_id = '${userId}'` : ''}
          GROUP BY DATE_TRUNC('hour', aul.timestamp), uk.provider, uk.key_name
          ORDER BY hour DESC
        `
      },

      errorAnalysis: {
        description: 'Analyze errors by type and key',
        mcpQuery: `
          SELECT
            uk.provider,
            uk.key_name,
            aul.error_type,
            COUNT(*) as error_count,
            COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY uk.id) as error_percentage
          FROM api_key_usage_logs aul
          JOIN user_api_keys uk ON aul.api_key_id = uk.id
          WHERE aul.success = false
          AND aul.timestamp >= NOW() - INTERVAL '${timeRange}'
          ${provider ? `AND uk.provider = '${provider}'` : ''}
          ${userId ? `AND uk.user_id = '${userId}'` : ''}
          GROUP BY uk.provider, uk.key_name, aul.error_type
          ORDER BY error_count DESC
        `
      },

      costBreakdown: {
        description: 'Cost breakdown by provider and key',
        mcpQuery: `
          SELECT
            uk.provider,
            uk.key_name,
            uk.monthly_budget,
            uk.current_usage,
            (uk.current_usage / NULLIF(uk.monthly_budget, 0) * 100) as budget_utilization,
            COUNT(aul.id) as api_calls,
            SUM(aul.cost) as total_cost,
            AVG(aul.cost) as avg_cost_per_call
          FROM user_api_keys uk
          LEFT JOIN api_key_usage_logs aul ON uk.id = aul.api_key_id
          WHERE aul.timestamp >= NOW() - INTERVAL '${timeRange}' OR aul.id IS NULL
          ${provider ? `AND uk.provider = '${provider}'` : ''}
          ${userId ? `AND uk.user_id = '${userId}'` : ''}
          GROUP BY uk.id, uk.provider, uk.key_name, uk.monthly_budget, uk.current_usage
          ORDER BY total_cost DESC
        `
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Use Supabase MCP server to execute these queries',
      availableQueries,
      instructions: {
        note: 'Use the mcp__supabase__execute_sql tool with the provided queries',
        timeRanges: {
          '1h': '1 hour',
          '6h': '6 hours',
          '1d': '1 day',
          '7d': '7 days',
          '30d': '30 days'
        },
        providers: ['anthropic', 'openai', 'xai', 'google', 'cerebras', 'zai']
      }
    })

  } catch (error) {
    console.error('Error in provider analytics API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}