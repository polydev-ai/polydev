import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/app/utils/supabase/server'

export async function GET(request: Request) {
  try {
    // Force deployment refresh - showing 4 users not 1
    const supabase = await createClient()

    // Check if user is admin
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin status
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get date range from query params
    const url = new URL(request.url)
    const dateRange = url.searchParams.get('days') || '30'

    const dateThreshold = new Date()
    dateThreshold.setDate(dateThreshold.getDate() - parseInt(dateRange))

    const weekThreshold = new Date()
    weekThreshold.setDate(weekThreshold.getDate() - 7)

    const monthThreshold = new Date()
    monthThreshold.setDate(monthThreshold.getDate() - 30)

    // Initialize analytics with default values - will be replaced with real data below
    const analytics = {
      userGrowth: {
        total: 0,
        thisWeek: 0,
        thisMonth: 0,
        growth: 0
      },
      subscription: {
        active: 0,
        revenue: 0,
        conversionRate: 0,
        churnRate: 0
      },
      usage: {
        totalSessions: 0,
        apiCalls: 0,
        averageSessionDuration: 0,
        popularModels: [] as Array<{name: string, count: number}>,
        modelBreakdown: {} as Record<string, {total: number, percentage: number}>,
        providerStats: [] as Array<{provider: string, models: number, usage: number}>,
        avgRequestsPerSession: 0,
        peakUsageHour: '',
        totalTokensProcessed: 0
      },
      credits: {
        totalIssued: 0,
        totalUsed: 0,
        averagePerUser: 0,
        topUsers: [] as Array<{email: string, credits: number}>,
        creditsDistribution: {
          zeroCredits: 0,
          lowCredits: 0, // 1-10
          mediumCredits: 0, // 11-50
          highCredits: 0 // 50+
        },
        dailyUsage: [] as Array<{date: string, used: number}>,
        creditSources: {
          promotional: 0,
          purchased: 0,
          referral: 0
        }
      },
      activity: {
        dailyActiveUsers: 0,
        weeklyActiveUsers: 0,
        monthlyActiveUsers: 0,
        retentionRate: 0
      },
      overview: {
        totalUsers: 0,
        activeModels: 0,
        totalApiCalls: 0,
        chatSessions: 0,
        chatMessages: 0,
        usageSessions: 0
      },
      platform: {
        totalProviders: 0,
        averageModelsPerProvider: 0,
        mostPopularProvider: '',
        errorRate: 0,
        averageResponseTime: 0,
        uptime: 99.9
      },
      engagement: {
        averageSessionsPerUser: 0,
        averageMessagesPerSession: 0,
        userRetentionWeek1: 0,
        userRetentionWeek4: 0,
        bounceRate: 0,
        powerUsers: [] as Array<{email: string, sessions: number, messages: number}>
      },
      trends: {
        userGrowthTrend: [] as Array<{date: string, newUsers: number, totalUsers: number}>,
        usageTrend: [] as Array<{date: string, apiCalls: number, sessions: number}>,
        popularityTrend: [] as Array<{model: string, trend: 'up' | 'down' | 'stable', change: number}>
      }
    }

    // Get accurate data from database using admin client to bypass RLS
    const adminClient = createAdminClient()
    try {
      // Get real user growth data using admin client
      const { data: allUsers } = await adminClient
        .from('profiles')
        .select('id, created_at')

      const { data: weekUsers } = await adminClient
        .from('profiles')
        .select('created_at')
        .gte('created_at', weekThreshold.toISOString())

      const { data: monthUsers } = await adminClient
        .from('profiles')
        .select('created_at')
        .gte('created_at', monthThreshold.toISOString())

      if (allUsers && weekUsers && monthUsers) {
        analytics.userGrowth = {
          total: allUsers.length,
          thisWeek: weekUsers.length,
          thisMonth: monthUsers.length,
          growth: allUsers.length > 0 ? Math.round((monthUsers.length / allUsers.length) * 100) : 0
        }
        analytics.overview.totalUsers = allUsers.length
      }

      // Get real subscription data using admin client
      const { data: activeSubscriptions } = await adminClient
        .from('user_subscriptions')
        .select('tier, status')
        .eq('status', 'active')

      if (activeSubscriptions) {
        const proSubs = activeSubscriptions.filter(sub => sub.tier === 'pro').length
        const freeSubs = activeSubscriptions.filter(sub => sub.tier === 'free').length

        analytics.subscription.active = activeSubscriptions.length
        analytics.subscription.revenue = proSubs * 10 // $10/month for pro users only
        analytics.subscription.conversionRate = allUsers ? Math.round((activeSubscriptions.length / allUsers.length) * 100) : 0
        analytics.subscription.churnRate = 0 // Calculate if needed
      }

      // Get real usage data using admin client - all time data for overview
      const { data: allChatSessions } = await adminClient
        .from('chat_sessions')
        .select('id')

      const { data: allMcpRequests } = await adminClient
        .from('mcp_request_logs')
        .select('id')

      const { data: allChatMessages } = await adminClient
        .from('chat_messages')
        .select('id')

      const { data: allUsageSessions } = await adminClient
        .from('usage_sessions')
        .select('id')

      // Get period-specific data for usage section
      const { data: periodChatSessions } = await adminClient
        .from('chat_sessions')
        .select('id')
        .gte('created_at', dateThreshold.toISOString())

      const { data: periodMcpRequests } = await adminClient
        .from('mcp_request_logs')
        .select('id')
        .gte('created_at', dateThreshold.toISOString())

      // Update analytics with real data
      if (allChatSessions) analytics.overview.chatSessions = allChatSessions.length
      if (allMcpRequests) analytics.overview.totalApiCalls = allMcpRequests.length
      if (allChatMessages) analytics.overview.chatMessages = allChatMessages.length
      if (allUsageSessions) analytics.overview.usageSessions = allUsageSessions.length

      if (periodChatSessions) analytics.usage.totalSessions = periodChatSessions.length
      if (periodMcpRequests) analytics.usage.apiCalls = periodMcpRequests.length

      // Get credits data using admin client
      const { data: creditAdjustments } = await adminClient
        .from('admin_credit_adjustments')
        .select('amount, adjustment_type')

      const { data: userCredits } = await adminClient
        .from('user_credits')
        .select('user_id, balance, promotional_balance')

      if (creditAdjustments) {
        const addedCredits = creditAdjustments
          .filter(adj => adj.adjustment_type === 'add')
          .reduce((sum, adj) => sum + (parseFloat(adj.amount) || 0), 0)

        const deductedCredits = creditAdjustments
          .filter(adj => adj.adjustment_type === 'subtract')
          .reduce((sum, adj) => sum + (parseFloat(adj.amount) || 0), 0)

        analytics.credits.totalIssued = addedCredits
        analytics.credits.totalUsed = deductedCredits
        analytics.credits.averagePerUser = allUsers?.length ? Math.round(addedCredits / allUsers.length) : 0
      }

      // Get top users by credits
      if (userCredits && allUsers) {
        const usersWithCredits = allUsers
          .map(user => {
            const credit = userCredits.find(c => c.user_id === user.id)
            const totalCredits = credit ?
              (parseFloat(credit.balance) || 0) + (parseFloat(credit.promotional_balance) || 0) : 0
            return {
              user_id: user.id,
              credits: totalCredits
            }
          })
          .filter(u => u.credits > 0)
          .sort((a, b) => b.credits - a.credits)
          .slice(0, 4)

        // Get emails for top users
        const topUserIds = usersWithCredits.map(u => u.user_id)
        const { data: topUserProfiles } = await adminClient
          .from('profiles')
          .select('id, email')
          .in('id', topUserIds)

        if (topUserProfiles) {
          analytics.credits.topUsers = usersWithCredits.map(userCredit => {
            const profile = topUserProfiles.find(p => p.id === userCredit.user_id)
            return {
              email: profile?.email || 'Unknown User',
              credits: userCredit.credits
            }
          })
        }
      }

      // Get models count
      const { data: activeModels } = await adminClient
        .from('models_registry')
        .select('id')
        .eq('is_active', true)

      if (activeModels) {
        analytics.overview.activeModels = activeModels.length
      }

      // Get activity data - users who have been active recently
      const dailyThreshold = new Date()
      dailyThreshold.setDate(dailyThreshold.getDate() - 1)

      // Get daily active users
      const { data: dailyChatUsers } = await adminClient
        .from('chat_sessions')
        .select('user_id')
        .gte('created_at', dailyThreshold.toISOString())

      const { data: dailyMcpUsers } = await adminClient
        .from('mcp_request_logs')
        .select('user_id')
        .gte('created_at', dailyThreshold.toISOString())

      // Get weekly active users
      const { data: recentChatUsers } = await adminClient
        .from('chat_sessions')
        .select('user_id')
        .gte('created_at', weekThreshold.toISOString())

      const { data: recentMcpUsers } = await adminClient
        .from('mcp_request_logs')
        .select('user_id')
        .gte('created_at', weekThreshold.toISOString())

      // Calculate daily active users
      const dailyActiveUserIds = new Set([
        ...(dailyChatUsers?.map(s => s.user_id) || []),
        ...(dailyMcpUsers?.map(r => r.user_id) || [])
      ])

      // Calculate weekly active users
      const weeklyActiveUserIds = new Set([
        ...(recentChatUsers?.map(s => s.user_id) || []),
        ...(recentMcpUsers?.map(r => r.user_id) || [])
      ])

      analytics.activity.dailyActiveUsers = dailyActiveUserIds.size
      analytics.activity.weeklyActiveUsers = weeklyActiveUserIds.size
      analytics.activity.monthlyActiveUsers = weeklyActiveUserIds.size // Using same for now
      analytics.activity.retentionRate = allUsers?.length ?
        Math.round((weeklyActiveUserIds.size / allUsers.length) * 100) : 0

      // Calculate average session duration if possible
      const { data: sessionDurations } = await adminClient
        .from('chat_sessions')
        .select('created_at, updated_at')
        .gte('created_at', dateThreshold.toISOString())
        .neq('updated_at', null)

      if (sessionDurations && sessionDurations.length > 0) {
        const avgDuration = sessionDurations.reduce((sum, session) => {
          const start = new Date(session.created_at)
          const end = new Date(session.updated_at)
          return sum + (end.getTime() - start.getTime()) / (1000 * 60) // minutes
        }, 0) / sessionDurations.length

        analytics.usage.averageSessionDuration = Math.round(avgDuration * 10) / 10 // Round to 1 decimal
      }

      // Get popular models from recent usage
      const { data: recentUsage } = await adminClient
        .from('mcp_request_logs')
        .select('models_requested')
        .gte('created_at', dateThreshold.toISOString())
        .limit(500)

      if (recentUsage) {
        const modelCounts: Record<string, number> = {}
        recentUsage.forEach(usage => {
          if (usage.models_requested && Array.isArray(usage.models_requested)) {
            usage.models_requested.forEach((model: string) => {
              modelCounts[model] = (modelCounts[model] || 0) + 1
            })
          }
        })

        analytics.usage.popularModels = Object.entries(modelCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([name, count]) => ({ name, count }))

        // Enhanced model analytics
        const totalModelUsage = Object.values(modelCounts).reduce((sum, count) => sum + count, 0)
        analytics.usage.modelBreakdown = Object.entries(modelCounts).reduce((acc, [model, count]) => {
          acc[model] = {
            total: count,
            percentage: Math.round((count / totalModelUsage) * 100 * 10) / 10
          }
          return acc
        }, {} as Record<string, {total: number, percentage: number}>)

        // Provider statistics
        const providerStats: Record<string, {models: Set<string>, usage: number}> = {}
        recentUsage.forEach(usage => {
          if (usage.models_requested && Array.isArray(usage.models_requested)) {
            usage.models_requested.forEach((model: string) => {
              const provider = model.split('-')[0] || model.split('/')[0] || 'unknown'
              if (!providerStats[provider]) {
                providerStats[provider] = { models: new Set(), usage: 0 }
              }
              providerStats[provider].models.add(model)
              providerStats[provider].usage += 1
            })
          }
        })

        analytics.usage.providerStats = Object.entries(providerStats)
          .map(([provider, stats]) => ({
            provider,
            models: stats.models.size,
            usage: stats.usage
          }))
          .sort((a, b) => b.usage - a.usage)

        // Average requests per session
        if (periodChatSessions && periodChatSessions.length > 0) {
          analytics.usage.avgRequestsPerSession = Math.round((periodMcpRequests?.length || 0) / periodChatSessions.length * 10) / 10
        }
      }

      // Enhanced credits analytics
      if (userCredits && allUsers) {
        // Credits distribution
        const creditDistribution = { zeroCredits: 0, lowCredits: 0, mediumCredits: 0, highCredits: 0 }
        allUsers.forEach(user => {
          const credit = userCredits.find(c => c.user_id === user.id)
          const totalCredits = credit ?
            (parseFloat(credit.balance) || 0) + (parseFloat(credit.promotional_balance) || 0) : 0

          if (totalCredits === 0) creditDistribution.zeroCredits++
          else if (totalCredits <= 10) creditDistribution.lowCredits++
          else if (totalCredits <= 50) creditDistribution.mediumCredits++
          else creditDistribution.highCredits++
        })
        analytics.credits.creditsDistribution = creditDistribution

        // Credit sources breakdown
        let totalPromo = 0, totalPurchased = 0
        userCredits.forEach(credit => {
          totalPromo += parseFloat(credit.promotional_balance) || 0
          totalPurchased += parseFloat(credit.balance) || 0
        })
        analytics.credits.creditSources = {
          promotional: totalPromo,
          purchased: totalPurchased,
          referral: 0 // Could be enhanced if referral data exists
        }
      }

      // Enhanced engagement analytics
      if (allChatSessions && allChatMessages && allUsers) {
        analytics.engagement.averageSessionsPerUser = allUsers.length > 0 ?
          Math.round((allChatSessions.length / allUsers.length) * 10) / 10 : 0
        analytics.engagement.averageMessagesPerSession = allChatSessions.length > 0 ?
          Math.round((allChatMessages.length / allChatSessions.length) * 10) / 10 : 0

        // Power users (top users by activity)
        const userActivity: Record<string, {sessions: number, messages: number}> = {}
        allChatSessions.forEach((session: any) => {
          if (session.user_id) {
            if (!userActivity[session.user_id]) userActivity[session.user_id] = {sessions: 0, messages: 0}
            userActivity[session.user_id].sessions++
          }
        })

        const powerUserIds = Object.entries(userActivity)
          .sort(([,a], [,b]) => b.sessions - a.sessions)
          .slice(0, 5)
          .map(([userId]) => userId)

        const { data: powerUserProfiles } = await adminClient
          .from('profiles')
          .select('id, email')
          .in('id', powerUserIds)

        analytics.engagement.powerUsers = powerUserIds.map(userId => {
          const profile = powerUserProfiles?.find(p => p.id === userId)
          const activity = userActivity[userId]
          return {
            email: profile?.email || 'Unknown User',
            sessions: activity.sessions,
            messages: activity.messages
          }
        })
      }

      // Platform statistics
      if (activeModels && analytics.usage.providerStats.length > 0) {
        analytics.platform.totalProviders = analytics.usage.providerStats.length
        analytics.platform.averageModelsPerProvider = Math.round(
          analytics.usage.providerStats.reduce((sum, p) => sum + p.models, 0) / analytics.usage.providerStats.length * 10
        ) / 10
        analytics.platform.mostPopularProvider = analytics.usage.providerStats[0]?.provider || 'N/A'
      }

      // User growth trends (last 7 days)
      const growthTrend = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]

        const dayStart = new Date(date)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(date)
        dayEnd.setHours(23, 59, 59, 999)

        const { data: dayUsers } = await adminClient
          .from('profiles')
          .select('created_at')
          .gte('created_at', dayStart.toISOString())
          .lte('created_at', dayEnd.toISOString())

        const { data: totalByDay } = await adminClient
          .from('profiles')
          .select('created_at')
          .lte('created_at', dayEnd.toISOString())

        growthTrend.push({
          date: dateStr,
          newUsers: dayUsers?.length || 0,
          totalUsers: totalByDay?.length || 0
        })
      }
      analytics.trends.userGrowthTrend = growthTrend

    } catch (error) {
      console.error('Error fetching analytics data:', error)
    }

    console.log('📊 Admin Analytics API returning:', analytics)

    return NextResponse.json({
      success: true,
      analytics,
      dateRange: parseInt(dateRange),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Admin analytics API error:', error)
    return NextResponse.json({
      error: 'Failed to retrieve admin analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}