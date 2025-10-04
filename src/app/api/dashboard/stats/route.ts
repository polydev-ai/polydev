import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../utils/supabase/server'
import { subscriptionManager } from '@/lib/subscriptionManager'

// Simple in-memory cache for expensive computations
const statsCache = new Map<string, { data: any; timestamp: number; ttl: number }>()

function getCachedData(key: string): any | null {
  const cached = statsCache.get(key)
  if (cached && Date.now() < cached.timestamp + cached.ttl) {
    return cached.data
  }
  statsCache.delete(key)
  return null
}

function setCachedData(key: string, data: any, ttl: number = 10000): void {
  statsCache.set(key, { data, timestamp: Date.now(), ttl })
}

export async function GET(request: NextRequest) {
  try {
    // Use service role for comprehensive stats access
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

    console.log('[Dashboard Stats] Fetching real statistics for user:', user.id)

    // Check cache first
    const cacheKey = `dashboard-stats-${user.id}`
    const cachedStats = getCachedData(cacheKey)
    if (cachedStats) {
      console.log('[Dashboard Stats] Returning cached data')
      return NextResponse.json(cachedStats)
    }

    // Get real data from database tables
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // Execute all database queries in parallel for much better performance
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    console.log('[Dashboard Stats] Executing parallel database queries...')

    const [
      userCreditsResult,
      mcpTokensResult,
      allTokensResult,
      userTokensResult,
      apiKeysResult,
      providersResult,
      requestLogsResult,
      usageLogsResult,
      chatLogsResult,
      allTimeRequestLogsResult,
      allTimeChatLogsResult,
      providersRegistryResult
    ] = await Promise.allSettled([
      // 0. User credits
      supabase
        .from('user_credits')
        .select('balance, promotional_balance')
        .eq('user_id', user.id)
        .single(),

      // 1. MCP access tokens
      supabase
        .from('mcp_access_tokens')
        .select('*')
        .eq('user_id', user.id)
        .eq('revoked', false),

      // 2. All tokens for usage calculation
      supabase
        .from('mcp_access_tokens')
        .select('created_at, last_used_at, client_id, expires_at')
        .eq('user_id', user.id),

      // 3. MCP user tokens (legacy)
      supabase
        .from('mcp_user_tokens')
        .select('created_at, last_used_at, active')
        .eq('user_id', user.id),

      // 4. User API keys
      supabase
        .from('user_api_keys')
        .select('provider, created_at, last_used_at, active, current_usage, monthly_budget, max_tokens')
        .eq('user_id', user.id),

      // 5. Provider configurations
      supabase
        .from('provider_configurations')
        .select('*'),

      // 6. Request logs (this month only) - for message counting and API calls
      supabase
        .from('mcp_request_logs')
        .select('total_tokens, total_cost, created_at, provider_responses, response_time_ms, status, successful_providers, failed_providers, provider_costs')
        .eq('user_id', user.id)
        .gte('created_at', monthStart.toISOString())
        .limit(500), // Limit to prevent excessive processing

      // 7. Usage logs fallback (this month only)
      supabase
        .from('mcp_usage_logs')
        .select('total_tokens, total_cost, created_at, models_used, response_time_ms, status')
        .eq('user_id', user.id)
        .gte('created_at', monthStart.toISOString())
        .limit(500),

      // 8. Chat logs (this month only) - 1 row = 1 user message
      supabase
        .from('chat_logs')
        .select('total_tokens, total_cost, created_at, models_used, response_time_ms')
        .eq('user_id', user.id)
        .gte('created_at', monthStart.toISOString())
        .limit(500),

      // 9. All-time request logs for display only (count only)
      supabase
        .from('mcp_request_logs')
        .select('id')
        .eq('user_id', user.id),

      // 10. All-time chat logs for display only (count only)
      supabase
        .from('chat_logs')
        .select('id')
        .eq('user_id', user.id),

      // 11. Providers registry for display names/logos
      supabase
        .from('providers_registry')
        .select('*')
        .eq('is_active', true)
    ])

    // Extract data from parallel results
    const userCredits = userCreditsResult.status === 'fulfilled' ? userCreditsResult.value.data : null
    const mcpTokens = mcpTokensResult.status === 'fulfilled' ? mcpTokensResult.value.data : []
    const allTokens = allTokensResult.status === 'fulfilled' ? allTokensResult.value.data : []
    const userTokens = userTokensResult.status === 'fulfilled' ? userTokensResult.value.data : []
    const apiKeys = apiKeysResult.status === 'fulfilled' ? apiKeysResult.value.data : []
    const providers = providersResult.status === 'fulfilled' ? providersResult.value.data : []
    const requestLogs = requestLogsResult.status === 'fulfilled' ? requestLogsResult.value.data : []
    const usageLogs = usageLogsResult.status === 'fulfilled' ? usageLogsResult.value.data : []
    const chatLogs = chatLogsResult.status === 'fulfilled' ? chatLogsResult.value.data : []
    const allTimeRequestLogs = allTimeRequestLogsResult.status === 'fulfilled' ? allTimeRequestLogsResult.value.data : []
    const allTimeChatLogs = allTimeChatLogsResult.status === 'fulfilled' ? allTimeChatLogsResult.value.data : []
    const modelsDevProviders = providersRegistryResult.status === 'fulfilled' ? providersRegistryResult.value.data : []

    console.log('[Dashboard Stats] Parallel queries completed (MONTHLY + ALL-TIME DATA):', {
      userCredits: !!userCredits,
      mcpTokens: mcpTokens?.length || 0,
      allTokens: allTokens?.length || 0,
      userTokens: userTokens?.length || 0,
      apiKeys: apiKeys?.length || 0,
      providers: providers?.length || 0,
      requestLogsMonthly: requestLogs?.length || 0,
      chatLogsMonthly: chatLogs?.length || 0,
      requestLogsAllTime: allTimeRequestLogs?.length || 0,
      chatLogsAllTime: allTimeChatLogs?.length || 0,
      modelsDevProviders: modelsDevProviders?.length || 0
    })

    const currentBalance = parseFloat(userCredits?.balance || '0')
    const currentPromoBalance = parseFloat(userCredits?.promotional_balance || '0')
    const totalUserCredits = currentBalance + currentPromoBalance

    // Calculate active connections
    const activeTokens = mcpTokens?.filter(token => {
      const expiresAt = new Date(token.expires_at)
      const lastUsed = token.last_used_at ? new Date(token.last_used_at) : null
      const recentlyUsed = lastUsed ? (now.getTime() - lastUsed.getTime()) < 7 * 24 * 60 * 60 * 1000 : false // 7 days
      return expiresAt > now && recentlyUsed
    }) || []

    // Use detailed logs if available, otherwise fallback to simple logs
    const usageData = requestLogs && requestLogs.length > 0 ? requestLogs : usageLogs
    console.log('[Dashboard Stats] Using data source:', requestLogs && requestLogs.length > 0 ? 'detailed request logs' : 'simple usage logs')

    // Use the most comprehensive data source available, prioritizing detailed request logs
    let primaryDataSource: any[] = []
    let dataSourceName = 'none'

    if (requestLogs && requestLogs.length > 0) {
      primaryDataSource = requestLogs
      dataSourceName = 'detailed request logs'
    } else if (usageLogs && usageLogs.length > 0) {
      primaryDataSource = usageLogs
      dataSourceName = 'usage logs'
    } else if (chatLogs && chatLogs.length > 0) {
      primaryDataSource = chatLogs
      dataSourceName = 'chat logs'
    }

    console.log(`[Dashboard Stats] Using primary data source: ${dataSourceName} with ${primaryDataSource.length} entries`)

    // Calculate real statistics from primary data source to avoid duplication
    const totalTokens = (allTokens?.length || 0) + (userTokens?.length || 0)
    const activeConnections = activeTokens.length

    // Calculate TOTAL messages from BOTH MCP calls AND web chat sessions THIS MONTH
    // Use monthly-filtered logs to match subscription and profile pages
    const mcpMessages = (requestLogs || []).length
    const chatMessages_count = (chatLogs || []).length
    const totalMessages = mcpMessages + chatMessages_count // Total user interactions (MCP + Chat, this month)

    // Calculate ALL-TIME message counts for display
    const allTimeMcpMessages = (allTimeRequestLogs || []).length
    const allTimeChatMessages = (allTimeChatLogs || []).length
    const allTimeTotalMessages = allTimeMcpMessages + allTimeChatMessages

    // Calculate ACTUAL API calls (sum of all model/provider calls THIS MONTH)
    // Use monthly-filtered logs for API calls count
    const mcpApiCalls = (requestLogs || []).reduce((sum, log) => {
      // Count providers in provider_responses format (this is what we select in the query)
      if (log.provider_responses && typeof log.provider_responses === 'object') {
        return sum + Object.keys(log.provider_responses).length
      }
      // Count from successful_providers array
      if (log.successful_providers && Array.isArray(log.successful_providers)) {
        return sum + log.successful_providers.length
      }
      // Fallback: count as 1 API call if we have cost/tokens
      if (log.total_cost || log.total_tokens) {
        return sum + 1
      }
      return sum
    }, 0)

    const chatApiCalls = (chatLogs || []).reduce((sum, log) => {
      // Count models in models_used format
      if (log.models_used && typeof log.models_used === 'object') {
        const modelsUsed = Array.isArray(log.models_used) ? log.models_used : Object.keys(log.models_used)
        return sum + modelsUsed.length
      }
      // Fallback: count as 1 API call if we have cost/tokens
      if (log.total_cost || log.total_tokens) {
        return sum + 1
      }
      return sum
    }, 0)

    const totalApiCalls = mcpApiCalls + chatApiCalls // Total model/provider calls (this month)

    console.log('[Dashboard Stats] Messages vs API calls breakdown (THIS MONTH):', {
      userId: user.id,
      mcpMessages,
      chatMessages: chatMessages_count,
      totalMessages: totalMessages,
      mcpApiCalls,
      chatApiCalls,
      totalApiCalls,
      requestLogsRaw: requestLogs?.slice(0, 2),
      chatLogsRaw: chatLogs?.slice(0, 2),
      description: `${totalMessages} user requests this month resulted in ${totalApiCalls} model/provider API calls`
    })

    // Count MCP token usage for reference (not the same as client calls)
    const mcpTokenUsage = (allTokens?.filter(token => token.last_used_at).length || 0) + (userTokens?.filter(token => token.last_used_at).length || 0)

    // Calculate total tokens from both sources
    const mcpTokenCount = (requestLogs || []).reduce((sum, log) => sum + (log.total_tokens || 0), 0) || 0
    const chatTokens = (chatLogs || []).reduce((sum, log) => sum + (log.total_tokens || 0), 0) || 0
    const totalUsageTokens = mcpTokenCount + chatTokens

    // Calculate costs - ONLY from user API keys and CLI (NOT admin credits)
    // Query perspective_usage to get source_type information
    const { data: perspectiveUsage } = await supabase
      .from('perspective_usage')
      .select('estimated_cost, request_metadata, created_at')
      .eq('user_id', user.id)
      .gte('created_at', monthStart.toISOString())

    // Calculate user-paid costs (API keys + CLI only)
    const userPaidCost = (perspectiveUsage || []).reduce((sum, usage) => {
      const sourceType = usage.request_metadata?.source_type
      // Only count costs from user_key and user_cli (NOT admin_credits or web)
      if (sourceType === 'user_key' || sourceType === 'user_cli') {
        const cost = parseFloat(usage.estimated_cost) || 0
        if (cost <= 10) { // Skip unrealistic costs
          return sum + cost
        }
      }
      return sum
    }, 0) || 0

    // Calculate total tokens from ALL sources (including admin credits)
    const mcpCost = (requestLogs || []).reduce((sum, log) => sum + (parseFloat(log.total_cost) || 0), 0) || 0
    const chatCost = (chatLogs || []).reduce((sum, log) => sum + (parseFloat(log.total_cost) || 0), 0) || 0
    const totalCostFromLogs = mcpCost + chatCost

    console.log(`[Dashboard Stats] Calculated total cost THIS MONTH: $${totalCostFromLogs.toFixed(4)} (MCP: $${mcpCost.toFixed(4)} + Chat: $${chatCost.toFixed(4)}) from ${mcpApiCalls} MCP + ${chatApiCalls} chat requests = ${totalMessages} total messages`)
    console.log(`[Dashboard Stats] Total tokens THIS MONTH: ${totalUsageTokens} (MCP: ${mcpTokenCount} + Chat: ${chatTokens})`)

    // Calculate average response time from BOTH MCP and chat data - only from successful requests
    const mcpResponseTimes = (requestLogs || [])
      .filter(log => {
        const hasResponseTime = 'response_time_ms' in log && log.response_time_ms && (log.response_time_ms as number) > 0
        const isSuccessful = (log as any).status === 'success' || (!(log as any).status && log.total_tokens > 0)
        const isReasonableTime = (log.response_time_ms as number) < 60000 // Less than 60 seconds
        return hasResponseTime && isSuccessful && isReasonableTime
      })
      .map(log => (log as any).response_time_ms)

    const chatResponseTimes = (chatLogs || [])
      .filter(log => {
        const hasResponseTime = 'response_time_ms' in log && log.response_time_ms && (log.response_time_ms as number) > 0
        const isSuccessful = log.total_tokens > 0 // Chat logs without explicit status - use tokens as success indicator
        const isReasonableTime = 'response_time_ms' in log ? (log.response_time_ms as number) < 60000 : true // Less than 60 seconds
        return hasResponseTime && isSuccessful && isReasonableTime
      })
      .map(log => (log as any).response_time_ms)

    const allResponseTimes = [...mcpResponseTimes, ...chatResponseTimes]
    const avgResponseTime = allResponseTimes.length > 0
      ? Math.round(allResponseTimes.reduce((sum, time) => sum + time, 0) / allResponseTimes.length)
      : 0

    console.log(`[Dashboard Stats] Response time calculation: ${allResponseTimes.length} samples, avg: ${avgResponseTime}ms`)

    // Calculate uptime based on success rate from BOTH MCP and chat sources
    const mcpSuccessfulRequests = (requestLogs || []).filter(log => {
      // Explicit success status
      if ((log as any).status === 'success') return true
      // Explicit failure status
      if ((log as any).status === 'failed' || (log as any).status === 'error') return false
      // For logs without explicit status, consider successful if has tokens or cost
      const hasTokens = log.total_tokens && log.total_tokens > 0
      const hasCost = log.total_cost && log.total_cost > 0
      return hasTokens || hasCost
    }).length

    // For chat sessions, if chatLogs has cost tracking, use that. Otherwise, assume all chat logs are successful
    const chatSuccessfulRequests = (chatLogs || []).length > 0
      ? (chatLogs || []).filter(log => {
          // Chat logs assume success if entry exists with tokens
          const hasTokens = log.total_tokens && log.total_tokens > 0
          const hasCost = log.total_cost && log.total_cost > 0
          return hasTokens || hasCost
        }).length
      : (chatLogs || []).length // If no chat logs with cost data, assume all chat logs are successful

    const totalSuccessfulRequests = mcpSuccessfulRequests + chatSuccessfulRequests
    const systemUptime = totalApiCalls > 0 ? `${((totalSuccessfulRequests / totalApiCalls) * 100).toFixed(1)}%` : 'N/A'

    console.log(`[Dashboard Stats] Success rate: ${totalSuccessfulRequests}/${totalApiCalls} = ${systemUptime}`)

    // Get provider breakdown based on actual user API keys and usage
    const providerStats = apiKeys?.map(apiKey => {
      // Find the provider configuration (system-wide)
      const provider = providers?.find(p => 
        p.provider_name?.toLowerCase() === apiKey.provider?.toLowerCase() || 
        p.id?.toLowerCase() === apiKey.provider?.toLowerCase()
      ) || null
      
      // Calculate requests for this provider from BOTH MCP and chat data
      const mcpProviderRequests = (requestLogs || []).filter(log => {
        // Check detailed logs format first
        if ('provider_costs' in log && log.provider_costs) {
          return Object.keys(log.provider_costs).some((key: string) =>
            key.toLowerCase().includes(apiKey.provider.toLowerCase()) ||
            key.toLowerCase().includes((provider?.display_name || '').toLowerCase())
          )
        }
        // Fallback to simple logs format
        if ('models_used' in log && log.models_used && typeof log.models_used === 'object') {
          const modelsUsed = Array.isArray(log.models_used) ? log.models_used : Object.keys(log.models_used)
          return modelsUsed.some((model: string) =>
            model.toLowerCase().includes(apiKey.provider.toLowerCase()) ||
            model.toLowerCase().includes((provider?.display_name || '').toLowerCase())
          )
        }
        return false
      }).length || 0

      const chatProviderRequests = (chatLogs || []).filter(log => {
        // Check models_used in chat logs
        if ('models_used' in log && log.models_used && typeof log.models_used === 'object') {
          const modelsUsed = Array.isArray(log.models_used) ? log.models_used : Object.keys(log.models_used)
          return modelsUsed.some((model: string) =>
            model.toLowerCase().includes(apiKey.provider.toLowerCase()) ||
            model.toLowerCase().includes((provider?.display_name || '').toLowerCase())
          )
        }
        return false
      }).length || 0

      const providerRequests = mcpProviderRequests + chatProviderRequests

      // Use real current_usage if available
      const currentUsage = apiKey.current_usage ? 
        parseFloat(apiKey.current_usage.toString()) : 
        0

      // Calculate average latency from BOTH MCP and chat data
      const mcpProviderUsageData = (requestLogs || []).filter(log => {
        if ('provider_costs' in log && log.provider_costs) {
          return Object.keys(log.provider_costs).some((key: string) =>
            key.toLowerCase().includes(apiKey.provider.toLowerCase())
          )
        }
        if ('models_used' in log && log.models_used && typeof log.models_used === 'object') {
          const modelsUsed = Array.isArray(log.models_used) ? log.models_used : Object.keys(log.models_used)
          return modelsUsed.some((model: string) =>
            model.toLowerCase().includes(apiKey.provider.toLowerCase())
          )
        }
        return false
      }) || []

      const chatProviderUsageData = (chatLogs || []).filter(log => {
        if ('models_used' in log && log.models_used && typeof log.models_used === 'object') {
          const modelsUsed = Array.isArray(log.models_used) ? log.models_used : Object.keys(log.models_used)
          return modelsUsed.some((model: string) =>
            model.toLowerCase().includes(apiKey.provider.toLowerCase())
          )
        }
        return false
      }) || []

      const allProviderUsageData = [...mcpProviderUsageData, ...chatProviderUsageData]
      const avgLatency = allProviderUsageData.length > 0 ?
        Math.round(allProviderUsageData.reduce((sum, log) => sum + ((log as any).response_time_ms || 0), 0) / allProviderUsageData.length) :
        0

      return {
        name: provider?.display_name || provider?.provider_name || apiKey.provider || 'Unknown Provider',
        requests: providerRequests,
        cost: `$${currentUsage.toFixed(2)}`,
        latency: avgLatency,
        status: apiKey.active && apiKey.last_used_at ? 'active' : 'inactive'
      }
    }).filter(provider => provider.status === 'active' || provider.requests > 0 || parseFloat(provider.cost.replace('$', '')) > 0) || []

    // Use user-paid cost (API keys + CLI only, NOT admin credits)
    const totalCost = userPaidCost

    console.log(`[Dashboard Stats] User-paid cost (API keys + CLI): $${userPaidCost.toFixed(4)}, Total cost (all sources): $${totalCostFromLogs.toFixed(4)}`)

    // Generate recent activity from BOTH MCP and chat data
    const recentActivity: any[] = []

    // Combine both MCP and chat logs for recent activity
    const allActivityLogs: any[] = []

    // Add MCP logs
    if (requestLogs && requestLogs.length > 0) {
      requestLogs.forEach(log => {
        allActivityLogs.push({ ...log, source: 'MCP' })
      })
    }

    // Add chat logs
    if (chatLogs && chatLogs.length > 0) {
      chatLogs.forEach(log => {
        allActivityLogs.push({ ...log, source: 'Chat' })
      })
    }

    if (allActivityLogs.length > 0) {
      // Get the most recent 5 activity entries from both sources
      const sortedLogs = allActivityLogs
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)

      sortedLogs.forEach(log => {
        let providerName = 'Multiple Models'
        let actionType = log.source === 'Chat' ? 'Chat Message' : 'MCP Request'

        // Extract provider name from detailed logs
        if ('provider_responses' in log && log.provider_responses && typeof log.provider_responses === 'object') {
          const firstProvider = Object.keys(log.provider_responses)[0]
          if (firstProvider) {
            providerName = firstProvider.split(':')[1] || firstProvider // Get model name
          }
        }
        // Fallback to simple logs format
        else if ('models_used' in log && log.models_used && typeof log.models_used === 'object') {
          providerName = Object.keys(log.models_used)[0] || 'Unknown Model'
        }

        recentActivity.push({
          timestamp: log.created_at,
          action: actionType,
          provider: providerName,
          tool: log.source === 'Chat' ? 'chat_interface' : 'get_perspectives',
          cost: parseFloat((log.total_cost || 0).toFixed(4)),
          duration: log.response_time_ms || 0
        })
      })
    } else if (allTokens && allTokens.length > 0) {
      // Fallback to token connection activity if no usage logs
      const sortedTokens = allTokens
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)

      sortedTokens.forEach(token => {
        const clientName = token.client_id === 'claude-desktop' ? 'Claude Code' : 
                          token.client_id === 'cursor' ? 'Cursor' :
                          token.client_id || 'Unknown Client'
        
        recentActivity.push({
          timestamp: token.created_at,
          action: 'Client Connected',
          provider: clientName,
          tool: 'authentication',
          cost: 0.00,
          duration: 0
        })
      })
    }

    // Prepare real statistics response
    const stats = {
      // User's credits balance
      creditsBalance: parseFloat(totalUserCredits.toFixed(2)),

      // Total user interactions (both MCP calls and web chat sessions)
      totalMessages: totalMessages, // MCP API calls + web chat sessions
      totalApiCalls: totalApiCalls, // Same as totalMessages (each interaction = one API call)

      // Legacy fields for backward compatibility
      totalRequests: totalApiCalls,
      totalCost: parseFloat(totalCost.toFixed(4)),
      activeConnections: activeConnections,
      uptime: systemUptime,
      responseTime: avgResponseTime,

      // Additional detailed stats - monthly usage from BOTH sources
      messagesThisMonth: totalMessages, // Monthly count to match subscription/profile
      apiCallsToday: mcpApiCalls + chatApiCalls, // Total API calls this month from both sources

      // All-time counts for display
      allTimeMessages: allTimeTotalMessages,
      allTimeMcpMessages: allTimeMcpMessages,
      allTimeChatMessages: allTimeChatMessages,
      requestsToday: ((requestLogs || []).filter(log => {
        const logDate = new Date(log.created_at)
        return logDate >= todayStart
      }).length || 0) + ((chatLogs || []).filter(log => {
        const logDate = new Date(log.created_at)
        return logDate >= todayStart
      }).length || 0),
      costToday: parseFloat(((perspectiveUsage || []).filter(usage => {
        const usageDate = new Date(usage.created_at)
        const sourceType = usage.request_metadata?.source_type
        return usageDate >= todayStart && (sourceType === 'user_key' || sourceType === 'user_cli')
      }).reduce((sum, usage) => {
        const cost = parseFloat(usage.estimated_cost) || 0
        return cost > 10 ? sum : sum + cost // Skip unrealistic costs
      }, 0) || 0).toFixed(4)),
      avgResponseTime: avgResponseTime,
      
      // Real provider breakdown
      providerStats: providerStats,

      // Real recent activity
      recentActivity: recentActivity,

      // System health
      systemHealth: {
        apiStatus: 'operational',
        databaseStatus: 'operational',
        mcpServerStatus: activeConnections > 0 ? 'operational' : 'idle',
        cacheStatus: 'operational',
        lastHealthCheck: new Date().toISOString()
      },

      // Additional real metrics
      totalApiKeys: apiKeys?.length || 0,
      // Deduplicated providers: admin-provided + user API keys
      activeProviders: (() => {
        const providerSet = new Set<string>()
        // Add user API key providers
        apiKeys?.forEach(key => {
          if (key.active && key.provider) {
            providerSet.add(key.provider.toLowerCase())
          }
        })
        // Add admin-provided providers from perspective_usage
        ;(perspectiveUsage || []).forEach(usage => {
          const sourceType = usage.request_metadata?.source_type
          const provider = usage.request_metadata?.provider
          if (sourceType === 'admin_credits' && provider) {
            providerSet.add(provider.toLowerCase())
          }
        })
        return providerSet.size
      })(),
      totalMcpTokens: totalTokens,
      oldestConnection: (allTokens && allTokens.length > 0) ?
        Math.min(...allTokens.map(t => new Date(t.created_at).getTime())) :
        Date.now(),

      // Cost breakdown by source (user-paid only)
      costBreakdown: {
        userApiKeys: (perspectiveUsage || [])
          .filter(u => u.request_metadata?.source_type === 'user_key')
          .reduce((sum, u) => sum + (parseFloat(u.estimated_cost) || 0), 0),
        userCli: (perspectiveUsage || [])
          .filter(u => u.request_metadata?.source_type === 'user_cli')
          .reduce((sum, u) => sum + (parseFloat(u.estimated_cost) || 0), 0),
        adminCredits: 0 // Don't show admin credit costs
      },

      // Token aggregation (all sources including admin)
      tokenBreakdown: {
        total: totalUsageTokens,
        mcp: mcpTokenCount,
        chat: chatTokens
      },

      // Provider details for hover (deduplicated admin + user)
      providerDetails: (() => {
        const providerMap = new Map<string, { name: string; source: string[]; logo?: string }>()

        // Add user API key providers
        apiKeys?.forEach(key => {
          if (key.active && key.provider) {
            const id = key.provider.toLowerCase()
            const existing = providerMap.get(id)
            if (existing) {
              if (!existing.source.includes('user')) existing.source.push('user')
            } else {
              providerMap.set(id, { name: key.provider, source: ['user'] })
            }
          }
        })

        // Add admin-provided providers
        ;(perspectiveUsage || []).forEach(usage => {
          const sourceType = usage.request_metadata?.source_type
          const provider = usage.request_metadata?.provider
          if (sourceType === 'admin_credits' && provider) {
            const id = provider.toLowerCase()
            const existing = providerMap.get(id)
            if (existing) {
              if (!existing.source.includes('admin')) existing.source.push('admin')
            } else {
              providerMap.set(id, { name: provider, source: ['admin'] })
            }
          }
        })

        return Array.from(providerMap.values())
      })()
    }

    // Use already fetched providers registry data (from parallel queries)
    console.log(`[Dashboard Stats] Using ${modelsDevProviders?.length || 0} providers from parallel query`)

    // Helper function to map model names to proper provider names
    const getProviderFromModel = (modelName: string): string => {
      const normalizedModel = modelName.toLowerCase()

      // OpenAI models
      if (normalizedModel.includes('gpt') || normalizedModel.includes('openai')) return 'openai'

      // Anthropic models
      if (normalizedModel.includes('claude') || normalizedModel.includes('anthropic')) return 'anthropic'

      // Google models
      if (normalizedModel.includes('gemini') || normalizedModel.includes('google')) return 'google'

      // xAI models (Grok)
      if (normalizedModel.includes('xai') || normalizedModel.includes('x-ai') || normalizedModel.includes('grok')) return 'xai'

      // DeepSeek models
      if (normalizedModel.includes('deepseek')) return 'deepseek'

      // Cerebras models
      if (normalizedModel.includes('cerebras')) return 'cerebras'

      // Groq models - add more comprehensive detection
      if (normalizedModel.includes('groq') || normalizedModel.includes('llama') || normalizedModel.includes('mixtral')) return 'groq'

      // Moonshot (Kimi) models
      if (normalizedModel.includes('kimi') || normalizedModel.includes('moonshot') || normalizedModel.includes('k2-instruct')) return 'moonshot'

      // Qwen models (Alibaba)
      if (normalizedModel.includes('qwen')) return 'alibaba'

      // GLM models (Zhipu AI)
      if (normalizedModel.includes('glm')) return 'zhipu-ai'

      // Other providers
      if (normalizedModel.includes('mistral')) return 'mistral'
      if (normalizedModel.includes('together')) return 'together-ai'
      if (normalizedModel.includes('perplexity')) return 'perplexity'
      if (normalizedModel.includes('cohere')) return 'cohere'
      if (normalizedModel.includes('huggingface') || normalizedModel.includes('hugging-face')) return 'huggingface'
      if (normalizedModel.includes('openrouter')) return 'openrouter'
      if (normalizedModel.includes('fireworks')) return 'fireworksai'
      if (normalizedModel.includes('replicate')) return 'replicate'

      // Additional mappings
      if (normalizedModel.includes('pt-oss')) return 'huggingface'

      // Fallback: return unknown
      return 'unknown'
    }

    // Helper function to normalize provider IDs for matching with models-dev data
    const normalizeId = (id: string) => {
      const idMap: Record<string, string> = {
        'xai': 'x-ai',
        'x-ai': 'x-ai',
        'moonshot': 'moonshot',
        'qwen': 'alibaba', // Qwen is made by Alibaba
        'glm': 'zhipu-ai', // GLM is made by Zhipu AI
        'deepseek': 'deepseek',
        'cerebras': 'cerebras',
        'groq': 'groq',
        'anthropic': 'anthropic',
        'openai': 'openai',
        'google': 'google',
        'huggingface': 'huggingface',
        'together': 'together-ai',
        'togetherai': 'together-ai'
      }
      return idMap[id.toLowerCase()] || id.toLowerCase()
    }

    // Generate detailed provider and model analytics from combined data
    const providerAnalytics: Record<string, any> = {}
    const modelAnalytics: Record<string, any> = {}

    // Process all logs for detailed analytics
    const allLogsForAnalytics = [...(requestLogs || []), ...(chatLogs || [])]

    allLogsForAnalytics.forEach((log: any) => {
      // Extract providers from different log formats
      let logProviders: any[] = []

      if (log.providers && Array.isArray(log.providers)) {
        logProviders = log.providers
      } else if (log.provider_responses && typeof log.provider_responses === 'object') {
        // Convert provider_responses to providers format
        Object.entries(log.provider_responses).forEach(([providerModelKey, response]: [string, any]) => {
          // FIXED: Extract model name and map to proper provider
          const parts = providerModelKey.split(':')
          const firstPart = parts[0] // This could be model name OR provider name
          const secondPart = parts[1] || null // This could be model name if first part is provider

          const correctProvider = getProviderFromModel(firstPart) // Map to proper provider

          // If firstPart maps to a known provider and we have a secondPart, use secondPart as model
          // Otherwise, if firstPart IS a provider name, use a generic model name
          let actualModelName = firstPart
          if (correctProvider !== 'unknown' && secondPart) {
            actualModelName = secondPart
          } else if (['openai', 'google', 'anthropic', 'xai', 'x-ai', 'groq', 'cerebras', 'deepseek', 'moonshot', 'qwen', 'glm'].includes(firstPart.toLowerCase())) {
            // This is a provider name being used as model name - use generic model name
            actualModelName = `${firstPart}-model`
          }

          logProviders.push({
            provider: correctProvider,
            model: actualModelName,
            cost: response.cost || 0,
            tokens: response.tokens_used || response.total_tokens || 0,
            latency: response.response_time_ms || log.response_time_ms || 0,
            success: response.error ? false : true
          })
        })
      } else if (log.models_used && typeof log.models_used === 'object') {
        // Extract from models_used format
        const modelsUsed = Array.isArray(log.models_used) ? log.models_used : Object.keys(log.models_used)
        modelsUsed.forEach((model: string) => {
          // FIXED: Use proper provider mapping instead of naive string splitting
          const correctProvider = getProviderFromModel(model)

          // If model name IS a provider name, use a generic model name
          let actualModelName = model
          if (['openai', 'google', 'anthropic', 'xai', 'x-ai', 'groq', 'cerebras', 'deepseek', 'moonshot', 'qwen', 'glm'].includes(model.toLowerCase())) {
            actualModelName = `${model}-model`
          }

          logProviders.push({
            provider: correctProvider,
            model: actualModelName,
            cost: log.total_cost || 0,
            tokens: log.total_tokens || 0,
            latency: log.response_time_ms || 0,
            success: log.total_tokens > 0 // Assume success if tokens exist
          })
        })
      }

      // Process each provider in this log
      logProviders.forEach((provider: any) => {
        // Provider analytics
        if (!providerAnalytics[provider.provider]) {
          // Find the provider info from models-dev for display name and logo
          const normalizedProviderId = normalizeId(provider.provider)
          const providerInfo = modelsDevProviders?.find(p => normalizeId(p.id || '') === normalizedProviderId) || {}


          providerAnalytics[provider.provider] = {
            name: providerInfo.name || provider.provider,
            logo: providerInfo.logo,
            requests: 0,
            totalCost: 0,
            totalTokens: 0,
            totalLatency: 0,
            successCount: 0,
            errorCount: 0,
            models: new Set(),
          }
        }
        const pStats = providerAnalytics[provider.provider]
        pStats.requests++
        pStats.totalCost += provider.cost || 0
        pStats.totalTokens += provider.tokens || 0
        pStats.totalLatency += provider.latency || 0
        if (provider.success) pStats.successCount++
        else pStats.errorCount++
        if (provider.model) pStats.models.add(provider.model)

        // Model analytics
        const modelKey = `${provider.provider}:${provider.model}`
        if (!modelAnalytics[modelKey]) {
          // Get provider info for model analytics as well
          const normalizedProviderId = normalizeId(provider.provider)
          const providerInfo = modelsDevProviders?.find(p => normalizeId(p.id || '') === normalizedProviderId) || {}

          modelAnalytics[modelKey] = {
            provider: providerInfo.name || provider.provider,
            providerLogo: providerInfo.logo,
            model: provider.model,
            requests: 0,
            totalCost: 0,
            totalTokens: 0,
            totalLatency: 0,
            successCount: 0,
            errorCount: 0,
          }
        }
        const mStats = modelAnalytics[modelKey]
        mStats.requests++
        mStats.totalCost += provider.cost || 0
        mStats.totalTokens += provider.tokens || 0
        mStats.totalLatency += provider.latency || 0
        if (provider.success) mStats.successCount++
        else mStats.errorCount++
      })
    })

    // Transform and sort provider analytics
    const processedProviderAnalytics = Object.values(providerAnalytics).map((stats: any) => ({
      ...stats,
      avgLatency: stats.requests > 0 ? Math.round(stats.totalLatency / stats.requests) : 0,
      avgCost: stats.requests > 0 ? stats.totalCost / stats.requests : 0,
      successRate: stats.requests > 0 ? ((stats.successCount / stats.requests) * 100).toFixed(1) : 0,
      models: Array.from(stats.models),
    })).sort((a: any, b: any) => b.requests - a.requests)

    // Transform and sort model analytics
    const processedModelAnalytics = Object.values(modelAnalytics).map((stats: any) => ({
      ...stats,
      avgLatency: stats.requests > 0 ? Math.round(stats.totalLatency / stats.requests) : 0,
      avgCost: stats.requests > 0 ? stats.totalCost / stats.requests : 0,
      tokensPerSecond: stats.totalLatency > 0 ? Math.round((stats.totalTokens * 1000) / stats.totalLatency) : 0,
      successRate: stats.requests > 0 ? ((stats.successCount / stats.requests) * 100).toFixed(1) : 0,
      costPerToken: stats.totalTokens > 0 ? (stats.totalCost / stats.totalTokens).toFixed(6) : 0,
    })).sort((a: any, b: any) => b.requests - a.requests)

    // Add request logs to stats response (so dashboard can display them)
    ;(stats as any).requestLogs = [...(requestLogs || []), ...(chatLogs || [])].slice(0, 50)

    // Add analytics to stats response
    ;(stats as any).providerAnalytics = processedProviderAnalytics
    ;(stats as any).modelAnalytics = processedModelAnalytics


    console.log('[Dashboard Stats] Returning real statistics:', {
      creditsBalance: stats.creditsBalance,
      totalMessages: stats.totalMessages,
      totalApiCalls: stats.totalApiCalls,
      activeConnections: stats.activeConnections,
      totalCost: stats.totalCost,
      avgResponseTime: stats.responseTime,
      totalApiKeys: stats.totalApiKeys,
      providersCount: stats.providerStats.length,
      providerAnalyticsCount: processedProviderAnalytics.length,
      modelAnalyticsCount: processedModelAnalytics.length,
      requestLogsCount: (stats as any).requestLogs?.length
    })

    // Cache the result for 10 seconds to ensure near real-time data while maintaining performance
    setCachedData(cacheKey, stats, 10000)

    return NextResponse.json(stats)
    
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}