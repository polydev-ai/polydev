// Retry Handler Implementation
// Handles automatic retries for failed requests with exponential backoff

export interface RetryConfig {
  maxRetries: number
  backoffMs: number
  retryableErrors: string[]
  maxBackoffMs?: number
  jitter?: boolean
}

export class RetryHandler {
  private config: RetryConfig
  
  constructor(config: RetryConfig) {
    this.config = {
      maxBackoffMs: 60000, // 1 minute max
      jitter: true,
      ...config
    }
  }
  
  async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error
    
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        // Don't retry on the last attempt
        if (attempt === this.config.maxRetries) {
          break
        }
        
        // Check if error is retryable
        if (!this.isRetryableError(lastError)) {
          throw lastError
        }
        
        // Calculate backoff delay
        const delay = this.calculateBackoff(attempt)
        console.warn(`Request failed (attempt ${attempt + 1}/${this.config.maxRetries + 1}), retrying in ${delay}ms:`, lastError.message)
        
        await this.sleep(delay)
      }
    }
    
    throw lastError!
  }
  
  private isRetryableError(error: Error): boolean {
    const errorMessage = error.message.toLowerCase()
    const errorName = error.name?.toLowerCase() || ''
    
    // Check against configured retryable errors
    for (const retryableError of this.config.retryableErrors) {
      if (errorMessage.includes(retryableError.toLowerCase()) || 
          errorName.includes(retryableError.toLowerCase())) {
        return true
      }
    }
    
    // Common retryable error patterns
    const retryablePatterns = [
      'timeout',
      'network error',
      'connection reset',
      'service unavailable',
      'internal server error',
      'bad gateway',
      'gateway timeout',
      'rate limit',
      'too many requests',
      'temporarily unavailable',
      'overloaded',
      'capacity',
      'quota exceeded',
      'fetch failed',
      'econnreset',
      'enotfound',
      'etimedout',
      'http 429',
      'http 500',
      'http 502',
      'http 503',
      'http 504'
    ]
    
    return retryablePatterns.some(pattern => 
      errorMessage.includes(pattern) || errorName.includes(pattern)
    )
  }
  
  private calculateBackoff(attempt: number): number {
    // Exponential backoff: delay = baseDelay * 2^attempt
    let delay = this.config.backoffMs * Math.pow(2, attempt)
    
    // Cap at maxBackoffMs
    if (this.config.maxBackoffMs) {
      delay = Math.min(delay, this.config.maxBackoffMs)
    }
    
    // Add jitter to prevent thundering herd
    if (this.config.jitter) {
      const jitterAmount = delay * 0.1 // 10% jitter
      delay += (Math.random() - 0.5) * 2 * jitterAmount
    }
    
    return Math.floor(Math.max(0, delay))
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
  
  // Static method for one-off retries
  static async retry<T>(
    operation: () => Promise<T>, 
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const defaultConfig: RetryConfig = {
      maxRetries: 3,
      backoffMs: 1000,
      retryableErrors: ['timeout', 'network', 'rate_limit']
    }
    
    const retryHandler = new RetryHandler({ ...defaultConfig, ...config })
    return retryHandler.executeWithRetry(operation)
  }
  
  // Get retry statistics
  getRetryStats(): {
    maxRetries: number
    baseBackoff: number
    maxBackoff: number
    retryableErrors: string[]
  } {
    return {
      maxRetries: this.config.maxRetries,
      baseBackoff: this.config.backoffMs,
      maxBackoff: this.config.maxBackoffMs || 60000,
      retryableErrors: this.config.retryableErrors
    }
  }
}

// Specialized retry handlers for different scenarios
export class NetworkRetryHandler extends RetryHandler {
  constructor(maxRetries: number = 3) {
    super({
      maxRetries,
      backoffMs: 1000,
      retryableErrors: [
        'network error',
        'timeout',
        'connection reset',
        'fetch failed',
        'econnreset',
        'enotfound',
        'etimedout'
      ]
    })
  }
}

export class RateLimitRetryHandler extends RetryHandler {
  constructor(maxRetries: number = 5) {
    super({
      maxRetries,
      backoffMs: 2000, // Longer initial backoff for rate limits
      retryableErrors: [
        'rate limit',
        'too many requests',
        'quota exceeded',
        'http 429'
      ],
      maxBackoffMs: 300000, // 5 minutes max for rate limits
    })
  }
}

export class ServerErrorRetryHandler extends RetryHandler {
  constructor(maxRetries: number = 3) {
    super({
      maxRetries,
      backoffMs: 1500,
      retryableErrors: [
        'internal server error',
        'bad gateway', 
        'service unavailable',
        'gateway timeout',
        'temporarily unavailable',
        'overloaded',
        'http 500',
        'http 502',
        'http 503',
        'http 504'
      ]
    })
  }
}
