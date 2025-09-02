// Updated providers configuration with OpenRouter integration
// Removes duplicates and adds comprehensive model support

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
  supportsReasoning?: boolean
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
  openRouterApiKey?: string
  
  // Base URLs and endpoints
  anthropicBaseUrl?: string
  openAiBaseUrl?: string
  googleBaseUrl?: string
  azureBaseUrl?: string
  groqBaseUrl?: string
  mistralBaseUrl?: string
  ollamaBaseUrl?: string
  lmStudioBaseUrl?: string
  openRouterBaseUrl?: string
  
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
  tags?: string[]
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
  icon?: string
  clickable?: boolean
  setupUrl?: string
}

// Updated PROVIDERS with OpenRouter integration and no duplicates
export const PROVIDERS: Record<string, ProviderConfiguration> = {
  // === OPENROUTER (Unified provider for all models) ===
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Access 300+ AI models from 50+ providers through one unified API',
    category: 'api',
    authType: 'api_key',
    tags: ['core', 'multi-provider', 'reasoning', 'vision', 'coding'],
    tier: 'premium',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openai/gpt-4o-mini',
    supportedModels: {
      // Featured models from OpenRouter
      'openai/gpt-4o': {
        maxTokens: 16384,
        contextWindow: 128000,
        inputPrice: 2.5,
        outputPrice: 10.0,
        supportsImages: true,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false
      },
      'openai/gpt-4o-mini': {
        maxTokens: 16384,
        contextWindow: 128000,
        inputPrice: 0.15,
        outputPrice: 0.6,
        supportsImages: true,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false
      },
      'openai/o1': {
        maxTokens: 65536,
        contextWindow: 200000,
        inputPrice: 15.0,
        outputPrice: 60.0,
        supportsImages: false,
        supportsTools: false,
        supportsStreaming: false,
        supportsReasoning: true
      },
      'openai/o1-mini': {
        maxTokens: 65536,
        contextWindow: 128000,
        inputPrice: 3.0,
        outputPrice: 12.0,
        supportsImages: false,
        supportsTools: false,
        supportsStreaming: false,
        supportsReasoning: true
      },
      'anthropic/claude-3-5-sonnet': {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: true,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true
      },
      'anthropic/claude-3-5-haiku': {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 0.25,
        outputPrice: 1.25,
        supportsImages: true,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false
      },
      'google/gemini-2.0-flash-exp': {
        maxTokens: 8192,
        contextWindow: 1048576,
        inputPrice: 0.3,
        outputPrice: 2.5,
        supportsImages: true,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false
      },
      'google/gemini-1.5-pro': {
        maxTokens: 8192,
        contextWindow: 2097152,
        inputPrice: 1.25,
        outputPrice: 5.0,
        supportsImages: true,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false
      },
      'deepseek/deepseek-v3.1': {
        maxTokens: 8192,
        contextWindow: 163840,
        inputPrice: 0.2,
        outputPrice: 0.8,
        supportsImages: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true
      },
      'x-ai/grok-2': {
        maxTokens: 8192,
        contextWindow: 131072,
        inputPrice: 2.0,
        outputPrice: 10.0,
        supportsImages: true,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false
      },
      'mistralai/mistral-large': {
        maxTokens: 32768,
        contextWindow: 32768,
        inputPrice: 2.0,
        outputPrice: 6.0,
        supportsImages: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false
      },
      'meta-llama/llama-3.1-70b': {
        maxTokens: 4096,
        contextWindow: 131072,
        inputPrice: 0.52,
        outputPrice: 0.75,
        supportsImages: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false
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
    documentation: 'https://openrouter.ai/docs',
    setupInstructions: 'Get your API key from https://openrouter.ai/keys',
    icon: '🌐',
    clickable: true,
    setupUrl: 'https://openrouter.ai/keys'
  },

  // === ANTHROPIC (Direct API) ===
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
    documentation: 'https://docs.anthropic.com',
    icon: '🧠',
    clickable: true,
    setupUrl: 'https://console.anthropic.com'
  },

  // === OPENAI (Direct API) ===
  openai: {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT models with cutting-edge AI capabilities',
    category: 'api',
    authType: 'api_key',
    tags: ['core', 'reasoning', 'vision', 'coding', 'audio'],
    tier: 'premium',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    supportedModels: {
      'gpt-4o': {
        maxTokens: 16384,
        contextWindow: 128000,
        inputPrice: 2.5,
        outputPrice: 10.0,
        supportsImages: true,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false
      },
      'gpt-4o-mini': {
        maxTokens: 16384,
        contextWindow: 128000,
        inputPrice: 0.15,
        outputPrice: 0.6,
        supportsImages: true,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false
      },
      'gpt-4o-audio': {
        maxTokens: 16384,
        contextWindow: 128000,
        inputPrice: 2.5,
        outputPrice: 10.0,
        supportsImages: true,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false
      },
      'o1': {
        maxTokens: 65536,
        contextWindow: 200000,
        inputPrice: 15.0,
        outputPrice: 60.0,
        supportsImages: false,
        supportsTools: false,
        supportsStreaming: false,
        supportsReasoning: true
      },
      'o1-mini': {
        maxTokens: 65536,
        contextWindow: 128000,
        inputPrice: 3.0,
        outputPrice: 12.0,
        supportsImages: false,
        supportsTools: false,
        supportsStreaming: false,
        supportsReasoning: true
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
    documentation: 'https://platform.openai.com/docs',
    icon: '🤖',
    clickable: true,
    setupUrl: 'https://platform.openai.com/api-keys'
  },

  // === GOOGLE ===
  google: {
    id: 'google',
    name: 'Google AI',
    description: 'Gemini models with multimodal capabilities',
    category: 'api',
    authType: 'api_key',
    tags: ['core', 'vision', 'coding', 'long-context'],
    tier: 'premium',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-2.0-flash-exp',
    supportedModels: {
      'gemini-2.0-flash-exp': {
        maxTokens: 8192,
        contextWindow: 1048576,
        inputPrice: 0.3,
        outputPrice: 2.5,
        supportsImages: true,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false
      },
      'gemini-1.5-pro': {
        maxTokens: 8192,
        contextWindow: 2097152,
        inputPrice: 1.25,
        outputPrice: 5.0,
        supportsImages: true,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false
      },
      'gemini-1.5-flash': {
        maxTokens: 8192,
        contextWindow: 1048576,
        inputPrice: 0.075,
        outputPrice: 0.3,
        supportsImages: true,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false
      }
    },
    features: {
      streaming: true,
      tools: true,
      images: true,
      reasoning: false,
      caching: true
    },
    pricing: {
      type: 'token_based',
      currency: 'USD'
    },
    documentation: 'https://ai.google.dev/docs',
    icon: '🔍',
    clickable: true,
    setupUrl: 'https://aistudio.google.com/app/apikey'
  },

  // === CLAUDE CODE (CLI) ===
  'claude-code': {
    id: 'claude-code',
    name: 'Claude Code',
    description: 'Claude via official Anthropic CLI',
    category: 'cli',
    authType: 'cli',
    tags: ['cli', 'coding', 'reasoning'],
    tier: 'premium',
    defaultModel: 'claude-3-5-sonnet-20241022',
    supportedModels: {
      'claude-3-5-sonnet-20241022': {
        maxTokens: 8192,
        contextWindow: 200000,
        supportsImages: true,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true
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
      type: 'subscription'
    },
    documentation: 'https://docs.anthropic.com/en/docs/claude-code',
    setupInstructions: 'Install Claude Code CLI and authenticate',
    icon: '💻',
    clickable: false
  },

  // === AZURE OPENAI ===
  'azure-openai': {
    id: 'azure-openai',
    name: 'Azure OpenAI',
    description: 'OpenAI models through Microsoft Azure',
    category: 'cloud',
    authType: 'api_key',
    tags: ['enterprise', 'vision', 'coding'],
    tier: 'premium',
    baseUrl: 'https://{resource-name}.openai.azure.com',
    defaultModel: 'gpt-4o',
    supportedModels: {
      'gpt-4o': {
        maxTokens: 16384,
        contextWindow: 128000,
        supportsImages: true,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false
      },
      'gpt-4o-mini': {
        maxTokens: 16384,
        contextWindow: 128000,
        supportsImages: true,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false
      },
      'gpt-4': {
        maxTokens: 8192,
        contextWindow: 128000,
        supportsImages: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false
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
      currency: 'USD'
    },
    documentation: 'https://docs.microsoft.com/azure/cognitive-services/openai/',
    icon: '☁️',
    clickable: true,
    setupUrl: 'https://portal.azure.com'
  },

  // === GROQ ===
  groq: {
    id: 'groq',
    name: 'Groq',
    description: 'Ultra-fast inference for open-source models',
    category: 'api',
    authType: 'api_key',
    tags: ['fast-inference', 'open-source'],
    tier: 'standard',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.1-70b-versatile',
    supportedModels: {
      'llama-3.1-70b-versatile': {
        maxTokens: 8192,
        contextWindow: 131072,
        inputPrice: 0.59,
        outputPrice: 0.79,
        supportsImages: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false
      },
      'llama-3.1-8b-instant': {
        maxTokens: 8192,
        contextWindow: 131072,
        inputPrice: 0.05,
        outputPrice: 0.08,
        supportsImages: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false
      },
      'mixtral-8x7b-32768': {
        maxTokens: 32768,
        contextWindow: 32768,
        inputPrice: 0.24,
        outputPrice: 0.24,
        supportsImages: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false
      },
      'gemma2-9b-it': {
        maxTokens: 8192,
        contextWindow: 8192,
        inputPrice: 0.20,
        outputPrice: 0.20,
        supportsImages: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false
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
    documentation: 'https://console.groq.com/docs',
    icon: '⚡',
    clickable: true,
    setupUrl: 'https://console.groq.com/keys'
  },

  // === MISTRAL AI ===
  mistral: {
    id: 'mistral',
    name: 'Mistral AI',
    description: 'Efficient multilingual models',
    category: 'api',
    authType: 'api_key',
    tags: ['core', 'multilingual', 'coding'],
    tier: 'standard',
    baseUrl: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-large-latest',
    supportedModels: {
      'mistral-large-latest': {
        maxTokens: 8192,
        contextWindow: 128000,
        inputPrice: 2.0,
        outputPrice: 6.0,
        supportsImages: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false
      },
      'mistral-medium-latest': {
        maxTokens: 8192,
        contextWindow: 32000,
        inputPrice: 0.7,
        outputPrice: 2.1,
        supportsImages: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false
      },
      'mistral-small-latest': {
        maxTokens: 8192,
        contextWindow: 32000,
        inputPrice: 0.2,
        outputPrice: 0.6,
        supportsImages: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false
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
    documentation: 'https://docs.mistral.ai',
    icon: '💨',
    clickable: true,
    setupUrl: 'https://console.mistral.ai'
  },

  // === TOGETHER AI ===
  together: {
    id: 'together',
    name: 'Together AI',
    description: 'Fast inference for open-source models',
    category: 'api',
    authType: 'api_key',
    tags: ['open-source', 'fast-inference'],
    tier: 'standard',
    baseUrl: 'https://api.together.xyz/v1',
    defaultModel: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
    supportedModels: {
      'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo': {
        maxTokens: 8192,
        contextWindow: 131072,
        inputPrice: 0.9,
        outputPrice: 0.9,
        supportsImages: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false
      },
      'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo': {
        maxTokens: 8192,
        contextWindow: 131072,
        inputPrice: 0.2,
        outputPrice: 0.2,
        supportsImages: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false
      },
      'mistralai/Mixtral-8x7B-Instruct-v0.1': {
        maxTokens: 8192,
        contextWindow: 32768,
        inputPrice: 0.6,
        outputPrice: 0.6,
        supportsImages: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false
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
    documentation: 'https://docs.together.ai',
    icon: '🔗',
    clickable: true,
    setupUrl: 'https://api.together.xyz/settings/api-keys'
  },

  // === FIREWORKS AI ===
  fireworks: {
    id: 'fireworks',
    name: 'Fireworks AI',
    description: 'Fast inference for generative AI models',
    category: 'api',
    authType: 'api_key',
    tags: ['fast-inference', 'open-source'],
    tier: 'standard',
    baseUrl: 'https://api.fireworks.ai/inference/v1',
    defaultModel: 'accounts/fireworks/models/llama-v3p1-70b-instruct',
    supportedModels: {
      'accounts/fireworks/models/llama-v3p1-70b-instruct': {
        maxTokens: 8192,
        contextWindow: 131072,
        inputPrice: 0.9,
        outputPrice: 0.9,
        supportsImages: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false
      },
      'accounts/fireworks/models/llama-v3p1-8b-instruct': {
        maxTokens: 8192,
        contextWindow: 131072,
        inputPrice: 0.2,
        outputPrice: 0.2,
        supportsImages: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false
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
    documentation: 'https://docs.fireworks.ai',
    icon: '🔥',
    clickable: true,
    setupUrl: 'https://fireworks.ai/api-keys'
  },

  // === DEEPSEEK ===
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'Advanced reasoning models',
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
        supportsImages: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true
      },
      'deepseek-coder': {
        maxTokens: 8192,
        contextWindow: 16000,
        inputPrice: 0.14,
        outputPrice: 0.28,
        supportsImages: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false
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
    documentation: 'https://api-docs.deepseek.com',
    icon: '🌊',
    clickable: true,
    setupUrl: 'https://platform.deepseek.com/api_keys'
  },

  // === XAI ===
  xai: {
    id: 'xai',
    name: 'xAI',
    description: 'Grok models with real-time knowledge',
    category: 'api',
    authType: 'api_key',
    tags: ['reasoning', 'real-time'],
    tier: 'premium',
    baseUrl: 'https://api.x.ai/v1',
    defaultModel: 'grok-beta',
    supportedModels: {
      'grok-beta': {
        maxTokens: 8192,
        contextWindow: 131072,
        inputPrice: 5.0,
        outputPrice: 15.0,
        supportsImages: true,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false
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
    documentation: 'https://docs.x.ai',
    icon: '✖️',
    clickable: true,
    setupUrl: 'https://console.x.ai'
  },

  // === OLLAMA (LOCAL) ===
  ollama: {
    id: 'ollama',
    name: 'Ollama',
    description: 'Run large language models locally',
    category: 'local',
    authType: 'local',
    tags: ['local', 'open-source', 'privacy'],
    tier: 'community',
    baseUrl: 'http://localhost:11434',
    defaultModel: 'llama3.2',
    supportedModels: {
      'llama3.2': {
        maxTokens: 2048,
        contextWindow: 8192,
        supportsImages: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false
      },
      'llama3.2:90b': {
        maxTokens: 2048,
        contextWindow: 8192,
        supportsImages: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false
      },
      'codellama': {
        maxTokens: 2048,
        contextWindow: 16384,
        supportsImages: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false
      },
      'mixtral': {
        maxTokens: 2048,
        contextWindow: 32768,
        supportsImages: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false
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
    documentation: 'https://ollama.com/docs',
    setupInstructions: 'Install Ollama and pull your desired models',
    icon: '🏠',
    clickable: false
  },

  // === LM STUDIO (LOCAL) ===
  lmstudio: {
    id: 'lmstudio',
    name: 'LM Studio',
    description: 'Local LLM hosting with GUI',
    category: 'local',
    authType: 'local',
    tags: ['local', 'gui', 'open-source'],
    tier: 'community',
    baseUrl: 'http://localhost:1234',
    defaultModel: 'local-model',
    supportedModels: {
      'local-model': {
        maxTokens: 2048,
        contextWindow: 8192,
        supportsImages: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false
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
    documentation: 'https://lmstudio.ai/docs',
    setupInstructions: 'Download and install LM Studio, then load your model',
    icon: '🖥️',
    clickable: false
  }
}

// Provider tags for filtering
export type ProviderTag = 
  | 'core'           // Main providers
  | 'multi-provider' // OpenRouter-style aggregators  
  | 'reasoning'      // Models with reasoning capabilities
  | 'vision'         // Multimodal image support
  | 'coding'         // Optimized for code
  | 'audio'          // Audio input/output
  | 'long-context'   // Extended context windows
  | 'cli'            // CLI-based access
  | 'experimental'   // Beta/preview models
  | 'enterprise'     // Enterprise features
  | 'open-source'    // Open source models
  | 'fast-inference' // Optimized for speed
  | 'multilingual'   // Multiple language support
  | 'real-time'      // Real-time data access
  | 'local'          // Local deployment
  | 'gui'            // GUI applications
  | 'privacy'        // Privacy-focused

// Provider categories
export const PROVIDER_CATEGORIES = {
  'Core Providers': ['openrouter', 'anthropic', 'openai', 'google'],
  'Cloud Providers': ['azure-openai'],
  'Fast Inference': ['groq', 'together', 'fireworks'],
  'Specialized': ['mistral', 'deepseek', 'xai'],
  'Local Models': ['ollama', 'lmstudio'],
  'CLI Tools': ['claude-code'],
} as const

// Get provider by ID with error handling
export function getProvider(id: string): ProviderConfiguration | null {
  return PROVIDERS[id] || null
}

// Get all providers in a category
export function getProvidersByCategory(category: keyof typeof PROVIDER_CATEGORIES): ProviderConfiguration[] {
  return PROVIDER_CATEGORIES[category].map(id => PROVIDERS[id]).filter(Boolean)
}

// Search providers by tag
export function getProvidersByTag(tag: ProviderTag): ProviderConfiguration[] {
  return Object.values(PROVIDERS).filter(provider => 
    provider.tags?.includes(tag)
  )
}

// Check if provider supports feature
export function providerSupportsFeature(providerId: string, feature: keyof ProviderConfiguration['features']): boolean {
  const provider = getProvider(providerId)
  return provider?.features[feature] ?? false
}

// Get clickable providers only
export function getClickableProviders(): ProviderConfiguration[] {
  return Object.values(PROVIDERS).filter(provider => provider.clickable === true)
}

// Get provider setup URL
export function getProviderSetupUrl(providerId: string): string | null {
  const provider = getProvider(providerId)
  return provider?.setupUrl || null
}