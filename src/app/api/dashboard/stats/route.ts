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
    console.log('[Dashboard Stats] Executing optimized parallel database queries with monthStart:', monthStartISO)

    // PHASE 1: Fast COUNT queries for accurate totals (no data transfer, just counts)
    const [
      // Monthly COUNT queries - accurate totals without fetching all records
      mcpRequestCountResult,
      chatLogCountResult,
      ephemeralCountResult,
      // All-time COUNT queries
      allTimeMcpCountResult,
      allTimeChatCountResult,
      allTimeEphemeralCountResult,
    ] = await Promise.allSettled([
      // Monthly MCP request count
      supabase
        .from('mcp_request_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', monthStartISO),
      
      // Monthly chat log count  
      supabase
        .from('chat_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', monthStartISO),
      
      // Monthly ephemeral usage count
      supabase
        .from('ephemeral_usage')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('used_byok', true)
        .gte('created_at', monthStartISO),

      // All-time MCP request count
      supabase
        .from('mcp_request_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id),
      
      // All-time chat log count
      supabase
        .from('chat_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id),
      
      // All-time ephemeral usage count
      supabase
        .from('ephemeral_usage')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('used_byok', true),
    ])

    // Extract accurate counts from COUNT queries
    const mcpMessagesCount = mcpRequestCountResult.status === 'fulfilled' ? (mcpRequestCountResult.value.count || 0) : 0
    const chatMessagesCount = chatLogCountResult.status === 'fulfilled' ? (chatLogCountResult.value.count || 0) : 0
    const ephemeralRequestsCount = ephemeralCountResult.status === 'fulfilled' ? (ephemeralCountResult.value.count || 0) : 0
    
    const allTimeMcpCount = allTimeMcpCountResult.status === 'fulfilled' ? (allTimeMcpCountResult.value.count || 0) : 0
    const allTimeChatCount = allTimeChatCountResult.status === 'fulfilled' ? (allTimeChatCountResult.value.count || 0) : 0
    const allTimeEphemeralCount = allTimeEphemeralCountResult.status === 'fulfilled' ? (allTimeEphemeralCountResult.value.count || 0) : 0

    console.log('[Dashboard Stats] Accurate COUNT results:', {
      monthly: { mcp: mcpMessagesCount, chat: chatMessagesCount, ephemeral: ephemeralRequestsCount },
      allTime: { mcp: allTimeMcpCount, chat: allTimeChatCount, ephemeral: allTimeEphemeralCount }
    })

    // PHASE 2: Aggregated queries for sums and analytics (uses database-level aggregation)
    const [
      userCreditsResult,
      mcpTokensResult,
      allTokensResult,
      userTokensResult,
      apiKeysResult,
      providersResult,
      // Monthly aggregates - SUM queries for tokens/cost (more efficient than fetching all rows)
      mcpMonthlyAggResult,
      chatMonthlyAggResult,
      ephemeralMonthlyAggResult,
      // All-time aggregates
      mcpAllTimeAggResult,
      chatAllTimeAggResult,
      ephemeralAllTimeAggResult,
      // Limited recent data for analytics and activity display
      recentRequestLogsResult,
      recentChatLogsResult,
      providersRegistryResult,
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

      // 6. Monthly MCP aggregates (SUM tokens, SUM cost)
      supabase
        .from('mcp_request_logs')
        .select('total_tokens.sum(), total_cost.sum()')
        .eq('user_id', user.id)
        .gte('created_at', monthStartISO)
        .single(),

      // 7. Monthly chat aggregates
      supabase
        .from('chat_logs')
        .select('total_tokens.sum(), total_cost.sum()')
        .eq('user_id', user.id)
        .gte('created_at', monthStartISO)
        .single(),

      // 8. Monthly ephemeral aggregates
      supabase
        .from('ephemeral_usage')
        .select('total_tokens.sum(), estimated_cost_usd.sum()')
        .eq('user_id', user.id)
        .eq('used_byok', true)
        .gte('created_at', monthStartISO)
        .single(),

      // 9. All-time MCP aggregates
      supabase
        .from('mcp_request_logs')
        .select('total_tokens.sum(), total_cost.sum()')
        .eq('user_id', user.id)
        .single(),

      // 10. All-time chat aggregates
      supabase
        .from('chat_logs')
        .select('total_tokens.sum(), total_cost.sum()')
        .eq('user_id', user.id)
        .single(),

      // 11. All-time ephemeral aggregates
      supabase
        .from('ephemeral_usage')
        .select('total_tokens.sum(), estimated_cost_usd.sum()')
        .eq('user_id', user.id)
        .eq('used_byok', true)
        .single(),

      // 12. Recent request logs for analytics and activity (limited for performance)
      supabase
        .from('mcp_request_logs')
        .select('total_tokens, total_cost, created_at, provider_responses, response_time_ms, status, successful_providers, failed_providers, provider_costs, source_type')
        .eq('user_id', user.id)
        .gte('created_at', monthStartISO)
        .order('created_at', { ascending: false })
        .limit(200), // Reduced from 500, used only for analytics breakdown

      // 13. Recent chat logs for analytics (limited for performance)
      supabase
        .from('chat_logs')
        .select('total_tokens, total_cost, created_at, models_used')
        .eq('user_id', user.id)
        .gte('created_at', monthStartISO)
        .order('created_at', { ascending: false })
        .limit(200),

      // 14. Providers registry for display names/logos
      supabase
        .from('providers_registry')
        .select('*')
        .eq('is_active', true),
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
    
    // Recent logs for analytics (limited dataset)
    const requestLogs = recentRequestLogsResult.status === 'fulfilled' ? recentRequestLogsResult.value.data : []
    const chatLogs = recentChatLogsResult.status === 'fulfilled' ? recentChatLogsResult.value.data : []
    const modelsDevProviders = providersRegistryResult.status === 'fulfilled' ? providersRegistryResult.value.data : []

    // Extract aggregated sums
    const mcpMonthlyAgg = mcpMonthlyAggResult.status === 'fulfilled' && !mcpMonthlyAggResult.value.error 
      ? mcpMonthlyAggResult.value.data : null
    const chatMonthlyAgg = chatMonthlyAggResult.status === 'fulfilled' && !chatMonthlyAggResult.value.error
      ? chatMonthlyAggResult.value.data : null
    const ephemeralMonthlyAgg = ephemeralMonthlyAggResult.status === 'fulfilled' && !ephemeralMonthlyAggResult.value.error
      ? ephemeralMonthlyAggResult.value.data : null
    const mcpAllTimeAgg = mcpAllTimeAggResult.status === 'fulfilled' && !mcpAllTimeAggResult.value.error
      ? mcpAllTimeAggResult.value.data : null
    const chatAllTimeAgg = chatAllTimeAggResult.status === 'fulfilled' && !chatAllTimeAggResult.value.error
      ? chatAllTimeAggResult.value.data : null
    const ephemeralAllTimeAgg = ephemeralAllTimeAggResult.status === 'fulfilled' && !ephemeralAllTimeAggResult.value.error
      ? ephemeralAllTimeAggResult.value.data : null

    console.log('[Dashboard Stats] Aggregated sums:', {
      mcpMonthly: mcpMonthlyAgg,
      chatMonthly: chatMonthlyAgg,
      ephemeralMonthly: ephemeralMonthlyAgg,
      mcpAllTime: mcpAllTimeAgg,
      chatAllTime: chatAllTimeAgg,
      ephemeralAllTime: ephemeralAllTimeAgg
    })

    // Log any errors from the queries
    if (recentChatLogsResult.status === 'rejected' || (recentChatLogsResult.status === 'fulfilled' && recentChatLogsResult.value.error)) {
      console.error('[Dashboard Stats] Chat logs query error:', recentChatLogsResult.status === 'rejected' ? recentChatLogsResult.reason : recentChatLogsResult.value.error)
    }
    if (recentRequestLogsResult.status === 'rejected' || (recentRequestLogsResult.status === 'fulfilled' && recentRequestLogsResult.value.error)) {
      console.error('[Dashboard Stats] Request logs query error:', recentRequestLogsResult.status === 'rejected' ? recentRequestLogsResult.reason : recentRequestLogsResult.value.error)
    }

    console.log('[Dashboard Stats] Parallel queries completed (OPTIMIZED with COUNT + AGG):', {
      userCredits: !!userCredits,
      mcpTokens: mcpTokens?.length || 0,
      allTokens: allTokens?.length || 0,
      userTokens: userTokens?.length || 0,
      apiKeys: apiKeys?.length || 0,
      providers: providers?.length || 0,
      // Accurate counts from COUNT queries
      mcpMessagesCountAccurate: mcpMessagesCount,
      chatMessagesCountAccurate: chatMessagesCount,
      // Limited logs for analytics only
      recentRequestLogs: requestLogs?.length || 0,
      recentChatLogs: chatLogs?.length || 0,
      modelsDevProviders: modelsDevProviders?.length || 0,
    })

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

    // ============================================================
    // STATS OBJECT CONSTRUCTION - Using accurate COUNT + aggregated data
    // ============================================================
    
    // Calculate response time from recent logs (this is fine from limited data)
    const logsForTiming = requestLogs || []
    const totalResponseTime = logsForTiming.reduce((sum: number, log: any) => sum + (log.response_time_ms || 0), 0)
    const avgResponseTime = logsForTiming.length > 0 
      ? Math.round(totalResponseTime / logsForTiming.length) 
      : 0

    // Calculate monthly totals using aggregated sums (database-level, no limit issues)
    // Note: Supabase aggregate returns varying structures, so we use any-casting for safety
    const mcpAggMonthly = mcpMonthlyAgg as any
    const chatAggMonthly = chatMonthlyAgg as any
    const ephAggMonthly = ephemeralMonthlyAgg as any
    
    const monthlyMcpTokens = mcpAggMonthly?.sum || mcpAggMonthly?.total_tokens || 0
    const monthlyMcpCost = mcpAggMonthly?.total_cost || mcpAggMonthly?.['sum.total_cost'] || 0
    const monthlyChatTokens = chatAggMonthly?.sum || chatAggMonthly?.total_tokens || 0
    const monthlyChatCost = chatAggMonthly?.total_cost || chatAggMonthly?.['sum.total_cost'] || 0
    const monthlyEphemeralTokens = ephAggMonthly?.sum || ephAggMonthly?.total_tokens || 0
    const monthlyEphemeralCost = ephAggMonthly?.estimated_cost_usd || ephAggMonthly?.['sum.estimated_cost_usd'] || 0

    const monthlyTotalTokens = monthlyMcpTokens + monthlyChatTokens + monthlyEphemeralTokens
    const monthlyTotalCost = monthlyMcpCost + monthlyChatCost + monthlyEphemeralCost

    // Calculate all-time totals using aggregated sums
    const mcpAggAllTime = mcpAllTimeAgg as any
    const chatAggAllTime = chatAllTimeAgg as any
    const ephAggAllTime = ephemeralAllTimeAgg as any
    
    const allTimeMcpTokens = mcpAggAllTime?.sum || mcpAggAllTime?.total_tokens || 0
    const allTimeMcpCost = mcpAggAllTime?.total_cost || mcpAggAllTime?.['sum.total_cost'] || 0
    const allTimeChatTokens = chatAggAllTime?.sum || chatAggAllTime?.total_tokens || 0
    const allTimeChatCost = chatAggAllTime?.total_cost || chatAggAllTime?.['sum.total_cost'] || 0
    const allTimeEphemeralTokens = ephAggAllTime?.sum || ephAggAllTime?.total_tokens || 0
    const allTimeEphemeralCost = ephAggAllTime?.estimated_cost_usd || ephAggAllTime?.['sum.estimated_cost_usd'] || 0

    const allTimeTotalTokens = allTimeMcpTokens + allTimeChatTokens + allTimeEphemeralTokens
    const allTimeTotalCost = allTimeMcpCost + allTimeChatCost + allTimeEphemeralCost

    // Get subscription info
    const subscriptionInfo = await subscriptionManager.getUserSubscription(user.id, true)
    const currentPlan = subscriptionInfo?.tier || 'free'

    // Process API keys for provider stats
    const providerStats = (apiKeys || []).map((key: any) => ({
      provider: key.provider,
      active: key.active !== false,
      lastUsed: key.last_used_at,
      currentUsage: key.current_usage || 0,
      monthlyBudget: key.monthly_budget,
      maxTokens: key.max_tokens
    }))

    // Build the complete stats object
    const stats = {
      // Credits
      creditsBalance: userCredits?.balance || 0,
      promotionalBalance: userCredits?.promotional_balance || 0,
      
      // Monthly stats - using ACCURATE COUNT queries
      totalMessages: mcpMessagesCount + chatMessagesCount,  // Accurate count from COUNT query
      totalApiCalls: mcpMessagesCount + ephemeralRequestsCount,  // Accurate count from COUNT query
      totalTokens: monthlyTotalTokens,
      totalCost: monthlyTotalCost,
      
      // All-time stats - using ACCURATE COUNT queries
      allTimeMessages: allTimeMcpCount + allTimeChatCount,
      allTimeApiCalls: allTimeMcpCount + allTimeEphemeralCount,
      allTimeTokens: allTimeTotalTokens,
      allTimeCost: allTimeTotalCost,
      
      // Performance
      responseTime: avgResponseTime,
      
      // Connections and API keys
      activeConnections: (mcpTokens || []).length,
      totalApiKeys: (apiKeys || []).length,
      
      // Provider stats
      providerStats,
      
      // Provider/Model analytics (from limited recent logs - OK for breakdown)
      providerAnalytics: processedProviderAnalytics,
      modelAnalytics: processedModelAnalytics,
      
      // Recent request logs for activity display (limited to 50)
      requestLogs: [...(requestLogs || []), ...(chatLogs || [])].slice(0, 50),
      
      // Subscription
      subscription: {
        plan: currentPlan,
        status: subscriptionInfo?.status || 'active',
      },
      
      // Data freshness metadata
      _meta: {
        countQueries: {
          mcpMessages: mcpMessagesCount,
          chatMessages: chatMessagesCount,
          ephemeralRequests: ephemeralRequestsCount,
        },
        aggregatedFromDatabase: true,
        analyticsBasedOnRecentLogs: (requestLogs?.length || 0) + (chatLogs?.length || 0),
      }
    }

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
      requestLogsCount: stats.requestLogs?.length,
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