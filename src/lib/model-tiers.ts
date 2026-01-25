/**
 * Model Tier Classifications for Perspective-Based Quota System
 * Updated with exact provider and model IDs
 */

export interface ModelTierInfo {
  provider: string
  modelId: string
  tier: 'premium' | 'normal' | 'eco'
  displayName: string
  costPer1k: {
    input: number
    output: number
  }
  routingStrategy: 'api_key' | 'unlimited_account' | 'mixed'
}

export const MODEL_TIERS: Record<string, ModelTierInfo> = {
  // Premium Models
  'claude-sonnet-4-20250514': {
    provider: 'anthropic',
    modelId: 'claude-sonnet-4-20250514',
    tier: 'premium',
    displayName: 'Claude Sonnet 4',
    costPer1k: { input: 3.0, output: 15.0 },
    routingStrategy: 'api_key'
  },
  'gemini-2.5-pro': {
    provider: 'google',
    modelId: 'gemini-2.5-pro',
    tier: 'premium',
    displayName: 'Gemini 2.5 Pro',
    costPer1k: { input: 1.25, output: 5.0 },
    routingStrategy: 'api_key'
  },
  'gpt-5': {
    provider: 'openai',
    modelId: 'gpt-5',
    tier: 'premium',
    displayName: 'GPT-5',
    costPer1k: { input: 2.0, output: 8.0 },
    routingStrategy: 'api_key'
  },
  'grok-4': {
    provider: 'xai',
    modelId: 'grok-4',
    tier: 'premium',
    displayName: 'Grok 4',
    costPer1k: { input: 1.5, output: 6.0 },
    routingStrategy: 'api_key'
  },

  // Normal Models
  'claude-3-5-haiku-20241022': {
    provider: 'anthropic',
    modelId: 'claude-3-5-haiku-20241022',
    tier: 'normal',
    displayName: 'Claude Haiku 3.5',
    costPer1k: { input: 0.25, output: 1.25 },
    routingStrategy: 'api_key'
  },
  'gemini-2.5-flash': {
    provider: 'google',
    modelId: 'gemini-2.5-flash',
    tier: 'normal',
    displayName: 'Gemini 2.5 Flash',
    costPer1k: { input: 0.075, output: 0.3 },
    routingStrategy: 'api_key'
  },
  'grok-code-fast-1': {
    provider: 'xai',
    modelId: 'grok-code-fast-1',
    tier: 'normal',
    displayName: 'Grok Code Fast',
    costPer1k: { input: 0.1, output: 0.4 },
    routingStrategy: 'api_key'
  },
  'qwen-3-235b-a22b-instruct-2507': {
    provider: 'cerebras',
    modelId: 'qwen-3-235b-a22b-instruct-2507',
    tier: 'normal',
    displayName: 'Qwen 3 235B Instruct',
    costPer1k: { input: 0.0006, output: 0.0012 }, // $0.60/$1.20 per million tokens
    routingStrategy: 'unlimited_account'
  },
  'glm-4.5': {
    provider: 'zai-coding-plan',
    modelId: 'glm-4.5',
    tier: 'normal',
    displayName: 'GLM-4.5',
    costPer1k: { input: 0.0006, output: 0.0022 }, // $0.6/$2.2 per million tokens
    routingStrategy: 'unlimited_account'
  },

  // Eco Models (New Category)
  'gpt-5-mini': {
    provider: 'openai',
    modelId: 'gpt-5-mini',
    tier: 'eco',
    displayName: 'GPT-5 Mini',
    costPer1k: { input: 0.15, output: 0.6 },
    routingStrategy: 'api_key'
  },
  'gemini-2.5-flash-lite': {
    provider: 'google',
    modelId: 'gemini-2.5-flash-lite',
    tier: 'eco',
    displayName: 'Gemini 2.5 Flash Lite',
    costPer1k: { input: 0.0375, output: 0.15 },
    routingStrategy: 'api_key'
  },
  'gpt-5-nano': {
    provider: 'openai',
    modelId: 'gpt-5-nano',
    tier: 'eco',
    displayName: 'GPT-5 Nano',
    costPer1k: { input: 0.075, output: 0.3 },
    routingStrategy: 'api_key'
  },
  'grok-4-fast-reasoning': {
    provider: 'xai',
    modelId: 'grok-4-fast-reasoning',
    tier: 'eco',
    displayName: 'Grok 4 Fast Reasoning',
    costPer1k: { input: 0.05, output: 0.2 },
    routingStrategy: 'api_key'
  }
}

export const TIER_PERSPECTIVE_COSTS = {
  premium: 1, // 1 perspective per request
  normal: 1,  // 1 perspective per request
  eco: 1      // 1 perspective per request (but cheapest)
}

export const USER_QUOTA_LIMITS = {
  free: {
    messagesPerMonth: 200,
    premiumPerspectives: 10,
    normalPerspectives: 100,
    ecoPerspectives: 500  // More eco perspectives for free users
  },
  plus: {
    messagesPerMonth: null, // unlimited
    premiumPerspectives: 500,
    normalPerspectives: 2000,
    ecoPerspectives: 10000
  },
  pro: {
    messagesPerMonth: null, // unlimited
    premiumPerspectives: 1500,
    normalPerspectives: 6000,
    ecoPerspectives: 30000
  }
}

export function getModelTier(modelId: string): ModelTierInfo | null {
  return MODEL_TIERS[modelId] || null
}

export function getModelsByTier(tier: 'premium' | 'normal' | 'eco'): ModelTierInfo[] {
  return Object.values(MODEL_TIERS).filter(model => model.tier === tier)
}

export function calculatePerspectiveCost(modelId: string, inputTokens: number, outputTokens: number): number {
  const model = getModelTier(modelId)
  if (!model) return 0

  const inputCost = (inputTokens / 1000) * model.costPer1k.input
  const outputCost = (outputTokens / 1000) * model.costPer1k.output

  return inputCost + outputCost
}