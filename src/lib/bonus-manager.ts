/**
 * Bonus Manager Service
 * Handles bonus message quota operations with expiration tracking
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface BonusQuota {
  id: string
  user_id: string
  bonus_messages: number
  bonus_type: 'admin_grant' | 'referral_signup' | 'referral_completion' | 'promotion' | 'other'
  granted_by?: string
  reason?: string
  messages_used: number
  expires_at?: string
  created_at: string
  updated_at: string
}

export interface GrantBonusParams {
  userId: string
  bonusMessages: number
  bonusType: 'admin_grant' | 'referral_signup' | 'referral_completion' | 'promotion' | 'other'
  grantedBy?: string
  reason?: string
  expiresAt?: string // ISO date string
}

export class BonusManager {
  /**
   * Grant bonus messages to a user
   */
  async grantBonus(params: GrantBonusParams): Promise<BonusQuota | null> {
    try {
      const { userId, bonusMessages, bonusType, grantedBy, reason, expiresAt } = params

      const bonusData: any = {
        user_id: userId,
        bonus_messages: bonusMessages,
        bonus_type: bonusType,
        reason,
        messages_used: 0
      }

      if (grantedBy) {
        bonusData.granted_by = grantedBy
      }

      if (expiresAt) {
        bonusData.expires_at = expiresAt
      }

      const { data, error } = await supabase
        .from('user_bonus_quotas')
        .insert(bonusData)
        .select()
        .single()

      if (error) {
        console.error('Error granting bonus:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in grantBonus:', error)
      throw error
    }
  }

  /**
   * Get total available bonus messages for a user (excluding expired)
   */
  async getAvailableBonusBalance(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('get_user_bonus_balance', { user_uuid: userId })

      if (error) {
        console.error('Error getting bonus balance:', error)
        return 0
      }

      return data || 0
    } catch (error) {
      console.error('Error in getAvailableBonusBalance:', error)
      return 0
    }
  }

  /**
   * Get all active (non-expired, not fully used) bonus quotas for a user
   * Ordered by expiration date (soonest first) for FIFO deduction
   */
  async getActiveBonuses(userId: string): Promise<BonusQuota[]> {
    try {
      const { data, error } = await supabase
        .from('user_bonus_quotas')
        .select('*')
        .eq('user_id', userId)
        .lt('messages_used', supabase.sql`bonus_messages`)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('expires_at', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error getting active bonuses:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getActiveBonuses:', error)
      return []
    }
  }

  /**
   * Deduct messages from bonus quotas
   * Uses FIFO (First In First Out) - deducts from bonuses expiring soonest first
   * Returns number of messages deducted from bonuses
   */
  async deductFromBonuses(userId: string, messagesToDeduct: number = 1): Promise<number> {
    try {
      const activeBonuses = await this.getActiveBonuses(userId)

      if (activeBonuses.length === 0) {
        return 0 // No bonuses available
      }

      let remainingToDeduct = messagesToDeduct
      let totalDeducted = 0

      for (const bonus of activeBonuses) {
        if (remainingToDeduct <= 0) break

        const available = bonus.bonus_messages - bonus.messages_used
        const deductFromThisBonus = Math.min(available, remainingToDeduct)

        if (deductFromThisBonus > 0) {
          const { error } = await supabase
            .from('user_bonus_quotas')
            .update({
              messages_used: bonus.messages_used + deductFromThisBonus,
              updated_at: new Date().toISOString()
            })
            .eq('id', bonus.id)

          if (error) {
            console.error('Error deducting from bonus:', error)
            continue
          }

          totalDeducted += deductFromThisBonus
          remainingToDeduct -= deductFromThisBonus
        }
      }

      return totalDeducted
    } catch (error) {
      console.error('Error in deductFromBonuses:', error)
      return 0
    }
  }

  /**
   * Get all bonuses for a user (including expired and fully used)
   * For admin/analytics purposes
   */
  async getAllUserBonuses(userId: string): Promise<BonusQuota[]> {
    try {
      const { data, error } = await supabase
        .from('user_bonus_quotas')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error getting all bonuses:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getAllUserBonuses:', error)
      return []
    }
  }

  /**
   * Delete a bonus quota (admin only)
   */
  async deleteBonus(bonusId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_bonus_quotas')
        .delete()
        .eq('id', bonusId)

      if (error) {
        console.error('Error deleting bonus:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in deleteBonus:', error)
      return false
    }
  }

  /**
   * Grant referral signup bonus (100 messages, 30 days expiration)
   */
  async grantReferralSignupBonus(userId: string, referrerId: string): Promise<BonusQuota | null> {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30) // 30 days from now

    return this.grantBonus({
      userId,
      bonusMessages: 100,
      bonusType: 'referral_signup',
      reason: `Signup bonus via referral from user ${referrerId}`,
      expiresAt: expiresAt.toISOString()
    })
  }

  /**
   * Grant referral completion bonus to referrer
   * Gives half of the referred user's free tier limit (fetched dynamically from database)
   */
  async grantReferralCompletionBonus(referrerId: string, referredUserId: string): Promise<BonusQuota | null> {
    try {
      // Get free tier limits from database
      const { data: tierLimits, error: tierError } = await supabase
        .from('admin_tier_limits')
        .select('messages_per_month')
        .eq('tier', 'free')
        .single()

      if (tierError || !tierLimits) {
        console.error('Error fetching free tier limits:', tierError)
        throw new Error('Failed to fetch free tier limits')
      }

      const freeTierLimit = tierLimits.messages_per_month || 200
      const bonusMessages = Math.floor(freeTierLimit / 2)

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 30) // 30 days from now

      return this.grantBonus({
        userId: referrerId,
        bonusMessages,
        bonusType: 'referral_completion',
        reason: `Referral completion bonus - friend ${referredUserId} used 10 messages`,
        expiresAt: expiresAt.toISOString()
      })
    } catch (error) {
      console.error('Error in grantReferralCompletionBonus:', error)
      throw error
    }
  }

  /**
   * Check if user has reached the message threshold for referral completion (10 messages)
   */
  async checkReferralCompletionThreshold(userId: string): Promise<boolean> {
    try {
      const { data: quota, error } = await supabase
        .from('user_perspective_quotas')
        .select('messages_used')
        .eq('user_id', userId)
        .single()

      if (error || !quota) {
        return false
      }

      return quota.messages_used >= 10
    } catch (error) {
      console.error('Error checking referral threshold:', error)
      return false
    }
  }
}

// Export singleton instance
export const bonusManager = new BonusManager()