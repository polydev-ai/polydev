import { ApiHandlerOptions, ModelInfo, ProviderConfiguration } from '../../types/providers'
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

// Provider handler registry
const handlers: Record<string, ApiHandler> = {
  anthropic: new AnthropicHandler(),
  openai: new OpenAIHandler(),
  google: new GoogleHandler(),
  vertex: new VertexHandler(),
  bedrock: new BedrockHandler(),
  azure: new AzureHandler(),
  openrouter: new OpenRouterHandler(),
  deepseek: new DeepSeekHandler(),
  ollama: new OllamaHandler(),
  lmstudio: new LMStudioHandler(),
  xai: new XAIHandler(),
  groq: new GroqHandler(),
  'codex-cli': new CodexCLIHandler(),
  'claude-code': new ClaudeCodeHandler(),
  'github-copilot': new GitHubCopilotHandler(),
  'gemini-cli': new GeminiCLIHandler(),
}

export class ApiManager {
  private static instance: ApiManager
  
  private constructor() {}
  
  static getInstance(): ApiManager {
    if (!ApiManager.instance) {
      ApiManager.instance = new ApiManager()
    }
    return ApiManager.instance
  }
  
  getHandler(providerId: string): ApiHandler {
    const handler = handlers[providerId]
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
    return [] // Return empty array for providers without dynamic model listing
  }
  
  getSupportedProviders(): string[] {
    return Object.keys(handlers)
  }
}

export const apiManager = ApiManager.getInstance()