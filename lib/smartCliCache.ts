/**
 * Smart Cache for CLI Status Management
 * Provides intelligent caching based on CLI reliability and status
 */

export class SmartCliCache {
  private supabase: any;

  constructor(supabase: any) {
    this.supabase = supabase;
  }

  /**
   * Get smart timeout based on CLI configuration
   * Returns timeout in minutes
   */
  getSmartTimeout(cliConfig: any): number {
    if (!cliConfig.available) {
      return 2; // 2 minutes - check frequently for new installs
    }
    
    if (!cliConfig.authenticated) {
      return 3; // 3 minutes - check for authentication
    }
    
    if (cliConfig.model_detection_method === 'fallback') {
      return 5; // 5 minutes - retry interactive detection
    }
    
    return 10; // 10 minutes - stable, working CLI
  }

  /**
   * Check if CLI configuration is stale
   */
  isStale(cliConfig: any): boolean {
    if (!cliConfig.last_checked_at) return true;
    
    const now = new Date();
    const lastChecked = new Date(cliConfig.last_checked_at);
    const minutesOld = (now.getTime() - lastChecked.getTime()) / (1000 * 60);
    const timeout = this.getSmartTimeout(cliConfig);
    
    return minutesOld > timeout;
  }

  /**
   * Get CLI status with smart caching
   * Checks if data is stale and triggers refresh if needed
   */
  async getCliStatusWithCache(userId: string): Promise<any[]> {
    // 1. Get current CLI configurations from database
    const { data: cliConfigs, error } = await this.supabase
      .from('cli_provider_configurations')
      .select('*')
      .eq('user_id', userId);

    if (error || !cliConfigs) {
      console.error('[Smart Cache] Failed to get CLI configs:', error);
      return [];
    }

    if (cliConfigs.length === 0) {
      return [];
    }

    // 2. Check which configurations are stale
    const staleConfigs = cliConfigs.filter((config: any) => this.isStale(config));

    // 3. If any are stale, trigger refresh (async, don't wait)
    if (staleConfigs.length > 0) {
      console.log(`[Smart Cache] ${staleConfigs.length} CLI configs are stale, triggering refresh for user ${userId}`);
      this.refreshStaleConfigs(userId, staleConfigs).catch((error: any) => {
        console.error('[Smart Cache] Refresh failed:', error);
      });
    }

    // 4. Return current data (will be fresh after refresh)
    return cliConfigs;
  }

  /**
   * Refresh stale CLI configurations (called asynchronously)
   */
  private async refreshStaleConfigs(userId: string, staleConfigs: any[]): Promise<void> {
    console.log(`[Smart Cache] Starting refresh for ${staleConfigs.length} stale CLI configs`);
    
    try {
      // Trigger forced CLI detection via stdio-wrapper
      for (const config of staleConfigs) {
        await this.updateCliStatus(userId, config.provider);
      }
      
      console.log('[Smart Cache] Successfully triggered refresh for stale CLI configs');
    } catch (error) {
      console.error('[Smart Cache] Failed to trigger refresh:', error);
    }
  }

  /**
   * Update CLI status for a specific provider
   */
  private async updateCliStatus(userId: string, provider: string): Promise<void> {
    try {
      const response = await fetch('/api/cli-status/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getUserToken()}`
        },
        body: JSON.stringify({
          user_id: userId,
          provider: provider
        })
      });

      if (!response.ok) {
        console.error(`[Smart Cache] Failed to refresh ${provider}:`, response.status);
      }
    } catch (error) {
      console.error(`[Smart Cache] Network error refreshing ${provider}:`, error);
    }
  }

  /**
   * Get current user token (helper method)
   */
  private getUserToken(): string {
    // Try to get from environment or context
    return process.env.POLYDEV_USER_TOKEN || '';
  }

  /**
   * Format last checked time for display
   */
  formatLastCheckedTime(lastChecked: string): string {
    if (!lastChecked) return 'Unknown';
    
    const lastCheckedDate = new Date(lastChecked);
    const now = new Date();
    const minutes = Math.floor((now.getTime() - lastCheckedDate.getTime()) / (1000 * 60));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)} hours ago`;
    return `${Math.floor(minutes / 1440)} days ago`;
  }

  /**
   * Check if CLI should use local tools based on database status
   */
  shouldUseLocalCli(model: string, cliConfigs: any[]): boolean {
    // Find CLI that supports this model
    const cliMatch = cliConfigs.find((cli: any) => 
      cli.status === 'available' && 
      cli.authenticated &&
      (cli.available_models?.includes(model) || cli.default_model === model)
    );
    
    return !!cliMatch;
  }

  /**
   * Get summary statistics for dashboard
   */
  getClimiStatusSummary(cliConfigs: any[]): {
    total: number;
    available: number;
    authenticated: number;
    stale: number;
  } {
    const now = new Date();
    let staleCount = 0;
    
    // Count stale configs
    cliConfigs.forEach(config => {
      if (this.isStale(config)) {
        staleCount++;
      }
    });
    
    return {
      total: cliConfigs.length,
      available: cliConfigs.filter(cli => cli.status === 'available').length,
      authenticated: cliConfigs.filter(cli => cli.authenticated).length,
      stale: staleCount
    };
  }
}
