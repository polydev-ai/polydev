/**
 * OpenRouter Integration Library
 * Handles API key provisioning, usage tracking, and credit management
 */

export interface OpenRouterModel {
  id: string
  name: string
  description: string
  context_length: number
  pricing: {
    prompt: string
    completion: string
    request: string
    image: string
    internal_reasoning: string
  }
  architecture: {
    modality: string
    input_modalities: string[]
    output_modalities: string[]
    tokenizer: string
  }
}

export interface UserApiKey {
  hash: string
  name: string
  label: string
  disabled: boolean
  limit: number | null
  usage: number
  created_at: string
  updated_at: string | null
}

export interface UsageActivity {
  date: string
  model: string
  endpoint: string
  provider: string
  usage: number // cost in USD
  requests: number
  prompt_tokens: number
  completion_tokens: number
  reasoning_tokens?: number
}

export interface CreateKeyRequest {
  name: string
  limit?: number
  label?: string
}

export interface ModelUsageEstimate {
  promptCost: number
  completionCost: number
  totalCost: number
  costPer1KTokens: number
}

class OpenRouterClient {
  private organizationKey: string
  private provisioningKey: string
  private baseUrl = 'https://openrouter.ai/api/v1'

  constructor() {
    this.organizationKey = process.env.OPENROUTER_ORG_KEY || ''
    this.provisioningKey = process.env.OPENROUTER_PROVISIONING_KEY || ''
    
    if (!this.organizationKey || !this.provisioningKey) {
      throw new Error('OpenRouter API keys not configured')
    }
  }

  /**
   * Get all available models with pricing information
   */
  async getModels(category?: string): Promise<OpenRouterModel[]> {
    try {
      const url = new URL(`${this.baseUrl}/models`)
      if (category) {
        url.searchParams.set('category', category)
      }

      const response = await fetch(url.toString())
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`)
      }

      const data = await response.json()
      return data.data || []
    } catch (error) {
      console.error('[OpenRouter] Error fetching models:', error)
      throw error
    }
  }

  /**
   * Create a new API key for a user
   */
  async createUserKey(request: CreateKeyRequest): Promise<UserApiKey> {
    try {
      const response = await fetch(`${this.baseUrl}/keys`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.provisioningKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Failed to create key: ${errorData.error?.message || response.statusText}`)
      }

      const data = await response.json()
      return data.data
    } catch (error) {
      console.error('[OpenRouter] Error creating user key:', error)
      throw error
    }
  }

  /**
   * List all provisioned API keys
   */
  async listKeys(): Promise<UserApiKey[]> {
    try {
      const response = await fetch(`${this.baseUrl}/keys`, {
        headers: {
          'Authorization': `Bearer ${this.provisioningKey}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to list keys: ${response.statusText}`)
      }

      const data = await response.json()
      return data.data || []
    } catch (error) {
      console.error('[OpenRouter] Error listing keys:', error)
      throw error
    }
  }

  /**
   * Update an existing API key
   */
  async updateKey(keyHash: string, updates: Partial<CreateKeyRequest>): Promise<UserApiKey> {
    try {
      const response = await fetch(`${this.baseUrl}/keys/${keyHash}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.provisioningKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Failed to update key: ${errorData.error?.message || response.statusText}`)
      }

      const data = await response.json()
      return data.data
    } catch (error) {
      console.error('[OpenRouter] Error updating key:', error)
      throw error
    }
  }

  /**
   * Delete an API key
   */
  async deleteKey(keyHash: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/keys/${keyHash}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.provisioningKey}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to delete key: ${response.statusText}`)
      }
    } catch (error) {
      console.error('[OpenRouter] Error deleting key:', error)
      throw error
    }
  }

  /**
   * Get usage activity data
   */
  async getActivity(): Promise<UsageActivity[]> {
    try {
      const response = await fetch(`${this.baseUrl}/activity`, {
        headers: {
          'Authorization': `Bearer ${this.provisioningKey}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to get activity: ${response.statusText}`)
      }

      const data = await response.json()
      return data.data || []
    } catch (error) {
      console.error('[OpenRouter] Error fetching activity:', error)
      throw error
    }
  }

  /**
   * Make a chat completion request with user tracking
   */
  async createChatCompletion(params: {
    model: string
    messages: any[]
    userId: string
    maxTokens?: number
    temperature?: number
    userApiKey?: string
  }) {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${params.userApiKey || this.organizationKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: params.model,
          messages: params.messages,
          max_tokens: params.maxTokens,
          temperature: params.temperature,
          user: `polydev_user_${params.userId}` // User tracking
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Chat completion failed: ${errorData.error?.message || response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('[OpenRouter] Error in chat completion:', error)
      throw error
    }
  }

  /**
   * Estimate the cost of a request
   */
  async estimateRequestCost(
    modelId: string, 
    promptTokens: number, 
    estimatedCompletionTokens: number = 100
  ): Promise<ModelUsageEstimate> {
    try {
      const models = await this.getModels()
      const model = models.find(m => m.id === modelId)
      
      if (!model) {
        throw new Error(`Model ${modelId} not found`)
      }

      const promptPrice = parseFloat(model.pricing.prompt)
      const completionPrice = parseFloat(model.pricing.completion)
      
      const promptCost = promptTokens * promptPrice
      const completionCost = estimatedCompletionTokens * completionPrice
      const totalCost = promptCost + completionCost
      
      return {
        promptCost,
        completionCost,
        totalCost,
        costPer1KTokens: (promptPrice + completionPrice) * 1000
      }
    } catch (error) {
      console.error('[OpenRouter] Error estimating cost:', error)
      throw error
    }
  }

  /**
   * Get current API key information
   */
  async getCurrentKeyInfo(apiKey?: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/key`, {
        headers: {
          'Authorization': `Bearer ${apiKey || this.organizationKey}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to get key info: ${response.statusText}`)
      }

      const data = await response.json()
      return data.data
    } catch (error) {
      console.error('[OpenRouter] Error getting key info:', error)
      throw error
    }
  }

  /**
   * Get filtered models based on budget and preferences
   */
  async getRecommendedModels(
    maxBudgetPerRequest: number,
    estimatedTokens: number = 1000,
    category?: string
  ): Promise<OpenRouterModel[]> {
    try {
      const models = await this.getModels(category)
      
      return models.filter(model => {
        const estimate = this.calculateModelCost(model, estimatedTokens, estimatedTokens * 0.5)
        return estimate.totalCost <= maxBudgetPerRequest
      }).sort((a, b) => {
        // Sort by cost efficiency (tokens per dollar)
        const aCost = this.calculateModelCost(a, estimatedTokens, estimatedTokens * 0.5).totalCost
        const bCost = this.calculateModelCost(b, estimatedTokens, estimatedTokens * 0.5).totalCost
        return aCost - bCost
      })
    } catch (error) {
      console.error('[OpenRouter] Error getting recommended models:', error)
      throw error
    }
  }

  /**
   * Calculate cost for a specific model
   */
  private calculateModelCost(
    model: OpenRouterModel, 
    promptTokens: number, 
    completionTokens: number
  ): ModelUsageEstimate {
    const promptPrice = parseFloat(model.pricing.prompt)
    const completionPrice = parseFloat(model.pricing.completion)
    
    const promptCost = promptTokens * promptPrice
    const completionCost = completionTokens * completionPrice
    const totalCost = promptCost + completionCost
    
    return {
      promptCost,
      completionCost,
      totalCost,
      costPer1KTokens: (promptPrice + completionPrice) * 1000
    }
  }
}

export default OpenRouterClient