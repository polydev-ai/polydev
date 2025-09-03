// Rate Limiter Implementation
// Manages API rate limits per provider to prevent exceeding quotas

export interface RateLimitConfig {
  requestsPerMinute: number
  tokensPerMinute?: number
  burstLimit?: number
}

export class RateLimiter {
  private requestTimestamps: number[] = []
  private tokenUsage: { timestamp: number; tokens: number }[] = []
  private config: RateLimitConfig
  
  constructor(config: RateLimitConfig) {
    this.config = config
  }
  
  async waitForCapacity(tokensNeeded: number = 1): Promise<void> {
    const now = Date.now()
    const oneMinuteAgo = now - 60000
    
    // Clean old entries
    this.requestTimestamps = this.requestTimestamps.filter(ts => ts > oneMinuteAgo)
    this.tokenUsage = this.tokenUsage.filter(usage => usage.timestamp > oneMinuteAgo)
    
    // Check request limit
    if (this.requestTimestamps.length >= this.config.requestsPerMinute) {
      const oldestRequest = Math.min(...this.requestTimestamps)
      const waitTime = 60000 - (now - oldestRequest) + 100 // Add 100ms buffer
      if (waitTime > 0) {
        await this.sleep(waitTime)
        return this.waitForCapacity(tokensNeeded)
      }
    }
    
    // Check token limit if configured
    if (this.config.tokensPerMinute) {
      const tokensUsed = this.tokenUsage.reduce((sum, usage) => sum + usage.tokens, 0)
      if (tokensUsed + tokensNeeded > this.config.tokensPerMinute) {
        const oldestTokenUsage = Math.min(...this.tokenUsage.map(u => u.timestamp))
        const waitTime = 60000 - (now - oldestTokenUsage) + 100
        if (waitTime > 0) {
          await this.sleep(waitTime)
          return this.waitForCapacity(tokensNeeded)
        }
      }
    }
    
    // Record this request
    this.requestTimestamps.push(now)
    if (tokensNeeded > 1) {
      this.tokenUsage.push({ timestamp: now, tokens: tokensNeeded })
    }
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
  
  getRemainingCapacity(): { requests: number; tokens?: number } {
    const now = Date.now()
    const oneMinuteAgo = now - 60000
    
    const recentRequests = this.requestTimestamps.filter(ts => ts > oneMinuteAgo).length
    const remainingRequests = Math.max(0, this.config.requestsPerMinute - recentRequests)
    
    let remainingTokens: number | undefined
    if (this.config.tokensPerMinute) {
      const recentTokens = this.tokenUsage
        .filter(usage => usage.timestamp > oneMinuteAgo)
        .reduce((sum, usage) => sum + usage.tokens, 0)
      remainingTokens = Math.max(0, this.config.tokensPerMinute - recentTokens)
    }
    
    return { requests: remainingRequests, tokens: remainingTokens }
  }
}
