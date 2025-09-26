import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../utils/supabase/server'
import { subscriptionManager } from '@/lib/subscriptionManager'

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

    console.log('[Profile Stats] Fetching real statistics for user:', user.id)

    // Calculate days since joined
    const joinedDate = user.created_at ? new Date(user.created_at) : new Date()
    const daysSinceJoined = Math.floor((Date.now() - joinedDate.getTime()) / (1000 * 60 * 60 * 24))

    // Get chat sessions data
    const { data: chatSessions, error: chatSessionsError } = await supabase
      .from('chat_sessions')
      .select('id, title, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    // Get chat messages data
    const { data: chatMessages, error: chatMessagesError } = await supabase
      .from('chat_messages')
      .select('id, session_id, model_id, usage_info, cost_info, created_at')
      .in('session_id', chatSessions?.map(s => s.id) || [])
      .order('created_at', { ascending: false })

    // Get usage sessions data
    const { data: usageSessions, error: usageSessionsError } = await supabase
      .from('usage_sessions')
      .select('session_id, model_name, provider, tokens_used, cost, session_type, created_at, metadata')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Get regular sessions data
    const { data: regularSessions, error: regularSessionsError } = await supabase
      .from('sessions')
      .select('id, name, model, provider, message_count, total_tokens, total_cost_usd, created_at, updated_at, last_activity_at')
      .eq('user_id', user.id)
      .order('last_activity_at', { ascending: false })

    // Get real usage data from request logs as backup
    const { data: requestLogs, error: requestLogsError } = await supabase
      .from('mcp_request_logs')
      .select('total_tokens, total_cost, created_at, provider_responses, models_requested')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Get fallback usage data from simple usage logs
    const { data: usageLogs, error: usageLogsError } = await supabase
      .from('mcp_usage_logs')
      .select('total_tokens, total_cost, created_at, models_used')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Combine all data sources for comprehensive stats
    const allSessions = [...(chatSessions || []), ...(regularSessions || []), ...(usageSessions || [])]
    const usageData = requestLogs && requestLogs.length > 0 ? requestLogs : usageLogs

    console.log('[Profile Stats] Usage data:', {
      chatSessions: chatSessions?.length,
      chatMessages: chatMessages?.length,
      usageSessions: usageSessions?.length,
      regularSessions: regularSessions?.length,
      requestLogs: requestLogs?.length,
      usageLogs: usageLogs?.length,
      using: 'comprehensive'
    })

    // Get actual message count using consistent function across all pages (same as dashboard)
    const actualMessageCount = await subscriptionManager.getActualMessageCount(user.id, true)
    const totalChats = actualMessageCount.totalMessages

    console.log('[Profile Stats] Actual message count:', actualMessageCount)

    // Calculate total tokens from all sources
    let totalTokens = 0
    totalTokens += chatMessages?.reduce((sum, msg) => sum + (msg.usage_info?.total_tokens || 0), 0) || 0
    totalTokens += usageSessions?.reduce((sum, session) => sum + (session.tokens_used || 0), 0) || 0
    totalTokens += regularSessions?.reduce((sum, session) => sum + (session.total_tokens || 0), 0) || 0
    totalTokens += usageData?.reduce((sum, log) => sum + (log.total_tokens || 0), 0) || 0

    // Determine favorite model from all sources
    let favoriteModel = 'No usage yet'
    const modelUsage: Record<string, number> = {}

    // Count from chat messages
    chatMessages?.forEach(msg => {
      if (msg.model_id) {
        modelUsage[msg.model_id] = (modelUsage[msg.model_id] || 0) + 1
      }
    })

    // Count from usage sessions
    usageSessions?.forEach(session => {
      if (session.model_name) {
        modelUsage[session.model_name] = (modelUsage[session.model_name] || 0) + 1
      }
    })

    // Count from regular sessions
    regularSessions?.forEach(session => {
      if (session.model) {
        modelUsage[session.model] = (modelUsage[session.model] || 0) + 1
      }
    })

    // Count from usage logs
    if (usageData && usageData.length > 0) {
      usageData.forEach(log => {
        if ('provider_responses' in log && log.provider_responses && typeof log.provider_responses === 'object') {
          // For detailed logs, extract models from provider_responses
          Object.keys(log.provider_responses).forEach(key => {
            const [provider, model] = key.split(':')
            const modelName = model || provider
            modelUsage[modelName] = (modelUsage[modelName] || 0) + 1
          })
        } else if ('models_requested' in log && log.models_requested && Array.isArray(log.models_requested)) {
          // For detailed logs, use models_requested array
          log.models_requested.forEach(model => {
            modelUsage[model] = (modelUsage[model] || 0) + 1
          })
        } else if ('models_used' in log && log.models_used && typeof log.models_used === 'object') {
          // For simple logs, extract from models_used
          const models = Array.isArray(log.models_used) ? log.models_used : Object.keys(log.models_used)
          models.forEach(model => {
            modelUsage[model] = (modelUsage[model] || 0) + 1
          })
        }
      })
    }

    // Find the most used model
    const sortedModels = Object.entries(modelUsage).sort(([,a], [,b]) => b - a)
    if (sortedModels.length > 0) {
      favoriteModel = sortedModels[0][0]
    }

    // Generate recent activity from all sources
    const recentActivity: any[] = []
    const allActivities: any[] = []

    // Add chat sessions
    chatSessions?.forEach(session => {
      allActivities.push({
        timestamp: session.updated_at || session.created_at,
        action: 'Chat Session',
        model: 'Chat Window',
        tokens: 0,
        cost: 0,
        title: session.title || 'Untitled Chat'
      })
    })

    // Add chat messages with model info
    chatMessages?.forEach(msg => {
      allActivities.push({
        timestamp: msg.created_at,
        action: 'Chat Message',
        model: msg.model_id || 'Unknown Model',
        tokens: msg.usage_info?.total_tokens || 0,
        cost: msg.cost_info?.total_cost || 0
      })
    })

    // Add usage sessions
    usageSessions?.forEach(session => {
      allActivities.push({
        timestamp: session.created_at,
        action: session.session_type || 'API Session',
        model: session.model_name || 'Unknown Model',
        tokens: session.tokens_used || 0,
        cost: session.cost || 0
      })
    })

    // Add regular sessions
    regularSessions?.forEach(session => {
      allActivities.push({
        timestamp: session.last_activity_at || session.updated_at || session.created_at,
        action: 'Session Activity',
        model: session.model || 'Unknown Model',
        tokens: session.total_tokens || 0,
        cost: session.total_cost_usd || 0,
        title: session.name || 'Untitled Session'
      })
    })

    // Add API request logs
    if (usageData && usageData.length > 0) {
      usageData.forEach(log => {
        let modelName = 'Multiple Models'

        // Extract model name from different log formats
        if ('provider_responses' in log && log.provider_responses && typeof log.provider_responses === 'object') {
          const firstProvider = Object.keys(log.provider_responses)[0]
          if (firstProvider) {
            modelName = firstProvider.split(':')[1] || firstProvider
          }
        } else if ('models_requested' in log && log.models_requested && Array.isArray(log.models_requested) && log.models_requested.length > 0) {
          modelName = log.models_requested[0]
        } else if ('models_used' in log && log.models_used && typeof log.models_used === 'object') {
          const models = Array.isArray(log.models_used) ? log.models_used : Object.keys(log.models_used)
          if (models.length > 0) {
            modelName = models[0]
          }
        }

        allActivities.push({
          timestamp: log.created_at,
          action: 'API Request',
          model: modelName,
          tokens: log.total_tokens || 0,
          cost: log.total_cost || 0
        })
      })
    }

    // Sort all activities by timestamp and take the most recent 10
    const sortedActivities = allActivities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10)

    recentActivity.push(...sortedActivities)

    // Calculate last active time from most recent activity
    let lastActive = 'Never'
    if (sortedActivities.length > 0) {
      const lastUsage = new Date(sortedActivities[0].timestamp)
      const now = new Date()
      const diffInHours = Math.floor((now.getTime() - lastUsage.getTime()) / (1000 * 60 * 60))

      if (diffInHours < 1) {
        lastActive = 'Just now'
      } else if (diffInHours < 24) {
        lastActive = `${diffInHours} hours ago`
      } else {
        const diffInDays = Math.floor(diffInHours / 24)
        lastActive = `${diffInDays} days ago`
      }
    }

    const stats = {
      totalChats,
      totalTokens,
      favoriteModel,
      joinedDays: Math.max(daysSinceJoined, 0),
      lastActive,
      recentActivity
    }

    console.log('[Profile Stats] Returning real statistics:', {
      totalChats: stats.totalChats,
      totalTokens: stats.totalTokens,
      favoriteModel: stats.favoriteModel,
      joinedDays: stats.joinedDays
    })

    return NextResponse.json(stats)
    
  } catch (error) {
    console.error('Profile stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile stats' },
      { status: 500 }
    )
  }
}