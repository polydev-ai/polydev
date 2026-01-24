import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { referralSystem, REFERRAL_REWARDS } from '@/lib/referralSystem'
import { emailTemplates } from '@/lib/emailTemplates'

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

        // Send referral emails
        if (result.referrerId) {
          try {
            // Get referrer stats for email
            const referrerStats = await referralSystem.getUserReferralStats(result.referrerId)
            const referrerEmail = await referralSystem.getReferrerEmail(result.referrerId)
            
            if (referrerEmail) {
              // Send email to referrer
              const referrerTemplate = emailTemplates.referralSuccess(
                referrerEmail,
                user.email || 'A new user',
                REFERRAL_REWARDS.REFERRER_CREDITS,
                referrerStats.completedReferrals
              )
              
              await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/internal/send-email`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-internal-secret': process.env.INTERNAL_API_SECRET || ''
                },
                body: JSON.stringify({
                  to: referrerEmail,
                  from: 'noreply@polydev.ai',
                  subject: referrerTemplate.subject,
                  html: referrerTemplate.html,
                  text: referrerTemplate.text
                })
              })
              console.log(`[Referrals] Sent referral success email to referrer: ${referrerEmail}`)
            }
            
            // Send welcome email to new user
            if (user.email) {
              const welcomeTemplate = emailTemplates.referralWelcome(
                user.email,
                REFERRAL_REWARDS.NEW_USER_CREDITS
              )
              
              await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/internal/send-email`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-internal-secret': process.env.INTERNAL_API_SECRET || ''
                },
                body: JSON.stringify({
                  to: user.email,
                  from: 'noreply@polydev.ai',
                  subject: welcomeTemplate.subject,
                  html: welcomeTemplate.html,
                  text: welcomeTemplate.text
                })
              })
              console.log(`[Referrals] Sent welcome email to new user: ${user.email}`)
            }
          } catch (emailError) {
            console.error('[Referrals] Error sending referral emails:', emailError)
            // Don't fail the referral if emails fail
          }
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
          totalCreditsEarned: stats.totalCreditsEarned,
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
        totalCreditsEarned: stats.totalCreditsEarned,
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