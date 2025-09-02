/**
 * Credit Management System
 * Handles user credit balances, purchases, and spending tracking
 */

import { createClient } from '@/app/utils/supabase/server'
import OpenRouterClient from './openrouter'

export interface UserCredits {
  id: string
  user_id: string
  balance: number
  total_purchased: number
  total_spent: number
  created_at: string
  updated_at: string
}

export interface CreditPurchase {
  id: string
  user_id: string
  amount: number
  stripe_payment_intent_id?: string
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  created_at: string
}

export interface UserBudget {
  id: string
  user_id: string
  daily_limit?: number
  weekly_limit?: number
  monthly_limit?: number
  preferred_models: string[]
  auto_top_up_enabled: boolean
  auto_top_up_threshold?: number
  auto_top_up_amount?: number
  created_at: string
  updated_at: string
}

export interface ModelUsage {
  id: string
  user_id: string
  openrouter_key_hash?: string
  model_id: string
  prompt_tokens: number
  completion_tokens: number
  reasoning_tokens: number
  total_cost: number
  request_timestamp: string
}

export interface OpenRouterKey {
  id: string
  user_id: string
  openrouter_key_hash: string
  openrouter_key_label: string
  spending_limit?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// Credit packages with volume discounts
export const CREDIT_PACKAGES = [
  { 
    amount: 10, 
    price: 1000, // $10.00 in cents
    bonus: 0, 
    description: 'Starter package',
    popular: false 
  },
  { 
    amount: 25, 
    price: 2400, // $24.00 in cents
    bonus: 1, 
    description: 'Most popular',
    popular: true 
  },
  { 
    amount: 50, 
    price: 4700, // $47.00 in cents
    bonus: 3, 
    description: 'Great value',
    popular: false 
  },
  { 
    amount: 100, 
    price: 9200, // $92.00 in cents
    bonus: 8, 
    description: 'Power user',
    popular: false 
  },
  { 
    amount: 250, 
    price: 22500, // $225.00 in cents
    bonus: 25, 
    description: 'Enterprise',
    popular: false 
  }
]

export class CreditManager {
  private openrouter = new OpenRouterClient()
  
  private async getSupabase() {
    return await createClient()
  }

  /**
   * Get user's current credit balance
   */
  async getUserCredits(userId: string): Promise<UserCredits | null> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No credits record exists, create one
          return await this.initializeUserCredits(userId)
        }
        throw error
      }

      return data
    } catch (error) {
      console.error('[CreditManager] Error fetching user credits:', error)
      throw error
    }
  }

  /**
   * Initialize credits record for new user
   */
  private async initializeUserCredits(userId: string): Promise<UserCredits> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('user_credits')
        .insert({
          user_id: userId,
          balance: 0,
          total_purchased: 0,
          total_spent: 0
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('[CreditManager] Error initializing user credits:', error)
      throw error
    }
  }

  /**
   * Add credits to user's balance (after successful purchase)
   */
  async addCredits(userId: string, amount: number, purchaseId?: string): Promise<UserCredits> {
    try {
      // Get current balance
      const currentCredits = await this.getUserCredits(userId)
      if (!currentCredits) throw new Error('User credits not found')

      // Update balance
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('user_credits')
        .update({
          balance: currentCredits.balance + amount,
          total_purchased: currentCredits.total_purchased + amount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error

      console.log(`[CreditManager] Added ${amount} credits to user ${userId}`)
      return data
    } catch (error) {
      console.error('[CreditManager] Error adding credits:', error)
      throw error
    }
  }

  /**
   * Deduct credits from user's balance (after API usage)
   */
  async deductCredits(userId: string, amount: number): Promise<UserCredits> {
    try {
      const currentCredits = await this.getUserCredits(userId)
      if (!currentCredits) throw new Error('User credits not found')

      if (currentCredits.balance < amount) {
        throw new Error('Insufficient credits')
      }

      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('user_credits')
        .update({
          balance: currentCredits.balance - amount,
          total_spent: currentCredits.total_spent + amount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error

      console.log(`[CreditManager] Deducted ${amount} credits from user ${userId}`)
      return data
    } catch (error) {
      console.error('[CreditManager] Error deducting credits:', error)
      throw error
    }
  }

  /**
   * Record a credit purchase
   */
  async recordPurchase(
    userId: string, 
    amount: number, 
    stripePaymentIntentId?: string
  ): Promise<CreditPurchase> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('credit_purchases')
        .insert({
          user_id: userId,
          amount,
          stripe_payment_intent_id: stripePaymentIntentId,
          status: 'pending'
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('[CreditManager] Error recording purchase:', error)
      throw error
    }
  }

  /**
   * Update purchase status
   */
  async updatePurchaseStatus(
    purchaseId: string, 
    status: CreditPurchase['status']
  ): Promise<CreditPurchase> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('credit_purchases')
        .update({ status })
        .eq('id', purchaseId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('[CreditManager] Error updating purchase status:', error)
      throw error
    }
  }

  /**
   * Get user's purchase history
   */
  async getPurchaseHistory(userId: string): Promise<CreditPurchase[]> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('credit_purchases')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('[CreditManager] Error fetching purchase history:', error)
      throw error
    }
  }

  /**
   * Create or update user's OpenRouter API key
   */
  async createUserOpenRouterKey(userId: string, spendingLimit?: number): Promise<OpenRouterKey> {
    try {
      const supabase = await this.getSupabase()
      // Check if user already has a key
      const { data: existingKey } = await supabase
        .from('openrouter_keys')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()

      if (existingKey) {
        // Update existing key's spending limit if needed
        if (spendingLimit && spendingLimit !== existingKey.spending_limit) {
          await this.openrouter.updateKey(existingKey.openrouter_key_hash, {
            limit: spendingLimit
          })

          const { data, error } = await supabase
            .from('openrouter_keys')
            .update({ 
              spending_limit: spendingLimit,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingKey.id)
            .select()
            .single()

          if (error) throw error
          return data
        }
        return existingKey
      }

      // Create new OpenRouter API key
      const newKey = await this.openrouter.createUserKey({
        name: `polydev_user_${userId}`,
        limit: spendingLimit
      })

      // Store in database
      const { data, error } = await supabase
        .from('openrouter_keys')
        .insert({
          user_id: userId,
          openrouter_key_hash: newKey.hash,
          openrouter_key_label: newKey.label,
          spending_limit: spendingLimit,
          is_active: true
        })
        .select()
        .single()

      if (error) throw error

      console.log(`[CreditManager] Created OpenRouter key for user ${userId}`)
      return data
    } catch (error) {
      console.error('[CreditManager] Error creating user OpenRouter key:', error)
      throw error
    }
  }

  /**
   * Get user's OpenRouter key
   */
  async getUserOpenRouterKey(userId: string): Promise<OpenRouterKey | null> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('openrouter_keys')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw error
      }

      return data
    } catch (error) {
      console.error('[CreditManager] Error fetching user OpenRouter key:', error)
      throw error
    }
  }

  /**
   * Record model usage
   */
  async recordModelUsage(
    userId: string,
    modelId: string,
    promptTokens: number,
    completionTokens: number,
    reasoningTokens: number = 0,
    totalCost: number,
    keyHash?: string
  ): Promise<ModelUsage> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('model_usage')
        .insert({
          user_id: userId,
          openrouter_key_hash: keyHash,
          model_id: modelId,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          reasoning_tokens: reasoningTokens,
          total_cost: totalCost
        })
        .select()
        .single()

      if (error) throw error

      // Also deduct credits from balance
      await this.deductCredits(userId, totalCost)

      return data
    } catch (error) {
      console.error('[CreditManager] Error recording model usage:', error)
      throw error
    }
  }

  /**
   * Get user's usage history
   */
  async getUserUsageHistory(
    userId: string, 
    limit: number = 50
  ): Promise<ModelUsage[]> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('model_usage')
        .select('*')
        .eq('user_id', userId)
        .order('request_timestamp', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('[CreditManager] Error fetching usage history:', error)
      throw error
    }
  }

  /**
   * Get user's budget settings
   */
  async getUserBudget(userId: string): Promise<UserBudget | null> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('user_budgets')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw error
      }

      return data
    } catch (error) {
      console.error('[CreditManager] Error fetching user budget:', error)
      throw error
    }
  }

  /**
   * Update user's budget settings
   */
  async updateUserBudget(userId: string, budget: Partial<UserBudget>): Promise<UserBudget> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('user_budgets')
        .upsert({
          user_id: userId,
          ...budget,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('[CreditManager] Error updating user budget:', error)
      throw error
    }
  }

  /**
   * Check if user can make a request within budget limits
   */
  async canMakeRequest(userId: string, estimatedCost: number): Promise<{
    canMake: boolean
    reason?: string
  }> {
    try {
      // Check credit balance
      const credits = await this.getUserCredits(userId)
      if (!credits || credits.balance < estimatedCost) {
        return {
          canMake: false,
          reason: 'Insufficient credits'
        }
      }

      // Check budget limits
      const budget = await this.getUserBudget(userId)
      if (budget) {
        const now = new Date()
        
        // Check daily limit
        if (budget.daily_limit) {
          const startOfDay = new Date(now.setHours(0, 0, 0, 0))
          const todaySpending = await this.getSpendingInPeriod(userId, startOfDay, now)
          
          if (todaySpending + estimatedCost > budget.daily_limit) {
            return {
              canMake: false,
              reason: 'Daily spending limit exceeded'
            }
          }
        }

        // Check weekly limit
        if (budget.weekly_limit) {
          const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
          const weekSpending = await this.getSpendingInPeriod(userId, startOfWeek, now)
          
          if (weekSpending + estimatedCost > budget.weekly_limit) {
            return {
              canMake: false,
              reason: 'Weekly spending limit exceeded'
            }
          }
        }

        // Check monthly limit
        if (budget.monthly_limit) {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
          const monthSpending = await this.getSpendingInPeriod(userId, startOfMonth, now)
          
          if (monthSpending + estimatedCost > budget.monthly_limit) {
            return {
              canMake: false,
              reason: 'Monthly spending limit exceeded'
            }
          }
        }
      }

      return { canMake: true }
    } catch (error) {
      console.error('[CreditManager] Error checking request permission:', error)
      return {
        canMake: false,
        reason: 'Unable to verify budget limits'
      }
    }
  }

  /**
   * Get total spending in a specific time period
   */
  private async getSpendingInPeriod(
    userId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<number> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('model_usage')
        .select('total_cost')
        .eq('user_id', userId)
        .gte('request_timestamp', startDate.toISOString())
        .lte('request_timestamp', endDate.toISOString())

      if (error) throw error

      return (data || []).reduce((sum, usage) => sum + usage.total_cost, 0)
    } catch (error) {
      console.error('[CreditManager] Error calculating spending:', error)
      return 0
    }
  }

  /**
   * Get spending analytics for user
   */
  async getSpendingAnalytics(userId: string, days: number = 30) {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('model_usage')
        .select(`
          total_cost,
          model_id,
          prompt_tokens,
          completion_tokens,
          request_timestamp
        `)
        .eq('user_id', userId)
        .gte('request_timestamp', startDate.toISOString())
        .order('request_timestamp', { ascending: false })

      if (error) throw error

      const usage = data || []
      
      // Calculate analytics
      const totalSpent = usage.reduce((sum, u) => sum + u.total_cost, 0)
      const totalRequests = usage.length
      const avgCostPerRequest = totalRequests > 0 ? totalSpent / totalRequests : 0
      
      // Group by model
      const modelBreakdown = usage.reduce((acc: any, u) => {
        if (!acc[u.model_id]) {
          acc[u.model_id] = {
            requests: 0,
            cost: 0,
            tokens: 0
          }
        }
        acc[u.model_id].requests += 1
        acc[u.model_id].cost += u.total_cost
        acc[u.model_id].tokens += u.prompt_tokens + u.completion_tokens
        return acc
      }, {})

      return {
        totalSpent,
        totalRequests,
        avgCostPerRequest,
        modelBreakdown,
        usage
      }
    } catch (error) {
      console.error('[CreditManager] Error fetching analytics:', error)
      throw error
    }
  }
}

export default CreditManager