import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../utils/supabase/server'

// Simple in-memory cache for request logs - cache for 30 seconds
const requestLogsCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 30 * 1000 // 30 seconds

// Helper function to infer provider from model name - ENHANCED with all mappings
const getProviderFromModel = (modelName: string) => {
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

  // Groq models
  if (normalizedModel.includes('groq')) return 'groq'

  // Moonshot (Kimi) models
  if (normalizedModel.includes('kimi') || normalizedModel.includes('moonshot')) return 'moonshot'

  // Qwen models (Alibaba)
  if (normalizedModel.includes('qwen')) return 'qwen'

  // GLM models (Zhipu AI)
  if (normalizedModel.includes('glm')) return 'glm'

  // Other providers
  if (normalizedModel.includes('mistral')) return 'mistral'
  if (normalizedModel.includes('together')) return 'together'
  if (normalizedModel.includes('perplexity')) return 'perplexity'
  if (normalizedModel.includes('cohere')) return 'cohere'
  if (normalizedModel.includes('huggingface') || normalizedModel.includes('hugging-face')) return 'huggingface'
  if (normalizedModel.includes('openrouter')) return 'openrouter'
  if (normalizedModel.includes('fireworks')) return 'fireworksai'
  if (normalizedModel.includes('replicate')) return 'replicate'

  // Additional mappings for unknown models
  if (normalizedModel.includes('pt-oss')) return 'huggingface'  // PT-OSS is on Hugging Face
  if (normalizedModel === 'view') return 'unknown'  // Generic view model

  // Fallback: return unknown instead of model name
  return 'unknown'
}

// Map provider keys to display names
const getProviderDisplayName = (providerKey: string) => {
  const normalizedKey = providerKey.toLowerCase().trim()

  // Direct mappings for common providers
  const providerMappings: Record<string, string> = {
    'openai': 'OpenAI',
    'anthropic': 'Anthropic',
    'google': 'Google',
    'googlevertexai': 'Google',
    'googlegemini': 'Google',
    'mistral': 'Mistral',
    'mistralai': 'Mistral',
    'together': 'Together AI',
    'togetherai': 'Together AI',
    'cerebras': 'Cerebras',
    'xai': 'xAI',
    'x-ai': 'xAI',
    'perplexity': 'Perplexity',
    'cohere': 'Cohere',
    'huggingface': 'Hugging Face',
    'hugging-face': 'Hugging Face',
    'deepseek': 'DeepSeek',
    'moonshot': 'Moonshot AI',
    'qwen': 'Alibaba',
    'glm': 'Zhipu AI',
    'groq': 'Groq',
    'openrouter': 'OpenRouter',
    'fireworksai': 'Fireworks AI',
    'replicate': 'Replicate',
    'claude': 'Anthropic',
    'gpt': 'OpenAI',
    'gemini': 'Google',
    'unknown': 'Unknown Provider'
  }

  // Check direct mappings first
  if (providerMappings[normalizedKey]) {
    return providerMappings[normalizedKey]
  }

  // Check if the key contains any provider name
  for (const [key, name] of Object.entries(providerMappings)) {
    if (normalizedKey.includes(key) || key.includes(normalizedKey)) {
      return name
    }
  }

  // Fallback to Unknown Provider instead of original key
  return 'Unknown Provider'
}

export async function GET(request: NextRequest) {
  console.log('🔥🔥🔥 REQUEST-LOGS API CALLED - Starting request processing')
  try {
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

    // Create cache key based on user and parameters
    const cacheKey = `${user.id}-${limit}-${offset}-${status || ''}-${dateFrom || ''}-${dateTo || ''}`

    // Check cache first
    const cached = requestLogsCache.get(cacheKey)
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log('🚀 CACHE HIT - Serving cached request logs')
      return NextResponse.json(cached.data)
    }

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

    // Fetch MCP client requests with limit for better performance
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
        cli_responses,
        created_at,
        client_id,
        temperature,
        max_tokens_requested,
        source_type
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit) // Apply limit early to reduce processing

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

    // Fetch chat logs with minimal joins for better performance
    let chatQuery = supabase
      .from('chat_logs')
      .select(`
        id,
        session_id,
        models_used,
        message_count,
        total_tokens,
        total_cost,
        created_at,
        chat_sessions!inner (
          id,
          title
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit) // Apply limit early to reduce processing

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

    // Transform MCP logs to unified format - OPTIMIZED for performance
    const transformedMcpLogs = mcpLogs?.map(log => {
      // Apply consistent cost filtering - skip unrealistic costs over $10
      const rawCost = parseFloat(log.total_cost || '0')
      const filteredCost = rawCost > 10 ? 0 : rawCost

      // Pre-compute provider latencies and costs for efficiency
      const providerLatencies = log.provider_latencies || {}
      const providerCosts = log.provider_costs || {}
      const providerResponses = log.provider_responses || {}
      const cliResponses = log.cli_responses || []

      // Cache latency calculations
      const latencyValues = Object.values(providerLatencies) as number[]
      const avgLatency = latencyValues.length > 0
        ? Math.round(latencyValues.reduce((a, b) => a + b, 0) / latencyValues.length)
        : 0

      // Transform CLI responses into provider format
      const cliProviders = Array.isArray(cliResponses) ? cliResponses.map((cli: any) => {
        // Map CLI provider_id to display names
        const cliDisplayNames: Record<string, string> = {
          'claude_code': 'Claude Code CLI',
          'codex_cli': 'Codex CLI',
          'gemini_cli': 'Gemini CLI'
        }
        // Map CLI provider_id to actual provider names (for logo lookup)
        const cliProviderNames: Record<string, string> = {
          'claude_code': 'Anthropic',
          'codex_cli': 'OpenAI',
          'gemini_cli': 'Google'
        }
        
        // Get model - check model_used first (from cliManager), then model field, then fallback
        const cliModel = cli.model_used || cli.model
        const displayModel = cliModel && cliModel !== 'cli_default' && cliModel !== 'CLI Default' && cliModel !== 'cli_default_fallback'
          ? cliModel 
          : 'CLI Default'
        
        return {
          provider: cliProviderNames[cli.provider_id] || cli.provider_id, // Use actual provider name for logo
          model: displayModel,
          cost: 0, // CLI responses are free (use your own API keys)
          latency: cli.latency_ms || 0,
          tokens: cli.tokens_used || 0,
          success: cli.success !== false,
          response: cli.content || null,
          fullResponse: cli,
          paymentMethod: 'cli',
          source: 'cli',
          cli_tool: cli.provider_id,
          cli_display_name: cliDisplayNames[cli.provider_id] || cli.provider_id, // Keep CLI display name
          underlyingProvider: cliProviderNames[cli.provider_id] || null
        }
      }) : []

      return {
        id: log.id,
        timestamp: log.created_at,
        prompt: log.prompt.length > 200 ? log.prompt.substring(0, 200) + '...' : log.prompt,
        fullPrompt: log.prompt,
        models: log.models_requested,
        totalTokens: log.total_tokens,
        cost: filteredCost,
        speed: log.response_time_ms && log.total_tokens
          ? (log.total_tokens / (log.response_time_ms / 1000)).toFixed(1)
          : '0',
        responseTime: log.response_time_ms,
        status: log.status,
        successfulProviders: log.successful_providers,
        failedProviders: log.failed_providers,
        client: log.client_id || 'MCP Client',
        temperature: log.temperature,
        maxTokens: log.max_tokens_requested,
        source: 'mcp',

        // OPTIMIZED provider breakdown - CLI providers first, then API providers
        providers: [
          // CLI providers first (primary source)
          ...cliProviders,
          // Then API providers
          ...Object.entries(providerCosts).map(([key, cost]) => {
          const parts = key.split(':')
          const provider = parts[0]
          const modelName = parts.length === 1 ? provider : (parts[1] || provider)
          const latency = providerLatencies[key] || 0

          // FIXED: Look up response by exact key first, then fallback to model name match
          // This handles cases where provider_costs has "unknown:model" but provider_responses has "actual-provider:model"
          let response = providerResponses[key]
          if (!response && modelName) {
            // Try to find response by matching model name (part after colon)
            const matchingKey = Object.keys(providerResponses).find(k => {
              const responseModel = k.includes(':') ? k.split(':')[1] : k
              return responseModel === modelName
            })
            if (matchingKey) {
              response = providerResponses[matchingKey]
            }
          }

          // Optimize provider inference with early return for common providers
          let correctProvider = provider.toLowerCase()
          if (correctProvider.includes('gpt') || correctProvider.includes('openai')) {
            correctProvider = 'openai'
          } else if (correctProvider.includes('claude') || correctProvider.includes('anthropic')) {
            correctProvider = 'anthropic'
          } else if (correctProvider.includes('gemini') || correctProvider.includes('google')) {
            correctProvider = 'google'
          } else {
            correctProvider = getProviderFromModel(modelName) // Fallback to full inference
          }

          const rawProviderCost = parseFloat(cost as string)
          const filteredProviderCost = rawProviderCost > 10 ? 0 : rawProviderCost

          // FIXED: Calculate per-provider tokens with multiple fallback strategies
          let providerTokens = 0

          // Strategy 1: Use explicit tokens from response
          if (response?.tokens_used || response?.total_tokens) {
            providerTokens = response.tokens_used || response.total_tokens
          }
          // Strategy 2: Calculate proportionally based on cost share
          else if (log.total_tokens && rawCost > 0) {
            const totalCost = Object.values(providerCosts).reduce((sum: number, c: any) => sum + parseFloat(c || '0'), 0)
            if (totalCost > 0) {
              providerTokens = Math.round(log.total_tokens * (rawProviderCost / totalCost))
            }
          }
          // Strategy 3: Distribute equally if no cost data
          else if (log.total_tokens) {
            const providerCount = Object.keys(providerCosts).length
            providerTokens = Math.round(log.total_tokens / Math.max(providerCount, 1))
          }

          return {
            provider: getProviderDisplayName(correctProvider),
            model: modelName,
            cost: filteredProviderCost,
            latency,
            tokens: providerTokens,
            success: !!response,
            response: response?.content || null,
            fullResponse: response || null,
            // FIXED: Determine paymentMethod based on individual provider's source field
            // Admin keys (admin_key, admin_credits) = credits, user_key = api_key
            paymentMethod: response?.source === 'admin_credits' || response?.source === 'admin_key' ? 'credits' : 
                          response?.source === 'cli' ? 'cli' : 'api_key',
            // CLI indicator fields
            source: response?.source || 'api',
            cli_tool: response?.cli_tool || null
          }
        })
        ],

        fullPromptContent: log.prompt,
        allProviderResponses: providerResponses,
        cliResponses: cliResponses, // Include raw CLI responses
        avgLatency,
        tokensPerSecond: log.response_time_ms && log.total_tokens
          ? parseFloat((log.total_tokens / (log.response_time_ms / 1000)).toFixed(1))
          : 0,
        // FIXED: Determine request-level paymentMethod from individual provider sources
        // Admin keys (admin_key, admin_credits) = credits
        paymentMethod: Object.values(providerResponses).some((r: any) => r?.source === 'admin_credits' || r?.source === 'admin_key') 
          ? 'credits' : (log.source_type === 'admin_credits' || log.source_type === 'admin_key' ? 'credits' : 'api_key'),
        // Request-level CLI indicator (if any provider is CLI)
        hasCliResponse: cliProviders.length > 0 || Object.values(providerResponses).some((r: any) => r?.source === 'cli'),
        cliCount: cliProviders.length
      }
    }) || []

    // Fetch provider info from chat_messages for all chat log sessions
    // This tells us if credits (admin) or user API keys were used
    // Also fetch message content to display in request details
    const chatSessionIds = chatLogs?.map(log => log.session_id).filter(Boolean) || []
    let chatProviderInfoMap: Record<string, Record<string, string>> = {}
    let chatMessageContentMap: Record<string, Array<{ model_id: string, content: string, role: string }>> = {}

    if (chatSessionIds.length > 0) {
      const { data: chatMessages } = await supabase
        .from('chat_messages')
        .select('session_id, model_id, provider_info, content, role')
        .in('session_id', chatSessionIds)
        .order('created_at', { ascending: true })

      // Build maps for provider info and message content
      chatMessages?.forEach((msg: any) => {
        // Provider info map (for payment method)
        if (!chatProviderInfoMap[msg.session_id]) {
          chatProviderInfoMap[msg.session_id] = {}
        }
        if (msg.role === 'assistant') {
          const providerInfo = msg.provider_info || {}
          chatProviderInfoMap[msg.session_id][msg.model_id] = providerInfo.fallback_method || 'unknown'
        }
        
        // Message content map (for displaying responses)
        if (!chatMessageContentMap[msg.session_id]) {
          chatMessageContentMap[msg.session_id] = []
        }
        chatMessageContentMap[msg.session_id].push({
          model_id: msg.model_id,
          content: msg.content,
          role: msg.role
        })
      })
    }

    // Transform chat logs to unified format - simplified for performance
    const transformedChatLogs = chatLogs?.map(log => {
      // Get basic session info without complex joins
      const chatSession = Array.isArray(log.chat_sessions) ? log.chat_sessions[0] : log.chat_sessions

      // Apply consistent cost filtering to chat logs as well
      const rawChatCost = parseFloat(log.total_cost || '0')
      const filteredChatCost = rawChatCost > 10 ? 0 : rawChatCost

      // Get provider info for this session's models
      const sessionProviderInfo = chatProviderInfoMap[log.session_id] || {}
      
      // Get actual conversation content for this session
      const sessionMessages = chatMessageContentMap[log.session_id] || []
      
      // Get the last assistant response for quick preview
      const lastAssistantMessage = [...sessionMessages].reverse().find(m => m.role === 'assistant')
      const lastUserMessage = [...sessionMessages].reverse().find(m => m.role === 'user')

      return {
        id: log.id,
        timestamp: log.created_at,
        prompt: lastUserMessage?.content 
          ? (lastUserMessage.content.length > 200 ? lastUserMessage.content.substring(0, 200) + '...' : lastUserMessage.content)
          : `Chat Session (${log.message_count || 0} messages)`,
        fullPrompt: lastUserMessage?.content || `Chat Session: "${chatSession?.title || 'Untitled'}"`,
        fullConversation: sessionMessages, // Include actual conversation for display
        models: log.models_used || [],
        totalTokens: log.total_tokens || 0,
        cost: filteredChatCost,
        speed: '0', // Chat logs don't have response time per message
        responseTime: null,
        status: 'success', // Assume success for completed chat logs
        successfulProviders: 1,
        failedProviders: 0,
        client: 'Web Chat',
        temperature: null,
        maxTokens: null,
        source: 'chat',
        sessionTitle: chatSession?.title || 'Untitled Session',

        // Provider breakdown - reconstruct from models_used
        providers: (log.models_used || []).map((model: string) => {
          const getProviderFromModel = (modelName: string) => {
            const normalizedModel = modelName.toLowerCase()

            // OpenAI models
            if (normalizedModel.includes('gpt') || normalizedModel.includes('openai')) return 'OpenAI'

            // Anthropic models
            if (normalizedModel.includes('claude') || normalizedModel.includes('anthropic')) return 'Anthropic'

            // Google models
            if (normalizedModel.includes('gemini') || normalizedModel.includes('google')) return 'Google'

            // xAI models
            if (normalizedModel.includes('xai') || normalizedModel.includes('x-ai') || normalizedModel.includes('grok')) return 'xAI'

            // DeepSeek models
            if (normalizedModel.includes('deepseek')) return 'DeepSeek'

            // Cerebras models
            if (normalizedModel.includes('cerebras')) return 'Cerebras'

            // Groq models
            if (normalizedModel.includes('groq')) return 'Groq'

            // Moonshot (Kimi) models
            if (normalizedModel.includes('kimi') || normalizedModel.includes('moonshot')) return 'Moonshot AI'

            // Qwen models (Alibaba)
            if (normalizedModel.includes('qwen')) return 'Alibaba'

            // GLM models (Zhipu AI)
            if (normalizedModel.includes('glm')) return 'Zhipu AI'

            // Other providers
            if (normalizedModel.includes('mistral')) return 'Mistral'
            if (normalizedModel.includes('together')) return 'Together AI'
            if (normalizedModel.includes('perplexity')) return 'Perplexity'
            if (normalizedModel.includes('cohere')) return 'Cohere'
            if (normalizedModel.includes('huggingface') || normalizedModel.includes('hugging-face')) return 'Hugging Face'
            if (normalizedModel.includes('openrouter')) return 'OpenRouter'
            if (normalizedModel.includes('fireworks')) return 'Fireworks AI'
            if (normalizedModel.includes('replicate')) return 'Replicate'

            // Additional mappings for unknown models
            if (normalizedModel.includes('pt-oss')) return 'Hugging Face'  // PT-OSS is on Hugging Face
            if (normalizedModel === 'view') return 'Unknown Provider'  // Generic view model

            // If model is in format "provider/model", extract provider
            if (model.includes('/')) {
              const provider = model.split('/')[0]
              return provider.charAt(0).toUpperCase() + provider.slice(1)
            }

            // Fallback: return Unknown Provider instead of model name
            return 'Unknown Provider'
          }

          // Apply consistent cost filtering to chat provider costs
          const rawChatProviderCost = parseFloat(log.total_cost || '0') / (log.models_used?.length || 1)
          const filteredChatProviderCost = rawChatProviderCost > 10 ? 0 : rawChatProviderCost

          // Determine payment method from provider_info.fallback_method
          // 'admin' = platform credits, 'user' or other = user's own API key
          const modelFallbackMethod = sessionProviderInfo[model] || 'unknown'
          const modelPaymentMethod = modelFallbackMethod === 'admin' ? 'credits' : 'api_key'
          
          // Find the assistant response for this model
          const modelResponse = sessionMessages.find(m => m.role === 'assistant' && m.model_id === model)

          return {
            provider: getProviderFromModel(model),
            model: model.includes('/') ? model.split('/')[1] : model,
            cost: filteredChatProviderCost,
            latency: 0,
            tokens: Math.round((log.total_tokens || 0) / (log.models_used?.length || 1)),
            success: true,
            response: modelResponse?.content || null,
            paymentMethod: modelPaymentMethod
          }
        }),

        // Overall metrics
        avgLatency: 0,
        tokensPerSecond: 0,
        messageCount: log.message_count,
        // Request-level: show 'credits' if any model used admin credits
        paymentMethod: Object.values(sessionProviderInfo).some(method => method === 'admin') ? 'credits' : 'api_key'
      }
    }) || []

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

    const result = {
      logs: allLogs,
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore: totalCount > offset + limit
      }
    }

    // Store in cache for future requests
    requestLogsCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    })

    return NextResponse.json(result)

  } catch (error) {
    console.error('[Request Logs API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch request logs' },
      { status: 500 }
    )
  }
}