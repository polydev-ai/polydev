import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { referralSystem } from '@/lib/referralSystem'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const days = parseInt(url.searchParams.get('days') || '30')
    const includeChart = url.searchParams.get('chart') === 'true'

    try {
      // Get comprehensive analytics
      const analytics = await referralSystem.getReferralAnalytics(user.id, days)
      const stats = await referralSystem.getUserReferralStats(user.id)

      const response = {
        period: `${days} days`,
        stats,
        analytics: {
          totalCredits: analytics.totalCredits,
          conversionRate: analytics.conversionRate,
          recentReferrals: analytics.referrals.slice(0, 10), // Last 10 referrals
          topPerformingCodes: await getTopPerformingCodes(user.id),
          monthlyTrends: await getMonthlyTrends(user.id),
          ...(includeChart && { dailyStats: analytics.dailyStats })
        }
      }

      return NextResponse.json(response)

    } catch (systemError) {
      console.error('[Referrals Analytics] System error:', systemError)
      return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
    }

  } catch (error) {
    console.error('[Referrals Analytics] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function getTopPerformingCodes(userId: string) {
  const supabase = await createClient('service_role')

  try {
    const { data, error } = await supabase
      .from('referral_codes')
      .select('code, total_uses, created_at')
      .eq('user_id', userId)
      .order('total_uses', { ascending: false })
      .limit(5)

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('[Analytics] Failed to get top performing codes:', error)
    return []
  }
}

async function getMonthlyTrends(userId: string) {
  const supabase = await createClient('service_role')

  try {
    // Get last 6 months of referral data
    const { data, error } = await supabase.rpc('get_monthly_referral_trends', {
      p_user_id: userId,
      p_months: 6
    })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('[Analytics] Failed to get monthly trends:', error)
    return []
  }
}