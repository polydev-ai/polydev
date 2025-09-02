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

  'openai': {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT models with cutting-edge AI capabilities',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'vision', 'audio', 'reasoning', 'tools'],
    tier: 'premium',
    baseUrl: 'https://api.openai.com/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openai/gpt-4o-audio-preview',
    modelCount: 42,
    supportedModels: {
      'openai/gpt-4o-audio-preview': {
        maxTokens: 16384,
        contextWindow: 128000,
        inputPrice: 2.500000,
        outputPrice: 10.000000,
        supportsImages: false,
        supportsAudio: true,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'The gpt-4o-audio-preview model adds support for audio inputs as prompts. This enhancement allows the model to detect nuances within audio recordings and add depth to generated user experiences. Audio '
      },
      'openai/gpt-5-chat': {
        maxTokens: 16384,
        contextWindow: 128000,
        inputPrice: 1.250000,
        outputPrice: 10.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'GPT-5 Chat is designed for advanced, natural, multimodal, and context-aware conversations for enterprise applications.'
      },
      'openai/gpt-5': {
        maxTokens: 128000,
        contextWindow: 400000,
        inputPrice: 1.250000,
        outputPrice: 10.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'GPT-5 is OpenAI’s most advanced model, offering major improvements in reasoning, code quality, and user experience. It is optimized for complex tasks that require step-by-step reasoning, instruction f'
      },
      'openai/gpt-5-mini': {
        maxTokens: 128000,
        contextWindow: 400000,
        inputPrice: 0.250000,
        outputPrice: 2.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'GPT-5 Mini is a compact version of GPT-5, designed to handle lighter-weight reasoning tasks. It provides the same instruction-following and safety-tuning benefits as GPT-5, but with reduced latency an'
      },
      'openai/gpt-5-nano': {
        maxTokens: 128000,
        contextWindow: 400000,
        inputPrice: 0.050000,
        outputPrice: 0.400000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'GPT-5-Nano is the smallest and fastest variant in the GPT-5 system, optimized for developer tools, rapid interactions, and ultra-low latency environments. While limited in reasoning depth compared to '
      },
      'openai/gpt-oss-120b:free': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'gpt-oss-120b is an open-weight, 117B-parameter Mixture-of-Experts (MoE) language model from OpenAI designed for high-reasoning, agentic, and general-purpose production use cases. It activates 5.1B par'
      },
      'openai/gpt-oss-120b': {
        maxTokens: 131000,
        contextWindow: 131000,
        inputPrice: 0.072000,
        outputPrice: 0.280000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'gpt-oss-120b is an open-weight, 117B-parameter Mixture-of-Experts (MoE) language model from OpenAI designed for high-reasoning, agentic, and general-purpose production use cases. It activates 5.1B par'
      },
      'openai/gpt-oss-20b:free': {
        maxTokens: 131072,
        contextWindow: 131072,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'gpt-oss-20b is an open-weight 21B parameter model released by OpenAI under the Apache 2.0 license. It uses a Mixture-of-Experts (MoE) architecture with 3.6B active parameters per forward pass, optimiz'
      },
      'openai/gpt-oss-20b': {
        maxTokens: 131000,
        contextWindow: 131000,
        inputPrice: 0.040000,
        outputPrice: 0.150000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'gpt-oss-20b is an open-weight 21B parameter model released by OpenAI under the Apache 2.0 license. It uses a Mixture-of-Experts (MoE) architecture with 3.6B active parameters per forward pass, optimiz'
      },
      'openai/o3-pro': {
        maxTokens: 100000,
        contextWindow: 200000,
        inputPrice: 20.000000,
        outputPrice: 80.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'The o-series of models are trained with reinforcement learning to think before they answer and perform complex reasoning. The o3-pro model uses more compute to think harder and provide consistently be'
      },
      'openai/codex-mini': {
        maxTokens: 100000,
        contextWindow: 200000,
        inputPrice: 1.500000,
        outputPrice: 6.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'codex-mini-latest is a fine-tuned version of o4-mini specifically for use in Codex CLI. For direct use in the API, we recommend starting with gpt-4.1.'
      },
      'openai/o4-mini-high': {
        maxTokens: 100000,
        contextWindow: 200000,
        inputPrice: 1.100000,
        outputPrice: 4.400000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'OpenAI o4-mini-high is the same model as [o4-mini](/openai/o4-mini) with reasoning_effort set to high.   OpenAI o4-mini is a compact reasoning model in the o-series, optimized for fast, cost-efficient'
      },
      'openai/o3': {
        maxTokens: 100000,
        contextWindow: 200000,
        inputPrice: 2.000000,
        outputPrice: 8.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'o3 is a well-rounded and powerful model across domains. It sets a new standard for math, science, coding, and visual reasoning tasks. It also excels at technical writing and instruction-following. Use'
      },
      'openai/o4-mini': {
        maxTokens: 100000,
        contextWindow: 200000,
        inputPrice: 1.100000,
        outputPrice: 4.400000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'OpenAI o4-mini is a compact reasoning model in the o-series, optimized for fast, cost-efficient performance while retaining strong multimodal and agentic capabilities. It supports tool use and demonst'
      },
      'openai/gpt-4.1': {
        maxTokens: 32768,
        contextWindow: 1047576,
        inputPrice: 2.000000,
        outputPrice: 8.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'GPT-4.1 is a flagship large language model optimized for advanced instruction following, real-world software engineering, and long-context reasoning. It supports a 1 million token context window and o'
      },
      'openai/gpt-4.1-mini': {
        maxTokens: 32768,
        contextWindow: 1047576,
        inputPrice: 0.400000,
        outputPrice: 1.600000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'GPT-4.1 Mini is a mid-sized model delivering performance competitive with GPT-4o at substantially lower latency and cost. It retains a 1 million token context window and scores 45.1% on hard instructi'
      },
      'openai/gpt-4.1-nano': {
        maxTokens: 32768,
        contextWindow: 1047576,
        inputPrice: 0.100000,
        outputPrice: 0.400000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'For tasks that demand low latency, GPT‑4.1 nano is the fastest and cheapest model in the GPT-4.1 series. It delivers exceptional performance at a small size with its 1 million token context window, an'
      },
      'openai/o1-pro': {
        maxTokens: 100000,
        contextWindow: 200000,
        inputPrice: 150.000000,
        outputPrice: 600.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'The o1 series of models are trained with reinforcement learning to think before they answer and perform complex reasoning. The o1-pro model uses more compute to think harder and provide consistently b'
      },
      'openai/gpt-4o-mini-search-preview': {
        maxTokens: 16384,
        contextWindow: 128000,
        inputPrice: 0.150000,
        outputPrice: 0.600000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'GPT-4o mini Search Preview is a specialized model for web search in Chat Completions. It is trained to understand and execute web search queries.'
      },
      'openai/gpt-4o-search-preview': {
        maxTokens: 16384,
        contextWindow: 128000,
        inputPrice: 2.500000,
        outputPrice: 10.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'GPT-4o Search Previewis a specialized model for web search in Chat Completions. It is trained to understand and execute web search queries.'
      },
      'openai/o3-mini-high': {
        maxTokens: 100000,
        contextWindow: 200000,
        inputPrice: 1.100000,
        outputPrice: 4.400000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'OpenAI o3-mini-high is the same model as [o3-mini](/openai/o3-mini) with reasoning_effort set to high.   o3-mini is a cost-efficient language model optimized for STEM reasoning tasks, particularly exc'
      },
      'openai/o3-mini': {
        maxTokens: 100000,
        contextWindow: 200000,
        inputPrice: 1.100000,
        outputPrice: 4.400000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'OpenAI o3-mini is a cost-efficient language model optimized for STEM reasoning tasks, particularly excelling in science, mathematics, and coding.  This model supports the `reasoning_effort` parameter,'
      },
      'openai/o1': {
        maxTokens: 100000,
        contextWindow: 200000,
        inputPrice: 15.000000,
        outputPrice: 60.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'The latest and strongest model family from OpenAI, o1 is designed to spend more time thinking before responding. The o1 model series is trained with large-scale reinforcement learning to reason using '
      },
      'openai/gpt-4o-2024-11-20': {
        maxTokens: 16384,
        contextWindow: 128000,
        inputPrice: 2.500000,
        outputPrice: 10.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'The 2024-11-20 version of GPT-4o offers a leveled-up creative writing ability with more natural, engaging, and tailored writing to improve relevance & readability. It’s also better at working with upl'
      },
      'openai/o1-mini': {
        maxTokens: 65536,
        contextWindow: 128000,
        inputPrice: 1.100000,
        outputPrice: 4.400000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'The latest and strongest model family from OpenAI, o1 is designed to spend more time thinking before responding.  The o1 models are optimized for math, science, programming, and other STEM-related tas'
      },
      'openai/o1-mini-2024-09-12': {
        maxTokens: 65536,
        contextWindow: 128000,
        inputPrice: 1.100000,
        outputPrice: 4.400000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'The latest and strongest model family from OpenAI, o1 is designed to spend more time thinking before responding.  The o1 models are optimized for math, science, programming, and other STEM-related tas'
      },
      'openai/chatgpt-4o-latest': {
        maxTokens: 16384,
        contextWindow: 128000,
        inputPrice: 5.000000,
        outputPrice: 15.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'OpenAI ChatGPT 4o is continually updated by OpenAI to point to the current version of GPT-4o used by ChatGPT. It therefore differs slightly from the API version of [GPT-4o](/models/openai/gpt-4o) in t'
      },
      'openai/gpt-4o-2024-08-06': {
        maxTokens: 16384,
        contextWindow: 128000,
        inputPrice: 2.500000,
        outputPrice: 10.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'The 2024-08-06 version of GPT-4o offers improved performance in structured outputs, with the ability to supply a JSON schema in the respone_format. Read more [here](https://openai.com/index/introducin'
      },
      'openai/gpt-4o-mini': {
        maxTokens: 16384,
        contextWindow: 128000,
        inputPrice: 0.150000,
        outputPrice: 0.600000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'GPT-4o mini is OpenAI\'s newest model after [GPT-4 Omni](/models/openai/gpt-4o), supporting both text and image inputs with text outputs.  As their most advanced small model, it is many multiples more'
      },
      'openai/gpt-4o-mini-2024-07-18': {
        maxTokens: 16384,
        contextWindow: 128000,
        inputPrice: 0.150000,
        outputPrice: 0.600000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'GPT-4o mini is OpenAI\'s newest model after [GPT-4 Omni](/models/openai/gpt-4o), supporting both text and image inputs with text outputs.  As their most advanced small model, it is many multiples more'
      },
      'openai/gpt-4o': {
        maxTokens: 16384,
        contextWindow: 128000,
        inputPrice: 2.500000,
        outputPrice: 10.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'GPT-4o ("o" for "omni") is OpenAI\'s latest AI model, supporting both text and image inputs with text outputs. It maintains the intelligence level of [GPT-4 Turbo](/models/openai/gpt-4-turbo) while be'
      },
      'openai/gpt-4o:extended': {
        maxTokens: 64000,
        contextWindow: 128000,
        inputPrice: 6.000000,
        outputPrice: 18.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'GPT-4o ("o" for "omni") is OpenAI\'s latest AI model, supporting both text and image inputs with text outputs. It maintains the intelligence level of [GPT-4 Turbo](/models/openai/gpt-4-turbo) while be'
      },
      'openai/gpt-4o-2024-05-13': {
        maxTokens: 4096,
        contextWindow: 128000,
        inputPrice: 5.000000,
        outputPrice: 15.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'GPT-4o ("o" for "omni") is OpenAI\'s latest AI model, supporting both text and image inputs with text outputs. It maintains the intelligence level of [GPT-4 Turbo](/models/openai/gpt-4-turbo) while be'
      },
      'openai/gpt-4-turbo': {
        maxTokens: 4096,
        contextWindow: 128000,
        inputPrice: 10.000000,
        outputPrice: 30.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'The latest GPT-4 Turbo model with vision capabilities. Vision requests can now use JSON mode and function calling.  Training data: up to December 2023.'
      },
      'openai/gpt-3.5-turbo-0613': {
        maxTokens: 4096,
        contextWindow: 4095,
        inputPrice: 1.000000,
        outputPrice: 2.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'GPT-3.5 Turbo is OpenAI\'s fastest model. It can understand and generate natural language or code, and is optimized for chat and traditional completion tasks.  Training data up to Sep 2021.'
      },
      'openai/gpt-4-turbo-preview': {
        maxTokens: 4096,
        contextWindow: 128000,
        inputPrice: 10.000000,
        outputPrice: 30.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'The preview GPT-4 model with improved instruction following, JSON mode, reproducible outputs, parallel function calling, and more. Training data: up to Dec 2023.  **Note:** heavily rate limited by Ope'
      },
      'openai/gpt-4-1106-preview': {
        maxTokens: 4096,
        contextWindow: 128000,
        inputPrice: 10.000000,
        outputPrice: 30.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'The latest GPT-4 Turbo model with vision capabilities. Vision requests can now use JSON mode and function calling.  Training data: up to April 2023.'
      },
      'openai/gpt-3.5-turbo-instruct': {
        maxTokens: 4096,
        contextWindow: 4095,
        inputPrice: 1.500000,
        outputPrice: 2.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'This model is a variant of GPT-3.5 Turbo tuned for instructional prompts and omitting chat-related optimizations. Training data: up to Sep 2021.'
      },
      'openai/gpt-3.5-turbo-16k': {
        maxTokens: 4096,
        contextWindow: 16385,
        inputPrice: 3.000000,
        outputPrice: 4.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'This model offers four times the context length of gpt-3.5-turbo, allowing it to support approximately 20 pages of text in a single request at a higher cost. Training data: up to Sep 2021.'
      },
      'openai/gpt-3.5-turbo': {
        maxTokens: 4096,
        contextWindow: 16385,
        inputPrice: 0.500000,
        outputPrice: 1.500000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'GPT-3.5 Turbo is OpenAI\'s fastest model. It can understand and generate natural language or code, and is optimized for chat and traditional completion tasks.  Training data up to Sep 2021.'
      },
      'openai/gpt-4': {
        maxTokens: 4096,
        contextWindow: 8191,
        inputPrice: 30.000000,
        outputPrice: 60.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'OpenAI\'s flagship model, GPT-4 is a large-scale multimodal language model capable of solving difficult problems with greater accuracy than previous models due to its broader general knowledge and adv'
      },
      'openai/gpt-4-0314': {
        maxTokens: 4096,
        contextWindow: 8191,
        inputPrice: 30.000000,
        outputPrice: 60.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'GPT-4-0314 is the first version of GPT-4 released, with a context length of 8,192 tokens, and was supported until June 14. Training data: up to Sep 2021.'
      }
    },
    features: {
      streaming: true,
      tools: true,
      images: true,
      audio: true,
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

  'qwen': {
    id: 'qwen',
    name: 'Qwen',
    description: 'Multilingual large language models',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'vision', 'reasoning', 'tools'],
    tier: 'premium',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'qwen/qwen3-30b-a3b-thinking-2507',
    modelCount: 35,
    supportedModels: {
      'qwen/qwen3-30b-a3b-thinking-2507': {
        maxTokens: 262144,
        contextWindow: 262144,
        inputPrice: 0.071300,
        outputPrice: 0.285200,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Qwen3-30B-A3B-Thinking-2507 is a 30B parameter Mixture-of-Experts reasoning model optimized for complex tasks requiring extended multi-step thinking. The model is designed specifically for “thinking m'
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
        description: 'Qwen3-Coder-30B-A3B-Instruct is a 30.5B parameter Mixture-of-Experts (MoE) model with 128 experts (8 active per forward pass), designed for advanced code generation, repository-scale understanding, an'
      },
      'qwen/qwen3-30b-a3b-instruct-2507': {
        maxTokens: 4096,
        contextWindow: 262144,
        inputPrice: 0.051831,
        outputPrice: 0.207424,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Qwen3-30B-A3B-Instruct-2507 is a 30.5B-parameter mixture-of-experts language model from Qwen, with 3.3B active parameters per inference. It operates in non-thinking mode and is designed for high-quali'
      },
      'qwen/qwen3-235b-a22b-thinking-2507': {
        maxTokens: 4096,
        contextWindow: 262144,
        inputPrice: 0.077968,
        outputPrice: 0.312025,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Qwen3-235B-A22B-Thinking-2507 is a high-performance, open-weight Mixture-of-Experts (MoE) language model optimized for complex reasoning tasks. It activates 22B of its 235B parameters per forward pass'
      },
      'qwen/qwen3-coder:free': {
        maxTokens: 4096,
        contextWindow: 262144,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Qwen3-Coder-480B-A35B-Instruct is a Mixture-of-Experts (MoE) code generation model developed by the Qwen team. It is optimized for agentic coding tasks such as function calling, tool use, and long-con'
      },
      'qwen/qwen3-coder': {
        maxTokens: 4096,
        contextWindow: 262144,
        inputPrice: 0.200000,
        outputPrice: 0.800000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Qwen3-Coder-480B-A35B-Instruct is a Mixture-of-Experts (MoE) code generation model developed by the Qwen team. It is optimized for agentic coding tasks such as function calling, tool use, and long-con'
      },
      'qwen/qwen3-235b-a22b-2507': {
        maxTokens: 4096,
        contextWindow: 262144,
        inputPrice: 0.077968,
        outputPrice: 0.312025,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Qwen3-235B-A22B-Instruct-2507 is a multilingual, instruction-tuned mixture-of-experts language model based on the Qwen3-235B architecture, with 22B active parameters per forward pass. It is optimized '
      },
      'qwen/qwen3-4b:free': {
        maxTokens: 4096,
        contextWindow: 40960,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Qwen3-4B is a 4 billion parameter dense language model from the Qwen3 series, designed to support both general-purpose and reasoning-intensive tasks. It introduces a dual-mode architecture—thinking an'
      },
      'qwen/qwen3-30b-a3b:free': {
        maxTokens: 4096,
        contextWindow: 40960,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Qwen3, the latest generation in the Qwen large language model series, features both dense and mixture-of-experts (MoE) architectures to excel in reasoning, multilingual support, and advanced agent tas'
      },
      'qwen/qwen3-30b-a3b': {
        maxTokens: 4096,
        contextWindow: 40960,
        inputPrice: 0.019992,
        outputPrice: 0.080006,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Qwen3, the latest generation in the Qwen large language model series, features both dense and mixture-of-experts (MoE) architectures to excel in reasoning, multilingual support, and advanced agent tas'
      },
      'qwen/qwen3-8b:free': {
        maxTokens: 40960,
        contextWindow: 40960,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Qwen3-8B is a dense 8.2B parameter causal language model from the Qwen3 series, designed for both reasoning-heavy tasks and efficient dialogue. It supports seamless switching between "thinking" mode f'
      },
      'qwen/qwen3-8b': {
        maxTokens: 20000,
        contextWindow: 128000,
        inputPrice: 0.035000,
        outputPrice: 0.138000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Qwen3-8B is a dense 8.2B parameter causal language model from the Qwen3 series, designed for both reasoning-heavy tasks and efficient dialogue. It supports seamless switching between "thinking" mode f'
      },
      'qwen/qwen3-14b:free': {
        maxTokens: 4096,
        contextWindow: 40960,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Qwen3-14B is a dense 14.8B parameter causal language model from the Qwen3 series, designed for both complex reasoning and efficient dialogue. It supports seamless switching between a "thinking" mode f'
      },
      'qwen/qwen3-14b': {
        maxTokens: 40960,
        contextWindow: 40960,
        inputPrice: 0.060000,
        outputPrice: 0.240000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Qwen3-14B is a dense 14.8B parameter causal language model from the Qwen3 series, designed for both complex reasoning and efficient dialogue. It supports seamless switching between a "thinking" mode f'
      },
      'qwen/qwen3-32b': {
        maxTokens: 4096,
        contextWindow: 40960,
        inputPrice: 0.017993,
        outputPrice: 0.072006,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Qwen3-32B is a dense 32.8B parameter causal language model from the Qwen3 series, optimized for both complex reasoning and efficient dialogue. It supports seamless switching between a "thinking" mode '
      },
      'qwen/qwen3-235b-a22b:free': {
        maxTokens: 4096,
        contextWindow: 131072,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Qwen3-235B-A22B is a 235B parameter mixture-of-experts (MoE) model developed by Qwen, activating 22B parameters per forward pass. It supports seamless switching between a "thinking" mode for complex r'
      },
      'qwen/qwen3-235b-a22b': {
        maxTokens: 40960,
        contextWindow: 40960,
        inputPrice: 0.130000,
        outputPrice: 0.600000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Qwen3-235B-A22B is a 235B parameter mixture-of-experts (MoE) model developed by Qwen, activating 22B parameters per forward pass. It supports seamless switching between a "thinking" mode for complex r'
      },
      'qwen/qwen2.5-vl-32b-instruct:free': {
        maxTokens: 4096,
        contextWindow: 8192,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Qwen2.5-VL-32B is a multimodal vision-language model fine-tuned through reinforcement learning for enhanced mathematical reasoning, structured outputs, and visual problem-solving capabilities. It exce'
      },
      'qwen/qwen2.5-vl-32b-instruct': {
        maxTokens: 4096,
        contextWindow: 16384,
        inputPrice: 0.019992,
        outputPrice: 0.080006,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Qwen2.5-VL-32B is a multimodal vision-language model fine-tuned through reinforcement learning for enhanced mathematical reasoning, structured outputs, and visual problem-solving capabilities. It exce'
      },
      'qwen/qwq-32b:free': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'QwQ is the reasoning model of the Qwen series. Compared with conventional instruction-tuned models, QwQ, which is capable of thinking and reasoning, can achieve significantly enhanced performance in d'
      },
      'qwen/qwq-32b': {
        maxTokens: 4096,
        contextWindow: 131072,
        inputPrice: 0.075000,
        outputPrice: 0.150000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'QwQ is the reasoning model of the Qwen series. Compared with conventional instruction-tuned models, QwQ, which is capable of thinking and reasoning, can achieve significantly enhanced performance in d'
      },
      'qwen/qwen-vl-plus': {
        maxTokens: 1500,
        contextWindow: 7500,
        inputPrice: 0.210000,
        outputPrice: 0.630000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Qwen\'s Enhanced Large Visual Language Model. Significantly upgraded for detailed recognition capabilities and text recognition abilities, supporting ultra-high pixel resolutions up to millions of pix'
      },
      'qwen/qwen-vl-max': {
        maxTokens: 1500,
        contextWindow: 7500,
        inputPrice: 0.800000,
        outputPrice: 3.200000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Qwen VL Max is a visual understanding model with 7500 tokens context length. It excels in delivering optimal performance for a broader spectrum of complex tasks. '
      },
      'qwen/qwen-turbo': {
        maxTokens: 8192,
        contextWindow: 1000000,
        inputPrice: 0.050000,
        outputPrice: 0.200000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Qwen-Turbo, based on Qwen2.5, is a 1M context model that provides fast speed and low cost, suitable for simple tasks.'
      },
      'qwen/qwen2.5-vl-72b-instruct:free': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Qwen2.5-VL is proficient in recognizing common objects such as flowers, birds, fish, and insects. It is also highly capable of analyzing texts, charts, icons, graphics, and layouts within images.'
      },
      'qwen/qwen2.5-vl-72b-instruct': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 0.099959,
        outputPrice: 0.400032,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Qwen2.5-VL is proficient in recognizing common objects such as flowers, birds, fish, and insects. It is also highly capable of analyzing texts, charts, icons, graphics, and layouts within images.'
      },
      'qwen/qwen-plus': {
        maxTokens: 8192,
        contextWindow: 131072,
        inputPrice: 0.400000,
        outputPrice: 1.200000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Qwen-Plus, based on the Qwen2.5 foundation model, is a 131K context model with a balanced performance, speed, and cost combination.'
      },
      'qwen/qwen-max': {
        maxTokens: 8192,
        contextWindow: 32768,
        inputPrice: 1.600000,
        outputPrice: 6.400000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Qwen-Max, based on Qwen2.5, provides the best inference performance among [Qwen models](/qwen), especially for complex multi-step tasks. It\'s a large-scale MoE model that has been pretrained on over '
      },
      'qwen/qwq-32b-preview': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 0.200000,
        outputPrice: 0.200000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'QwQ-32B-Preview is an experimental research model focused on AI reasoning capabilities developed by the Qwen Team. As a preview release, it demonstrates promising analytical abilities while having sev'
      },
      'qwen/qwen-2.5-coder-32b-instruct:free': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Qwen2.5-Coder is the latest series of Code-Specific Qwen large language models (formerly known as CodeQwen). Qwen2.5-Coder brings the following improvements upon CodeQwen1.5:  - Significantly improvem'
      },
      'qwen/qwen-2.5-coder-32b-instruct': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 0.049980,
        outputPrice: 0.200016,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Qwen2.5-Coder is the latest series of Code-Specific Qwen large language models (formerly known as CodeQwen). Qwen2.5-Coder brings the following improvements upon CodeQwen1.5:  - Significantly improvem'
      },
      'qwen/qwen-2.5-7b-instruct': {
        maxTokens: 4096,
        contextWindow: 65536,
        inputPrice: 0.040000,
        outputPrice: 0.100000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Qwen2.5 7B is the latest series of Qwen large language models. Qwen2.5 brings the following improvements upon Qwen2:  - Significantly more knowledge and has greatly improved capabilities in coding and'
      },
      'qwen/qwen-2.5-72b-instruct:free': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Qwen2.5 72B is the latest series of Qwen large language models. Qwen2.5 brings the following improvements upon Qwen2:  - Significantly more knowledge and has greatly improved capabilities in coding an'
      },
      'qwen/qwen-2.5-72b-instruct': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 0.051831,
        outputPrice: 0.207424,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Qwen2.5 72B is the latest series of Qwen large language models. Qwen2.5 brings the following improvements upon Qwen2:  - Significantly more knowledge and has greatly improved capabilities in coding an'
      },
      'qwen/qwen-2.5-vl-7b-instruct': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 0.200000,
        outputPrice: 0.200000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Qwen2.5 VL 7B is a multimodal LLM from the Qwen Team with the following key enhancements:  - SoTA understanding of images of various resolution & ratio: Qwen2.5-VL achieves state-of-the-art performanc'
      }
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
    iconUrl: 'https://qwen.readthedocs.io/en/latest/_static/logo.png',
    clickable: true
  },

  'mistralai': {
    id: 'mistralai',
    name: 'Mistral AI',
    description: 'High-performance open-source language models',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'vision', 'reasoning', 'tools'],
    tier: 'premium',
    baseUrl: 'https://api.mistral.ai/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'mistralai/mistral-medium-3.1',
    modelCount: 35,
    supportedModels: {
      'mistralai/mistral-medium-3.1': {
        maxTokens: 4096,
        contextWindow: 131072,
        inputPrice: 0.400000,
        outputPrice: 2.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Mistral Medium 3.1 is an updated version of Mistral Medium 3, which is a high-performance enterprise-grade language model designed to deliver frontier-level capabilities at significantly reduced opera'
      },
      'mistralai/codestral-2508': {
        maxTokens: 4096,
        contextWindow: 256000,
        inputPrice: 0.300000,
        outputPrice: 0.900000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Mistral\'s cutting-edge language model for coding released end of July 2025. Codestral specializes in low-latency, high-frequency tasks such as fill-in-the-middle (FIM), code correction and test gener'
      },
      'mistralai/devstral-medium': {
        maxTokens: 4096,
        contextWindow: 131072,
        inputPrice: 0.400000,
        outputPrice: 2.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Devstral Medium is a high-performance code generation and agentic reasoning model developed jointly by Mistral AI and All Hands AI. Positioned as a step up from Devstral Small, it achieves 61.6% on SW'
      },
      'mistralai/devstral-small': {
        maxTokens: 4096,
        contextWindow: 128000,
        inputPrice: 0.070000,
        outputPrice: 0.280000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Devstral Small 1.1 is a 24B parameter open-weight language model for software engineering agents, developed by Mistral AI in collaboration with All Hands AI. Finetuned from Mistral Small 3.1 and relea'
      },
      'mistralai/mistral-small-3.2-24b-instruct:free': {
        maxTokens: 4096,
        contextWindow: 131072,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Mistral-Small-3.2-24B-Instruct-2506 is an updated 24B parameter model from Mistral optimized for instruction following, repetition reduction, and improved function calling. Compared to the 3.1 release'
      },
      'mistralai/mistral-small-3.2-24b-instruct': {
        maxTokens: 4096,
        contextWindow: 128000,
        inputPrice: 0.050000,
        outputPrice: 0.100000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Mistral-Small-3.2-24B-Instruct-2506 is an updated 24B parameter model from Mistral optimized for instruction following, repetition reduction, and improved function calling. Compared to the 3.1 release'
      },
      'mistralai/magistral-small-2506': {
        maxTokens: 40000,
        contextWindow: 40000,
        inputPrice: 0.500000,
        outputPrice: 1.500000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Magistral Small is a 24B parameter instruction-tuned model based on Mistral-Small-3.1 (2503), enhanced through supervised fine-tuning on traces from Magistral Medium and further refined via reinforcem'
      },
      'mistralai/magistral-medium-2506': {
        maxTokens: 40000,
        contextWindow: 40960,
        inputPrice: 2.000000,
        outputPrice: 5.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Magistral is Mistral\'s first reasoning model. It is ideal for general purpose use requiring longer thought processing and better accuracy than with non-reasoning LLMs. From legal research and financi'
      },
      'mistralai/magistral-medium-2506:thinking': {
        maxTokens: 40000,
        contextWindow: 40960,
        inputPrice: 2.000000,
        outputPrice: 5.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Magistral is Mistral\'s first reasoning model. It is ideal for general purpose use requiring longer thought processing and better accuracy than with non-reasoning LLMs. From legal research and financi'
      },
      'mistralai/devstral-small-2505:free': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Devstral-Small-2505 is a 24B parameter agentic LLM fine-tuned from Mistral-Small-3.1, jointly developed by Mistral AI and All Hands AI for advanced software engineering tasks. It is optimized for code'
      },
      'mistralai/devstral-small-2505': {
        maxTokens: 4096,
        contextWindow: 131072,
        inputPrice: 0.019992,
        outputPrice: 0.080006,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Devstral-Small-2505 is a 24B parameter agentic LLM fine-tuned from Mistral-Small-3.1, jointly developed by Mistral AI and All Hands AI for advanced software engineering tasks. It is optimized for code'
      },
      'mistralai/mistral-medium-3': {
        maxTokens: 4096,
        contextWindow: 131072,
        inputPrice: 0.400000,
        outputPrice: 2.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Mistral Medium 3 is a high-performance enterprise-grade language model designed to deliver frontier-level capabilities at significantly reduced operational cost. It balances state-of-the-art reasoning'
      },
      'mistralai/mistral-small-3.1-24b-instruct:free': {
        maxTokens: 4096,
        contextWindow: 128000,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Mistral Small 3.1 24B Instruct is an upgraded variant of Mistral Small 3 (2501), featuring 24 billion parameters with advanced multimodal capabilities. It provides state-of-the-art performance in text'
      },
      'mistralai/mistral-small-3.1-24b-instruct': {
        maxTokens: 96000,
        contextWindow: 131072,
        inputPrice: 0.019992,
        outputPrice: 0.080006,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Mistral Small 3.1 24B Instruct is an upgraded variant of Mistral Small 3 (2501), featuring 24 billion parameters with advanced multimodal capabilities. It provides state-of-the-art performance in text'
      },
      'mistralai/mistral-saba': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 0.200000,
        outputPrice: 0.600000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Mistral Saba is a 24B-parameter language model specifically designed for the Middle East and South Asia, delivering accurate and contextually relevant responses while maintaining efficient performance'
      },
      'mistralai/mistral-small-24b-instruct-2501:free': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Mistral Small 3 is a 24B-parameter language model optimized for low-latency performance across common AI tasks. Released under the Apache 2.0 license, it features both pre-trained and instruction-tune'
      },
      'mistralai/mistral-small-24b-instruct-2501': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 0.019992,
        outputPrice: 0.080006,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Mistral Small 3 is a 24B-parameter language model optimized for low-latency performance across common AI tasks. Released under the Apache 2.0 license, it features both pre-trained and instruction-tune'
      },
      'mistralai/codestral-2501': {
        maxTokens: 4096,
        contextWindow: 262144,
        inputPrice: 0.300000,
        outputPrice: 0.900000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: '[Mistral](/mistralai)\'s cutting-edge language model for coding. Codestral specializes in low-latency, high-frequency tasks such as fill-in-the-middle (FIM), code correction and test generation.   Lea'
      },
      'mistralai/mistral-large-2411': {
        maxTokens: 4096,
        contextWindow: 131072,
        inputPrice: 2.000000,
        outputPrice: 6.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Mistral Large 2 2411 is an update of [Mistral Large 2](/mistralai/mistral-large) released together with [Pixtral Large 2411](/mistralai/pixtral-large-2411)  It provides a significant upgrade on the pr'
      },
      'mistralai/mistral-large-2407': {
        maxTokens: 4096,
        contextWindow: 131072,
        inputPrice: 2.000000,
        outputPrice: 6.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'This is Mistral AI\'s flagship model, Mistral Large 2 (version mistral-large-2407). It\'s a proprietary weights-available model and excels at reasoning, code, JSON, chat, and more. Read the launch ann'
      },
      'mistralai/pixtral-large-2411': {
        maxTokens: 4096,
        contextWindow: 131072,
        inputPrice: 2.000000,
        outputPrice: 6.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Pixtral Large is a 124B parameter, open-weight, multimodal model built on top of [Mistral Large 2](/mistralai/mistral-large-2411). The model is able to understand documents, charts and natural images.'
      },
      'mistralai/ministral-8b': {
        maxTokens: 4096,
        contextWindow: 128000,
        inputPrice: 0.100000,
        outputPrice: 0.100000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Ministral 8B is an 8B parameter model featuring a unique interleaved sliding-window attention pattern for faster, memory-efficient inference. Designed for edge use cases, it supports up to 128k contex'
      },
      'mistralai/ministral-3b': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 0.040000,
        outputPrice: 0.040000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Ministral 3B is a 3B parameter model optimized for on-device and edge computing. It excels in knowledge, commonsense reasoning, and function-calling, outperforming larger models like Mistral 7B on mos'
      },
      'mistralai/pixtral-12b': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 0.100000,
        outputPrice: 0.100000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'The first multi-modal, text+image-to-text model from Mistral AI. Its weights were launched via torrent: https://x.com/mistralai/status/1833758285167722836.'
      },
      'mistralai/mistral-nemo:free': {
        maxTokens: 128000,
        contextWindow: 131072,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'A 12B parameter model with a 128k token context length built by Mistral in collaboration with NVIDIA.  The model is multilingual, supporting English, French, German, Spanish, Italian, Portuguese, Chin'
      },
      'mistralai/mistral-nemo': {
        maxTokens: 4096,
        contextWindow: 32000,
        inputPrice: 0.007500,
        outputPrice: 0.050000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'A 12B parameter model with a 128k token context length built by Mistral in collaboration with NVIDIA.  The model is multilingual, supporting English, French, German, Spanish, Italian, Portuguese, Chin'
      },
      'mistralai/mistral-7b-instruct:free': {
        maxTokens: 16384,
        contextWindow: 32768,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'A high-performing, industry-standard 7.3B parameter model, with optimizations for speed and context length.  *Mistral 7B Instruct has multiple version variants, and this is intended to be the latest v'
      },
      'mistralai/mistral-7b-instruct': {
        maxTokens: 16384,
        contextWindow: 32768,
        inputPrice: 0.028000,
        outputPrice: 0.054000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'A high-performing, industry-standard 7.3B parameter model, with optimizations for speed and context length.  *Mistral 7B Instruct has multiple version variants, and this is intended to be the latest v'
      },
      'mistralai/mistral-7b-instruct-v0.3': {
        maxTokens: 16384,
        contextWindow: 32768,
        inputPrice: 0.028000,
        outputPrice: 0.054000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'A high-performing, industry-standard 7.3B parameter model, with optimizations for speed and context length.  An improved version of [Mistral 7B Instruct v0.2](/models/mistralai/mistral-7b-instruct-v0.'
      },
      'mistralai/mixtral-8x22b-instruct': {
        maxTokens: 4096,
        contextWindow: 65536,
        inputPrice: 0.900000,
        outputPrice: 0.900000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Mistral\'s official instruct fine-tuned version of [Mixtral 8x22B](/models/mistralai/mixtral-8x22b). It uses 39B active parameters out of 141B, offering unparalleled cost efficiency for its size. Its '
      },
      'mistralai/mistral-large': {
        maxTokens: 4096,
        contextWindow: 128000,
        inputPrice: 2.000000,
        outputPrice: 6.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'This is Mistral AI\'s flagship model, Mistral Large 2 (version `mistral-large-2407`). It\'s a proprietary weights-available model and excels at reasoning, code, JSON, chat, and more. Read the launch a'
      },
      'mistralai/mistral-small': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 0.200000,
        outputPrice: 0.600000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'With 22 billion parameters, Mistral Small v24.09 offers a convenient mid-point between (Mistral NeMo 12B)[/mistralai/mistral-nemo] and (Mistral Large 2)[/mistralai/mistral-large], providing a cost-eff'
      },
      'mistralai/mistral-tiny': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 0.250000,
        outputPrice: 0.250000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Note: This model is being deprecated. Recommended replacement is the newer [Ministral 8B](/mistral/ministral-8b)  This model is currently powered by Mistral-7B-v0.2, and incorporates a "better" fine-t'
      },
      'mistralai/mixtral-8x7b-instruct': {
        maxTokens: 16384,
        contextWindow: 32768,
        inputPrice: 0.080000,
        outputPrice: 0.240000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Mixtral 8x7B Instruct is a pretrained generative Sparse Mixture of Experts, by Mistral AI, for chat and instruction use. Incorporates 8 experts (feed-forward networks) for a total of 47 billion parame'
      },
      'mistralai/mistral-7b-instruct-v0.1': {
        maxTokens: 4096,
        contextWindow: 2824,
        inputPrice: 0.110000,
        outputPrice: 0.190000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'A 7.3B parameter model that outperforms Llama 2 13B on all benchmarks, with optimizations for speed and context length.'
      }
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
    iconUrl: 'https://mistral.ai/images/logo_hubc88c4ece131b91c7cb753f40e9e1cc5_2589_256x0_resize_q90_h2_lanczos_3.webp',
    clickable: true
  },

  'google': {
    id: 'google',
    name: 'Google',
    description: 'Gemini models with multimodal capabilities',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'vision', 'audio', 'reasoning', 'tools'],
    tier: 'premium',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'google/gemini-2.5-flash-image-preview:free',
    modelCount: 27,
    supportedModels: {
      'google/gemini-2.5-flash-image-preview:free': {
        maxTokens: 8192,
        contextWindow: 32768,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Gemini 2.5 Flash Image Preview is a state of the art image generation model with contextual understanding. It is capable of image generation, edits, and multi-turn conversations.'
      },
      'google/gemini-2.5-flash-image-preview': {
        maxTokens: 8192,
        contextWindow: 32768,
        inputPrice: 0.300000,
        outputPrice: 2.500000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Gemini 2.5 Flash Image Preview is a state of the art image generation model with contextual understanding. It is capable of image generation, edits, and multi-turn conversations.'
      },
      'google/gemini-2.5-flash-lite': {
        maxTokens: 65535,
        contextWindow: 1048576,
        inputPrice: 0.100000,
        outputPrice: 0.400000,
        supportsImages: true,
        supportsAudio: true,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Gemini 2.5 Flash-Lite is a lightweight reasoning model in the Gemini 2.5 family, optimized for ultra-low latency and cost efficiency. It offers improved throughput, faster token generation, and better'
      },
      'google/gemma-3n-e2b-it:free': {
        maxTokens: 2048,
        contextWindow: 8192,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Gemma 3n E2B IT is a multimodal, instruction-tuned model developed by Google DeepMind, designed to operate efficiently at an effective parameter size of 2B while leveraging a 6B architecture. Based on'
      },
      'google/gemini-2.5-flash-lite-preview-06-17': {
        maxTokens: 65535,
        contextWindow: 1048576,
        inputPrice: 0.100000,
        outputPrice: 0.400000,
        supportsImages: true,
        supportsAudio: true,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Gemini 2.5 Flash-Lite is a lightweight reasoning model in the Gemini 2.5 family, optimized for ultra-low latency and cost efficiency. It offers improved throughput, faster token generation, and better'
      },
      'google/gemini-2.5-flash': {
        maxTokens: 65535,
        contextWindow: 1048576,
        inputPrice: 0.300000,
        outputPrice: 2.500000,
        supportsImages: true,
        supportsAudio: true,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Gemini 2.5 Flash is Google\'s state-of-the-art workhorse model, specifically designed for advanced reasoning, coding, mathematics, and scientific tasks. It includes built-in "thinking" capabilities, e'
      },
      'google/gemini-2.5-pro': {
        maxTokens: 65536,
        contextWindow: 1048576,
        inputPrice: 1.250000,
        outputPrice: 10.000000,
        supportsImages: true,
        supportsAudio: true,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Gemini 2.5 Pro is Google’s state-of-the-art AI model designed for advanced reasoning, coding, mathematics, and scientific tasks. It employs “thinking” capabilities, enabling it to reason through respo'
      },
      'google/gemini-2.5-pro-preview': {
        maxTokens: 65536,
        contextWindow: 1048576,
        inputPrice: 1.250000,
        outputPrice: 10.000000,
        supportsImages: true,
        supportsAudio: true,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Gemini 2.5 Pro is Google’s state-of-the-art AI model designed for advanced reasoning, coding, mathematics, and scientific tasks. It employs “thinking” capabilities, enabling it to reason through respo'
      },
      'google/gemma-3n-e4b-it:free': {
        maxTokens: 2048,
        contextWindow: 8192,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Gemma 3n E4B-it is optimized for efficient execution on mobile and low-resource devices, such as phones, laptops, and tablets. It supports multimodal inputs—including text, visual data, and audio—enab'
      },
      'google/gemma-3n-e4b-it': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 0.020000,
        outputPrice: 0.040000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Gemma 3n E4B-it is optimized for efficient execution on mobile and low-resource devices, such as phones, laptops, and tablets. It supports multimodal inputs—including text, visual data, and audio—enab'
      },
      'google/gemini-2.5-pro-preview-05-06': {
        maxTokens: 65535,
        contextWindow: 1048576,
        inputPrice: 1.250000,
        outputPrice: 10.000000,
        supportsImages: true,
        supportsAudio: true,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Gemini 2.5 Pro is Google’s state-of-the-art AI model designed for advanced reasoning, coding, mathematics, and scientific tasks. It employs “thinking” capabilities, enabling it to reason through respo'
      },
      'google/gemini-2.5-pro-exp-03-25': {
        maxTokens: 65535,
        contextWindow: 1048576,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'This model has been deprecated by Google in favor of the (paid Preview model)[google/gemini-2.5-pro-preview]   Gemini 2.5 Pro is Google’s state-of-the-art AI model designed for advanced reasoning, cod'
      },
      'google/gemma-3-4b-it:free': {
        maxTokens: 8192,
        contextWindow: 32768,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Gemma 3 introduces multimodality, supporting vision-language input and text outputs. It handles context windows up to 128k tokens, understands over 140 languages, and offers improved math, reasoning, '
      },
      'google/gemma-3-4b-it': {
        maxTokens: 4096,
        contextWindow: 131072,
        inputPrice: 0.020000,
        outputPrice: 0.040000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Gemma 3 introduces multimodality, supporting vision-language input and text outputs. It handles context windows up to 128k tokens, understands over 140 languages, and offers improved math, reasoning, '
      },
      'google/gemma-3-12b-it:free': {
        maxTokens: 8192,
        contextWindow: 32768,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Gemma 3 introduces multimodality, supporting vision-language input and text outputs. It handles context windows up to 128k tokens, understands over 140 languages, and offers improved math, reasoning, '
      },
      'google/gemma-3-12b-it': {
        maxTokens: 8192,
        contextWindow: 96000,
        inputPrice: 0.048129,
        outputPrice: 0.192608,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Gemma 3 introduces multimodality, supporting vision-language input and text outputs. It handles context windows up to 128k tokens, understands over 140 languages, and offers improved math, reasoning, '
      },
      'google/gemma-3-27b-it:free': {
        maxTokens: 8192,
        contextWindow: 96000,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Gemma 3 introduces multimodality, supporting vision-language input and text outputs. It handles context windows up to 128k tokens, understands over 140 languages, and offers improved math, reasoning, '
      },
      'google/gemma-3-27b-it': {
        maxTokens: 8192,
        contextWindow: 96000,
        inputPrice: 0.066640,
        outputPrice: 0.266688,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Gemma 3 introduces multimodality, supporting vision-language input and text outputs. It handles context windows up to 128k tokens, understands over 140 languages, and offers improved math, reasoning, '
      },
      'google/gemini-2.0-flash-lite-001': {
        maxTokens: 8192,
        contextWindow: 1048576,
        inputPrice: 0.075000,
        outputPrice: 0.300000,
        supportsImages: true,
        supportsAudio: true,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Gemini 2.0 Flash Lite offers a significantly faster time to first token (TTFT) compared to [Gemini Flash 1.5](/google/gemini-flash-1.5), while maintaining quality on par with larger models like [Gemin'
      },
      'google/gemini-2.0-flash-001': {
        maxTokens: 8192,
        contextWindow: 1048576,
        inputPrice: 0.100000,
        outputPrice: 0.400000,
        supportsImages: true,
        supportsAudio: true,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Gemini Flash 2.0 offers a significantly faster time to first token (TTFT) compared to [Gemini Flash 1.5](/google/gemini-flash-1.5), while maintaining quality on par with larger models like [Gemini Pro'
      },
      'google/gemini-2.0-flash-exp:free': {
        maxTokens: 8192,
        contextWindow: 1048576,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Gemini Flash 2.0 offers a significantly faster time to first token (TTFT) compared to [Gemini Flash 1.5](/google/gemini-flash-1.5), while maintaining quality on par with larger models like [Gemini Pro'
      },
      'google/gemini-flash-1.5-8b': {
        maxTokens: 8192,
        contextWindow: 1000000,
        inputPrice: 0.037500,
        outputPrice: 0.150000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Gemini Flash 1.5 8B is optimized for speed and efficiency, offering enhanced performance in small prompt tasks like chat, transcription, and translation. With reduced latency, it is highly effective f'
      },
      'google/gemma-2-27b-it': {
        maxTokens: 4096,
        contextWindow: 8192,
        inputPrice: 0.650000,
        outputPrice: 0.650000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Gemma 2 27B by Google is an open model built from the same research and technology used to create the [Gemini models](/models?q=gemini).  Gemma models are well-suited for a variety of text generation '
      },
      'google/gemma-2-9b-it:free': {
        maxTokens: 8192,
        contextWindow: 8192,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Gemma 2 9B by Google is an advanced, open-source language model that sets a new standard for efficiency and performance in its size class.  Designed for a wide variety of tasks, it empowers developers'
      },
      'google/gemma-2-9b-it': {
        maxTokens: 8192,
        contextWindow: 8192,
        inputPrice: 0.010000,
        outputPrice: 0.010001,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Gemma 2 9B by Google is an advanced, open-source language model that sets a new standard for efficiency and performance in its size class.  Designed for a wide variety of tasks, it empowers developers'
      },
      'google/gemini-flash-1.5': {
        maxTokens: 8192,
        contextWindow: 1000000,
        inputPrice: 0.075000,
        outputPrice: 0.300000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Gemini 1.5 Flash is a foundation model that performs well at a variety of multimodal tasks such as visual understanding, classification, summarization, and creating content from image, audio and video'
      },
      'google/gemini-pro-1.5': {
        maxTokens: 8192,
        contextWindow: 2000000,
        inputPrice: 1.250000,
        outputPrice: 5.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Google\'s latest multimodal model, supports image and video[0] in text or chat prompts.  Optimized for language tasks including:  - Code generation - Text generation - Text editing - Problem solving -'
      }
    },
    features: {
      streaming: true,
      tools: true,
      images: true,
      audio: true,
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
    name: 'Meta Llama',
    description: 'Open-source LLaMA models from Meta',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'vision', 'tools'],
    tier: 'premium',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'meta-llama/llama-3.3-8b-instruct:free',
    modelCount: 22,
    supportedModels: {
      'meta-llama/llama-3.3-8b-instruct:free': {
        maxTokens: 4028,
        contextWindow: 128000,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'A lightweight and ultra-fast variant of Llama 3.3 70B, for use when quick response times are needed most.'
      },
      'meta-llama/llama-guard-4-12b': {
        maxTokens: 4096,
        contextWindow: 163840,
        inputPrice: 0.180000,
        outputPrice: 0.180000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Llama Guard 4 is a Llama 4 Scout-derived multimodal pretrained model, fine-tuned for content safety classification. Similar to previous versions, it can be used to classify content in both LLM inputs '
      },
      'meta-llama/llama-4-maverick:free': {
        maxTokens: 4028,
        contextWindow: 128000,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Llama 4 Maverick 17B Instruct (128E) is a high-capacity multimodal language model from Meta, built on a mixture-of-experts (MoE) architecture with 128 experts and 17 billion active parameters per forw'
      },
      'meta-llama/llama-4-maverick': {
        maxTokens: 16384,
        contextWindow: 1048576,
        inputPrice: 0.150000,
        outputPrice: 0.600000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Llama 4 Maverick 17B Instruct (128E) is a high-capacity multimodal language model from Meta, built on a mixture-of-experts (MoE) architecture with 128 experts and 17 billion active parameters per forw'
      },
      'meta-llama/llama-4-scout:free': {
        maxTokens: 4028,
        contextWindow: 128000,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Llama 4 Scout 17B Instruct (16E) is a mixture-of-experts (MoE) language model developed by Meta, activating 17 billion parameters out of a total of 109B. It supports native multimodal input (text and '
      },
      'meta-llama/llama-4-scout': {
        maxTokens: 1048576,
        contextWindow: 1048576,
        inputPrice: 0.080000,
        outputPrice: 0.300000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Llama 4 Scout 17B Instruct (16E) is a mixture-of-experts (MoE) language model developed by Meta, activating 17 billion parameters out of a total of 109B. It supports native multimodal input (text and '
      },
      'meta-llama/llama-guard-3-8b': {
        maxTokens: 4096,
        contextWindow: 131072,
        inputPrice: 0.020000,
        outputPrice: 0.060000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Llama Guard 3 is a Llama-3.1-8B pretrained model, fine-tuned for content safety classification. Similar to previous versions, it can be used to classify content in both LLM inputs (prompt classificati'
      },
      'meta-llama/llama-3.3-70b-instruct:free': {
        maxTokens: 4096,
        contextWindow: 65536,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'The Meta Llama 3.3 multilingual large language model (LLM) is a pretrained and instruction tuned generative model in 70B (text in/text out). The Llama 3.3 instruction tuned text only model is optimize'
      },
      'meta-llama/llama-3.3-70b-instruct': {
        maxTokens: 16384,
        contextWindow: 131072,
        inputPrice: 0.038000,
        outputPrice: 0.120000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'The Meta Llama 3.3 multilingual large language model (LLM) is a pretrained and instruction tuned generative model in 70B (text in/text out). The Llama 3.3 instruction tuned text only model is optimize'
      },
      'meta-llama/llama-3.2-3b-instruct:free': {
        maxTokens: 4096,
        contextWindow: 131072,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Llama 3.2 3B is a 3-billion-parameter multilingual large language model, optimized for advanced natural language processing tasks like dialogue generation, reasoning, and summarization. Designed with '
      },
      'meta-llama/llama-3.2-3b-instruct': {
        maxTokens: 20000,
        contextWindow: 20000,
        inputPrice: 0.003000,
        outputPrice: 0.006000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Llama 3.2 3B is a 3-billion-parameter multilingual large language model, optimized for advanced natural language processing tasks like dialogue generation, reasoning, and summarization. Designed with '
      },
      'meta-llama/llama-3.2-1b-instruct': {
        maxTokens: 16384,
        contextWindow: 131072,
        inputPrice: 0.005000,
        outputPrice: 0.010000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Llama 3.2 1B is a 1-billion-parameter language model focused on efficiently performing natural language tasks, such as summarization, dialogue, and multilingual text analysis. Its smaller size allows '
      },
      'meta-llama/llama-3.2-90b-vision-instruct': {
        maxTokens: 16384,
        contextWindow: 32768,
        inputPrice: 0.350000,
        outputPrice: 0.400000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'The Llama 90B Vision model is a top-tier, 90-billion-parameter multimodal model designed for the most challenging visual reasoning and language tasks. It offers unparalleled accuracy in image captioni'
      },
      'meta-llama/llama-3.2-11b-vision-instruct': {
        maxTokens: 16384,
        contextWindow: 131072,
        inputPrice: 0.049000,
        outputPrice: 0.049000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Llama 3.2 11B Vision is a multimodal model with 11 billion parameters, designed to handle tasks combining visual and textual data. It excels in tasks such as image captioning and visual question answe'
      },
      'meta-llama/llama-3.1-405b': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 2.000000,
        outputPrice: 2.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Meta\'s latest class of model (Llama 3.1) launched with a variety of sizes & flavors. This is the base 405B pre-trained version.  It has demonstrated strong performance compared to leading closed-sour'
      },
      'meta-llama/llama-3.1-8b-instruct': {
        maxTokens: 16384,
        contextWindow: 131072,
        inputPrice: 0.015000,
        outputPrice: 0.020000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Meta\'s latest class of model (Llama 3.1) launched with a variety of sizes & flavors. This 8B instruct-tuned version is fast and efficient.  It has demonstrated strong performance compared to leading '
      },
      'meta-llama/llama-3.1-405b-instruct:free': {
        maxTokens: 4096,
        contextWindow: 65536,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'The highly anticipated 400B class of Llama3 is here! Clocking in at 128k context with impressive eval scores, the Meta AI team continues to push the frontier of open-source LLMs.  Meta\'s latest class'
      },
      'meta-llama/llama-3.1-405b-instruct': {
        maxTokens: 16384,
        contextWindow: 32768,
        inputPrice: 0.800000,
        outputPrice: 0.800000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'The highly anticipated 400B class of Llama3 is here! Clocking in at 128k context with impressive eval scores, the Meta AI team continues to push the frontier of open-source LLMs.  Meta\'s latest class'
      },
      'meta-llama/llama-3.1-70b-instruct': {
        maxTokens: 16384,
        contextWindow: 131072,
        inputPrice: 0.100000,
        outputPrice: 0.280000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Meta\'s latest class of model (Llama 3.1) launched with a variety of sizes & flavors. This 70B instruct-tuned version is optimized for high quality dialogue usecases.  It has demonstrated strong perfo'
      },
      'meta-llama/llama-guard-2-8b': {
        maxTokens: 4096,
        contextWindow: 8192,
        inputPrice: 0.200000,
        outputPrice: 0.200000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'This safeguard model has 8B parameters and is based on the Llama 3 family. Just like is predecessor, [LlamaGuard 1](https://huggingface.co/meta-llama/LlamaGuard-7b), it can do both prompt and response'
      },
      'meta-llama/llama-3-8b-instruct': {
        maxTokens: 16384,
        contextWindow: 8192,
        inputPrice: 0.030000,
        outputPrice: 0.060000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Meta\'s latest class of model (Llama 3) launched with a variety of sizes & flavors. This 8B instruct-tuned version was optimized for high quality dialogue usecases.  It has demonstrated strong perform'
      },
      'meta-llama/llama-3-70b-instruct': {
        maxTokens: 16384,
        contextWindow: 8192,
        inputPrice: 0.300000,
        outputPrice: 0.400000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Meta\'s latest class of model (Llama 3) launched with a variety of sizes & flavors. This 70B instruct-tuned version was optimized for high quality dialogue usecases.  It has demonstrated strong perfor'
      }
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

  'deepseek': {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'Advanced coding and reasoning models',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'reasoning', 'tools'],
    tier: 'premium',
    baseUrl: 'https://api.deepseek.com/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'deepseek/deepseek-chat-v3.1:free',
    modelCount: 19,
    supportedModels: {
      'deepseek/deepseek-chat-v3.1:free': {
        maxTokens: 4096,
        contextWindow: 64000,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'DeepSeek-V3.1 is a large hybrid reasoning model (671B parameters, 37B active) that supports both thinking and non-thinking modes via prompt templates. It extends the DeepSeek-V3 base with a two-phase '
      },
      'deepseek/deepseek-chat-v3.1': {
        maxTokens: 4096,
        contextWindow: 163840,
        inputPrice: 0.200000,
        outputPrice: 0.800000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'DeepSeek-V3.1 is a large hybrid reasoning model (671B parameters, 37B active) that supports both thinking and non-thinking modes via prompt templates. It extends the DeepSeek-V3 base with a two-phase '
      },
      'deepseek/deepseek-v3.1-base': {
        maxTokens: 4096,
        contextWindow: 163840,
        inputPrice: 0.200000,
        outputPrice: 0.800000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'This is a base model, trained only for raw next-token prediction. Unlike instruct/chat models, it has not been fine-tuned to follow user instructions. Prompts need to be written more like training tex'
      },
      'deepseek/deepseek-r1-0528-qwen3-8b:free': {
        maxTokens: 4096,
        contextWindow: 131072,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'DeepSeek-R1-0528 is a lightly upgraded release of DeepSeek R1 that taps more compute and smarter post-training tricks, pushing its reasoning and inference to the brink of flagship models like O3 and G'
      },
      'deepseek/deepseek-r1-0528-qwen3-8b': {
        maxTokens: 4096,
        contextWindow: 32000,
        inputPrice: 0.010000,
        outputPrice: 0.020000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'DeepSeek-R1-0528 is a lightly upgraded release of DeepSeek R1 that taps more compute and smarter post-training tricks, pushing its reasoning and inference to the brink of flagship models like O3 and G'
      },
      'deepseek/deepseek-r1-0528:free': {
        maxTokens: 4096,
        contextWindow: 163840,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'May 28th update to the [original DeepSeek R1](/deepseek/deepseek-r1) Performance on par with [OpenAI o1](/openai/o1), but open-sourced and with fully open reasoning tokens. It\'s 671B parameters in si'
      },
      'deepseek/deepseek-r1-0528': {
        maxTokens: 4096,
        contextWindow: 163840,
        inputPrice: 0.199919,
        outputPrice: 0.800064,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'May 28th update to the [original DeepSeek R1](/deepseek/deepseek-r1) Performance on par with [OpenAI o1](/openai/o1), but open-sourced and with fully open reasoning tokens. It\'s 671B parameters in si'
      },
      'deepseek/deepseek-prover-v2': {
        maxTokens: 4096,
        contextWindow: 163840,
        inputPrice: 0.500000,
        outputPrice: 2.180000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'DeepSeek Prover V2 is a 671B parameter model, speculated to be geared towards logic and mathematics. Likely an upgrade from [DeepSeek-Prover-V1.5](https://huggingface.co/deepseek-ai/DeepSeek-Prover-V1'
      },
      'deepseek/deepseek-chat-v3-0324:free': {
        maxTokens: 4096,
        contextWindow: 163840,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'DeepSeek V3, a 685B-parameter, mixture-of-experts model, is the latest iteration of the flagship chat model family from the DeepSeek team.  It succeeds the [DeepSeek V3](/deepseek/deepseek-chat-v3) mo'
      },
      'deepseek/deepseek-chat-v3-0324': {
        maxTokens: 4096,
        contextWindow: 163840,
        inputPrice: 0.199919,
        outputPrice: 0.800064,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'DeepSeek V3, a 685B-parameter, mixture-of-experts model, is the latest iteration of the flagship chat model family from the DeepSeek team.  It succeeds the [DeepSeek V3](/deepseek/deepseek-chat-v3) mo'
      },
      'deepseek/deepseek-r1-distill-llama-8b': {
        maxTokens: 32000,
        contextWindow: 32000,
        inputPrice: 0.040000,
        outputPrice: 0.040000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'DeepSeek R1 Distill Llama 8B is a distilled large language model based on [Llama-3.1-8B-Instruct](/meta-llama/llama-3.1-8b-instruct), using outputs from [DeepSeek R1](/deepseek/deepseek-r1). The model'
      },
      'deepseek/deepseek-r1-distill-qwen-32b': {
        maxTokens: 16384,
        contextWindow: 131072,
        inputPrice: 0.075000,
        outputPrice: 0.150000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'DeepSeek R1 Distill Qwen 32B is a distilled large language model based on [Qwen 2.5 32B](https://huggingface.co/Qwen/Qwen2.5-32B), using outputs from [DeepSeek R1](/deepseek/deepseek-r1). It outperfor'
      },
      'deepseek/deepseek-r1-distill-qwen-14b:free': {
        maxTokens: 4096,
        contextWindow: 64000,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'DeepSeek R1 Distill Qwen 14B is a distilled large language model based on [Qwen 2.5 14B](https://huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Qwen-14B), using outputs from [DeepSeek R1](/deepseek/de'
      },
      'deepseek/deepseek-r1-distill-qwen-14b': {
        maxTokens: 32000,
        contextWindow: 64000,
        inputPrice: 0.150000,
        outputPrice: 0.150000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'DeepSeek R1 Distill Qwen 14B is a distilled large language model based on [Qwen 2.5 14B](https://huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Qwen-14B), using outputs from [DeepSeek R1](/deepseek/de'
      },
      'deepseek/deepseek-r1-distill-llama-70b:free': {
        maxTokens: 4096,
        contextWindow: 8192,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'DeepSeek R1 Distill Llama 70B is a distilled large language model based on [Llama-3.3-70B-Instruct](/meta-llama/llama-3.3-70b-instruct), using outputs from [DeepSeek R1](/deepseek/deepseek-r1). The mo'
      },
      'deepseek/deepseek-r1-distill-llama-70b': {
        maxTokens: 4096,
        contextWindow: 131072,
        inputPrice: 0.025915,
        outputPrice: 0.103712,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'DeepSeek R1 Distill Llama 70B is a distilled large language model based on [Llama-3.3-70B-Instruct](/meta-llama/llama-3.3-70b-instruct), using outputs from [DeepSeek R1](/deepseek/deepseek-r1). The mo'
      },
      'deepseek/deepseek-r1:free': {
        maxTokens: 4096,
        contextWindow: 163840,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'DeepSeek R1 is here: Performance on par with [OpenAI o1](/openai/o1), but open-sourced and with fully open reasoning tokens. It\'s 671B parameters in size, with 37B active in an inference pass.  Fully'
      },
      'deepseek/deepseek-r1': {
        maxTokens: 163840,
        contextWindow: 163840,
        inputPrice: 0.400000,
        outputPrice: 2.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'DeepSeek R1 is here: Performance on par with [OpenAI o1](/openai/o1), but open-sourced and with fully open reasoning tokens. It\'s 671B parameters in size, with 37B active in an inference pass.  Fully'
      },
      'deepseek/deepseek-chat': {
        maxTokens: 4096,
        contextWindow: 163840,
        inputPrice: 0.199919,
        outputPrice: 0.800064,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'DeepSeek-V3 is the latest model from the DeepSeek team, building upon the instruction following and coding abilities of the previous versions. Pre-trained on nearly 15 trillion tokens, the reported ev'
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
    documentation: 'https://openrouter.ai/docs',
    setupInstructions: 'Get your API key from https://openrouter.ai/keys',
    iconUrl: 'https://api-docs.deepseek.com/logo.png',
    clickable: true
  },

  'anthropic': {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude models with advanced reasoning capabilities',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'vision', 'reasoning', 'tools'],
    tier: 'premium',
    baseUrl: 'https://api.anthropic.com',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'anthropic/claude-opus-4.1',
    modelCount: 11,
    supportedModels: {
      'anthropic/claude-opus-4.1': {
        maxTokens: 32000,
        contextWindow: 200000,
        inputPrice: 15.000000,
        outputPrice: 75.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Claude Opus 4.1 is an updated version of Anthropic’s flagship model, offering improved performance in coding, reasoning, and agentic tasks. It achieves 74.5% on SWE-bench Verified and shows notable ga'
      },
      'anthropic/claude-opus-4': {
        maxTokens: 32000,
        contextWindow: 200000,
        inputPrice: 15.000000,
        outputPrice: 75.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Claude Opus 4 is benchmarked as the world’s best coding model, at time of release, bringing sustained performance on complex, long-running tasks and agent workflows. It sets new benchmarks in software'
      },
      'anthropic/claude-sonnet-4': {
        maxTokens: 64000,
        contextWindow: 1000000,
        inputPrice: 3.000000,
        outputPrice: 15.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Claude Sonnet 4 significantly enhances the capabilities of its predecessor, Sonnet 3.7, excelling in both coding and reasoning tasks with improved precision and controllability. Achieving state-of-the'
      },
      'anthropic/claude-3.7-sonnet': {
        maxTokens: 64000,
        contextWindow: 200000,
        inputPrice: 3.000000,
        outputPrice: 15.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Claude 3.7 Sonnet is an advanced large language model with improved reasoning, coding, and problem-solving capabilities. It introduces a hybrid reasoning approach, allowing users to choose between rap'
      },
      'anthropic/claude-3.7-sonnet:thinking': {
        maxTokens: 64000,
        contextWindow: 200000,
        inputPrice: 3.000000,
        outputPrice: 15.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Claude 3.7 Sonnet is an advanced large language model with improved reasoning, coding, and problem-solving capabilities. It introduces a hybrid reasoning approach, allowing users to choose between rap'
      },
      'anthropic/claude-3.5-haiku': {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 0.800000,
        outputPrice: 4.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Claude 3.5 Haiku features offers enhanced capabilities in speed, coding accuracy, and tool use. Engineered to excel in real-time applications, it delivers quick response times that are essential for d'
      },
      'anthropic/claude-3.5-haiku-20241022': {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 0.800000,
        outputPrice: 4.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Claude 3.5 Haiku features enhancements across all skill sets including coding, tool use, and reasoning. As the fastest model in the Anthropic lineup, it offers rapid response times suitable for applic'
      },
      'anthropic/claude-3.5-sonnet': {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 3.000000,
        outputPrice: 15.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'New Claude 3.5 Sonnet delivers better-than-Opus capabilities, faster-than-Sonnet speeds, at the same Sonnet prices. Sonnet is particularly good at:  - Coding: Scores ~49% on SWE-Bench Verified, higher'
      },
      'anthropic/claude-3.5-sonnet-20240620': {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 3.000000,
        outputPrice: 15.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Claude 3.5 Sonnet delivers better-than-Opus capabilities, faster-than-Sonnet speeds, at the same Sonnet prices. Sonnet is particularly good at:  - Coding: Autonomously writes, edits, and runs code wit'
      },
      'anthropic/claude-3-haiku': {
        maxTokens: 4096,
        contextWindow: 200000,
        inputPrice: 0.250000,
        outputPrice: 1.250000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Claude 3 Haiku is Anthropic\'s fastest and most compact model for near-instant responsiveness. Quick and accurate targeted performance.  See the launch announcement and benchmark results [here](https:'
      },
      'anthropic/claude-3-opus': {
        maxTokens: 4096,
        contextWindow: 200000,
        inputPrice: 15.000000,
        outputPrice: 75.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Claude 3 Opus is Anthropic\'s most powerful model for highly complex tasks. It boasts top-level performance, intelligence, fluency, and understanding.  See the launch announcement and benchmark result'
      }
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
    iconUrl: 'https://www.anthropic.com/images/icons/anthropic-logomark.svg',
    clickable: true
  },

  'x-ai': {
    id: 'x-ai',
    name: 'xAI',
    description: 'Conversational AI with real-time knowledge',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'vision', 'reasoning', 'tools'],
    tier: 'premium',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'x-ai/grok-code-fast-1',
    modelCount: 9,
    supportedModels: {
      'x-ai/grok-code-fast-1': {
        maxTokens: 10000,
        contextWindow: 256000,
        inputPrice: 0.200000,
        outputPrice: 1.500000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Grok Code Fast 1 is a speedy and economical reasoning model that excels at agentic coding. With reasoning traces visible in the response, developers can steer Grok Code for high-quality work flows.'
      },
      'x-ai/grok-4': {
        maxTokens: 4096,
        contextWindow: 256000,
        inputPrice: 3.000000,
        outputPrice: 15.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Grok 4 is xAI\'s latest reasoning model with a 256k context window. It supports parallel tool calling, structured outputs, and both image and text inputs. Note that reasoning is not exposed, reasoning'
      },
      'x-ai/grok-3-mini': {
        maxTokens: 4096,
        contextWindow: 131072,
        inputPrice: 0.300000,
        outputPrice: 0.500000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'A lightweight model that thinks before responding. Fast, smart, and great for logic-based tasks that do not require deep domain knowledge. The raw thinking traces are accessible.'
      },
      'x-ai/grok-3': {
        maxTokens: 4096,
        contextWindow: 131072,
        inputPrice: 3.000000,
        outputPrice: 15.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Grok 3 is the latest model from xAI. It\'s their flagship model that excels at enterprise use cases like data extraction, coding, and text summarization. Possesses deep domain knowledge in finance, he'
      },
      'x-ai/grok-3-mini-beta': {
        maxTokens: 4096,
        contextWindow: 131072,
        inputPrice: 0.300000,
        outputPrice: 0.500000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Grok 3 Mini is a lightweight, smaller thinking model. Unlike traditional models that generate answers immediately, Grok 3 Mini thinks before responding. It’s ideal for reasoning-heavy tasks that don’t'
      },
      'x-ai/grok-3-beta': {
        maxTokens: 4096,
        contextWindow: 131072,
        inputPrice: 3.000000,
        outputPrice: 15.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Grok 3 is the latest model from xAI. It\'s their flagship model that excels at enterprise use cases like data extraction, coding, and text summarization. Possesses deep domain knowledge in finance, he'
      },
      'x-ai/grok-2-vision-1212': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 2.000000,
        outputPrice: 10.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Grok 2 Vision 1212 advances image-based AI with stronger visual comprehension, refined instruction-following, and multilingual support. From object recognition to style analysis, it empowers developer'
      },
      'x-ai/grok-2-1212': {
        maxTokens: 4096,
        contextWindow: 131072,
        inputPrice: 2.000000,
        outputPrice: 10.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Grok 2 1212 introduces significant enhancements to accuracy, instruction adherence, and multilingual support, making it a powerful and flexible choice for developers seeking a highly steerable, intell'
      },
      'x-ai/grok-vision-beta': {
        maxTokens: 4096,
        contextWindow: 8192,
        inputPrice: 5.000000,
        outputPrice: 15.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Grok Vision Beta is xAI\'s experimental language model with vision capability.  '
      }
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
    iconUrl: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/x.svg',
    clickable: true
  },

  'microsoft': {
    id: 'microsoft',
    name: 'Microsoft',
    description: 'Enterprise-grade AI models',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'vision', 'reasoning', 'tools'],
    tier: 'premium',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'microsoft/phi-4-reasoning-plus',
    modelCount: 9,
    supportedModels: {
      'microsoft/phi-4-reasoning-plus': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 0.070000,
        outputPrice: 0.350000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Phi-4-reasoning-plus is an enhanced 14B parameter model from Microsoft, fine-tuned from Phi-4 with additional reinforcement learning to boost accuracy on math, science, and code reasoning tasks. It us'
      },
      'microsoft/mai-ds-r1:free': {
        maxTokens: 4096,
        contextWindow: 163840,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'MAI-DS-R1 is a post-trained variant of DeepSeek-R1 developed by the Microsoft AI team to improve the model’s responsiveness on previously blocked topics while enhancing its safety profile. Built on to'
      },
      'microsoft/mai-ds-r1': {
        maxTokens: 4096,
        contextWindow: 163840,
        inputPrice: 0.199919,
        outputPrice: 0.800064,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'MAI-DS-R1 is a post-trained variant of DeepSeek-R1 developed by the Microsoft AI team to improve the model’s responsiveness on previously blocked topics while enhancing its safety profile. Built on to'
      },
      'microsoft/phi-4-multimodal-instruct': {
        maxTokens: 4096,
        contextWindow: 131072,
        inputPrice: 0.050000,
        outputPrice: 0.100000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Phi-4 Multimodal Instruct is a versatile 5.6B parameter foundation model that combines advanced reasoning and instruction-following capabilities across both text and visual inputs, providing accurate '
      },
      'microsoft/phi-4': {
        maxTokens: 4096,
        contextWindow: 16384,
        inputPrice: 0.060000,
        outputPrice: 0.140000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: '[Microsoft Research](/microsoft) Phi-4 is designed to perform well in complex reasoning tasks and can operate efficiently in situations with limited memory or where quick responses are needed.   At 14'
      },
      'microsoft/phi-3.5-mini-128k-instruct': {
        maxTokens: 4096,
        contextWindow: 128000,
        inputPrice: 0.100000,
        outputPrice: 0.100000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Phi-3.5 models are lightweight, state-of-the-art open models. These models were trained with Phi-3 datasets that include both synthetic data and the filtered, publicly available websites data, with a '
      },
      'microsoft/phi-3-mini-128k-instruct': {
        maxTokens: 4096,
        contextWindow: 128000,
        inputPrice: 0.100000,
        outputPrice: 0.100000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Phi-3 Mini is a powerful 3.8B parameter model designed for advanced language understanding, reasoning, and instruction following. Optimized through supervised fine-tuning and preference adjustments, i'
      },
      'microsoft/phi-3-medium-128k-instruct': {
        maxTokens: 4096,
        contextWindow: 128000,
        inputPrice: 1.000000,
        outputPrice: 1.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Phi-3 128K Medium is a powerful 14-billion parameter model designed for advanced language understanding, reasoning, and instruction following. Optimized through supervised fine-tuning and preference a'
      },
      'microsoft/wizardlm-2-8x22b': {
        maxTokens: 65536,
        contextWindow: 65536,
        inputPrice: 0.480000,
        outputPrice: 0.480000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'WizardLM-2 8x22B is Microsoft AI\'s most advanced Wizard model. It demonstrates highly competitive performance compared to leading proprietary models, and it consistently outperforms all existing stat'
      }
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
    iconUrl: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/microsoft.svg',
    clickable: true
  },

  'cohere': {
    id: 'cohere',
    name: 'Cohere',
    description: 'Enterprise AI platform for language understanding',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'tools'],
    tier: 'premium',
    baseUrl: 'https://api.cohere.ai/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'cohere/command-a',
    modelCount: 9,
    supportedModels: {
      'cohere/command-a': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 2.000000,
        outputPrice: 8.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Command A is an open-weights 111B parameter model with a 256k context window focused on delivering great performance across agentic, multilingual, and coding use cases. Compared to other leading propr'
      },
      'cohere/command-r7b-12-2024': {
        maxTokens: 4000,
        contextWindow: 128000,
        inputPrice: 0.037500,
        outputPrice: 0.150000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Command R7B (12-2024) is a small, fast update of the Command R+ model, delivered in December 2024. It excels at RAG, tool use, agents, and similar tasks requiring complex reasoning and multiple steps.'
      },
      'cohere/command-r-plus-08-2024': {
        maxTokens: 4000,
        contextWindow: 128000,
        inputPrice: 2.500000,
        outputPrice: 10.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'command-r-plus-08-2024 is an update of the [Command R+](/models/cohere/command-r-plus) with roughly 50% higher throughput and 25% lower latencies as compared to the previous Command R+ version, while '
      },
      'cohere/command-r-08-2024': {
        maxTokens: 4000,
        contextWindow: 128000,
        inputPrice: 0.150000,
        outputPrice: 0.600000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'command-r-08-2024 is an update of the [Command R](/models/cohere/command-r) with improved performance for multilingual retrieval-augmented generation (RAG) and tool use. More broadly, it is better at '
      },
      'cohere/command-r-plus': {
        maxTokens: 4000,
        contextWindow: 128000,
        inputPrice: 3.000000,
        outputPrice: 15.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Command R+ is a new, 104B-parameter LLM from Cohere. It\'s useful for roleplay, general consumer usecases, and Retrieval Augmented Generation (RAG).  It offers multilingual support for ten key languag'
      },
      'cohere/command-r-plus-04-2024': {
        maxTokens: 4000,
        contextWindow: 128000,
        inputPrice: 3.000000,
        outputPrice: 15.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Command R+ is a new, 104B-parameter LLM from Cohere. It\'s useful for roleplay, general consumer usecases, and Retrieval Augmented Generation (RAG).  It offers multilingual support for ten key languag'
      },
      'cohere/command': {
        maxTokens: 4000,
        contextWindow: 4096,
        inputPrice: 1.000000,
        outputPrice: 2.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Command is an instruction-following conversational model that performs language tasks with high quality, more reliably and with a longer context than our base generative models.  Use of this model is '
      },
      'cohere/command-r': {
        maxTokens: 4000,
        contextWindow: 128000,
        inputPrice: 0.500000,
        outputPrice: 1.500000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Command-R is a 35B parameter model that performs conversational language tasks at a higher quality, more reliably, and with a longer context than previous models. It can be used for complex workflows '
      },
      'cohere/command-r-03-2024': {
        maxTokens: 4000,
        contextWindow: 128000,
        inputPrice: 0.500000,
        outputPrice: 1.500000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Command-R is a 35B parameter model that performs conversational language tasks at a higher quality, more reliably, and with a longer context than previous models. It can be used for complex workflows '
      }
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
    iconUrl: 'https://cohere.com/favicon.ico',
    clickable: true
  },

  'nousresearch': {
    id: 'nousresearch',
    name: 'Nous Research',
    description: 'Open-source research models',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'reasoning', 'tools'],
    tier: 'premium',
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
        description: 'Hermes 4 70B is a hybrid reasoning model from Nous Research, built on Meta-Llama-3.1-70B. It introduces the same hybrid mode as the larger 405B release, allowing the model to either respond directly o'
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
        description: 'Hermes 4 is a large-scale reasoning model built on Meta-Llama-3.1-405B and released by Nous Research. It introduces a hybrid reasoning mode, where the model can choose to deliberate internally with <t'
      },
      'nousresearch/deephermes-3-mistral-24b-preview': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 0.093295,
        outputPrice: 0.373363,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'DeepHermes 3 (Mistral 24B Preview) is an instruction-tuned language model by Nous Research based on Mistral-Small-24B, designed for chat, function calling, and advanced multi-turn reasoning. It introd'
      },
      'nousresearch/deephermes-3-llama-3-8b-preview:free': {
        maxTokens: 4096,
        contextWindow: 131072,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'DeepHermes 3 Preview is the latest version of our flagship Hermes series of LLMs by Nous Research, and one of the first models in the world to unify Reasoning (long chains of thought that improve answ'
      },
      'nousresearch/hermes-3-llama-3.1-70b': {
        maxTokens: 4096,
        contextWindow: 131072,
        inputPrice: 0.100000,
        outputPrice: 0.280000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Hermes 3 is a generalist language model with many improvements over [Hermes 2](/models/nousresearch/nous-hermes-2-mistral-7b-dpo), including advanced agentic capabilities, much better roleplaying, rea'
      },
      'nousresearch/hermes-3-llama-3.1-405b': {
        maxTokens: 16384,
        contextWindow: 131072,
        inputPrice: 0.700000,
        outputPrice: 0.800000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Hermes 3 is a generalist language model with many improvements over Hermes 2, including advanced agentic capabilities, much better roleplaying, reasoning, multi-turn conversation, long context coheren'
      },
      'nousresearch/hermes-2-pro-llama-3-8b': {
        maxTokens: 131072,
        contextWindow: 131072,
        inputPrice: 0.025000,
        outputPrice: 0.040000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Hermes 2 Pro is an upgraded, retrained version of Nous Hermes 2, consisting of an updated and cleaned version of the OpenHermes 2.5 Dataset, as well as a newly introduced Function Calling and JSON Mod'
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
    documentation: 'https://openrouter.ai/docs',
    setupInstructions: 'Get your API key from https://openrouter.ai/keys',
    iconUrl: 'https://nousresearch.com/favicon.ico',
    clickable: true
  },

  'moonshotai': {
    id: 'moonshotai',
    name: 'Moonshotai',
    description: 'Moonshotai AI models',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'vision', 'reasoning', 'tools'],
    tier: 'premium',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'moonshotai/kimi-k2:free',
    modelCount: 6,
    supportedModels: {
      'moonshotai/kimi-k2:free': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Kimi K2 Instruct is a large-scale Mixture-of-Experts (MoE) language model developed by Moonshot AI, featuring 1 trillion total parameters with 32 billion active per forward pass. It is optimized for a'
      },
      'moonshotai/kimi-k2': {
        maxTokens: 63000,
        contextWindow: 63000,
        inputPrice: 0.140000,
        outputPrice: 2.490000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Kimi K2 Instruct is a large-scale Mixture-of-Experts (MoE) language model developed by Moonshot AI, featuring 1 trillion total parameters with 32 billion active per forward pass. It is optimized for a'
      },
      'moonshotai/kimi-dev-72b:free': {
        maxTokens: 4096,
        contextWindow: 131072,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Kimi-Dev-72B is an open-source large language model fine-tuned for software engineering and issue resolution tasks. Based on Qwen2.5-72B, it is optimized using large-scale reinforcement learning that '
      },
      'moonshotai/kimi-dev-72b': {
        maxTokens: 131072,
        contextWindow: 131072,
        inputPrice: 0.290000,
        outputPrice: 1.150000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Kimi-Dev-72B is an open-source large language model fine-tuned for software engineering and issue resolution tasks. Based on Qwen2.5-72B, it is optimized using large-scale reinforcement learning that '
      },
      'moonshotai/kimi-vl-a3b-thinking:free': {
        maxTokens: 4096,
        contextWindow: 131072,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Kimi-VL is a lightweight Mixture-of-Experts vision-language model that activates only 2.8B parameters per step while delivering strong performance on multimodal reasoning and long-context tasks. The K'
      },
      'moonshotai/kimi-vl-a3b-thinking': {
        maxTokens: 4096,
        contextWindow: 131072,
        inputPrice: 0.024990,
        outputPrice: 0.100008,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Kimi-VL is a lightweight Mixture-of-Experts vision-language model that activates only 2.8B parameters per step while delivering strong performance on multimodal reasoning and long-context tasks. The K'
      }
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
    iconUrl: 'https://github.com/moonshotai.png',
    clickable: true
  },

  'cognitivecomputations': {
    id: 'cognitivecomputations',
    name: 'Cognitive Computations',
    description: 'Cognitive Computations AI models',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'reasoning'],
    tier: 'premium',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free',
    modelCount: 6,
    supportedModels: {
      'cognitivecomputations/dolphin-mistral-24b-venice-edition:free': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Venice Uncensored Dolphin Mistral 24B Venice Edition is a fine-tuned variant of Mistral-Small-24B-Instruct-2501, developed by dphn.ai in collaboration with Venice.ai. This model is designed as an “unc'
      },
      'cognitivecomputations/dolphin3.0-r1-mistral-24b:free': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Dolphin 3.0 R1 is the next generation of the Dolphin series of instruct-tuned models.  Designed to be the ultimate general purpose local model, enabling coding, math, agentic, function calling, and ge'
      },
      'cognitivecomputations/dolphin3.0-r1-mistral-24b': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 0.010000,
        outputPrice: 0.034077,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Dolphin 3.0 R1 is the next generation of the Dolphin series of instruct-tuned models.  Designed to be the ultimate general purpose local model, enabling coding, math, agentic, function calling, and ge'
      },
      'cognitivecomputations/dolphin3.0-mistral-24b:free': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Dolphin 3.0 is the next generation of the Dolphin series of instruct-tuned models.  Designed to be the ultimate general purpose local model, enabling coding, math, agentic, function calling, and gener'
      },
      'cognitivecomputations/dolphin3.0-mistral-24b': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 0.037022,
        outputPrice: 0.148160,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Dolphin 3.0 is the next generation of the Dolphin series of instruct-tuned models.  Designed to be the ultimate general purpose local model, enabling coding, math, agentic, function calling, and gener'
      },
      'cognitivecomputations/dolphin-mixtral-8x22b': {
        maxTokens: 8192,
        contextWindow: 16000,
        inputPrice: 0.900000,
        outputPrice: 0.900000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Dolphin 2.9 is designed for instruction following, conversational, and coding. This model is a finetune of [Mixtral 8x22B Instruct](/models/mistralai/mixtral-8x22b-instruct). It features a 64k context'
      }
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
    iconUrl: 'https://github.com/cognitivecomputations.png',
    clickable: true
  },

  'perplexity': {
    id: 'perplexity',
    name: 'Perplexity',
    description: 'Real-time search-enabled models',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'vision', 'reasoning'],
    tier: 'premium',
    baseUrl: 'https://api.perplexity.ai',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'perplexity/sonar-reasoning-pro',
    modelCount: 6,
    supportedModels: {
      'perplexity/sonar-reasoning-pro': {
        maxTokens: 4096,
        contextWindow: 128000,
        inputPrice: 2.000000,
        outputPrice: 8.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Note: Sonar Pro pricing includes Perplexity search pricing. See [details here](https://docs.perplexity.ai/guides/pricing#detailed-pricing-breakdown-for-sonar-reasoning-pro-and-sonar-pro)  Sonar Reason'
      },
      'perplexity/sonar-pro': {
        maxTokens: 8000,
        contextWindow: 200000,
        inputPrice: 3.000000,
        outputPrice: 15.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Note: Sonar Pro pricing includes Perplexity search pricing. See [details here](https://docs.perplexity.ai/guides/pricing#detailed-pricing-breakdown-for-sonar-reasoning-pro-and-sonar-pro)  For enterpri'
      },
      'perplexity/sonar-deep-research': {
        maxTokens: 4096,
        contextWindow: 128000,
        inputPrice: 2.000000,
        outputPrice: 8.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Sonar Deep Research is a research-focused model designed for multi-step retrieval, synthesis, and reasoning across complex topics. It autonomously searches, reads, and evaluates sources, refining its '
      },
      'perplexity/r1-1776': {
        maxTokens: 4096,
        contextWindow: 128000,
        inputPrice: 2.000000,
        outputPrice: 8.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'R1 1776 is a version of DeepSeek-R1 that has been post-trained to remove censorship constraints related to topics restricted by the Chinese government. The model retains its original reasoning capabil'
      },
      'perplexity/sonar-reasoning': {
        maxTokens: 4096,
        contextWindow: 127000,
        inputPrice: 1.000000,
        outputPrice: 5.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Sonar Reasoning is a reasoning model provided by Perplexity based on [DeepSeek R1](/deepseek/deepseek-r1).  It allows developers to utilize long chain of thought with built-in web search. Sonar Reason'
      },
      'perplexity/sonar': {
        maxTokens: 4096,
        contextWindow: 127072,
        inputPrice: 1.000000,
        outputPrice: 1.000000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Sonar is lightweight, affordable, fast, and simple to use — now featuring citations and the ability to customize sources. It is designed for companies seeking to integrate lightweight question-and-ans'
      }
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
    iconUrl: 'https://www.perplexity.ai/favicon.ico',
    clickable: true
  },

  'z-ai': {
    id: 'z-ai',
    name: 'Z.AI',
    description: 'Advanced multimodal AI models',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'vision', 'reasoning', 'tools'],
    tier: 'premium',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'z-ai/glm-4.5v',
    modelCount: 5,
    supportedModels: {
      'z-ai/glm-4.5v': {
        maxTokens: 65536,
        contextWindow: 65536,
        inputPrice: 0.500000,
        outputPrice: 1.800000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'GLM-4.5V is a vision-language foundation model for multimodal agent applications. Built on a Mixture-of-Experts (MoE) architecture with 106B parameters and 12B activated parameters, it achieves state-'
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
        description: 'GLM-4.5 is our latest flagship foundation model, purpose-built for agent-based applications. It leverages a Mixture-of-Experts (MoE) architecture and supports a context length of up to 128k tokens. GL'
      },
      'z-ai/glm-4.5-air:free': {
        maxTokens: 4096,
        contextWindow: 131072,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'GLM-4.5-Air is the lightweight variant of our latest flagship model family, also purpose-built for agent-centric applications. Like GLM-4.5, it adopts the Mixture-of-Experts (MoE) architecture but wit'
      },
      'z-ai/glm-4.5-air': {
        maxTokens: 131072,
        contextWindow: 131072,
        inputPrice: 0.140000,
        outputPrice: 0.860000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'GLM-4.5-Air is the lightweight variant of our latest flagship model family, also purpose-built for agent-centric applications. Like GLM-4.5, it adopts the Mixture-of-Experts (MoE) architecture but wit'
      },
      'z-ai/glm-4-32b': {
        maxTokens: 4096,
        contextWindow: 128000,
        inputPrice: 0.100000,
        outputPrice: 0.100000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'GLM 4 32B is a cost-effective foundation language model.  It can efficiently perform complex tasks and has significantly enhanced capabilities in tool use, online search, and code-related intelligent '
      }
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
    iconUrl: 'https://www.zhipu.ai/favicon.ico',
    clickable: true
  },

  'thedrummer': {
    id: 'thedrummer',
    name: 'Thedrummer',
    description: 'Thedrummer AI models',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'tools'],
    tier: 'premium',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'thedrummer/anubis-70b-v1.1',
    modelCount: 5,
    supportedModels: {
      'thedrummer/anubis-70b-v1.1': {
        maxTokens: 4096,
        contextWindow: 16384,
        inputPrice: 0.400000,
        outputPrice: 0.700000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'TheDrummer\'s Anubis v1.1 is an unaligned, creative Llama 3.3 70B model focused on providing character-driven roleplay & stories. It excels at gritty, visceral prose, unique character adherence, and c'
      },
      'thedrummer/anubis-pro-105b-v1': {
        maxTokens: 131072,
        contextWindow: 131072,
        inputPrice: 0.500000,
        outputPrice: 1.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Anubis Pro 105B v1 is an expanded and refined variant of Meta’s Llama 3.3 70B, featuring 50% additional layers and further fine-tuning to leverage its increased capacity. Designed for advanced narrati'
      },
      'thedrummer/skyfall-36b-v2': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 0.048129,
        outputPrice: 0.192608,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Skyfall 36B v2 is an enhanced iteration of Mistral Small 2501, specifically fine-tuned for improved creativity, nuanced writing, role-playing, and coherent storytelling.'
      },
      'thedrummer/unslopnemo-12b': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 0.400000,
        outputPrice: 0.400000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'UnslopNemo v4.1 is the latest addition from the creator of Rocinante, designed for adventure writing and role-play scenarios.'
      },
      'thedrummer/rocinante-12b': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 0.170000,
        outputPrice: 0.430000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Rocinante 12B is designed for engaging storytelling and rich prose.  Early testers have reported: - Expanded vocabulary with unique and expressive word choices - Enhanced creativity for vivid narrativ'
      }
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
    iconUrl: 'https://github.com/thedrummer.png',
    clickable: true
  },

  'baidu': {
    id: 'baidu',
    name: 'Baidu',
    description: 'Chinese language AI models',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'vision', 'reasoning'],
    tier: 'premium',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'baidu/ernie-4.5-21b-a3b',
    modelCount: 4,
    supportedModels: {
      'baidu/ernie-4.5-21b-a3b': {
        maxTokens: 8000,
        contextWindow: 120000,
        inputPrice: 0.070000,
        outputPrice: 0.280000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'A sophisticated text-based Mixture-of-Experts (MoE) model featuring 21B total parameters with 3B activated per token, delivering exceptional multimodal understanding and generation through heterogeneo'
      },
      'baidu/ernie-4.5-vl-28b-a3b': {
        maxTokens: 8000,
        contextWindow: 30000,
        inputPrice: 0.140000,
        outputPrice: 0.560000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'A powerful multimodal Mixture-of-Experts chat model featuring 28B total parameters with 3B activated per token, delivering exceptional text and vision understanding through its innovative heterogeneou'
      },
      'baidu/ernie-4.5-vl-424b-a47b': {
        maxTokens: 16000,
        contextWindow: 123000,
        inputPrice: 0.420000,
        outputPrice: 1.250000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'ERNIE-4.5-VL-424B-A47B is a multimodal Mixture-of-Experts (MoE) model from Baidu’s ERNIE 4.5 series, featuring 424B total parameters with 47B active per token. It is trained jointly on text and image '
      },
      'baidu/ernie-4.5-300b-a47b': {
        maxTokens: 12000,
        contextWindow: 123000,
        inputPrice: 0.280000,
        outputPrice: 1.100000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'ERNIE-4.5-300B-A47B is a 300B parameter Mixture-of-Experts (MoE) language model developed by Baidu as part of the ERNIE 4.5 series. It activates 47B parameters per token and supports text generation i'
      }
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
    iconUrl: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/baidu.svg',
    clickable: true
  },

  'arcee-ai': {
    id: 'arcee-ai',
    name: 'Arcee Ai',
    description: 'Arcee Ai AI models',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'vision', 'tools'],
    tier: 'premium',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'arcee-ai/spotlight',
    modelCount: 4,
    supportedModels: {
      'arcee-ai/spotlight': {
        maxTokens: 65537,
        contextWindow: 131072,
        inputPrice: 0.180000,
        outputPrice: 0.180000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Spotlight is a 7‑billion‑parameter vision‑language model derived from Qwen 2.5‑VL and fine‑tuned by Arcee AI for tight image‑text grounding tasks. It offers a 32 k‑token context window, enabling rich '
      },
      'arcee-ai/maestro-reasoning': {
        maxTokens: 32000,
        contextWindow: 131072,
        inputPrice: 0.900000,
        outputPrice: 3.300000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Maestro Reasoning is Arcee\'s flagship analysis model: a 32 B‑parameter derivative of Qwen 2.5‑32 B tuned with DPO and chain‑of‑thought RL for step‑by‑step logic. Compared to the earlier 7 B preview, '
      },
      'arcee-ai/virtuoso-large': {
        maxTokens: 64000,
        contextWindow: 131072,
        inputPrice: 0.750000,
        outputPrice: 1.200000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Virtuoso‑Large is Arcee\'s top‑tier general‑purpose LLM at 72 B parameters, tuned to tackle cross‑domain reasoning, creative writing and enterprise QA. Unlike many 70 B peers, it retains the 128 k con'
      },
      'arcee-ai/coder-large': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 0.500000,
        outputPrice: 0.800000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Coder‑Large is a 32 B‑parameter offspring of Qwen 2.5‑Instruct that has been further trained on permissively‑licensed GitHub, CodeSearchNet and synthetic bug‑fix corpora. It supports a 32k context win'
      }
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
    iconUrl: 'https://github.com/arcee-ai.png',
    clickable: true
  },

  'nvidia': {
    id: 'nvidia',
    name: 'NVIDIA',
    description: 'GPU-optimized AI models',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'reasoning', 'tools'],
    tier: 'premium',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'nvidia/llama-3.3-nemotron-super-49b-v1',
    modelCount: 4,
    supportedModels: {
      'nvidia/llama-3.3-nemotron-super-49b-v1': {
        maxTokens: 4096,
        contextWindow: 131072,
        inputPrice: 0.130000,
        outputPrice: 0.400000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Llama-3.3-Nemotron-Super-49B-v1 is a large language model (LLM) optimized for advanced reasoning, conversational interactions, retrieval-augmented generation (RAG), and tool-calling tasks. Derived fro'
      },
      'nvidia/llama-3.1-nemotron-ultra-253b-v1:free': {
        maxTokens: 4096,
        contextWindow: 131072,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Llama-3.1-Nemotron-Ultra-253B-v1 is a large language model (LLM) optimized for advanced reasoning, human-interactive chat, retrieval-augmented generation (RAG), and tool-calling tasks. Derived from Me'
      },
      'nvidia/llama-3.1-nemotron-ultra-253b-v1': {
        maxTokens: 4096,
        contextWindow: 131072,
        inputPrice: 0.600000,
        outputPrice: 1.800000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Llama-3.1-Nemotron-Ultra-253B-v1 is a large language model (LLM) optimized for advanced reasoning, human-interactive chat, retrieval-augmented generation (RAG), and tool-calling tasks. Derived from Me'
      },
      'nvidia/llama-3.1-nemotron-70b-instruct': {
        maxTokens: 16384,
        contextWindow: 131072,
        inputPrice: 0.120000,
        outputPrice: 0.300000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'NVIDIA\'s Llama 3.1 Nemotron 70B is a language model designed for generating precise and useful responses. Leveraging [Llama 3.1 70B](/models/meta-llama/llama-3.1-70b-instruct) architecture and Reinfo'
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
    documentation: 'https://openrouter.ai/docs',
    setupInstructions: 'Get your API key from https://openrouter.ai/keys',
    iconUrl: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/nvidia.svg',
    clickable: true
  },

  'sao10k': {
    id: 'sao10k',
    name: 'SAO10K',
    description: 'SAO10K AI models',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter'],
    tier: 'premium',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'sao10k/l3.3-euryale-70b',
    modelCount: 4,
    supportedModels: {
      'sao10k/l3.3-euryale-70b': {
        maxTokens: 16384,
        contextWindow: 131072,
        inputPrice: 0.650000,
        outputPrice: 0.750000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Euryale L3.3 70B is a model focused on creative roleplay from [Sao10k](https://ko-fi.com/sao10k). It is the successor of [Euryale L3 70B v2.2](/models/sao10k/l3-euryale-70b).'
      },
      'sao10k/l3.1-euryale-70b': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 0.650000,
        outputPrice: 0.750000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Euryale L3.1 70B v2.2 is a model focused on creative roleplay from [Sao10k](https://ko-fi.com/sao10k). It is the successor of [Euryale L3 70B v2.1](/models/sao10k/l3-euryale-70b).'
      },
      'sao10k/l3-lunaris-8b': {
        maxTokens: 4096,
        contextWindow: 8192,
        inputPrice: 0.020000,
        outputPrice: 0.050000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Lunaris 8B is a versatile generalist and roleplaying model based on Llama 3. It\'s a strategic merge of multiple models, designed to balance creativity with improved logic and general knowledge.  Crea'
      },
      'sao10k/l3-euryale-70b': {
        maxTokens: 8192,
        contextWindow: 8192,
        inputPrice: 1.480000,
        outputPrice: 1.480000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Euryale 70B v2.1 is a model focused on creative roleplay from [Sao10k](https://ko-fi.com/sao10k).  - Better prompt adherence. - Better anatomy / spatial awareness. - Adapts much better to unique and c'
      }
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
    setupInstructions: 'Get your API key from https://openrouter.ai/keys',
    iconUrl: 'https://github.com/sao10k.png',
    clickable: true
  },

  'thudm': {
    id: 'thudm',
    name: 'Thudm',
    description: 'Thudm AI models',
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
        inputPrice: 0.035000,
        outputPrice: 0.138000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'GLM-4.1V-9B-Thinking is a 9B parameter vision-language model developed by THUDM, based on the GLM-4-9B foundation. It introduces a reasoning-centric "thinking paradigm" enhanced with reinforcement lea'
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
        description: 'GLM-Z1-32B-0414 is an enhanced reasoning variant of GLM-4-32B, built for deep mathematical, logical, and code-oriented problem solving. It applies extended reinforcement learning—both task-specific an'
      },
      'thudm/glm-4-32b': {
        maxTokens: 32000,
        contextWindow: 32000,
        inputPrice: 0.550000,
        outputPrice: 1.660000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'GLM-4-32B-0414 is a 32B bilingual (Chinese-English) open-weight language model optimized for code generation, function calling, and agent-style tasks. Pretrained on 15T of high-quality and reasoning-h'
      }
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
    iconUrl: 'https://github.com/thudm.png',
    clickable: true
  },

  'tngtech': {
    id: 'tngtech',
    name: 'Tngtech',
    description: 'Tngtech AI models',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'reasoning'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'tngtech/deepseek-r1t2-chimera:free',
    modelCount: 3,
    supportedModels: {
      'tngtech/deepseek-r1t2-chimera:free': {
        maxTokens: 4096,
        contextWindow: 163840,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'DeepSeek-TNG-R1T2-Chimera is the second-generation Chimera model from TNG Tech. It is a 671 B-parameter mixture-of-experts text-generation model assembled from DeepSeek-AI’s R1-0528, R1, and V3-0324 c'
      },
      'tngtech/deepseek-r1t-chimera:free': {
        maxTokens: 4096,
        contextWindow: 163840,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'DeepSeek-R1T-Chimera is created by merging DeepSeek-R1 and DeepSeek-V3 (0324), combining the reasoning capabilities of R1 with the token efficiency improvements of V3. It is based on a DeepSeek-MoE Tr'
      },
      'tngtech/deepseek-r1t-chimera': {
        maxTokens: 4096,
        contextWindow: 163840,
        inputPrice: 0.199919,
        outputPrice: 0.800064,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'DeepSeek-R1T-Chimera is created by merging DeepSeek-R1 and DeepSeek-V3 (0324), combining the reasoning capabilities of R1 with the token efficiency improvements of V3. It is based on a DeepSeek-MoE Tr'
      }
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
    iconUrl: 'https://github.com/tngtech.png',
    clickable: true
  },

  'aion-labs': {
    id: 'aion-labs',
    name: 'Aion Labs',
    description: 'Aion Labs AI models',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'reasoning'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'aion-labs/aion-1.0',
    modelCount: 3,
    supportedModels: {
      'aion-labs/aion-1.0': {
        maxTokens: 32768,
        contextWindow: 131072,
        inputPrice: 4.000000,
        outputPrice: 8.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Aion-1.0 is a multi-model system designed for high performance across various tasks, including reasoning and coding. It is built on DeepSeek-R1, augmented with additional models and techniques such as'
      },
      'aion-labs/aion-1.0-mini': {
        maxTokens: 32768,
        contextWindow: 131072,
        inputPrice: 0.700000,
        outputPrice: 1.400000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Aion-1.0-Mini 32B parameter model is a distilled version of the DeepSeek-R1 model, designed for strong performance in reasoning domains such as mathematics, coding, and logic. It is a modified variant'
      },
      'aion-labs/aion-rp-llama-3.1-8b': {
        maxTokens: 32768,
        contextWindow: 32768,
        inputPrice: 0.200000,
        outputPrice: 0.200000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Aion-RP-Llama-3.1-8B ranks the highest in the character evaluation portion of the RPBench-Auto benchmark, a roleplaying-specific variant of Arena-Hard-Auto, where LLMs evaluate each other’s responses.'
      }
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
    iconUrl: 'https://github.com/aion-labs.png',
    clickable: true
  },

  'amazon': {
    id: 'amazon',
    name: 'Amazon',
    description: 'Amazon AI models',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'vision', 'tools'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'amazon/nova-lite-v1',
    modelCount: 3,
    supportedModels: {
      'amazon/nova-lite-v1': {
        maxTokens: 5120,
        contextWindow: 300000,
        inputPrice: 0.060000,
        outputPrice: 0.240000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Amazon Nova Lite 1.0 is a very low-cost multimodal model from Amazon that focused on fast processing of image, video, and text inputs to generate text output. Amazon Nova Lite can handle real-time cus'
      },
      'amazon/nova-micro-v1': {
        maxTokens: 5120,
        contextWindow: 128000,
        inputPrice: 0.035000,
        outputPrice: 0.140000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Amazon Nova Micro 1.0 is a text-only model that delivers the lowest latency responses in the Amazon Nova family of models at a very low cost. With a context length of 128K tokens and optimized for spe'
      },
      'amazon/nova-pro-v1': {
        maxTokens: 5120,
        contextWindow: 300000,
        inputPrice: 0.800000,
        outputPrice: 3.200000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Amazon Nova Pro 1.0 is a capable multimodal model from Amazon focused on providing a combination of accuracy, speed, and cost for a wide range of tasks. As of December 2024, it achieves state-of-the-a'
      }
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
    iconUrl: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/amazon.svg',
    clickable: true
  },

  'neversleep': {
    id: 'neversleep',
    name: 'NeverSleep',
    description: 'NeverSleep AI models',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'neversleep/llama-3.1-lumimaid-8b',
    modelCount: 3,
    supportedModels: {
      'neversleep/llama-3.1-lumimaid-8b': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 0.090000,
        outputPrice: 0.600000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Lumimaid v0.2 8B is a finetune of [Llama 3.1 8B](/models/meta-llama/llama-3.1-8b-instruct) with a "HUGE step up dataset wise" compared to Lumimaid v0.1. Sloppy chats output were purged.  Usage of this'
      },
      'neversleep/llama-3-lumimaid-70b': {
        maxTokens: 4096,
        contextWindow: 8192,
        inputPrice: 4.000000,
        outputPrice: 6.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'The NeverSleep team is back, with a Llama 3 70B finetune trained on their curated roleplay data. Striking a balance between eRP and RP, Lumimaid was designed to be serious, yet uncensored when necessa'
      },
      'neversleep/noromaid-20b': {
        maxTokens: 4096,
        contextWindow: 4096,
        inputPrice: 1.000000,
        outputPrice: 1.750000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'A collab between IkariDev and Undi. This merge is suitable for RP, ERP, and general knowledge.  #merge #uncensored'
      }
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
    setupInstructions: 'Get your API key from https://openrouter.ai/keys',
    iconUrl: 'https://github.com/neversleep.png',
    clickable: true
  },

  'deepcogito': {
    id: 'deepcogito',
    name: 'Deep Cogito',
    description: 'Deep Cogito AI models',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'vision', 'reasoning', 'tools'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'deepcogito/cogito-v2-preview-llama-109b-moe',
    modelCount: 2,
    supportedModels: {
      'deepcogito/cogito-v2-preview-llama-109b-moe': {
        maxTokens: 4096,
        contextWindow: 32767,
        inputPrice: 0.180000,
        outputPrice: 0.590000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'An instruction-tuned, hybrid-reasoning Mixture-of-Experts model built on Llama-4-Scout-17B-16E. Cogito v2 can answer directly or engage an extended “thinking” phase, with alignment guided by Iterated '
      },
      'deepcogito/cogito-v2-preview-deepseek-671b': {
        maxTokens: 4096,
        contextWindow: 163840,
        inputPrice: 1.250000,
        outputPrice: 1.250000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Cogito v2 is a multilingual, instruction-tuned Mixture of Experts (MoE) large language model with 671 billion parameters. It supports both standard and reasoning-based generation modes. The model intr'
      }
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
    iconUrl: 'https://github.com/deepcogito.png',
    clickable: true
  },

  'ai21': {
    id: 'ai21',
    name: 'AI21 Labs',
    description: 'Advanced language models for enterprise',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'tools'],
    tier: 'standard',
    baseUrl: 'https://api.ai21.com/studio/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'ai21/jamba-mini-1.7',
    modelCount: 2,
    supportedModels: {
      'ai21/jamba-mini-1.7': {
        maxTokens: 4096,
        contextWindow: 256000,
        inputPrice: 0.200000,
        outputPrice: 0.400000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Jamba Mini 1.7 is a compact and efficient member of the Jamba open model family, incorporating key improvements in grounding and instruction-following while maintaining the benefits of the SSM-Transfo'
      },
      'ai21/jamba-large-1.7': {
        maxTokens: 4096,
        contextWindow: 256000,
        inputPrice: 2.000000,
        outputPrice: 8.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Jamba Large 1.7 is the latest model in the Jamba open family, offering improvements in grounding, instruction-following, and overall efficiency. Built on a hybrid SSM-Transformer architecture with a 2'
      }
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
    iconUrl: 'https://www.ai21.com/favicon.ico',
    clickable: true
  },

  'tencent': {
    id: 'tencent',
    name: 'Tencent',
    description: 'Tencent AI models',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'reasoning'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'tencent/hunyuan-a13b-instruct:free',
    modelCount: 2,
    supportedModels: {
      'tencent/hunyuan-a13b-instruct:free': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Hunyuan-A13B is a 13B active parameter Mixture-of-Experts (MoE) language model developed by Tencent, with a total parameter count of 80B and support for reasoning via Chain-of-Thought. It offers compe'
      },
      'tencent/hunyuan-a13b-instruct': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 0.030000,
        outputPrice: 0.030000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Hunyuan-A13B is a 13B active parameter Mixture-of-Experts (MoE) language model developed by Tencent, with a total parameter count of 80B and support for reasoning via Chain-of-Thought. It offers compe'
      }
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
    iconUrl: 'https://github.com/tencent.png',
    clickable: true
  },

  'morph': {
    id: 'morph',
    name: 'Morph',
    description: 'Morph AI models',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'morph/morph-v3-large',
    modelCount: 2,
    supportedModels: {
      'morph/morph-v3-large': {
        maxTokens: 38000,
        contextWindow: 81920,
        inputPrice: 0.900000,
        outputPrice: 1.900000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Morph\'s high-accuracy apply model for complex code edits. 2000+ tokens/sec with 98% accuracy for precise code transformations.'
      },
      'morph/morph-v3-fast': {
        maxTokens: 38000,
        contextWindow: 81920,
        inputPrice: 0.900000,
        outputPrice: 1.900000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Morph\'s fastest apply model for code edits. 4500+ tokens/sec with 96% accuracy for rapid code transformations.'
      }
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
    setupInstructions: 'Get your API key from https://openrouter.ai/keys',
    iconUrl: 'https://github.com/morph.png',
    clickable: true
  },

  'inception': {
    id: 'inception',
    name: 'Inception',
    description: 'Inception AI models',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'tools'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'inception/mercury',
    modelCount: 2,
    supportedModels: {
      'inception/mercury': {
        maxTokens: 16384,
        contextWindow: 128000,
        inputPrice: 0.250000,
        outputPrice: 1.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Mercury is the first diffusion large language model (dLLM). Applying a breakthrough discrete diffusion approach, the model runs 5-10x faster than even speed optimized models like GPT-4.1 Nano and Clau'
      },
      'inception/mercury-coder': {
        maxTokens: 16384,
        contextWindow: 128000,
        inputPrice: 0.250000,
        outputPrice: 1.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Mercury Coder is the first diffusion large language model (dLLM). Applying a breakthrough discrete diffusion approach, the model runs 5-10x faster than even speed optimized models like Claude 3.5 Haik'
      }
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
    iconUrl: 'https://github.com/inception.png',
    clickable: true
  },

  'minimax': {
    id: 'minimax',
    name: 'Minimax',
    description: 'Minimax AI models',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'vision', 'reasoning', 'tools'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'minimax/minimax-m1',
    modelCount: 2,
    supportedModels: {
      'minimax/minimax-m1': {
        maxTokens: 40000,
        contextWindow: 1000000,
        inputPrice: 0.300000,
        outputPrice: 1.650000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'MiniMax-M1 is a large-scale, open-weight reasoning model designed for extended context and high-efficiency inference. It leverages a hybrid Mixture-of-Experts (MoE) architecture paired with a custom "'
      },
      'minimax/minimax-01': {
        maxTokens: 1000192,
        contextWindow: 1000192,
        inputPrice: 0.200000,
        outputPrice: 1.100000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'MiniMax-01 is a combines MiniMax-Text-01 for text generation and MiniMax-VL-01 for image understanding. It has 456 billion parameters, with 45.9 billion parameters activated per inference, and can han'
      }
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
    iconUrl: 'https://github.com/minimax.png',
    clickable: true
  },

  'shisa-ai': {
    id: 'shisa-ai',
    name: 'Shisa Ai',
    description: 'Shisa Ai AI models',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'shisa-ai/shisa-v2-llama3.3-70b:free',
    modelCount: 2,
    supportedModels: {
      'shisa-ai/shisa-v2-llama3.3-70b:free': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Shisa V2 Llama 3.3 70B is a bilingual Japanese-English chat model fine-tuned by Shisa.AI on Meta’s Llama-3.3-70B-Instruct base. It prioritizes Japanese language performance while retaining strong Engl'
      },
      'shisa-ai/shisa-v2-llama3.3-70b': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 0.019992,
        outputPrice: 0.080006,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Shisa V2 Llama 3.3 70B is a bilingual Japanese-English chat model fine-tuned by Shisa.AI on Meta’s Llama-3.3-70B-Instruct base. It prioritizes Japanese language performance while retaining strong Engl'
      }
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
    setupInstructions: 'Get your API key from https://openrouter.ai/keys',
    iconUrl: 'https://github.com/shisa-ai.png',
    clickable: true
  },

  'arliai': {
    id: 'arliai',
    name: 'Arliai',
    description: 'Arliai AI models',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'reasoning'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'arliai/qwq-32b-arliai-rpr-v1:free',
    modelCount: 2,
    supportedModels: {
      'arliai/qwq-32b-arliai-rpr-v1:free': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'QwQ-32B-ArliAI-RpR-v1 is a 32B parameter model fine-tuned from Qwen/QwQ-32B using a curated creative writing and roleplay dataset originally developed for the RPMax series. It is designed to maintain '
      },
      'arliai/qwq-32b-arliai-rpr-v1': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 0.010000,
        outputPrice: 0.040003,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'QwQ-32B-ArliAI-RpR-v1 is a 32B parameter model fine-tuned from Qwen/QwQ-32B using a curated creative writing and roleplay dataset originally developed for the RPMax series. It is designed to maintain '
      }
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
    iconUrl: 'https://github.com/arliai.png',
    clickable: true
  },

  'agentica-org': {
    id: 'agentica-org',
    name: 'Agentica Org',
    description: 'Agentica Org AI models',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'reasoning'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'agentica-org/deepcoder-14b-preview:free',
    modelCount: 2,
    supportedModels: {
      'agentica-org/deepcoder-14b-preview:free': {
        maxTokens: 4096,
        contextWindow: 96000,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'DeepCoder-14B-Preview is a 14B parameter code generation model fine-tuned from DeepSeek-R1-Distill-Qwen-14B using reinforcement learning with GRPO+ and iterative context lengthening. It is optimized f'
      },
      'agentica-org/deepcoder-14b-preview': {
        maxTokens: 4096,
        contextWindow: 96000,
        inputPrice: 0.015000,
        outputPrice: 0.015000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'DeepCoder-14B-Preview is a 14B parameter code generation model fine-tuned from DeepSeek-R1-Distill-Qwen-14B using reinforcement learning with GRPO+ and iterative context lengthening. It is optimized f'
      }
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
    iconUrl: 'https://github.com/agentica-org.png',
    clickable: true
  },

  'liquid': {
    id: 'liquid',
    name: 'Liquid AI',
    description: 'Efficient AI models',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'liquid/lfm-7b',
    modelCount: 2,
    supportedModels: {
      'liquid/lfm-7b': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 0.010000,
        outputPrice: 0.010000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'LFM-7B, a new best-in-class language model. LFM-7B is designed for exceptional chat capabilities, including languages like Arabic and Japanese. Powered by the Liquid Foundation Model (LFM) architectur'
      },
      'liquid/lfm-3b': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 0.020000,
        outputPrice: 0.020000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Liquid\'s LFM 3B delivers incredible performance for its size. It positions itself as first place among 3B parameter transformers, hybrids, and RNN models It is also on par with Phi-3.5-mini on multip'
      }
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
    setupInstructions: 'Get your API key from https://openrouter.ai/keys',
    iconUrl: 'https://www.liquid.ai/favicon.ico',
    clickable: true
  },

  'anthracite-org': {
    id: 'anthracite-org',
    name: 'Anthracite Org',
    description: 'Anthracite Org AI models',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'anthracite-org/magnum-v4-72b',
    modelCount: 2,
    supportedModels: {
      'anthracite-org/magnum-v4-72b': {
        maxTokens: 2048,
        contextWindow: 16384,
        inputPrice: 2.000000,
        outputPrice: 5.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'This is a series of models designed to replicate the prose quality of the Claude 3 models, specifically Sonnet(https://openrouter.ai/anthropic/claude-3.5-sonnet) and Opus(https://openrouter.ai/anthrop'
      },
      'anthracite-org/magnum-v2-72b': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 3.000000,
        outputPrice: 3.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'From the maker of [Goliath](https://openrouter.ai/models/alpindale/goliath-120b), Magnum 72B is the seventh in a family of models designed to achieve the prose quality of the Claude 3 models, notably '
      }
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
    setupInstructions: 'Get your API key from https://openrouter.ai/keys',
    iconUrl: 'https://github.com/anthracite-org.png',
    clickable: true
  },

  'inflection': {
    id: 'inflection',
    name: 'Inflection AI',
    description: 'Inflection AI AI models',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter'],
    tier: 'standard',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'inflection/inflection-3-productivity',
    modelCount: 2,
    supportedModels: {
      'inflection/inflection-3-productivity': {
        maxTokens: 1024,
        contextWindow: 8000,
        inputPrice: 2.500000,
        outputPrice: 10.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Inflection 3 Productivity is optimized for following instructions. It is better for tasks requiring JSON output or precise adherence to provided guidelines. It has access to recent news.  For emotiona'
      },
      'inflection/inflection-3-pi': {
        maxTokens: 1024,
        contextWindow: 8000,
        inputPrice: 2.500000,
        outputPrice: 10.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Inflection 3 Pi powers Inflection\'s [Pi](https://pi.ai) chatbot, including backstory, emotional intelligence, productivity, and safety. It has access to recent news, and excels in scenarios like cust'
      }
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
    setupInstructions: 'Get your API key from https://openrouter.ai/keys',
    iconUrl: 'https://github.com/inflection.png',
    clickable: true
  },

  'bytedance': {
    id: 'bytedance',
    name: 'Bytedance',
    description: 'Bytedance AI models',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'vision'],
    tier: 'community',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'bytedance/ui-tars-1.5-7b',
    modelCount: 1,
    supportedModels: {
      'bytedance/ui-tars-1.5-7b': {
        maxTokens: 2048,
        contextWindow: 128000,
        inputPrice: 0.100000,
        outputPrice: 0.200000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'UI-TARS-1.5 is a multimodal vision-language agent optimized for GUI-based environments, including desktop interfaces, web browsers, mobile systems, and games. Built by ByteDance, it builds upon the UI'
      }
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
    iconUrl: 'https://github.com/bytedance.png',
    clickable: true
  },

  'switchpoint': {
    id: 'switchpoint',
    name: 'Switchpoint',
    description: 'Switchpoint AI models',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'reasoning'],
    tier: 'community',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'switchpoint/router',
    modelCount: 1,
    supportedModels: {
      'switchpoint/router': {
        maxTokens: 4096,
        contextWindow: 131072,
        inputPrice: 0.850000,
        outputPrice: 3.400000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Switchpoint AI\'s router instantly analyzes your request and directs it to the optimal AI from an ever-evolving library.   As the world of LLMs advances, our router gets smarter, ensuring you always b'
      }
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
    iconUrl: 'https://github.com/switchpoint.png',
    clickable: true
  },

  'opengvlab': {
    id: 'opengvlab',
    name: 'Opengvlab',
    description: 'Opengvlab AI models',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'vision'],
    tier: 'community',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'opengvlab/internvl3-14b',
    modelCount: 1,
    supportedModels: {
      'opengvlab/internvl3-14b': {
        maxTokens: 4096,
        contextWindow: 12288,
        inputPrice: 0.200000,
        outputPrice: 0.400000,
        supportsImages: true,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'The 14b version of the InternVL3 series. An advanced multimodal large language model (MLLM) series that demonstrates superior overall performance. Compared to InternVL 2.5, InternVL3 exhibits superior'
      }
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
    iconUrl: 'https://github.com/opengvlab.png',
    clickable: true
  },

  'eleutherai': {
    id: 'eleutherai',
    name: 'Eleutherai',
    description: 'Eleutherai AI models',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter'],
    tier: 'community',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'eleutherai/llemma_7b',
    modelCount: 1,
    supportedModels: {
      'eleutherai/llemma_7b': {
        maxTokens: 4096,
        contextWindow: 4096,
        inputPrice: 0.800000,
        outputPrice: 1.200000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Llemma 7B is a language model for mathematics. It was initialized with Code Llama 7B weights, and trained on the Proof-Pile-2 for 200B tokens. Llemma models are particularly strong at chain-of-thought'
      }
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
    setupInstructions: 'Get your API key from https://openrouter.ai/keys',
    iconUrl: 'https://github.com/eleutherai.png',
    clickable: true
  },

  'alfredpros': {
    id: 'alfredpros',
    name: 'Alfredpros',
    description: 'Alfredpros AI models',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter'],
    tier: 'community',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'alfredpros/codellama-7b-instruct-solidity',
    modelCount: 1,
    supportedModels: {
      'alfredpros/codellama-7b-instruct-solidity': {
        maxTokens: 8192,
        contextWindow: 8192,
        inputPrice: 0.700000,
        outputPrice: 1.100000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'A finetuned 7 billion parameters Code LLaMA - Instruct model to generate Solidity smart contract using 4-bit QLoRA finetuning provided by PEFT library.'
      }
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
    setupInstructions: 'Get your API key from https://openrouter.ai/keys',
    iconUrl: 'https://github.com/alfredpros.png',
    clickable: true
  },

  'rekaai': {
    id: 'rekaai',
    name: 'Reka AI',
    description: 'Multimodal AI models',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter', 'reasoning'],
    tier: 'community',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'rekaai/reka-flash-3:free',
    modelCount: 1,
    supportedModels: {
      'rekaai/reka-flash-3:free': {
        maxTokens: 4096,
        contextWindow: 32768,
        inputPrice: 0.000000,
        outputPrice: 0.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: true,
        description: 'Reka Flash 3 is a general-purpose, instruction-tuned large language model with 21 billion parameters, developed by Reka. It excels at general chat, coding tasks, instruction-following, and function ca'
      }
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
    iconUrl: 'https://www.reka.ai/favicon.ico',
    clickable: true
  },

  'infermatic': {
    id: 'infermatic',
    name: 'Infermatic',
    description: 'Infermatic AI models',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter'],
    tier: 'community',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'infermatic/mn-inferor-12b',
    modelCount: 1,
    supportedModels: {
      'infermatic/mn-inferor-12b': {
        maxTokens: 8192,
        contextWindow: 8192,
        inputPrice: 0.600000,
        outputPrice: 1.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Inferor 12B is a merge of top roleplay models, expert on immersive narratives and storytelling.  This model was merged using the [Model Stock](https://arxiv.org/abs/2403.19522) merge method using [ant'
      }
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
    setupInstructions: 'Get your API key from https://openrouter.ai/keys',
    iconUrl: 'https://github.com/infermatic.png',
    clickable: true
  },

  'raifle': {
    id: 'raifle',
    name: 'Raifle',
    description: 'Raifle AI models',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter'],
    tier: 'community',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'raifle/sorcererlm-8x22b',
    modelCount: 1,
    supportedModels: {
      'raifle/sorcererlm-8x22b': {
        maxTokens: 4096,
        contextWindow: 16000,
        inputPrice: 4.500000,
        outputPrice: 4.500000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'SorcererLM is an advanced RP and storytelling model, built as a Low-rank 16-bit LoRA fine-tuned on [WizardLM-2 8x22B](/microsoft/wizardlm-2-8x22b).  - Advanced reasoning and emotional intelligence for'
      }
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
    setupInstructions: 'Get your API key from https://openrouter.ai/keys',
    iconUrl: 'https://github.com/raifle.png',
    clickable: true
  },

  'sophosympatheia': {
    id: 'sophosympatheia',
    name: 'Sophosympatheia',
    description: 'Sophosympatheia AI models',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter'],
    tier: 'community',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'sophosympatheia/midnight-rose-70b',
    modelCount: 1,
    supportedModels: {
      'sophosympatheia/midnight-rose-70b': {
        maxTokens: 2048,
        contextWindow: 4096,
        inputPrice: 0.800000,
        outputPrice: 0.800000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'A merge with a complex family tree, this model was crafted for roleplaying and storytelling. Midnight Rose is a successor to Rogue Rose and Aurora Nights and improves upon them both. It wants to produ'
      }
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
    setupInstructions: 'Get your API key from https://openrouter.ai/keys',
    iconUrl: 'https://github.com/sophosympatheia.png',
    clickable: true
  },

  'alpindale': {
    id: 'alpindale',
    name: 'Alpindale',
    description: 'Alpindale AI models',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter'],
    tier: 'community',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'alpindale/goliath-120b',
    modelCount: 1,
    supportedModels: {
      'alpindale/goliath-120b': {
        maxTokens: 512,
        contextWindow: 6144,
        inputPrice: 4.000000,
        outputPrice: 5.500000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'A large LLM created by combining two fine-tuned Llama 70B models into one 120B model. Combines Xwin and Euryale.  Credits to - [@chargoddard](https://huggingface.co/chargoddard) for developing the fra'
      }
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
    setupInstructions: 'Get your API key from https://openrouter.ai/keys',
    iconUrl: 'https://github.com/alpindale.png',
    clickable: true
  },

  'openrouter': {
    id: 'openrouter',
    name: 'Openrouter',
    description: 'Openrouter AI models',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter'],
    tier: 'community',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openrouter/auto',
    modelCount: 1,
    supportedModels: {
      'openrouter/auto': {
        maxTokens: 4096,
        contextWindow: 2000000,
        inputPrice: -1000000.000000,
        outputPrice: -1000000.000000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'Your prompt will be processed by a meta-model and routed to one of dozens of models (see below), optimizing for the best possible output.  To see which model was used, visit [Activity](/activity), or '
      }
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
    setupInstructions: 'Get your API key from https://openrouter.ai/keys',
    iconUrl: 'https://github.com/openrouter.png',
    clickable: true
  },

  'pygmalionai': {
    id: 'pygmalionai',
    name: 'PygmalionAI',
    description: 'PygmalionAI AI models',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter'],
    tier: 'community',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'pygmalionai/mythalion-13b',
    modelCount: 1,
    supportedModels: {
      'pygmalionai/mythalion-13b': {
        maxTokens: 4096,
        contextWindow: 4096,
        inputPrice: 0.700000,
        outputPrice: 1.100000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'A blend of the new Pygmalion-13b and MythoMax. #merge'
      }
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
    setupInstructions: 'Get your API key from https://openrouter.ai/keys',
    iconUrl: 'https://github.com/pygmalionai.png',
    clickable: true
  },

  'mancer': {
    id: 'mancer',
    name: 'Mancer',
    description: 'Mancer AI models',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter'],
    tier: 'community',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'mancer/weaver',
    modelCount: 1,
    supportedModels: {
      'mancer/weaver': {
        maxTokens: 2000,
        contextWindow: 8000,
        inputPrice: 1.125000,
        outputPrice: 1.125000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'An attempt to recreate Claude-style verbosity, but don\'t expect the same level of coherence or memory. Meant for use in roleplay/narrative situations.'
      }
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
    setupInstructions: 'Get your API key from https://openrouter.ai/keys',
    iconUrl: 'https://github.com/mancer.png',
    clickable: true
  },

  'undi95': {
    id: 'undi95',
    name: 'Undi95',
    description: 'Undi95 AI models',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter'],
    tier: 'community',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'undi95/remm-slerp-l2-13b',
    modelCount: 1,
    supportedModels: {
      'undi95/remm-slerp-l2-13b': {
        maxTokens: 4096,
        contextWindow: 6144,
        inputPrice: 0.450000,
        outputPrice: 0.650000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'A recreation trial of the original MythoMax-L2-B13 but with updated models. #merge'
      }
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
    setupInstructions: 'Get your API key from https://openrouter.ai/keys',
    iconUrl: 'https://github.com/undi95.png',
    clickable: true
  },

  'gryphe': {
    id: 'gryphe',
    name: 'Gryphe',
    description: 'Gryphe AI models',
    category: 'openrouter',
    authType: 'api_key',
    tags: ['openrouter'],
    tier: 'community',
    baseUrl: 'https://openrouter.ai/api/v1',
    openRouterUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'gryphe/mythomax-l2-13b',
    modelCount: 1,
    supportedModels: {
      'gryphe/mythomax-l2-13b': {
        maxTokens: 4096,
        contextWindow: 4096,
        inputPrice: 0.060000,
        outputPrice: 0.060000,
        supportsImages: false,
        supportsAudio: false,
        supportsTools: false,
        supportsStreaming: true,
        supportsReasoning: false,
        description: 'One of the highest performing and most popular fine-tunes of Llama 2 13B, with rich descriptions and roleplay. #merge'
      }
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
    setupInstructions: 'Get your API key from https://openrouter.ai/keys',
    iconUrl: 'https://github.com/gryphe.png',
    clickable: true
  }
}

// Provider statistics
export const PROVIDER_STATS = {
  totalProviders: 52,
  totalModels: 323,
  lastUpdated: new Date().toISOString()
}

// Get provider by ID
export function getProvider(id: string): ProviderConfiguration | null {
  return COMPREHENSIVE_PROVIDERS[id] || null
}

// Get all providers
export function getAllProviders(): ProviderConfiguration[] {
  return Object.values(COMPREHENSIVE_PROVIDERS)
}

// Search providers by name or tag
export function searchProviders(query: string): ProviderConfiguration[] {
  const searchTerm = query.toLowerCase()
  return Object.values(COMPREHENSIVE_PROVIDERS).filter(provider => 
    provider.name.toLowerCase().includes(searchTerm) ||
    provider.description.toLowerCase().includes(searchTerm) ||
    provider.tags.some(tag => tag.includes(searchTerm))
  )
}

// Get providers by feature
export function getProvidersByFeature(feature: keyof ProviderConfiguration['features']): ProviderConfiguration[] {
  return Object.values(COMPREHENSIVE_PROVIDERS).filter(provider => 
    provider.features[feature]
  )
}
