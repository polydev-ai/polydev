export interface ModelInfo {
  maxTokens: number
  contextWindow: number
  inputPrice?: number  // per million tokens
  outputPrice?: number // per million tokens
  cacheWritePrice?: number
  cacheReadPrice?: number
  supportsImages?: boolean
  supportsPromptCache?: boolean
  supportsTools?: boolean
  supportsStreaming?: boolean
}

export interface ApiHandlerOptions {
  // Core options
  model?: string
  messages: any[]
  maxTokens?: number
  temperature?: number
  tools?: any[]
  
  // Provider-specific API keys
  apiKey?: string
  anthropicApiKey?: string
  openAiApiKey?: string
  googleApiKey?: string
  azureApiKey?: string
  groqApiKey?: string
  mistralApiKey?: string
  togetherApiKey?: string
  fireworksApiKey?: string
  deepseekApiKey?: string
  xaiApiKey?: string
  huggingfaceApiKey?: string
  
  // Base URLs and endpoints
  anthropicBaseUrl?: string
  openAiBaseUrl?: string
  googleBaseUrl?: string
  azureBaseUrl?: string
  groqBaseUrl?: string
  mistralBaseUrl?: string
  ollamaBaseUrl?: string
  lmStudioBaseUrl?: string
  
  // Azure-specific
  azureResourceName?: string
  azureDeploymentName?: string
  azureApiVersion?: string
  
  // AWS Bedrock
  awsAccessKeyId?: string
  awsSecretAccessKey?: string
  awsRegion?: string
  
  // Google Cloud
  googleProjectId?: string
  googleServiceAccountJson?: string
  vertexProjectId?: string
  vertexRegion?: string
  
  // Model selection
  apiModelId?: string
  planModeModelId?: string
  actModeModelId?: string
  
  // Advanced options
  thinkingBudgetTokens?: number
  topP?: number
  topK?: number
  customHeaders?: Record<string, string>
  
  // CLI-based options
  claudeCodePath?: string
  vsCodeEnabled?: boolean
  
  // Local model options
  ollamaHost?: string
  lmStudioPort?: number
}

export interface ProviderConfiguration {
  id: string
  name: string
  description: string
  category: 'api' | 'cli' | 'local' | 'cloud'
  authType: 'api_key' | 'oauth' | 'cli' | 'local' | 'cloud_credentials'
  tags?: string[] // For filtering: 'core', 'fast-inference', 'enterprise', 'open-source', 'reasoning', 'vision', 'coding', 'experimental'
  tier?: 'premium' | 'standard' | 'community'
  baseUrl?: string
  defaultModel?: string
  supportedModels: Record<string, ModelInfo>
  features: {
    streaming: boolean
    tools: boolean
    images: boolean
    reasoning: boolean
    caching: boolean
  }
  pricing: {
    type: 'token_based' | 'subscription' | 'free' | 'custom'
    currency?: string
  }
  documentation?: string
  setupInstructions?: string
}

// Provider definitions based on Cline's EXACT configuration
export const PROVIDERS: Record<string, ProviderConfiguration> = {
  // === ANTHROPIC ===
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude models with advanced reasoning capabilities',
    category: 'api',
    authType: 'api_key',
    tags: ['core', 'reasoning', 'vision', 'coding'],
    tier: 'premium',
    baseUrl: 'https://api.anthropic.com',
    defaultModel: 'claude-3-5-sonnet-20241022',
    supportedModels: {
      // Claude 4 Series
      'claude-sonnet-4-20250514:1m': {
        maxTokens: 8192,
        contextWindow: 1000000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        cacheWritePrice: 3.75,
        cacheReadPrice: 0.3,
        supportsImages: true,
        supportsPromptCache: true,
        supportsTools: true,
        supportsStreaming: true
      },
      'claude-sonnet-4-20250514': {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        cacheWritePrice: 3.75,
        cacheReadPrice: 0.3,
        supportsImages: true,
        supportsPromptCache: true,
        supportsTools: true,
        supportsStreaming: true
      },
      'claude-haiku-4-20250514': {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 0.25,
        outputPrice: 1.25,
        cacheWritePrice: 0.3,
        cacheReadPrice: 0.025,
        supportsImages: true,
        supportsPromptCache: true,
        supportsTools: true,
        supportsStreaming: true
      },
      'claude-opus-4-1-20250805': {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 15.0,
        outputPrice: 75.0,
        cacheWritePrice: 18.75,
        cacheReadPrice: 1.5,
        supportsImages: true,
        supportsPromptCache: true,
        supportsTools: true,
        supportsStreaming: true
      },
      'claude-opus-4-20250514': {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 15.0,
        outputPrice: 75.0,
        cacheWritePrice: 18.75,
        cacheReadPrice: 1.5,
        supportsImages: true,
        supportsPromptCache: true,
        supportsTools: true,
        supportsStreaming: true
      },
      // Claude 3.7 Series
      'claude-3-7-sonnet-20250219': {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        cacheWritePrice: 3.75,
        cacheReadPrice: 0.3,
        supportsImages: true,
        supportsPromptCache: true,
        supportsTools: true,
        supportsStreaming: true
      },
      // Claude 3.5 Series
      'claude-3-5-sonnet-20241022': {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        cacheWritePrice: 3.75,
        cacheReadPrice: 0.3,
        supportsImages: true,
        supportsPromptCache: true,
        supportsTools: true,
        supportsStreaming: true
      },
      'claude-3-5-haiku-20241022': {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 0.25,
        outputPrice: 1.25,
        cacheWritePrice: 0.3,
        cacheReadPrice: 0.025,
        supportsImages: true,
        supportsPromptCache: true,
        supportsTools: true,
        supportsStreaming: true
      },
      'claude-3-5-sonnet-20240620': {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        cacheWritePrice: 3.75,
        cacheReadPrice: 0.3,
        supportsImages: true,
        supportsPromptCache: true,
        supportsTools: true,
        supportsStreaming: true
      },
      'claude-3-5-haiku-20240307': {
        maxTokens: 4096,
        contextWindow: 200000,
        inputPrice: 0.25,
        outputPrice: 1.25,
        cacheWritePrice: 0.3,
        cacheReadPrice: 0.025,
        supportsImages: false,
        supportsPromptCache: true,
        supportsTools: true,
        supportsStreaming: true
      },
      // Claude 3 Series
      'claude-3-opus-20240229': {
        maxTokens: 4096,
        contextWindow: 200000,
        inputPrice: 15.0,
        outputPrice: 75.0,
        cacheWritePrice: 18.75,
        cacheReadPrice: 1.5,
        supportsImages: true,
        supportsPromptCache: true,
        supportsTools: true,
        supportsStreaming: true
      },
      'claude-3-sonnet-20240229': {
        maxTokens: 4096,
        contextWindow: 200000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        cacheWritePrice: 3.75,
        cacheReadPrice: 0.3,
        supportsImages: true,
        supportsPromptCache: true,
        supportsTools: true,
        supportsStreaming: true
      },
      'claude-3-haiku-20240307': {
        maxTokens: 4096,
        contextWindow: 200000,
        inputPrice: 0.25,
        outputPrice: 1.25,
        cacheWritePrice: 0.3,
        cacheReadPrice: 0.025,
        supportsImages: true,
        supportsPromptCache: true,
        supportsTools: true,
        supportsStreaming: true
      }
    },
    features: {
      streaming: true,
      tools: true,
      images: true,
      reasoning: true,
      caching: true
    },
    pricing: {
      type: 'token_based',
      currency: 'USD'
    },
    documentation: 'https://docs.anthropic.com'
  },

  'claude-code': {
    id: 'claude-code',
    name: 'Claude Code',
    description: 'Anthropic Claude via CLI for Pro/Max subscribers',
    category: 'cli',
    authType: 'cli',
    tags: ['core', 'cli', 'coding', 'reasoning'],
    tier: 'premium',
    defaultModel: 'claude-opus-4-1',
    supportedModels: {
      'claude-opus-4-1': {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 0,
        outputPrice: 0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsTools: true,
        supportsStreaming: true
      },
      'claude-sonnet-4': {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 0,
        outputPrice: 0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsTools: true,
        supportsStreaming: true
      }
    },
    features: {
      streaming: true,
      tools: true,
      images: false,
      reasoning: true,
      caching: false
    },
    pricing: {
      type: 'subscription'
    },
    setupInstructions: 'Install Claude Code CLI and authenticate with your Pro/Max subscription'
  },

  'openai-native': {
    id: 'openai-native',
    name: 'OpenAI (Native)',
    description: 'Latest OpenAI models with native authentication',
    category: 'api',
    authType: 'api_key',
    tags: ['core', 'reasoning', 'vision', 'coding'],
    tier: 'premium',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-5-2025-08-07',
    supportedModels: {
      // GPT-5 Series
      'gpt-5-2025-08-07': {
        maxTokens: 8192,
        contextWindow: 272000,
        inputPrice: 1.25,
        outputPrice: 10.0,
        cacheReadPrice: 0.125,
        supportsImages: true,
        supportsPromptCache: true,
        supportsTools: true,
        supportsStreaming: true
      },
      'gpt-5-mini-2025-08-07': {
        maxTokens: 8192,
        contextWindow: 272000,
        inputPrice: 0.25,
        outputPrice: 2.0,
        cacheReadPrice: 0.025,
        supportsImages: true,
        supportsPromptCache: true,
        supportsTools: true,
        supportsStreaming: true
      },
      'gpt-5-nano-2025-08-07': {
        maxTokens: 8192,
        contextWindow: 272000,
        inputPrice: 0.05,
        outputPrice: 0.4,
        cacheReadPrice: 0.005,
        supportsImages: true,
        supportsPromptCache: true,
        supportsTools: true,
        supportsStreaming: true
      },
      'gpt-5-chat-latest': {
        maxTokens: 8192,
        contextWindow: 400000,
        inputPrice: 1.25,
        outputPrice: 10,
        cacheReadPrice: 0.125,
        supportsImages: true,
        supportsPromptCache: true,
        supportsTools: true,
        supportsStreaming: true
      },
      // GPT-4.1 Series
      'gpt-4.1': {
        maxTokens: 32768,
        contextWindow: 1047576,
        inputPrice: 2,
        outputPrice: 8,
        cacheReadPrice: 0.5,
        supportsImages: true,
        supportsPromptCache: true,
        supportsTools: true,
        supportsStreaming: true
      },
      'gpt-4.1-mini': {
        maxTokens: 32768,
        contextWindow: 1047576,
        inputPrice: 0.4,
        outputPrice: 1.6,
        cacheReadPrice: 0.1,
        supportsImages: true,
        supportsPromptCache: true,
        supportsTools: true,
        supportsStreaming: true
      },
      'gpt-4.1-nano': {
        maxTokens: 32768,
        contextWindow: 1047576,
        inputPrice: 0.1,
        outputPrice: 0.4,
        cacheReadPrice: 0.025,
        supportsImages: true,
        supportsPromptCache: true,
        supportsTools: true,
        supportsStreaming: true
      },
      // o3 Series (New reasoning models)
      'o3': {
        maxTokens: 100000,
        contextWindow: 200000,
        inputPrice: 2.0,
        outputPrice: 8.0,
        cacheReadPrice: 0.5,
        supportsImages: true,
        supportsPromptCache: true,
        supportsTools: false,
        supportsStreaming: false
      },
      'o3-mini': {
        maxTokens: 100000,
        contextWindow: 200000,
        inputPrice: 1.1,
        outputPrice: 4.4,
        cacheReadPrice: 0.55,
        supportsImages: false,
        supportsPromptCache: true,
        supportsTools: false,
        supportsStreaming: false
      },
      'o4-mini': {
        maxTokens: 100000,
        contextWindow: 200000,
        inputPrice: 1.1,
        outputPrice: 4.4,
        cacheReadPrice: 0.275,
        supportsImages: true,
        supportsPromptCache: true,
        supportsTools: false,
        supportsStreaming: false
      },
      // o1 Series
      'o1': {
        maxTokens: 100000,
        contextWindow: 200000,
        inputPrice: 15,
        outputPrice: 60,
        cacheReadPrice: 7.5,
        supportsImages: true,
        supportsPromptCache: false,
        supportsTools: false,
        supportsStreaming: false
      },
      'o1-preview': {
        maxTokens: 32768,
        contextWindow: 128000,
        inputPrice: 15,
        outputPrice: 60,
        cacheReadPrice: 7.5,
        supportsImages: true,
        supportsPromptCache: true,
        supportsTools: false,
        supportsStreaming: false
      },
      'o1-mini': {
        maxTokens: 65536,
        contextWindow: 128000,
        inputPrice: 1.1,
        outputPrice: 4.4,
        cacheReadPrice: 0.55,
        supportsImages: true,
        supportsPromptCache: true,
        supportsTools: false,
        supportsStreaming: false
      },
      // GPT-4o Series
      'gpt-4o': {
        maxTokens: 4096,
        contextWindow: 128000,
        inputPrice: 2.5,
        outputPrice: 10,
        cacheReadPrice: 1.25,
        supportsImages: true,
        supportsPromptCache: true,
        supportsTools: true,
        supportsStreaming: true
      },
      'gpt-4o-mini': {
        maxTokens: 16384,
        contextWindow: 128000,
        inputPrice: 0.15,
        outputPrice: 0.6,
        cacheReadPrice: 0.075,
        supportsImages: true,
        supportsPromptCache: true,
        supportsTools: true,
        supportsStreaming: true
      },
      'chatgpt-4o-latest': {
        maxTokens: 16384,
        contextWindow: 128000,
        inputPrice: 5,
        outputPrice: 15,
        supportsImages: true,
        supportsPromptCache: false,
        supportsTools: true,
        supportsStreaming: true
      }
    },
    features: {
      streaming: true,
      tools: true,
      images: true,
      reasoning: true,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'USD'
    },
    documentation: 'https://platform.openai.com/docs'
  },

  openai: {
    id: 'openai',
    name: 'OpenAI (API)',
    description: 'OpenAI models via API',
    category: 'api',
    authType: 'api_key',
    tags: ['core', 'reasoning', 'vision', 'coding'],
    tier: 'premium',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-5-2025-08-07',
    supportedModels: {
      // GPT-5 Series
      'gpt-5-2025-08-07': {
        maxTokens: 8192,
        contextWindow: 272000,
        inputPrice: 1.25,
        outputPrice: 10.0,
        cacheReadPrice: 0.125,
        supportsImages: true,
        supportsPromptCache: true,
        supportsTools: true,
        supportsStreaming: true
      },
      'gpt-5-mini-2025-08-07': {
        maxTokens: 8192,
        contextWindow: 272000,
        inputPrice: 0.25,
        outputPrice: 2.0,
        cacheReadPrice: 0.025,
        supportsImages: true,
        supportsPromptCache: true,
        supportsTools: true,
        supportsStreaming: true
      },
      'gpt-5-nano-2025-08-07': {
        maxTokens: 8192,
        contextWindow: 272000,
        inputPrice: 0.05,
        outputPrice: 0.4,
        cacheReadPrice: 0.005,
        supportsImages: true,
        supportsPromptCache: true,
        supportsTools: true,
        supportsStreaming: true
      },
      'gpt-5-chat-latest': {
        maxTokens: 8192,
        contextWindow: 400000,
        inputPrice: 1.25,
        outputPrice: 10,
        cacheReadPrice: 0.125,
        supportsImages: true,
        supportsPromptCache: true,
        supportsTools: true,
        supportsStreaming: true
      },
      // GPT-4.1 Series
      'gpt-4.1': {
        maxTokens: 32768,
        contextWindow: 1047576,
        inputPrice: 2,
        outputPrice: 8,
        cacheReadPrice: 0.5,
        supportsImages: true,
        supportsPromptCache: true,
        supportsTools: true,
        supportsStreaming: true
      },
      'gpt-4.1-mini': {
        maxTokens: 32768,
        contextWindow: 1047576,
        inputPrice: 0.4,
        outputPrice: 1.6,
        cacheReadPrice: 0.1,
        supportsImages: true,
        supportsPromptCache: true,
        supportsTools: true,
        supportsStreaming: true
      },
      'gpt-4.1-nano': {
        maxTokens: 32768,
        contextWindow: 1047576,
        inputPrice: 0.1,
        outputPrice: 0.4,
        cacheReadPrice: 0.025,
        supportsImages: true,
        supportsPromptCache: true,
        supportsTools: true,
        supportsStreaming: true
      },
      // o3 Series (New reasoning models)
      'o3': {
        maxTokens: 100000,
        contextWindow: 200000,
        inputPrice: 2.0,
        outputPrice: 8.0,
        cacheReadPrice: 0.5,
        supportsImages: true,
        supportsPromptCache: true,
        supportsTools: false,
        supportsStreaming: false
      },
      'o3-mini': {
        maxTokens: 100000,
        contextWindow: 200000,
        inputPrice: 1.1,
        outputPrice: 4.4,
        cacheReadPrice: 0.55,
        supportsImages: false,
        supportsPromptCache: true,
        supportsTools: false,
        supportsStreaming: false
      },
      'o4-mini': {
        maxTokens: 100000,
        contextWindow: 200000,
        inputPrice: 1.1,
        outputPrice: 4.4,
        cacheReadPrice: 0.275,
        supportsImages: true,
        supportsPromptCache: true,
        supportsTools: false,
        supportsStreaming: false
      },
      // o1 Series
      'o1': {
        maxTokens: 100000,
        contextWindow: 200000,
        inputPrice: 15,
        outputPrice: 60,
        cacheReadPrice: 7.5,
        supportsImages: true,
        supportsPromptCache: false,
        supportsTools: false,
        supportsStreaming: false
      },
      'o1-preview': {
        maxTokens: 32768,
        contextWindow: 128000,
        inputPrice: 15,
        outputPrice: 60,
        cacheReadPrice: 7.5,
        supportsImages: true,
        supportsPromptCache: true,
        supportsTools: false,
        supportsStreaming: false
      },
      'o1-mini': {
        maxTokens: 65536,
        contextWindow: 128000,
        inputPrice: 1.1,
        outputPrice: 4.4,
        cacheReadPrice: 0.55,
        supportsImages: true,
        supportsPromptCache: true,
        supportsTools: false,
        supportsStreaming: false
      },
      // GPT-4o Series
      'gpt-4o': {
        maxTokens: 4096,
        contextWindow: 128000,
        inputPrice: 2.5,
        outputPrice: 10,
        cacheReadPrice: 1.25,
        supportsImages: true,
        supportsPromptCache: true,
        supportsTools: true,
        supportsStreaming: true
      },
      'gpt-4o-mini': {
        maxTokens: 16384,
        contextWindow: 128000,
        inputPrice: 0.15,
        outputPrice: 0.6,
        cacheReadPrice: 0.075,
        supportsImages: true,
        supportsPromptCache: true,
        supportsTools: true,
        supportsStreaming: true
      },
      'chatgpt-4o-latest': {
        maxTokens: 16384,
        contextWindow: 128000,
        inputPrice: 5,
        outputPrice: 15,
        supportsImages: true,
        supportsPromptCache: false,
        supportsTools: true,
        supportsStreaming: true
      }
    },
    features: {
      streaming: true,
      tools: true,
      images: true,
      reasoning: true,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'USD'
    },
    documentation: 'https://platform.openai.com/docs'
  },

  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Google Gemini models with large context windows',
    category: 'api',
    authType: 'api_key',
    tags: ['core', 'vision', 'experimental'],
    tier: 'standard',
    baseUrl: 'https://generativelanguage.googleapis.com/v1',
    defaultModel: 'gemini-2.0-flash-exp',
    supportedModels: {
      // Gemini 2.0 Series
      'gemini-2.0-flash-exp': {
        maxTokens: 8192,
        contextWindow: 1000000,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: true,
        supportsPromptCache: false,
        supportsTools: true,
        supportsStreaming: true
      },
      'gemini-2.0-flash-thinking-exp-01-21': {
        maxTokens: 32768,
        contextWindow: 1000000,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: true,
        supportsPromptCache: false,
        supportsTools: true,
        supportsStreaming: true
      },
      // Gemini 1.5 Series
      'gemini-1.5-pro-latest': {
        maxTokens: 8192,
        contextWindow: 2097152,
        inputPrice: 1.25,
        outputPrice: 2.5,
        supportsImages: true,
        supportsPromptCache: false,
        supportsTools: true,
        supportsStreaming: true
      },
      'gemini-1.5-flash-latest': {
        maxTokens: 8192,
        contextWindow: 1000000,
        inputPrice: 0.075,
        outputPrice: 0.3,
        supportsImages: true,
        supportsPromptCache: false,
        supportsTools: true,
        supportsStreaming: true
      },
      'gemini-1.5-flash-8b-latest': {
        maxTokens: 8192,
        contextWindow: 1000000,
        inputPrice: 0.0375,
        outputPrice: 0.15,
        supportsImages: true,
        supportsPromptCache: false,
        supportsTools: true,
        supportsStreaming: true
      },
      'gemini-1.5-pro-exp-0827': {
        maxTokens: 8192,
        contextWindow: 2097152,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: true,
        supportsPromptCache: false,
        supportsTools: true,
        supportsStreaming: true
      },
      'gemini-1.5-flash-exp-0827': {
        maxTokens: 8192,
        contextWindow: 1000000,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: true,
        supportsPromptCache: false,
        supportsTools: true,
        supportsStreaming: true
      },
      'gemini-1.5-flash-8b-exp-0827': {
        maxTokens: 8192,
        contextWindow: 1000000,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: true,
        supportsPromptCache: false,
        supportsTools: true,
        supportsStreaming: true
      },
      // Versioned models
      'gemini-1.5-pro-002': {
        maxTokens: 8192,
        contextWindow: 2097152,
        inputPrice: 1.25,
        outputPrice: 2.5,
        supportsImages: true,
        supportsPromptCache: false,
        supportsTools: true,
        supportsStreaming: true
      },
      'gemini-1.5-flash-002': {
        maxTokens: 8192,
        contextWindow: 1000000,
        inputPrice: 0.075,
        outputPrice: 0.3,
        supportsImages: true,
        supportsPromptCache: false,
        supportsTools: true,
        supportsStreaming: true
      },
      'gemini-1.5-flash-8b': {
        maxTokens: 8192,
        contextWindow: 1000000,
        inputPrice: 0.0375,
        outputPrice: 0.15,
        supportsImages: true,
        supportsPromptCache: false,
        supportsTools: true,
        supportsStreaming: true
      }
    },
    features: {
      streaming: true,
      tools: true,
      images: true,
      reasoning: false,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'USD'
    },
    documentation: 'https://ai.google.dev/docs'
  },

  vertex: {
    id: 'vertex',
    name: 'Google Vertex AI',
    description: 'Google Cloud Vertex AI platform with enterprise features',
    category: 'cloud',
    authType: 'cloud_credentials',
    tags: ['enterprise', 'cloud', 'vision'],
    tier: 'standard',
    baseUrl: 'https://us-central1-aiplatform.googleapis.com',
    defaultModel: 'gemini-1.5-pro',
    supportedModels: {
      'gemini-1.5-pro': {
        maxTokens: 8192,
        contextWindow: 2097152,
        inputPrice: 1.25,
        outputPrice: 2.5,
        supportsImages: true,
        supportsTools: true,
        supportsStreaming: true
      },
      'gemini-1.5-flash': {
        maxTokens: 8192,
        contextWindow: 1000000,
        inputPrice: 0.075,
        outputPrice: 0.3,
        supportsImages: true,
        supportsTools: true,
        supportsStreaming: true
      }
    },
    features: {
      streaming: true,
      tools: true,
      images: true,
      reasoning: false,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'USD'
    },
    documentation: 'https://cloud.google.com/vertex-ai/docs'
  },

  groq: {
    id: 'groq',
    name: 'Groq',
    description: 'Ultra-fast inference with Groq hardware acceleration',
    category: 'api',
    authType: 'api_key',
    tags: ['fast-inference', 'open-source'],
    tier: 'standard',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    supportedModels: {
      'llama-3.3-70b-versatile': {
        maxTokens: 32768,
        contextWindow: 128000,
        inputPrice: 0.59,
        outputPrice: 0.79,
        supportsTools: true,
        supportsStreaming: true
      },
      'llama-3.1-70b-versatile': {
        maxTokens: 32768,
        contextWindow: 128000,
        inputPrice: 0.59,
        outputPrice: 0.79,
        supportsTools: true,
        supportsStreaming: true
      }
    },
    features: {
      streaming: true,
      tools: true,
      images: false,
      reasoning: false,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'USD'
    },
    documentation: 'https://console.groq.com/docs'
  },

  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'Advanced reasoning models from DeepSeek',
    category: 'api',
    authType: 'api_key',
    tags: ['reasoning', 'coding'],
    tier: 'standard',
    baseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
    supportedModels: {
      'deepseek-chat': {
        maxTokens: 8192,
        contextWindow: 64000,
        inputPrice: 0.14,
        outputPrice: 0.28,
        supportsTools: true,
        supportsStreaming: true
      },
      'deepseek-reasoner': {
        maxTokens: 8192,
        contextWindow: 64000,
        inputPrice: 0.55,
        outputPrice: 2.19,
        supportsTools: true,
        supportsStreaming: true
      }
    },
    features: {
      streaming: true,
      tools: true,
      images: false,
      reasoning: true,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'USD'
    },
    documentation: 'https://platform.deepseek.com/docs'
  },

  xai: {
    id: 'xai',
    name: 'xAI',
    description: 'Grok models by xAI with real-time information access',
    category: 'api',
    authType: 'api_key',
    tags: ['experimental', 'reasoning'],
    tier: 'standard',
    baseUrl: 'https://api.x.ai/v1',
    defaultModel: 'grok-2-1212',
    supportedModels: {
      'grok-2-1212': {
        maxTokens: 131072,
        contextWindow: 131072,
        inputPrice: 2.0,
        outputPrice: 10.0,
        supportsTools: true,
        supportsStreaming: true
      },
      'grok-2-vision-1212': {
        maxTokens: 8192,
        contextWindow: 8192,
        inputPrice: 2.0,
        outputPrice: 10.0,
        supportsImages: true,
        supportsTools: true,
        supportsStreaming: true
      }
    },
    features: {
      streaming: true,
      tools: true,
      images: true,
      reasoning: false,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'USD'
    },
    documentation: 'https://docs.x.ai'
  },

  ollama: {
    id: 'ollama',
    name: 'Ollama',
    description: 'Local model serving with Ollama',
    category: 'local',
    authType: 'local',
    tags: ['local', 'open-source', 'privacy'],
    tier: 'community',
    baseUrl: 'http://localhost:11434',
    defaultModel: 'llama3.3',
    supportedModels: {
      'llama3.3': {
        maxTokens: 8192,
        contextWindow: 128000,
        inputPrice: 0,
        outputPrice: 0,
        supportsTools: false,
        supportsStreaming: true
      },
      'qwen2.5': {
        maxTokens: 8192,
        contextWindow: 32768,
        inputPrice: 0,
        outputPrice: 0,
        supportsTools: false,
        supportsStreaming: true
      }
    },
    features: {
      streaming: true,
      tools: false,
      images: false,
      reasoning: false,
      caching: false
    },
    pricing: {
      type: 'free'
    },
    setupInstructions: 'Install Ollama and pull desired models',
    documentation: 'https://ollama.com/docs'
  },

  lmstudio: {
    id: 'lmstudio',
    name: 'LM Studio',
    description: 'Local model serving with LM Studio',
    category: 'local',
    authType: 'local',
    tags: ['local', 'privacy'],
    tier: 'community',
    baseUrl: 'http://localhost:1234/v1',
    defaultModel: 'local-model',
    supportedModels: {
      'local-model': {
        maxTokens: 4096,
        contextWindow: 4096,
        inputPrice: 0,
        outputPrice: 0,
        supportsTools: false,
        supportsStreaming: true
      }
    },
    features: {
      streaming: true,
      tools: false,
      images: false,
      reasoning: false,
      caching: false
    },
    pricing: {
      type: 'free'
    },
    setupInstructions: 'Start LM Studio local server',
    documentation: 'https://lmstudio.ai/docs'
  },

  mistral: {
    id: 'mistral',
    name: 'Mistral AI',
    description: 'European AI company with efficient models',
    category: 'api',
    authType: 'api_key',
    tags: ['core', 'coding'],
    tier: 'standard',
    baseUrl: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-large-latest',
    supportedModels: {
      'mistral-large-latest': {
        maxTokens: 128000,
        contextWindow: 128000,
        inputPrice: 2.0,
        outputPrice: 6.0,
        supportsTools: true,
        supportsStreaming: true
      },
      'mistral-small-latest': {
        maxTokens: 32000,
        contextWindow: 32000,
        inputPrice: 0.2,
        outputPrice: 0.6,
        supportsTools: true,
        supportsStreaming: true
      }
    },
    features: {
      streaming: true,
      tools: true,
      images: false,
      reasoning: false,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'USD'
    },
    documentation: 'https://docs.mistral.ai'
  },

  together: {
    id: 'together',
    name: 'Together AI',
    description: 'Together AI platform with various open models',
    category: 'api',
    authType: 'api_key',
    baseUrl: 'https://api.together.xyz/v1',
    defaultModel: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
    supportedModels: {
      'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo': {
        maxTokens: 32768,
        contextWindow: 131072,
        inputPrice: 0.88,
        outputPrice: 0.88,
        supportsTools: true,
        supportsStreaming: true
      },
      'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo': {
        maxTokens: 32768,
        contextWindow: 131072,
        inputPrice: 0.18,
        outputPrice: 0.18,
        supportsTools: true,
        supportsStreaming: true
      }
    },
    features: {
      streaming: true,
      tools: true,
      images: false,
      reasoning: false,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'USD'
    },
    documentation: 'https://docs.together.ai'
  },

  fireworks: {
    id: 'fireworks',
    name: 'Fireworks AI',
    description: 'Fast inference platform for open-source models',
    category: 'api',
    authType: 'api_key',
    baseUrl: 'https://api.fireworks.ai/inference/v1',
    defaultModel: 'accounts/fireworks/models/llama-v3p1-70b-instruct',
    supportedModels: {
      'accounts/fireworks/models/llama-v3p1-70b-instruct': {
        maxTokens: 16384,
        contextWindow: 131072,
        inputPrice: 0.9,
        outputPrice: 0.9,
        supportsTools: true,
        supportsStreaming: true
      }
    },
    features: {
      streaming: true,
      tools: true,
      images: false,
      reasoning: false,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'USD'
    },
    documentation: 'https://docs.fireworks.ai'
  },

  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Unified API for accessing multiple AI models',
    category: 'api',
    authType: 'api_key',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'anthropic/claude-3.5-sonnet',
    supportedModels: {
      'anthropic/claude-3.5-sonnet': {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: true,
        supportsTools: true,
        supportsStreaming: true
      },
      'openai/gpt-4o': {
        maxTokens: 16384,
        contextWindow: 128000,
        inputPrice: 2.5,
        outputPrice: 10.0,
        supportsImages: true,
        supportsTools: true,
        supportsStreaming: true
      }
    },
    features: {
      streaming: true,
      tools: true,
      images: true,
      reasoning: false,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'USD'
    },
    documentation: 'https://openrouter.ai/docs'
  },

  bedrock: {
    id: 'bedrock',
    name: 'AWS Bedrock',
    description: 'Amazon Bedrock managed AI service',
    category: 'cloud',
    authType: 'cloud_credentials',
    baseUrl: 'https://bedrock-runtime.amazonaws.com',
    defaultModel: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    supportedModels: {
      'anthropic.claude-3-5-sonnet-20241022-v2:0': {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: true,
        supportsTools: true,
        supportsStreaming: true
      },
      'amazon.nova-pro-v1:0': {
        maxTokens: 5120,
        contextWindow: 300000,
        inputPrice: 0.8,
        outputPrice: 3.2,
        supportsImages: true,
        supportsTools: true,
        supportsStreaming: true
      }
    },
    features: {
      streaming: true,
      tools: true,
      images: true,
      reasoning: false,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'USD'
    },
    documentation: 'https://docs.aws.amazon.com/bedrock/'
  },

  huggingface: {
    id: 'huggingface',
    name: 'Hugging Face',
    description: 'Access to thousands of open-source models',
    category: 'api',
    authType: 'api_key',
    baseUrl: 'https://api-inference.huggingface.co',
    defaultModel: 'Qwen/Qwen2.5-72B-Instruct',
    supportedModels: {
      'Qwen/Qwen2.5-72B-Instruct': {
        maxTokens: 32768,
        contextWindow: 32768,
        inputPrice: 0.4,
        outputPrice: 0.4,
        supportsTools: false,
        supportsStreaming: false
      }
    },
    features: {
      streaming: false,
      tools: false,
      images: false,
      reasoning: false,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'USD'
    },
    documentation: 'https://huggingface.co/docs/api-inference'
  },

  sambanova: {
    id: 'sambanova',
    name: 'SambaNova',
    description: 'SambaNova Systems AI platform',
    category: 'api',
    authType: 'api_key',
    baseUrl: 'https://api.sambanova.ai/v1',
    defaultModel: 'Meta-Llama-3.1-70B-Instruct',
    supportedModels: {
      'Meta-Llama-3.1-70B-Instruct': {
        maxTokens: 4096,
        contextWindow: 131072,
        inputPrice: 1.0,
        outputPrice: 1.0,
        supportsTools: false,
        supportsStreaming: true
      }
    },
    features: {
      streaming: true,
      tools: false,
      images: false,
      reasoning: false,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'USD'
    },
    documentation: 'https://sambanova.ai/docs'
  },

  cerebras: {
    id: 'cerebras',
    name: 'Cerebras',
    description: 'Ultra-fast inference with Cerebras hardware',
    category: 'api',
    authType: 'api_key',
    baseUrl: 'https://api.cerebras.ai/v1',
    defaultModel: 'llama3.1-70b',
    supportedModels: {
      'llama3.1-70b': {
        maxTokens: 8192,
        contextWindow: 128000,
        inputPrice: 0.6,
        outputPrice: 0.6,
        supportsTools: false,
        supportsStreaming: true
      }
    },
    features: {
      streaming: true,
      tools: false,
      images: false,
      reasoning: false,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'USD'
    },
    documentation: 'https://inference-docs.cerebras.ai'
  },

  moonshot: {
    id: 'moonshot',
    name: 'Moonshot AI',
    description: 'Chinese AI company with Kimi models',
    category: 'api',
    authType: 'api_key',
    baseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'moonshot-v1-128k',
    supportedModels: {
      'moonshot-v1-128k': {
        maxTokens: 16384,
        contextWindow: 128000,
        inputPrice: 5.06,
        outputPrice: 5.06,
        supportsTools: false,
        supportsStreaming: true
      }
    },
    features: {
      streaming: true,
      tools: false,
      images: false,
      reasoning: false,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'CNY'
    },
    documentation: 'https://platform.moonshot.cn/docs'
  },

  qwen: {
    id: 'qwen',
    name: 'Alibaba Qwen',
    description: 'Alibaba Qwen models with coding capabilities',
    category: 'api',
    authType: 'api_key',
    baseUrl: 'https://dashscope.aliyuncs.com/api/v1',
    defaultModel: 'qwen-turbo',
    supportedModels: {
      'qwen-turbo': {
        maxTokens: 8192,
        contextWindow: 128000,
        inputPrice: 0.3,
        outputPrice: 0.6,
        supportsTools: false,
        supportsStreaming: true
      }
    },
    features: {
      streaming: true,
      tools: false,
      images: false,
      reasoning: false,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'CNY'
    },
    documentation: 'https://help.aliyun.com/zh/dashscope'
  },

  doubao: {
    id: 'doubao',
    name: 'ByteDance Doubao',
    description: 'ByteDance Doubao models',
    category: 'api',
    authType: 'api_key',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    defaultModel: 'doubao-pro-128k',
    supportedModels: {
      'doubao-pro-128k': {
        maxTokens: 8192,
        contextWindow: 128000,
        inputPrice: 0.8,
        outputPrice: 2.0,
        supportsTools: false,
        supportsStreaming: true
      }
    },
    features: {
      streaming: true,
      tools: false,
      images: false,
      reasoning: false,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'CNY'
    },
    documentation: 'https://www.volcengine.com/docs/82379'
  },

  'vscode-lm': {
    id: 'vscode-lm',
    name: 'VS Code Language Models',
    description: 'Built-in VS Code language model access',
    category: 'cli',
    authType: 'cli',
    defaultModel: 'copilot-gpt-4o',
    supportedModels: {
      'copilot-gpt-4o': {
        maxTokens: 4096,
        contextWindow: 128000,
        inputPrice: 0,
        outputPrice: 0,
        supportsTools: false,
        supportsStreaming: true
      }
    },
    features: {
      streaming: true,
      tools: false,
      images: false,
      reasoning: false,
      caching: false
    },
    pricing: {
      type: 'subscription'
    },
    setupInstructions: 'Enable in VS Code with GitHub Copilot subscription'
  },

  litellm: {
    id: 'litellm',
    name: 'LiteLLM',
    description: 'Unified interface for 100+ LLM APIs',
    category: 'api',
    authType: 'api_key',
    baseUrl: 'http://localhost:4000',
    defaultModel: 'gpt-4o',
    supportedModels: {
      'gpt-4o': {
        maxTokens: 16384,
        contextWindow: 128000,
        inputPrice: 2.5,
        outputPrice: 10.0,
        supportsImages: true,
        supportsTools: true,
        supportsStreaming: true
      }
    },
    features: {
      streaming: true,
      tools: true,
      images: true,
      reasoning: false,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'USD'
    },
    setupInstructions: 'Deploy LiteLLM proxy server',
    documentation: 'https://litellm.vercel.app'
  },

  requesty: {
    id: 'requesty',
    name: 'Requesty',
    description: 'Custom API endpoint proxy service',
    category: 'api',
    authType: 'api_key',
    baseUrl: 'https://api.requesty.com/v1',
    defaultModel: 'claude-3-5-sonnet-20241022',
    supportedModels: {
      'claude-3-5-sonnet-20241022': {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: true,
        supportsTools: true,
        supportsStreaming: true
      }
    },
    features: {
      streaming: true,
      tools: true,
      images: true,
      reasoning: false,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'USD'
    },
    documentation: 'https://requesty.com/docs'
  },

  'qwen-code': {
    id: 'qwen-code',
    name: 'Qwen Code',
    description: 'Specialized Qwen models for coding tasks',
    category: 'api',
    authType: 'api_key',
    baseUrl: 'https://dashscope.aliyuncs.com/api/v1',
    defaultModel: 'qwen2.5-coder-32b-instruct',
    supportedModels: {
      'qwen2.5-coder-32b-instruct': {
        maxTokens: 8192,
        contextWindow: 131072,
        inputPrice: 0.3,
        outputPrice: 0.6,
        supportsTools: false,
        supportsStreaming: true
      }
    },
    features: {
      streaming: true,
      tools: false,
      images: false,
      reasoning: false,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'CNY'
    },
    documentation: 'https://help.aliyun.com/zh/dashscope'
  },

  nebius: {
    id: 'nebius',
    name: 'Nebius AI',
    description: 'Nebius AI cloud platform',
    category: 'api',
    authType: 'api_key',
    baseUrl: 'https://api.studio.nebius.ai/v1',
    defaultModel: 'meta-llama/Meta-Llama-3.1-70B-Instruct',
    supportedModels: {
      'meta-llama/Meta-Llama-3.1-70B-Instruct': {
        maxTokens: 32768,
        contextWindow: 131072,
        inputPrice: 0.88,
        outputPrice: 0.88,
        supportsTools: false,
        supportsStreaming: true
      }
    },
    features: {
      streaming: true,
      tools: false,
      images: false,
      reasoning: false,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'USD'
    },
    documentation: 'https://docs.nebius.com'
  },

  asksage: {
    id: 'asksage',
    name: 'Ask Sage',
    description: 'AskSage AI platform',
    category: 'api',
    authType: 'api_key',
    baseUrl: 'https://api.asksage.ai/v1',
    defaultModel: 'claude-3-5-sonnet-20241022',
    supportedModels: {
      'claude-3-5-sonnet-20241022': {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: true,
        supportsTools: true,
        supportsStreaming: true
      }
    },
    features: {
      streaming: true,
      tools: true,
      images: true,
      reasoning: false,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'USD'
    },
    documentation: 'https://asksage.ai/docs'
  },

  sapaicore: {
    id: 'sapaicore',
    name: 'SAP AI Core',
    description: 'SAP AI Core enterprise platform',
    category: 'cloud',
    authType: 'cloud_credentials',
    baseUrl: 'https://api.ai.internationalacceleratorprogram.com',
    defaultModel: 'gpt-4o',
    supportedModels: {
      'gpt-4o': {
        maxTokens: 16384,
        contextWindow: 128000,
        inputPrice: 2.5,
        outputPrice: 10.0,
        supportsImages: true,
        supportsTools: true,
        supportsStreaming: true
      }
    },
    features: {
      streaming: true,
      tools: true,
      images: true,
      reasoning: false,
      caching: false
    },
    pricing: {
      type: 'custom',
      currency: 'EUR'
    },
    documentation: 'https://help.sap.com/docs/sap-ai-core'
  },

  'huawei-cloud-maas': {
    id: 'huawei-cloud-maas',
    name: 'Huawei Cloud MaaS',
    description: 'Huawei Cloud Model as a Service platform',
    category: 'cloud',
    authType: 'cloud_credentials',
    baseUrl: 'https://maas.cn-north-4.myhuaweicloud.com/v1',
    defaultModel: 'pangu-chat',
    supportedModels: {
      'pangu-chat': {
        maxTokens: 8192,
        contextWindow: 32768,
        inputPrice: 1.0,
        outputPrice: 2.0,
        supportsTools: false,
        supportsStreaming: true
      }
    },
    features: {
      streaming: true,
      tools: false,
      images: false,
      reasoning: false,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'CNY'
    },
    documentation: 'https://support.huaweicloud.com/maas/'
  },

  dify: {
    id: 'dify',
    name: 'Dify',
    description: 'Open-source LLMOps platform',
    category: 'api',
    authType: 'api_key',
    baseUrl: 'https://api.dify.ai/v1',
    defaultModel: 'claude-3-5-sonnet-20241022',
    supportedModels: {
      'claude-3-5-sonnet-20241022': {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: true,
        supportsTools: true,
        supportsStreaming: true
      }
    },
    features: {
      streaming: true,
      tools: true,
      images: true,
      reasoning: false,
      caching: false
    },
    pricing: {
      type: 'custom'
    },
    setupInstructions: 'Deploy Dify platform and configure models',
    documentation: 'https://docs.dify.ai'
  },

  baseten: {
    id: 'baseten',
    name: 'Baseten',
    description: 'ML model serving platform',
    category: 'api',
    authType: 'api_key',
    baseUrl: 'https://model-XXXXX.api.baseten.co/production/predict',
    defaultModel: 'llama-3-1-70b-instruct',
    supportedModels: {
      'llama-3-1-70b-instruct': {
        maxTokens: 32768,
        contextWindow: 131072,
        inputPrice: 0.88,
        outputPrice: 0.88,
        supportsTools: false,
        supportsStreaming: true
      }
    },
    features: {
      streaming: true,
      tools: false,
      images: false,
      reasoning: false,
      caching: false
    },
    pricing: {
      type: 'custom'
    },
    setupInstructions: 'Deploy models on Baseten platform',
    documentation: 'https://docs.baseten.co'
  },

  'vercel-ai-gateway': {
    id: 'vercel-ai-gateway',
    name: 'Vercel AI Gateway',
    description: 'Vercel AI Gateway for model routing',
    category: 'api',
    authType: 'api_key',
    baseUrl: 'https://gateway.ai.vercel.com/v1',
    defaultModel: 'gpt-4o',
    supportedModels: {
      'gpt-4o': {
        maxTokens: 16384,
        contextWindow: 128000,
        inputPrice: 2.5,
        outputPrice: 10.0,
        supportsImages: true,
        supportsTools: true,
        supportsStreaming: true
      }
    },
    features: {
      streaming: true,
      tools: true,
      images: true,
      reasoning: false,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'USD'
    },
    documentation: 'https://vercel.com/docs/ai-gateway'
  },

  zai: {
    id: 'zai',
    name: 'ZAI',
    description: 'Z.ai platform for AI model access',
    category: 'api',
    authType: 'api_key',
    baseUrl: 'https://api.z.ai/v1',
    defaultModel: 'claude-3-5-sonnet-20241022',
    supportedModels: {
      'claude-3-5-sonnet-20241022': {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: true,
        supportsTools: true,
        supportsStreaming: true
      }
    },
    features: {
      streaming: true,
      tools: true,
      images: true,
      reasoning: false,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'USD'
    },
    documentation: 'https://z.ai/docs'
  },

  cline: {
    id: 'cline',
    name: 'Cline',
    description: 'Cline autonomous coding agent platform',
    category: 'api',
    authType: 'api_key',
    baseUrl: 'https://api.cline.dev/v1',
    defaultModel: 'claude-3-5-sonnet-20241022',
    supportedModels: {
      'claude-3-5-sonnet-20241022': {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 0,
        outputPrice: 0,
        supportsImages: false,
        supportsTools: true,
        supportsStreaming: true
      }
    },
    features: {
      streaming: true,
      tools: true,
      images: false,
      reasoning: true,
      caching: false
    },
    pricing: {
      type: 'subscription'
    },
    documentation: 'https://docs.cline.dev'
  },

  'gemini-cli': {
    id: 'gemini-cli',
    name: 'Gemini CLI',
    description: 'Google Gemini via CLI for integrated access',
    category: 'cli',
    authType: 'cli',
    defaultModel: 'gemini-1.5-pro',
    supportedModels: {
      'gemini-1.5-pro': {
        maxTokens: 8192,
        contextWindow: 2097152,
        inputPrice: 0,
        outputPrice: 0,
        supportsImages: false,
        supportsTools: false,
        supportsStreaming: true
      }
    },
    features: {
      streaming: true,
      tools: false,
      images: false,
      reasoning: false,
      caching: false
    },
    pricing: {
      type: 'subscription'
    },
    setupInstructions: 'Install Google AI CLI and authenticate'
  },

  'github-copilot': {
    id: 'github-copilot',
    name: 'GitHub Copilot',
    description: 'GitHub Copilot via CLI for subscribers',
    category: 'cli',
    authType: 'cli',
    defaultModel: 'github-copilot',
    supportedModels: {
      'github-copilot': {
        maxTokens: 4096,
        contextWindow: 8192,
        inputPrice: 0,
        outputPrice: 0,
        supportsImages: false,
        supportsTools: false,
        supportsStreaming: false
      }
    },
    features: {
      streaming: false,
      tools: false,
      images: false,
      reasoning: false,
      caching: false
    },
    pricing: {
      type: 'subscription'
    },
    setupInstructions: 'Install GitHub CLI and authenticate with Copilot subscription'
  },

  'codex-cli': {
    id: 'codex-cli',
    name: 'Codex CLI',
    description: 'OpenAI Codex via CLI for Pro subscribers',
    category: 'cli',
    authType: 'cli',
    defaultModel: 'gpt-4o',
    supportedModels: {
      'gpt-4o': {
        maxTokens: 16384,
        contextWindow: 128000,
        inputPrice: 0,
        outputPrice: 0,
        supportsImages: false,
        supportsTools: false,
        supportsStreaming: true
      }
    },
    features: {
      streaming: true,
      tools: false,
      images: false,
      reasoning: false,
      caching: false
    },
    pricing: {
      type: 'subscription'
    },
    setupInstructions: 'Install Codex CLI and authenticate with Pro subscription'
  },


  'qwen-international': {
    id: 'qwen-international',
    name: 'Qwen (International)',
    description: 'Alibaba Qwen models for international markets',
    category: 'api',
    authType: 'api_key',
    tags: ['open-source', 'coding', 'fast-inference'],
    tier: 'standard',
    baseUrl: 'https://dashscope-intl.aliyuncs.com/api/v1',
    defaultModel: 'qwen-max',
    supportedModels: {
      'qwen-max': {
        maxTokens: 8192,
        contextWindow: 30720,
        inputPrice: 2.0,
        outputPrice: 6.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsTools: true,
        supportsStreaming: true
      },
      'qwen-max-longcontext': {
        maxTokens: 8192,
        contextWindow: 1000000,
        inputPrice: 2.0,
        outputPrice: 6.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsTools: true,
        supportsStreaming: true
      },
      'qwen-plus': {
        maxTokens: 8192,
        contextWindow: 1000000,
        inputPrice: 0.5,
        outputPrice: 1.5,
        supportsImages: false,
        supportsPromptCache: false,
        supportsTools: true,
        supportsStreaming: true
      },
      'qwen-turbo': {
        maxTokens: 8192,
        contextWindow: 1000000,
        inputPrice: 0.3,
        outputPrice: 0.6,
        supportsImages: false,
        supportsPromptCache: false,
        supportsTools: true,
        supportsStreaming: true
      }
    },
    features: {
      streaming: true,
      tools: true,
      images: false,
      reasoning: true,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'USD'
    },
    documentation: 'https://help.aliyun.com/zh/model-studio/getting-started/'
  },


}

export type ProviderId = keyof typeof PROVIDERS
export type ModelId = string

export interface ProviderConfig {
  id: ProviderId
  apiKey?: string
  baseUrl?: string
  modelId?: ModelId
  options?: ApiHandlerOptions
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | Array<{ type: 'text' | 'image'; text?: string; image_url?: string }>
  name?: string
  tool_calls?: any[]
  tool_call_id?: string
}

export interface ChatRequest {
  messages: ChatMessage[]
  model: string
  temperature?: number
  max_tokens?: number
  stream?: boolean
  tools?: any[]
}

export interface ChatResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: ChatMessage
    finish_reason: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface StreamChunk {
  type: 'text' | 'reasoning' | 'usage' | 'error'
  content: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

// Provider categorization and filtering
export type ProviderTag = 
  | 'core'           // Main providers (OpenAI, Anthropic, Google)
  | 'fast-inference' // High-speed providers (Groq, Cerebras)
  | 'enterprise'     // Enterprise-focused (Vertex, Bedrock, SAP)
  | 'open-source'    // Open source models
  | 'reasoning'      // Strong reasoning capabilities
  | 'vision'         // Image processing capabilities
  | 'coding'         // Optimized for coding tasks
  | 'experimental'   // Experimental or new models
  | 'local'          // Local/offline providers
  | 'privacy'        // Privacy-focused providers
  | 'cli'            // CLI-based access
  | 'cloud'          // Cloud platform integrations

export interface ProviderFilter {
  category?: string[]
  tags?: ProviderTag[]
  tier?: string[]
  features?: {
    streaming?: boolean
    tools?: boolean
    images?: boolean
    reasoning?: boolean
    caching?: boolean
  }
}

// Helper functions for provider categorization
export const PROVIDER_CATEGORIES = {
  'Core Providers': ['anthropic', 'openai', 'openai-native', 'gemini'],
  'Fast Inference': ['groq', 'cerebras', 'fireworks', 'together'],
  'Enterprise': ['vertex', 'bedrock', 'sapaicore', 'huawei-cloud-maas'],
  'Open Source': ['ollama', 'lmstudio', 'huggingface', 'together'],
  'CLI Tools': ['claude-code', 'gemini-cli', 'github-copilot', 'vscode-lm'],
  'Local/Privacy': ['ollama', 'lmstudio'],
  'Experimental': ['xai', 'gemini', 'deepseek']
} as const

export function filterProviders(providers: Record<string, ProviderConfiguration>, filter: ProviderFilter): Record<string, ProviderConfiguration> {
  return Object.fromEntries(
    Object.entries(providers).filter(([_, provider]) => {
      // Category filter
      if (filter.category && filter.category.length > 0) {
        if (!filter.category.includes(provider.category)) return false
      }

      // Tags filter
      if (filter.tags && filter.tags.length > 0) {
        if (!provider.tags || !filter.tags.some(tag => provider.tags!.includes(tag))) return false
      }

      // Tier filter
      if (filter.tier && filter.tier.length > 0) {
        if (!provider.tier || !filter.tier.includes(provider.tier)) return false
      }

      // Features filter
      if (filter.features) {
        if (filter.features.streaming !== undefined && provider.features.streaming !== filter.features.streaming) return false
        if (filter.features.tools !== undefined && provider.features.tools !== filter.features.tools) return false
        if (filter.features.images !== undefined && provider.features.images !== filter.features.images) return false
        if (filter.features.reasoning !== undefined && provider.features.reasoning !== filter.features.reasoning) return false
        if (filter.features.caching !== undefined && provider.features.caching !== filter.features.caching) return false
      }

      return true
    })
  )
}