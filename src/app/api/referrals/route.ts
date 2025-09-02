import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { referralSystem } from '@/lib/referralSystem'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, referralCode, customCode } = body

    if (action === 'generate') {
      try {
        const { code, url } = await referralSystem.generateReferralCode(user.id, customCode)
        
        return NextResponse.json({ 
          referralCode: code,
          referralUrl: url,
          success: true,
          message: `Generated referral code: ${code}`
        })
      } catch (error) {
        console.error('[Referrals] Generate error:', error)
        return NextResponse.json({ error: 'Failed to generate referral code' }, { status: 500 })
      }
    }

    if (action === 'redeem' && referralCode) {
      try {
        const result = await referralSystem.redeemReferralCode(user.id, referralCode)
        
        if (!result.success) {
          return NextResponse.json({ error: result.message }, { status: 400 })
        }

        return NextResponse.json({ 
          success: true,
          message: result.message,
          rewards: result.rewards
        })
      } catch (error) {
        console.error('[Referrals] Redeem error:', error)
        return NextResponse.json({ error: 'Failed to redeem referral code' }, { status: 500 })
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('[Referrals] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const type = url.searchParams.get('type') || 'overview'
    const days = parseInt(url.searchParams.get('days') || '30')

    try {
      if (type === 'analytics') {
        const analytics = await referralSystem.getReferralAnalytics(user.id, days)
        return NextResponse.json(analytics)
      }

      // Get comprehensive referral stats
      const stats = await referralSystem.getUserReferralStats(user.id)
      const codes = await referralSystem.getUserReferralCodes(user.id)

      return NextResponse.json({ 
        stats: {
          totalReferrals: stats.totalReferrals,
          completedReferrals: stats.completedReferrals,
          pendingReferrals: stats.pendingReferrals,
          thisMonthReferrals: stats.thisMonthReferrals,
          bonusMessages: stats.totalCreditsEarned, // Credits as "bonus messages" for compatibility
          currentTier: stats.currentTier,
          nextTier: stats.nextTier,
          lifetime_value: stats.lifetime_value
        },
        codes: codes.map(code => ({
          code: code.code,
          created_at: code.created_at,
          uses_remaining: code.uses_remaining || 0,
          total_uses: code.total_uses || 0,
          referralUrl: code.referralUrl
        })),
        // Legacy compatibility
        referrals: codes,
        totalBonusMessages: stats.totalCreditsEarned,
        totalReferrals: stats.totalReferrals,
        completedReferrals: stats.completedReferrals
      })

    } catch (systemError) {
      console.error('[Referrals] Referral system error:', systemError)
      return NextResponse.json({ error: 'Failed to fetch referral data' }, { status: 500 })
    }

  } catch (error) {
    console.error('[Referrals] Error fetching referrals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}