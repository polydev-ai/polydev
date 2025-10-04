/**
 * Smart CLI Cache - Caches CLI status from Supabase with intelligent TTL
 */

import { SupabaseClient } from '@supabase/supabase-js'

interface CliConfig {
  provider_id: string
  available: boolean
  authenticated: boolean
  version?: string
  default_model?: string
  available_models?: string[]
  last_checked: string
}

interface CliStatusSummary {
  hasAnyCli: boolean
  availableProviders: string[]
  authenticatedProviders: string[]
  totalAvailable: number
  totalAuthenticated: number
}

export class SmartCliCache {
  private cache: Map<string, { data: CliConfig[]; timestamp: number }> = new Map()
  private readonly TTL = 2 * 60 * 1000 // 2 minutes cache

  constructor(private supabase: SupabaseClient) {}

  async getCliStatusWithCache(userId: string): Promise<CliConfig[]> {
    const cached = this.cache.get(userId)
    const now = Date.now()

    // Return cached data if valid
    if (cached && now - cached.timestamp < this.TTL) {
      return cached.data
    }

    // Fetch from Supabase
    const { data, error } = await this.supabase
      .from('cli_configs')
      .select('*')
      .eq('user_id', userId)

    if (error) {
      console.error('Failed to fetch CLI configs:', error)
      return cached?.data || []
    }

    const configs = (data || []) as CliConfig[]

    // Update cache
    this.cache.set(userId, { data: configs, timestamp: now })

    return configs
  }

  getClimiStatusSummary(configs: CliConfig[]): CliStatusSummary {
    const availableProviders = configs
      .filter(c => c.available)
      .map(c => c.provider_id)

    const authenticatedProviders = configs
      .filter(c => c.authenticated)
      .map(c => c.provider_id)

    return {
      hasAnyCli: availableProviders.length > 0,
      availableProviders,
      authenticatedProviders,
      totalAvailable: availableProviders.length,
      totalAuthenticated: authenticatedProviders.length
    }
  }

  clearCache(userId?: string) {
    if (userId) {
      this.cache.delete(userId)
    } else {
      this.cache.clear()
    }
  }
}
