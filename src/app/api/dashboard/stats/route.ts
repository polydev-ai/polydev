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
    let usingServiceRole = false

    if (serviceRoleKey && serviceRoleKey !== 'your_service_role_key') {
      const { createClient: createServiceClient } = await import('@supabase/supabase-js')
      supabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      )
      usingServiceRole = true
    }

    console.log('[Dashboard Stats] Using service role:', usingServiceRole, 'Key exists:', !!serviceRoleKey)

    // Get current user from regular client for auth
    const regularSupabase = await createClient()
    const { data: { user }, error: authError } = await regularSupabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Dashboard Stats] Fetching real statistics for user:', user.id)

    // Check cache first
    const cacheKey = `dashboard-stats-v11-${user.id}` // v11: debug chat logs counting
    const cachedStats = getCachedData(cacheKey)
    if (cachedStats) {
      console.log('[Dashboard Stats] Returning cached data')
      return NextResponse.json(cachedStats)
    }

    // Get real data from database tables
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    // Use UTC to avoid timezone issues - database timestamps are in UTC
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

    // Execute all database queries in parallel for much better performance
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const monthStartISO = monthStart.toISOString()
    console.log('[Dashboard Stats] Date filters:', {
      now: now.toISOString(),
      monthStart: monthStartISO,
      todayStart: todayStart.toISOString(),
      userId: user.id
    })
    console.log('[Dashboard Stats] Executing parallel database queries with monthStart:', monthStartISO)

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
      providersRegistryResult,
      ephemeralUsageResult,
      allTimeEphemeralUsageResult
    ] = await Promise.allSettled([
      // 0. User credits
      supabase
        .from('user_credits')
        .select('balance, promotional_balance')
        .eq('user_id', user.id)
        .maybeSingle(),

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
        .select('total_tokens, total_cost, created_at, provider_responses, response_time_ms, status, successful_providers, failed_providers, provider_costs, source_type')
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
        .select('total_tokens, total_cost, created_at, models_used')
        .eq('user_id', user.id)
        .gte('created_at', monthStart.toISOString())
        .limit(500),

      // 9. All-time request logs for all-time metrics calculation
      supabase
        .from('mcp_request_logs')
        .select('total_tokens, provider_responses, successful_providers, total_cost, source_type')
        .eq('user_id', user.id),

      // 10. All-time chat logs for all-time metrics calculation
      supabase
        .from('chat_logs')
        .select('total_tokens, models_used, total_cost')
        .eq('user_id', user.id),

      // 11. Providers registry for display names/logos
      supabase
        .from('providers_registry')
        .select('*')
        .eq('is_active', true),

      // 12. Ephemeral usage (BYOK mode) - this month only
      supabase
        .from('ephemeral_usage')
        .select('total_tokens, estimated_cost_usd, provider, model, created_at, prompt_tokens, completion_tokens, session_id')
        .eq('user_id', user.id)
        .eq('used_byok', true)
        .gte('created_at', monthStart.toISOString())
        .limit(500),

      // 13. All-time ephemeral usage for all-time metrics
      supabase
        .from('ephemeral_usage')
        .select('total_tokens, estimated_cost_usd, provider, model, created_at, session_id')
        .eq('user_id', user.id)
        .eq('used_byok', true)
    ])

    // Extract data from parallel results
    const userCredits = userCreditsResult.status === 'fulfilled' && !userCreditsResult.value.error 
      ? userCreditsResult.value.data 
      : null
    
    // Log user credits result for debugging
    if (userCreditsResult.status === 'fulfilled') {
      console.log('[Dashboard Stats] User credits query result:', {
        hasError: !!userCreditsResult.value.error,
        error: userCreditsResult.value.error,
        data: userCreditsResult.value.data
      })
    } else {
      console.log('[Dashboard Stats] User credits query rejected:', userCreditsResult.reason)
    }
    
    const mcpTokens = mcpTokensResult.status === 'fulfilled' ? mcpTokensResult.value.data : []
    const allTokens = allTokensResult.status === 'fulfilled' ? allTokensResult.value.data : []
    const userTokens = userTokensResult.status === 'fulfilled' ? userTokensResult.value.data : []
    const apiKeys = apiKeysResult.status === 'fulfilled' ? apiKeysResult.value.data : []
    const providers = providersResult.status === 'fulfilled' ? providersResult.value.data : []
    const requestLogs = requestLogsResult.status === 'fulfilled' ? requestLogsResult.value.data : []
    const usageLogs = usageLogsResult.status === 'fulfilled' ? usageLogsResult.value.data : []
    const chatLogs = chatLogsResult.status === 'fulfilled' ? chatLogsResult.value.data : []
    
    // DEBUG: Log chat logs query result in detail
    console.log('[Dashboard Stats] CHAT LOGS DEBUG:', {
      status: chatLogsResult.status,
      hasError: chatLogsResult.status === 'fulfilled' ? !!chatLogsResult.value.error : 'rejected',
      error: chatLogsResult.status === 'fulfilled' ? chatLogsResult.value.error : chatLogsResult.reason,
      dataLength: chatLogs?.length || 0,
      firstRecord: chatLogs?.[0] || null
    })
    
    const allTimeRequestLogs = allTimeRequestLogsResult.status === 'fulfilled' ? allTimeRequestLogsResult.value.data : []
    const allTimeChatLogs = allTimeChatLogsResult.status === 'fulfilled' ? allTimeChatLogsResult.value.data : []
    const modelsDevProviders = providersRegistryResult.status === 'fulfilled' ? providersRegistryResult.value.data : []
    const ephemeralUsage = ephemeralUsageResult.status === 'fulfilled' ? ephemeralUsageResult.value.data : []
    const allTimeEphemeralUsage = allTimeEphemeralUsageResult.status === 'fulfilled' ? allTimeEphemeralUsageResult.value.data : []

    // Log any errors from the queries
    if (chatLogsResult.status === 'rejected' || (chatLogsResult.status === 'fulfilled' && chatLogsResult.value.error)) {
      console.error('[Dashboard Stats] Chat logs query error:', chatLogsResult.status === 'rejected' ? chatLogsResult.reason : chatLogsResult.value.error)
    }
    if (requestLogsResult.status === 'rejected' || (requestLogsResult.status === 'fulfilled' && requestLogsResult.value.error)) {
      console.error('[Dashboard Stats] Request logs query error:', requestLogsResult.status === 'rejected' ? requestLogsResult.reason : requestLogsResult.value.error)
    }
    if (allTimeRequestLogsResult.status === 'rejected' || (allTimeRequestLogsResult.status === 'fulfilled' && allTimeRequestLogsResult.value.error)) {
      console.error('[Dashboard Stats] ALL-TIME request logs query error:', allTimeRequestLogsResult.status === 'rejected' ? allTimeRequestLogsResult.reason : allTimeRequestLogsResult.value.error)
    }
    if (allTimeChatLogsResult.status === 'rejected' || (allTimeChatLogsResult.status === 'fulfilled' && allTimeChatLogsResult.value.error)) {
      console.error('[Dashboard Stats] ALL-TIME chat logs query error:', allTimeChatLogsResult.status === 'rejected' ? allTimeChatLogsResult.reason : allTimeChatLogsResult.value.error)
    }

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
      modelsDevProviders: modelsDevProviders?.length || 0,
      sampleChatLog: chatLogs?.[0]?.created_at,
      monthStartUsed: monthStartISO
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

    // Calculate EPHEMERAL (BYOK) mode stats FIRST - THIS MONTH
    const ephemeralRequests = (ephemeralUsage || []).length
    const ephemeralSessions = new Set((ephemeralUsage || []).filter(u => u.session_id).map(u => u.session_id)).size
    const ephemeralTokens = (ephemeralUsage || []).reduce((sum, log) => sum + (log.total_tokens || 0), 0) || 0
    const ephemeralCost = (ephemeralUsage || []).reduce((sum, log) => sum + (parseFloat(log.estimated_cost_usd) || 0), 0) || 0

    // Calculate ALL-TIME ephemeral stats
    const allTimeEphemeralRequests = (allTimeEphemeralUsage || []).length
    const allTimeEphemeralSessions = new Set((allTimeEphemeralUsage || []).filter(u => u.session_id).map(u => u.session_id)).size
    const allTimeEphemeralTokens = (allTimeEphemeralUsage || []).reduce((sum, log) => sum + (log.total_tokens || 0), 0) || 0
    const allTimeEphemeralCost = (allTimeEphemeralUsage || []).reduce((sum, log) => sum + (parseFloat(log.estimated_cost_usd) || 0), 0) || 0

    // Calculate TOTAL messages from ALL sources THIS MONTH (Standard + BYOK modes)
    // Use monthly-filtered logs to match subscription and profile pages
    const mcpMessages = (requestLogs || []).length
    const chatMessages_count = (chatLogs || []).length
    const standardModeMessages = mcpMessages + chatMessages_count // Standard mode (Polydev API keys)
    const totalMessages = standardModeMessages + ephemeralRequests // Total user interactions (Standard + BYOK modes)

    // Calculate ALL-TIME message counts for display (Standard + BYOK modes)
    const allTimeMcpMessages = (allTimeRequestLogs || []).length
    const allTimeChatMessages = (allTimeChatLogs || []).length
    const allTimeStandardMessages = allTimeMcpMessages + allTimeChatMessages
    const allTimeTotalMessages = allTimeStandardMessages + allTimeEphemeralRequests

    console.log('[Dashboard Stats] Ephemeral usage (BYOK mode) THIS MONTH:', {
      ephemeralRequests,
      ephemeralSessions,
      ephemeralTokens,
      ephemeralCost: `$${ephemeralCost.toFixed(4)}`
    })

    console.log('[Dashboard Stats] Ephemeral usage (BYOK mode) ALL-TIME:', {
      allTimeEphemeralRequests,
      allTimeEphemeralSessions,
      allTimeEphemeralTokens,
      allTimeEphemeralCost: `$${allTimeEphemeralCost.toFixed(4)}`
    })

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

    // Calculate ALL-TIME API calls
    const allTimeMcpApiCalls = (allTimeRequestLogs || []).reduce((sum, log) => {
      // provider_responses is an object with provider keys
      if (log.provider_responses && typeof log.provider_responses === 'object') {
        const count = Object.keys(log.provider_responses).length
        if (count > 0) return sum + count
      }
      // successful_providers is a NUMBER, not an array!
      if (typeof log.successful_providers === 'number' && log.successful_providers > 0) {
        return sum + log.successful_providers
      }
      // Fallback: count as 1 API call if we have cost/tokens data
      if ((log.total_cost && log.total_cost > 0) || (log.total_tokens && log.total_tokens > 0)) {
        return sum + 1
      }
      return sum
    }, 0)

    const allTimeChatApiCalls = (allTimeChatLogs || []).reduce((sum, log, index) => {
      if (index === 0) console.log('[ALL-TIME DEBUG] First chat log:', JSON.stringify(log, null, 2).substring(0, 500))
      if (log.models_used && typeof log.models_used === 'object') {
        const modelsUsed = Array.isArray(log.models_used) ? log.models_used : Object.keys(log.models_used)
        if (modelsUsed.length > 0) {
          return sum + modelsUsed.length
        }
      }
      // Fallback: count as 1 API call if we have cost/tokens data
      if ((log.total_cost && log.total_cost > 0) || (log.total_tokens && log.total_tokens > 0)) {
        return sum + 1
      }
      return sum
    }, 0)

    const allTimeTotalApiCalls = allTimeMcpApiCalls + allTimeChatApiCalls

    console.log('[Dashboard Stats] ALL-TIME data sample:', {
      mcpSample: allTimeRequestLogs?.slice(0, 2),
      chatSample: allTimeChatLogs?.slice(0, 2),
      mcpCount: allTimeRequestLogs?.length,
      chatCount: allTimeChatLogs?.length,
      mcpFirst: allTimeRequestLogs?.[0],
      chatFirst: allTimeChatLogs?.[0]
    })

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

    console.log('[Dashboard Stats] ALL-TIME API calls:', {
      allTimeMcpApiCalls,
      allTimeChatApiCalls,
      allTimeTotalApiCalls
    })

    // Count MCP token usage for reference (not the same as client calls)
    const mcpTokenUsage = (allTokens?.filter(token => token.last_used_at).length || 0) + (userTokens?.filter(token => token.last_used_at).length || 0)

    // Calculate total tokens from ALL sources (THIS MONTH) - Standard + BYOK modes
    const mcpTokenCount = (requestLogs || []).reduce((sum, log) => sum + (log.total_tokens || 0), 0) || 0
    const chatTokens = (chatLogs || []).reduce((sum, log) => sum + (log.total_tokens || 0), 0) || 0
    const standardModeTokens = mcpTokenCount + chatTokens
    const totalUsageTokens = standardModeTokens + ephemeralTokens

    // Calculate ALL-TIME tokens from ALL sources - Standard + BYOK modes
    const allTimeMcpTokenCount = (allTimeRequestLogs || []).reduce((sum, log) => sum + (log.total_tokens || 0), 0) || 0
    const allTimeChatTokens = (allTimeChatLogs || []).reduce((sum, log) => sum + (log.total_tokens || 0), 0) || 0
    const allTimeStandardTokens = allTimeMcpTokenCount + allTimeChatTokens
    const allTimeTotalTokens = allTimeStandardTokens + allTimeEphemeralTokens

    // Calculate costs - ONLY from user API keys (NOT admin credits)
    // Use mcp_request_logs which has source_type field directly
    
    // Calculate user-paid costs from request logs (API keys only, NOT admin_key)
    const userPaidCost = (requestLogs || []).reduce((sum, log: any) => {
      // Only count costs from user_key (user's own API keys)
      if (log.source_type === 'user_key') {
        const cost = parseFloat(log.total_cost) || 0
        if (cost <= 10) { // Skip unrealistic costs
          return sum + cost
        }
      }
      return sum
    }, 0) || 0

    // Calculate ALL-TIME user-paid costs from all-time request logs
    const allTimeUserPaidCost = (allTimeRequestLogs || []).reduce((sum, log: any) => {
      // Only count costs from user_key (user's own API keys)
      if (log.source_type === 'user_key') {
        const cost = parseFloat(log.total_cost) || 0
        if (cost <= 10) { // Skip unrealistic costs
          return sum + cost
        }
      }
      return sum
    }, 0) || 0

    // Calculate total cost from ALL sources (for reference/logging)
    const mcpCost = (requestLogs || []).reduce((sum, log) => sum + (parseFloat(log.total_cost) || 0), 0) || 0
    const chatCost = (chatLogs || []).reduce((sum, log) => sum + (parseFloat(log.total_cost) || 0), 0) || 0
    const totalCostFromLogs = mcpCost + chatCost

    console.log(`[Dashboard Stats] User-paid cost THIS MONTH: $${userPaidCost.toFixed(4)} (from user_key source_type)`)
    console.log(`[Dashboard Stats] Total cost (all sources) THIS MONTH: $${totalCostFromLogs.toFixed(4)} (MCP: $${mcpCost.toFixed(4)} + Chat: $${chatCost.toFixed(4)})`)
    console.log(`[Dashboard Stats] Total tokens THIS MONTH: ${totalUsageTokens} (MCP: ${mcpTokenCount} + Chat: ${chatTokens})`)

    // Calculate average response time from BOTH MCP and chat data - only from successful requests
    // Use more realistic bounds: 100ms minimum (network latency), 30s max (reasonable timeout)
    const mcpResponseTimes = (requestLogs || [])
      .filter(log => {
        const responseTime = log.response_time_ms as number
        const hasResponseTime = 'response_time_ms' in log && responseTime > 0
        const isSuccessful = (log as any).status === 'success' || (!(log as any).status && log.total_tokens > 0)
        const isReasonableTime = responseTime >= 100 && responseTime <= 30000 // 100ms to 30 seconds
        return hasResponseTime && isSuccessful && isReasonableTime
      })
      .map(log => (log as any).response_time_ms)

    // Chat logs don't have response_time_ms, so skip them for response time calculation
    const chatResponseTimes: number[] = []

    const allResponseTimes = [...mcpResponseTimes, ...chatResponseTimes]
    
    // Use median for more accurate representation (less affected by outliers)
    let avgResponseTime = 0
    if (allResponseTimes.length > 0) {
      const sorted = [...allResponseTimes].sort((a, b) => a - b)
      const mid = Math.floor(sorted.length / 2)
      avgResponseTime = sorted.length % 2 !== 0 
        ? sorted[mid] 
        : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    }

    console.log(`[Dashboard Stats] Response time calculation: ${allResponseTimes.length} samples, median: ${avgResponseTime}ms`)

    // Calculate success rate from BOTH MCP and chat sources
    // Count total requests that have any response data (not just those with tokens)
    const mcpTotalRequests = (requestLogs || []).length
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

    // For chat sessions - count based on actual logged entries
    const chatTotalRequests = (chatLogs || []).length
    const chatSuccessfulRequests = (chatLogs || []).filter(log => {
      // Chat logs assume success if entry exists with tokens
      const hasTokens = log.total_tokens && log.total_tokens > 0
      const hasCost = log.total_cost && log.total_cost > 0
      return hasTokens || hasCost
    }).length

    const totalSuccessfulRequests = mcpSuccessfulRequests + chatSuccessfulRequests
    const totalRequestsForSuccessRate = mcpTotalRequests + chatTotalRequests
    const systemUptime = totalRequestsForSuccessRate > 0 
      ? `${((totalSuccessfulRequests / totalRequestsForSuccessRate) * 100).toFixed(1)}%` 
      : 'N/A'

    console.log(`[Dashboard Stats] Success rate: ${totalSuccessfulRequests}/${totalRequestsForSuccessRate} = ${systemUptime}`)

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
      allTimeApiCalls: allTimeTotalApiCalls,
      allTimeTokens: allTimeTotalTokens,
      allTimeCost: allTimeUserPaidCost,
      requestsToday: ((requestLogs || []).filter(log => {
        const logDate = new Date(log.created_at)
        return logDate >= todayStart
      }).length || 0) + ((chatLogs || []).filter(log => {
        const logDate = new Date(log.created_at)
        return logDate >= todayStart
      }).length || 0),
      costToday: parseFloat(((requestLogs || []).filter(log => {
        const logDate = new Date(log.created_at)
        // Only count costs from user_key (user's own API keys)
        return logDate >= todayStart && log.source_type === 'user_key'
      }).reduce((sum, log) => {
        const cost = parseFloat(log.total_cost) || 0
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
        ;(usageLogs || []).forEach(usage => {
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

      // Cost breakdown by source (user-paid only) - from mcp_request_logs
      costBreakdown: {
        userApiKeys: (requestLogs || [])
          .filter(log => log.source_type === 'user_key')
          .reduce((sum, log) => sum + (parseFloat(log.total_cost) || 0), 0),
        userCli: (requestLogs || [])
          .filter(log => log.source_type === 'user_cli')
          .reduce((sum, log) => sum + (parseFloat(log.total_cost) || 0), 0),
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
        ;(usageLogs || []).forEach(usage => {
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
      })(),

      // DUAL-MODE BREAKDOWN: Shows statistics separated by mode
      modeBreakdown: {
        // Standard Mode: Using Polydev's API keys
        standard: {
          messages: standardModeMessages,
          tokens: standardModeTokens,
          mode: 'Polydev API Keys (conversations saved)',
          description: 'Tracked for billing and tier limits'
        },
        // BYOK Mode: Using user's own API keys
        byok: {
          sessions: ephemeralSessions,
          requests: ephemeralRequests,
          tokens: ephemeralTokens,
          estimatedCost: parseFloat(ephemeralCost.toFixed(4)),
          mode: 'Your API Keys (ephemeral, not saved)',
          description: 'No conversation content saved, metadata only'
        },
        // All-time breakdown
        allTime: {
          standard: {
            messages: allTimeStandardMessages,
            tokens: allTimeStandardTokens
          },
          byok: {
            sessions: allTimeEphemeralSessions,
            requests: allTimeEphemeralRequests,
            tokens: allTimeEphemeralTokens,
            estimatedCost: parseFloat(allTimeEphemeralCost.toFixed(4))
          }
        }
      }
    }

    // Use already fetched providers registry data (from parallel query)
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
        'xai': 'xai',
        'x-ai': 'xai', // Use xai ID which has proper SVG logo
        'moonshot': 'moonshotai', // Use moonshotai for proper logo
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
            tokens_used: response.tokens_used || response.total_tokens || 0,
            response_time_ms: response.response_time_ms || log.response_time_ms || 0,
            error: response.error || false
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
            tokens_used: log.total_tokens || 0,
            response_time_ms: log.response_time_ms || 0,
            error: false
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
            logo: providerInfo.logo_url || providerInfo.logo,
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
        pStats.totalTokens += provider.tokens_used || 0
        pStats.totalLatency += provider.response_time_ms || 0
        if (provider.error) pStats.errorCount++
        else pStats.successCount++
        if (provider.model) pStats.models.add(provider.model)

        // Model analytics
        const modelKey = `${provider.provider}:${provider.model}`
        if (!modelAnalytics[modelKey]) {
          // Get provider info for model analytics as well
          const normalizedProviderId = normalizeId(provider.provider)
          const providerInfo = modelsDevProviders?.find(p => normalizeId(p.id || '') === normalizedProviderId) || {}

          modelAnalytics[modelKey] = {
            provider: providerInfo.name || provider.provider,
            providerLogo: providerInfo.logo_url || providerInfo.logo,
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
        mStats.totalTokens += provider.tokens_used || 0
        mStats.totalLatency += provider.response_time_ms || 0
        if (provider.error) mStats.errorCount++
        else mStats.successCount++
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
      requestLogsCount: (stats as any).requestLogs?.length,
      // All-time values
      allTimeMessages: stats.allTimeMessages,
      allTimeApiCalls: stats.allTimeApiCalls,
      allTimeTokens: stats.allTimeTokens,
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