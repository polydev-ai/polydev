/**
 * Quota Manager Service for Perspective-Based System
 * Handles quota checking, deduction, and reset automation
 */

import { createClient } from '@supabase/supabase-js'
import { getModelTier, calculatePerspectiveCost } from './model-tiers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface UserQuotaStatus {
  allowed: boolean
  reason?: string
  quotaRemaining: {
    messages?: number
    premium: number
    normal: number
    eco: number
  }
  planTier: string
  currentUsage: {
    messages: number
    premium: number
    normal: number
    eco: number
  }
}

export interface QuotaDeduction {
  userId: string
  modelName: string
  sessionId: string
  inputTokens: number
  outputTokens: number
  estimatedCost: number
  requestMetadata?: any
  responseMetadata?: any
}

export class QuotaManager {
  /**
   * Check if user can make request with given model
   */
  async checkQuotaAvailability(
    userId: string,
    modelName: string
  ): Promise<UserQuotaStatus> {
    try {
      // Get model tier info
      const modelInfo = getModelTier(modelName)
      if (!modelInfo) {
        return {
          allowed: false,
          reason: `Unknown model: ${modelName}`,
          quotaRemaining: { premium: 0, normal: 0, eco: 0 },
          planTier: 'free',
          currentUsage: { messages: 0, premium: 0, normal: 0, eco: 0 }
        }
      }

      // Get user quota info
      const { data: quota, error } = await supabase
        .from('user_perspective_quotas')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error || !quota) {
        return {
          allowed: false,
          reason: 'User quota not found',
          quotaRemaining: { premium: 0, normal: 0, eco: 0 },
          planTier: 'free',
          currentUsage: { messages: 0, premium: 0, normal: 0, eco: 0 }
        }
      }

      // Check if we need to reset monthly quota
      const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
      const quotaMonth = quota.current_month_start?.slice(0, 7)

      if (currentMonth !== quotaMonth) {
        await this.resetMonthlyQuota(userId)
        // Refresh quota data
        const { data: refreshedQuota } = await supabase
          .from('user_perspective_quotas')
          .select('*')
          .eq('user_id', userId)
          .single()

        if (refreshedQuota) {
          Object.assign(quota, refreshedQuota)
        }
      }

      // Calculate remaining quotas
      const remaining = {
        messages: quota.messages_per_month ?
          Math.max(0, quota.messages_per_month - quota.messages_used) : undefined,
        premium: Math.max(0, quota.premium_perspectives_limit - quota.premium_perspectives_used),
        normal: Math.max(0, quota.normal_perspectives_limit - quota.normal_perspectives_used),
        eco: Math.max(0, quota.eco_perspectives_limit - quota.eco_perspectives_used)
      }

      const currentUsage = {
        messages: quota.messages_used,
        premium: quota.premium_perspectives_used,
        normal: quota.normal_perspectives_used,
        eco: quota.eco_perspectives_used
      }

      // Check message limit (if not unlimited)
      if (quota.messages_per_month && quota.messages_used >= quota.messages_per_month) {
        return {
          allowed: false,
          reason: 'Monthly message limit exceeded',
          quotaRemaining: remaining,
          planTier: quota.plan_tier,
          currentUsage
        }
      }

      // Check perspective limit for the model tier
      const tierUsageKey = `${modelInfo.tier}_perspectives_used` as keyof typeof quota
      const tierLimitKey = `${modelInfo.tier}_perspectives_limit` as keyof typeof quota

      if (quota[tierUsageKey] >= quota[tierLimitKey]) {
        return {
          allowed: false,
          reason: `${modelInfo.tier} perspective limit exceeded`,
          quotaRemaining: remaining,
          planTier: quota.plan_tier,
          currentUsage
        }
      }

      return {
        allowed: true,
        quotaRemaining: remaining,
        planTier: quota.plan_tier,
        currentUsage
      }

    } catch (error) {
      console.error('Error checking quota availability:', error)
      return {
        allowed: false,
        reason: 'Internal quota check error',
        quotaRemaining: { premium: 0, normal: 0, eco: 0 },
        planTier: 'free',
        currentUsage: { messages: 0, premium: 0, normal: 0, eco: 0 }
      }
    }
  }

  /**
   * Deduct quota after successful request
   */
  async deductQuota(deduction: QuotaDeduction): Promise<void> {
    try {
      const { userId, modelName, sessionId, inputTokens, outputTokens, estimatedCost } = deduction

      // Get model tier info
      const modelInfo = getModelTier(modelName)
      if (!modelInfo) {
        throw new Error(`Unknown model: ${modelName}`)
      }

      // Calculate actual cost if not provided
      const actualCost = estimatedCost || calculatePerspectiveCost(modelName, inputTokens, outputTokens)

      // Update user quota usage
      const tierUsageKey = `${modelInfo.tier}_perspectives_used`

      const { error: quotaError } = await supabase
        .from('user_perspective_quotas')
        .update({
          messages_used: supabase.raw('messages_used + 1'),
          [tierUsageKey]: supabase.raw(`${tierUsageKey} + 1`),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      if (quotaError) {
        console.error('Error updating quota:', quotaError)
        throw new Error('Failed to update quota')
      }

      // Record detailed usage
      const { error: usageError } = await supabase
        .from('perspective_usage')
        .insert({
          user_id: userId,
          session_id: sessionId,
          model_name: modelName,
          model_tier: modelInfo.tier,
          provider: modelInfo.provider,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          total_tokens: inputTokens + outputTokens,
          estimated_cost: actualCost,
          perspectives_deducted: 1,
          request_metadata: deduction.requestMetadata || {},
          response_metadata: deduction.responseMetadata || {}
        })

      if (usageError) {
        console.error('Error recording usage:', usageError)
        // Don't throw here as quota was already deducted
      }

      // Update monthly summary (upsert)
      await this.updateMonthlySummary(userId, modelInfo.tier, actualCost)

    } catch (error) {
      console.error('Error deducting quota:', error)
      throw error
    }
  }

  /**
   * Reset monthly quotas for a user
   */
  async resetMonthlyQuota(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_perspective_quotas')
        .update({
          current_month_start: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
          messages_used: 0,
          premium_perspectives_used: 0,
          normal_perspectives_used: 0,
          eco_perspectives_used: 0,
          last_reset_date: new Date().toISOString().slice(0, 10),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      if (error) {
        console.error('Error resetting monthly quota:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in resetMonthlyQuota:', error)
      throw error
    }
  }

  /**
   * Reset monthly quotas for all users (cron job)
   */
  async resetAllMonthlyQuotas(): Promise<void> {
    try {
      const currentDate = new Date().toISOString().slice(0, 10)
      const currentMonth = new Date().toISOString().slice(0, 7)

      // Find users whose quotas need resetting
      const { data: usersToReset, error: selectError } = await supabase
        .from('user_perspective_quotas')
        .select('user_id')
        .neq('current_month_start', currentDate.slice(0, 7) + '-01')

      if (selectError) {
        console.error('Error finding users to reset:', selectError)
        return
      }

      if (!usersToReset?.length) {
        console.log('No users need quota reset')
        return
      }

      // Reset all users
      const { error: updateError } = await supabase
        .from('user_perspective_quotas')
        .update({
          current_month_start: currentMonth + '-01',
          messages_used: 0,
          premium_perspectives_used: 0,
          normal_perspectives_used: 0,
          eco_perspectives_used: 0,
          last_reset_date: currentDate,
          updated_at: new Date().toISOString()
        })
        .in('user_id', usersToReset.map(u => u.user_id))

      if (updateError) {
        console.error('Error resetting quotas:', updateError)
        throw updateError
      }

      console.log(`Reset quotas for ${usersToReset.length} users`)
    } catch (error) {
      console.error('Error in resetAllMonthlyQuotas:', error)
      throw error
    }
  }

  /**
   * Get user's current quota status
   */
  async getUserQuotaStatus(userId: string): Promise<UserQuotaStatus> {
    return this.checkQuotaAvailability(userId, 'dummy-model')
  }

  /**
   * Update or create monthly usage summary
   */
  private async updateMonthlySummary(
    userId: string,
    modelTier: 'premium' | 'normal' | 'eco',
    cost: number
  ): Promise<void> {
    try {
      const monthYear = new Date().toISOString().slice(0, 7) // YYYY-MM

      // Get current plan tier
      const { data: quota } = await supabase
        .from('user_perspective_quotas')
        .select('plan_tier')
        .eq('user_id', userId)
        .single()

      const planTier = quota?.plan_tier || 'free'

      // Upsert monthly summary
      const updateData = {
        user_id: userId,
        month_year: monthYear,
        plan_tier: planTier,
        total_messages: supabase.raw('COALESCE(total_messages, 0) + 1'),
        [`${modelTier}_perspectives_used`]: supabase.raw(`COALESCE(${modelTier}_perspectives_used, 0) + 1`),
        total_estimated_cost: supabase.raw(`COALESCE(total_estimated_cost, 0) + ${cost}`),
        [`${modelTier}_cost`]: supabase.raw(`COALESCE(${modelTier}_cost, 0) + ${cost}`),
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('monthly_usage_summary')
        .upsert(updateData, { onConflict: 'user_id,month_year' })

      if (error) {
        console.error('Error updating monthly summary:', error)
      }
    } catch (error) {
      console.error('Error in updateMonthlySummary:', error)
    }
  }

  /**
   * Update user's plan tier and quota limits
   */
  async updateUserPlan(
    userId: string,
    newTier: 'free' | 'plus' | 'pro'
  ): Promise<void> {
    try {
      const quotaLimits = {
        free: { messages: 200, premium: 10, normal: 100, eco: 500 },
        plus: { messages: null, premium: 500, normal: 2000, eco: 10000 },
        pro: { messages: null, premium: 1500, normal: 6000, eco: 30000 }
      }

      const limits = quotaLimits[newTier]

      const { error } = await supabase
        .from('user_perspective_quotas')
        .update({
          plan_tier: newTier,
          messages_per_month: limits.messages,
          premium_perspectives_limit: limits.premium,
          normal_perspectives_limit: limits.normal,
          eco_perspectives_limit: limits.eco,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      if (error) {
        console.error('Error updating user plan:', error)
        throw error
      }

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ current_plan_tier: newTier })
        .eq('id', userId)

      if (profileError) {
        console.error('Error updating profile plan tier:', profileError)
      }

    } catch (error) {
      console.error('Error in updateUserPlan:', error)
      throw error
    }
  }
}

// Export singleton instance
export const quotaManager = new QuotaManager()