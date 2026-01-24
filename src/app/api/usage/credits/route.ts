import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { createClient as createServerClient } from '@supabase/supabase-js'

/**
 * GET /api/usage/credits
 * Returns credits accounting breakdown by tier
 *
 * Query params:
 * - timeframe: '24h' | '7d' | '30d' | '90d' | '1y' (default: '30d')
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || '30d'

    const serviceSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Calculate date range
    let dateFrom = new Date()
    switch (timeframe) {
      case '24h':
        dateFrom = new Date(Date.now() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        break
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

    // Get perspective usage with credits_deducted
    const { data: perspectiveUsage, error: usageError } = await serviceSupabase
      .from('perspective_usage')
      .select('model_tier, model_name, credits_deducted, estimated_cost, created_at, request_metadata')
      .eq('user_id', user.id)
      .gte('created_at', dateFrom.toISOString())
      .order('created_at', { ascending: false })

    if (usageError) {
      console.error('[Credits API] Error fetching perspective usage:', usageError)
      return NextResponse.json({ error: 'Failed to fetch credits data' }, { status: 500 })
    }

    // Get user credits balance
    const { data: userCredits, error: creditsError } = await serviceSupabase
      .from('user_credits')
      .select('balance, promotional_balance, total_spent, total_purchased')
      .eq('user_id', user.id)
      .maybeSingle()

    // Aggregate by tier
    const tierStats: Record<string, { requests: number; credits: number; estimatedCost: number }> = {
      premium: { requests: 0, credits: 0, estimatedCost: 0 },
      normal: { requests: 0, credits: 0, estimatedCost: 0 },
      eco: { requests: 0, credits: 0, estimatedCost: 0 }
    }

    // Aggregate by model
    const modelStats: Record<string, { tier: string; requests: number; credits: number; estimatedCost: number }> = {}

    // Aggregate by source type
    const sourceStats: Record<string, { requests: number; credits: number }> = {
      admin_key: { requests: 0, credits: 0 },
      admin_credits: { requests: 0, credits: 0 },
      user_key: { requests: 0, credits: 0 },
      user_cli: { requests: 0, credits: 0 }
    }

    // Daily breakdown for timeline
    const dailyStats: Record<string, { credits: number; requests: number }> = {}

    // Recent transactions for display
    const recentTransactions: Array<{
      date: string
      model: string
      tier: string
      credits: number
      source: string
    }> = []

    let totalCreditsUsed = 0

    perspectiveUsage?.forEach(usage => {
      const tier = usage.model_tier || 'normal'
      // Determine source type - handle both 'source_type' and 'source' in metadata
      const sourceType = usage.request_metadata?.source_type || 
                        usage.request_metadata?.source || 
                        'admin_key'
      
      // Only count credits for admin-based sources (admin_credits, admin_key, admin)
      // User's own API keys (user_key, api, cli) should NOT show credit deductions
      const isAdminSource = sourceType === 'admin_credits' || 
                           sourceType === 'admin_key' || 
                           sourceType === 'admin'
      
      // Use actual credits_deducted if available, otherwise calculate ONLY for admin sources
      // For user_key/api/cli sources, credits should be 0
      const credits = isAdminSource 
        ? (usage.credits_deducted || (tier === 'premium' ? 20 : tier === 'eco' ? 1 : 4))
        : 0
      
      const cost = parseFloat(usage.estimated_cost?.toString() || '0')
      const dateKey = usage.created_at.substring(0, 10) // YYYY-MM-DD

      // Tier stats - only count for admin sources
      if (tierStats[tier] && isAdminSource) {
        tierStats[tier].requests += 1
        tierStats[tier].credits += credits
        tierStats[tier].estimatedCost += cost
      }

      // Model stats
      const modelName = usage.model_name || 'unknown'
      if (!modelStats[modelName]) {
        modelStats[modelName] = { tier, requests: 0, credits: 0, estimatedCost: 0 }
      }
      modelStats[modelName].requests += 1
      // Only add credits for admin sources
      if (isAdminSource) {
        modelStats[modelName].credits += credits
      }
      modelStats[modelName].estimatedCost += cost

      // Source stats
      if (sourceStats[sourceType]) {
        sourceStats[sourceType].requests += 1
        // Only add credits for admin sources
        if (isAdminSource) {
          sourceStats[sourceType].credits += credits
        }
      } else {
        // Handle unmapped source types
        const mappedSource = isAdminSource ? 'admin_credits' : 'user_key'
        if (sourceStats[mappedSource]) {
          sourceStats[mappedSource].requests += 1
          if (isAdminSource) {
            sourceStats[mappedSource].credits += credits
          }
        }
      }

      // Daily stats - only count credits for admin sources
      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = { credits: 0, requests: 0 }
      }
      if (isAdminSource) {
        dailyStats[dateKey].credits += credits
      }
      dailyStats[dateKey].requests += 1

      // Only add to total credits used for admin sources
      if (isAdminSource) {
        totalCreditsUsed += credits
      }

      // Recent transactions (first 50) - show credits as 0 for user_key
      if (recentTransactions.length < 50) {
        recentTransactions.push({
          date: usage.created_at,
          model: modelName,
          tier,
          credits: isAdminSource ? credits : 0, // Show 0 for user keys
          source: sourceType
        })
      }
    })

    // Convert model stats to array and sort by credits
    const modelStatsArray = Object.entries(modelStats)
      .map(([model, stats]) => ({ model, ...stats }))
      .sort((a, b) => b.credits - a.credits)

    // Convert daily stats to array and sort by date
    const dailyStatsArray = Object.entries(dailyStats)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Calculate current balance
    const balance = parseFloat(userCredits?.balance?.toString() || '0')
    const promoBalance = parseFloat(userCredits?.promotional_balance?.toString() || '0')
    const totalSpent = parseFloat(userCredits?.total_spent?.toString() || '0')
    const totalPurchased = parseFloat(userCredits?.total_purchased?.toString() || '0')

    return NextResponse.json({
      balance: {
        current: balance,
        promotional: promoBalance,
        total: balance + promoBalance,
        totalSpent,
        totalPurchased
      },
      period: {
        from: dateFrom.toISOString(),
        to: new Date().toISOString(),
        totalCreditsUsed,
        totalRequests: perspectiveUsage?.length || 0
      },
      tierBreakdown: {
        premium: tierStats.premium,
        normal: tierStats.normal,
        eco: tierStats.eco
      },
      tierCosts: {
        premium: 20,
        normal: 4,
        eco: 1
      },
      modelBreakdown: modelStatsArray,
      sourceBreakdown: sourceStats,
      dailyUsage: dailyStatsArray,
      recentTransactions
    })

  } catch (error) {
    console.error('[Credits API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
