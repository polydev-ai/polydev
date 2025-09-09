import { CLINE_PROVIDERS, type ApiProvider, type ProviderConfig, type ModelInfo } from '../types/providers'

export interface AvailableModel {
  id: string
  name: string
  provider: string
  providerName: string
  category: string
  tier: 'cli' | 'api' | 'credits'
  price: {
    input: number
    output: number
  }
  features: {
    supportsImages?: boolean
    supportsTools?: boolean
    supportsStreaming?: boolean
    supportsReasoning?: boolean
  }
  contextWindow: number
  maxTokens: number
  description: string
  enabled: boolean
}

export interface ModelsByTier {
  cli: AvailableModel[]
  api: AvailableModel[]
  credits: AvailableModel[]
}

// Determine model tier based on provider and availability
function getModelTier(providerId: ApiProvider): 'cli' | 'api' | 'credits' {
  // CLI providers (highest priority)
  const cliProviders: ApiProvider[] = ['claude-code', 'cline', 'vscode-lm']
  if (cliProviders.includes(providerId)) {
    return 'cli'
  }
  
  // Premium API providers (medium priority)
  const apiProviders: ApiProvider[] = [
    'anthropic', 'openai', 'gemini', 'mistral', 'bedrock', 'vertex'
  ]
  if (apiProviders.includes(providerId)) {
    return 'api'
  }
  
  // Credit-based or free providers (lowest priority)
  return 'credits'
}

// Get all available models from providers configuration
export function getAvailableModels(): ModelsByTier {
  const modelsByTier: ModelsByTier = {
    cli: [],
    api: [],
    credits: []
  }

  Object.entries(CLINE_PROVIDERS).forEach(([providerId, provider]) => {
    const tier = getModelTier(providerId as ApiProvider)
    
    Object.entries(provider.supportedModels).forEach(([modelId, modelInfo]) => {
      const availableModel: AvailableModel = {
        id: modelId,
        name: formatModelName(modelId),
        provider: providerId,
        providerName: provider.name,
        category: provider.category,
        tier,
        price: {
          input: modelInfo.inputPrice,
          output: modelInfo.outputPrice
        },
        features: {
          supportsImages: modelInfo.supportsImages,
          supportsTools: provider.supportsTools,
          supportsStreaming: provider.supportsStreaming,
          supportsReasoning: provider.supportsReasoning
        },
        contextWindow: modelInfo.contextWindow,
        maxTokens: modelInfo.maxTokens,
        description: modelInfo.description,
        enabled: true
      }
      
      modelsByTier[tier].push(availableModel)
    })
  })

  // Sort models within each tier by popularity/capability
  Object.keys(modelsByTier).forEach(tier => {
    modelsByTier[tier as keyof ModelsByTier].sort((a, b) => {
      // Sort by context window (higher is better) and then by name
      if (a.contextWindow !== b.contextWindow) {
        return b.contextWindow - a.contextWindow
      }
      return a.name.localeCompare(b.name)
    })
  })

  return modelsByTier
}

// Format model ID into a human-readable name
function formatModelName(modelId: string): string {
  return modelId
    .replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim()
}

// Get default selected models (top models from each tier)
export function getDefaultSelectedModels(): string[] {
  const modelsByTier = getAvailableModels()
  const defaults: string[] = []
  
  // Add top CLI model if available
  if (modelsByTier.cli.length > 0) {
    defaults.push(modelsByTier.cli[0].id)
  }
  
  // Add top API model if available
  if (modelsByTier.api.length > 0) {
    defaults.push(modelsByTier.api[0].id)
  }
  
  // If we don't have enough models, add from credits tier
  if (defaults.length < 2 && modelsByTier.credits.length > 0) {
    defaults.push(modelsByTier.credits[0].id)
  }
  
  return defaults
}

// Get all models as a flat list (maintaining tier priority order)
export function getAllAvailableModels(): AvailableModel[] {
  const modelsByTier = getAvailableModels()
  return [
    ...modelsByTier.cli,
    ...modelsByTier.api, 
    ...modelsByTier.credits
  ]
}

// Find model by ID
export function getModelById(modelId: string): AvailableModel | undefined {
  const allModels = getAllAvailableModels()
  return allModels.find(model => model.id === modelId)
}