import { modelsDevService } from '../lib/models-dev-integration'
import type { ApiProvider, ProviderConfig, ModelInfo } from '../types/providers'

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

// Get all available models from models.dev database
export async function getAvailableModels(): Promise<ModelsByTier> {
  const modelsByTier: ModelsByTier = {
    cli: [],
    api: [],
    credits: []
  }

  try {
    const providers = await modelsDevService.getProviders()
    
    for (const provider of providers) {
      const providerConfig = await modelsDevService.getLegacyProviderConfig(provider.id)
      if (!providerConfig) continue
      
      const tier = getModelTier(provider.id as ApiProvider)
      
      if (providerConfig.supportedModels) {
        Object.entries(providerConfig.supportedModels).forEach(([modelId, modelInfo]) => {
          const typedModelInfo = modelInfo as ModelInfo
          const availableModel: AvailableModel = {
            id: modelId,
            name: formatModelName(modelId),
            provider: provider.id,
            providerName: providerConfig.name,
            category: providerConfig.category,
            tier,
            price: {
              input: typedModelInfo.inputPrice,
              output: typedModelInfo.outputPrice
            },
            features: {
              supportsImages: typedModelInfo.supportsImages,
              supportsTools: providerConfig.supportsTools,
              supportsStreaming: providerConfig.supportsStreaming,
              supportsReasoning: providerConfig.supportsReasoning
            },
            contextWindow: typedModelInfo.contextWindow,
            maxTokens: typedModelInfo.maxTokens,
            description: typedModelInfo.description,
            enabled: true
          }
          
          modelsByTier[tier].push(availableModel)
        })
      }
    }

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
  } catch (error) {
    console.error('Failed to fetch models from models.dev:', error)
  }

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
export async function getDefaultSelectedModels(): Promise<string[]> {
  const modelsByTier = await getAvailableModels()
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
export async function getAllAvailableModels(): Promise<AvailableModel[]> {
  const modelsByTier = await getAvailableModels()
  return [
    ...modelsByTier.cli,
    ...modelsByTier.api, 
    ...modelsByTier.credits
  ]
}

// Find model by ID
export async function getModelById(modelId: string): Promise<AvailableModel | undefined> {
  const allModels = await getAllAvailableModels()
  return allModels.find(model => model.id === modelId)
}