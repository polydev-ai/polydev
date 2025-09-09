// Client-side models.dev integration that uses API routes
// This is used by client components to avoid Supabase server import issues

export interface ModelsDevProvider {
  id: string
  name: string
  website: string
  company: string
  description: string
  logo?: string
  models: ModelsDevModel[]
}

export interface ModelsDevModel {
  id: string
  name: string
  cost: {
    input: number
    output: number
    cache_read?: number
    cache_write?: number
  }
  reasoning: boolean
  attachment: boolean
  max_tokens: number
  context_length: number
  provider_id: string
  provider_model_id: string
  capabilities?: {
    vision?: boolean
    tools?: boolean
    streaming?: boolean
    reasoning_levels?: number
  }
  metadata?: {
    family?: string
    version?: string
    updated_at?: string
  }
}

export interface ModelMapping {
  friendly_id: string
  display_name: string
  providers: {
    [provider_id: string]: {
      api_model_id: string
      cost: ModelsDevModel['cost']
      capabilities: ModelsDevModel['capabilities']
    }
  }
}

export interface ProviderRegistry {
  id: string
  name: string
  display_name: string
  company: string
  website: string
  logo_url: string
  description: string
  base_url: string
  authentication_method: string
  supports_streaming: boolean
  supports_tools: boolean
  supports_images: boolean
  supports_prompt_cache: boolean
  is_active: boolean
  models_dev_data: any
}

export interface ModelRegistry {
  id: string
  provider_id: string
  name: string
  display_name: string
  friendly_id: string
  provider_model_id: string
  max_tokens: number
  context_length: number
  input_cost_per_million: number
  output_cost_per_million: number
  cache_read_cost_per_million?: number
  cache_write_cost_per_million?: number
  supports_vision: boolean
  supports_tools: boolean
  supports_streaming: boolean
  supports_reasoning: boolean
  reasoning_levels?: number
  model_family: string
  model_version: string
  is_active: boolean
  models_dev_metadata: any
}

class ModelsDevClientService {
  private static instance: ModelsDevClientService

  static getInstance(): ModelsDevClientService {
    if (!ModelsDevClientService.instance) {
      ModelsDevClientService.instance = new ModelsDevClientService()
    }
    return ModelsDevClientService.instance
  }

  async getProviders(): Promise<ProviderRegistry[]> {
    const response = await fetch('/api/models-dev/providers')
    if (!response.ok) {
      throw new Error(`Failed to fetch providers: ${response.status}`)
    }
    const data = await response.json()
    return data.providers || []
  }

  async getModels(providerId?: string): Promise<ModelRegistry[]> {
    const params = new URLSearchParams()
    params.append('models_only', 'true')
    if (providerId) {
      params.append('provider', providerId)
    }
    
    const response = await fetch(`/api/models-dev/providers?${params}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`)
    }
    const data = await response.json()
    return data.models || []
  }

  async getProviderWithModels(providerId: string): Promise<{ provider: ProviderRegistry; models: ModelRegistry[] }> {
    const params = new URLSearchParams()
    params.append('provider', providerId)
    params.append('include_models', 'true')
    
    const response = await fetch(`/api/models-dev/providers?${params}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch provider with models: ${response.status}`)
    }
    const data = await response.json()
    return {
      provider: data.provider,
      models: data.models || []
    }
  }

  async getReasoningModels(): Promise<ModelRegistry[]> {
    const params = new URLSearchParams()
    params.append('models_only', 'true')
    params.append('reasoning', 'true')
    
    const response = await fetch(`/api/models-dev/providers?${params}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch reasoning models: ${response.status}`)
    }
    const data = await response.json()
    return data.models || []
  }

  async getVisionModels(): Promise<ModelRegistry[]> {
    const params = new URLSearchParams()
    params.append('models_only', 'true')
    params.append('vision', 'true')
    
    const response = await fetch(`/api/models-dev/providers?${params}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch vision models: ${response.status}`)
    }
    const data = await response.json()
    return data.models || []
  }

  async searchModels(query: string): Promise<ModelRegistry[]> {
    const params = new URLSearchParams()
    params.append('models_only', 'true')
    params.append('search', query)
    
    const response = await fetch(`/api/models-dev/providers?${params}`)
    if (!response.ok) {
      throw new Error(`Failed to search models: ${response.status}`)
    }
    const data = await response.json()
    return data.models || []
  }

  async getModelMappings(): Promise<ModelMapping[]> {
    const response = await fetch('/api/models-dev/mappings')
    if (!response.ok) {
      throw new Error(`Failed to fetch model mappings: ${response.status}`)
    }
    const data = await response.json()
    return data.mappings || []
  }

  async getModelByFriendlyId(friendlyId: string): Promise<ModelMapping | null> {
    const response = await fetch(`/api/models-dev/mappings?friendly_id=${encodeURIComponent(friendlyId)}`)
    if (!response.ok) {
      return null
    }
    const data = await response.json()
    return data.mapping || null
  }
}

export const modelsDevClientService = ModelsDevClientService.getInstance()

// Helper function for thinking model configuration
export function getThinkingModelDefaults(modelId: string): { thinkingLevel: number } {
  // Default thinking levels for different model families
  const familyDefaults: Record<string, number> = {
    'gpt': 3,
    'claude': 4,
    'gemini': 3,
    'deepseek': 5,
    'grok': 2,
    'qwen': 4
  }

  const lowerModelId = modelId.toLowerCase()
  for (const [family, level] of Object.entries(familyDefaults)) {
    if (lowerModelId.includes(family)) {
      return { thinkingLevel: level }
    }
  }

  return { thinkingLevel: 3 } // Default
}