/**
 * Provider Key Manager Service
 * Handles ordered fallback mechanism for API keys
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface ApiKeyInfo {
  id: string
  provider: string
  key_name: string
  encrypted_key: string
  priority_order: number
  monthly_budget: number | null
  daily_limit: number | null
  current_usage: number
  daily_usage: number
  rate_limit_rpm: number | null
  active: boolean
  last_used_at: string | null
}

export interface KeyUsageUpdate {
  keyId: string
  cost: number
  tokens: number
  success: boolean
  errorType?: string
}

export class ProviderKeyManager {
  /**
   * Get the next available API key for a provider with ordered fallback
   */
  async getNextAvailableKey(
    provider: string,
    userId: string
  ): Promise<ApiKeyInfo | null> {
    try {
      // Get all active keys for this provider/user ordered by primary flag first, then priority
      const { data: keys, error } = await supabase
        .from('user_api_keys')
        .select('*')
        .eq('provider', provider.toLowerCase())
        .eq('user_id', userId)
        .eq('active', true)
        .order('is_primary', { ascending: false, nullsLast: true }) // Primary keys first
        .order('priority_order', { ascending: true, nullsFirst: false })

      if (error) {
        console.error('Error fetching provider keys:', error)
        return null
      }

      if (!keys || keys.length === 0) {
        console.log(`No active keys found for provider ${provider}`)
        return null
      }

      // Find the first key that hasn't exceeded its limits
      const currentDate = new Date().toISOString().slice(0, 10)

      for (const key of keys) {
        const isAvailable = await this.checkKeyAvailability(key, currentDate)

        if (isAvailable) {
          // Update last_used_at timestamp
          await this.updateLastUsedTimestamp(key.id)

          return {
            id: key.id,
            provider: key.provider,
            key_name: key.key_name,
            encrypted_key: key.encrypted_key,
            priority_order: key.priority_order,
            monthly_budget: key.monthly_budget,
            daily_limit: key.daily_limit,
            current_usage: key.current_usage,
            daily_usage: key.daily_usage,
            rate_limit_rpm: key.rate_limit_rpm,
            active: key.active,
            last_used_at: key.last_used_at
          }
        }
      }

      console.log(`All keys for provider ${provider} have exceeded their limits`)
      return null

    } catch (error) {
      console.error('Error getting next available key:', error)
      return null
    }
  }

  /**
   * Check if a key is available for use
   */
  private async checkKeyAvailability(key: any, currentDate: string): Promise<boolean> {
    // Check monthly budget
    if (key.monthly_budget && key.current_usage >= key.monthly_budget) {
      console.log(`Key ${key.key_name} has exceeded monthly budget: ${key.current_usage}/${key.monthly_budget}`)
      return false
    }

    // Check daily limit
    if (key.daily_limit) {
      // Reset daily usage if it's a new day
      const lastUsedDate = key.last_used_at ? new Date(key.last_used_at).toISOString().slice(0, 10) : null

      if (lastUsedDate !== currentDate) {
        // Reset daily usage for new day
        await supabase
          .from('user_api_keys')
          .update({ daily_usage: 0, updated_at: new Date().toISOString() })
          .eq('id', key.id)

        key.daily_usage = 0
      }

      if (key.daily_usage >= key.daily_limit) {
        console.log(`Key ${key.key_name} has exceeded daily limit: ${key.daily_usage}/${key.daily_limit}`)
        return false
      }
    }

    return true
  }

  /**
   * Update the last used timestamp for a key
   */
  private async updateLastUsedTimestamp(keyId: string): Promise<void> {
    try {
      await supabase
        .from('user_api_keys')
        .update({
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', keyId)
    } catch (error) {
      console.error('Error updating last used timestamp:', error)
    }
  }

  /**
   * Update usage after API call completion
   */
  async updateKeyUsage(update: KeyUsageUpdate): Promise<void> {
    try {
      const { keyId, cost, tokens, success, errorType } = update

      // Get current usage
      const { data: key, error: fetchError } = await supabase
        .from('user_api_keys')
        .select('current_usage, daily_usage')
        .eq('id', keyId)
        .single()

      if (fetchError || !key) {
        console.error('Error fetching key for usage update:', fetchError)
        return
      }

      // Update usage counters
      const { error: updateError } = await supabase
        .from('user_api_keys')
        .update({
          current_usage: key.current_usage + cost,
          daily_usage: key.daily_usage + cost,
          updated_at: new Date().toISOString()
        })
        .eq('id', keyId)

      if (updateError) {
        console.error('Error updating key usage:', updateError)
        return
      }

      // Record detailed usage log
      await this.recordUsageLog({
        keyId,
        cost,
        tokens,
        success,
        errorType
      })

    } catch (error) {
      console.error('Error in updateKeyUsage:', error)
    }
  }

  /**
   * Record detailed usage log
   */
  private async recordUsageLog(data: {
    keyId: string
    cost: number
    tokens: number
    success: boolean
    errorType?: string
  }): Promise<void> {
    try {
      await supabase
        .from('api_key_usage_logs')
        .insert({
          api_key_id: data.keyId,
          cost: data.cost,
          tokens_used: data.tokens,
          success: data.success,
          error_type: data.errorType || null,
          timestamp: new Date().toISOString()
        })
    } catch (error) {
      console.error('Error recording usage log:', error)
      // Don't throw here as it's not critical
    }
  }

  /**
   * Get decrypted API key
   */
  getDecryptedKey(encryptedKey: string): string {
    try {
      return atob(encryptedKey)
    } catch (error) {
      console.error('Error decrypting API key:', error)
      return ''
    }
  }

  /**
   * Get usage statistics for a provider
   */
  async getProviderUsageStats(provider: string, userId: string): Promise<{
    totalKeys: number
    activeKeys: number
    totalMonthlyUsage: number
    totalMonthlyBudget: number
    utilizationRate: number
  }> {
    try {
      const { data: keys, error } = await supabase
        .from('user_api_keys')
        .select('*')
        .eq('provider', provider.toLowerCase())
        .eq('user_id', userId)

      if (error || !keys) {
        return {
          totalKeys: 0,
          activeKeys: 0,
          totalMonthlyUsage: 0,
          totalMonthlyBudget: 0,
          utilizationRate: 0
        }
      }

      const totalKeys = keys.length
      const activeKeys = keys.filter(key => key.active).length
      const totalMonthlyUsage = keys.reduce((sum, key) => sum + key.current_usage, 0)
      const totalMonthlyBudget = keys.reduce((sum, key) => sum + (key.monthly_budget || 0), 0)
      const utilizationRate = totalMonthlyBudget > 0 ? (totalMonthlyUsage / totalMonthlyBudget) * 100 : 0

      return {
        totalKeys,
        activeKeys,
        totalMonthlyUsage,
        totalMonthlyBudget,
        utilizationRate
      }
    } catch (error) {
      console.error('Error getting provider usage stats:', error)
      return {
        totalKeys: 0,
        activeKeys: 0,
        totalMonthlyUsage: 0,
        totalMonthlyBudget: 0,
        utilizationRate: 0
      }
    }
  }

  /**
   * Check if provider has any available keys
   */
  async hasAvailableKeys(provider: string, userId: string): Promise<boolean> {
    const key = await this.getNextAvailableKey(provider, userId)
    return key !== null
  }

  /**
   * Disable key when it hits limits
   */
  async disableKeyOnLimit(keyId: string, reason: string): Promise<void> {
    try {
      await supabase
        .from('user_api_keys')
        .update({
          active: false,
          disabled_reason: reason,
          disabled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', keyId)

      console.log(`Disabled key ${keyId} due to: ${reason}`)
    } catch (error) {
      console.error('Error disabling key:', error)
    }
  }
}

// Export singleton instance
export const providerKeyManager = new ProviderKeyManager()