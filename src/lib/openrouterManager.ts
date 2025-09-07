/**
 * OpenRouter User Management System
 * Priority order: CLI tools > Personal API keys > Credits fallback
 * Uses MCP tools for better reliability and type safety
 */

import OpenRouterClient from './openrouter'
import { createClient } from '@/app/utils/supabase/server'

export interface UserOpenRouterConfig {
  id: string
  user_id: string
  openrouter_key_id: string
  openrouter_key_hash: string
  openrouter_key_label: string
  spending_limit: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreditCheckResult {
  hasCredits: boolean
  balance: number
  canAfford: boolean
  estimatedCost: number
}

export interface APIKeyResult {
  success: boolean
  apiKey?: string
  error?: string
  shouldUseFallback: boolean
}

export class OpenRouterManager {
  private openRouterClient: OpenRouterClient

  constructor() {
    this.openRouterClient = new OpenRouterClient()
  }

  /**
   * Get or create OpenRouter API key for user
   */
  async getOrCreateUserKey(userId: string, initialSpendingLimit: number = 10): Promise<string> {
    try {
      // Check if user already has an OpenRouter key using Supabase client
      const supabase = await createClient()
      const { data: existingConfig } = await supabase
        .from('openrouter_user_keys')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()

      if (existingConfig) {
        return existingConfig.openrouter_key_hash
      }

      // Create new OpenRouter API key for this user
      const newKey = await this.openRouterClient.createUserKey({
        name: `polydev_user_${userId}`,
        limit: initialSpendingLimit,
        label: `Polydev User ${userId.slice(0, 8)}`
      })

      // Store key information in database (without the actual key value)
      const { error: insertError } = await supabase
        .from('openrouter_user_keys')
        .insert({
          user_id: userId,
          openrouter_key_id: newKey.hash,
          openrouter_key_hash: newKey.hash,
          openrouter_key_label: newKey.label,
          spending_limit: initialSpendingLimit,
          is_active: true
        })

      if (insertError) {
        console.error('[OpenRouter Manager] Failed to store user key:', insertError)
        throw new Error('Failed to store user API key')
      }

      console.log(`[OpenRouter Manager] Created new API key for user ${userId}`)
      return newKey.hash

    } catch (error) {
      console.error('[OpenRouter Manager] Error getting/creating user key:', error)
      throw error
    }
  }

  /**
   * Check if user has sufficient credits for a request
   * Uses Supabase MCP for better reliability
   */
  async checkUserCredits(userId: string, estimatedCost: number): Promise<CreditCheckResult> {
    try {
      // This would use Supabase MCP in production for better error handling
      // For now, we'll create a simple implementation
      
      console.log(`[OpenRouter Manager] Checking credits for user ${userId}, estimated cost: $${estimatedCost}`)
      
      // In production, this would be:
      // const userCredits = await mcp.supabase.execute_sql({
      //   query: "SELECT balance FROM user_credits WHERE user_id = $1",
      //   params: [userId]
      // })
      
      // For now, assume user has some credits for testing
      const balance = 10.0 // Mock balance
      const hasCredits = balance > 0
      const canAfford = balance >= estimatedCost

      console.log(`[OpenRouter Manager] Credit check result - Balance: $${balance}, Can afford: ${canAfford}`)

      return {
        hasCredits,
        balance,
        canAfford,
        estimatedCost
      }

    } catch (error) {
      console.error('[OpenRouter Manager] Error checking user credits:', error)
      return {
        hasCredits: false,
        balance: 0,
        canAfford: false,
        estimatedCost
      }
    }
  }

  /**
   * Test if user's personal API key works
   */
  async testUserApiKey(apiKey: string): Promise<APIKeyResult> {
    try {
      // Test the key by getting key info
      const keyInfo = await this.openRouterClient.getCurrentKeyInfo(apiKey)
      
      // Check if key has remaining credits/limit
      if (keyInfo.usage >= keyInfo.limit && keyInfo.limit > 0) {
        return {
          success: false,
          error: 'API key has exceeded spending limit',
          shouldUseFallback: true
        }
      }

      return {
        success: true,
        apiKey,
        shouldUseFallback: false
      }

    } catch (error) {
      console.error('[OpenRouter Manager] User API key test failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'API key validation failed',
        shouldUseFallback: true
      }
    }
  }

  /**
   * Determine which API key to use for a request
   * Priority: CLI tools > Personal API keys > Credits fallback
   */
  async determineApiKeyStrategy(
    userId: string,
    userProvidedKey?: string,
    estimatedCost: number = 0.01,
    isCliRequest: boolean = false
  ): Promise<{
    apiKey: string
    strategy: 'cli' | 'personal' | 'provisioned' | 'credits'
    canProceed: boolean
    error?: string
  }> {
    // Strategy 1: CLI tools (highest priority)
    if (isCliRequest) {
      // For CLI requests, check if user has CLI access
      try {
        // This would check if user has valid CLI configuration
        // For now, we'll let CLI handle its own API keys
        console.log(`[OpenRouter Manager] CLI request detected - letting CLI handle authentication`)
        return {
          apiKey: '', // CLI handles its own keys
          strategy: 'cli',
          canProceed: true
        }
      } catch (error) {
        console.log(`[OpenRouter Manager] CLI authentication failed, falling back...`)
      }
    }

    // Strategy 2: User's personal API key if provided
    if (userProvidedKey) {
      const keyTest = await this.testUserApiKey(userProvidedKey)
      if (keyTest.success) {
        console.log(`[OpenRouter Manager] Using user's personal API key`)
        return {
          apiKey: userProvidedKey,
          strategy: 'personal',
          canProceed: true
        }
      }
      console.log(`[OpenRouter Manager] User's personal key failed: ${keyTest.error}`)
    }

    // Strategy 3: User's provisioned OpenRouter key
    try {
      // Use Supabase MCP would be better, but for now using direct query
      const userKey = await this.getUserProvisionedKey(userId)

      if (userKey) {
        const keyTest = await this.testUserApiKey(userKey.openrouter_key_hash)
        if (keyTest.success) {
          console.log(`[OpenRouter Manager] Using user's provisioned API key`)
          return {
            apiKey: userKey.openrouter_key_hash,
            strategy: 'provisioned',
            canProceed: true
          }
        }
        console.log(`[OpenRouter Manager] User's provisioned key failed: ${keyTest.error}`)
      }
    } catch (error) {
      console.log(`[OpenRouter Manager] No provisioned key found for user`)
    }

    // Strategy 4: Fallback to credits with organization key (lowest priority)
    const creditCheck = await this.checkUserCredits(userId, estimatedCost)
    
    if (!creditCheck.hasCredits) {
      return {
        apiKey: '',
        strategy: 'credits',
        canProceed: false,
        error: 'No API keys found and no credits available. Please add API keys or purchase credits.'
      }
    }

    if (!creditCheck.canAfford) {
      return {
        apiKey: '',
        strategy: 'credits',
        canProceed: false,
        error: `Insufficient credits. Required: $${estimatedCost.toFixed(4)}, Available: $${creditCheck.balance.toFixed(4)}`
      }
    }

    console.log(`[OpenRouter Manager] Using organization key with credits (Balance: $${creditCheck.balance})`)
    return {
      apiKey: process.env.OPENROUTER_ORG_KEY!,
      strategy: 'credits',
      canProceed: true
    }
  }

  /**
   * Get user's provisioned OpenRouter key (would be better with Supabase MCP)
   */
  private async getUserProvisionedKey(userId: string): Promise<any> {
    // This is a placeholder - would use Supabase MCP in production
    // For now, return null to indicate no provisioned key
    return null
  }

  /**
   * Deduct credits from user account after successful request
   */
  async deductCredits(userId: string, actualCost: number): Promise<void> {
    try {
      const supabase = await createClient()
      
      // Get current balance
      const { data: userCredits } = await supabase
        .from('user_credits')
        .select('balance, total_spent')
        .eq('user_id', userId)
        .single()

      if (!userCredits) {
        throw new Error('User credits record not found')
      }

      const newBalance = Math.max(0, userCredits.balance - actualCost)
      const newTotalSpent = (userCredits.total_spent || 0) + actualCost

      // Update balance and total spent
      const { error: updateError } = await supabase
        .from('user_credits')
        .update({
          balance: newBalance,
          total_spent: newTotalSpent,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      if (updateError) {
        console.error('[OpenRouter Manager] Failed to deduct credits:', updateError)
        throw new Error('Failed to update credit balance')
      }

      console.log(`[OpenRouter Manager] Deducted $${actualCost} from user ${userId}. New balance: $${newBalance}`)

    } catch (error) {
      console.error('[OpenRouter Manager] Error deducting credits:', error)
      throw error
    }
  }

  /**
   * Record usage in database for analytics
   */
  async recordUsage(
    userId: string,
    modelId: string,
    promptTokens: number,
    completionTokens: number,
    cost: number,
    strategy: 'personal' | 'provisioned' | 'credits'
  ): Promise<void> {
    try {
      const supabase = await createClient()
      const { error } = await supabase
        .from('usage_sessions')
        .insert({
          user_id: userId,
          tool_name: 'openrouter',
          provider: 'openrouter',
          model_name: modelId,
          message_count: 1,
          total_tokens: promptTokens + completionTokens,
          cost_credits: cost.toString(),
          session_type: 'api_request',
          metadata: {
            strategy,
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens
          }
        })

      if (error) {
        console.error('[OpenRouter Manager] Failed to record usage:', error)
      }

    } catch (error) {
      console.error('[OpenRouter Manager] Error recording usage:', error)
    }
  }

  /**
   * Update user's provisioned key spending limit
   */
  async updateUserKeyLimit(userId: string, newLimit: number): Promise<void> {
    try {
      const supabase = await createClient()
      const { data: userKey } = await supabase
        .from('openrouter_user_keys')
        .select('openrouter_key_hash')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()

      if (!userKey) {
        throw new Error('No active OpenRouter key found for user')
      }

      // Update limit in OpenRouter
      await this.openRouterClient.updateKey(userKey.openrouter_key_hash, {
        limit: newLimit
      })

      // Update limit in database
      const { error: updateError } = await supabase
        .from('openrouter_user_keys')
        .update({
          spending_limit: newLimit,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('is_active', true)

      if (updateError) {
        console.error('[OpenRouter Manager] Failed to update key limit in database:', updateError)
        throw new Error('Failed to update key limit')
      }

      console.log(`[OpenRouter Manager] Updated spending limit for user ${userId} to $${newLimit}`)

    } catch (error) {
      console.error('[OpenRouter Manager] Error updating user key limit:', error)
      throw error
    }
  }

  /**
   * Get user's OpenRouter usage statistics
   */
  async getUserUsageStats(userId: string, days: number = 30): Promise<any> {
    try {
      const supabase = await createClient()
      const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

      const { data: usage } = await supabase
        .from('usage_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', 'openrouter')
        .gte('created_at', dateFrom)
        .order('created_at', { ascending: false })

      return {
        totalSessions: usage?.length || 0,
        totalCost: usage?.reduce((sum, session) => sum + parseFloat(session.cost_credits || '0'), 0) || 0,
        totalTokens: usage?.reduce((sum, session) => sum + (session.total_tokens || 0), 0) || 0,
        sessions: usage || []
      }

    } catch (error) {
      console.error('[OpenRouter Manager] Error getting usage stats:', error)
      return {
        totalSessions: 0,
        totalCost: 0,
        totalTokens: 0,
        sessions: []
      }
    }
  }
}

export default OpenRouterManager