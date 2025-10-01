import { NextResponse } from 'next/server'
import { createClient } from '../../../utils/supabase/server'
import { QuotaManager } from '@/lib/quota-manager'

const quotaManager = new QuotaManager()

/**
 * GET /api/user/quota
 * Returns the user's perspective-based quota status including:
 * - Plan tier (free/plus/pro)
 * - Message limits and usage
 * - Perspective limits and usage (Premium/Normal/Eco)
 * - Bonus message balance
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get quota info from database
    const { data: quota, error: quotaError } = await supabase
      .from('user_perspective_quotas')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (quotaError || !quota) {
      return NextResponse.json(
        { error: 'Quota data not found' },
        { status: 404 }
      )
    }

    // Get bonus message balance
    const { bonusManager } = await import('@/lib/bonus-manager')
    const bonusBalance = await bonusManager.getAvailableBonusBalance(user.id)

    // Get recent perspective usage breakdown
    const { data: usageStats, error: usageError } = await supabase
      .from('perspective_usage')
      .select('model_tier, perspectives_deducted, estimated_cost, created_at, request_metadata')
      .eq('user_id', user.id)
      .gte('created_at', quota.current_month_start || new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(100)

    // Aggregate usage by tier
    const tierUsage = {
      premium: { count: 0, cost: 0 },
      normal: { count: 0, cost: 0 },
      eco: { count: 0, cost: 0 }
    }

    // Aggregate usage by source type
    const sourceUsage = {
      cli: { count: 0, cost: 0, requests: 0 },
      web: { count: 0, cost: 0, requests: 0 },
      user_key: { count: 0, cost: 0, requests: 0 },
      admin_credits: { count: 0, cost: 0, requests: 0 }
    }

    if (usageStats && !usageError) {
      usageStats.forEach(usage => {
        const tier = usage.model_tier as 'premium' | 'normal' | 'eco'
        if (tierUsage[tier]) {
          tierUsage[tier].count += usage.perspectives_deducted || 0
          tierUsage[tier].cost += usage.estimated_cost || 0
        }

        // Extract source type from request_metadata
        const sourceType = usage.request_metadata?.source_type
        if (sourceType === 'user_cli') {
          sourceUsage.cli.count += usage.perspectives_deducted || 0
          sourceUsage.cli.cost += usage.estimated_cost || 0
          sourceUsage.cli.requests += 1
        } else if (sourceType === 'user_key') {
          sourceUsage.user_key.count += usage.perspectives_deducted || 0
          sourceUsage.user_key.cost += usage.estimated_cost || 0
          sourceUsage.user_key.requests += 1
        } else if (sourceType === 'admin_credits') {
          sourceUsage.admin_credits.count += usage.perspectives_deducted || 0
          sourceUsage.admin_credits.cost += usage.estimated_cost || 0
          sourceUsage.admin_credits.requests += 1
        } else {
          // Default to web if no source type or 'admin_key'
          sourceUsage.web.count += usage.perspectives_deducted || 0
          sourceUsage.web.cost += usage.estimated_cost || 0
          sourceUsage.web.requests += 1
        }
      })
    }

    // Calculate remaining quotas
    const remaining = {
      messages: quota.messages_per_month
        ? Math.max(0, quota.messages_per_month - quota.messages_used)
        : null, // null means unlimited
      bonusMessages: bonusBalance,
      premium: Math.max(0, quota.premium_perspectives_limit - quota.premium_perspectives_used),
      normal: Math.max(0, quota.normal_perspectives_limit - quota.normal_perspectives_used),
      eco: Math.max(0, quota.eco_perspectives_limit - quota.eco_perspectives_used)
    }

    // Calculate usage percentages
    const percentages = {
      messages: quota.messages_per_month
        ? Math.min(100, (quota.messages_used / quota.messages_per_month) * 100)
        : 0,
      premium: quota.premium_perspectives_limit
        ? Math.min(100, (quota.premium_perspectives_used / quota.premium_perspectives_limit) * 100)
        : 0,
      normal: quota.normal_perspectives_limit
        ? Math.min(100, (quota.normal_perspectives_used / quota.normal_perspectives_limit) * 100)
        : 0,
      eco: quota.eco_perspectives_limit
        ? Math.min(100, (quota.eco_perspectives_used / quota.eco_perspectives_limit) * 100)
        : 0
    }

    return NextResponse.json({
      planTier: quota.plan_tier,
      currentMonth: quota.current_month_start,
      limits: {
        messages: quota.messages_per_month,
        premium: quota.premium_perspectives_limit,
        normal: quota.normal_perspectives_limit,
        eco: quota.eco_perspectives_limit
      },
      used: {
        messages: quota.messages_used,
        premium: quota.premium_perspectives_used,
        normal: quota.normal_perspectives_used,
        eco: quota.eco_perspectives_used
      },
      remaining,
      percentages,
      bonusMessages: bonusBalance,
      tierUsage,
      sourceUsage,
      updatedAt: quota.updated_at
    })
  } catch (error) {
    console.error('Error fetching user quota:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
