import { ApiHandlerOptions, ModelInfo, ProviderConfiguration, ApiProvider } from '../../types/providers'
// Enhanced handlers with integrated utilities (rate limiting, token counting, retry logic, validation)
import { EnhancedHandlerFactory, BaseEnhancedHandler } from './providers/enhanced-handlers'
import { universalProvider, PROVIDER_CONFIGS } from './providers/complete-provider-system'
import { modelsDevService } from '../models-dev-integration'
import { TokenCounter, TokenCount } from './utils/token-counter'
import { RateLimiter, RateLimitConfig } from './utils/rate-limiter'
import { RetryHandler } from './utils/retry-handler'
import { ResponseValidator, ValidationResult } from './utils/response-validator'
// All providers now handled through models.dev integration

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

// Enhanced provider handler registry using models.dev comprehensive system
const getEnhancedHandler = (providerId: string): ApiHandler | null => {
  const supportedEnhanced = EnhancedHandlerFactory.getSupportedProviders()
  
  if (supportedEnhanced.includes(providerId)) {
    return EnhancedHandlerFactory.getHandler(providerId)
  }
  
  // For now, only return handlers for enhanced providers since legacy is removed
  // TODO: Implement universal provider handlers for all other providers via models.dev
  return null
}

// Complete provider registry using models.dev comprehensive system
const getAllSupportedProviders = (): string[] => {
  // Only return enhanced providers for now since legacy is removed
  // TODO: Add universal provider support once implemented
  return EnhancedHandlerFactory.getSupportedProviders()
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
      throw new Error(`Provider '${providerId}' not supported. Supported providers: ${EnhancedHandlerFactory.getSupportedProviders().join(', ')}`)
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
  
  // Enhanced utility methods leveraging models.dev integration
  async getProviderConfiguration(providerId: string): Promise<any> {
    return await modelsDevService.getLegacyProviderConfig(providerId)
  }
  
  async getAllProviderConfigurations(): Promise<Record<string, any>> {
    const providers = await modelsDevService.getProviders()
    const configs: Record<string, any> = {}
    
    for (const provider of providers) {
      const config = await modelsDevService.getLegacyProviderConfig(provider.id)
      if (config) {
        configs[provider.id] = config
      }
    }
    
    return configs
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
  
  // Provider capability checks using models.dev data
  async supportsStreaming(providerId: string): Promise<boolean> {
    try {
      const providers = await modelsDevService.getProviders()
      const provider = providers.find(p => p.id === providerId)
      return provider ? provider.supports_streaming : false
    } catch (error) {
      console.warn(`Failed to check streaming support for ${providerId}:`, error)
      return false
    }
  }
  
  async supportsFunctionCalling(providerId: string): Promise<boolean> {
    try {
      const providers = await modelsDevService.getProviders()
      const provider = providers.find(p => p.id === providerId)
      return provider ? provider.supports_tools : false
    } catch (error) {
      console.warn(`Failed to check function calling support for ${providerId}:`, error)
      return false
    }
  }
  
  async supportsVision(providerId: string): Promise<boolean> {
    try {
      const providers = await modelsDevService.getProviders()
      const provider = providers.find(p => p.id === providerId)
      return provider ? provider.supports_images : false
    } catch (error) {
      console.warn(`Failed to check vision support for ${providerId}:`, error)
      return false
    }
  }
  
  // Statistics and monitoring using models.dev data
  async getProviderStats(): Promise<Record<string, any>> {
    const stats: Record<string, any> = {}
    const providers = this.getSupportedProviders()
    
    for (const providerId of providers) {
      stats[providerId] = {
        rateLimitStatus: this.getRateLimitStatus(providerId),
        retryStats: this.getRetryStats(providerId),
        capabilities: {
          streaming: await this.supportsStreaming(providerId),
          functionCalling: await this.supportsFunctionCalling(providerId),
          vision: await this.supportsVision(providerId)
        }
      }
    }
    
    return stats
  }
}

export const apiManager = ApiManager.getInstance()