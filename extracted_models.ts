// AUTO-GENERATED MODEL CATALOG FROM CLINE
// This contains ALL models extracted from Cline's comprehensive catalog

export const EXTRACTED_CLINE_MODELS = {
  // ANTHROPIC MODELS (9 total)
  "anthropic": {
    id: "anthropic",
    name: "Anthropic",
    description: "Claude models with superior reasoning and safety",
    category: "api",
    authType: "api_key",
    baseUrl: "https://api.anthropic.com",
    tags: ["reasoning", "safety", "tools", "vision"],
    tier: "premium",
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: true,
    supportsPromptCaching: true,
    defaultModel: "claude-sonnet-4-20250514:1m",
    modelCount: 9,
    supportedModels: {
      "claude-sonnet-4-20250514:1m": {
        maxTokens: 8192,
        contextWindow: 1000000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "claude-sonnet-4-20250514:1m model"
      },
      "claude-sonnet-4-20250514": {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "claude-sonnet-4-20250514 model"
      },
      "claude-opus-4-1-20250805": {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 15.0,
        outputPrice: 75.0,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "claude-opus-4-1-20250805 model"
      },
      "claude-opus-4-20250514": {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 15.0,
        outputPrice: 75.0,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "claude-opus-4-20250514 model"
      },
      "claude-3-7-sonnet-20250219": {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "claude-3-7-sonnet-20250219 model"
      },
      "claude-3-5-sonnet-20241022": {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "claude-3-5-sonnet-20241022 model"
      },
      "claude-3-5-haiku-20241022": {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 0.8,
        outputPrice: 4.0,
        supportsImages: false,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "claude-3-5-haiku-20241022 model"
      },
      "claude-3-opus-20240229": {
        maxTokens: 4096,
        contextWindow: 200000,
        inputPrice: 15.0,
        outputPrice: 75.0,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "claude-3-opus-20240229 model"
      },
      "claude-3-haiku-20240307": {
        maxTokens: 4096,
        contextWindow: 200000,
        inputPrice: 0.25,
        outputPrice: 1.25,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "claude-3-haiku-20240307 model"
      },
    }
  },

  // CLAUDE-CODE MODELS (6 total)
  "claude-code": {
    id: "claude-code",
    name: "Claude-Code",
    description: "Claude-Code AI models",
    category: "api",
    authType: "api_key",
    baseUrl: "https://api.claude-code.com/v1",
    tags: ["ai", "language-model"],
    tier: "premium",
    supportsStreaming: true,
    supportsTools: false,
    supportsVision: false,
    supportsReasoning: false,
    supportsPromptCaching: false,
    defaultModel: "claude-sonnet-4-20250514",
    modelCount: 6,
    supportedModels: {
      "claude-sonnet-4-20250514": {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "claude-sonnet-4-20250514 model"
      },
      "claude-opus-4-1-20250805": {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "claude-opus-4-1-20250805 model"
      },
      "claude-opus-4-20250514": {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "claude-opus-4-20250514 model"
      },
      "claude-3-7-sonnet-20250219": {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "claude-3-7-sonnet-20250219 model"
      },
      "claude-3-5-sonnet-20241022": {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "claude-3-5-sonnet-20241022 model"
      },
      "claude-3-5-haiku-20241022": {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "claude-3-5-haiku-20241022 model"
      },
    }
  },

  // BEDROCK MODELS (18 total)
  "bedrock": {
    id: "bedrock",
    name: "Bedrock",
    description: "Bedrock AI models",
    category: "api",
    authType: "api_key",
    baseUrl: "https://api.bedrock.com/v1",
    tags: ["ai", "language-model"],
    tier: "premium",
    supportsStreaming: true,
    supportsTools: false,
    supportsVision: false,
    supportsReasoning: false,
    supportsPromptCaching: false,
    defaultModel: "anthropic.claude-sonnet-4-20250514-v1:0:1m",
    modelCount: 18,
    supportedModels: {
      "anthropic.claude-sonnet-4-20250514-v1:0:1m": {
        maxTokens: 8192,
        contextWindow: 1000000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "anthropic.claude-sonnet-4-20250514-v1:0:1m model"
      },
      "anthropic.claude-sonnet-4-20250514-v1:0": {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "anthropic.claude-sonnet-4-20250514-v1:0 model"
      },
      "anthropic.claude-opus-4-20250514-v1:0": {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 15.0,
        outputPrice: 75.0,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "anthropic.claude-opus-4-20250514-v1:0 model"
      },
      "anthropic.claude-opus-4-1-20250805-v1:0": {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 15.0,
        outputPrice: 75.0,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "anthropic.claude-opus-4-1-20250805-v1:0 model"
      },
      "amazon.nova-premier-v1:0": {
        maxTokens: 10000,
        contextWindow: 1000000,
        inputPrice: 2.5,
        outputPrice: 12.5,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "amazon.nova-premier-v1:0 model"
      },
      "amazon.nova-pro-v1:0": {
        maxTokens: 5000,
        contextWindow: 300000,
        inputPrice: 0.8,
        outputPrice: 3.2,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "amazon.nova-pro-v1:0 model"
      },
      "amazon.nova-lite-v1:0": {
        maxTokens: 5000,
        contextWindow: 300000,
        inputPrice: 0.06,
        outputPrice: 0.24,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "amazon.nova-lite-v1:0 model"
      },
      "amazon.nova-micro-v1:0": {
        maxTokens: 5000,
        contextWindow: 128000,
        inputPrice: 0.035,
        outputPrice: 0.14,
        supportsImages: false,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "amazon.nova-micro-v1:0 model"
      },
      "anthropic.claude-3-7-sonnet-20250219-v1:0": {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "anthropic.claude-3-7-sonnet-20250219-v1:0 model"
      },
      "anthropic.claude-3-5-sonnet-20241022-v2:0": {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "anthropic.claude-3-5-sonnet-20241022-v2:0 model"
      },
      "anthropic.claude-3-5-haiku-20241022-v1:0": {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 0.8,
        outputPrice: 4.0,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "anthropic.claude-3-5-haiku-20241022-v1:0 model"
      },
      "anthropic.claude-3-5-sonnet-20240620-v1:0": {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "anthropic.claude-3-5-sonnet-20240620-v1:0 model"
      },
      "anthropic.claude-3-opus-20240229-v1:0": {
        maxTokens: 4096,
        contextWindow: 200000,
        inputPrice: 15.0,
        outputPrice: 75.0,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "anthropic.claude-3-opus-20240229-v1:0 model"
      },
      "anthropic.claude-3-sonnet-20240229-v1:0": {
        maxTokens: 4096,
        contextWindow: 200000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "anthropic.claude-3-sonnet-20240229-v1:0 model"
      },
      "anthropic.claude-3-haiku-20240307-v1:0": {
        maxTokens: 4096,
        contextWindow: 200000,
        inputPrice: 0.25,
        outputPrice: 1.25,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "anthropic.claude-3-haiku-20240307-v1:0 model"
      },
      "deepseek.r1-v1:0": {
        maxTokens: 8000,
        contextWindow: 64000,
        inputPrice: 1.35,
        outputPrice: 5.4,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "deepseek.r1-v1:0 model"
      },
      "openai.gpt-oss-120b-1:0": {
        maxTokens: 8192,
        contextWindow: 128000,
        inputPrice: 0.15,
        outputPrice: 0.6,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "A state-of-the-art 120B open-weight Mixture-of-Experts language model optimized for strong reasoning, tool use, and efficient deployment on large GPUs"
      },
      "openai.gpt-oss-20b-1:0": {
        maxTokens: 8192,
        contextWindow: 128000,
        inputPrice: 0.07,
        outputPrice: 0.3,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "A compact 20B open-weight Mixture-of-Experts language model designed for strong reasoning and tool use, ideal for edge devices and local inference."
      },
    }
  },

  // VERTEX MODELS (29 total)
  "vertex": {
    id: "vertex",
    name: "Vertex",
    description: "Vertex AI models",
    category: "api",
    authType: "api_key",
    baseUrl: "https://api.vertex.com/v1",
    tags: ["ai", "language-model"],
    tier: "premium",
    supportsStreaming: true,
    supportsTools: false,
    supportsVision: false,
    supportsReasoning: false,
    supportsPromptCaching: false,
    defaultModel: "claude-sonnet-4@20250514",
    modelCount: 29,
    supportedModels: {
      "claude-sonnet-4@20250514": {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "claude-sonnet-4@20250514 model"
      },
      "claude-opus-4-1@20250805": {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 15.0,
        outputPrice: 75.0,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "claude-opus-4-1@20250805 model"
      },
      "claude-opus-4@20250514": {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 15.0,
        outputPrice: 75.0,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "claude-opus-4@20250514 model"
      },
      "claude-3-7-sonnet@20250219": {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "claude-3-7-sonnet@20250219 model"
      },
      "claude-3-5-sonnet-v2@20241022": {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "claude-3-5-sonnet-v2@20241022 model"
      },
      "claude-3-5-sonnet@20240620": {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "claude-3-5-sonnet@20240620 model"
      },
      "claude-3-5-haiku@20241022": {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 1.0,
        outputPrice: 5.0,
        supportsImages: false,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "claude-3-5-haiku@20241022 model"
      },
      "claude-3-opus@20240229": {
        maxTokens: 4096,
        contextWindow: 200000,
        inputPrice: 15.0,
        outputPrice: 75.0,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "claude-3-opus@20240229 model"
      },
      "claude-3-haiku@20240307": {
        maxTokens: 4096,
        contextWindow: 200000,
        inputPrice: 0.25,
        outputPrice: 1.25,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "claude-3-haiku@20240307 model"
      },
      "mistral-large-2411": {
        maxTokens: 128000,
        contextWindow: 128000,
        inputPrice: 2.0,
        outputPrice: 6.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "mistral-large-2411 model"
      },
      "mistral-small-2503": {
        maxTokens: 128000,
        contextWindow: 128000,
        inputPrice: 0.1,
        outputPrice: 0.3,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "mistral-small-2503 model"
      },
      "codestral-2501": {
        maxTokens: 256000,
        contextWindow: 256000,
        inputPrice: 0.3,
        outputPrice: 0.9,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "codestral-2501 model"
      },
      "llama-4-maverick-17b-128e-instruct-maas": {
        maxTokens: 128000,
        contextWindow: 1048576,
        inputPrice: 0.35,
        outputPrice: 1.15,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "llama-4-maverick-17b-128e-instruct-maas model"
      },
      "llama-4-scout-17b-16e-instruct-maas": {
        maxTokens: 1000000,
        contextWindow: 10485760,
        inputPrice: 0.25,
        outputPrice: 0.7,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "llama-4-scout-17b-16e-instruct-maas model"
      },
      "gemini-2.0-flash-001": {
        maxTokens: 8192,
        contextWindow: 1048576,
        inputPrice: 0.15,
        outputPrice: 0.6,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "gemini-2.0-flash-001 model"
      },
      "gemini-2.0-flash-lite-001": {
        maxTokens: 8192,
        contextWindow: 1048576,
        inputPrice: 0.075,
        outputPrice: 0.3,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "gemini-2.0-flash-lite-001 model"
      },
      "gemini-2.0-flash-thinking-exp-1219": {
        maxTokens: 8192,
        contextWindow: 32767,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "gemini-2.0-flash-thinking-exp-1219 model"
      },
      "gemini-2.0-flash-exp": {
        maxTokens: 8192,
        contextWindow: 1048576,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "gemini-2.0-flash-exp model"
      },
      "gemini-2.5-pro-exp-03-25": {
        maxTokens: 65536,
        contextWindow: 1048576,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "gemini-2.5-pro-exp-03-25 model"
      },
      "gemini-2.5-pro": {
        maxTokens: 65536,
        contextWindow: 1048576,
        inputPrice: 2.5,
        outputPrice: 15.0,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "gemini-2.5-pro model"
      },
      "gemini-2.5-flash": {
        maxTokens: 65536,
        contextWindow: 1048576,
        inputPrice: 0.3,
        outputPrice: 2.5,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "gemini-2.5-flash model"
      },
      "gemini-2.5-flash-lite-preview-06-17": {
        maxTokens: 64000,
        contextWindow: 1000000,
        inputPrice: 0.1,
        outputPrice: 0.4,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "Preview version - may not be available in all regions"
      },
      "gemini-2.0-flash-thinking-exp-01-21": {
        maxTokens: 65536,
        contextWindow: 1048576,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "gemini-2.0-flash-thinking-exp-01-21 model"
      },
      "gemini-exp-1206": {
        maxTokens: 8192,
        contextWindow: 2097152,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "gemini-exp-1206 model"
      },
      "gemini-1.5-flash-002": {
        maxTokens: 8192,
        contextWindow: 1048576,
        inputPrice: 0.15,
        outputPrice: 0.6,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "gemini-1.5-flash-002 model"
      },
      "gemini-1.5-flash-exp-0827": {
        maxTokens: 8192,
        contextWindow: 1048576,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "gemini-1.5-flash-exp-0827 model"
      },
      "gemini-1.5-flash-8b-exp-0827": {
        maxTokens: 8192,
        contextWindow: 1048576,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "gemini-1.5-flash-8b-exp-0827 model"
      },
      "gemini-1.5-pro-002": {
        maxTokens: 8192,
        contextWindow: 2097152,
        inputPrice: 1.25,
        outputPrice: 5.0,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "gemini-1.5-pro-002 model"
      },
      "gemini-1.5-pro-exp-0827": {
        maxTokens: 8192,
        contextWindow: 2097152,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "gemini-1.5-pro-exp-0827 model"
      },
    }
  },

  // GEMINI MODELS (15 total)
  "gemini": {
    id: "gemini",
    name: "Google Gemini",
    description: "Multimodal models with massive context windows",
    category: "api",
    authType: "api_key",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    tags: ["multimodal", "large-context", "tools", "vision"],
    tier: "premium",
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: true,
    supportsPromptCaching: false,
    defaultModel: "gemini-2.5-pro",
    modelCount: 15,
    supportedModels: {
      "gemini-2.5-pro": {
        maxTokens: 65536,
        contextWindow: 1048576,
        inputPrice: 2.5,
        outputPrice: 15.0,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "gemini-2.5-pro model"
      },
      "gemini-2.5-flash-lite-preview-06-17": {
        maxTokens: 64000,
        contextWindow: 1000000,
        inputPrice: 0.1,
        outputPrice: 0.4,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "Preview version - may not be available in all regions"
      },
      "gemini-2.5-flash": {
        maxTokens: 65536,
        contextWindow: 1048576,
        inputPrice: 0.3,
        outputPrice: 2.5,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "gemini-2.5-flash model"
      },
      "gemini-2.0-flash-001": {
        maxTokens: 8192,
        contextWindow: 1048576,
        inputPrice: 0.1,
        outputPrice: 0.4,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "gemini-2.0-flash-001 model"
      },
      "gemini-2.0-flash-lite-preview-02-05": {
        maxTokens: 8192,
        contextWindow: 1048576,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "gemini-2.0-flash-lite-preview-02-05 model"
      },
      "gemini-2.0-pro-exp-02-05": {
        maxTokens: 8192,
        contextWindow: 2097152,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "gemini-2.0-pro-exp-02-05 model"
      },
      "gemini-2.0-flash-thinking-exp-01-21": {
        maxTokens: 65536,
        contextWindow: 1048576,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "gemini-2.0-flash-thinking-exp-01-21 model"
      },
      "gemini-2.0-flash-thinking-exp-1219": {
        maxTokens: 8192,
        contextWindow: 32767,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "gemini-2.0-flash-thinking-exp-1219 model"
      },
      "gemini-2.0-flash-exp": {
        maxTokens: 8192,
        contextWindow: 1048576,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "gemini-2.0-flash-exp model"
      },
      "gemini-1.5-flash-002": {
        maxTokens: 8192,
        contextWindow: 1048576,
        inputPrice: 0.15,
        outputPrice: 0.6,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "gemini-1.5-flash-002 model"
      },
      "gemini-1.5-flash-exp-0827": {
        maxTokens: 8192,
        contextWindow: 1048576,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "gemini-1.5-flash-exp-0827 model"
      },
      "gemini-1.5-flash-8b-exp-0827": {
        maxTokens: 8192,
        contextWindow: 1048576,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "gemini-1.5-flash-8b-exp-0827 model"
      },
      "gemini-1.5-pro-002": {
        maxTokens: 8192,
        contextWindow: 2097152,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "gemini-1.5-pro-002 model"
      },
      "gemini-1.5-pro-exp-0827": {
        maxTokens: 8192,
        contextWindow: 2097152,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "gemini-1.5-pro-exp-0827 model"
      },
      "gemini-exp-1206": {
        maxTokens: 8192,
        contextWindow: 2097152,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "gemini-exp-1206 model"
      },
    }
  },

  // OPENAI MODELS (14 total)
  "openai": {
    id: "openai",
    name: "OpenAI",
    description: "GPT models with comprehensive capabilities",
    category: "api",
    authType: "api_key",
    baseUrl: "https://api.openai.com/v1",
    tags: ["versatile", "tools", "vision", "reasoning"],
    tier: "premium",
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: true,
    supportsPromptCaching: true,
    defaultModel: "gpt-5-chat-latest",
    modelCount: 14,
    supportedModels: {
      "gpt-5-2025-08-07": {
        maxTokens: 8192,
        contextWindow: 272000,
        inputPrice: 1.25,
        outputPrice: 10.0,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "gpt-5-2025-08-07 model"
      },
      "gpt-5-mini-2025-08-07": {
        maxTokens: 8192,
        contextWindow: 272000,
        inputPrice: 0.25,
        outputPrice: 2.0,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "gpt-5-mini-2025-08-07 model"
      },
      "gpt-5-nano-2025-08-07": {
        maxTokens: 8192,
        contextWindow: 272000,
        inputPrice: 0.05,
        outputPrice: 0.4,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "gpt-5-nano-2025-08-07 model"
      },
      "gpt-5-chat-latest": {
        maxTokens: 8192,
        contextWindow: 400000,
        inputPrice: 1.25,
        outputPrice: 10.0,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "gpt-5-chat-latest model"
      },
      "o4-mini": {
        maxTokens: 100000,
        contextWindow: 200000,
        inputPrice: 1.1,
        outputPrice: 4.4,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "o4-mini model"
      },
      "gpt-4.1": {
        maxTokens: 32768,
        contextWindow: 1047576,
        inputPrice: 2.0,
        outputPrice: 8.0,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "gpt-4.1 model"
      },
      "gpt-4.1-mini": {
        maxTokens: 32768,
        contextWindow: 1047576,
        inputPrice: 0.4,
        outputPrice: 1.6,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "gpt-4.1-mini model"
      },
      "gpt-4.1-nano": {
        maxTokens: 32768,
        contextWindow: 1047576,
        inputPrice: 0.1,
        outputPrice: 0.4,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "gpt-4.1-nano model"
      },
      "o3-mini": {
        maxTokens: 100000,
        contextWindow: 200000,
        inputPrice: 1.1,
        outputPrice: 4.4,
        supportsImages: false,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "o3-mini model"
      },
      "o1-preview": {
        maxTokens: 32768,
        contextWindow: 128000,
        inputPrice: 15.0,
        outputPrice: 60.0,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "o1-preview model"
      },
      "o1-mini": {
        maxTokens: 65536,
        contextWindow: 128000,
        inputPrice: 1.1,
        outputPrice: 4.4,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "o1-mini model"
      },
      "gpt-4o": {
        maxTokens: 4096,
        contextWindow: 128000,
        inputPrice: 2.5,
        outputPrice: 10.0,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "gpt-4o model"
      },
      "gpt-4o-mini": {
        maxTokens: 16384,
        contextWindow: 128000,
        inputPrice: 0.15,
        outputPrice: 0.6,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "gpt-4o-mini model"
      },
      "chatgpt-4o-latest": {
        maxTokens: 16384,
        contextWindow: 128000,
        inputPrice: 5.0,
        outputPrice: 15.0,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "chatgpt-4o-latest model"
      },
    }
  },

  // DEEPSEEK MODELS (2 total)
  "deepseek": {
    id: "deepseek",
    name: "DeepSeek",
    description: "Advanced reasoning models from DeepSeek",
    category: "api",
    authType: "api_key",
    baseUrl: "https://api.deepseek.com/v1",
    tags: ["reasoning", "code", "efficient"],
    tier: "premium",
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: false,
    supportsReasoning: true,
    supportsPromptCaching: true,
    defaultModel: "deepseek-chat",
    modelCount: 2,
    supportedModels: {
      "deepseek-chat": {
        maxTokens: 8000,
        contextWindow: 128000,
        inputPrice: 0.0,
        outputPrice: 1.1,
        supportsImages: false,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "deepseek-chat model"
      },
      "deepseek-reasoner": {
        maxTokens: 8000,
        contextWindow: 128000,
        inputPrice: 0.0,
        outputPrice: 2.19,
        supportsImages: false,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "deepseek-reasoner model"
      },
    }
  },

  // HUGGINGFACE MODELS (7 total)
  "huggingface": {
    id: "huggingface",
    name: "Huggingface",
    description: "Huggingface AI models",
    category: "api",
    authType: "api_key",
    baseUrl: "https://api.huggingface.com/v1",
    tags: ["ai", "language-model"],
    tier: "premium",
    supportsStreaming: true,
    supportsTools: false,
    supportsVision: false,
    supportsReasoning: false,
    supportsPromptCaching: false,
    defaultModel: "openai/gpt-oss-120b",
    modelCount: 7,
    supportedModels: {
      "openai/gpt-oss-120b": {
        maxTokens: 32766,
        contextWindow: 131072,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Large open-weight reasoning model for high-end desktops and data centers, built for complex coding, math, and general AI tasks."
      },
      "openai/gpt-oss-20b": {
        maxTokens: 32766,
        contextWindow: 131072,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Medium open-weight reasoning model that runs on most desktops, balancing strong reasoning with broad accessibility."
      },
      "moonshotai/Kimi-K2-Instruct": {
        maxTokens: 131072,
        contextWindow: 131072,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Advanced reasoning model with superior performance across coding, math, and general capabilities."
      },
      "deepseek-ai/DeepSeek-V3-0324": {
        maxTokens: 8192,
        contextWindow: 64000,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Advanced reasoning model with superior performance across coding, math, and general capabilities."
      },
      "deepseek-ai/DeepSeek-R1": {
        maxTokens: 8192,
        contextWindow: 64000,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "DeepSeek's reasoning model with step-by-step thinking capabilities."
      },
      "deepseek-ai/DeepSeek-R1-0528": {
        maxTokens: 64000,
        contextWindow: 64000,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "DeepSeek's reasoning model's latest version with step-by-step thinking capabilities"
      },
      "meta-llama/Llama-3.1-8B-Instruct": {
        maxTokens: 8192,
        contextWindow: 128000,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Efficient 8B parameter Llama model for general-purpose tasks."
      },
    }
  },

  // QWEN MODELS (32 total)
  "qwen": {
    id: "qwen",
    name: "Qwen",
    description: "Qwen AI models",
    category: "api",
    authType: "api_key",
    baseUrl: "https://api.qwen.com/v1",
    tags: ["ai", "language-model"],
    tier: "premium",
    supportsStreaming: true,
    supportsTools: false,
    supportsVision: false,
    supportsReasoning: false,
    supportsPromptCaching: false,
    defaultModel: "qwen3-coder-plus",
    modelCount: 32,
    supportedModels: {
      "qwen3-coder-plus": {
        maxTokens: 65536,
        contextWindow: 1000000,
        inputPrice: 1.0,
        outputPrice: 5.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "qwen3-coder-plus model"
      },
      "qwen3-coder-480b-a35b-instruct": {
        maxTokens: 65536,
        contextWindow: 204800,
        inputPrice: 1.5,
        outputPrice: 7.5,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "qwen3-coder-480b-a35b-instruct model"
      },
      "qwen3-235b-a22b": {
        maxTokens: 16384,
        contextWindow: 131072,
        inputPrice: 2.0,
        outputPrice: 8.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "qwen3-235b-a22b model"
      },
      "qwen3-32b": {
        maxTokens: 16384,
        contextWindow: 131072,
        inputPrice: 2.0,
        outputPrice: 8.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "qwen3-32b model"
      },
      "qwen3-30b-a3b": {
        maxTokens: 16384,
        contextWindow: 131072,
        inputPrice: 0.75,
        outputPrice: 3.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "qwen3-30b-a3b model"
      },
      "qwen3-14b": {
        maxTokens: 8192,
        contextWindow: 131072,
        inputPrice: 1.0,
        outputPrice: 4.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "qwen3-14b model"
      },
      "qwen3-8b": {
        maxTokens: 8192,
        contextWindow: 131072,
        inputPrice: 0.5,
        outputPrice: 2.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "qwen3-8b model"
      },
      "qwen3-4b": {
        maxTokens: 8192,
        contextWindow: 131072,
        inputPrice: 0.3,
        outputPrice: 1.2,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "qwen3-4b model"
      },
      "qwen3-1.7b": {
        maxTokens: 8192,
        contextWindow: 32768,
        inputPrice: 0.3,
        outputPrice: 1.2,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "qwen3-1.7b model"
      },
      "qwen3-0.6b": {
        maxTokens: 8192,
        contextWindow: 32768,
        inputPrice: 0.3,
        outputPrice: 1.2,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "qwen3-0.6b model"
      },
      "qwen2.5-coder-32b-instruct": {
        maxTokens: 8192,
        contextWindow: 131072,
        inputPrice: 0.002,
        outputPrice: 0.006,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "qwen2.5-coder-32b-instruct model"
      },
      "qwen2.5-coder-14b-instruct": {
        maxTokens: 8192,
        contextWindow: 131072,
        inputPrice: 0.002,
        outputPrice: 0.006,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "qwen2.5-coder-14b-instruct model"
      },
      "qwen2.5-coder-7b-instruct": {
        maxTokens: 8192,
        contextWindow: 131072,
        inputPrice: 0.001,
        outputPrice: 0.002,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "qwen2.5-coder-7b-instruct model"
      },
      "qwen2.5-coder-3b-instruct": {
        maxTokens: 8192,
        contextWindow: 32768,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "qwen2.5-coder-3b-instruct model"
      },
      "qwen2.5-coder-1.5b-instruct": {
        maxTokens: 8192,
        contextWindow: 32768,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "qwen2.5-coder-1.5b-instruct model"
      },
      "qwen2.5-coder-0.5b-instruct": {
        maxTokens: 8192,
        contextWindow: 32768,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "qwen2.5-coder-0.5b-instruct model"
      },
      "qwen-coder-plus-latest": {
        maxTokens: 129024,
        contextWindow: 131072,
        inputPrice: 3.5,
        outputPrice: 7.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "qwen-coder-plus-latest model"
      },
      "qwen-plus-latest": {
        maxTokens: 16384,
        contextWindow: 131072,
        inputPrice: 0.8,
        outputPrice: 2.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "qwen-plus-latest model"
      },
      "qwen-turbo-latest": {
        maxTokens: 16384,
        contextWindow: 1000000,
        inputPrice: 0.3,
        outputPrice: 0.6,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "qwen-turbo-latest model"
      },
      "qwen-max-latest": {
        maxTokens: 30720,
        contextWindow: 32768,
        inputPrice: 2.4,
        outputPrice: 9.6,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "qwen-max-latest model"
      },
      "qwen-coder-plus": {
        maxTokens: 129024,
        contextWindow: 131072,
        inputPrice: 3.5,
        outputPrice: 7.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "qwen-coder-plus model"
      },
      "qwen-plus": {
        maxTokens: 129024,
        contextWindow: 131072,
        inputPrice: 0.8,
        outputPrice: 2.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "qwen-plus model"
      },
      "qwen-turbo": {
        maxTokens: 1000000,
        contextWindow: 1000000,
        inputPrice: 0.3,
        outputPrice: 0.6,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "qwen-turbo model"
      },
      "qwen-max": {
        maxTokens: 30720,
        contextWindow: 32768,
        inputPrice: 2.4,
        outputPrice: 9.6,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "qwen-max model"
      },
      "deepseek-v3": {
        maxTokens: 8000,
        contextWindow: 64000,
        inputPrice: 0.0,
        outputPrice: 0.28,
        supportsImages: false,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "deepseek-v3 model"
      },
      "deepseek-r1": {
        maxTokens: 8000,
        contextWindow: 64000,
        inputPrice: 0.0,
        outputPrice: 2.19,
        supportsImages: false,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "deepseek-r1 model"
      },
      "qwen-vl-max": {
        maxTokens: 30720,
        contextWindow: 32768,
        inputPrice: 3.0,
        outputPrice: 9.0,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "qwen-vl-max model"
      },
      "qwen-vl-max-latest": {
        maxTokens: 129024,
        contextWindow: 131072,
        inputPrice: 3.0,
        outputPrice: 9.0,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "qwen-vl-max-latest model"
      },
      "qwen-vl-plus": {
        maxTokens: 6000,
        contextWindow: 8000,
        inputPrice: 1.5,
        outputPrice: 4.5,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "qwen-vl-plus model"
      },
      "qwen-vl-plus-latest": {
        maxTokens: 129024,
        contextWindow: 131072,
        inputPrice: 1.5,
        outputPrice: 4.5,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "qwen-vl-plus-latest model"
      },
      "qwq-plus-latest": {
        maxTokens: 8192,
        contextWindow: 131071,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "qwq-plus-latest model"
      },
      "qwq-plus": {
        maxTokens: 8192,
        contextWindow: 131071,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "qwq-plus model"
      },
    }
  },

  // DOUBAO MODELS (4 total)
  "doubao": {
    id: "doubao",
    name: "Doubao",
    description: "Doubao AI models",
    category: "api",
    authType: "api_key",
    baseUrl: "https://api.doubao.com/v1",
    tags: ["ai", "language-model"],
    tier: "premium",
    supportsStreaming: true,
    supportsTools: false,
    supportsVision: false,
    supportsReasoning: false,
    supportsPromptCaching: false,
    defaultModel: "doubao-1-5-pro-256k-250115",
    modelCount: 4,
    supportedModels: {
      "doubao-1-5-pro-256k-250115": {
        maxTokens: 12288,
        contextWindow: 256000,
        inputPrice: 0.7,
        outputPrice: 1.3,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "doubao-1-5-pro-256k-250115 model"
      },
      "doubao-1-5-pro-32k-250115": {
        maxTokens: 12288,
        contextWindow: 32000,
        inputPrice: 0.11,
        outputPrice: 0.3,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "doubao-1-5-pro-32k-250115 model"
      },
      "deepseek-v3-250324": {
        maxTokens: 12288,
        contextWindow: 128000,
        inputPrice: 0.55,
        outputPrice: 2.19,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "deepseek-v3-250324 model"
      },
      "deepseek-r1-250120": {
        maxTokens: 32768,
        contextWindow: 64000,
        inputPrice: 0.27,
        outputPrice: 1.09,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "deepseek-r1-250120 model"
      },
    }
  },

  // MISTRAL MODELS (13 total)
  "mistral": {
    id: "mistral",
    name: "Mistral",
    description: "Mistral AI models",
    category: "api",
    authType: "api_key",
    baseUrl: "https://api.mistral.com/v1",
    tags: ["ai", "language-model"],
    tier: "premium",
    supportsStreaming: true,
    supportsTools: false,
    supportsVision: false,
    supportsReasoning: false,
    supportsPromptCaching: false,
    defaultModel: "mistral-large-2411",
    modelCount: 13,
    supportedModels: {
      "mistral-large-2411": {
        maxTokens: 128000,
        contextWindow: 128000,
        inputPrice: 2.0,
        outputPrice: 6.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "mistral-large-2411 model"
      },
      "pixtral-large-2411": {
        maxTokens: 131000,
        contextWindow: 131000,
        inputPrice: 2.0,
        outputPrice: 6.0,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "pixtral-large-2411 model"
      },
      "ministral-3b-2410": {
        maxTokens: 128000,
        contextWindow: 128000,
        inputPrice: 0.04,
        outputPrice: 0.04,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "ministral-3b-2410 model"
      },
      "ministral-8b-2410": {
        maxTokens: 128000,
        contextWindow: 128000,
        inputPrice: 0.1,
        outputPrice: 0.1,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "ministral-8b-2410 model"
      },
      "mistral-small-latest": {
        maxTokens: 128000,
        contextWindow: 128000,
        inputPrice: 0.1,
        outputPrice: 0.3,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "mistral-small-latest model"
      },
      "mistral-medium-latest": {
        maxTokens: 128000,
        contextWindow: 128000,
        inputPrice: 0.4,
        outputPrice: 2.0,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "mistral-medium-latest model"
      },
      "mistral-small-2501": {
        maxTokens: 32000,
        contextWindow: 32000,
        inputPrice: 0.1,
        outputPrice: 0.3,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "mistral-small-2501 model"
      },
      "pixtral-12b-2409": {
        maxTokens: 128000,
        contextWindow: 128000,
        inputPrice: 0.15,
        outputPrice: 0.15,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "pixtral-12b-2409 model"
      },
      "open-mistral-nemo-2407": {
        maxTokens: 128000,
        contextWindow: 128000,
        inputPrice: 0.15,
        outputPrice: 0.15,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "open-mistral-nemo-2407 model"
      },
      "open-codestral-mamba": {
        maxTokens: 256000,
        contextWindow: 256000,
        inputPrice: 0.15,
        outputPrice: 0.15,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "open-codestral-mamba model"
      },
      "codestral-2501": {
        maxTokens: 256000,
        contextWindow: 256000,
        inputPrice: 0.3,
        outputPrice: 0.9,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "codestral-2501 model"
      },
      "devstral-small-2505": {
        maxTokens: 128000,
        contextWindow: 131072,
        inputPrice: 0.1,
        outputPrice: 0.3,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "devstral-small-2505 model"
      },
      "devstral-medium-latest": {
        maxTokens: 128000,
        contextWindow: 131072,
        inputPrice: 0.4,
        outputPrice: 2.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "devstral-medium-latest model"
      },
    }
  },

  // ASKSAGE MODELS (31 total)
  "asksage": {
    id: "asksage",
    name: "Asksage",
    description: "Asksage AI models",
    category: "api",
    authType: "api_key",
    baseUrl: "https://api.asksage.com/v1",
    tags: ["ai", "language-model"],
    tier: "premium",
    supportsStreaming: true,
    supportsTools: false,
    supportsVision: false,
    supportsReasoning: false,
    supportsPromptCaching: false,
    defaultModel: "claude-4-sonnet",
    modelCount: 31,
    supportedModels: {
      "gpt-4o": {
        maxTokens: 4096,
        contextWindow: 128000,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "gpt-4o model"
      },
      "gpt-4o-gov": {
        maxTokens: 4096,
        contextWindow: 128000,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "gpt-4o-gov model"
      },
      "gpt-4.1": {
        maxTokens: 32768,
        contextWindow: 1047576,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "gpt-4.1 model"
      },
      "claude-35-sonnet": {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "claude-35-sonnet model"
      },
      "aws-bedrock-claude-35-sonnet-gov": {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "aws-bedrock-claude-35-sonnet-gov model"
      },
      "claude-37-sonnet": {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "claude-37-sonnet model"
      },
      "claude-4-sonnet": {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "claude-4-sonnet model"
      },
      "claude-4-opus": {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "claude-4-opus model"
      },
      "google-gemini-2.5-pro": {
        maxTokens: 65536,
        contextWindow: 1048576,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "google-gemini-2.5-pro model"
      },
      "deepseek-ai/DeepSeek-V3": {
        maxTokens: 32000,
        contextWindow: 96000,
        inputPrice: 0.5,
        outputPrice: 1.5,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "deepseek-ai/DeepSeek-V3 model"
      },
      "deepseek-ai/DeepSeek-V3-0324-fast": {
        maxTokens: 128000,
        contextWindow: 128000,
        inputPrice: 2.0,
        outputPrice: 6.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "deepseek-ai/DeepSeek-V3-0324-fast model"
      },
      "deepseek-ai/DeepSeek-R1": {
        maxTokens: 32000,
        contextWindow: 96000,
        inputPrice: 0.8,
        outputPrice: 2.4,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "deepseek-ai/DeepSeek-R1 model"
      },
      "deepseek-ai/DeepSeek-R1-fast": {
        maxTokens: 32000,
        contextWindow: 96000,
        inputPrice: 2.0,
        outputPrice: 6.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "deepseek-ai/DeepSeek-R1-fast model"
      },
      "deepseek-ai/DeepSeek-R1-0528": {
        maxTokens: 128000,
        contextWindow: 163840,
        inputPrice: 0.8,
        outputPrice: 2.4,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "deepseek-ai/DeepSeek-R1-0528 model"
      },
      "meta-llama/Llama-3.3-70B-Instruct-fast": {
        maxTokens: 32000,
        contextWindow: 96000,
        inputPrice: 0.25,
        outputPrice: 0.75,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "meta-llama/Llama-3.3-70B-Instruct-fast model"
      },
      "Qwen/Qwen2.5-32B-Instruct-fast": {
        maxTokens: 8192,
        contextWindow: 32768,
        inputPrice: 0.13,
        outputPrice: 0.4,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Qwen/Qwen2.5-32B-Instruct-fast model"
      },
      "Qwen/Qwen2.5-Coder-32B-Instruct-fast": {
        maxTokens: 128000,
        contextWindow: 128000,
        inputPrice: 0.1,
        outputPrice: 0.3,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Qwen/Qwen2.5-Coder-32B-Instruct-fast model"
      },
      "Qwen/Qwen3-4B-fast": {
        maxTokens: 32000,
        contextWindow: 41000,
        inputPrice: 0.08,
        outputPrice: 0.24,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Qwen/Qwen3-4B-fast model"
      },
      "Qwen/Qwen3-30B-A3B-fast": {
        maxTokens: 32000,
        contextWindow: 41000,
        inputPrice: 0.3,
        outputPrice: 0.9,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Qwen/Qwen3-30B-A3B-fast model"
      },
      "Qwen/Qwen3-235B-A22B": {
        maxTokens: 32000,
        contextWindow: 41000,
        inputPrice: 0.2,
        outputPrice: 0.6,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Qwen/Qwen3-235B-A22B model"
      },
      "openai/gpt-oss-120b": {
        maxTokens: 32766,
        contextWindow: 131000,
        inputPrice: 0.15,
        outputPrice: 0.6,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "openai/gpt-oss-120b model"
      },
      "moonshotai/Kimi-K2-Instruct": {
        maxTokens: 16384,
        contextWindow: 131000,
        inputPrice: 0.5,
        outputPrice: 2.4,
        supportsImages: false,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "moonshotai/Kimi-K2-Instruct model"
      },
      "Qwen/Qwen3-Coder-480B-A35B-Instruct": {
        maxTokens: 163800,
        contextWindow: 262000,
        inputPrice: 0.4,
        outputPrice: 1.8,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Qwen/Qwen3-Coder-480B-A35B-Instruct model"
      },
      "openai/gpt-oss-20b": {
        maxTokens: 32766,
        contextWindow: 131000,
        inputPrice: 0.05,
        outputPrice: 0.2,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "openai/gpt-oss-20b model"
      },
      "zai-org/GLM-4.5": {
        maxTokens: 98304,
        contextWindow: 128000,
        inputPrice: 0.6,
        outputPrice: 2.2,
        supportsImages: false,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "zai-org/GLM-4.5 model"
      },
      "zai-org/GLM-4.5-Air": {
        maxTokens: 98304,
        contextWindow: 128000,
        inputPrice: 0.2,
        outputPrice: 1.2,
        supportsImages: false,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "zai-org/GLM-4.5-Air model"
      },
      "deepseek-ai/DeepSeek-R1-0528-fast": {
        maxTokens: 128000,
        contextWindow: 164000,
        inputPrice: 2.0,
        outputPrice: 6.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "deepseek-ai/DeepSeek-R1-0528-fast model"
      },
      "Qwen/Qwen3-235B-A22B-Instruct-2507": {
        maxTokens: 64000,
        contextWindow: 262000,
        inputPrice: 0.2,
        outputPrice: 0.6,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Qwen/Qwen3-235B-A22B-Instruct-2507 model"
      },
      "Qwen/Qwen3-30B-A3B": {
        maxTokens: 32000,
        contextWindow: 41000,
        inputPrice: 0.1,
        outputPrice: 0.3,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Qwen/Qwen3-30B-A3B model"
      },
      "Qwen/Qwen3-32B": {
        maxTokens: 16384,
        contextWindow: 41000,
        inputPrice: 0.1,
        outputPrice: 0.3,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Qwen/Qwen3-32B model"
      },
      "Qwen/Qwen3-32B-fast": {
        maxTokens: 16384,
        contextWindow: 41000,
        inputPrice: 0.2,
        outputPrice: 0.6,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Qwen/Qwen3-32B-fast model"
      },
    }
  },

  // NEBIUS MODELS (22 total)
  "nebius": {
    id: "nebius",
    name: "Nebius",
    description: "Nebius AI models",
    category: "api",
    authType: "api_key",
    baseUrl: "https://api.nebius.com/v1",
    tags: ["ai", "language-model"],
    tier: "premium",
    supportsStreaming: true,
    supportsTools: false,
    supportsVision: false,
    supportsReasoning: false,
    supportsPromptCaching: false,
    defaultModel: "deepseek-ai/DeepSeek-V3",
    modelCount: 22,
    supportedModels: {
      "deepseek-ai/DeepSeek-V3": {
        maxTokens: 32000,
        contextWindow: 96000,
        inputPrice: 0.5,
        outputPrice: 1.5,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "deepseek-ai/DeepSeek-V3 model"
      },
      "deepseek-ai/DeepSeek-V3-0324-fast": {
        maxTokens: 128000,
        contextWindow: 128000,
        inputPrice: 2.0,
        outputPrice: 6.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "deepseek-ai/DeepSeek-V3-0324-fast model"
      },
      "deepseek-ai/DeepSeek-R1": {
        maxTokens: 32000,
        contextWindow: 96000,
        inputPrice: 0.8,
        outputPrice: 2.4,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "deepseek-ai/DeepSeek-R1 model"
      },
      "deepseek-ai/DeepSeek-R1-fast": {
        maxTokens: 32000,
        contextWindow: 96000,
        inputPrice: 2.0,
        outputPrice: 6.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "deepseek-ai/DeepSeek-R1-fast model"
      },
      "deepseek-ai/DeepSeek-R1-0528": {
        maxTokens: 128000,
        contextWindow: 163840,
        inputPrice: 0.8,
        outputPrice: 2.4,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "deepseek-ai/DeepSeek-R1-0528 model"
      },
      "meta-llama/Llama-3.3-70B-Instruct-fast": {
        maxTokens: 32000,
        contextWindow: 96000,
        inputPrice: 0.25,
        outputPrice: 0.75,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "meta-llama/Llama-3.3-70B-Instruct-fast model"
      },
      "Qwen/Qwen2.5-32B-Instruct-fast": {
        maxTokens: 8192,
        contextWindow: 32768,
        inputPrice: 0.13,
        outputPrice: 0.4,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Qwen/Qwen2.5-32B-Instruct-fast model"
      },
      "Qwen/Qwen2.5-Coder-32B-Instruct-fast": {
        maxTokens: 128000,
        contextWindow: 128000,
        inputPrice: 0.1,
        outputPrice: 0.3,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Qwen/Qwen2.5-Coder-32B-Instruct-fast model"
      },
      "Qwen/Qwen3-4B-fast": {
        maxTokens: 32000,
        contextWindow: 41000,
        inputPrice: 0.08,
        outputPrice: 0.24,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Qwen/Qwen3-4B-fast model"
      },
      "Qwen/Qwen3-30B-A3B-fast": {
        maxTokens: 32000,
        contextWindow: 41000,
        inputPrice: 0.3,
        outputPrice: 0.9,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Qwen/Qwen3-30B-A3B-fast model"
      },
      "Qwen/Qwen3-235B-A22B": {
        maxTokens: 32000,
        contextWindow: 41000,
        inputPrice: 0.2,
        outputPrice: 0.6,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Qwen/Qwen3-235B-A22B model"
      },
      "openai/gpt-oss-120b": {
        maxTokens: 32766,
        contextWindow: 131000,
        inputPrice: 0.15,
        outputPrice: 0.6,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "openai/gpt-oss-120b model"
      },
      "moonshotai/Kimi-K2-Instruct": {
        maxTokens: 16384,
        contextWindow: 131000,
        inputPrice: 0.5,
        outputPrice: 2.4,
        supportsImages: false,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "moonshotai/Kimi-K2-Instruct model"
      },
      "Qwen/Qwen3-Coder-480B-A35B-Instruct": {
        maxTokens: 163800,
        contextWindow: 262000,
        inputPrice: 0.4,
        outputPrice: 1.8,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Qwen/Qwen3-Coder-480B-A35B-Instruct model"
      },
      "openai/gpt-oss-20b": {
        maxTokens: 32766,
        contextWindow: 131000,
        inputPrice: 0.05,
        outputPrice: 0.2,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "openai/gpt-oss-20b model"
      },
      "zai-org/GLM-4.5": {
        maxTokens: 98304,
        contextWindow: 128000,
        inputPrice: 0.6,
        outputPrice: 2.2,
        supportsImages: false,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "zai-org/GLM-4.5 model"
      },
      "zai-org/GLM-4.5-Air": {
        maxTokens: 98304,
        contextWindow: 128000,
        inputPrice: 0.2,
        outputPrice: 1.2,
        supportsImages: false,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "zai-org/GLM-4.5-Air model"
      },
      "deepseek-ai/DeepSeek-R1-0528-fast": {
        maxTokens: 128000,
        contextWindow: 164000,
        inputPrice: 2.0,
        outputPrice: 6.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "deepseek-ai/DeepSeek-R1-0528-fast model"
      },
      "Qwen/Qwen3-235B-A22B-Instruct-2507": {
        maxTokens: 64000,
        contextWindow: 262000,
        inputPrice: 0.2,
        outputPrice: 0.6,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Qwen/Qwen3-235B-A22B-Instruct-2507 model"
      },
      "Qwen/Qwen3-30B-A3B": {
        maxTokens: 32000,
        contextWindow: 41000,
        inputPrice: 0.1,
        outputPrice: 0.3,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Qwen/Qwen3-30B-A3B model"
      },
      "Qwen/Qwen3-32B": {
        maxTokens: 16384,
        contextWindow: 41000,
        inputPrice: 0.1,
        outputPrice: 0.3,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Qwen/Qwen3-32B model"
      },
      "Qwen/Qwen3-32B-fast": {
        maxTokens: 16384,
        contextWindow: 41000,
        inputPrice: 0.2,
        outputPrice: 0.6,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Qwen/Qwen3-32B-fast model"
      },
    }
  },

  // XAI MODELS (17 total)
  "xai": {
    id: "xai",
    name: "xAI",
    description: "Grok models with real-time information access",
    category: "api",
    authType: "api_key",
    baseUrl: "https://api.x.ai/v1",
    tags: ["real-time", "reasoning", "current-events"],
    tier: "premium",
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: true,
    supportsPromptCaching: false,
    defaultModel: "grok-4",
    modelCount: 17,
    supportedModels: {
      "grok-4": {
        maxTokens: 8192,
        contextWindow: 262144,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "grok-4 model"
      },
      "grok-3-beta": {
        maxTokens: 8192,
        contextWindow: 131072,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: false,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "X AI's Grok-3 beta model with 131K context window"
      },
      "grok-3-fast-beta": {
        maxTokens: 8192,
        contextWindow: 131072,
        inputPrice: 5.0,
        outputPrice: 25.0,
        supportsImages: false,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "X AI's Grok-3 fast beta model with 131K context window"
      },
      "grok-3-mini-beta": {
        maxTokens: 8192,
        contextWindow: 131072,
        inputPrice: 0.3,
        outputPrice: 0.5,
        supportsImages: false,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "X AI's Grok-3 mini beta model with 131K context window"
      },
      "grok-3-mini-fast-beta": {
        maxTokens: 8192,
        contextWindow: 131072,
        inputPrice: 0.6,
        outputPrice: 4.0,
        supportsImages: false,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "X AI's Grok-3 mini fast beta model with 131K context window"
      },
      "grok-3": {
        maxTokens: 8192,
        contextWindow: 131072,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: false,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "X AI's Grok-3 model with 131K context window"
      },
      "grok-3-fast": {
        maxTokens: 8192,
        contextWindow: 131072,
        inputPrice: 5.0,
        outputPrice: 25.0,
        supportsImages: false,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "X AI's Grok-3 fast model with 131K context window"
      },
      "grok-3-mini": {
        maxTokens: 8192,
        contextWindow: 131072,
        inputPrice: 0.3,
        outputPrice: 0.5,
        supportsImages: false,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "X AI's Grok-3 mini model with 131K context window"
      },
      "grok-3-mini-fast": {
        maxTokens: 8192,
        contextWindow: 131072,
        inputPrice: 0.6,
        outputPrice: 4.0,
        supportsImages: false,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "X AI's Grok-3 mini fast model with 131K context window"
      },
      "grok-2-latest": {
        maxTokens: 8192,
        contextWindow: 131072,
        inputPrice: 2.0,
        outputPrice: 10.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "X AI's Grok-2 model - latest version with 131K context window"
      },
      "grok-2": {
        maxTokens: 8192,
        contextWindow: 131072,
        inputPrice: 2.0,
        outputPrice: 10.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "X AI's Grok-2 model with 131K context window"
      },
      "grok-2-1212": {
        maxTokens: 8192,
        contextWindow: 131072,
        inputPrice: 2.0,
        outputPrice: 10.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "X AI's Grok-2 model (version 1212) with 131K context window"
      },
      "grok-2-vision-latest": {
        maxTokens: 8192,
        contextWindow: 32768,
        inputPrice: 2.0,
        outputPrice: 10.0,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "X AI's Grok-2 Vision model - latest version with image support and 32K context window"
      },
      "grok-2-vision": {
        maxTokens: 8192,
        contextWindow: 32768,
        inputPrice: 2.0,
        outputPrice: 10.0,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "X AI's Grok-2 Vision model with image support and 32K context window"
      },
      "grok-2-vision-1212": {
        maxTokens: 8192,
        contextWindow: 32768,
        inputPrice: 2.0,
        outputPrice: 10.0,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "X AI's Grok-2 Vision model (version 1212) with image support and 32K context window"
      },
      "grok-vision-beta": {
        maxTokens: 8192,
        contextWindow: 8192,
        inputPrice: 5.0,
        outputPrice: 15.0,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "X AI's Grok Vision Beta model with image support and 8K context window"
      },
      "grok-beta": {
        maxTokens: 8192,
        contextWindow: 131072,
        inputPrice: 5.0,
        outputPrice: 15.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "X AI's Grok Beta model (legacy) with 131K context window"
      },
    }
  },

  // SAMBANOVA MODELS (12 total)
  "sambanova": {
    id: "sambanova",
    name: "Sambanova",
    description: "Sambanova AI models",
    category: "api",
    authType: "api_key",
    baseUrl: "https://api.sambanova.com/v1",
    tags: ["ai", "language-model"],
    tier: "premium",
    supportsStreaming: true,
    supportsTools: false,
    supportsVision: false,
    supportsReasoning: false,
    supportsPromptCaching: false,
    defaultModel: "Llama-4-Maverick-17B-128E-Instruct",
    modelCount: 12,
    supportedModels: {
      "Llama-4-Maverick-17B-128E-Instruct": {
        maxTokens: 4096,
        contextWindow: 8000,
        inputPrice: 0.63,
        outputPrice: 1.8,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Llama-4-Maverick-17B-128E-Instruct model"
      },
      "Llama-4-Scout-17B-16E-Instruct": {
        maxTokens: 4096,
        contextWindow: 8000,
        inputPrice: 0.4,
        outputPrice: 0.7,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Llama-4-Scout-17B-16E-Instruct model"
      },
      "Meta-Llama-3.3-70B-Instruct": {
        maxTokens: 4096,
        contextWindow: 128000,
        inputPrice: 0.6,
        outputPrice: 1.2,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Meta-Llama-3.3-70B-Instruct model"
      },
      "DeepSeek-R1-Distill-Llama-70B": {
        maxTokens: 4096,
        contextWindow: 128000,
        inputPrice: 0.7,
        outputPrice: 1.4,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "DeepSeek-R1-Distill-Llama-70B model"
      },
      "DeepSeek-R1": {
        maxTokens: 4096,
        contextWindow: 16000,
        inputPrice: 5.0,
        outputPrice: 7.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "DeepSeek-R1 model"
      },
      "Meta-Llama-3.1-405B-Instruct": {
        maxTokens: 4096,
        contextWindow: 16000,
        inputPrice: 5.0,
        outputPrice: 10.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Meta-Llama-3.1-405B-Instruct model"
      },
      "Meta-Llama-3.1-8B-Instruct": {
        maxTokens: 4096,
        contextWindow: 16000,
        inputPrice: 0.1,
        outputPrice: 0.2,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Meta-Llama-3.1-8B-Instruct model"
      },
      "Meta-Llama-3.2-1B-Instruct": {
        maxTokens: 4096,
        contextWindow: 16000,
        inputPrice: 0.04,
        outputPrice: 0.08,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Meta-Llama-3.2-1B-Instruct model"
      },
      "Meta-Llama-3.2-3B-Instruct": {
        maxTokens: 4096,
        contextWindow: 8000,
        inputPrice: 0.08,
        outputPrice: 0.16,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Meta-Llama-3.2-3B-Instruct model"
      },
      "Qwen3-32B": {
        maxTokens: 4096,
        contextWindow: 16000,
        inputPrice: 0.4,
        outputPrice: 0.8,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Qwen3-32B model"
      },
      "QwQ-32B": {
        maxTokens: 4096,
        contextWindow: 16000,
        inputPrice: 0.5,
        outputPrice: 1.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "QwQ-32B model"
      },
      "DeepSeek-V3-0324": {
        maxTokens: 4096,
        contextWindow: 8000,
        inputPrice: 3.0,
        outputPrice: 4.5,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "DeepSeek-V3-0324 model"
      },
    }
  },

  // CEREBRAS MODELS (7 total)
  "cerebras": {
    id: "cerebras",
    name: "Cerebras",
    description: "Cerebras AI models",
    category: "api",
    authType: "api_key",
    baseUrl: "https://api.cerebras.com/v1",
    tags: ["ai", "language-model"],
    tier: "premium",
    supportsStreaming: true,
    supportsTools: false,
    supportsVision: false,
    supportsReasoning: false,
    supportsPromptCaching: false,
    defaultModel: "gpt-oss-120b",
    modelCount: 7,
    supportedModels: {
      "gpt-oss-120b": {
        maxTokens: 65536,
        contextWindow: 128000,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Intelligent general purpose model with 3,000 tokens/s"
      },
      "qwen-3-coder-480b-free": {
        maxTokens: 40000,
        contextWindow: 64000,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "SOTA coding model with ~2000 tokens/s ($0 free tier)\n\n• Use this if you don't have a Cerebras subscription\n• 64K context window\n• Rate limits: 150K TPM, 1M TPH/TPD, 10 RPM, 100 RPH/RPD\n\nUpgrade for higher limits: [https://cloud.cerebras.ai/?utm=cline](https://cloud.cerebras.ai/?utm=cline)"
      },
      "qwen-3-coder-480b": {
        maxTokens: 40000,
        contextWindow: 128000,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "SOTA coding model with ~2000 tokens/s ($50/$250 paid tiers)\n\n• Use this if you have a Cerebras subscription\n• 131K context window with higher rate limits"
      },
      "qwen-3-235b-a22b-instruct-2507": {
        maxTokens: 64000,
        contextWindow: 64000,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Intelligent model with ~1400 tokens/s"
      },
      "llama-3.3-70b": {
        maxTokens: 64000,
        contextWindow: 64000,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Powerful model with ~2600 tokens/s"
      },
      "qwen-3-32b": {
        maxTokens: 64000,
        contextWindow: 64000,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "SOTA coding performance with ~2500 tokens/s"
      },
      "qwen-3-235b-a22b-thinking-2507": {
        maxTokens: 32000,
        contextWindow: 65000,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "SOTA performance with ~1500 tokens/s"
      },
    }
  },

  // GROQ MODELS (10 total)
  "groq": {
    id: "groq",
    name: "Groq",
    description: "Ultra-fast inference with GroqChip technology",
    category: "api",
    authType: "api_key",
    baseUrl: "https://api.groq.com/openai/v1",
    tags: ["speed", "inference", "llama", "mixtral"],
    tier: "premium",
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: false,
    supportsReasoning: false,
    supportsPromptCaching: false,
    defaultModel: "openai/gpt-oss-120b",
    modelCount: 10,
    supportedModels: {
      "openai/gpt-oss-120b": {
        maxTokens: 32766,
        contextWindow: 131072,
        inputPrice: 0.15,
        outputPrice: 0.75,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "A state-of-the-art 120B open-weight Mixture-of-Experts language model optimized for strong reasoning, tool use, and efficient deployment on large GPUs"
      },
      "openai/gpt-oss-20b": {
        maxTokens: 32766,
        contextWindow: 131072,
        inputPrice: 0.1,
        outputPrice: 0.5,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "A compact 20B open-weight Mixture-of-Experts language model designed for strong reasoning and tool use, ideal for edge devices and local inference."
      },
      "compound-beta": {
        maxTokens: 8192,
        contextWindow: 128000,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Compound model using Llama 4 Scout for core reasoning with Llama 3.3 70B for routing and tool use. Excellent for plan/act workflows."
      },
      "compound-beta-mini": {
        maxTokens: 8192,
        contextWindow: 128000,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Lightweight compound model for faster inference while maintaining tool use capabilities."
      },
      "deepseek-r1-distill-llama-70b": {
        maxTokens: 131072,
        contextWindow: 131072,
        inputPrice: 0.75,
        outputPrice: 0.99,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "DeepSeek R1 reasoning capabilities distilled into Llama 70B architecture. Excellent for complex problem-solving and planning."
      },
      "meta-llama/llama-4-maverick-17b-128e-instruct": {
        maxTokens: 8192,
        contextWindow: 131072,
        inputPrice: 0.2,
        outputPrice: 0.6,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Meta's Llama 4 Maverick 17B model with 128 experts, supports vision and multimodal tasks."
      },
      "meta-llama/llama-4-scout-17b-16e-instruct": {
        maxTokens: 8192,
        contextWindow: 131072,
        inputPrice: 0.11,
        outputPrice: 0.34,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Meta's Llama 4 Scout 17B model with 16 experts, optimized for fast inference and general tasks."
      },
      "llama-3.3-70b-versatile": {
        maxTokens: 32768,
        contextWindow: 131072,
        inputPrice: 0.59,
        outputPrice: 0.79,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Meta's latest Llama 3.3 70B model optimized for versatile use cases with excellent performance and speed."
      },
      "llama-3.1-8b-instant": {
        maxTokens: 131072,
        contextWindow: 131072,
        inputPrice: 0.05,
        outputPrice: 0.08,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Fast and efficient Llama 3.1 8B model optimized for speed, low latency, and reliable tool execution."
      },
      "moonshotai/kimi-k2-instruct": {
        maxTokens: 16384,
        contextWindow: 131072,
        inputPrice: 1.0,
        outputPrice: 3.0,
        supportsImages: false,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "Kimi K2 is Moonshot AI's state-of-the-art Mixture-of-Experts (MoE) language model with 1 trillion total parameters and 32 billion activated parameters."
      },
    }
  },

  // SAPAICORE MODELS (19 total)
  "sapaicore": {
    id: "sapaicore",
    name: "Sapaicore",
    description: "Sapaicore AI models",
    category: "api",
    authType: "api_key",
    baseUrl: "https://api.sapaicore.com/v1",
    tags: ["ai", "language-model"],
    tier: "premium",
    supportsStreaming: true,
    supportsTools: false,
    supportsVision: false,
    supportsReasoning: false,
    supportsPromptCaching: false,
    defaultModel: "anthropic--claude-4-sonnet",
    modelCount: 19,
    supportedModels: {
      "anthropic--claude-4-sonnet": {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "anthropic--claude-4-sonnet model"
      },
      "anthropic--claude-4-opus": {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "anthropic--claude-4-opus model"
      },
      "anthropic--claude-3.7-sonnet": {
        maxTokens: 64000,
        contextWindow: 200000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "anthropic--claude-3.7-sonnet model"
      },
      "anthropic--claude-3.5-sonnet": {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "anthropic--claude-3.5-sonnet model"
      },
      "anthropic--claude-3-sonnet": {
        maxTokens: 4096,
        contextWindow: 200000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "anthropic--claude-3-sonnet model"
      },
      "anthropic--claude-3-haiku": {
        maxTokens: 4096,
        contextWindow: 200000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "anthropic--claude-3-haiku model"
      },
      "anthropic--claude-3-opus": {
        maxTokens: 4096,
        contextWindow: 200000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "anthropic--claude-3-opus model"
      },
      "gemini-2.5-pro": {
        maxTokens: 65536,
        contextWindow: 1048576,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "gemini-2.5-pro model"
      },
      "gemini-2.5-flash": {
        maxTokens: 65536,
        contextWindow: 1048576,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "gemini-2.5-flash model"
      },
      "gpt-4": {
        maxTokens: 4096,
        contextWindow: 200000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "gpt-4 model"
      },
      "gpt-4o": {
        maxTokens: 4096,
        contextWindow: 200000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "gpt-4o model"
      },
      "gpt-4o-mini": {
        maxTokens: 4096,
        contextWindow: 200000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "gpt-4o-mini model"
      },
      "gpt-4.1": {
        maxTokens: 32768,
        contextWindow: 1047576,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "gpt-4.1 model"
      },
      "gpt-4.1-nano": {
        maxTokens: 32768,
        contextWindow: 1047576,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "gpt-4.1-nano model"
      },
      "gpt-5": {
        maxTokens: 128000,
        contextWindow: 272000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "gpt-5 model"
      },
      "gpt-5-nano": {
        maxTokens: 128000,
        contextWindow: 272000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "gpt-5-nano model"
      },
      "gpt-5-mini": {
        maxTokens: 128000,
        contextWindow: 272000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "gpt-5-mini model"
      },
      "o3-mini": {
        maxTokens: 4096,
        contextWindow: 200000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "o3-mini model"
      },
      "o4-mini": {
        maxTokens: 100000,
        contextWindow: 200000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "o4-mini model"
      },
    }
  },

  // MOONSHOT MODELS (4 total)
  "moonshot": {
    id: "moonshot",
    name: "Moonshot",
    description: "Moonshot AI models",
    category: "api",
    authType: "api_key",
    baseUrl: "https://api.moonshot.com/v1",
    tags: ["ai", "language-model"],
    tier: "premium",
    supportsStreaming: true,
    supportsTools: false,
    supportsVision: false,
    supportsReasoning: false,
    supportsPromptCaching: false,
    defaultModel: "kimi-k2-0711-preview",
    modelCount: 4,
    supportedModels: {
      "kimi-k2-0711-preview": {
        maxTokens: 32000,
        contextWindow: 131072,
        inputPrice: 0.6,
        outputPrice: 2.5,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "kimi-k2-0711-preview model"
      },
      "kimi-k2-turbo-preview": {
        maxTokens: 32000,
        contextWindow: 131072,
        inputPrice: 2.4,
        outputPrice: 10.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "kimi-k2-turbo-preview model"
      },
      "moonshot-v1-128k-vision-preview": {
        maxTokens: 32000,
        contextWindow: 131072,
        inputPrice: 2.0,
        outputPrice: 5.0,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "moonshot-v1-128k-vision-preview model"
      },
      "kimi-thinking-preview": {
        maxTokens: 32000,
        contextWindow: 131072,
        inputPrice: 30.0,
        outputPrice: 30.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "kimi-thinking-preview model"
      },
    }
  },

  // HUAWEI-CLOUD-MAAS MODELS (5 total)
  "huawei-cloud-maas": {
    id: "huawei-cloud-maas",
    name: "Huawei-Cloud-Maas",
    description: "Huawei-Cloud-Maas AI models",
    category: "api",
    authType: "api_key",
    baseUrl: "https://api.huawei-cloud-maas.com/v1",
    tags: ["ai", "language-model"],
    tier: "premium",
    supportsStreaming: true,
    supportsTools: false,
    supportsVision: false,
    supportsReasoning: false,
    supportsPromptCaching: false,
    defaultModel: "DeepSeek-V3",
    modelCount: 5,
    supportedModels: {
      "DeepSeek-V3": {
        maxTokens: 16384,
        contextWindow: 64000,
        inputPrice: 0.27,
        outputPrice: 1.1,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "DeepSeek-V3 model"
      },
      "DeepSeek-R1": {
        maxTokens: 16384,
        contextWindow: 64000,
        inputPrice: 0.55,
        outputPrice: 2.2,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "DeepSeek-R1 model"
      },
      "deepseek-r1-250528": {
        maxTokens: 16384,
        contextWindow: 64000,
        inputPrice: 0.55,
        outputPrice: 2.2,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "deepseek-r1-250528 model"
      },
      "qwen3-235b-a22b": {
        maxTokens: 8192,
        contextWindow: 32000,
        inputPrice: 0.27,
        outputPrice: 1.1,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "qwen3-235b-a22b model"
      },
      "qwen3-32b": {
        maxTokens: 8192,
        contextWindow: 32000,
        inputPrice: 0.27,
        outputPrice: 1.1,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "qwen3-32b model"
      },
    }
  },

  // BASETEN MODELS (7 total)
  "baseten": {
    id: "baseten",
    name: "Baseten",
    description: "Baseten AI models",
    category: "api",
    authType: "api_key",
    baseUrl: "https://api.baseten.com/v1",
    tags: ["ai", "language-model"],
    tier: "premium",
    supportsStreaming: true,
    supportsTools: false,
    supportsVision: false,
    supportsReasoning: false,
    supportsPromptCaching: false,
    defaultModel: "deepseek-ai/DeepSeek-R1-0528",
    modelCount: 7,
    supportedModels: {
      "deepseek-ai/DeepSeek-R1-0528": {
        maxTokens: 131072,
        contextWindow: 163840,
        inputPrice: 2.55,
        outputPrice: 5.95,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "DeepSeek R1 0528 - A state-of-the-art 671B-parameter MoE LLM with o1-style reasoning licensed for commercial use."
      },
      "deepseek-ai/DeepSeek-V3-0324": {
        maxTokens: 131072,
        contextWindow: 163840,
        inputPrice: 0.77,
        outputPrice: 0.77,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "DeepSeek V3 0324 - A state-of-the-art 671B-parameter MoE LLM licensed for commercial use."
      },
      "meta-llama/Llama-4-Maverick-17B-128E-Instruct": {
        maxTokens: 8192,
        contextWindow: 131072,
        inputPrice: 0.19,
        outputPrice: 0.72,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Meta's Llama 4 Maverick - A SOTA mixture-of-experts multi-modal LLM with 400 billion total parameters."
      },
      "meta-llama/Llama-4-Scout-17B-16E-Instruct": {
        maxTokens: 8192,
        contextWindow: 131072,
        inputPrice: 0.13,
        outputPrice: 0.5,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Meta's Llama 4 Scout - A SOTA mixture-of-experts multi-modal LLM with 109 billion total parameters."
      },
      "moonshotai/Kimi-K2-Instruct": {
        maxTokens: 131072,
        contextWindow: 131072,
        inputPrice: 0.6,
        outputPrice: 2.5,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Moonshot AI's Kimi K2 - The world's first 1 trillion parameter open source model."
      },
      "Qwen/Qwen3-235B-A22B-Instruct-2507": {
        maxTokens: 163800,
        contextWindow: 163800,
        inputPrice: 0.22,
        outputPrice: 0.8,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Qwen3-235B-A22B-Instruct-2507 is a multilingual, instruction-tuned mixture-of-experts language model based on the Qwen3-235B architecture, with 22B active parameters per forward pass."
      },
      "Qwen/Qwen3-Coder-480B-A35B-Instruct": {
        maxTokens: 163800,
        contextWindow: 163800,
        inputPrice: 1.7,
        outputPrice: 1.7,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Qwen3-Coder-480B-A35B-Instruct is a 480B parameter, instruction-tuned, agentic coding model that excels at function calling, tool use, and long-context reasoning over repositories."
      },
    }
  },

  // ZAI MODELS (2 total)
  "zai": {
    id: "zai",
    name: "Zai",
    description: "Zai AI models",
    category: "api",
    authType: "api_key",
    baseUrl: "https://api.zai.com/v1",
    tags: ["ai", "language-model"],
    tier: "premium",
    supportsStreaming: true,
    supportsTools: false,
    supportsVision: false,
    supportsReasoning: false,
    supportsPromptCaching: false,
    defaultModel: "glm-4.5",
    modelCount: 2,
    supportedModels: {
      "glm-4.5": {
        maxTokens: 98304,
        contextWindow: 131072,
        inputPrice: 0.29,
        outputPrice: 1.14,
        supportsImages: false,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "GLM-4.5 is Zhipu's latest featured model. Its comprehensive capabilities in reasoning, coding, and agent reach the state-of-the-art (SOTA) level among open-source models, with a context length of up to 128k."
      },
      "glm-4.5-air": {
        maxTokens: 98304,
        contextWindow: 128000,
        inputPrice: 0.086,
        outputPrice: 0.57,
        supportsImages: false,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: "GLM-4.5-Air is the lightweight version of GLM-4.5. It balances performance and cost-effectiveness, and can flexibly switch to hybrid thinking models."
      },
    }
  },

  // FIREWORKS MODELS (5 total)
  "fireworks": {
    id: "fireworks",
    name: "Fireworks",
    description: "Fireworks AI models",
    category: "api",
    authType: "api_key",
    baseUrl: "https://api.fireworks.com/v1",
    tags: ["ai", "language-model"],
    tier: "premium",
    supportsStreaming: true,
    supportsTools: false,
    supportsVision: false,
    supportsReasoning: false,
    supportsPromptCaching: false,
    defaultModel: "accounts/fireworks/models/kimi-k2-instruct",
    modelCount: 5,
    supportedModels: {
      "accounts/fireworks/models/kimi-k2-instruct": {
        maxTokens: 16384,
        contextWindow: 128000,
        inputPrice: 0.6,
        outputPrice: 2.5,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Kimi K2 is a state-of-the-art mixture-of-experts (MoE) language model with 32 billion activated parameters and 1 trillion total parameters. Trained with the Muon optimizer, Kimi K2 achieves exceptional performance across frontier knowledge, reasoning, and coding tasks while being meticulously optimized for agentic capabilities."
      },
      "accounts/fireworks/models/qwen3-235b-a22b-instruct-2507": {
        maxTokens: 32768,
        contextWindow: 256000,
        inputPrice: 0.22,
        outputPrice: 0.88,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Latest Qwen3 thinking model, competitive against the best closed source models in Jul 2025."
      },
      "accounts/fireworks/models/qwen3-coder-480b-a35b-instruct": {
        maxTokens: 32768,
        contextWindow: 256000,
        inputPrice: 0.45,
        outputPrice: 1.8,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Qwen3's most agentic code model to date."
      },
      "accounts/fireworks/models/deepseek-r1-0528": {
        maxTokens: 20480,
        contextWindow: 160000,
        inputPrice: 3.0,
        outputPrice: 8.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "05/28 updated checkpoint of Deepseek R1. Its overall performance is now approaching that of leading models, such as O3 and Gemini 2.5 Pro. Compared to the previous version, the upgraded model shows significant improvements in handling complex reasoning tasks, and this version also offers a reduced hallucination rate, enhanced support for function calling, and better experience for vibe coding. Note that fine-tuning for this model is only available through contacting fireworks at https://fireworks.ai/company/contact-us."
      },
      "accounts/fireworks/models/deepseek-v3": {
        maxTokens: 16384,
        contextWindow: 128000,
        inputPrice: 0.9,
        outputPrice: 0.9,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "A strong Mixture-of-Experts (MoE) language model with 671B total parameters with 37B activated for each token from Deepseek. Note that fine-tuning for this model is only available through contacting fireworks at https://fireworks.ai/company/contact-us."
      },
    }
  },

  // QWEN-CODE MODELS (2 total)
  "qwen-code": {
    id: "qwen-code",
    name: "Qwen-Code",
    description: "Qwen-Code AI models",
    category: "api",
    authType: "api_key",
    baseUrl: "https://api.qwen-code.com/v1",
    tags: ["ai", "language-model"],
    tier: "premium",
    supportsStreaming: true,
    supportsTools: false,
    supportsVision: false,
    supportsReasoning: false,
    supportsPromptCaching: false,
    defaultModel: "qwen3-coder-plus",
    modelCount: 2,
    supportedModels: {
      "qwen3-coder-plus": {
        maxTokens: 65536,
        contextWindow: 1000000,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Qwen3 Coder Plus - High-performance coding model with 1M context window for large codebases"
      },
      "qwen3-coder-flash": {
        maxTokens: 65536,
        contextWindow: 1000000,
        inputPrice: 0.0,
        outputPrice: 0.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: "Qwen3 Coder Flash - Fast coding model with 1M context window optimized for speed"
      },
    }
  },

  // OPENROUTER - PLACEHOLDER (no models extracted)
  "openrouter": {
    id: "openrouter",
    name: "Openrouter",
    description: "Openrouter AI models",
    category: "api",
    authType: "api_key",
    baseUrl: "https://api.openrouter.com/v1",
    tags: ["ai", "language-model"],
    tier: "premium",
    supportsStreaming: true,
    supportsTools: false,
    supportsVision: false,
    supportsReasoning: false,
    supportsPromptCaching: false,
    defaultModel: "placeholder",
    modelCount: 0,
    supportedModels: {}
  },

  // OLLAMA - PLACEHOLDER (no models extracted)
  "ollama": {
    id: "ollama",
    name: "Ollama",
    description: "Ollama AI models",
    category: "api",
    authType: "api_key",
    baseUrl: "https://api.ollama.com/v1",
    tags: ["ai", "language-model"],
    tier: "premium",
    supportsStreaming: true,
    supportsTools: false,
    supportsVision: false,
    supportsReasoning: false,
    supportsPromptCaching: false,
    defaultModel: "placeholder",
    modelCount: 0,
    supportedModels: {}
  },

  // LMSTUDIO - PLACEHOLDER (no models extracted)
  "lmstudio": {
    id: "lmstudio",
    name: "Lmstudio",
    description: "Lmstudio AI models",
    category: "api",
    authType: "api_key",
    baseUrl: "https://api.lmstudio.com/v1",
    tags: ["ai", "language-model"],
    tier: "premium",
    supportsStreaming: true,
    supportsTools: false,
    supportsVision: false,
    supportsReasoning: false,
    supportsPromptCaching: false,
    defaultModel: "placeholder",
    modelCount: 0,
    supportedModels: {}
  },

  // OPENAI-NATIVE - PLACEHOLDER (no models extracted)
  "openai-native": {
    id: "openai-native",
    name: "Openai-Native",
    description: "Openai-Native AI models",
    category: "api",
    authType: "api_key",
    baseUrl: "https://api.openai-native.com/v1",
    tags: ["ai", "language-model"],
    tier: "premium",
    supportsStreaming: true,
    supportsTools: false,
    supportsVision: false,
    supportsReasoning: false,
    supportsPromptCaching: false,
    defaultModel: "placeholder",
    modelCount: 0,
    supportedModels: {}
  },

  // REQUESTY - PLACEHOLDER (no models extracted)
  "requesty": {
    id: "requesty",
    name: "Requesty",
    description: "Requesty AI models",
    category: "api",
    authType: "api_key",
    baseUrl: "https://api.requesty.com/v1",
    tags: ["ai", "language-model"],
    tier: "premium",
    supportsStreaming: true,
    supportsTools: false,
    supportsVision: false,
    supportsReasoning: false,
    supportsPromptCaching: false,
    defaultModel: "placeholder",
    modelCount: 0,
    supportedModels: {}
  },

  // TOGETHER - PLACEHOLDER (no models extracted)
  "together": {
    id: "together",
    name: "Together",
    description: "Together AI models",
    category: "api",
    authType: "api_key",
    baseUrl: "https://api.together.com/v1",
    tags: ["ai", "language-model"],
    tier: "premium",
    supportsStreaming: true,
    supportsTools: false,
    supportsVision: false,
    supportsReasoning: false,
    supportsPromptCaching: false,
    defaultModel: "placeholder",
    modelCount: 0,
    supportedModels: {}
  },

  // VSCODE-LM - PLACEHOLDER (no models extracted)
  "vscode-lm": {
    id: "vscode-lm",
    name: "Vscode-Lm",
    description: "Vscode-Lm AI models",
    category: "api",
    authType: "api_key",
    baseUrl: "https://api.vscode-lm.com/v1",
    tags: ["ai", "language-model"],
    tier: "premium",
    supportsStreaming: true,
    supportsTools: false,
    supportsVision: false,
    supportsReasoning: false,
    supportsPromptCaching: false,
    defaultModel: "placeholder",
    modelCount: 0,
    supportedModels: {}
  },

  // CLINE - PLACEHOLDER (no models extracted)
  "cline": {
    id: "cline",
    name: "Cline",
    description: "Cline AI models",
    category: "api",
    authType: "api_key",
    baseUrl: "https://api.cline.com/v1",
    tags: ["ai", "language-model"],
    tier: "premium",
    supportsStreaming: true,
    supportsTools: false,
    supportsVision: false,
    supportsReasoning: false,
    supportsPromptCaching: false,
    defaultModel: "placeholder",
    modelCount: 0,
    supportedModels: {}
  },

  // LITELLM - PLACEHOLDER (no models extracted)
  "litellm": {
    id: "litellm",
    name: "Litellm",
    description: "Litellm AI models",
    category: "api",
    authType: "api_key",
    baseUrl: "https://api.litellm.com/v1",
    tags: ["ai", "language-model"],
    tier: "premium",
    supportsStreaming: true,
    supportsTools: false,
    supportsVision: false,
    supportsReasoning: false,
    supportsPromptCaching: false,
    defaultModel: "placeholder",
    modelCount: 0,
    supportedModels: {}
  },

  // DIFY - PLACEHOLDER (no models extracted)
  "dify": {
    id: "dify",
    name: "Dify",
    description: "Dify AI models",
    category: "api",
    authType: "api_key",
    baseUrl: "https://api.dify.com/v1",
    tags: ["ai", "language-model"],
    tier: "premium",
    supportsStreaming: true,
    supportsTools: false,
    supportsVision: false,
    supportsReasoning: false,
    supportsPromptCaching: false,
    defaultModel: "placeholder",
    modelCount: 0,
    supportedModels: {}
  },

  // VERCEL-AI-GATEWAY - PLACEHOLDER (no models extracted)
  "vercel-ai-gateway": {
    id: "vercel-ai-gateway",
    name: "Vercel-Ai-Gateway",
    description: "Vercel-Ai-Gateway AI models",
    category: "api",
    authType: "api_key",
    baseUrl: "https://api.vercel-ai-gateway.com/v1",
    tags: ["ai", "language-model"],
    tier: "premium",
    supportsStreaming: true,
    supportsTools: false,
    supportsVision: false,
    supportsReasoning: false,
    supportsPromptCaching: false,
    defaultModel: "placeholder",
    modelCount: 0,
    supportedModels: {}
  },
};
