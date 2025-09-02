import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { subscriptionManager } from '@/lib/subscriptionManager'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, referralCode } = body

    if (action === 'generate') {
      // Generate a new referral code
      const code = crypto.randomBytes(8).toString('hex').toUpperCase()
      
      const { data, error } = await supabase
        .from('user_referrals')
        .insert({
          referrer_id: user.id,
          referral_code: code,
          status: 'pending',
          bonus_messages: 100
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: 'Failed to generate referral code' }, { status: 500 })
      }

      return NextResponse.json({ 
        referralCode: code,
        referralUrl: `${process.env.NEXT_PUBLIC_APP_URL}/signup?ref=${code}`,
        bonusMessages: 100
      })
    }

    if (action === 'redeem' && referralCode) {
      // Redeem a referral code
      const { data: referral, error: referralError } = await supabase
        .from('user_referrals')
        .select('*')
        .eq('referral_code', referralCode)
        .eq('status', 'pending')
        .single()

      if (referralError || !referral) {
        return NextResponse.json({ error: 'Invalid or expired referral code' }, { status: 400 })
      }

      if (referral.referrer_id === user.id) {
        return NextResponse.json({ error: 'Cannot use your own referral code' }, { status: 400 })
      }

      // Mark referral as completed and update referred user
      const { error: updateError } = await supabase
        .from('user_referrals')
        .update({
          referred_user_id: user.id,
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', referral.id)

      if (updateError) {
        return NextResponse.json({ error: 'Failed to redeem referral code' }, { status: 500 })
      }

      // Update message limits for both users
      const currentMonth = new Date().toISOString().substring(0, 7)
      
      // Update referrer's message limit
      await supabase.rpc('add_referral_bonus', {
        p_user_id: referral.referrer_id,
        p_month_year: currentMonth,
        p_bonus_messages: 100
      })

      // Update referred user's message limit
      await supabase.rpc('add_referral_bonus', {
        p_user_id: user.id,
        p_month_year: currentMonth,
        p_bonus_messages: 100
      })

      return NextResponse.json({ 
        success: true,
        message: 'Referral code redeemed! You and your referrer each got 100 bonus messages this month.'
      })
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

    // Get user's referrals
    const { data: referrals, error } = await supabase
      .from('user_referrals')
      .select('*')
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch referrals' }, { status: 500 })
    }

    // Calculate total bonus messages
    const totalBonus = referrals
      .filter(r => r.status === 'completed')
      .reduce((sum, r) => sum + (r.bonus_messages || 0), 0)

    return NextResponse.json({ 
      referrals,
      totalBonusMessages: totalBonus,
      totalReferrals: referrals.length,
      completedReferrals: referrals.filter(r => r.status === 'completed').length
    })

  } catch (error) {
    console.error('[Referrals] Error fetching referrals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}