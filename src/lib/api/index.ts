import { ApiHandlerOptions, ModelInfo, ProviderConfiguration } from '../../types/providers'
// Enhanced handlers with integrated utilities (rate limiting, token counting, retry logic, validation)
import { EnhancedHandlerFactory, BaseEnhancedHandler } from './providers/enhanced-handlers'
import { universalProvider, PROVIDER_CONFIGS } from './providers/complete-provider-system'
import { TokenCounter, TokenCount } from './utils/token-counter'
import { RateLimiter, RateLimitConfig } from './utils/rate-limiter'
import { RetryHandler } from './utils/retry-handler'
import { ResponseValidator, ValidationResult } from './utils/response-validator'
// Legacy handlers for backward compatibility (fallback only)
import { AnthropicHandler } from './providers/anthropic'
import { OpenAIHandler } from './providers/openai'
import { GoogleHandler } from './providers/google'
import { VertexHandler } from './providers/vertex'
import { BedrockHandler } from './providers/bedrock'
import { AzureHandler } from './providers/azure'
import { OpenRouterHandler } from './providers/openrouter'
import { DeepSeekHandler } from './providers/deepseek'
import { OllamaHandler } from './providers/ollama'
import { LMStudioHandler } from './providers/lmstudio'
import { XAIHandler } from './providers/xai'
import { GroqHandler } from './providers/groq'
import { CodexCLIHandler } from './providers/codex-cli'
import { ClaudeCodeHandler } from './providers/claude-code'
import { GitHubCopilotHandler } from './providers/github-copilot'
import { GeminiCLIHandler } from './providers/gemini-cli'

export interface ApiHandler {
  createMessage(options: ApiHandlerOptions): Promise<Response>
  streamMessage(options: ApiHandlerOptions): Promise<ReadableStream>
  validateApiKey?(apiKey: string): Promise<boolean>
  getModels?(): Promise<ModelInfo[]>
  // Enhanced utility methods from comprehensive system
  getTokenCount?(options: ApiHandlerOptions): TokenCount
  getRateLimitStatus?(): { requests: number; tokens?: number } | null
  getRetryStats?(): any
}

export interface StreamChunk {
  type: 'content' | 'tool_use' | 'error' | 'done'
  content?: string
  toolUse?: {
    id: string
    name: string
    input: any
  }
  error?: string
  usage?: {
    inputTokens: number
    outputTokens: number
  }
}

// Enhanced provider handler registry - prioritizes comprehensive implementations
const getEnhancedHandler = (providerId: string): ApiHandler => {
  const supportedEnhanced = EnhancedHandlerFactory.getSupportedProviders()
  
  if (supportedEnhanced.includes(providerId)) {
    return EnhancedHandlerFactory.getHandler(providerId)
  }
  
  // Fallback to legacy handlers for providers not yet in enhanced system
  const legacyHandlers: Record<string, ApiHandler> = {
    vertex: new VertexHandler(),
    bedrock: new BedrockHandler(),
    azure: new AzureHandler(),
    openrouter: new OpenRouterHandler(),
    lmstudio: new LMStudioHandler(),
    'codex-cli': new CodexCLIHandler(),
    'claude-code': new ClaudeCodeHandler(),
    'github-copilot': new GitHubCopilotHandler(),
    'gemini-cli': new GeminiCLIHandler(),
  }
  
  return legacyHandlers[providerId]
}

// Complete provider registry combining enhanced and legacy handlers
const getAllSupportedProviders = (): string[] => {
  const enhanced = EnhancedHandlerFactory.getSupportedProviders()
  const legacy = ['vertex', 'bedrock', 'azure', 'openrouter', 'lmstudio', 'codex-cli', 'claude-code', 'github-copilot', 'gemini-cli']
  return [...enhanced, ...legacy]
}

export class ApiManager {
  private static instance: ApiManager
  private tokenCounter: TokenCounter
  private responseValidator: ResponseValidator
  
  private constructor() {
    this.tokenCounter = new TokenCounter()
    this.responseValidator = new ResponseValidator()
  }
  
  static getInstance(): ApiManager {
    if (!ApiManager.instance) {
      ApiManager.instance = new ApiManager()
    }
    return ApiManager.instance
  }
  
  getHandler(providerId: string): ApiHandler {
    const handler = getEnhancedHandler(providerId)
    if (!handler) {
      throw new Error(`No handler found for provider: ${providerId}`)
    }
    return handler
  }
  
  async createMessage(providerId: string, options: ApiHandlerOptions): Promise<Response> {
    const handler = this.getHandler(providerId)
    return handler.createMessage(options)
  }
  
  async streamMessage(providerId: string, options: ApiHandlerOptions): Promise<ReadableStream> {
    const handler = this.getHandler(providerId)
    return handler.streamMessage(options)
  }
  
  async validateApiKey(providerId: string, apiKey: string): Promise<boolean> {
    const handler = this.getHandler(providerId)
    if (handler.validateApiKey) {
      return handler.validateApiKey(apiKey)
    }
    return true // For providers that don't need validation
  }
  
  async getModels(providerId: string): Promise<ModelInfo[]> {
    const handler = this.getHandler(providerId)
    if (handler.getModels) {
      return handler.getModels()
    }
    
    // Fallback to universal provider for comprehensive model lists
    try {
      return await universalProvider.getAvailableModels(providerId)
    } catch (error) {
      console.warn(`Failed to get models for ${providerId}:`, error)
      return []
    }
  }
  
  getSupportedProviders(): string[] {
    return getAllSupportedProviders()
  }
  
  // Enhanced utility methods leveraging comprehensive system
  getProviderConfiguration(providerId: string): any {
    return PROVIDER_CONFIGS[providerId] || null
  }
  
  getAllProviderConfigurations(): Record<string, any> {
    return PROVIDER_CONFIGS
  }
  
  getTokenCount(providerId: string, options: ApiHandlerOptions): TokenCount {
    const handler = this.getHandler(providerId)
    if (handler.getTokenCount) {
      return handler.getTokenCount(options)
    }
    
    // Fallback to direct token counter
    return this.tokenCounter.countTokensAdvanced(
      options.messages || [], 
      options.model || '', 
      providerId
    )
  }
  
  getRateLimitStatus(providerId: string): { requests: number; tokens?: number } | null {
    const handler = this.getHandler(providerId)
    if (handler.getRateLimitStatus) {
      return handler.getRateLimitStatus()
    }
    return null
  }
  
  getRetryStats(providerId: string): any {
    const handler = this.getHandler(providerId)
    if (handler.getRetryStats) {
      return handler.getRetryStats()
    }
    return null
  }
  
  validateResponse(response: any, providerId: string, expectedModel?: string): ValidationResult {
    return this.responseValidator.validateResponse(response, providerId, expectedModel)
  }
  
  // Universal provider methods for comprehensive functionality
  async universalCreateMessage(providerId: string, options: ApiHandlerOptions): Promise<any> {
    return universalProvider.createMessage(providerId, options)
  }
  
  async universalStreamMessage(providerId: string, options: ApiHandlerOptions): Promise<ReadableStream> {
    return universalProvider.streamMessage(providerId, options)
  }
  
  // Provider capability checks
  supportsStreaming(providerId: string): boolean {
    const config = PROVIDER_CONFIGS[providerId]
    return config ? config.capabilities.streaming : false
  }
  
  supportsFunctionCalling(providerId: string): boolean {
    const config = PROVIDER_CONFIGS[providerId]
    return config ? config.capabilities.functionCalling : false
  }
  
  supportsVision(providerId: string): boolean {
    const config = PROVIDER_CONFIGS[providerId]
    return config ? config.capabilities.vision : false
  }
  
  // Statistics and monitoring
  getProviderStats(): Record<string, any> {
    const stats: Record<string, any> = {}
    const providers = this.getSupportedProviders()
    
    providers.forEach(providerId => {
      stats[providerId] = {
        rateLimitStatus: this.getRateLimitStatus(providerId),
        retryStats: this.getRetryStats(providerId),
        capabilities: {
          streaming: this.supportsStreaming(providerId),
          functionCalling: this.supportsFunctionCalling(providerId),
          vision: this.supportsVision(providerId)
        }
      }
    })
    
    return stats
  }
}

export const apiManager = ApiManager.getInstance()