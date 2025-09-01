import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../utils/supabase/server'

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

    // Get real usage data from request logs
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

    // Use detailed logs if available, otherwise fallback to simple logs
    const usageData = requestLogs && requestLogs.length > 0 ? requestLogs : usageLogs

    console.log('[Profile Stats] Usage data:', { 
      requestLogs: requestLogs?.length, 
      usageLogs: usageLogs?.length,
      using: requestLogs && requestLogs.length > 0 ? 'detailed' : 'simple'
    })

    // Calculate real statistics
    const totalChats = usageData?.length || 0
    const totalTokens = usageData?.reduce((sum, log) => sum + (log.total_tokens || 0), 0) || 0

    // Determine favorite model from actual usage
    let favoriteModel = 'No usage yet'
    if (usageData && usageData.length > 0) {
      const modelUsage: Record<string, number> = {}
      
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

      // Find the most used model
      const sortedModels = Object.entries(modelUsage).sort(([,a], [,b]) => b - a)
      if (sortedModels.length > 0) {
        favoriteModel = sortedModels[0][0]
      }
    }

    // Generate recent activity from actual usage data
    const recentActivity: any[] = []
    if (usageData && usageData.length > 0) {
      const sortedLogs = usageData
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)

      sortedLogs.forEach(log => {
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

        recentActivity.push({
          timestamp: log.created_at,
          action: 'API Request',
          model: modelName,
          tokens: log.total_tokens || 0,
          cost: log.total_cost || 0
        })
      })
    }

    // Calculate last active time
    let lastActive = 'Never'
    if (usageData && usageData.length > 0) {
      const lastUsage = new Date(usageData[0].created_at)
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