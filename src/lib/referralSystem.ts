// Production-grade referral tracking system
import { createClient } from '@/app/utils/supabase/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export interface ReferralTier {
  id: string
  name: string
  minReferrals: number
  bonusMultiplier: number
  creditsBonus: number
  features: string[]
}

export interface ReferralReward {
  type: 'credits' | 'subscription_discount' | 'bonus_messages' | 'premium_features'
  amount: number
  description: string
  expires_at?: string
}

export interface ReferralStats {
  totalReferrals: number
  completedReferrals: number
  pendingReferrals: number
  thisMonthReferrals: number
  totalCreditsEarned: number
  currentTier: ReferralTier
  nextTier?: ReferralTier
  lifetime_value: number
}

export const REFERRAL_TIERS: ReferralTier[] = [
  {
    id: 'bronze',
    name: 'Bronze Referrer',
    minReferrals: 0,
    bonusMultiplier: 1.0,
    creditsBonus: 100,
    features: ['Basic referral tracking', '100 credits per referral']
  },
  {
    id: 'silver', 
    name: 'Silver Referrer',
    minReferrals: 5,
    bonusMultiplier: 1.2,
    creditsBonus: 120,
    features: ['Enhanced tracking', '120 credits per referral', '20% bonus on all rewards']
  },
  {
    id: 'gold',
    name: 'Gold Referrer', 
    minReferrals: 15,
    bonusMultiplier: 1.5,
    creditsBonus: 150,
    features: ['Premium analytics', '150 credits per referral', '50% bonus on all rewards', 'Priority support']
  },
  {
    id: 'platinum',
    name: 'Platinum Referrer',
    minReferrals: 30,
    bonusMultiplier: 2.0, 
    creditsBonus: 200,
    features: ['Advanced analytics', '200 credits per referral', '100% bonus on all rewards', 'Dedicated support', 'Custom referral links']
  },
  {
    id: 'diamond',
    name: 'Diamond Referrer',
    minReferrals: 50,
    bonusMultiplier: 3.0,
    creditsBonus: 300,
    features: ['Enterprise analytics', '300 credits per referral', '200% bonus on all rewards', 'Revenue sharing', 'White-label options']
  }
]

export class ReferralSystem {
  constructor() {}

  private async getSupabase(useServiceRole: boolean = false) {
    if (useServiceRole) {
      return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
    } else {
      return await createClient()
    }
  }

  /**
   * Generate a unique referral code for a user
   */
  async generateReferralCode(userId: string, customCode?: string): Promise<{ code: string; url: string }> {
    const supabase = await this.getSupabase(true)

    let code: string
    let attempts = 0
    const maxAttempts = 10

    do {
      if (customCode && attempts === 0) {
        code = customCode.toUpperCase().replace(/[^A-Z0-9]/g, '')
        if (code.length < 4) code = code + crypto.randomBytes(2).toString('hex').toUpperCase()
      } else {
        code = crypto.randomBytes(4).toString('hex').toUpperCase()
      }

      // Check if code already exists in user_referrals table
      const { data: existing } = await supabase
        .from('user_referrals')
        .select('id')
        .eq('referral_code', code)
        .single()

      if (!existing) break
      attempts++
    } while (attempts < maxAttempts)

    if (attempts >= maxAttempts) {
      throw new Error('Unable to generate unique referral code')
    }

    // Create referral code record in user_referrals table
    const { data, error } = await supabase
      .from('user_referrals')
      .insert({
        referrer_id: userId,
        referral_code: code,
        status: 'pending',
        bonus_messages: 100,
        uses_remaining: 5, // Use existing schema default
        total_uses: 0
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create referral code: ${error.message}`)
    }

    const referralUrl = `${process.env.NEXT_PUBLIC_APP_URL}/signup?ref=${code}`

    return { code, url: referralUrl }
  }

  /**
   * Redeem a referral code
   */
  async redeemReferralCode(
    newUserId: string, 
    referralCode: string
  ): Promise<{ success: boolean; rewards: ReferralReward[]; message: string }> {
    const supabase = await this.getSupabase(true)

    try {
      // Find valid referral code in user_referrals table
      const { data: referralCodeData, error: codeError } = await supabase
        .from('user_referrals')
        .select('*')
        .eq('referral_code', referralCode.toUpperCase())
        .gt('uses_remaining', 0)
        .is('referred_user_id', null) // Not yet redeemed
        .single()

      if (codeError || !referralCodeData) {
        return {
          success: false,
          rewards: [],
          message: 'Invalid or expired referral code'
        }
      }

      const referrerId = referralCodeData.referrer_id

      // Prevent self-referral
      if (referrerId === newUserId) {
        return {
          success: false,
          rewards: [],
          message: 'Cannot use your own referral code'
        }
      }

      // Check if user already used a referral code
      const { data: existingReferral } = await supabase
        .from('user_referrals')
        .select('id')
        .eq('referred_user_id', newUserId)
        .not('referred_user_id', 'is', null)
        .single()

      if (existingReferral) {
        return {
          success: false,
          rewards: [],
          message: 'You have already used a referral code'
        }
      }

      // Get referrer's current tier
      const referrerStats = await this.getUserReferralStats(referrerId)
      const currentTier = referrerStats.currentTier

      // Calculate rewards based on tier
      const referrerCredits = Math.floor(currentTier.creditsBonus * currentTier.bonusMultiplier)
      const newUserCredits = referralCodeData.bonus_messages || 100 // Use existing bonus_messages field

      // Update referral record with the new user
      const { error: referralError } = await supabase
        .from('user_referrals')
        .update({
          referred_user_id: newUserId,
          status: 'completed',
          uses_remaining: referralCodeData.uses_remaining - 1,
          total_uses: (referralCodeData.total_uses || 0) + 1,
          rewards_given: {
            referrer_credits: referrerCredits,
            new_user_credits: newUserCredits
          }
        })
        .eq('id', referralCodeData.id)

      if (referralError) {
        throw new Error(`Failed to update referral record: ${referralError.message}`)
      }

      // Add credits to both users
      await Promise.all([
        supabase.rpc('add_user_credits', {
          p_user_id: referrerId,
          p_amount: referrerCredits,
          p_transaction_type: 'referral_bonus',
          p_description: `Referral bonus for inviting new user (Tier: ${currentTier.name})`
        }),
        supabase.rpc('add_user_credits', {
          p_user_id: newUserId,
          p_amount: newUserCredits,
          p_transaction_type: 'welcome_bonus',
          p_description: `Welcome bonus for using referral code ${referralCode}`
        })
      ])

      const rewards: ReferralReward[] = [
        {
          type: 'credits',
          amount: newUserCredits,
          description: `Welcome bonus of ${newUserCredits} credits`
        }
      ]

      return {
        success: true,
        rewards,
        message: `Welcome! You received ${newUserCredits} credits. Your referrer earned ${referrerCredits} credits!`
      }

    } catch (error) {
      console.error('[ReferralSystem] Error redeeming referral code:', error)
      return {
        success: false,
        rewards: [],
        message: 'Failed to process referral code'
      }
    }
  }

  /**
   * Get comprehensive referral statistics for a user
   */
  async getUserReferralStats(userId: string): Promise<ReferralStats> {
    const supabase = await this.getSupabase(true)

    try {
      // Get all referrals by this user (both as codes they created and completed referrals)
      const { data: referrals, error } = await supabase
        .from('user_referrals')
        .select('*')
        .eq('referrer_id', userId)

      if (error) {
        throw new Error(`Failed to fetch referrals: ${error.message}`)
      }

      const totalReferrals = referrals?.length || 0
      const completedReferrals = referrals?.filter(r => r.status === 'completed' && r.referred_user_id !== null).length || 0
      const pendingReferrals = referrals?.filter(r => r.status === 'pending' && r.referred_user_id === null).length || 0

      // Calculate this month's referrals
      const currentMonth = new Date().toISOString().substring(0, 7)
      const thisMonthReferrals = referrals?.filter(r => 
        r.created_at?.substring(0, 7) === currentMonth && r.status === 'completed'
      ).length || 0

      // Calculate total credits earned from referrals using existing schema
      const totalCreditsEarned = referrals?.reduce((sum, r) => {
        if (r.rewards_given?.referrer_credits) {
          return sum + r.rewards_given.referrer_credits
        }
        // Fallback to bonus_messages if rewards_given not available
        return sum + (r.status === 'completed' && r.referred_user_id ? (r.bonus_messages || 0) : 0)
      }, 0) || 0

      // Determine current tier
      const currentTier = this.getTierForReferralCount(completedReferrals)
      const nextTier = this.getNextTier(currentTier)

      // Calculate lifetime value (credits earned + potential subscription discounts)
      const lifetime_value = totalCreditsEarned * 0.01 // $0.01 per credit

      return {
        totalReferrals,
        completedReferrals,
        pendingReferrals,
        thisMonthReferrals,
        totalCreditsEarned,
        currentTier,
        nextTier,
        lifetime_value
      }

    } catch (error) {
      console.error('[ReferralSystem] Error fetching referral stats:', error)
      
      // Return default stats on error
      return {
        totalReferrals: 0,
        completedReferrals: 0,
        pendingReferrals: 0,
        thisMonthReferrals: 0,
        totalCreditsEarned: 0,
        currentTier: REFERRAL_TIERS[0],
        lifetime_value: 0
      }
    }
  }

  /**
   * Get user's referral codes
   */
  async getUserReferralCodes(userId: string) {
    const supabase = await this.getSupabase(true)

    const { data, error } = await supabase
      .from('user_referrals')
      .select('*')
      .eq('referrer_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch referral codes: ${error.message}`)
    }

    return data?.map(code => ({
      ...code,
      code: code.referral_code, // Map referral_code to code for compatibility
      referralUrl: `${process.env.NEXT_PUBLIC_APP_URL}/signup?ref=${code.referral_code}`
    })) || []
  }

  /**
   * Get referral analytics
   */
  async getReferralAnalytics(userId: string, days: number = 30) {
    const supabase = await this.getSupabase(true)

    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - days)

    const { data, error } = await supabase
      .from('user_referrals')
      .select('*')
      .eq('referrer_id', userId)
      .gte('created_at', fromDate.toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch analytics: ${error.message}`)
    }

    // Group by day for chart data
    const dailyStats = new Map()
    data?.forEach(referral => {
      const day = referral.created_at?.substring(0, 10)
      if (day) {
        if (!dailyStats.has(day)) {
          dailyStats.set(day, { date: day, referrals: 0, credits: 0 })
        }
        const stats = dailyStats.get(day)
        stats.referrals += 1
        stats.credits += referral.rewards_given?.referrer_credits || 0
      }
    })

    return {
      referrals: data || [],
      dailyStats: Array.from(dailyStats.values()).sort((a, b) => a.date.localeCompare(b.date)),
      totalCredits: data?.reduce((sum, r) => sum + (r.rewards_given?.referrer_credits || 0), 0) || 0,
      conversionRate: data?.length ? (data.filter(r => r.status === 'completed').length / data.length) * 100 : 0
    }
  }

  /**
   * Get tier based on referral count
   */
  private getTierForReferralCount(count: number): ReferralTier {
    for (let i = REFERRAL_TIERS.length - 1; i >= 0; i--) {
      if (count >= REFERRAL_TIERS[i].minReferrals) {
        return REFERRAL_TIERS[i]
      }
    }
    return REFERRAL_TIERS[0]
  }

  /**
   * Get next tier
   */
  private getNextTier(currentTier: ReferralTier): ReferralTier | undefined {
    const currentIndex = REFERRAL_TIERS.findIndex(tier => tier.id === currentTier.id)
    return currentIndex < REFERRAL_TIERS.length - 1 ? REFERRAL_TIERS[currentIndex + 1] : undefined
  }
}

export const referralSystem = new ReferralSystem()