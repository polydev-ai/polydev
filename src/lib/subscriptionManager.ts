import { createClient } from '@/app/utils/supabase/server'

export interface UserSubscription {
  id: string
  user_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  tier: 'free' | 'pro'
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing'
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

export interface UserMessageUsage {
  id: string
  user_id: string
  month_year: string
  messages_sent: number
  messages_limit: number
  cli_usage_allowed: boolean
  created_at: string
  updated_at: string
}

export interface UserCredits {
  id: string
  user_id: string
  balance: number
  promotional_balance: number
  monthly_allocation: number
  total_purchased: number
  total_spent: number
  last_monthly_reset: string | null
  created_at: string
  updated_at: string
}

export class SubscriptionManager {
  private async getSupabase(useServiceRole: boolean = false) {
    if (useServiceRole && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY !== 'your_service_role_key') {
      const { createClient: createServiceClient } = await import('@supabase/supabase-js')
      return createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
    }
    return await createClient()
  }

  // Get user subscription status
  async getUserSubscription(userId: string, useServiceRole: boolean = false): Promise<UserSubscription | null> {
    try {
      const supabase = await this.getSupabase(useServiceRole)
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code === 'PGRST116') {
        // User not found - create default FREE subscription
        console.log(`[SubscriptionManager] Creating default FREE subscription for user: ${userId}`)
        
        const { data: newSubscription, error: createError } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: userId,
            tier: 'free',
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (createError) {
          console.error('Error creating user subscription:', createError)
          return null
        }

        return newSubscription
      } else if (error) {
        console.error('Error getting user subscription:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error in getUserSubscription:', error)
      return null
    }
  }

  // Get or create user message usage for current month
  async getUserMessageUsage(userId: string, useServiceRole: boolean = false): Promise<UserMessageUsage> {
    try {
      const supabase = await this.getSupabase(useServiceRole)
      const currentMonth = new Date().toISOString().substring(0, 7) // YYYY-MM
      
      // Try to get existing usage
      let { data: usage, error } = await supabase
        .from('user_message_usage')
        .select('*')
        .eq('user_id', userId)
        .eq('month_year', currentMonth)
        .single()

      if (error && error.code === 'PGRST116') {
        // Create new usage record
        const subscription = await this.getUserSubscription(userId, useServiceRole)
        const isPro = subscription?.tier === 'pro' && subscription?.status === 'active'
        
        // Get base limit (200 free) + referral bonuses
        const baseLimit = isPro ? 999999 : 200 // Unlimited for pro users
        const referralBonus = await this.getReferralBonus(userId, useServiceRole)
        
        const { data: newUsage, error: createError } = await supabase
          .from('user_message_usage')
          .insert({
            user_id: userId,
            month_year: currentMonth,
            messages_sent: 0,
            messages_limit: isPro ? 999999 : baseLimit + referralBonus,
            cli_usage_allowed: isPro
          })
          .select()
          .single()

        if (createError) {
          throw createError
        }
        
        usage = newUsage
      } else if (error) {
        throw error
      }

      // Check if we need to update existing usage records to match current subscription status
      if (usage) {
        const subscription = await this.getUserSubscription(userId, useServiceRole)
        const isPro = subscription?.tier === 'pro' && subscription?.status === 'active'
        const referralBonus = await this.getReferralBonus(userId, useServiceRole)
        
        let shouldUpdate = false
        let newLimit = usage.messages_limit
        
        if (isPro && usage.messages_limit !== 999999) {
          // User is pro but has limited messages - upgrade them
          newLimit = 999999
          shouldUpdate = true
          console.log(`[SubscriptionManager] User ${userId} is pro, upgrading to unlimited messages`)
        } else if (!isPro && usage.messages_limit === 999999) {
          // User is not pro but has unlimited messages - downgrade them  
          newLimit = 200 + referralBonus
          shouldUpdate = true
          console.log(`[SubscriptionManager] User ${userId} is not pro, downgrading from unlimited to ${newLimit} messages`)
        } else if (!isPro && usage.messages_limit === 50) {
          // Free user with old limit (50) - upgrade to new free limit (200)
          newLimit = 200 + referralBonus
          shouldUpdate = true
          console.log(`[SubscriptionManager] User ${userId} is free, upgrading from 50 to ${newLimit} messages`)
        }
        
        if (shouldUpdate) {
          const { data: updatedUsage, error: updateError } = await supabase
            .from('user_message_usage')
            .update({ 
              messages_limit: newLimit,
              cli_usage_allowed: isPro 
            })
            .eq('user_id', userId)
            .eq('month_year', currentMonth)
            .select()
            .single()
          
          if (updateError) {
            console.warn('Failed to update message limit:', updateError)
          } else {
            usage = updatedUsage
          }
        }
      }

      return usage!
    } catch (error) {
      console.error('Error in getUserMessageUsage:', error)
      throw error
    }
  }

  // Get referral bonus messages
  async getReferralBonus(userId: string, useServiceRole: boolean = false): Promise<number> {
    try {
      const supabase = await this.getSupabase(useServiceRole)
      const { data: referrals, error } = await supabase
        .from('user_referrals')
        .select('bonus_messages')
        .eq('referrer_id', userId)
        .eq('status', 'completed')

      if (error) {
        console.error('Error getting referral bonus:', error)
        return 0
      }

      return referrals.reduce((total, ref) => total + (ref.bonus_messages || 0), 0)
    } catch (error) {
      console.error('Error in getReferralBonus:', error)
      return 0
    }
  }

  // Check if user can send message
  async canSendMessage(userId: string, useServiceRole: boolean = false): Promise<{ canSend: boolean; reason?: string; usage?: UserMessageUsage }> {
    try {
      const usage = await this.getUserMessageUsage(userId, useServiceRole)
      
      if (usage.messages_sent >= usage.messages_limit) {
        return {
          canSend: false,
          reason: 'Monthly message limit exceeded. Upgrade to Pro for unlimited messages.',
          usage
        }
      }

      return { canSend: true, usage }
    } catch (error) {
      console.error('Error in canSendMessage:', error)
      return { canSend: false, reason: 'Error checking message limits' }
    }
  }

  // Check if user can use CLI
  async canUseCLI(userId: string, useServiceRole: boolean = true): Promise<{ canUse: boolean; reason?: string }> {
    try {
      const subscription = await this.getUserSubscription(userId, useServiceRole)
      
      if (!subscription || subscription.tier !== 'pro' || subscription.status !== 'active') {
        return {
          canUse: false,
          reason: 'CLI access requires Polydev Pro subscription ($20/month)'
        }
      }

      return { canUse: true }
    } catch (error) {
      console.error('Error in canUseCLI:', error)
      return { canUse: false, reason: 'Error checking CLI access' }
    }
  }

  // Increment message count
  async incrementMessageCount(userId: string, useServiceRole: boolean = false): Promise<void> {
    try {
      const supabase = await this.getSupabase(useServiceRole)
      const currentMonth = new Date().toISOString().substring(0, 7)
      
      await supabase.rpc('increment_message_count', {
        p_user_id: userId,
        p_month_year: currentMonth
      })
    } catch (error) {
      console.error('Error incrementing message count:', error)
      throw error
    }
  }

  // Get user credits with monthly allocation
  async getUserCredits(userId: string, useServiceRole: boolean = false): Promise<UserCredits | null> {
    try {
      const supabase = await this.getSupabase(useServiceRole)
      
      // Get or create user credits
      let { data: credits, error } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code === 'PGRST116') {
        // Create new credits record
        const subscription = await this.getUserSubscription(userId, useServiceRole)
        const monthlyAllocation = subscription?.tier === 'pro' && subscription?.status === 'active' ? 5.0 : 0.0
        
        const { data: newCredits, error: createError } = await supabase
          .from('user_credits')
          .insert({
            user_id: userId,
            balance: 0.0,
            promotional_balance: 0.0,
            monthly_allocation: monthlyAllocation,
            total_purchased: 0.0,
            total_spent: 0.0,
            last_monthly_reset: subscription?.tier === 'pro' ? new Date().toISOString() : null
          })
          .select()
          .single()

        if (createError) {
          throw createError
        }
        
        credits = newCredits
      } else if (error) {
        throw error
      }

      // Check if we need to allocate monthly credits for pro users
      if (credits) {
        const subscription = await this.getUserSubscription(userId, useServiceRole)
        if (subscription?.tier === 'pro' && subscription?.status === 'active') {
          const lastReset = credits.last_monthly_reset ? new Date(credits.last_monthly_reset) : null
          const now = new Date()
          const shouldReset = !lastReset || 
            (now.getFullYear() > lastReset.getFullYear() || 
             (now.getFullYear() === lastReset.getFullYear() && now.getMonth() > lastReset.getMonth()))

          if (shouldReset) {
            // Allocate $5 monthly credits
            await supabase
              .from('user_credits')
              .update({
                balance: credits.balance + 5.0,
                monthly_allocation: 5.0,
                last_monthly_reset: now.toISOString(),
                updated_at: now.toISOString()
              })
              .eq('user_id', userId)

            credits.balance += 5.0
            credits.monthly_allocation = 5.0
            credits.last_monthly_reset = now.toISOString()
          }
        }
      }

      return credits
    } catch (error) {
      console.error('Error in getUserCredits:', error)
      return null
    }
  }

  // Apply 10% markup to costs
  applyMarkup(cost: number): number {
    return cost * 1.1 // 10% markup
  }

  // Check if user has sufficient credits (including markup)
  async checkCreditSufficiency(userId: string, estimatedCost: number, useServiceRole: boolean = false): Promise<{ sufficient: boolean; reason?: string; markedUpCost: number }> {
    try {
      const credits = await this.getUserCredits(userId, useServiceRole)
      const markedUpCost = this.applyMarkup(estimatedCost)
      
      if (!credits) {
        return {
          sufficient: false,
          reason: 'Credit account not found',
          markedUpCost
        }
      }

      const totalBalance = credits.balance + credits.promotional_balance
      
      if (totalBalance < markedUpCost) {
        return {
          sufficient: false,
          reason: `Insufficient credits. Need ${markedUpCost.toFixed(4)} credits (${estimatedCost.toFixed(4)} + 10% markup), have ${totalBalance.toFixed(4)}`,
          markedUpCost
        }
      }

      return { sufficient: true, markedUpCost }
    } catch (error) {
      console.error('Error checking credit sufficiency:', error)
      return {
        sufficient: false,
        reason: 'Error checking credits',
        markedUpCost: this.applyMarkup(estimatedCost)
      }
    }
  }

  // Initialize user data (called on first signup)
  async initializeUserData(userId: string): Promise<void> {
    try {
      const supabase = await this.getSupabase()
      
      // Initialize subscription record (free tier)
      await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: userId,
          tier: 'free',
          status: 'active'
        })

      // Initialize credits
      await supabase
        .from('user_credits')
        .upsert({
          user_id: userId,
          balance: 0.0,
          promotional_balance: 1.0, // Give $1 promotional credit to new users
          monthly_allocation: 0.0,
          total_purchased: 0.0,
          total_spent: 0.0
        })

      console.log(`Initialized user data for ${userId}`)
    } catch (error) {
      console.error('Error initializing user data:', error)
      throw error
    }
  }
}

// Export singleton instance
export const subscriptionManager = new SubscriptionManager()
