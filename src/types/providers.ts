// INTELLIGENT PROVIDER ARCHITECTURE
// Combines Direct API Providers (fast inference) + OpenRouter Providers (comprehensive models)
// Architecture: Direct APIs have priority, OpenRouter provides fallback/additional models

export interface ModelInfo {
  maxTokens: number
  contextWindow: number
  inputPrice?: number  // per million tokens
  outputPrice?: number // per million tokens
  cacheWritePrice?: number
  cacheReadPrice?: number
  supportsImages?: boolean
  supportsAudio?: boolean
  supportsPromptCache?: boolean
  supportsTools?: boolean
  supportsStreaming?: boolean
  supportsReasoning?: boolean
  description?: string
}

export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string | MessageContent[]
}

export interface MessageContent {
  type: 'text' | 'image'
  text?: string
  source?: {
    type: 'base64'
    media_type: string
    data: string
  }
}

export interface ApiHandlerOptions {
  apiKey?: string
  baseUrl?: string
  model?: string
  temperature?: number
  maxTokens?: number
  topP?: number
  stream?: boolean
  messages?: Message[]
  tools?: any[]
  // Azure-specific
  openAiApiKey?: string
  openAiBaseUrl?: string
  azureApiVersion?: string
  // Additional provider-specific options
  [key: string]: any
}

export interface ProviderConfiguration {
  id: string
  name: string
  description: string
  category: 'api' | 'openrouter'
  authType: 'api_key'
  tags: string[]
  tier: 'premium' | 'standard' | 'community'
  baseUrl: string
  openRouterUrl: string // Always available via OpenRouter
  defaultModel?: string
  supportedModels: Record<string, ModelInfo>
  modelCount: number
  features: {
    streaming: boolean
    tools: boolean
    images: boolean
    audio: boolean
    reasoning: boolean
    caching: boolean
  }
  pricing: {
    type: 'token_based'
    currency: 'USD'
  }
  documentation?: string
  setupInstructions?: string
  iconUrl: string
  clickable: boolean
}

// INTELLIGENT PROVIDER CONFIGURATION
// Direct API providers listed first for optimal performance
export const PROVIDERS: Record<string, ProviderConfiguration> = {

  'groq': {
    id: 'groq',
    name: 'Groq',
    description: 'Ultra-fast LLM inference with GroqChip technology',
    category: 'api',
    authType: 'api_key',
    tags: ['fast', 'inference', 'tools', 'low-latency'],
    tier: 'premium',
    baseUrl: 'https://api.groq.com/openai/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    modelCount: 5,
    supportedModels: {
      'llama-3.3-70b-versatile': {
        maxTokens: 8000,
        contextWindow: 131072,
        inputPrice: 0.59,
        outputPrice: 0.79,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: ''
      },
      'llama-3.1-70b-versatile': {
        maxTokens: 8000,
        contextWindow: 131072,
        inputPrice: 0.59,
        outputPrice: 0.79,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: ''
      },
      'llama-3.1-8b-instant': {
        maxTokens: 8000,
        contextWindow: 131072,
        inputPrice: 0.05,
        outputPrice: 0.08,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: ''
      },
      'mixtral-8x7b-32768': {
        maxTokens: 32768,
        contextWindow: 32768,
        inputPrice: 0.24,
        outputPrice: 0.24,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: ''
      },
      'gemma2-9b-it': {
        maxTokens: 8192,
        contextWindow: 8192,
        inputPrice: 0.2,
        outputPrice: 0.2,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: ''
      }
    },
    features: {
      streaming: true,
      tools: true,
      images: false,
      audio: false,
      reasoning: true,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'USD'
    },
    documentation: 'https://docs.groq.ai',
    setupInstructions: 'Get your API key from the Groq console',
    iconUrl: 'https://groq.com/wp-content/uploads/2024/03/PBG-mark1-color.svg',
    clickable: true
  },

  'cerebras': {
    id: 'cerebras',
    name: 'Cerebras',
    description: 'Fastest inference powered by Cerebras CS-3 chips',
    category: 'api',
    authType: 'api_key',
    tags: ['fast', 'inference', 'tools', 'reasoning'],
    tier: 'premium',
    baseUrl: 'https://api.cerebras.ai/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'llama3.1-70b',
    modelCount: 3,
    supportedModels: {
      'llama3.1-70b': {
        maxTokens: 8192,
        contextWindow: 131072,
        inputPrice: 0.6,
        outputPrice: 0.6,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: ''
      },
      'llama3.1-8b': {
        maxTokens: 8192,
        contextWindow: 131072,
        inputPrice: 0.1,
        outputPrice: 0.1,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: ''
      },
      'llama3.1-405b': {
        maxTokens: 8192,
        contextWindow: 131072,
        inputPrice: 2.6,
        outputPrice: 2.6,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: ''
      }
    },
    features: {
      streaming: true,
      tools: true,
      images: false,
      audio: false,
      reasoning: true,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'USD'
    },
    documentation: 'https://docs.cerebras.ai',
    setupInstructions: 'Get your API key from the Cerebras console',
    iconUrl: 'https://cerebras.ai/wp-content/uploads/2021/06/Cerebras_Logomark_Icon_FullColor.svg',
    clickable: true
  },

  'fireworks': {
    id: 'fireworks',
    name: 'Fireworks',
    description: 'Fast and optimized model inference',
    category: 'api',
    authType: 'api_key',
    tags: ['fast', 'inference', 'tools', 'vision'],
    tier: 'standard',
    baseUrl: 'https://api.fireworks.ai/inference/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'accounts/fireworks/models/llama-v3p1-70b-instruct',
    modelCount: 2,
    supportedModels: {
      'accounts/fireworks/models/llama-v3p1-70b-instruct': {
        maxTokens: 4096,
        contextWindow: 131072,
        inputPrice: 0.9,
        outputPrice: 0.9,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: ''
      },
      'accounts/fireworks/models/llama-v3p1-8b-instruct': {
        maxTokens: 4096,
        contextWindow: 131072,
        inputPrice: 0.2,
        outputPrice: 0.2,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: ''
      }
    },
    features: {
      streaming: true,
      tools: true,
      images: false,
      audio: false,
      reasoning: true,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'USD'
    },
    documentation: 'https://docs.fireworks.ai',
    setupInstructions: 'Get your API key from the Fireworks console',
    iconUrl: 'https://docs.fireworks.ai/img/logo.svg',
    clickable: true
  },

  'together': {
    id: 'together',
    name: 'Together',
    description: 'Open source models and fast inference',
    category: 'api',
    authType: 'api_key',
    tags: ['open-source', 'inference', 'tools', 'reasoning'],
    tier: 'standard',
    baseUrl: 'https://api.together.xyz/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
    modelCount: 2,
    supportedModels: {
      'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo': {
        maxTokens: 4096,
        contextWindow: 131072,
        inputPrice: 0.88,
        outputPrice: 0.88,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: ''
      },
      'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo': {
        maxTokens: 4096,
        contextWindow: 131072,
        inputPrice: 0.18,
        outputPrice: 0.18,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: ''
      }
    },
    features: {
      streaming: true,
      tools: true,
      images: false,
      audio: false,
      reasoning: true,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'USD'
    },
    documentation: 'https://docs.together.ai',
    setupInstructions: 'Get your API key from the Together console',
    iconUrl: 'https://assets.together.ai/logo/together-logomark-color.svg',
    clickable: true
  },

  'openai': {
    id: 'openai',
    name: 'OpenAI',
    description: 'OpenAI models with comprehensive AI capabilities',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'vision', 'tools', 'reasoning', 'core'],
    tier: 'premium',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openai/gpt-4o-audio-preview',
    modelCount: 42,
    supportedModels: {
      'openai/gpt-4o-audio-preview': {
        maxTokens: 16384,
        contextWindow: 128000,
        inputPrice: 2.5,
        outputPrice: 10.0,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'The gpt-4o-audio-preview model adds support for audio inputs as prompts'
      },
      'openai/gpt-5-chat': {
        maxTokens: 16384,
        contextWindow: 128000,
        inputPrice: 1.25,
        outputPrice: 10.0,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'GPT-5 Chat is designed for advanced, natural, multimodal, and context-aware conversations for enterprise applications'
      }
      // ... and 40 more models
    },
    features: {
      streaming: true,
      tools: true,
      images: true,
      audio: false,
      reasoning: true,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'USD'
    },
    documentation: 'https://openrouter.ai/docs',
    setupInstructions: 'Get your API key from https://openrouter.ai/keys',
    iconUrl: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/openai.svg',
    clickable: true
  },

  'anthropic': {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Anthropic models with comprehensive AI capabilities',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'vision', 'tools', 'reasoning', 'core'],
    tier: 'premium',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'anthropic/claude-opus-4.1',
    modelCount: 11,
    supportedModels: {
      'anthropic/claude-opus-4.1': {
        maxTokens: 32000,
        contextWindow: 200000,
        inputPrice: 15.0,
        outputPrice: 75.0,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Claude Opus 4'
      },
      'anthropic/claude-opus-4': {
        maxTokens: 32000,
        contextWindow: 200000,
        inputPrice: 15.0,
        outputPrice: 75.0,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Claude Opus 4 is benchmarked as the world’s best coding model, at time of release, bringing sustained performance on complex, long-running tasks and agent workflows'
      }
      // ... and 9 more models
    },
    features: {
      streaming: true,
      tools: true,
      images: true,
      audio: false,
      reasoning: true,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'USD'
    },
    documentation: 'https://openrouter.ai/docs',
    setupInstructions: 'Get your API key from https://openrouter.ai/keys',
    iconUrl: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/anthropic.svg',
    clickable: true
  },

  'google': {
    id: 'google',
    name: 'Google',
    description: 'Google models with comprehensive AI capabilities',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'vision', 'tools', 'reasoning', 'core'],
    tier: 'premium',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'google/gemini-2.5-flash-image-preview:free',
    modelCount: 27,
    supportedModels: {
      'google/gemini-2.5-flash-image-preview:free': {
        maxTokens: 8192,
        contextWindow: 32768,
        inputPrice: undefined,
        outputPrice: undefined,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Gemini 2'
      },
      'google/gemini-2.5-flash-image-preview': {
        maxTokens: 8192,
        contextWindow: 32768,
        inputPrice: 0.3,
        outputPrice: 2.5,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Gemini 2'
      }
      // ... and 25 more models
    },
    features: {
      streaming: true,
      tools: true,
      images: true,
      audio: false,
      reasoning: true,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'USD'
    },
    documentation: 'https://openrouter.ai/docs',
    setupInstructions: 'Get your API key from https://openrouter.ai/keys',
    iconUrl: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/google.svg',
    clickable: true
  },

  'meta-llama': {
    id: 'meta-llama',
    name: 'Meta-Llama',
    description: 'Meta-Llama models with comprehensive AI capabilities',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'vision', 'tools'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'meta-llama/llama-3.3-8b-instruct:free',
    modelCount: 22,
    supportedModels: {
      'meta-llama/llama-3.3-8b-instruct:free': {
        maxTokens: 4028,
        contextWindow: 128000,
        inputPrice: undefined,
        outputPrice: undefined,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'A lightweight and ultra-fast variant of Llama 3'
      },
      'meta-llama/llama-guard-4-12b': {
        maxTokens: 4096,
        contextWindow: 163840,
        inputPrice: 0.18,
        outputPrice: 0.18,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Llama Guard 4 is a Llama 4 Scout-derived multimodal pretrained model, fine-tuned for content safety classification'
      }
      // ... and 20 more models
    },
    features: {
      streaming: true,
      tools: true,
      images: true,
      audio: false,
      reasoning: false,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'USD'
    },
    documentation: 'https://openrouter.ai/docs',
    setupInstructions: 'Get your API key from https://openrouter.ai/keys',
    iconUrl: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/meta.svg',
    clickable: true
  },

  'mistralai': {
    id: 'mistralai',
    name: 'Mistralai',
    description: 'Mistralai models with comprehensive AI capabilities',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'vision', 'tools', 'reasoning'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'mistralai/mistral-medium-3.1',
    modelCount: 35,
    supportedModels: {
      'mistralai/mistral-medium-3.1': {
        maxTokens: 4096,
        contextWindow: 131072,
        inputPrice: 0.4,
        outputPrice: 2.0,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Mistral Medium 3'
      },
      'mistralai/codestral-2508': {
        maxTokens: 4096,
        contextWindow: 256000,
        inputPrice: 0.3,
        outputPrice: 0.9,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Mistral cutting-edge language model for coding released end of July 2025'
      }
      // ... and 33 more models
    },
    features: {
      streaming: true,
      tools: true,
      images: true,
      audio: false,
      reasoning: true,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'USD'
    },
    documentation: 'https://openrouter.ai/docs',
    setupInstructions: 'Get your API key from https://openrouter.ai/keys',
    iconUrl: 'https://docs.mistral.ai/img/mistral.svg',
    clickable: true
  },

  'deepseek': {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'DeepSeek models with comprehensive AI capabilities',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'tools', 'reasoning'],
    tier: 'premium',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'deepseek/deepseek-chat-v3.1:free',
    modelCount: 19,
    supportedModels: {
      'deepseek/deepseek-chat-v3.1:free': {
        maxTokens: 4096,
        contextWindow: 64000,
        inputPrice: undefined,
        outputPrice: undefined,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'DeepSeek-V3'
      },
      'deepseek/deepseek-chat-v3.1': {
        maxTokens: 4096,
        contextWindow: 163840,
        inputPrice: 0.2,
        outputPrice: 0.8,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'DeepSeek-V3'
      }
      // ... and 17 more models
    },
    features: {
      streaming: true,
      tools: true,
      images: false,
      audio: false,
      reasoning: true,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'USD'
    },
    documentation: 'https://openrouter.ai/docs',
    setupInstructions: 'Get your API key from https://openrouter.ai/keys',
    iconUrl: 'https://api.deepseek.com/v1/logo.svg',
    clickable: true
  },

  'x-ai': {
    id: 'x-ai',
    name: 'X-Ai',
    description: 'X-Ai models with comprehensive AI capabilities',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'vision', 'tools', 'reasoning'],
    tier: 'premium',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'x-ai/grok-code-fast-1',
    modelCount: 9,
    supportedModels: {
      'x-ai/grok-code-fast-1': {
        maxTokens: 10000,
        contextWindow: 256000,
        inputPrice: 0.2,
        outputPrice: 1.5,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Grok Code Fast 1 is a speedy and economical reasoning model that excels at agentic coding'
      },
      'x-ai/grok-4': {
        maxTokens: 4096,
        contextWindow: 256000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Grok 4 is xAI latest reasoning model with a 256k context window'
      }
      // ... and 7 more models
    },
    features: {
      streaming: true,
      tools: true,
      images: true,
      audio: false,
      reasoning: true,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'USD'
    },
    documentation: 'https://openrouter.ai/docs',
    setupInstructions: 'Get your API key from https://openrouter.ai/keys',
    iconUrl: 'https://x.ai/favicon.ico',
    clickable: true
  },

  'cohere': {
    id: 'cohere',
    name: 'Cohere',
    description: 'Cohere models with comprehensive AI capabilities',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'tools'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'cohere/command-a',
    modelCount: 9,
    supportedModels: {
      'cohere/command-a': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 2.0,
        outputPrice: 8.0,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Command A is an open-weights 111B parameter model with a 256k context window focused on delivering great performance across agentic, multilingual, and coding use cases'
      },
      'cohere/command-r7b-12-2024': {
        maxTokens: 4000,
        contextWindow: 128000,
        inputPrice: 0.0375,
        outputPrice: 0.15,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Command R7B (12-2024) is a small, fast update of the Command R+ model, delivered in December 2024'
      }
      // ... and 7 more models
    },
    features: {
      streaming: true,
      tools: true,
      images: false,
      audio: false,
      reasoning: false,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'USD'
    },
    documentation: 'https://openrouter.ai/docs',
    setupInstructions: 'Get your API key from https://openrouter.ai/keys',
    iconUrl: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/cohere.svg',
    clickable: true
  },

  'perplexity': {
    id: 'perplexity',
    name: 'Perplexity',
    description: 'Perplexity models with comprehensive AI capabilities',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'vision', 'reasoning'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'perplexity/sonar-reasoning-pro',
    modelCount: 6,
    supportedModels: {
      'perplexity/sonar-reasoning-pro': {
        maxTokens: 4096,
        contextWindow: 128000,
        inputPrice: 2.0,
        outputPrice: 8.0,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Note: Sonar Pro pricing includes Perplexity search pricing'
      },
      'perplexity/sonar-pro': {
        maxTokens: 8000,
        contextWindow: 200000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Note: Sonar Pro pricing includes Perplexity search pricing'
      }
      // ... and 4 more models
    },
    features: {
      streaming: true,
      tools: false,
      images: true,
      audio: false,
      reasoning: true,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'USD'
    },
    documentation: 'https://openrouter.ai/docs',
    setupInstructions: 'Get your API key from https://openrouter.ai/keys',
    iconUrl: 'https://www.perplexity.ai/favicon.svg',
    clickable: true
  },

  'deepcogito': {
    id: 'deepcogito',
    name: 'Deepcogito',
    description: 'Deepcogito models with comprehensive AI capabilities',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'vision', 'tools', 'reasoning'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'deepcogito/cogito-v2-preview-llama-109b-moe',
    modelCount: 2,
    supportedModels: {
      'deepcogito/cogito-v2-preview-llama-109b-moe': {
        maxTokens: 4096,
        contextWindow: 32767,
        inputPrice: 0.18,
        outputPrice: 0.59,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'An instruction-tuned, hybrid-reasoning Mixture-of-Experts model built on Llama-4-Scout-17B-16E'
      },
      'deepcogito/cogito-v2-preview-deepseek-671b': {
        maxTokens: 4096,
        contextWindow: 163840,
        inputPrice: 1.25,
        outputPrice: 1.25,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Cogito v2 is a multilingual, instruction-tuned Mixture of Experts (MoE) large language model with 671 billion parameters'
      }
      // ... and 0 more models
    },
    features: {
      streaming: true,
      tools: true,
      images: true,
      audio: false,
      reasoning: true,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'USD'
    },
    documentation: 'https://openrouter.ai/docs',
    setupInstructions: 'Get your API key from https://openrouter.ai/keys',
    iconUrl: 'https://ui-avatars.com/api/?name=D&background=6366f1&color=white',
    clickable: true
  },

  'qwen': {
    id: 'qwen',
    name: 'Qwen',
    description: 'Qwen models with comprehensive AI capabilities',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'vision', 'tools', 'reasoning'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'qwen/qwen3-30b-a3b-thinking-2507',
    modelCount: 35,
    supportedModels: {
      'qwen/qwen3-30b-a3b-thinking-2507': {
        maxTokens: 262144,
        contextWindow: 262144,
        inputPrice: 0.0713,
        outputPrice: 0.2852,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Qwen3-30B-A3B-Thinking-2507 is a 30B parameter Mixture-of-Experts reasoning model optimized for complex tasks requiring extended multi-step thinking'
      },
      'qwen/qwen3-coder-30b-a3b-instruct': {
        maxTokens: 4096,
        contextWindow: 262144,
        inputPrice: 0.051831,
        outputPrice: 0.207424,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Qwen3-Coder-30B-A3B-Instruct is a 30'
      }
      // ... and 33 more models
    },
    features: {
      streaming: true,
      tools: true,
      images: true,
      audio: false,
      reasoning: true,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'USD'
    },
    documentation: 'https://openrouter.ai/docs',
    setupInstructions: 'Get your API key from https://openrouter.ai/keys',
    iconUrl: 'https://qianwen.alibabacloud.com/favicon.ico',
    clickable: true
  },

  'nousresearch': {
    id: 'nousresearch',
    name: 'Nousresearch',
    description: 'Nousresearch models with comprehensive AI capabilities',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'tools', 'reasoning'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'nousresearch/hermes-4-70b',
    modelCount: 7,
    supportedModels: {
      'nousresearch/hermes-4-70b': {
        maxTokens: 4096,
        contextWindow: 131072,
        inputPrice: 0.093295,
        outputPrice: 0.373363,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Hermes 4 70B is a hybrid reasoning model from Nous Research, built on Meta-Llama-3'
      },
      'nousresearch/hermes-4-405b': {
        maxTokens: 4096,
        contextWindow: 131072,
        inputPrice: 0.199919,
        outputPrice: 0.800064,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Hermes 4 is a large-scale reasoning model built on Meta-Llama-3'
      }
      // ... and 5 more models
    },
    features: {
      streaming: true,
      tools: true,
      images: false,
      audio: false,
      reasoning: true,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'USD'
    },
    documentation: 'https://openrouter.ai/docs',
    setupInstructions: 'Get your API key from https://openrouter.ai/keys',
    iconUrl: 'https://avatars.githubusercontent.com/u/97659429?s=200&v=4',
    clickable: true
  },

  'baidu': {
    id: 'baidu',
    name: 'Baidu',
    description: 'Baidu models with comprehensive AI capabilities',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'vision', 'reasoning'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'baidu/ernie-4.5-21b-a3b',
    modelCount: 4,
    supportedModels: {
      'baidu/ernie-4.5-21b-a3b': {
        maxTokens: 8000,
        contextWindow: 120000,
        inputPrice: 0.07,
        outputPrice: 0.28,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'A sophisticated text-based Mixture-of-Experts (MoE) model featuring 21B total parameters with 3B activated per token, delivering exceptional multimodal understanding and generation through heterogeneous MoE structures and modality-isolated routing'
      },
      'baidu/ernie-4.5-vl-28b-a3b': {
        maxTokens: 8000,
        contextWindow: 30000,
        inputPrice: 0.14,
        outputPrice: 0.56,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'A powerful multimodal Mixture-of-Experts chat model featuring 28B total parameters with 3B activated per token, delivering exceptional text and vision understanding through its innovative heterogeneous MoE structure with modality-isolated routing'
      }
      // ... and 2 more models
    },
    features: {
      streaming: true,
      tools: false,
      images: true,
      audio: false,
      reasoning: true,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'USD'
    },
    documentation: 'https://openrouter.ai/docs',
    setupInstructions: 'Get your API key from https://openrouter.ai/keys',
    iconUrl: 'https://ui-avatars.com/api/?name=B&background=6366f1&color=white',
    clickable: true
  },

  'z-ai': {
    id: 'z-ai',
    name: 'Z.AI',
    description: 'Z.AI models with comprehensive AI capabilities',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'vision', 'tools', 'reasoning'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'z-ai/glm-4.5v',
    modelCount: 5,
    supportedModels: {
      'z-ai/glm-4.5v': {
        maxTokens: 65536,
        contextWindow: 65536,
        inputPrice: 0.5,
        outputPrice: 1.8,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'GLM-4'
      },
      'z-ai/glm-4.5': {
        maxTokens: 4096,
        contextWindow: 131072,
        inputPrice: 0.329866,
        outputPrice: 1.320106,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'GLM-4'
      }
      // ... and 3 more models
    },
    features: {
      streaming: true,
      tools: true,
      images: true,
      audio: false,
      reasoning: true,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'USD'
    },
    documentation: 'https://openrouter.ai/docs',
    setupInstructions: 'Get your API key from https://openrouter.ai/keys',
    iconUrl: 'https://ui-avatars.com/api/?name=Z&background=6366f1&color=white',
    clickable: true
  },

  'ai21': {
    id: 'ai21',
    name: 'AI21',
    description: 'AI21 models with comprehensive AI capabilities',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'tools'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'ai21/jamba-mini-1.7',
    modelCount: 2,
    supportedModels: {
      'ai21/jamba-mini-1.7': {
        maxTokens: 4096,
        contextWindow: 256000,
        inputPrice: 0.2,
        outputPrice: 0.4,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Jamba Mini 1'
      },
      'ai21/jamba-large-1.7': {
        maxTokens: 4096,
        contextWindow: 256000,
        inputPrice: 2.0,
        outputPrice: 8.0,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Jamba Large 1'
      }
      // ... and 0 more models
    },
    features: {
      streaming: true,
      tools: true,
      images: false,
      audio: false,
      reasoning: false,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'USD'
    },
    documentation: 'https://openrouter.ai/docs',
    setupInstructions: 'Get your API key from https://openrouter.ai/keys',
    iconUrl: 'https://ui-avatars.com/api/?name=A&background=6366f1&color=white',
    clickable: true
  },

  'bytedance': {
    id: 'bytedance',
    name: 'Bytedance',
    description: 'Bytedance models with comprehensive AI capabilities',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'vision'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'bytedance/ui-tars-1.5-7b',
    modelCount: 1,
    supportedModels: {
      'bytedance/ui-tars-1.5-7b': {
        maxTokens: 2048,
        contextWindow: 128000,
        inputPrice: 0.1,
        outputPrice: 0.2,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'UI-TARS-1'
      }
      // ... and -1 more models
    },
    features: {
      streaming: true,
      tools: false,
      images: true,
      audio: false,
      reasoning: false,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'USD'
    },
    documentation: 'https://openrouter.ai/docs',
    setupInstructions: 'Get your API key from https://openrouter.ai/keys',
    iconUrl: 'https://ui-avatars.com/api/?name=B&background=6366f1&color=white',
    clickable: true
  },

  'switchpoint': {
    id: 'switchpoint',
    name: 'Switchpoint',
    description: 'Switchpoint models with comprehensive AI capabilities',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'reasoning'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'switchpoint/router',
    modelCount: 1,
    supportedModels: {
      'switchpoint/router': {
        maxTokens: 4096,
        contextWindow: 131072,
        inputPrice: 0.85,
        outputPrice: 3.4,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Switchpoint AI router instantly analyzes your request and directs it to the optimal AI from an ever-evolving library'
      }
      // ... and -1 more models
    },
    features: {
      streaming: true,
      tools: false,
      images: false,
      audio: false,
      reasoning: true,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'USD'
    },
    documentation: 'https://openrouter.ai/docs',
    setupInstructions: 'Get your API key from https://openrouter.ai/keys',
    iconUrl: 'https://ui-avatars.com/api/?name=S&background=6366f1&color=white',
    clickable: true
  },

  'moonshotai': {
    id: 'moonshotai',
    name: 'Moonshot AI',
    description: 'Moonshot AI models with comprehensive AI capabilities',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'vision', 'tools', 'reasoning'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'moonshotai/kimi-k2:free',
    modelCount: 6,
    supportedModels: {
      'moonshotai/kimi-k2:free': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: undefined,
        outputPrice: undefined,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Kimi K2 Instruct is a large-scale Mixture-of-Experts (MoE) language model developed by Moonshot AI, featuring 1 trillion total parameters with 32 billion active per forward pass'
      },
      'moonshotai/kimi-k2': {
        maxTokens: 63000,
        contextWindow: 63000,
        inputPrice: 0.14,
        outputPrice: 2.49,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Kimi K2 Instruct is a large-scale Mixture-of-Experts (MoE) language model developed by Moonshot AI, featuring 1 trillion total parameters with 32 billion active per forward pass'
      }
      // ... and 4 more models
    },
    features: {
      streaming: true,
      tools: true,
      images: true,
      audio: false,
      reasoning: true,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'USD'
    },
    documentation: 'https://openrouter.ai/docs',
    setupInstructions: 'Get your API key from https://openrouter.ai/keys',
    iconUrl: 'https://platform.moonshot.cn/favicon.ico',
    clickable: true
  },

  'thudm': {
    id: 'thudm',
    name: 'Thudm',
    description: 'Thudm models with comprehensive AI capabilities',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'vision', 'reasoning'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'thudm/glm-4.1v-9b-thinking',
    modelCount: 3,
    supportedModels: {
      'thudm/glm-4.1v-9b-thinking': {
        maxTokens: 8000,
        contextWindow: 65536,
        inputPrice: 0.035,
        outputPrice: 0.138,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'GLM-4'
      },
      'thudm/glm-z1-32b': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 0.019992,
        outputPrice: 0.080006,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'GLM-Z1-32B-0414 is an enhanced reasoning variant of GLM-4-32B, built for deep mathematical, logical, and code-oriented problem solving'
      }
      // ... and 1 more models
    },
    features: {
      streaming: true,
      tools: false,
      images: true,
      audio: false,
      reasoning: true,
      caching: false
    },
    pricing: {
      type: 'token_based',
      currency: 'USD'
    },
    documentation: 'https://openrouter.ai/docs',
    setupInstructions: 'Get your API key from https://openrouter.ai/keys',
    iconUrl: 'https://ui-avatars.com/api/?name=T&background=6366f1&color=white',
    clickable: true
  }

};

// Utility Functions

export const COMPREHENSIVE_PROVIDERS = PROVIDERS; // Backward compatibility

export function getAllProviders(): ProviderConfiguration[] {
  return Object.values(PROVIDERS)
}

export function getDirectApiProviders(): ProviderConfiguration[] {
  return Object.values(PROVIDERS).filter(p => p.category === 'api')
}

export function getOpenRouterProviders(): ProviderConfiguration[] {
  return Object.values(PROVIDERS).filter(p => p.category === 'openrouter')
}

export function getFastInferenceProviders(): ProviderConfiguration[] {
  return Object.values(PROVIDERS).filter(p => 
    p.tags.includes('fast') || 
    p.tags.includes('inference') ||
    ['groq', 'cerebras', 'fireworks', 'together'].includes(p.id)
  )
}

export function getProvider(providerId: string): ProviderConfiguration | undefined {
  return PROVIDERS[providerId]
}

export function searchProviders(query: string): ProviderConfiguration[] {
  const searchTerm = query.toLowerCase()
  return Object.values(PROVIDERS).filter(provider => 
    provider.name.toLowerCase().includes(searchTerm) ||
    provider.description.toLowerCase().includes(searchTerm) ||
    provider.tags.some(tag => tag.toLowerCase().includes(searchTerm))
  )
}

export function getTotalModelCount(): number {
  return Object.values(PROVIDERS).reduce((total, provider) => total + provider.modelCount, 0)
}
