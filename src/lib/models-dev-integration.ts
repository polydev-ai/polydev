// models.dev Integration System with Supabase MCP
// Provides comprehensive provider data, pricing, and model mapping

import { createClient } from '@/app/utils/supabase/server'

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
  provider_model_id: string // Provider-specific ID for API calls
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
  friendly_id: string // User-facing ID (e.g., "claude-3-5-sonnet")
  display_name: string // User-facing name (e.g., "Claude 3.5 Sonnet")
  providers: {
    [provider_id: string]: {
      api_model_id: string // Provider-specific ID (e.g., "anthropic/claude-3-5-sonnet-20241022")
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

class ModelsDevService {
  private static instance: ModelsDevService
  private supabase: any = null

  static getInstance(): ModelsDevService {
    if (!ModelsDevService.instance) {
      ModelsDevService.instance = new ModelsDevService()
    }
    return ModelsDevService.instance
  }

  private async getSupabaseClient() {
    if (!this.supabase) {
      this.supabase = await createClient()
    }
    return this.supabase
  }

  async syncFromModelsDevAPI(): Promise<void> {
    const supabase = await this.getSupabaseClient()
    
    // Start sync logging
    const { data: syncLog } = await supabase
      .from('models_dev_sync_log')
      .insert({
        sync_type: 'full',
        status: 'started'
      })
      .select()
      .single()

    const syncStartTime = Date.now()

    try {
      console.log('Fetching data from models.dev API...')
      const response = await fetch('https://models.dev/api/v1/models')
      if (!response.ok) {
        throw new Error(`models.dev API error: ${response.status}`)
      }

      const rawData = await response.json()
      const responseSize = JSON.stringify(rawData).length

      console.log(`Received ${Object.keys(rawData).length} models from models.dev`)

      // Transform and sync data
      const { providers, models, mappings } = await this.transformModelsDevData(rawData)
      
      // Sync providers
      await this.syncProviders(supabase, providers)
      console.log(`Synced ${providers.length} providers`)

      // Sync models
      await this.syncModels(supabase, models)
      console.log(`Synced ${models.length} models`)

      // Sync model mappings
      await this.syncModelMappings(supabase, mappings)
      console.log(`Synced ${mappings.length} model mappings`)

      // Update sync log
      const syncDuration = Date.now() - syncStartTime
      await supabase
        .from('models_dev_sync_log')
        .update({
          status: 'completed',
          providers_synced: providers.length,
          models_synced: models.length,
          sync_duration_ms: syncDuration,
          models_dev_response_size: responseSize
        })
        .eq('id', syncLog.id)

      console.log(`models.dev sync completed in ${syncDuration}ms`)
    } catch (error) {
      // Update sync log with error
      await supabase
        .from('models_dev_sync_log')
        .update({
          status: 'failed',
          errors_count: 1,
          error_details: { error: error instanceof Error ? error.message : String(error) },
          sync_duration_ms: Date.now() - syncStartTime
        })
        .eq('id', syncLog.id)

      console.error('models.dev sync failed:', error)
      throw error
    }
  }

  private async transformModelsDevData(rawData: any): Promise<{
    providers: ProviderRegistry[]
    models: ModelRegistry[]
    mappings: ModelMapping[]
  }> {
    const providerMap = new Map<string, ProviderRegistry>()
    const models: ModelRegistry[] = []
    const mappingsMap = new Map<string, ModelMapping>()

    // Process each model from models.dev
    Object.values(rawData).forEach((model: any) => {
      const providerId = this.extractProviderId(model.id)
      const friendlyId = this.createFriendlyId(model.id)

      // Create provider if not exists
      if (!providerMap.has(providerId)) {
        providerMap.set(providerId, {
          id: providerId,
          name: this.formatProviderName(providerId),
          display_name: this.formatProviderName(providerId),
          company: this.getProviderCompany(providerId),
          website: this.getProviderWebsite(providerId),
          logo_url: this.getProviderLogo(providerId),
          description: this.getProviderDescription(providerId),
          base_url: this.getProviderBaseUrl(providerId),
          authentication_method: 'api_key',
          supports_streaming: true,
          supports_tools: true,
          supports_images: model.attachment || false,
          supports_prompt_cache: model.cost?.cache_read != null,
          is_active: true,
          models_dev_data: { last_sync: new Date().toISOString() }
        })
      }

      // Create model entry
      const modelEntry: ModelRegistry = {
        id: model.id,
        provider_id: providerId,
        name: model.name,
        display_name: model.name,
        friendly_id: friendlyId,
        provider_model_id: this.getProviderSpecificId(model.id, providerId),
        max_tokens: model.max_tokens || 4096,
        context_length: model.context_length || 32768,
        input_cost_per_million: model.cost?.input || 0,
        output_cost_per_million: model.cost?.output || 0,
        cache_read_cost_per_million: model.cost?.cache_read || null,
        cache_write_cost_per_million: model.cost?.cache_write || null,
        supports_vision: model.attachment || false,
        supports_tools: true,
        supports_streaming: true,
        supports_reasoning: model.reasoning || false,
        reasoning_levels: model.reasoning ? 5 : undefined,
        model_family: this.extractModelFamily(model.name),
        model_version: this.extractModelVersion(model.name),
        is_active: true,
        models_dev_metadata: {
          original_id: model.id,
          reasoning: model.reasoning,
          attachment: model.attachment,
          last_sync: new Date().toISOString()
        }
      }
      models.push(modelEntry)

      // Create/update model mapping
      if (!mappingsMap.has(friendlyId)) {
        mappingsMap.set(friendlyId, {
          friendly_id: friendlyId,
          display_name: model.name,
          providers: {}
        })
      }

      const mapping = mappingsMap.get(friendlyId)!
      mapping.providers[providerId] = {
        api_model_id: model.id,
        cost: {
          input: model.cost?.input || 0,
          output: model.cost?.output || 0,
          cache_read: model.cost?.cache_read,
          cache_write: model.cost?.cache_write
        },
        capabilities: {
          vision: model.attachment || false,
          tools: true,
          streaming: true,
          reasoning_levels: model.reasoning ? 5 : undefined
        }
      }
    })

    return {
      providers: Array.from(providerMap.values()),
      models,
      mappings: Array.from(mappingsMap.values())
    }
  }

  private async syncProviders(supabase: any, providers: ProviderRegistry[]): Promise<void> {
    for (const provider of providers) {
      await supabase
        .from('providers_registry')
        .upsert({
          ...provider,
          updated_at: new Date().toISOString()
        })
    }
  }

  private async syncModels(supabase: any, models: ModelRegistry[]): Promise<void> {
    // Batch upsert for better performance
    const batchSize = 100
    for (let i = 0; i < models.length; i += batchSize) {
      const batch = models.slice(i, i + batchSize)
      await supabase
        .from('models_registry')
        .upsert(batch.map(model => ({
          ...model,
          updated_at: new Date().toISOString()
        })))
    }
  }

  private async syncModelMappings(supabase: any, mappings: ModelMapping[]): Promise<void> {
    for (const mapping of mappings) {
      await supabase
        .from('model_mappings')
        .upsert({
          friendly_id: mapping.friendly_id,
          display_name: mapping.display_name,
          providers_mapping: mapping.providers,
          updated_at: new Date().toISOString()
        })
    }
  }

  // Public API methods using Supabase
  async getProviders(): Promise<ProviderRegistry[]> {
    const supabase = await this.getSupabaseClient()
    const { data, error } = await supabase
      .from('providers_registry')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) throw error
    return data || []
  }

  async getModels(providerId?: string): Promise<ModelRegistry[]> {
    const supabase = await this.getSupabaseClient()
    let query = supabase
      .from('models_registry')
      .select('*')
      .eq('is_active', true)
    
    if (providerId) {
      query = query.eq('provider_id', providerId)
    }

    const { data, error } = await query.order('name')
    if (error) throw error
    return data || []
  }

  async getModelMappings(): Promise<ModelMapping[]> {
    const supabase = await this.getSupabaseClient()
    const { data, error } = await supabase
      .from('model_mappings')
      .select('*')
      .order('display_name')

    if (error) throw error
    
    return (data || []).map((row: any) => ({
      friendly_id: row.friendly_id,
      display_name: row.display_name,
      providers: row.providers_mapping || {}
    }))
  }

  async getModelByFriendlyId(friendlyId: string): Promise<ModelMapping | null> {
    const supabase = await this.getSupabaseClient()
    const { data, error } = await supabase
      .from('model_mappings')
      .select('*')
      .eq('friendly_id', friendlyId)
      .single()

    if (error || !data) return null

    return {
      friendly_id: data.friendly_id,
      display_name: data.display_name,
      providers: data.providers_mapping || {}
    }
  }

  async getProviderSpecificModelId(friendlyId: string, providerId: string): Promise<string | null> {
    const mapping = await this.getModelByFriendlyId(friendlyId)
    return mapping?.providers[providerId]?.api_model_id || null
  }

  async getFriendlyIdFromProviderModelId(providerModelId: string, providerId?: string): Promise<string | null> {
    const supabase = await this.getSupabaseClient()
    
    // Get all model mappings and search through them
    const { data, error } = await supabase
      .from('model_mappings')
      .select('friendly_id, providers_mapping')

    if (error || !data) return null

    // Search through all mappings to find one that contains this provider model ID
    for (const mapping of data) {
      const providers = mapping.providers_mapping || {}
      
      if (providerId) {
        // If provider is specified, check only that provider
        const providerConfig = providers[providerId]
        if (providerConfig?.api_model_id === providerModelId) {
          return mapping.friendly_id
        }
      } else {
        // If no provider specified, check all providers
        for (const [, providerConfig] of Object.entries(providers)) {
          const config = providerConfig as any
          if (config?.api_model_id === providerModelId) {
            return mapping.friendly_id
          }
        }
      }
    }

    return null
  }

  async getModelPricing(friendlyId: string, providerId: string): Promise<ModelsDevModel['cost'] | null> {
    const mapping = await this.getModelByFriendlyId(friendlyId)
    return mapping?.providers[providerId]?.cost || null
  }

  async getModelLimits(friendlyId: string, providerId: string): Promise<{ maxTokens: number; contextLength: number; pricing?: { input: number; output: number } } | null> {
    const supabase = await this.getSupabaseClient()
    
    // Clean provider ID - extract actual ID from display names like "openai (API)"
    const cleanProviderId = this.extractProviderIdFromDisplayName(providerId)
    
    // First try to get from model_mappings table which has provider-specific pricing
    const { data: mappingArr, error: mappingError } = await supabase
      .from('model_mappings')
      .select('providers_mapping')
      .eq('friendly_id', friendlyId)
      .limit(1)

    const mappingData = Array.isArray(mappingArr) && mappingArr.length > 0 ? mappingArr[0] : null
    if (!mappingError && mappingData && (mappingData as any).providers_mapping && (mappingData as any).providers_mapping[cleanProviderId]) {
      const providerMapping = (mappingData as any).providers_mapping[cleanProviderId]
      const result: { maxTokens: number; contextLength: number; pricing?: { input: number; output: number } } = {
        maxTokens: providerMapping.capabilities?.max_tokens || 4096,
        contextLength: providerMapping.capabilities?.context_length || 32768
      }

      // Add pricing if available (values are USD per 1M tokens)
      if (providerMapping.cost && (providerMapping.cost.input != null) && (providerMapping.cost.output != null)) {
        result.pricing = {
          input: Number(providerMapping.cost.input),
          output: Number(providerMapping.cost.output)
        }
      }

      return result
    }

    // Fallback to models_registry table
    const { data: modelRows, error } = await supabase
      .from('models_registry')
      .select('max_tokens, context_length, input_cost_per_million, output_cost_per_million')
      .eq('friendly_id', friendlyId)
      .eq('provider_id', cleanProviderId)
      .eq('is_active', true)
      .limit(1)

    const data = Array.isArray(modelRows) && modelRows.length > 0 ? modelRows[0] : null
    if (!error && data) {
      const result: { maxTokens: number; contextLength: number; pricing?: { input: number; output: number } } = {
        maxTokens: data.max_tokens || 4096,
        contextLength: data.context_length || 32768
      }
      if ((data.input_cost_per_million != null) && (data.output_cost_per_million != null)) {
        result.pricing = {
          input: Number(data.input_cost_per_million),
          output: Number(data.output_cost_per_million)
        }
      }
      return result
    }

    // Second fallback: if friendlyId looks like a provider-specific ID or alias, try provider_model_id
    const { data: pmRows } = await supabase
      .from('models_registry')
      .select('max_tokens, context_length, input_cost_per_million, output_cost_per_million')
      .eq('provider_model_id', friendlyId)
      .eq('provider_id', cleanProviderId)
      .eq('is_active', true)
      .limit(1)

    const pm = Array.isArray(pmRows) && pmRows.length > 0 ? pmRows[0] : null
    if (pm) {
      const result: { maxTokens: number; contextLength: number; pricing?: { input: number; output: number } } = {
        maxTokens: pm.max_tokens || 4096,
        contextLength: pm.context_length || 32768
      }
      if ((pm.input_cost_per_million != null) && (pm.output_cost_per_million != null)) {
        result.pricing = {
          input: Number(pm.input_cost_per_million),
          output: Number(pm.output_cost_per_million)
        }
      }
      return result
    }

    // Secondary fallback: model_pricing table (per 1K -> per 1M)
    try {
      const { data: mp } = await supabase
        .from('model_pricing')
        .select('input_cost_per_1k, output_cost_per_1k, max_tokens, provider_name, model_name')
        .eq('provider_name', cleanProviderId)
        .ilike('model_name', `%${friendlyId}%`)
        .limit(1)

      if (mp && Array.isArray(mp) && mp.length > 0) {
        const row: any = mp[0]
        const inputPerM = row.input_cost_per_1k != null ? Number(row.input_cost_per_1k) * 1000 : undefined
        const outputPerM = row.output_cost_per_1k != null ? Number(row.output_cost_per_1k) * 1000 : undefined
        if (inputPerM != null && outputPerM != null) {
          return {
            maxTokens: row.max_tokens || 4096,
            contextLength: 32768,
            pricing: {
              input: inputPerM,
              output: outputPerM
            }
          }
        }
      }
    } catch {}

    // Final fallback: try to fetch live data from models.dev if database doesn't have pricing
    // But handle failures gracefully to prevent breaking chat pricing display
    try {
      const resp = await fetch('https://models.dev/api/v1/models', { 
        cache: 'no-store' as any,
        headers: { 'Accept': 'application/json' }
      })
      if (resp.ok) {
        const ct = resp.headers.get('content-type') || ''
        if (!ct.includes('application/json')) {
          console.info('[models.dev] Skipping live pricing fetch; non-JSON content-type:', ct)
          return {
            maxTokens: 4096,
            contextLength: 32768
          }
        }
        let raw
        try {
          raw = await resp.json()
        } catch (jsonError: any) {
          console.info(`[models.dev] Live pricing JSON parse skipped for ${friendlyId}:`, (jsonError && (jsonError as any).message) ? (jsonError as any).message : String(jsonError))
          // Return basic structure without pricing if external API fails
          return {
            maxTokens: 4096,
            contextLength: 32768
            // No pricing - let the chat handle missing pricing gracefully
          }
        }
        
        const list: any[] = Array.isArray(raw) ? raw : Object.values(raw || {})
        const cand = list.find((m: any) => {
          const pid = (m.provider_id || m.provider || '').toLowerCase()
          const mid = (m.id || '').toLowerCase()
          const fid = (m.friendly_id || m.name || '').toLowerCase()
          return (
            (!!pid && pid === cleanProviderId.toLowerCase()) &&
            (
              fid === friendlyId.toLowerCase() ||
              mid.endsWith(`/${friendlyId.toLowerCase()}`) ||
              mid.includes(`/${friendlyId.toLowerCase()}`)
            )
          )
        })
        if (cand && cand.cost && (cand.cost.input != null) && (cand.cost.output != null)) {
          const inputPerMillion = Number(cand.cost.input)
          const outputPerMillion = Number(cand.cost.output)
          return {
            maxTokens: Number(cand.max_tokens) || 4096,
            contextLength: Number(cand.context_length) || 32768,
            pricing: {
              input: inputPerMillion,
              output: outputPerMillion
            }
          }
        }
      }
    } catch (e) {
      console.info('[models.dev] Live pricing fetch skipped:', (e as any)?.message || e)
    }

    // Graceful fallback: return basic limits without pricing to prevent null errors
    console.warn(`[models.dev] No pricing data found for ${friendlyId} with provider ${providerId}`)
    return {
      maxTokens: 4096,
      contextLength: 32768
      // No pricing - chat will show $0.00 but won't crash
    }
  }

  async getModelByProviderSpecificId(providerModelId: string, providerId: string): Promise<ModelRegistry | null> {
    const supabase = await this.getSupabaseClient()
    const { data, error } = await supabase
      .from('models_registry')
      .select('*')
      .eq('provider_model_id', providerModelId)
      .eq('provider_id', providerId)
      .eq('is_active', true)
      .single()

    if (error || !data) return null
    return data
  }

  async getReasoningModels(): Promise<ModelRegistry[]> {
    const supabase = await this.getSupabaseClient()
    const { data, error } = await supabase
      .from('models_registry')
      .select('*')
      .eq('is_active', true)
      .eq('supports_reasoning', true)
      .order('name')

    if (error) throw error
    return data || []
  }

  async getVisionModels(): Promise<ModelRegistry[]> {
    const supabase = await this.getSupabaseClient()
    const { data, error } = await supabase
      .from('models_registry')
      .select('*')
      .eq('is_active', true)
      .eq('supports_vision', true)
      .order('name')

    if (error) throw error
    return data || []
  }

  async searchModels(query: string): Promise<ModelRegistry[]> {
    const supabase = await this.getSupabaseClient()
    const { data, error } = await supabase
      .from('models_registry')
      .select('*')
      .eq('is_active', true)
      .or(`name.ilike.%${query}%,display_name.ilike.%${query}%,friendly_id.ilike.%${query}%`)
      .order('name')

    if (error) throw error
    return data || []
  }

  async getSyncHistory(): Promise<any[]> {
    const supabase = await this.getSupabaseClient()
    const { data, error } = await supabase
      .from('models_dev_sync_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error
    return data || []
  }

  // Utility methods for data transformation
  private extractProviderId(modelId: string): string {
    const parts = modelId.split('/')
    return parts[0] || modelId.split('-')[0] || 'unknown'
  }

  private createFriendlyId(modelId: string): string {
    // Convert provider-specific IDs to friendly IDs
    // e.g., "anthropic/claude-3-5-sonnet-20241022" -> "claude-3-5-sonnet"
    return modelId
      .replace(/^[^\/]+\//, '') // Remove provider prefix
      .replace(/-\d{8}$/, '') // Remove date suffix
      .replace(/-v\d+$/, '') // Remove version suffix
  }

  private getProviderSpecificId(modelId: string, providerId: string): string {
    // For OpenRouter, keep the full path format
    if (providerId === 'openai' || providerId === 'anthropic' || providerId === 'google') {
      return `${providerId}/${modelId.split('/')[1] || modelId}`
    }
    return modelId
  }

  private getProviderBaseUrl(providerId: string): string {
    const baseUrlMap: Record<string, string> = {
      'openai': 'https://api.openai.com/v1',
      'anthropic': 'https://api.anthropic.com/v1',
      'google': 'https://generativelanguage.googleapis.com/v1beta',
      'deepseek': 'https://api.deepseek.com',
      'x-ai': 'https://api.x.ai/v1',
      'mistralai': 'https://api.mistral.ai/v1',
      'cohere': 'https://api.cohere.ai/v1'
    }
    return baseUrlMap[providerId] || 'https://openrouter.ai/api/v1'
  }

  private formatProviderName(providerId: string): string {
    const nameMap: Record<string, string> = {
      'openai': 'OpenAI',
      'anthropic': 'Anthropic',
      'google': 'Google',
      'deepseek': 'DeepSeek',
      'x-ai': 'xAI',
      'mistralai': 'Mistral AI',
      'meta-llama': 'Meta (Llama)',
      'qwen': 'Qwen',
      'microsoft': 'Microsoft',
      'cohere': 'Cohere'
    }
    return nameMap[providerId] || providerId.charAt(0).toUpperCase() + providerId.slice(1)
  }

  private getProviderLogo(providerId: string): string {
    // Return CDN URLs for provider logos
    const logoMap: Record<string, string> = {
      'openai': 'https://models.dev/logos/openai.svg',
      'anthropic': 'https://models.dev/logos/anthropic.svg',
      'google': 'https://models.dev/logos/google.svg',
      'deepseek': 'https://models.dev/logos/deepseek.svg',
      'x-ai': 'https://models.dev/logos/xai.svg',
      'mistralai': 'https://models.dev/logos/mistral.svg',
      'meta-llama': 'https://models.dev/logos/meta.svg',
      'qwen': 'https://models.dev/logos/qwen.svg',
      'microsoft': 'https://models.dev/logos/microsoft.svg',
      'cohere': 'https://models.dev/logos/cohere.svg'
    }
    return logoMap[providerId] || `https://models.dev/logos/${providerId}.svg`
  }

  private getProviderWebsite(providerId: string): string {
    const websiteMap: Record<string, string> = {
      'openai': 'https://openai.com',
      'anthropic': 'https://anthropic.com',
      'google': 'https://cloud.google.com/vertex-ai',
      'deepseek': 'https://deepseek.com',
      'x-ai': 'https://x.ai',
      'mistralai': 'https://mistral.ai',
      'meta-llama': 'https://llama.meta.com',
      'qwen': 'https://qwenlm.github.io',
      'microsoft': 'https://azure.microsoft.com/en-us/products/ai-services',
      'cohere': 'https://cohere.com'
    }
    return websiteMap[providerId] || `https://${providerId}.com`
  }

  private getProviderCompany(providerId: string): string {
    const companyMap: Record<string, string> = {
      'openai': 'OpenAI',
      'anthropic': 'Anthropic',
      'google': 'Google',
      'deepseek': 'DeepSeek',
      'x-ai': 'xAI',
      'mistralai': 'Mistral AI',
      'meta-llama': 'Meta',
      'qwen': 'Alibaba Cloud',
      'microsoft': 'Microsoft',
      'cohere': 'Cohere'
    }
    return companyMap[providerId] || this.formatProviderName(providerId)
  }

  private getProviderDescription(providerId: string): string {
    const descMap: Record<string, string> = {
      'openai': 'Leading AI research company creating GPT models',
      'anthropic': 'AI safety focused company creating Claude models',
      'google': 'Google\'s AI division with Gemini models',
      'deepseek': 'Chinese AI company with strong reasoning models',
      'x-ai': 'Elon Musk\'s AI company with Grok models',
      'mistralai': 'European AI company with open-source focus',
      'meta-llama': 'Meta\'s open-source language models',
      'qwen': 'Alibaba\'s multilingual AI models',
      'microsoft': 'Microsoft\'s Azure AI services',
      'cohere': 'Enterprise-focused NLP and AI platform'
    }
    return descMap[providerId] || `AI models from ${this.formatProviderName(providerId)}`
  }

  private extractModelFamily(name: string): string {
    const lowerName = name.toLowerCase()
    if (lowerName.includes('gpt')) return 'GPT'
    if (lowerName.includes('claude')) return 'Claude'
    if (lowerName.includes('gemini')) return 'Gemini'
    if (lowerName.includes('deepseek')) return 'DeepSeek'
    if (lowerName.includes('grok')) return 'Grok'
    if (lowerName.includes('mistral')) return 'Mistral'
    if (lowerName.includes('llama')) return 'Llama'
    if (lowerName.includes('qwen')) return 'Qwen'
    return 'Other'
  }

  private extractModelVersion(name: string): string {
    const versionMatch = name.match(/v?(\d+(?:\.\d+)*)/i)
    return versionMatch ? versionMatch[1] : '1.0'
  }


  // Backward compatibility methods for existing CLINE_PROVIDERS
  async getLegacyProviderConfig(providerId: string): Promise<any> {
    const supabase = await this.getSupabaseClient()
    const { data: provider, error } = await supabase
      .from('providers_registry')
      .select('*')
      .eq('id', providerId)
      .single()

    if (error) {
      console.warn(`[ModelsDevService] Provider '${providerId}' not found in registry:`, error)
      return null
    }

    if (!provider) return null

    const { data: models } = await supabase
      .from('models_registry')
      .select('*')
      .eq('provider_id', providerId)
      .eq('is_active', true)

    // Convert to legacy CLINE_PROVIDERS format
    const supportedModels: Record<string, any> = {}
    models?.forEach((model: any) => {
      supportedModels[model.friendly_id] = {
        name: model.display_name,
        maxTokens: model.max_tokens,
        contextWindow: model.context_length,
        supportsVision: model.supports_vision,
        supportsTools: model.supports_tools,
        pricing: {
          input: model.input_cost_per_million / 1000000000, // Convert from micro-dollars to per-token
          output: model.output_cost_per_million / 1000000000,
          cacheRead: model.cache_read_cost_per_million ? model.cache_read_cost_per_million / 1000000000 : undefined,
          cacheWrite: model.cache_write_cost_per_million ? model.cache_write_cost_per_million / 1000000000 : undefined
        }
      }
    })

    return {
      name: provider.display_name,
      description: provider.description,
      website: provider.website,
      logo: provider.logo_url,
      supportsStreaming: provider.supports_streaming,
      supportsTools: provider.supports_tools,
      supportsVision: provider.supports_images,
      supportedModels
    }
  }

  // Rich provider data method for models page
  async getRichProviderData(providerId?: string): Promise<any> {
    const supabase = await this.getSupabaseClient()
    
    if (providerId) {
      // Get specific provider with full data
      const { data: provider, error } = await supabase
        .from('providers_registry')
        .select('*')
        .eq('id', providerId)
        .single()

      if (error) {
        console.warn(`[ModelsDevService] Provider '${providerId}' not found in rich data query:`, error)
        return null
      }

      if (!provider) return null

      const { data: models } = await supabase
        .from('models_registry')
        .select('*')
        .eq('provider_id', providerId)
        .eq('is_active', true)
        .order('display_name')

      return {
        id: provider.id,
        name: provider.display_name,
        description: provider.description,
        website: provider.website,
        logo: provider.logo_url,
        baseUrl: provider.base_url,
        supportsStreaming: provider.supports_streaming,
        supportsTools: provider.supports_tools,
        supportsVision: provider.supports_images,
        modelsCount: models?.length || 0,
        models: models?.map((model: any) => ({
          id: model.friendly_id,
          name: model.display_name,
          description: model.description,
          maxTokens: model.max_tokens,
          contextWindow: model.context_length,
          supportsVision: model.supports_vision,
          supportsTools: model.supports_tools,
          pricing: {
            input: model.input_cost_per_million,
            output: model.output_cost_per_million,
            cacheRead: model.cache_read_cost_per_million,
            cacheWrite: model.cache_write_cost_per_million
          }
        })) || []
      }
    } else {
      // Get all providers with rich data
      const { data: providers } = await supabase
        .from('providers_registry')
        .select('*')
        .eq('is_active', true)
        .order('display_name')

      if (!providers) return []

      const richProviders = await Promise.all(
        providers.map(async (provider: any) => {
          const { data: models } = await supabase
            .from('models_registry')
            .select('*')
            .eq('provider_id', provider.id)
            .eq('is_active', true)

          return {
            id: provider.id,
            name: provider.display_name,
            description: provider.description,
            website: provider.website,
            logo: provider.logo_url,
            baseUrl: provider.base_url,
            supportsStreaming: provider.supports_streaming,
            supportsTools: provider.supports_tools,
            supportsVision: provider.supports_images,
            modelsCount: models?.length || 0,
            models: models?.map((model: any) => ({
              id: model.friendly_id,
              name: model.display_name,
              description: model.description,
              maxTokens: model.max_tokens,
              contextWindow: model.context_length,
              supportsVision: model.supports_vision,
              supportsTools: model.supports_tools,
              pricing: {
                input: model.input_cost_per_million,
                output: model.output_cost_per_million,
                cacheRead: model.cache_read_cost_per_million,
                cacheWrite: model.cache_write_cost_per_million
              }
            })) || []
          }
        })
      )

      return richProviders
    }
  }

  /**
   * Extract actual provider ID from display names like "openai (API)"
   */
  private extractProviderIdFromDisplayName(providerId: string): string {
    // Remove common suffixes like " (API)", " (CLI)", " (Credits)"
    const cleaned = providerId
      .replace(/\s*\([^)]*\)$/, '') // Remove anything in parentheses at the end
      .toLowerCase()
      .trim()
    
    // Map common variations to correct provider IDs
    const providerMapping: Record<string, string> = {
      'openai': 'openai',
      'anthropic': 'anthropic', 
      'google': 'google',
      'gemini': 'google',
      'groq': 'groq',
      'xai': 'x-ai',
      'x.ai': 'x-ai',
      'deepseek': 'deepseek',
      'mistral': 'mistral',
      'openrouter': 'openrouter'
    }
    
    return providerMapping[cleaned] || cleaned
  }
}

export const modelsDevService = ModelsDevService.getInstance()

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
