// COMPREHENSIVE OpenRouter Provider Configuration
// Auto-generated from complete OpenRouter API response
// Contains ALL providers and models available through OpenRouter

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

// ALL PROVIDERS from OpenRouter
export const COMPREHENSIVE_PROVIDERS: Record<string, ProviderConfiguration> = {
  'agentica-org': {
    id: 'agentica-org',
    name: 'Agentica-Org',
    description: "Agentica-Org models with comprehensive AI capabilities",
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'reasoning'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'agentica-org/deepcoder-14b-preview:free',
    modelCount: 2,
    supportedModels: {
      'agentica-org/deepcoder-14b-preview:free':         {
          maxTokens: 4096,
          contextWindow: 96000,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "DeepCoder-14B-Preview is a 14B parameter code generation model fine-tuned from DeepSeek-R1-Distill-Qwen-14B using reinforcement learning with GRPO+ an"
        },
      'agentica-org/deepcoder-14b-preview':         {
          maxTokens: 4096,
          contextWindow: 96000,
          inputPrice: 0.015,
          outputPrice: 0.015,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "DeepCoder-14B-Preview is a 14B parameter code generation model fine-tuned from DeepSeek-R1-Distill-Qwen-14B using reinforcement learning with GRPO+ an"
        },
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://ui-avatars.com/api/?name=A&background=6366f1&color=white',
    clickable: true
  },
  'ai21': {
    id: 'ai21',
    name: 'AI21',
    description: "AI21 models with comprehensive AI capabilities",
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'tools'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'ai21/jamba-mini-1.7',
    modelCount: 2,
    supportedModels: {
      'ai21/jamba-mini-1.7':         {
          maxTokens: 4096,
          contextWindow: 256000,
          inputPrice: 0.2,
          outputPrice: 0.4,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Jamba Mini 1"
        },
      'ai21/jamba-large-1.7':         {
          maxTokens: 4096,
          contextWindow: 256000,
          inputPrice: 2.0,
          outputPrice: 8.0,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Jamba Large 1"
        },
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://ui-avatars.com/api/?name=A&background=6366f1&color=white',
    clickable: true
  },
  'aion-labs': {
    id: 'aion-labs',
    name: 'AionLabs',
    description: "AionLabs models with comprehensive AI capabilities",
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'reasoning'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'aion-labs/aion-1.0',
    modelCount: 3,
    supportedModels: {
      'aion-labs/aion-1.0':         {
          maxTokens: 32768,
          contextWindow: 131072,
          inputPrice: 4.0,
          outputPrice: 8.0,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Aion-1"
        },
      'aion-labs/aion-1.0-mini':         {
          maxTokens: 32768,
          contextWindow: 131072,
          inputPrice: 0.7,
          outputPrice: 1.4,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Aion-1"
        },
      'aion-labs/aion-rp-llama-3.1-8b':         {
          maxTokens: 32768,
          contextWindow: 32768,
          inputPrice: 0.2,
          outputPrice: 0.2,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Aion-RP-Llama-3"
        },
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://ui-avatars.com/api/?name=A&background=6366f1&color=white',
    clickable: true
  },
  'alfredpros': {
    id: 'alfredpros',
    name: 'Alfredpros',
    description: "Alfredpros models with comprehensive AI capabilities",
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'alfredpros/codellama-7b-instruct-solidity',
    modelCount: 1,
    supportedModels: {
      'alfredpros/codellama-7b-instruct-solidity':         {
          maxTokens: 8192,
          contextWindow: 8192,
          inputPrice: 0.7,
          outputPrice: 1.1,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "A finetuned 7 billion parameters Code LLaMA - Instruct model to generate Solidity smart contract using 4-bit QLoRA finetuning provided by PEFT library"
        },
    },
    features: {
      streaming: true,
      tools: false,
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://ui-avatars.com/api/?name=A&background=6366f1&color=white',
    clickable: true
  },
  'alpindale': {
    id: 'alpindale',
    name: 'Alpindale',
    description: "Alpindale models with comprehensive AI capabilities",
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'alpindale/goliath-120b',
    modelCount: 1,
    supportedModels: {
      'alpindale/goliath-120b':         {
          maxTokens: 512,
          contextWindow: 6144,
          inputPrice: 4.0,
          outputPrice: 5.5,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "A large LLM created by combining two fine-tuned Llama 70B models into one 120B model"
        },
    },
    features: {
      streaming: true,
      tools: false,
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://ui-avatars.com/api/?name=A&background=6366f1&color=white',
    clickable: true
  },
  'amazon': {
    id: 'amazon',
    name: 'Amazon',
    description: "Amazon models with comprehensive AI capabilities",
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'vision', 'tools'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'amazon/nova-lite-v1',
    modelCount: 3,
    supportedModels: {
      'amazon/nova-lite-v1':         {
          maxTokens: 5120,
          contextWindow: 300000,
          inputPrice: 0.06,
          outputPrice: 0.24,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Amazon Nova Lite 1"
        },
      'amazon/nova-micro-v1':         {
          maxTokens: 5120,
          contextWindow: 128000,
          inputPrice: 0.035,
          outputPrice: 0.14,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Amazon Nova Micro 1"
        },
      'amazon/nova-pro-v1':         {
          maxTokens: 5120,
          contextWindow: 300000,
          inputPrice: 0.8,
          outputPrice: 3.2,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Amazon Nova Pro 1"
        },
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://ui-avatars.com/api/?name=A&background=6366f1&color=white',
    clickable: true
  },
  'anthracite-org': {
    id: 'anthracite-org',
    name: 'Anthracite-Org',
    description: "Anthracite-Org models with comprehensive AI capabilities",
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'anthracite-org/magnum-v4-72b',
    modelCount: 2,
    supportedModels: {
      'anthracite-org/magnum-v4-72b':         {
          maxTokens: 2048,
          contextWindow: 16384,
          inputPrice: 2.0,
          outputPrice: 5.0,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "This is a series of models designed to replicate the prose quality of the Claude 3 models, specifically Sonnet(https://openrouter"
        },
      'anthracite-org/magnum-v2-72b':         {
          maxTokens: 4096,
          contextWindow: 32768,
          inputPrice: 3.0,
          outputPrice: 3.0,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "From the maker of [Goliath](https://openrouter"
        },
    },
    features: {
      streaming: true,
      tools: false,
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://ui-avatars.com/api/?name=A&background=6366f1&color=white',
    clickable: true
  },
  'anthropic': {
    id: 'anthropic',
    name: 'Anthropic',
    description: "Anthropic models with comprehensive AI capabilities",
    category: 'api',
    authType: 'api_key',
    tags: ['openrouter', 'vision', 'tools', 'reasoning', 'core'],
    tier: 'premium',
    baseUrl: 'https://api.anthropic.com',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'anthropic/claude-opus-4.1',
    modelCount: 11,
    supportedModels: {
      'anthropic/claude-opus-4.1':         {
          maxTokens: 32000,
          contextWindow: 200000,
          inputPrice: 15.0,
          outputPrice: 75.0,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Claude Opus 4"
        },
      'anthropic/claude-opus-4':         {
          maxTokens: 32000,
          contextWindow: 200000,
          inputPrice: 15.0,
          outputPrice: 75.0,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Claude Opus 4 is benchmarked as the world’s best coding model, at time of release, bringing sustained performance on complex, long-running tasks and a"
        },
      'anthropic/claude-sonnet-4':         {
          maxTokens: 64000,
          contextWindow: 1000000,
          inputPrice: 3.0,
          outputPrice: 15.0,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Claude Sonnet 4 significantly enhances the capabilities of its predecessor, Sonnet 3"
        },
      'anthropic/claude-3.7-sonnet':         {
          maxTokens: 64000,
          contextWindow: 200000,
          inputPrice: 3.0,
          outputPrice: 15.0,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Claude 3"
        },
      'anthropic/claude-3.7-sonnet:thinking':         {
          maxTokens: 64000,
          contextWindow: 200000,
          inputPrice: 3.0,
          outputPrice: 15.0,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Claude 3"
        },
      'anthropic/claude-3.5-haiku-20241022':         {
          maxTokens: 8192,
          contextWindow: 200000,
          inputPrice: 0.8,
          outputPrice: 4.0,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Claude 3"
        },
      'anthropic/claude-3.5-haiku':         {
          maxTokens: 8192,
          contextWindow: 200000,
          inputPrice: 0.8,
          outputPrice: 4.0,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Claude 3"
        },
      'anthropic/claude-3.5-sonnet':         {
          maxTokens: 8192,
          contextWindow: 200000,
          inputPrice: 3.0,
          outputPrice: 15.0,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "New Claude 3"
        },
      'anthropic/claude-3.5-sonnet-20240620':         {
          maxTokens: 8192,
          contextWindow: 200000,
          inputPrice: 3.0,
          outputPrice: 15.0,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Claude 3"
        },
      'anthropic/claude-3-haiku':         {
          maxTokens: 4096,
          contextWindow: 200000,
          inputPrice: 0.25,
          outputPrice: 1.25,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Claude 3 Haiku is Anthropic's fastest and most compact model for near-instant responsiveness"
        },
      'anthropic/claude-3-opus':         {
          maxTokens: 4096,
          contextWindow: 200000,
          inputPrice: 15.0,
          outputPrice: 75.0,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Claude 3 Opus is Anthropic's most powerful model for highly complex tasks"
        },
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/anthropic.svg',
    clickable: true
  },
  'arcee-ai': {
    id: 'arcee-ai',
    name: 'Arcee-Ai',
    description: "Arcee-Ai models with comprehensive AI capabilities",
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'vision', 'tools'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'arcee-ai/spotlight',
    modelCount: 4,
    supportedModels: {
      'arcee-ai/spotlight':         {
          maxTokens: 65537,
          contextWindow: 131072,
          inputPrice: 0.18,
          outputPrice: 0.18,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Spotlight is a 7‑billion‑parameter vision‑language model derived from Qwen 2"
        },
      'arcee-ai/maestro-reasoning':         {
          maxTokens: 32000,
          contextWindow: 131072,
          inputPrice: 0.9,
          outputPrice: 3.3,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Maestro Reasoning is Arcee's flagship analysis model: a 32 B‑parameter derivative of Qwen 2"
        },
      'arcee-ai/virtuoso-large':         {
          maxTokens: 64000,
          contextWindow: 131072,
          inputPrice: 0.75,
          outputPrice: 1.2,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Virtuoso‑Large is Arcee's top‑tier general‑purpose LLM at 72 B parameters, tuned to tackle cross‑domain reasoning, creative writing and enterprise QA"
        },
      'arcee-ai/coder-large':         {
          maxTokens: 4096,
          contextWindow: 32768,
          inputPrice: 0.5,
          outputPrice: 0.8,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Coder‑Large is a 32 B‑parameter offspring of Qwen 2"
        },
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://ui-avatars.com/api/?name=A&background=6366f1&color=white',
    clickable: true
  },
  'arliai': {
    id: 'arliai',
    name: 'Arliai',
    description: "Arliai models with comprehensive AI capabilities",
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'reasoning'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'arliai/qwq-32b-arliai-rpr-v1:free',
    modelCount: 2,
    supportedModels: {
      'arliai/qwq-32b-arliai-rpr-v1:free':         {
          maxTokens: 4096,
          contextWindow: 32768,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "QwQ-32B-ArliAI-RpR-v1 is a 32B parameter model fine-tuned from Qwen/QwQ-32B using a curated creative writing and roleplay dataset originally developed"
        },
      'arliai/qwq-32b-arliai-rpr-v1':         {
          maxTokens: 4096,
          contextWindow: 32768,
          inputPrice: 0.01,
          outputPrice: 0.040003,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "QwQ-32B-ArliAI-RpR-v1 is a 32B parameter model fine-tuned from Qwen/QwQ-32B using a curated creative writing and roleplay dataset originally developed"
        },
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://ui-avatars.com/api/?name=A&background=6366f1&color=white',
    clickable: true
  },
  'baidu': {
    id: 'baidu',
    name: 'Baidu',
    description: "Baidu models with comprehensive AI capabilities",
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'vision', 'reasoning'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'baidu/ernie-4.5-21b-a3b',
    modelCount: 4,
    supportedModels: {
      'baidu/ernie-4.5-21b-a3b':         {
          maxTokens: 8000,
          contextWindow: 120000,
          inputPrice: 0.07,
          outputPrice: 0.28,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "A sophisticated text-based Mixture-of-Experts (MoE) model featuring 21B total parameters with 3B activated per token, delivering exceptional multimoda"
        },
      'baidu/ernie-4.5-vl-28b-a3b':         {
          maxTokens: 8000,
          contextWindow: 30000,
          inputPrice: 0.14,
          outputPrice: 0.56,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "A powerful multimodal Mixture-of-Experts chat model featuring 28B total parameters with 3B activated per token, delivering exceptional text and vision"
        },
      'baidu/ernie-4.5-vl-424b-a47b':         {
          maxTokens: 16000,
          contextWindow: 123000,
          inputPrice: 0.42,
          outputPrice: 1.25,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "ERNIE-4"
        },
      'baidu/ernie-4.5-300b-a47b':         {
          maxTokens: 12000,
          contextWindow: 123000,
          inputPrice: 0.28,
          outputPrice: 1.1,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "ERNIE-4"
        },
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://ui-avatars.com/api/?name=B&background=6366f1&color=white',
    clickable: true
  },
  'bytedance': {
    id: 'bytedance',
    name: 'Bytedance',
    description: "Bytedance models with comprehensive AI capabilities",
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'vision'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'bytedance/ui-tars-1.5-7b',
    modelCount: 1,
    supportedModels: {
      'bytedance/ui-tars-1.5-7b':         {
          maxTokens: 2048,
          contextWindow: 128000,
          inputPrice: 0.1,
          outputPrice: 0.2,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "UI-TARS-1"
        },
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://ui-avatars.com/api/?name=B&background=6366f1&color=white',
    clickable: true
  },
  'cognitivecomputations': {
    id: 'cognitivecomputations',
    name: 'Cognitivecomputations',
    description: "Cognitivecomputations models with comprehensive AI capabilities",
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'reasoning'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free',
    modelCount: 6,
    supportedModels: {
      'cognitivecomputations/dolphin-mistral-24b-venice-edition:free':         {
          maxTokens: 4096,
          contextWindow: 32768,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Venice Uncensored Dolphin Mistral 24B Venice Edition is a fine-tuned variant of Mistral-Small-24B-Instruct-2501, developed by dphn"
        },
      'cognitivecomputations/dolphin3.0-r1-mistral-24b:free':         {
          maxTokens: 4096,
          contextWindow: 32768,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Dolphin 3"
        },
      'cognitivecomputations/dolphin3.0-r1-mistral-24b':         {
          maxTokens: 4096,
          contextWindow: 32768,
          inputPrice: 0.01,
          outputPrice: 0.034077,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Dolphin 3"
        },
      'cognitivecomputations/dolphin3.0-mistral-24b:free':         {
          maxTokens: 4096,
          contextWindow: 32768,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Dolphin 3"
        },
      'cognitivecomputations/dolphin3.0-mistral-24b':         {
          maxTokens: 4096,
          contextWindow: 32768,
          inputPrice: 0.037022,
          outputPrice: 0.14816,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Dolphin 3"
        },
      'cognitivecomputations/dolphin-mixtral-8x22b':         {
          maxTokens: 8192,
          contextWindow: 16000,
          inputPrice: 0.9,
          outputPrice: 0.9,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Dolphin 2"
        },
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://ui-avatars.com/api/?name=C&background=6366f1&color=white',
    clickable: true
  },
  'cohere': {
    id: 'cohere',
    name: 'Cohere',
    description: "Cohere models with comprehensive AI capabilities",
    category: 'api',
    authType: 'api_key',
    tags: ['openrouter', 'tools'],
    tier: 'standard',
    baseUrl: 'https://api.cohere.ai/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'cohere/command-a',
    modelCount: 9,
    supportedModels: {
      'cohere/command-a':         {
          maxTokens: 4096,
          contextWindow: 32768,
          inputPrice: 2.0,
          outputPrice: 8.0,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Command A is an open-weights 111B parameter model with a 256k context window focused on delivering great performance across agentic, multilingual, and"
        },
      'cohere/command-r7b-12-2024':         {
          maxTokens: 4000,
          contextWindow: 128000,
          inputPrice: 0.0375,
          outputPrice: 0.15,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Command R7B (12-2024) is a small, fast update of the Command R+ model, delivered in December 2024"
        },
      'cohere/command-r-08-2024':         {
          maxTokens: 4000,
          contextWindow: 128000,
          inputPrice: 0.15,
          outputPrice: 0.6,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "command-r-08-2024 is an update of the [Command R](/models/cohere/command-r) with improved performance for multilingual retrieval-augmented generation "
        },
      'cohere/command-r-plus-08-2024':         {
          maxTokens: 4000,
          contextWindow: 128000,
          inputPrice: 2.5,
          outputPrice: 10.0,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "command-r-plus-08-2024 is an update of the [Command R+](/models/cohere/command-r-plus) with roughly 50% higher throughput and 25% lower latencies as c"
        },
      'cohere/command-r-plus':         {
          maxTokens: 4000,
          contextWindow: 128000,
          inputPrice: 3.0,
          outputPrice: 15.0,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Command R+ is a new, 104B-parameter LLM from Cohere"
        },
      'cohere/command-r-plus-04-2024':         {
          maxTokens: 4000,
          contextWindow: 128000,
          inputPrice: 3.0,
          outputPrice: 15.0,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Command R+ is a new, 104B-parameter LLM from Cohere"
        },
      'cohere/command-r':         {
          maxTokens: 4000,
          contextWindow: 128000,
          inputPrice: 0.5,
          outputPrice: 1.5,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Command-R is a 35B parameter model that performs conversational language tasks at a higher quality, more reliably, and with a longer context than prev"
        },
      'cohere/command':         {
          maxTokens: 4000,
          contextWindow: 4096,
          inputPrice: 1.0,
          outputPrice: 2.0,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Command is an instruction-following conversational model that performs language tasks with high quality, more reliably and with a longer context than "
        },
      'cohere/command-r-03-2024':         {
          maxTokens: 4000,
          contextWindow: 128000,
          inputPrice: 0.5,
          outputPrice: 1.5,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Command-R is a 35B parameter model that performs conversational language tasks at a higher quality, more reliably, and with a longer context than prev"
        },
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/cohere.svg',
    clickable: true
  },
  'deepcogito': {
    id: 'deepcogito',
    name: 'Deepcogito',
    description: "Deepcogito models with comprehensive AI capabilities",
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'vision', 'tools', 'reasoning'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'deepcogito/cogito-v2-preview-llama-109b-moe',
    modelCount: 2,
    supportedModels: {
      'deepcogito/cogito-v2-preview-llama-109b-moe':         {
          maxTokens: 4096,
          contextWindow: 32767,
          inputPrice: 0.18,
          outputPrice: 0.59,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "An instruction-tuned, hybrid-reasoning Mixture-of-Experts model built on Llama-4-Scout-17B-16E"
        },
      'deepcogito/cogito-v2-preview-deepseek-671b':         {
          maxTokens: 4096,
          contextWindow: 163840,
          inputPrice: 1.25,
          outputPrice: 1.25,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Cogito v2 is a multilingual, instruction-tuned Mixture of Experts (MoE) large language model with 671 billion parameters"
        },
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://ui-avatars.com/api/?name=D&background=6366f1&color=white',
    clickable: true
  },
  'deepseek': {
    id: 'deepseek',
    name: 'DeepSeek',
    description: "DeepSeek models with comprehensive AI capabilities",
    category: 'api',
    authType: 'api_key',
    tags: ['openrouter', 'tools', 'reasoning'],
    tier: 'premium',
    baseUrl: 'https://api.deepseek.com/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'deepseek/deepseek-chat-v3.1:free',
    modelCount: 19,
    supportedModels: {
      'deepseek/deepseek-chat-v3.1:free':         {
          maxTokens: 4096,
          contextWindow: 64000,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "DeepSeek-V3"
        },
      'deepseek/deepseek-chat-v3.1':         {
          maxTokens: 4096,
          contextWindow: 163840,
          inputPrice: 0.2,
          outputPrice: 0.8,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "DeepSeek-V3"
        },
      'deepseek/deepseek-v3.1-base':         {
          maxTokens: 4096,
          contextWindow: 163840,
          inputPrice: 0.2,
          outputPrice: 0.8,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "This is a base model, trained only for raw next-token prediction"
        },
      'deepseek/deepseek-r1-0528-qwen3-8b:free':         {
          maxTokens: 4096,
          contextWindow: 131072,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "DeepSeek-R1-0528 is a lightly upgraded release of DeepSeek R1 that taps more compute and smarter post-training tricks, pushing its reasoning and infer"
        },
      'deepseek/deepseek-r1-0528-qwen3-8b':         {
          maxTokens: 4096,
          contextWindow: 32000,
          inputPrice: 0.01,
          outputPrice: 0.02,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "DeepSeek-R1-0528 is a lightly upgraded release of DeepSeek R1 that taps more compute and smarter post-training tricks, pushing its reasoning and infer"
        },
      'deepseek/deepseek-r1-0528:free':         {
          maxTokens: 4096,
          contextWindow: 163840,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "May 28th update to the [original DeepSeek R1](/deepseek/deepseek-r1) Performance on par with [OpenAI o1](/openai/o1), but open-sourced and with fully "
        },
      'deepseek/deepseek-r1-0528':         {
          maxTokens: 4096,
          contextWindow: 163840,
          inputPrice: 0.199919,
          outputPrice: 0.800064,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "May 28th update to the [original DeepSeek R1](/deepseek/deepseek-r1) Performance on par with [OpenAI o1](/openai/o1), but open-sourced and with fully "
        },
      'deepseek/deepseek-prover-v2':         {
          maxTokens: 4096,
          contextWindow: 163840,
          inputPrice: 0.5,
          outputPrice: 2.18,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "DeepSeek Prover V2 is a 671B parameter model, speculated to be geared towards logic and mathematics"
        },
      'deepseek/deepseek-chat-v3-0324:free':         {
          maxTokens: 4096,
          contextWindow: 163840,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "DeepSeek V3, a 685B-parameter, mixture-of-experts model, is the latest iteration of the flagship chat model family from the DeepSeek team"
        },
      'deepseek/deepseek-chat-v3-0324':         {
          maxTokens: 4096,
          contextWindow: 163840,
          inputPrice: 0.199919,
          outputPrice: 0.800064,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "DeepSeek V3, a 685B-parameter, mixture-of-experts model, is the latest iteration of the flagship chat model family from the DeepSeek team"
        },
      'deepseek/deepseek-r1-distill-llama-8b':         {
          maxTokens: 32000,
          contextWindow: 32000,
          inputPrice: 0.04,
          outputPrice: 0.04,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "DeepSeek R1 Distill Llama 8B is a distilled large language model based on [Llama-3"
        },
      'deepseek/deepseek-r1-distill-qwen-32b':         {
          maxTokens: 16384,
          contextWindow: 131072,
          inputPrice: 0.075,
          outputPrice: 0.15,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "DeepSeek R1 Distill Qwen 32B is a distilled large language model based on [Qwen 2"
        },
      'deepseek/deepseek-r1-distill-qwen-14b:free':         {
          maxTokens: 4096,
          contextWindow: 64000,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "DeepSeek R1 Distill Qwen 14B is a distilled large language model based on [Qwen 2"
        },
      'deepseek/deepseek-r1-distill-qwen-14b':         {
          maxTokens: 32000,
          contextWindow: 64000,
          inputPrice: 0.15,
          outputPrice: 0.15,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "DeepSeek R1 Distill Qwen 14B is a distilled large language model based on [Qwen 2"
        },
      'deepseek/deepseek-r1-distill-llama-70b:free':         {
          maxTokens: 4096,
          contextWindow: 8192,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "DeepSeek R1 Distill Llama 70B is a distilled large language model based on [Llama-3"
        },
      'deepseek/deepseek-r1-distill-llama-70b':         {
          maxTokens: 4096,
          contextWindow: 131072,
          inputPrice: 0.025915,
          outputPrice: 0.103712,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "DeepSeek R1 Distill Llama 70B is a distilled large language model based on [Llama-3"
        },
      'deepseek/deepseek-r1:free':         {
          maxTokens: 4096,
          contextWindow: 163840,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "DeepSeek R1 is here: Performance on par with [OpenAI o1](/openai/o1), but open-sourced and with fully open reasoning tokens"
        },
      'deepseek/deepseek-r1':         {
          maxTokens: 163840,
          contextWindow: 163840,
          inputPrice: 0.4,
          outputPrice: 2.0,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "DeepSeek R1 is here: Performance on par with [OpenAI o1](/openai/o1), but open-sourced and with fully open reasoning tokens"
        },
      'deepseek/deepseek-chat':         {
          maxTokens: 4096,
          contextWindow: 163840,
          inputPrice: 0.199919,
          outputPrice: 0.800064,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "DeepSeek-V3 is the latest model from the DeepSeek team, building upon the instruction following and coding abilities of the previous versions"
        },
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://api.deepseek.com/v1/logo.svg',
    clickable: true
  },
  'eleutherai': {
    id: 'eleutherai',
    name: 'Eleutherai',
    description: "Eleutherai models with comprehensive AI capabilities",
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'eleutherai/llemma_7b',
    modelCount: 1,
    supportedModels: {
      'eleutherai/llemma_7b':         {
          maxTokens: 4096,
          contextWindow: 4096,
          inputPrice: 0.8,
          outputPrice: 1.2,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Llemma 7B is a language model for mathematics"
        },
    },
    features: {
      streaming: true,
      tools: false,
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://ui-avatars.com/api/?name=E&background=6366f1&color=white',
    clickable: true
  },
  'google': {
    id: 'google',
    name: 'Google',
    description: "Google models with comprehensive AI capabilities",
    category: 'api',
    authType: 'api_key',
    tags: ['openrouter', 'vision', 'tools', 'reasoning', 'core'],
    tier: 'premium',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'google/gemini-2.5-flash-image-preview:free',
    modelCount: 27,
    supportedModels: {
      'google/gemini-2.5-flash-image-preview:free':         {
          maxTokens: 8192,
          contextWindow: 32768,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Gemini 2"
        },
      'google/gemini-2.5-flash-image-preview':         {
          maxTokens: 8192,
          contextWindow: 32768,
          inputPrice: 0.3,
          outputPrice: 2.5,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Gemini 2"
        },
      'google/gemini-2.5-flash-lite':         {
          maxTokens: 65535,
          contextWindow: 1048576,
          inputPrice: 0.1,
          outputPrice: 0.4,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Gemini 2"
        },
      'google/gemma-3n-e2b-it:free':         {
          maxTokens: 2048,
          contextWindow: 8192,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Gemma 3n E2B IT is a multimodal, instruction-tuned model developed by Google DeepMind, designed to operate efficiently at an effective parameter size "
        },
      'google/gemini-2.5-flash-lite-preview-06-17':         {
          maxTokens: 65535,
          contextWindow: 1048576,
          inputPrice: 0.1,
          outputPrice: 0.4,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Gemini 2"
        },
      'google/gemini-2.5-flash':         {
          maxTokens: 65535,
          contextWindow: 1048576,
          inputPrice: 0.3,
          outputPrice: 2.5,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Gemini 2"
        },
      'google/gemini-2.5-pro':         {
          maxTokens: 65536,
          contextWindow: 1048576,
          inputPrice: 1.25,
          outputPrice: 10.0,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Gemini 2"
        },
      'google/gemini-2.5-pro-preview':         {
          maxTokens: 65536,
          contextWindow: 1048576,
          inputPrice: 1.25,
          outputPrice: 10.0,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Gemini 2"
        },
      'google/gemma-3n-e4b-it:free':         {
          maxTokens: 2048,
          contextWindow: 8192,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Gemma 3n E4B-it is optimized for efficient execution on mobile and low-resource devices, such as phones, laptops, and tablets"
        },
      'google/gemma-3n-e4b-it':         {
          maxTokens: 4096,
          contextWindow: 32768,
          inputPrice: 0.02,
          outputPrice: 0.04,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Gemma 3n E4B-it is optimized for efficient execution on mobile and low-resource devices, such as phones, laptops, and tablets"
        },
      'google/gemini-2.5-pro-preview-05-06':         {
          maxTokens: 65535,
          contextWindow: 1048576,
          inputPrice: 1.25,
          outputPrice: 10.0,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Gemini 2"
        },
      'google/gemini-2.5-pro-exp-03-25':         {
          maxTokens: 65535,
          contextWindow: 1048576,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "This model has been deprecated by Google in favor of the (paid Preview model)[google/gemini-2"
        },
      'google/gemma-3-4b-it:free':         {
          maxTokens: 8192,
          contextWindow: 32768,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Gemma 3 introduces multimodality, supporting vision-language input and text outputs"
        },
      'google/gemma-3-4b-it':         {
          maxTokens: 4096,
          contextWindow: 131072,
          inputPrice: 0.02,
          outputPrice: 0.04,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Gemma 3 introduces multimodality, supporting vision-language input and text outputs"
        },
      'google/gemma-3-12b-it:free':         {
          maxTokens: 8192,
          contextWindow: 32768,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Gemma 3 introduces multimodality, supporting vision-language input and text outputs"
        },
      'google/gemma-3-12b-it':         {
          maxTokens: 8192,
          contextWindow: 96000,
          inputPrice: 0.048129,
          outputPrice: 0.192608,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Gemma 3 introduces multimodality, supporting vision-language input and text outputs"
        },
      'google/gemma-3-27b-it:free':         {
          maxTokens: 8192,
          contextWindow: 96000,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Gemma 3 introduces multimodality, supporting vision-language input and text outputs"
        },
      'google/gemma-3-27b-it':         {
          maxTokens: 8192,
          contextWindow: 96000,
          inputPrice: 0.06664,
          outputPrice: 0.266688,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Gemma 3 introduces multimodality, supporting vision-language input and text outputs"
        },
      'google/gemini-2.0-flash-lite-001':         {
          maxTokens: 8192,
          contextWindow: 1048576,
          inputPrice: 0.075,
          outputPrice: 0.3,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Gemini 2"
        },
      'google/gemini-2.0-flash-001':         {
          maxTokens: 8192,
          contextWindow: 1048576,
          inputPrice: 0.1,
          outputPrice: 0.4,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Gemini Flash 2"
        },
      'google/gemini-2.0-flash-exp:free':         {
          maxTokens: 8192,
          contextWindow: 1048576,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Gemini Flash 2"
        },
      'google/gemini-flash-1.5-8b':         {
          maxTokens: 8192,
          contextWindow: 1000000,
          inputPrice: 0.0375,
          outputPrice: 0.15,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Gemini Flash 1"
        },
      'google/gemma-2-27b-it':         {
          maxTokens: 4096,
          contextWindow: 8192,
          inputPrice: 0.65,
          outputPrice: 0.65,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Gemma 2 27B by Google is an open model built from the same research and technology used to create the [Gemini models](/models?q=gemini)"
        },
      'google/gemma-2-9b-it:free':         {
          maxTokens: 8192,
          contextWindow: 8192,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Gemma 2 9B by Google is an advanced, open-source language model that sets a new standard for efficiency and performance in its size class"
        },
      'google/gemma-2-9b-it':         {
          maxTokens: 8192,
          contextWindow: 8192,
          inputPrice: 0.01,
          outputPrice: 0.010001,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Gemma 2 9B by Google is an advanced, open-source language model that sets a new standard for efficiency and performance in its size class"
        },
      'google/gemini-flash-1.5':         {
          maxTokens: 8192,
          contextWindow: 1000000,
          inputPrice: 0.075,
          outputPrice: 0.3,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Gemini 1"
        },
      'google/gemini-pro-1.5':         {
          maxTokens: 8192,
          contextWindow: 2000000,
          inputPrice: 1.25,
          outputPrice: 5.0,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Google's latest multimodal model, supports image and video[0] in text or chat prompts"
        },
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/google.svg',
    clickable: true
  },
  'gryphe': {
    id: 'gryphe',
    name: 'Gryphe',
    description: "Gryphe models with comprehensive AI capabilities",
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'gryphe/mythomax-l2-13b',
    modelCount: 1,
    supportedModels: {
      'gryphe/mythomax-l2-13b':         {
          maxTokens: 4096,
          contextWindow: 4096,
          inputPrice: 0.06,
          outputPrice: 0.06,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "One of the highest performing and most popular fine-tunes of Llama 2 13B, with rich descriptions and roleplay"
        },
    },
    features: {
      streaming: true,
      tools: false,
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://ui-avatars.com/api/?name=G&background=6366f1&color=white',
    clickable: true
  },
  'inception': {
    id: 'inception',
    name: 'Inception',
    description: "Inception models with comprehensive AI capabilities",
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'tools'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'inception/mercury',
    modelCount: 2,
    supportedModels: {
      'inception/mercury':         {
          maxTokens: 16384,
          contextWindow: 128000,
          inputPrice: 0.25,
          outputPrice: 1.0,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Mercury is the first diffusion large language model (dLLM)"
        },
      'inception/mercury-coder':         {
          maxTokens: 16384,
          contextWindow: 128000,
          inputPrice: 0.25,
          outputPrice: 1.0,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Mercury Coder is the first diffusion large language model (dLLM)"
        },
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://ui-avatars.com/api/?name=I&background=6366f1&color=white',
    clickable: true
  },
  'infermatic': {
    id: 'infermatic',
    name: 'Infermatic',
    description: "Infermatic models with comprehensive AI capabilities",
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'infermatic/mn-inferor-12b',
    modelCount: 1,
    supportedModels: {
      'infermatic/mn-inferor-12b':         {
          maxTokens: 8192,
          contextWindow: 8192,
          inputPrice: 0.6,
          outputPrice: 1.0,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Inferor 12B is a merge of top roleplay models, expert on immersive narratives and storytelling"
        },
    },
    features: {
      streaming: true,
      tools: false,
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://ui-avatars.com/api/?name=I&background=6366f1&color=white',
    clickable: true
  },
  'inflection': {
    id: 'inflection',
    name: 'Inflection',
    description: "Inflection models with comprehensive AI capabilities",
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'inflection/inflection-3-productivity',
    modelCount: 2,
    supportedModels: {
      'inflection/inflection-3-productivity':         {
          maxTokens: 1024,
          contextWindow: 8000,
          inputPrice: 2.5,
          outputPrice: 10.0,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Inflection 3 Productivity is optimized for following instructions"
        },
      'inflection/inflection-3-pi':         {
          maxTokens: 1024,
          contextWindow: 8000,
          inputPrice: 2.5,
          outputPrice: 10.0,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Inflection 3 Pi powers Inflection's [Pi](https://pi"
        },
    },
    features: {
      streaming: true,
      tools: false,
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://ui-avatars.com/api/?name=I&background=6366f1&color=white',
    clickable: true
  },
  'liquid': {
    id: 'liquid',
    name: 'Liquid',
    description: "Liquid models with comprehensive AI capabilities",
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'liquid/lfm-7b',
    modelCount: 2,
    supportedModels: {
      'liquid/lfm-7b':         {
          maxTokens: 4096,
          contextWindow: 32768,
          inputPrice: 0.01,
          outputPrice: 0.01,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "LFM-7B, a new best-in-class language model"
        },
      'liquid/lfm-3b':         {
          maxTokens: 4096,
          contextWindow: 32768,
          inputPrice: 0.02,
          outputPrice: 0.02,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Liquid's LFM 3B delivers incredible performance for its size"
        },
    },
    features: {
      streaming: true,
      tools: false,
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://ui-avatars.com/api/?name=L&background=6366f1&color=white',
    clickable: true
  },
  'mancer': {
    id: 'mancer',
    name: 'Mancer 2',
    description: "Mancer 2 models with comprehensive AI capabilities",
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'mancer/weaver',
    modelCount: 1,
    supportedModels: {
      'mancer/weaver':         {
          maxTokens: 2000,
          contextWindow: 8000,
          inputPrice: 1.125,
          outputPrice: 1.125,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "An attempt to recreate Claude-style verbosity, but don't expect the same level of coherence or memory"
        },
    },
    features: {
      streaming: true,
      tools: false,
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://ui-avatars.com/api/?name=M&background=6366f1&color=white',
    clickable: true
  },
  'meta-llama': {
    id: 'meta-llama',
    name: 'Meta-Llama',
    description: "Meta-Llama models with comprehensive AI capabilities",
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'vision', 'tools'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'meta-llama/llama-3.3-8b-instruct:free',
    modelCount: 22,
    supportedModels: {
      'meta-llama/llama-3.3-8b-instruct:free':         {
          maxTokens: 4028,
          contextWindow: 128000,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "A lightweight and ultra-fast variant of Llama 3"
        },
      'meta-llama/llama-guard-4-12b':         {
          maxTokens: 4096,
          contextWindow: 163840,
          inputPrice: 0.18,
          outputPrice: 0.18,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Llama Guard 4 is a Llama 4 Scout-derived multimodal pretrained model, fine-tuned for content safety classification"
        },
      'meta-llama/llama-4-maverick:free':         {
          maxTokens: 4028,
          contextWindow: 128000,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Llama 4 Maverick 17B Instruct (128E) is a high-capacity multimodal language model from Meta, built on a mixture-of-experts (MoE) architecture with 128"
        },
      'meta-llama/llama-4-maverick':         {
          maxTokens: 16384,
          contextWindow: 1048576,
          inputPrice: 0.15,
          outputPrice: 0.6,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Llama 4 Maverick 17B Instruct (128E) is a high-capacity multimodal language model from Meta, built on a mixture-of-experts (MoE) architecture with 128"
        },
      'meta-llama/llama-4-scout:free':         {
          maxTokens: 4028,
          contextWindow: 128000,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Llama 4 Scout 17B Instruct (16E) is a mixture-of-experts (MoE) language model developed by Meta, activating 17 billion parameters out of a total of 10"
        },
      'meta-llama/llama-4-scout':         {
          maxTokens: 1048576,
          contextWindow: 1048576,
          inputPrice: 0.08,
          outputPrice: 0.3,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Llama 4 Scout 17B Instruct (16E) is a mixture-of-experts (MoE) language model developed by Meta, activating 17 billion parameters out of a total of 10"
        },
      'meta-llama/llama-guard-3-8b':         {
          maxTokens: 4096,
          contextWindow: 131072,
          inputPrice: 0.02,
          outputPrice: 0.06,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Llama Guard 3 is a Llama-3"
        },
      'meta-llama/llama-3.3-70b-instruct:free':         {
          maxTokens: 4096,
          contextWindow: 65536,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "The Meta Llama 3"
        },
      'meta-llama/llama-3.3-70b-instruct':         {
          maxTokens: 16384,
          contextWindow: 131072,
          inputPrice: 0.038,
          outputPrice: 0.12,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "The Meta Llama 3"
        },
      'meta-llama/llama-3.2-11b-vision-instruct':         {
          maxTokens: 16384,
          contextWindow: 131072,
          inputPrice: 0.049,
          outputPrice: 0.049,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Llama 3"
        },
      'meta-llama/llama-3.2-90b-vision-instruct':         {
          maxTokens: 16384,
          contextWindow: 32768,
          inputPrice: 0.35,
          outputPrice: 0.4,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "The Llama 90B Vision model is a top-tier, 90-billion-parameter multimodal model designed for the most challenging visual reasoning and language tasks"
        },
      'meta-llama/llama-3.2-1b-instruct':         {
          maxTokens: 16384,
          contextWindow: 131072,
          inputPrice: 0.005,
          outputPrice: 0.01,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Llama 3"
        },
      'meta-llama/llama-3.2-3b-instruct:free':         {
          maxTokens: 4096,
          contextWindow: 131072,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Llama 3"
        },
      'meta-llama/llama-3.2-3b-instruct':         {
          maxTokens: 20000,
          contextWindow: 20000,
          inputPrice: 0.003,
          outputPrice: 0.006,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Llama 3"
        },
      'meta-llama/llama-3.1-405b':         {
          maxTokens: 4096,
          contextWindow: 32768,
          inputPrice: 2.0,
          outputPrice: 2.0,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Meta's latest class of model (Llama 3"
        },
      'meta-llama/llama-3.1-405b-instruct:free':         {
          maxTokens: 4096,
          contextWindow: 65536,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "The highly anticipated 400B class of Llama3 is here! Clocking in at 128k context with impressive eval scores, the Meta AI team continues to push the f"
        },
      'meta-llama/llama-3.1-405b-instruct':         {
          maxTokens: 16384,
          contextWindow: 32768,
          inputPrice: 0.8,
          outputPrice: 0.8,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "The highly anticipated 400B class of Llama3 is here! Clocking in at 128k context with impressive eval scores, the Meta AI team continues to push the f"
        },
      'meta-llama/llama-3.1-8b-instruct':         {
          maxTokens: 16384,
          contextWindow: 131072,
          inputPrice: 0.015,
          outputPrice: 0.02,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Meta's latest class of model (Llama 3"
        },
      'meta-llama/llama-3.1-70b-instruct':         {
          maxTokens: 16384,
          contextWindow: 131072,
          inputPrice: 0.1,
          outputPrice: 0.28,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Meta's latest class of model (Llama 3"
        },
      'meta-llama/llama-guard-2-8b':         {
          maxTokens: 4096,
          contextWindow: 8192,
          inputPrice: 0.2,
          outputPrice: 0.2,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "This safeguard model has 8B parameters and is based on the Llama 3 family"
        },
      'meta-llama/llama-3-70b-instruct':         {
          maxTokens: 16384,
          contextWindow: 8192,
          inputPrice: 0.3,
          outputPrice: 0.4,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Meta's latest class of model (Llama 3) launched with a variety of sizes & flavors"
        },
      'meta-llama/llama-3-8b-instruct':         {
          maxTokens: 16384,
          contextWindow: 8192,
          inputPrice: 0.03,
          outputPrice: 0.06,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Meta's latest class of model (Llama 3) launched with a variety of sizes & flavors"
        },
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/meta.svg',
    clickable: true
  },
  'microsoft': {
    id: 'microsoft',
    name: 'Microsoft',
    description: "Microsoft models with comprehensive AI capabilities",
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'vision', 'tools', 'reasoning'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'microsoft/phi-4-reasoning-plus',
    modelCount: 9,
    supportedModels: {
      'microsoft/phi-4-reasoning-plus':         {
          maxTokens: 4096,
          contextWindow: 32768,
          inputPrice: 0.07,
          outputPrice: 0.35,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Phi-4-reasoning-plus is an enhanced 14B parameter model from Microsoft, fine-tuned from Phi-4 with additional reinforcement learning to boost accuracy"
        },
      'microsoft/mai-ds-r1:free':         {
          maxTokens: 4096,
          contextWindow: 163840,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "MAI-DS-R1 is a post-trained variant of DeepSeek-R1 developed by the Microsoft AI team to improve the model’s responsiveness on previously blocked topi"
        },
      'microsoft/mai-ds-r1':         {
          maxTokens: 4096,
          contextWindow: 163840,
          inputPrice: 0.199919,
          outputPrice: 0.800064,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "MAI-DS-R1 is a post-trained variant of DeepSeek-R1 developed by the Microsoft AI team to improve the model’s responsiveness on previously blocked topi"
        },
      'microsoft/phi-4-multimodal-instruct':         {
          maxTokens: 4096,
          contextWindow: 131072,
          inputPrice: 0.05,
          outputPrice: 0.1,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Phi-4 Multimodal Instruct is a versatile 5"
        },
      'microsoft/phi-4':         {
          maxTokens: 4096,
          contextWindow: 16384,
          inputPrice: 0.06,
          outputPrice: 0.14,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "[Microsoft Research](/microsoft) Phi-4 is designed to perform well in complex reasoning tasks and can operate efficiently in situations with limited m"
        },
      'microsoft/phi-3.5-mini-128k-instruct':         {
          maxTokens: 4096,
          contextWindow: 128000,
          inputPrice: 0.1,
          outputPrice: 0.1,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Phi-3"
        },
      'microsoft/phi-3-mini-128k-instruct':         {
          maxTokens: 4096,
          contextWindow: 128000,
          inputPrice: 0.1,
          outputPrice: 0.1,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Phi-3 Mini is a powerful 3"
        },
      'microsoft/phi-3-medium-128k-instruct':         {
          maxTokens: 4096,
          contextWindow: 128000,
          inputPrice: 1.0,
          outputPrice: 1.0,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Phi-3 128K Medium is a powerful 14-billion parameter model designed for advanced language understanding, reasoning, and instruction following"
        },
      'microsoft/wizardlm-2-8x22b':         {
          maxTokens: 65536,
          contextWindow: 65536,
          inputPrice: 0.48,
          outputPrice: 0.48,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "WizardLM-2 8x22B is Microsoft AI's most advanced Wizard model"
        },
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/microsoft.svg',
    clickable: true
  },
  'minimax': {
    id: 'minimax',
    name: 'Minimax',
    description: "Minimax models with comprehensive AI capabilities",
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'vision', 'tools', 'reasoning'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'minimax/minimax-m1',
    modelCount: 2,
    supportedModels: {
      'minimax/minimax-m1':         {
          maxTokens: 40000,
          contextWindow: 1000000,
          inputPrice: 0.3,
          outputPrice: 1.65,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "MiniMax-M1 is a large-scale, open-weight reasoning model designed for extended context and high-efficiency inference"
        },
      'minimax/minimax-01':         {
          maxTokens: 1000192,
          contextWindow: 1000192,
          inputPrice: 0.2,
          outputPrice: 1.1,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "MiniMax-01 is a combines MiniMax-Text-01 for text generation and MiniMax-VL-01 for image understanding"
        },
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://ui-avatars.com/api/?name=M&background=6366f1&color=white',
    clickable: true
  },
  'mistralai': {
    id: 'mistralai',
    name: 'Mistralai',
    description: "Mistralai models with comprehensive AI capabilities",
    category: 'api',
    authType: 'api_key',
    tags: ['openrouter', 'vision', 'tools', 'reasoning'],
    tier: 'standard',
    baseUrl: 'https://api.mistral.ai/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'mistralai/mistral-medium-3.1',
    modelCount: 35,
    supportedModels: {
      'mistralai/mistral-medium-3.1':         {
          maxTokens: 4096,
          contextWindow: 131072,
          inputPrice: 0.4,
          outputPrice: 2.0,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Mistral Medium 3"
        },
      'mistralai/codestral-2508':         {
          maxTokens: 4096,
          contextWindow: 256000,
          inputPrice: 0.3,
          outputPrice: 0.9,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Mistral's cutting-edge language model for coding released end of July 2025"
        },
      'mistralai/devstral-medium':         {
          maxTokens: 4096,
          contextWindow: 131072,
          inputPrice: 0.4,
          outputPrice: 2.0,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Devstral Medium is a high-performance code generation and agentic reasoning model developed jointly by Mistral AI and All Hands AI"
        },
      'mistralai/devstral-small':         {
          maxTokens: 4096,
          contextWindow: 128000,
          inputPrice: 0.07,
          outputPrice: 0.28,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Devstral Small 1"
        },
      'mistralai/mistral-small-3.2-24b-instruct:free':         {
          maxTokens: 4096,
          contextWindow: 131072,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Mistral-Small-3"
        },
      'mistralai/mistral-small-3.2-24b-instruct':         {
          maxTokens: 4096,
          contextWindow: 128000,
          inputPrice: 0.05,
          outputPrice: 0.1,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Mistral-Small-3"
        },
      'mistralai/magistral-small-2506':         {
          maxTokens: 40000,
          contextWindow: 40000,
          inputPrice: 0.5,
          outputPrice: 1.5,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Magistral Small is a 24B parameter instruction-tuned model based on Mistral-Small-3"
        },
      'mistralai/magistral-medium-2506':         {
          maxTokens: 40000,
          contextWindow: 40960,
          inputPrice: 2.0,
          outputPrice: 5.0,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Magistral is Mistral's first reasoning model"
        },
      'mistralai/magistral-medium-2506:thinking':         {
          maxTokens: 40000,
          contextWindow: 40960,
          inputPrice: 2.0,
          outputPrice: 5.0,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Magistral is Mistral's first reasoning model"
        },
      'mistralai/devstral-small-2505:free':         {
          maxTokens: 4096,
          contextWindow: 32768,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Devstral-Small-2505 is a 24B parameter agentic LLM fine-tuned from Mistral-Small-3"
        },
      'mistralai/devstral-small-2505':         {
          maxTokens: 4096,
          contextWindow: 131072,
          inputPrice: 0.019992,
          outputPrice: 0.080006,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Devstral-Small-2505 is a 24B parameter agentic LLM fine-tuned from Mistral-Small-3"
        },
      'mistralai/mistral-medium-3':         {
          maxTokens: 4096,
          contextWindow: 131072,
          inputPrice: 0.4,
          outputPrice: 2.0,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Mistral Medium 3 is a high-performance enterprise-grade language model designed to deliver frontier-level capabilities at significantly reduced operat"
        },
      'mistralai/mistral-small-3.1-24b-instruct:free':         {
          maxTokens: 4096,
          contextWindow: 128000,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Mistral Small 3"
        },
      'mistralai/mistral-small-3.1-24b-instruct':         {
          maxTokens: 96000,
          contextWindow: 131072,
          inputPrice: 0.019992,
          outputPrice: 0.080006,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Mistral Small 3"
        },
      'mistralai/mistral-saba':         {
          maxTokens: 4096,
          contextWindow: 32768,
          inputPrice: 0.2,
          outputPrice: 0.6,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Mistral Saba is a 24B-parameter language model specifically designed for the Middle East and South Asia, delivering accurate and contextually relevant"
        },
      'mistralai/mistral-small-24b-instruct-2501:free':         {
          maxTokens: 4096,
          contextWindow: 32768,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Mistral Small 3 is a 24B-parameter language model optimized for low-latency performance across common AI tasks"
        },
      'mistralai/mistral-small-24b-instruct-2501':         {
          maxTokens: 4096,
          contextWindow: 32768,
          inputPrice: 0.019992,
          outputPrice: 0.080006,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Mistral Small 3 is a 24B-parameter language model optimized for low-latency performance across common AI tasks"
        },
      'mistralai/codestral-2501':         {
          maxTokens: 4096,
          contextWindow: 262144,
          inputPrice: 0.3,
          outputPrice: 0.9,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "[Mistral](/mistralai)'s cutting-edge language model for coding"
        },
      'mistralai/mistral-large-2411':         {
          maxTokens: 4096,
          contextWindow: 131072,
          inputPrice: 2.0,
          outputPrice: 6.0,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Mistral Large 2 2411 is an update of [Mistral Large 2](/mistralai/mistral-large) released together with [Pixtral Large 2411](/mistralai/pixtral-large-"
        },
      'mistralai/mistral-large-2407':         {
          maxTokens: 4096,
          contextWindow: 131072,
          inputPrice: 2.0,
          outputPrice: 6.0,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "This is Mistral AI's flagship model, Mistral Large 2 (version mistral-large-2407)"
        },
      'mistralai/pixtral-large-2411':         {
          maxTokens: 4096,
          contextWindow: 131072,
          inputPrice: 2.0,
          outputPrice: 6.0,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Pixtral Large is a 124B parameter, open-weight, multimodal model built on top of [Mistral Large 2](/mistralai/mistral-large-2411)"
        },
      'mistralai/ministral-3b':         {
          maxTokens: 4096,
          contextWindow: 32768,
          inputPrice: 0.04,
          outputPrice: 0.04,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Ministral 3B is a 3B parameter model optimized for on-device and edge computing"
        },
      'mistralai/ministral-8b':         {
          maxTokens: 4096,
          contextWindow: 128000,
          inputPrice: 0.1,
          outputPrice: 0.1,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Ministral 8B is an 8B parameter model featuring a unique interleaved sliding-window attention pattern for faster, memory-efficient inference"
        },
      'mistralai/pixtral-12b':         {
          maxTokens: 4096,
          contextWindow: 32768,
          inputPrice: 0.1,
          outputPrice: 0.1,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "The first multi-modal, text+image-to-text model from Mistral AI"
        },
      'mistralai/mistral-nemo:free':         {
          maxTokens: 128000,
          contextWindow: 131072,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "A 12B parameter model with a 128k token context length built by Mistral in collaboration with NVIDIA"
        },
      'mistralai/mistral-nemo':         {
          maxTokens: 4096,
          contextWindow: 32000,
          inputPrice: 0.0075,
          outputPrice: 0.05,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "A 12B parameter model with a 128k token context length built by Mistral in collaboration with NVIDIA"
        },
      'mistralai/mistral-7b-instruct:free':         {
          maxTokens: 16384,
          contextWindow: 32768,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "A high-performing, industry-standard 7"
        },
      'mistralai/mistral-7b-instruct':         {
          maxTokens: 16384,
          contextWindow: 32768,
          inputPrice: 0.028,
          outputPrice: 0.054,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "A high-performing, industry-standard 7"
        },
      'mistralai/mistral-7b-instruct-v0.3':         {
          maxTokens: 16384,
          contextWindow: 32768,
          inputPrice: 0.028,
          outputPrice: 0.054,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "A high-performing, industry-standard 7"
        },
      'mistralai/mixtral-8x22b-instruct':         {
          maxTokens: 4096,
          contextWindow: 65536,
          inputPrice: 0.9,
          outputPrice: 0.9,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Mistral's official instruct fine-tuned version of [Mixtral 8x22B](/models/mistralai/mixtral-8x22b)"
        },
      'mistralai/mistral-large':         {
          maxTokens: 4096,
          contextWindow: 128000,
          inputPrice: 2.0,
          outputPrice: 6.0,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "This is Mistral AI's flagship model, Mistral Large 2 (version `mistral-large-2407`)"
        },
      'mistralai/mistral-small':         {
          maxTokens: 4096,
          contextWindow: 32768,
          inputPrice: 0.2,
          outputPrice: 0.6,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "With 22 billion parameters, Mistral Small v24"
        },
      'mistralai/mistral-tiny':         {
          maxTokens: 4096,
          contextWindow: 32768,
          inputPrice: 0.25,
          outputPrice: 0.25,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Note: This model is being deprecated"
        },
      'mistralai/mixtral-8x7b-instruct':         {
          maxTokens: 16384,
          contextWindow: 32768,
          inputPrice: 0.08,
          outputPrice: 0.24,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Mixtral 8x7B Instruct is a pretrained generative Sparse Mixture of Experts, by Mistral AI, for chat and instruction use"
        },
      'mistralai/mistral-7b-instruct-v0.1':         {
          maxTokens: 4096,
          contextWindow: 2824,
          inputPrice: 0.11,
          outputPrice: 0.19,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "A 7"
        },
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://docs.mistral.ai/img/mistral.svg',
    clickable: true
  },
  'moonshotai': {
    id: 'moonshotai',
    name: 'Moonshot AI',
    description: "Moonshot AI models with comprehensive AI capabilities",
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'vision', 'tools', 'reasoning'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'moonshotai/kimi-k2:free',
    modelCount: 6,
    supportedModels: {
      'moonshotai/kimi-k2:free':         {
          maxTokens: 4096,
          contextWindow: 32768,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Kimi K2 Instruct is a large-scale Mixture-of-Experts (MoE) language model developed by Moonshot AI, featuring 1 trillion total parameters with 32 bill"
        },
      'moonshotai/kimi-k2':         {
          maxTokens: 63000,
          contextWindow: 63000,
          inputPrice: 0.14,
          outputPrice: 2.49,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Kimi K2 Instruct is a large-scale Mixture-of-Experts (MoE) language model developed by Moonshot AI, featuring 1 trillion total parameters with 32 bill"
        },
      'moonshotai/kimi-dev-72b:free':         {
          maxTokens: 4096,
          contextWindow: 131072,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Kimi-Dev-72B is an open-source large language model fine-tuned for software engineering and issue resolution tasks"
        },
      'moonshotai/kimi-dev-72b':         {
          maxTokens: 131072,
          contextWindow: 131072,
          inputPrice: 0.29,
          outputPrice: 1.15,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Kimi-Dev-72B is an open-source large language model fine-tuned for software engineering and issue resolution tasks"
        },
      'moonshotai/kimi-vl-a3b-thinking:free':         {
          maxTokens: 4096,
          contextWindow: 131072,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Kimi-VL is a lightweight Mixture-of-Experts vision-language model that activates only 2"
        },
      'moonshotai/kimi-vl-a3b-thinking':         {
          maxTokens: 4096,
          contextWindow: 131072,
          inputPrice: 0.02499,
          outputPrice: 0.100008,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Kimi-VL is a lightweight Mixture-of-Experts vision-language model that activates only 2"
        },
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://platform.moonshot.cn/favicon.ico',
    clickable: true
  },
  'morph': {
    id: 'morph',
    name: 'Morph',
    description: "Morph models with comprehensive AI capabilities",
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'morph/morph-v3-large',
    modelCount: 2,
    supportedModels: {
      'morph/morph-v3-large':         {
          maxTokens: 38000,
          contextWindow: 81920,
          inputPrice: 0.9,
          outputPrice: 1.9,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Morph's high-accuracy apply model for complex code edits"
        },
      'morph/morph-v3-fast':         {
          maxTokens: 38000,
          contextWindow: 81920,
          inputPrice: 0.9,
          outputPrice: 1.9,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Morph's fastest apply model for code edits"
        },
    },
    features: {
      streaming: true,
      tools: false,
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://ui-avatars.com/api/?name=M&background=6366f1&color=white',
    clickable: true
  },
  'neversleep': {
    id: 'neversleep',
    name: 'Neversleep',
    description: "Neversleep models with comprehensive AI capabilities",
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'neversleep/llama-3.1-lumimaid-8b',
    modelCount: 3,
    supportedModels: {
      'neversleep/llama-3.1-lumimaid-8b':         {
          maxTokens: 4096,
          contextWindow: 32768,
          inputPrice: 0.09,
          outputPrice: 0.6,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Lumimaid v0"
        },
      'neversleep/llama-3-lumimaid-70b':         {
          maxTokens: 4096,
          contextWindow: 8192,
          inputPrice: 4.0,
          outputPrice: 6.0,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "The NeverSleep team is back, with a Llama 3 70B finetune trained on their curated roleplay data"
        },
      'neversleep/noromaid-20b':         {
          maxTokens: 4096,
          contextWindow: 4096,
          inputPrice: 1.0,
          outputPrice: 1.75,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "A collab between IkariDev and Undi"
        },
    },
    features: {
      streaming: true,
      tools: false,
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://ui-avatars.com/api/?name=N&background=6366f1&color=white',
    clickable: true
  },
  'nousresearch': {
    id: 'nousresearch',
    name: 'Nousresearch',
    description: "Nousresearch models with comprehensive AI capabilities",
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'tools', 'reasoning'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'nousresearch/hermes-4-70b',
    modelCount: 7,
    supportedModels: {
      'nousresearch/hermes-4-70b':         {
          maxTokens: 4096,
          contextWindow: 131072,
          inputPrice: 0.093295,
          outputPrice: 0.373363,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Hermes 4 70B is a hybrid reasoning model from Nous Research, built on Meta-Llama-3"
        },
      'nousresearch/hermes-4-405b':         {
          maxTokens: 4096,
          contextWindow: 131072,
          inputPrice: 0.199919,
          outputPrice: 0.800064,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Hermes 4 is a large-scale reasoning model built on Meta-Llama-3"
        },
      'nousresearch/deephermes-3-mistral-24b-preview':         {
          maxTokens: 4096,
          contextWindow: 32768,
          inputPrice: 0.093295,
          outputPrice: 0.373363,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "DeepHermes 3 (Mistral 24B Preview) is an instruction-tuned language model by Nous Research based on Mistral-Small-24B, designed for chat, function cal"
        },
      'nousresearch/deephermes-3-llama-3-8b-preview:free':         {
          maxTokens: 4096,
          contextWindow: 131072,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "DeepHermes 3 Preview is the latest version of our flagship Hermes series of LLMs by Nous Research, and one of the first models in the world to unify R"
        },
      'nousresearch/hermes-3-llama-3.1-70b':         {
          maxTokens: 4096,
          contextWindow: 131072,
          inputPrice: 0.1,
          outputPrice: 0.28,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Hermes 3 is a generalist language model with many improvements over [Hermes 2](/models/nousresearch/nous-hermes-2-mistral-7b-dpo), including advanced "
        },
      'nousresearch/hermes-3-llama-3.1-405b':         {
          maxTokens: 16384,
          contextWindow: 131072,
          inputPrice: 0.7,
          outputPrice: 0.8,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Hermes 3 is a generalist language model with many improvements over Hermes 2, including advanced agentic capabilities, much better roleplaying, reason"
        },
      'nousresearch/hermes-2-pro-llama-3-8b':         {
          maxTokens: 131072,
          contextWindow: 131072,
          inputPrice: 0.025,
          outputPrice: 0.04,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Hermes 2 Pro is an upgraded, retrained version of Nous Hermes 2, consisting of an updated and cleaned version of the OpenHermes 2"
        },
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://avatars.githubusercontent.com/u/97659429?s=200&v=4',
    clickable: true
  },
  'nvidia': {
    id: 'nvidia',
    name: 'Nvidia',
    description: "Nvidia models with comprehensive AI capabilities",
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'tools', 'reasoning'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'nvidia/llama-3.3-nemotron-super-49b-v1',
    modelCount: 4,
    supportedModels: {
      'nvidia/llama-3.3-nemotron-super-49b-v1':         {
          maxTokens: 4096,
          contextWindow: 131072,
          inputPrice: 0.13,
          outputPrice: 0.4,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Llama-3"
        },
      'nvidia/llama-3.1-nemotron-ultra-253b-v1:free':         {
          maxTokens: 4096,
          contextWindow: 131072,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Llama-3"
        },
      'nvidia/llama-3.1-nemotron-ultra-253b-v1':         {
          maxTokens: 4096,
          contextWindow: 131072,
          inputPrice: 0.6,
          outputPrice: 1.8,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Llama-3"
        },
      'nvidia/llama-3.1-nemotron-70b-instruct':         {
          maxTokens: 16384,
          contextWindow: 131072,
          inputPrice: 0.12,
          outputPrice: 0.3,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "NVIDIA's Llama 3"
        },
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://ui-avatars.com/api/?name=N&background=6366f1&color=white',
    clickable: true
  },
  'openai': {
    id: 'openai',
    name: 'OpenAI',
    description: "OpenAI models with comprehensive AI capabilities",
    category: 'api',
    authType: 'api_key',
    tags: ['openrouter', 'vision', 'tools', 'reasoning', 'core'],
    tier: 'premium',
    baseUrl: 'https://api.openai.com/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openai/gpt-4o-audio-preview',
    modelCount: 42,
    supportedModels: {
      'openai/gpt-4o-audio-preview':         {
          maxTokens: 16384,
          contextWindow: 128000,
          inputPrice: 2.5,
          outputPrice: 10.0,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "The gpt-4o-audio-preview model adds support for audio inputs as prompts"
        },
      'openai/gpt-5-chat':         {
          maxTokens: 16384,
          contextWindow: 128000,
          inputPrice: 1.25,
          outputPrice: 10.0,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "GPT-5 Chat is designed for advanced, natural, multimodal, and context-aware conversations for enterprise applications"
        },
      'openai/gpt-5':         {
          maxTokens: 128000,
          contextWindow: 400000,
          inputPrice: 1.25,
          outputPrice: 10.0,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "GPT-5 is OpenAI’s most advanced model, offering major improvements in reasoning, code quality, and user experience"
        },
      'openai/gpt-5-mini':         {
          maxTokens: 128000,
          contextWindow: 400000,
          inputPrice: 0.25,
          outputPrice: 2.0,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "GPT-5 Mini is a compact version of GPT-5, designed to handle lighter-weight reasoning tasks"
        },
      'openai/gpt-5-nano':         {
          maxTokens: 128000,
          contextWindow: 400000,
          inputPrice: 0.05,
          outputPrice: 0.4,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "GPT-5-Nano is the smallest and fastest variant in the GPT-5 system, optimized for developer tools, rapid interactions, and ultra-low latency environme"
        },
      'openai/gpt-oss-120b:free':         {
          maxTokens: 4096,
          contextWindow: 32768,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "gpt-oss-120b is an open-weight, 117B-parameter Mixture-of-Experts (MoE) language model from OpenAI designed for high-reasoning, agentic, and general-p"
        },
      'openai/gpt-oss-120b':         {
          maxTokens: 131000,
          contextWindow: 131000,
          inputPrice: 0.072,
          outputPrice: 0.28,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "gpt-oss-120b is an open-weight, 117B-parameter Mixture-of-Experts (MoE) language model from OpenAI designed for high-reasoning, agentic, and general-p"
        },
      'openai/gpt-oss-20b:free':         {
          maxTokens: 131072,
          contextWindow: 131072,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "gpt-oss-20b is an open-weight 21B parameter model released by OpenAI under the Apache 2"
        },
      'openai/gpt-oss-20b':         {
          maxTokens: 131000,
          contextWindow: 131000,
          inputPrice: 0.04,
          outputPrice: 0.15,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "gpt-oss-20b is an open-weight 21B parameter model released by OpenAI under the Apache 2"
        },
      'openai/o3-pro':         {
          maxTokens: 100000,
          contextWindow: 200000,
          inputPrice: 20.0,
          outputPrice: 80.0,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "The o-series of models are trained with reinforcement learning to think before they answer and perform complex reasoning"
        },
      'openai/codex-mini':         {
          maxTokens: 100000,
          contextWindow: 200000,
          inputPrice: 1.5,
          outputPrice: 6.0,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "codex-mini-latest is a fine-tuned version of o4-mini specifically for use in Codex CLI"
        },
      'openai/o4-mini-high':         {
          maxTokens: 100000,
          contextWindow: 200000,
          inputPrice: 1.1,
          outputPrice: 4.4,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "OpenAI o4-mini-high is the same model as [o4-mini](/openai/o4-mini) with reasoning_effort set to high"
        },
      'openai/o3':         {
          maxTokens: 100000,
          contextWindow: 200000,
          inputPrice: 2.0,
          outputPrice: 8.0,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "o3 is a well-rounded and powerful model across domains"
        },
      'openai/o4-mini':         {
          maxTokens: 100000,
          contextWindow: 200000,
          inputPrice: 1.1,
          outputPrice: 4.4,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "OpenAI o4-mini is a compact reasoning model in the o-series, optimized for fast, cost-efficient performance while retaining strong multimodal and agen"
        },
      'openai/gpt-4.1':         {
          maxTokens: 32768,
          contextWindow: 1047576,
          inputPrice: 2.0,
          outputPrice: 8.0,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "GPT-4"
        },
      'openai/gpt-4.1-mini':         {
          maxTokens: 32768,
          contextWindow: 1047576,
          inputPrice: 0.4,
          outputPrice: 1.6,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "GPT-4"
        },
      'openai/gpt-4.1-nano':         {
          maxTokens: 32768,
          contextWindow: 1047576,
          inputPrice: 0.1,
          outputPrice: 0.4,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "For tasks that demand low latency, GPT‑4"
        },
      'openai/o1-pro':         {
          maxTokens: 100000,
          contextWindow: 200000,
          inputPrice: 150.0,
          outputPrice: 600.0,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "The o1 series of models are trained with reinforcement learning to think before they answer and perform complex reasoning"
        },
      'openai/gpt-4o-mini-search-preview':         {
          maxTokens: 16384,
          contextWindow: 128000,
          inputPrice: 0.15,
          outputPrice: 0.6,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "GPT-4o mini Search Preview is a specialized model for web search in Chat Completions"
        },
      'openai/gpt-4o-search-preview':         {
          maxTokens: 16384,
          contextWindow: 128000,
          inputPrice: 2.5,
          outputPrice: 10.0,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "GPT-4o Search Previewis a specialized model for web search in Chat Completions"
        },
      'openai/o3-mini-high':         {
          maxTokens: 100000,
          contextWindow: 200000,
          inputPrice: 1.1,
          outputPrice: 4.4,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "OpenAI o3-mini-high is the same model as [o3-mini](/openai/o3-mini) with reasoning_effort set to high"
        },
      'openai/o3-mini':         {
          maxTokens: 100000,
          contextWindow: 200000,
          inputPrice: 1.1,
          outputPrice: 4.4,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "OpenAI o3-mini is a cost-efficient language model optimized for STEM reasoning tasks, particularly excelling in science, mathematics, and coding"
        },
      'openai/o1':         {
          maxTokens: 100000,
          contextWindow: 200000,
          inputPrice: 15.0,
          outputPrice: 60.0,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "The latest and strongest model family from OpenAI, o1 is designed to spend more time thinking before responding"
        },
      'openai/gpt-4o-2024-11-20':         {
          maxTokens: 16384,
          contextWindow: 128000,
          inputPrice: 2.5,
          outputPrice: 10.0,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "The 2024-11-20 version of GPT-4o offers a leveled-up creative writing ability with more natural, engaging, and tailored writing to improve relevance &"
        },
      'openai/o1-mini-2024-09-12':         {
          maxTokens: 65536,
          contextWindow: 128000,
          inputPrice: 1.1,
          outputPrice: 4.4,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "The latest and strongest model family from OpenAI, o1 is designed to spend more time thinking before responding"
        },
      'openai/o1-mini':         {
          maxTokens: 65536,
          contextWindow: 128000,
          inputPrice: 1.1,
          outputPrice: 4.4,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "The latest and strongest model family from OpenAI, o1 is designed to spend more time thinking before responding"
        },
      'openai/chatgpt-4o-latest':         {
          maxTokens: 16384,
          contextWindow: 128000,
          inputPrice: 5.0,
          outputPrice: 15.0,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "OpenAI ChatGPT 4o is continually updated by OpenAI to point to the current version of GPT-4o used by ChatGPT"
        },
      'openai/gpt-4o-2024-08-06':         {
          maxTokens: 16384,
          contextWindow: 128000,
          inputPrice: 2.5,
          outputPrice: 10.0,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "The 2024-08-06 version of GPT-4o offers improved performance in structured outputs, with the ability to supply a JSON schema in the respone_format"
        },
      'openai/gpt-4o-mini-2024-07-18':         {
          maxTokens: 16384,
          contextWindow: 128000,
          inputPrice: 0.15,
          outputPrice: 0.6,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "GPT-4o mini is OpenAI's newest model after [GPT-4 Omni](/models/openai/gpt-4o), supporting both text and image inputs with text outputs"
        },
      'openai/gpt-4o-mini':         {
          maxTokens: 16384,
          contextWindow: 128000,
          inputPrice: 0.15,
          outputPrice: 0.6,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "GPT-4o mini is OpenAI's newest model after [GPT-4 Omni](/models/openai/gpt-4o), supporting both text and image inputs with text outputs"
        },
      'openai/gpt-4o-2024-05-13':         {
          maxTokens: 4096,
          contextWindow: 128000,
          inputPrice: 5.0,
          outputPrice: 15.0,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "GPT-4o (\"o\" for \"omni\") is OpenAI's latest AI model, supporting both text and image inputs with text outputs"
        },
      'openai/gpt-4o':         {
          maxTokens: 16384,
          contextWindow: 128000,
          inputPrice: 2.5,
          outputPrice: 10.0,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "GPT-4o (\"o\" for \"omni\") is OpenAI's latest AI model, supporting both text and image inputs with text outputs"
        },
      'openai/gpt-4o:extended':         {
          maxTokens: 64000,
          contextWindow: 128000,
          inputPrice: 6.0,
          outputPrice: 18.0,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "GPT-4o (\"o\" for \"omni\") is OpenAI's latest AI model, supporting both text and image inputs with text outputs"
        },
      'openai/gpt-4-turbo':         {
          maxTokens: 4096,
          contextWindow: 128000,
          inputPrice: 10.0,
          outputPrice: 30.0,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "The latest GPT-4 Turbo model with vision capabilities"
        },
      'openai/gpt-4-turbo-preview':         {
          maxTokens: 4096,
          contextWindow: 128000,
          inputPrice: 10.0,
          outputPrice: 30.0,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "The preview GPT-4 model with improved instruction following, JSON mode, reproducible outputs, parallel function calling, and more"
        },
      'openai/gpt-3.5-turbo-0613':         {
          maxTokens: 4096,
          contextWindow: 4095,
          inputPrice: 1.0,
          outputPrice: 2.0,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "GPT-3"
        },
      'openai/gpt-4-1106-preview':         {
          maxTokens: 4096,
          contextWindow: 128000,
          inputPrice: 10.0,
          outputPrice: 30.0,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "The latest GPT-4 Turbo model with vision capabilities"
        },
      'openai/gpt-3.5-turbo-instruct':         {
          maxTokens: 4096,
          contextWindow: 4095,
          inputPrice: 1.5,
          outputPrice: 2.0,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "This model is a variant of GPT-3"
        },
      'openai/gpt-3.5-turbo-16k':         {
          maxTokens: 4096,
          contextWindow: 16385,
          inputPrice: 3.0,
          outputPrice: 4.0,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "This model offers four times the context length of gpt-3"
        },
      'openai/gpt-4-0314':         {
          maxTokens: 4096,
          contextWindow: 8191,
          inputPrice: 30.0,
          outputPrice: 60.0,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "GPT-4-0314 is the first version of GPT-4 released, with a context length of 8,192 tokens, and was supported until June 14"
        },
      'openai/gpt-3.5-turbo':         {
          maxTokens: 4096,
          contextWindow: 16385,
          inputPrice: 0.5,
          outputPrice: 1.5,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "GPT-3"
        },
      'openai/gpt-4':         {
          maxTokens: 4096,
          contextWindow: 8191,
          inputPrice: 30.0,
          outputPrice: 60.0,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "OpenAI's flagship model, GPT-4 is a large-scale multimodal language model capable of solving difficult problems with greater accuracy than previous mo"
        },
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/openai.svg',
    clickable: true
  },
  'opengvlab': {
    id: 'opengvlab',
    name: 'Opengvlab',
    description: "Opengvlab models with comprehensive AI capabilities",
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'vision'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'opengvlab/internvl3-14b',
    modelCount: 1,
    supportedModels: {
      'opengvlab/internvl3-14b':         {
          maxTokens: 4096,
          contextWindow: 12288,
          inputPrice: 0.2,
          outputPrice: 0.4,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "The 14b version of the InternVL3 series"
        },
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://ui-avatars.com/api/?name=O&background=6366f1&color=white',
    clickable: true
  },
  'openrouter': {
    id: 'openrouter',
    name: 'Openrouter',
    description: "Openrouter models with comprehensive AI capabilities",
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openrouter/auto',
    modelCount: 1,
    supportedModels: {
      'openrouter/auto':         {
          maxTokens: 4096,
          contextWindow: 2000000,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Your prompt will be processed by a meta-model and routed to one of dozens of models (see below), optimizing for the best possible output"
        },
    },
    features: {
      streaming: true,
      tools: false,
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://ui-avatars.com/api/?name=O&background=6366f1&color=white',
    clickable: true
  },
  'perplexity': {
    id: 'perplexity',
    name: 'Perplexity',
    description: "Perplexity models with comprehensive AI capabilities",
    category: 'api',
    authType: 'api_key',
    tags: ['openrouter', 'vision', 'reasoning'],
    tier: 'standard',
    baseUrl: 'https://api.perplexity.ai',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'perplexity/sonar-reasoning-pro',
    modelCount: 6,
    supportedModels: {
      'perplexity/sonar-reasoning-pro':         {
          maxTokens: 4096,
          contextWindow: 128000,
          inputPrice: 2.0,
          outputPrice: 8.0,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Note: Sonar Pro pricing includes Perplexity search pricing"
        },
      'perplexity/sonar-pro':         {
          maxTokens: 8000,
          contextWindow: 200000,
          inputPrice: 3.0,
          outputPrice: 15.0,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Note: Sonar Pro pricing includes Perplexity search pricing"
        },
      'perplexity/sonar-deep-research':         {
          maxTokens: 4096,
          contextWindow: 128000,
          inputPrice: 2.0,
          outputPrice: 8.0,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Sonar Deep Research is a research-focused model designed for multi-step retrieval, synthesis, and reasoning across complex topics"
        },
      'perplexity/r1-1776':         {
          maxTokens: 4096,
          contextWindow: 128000,
          inputPrice: 2.0,
          outputPrice: 8.0,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "R1 1776 is a version of DeepSeek-R1 that has been post-trained to remove censorship constraints related to topics restricted by the Chinese government"
        },
      'perplexity/sonar-reasoning':         {
          maxTokens: 4096,
          contextWindow: 127000,
          inputPrice: 1.0,
          outputPrice: 5.0,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Sonar Reasoning is a reasoning model provided by Perplexity based on [DeepSeek R1](/deepseek/deepseek-r1)"
        },
      'perplexity/sonar':         {
          maxTokens: 4096,
          contextWindow: 127072,
          inputPrice: 1.0,
          outputPrice: 1.0,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Sonar is lightweight, affordable, fast, and simple to use — now featuring citations and the ability to customize sources"
        },
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://www.perplexity.ai/favicon.svg',
    clickable: true
  },
  'pygmalionai': {
    id: 'pygmalionai',
    name: 'Pygmalionai',
    description: "Pygmalionai models with comprehensive AI capabilities",
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'pygmalionai/mythalion-13b',
    modelCount: 1,
    supportedModels: {
      'pygmalionai/mythalion-13b':         {
          maxTokens: 4096,
          contextWindow: 4096,
          inputPrice: 0.7,
          outputPrice: 1.1,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "A blend of the new Pygmalion-13b and MythoMax"
        },
    },
    features: {
      streaming: true,
      tools: false,
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://ui-avatars.com/api/?name=P&background=6366f1&color=white',
    clickable: true
  },
  'qwen': {
    id: 'qwen',
    name: 'Qwen',
    description: "Qwen models with comprehensive AI capabilities",
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'vision', 'tools', 'reasoning'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'qwen/qwen3-30b-a3b-thinking-2507',
    modelCount: 35,
    supportedModels: {
      'qwen/qwen3-30b-a3b-thinking-2507':         {
          maxTokens: 262144,
          contextWindow: 262144,
          inputPrice: 0.0713,
          outputPrice: 0.2852,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Qwen3-30B-A3B-Thinking-2507 is a 30B parameter Mixture-of-Experts reasoning model optimized for complex tasks requiring extended multi-step thinking"
        },
      'qwen/qwen3-coder-30b-a3b-instruct':         {
          maxTokens: 4096,
          contextWindow: 262144,
          inputPrice: 0.051831,
          outputPrice: 0.207424,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Qwen3-Coder-30B-A3B-Instruct is a 30"
        },
      'qwen/qwen3-30b-a3b-instruct-2507':         {
          maxTokens: 4096,
          contextWindow: 262144,
          inputPrice: 0.051831,
          outputPrice: 0.207424,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Qwen3-30B-A3B-Instruct-2507 is a 30"
        },
      'qwen/qwen3-235b-a22b-thinking-2507':         {
          maxTokens: 4096,
          contextWindow: 262144,
          inputPrice: 0.077968,
          outputPrice: 0.312025,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Qwen3-235B-A22B-Thinking-2507 is a high-performance, open-weight Mixture-of-Experts (MoE) language model optimized for complex reasoning tasks"
        },
      'qwen/qwen3-coder:free':         {
          maxTokens: 4096,
          contextWindow: 262144,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Qwen3-Coder-480B-A35B-Instruct is a Mixture-of-Experts (MoE) code generation model developed by the Qwen team"
        },
      'qwen/qwen3-coder':         {
          maxTokens: 4096,
          contextWindow: 262144,
          inputPrice: 0.2,
          outputPrice: 0.8,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Qwen3-Coder-480B-A35B-Instruct is a Mixture-of-Experts (MoE) code generation model developed by the Qwen team"
        },
      'qwen/qwen3-235b-a22b-2507':         {
          maxTokens: 4096,
          contextWindow: 262144,
          inputPrice: 0.077968,
          outputPrice: 0.312025,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Qwen3-235B-A22B-Instruct-2507 is a multilingual, instruction-tuned mixture-of-experts language model based on the Qwen3-235B architecture, with 22B ac"
        },
      'qwen/qwen3-4b:free':         {
          maxTokens: 4096,
          contextWindow: 40960,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Qwen3-4B is a 4 billion parameter dense language model from the Qwen3 series, designed to support both general-purpose and reasoning-intensive tasks"
        },
      'qwen/qwen3-30b-a3b:free':         {
          maxTokens: 4096,
          contextWindow: 40960,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Qwen3, the latest generation in the Qwen large language model series, features both dense and mixture-of-experts (MoE) architectures to excel in reaso"
        },
      'qwen/qwen3-30b-a3b':         {
          maxTokens: 4096,
          contextWindow: 40960,
          inputPrice: 0.019992,
          outputPrice: 0.080006,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Qwen3, the latest generation in the Qwen large language model series, features both dense and mixture-of-experts (MoE) architectures to excel in reaso"
        },
      'qwen/qwen3-8b:free':         {
          maxTokens: 40960,
          contextWindow: 40960,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Qwen3-8B is a dense 8"
        },
      'qwen/qwen3-8b':         {
          maxTokens: 20000,
          contextWindow: 128000,
          inputPrice: 0.035,
          outputPrice: 0.138,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Qwen3-8B is a dense 8"
        },
      'qwen/qwen3-14b:free':         {
          maxTokens: 4096,
          contextWindow: 40960,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Qwen3-14B is a dense 14"
        },
      'qwen/qwen3-14b':         {
          maxTokens: 40960,
          contextWindow: 40960,
          inputPrice: 0.06,
          outputPrice: 0.24,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Qwen3-14B is a dense 14"
        },
      'qwen/qwen3-32b':         {
          maxTokens: 4096,
          contextWindow: 40960,
          inputPrice: 0.017993,
          outputPrice: 0.072006,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Qwen3-32B is a dense 32"
        },
      'qwen/qwen3-235b-a22b:free':         {
          maxTokens: 4096,
          contextWindow: 131072,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Qwen3-235B-A22B is a 235B parameter mixture-of-experts (MoE) model developed by Qwen, activating 22B parameters per forward pass"
        },
      'qwen/qwen3-235b-a22b':         {
          maxTokens: 40960,
          contextWindow: 40960,
          inputPrice: 0.13,
          outputPrice: 0.6,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Qwen3-235B-A22B is a 235B parameter mixture-of-experts (MoE) model developed by Qwen, activating 22B parameters per forward pass"
        },
      'qwen/qwen2.5-vl-32b-instruct:free':         {
          maxTokens: 4096,
          contextWindow: 8192,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Qwen2"
        },
      'qwen/qwen2.5-vl-32b-instruct':         {
          maxTokens: 4096,
          contextWindow: 16384,
          inputPrice: 0.019992,
          outputPrice: 0.080006,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Qwen2"
        },
      'qwen/qwq-32b:free':         {
          maxTokens: 4096,
          contextWindow: 32768,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "QwQ is the reasoning model of the Qwen series"
        },
      'qwen/qwq-32b':         {
          maxTokens: 4096,
          contextWindow: 131072,
          inputPrice: 0.075,
          outputPrice: 0.15,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "QwQ is the reasoning model of the Qwen series"
        },
      'qwen/qwen-vl-plus':         {
          maxTokens: 1500,
          contextWindow: 7500,
          inputPrice: 0.21,
          outputPrice: 0.63,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Qwen's Enhanced Large Visual Language Model"
        },
      'qwen/qwen-vl-max':         {
          maxTokens: 1500,
          contextWindow: 7500,
          inputPrice: 0.8,
          outputPrice: 3.2,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Qwen VL Max is a visual understanding model with 7500 tokens context length"
        },
      'qwen/qwen-turbo':         {
          maxTokens: 8192,
          contextWindow: 1000000,
          inputPrice: 0.05,
          outputPrice: 0.2,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Qwen-Turbo, based on Qwen2"
        },
      'qwen/qwen2.5-vl-72b-instruct:free':         {
          maxTokens: 4096,
          contextWindow: 32768,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Qwen2"
        },
      'qwen/qwen2.5-vl-72b-instruct':         {
          maxTokens: 4096,
          contextWindow: 32768,
          inputPrice: 0.099959,
          outputPrice: 0.400032,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Qwen2"
        },
      'qwen/qwen-plus':         {
          maxTokens: 8192,
          contextWindow: 131072,
          inputPrice: 0.4,
          outputPrice: 1.2,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Qwen-Plus, based on the Qwen2"
        },
      'qwen/qwen-max':         {
          maxTokens: 8192,
          contextWindow: 32768,
          inputPrice: 1.6,
          outputPrice: 6.4,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Qwen-Max, based on Qwen2"
        },
      'qwen/qwq-32b-preview':         {
          maxTokens: 4096,
          contextWindow: 32768,
          inputPrice: 0.2,
          outputPrice: 0.2,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "QwQ-32B-Preview is an experimental research model focused on AI reasoning capabilities developed by the Qwen Team"
        },
      'qwen/qwen-2.5-coder-32b-instruct:free':         {
          maxTokens: 4096,
          contextWindow: 32768,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Qwen2"
        },
      'qwen/qwen-2.5-coder-32b-instruct':         {
          maxTokens: 4096,
          contextWindow: 32768,
          inputPrice: 0.04998,
          outputPrice: 0.200016,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Qwen2"
        },
      'qwen/qwen-2.5-7b-instruct':         {
          maxTokens: 4096,
          contextWindow: 65536,
          inputPrice: 0.04,
          outputPrice: 0.1,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Qwen2"
        },
      'qwen/qwen-2.5-72b-instruct:free':         {
          maxTokens: 4096,
          contextWindow: 32768,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Qwen2"
        },
      'qwen/qwen-2.5-72b-instruct':         {
          maxTokens: 4096,
          contextWindow: 32768,
          inputPrice: 0.051831,
          outputPrice: 0.207424,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Qwen2"
        },
      'qwen/qwen-2.5-vl-7b-instruct':         {
          maxTokens: 4096,
          contextWindow: 32768,
          inputPrice: 0.2,
          outputPrice: 0.2,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Qwen2"
        },
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://qianwen.alibabacloud.com/favicon.ico',
    clickable: true
  },
  'raifle': {
    id: 'raifle',
    name: 'Raifle',
    description: "Raifle models with comprehensive AI capabilities",
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'raifle/sorcererlm-8x22b',
    modelCount: 1,
    supportedModels: {
      'raifle/sorcererlm-8x22b':         {
          maxTokens: 4096,
          contextWindow: 16000,
          inputPrice: 4.5,
          outputPrice: 4.5,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "SorcererLM is an advanced RP and storytelling model, built as a Low-rank 16-bit LoRA fine-tuned on [WizardLM-2 8x22B](/microsoft/wizardlm-2-8x22b)"
        },
    },
    features: {
      streaming: true,
      tools: false,
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://ui-avatars.com/api/?name=R&background=6366f1&color=white',
    clickable: true
  },
  'rekaai': {
    id: 'rekaai',
    name: 'Rekaai',
    description: "Rekaai models with comprehensive AI capabilities",
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'reasoning'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'rekaai/reka-flash-3:free',
    modelCount: 1,
    supportedModels: {
      'rekaai/reka-flash-3:free':         {
          maxTokens: 4096,
          contextWindow: 32768,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Reka Flash 3 is a general-purpose, instruction-tuned large language model with 21 billion parameters, developed by Reka"
        },
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://ui-avatars.com/api/?name=R&background=6366f1&color=white',
    clickable: true
  },
  'sao10k': {
    id: 'sao10k',
    name: 'Sao10K',
    description: "Sao10K models with comprehensive AI capabilities",
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'sao10k/l3.3-euryale-70b',
    modelCount: 4,
    supportedModels: {
      'sao10k/l3.3-euryale-70b':         {
          maxTokens: 16384,
          contextWindow: 131072,
          inputPrice: 0.65,
          outputPrice: 0.75,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Euryale L3"
        },
      'sao10k/l3.1-euryale-70b':         {
          maxTokens: 4096,
          contextWindow: 32768,
          inputPrice: 0.65,
          outputPrice: 0.75,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Euryale L3"
        },
      'sao10k/l3-lunaris-8b':         {
          maxTokens: 4096,
          contextWindow: 8192,
          inputPrice: 0.02,
          outputPrice: 0.05,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Lunaris 8B is a versatile generalist and roleplaying model based on Llama 3"
        },
      'sao10k/l3-euryale-70b':         {
          maxTokens: 8192,
          contextWindow: 8192,
          inputPrice: 1.48,
          outputPrice: 1.48,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Euryale 70B v2"
        },
    },
    features: {
      streaming: true,
      tools: false,
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://ui-avatars.com/api/?name=S&background=6366f1&color=white',
    clickable: true
  },
  'shisa-ai': {
    id: 'shisa-ai',
    name: 'Shisa-Ai',
    description: "Shisa-Ai models with comprehensive AI capabilities",
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'shisa-ai/shisa-v2-llama3.3-70b:free',
    modelCount: 2,
    supportedModels: {
      'shisa-ai/shisa-v2-llama3.3-70b:free':         {
          maxTokens: 4096,
          contextWindow: 32768,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Shisa V2 Llama 3"
        },
      'shisa-ai/shisa-v2-llama3.3-70b':         {
          maxTokens: 4096,
          contextWindow: 32768,
          inputPrice: 0.019992,
          outputPrice: 0.080006,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Shisa V2 Llama 3"
        },
    },
    features: {
      streaming: true,
      tools: false,
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://ui-avatars.com/api/?name=S&background=6366f1&color=white',
    clickable: true
  },
  'sophosympatheia': {
    id: 'sophosympatheia',
    name: 'Sophosympatheia',
    description: "Sophosympatheia models with comprehensive AI capabilities",
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'sophosympatheia/midnight-rose-70b',
    modelCount: 1,
    supportedModels: {
      'sophosympatheia/midnight-rose-70b':         {
          maxTokens: 2048,
          contextWindow: 4096,
          inputPrice: 0.8,
          outputPrice: 0.8,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "A merge with a complex family tree, this model was crafted for roleplaying and storytelling"
        },
    },
    features: {
      streaming: true,
      tools: false,
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://ui-avatars.com/api/?name=S&background=6366f1&color=white',
    clickable: true
  },
  'switchpoint': {
    id: 'switchpoint',
    name: 'Switchpoint',
    description: "Switchpoint models with comprehensive AI capabilities",
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'reasoning'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'switchpoint/router',
    modelCount: 1,
    supportedModels: {
      'switchpoint/router':         {
          maxTokens: 4096,
          contextWindow: 131072,
          inputPrice: 0.85,
          outputPrice: 3.4,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Switchpoint AI's router instantly analyzes your request and directs it to the optimal AI from an ever-evolving library"
        },
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://ui-avatars.com/api/?name=S&background=6366f1&color=white',
    clickable: true
  },
  'tencent': {
    id: 'tencent',
    name: 'Tencent',
    description: "Tencent models with comprehensive AI capabilities",
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'reasoning'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'tencent/hunyuan-a13b-instruct:free',
    modelCount: 2,
    supportedModels: {
      'tencent/hunyuan-a13b-instruct:free':         {
          maxTokens: 4096,
          contextWindow: 32768,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Hunyuan-A13B is a 13B active parameter Mixture-of-Experts (MoE) language model developed by Tencent, with a total parameter count of 80B and support f"
        },
      'tencent/hunyuan-a13b-instruct':         {
          maxTokens: 4096,
          contextWindow: 32768,
          inputPrice: 0.03,
          outputPrice: 0.03,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Hunyuan-A13B is a 13B active parameter Mixture-of-Experts (MoE) language model developed by Tencent, with a total parameter count of 80B and support f"
        },
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://ui-avatars.com/api/?name=T&background=6366f1&color=white',
    clickable: true
  },
  'thedrummer': {
    id: 'thedrummer',
    name: 'Thedrummer',
    description: "Thedrummer models with comprehensive AI capabilities",
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'tools'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'thedrummer/anubis-70b-v1.1',
    modelCount: 5,
    supportedModels: {
      'thedrummer/anubis-70b-v1.1':         {
          maxTokens: 4096,
          contextWindow: 16384,
          inputPrice: 0.4,
          outputPrice: 0.7,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "TheDrummer's Anubis v1"
        },
      'thedrummer/anubis-pro-105b-v1':         {
          maxTokens: 131072,
          contextWindow: 131072,
          inputPrice: 0.5,
          outputPrice: 1.0,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Anubis Pro 105B v1 is an expanded and refined variant of Meta’s Llama 3"
        },
      'thedrummer/skyfall-36b-v2':         {
          maxTokens: 4096,
          contextWindow: 32768,
          inputPrice: 0.048129,
          outputPrice: 0.192608,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Skyfall 36B v2 is an enhanced iteration of Mistral Small 2501, specifically fine-tuned for improved creativity, nuanced writing, role-playing, and coh"
        },
      'thedrummer/unslopnemo-12b':         {
          maxTokens: 4096,
          contextWindow: 32768,
          inputPrice: 0.4,
          outputPrice: 0.4,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "UnslopNemo v4"
        },
      'thedrummer/rocinante-12b':         {
          maxTokens: 4096,
          contextWindow: 32768,
          inputPrice: 0.17,
          outputPrice: 0.43,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Rocinante 12B is designed for engaging storytelling and rich prose"
        },
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://ui-avatars.com/api/?name=T&background=6366f1&color=white',
    clickable: true
  },
  'thudm': {
    id: 'thudm',
    name: 'Thudm',
    description: "Thudm models with comprehensive AI capabilities",
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'vision', 'reasoning'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'thudm/glm-4.1v-9b-thinking',
    modelCount: 3,
    supportedModels: {
      'thudm/glm-4.1v-9b-thinking':         {
          maxTokens: 8000,
          contextWindow: 65536,
          inputPrice: 0.035,
          outputPrice: 0.138,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "GLM-4"
        },
      'thudm/glm-z1-32b':         {
          maxTokens: 4096,
          contextWindow: 32768,
          inputPrice: 0.019992,
          outputPrice: 0.080006,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "GLM-Z1-32B-0414 is an enhanced reasoning variant of GLM-4-32B, built for deep mathematical, logical, and code-oriented problem solving"
        },
      'thudm/glm-4-32b':         {
          maxTokens: 32000,
          contextWindow: 32000,
          inputPrice: 0.55,
          outputPrice: 1.66,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "GLM-4-32B-0414 is a 32B bilingual (Chinese-English) open-weight language model optimized for code generation, function calling, and agent-style tasks"
        },
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://ui-avatars.com/api/?name=T&background=6366f1&color=white',
    clickable: true
  },
  'tngtech': {
    id: 'tngtech',
    name: 'Tngtech',
    description: "Tngtech models with comprehensive AI capabilities",
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'reasoning'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'tngtech/deepseek-r1t2-chimera:free',
    modelCount: 3,
    supportedModels: {
      'tngtech/deepseek-r1t2-chimera:free':         {
          maxTokens: 4096,
          contextWindow: 163840,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "DeepSeek-TNG-R1T2-Chimera is the second-generation Chimera model from TNG Tech"
        },
      'tngtech/deepseek-r1t-chimera:free':         {
          maxTokens: 4096,
          contextWindow: 163840,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "DeepSeek-R1T-Chimera is created by merging DeepSeek-R1 and DeepSeek-V3 (0324), combining the reasoning capabilities of R1 with the token efficiency im"
        },
      'tngtech/deepseek-r1t-chimera':         {
          maxTokens: 4096,
          contextWindow: 163840,
          inputPrice: 0.199919,
          outputPrice: 0.800064,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "DeepSeek-R1T-Chimera is created by merging DeepSeek-R1 and DeepSeek-V3 (0324), combining the reasoning capabilities of R1 with the token efficiency im"
        },
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://ui-avatars.com/api/?name=T&background=6366f1&color=white',
    clickable: true
  },
  'undi95': {
    id: 'undi95',
    name: 'Undi95',
    description: "Undi95 models with comprehensive AI capabilities",
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'undi95/remm-slerp-l2-13b',
    modelCount: 1,
    supportedModels: {
      'undi95/remm-slerp-l2-13b':         {
          maxTokens: 4096,
          contextWindow: 6144,
          inputPrice: 0.45,
          outputPrice: 0.65,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "A recreation trial of the original MythoMax-L2-B13 but with updated models"
        },
    },
    features: {
      streaming: true,
      tools: false,
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://ui-avatars.com/api/?name=U&background=6366f1&color=white',
    clickable: true
  },
  'x-ai': {
    id: 'x-ai',
    name: 'X-Ai',
    description: "X-Ai models with comprehensive AI capabilities",
    category: 'api',
    authType: 'api_key',
    tags: ['openrouter', 'vision', 'tools', 'reasoning'],
    tier: 'premium',
    baseUrl: 'https://api.x.ai/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'x-ai/grok-code-fast-1',
    modelCount: 9,
    supportedModels: {
      'x-ai/grok-code-fast-1':         {
          maxTokens: 10000,
          contextWindow: 256000,
          inputPrice: 0.2,
          outputPrice: 1.5,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Grok Code Fast 1 is a speedy and economical reasoning model that excels at agentic coding"
        },
      'x-ai/grok-4':         {
          maxTokens: 4096,
          contextWindow: 256000,
          inputPrice: 3.0,
          outputPrice: 15.0,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Grok 4 is xAI's latest reasoning model with a 256k context window"
        },
      'x-ai/grok-3-mini':         {
          maxTokens: 4096,
          contextWindow: 131072,
          inputPrice: 0.3,
          outputPrice: 0.5,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "A lightweight model that thinks before responding"
        },
      'x-ai/grok-3':         {
          maxTokens: 4096,
          contextWindow: 131072,
          inputPrice: 3.0,
          outputPrice: 15.0,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Grok 3 is the latest model from xAI"
        },
      'x-ai/grok-3-mini-beta':         {
          maxTokens: 4096,
          contextWindow: 131072,
          inputPrice: 0.3,
          outputPrice: 0.5,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "Grok 3 Mini is a lightweight, smaller thinking model"
        },
      'x-ai/grok-3-beta':         {
          maxTokens: 4096,
          contextWindow: 131072,
          inputPrice: 3.0,
          outputPrice: 15.0,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Grok 3 is the latest model from xAI"
        },
      'x-ai/grok-2-vision-1212':         {
          maxTokens: 4096,
          contextWindow: 32768,
          inputPrice: 2.0,
          outputPrice: 10.0,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Grok 2 Vision 1212 advances image-based AI with stronger visual comprehension, refined instruction-following, and multilingual support"
        },
      'x-ai/grok-2-1212':         {
          maxTokens: 4096,
          contextWindow: 131072,
          inputPrice: 2.0,
          outputPrice: 10.0,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Grok 2 1212 introduces significant enhancements to accuracy, instruction adherence, and multilingual support, making it a powerful and flexible choice"
        },
      'x-ai/grok-vision-beta':         {
          maxTokens: 4096,
          contextWindow: 8192,
          inputPrice: 5.0,
          outputPrice: 15.0,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: false,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "Grok Vision Beta is xAI's experimental language model with vision capability"
        },
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://x.ai/favicon.ico',
    clickable: true
  },
  'z-ai': {
    id: 'z-ai',
    name: 'Z.AI',
    description: "Z.AI models with comprehensive AI capabilities",
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'vision', 'tools', 'reasoning'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'z-ai/glm-4.5v',
    modelCount: 5,
    supportedModels: {
      'z-ai/glm-4.5v':         {
          maxTokens: 65536,
          contextWindow: 65536,
          inputPrice: 0.5,
          outputPrice: 1.8,
          supportsImages: true,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "GLM-4"
        },
      'z-ai/glm-4.5':         {
          maxTokens: 4096,
          contextWindow: 131072,
          inputPrice: 0.329866,
          outputPrice: 1.320106,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "GLM-4"
        },
      'z-ai/glm-4.5-air:free':         {
          maxTokens: 4096,
          contextWindow: 131072,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "GLM-4"
        },
      'z-ai/glm-4.5-air':         {
          maxTokens: 131072,
          contextWindow: 131072,
          inputPrice: 0.14,
          outputPrice: 0.86,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: true,
          description: "GLM-4"
        },
      'z-ai/glm-4-32b':         {
          maxTokens: 4096,
          contextWindow: 128000,
          inputPrice: 0.1,
          outputPrice: 0.1,
          supportsImages: false,
          supportsAudio: false,
          supportsTools: true,
          supportsStreaming: true,
          supportsReasoning: false,
          description: "GLM 4 32B is a cost-effective foundation language model"
        },
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
    setupInstructions: "Get your API key from https://openrouter.ai/keys",
    iconUrl: 'https://ui-avatars.com/api/?name=Z&background=6366f1&color=white',
    clickable: true
  },
};

// Get all providers
export function getAllProviders(): ProviderConfiguration[] {
  return Object.values(COMPREHENSIVE_PROVIDERS)
}

// Get provider by ID
export function getProvider(providerId: string): ProviderConfiguration | undefined {
  return COMPREHENSIVE_PROVIDERS[providerId]
}

// Get providers by category
export function getProvidersByCategory(category: 'api' | 'openrouter'): ProviderConfiguration[] {
  return Object.values(COMPREHENSIVE_PROVIDERS).filter(p => p.category === category)
}

// Get providers by tag
export function getProvidersByTag(tag: string): ProviderConfiguration[] {
  return Object.values(COMPREHENSIVE_PROVIDERS).filter(p => p.tags.includes(tag))
}

// Get providers by tier
export function getProvidersByTier(tier: 'premium' | 'standard' | 'community'): ProviderConfiguration[] {
  return Object.values(COMPREHENSIVE_PROVIDERS).filter(p => p.tier === tier)
}

// Search providers
export function searchProviders(query: string): ProviderConfiguration[] {
  const searchTerm = query.toLowerCase()
  return Object.values(COMPREHENSIVE_PROVIDERS).filter(provider => 
    provider.name.toLowerCase().includes(searchTerm) ||
    provider.description.toLowerCase().includes(searchTerm) ||
    provider.tags.some(tag => tag.toLowerCase().includes(searchTerm))
  )
}

// Get total model count
export function getTotalModelCount(): number {
  return Object.values(COMPREHENSIVE_PROVIDERS).reduce((total, provider) => total + provider.modelCount, 0)
}

// Get models with specific capabilities
export function getModelsWithCapability(capability: keyof ModelInfo): Array<{provider: string, model: string, info: ModelInfo}> {
  const results: Array<{provider: string, model: string, info: ModelInfo}> = []
  
  Object.entries(COMPREHENSIVE_PROVIDERS).forEach(([providerId, provider]) => {
    Object.entries(provider.supportedModels).forEach(([modelId, modelInfo]) => {
      if (modelInfo[capability] === true) {
        results.push({
          provider: providerId,
          model: modelId,
          info: modelInfo
        })
      }
    })
  })
  
  return results
}

// Legacy export for backward compatibility
export const PROVIDERS = COMPREHENSIVE_PROVIDERS
