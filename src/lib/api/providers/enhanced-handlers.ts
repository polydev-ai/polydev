// Enhanced Provider Handlers - Complete Cline Implementation
// Integrates all utilities: rate limiting, token counting, retry handling, response validation
// Provides comprehensive API integration matching Cline's exact functionality

import { ApiHandler, StreamChunk } from '../index'
import { ApiHandlerOptions, ModelInfo } from '../../../types/providers'
import { getTransformer } from '../transform'
import { RateLimiter, RateLimitConfig } from '../utils/rate-limiter'
import { TokenCounter, TokenCount } from '../utils/token-counter'
import { RetryHandler, NetworkRetryHandler, RateLimitRetryHandler, ServerErrorRetryHandler } from '../utils/retry-handler'
import { ResponseValidator, ValidationResult } from '../utils/response-validator'
import { universalProvider, PROVIDER_CONFIGS } from './complete-provider-system'

// Base enhanced handler with all utilities
export abstract class BaseEnhancedHandler implements ApiHandler {
  protected rateLimiter?: RateLimiter
  protected tokenCounter: TokenCounter
  protected retryHandler: RetryHandler
  protected responseValidator: ResponseValidator
  protected providerId: string
  protected baseUrl: string
  protected authType: 'api_key' | 'oauth' | 'cli' | 'none'
  
  constructor(providerId: string) {
    this.providerId = providerId
    this.tokenCounter = new TokenCounter()
    this.responseValidator = new ResponseValidator()
    
    // Initialize based on provider config
    const config = PROVIDER_CONFIGS[providerId]
    if (config) {
      this.baseUrl = config.baseUrl
      this.authType = config.authType
      
      if (config.rateLimits) {
        this.rateLimiter = new RateLimiter(config.rateLimits)
      }
      
      if (config.retryConfig) {
        this.retryHandler = new RetryHandler(config.retryConfig)
      } else {
        // Default retry handler based on provider type
        this.retryHandler = new NetworkRetryHandler(3)
      }
    } else {
      this.baseUrl = ''
      this.authType = 'api_key'
      this.retryHandler = new NetworkRetryHandler(3)
    }
  }
  
  protected createAbortController(timeoutMs: number = 30000): AbortController {
    // Ensure timeout is valid (not undefined, null, Infinity, or negative)
    if (!timeoutMs || timeoutMs === Infinity || timeoutMs < 1 || timeoutMs > 300000) {
      timeoutMs = 30000 // Default to 30 seconds
    }
    
    const controller = new AbortController()
    setTimeout(() => controller.abort(), timeoutMs)
    return controller
  }
  
  async createMessage(options: ApiHandlerOptions): Promise<Response> {
    // Pre-request validation
    this.validateOptions(options)
    
    // Apply rate limiting
    if (this.rateLimiter) {
      const estimatedTokens = this.tokenCounter.countTokens(options.messages || [], options.model)
      await this.rateLimiter.waitForCapacity(estimatedTokens)
    }
    
    // Execute with retry logic
    return this.retryHandler.executeWithRetry(async () => {
      const response = await this.makeRequest(options)
      
      // Validate response only if it's JSON
      if (response.ok) {
        const contentType = response.headers.get('content-type') || ''
        
        // Only parse as JSON if content-type indicates JSON
        if (contentType.includes('application/json')) {
          try {
            const responseData = await response.clone().json()
            const validation = this.responseValidator.validateResponse(responseData, this.providerId, options.model)
            
            if (!validation.isValid) {
              console.warn(`Response validation failed for ${this.providerId}:`, validation.errors)
              // Continue with response but log issues
            }
            
            if (validation.warnings.length > 0) {
              console.warn(`Response validation warnings for ${this.providerId}:`, validation.warnings)
            }
          } catch (parseError) {
            console.warn(`Failed to parse JSON response from ${this.providerId}:`, parseError)
            // Don't fail the entire request for parsing errors in validation
          }
        } else {
          console.debug(`Skipping JSON validation for ${this.providerId} - content-type: ${contentType}`)
        }
      }
      
      return response
    })
  }
  
  async streamMessage(options: ApiHandlerOptions): Promise<ReadableStream> {
    // Use universal provider for streaming with all enhancements
    return universalProvider.streamMessage(this.providerId, options)
  }
  
  protected abstract makeRequest(options: ApiHandlerOptions): Promise<Response>
  
  protected validateOptions(options: ApiHandlerOptions): void {
    if (!options.messages || options.messages.length === 0) {
      throw new Error('Messages are required')
    }
    
    if (!options.model) {
      throw new Error('Model is required')
    }
    
    if (this.authType === 'api_key' && !options.apiKey) {
      throw new Error(`API key is required for ${this.providerId}`)
    }
    
    if (this.authType === 'oauth' && !options.accessToken) {
      throw new Error(`Access token is required for ${this.providerId}`)
    }
  }
  
  protected prepareHeaders(options: ApiHandlerOptions): Record<string, string> {
    const config = PROVIDER_CONFIGS[this.providerId]
    if (!config) {
      return { 'Content-Type': 'application/json' }
    }
    
    const headers: Record<string, string> = {}
    
    Object.entries(config.headers).forEach(([key, value]) => {
      if (typeof value === 'function') {
        headers[key] = value(options)
      } else {
        headers[key] = value
      }
    })
    
    return headers
  }
  
  async validateApiKey?(apiKey: string): Promise<boolean> {
    try {
      const testOptions: ApiHandlerOptions = {
        apiKey,
        model: this.getTestModel(),
        messages: [{ role: 'user', content: 'test' }],
        maxTokens: 65536
      }
      
      const response = await this.createMessage(testOptions)
      return response.status !== 401
    } catch (error) {
      return false
    }
  }
  
  protected abstract getTestModel(): string
  
  async getModels?(): Promise<ModelInfo[]> {
    return universalProvider.getAvailableModels(this.providerId)
  }
  
  // Utility methods
  getTokenCount(options: ApiHandlerOptions): TokenCount {
    return this.tokenCounter.countTokensAdvanced(options.messages || [], options.model || '', this.providerId)
  }
  
  getRateLimitStatus(): { requests: number; tokens?: number } | null {
    return this.rateLimiter?.getRemainingCapacity() || null
  }
  
  getRetryStats(): any {
    return this.retryHandler.getRetryStats()
  }
}

// ANTHROPIC ENHANCED HANDLER
export class EnhancedAnthropicHandler extends BaseEnhancedHandler {
  constructor() {
    super('anthropic')
  }
  
  protected async makeRequest(options: ApiHandlerOptions): Promise<Response> {
    const transformer = getTransformer('anthropic')
    const requestBody = transformer.transformRequest(options)
    
    // Add Anthropic-specific features
    if (options.supportsPromptCache) {
      requestBody.prompt_caching = {
        eligible_cache_points: ['system', 'user']
      }
    }
    
    if (options.supportsComputerUse && options.model?.includes('3-5-sonnet')) {
      requestBody.tools = requestBody.tools || []
      requestBody.tools.push({
        name: 'computer',
        type: 'computer_20241022',
        display_width_px: 1024,
        display_height_px: 768,
        display_number: 1
      })
    }
    
    requestBody.stream = options.stream || false
    
    const headers = this.prepareHeaders(options)
    
    return fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    })
  }
  
  protected getTestModel(): string {
    return 'claude-3-5-haiku-20241022'
  }
}

// OPENAI ENHANCED HANDLER
export class EnhancedOpenAIHandler extends BaseEnhancedHandler {
  constructor() {
    super('openai')
  }
  
  protected async makeRequest(options: ApiHandlerOptions): Promise<Response> {
    const transformer = getTransformer('openai')
    const requestBody = transformer.transformRequest(options)
    
    // Handle o1 models special requirements
    if (options.model?.includes('o1')) {
      delete requestBody.temperature // o1 models don't support temperature
      requestBody.messages = requestBody.messages.filter((msg: any) => msg.role !== 'system')
    }
    
    // Add OpenAI-specific features
    if (options.enableJsonMode) {
      requestBody.response_format = { type: 'json_object' }
    }
    
    requestBody.stream = options.stream || false
    
    const headers = this.prepareHeaders(options)
    const baseUrl = options.openAiBaseUrl || this.baseUrl
    
    return fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    })
  }
  
  protected getTestModel(): string {
    return 'gpt-4o-mini'
  }
}

// GOOGLE ENHANCED HANDLER
export class EnhancedGoogleHandler extends BaseEnhancedHandler {
  constructor(providerId: string = 'gemini') {
    super(providerId)
  }
  
  protected async makeRequest(options: ApiHandlerOptions): Promise<Response> {
    const transformer = getTransformer('google')
    const requestBody = transformer.transformRequest(options)
    
    // Add Google-specific safety settings
    if (options.safetySettings) {
      requestBody.safetySettings = options.safetySettings
    } else {
      // Default safety settings
      requestBody.safetySettings = [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
      ]
    }
    
    const headers = this.prepareHeaders(options)
    const endpoint = options.stream
      ? `${this.baseUrl}/models/${options.model}:streamGenerateContent`
      : `${this.baseUrl}/models/${options.model}:generateContent`

    return fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    })
  }
  
  protected getTestModel(): string {
    return 'gemini-1.5-flash'
  }
}

// XAI ENHANCED HANDLER
export class EnhancedXAIHandler extends BaseEnhancedHandler {
  constructor() {
    super('xai')
  }
  
  protected async makeRequest(options: ApiHandlerOptions): Promise<Response> {
    const transformer = getTransformer('openai') // xAI uses OpenAI format
    const requestBody = transformer.transformRequest(options)
    
    // Add xAI-specific features
    if (options.enableRealTimeData) {
      requestBody.functions = requestBody.functions || []
      requestBody.functions.push({
        name: 'real_time_search',
        description: 'Get real-time information from the web',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' }
          },
          required: ['query']
        }
      })
    }
    
    requestBody.stream = options.stream || false
    
    const headers = this.prepareHeaders(options)
    
    return fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    })
  }
  
  protected getTestModel(): string {
    return 'grok-beta'
  }
}

// DEEPSEEK ENHANCED HANDLER
export class EnhancedDeepSeekHandler extends BaseEnhancedHandler {
  constructor() {
    super('deepseek')
  }
  
  protected async makeRequest(options: ApiHandlerOptions): Promise<Response> {
    const transformer = getTransformer('openai')
    const requestBody = transformer.transformRequest(options)
    
    // Add DeepSeek-specific features
    if (options.enableThinking && options.model?.includes('deepseek-v3')) {
      requestBody.thinking_enabled = true
      requestBody.thinking_mode = 'verbose'
    }
    
    requestBody.stream = options.stream || false
    
    const headers = this.prepareHeaders(options)
    
    return fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    })
  }
  
  protected getTestModel(): string {
    return 'deepseek-chat'
  }
}

// GROQ ENHANCED HANDLER  
export class EnhancedGroqHandler extends BaseEnhancedHandler {
  constructor() {
    super('groq')
    // Groq has strict rate limits
    this.rateLimiter = new RateLimiter({
      requestsPerMinute: 30,
      tokensPerMinute: 14400
    })
    // Use specialized rate limit retry handler
    this.retryHandler = new RateLimitRetryHandler(5)
  }
  
  protected async makeRequest(options: ApiHandlerOptions): Promise<Response> {
    const transformer = getTransformer('openai')
    const requestBody = transformer.transformRequest(options)
    
    requestBody.stream = options.stream || false
    
    const headers = this.prepareHeaders(options)
    
    return fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    })
  }
  
  protected getTestModel(): string {
    return 'llama-3.3-70b-versatile'
  }
}

// OLLAMA ENHANCED HANDLER (Local)
export class EnhancedOllamaHandler extends BaseEnhancedHandler {
  constructor() {
    super('ollama')
    // No rate limiting for local models
    this.rateLimiter = undefined
    // Use network retry handler for connection issues
    this.retryHandler = new NetworkRetryHandler(2)
  }
  
  protected async makeRequest(options: ApiHandlerOptions): Promise<Response> {
    const requestBody = {
      model: options.model,
      messages: options.messages,
      stream: options.stream || false,
      options: {
        temperature: options.temperature,
        num_predict: options.maxTokens
      }
    }
    
    const headers = this.prepareHeaders(options)
    
    return fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    })
  }
  
  protected getTestModel(): string {
    return 'llama3.2'
  }
  
  async validateApiKey?(apiKey: string): Promise<boolean> {
    // Ollama doesn't use API keys
    try {
      const response = await fetch(`${this.baseUrl}/api/version`)
      return response.ok
    } catch (error) {
      return false
    }
  }
}

// CLI-based handlers
export class EnhancedClaudeCodeHandler extends BaseEnhancedHandler {
  constructor() {
    super('claude-code')
    this.rateLimiter = undefined // No rate limiting for CLI
  }
  
  protected async makeRequest(options: ApiHandlerOptions): Promise<Response> {
    // Use system Claude CLI
    const { spawn } = require('child_process')
    
    return new Promise((resolve, reject) => {
      const args = ['chat']
      if (options.model) {
        args.push('--model', options.model)
      }
      if (options.maxTokens) {
        args.push('--max-tokens', options.maxTokens.toString())
      }
      
      const process = spawn('claude', args, {
        stdio: ['pipe', 'pipe', 'pipe']
      })
      
      let output = ''
      let error = ''
      
      process.stdout.on('data', (data: Buffer) => {
        output += data.toString()
      })
      
      process.stderr.on('data', (data: Buffer) => {
        error += data.toString()
      })
      
      process.on('close', (code: number) => {
        if (code === 0) {
          resolve(new Response(JSON.stringify({
            content: [{ text: output.trim() }],
            model: options.model || 'claude-3-5-sonnet-20241022',
            usage: {
              input_tokens: this.tokenCounter.countTokens(options.messages || []),
              output_tokens: this.tokenCounter.estimateCompletionTokens(output)
            }
          })))
        } else {
          reject(new Error(`Claude CLI failed: ${error}`))
        }
      })
      
      // Send messages to CLI
      const prompt = options.messages?.map(m => `${m.role}: ${m.content}`).join('\n') || ''
      process.stdin.write(prompt)
      process.stdin.end()
    })
  }
  
  protected getTestModel(): string {
    return 'claude-3-5-sonnet-20241022'
  }
  
  async validateApiKey?(apiKey: string): Promise<boolean> {
    // Check if Claude CLI is installed and authenticated
    try {
      const { spawn } = require('child_process')
      const process = spawn('claude', ['auth', 'status'])
      
      return new Promise((resolve) => {
        process.on('close', (code: number) => {
          resolve(code === 0)
        })
      })
    } catch (error) {
      return false
    }
  }
}

// OPENROUTER ENHANCED HANDLER
export class EnhancedOpenRouterHandler extends BaseEnhancedHandler {
  constructor() {
    super('openrouter')
  }
  
  protected async makeRequest(options: ApiHandlerOptions): Promise<Response> {
    const transformer = getTransformer('openai') // OpenRouter uses OpenAI format
    const requestBody = transformer.transformRequest(options)
    
    // OpenRouter-specific headers and features
    requestBody.stream = options.stream || false
    
    const headers = this.prepareHeaders(options)
    
    // Add OpenRouter-specific headers
    if (options.metadata?.applicationName) {
      headers['HTTP-Referer'] = options.metadata.applicationName
    }
    if (options.metadata?.siteUrl) {
      headers['X-Title'] = options.metadata.siteUrl
    }
    
    // Base URL from provider config already includes /api/v1
    return fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    })
  }
  
  protected getTestModel(): string {
    return 'openai/gpt-3.5-turbo'
  }
  
  async validateApiKey?(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      })
      return response.ok
    } catch (error) {
      return false
    }
  }
  
  async getModels?(): Promise<ModelInfo[]> {
    // Use universal provider for comprehensive model list
    return universalProvider.getAvailableModels('openrouter')
  }
}

// Handler factory
export class EnhancedHandlerFactory {
  private static handlers: Map<string, BaseEnhancedHandler> = new Map()
  
  static getHandler(providerId: string): BaseEnhancedHandler {
    if (!this.handlers.has(providerId)) {
      const handler = this.createHandler(providerId)
      this.handlers.set(providerId, handler)
    }
    
    return this.handlers.get(providerId)!
  }
  
  public static createHandler(providerId: string): BaseEnhancedHandler {
    switch (providerId) {
      case 'anthropic':
        return new EnhancedAnthropicHandler()
      case 'openai':
      case 'openai-native':
        return new EnhancedOpenAIHandler()
      case 'gemini':
        return new EnhancedGoogleHandler('gemini')
      case 'google':
        return new EnhancedGoogleHandler('google')
      case 'xai':
        return new EnhancedXAIHandler()
      case 'deepseek':
        return new EnhancedDeepSeekHandler()
      case 'groq':
        return new EnhancedGroqHandler()
      case 'ollama':
        return new EnhancedOllamaHandler()
      case 'claude-code':
        return new EnhancedClaudeCodeHandler()
      case 'openrouter':
        return new EnhancedOpenRouterHandler()
      default:
        throw new Error(`No enhanced handler available for provider: ${providerId}`)
    }
  }
  
  static getSupportedProviders(): string[] {
    return [
      'anthropic', 'openai', 'openai-native', 'gemini', 'google', 'xai', 
      'deepseek', 'groq', 'ollama', 'claude-code', 'openrouter'
    ]
  }
}
