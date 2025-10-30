/**
 * Quota Manager Service for Perspective-Based System
 * Handles quota checking, deduction, and reset automation
 */

import { createClient } from '@supabase/supabase-js'
import { getModelTier, calculatePerspectiveCost } from './model-tiers'
import { bonusManager } from './bonus-manager'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface UserQuotaStatus {
  allowed: boolean
  reason?: string
  quotaRemaining: {
    messages?: number
    bonusMessages: number
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
  providerSourceId?: string  // ID from admin_system_api_keys or user_api_keys
  sourceType?: 'user_key' | 'user_cli' | 'admin_key' | 'admin_credits'
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
          quotaRemaining: { bonusMessages: 0, premium: 0, normal: 0, eco: 0 },
          planTier: 'free',
          currentUsage: { messages: 0, premium: 0, normal: 0, eco: 0 }
        }
      }

      // Get user quota info
      const { data: quota, error } = await supabase
        .from('user_perspective_quotas')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (error || !quota) {
        return {
          allowed: false,
          reason: 'User quota not found',
          quotaRemaining: { bonusMessages: 0, premium: 0, normal: 0, eco: 0 },
          planTier: 'free',
          currentUsage: { messages: 0, premium: 0, normal: 0, eco: 0 }
        }
      }

      // Get bonus balance
      const bonusBalance = await bonusManager.getAvailableBonusBalance(userId)

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
          .maybeSingle()

        if (refreshedQuota) {
          Object.assign(quota, refreshedQuota)
        }
      }

      // Calculate remaining quotas
      const remaining = {
        messages: quota.messages_per_month ?
          Math.max(0, quota.messages_per_month - quota.messages_used) : undefined,
        bonusMessages: bonusBalance,
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
      // Allow if bonus messages are available
      if (quota.messages_per_month && quota.messages_used >= quota.messages_per_month && bonusBalance === 0) {
        return {
          allowed: false,
          reason: 'Monthly message limit exceeded and no bonus messages available',
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
        quotaRemaining: { bonusMessages: 0, premium: 0, normal: 0, eco: 0 },
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

      // Try to deduct from bonus messages first (FIFO - expiring soonest first)
      const bonusDeducted = await bonusManager.deductFromBonuses(userId, 1)
      const usedBonus = bonusDeducted > 0

      // Update user quota usage
      const tierUsageKey = `${modelInfo.tier}_perspectives_used`

      // Get current usage first
      const { data: currentQuota, error: fetchError } = await supabase
        .from('user_perspective_quotas')
        .select('messages_used, ' + tierUsageKey)
        .eq('user_id', userId)
        .maybeSingle()

      if (fetchError || !currentQuota) {
        throw new Error('Failed to fetch current quota')
      }

      // Type guard to ensure we have the expected properties
      const quotaData = currentQuota as any
      if (typeof quotaData.messages_used !== 'number' || typeof quotaData[tierUsageKey] !== 'number') {
        throw new Error('Invalid quota data structure')
      }

      // If bonus was used, only increment perspectives, not messages
      // If no bonus, increment both messages and perspectives
      const updateData: any = {
        [tierUsageKey]: quotaData[tierUsageKey] + 1,
        updated_at: new Date().toISOString()
      }

      if (!usedBonus) {
        updateData.messages_used = quotaData.messages_used + 1
      }

      const { error: quotaError } = await supabase
        .from('user_perspective_quotas')
        .update(updateData)
        .eq('user_id', userId)

      if (quotaError) {
        console.error('Error updating quota:', quotaError)
        throw new Error('Failed to update quota')
      }

      // Record detailed usage
      const usageRecord: any = {
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
      }

      // Add provider source tracking if available
      if (deduction.providerSourceId) {
        usageRecord.provider_source_id = deduction.providerSourceId
      }
      if (deduction.sourceType) {
        usageRecord.request_metadata = {
          ...usageRecord.request_metadata,
          source_type: deduction.sourceType
        }
      }

      // Track if bonus was used
      if (usedBonus) {
        usageRecord.request_metadata = {
          ...usageRecord.request_metadata,
          used_bonus_message: true
        }
      }

      const { error: usageError } = await supabase
        .from('perspective_usage')
        .insert(usageRecord)

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
        .maybeSingle()

      const planTier = quota?.plan_tier || 'free'

      // Get current monthly summary if it exists
      const { data: currentSummary } = await supabase
        .from('monthly_usage_summary')
        .select('*')
        .eq('user_id', userId)
        .eq('month_year', monthYear)
        .maybeSingle()

      // Calculate new values
      const newTotalMessages = (currentSummary?.total_messages || 0) + 1
      const newPerspectivesUsed = (currentSummary?.[`${modelTier}_perspectives_used`] || 0) + 1
      const newTotalCost = (currentSummary?.total_estimated_cost || 0) + cost
      const newTierCost = (currentSummary?.[`${modelTier}_cost`] || 0) + cost

      // Upsert monthly summary
      const updateData = {
        user_id: userId,
        month_year: monthYear,
        plan_tier: planTier,
        total_messages: newTotalMessages,
        [`${modelTier}_perspectives_used`]: newPerspectivesUsed,
        total_estimated_cost: newTotalCost,
        [`${modelTier}_cost`]: newTierCost,
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
   * Update user's plan tier and quota limits (uses dynamic database config)
   */
  async updateUserPlan(
    userId: string,
    newTier: 'free' | 'plus' | 'pro' | 'enterprise'
  ): Promise<void> {
    try {
      // Fetch tier limits from database
      const { data: tierLimits, error: tierError } = await supabase
        .from('admin_tier_limits')
        .select('*')
        .eq('tier', newTier)
        .single()

      if (tierError || !tierLimits) {
        console.error('Error fetching tier limits:', tierError)
        throw new Error(`Failed to fetch limits for tier: ${newTier}`)
      }

      const { error } = await supabase
        .from('user_perspective_quotas')
        .update({
          plan_tier: newTier,
          messages_per_month: tierLimits.messages_per_month,
          premium_perspectives_limit: tierLimits.premium_perspectives_limit,
          normal_perspectives_limit: tierLimits.normal_perspectives_limit,
          eco_perspectives_limit: tierLimits.eco_perspectives_limit,
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