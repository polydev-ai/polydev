/**
 * Model Configuration for Polydev
 * 
 * Simplified credit system: All models cost 1 credit per request
 * Available models: GLM-4.7, Gemini 3 Flash, Grok 4.1 Fast Reasoning, GPT-5 Mini
 */

export interface ModelInfo {
  provider: string
  modelId: string
  displayName: string
  creditCost: number  // Always 1
  costPer1k: {
    input: number
    output: number
  }
  routingStrategy: 'api_key' | 'unlimited_account' | 'mixed'
}

// All available models - each costs 1 credit per request
export const AVAILABLE_MODELS: Record<string, ModelInfo> = {
  'glm-4.7': {
    provider: 'zhipu',
    modelId: 'glm-4.7',
    displayName: 'GLM-4.7',
    creditCost: 1,
    costPer1k: { input: 0.0006, output: 0.0022 },
    routingStrategy: 'unlimited_account'
  },
  'gemini-3-flash': {
    provider: 'google',
    modelId: 'gemini-3-flash',
    displayName: 'Gemini 3 Flash',
    creditCost: 1,
    costPer1k: { input: 0.075, output: 0.3 },
    routingStrategy: 'api_key'
  },
  'grok-4.1-fast-reasoning': {
    provider: 'xai',
    modelId: 'grok-4.1-fast-reasoning',
    displayName: 'Grok 4.1 Fast Reasoning',
    creditCost: 1,
    costPer1k: { input: 0.05, output: 0.2 },
    routingStrategy: 'api_key'
  },
  'gpt-5-mini': {
    provider: 'openai',
    modelId: 'gpt-5-mini',
    displayName: 'GPT-5 Mini',
    creditCost: 1,
    costPer1k: { input: 0.15, output: 0.6 },
    routingStrategy: 'api_key'
  }
}

// Credit cost is always 1 for all models
export const CREDIT_COST_PER_REQUEST = 1

// User quota limits (simplified)
export const USER_QUOTA_LIMITS = {
  free: {
    messagesPerMonth: 200,
    totalCredits: 500  // One-time
  },
  premium: {
    messagesPerMonth: null, // unlimited
    totalCredits: 10000  // Monthly
  }
}

export function getModelInfo(modelId: string): ModelInfo | null {
  return AVAILABLE_MODELS[modelId] || null
}

export function getAllModels(): ModelInfo[] {
  return Object.values(AVAILABLE_MODELS)
}

export function calculateRequestCost(modelId: string, inputTokens: number, outputTokens: number): number {
  const model = getModelInfo(modelId)
  if (!model) return 0

  const inputCost = (inputTokens / 1000) * model.costPer1k.input
  const outputCost = (outputTokens / 1000) * model.costPer1k.output

  return inputCost + outputCost
}

// Legacy exports for backward compatibility
export const MODEL_TIERS = AVAILABLE_MODELS
export const TIER_PERSPECTIVE_COSTS = { default: 1 }

// Legacy type with tier field for backward compatibility
export interface ModelTierInfo extends ModelInfo {
  tier: 'premium' | 'normal' | 'eco'
}

// Legacy function for backward compatibility
// Returns model info with tier='eco' for all models (since all cost 1 credit)
export function getModelTier(modelId: string): ModelTierInfo | null {
  const model = AVAILABLE_MODELS[modelId]
  if (!model) {
    // Return a default for unknown models - all cost 1 credit
    return {
      provider: 'unknown',
      modelId: modelId,
      displayName: modelId,
      creditCost: 1,
      costPer1k: { input: 0.1, output: 0.4 },
      routingStrategy: 'api_key',
      tier: 'eco'  // All models are 'eco' tier (1 credit)
    }
  }
  return { ...model, tier: 'eco' as const }
}

// Legacy function for backward compatibility
export function getModelsByTier(tier: 'premium' | 'normal' | 'eco'): ModelTierInfo[] {
  // All models are now in the same tier (eco = 1 credit)
  return Object.values(AVAILABLE_MODELS).map(m => ({ ...m, tier: 'eco' as const }))
}

// Legacy function for backward compatibility  
export function calculatePerspectiveCost(modelId: string, inputTokens: number, outputTokens: number): number {
  return calculateRequestCost(modelId, inputTokens, outputTokens)
}