import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { apiManager } from '@/lib/api'
import { createHash, randomBytes } from 'crypto'
import { cookies } from 'next/headers'
import { modelsDevService } from '@/lib/models-dev-integration'
import { ResponseValidator } from '@/lib/api/utils/response-validator'

// Generate a title from conversation context using AI
async function generateConversationTitle(userMessage: string, assistantResponse?: string): Promise<string> {
  try {
    // Create a context-aware prompt for title generation
    let prompt = `Generate a concise, descriptive title (4-6 words max) for a conversation that starts with this user message: "${userMessage}"`
    
    if (assistantResponse) {
      prompt = `Generate a concise, descriptive title (4-6 words max) for a conversation that starts with:
User: "${userMessage}"
Assistant: "${assistantResponse.substring(0, 200)}${assistantResponse.length > 200 ? '...' : ''}"

The title should capture the main topic or request. Examples:
- "Python data analysis help"
- "React component debugging"
- "Travel planning for Japan"
- "JavaScript array methods"

Just return the title, nothing else:`
    }

    // Use OpenAI GPT-3.5-turbo for fast, cost-effective title generation
    try {
      if (!process.env.OPENAI_API_KEY) {
        console.warn('OPENAI_API_KEY not set, using fallback title generation')
        throw new Error('OPENAI_API_KEY not configured')
      }
      
      console.log(`[Title Generation] Requesting title for message: "${userMessage.substring(0, 100)}..."`)
      const titleResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 20,
          temperature: 0.7
        })
      })

      if (titleResponse.ok) {
        // Safely parse title generation response
        let titleData
        const contentType = titleResponse.headers.get('content-type') || ''
        if (contentType.includes('application/json')) {
          try {
            titleData = await titleResponse.json()
          } catch (parseError) {
            console.warn(`[Title Generation] Failed to parse OpenAI title response:`, parseError)
            throw new Error('Failed to generate title - invalid response format')
          }
        } else {
          console.warn(`[Title Generation] OpenAI returned non-JSON response with content-type: ${contentType}`)
          throw new Error('Failed to generate title - expected JSON response')
        }
        const generatedTitle = titleData.choices?.[0]?.message?.content?.trim()
        
        if (generatedTitle && generatedTitle.length > 0 && generatedTitle.length <= 60) {
          console.log(`[Title Generation] Generated AI title: "${generatedTitle}"`)
          return generatedTitle
        } else {
          console.warn(`[Title Generation] Invalid title generated: "${generatedTitle}"`)
        }
      } else {
        const errorData = await titleResponse.text()
        console.warn(`[Title Generation] OpenAI API error: ${titleResponse.status} - ${errorData}`)
      }
    } catch (error) {
      console.warn('[Title Generation] Failed to generate AI title:', error)
    }

    // Fallback to improved truncation logic
    const cleaned = userMessage.trim().replace(/\s+/g, ' ')
    
    // If message is short enough, use it directly
    if (cleaned.length <= 50) {
      return cleaned
    }
    
    // Try to find a natural break point (sentence end, comma, etc.)
    const truncated = cleaned.substring(0, 47)
    const lastPunctuation = Math.max(
      truncated.lastIndexOf('.'),
      truncated.lastIndexOf('!'),
      truncated.lastIndexOf('?'),
      truncated.lastIndexOf(',')
    )
    
    if (lastPunctuation > 20) {
      return truncated.substring(0, lastPunctuation + 1)
    }
    
    // Find last complete word
    const lastSpace = truncated.lastIndexOf(' ')
    if (lastSpace > 20) {
      return truncated.substring(0, lastSpace) + '...'
    }
    
    // Fallback: just truncate
    return truncated + '...'
    
  } catch (error) {
    console.error('Error generating conversation title:', error)
    // Final fallback
    return userMessage.length > 50 ? userMessage.substring(0, 47) + '...' : userMessage
  }
}

// Parse usage data from different API response formats
function parseUsageData(response: any): any {
  console.log(`[parseUsageData] Raw response:`, JSON.stringify(response, null, 2))
  
  // Handle Google/Gemini streaming array format - get usage from last chunk
  if (Array.isArray(response) && response.length > 0) {
    console.log(`[parseUsageData] Processing Gemini streaming array with ${response.length} chunks`)
    // Find the last chunk with usage data (most complete usage info)
    for (let i = response.length - 1; i >= 0; i--) {
      const chunk = response[i]
      if (chunk?.usageMetadata) {
        const usage = {
          prompt_tokens: chunk.usageMetadata.promptTokenCount || 0,
          completion_tokens: chunk.usageMetadata.candidatesTokenCount || 0,
          total_tokens: chunk.usageMetadata.totalTokenCount || 0
        }
        console.log(`[parseUsageData] Found Gemini streaming usage in chunk ${i}:`, usage)
        return usage
      }
    }
    
    // If no usage found in any chunk, try to extract from the last chunk's candidates
    const lastChunk = response[response.length - 1]
    if (lastChunk?.candidates?.[0]) {
      const candidate = lastChunk.candidates[0]
      if (candidate.content?.parts) {
        // Estimate tokens based on content length (rough approximation)
        const text = candidate.content.parts.map((p: any) => p.text || '').join('')
        const estimatedTokens = Math.ceil(text.length / 4) // Rough estimate: 4 chars per token
        const usage = {
          prompt_tokens: 0, // Not available in streaming
          completion_tokens: estimatedTokens,
          total_tokens: estimatedTokens
        }
        console.log(`[parseUsageData] Estimated usage from Gemini streaming content:`, usage)
        return usage
      }
    }
  }
  
  // Standard OpenAI format
  if (response.usage) {
    console.log(`[parseUsageData] Found OpenAI usage format:`, response.usage)
    return response.usage
  }
  
  // Gemini format with usage_metadata (snake_case)
  if (response.usage_metadata) {
    const usage = {
      prompt_tokens: response.usage_metadata.prompt_token_count || 0,
      completion_tokens: response.usage_metadata.candidates_token_count || 0,
      total_tokens: response.usage_metadata.total_token_count || 0
    }
    console.log(`[parseUsageData] Found Gemini usage_metadata format:`, usage)
    return usage
  }
  
  // Gemini format with usageMetadata (camelCase)
  if (response.usageMetadata) {
    const usage = {
      prompt_tokens: response.usageMetadata.promptTokenCount || 0,
      completion_tokens: response.usageMetadata.candidatesTokenCount || 0,
      total_tokens: response.usageMetadata.totalTokenCount || 0
    }
    console.log(`[parseUsageData] Found Gemini usageMetadata format:`, usage)
    return usage
  }
  
  // Anthropic Claude format
  if (response.metadata?.usage) {
    const usage = {
      prompt_tokens: response.metadata.usage.input_tokens || 0,
      completion_tokens: response.metadata.usage.output_tokens || 0,
      total_tokens: (response.metadata.usage.input_tokens || 0) + (response.metadata.usage.output_tokens || 0)
    }
    console.log(`[parseUsageData] Found Anthropic format:`, usage)
    return usage
  }
  
  // Try to extract from candidates (Gemini specific) - handle both array and non-array
  if (response.candidates) {
    let candidate = null
    if (Array.isArray(response.candidates)) {
      candidate = response.candidates[0]
    } else {
      candidate = response.candidates
    }
    
    if (candidate && candidate.tokenCount) {
      const usage = {
        prompt_tokens: 0, // Not available in this format
        completion_tokens: candidate.tokenCount || 0,
        total_tokens: candidate.tokenCount || 0
      }
      console.log(`[parseUsageData] Found Gemini candidates tokenCount format:`, usage)
      return usage
    }
  }
  
  console.log(`[parseUsageData] No usage data found in response`)
  // Return null if no usage data found - let caller handle
  return null
}

async function authenticateRequest(request: NextRequest): Promise<{ user: any; preferences: any } | null> {
  const supabase = await createClient()
  
  // Check for MCP API key in Authorization header
  const authorization = request.headers.get('Authorization')
  if (authorization?.startsWith('Bearer pd_')) {
    const apiKey = authorization.replace('Bearer ', '')
    const tokenHash = createHash('sha256').update(apiKey).digest('hex')
    
    // Find user by token hash
    const { data: token, error } = await supabase
      .from('mcp_user_tokens')
      .select('user_id, active, last_used_at')
      .eq('token_hash', tokenHash)
      .eq('active', true)
      .single()
    
    if (error || !token) {
      return null
    }
    
    // Update last_used_at
    await supabase
      .from('mcp_user_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('token_hash', tokenHash)
    
    // Get user preferences - NO HARDCODED DEFAULTS
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', token.user_id)
      .single()
    
    if (!preferences) {
      throw new Error('User preferences not found. Please configure models at https://www.polydev.ai/dashboard/models')
    }
    
    return {
      user: { id: token.user_id },
      preferences
    }
  }
  
  // Check for web session
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return null
  }
  
  const { data: preferences } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single()
  
  if (!preferences) {
    throw new Error('User preferences not found. Please configure models at https://www.polydev.ai/dashboard/models')
  }
  
  return {
    user,
    preferences
  }
}

async function resolveProviderModelId(inputModelId: string, providerId: string): Promise<string> {
  try {
    // Step 1: Check if inputModelId is already a friendly ID by trying direct mapping
    const providerSpecificId = await modelsDevService.getProviderSpecificModelId(inputModelId, providerId)
    if (providerSpecificId) {
      console.log(`Resolved friendly ID ${inputModelId} for ${providerId} to: ${providerSpecificId}`)
      return providerSpecificId
    }
    
    // Step 2: inputModelId might be a provider-specific ID, try reverse mapping to friendly ID first
    console.log(`Direct mapping failed for ${inputModelId}, attempting reverse mapping...`)
    const friendlyId = await modelsDevService.getFriendlyIdFromProviderModelId(inputModelId, providerId)
    
    if (friendlyId) {
      console.log(`Found friendly ID ${friendlyId} for provider model ID ${inputModelId}`)
      // Now get the correct provider-specific ID for the target provider
      const resolvedProviderSpecificId = await modelsDevService.getProviderSpecificModelId(friendlyId, providerId)
      if (resolvedProviderSpecificId) {
        console.log(`Resolved ${friendlyId} for ${providerId} to: ${resolvedProviderSpecificId}`)
        return resolvedProviderSpecificId
      }
    }
    
    // Step 3: Try reverse mapping without provider constraint (broad search)
    console.log(`Provider-specific reverse mapping failed, trying broad reverse mapping...`)
    const broadFriendlyId = await modelsDevService.getFriendlyIdFromProviderModelId(inputModelId)
    if (broadFriendlyId) {
      console.log(`Found friendly ID ${broadFriendlyId} for model ID ${inputModelId} (broad search)`)
      const resolvedProviderSpecificId = await modelsDevService.getProviderSpecificModelId(broadFriendlyId, providerId)
      if (resolvedProviderSpecificId) {
        console.log(`Resolved ${broadFriendlyId} for ${providerId} to: ${resolvedProviderSpecificId}`)
        return resolvedProviderSpecificId
      }
    }
    
    // Fall back to the original model ID if no mapping found
    console.log(`No mapping found for ${inputModelId} with provider ${providerId}, using original ID`)
    return inputModelId
  } catch (error) {
    console.warn(`Error resolving model ID for ${inputModelId} with provider ${providerId}:`, error)
    return inputModelId
  }
}

async function getProviderFromModel(model: string, supabase: any, userId?: string): Promise<string> {
  try {
    // Get all providers that support this model from models_registry
    const { data: modelProviders } = await supabase
      .from('models_registry')
      .select('provider_id')
      .eq('friendly_id', model)
      .eq('is_active', true)
    
    if (!modelProviders || modelProviders.length === 0) {
      console.log(`No providers found for model: ${model} in models_registry`)
      // Fall back to user preferences to determine provider
      if (userId) {
        const { data: userPrefs } = await supabase
          .from('user_preferences')
          .select('model_preferences')
          .eq('user_id', userId)
          .single()
        
        if (userPrefs?.model_preferences) {
          // Find which provider the user has configured this model under
          for (const [providerId, providerConfig] of Object.entries(userPrefs.model_preferences)) {
            const config = providerConfig as any
            if (config?.models?.includes(model)) {
              console.log(`Found model ${model} in user preferences under provider: ${providerId}`)
              return providerId
            }
          }
        }
      }
      
      console.warn(`Model ${model} not found in registry or user preferences, falling back to openai`)
      return 'openai'
    }
    
    // If we have a user ID, check their preferences to determine which provider they want to use for this model
    if (userId) {
      const { data: userPrefs } = await supabase
        .from('user_preferences')
        .select('model_preferences')
        .eq('user_id', userId)
        .single()
      
      if (userPrefs?.model_preferences) {
        // Check each provider in user's preference order to see if they have this model configured
        const modelPrefs = userPrefs.model_preferences
        
        // Sort providers by user's preference order
        const sortedProviders = Object.entries(modelPrefs)
          .sort(([,a], [,b]) => ((a as any)?.order || 999) - ((b as any)?.order || 999))
        
        for (const [providerKey, providerConfig] of sortedProviders) {
          // Check if this provider supports the requested model and user has it in their preferences
          const isProviderInRegistry = modelProviders.some((mp: any) => 
            mp.provider_id === providerKey
          )
          
          if (isProviderInRegistry && (providerConfig as any)?.models?.includes(model)) {
            console.log(`Found user preferred provider for ${model}: ${providerKey}`)
            return providerKey
          }
        }
      }
    }
    
    // If no user preference found, return the first available provider
    const firstProvider = modelProviders[0]
    console.log(`Using first available provider for ${model}: ${firstProvider.provider_id}`)
    return firstProvider.provider_id
  } catch (error) {
    console.warn(`Failed to lookup provider for model ${model}:`, error)
    console.log(`Model ${model} not found in models_registry. Consider checking for similar models or updating the registry.`)
    return 'openai' // Fallback to OpenAI
  }
}

export async function POST(request: NextRequest) {
  // Declare stream outside try block for catch block access
  let stream = false
  
  try {
    const authResult = await authenticateRequest(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { user, preferences } = authResult
    const supabase = await createClient()
    
    // Parse request body - support both OpenAI format and Polydev format  
    const body = await request.json()
    let { messages, model, models, temperature = 0.7, max_tokens = 65536, reasoning_effort } = body
    stream = body.stream || false
    
    // Validate and sanitize messages to prevent transformation errors
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ 
        error: { 
          message: 'Messages must be an array', 
          type: 'invalid_request_error' 
        } 
      }, { status: 400 })
    }
    
    // Ensure each message has proper structure
    messages = messages.filter(msg => msg && typeof msg === 'object' && msg.role && msg.content)
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ 
        error: { 
          message: 'Messages are required', 
          type: 'invalid_request_error' 
        } 
      }, { status: 400 })
    }
    
    // Handle single model (OpenAI format) vs multiple models (Polydev format)
    let targetModels: string[] = []
    
    if (model && typeof model === 'string') {
      // OpenAI format - single model
      targetModels = [model]
    } else if (models && Array.isArray(models) && models.length > 0) {
      // Polydev format - multiple models (no limit)
      targetModels = models
    } else {
      // No model specified - use user's preferred models from dashboard
      if (!preferences.default_model) {
        throw new Error('No model specified and no default model configured. Please set up models at https://www.polydev.ai/dashboard/models')
      }
      targetModels = [preferences.default_model]
    }
    
    // PRIORITY SYSTEM: CLI > API KEYS > OPENROUTER (CREDITS)
    
    // Step 1: Get all CLI configurations
    const { data: cliConfigs } = await supabase
      .from('cli_provider_configurations')
      .select('provider, custom_path, enabled, status')
      .eq('user_id', user.id)
      .eq('enabled', true)
      .eq('status', 'available')
      .in('provider', ['claude_code', 'codex_cli', 'gemini_cli'])
    
    // Step 2: Get ALL API keys (including OpenRouter as a provider)
    const { data: apiKeys } = await supabase
      .from('user_api_keys')
      .select('provider, encrypted_key, api_base, active')
      .eq('user_id', user.id)
      .eq('active', true)
    
    // Step 3: Get model mappings for OpenRouter credits fallback
    const { data: modelMappings } = await supabase
      .from('model_mappings')
      .select('friendly_id, providers_mapping')
      .in('friendly_id', targetModels)
    
    // Step 4: Get user credit balance for OpenRouter credits
    const { data: userCredits } = await supabase
      .from('user_credits')
      .select('balance, promotional_balance')
      .eq('user_id', user.id)
      .single()
    
    const totalCredits = (parseFloat(userCredits?.balance || '0') + parseFloat(userCredits?.promotional_balance || '0'))
    
    // Build provider configuration map with strict priority
    const cliProviderMappings: Record<string, string> = {
      'claude_code': 'anthropic',
      'codex_cli': 'openai'
      // Note: gemini_cli removed as it's not supported by Enhanced Handler Factory
    }
    
    // Build comprehensive provider configuration with separate CLI and API capabilities
    const providerConfigs: Record<string, { cli?: any, api?: any }> = {}
    
    // Process CLI configurations
    ;(cliConfigs || []).forEach(cli => {
      const mappedProvider = cliProviderMappings[cli.provider]
      if (mappedProvider) {
        if (!providerConfigs[mappedProvider]) {
          providerConfigs[mappedProvider] = {}
        }
        providerConfigs[mappedProvider].cli = {
          type: 'cli',
          priority: 1,
          cliProvider: cli.provider,
          customPath: cli.custom_path
        }
      }
    })
    
    // Process API key configurations
    ;(apiKeys || []).forEach(key => {
      if (!providerConfigs[key.provider]) {
        providerConfigs[key.provider] = {}
      }
      providerConfigs[key.provider].api = {
        type: 'api',
        priority: 2,
        apiKey: atob(key.encrypted_key),
        baseUrl: key.api_base
      }
    })
    
    // PRIORITY 3: OpenRouter credits will be handled per-model in the loop below
    
    // Get model mappings for provider selection
    const modelMappingMap = new Map()
    
    for (const modelId of targetModels) {
      // Store model mapping for this model
      const mapping = modelMappings?.find(m => m.friendly_id === modelId)
      if (mapping) {
        modelMappingMap.set(modelId, mapping.providers_mapping)
      }
      
      // Model pricing will be fetched on-demand during cost calculations
    }

    let currentSessionId: string | null = null // For chat history tracking
    
    // Process requests for each model with STRICT PRIORITY: CLI > API > OPENROUTER(CREDITS)
    const responses = await Promise.all(
      targetModels.map(async (modelId: string) => {
        const modelMapping = modelMappingMap.get(modelId)
        
        let selectedProvider: string | null = null
        let selectedConfig: any = null
        let fallbackMethod: 'cli' | 'api' | 'credits' = 'api'
        let actualModelId = modelId
        
        // STEP 1: PRIORITY 1 - CLI Tools (highest priority, ignore preferences)
        const requiredProvider = await getProviderFromModel(modelId, supabase, user.id)
        if (providerConfigs[requiredProvider]?.cli) {
          selectedProvider = requiredProvider
          selectedConfig = providerConfigs[requiredProvider].cli
          fallbackMethod = 'cli'
          // Resolve CLI-specific model ID
          actualModelId = await resolveProviderModelId(modelId, requiredProvider)
        }
        
        // STEP 2: PRIORITY 2 - Direct API Keys (if CLI not available)
        if (!selectedProvider && providerConfigs[requiredProvider]?.api) {
          selectedProvider = requiredProvider
          selectedConfig = providerConfigs[requiredProvider].api
          fallbackMethod = 'api'
          // Resolve API-specific model ID
          actualModelId = await resolveProviderModelId(modelId, requiredProvider)
        }
        
        // STEP 3: Check if user has OpenRouter as API provider for this model
        // Only use OpenRouter if the user's preferred provider IS OpenRouter, not as a fallback
        if (!selectedProvider && requiredProvider === 'openrouter' && providerConfigs['openrouter']?.api) {
          selectedProvider = 'openrouter'
          selectedConfig = providerConfigs['openrouter'].api
          fallbackMethod = 'api'
          // Resolve OpenRouter-specific model ID
          actualModelId = await resolveProviderModelId(modelId, 'openrouter')
        }
        
        // STEP 4: PRIORITY 3 - OpenRouter Credits (lowest priority, last resort)
        if (!selectedProvider && totalCredits > 0) {
          // Use system OpenRouter key for credits and resolve model ID from database
          if (process.env.OPENROUTER_API_KEY) {
            const openrouterModelId = await resolveProviderModelId(modelId, 'openrouter')
            if (openrouterModelId !== modelId) { // Only use credits if we have a mapping
              selectedProvider = 'openrouter'
              selectedConfig = {
                type: 'credits',
                priority: 3,
                apiKey: process.env.OPENROUTER_API_KEY
              }
              actualModelId = openrouterModelId
              fallbackMethod = 'credits'
            }
          }
        }
        
        // Model-specific parameter adjustments
        let adjustedTemperature = temperature
        let adjustedMaxTokens = max_tokens
        
        // GPT-5 only supports temperature=1
        if (modelId === 'gpt-5' || modelId.includes('gpt-5')) {
          adjustedTemperature = 1
        }
        
        // Ensure we have valid parameters
        if (adjustedTemperature < 0 || adjustedTemperature > 2) {
          adjustedTemperature = 0.7
        }
        
        // Get model-specific limits and pricing from models.dev
        let modelSpecificMaxTokens = 65536 // Default fallback
        let modelPricing: { input: number; output: number } | null = null
        let modelData: any = null
        if (selectedProvider) {
          try {
            const { modelsDevService } = await import('@/lib/models-dev-integration')
            // For pricing lookup, use the user's preferred provider (requiredProvider) instead of selectedProvider
            // This ensures we get correct pricing even when falling back to OpenRouter for API calls
            const pricingProvider = requiredProvider || selectedProvider
            const modelLimits = await modelsDevService.getModelLimits(modelId, pricingProvider)
            
            // Also get full model data for reasoning capabilities
            const providers = await modelsDevService.getProviders()
            const provider = providers.find(p => p.id === pricingProvider)
            if (provider) {
              const models = await modelsDevService.getModels(pricingProvider)
              modelData = models?.find(m => m.id === modelId)
            }
            
            if (modelLimits) {
              modelSpecificMaxTokens = modelLimits.maxTokens
              modelPricing = modelLimits.pricing || null
              console.log(`[info] Using model-specific maxTokens for ${modelId} (${selectedProvider}): ${modelSpecificMaxTokens}`)
              if (modelPricing) {
                console.log(`[info] Model pricing for ${modelId}: $${modelPricing.input}/million input, $${modelPricing.output}/million output`)
              }
            } else {
              console.log(`[info] No model limits found for ${modelId} (${pricingProvider}), using default: ${modelSpecificMaxTokens}`)
            }
          } catch (error) {
            console.warn(`[warn] Failed to fetch model limits for ${modelId} (${selectedProvider}):`, error)
          }
        }
        
        // Ensure maxTokens is valid and within model limits
        if (!adjustedMaxTokens || adjustedMaxTokens === Infinity || adjustedMaxTokens < 1) {
          adjustedMaxTokens = Math.min(modelSpecificMaxTokens, 65536)
        } else {
          // Cap at model-specific limit
          adjustedMaxTokens = Math.min(adjustedMaxTokens, modelSpecificMaxTokens)
        }
        
        if (!selectedProvider || !selectedConfig) {
          return {
            model: modelId,
            error: `No provider available for model: ${modelId}. Please configure API keys at https://www.polydev.ai/dashboard/models or ensure you have sufficient credits.`,
            usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
            fallback_method: 'none'
          }
        }
        
        try {
          let response
          
          if (selectedConfig.type === 'cli') {
            // Use CLI provider through existing handler
            const cliProviderMap: Record<string, string> = {
              'claude_code': 'claude-code',
              'codex_cli': 'codex-cli'
              // Note: gemini-cli is not supported by Enhanced Handler Factory
              // When google models are requested with CLI, we'll fall back to API if available
            }
            
            const handlerName = cliProviderMap[selectedConfig.cliProvider]
            if (!handlerName) {
              console.log(`CLI provider ${selectedConfig.cliProvider} not supported, trying API fallback...`)
              throw new Error(`Unsupported CLI provider: ${selectedConfig.cliProvider}`)
            }
            
            // Check if the handler actually exists before using it
            try {
              const handler = apiManager.getHandler(handlerName)
              const messageParams: any = {
                messages: messages.map((msg: any) => ({
                  role: msg.role,
                  content: msg.content
                })),
                model: actualModelId,
                temperature: adjustedTemperature,
                maxTokens: adjustedMaxTokens,
                apiKey: '' // CLI handlers don't use API keys
              }
              
              // Add reasoning effort for reasoning models
              if (modelData?.supports_reasoning && reasoning_effort) {
                messageParams.reasoning_effort = reasoning_effort
              }
              
              response = await handler.createMessage(messageParams)
              
              // Safely parse CLI response
              let responseData
              const contentType = response.headers.get('content-type') || ''
              if (contentType.includes('application/json')) {
                try {
                  responseData = await response.json()
                } catch (parseError) {
                  console.error(`[JSON Parse Error] Failed to parse CLI response from ${handlerName}:`, parseError)
                  throw new Error(`Invalid JSON response from CLI handler ${handlerName}`)
                }
              } else {
                console.error(`[Response Error] CLI handler ${handlerName} returned non-JSON response with content-type: ${contentType}`)
                const textResult = await response.text()
                throw new Error(`Expected JSON response from CLI handler ${handlerName}, got: ${textResult.substring(0, 200)}`)
              }
              
              // Calculate pricing for CLI responses if available
              const usage = parseUsageData(responseData) || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
              let cost = null
              console.log(`[DEBUG CLI Cost] Model: ${modelId}, Usage:`, usage, `ModelPricing:`, modelPricing)
              if (modelPricing && usage.prompt_tokens && usage.completion_tokens) {
                const inputCost = (usage.prompt_tokens / 1000000) * modelPricing.input
                const outputCost = (usage.completion_tokens / 1000000) * modelPricing.output
                cost = {
                  input_cost: Number(inputCost.toFixed(6)),
                  output_cost: Number(outputCost.toFixed(6)),
                  total_cost: Number((inputCost + outputCost).toFixed(6))
                }
                console.log(`[DEBUG CLI Cost] Calculated cost:`, cost)
              } else {
                console.log(`[DEBUG CLI Cost] Cost calculation failed - modelPricing:`, !!modelPricing, `usage tokens:`, usage.prompt_tokens, usage.completion_tokens)
              }
              
              return {
                model: modelId,
                content: responseData.content?.[0]?.text || responseData.choices?.[0]?.message?.content || '',
                usage: usage,
                costInfo: cost,
                provider: `${selectedProvider} (CLI)`,
                fallback_method: fallbackMethod
              }
            } catch (cliError) {
              console.log(`CLI failed for ${modelId}, trying API fallback...`)
              throw cliError
            }
          } else if (selectedConfig.type === 'api') {
            // Use API key provider
            const apiOptions: any = {
              messages: messages.map((msg: any) => ({
                role: msg.role,
                content: msg.content
              })),
              model: actualModelId,
              temperature: adjustedTemperature,
              maxTokens: adjustedMaxTokens,
              stream,
              apiKey: selectedConfig.apiKey
            }
            
            // Add reasoning effort for reasoning models
            if (modelData?.supports_reasoning && reasoning_effort) {
              apiOptions.reasoning_effort = reasoning_effort
            }
            
            // Handle model-specific parameter requirements
            if (modelId === 'gpt-5' || modelId.includes('gpt-5')) {
              // GPT-5 uses max_completion_tokens instead of maxTokens
              apiOptions.max_completion_tokens = adjustedMaxTokens
              delete apiOptions.maxTokens
            }
            
            // Use provider configuration for correct baseUrl property name
            const apiProviderConfig = await apiManager.getProviderConfiguration(selectedProvider)
            if (selectedConfig.baseUrl && apiProviderConfig) {
              // Set the baseUrl using the provider's expected property name
              if (apiProviderConfig.baseUrlProperty) {
                apiOptions[apiProviderConfig.baseUrlProperty] = selectedConfig.baseUrl
              } else {
                // Fallback to common patterns
                switch (selectedProvider) {
                  case 'openai':
                  case 'groq':
                  case 'deepseek':
                  case 'xai':
                    apiOptions.openAiBaseUrl = selectedConfig.baseUrl
                    break
                  case 'anthropic':
                    apiOptions.anthropicBaseUrl = selectedConfig.baseUrl
                    break
                  case 'gemini':
                  case 'google':
                    apiOptions.googleBaseUrl = selectedConfig.baseUrl
                    break
                  default:
                    apiOptions.openAiBaseUrl = selectedConfig.baseUrl
                }
              }
            }
            
            // Make API call through enhanced provider system
            console.log(`[debug] Making API call to ${selectedProvider} with options:`, {
              model: apiOptions.model,
              temperature: apiOptions.temperature,
              maxTokens: apiOptions.maxTokens,
              hasApiKey: !!apiOptions.apiKey,
              baseUrl: apiOptions.googleBaseUrl || 'default'
            })
            
            response = await apiManager.createMessage(selectedProvider, apiOptions)
            
            // Handle streaming vs non-streaming responses
            let result
            const contentType = response.headers.get('content-type') || ''
            
            // For streaming responses, collect chunks and parse them
            if (stream && (contentType.includes('text/event-stream') || contentType.includes('text/plain'))) {
              console.log(`[Streaming] Collecting streaming response from ${selectedProvider}`)
              const textResult = await response.text()
              
              // Parse Server-Sent Events format
              const chunks = textResult.split('\n\n').filter(chunk => chunk.startsWith('data: '))
              let finalContent = ''
              let finalUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
              let finalModel = actualModelId
              
              for (const chunk of chunks) {
                try {
                  const data = chunk.replace('data: ', '').trim()
                  if (data === '[DONE]') break
                  
                  const parsed = JSON.parse(data)
                  
                  // Extract content from streaming chunk
                  if (parsed.choices?.[0]?.delta?.content) {
                    finalContent += parsed.choices[0].delta.content
                  }
                  
                  // Extract usage information (typically in last chunk)
                  if (parsed.usage) {
                    finalUsage = parsed.usage
                  }
                  
                  // Extract model information
                  if (parsed.model) {
                    finalModel = parsed.model
                  }
                } catch (parseError) {
                  console.warn(`[Streaming] Failed to parse streaming chunk: ${chunk}`)
                }
              }
              
              // Create a standard response format
              result = {
                choices: [{
                  message: {
                    content: finalContent,
                    role: 'assistant'
                  },
                  finish_reason: 'stop'
                }],
                usage: finalUsage,
                model: finalModel
              }
            } else if (contentType.includes('application/json')) {
              // Standard JSON response
              try {
                result = await response.json()
              } catch (parseError) {
                console.error(`[JSON Parse Error] Failed to parse ${selectedProvider} response:`, parseError)
                throw new Error(`Invalid JSON response from ${selectedProvider}`)
              }
            } else {
              console.error(`[Response Error] ${selectedProvider} returned non-JSON response with content-type: ${contentType}`)
              const textResult = await response.text()
              throw new Error(`Expected JSON response from ${selectedProvider}, got: ${textResult.substring(0, 200)}`)
            }
            
            console.log(`[debug] ${selectedProvider} API response:`, {
              ok: response.ok,
              status: response.status,
              statusText: response.statusText,
              resultKeys: Object.keys(result || {}),
              error: result.error || null
            })
            
            if (!response.ok) {
              console.error(`[error] ${selectedProvider} API call failed:`, result)
              
              // Check for OpenAI organization verification errors specifically
              const orgCheck = ResponseValidator.checkOrganizationError(result, selectedProvider)
              if (orgCheck.hasError) {
                console.warn(`[OpenAI Organization Error] ${orgCheck.message}`)
                throw new Error(orgCheck.message)
              }
              
              throw new Error(result.error?.message || `${selectedProvider} API call failed with status ${response.status}`)
            }
            
            // Extract content based on provider format
            let content = ''
            if (result.content?.[0]?.text) {
              // Anthropic format
              content = result.content[0].text
            } else if (result.choices?.[0]?.message?.content) {
              // OpenAI format
              content = result.choices[0].message.content
            } else if (result.candidates) {
              // Google Gemini format - handle both array and non-array candidates
              let candidate = null
              if (Array.isArray(result.candidates)) {
                candidate = result.candidates[0]
              } else {
                candidate = result.candidates
              }
              
              if (candidate?.content?.parts) {
                const parts = Array.isArray(candidate.content.parts) ? candidate.content.parts : [candidate.content.parts]
                content = parts[0]?.text || ''
              }
            } else if (typeof result === 'string') {
              // Plain text response
              content = result
            } else {
              console.warn(`[warn] Unknown response format from ${selectedProvider}:`, result)
              content = JSON.stringify(result)
            }
            
            // Calculate pricing if available
            const usage = parseUsageData(result) || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
            let cost = null
            console.log(`[DEBUG API Cost] Model: ${modelId}, Usage:`, usage, `ModelPricing:`, modelPricing)
            if (modelPricing && usage && (usage.prompt_tokens > 0 || usage.completion_tokens > 0)) {
              const inputCost = ((usage.prompt_tokens || 0) / 1000000) * modelPricing.input
              const outputCost = ((usage.completion_tokens || 0) / 1000000) * modelPricing.output
              cost = {
                input_cost: Number(inputCost.toFixed(6)),
                output_cost: Number(outputCost.toFixed(6)),
                total_cost: Number((inputCost + outputCost).toFixed(6))
              }
              console.log(`[DEBUG API Cost] Calculated cost:`, cost)
            } else {
              console.log(`[DEBUG API Cost] Cost calculation failed - modelPricing:`, !!modelPricing, `usage tokens:`, usage?.prompt_tokens || 0, usage?.completion_tokens || 0)
            }

            return {
              model: modelId,
              content: content,
              usage: usage,
              costInfo: cost,
              provider: `${selectedProvider} (API)`,
              fallback_method: fallbackMethod
            }
          } else if (selectedProvider === 'openrouter') {
            // Handle OpenRouter (either as API provider or credits)
            const apiOptions: any = {
              messages: messages.map((msg: any) => ({
                role: msg.role,
                content: msg.content
              })),
              model: actualModelId, // This will be the OpenRouter model ID for credits, or original for API
              temperature: adjustedTemperature,
              maxTokens: adjustedMaxTokens,
              stream,
              apiKey: selectedConfig.apiKey,
              openAiBaseUrl: selectedConfig.baseUrl || 'https://openrouter.ai/api/v1'
            }
            
            // Add reasoning effort for reasoning models if supported
            if (modelData?.supports_reasoning && reasoning_effort) {
              apiOptions.reasoning_effort = reasoning_effort
            }
            
            // Make API call through OpenRouter
            response = await apiManager.createMessage('openai', apiOptions)
            
            // Handle OpenRouter streaming vs non-streaming responses
            let result
            const contentType = response.headers.get('content-type') || ''
            
            // For streaming responses, collect chunks and parse them
            if (stream && (contentType.includes('text/event-stream') || contentType.includes('text/plain'))) {
              console.log(`[Streaming] Collecting streaming response from OpenRouter`)
              const textResult = await response.text()
              
              // Parse Server-Sent Events format
              const chunks = textResult.split('\n\n').filter(chunk => chunk.startsWith('data: '))
              let finalContent = ''
              let finalUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
              let finalModel = actualModelId
              
              for (const chunk of chunks) {
                try {
                  const data = chunk.replace('data: ', '').trim()
                  if (data === '[DONE]') break
                  
                  const parsed = JSON.parse(data)
                  
                  // Extract content from streaming chunk
                  if (parsed.choices?.[0]?.delta?.content) {
                    finalContent += parsed.choices[0].delta.content
                  }
                  
                  // Extract usage information (typically in last chunk)
                  if (parsed.usage) {
                    finalUsage = parsed.usage
                  }
                  
                  // Extract model information
                  if (parsed.model) {
                    finalModel = parsed.model
                  }
                } catch (parseError) {
                  console.warn(`[Streaming] Failed to parse OpenRouter streaming chunk: ${chunk}`)
                }
              }
              
              // Create a standard response format
              result = {
                choices: [{
                  message: {
                    content: finalContent,
                    role: 'assistant'
                  },
                  finish_reason: 'stop'
                }],
                usage: finalUsage,
                model: finalModel
              }
            } else if (contentType.includes('application/json')) {
              // Standard JSON response
              try {
                result = await response.json()
              } catch (parseError) {
                console.error(`[JSON Parse Error] Failed to parse OpenRouter response:`, parseError)
                throw new Error(`Invalid JSON response from OpenRouter`)
              }
            } else {
              console.error(`[Response Error] OpenRouter returned non-JSON response with content-type: ${contentType}`)
              const textResult = await response.text()
              throw new Error(`Expected JSON response from OpenRouter, got: ${textResult.substring(0, 200)}`)
            }
            
            if (!response.ok) {
              throw new Error(result.error?.message || 'OpenRouter API call failed')
            }
            
            // Use previously calculated model pricing (already converted from millicents to dollars)
            const inputCostPerMillion = modelPricing?.input || 1
            
            // If using credits, deduct from balance
            if (selectedConfig.type === 'credits') {
              const usageTokens = result.usage?.total_tokens || 0
              const costEstimate = (usageTokens / 1000000) * inputCostPerMillion
              
              if (costEstimate > 0 && userCredits) {
                await supabase
                  .from('user_credits')
                  .update({ 
                    balance: Math.max(0, parseFloat(userCredits.balance) - costEstimate).toFixed(6)
                  })
                  .eq('user_id', user.id)
              }
            }
            
            // Extract content
            let content = ''
            if (result.content?.[0]?.text) {
              content = result.content[0].text
            } else if (result.choices?.[0]?.message?.content) {
              content = result.choices[0].message.content
            }
            
            const parsedUsage = parseUsageData(result) || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
            
            // Calculate cost information
            let costInfo = null
            if (modelPricing && parsedUsage.prompt_tokens && parsedUsage.completion_tokens) {
              const inputCost = (parsedUsage.prompt_tokens / 1000000) * modelPricing.input
              const outputCost = (parsedUsage.completion_tokens / 1000000) * modelPricing.output
              costInfo = {
                input_cost: inputCost,
                output_cost: outputCost,
                total_cost: inputCost + outputCost
              }
            }
            
            return {
              model: modelId,
              content: content,
              usage: parsedUsage,
              costInfo: costInfo,
              provider: selectedConfig.type === 'credits' ? 'OpenRouter (Credits)' : 'OpenRouter (API)',
              fallback_method: fallbackMethod,
              credits_used: selectedConfig.type === 'credits' ? (parsedUsage.total_tokens || 0) / 1000000 * inputCostPerMillion : undefined
            }
          }
        } catch (error: any) {
          console.error(`Error with ${selectedProvider} for model ${modelId}:`, error)
          
          // Check for API key exhaustion before attempting fallbacks
          const exhaustionCheck = ResponseValidator.checkApiKeyExhaustion(error.message || '', requiredProvider)
          if (exhaustionCheck.isExhausted) {
            console.warn(`[API Key Exhaustion] ${requiredProvider}: ${exhaustionCheck.message}`)
            
            // Skip fallbacks to same provider if it's a permanent issue
            if (exhaustionCheck.isPermanent && fallbackMethod === 'cli') {
              console.log(`Permanent exhaustion detected for ${requiredProvider}, skipping same-provider API fallback`)
              // Will proceed to OpenRouter fallback instead
            }
          }
          
          // FALLBACK LOGIC: If CLI fails, try API keys, then credits
          if (fallbackMethod === 'cli') {
            console.log(`CLI failed for ${modelId}, trying API fallback...`)
            console.log(`Checking if ${requiredProvider} has API key configured...`)
            console.log(`Provider configs for ${requiredProvider}:`, providerConfigs[requiredProvider] || 'NOT FOUND')
            
            // Try API key for the same provider first (unless permanently exhausted)
            if (providerConfigs[requiredProvider]?.api && (!exhaustionCheck.isExhausted || !exhaustionCheck.isPermanent)) {
              console.log(`✅ ${requiredProvider} API key found, attempting API fallback...`)
              try {
                const apiConfig = providerConfigs[requiredProvider].api
                const apiOptions: any = {
                  messages: messages.map((msg: any) => ({
                    role: msg.role,
                    content: msg.content
                  })),
                  model: await resolveProviderModelId(modelId, requiredProvider),
                  temperature: adjustedTemperature,
                  maxTokens: adjustedMaxTokens,
                  stream,
                  apiKey: apiConfig.apiKey
                }
                
                if (modelData?.supports_reasoning && reasoning_effort) {
                  apiOptions.reasoning_effort = reasoning_effort
                }
                
                // Handle model-specific parameter requirements for fallback
                if (modelId === 'gpt-5' || modelId.includes('gpt-5')) {
                  apiOptions.max_completion_tokens = adjustedMaxTokens
                  delete apiOptions.maxTokens
                }
                
                const apiResponse = await apiManager.createMessage(apiConfig.provider || requiredProvider, apiOptions)
                
                // Safely parse fallback API response
                let apiResult
                const contentType = apiResponse.headers.get('content-type') || ''
                if (contentType.includes('application/json')) {
                  try {
                    apiResult = await apiResponse.json()
                  } catch (parseError) {
                    console.error(`[JSON Parse Error] Failed to parse ${requiredProvider} fallback response:`, parseError)
                    throw new Error(`Invalid JSON response from ${requiredProvider} fallback`)
                  }
                } else {
                  console.error(`[Response Error] ${requiredProvider} fallback returned non-JSON response with content-type: ${contentType}`)
                  const textResult = await apiResponse.text()
                  throw new Error(`Expected JSON response from ${requiredProvider} fallback, got: ${textResult.substring(0, 200)}`)
                }
                
                if (apiResponse.ok) {
                  console.log(`API fallback successful for ${modelId} with ${requiredProvider}`)
                  const usage = apiResult.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
                  
                  // Calculate cost information
                  let costInfo = null
                  if (modelPricing && usage.prompt_tokens && usage.completion_tokens) {
                    const inputCost = (usage.prompt_tokens / 1000000) * modelPricing.input
                    const outputCost = (usage.completion_tokens / 1000000) * modelPricing.output
                    costInfo = {
                      input_cost: inputCost,
                      output_cost: outputCost,
                      total_cost: inputCost + outputCost
                    }
                  }
                  
                  return {
                    model: modelId,
                    content: apiResult.choices?.[0]?.message?.content || apiResult.content?.[0]?.text || '',
                    usage: usage,
                    costInfo: costInfo,
                    provider: `${requiredProvider} (API - CLI Fallback)`,
                    fallback_method: 'api'
                  }
                }
              } catch (apiError: any) {
                console.error(`API fallback also failed for ${modelId}:`, apiError)
                
                // Check for API key exhaustion in API fallback
                const apiExhaustionCheck = ResponseValidator.checkApiKeyExhaustion(apiError.message || '', requiredProvider)
                if (apiExhaustionCheck.isExhausted) {
                  console.warn(`[API Key Exhaustion] ${requiredProvider} API: ${apiExhaustionCheck.message}`)
                }
                
                // Check for OpenAI organization verification errors in API fallback
                const orgCheck = ResponseValidator.checkOrganizationError(apiError, requiredProvider)
                if (orgCheck.hasError) {
                  console.warn(`[OpenAI Organization Error - API Fallback] ${orgCheck.message}`)
                }
              }
            } else if (exhaustionCheck.isExhausted && exhaustionCheck.isPermanent) {
              console.log(`❌ ${requiredProvider} permanently exhausted, skipping API fallback for this provider`)
            } else {
              console.log(`❌ No ${requiredProvider} API key configured, skipping API fallback for this provider`)
            }
            
            // Try OpenRouter API key fallback
            console.log(`Checking if OpenRouter API key is available for fallback...`)
            if (providerConfigs['openrouter']?.api) {
              console.log(`✅ OpenRouter API key found, attempting OpenRouter API fallback...`)
              try {
                const openrouterModelId = await resolveProviderModelId(modelId, 'openrouter')
                const apiOptions: any = {
                  messages: messages.map((msg: any) => ({
                    role: msg.role,
                    content: msg.content
                  })),
                  model: openrouterModelId,
                  temperature: adjustedTemperature,
                  maxTokens: adjustedMaxTokens,
                  stream,
                  apiKey: providerConfigs['openrouter'].api.apiKey
                }
                
                const apiResponse = await apiManager.createMessage('openrouter', apiOptions)
                
                // Safely parse OpenRouter API fallback response
                let apiResult
                const contentType = apiResponse.headers.get('content-type') || ''
                if (contentType.includes('application/json')) {
                  try {
                    apiResult = await apiResponse.json()
                  } catch (parseError) {
                    console.error(`[JSON Parse Error] Failed to parse OpenRouter API fallback response:`, parseError)
                    throw new Error(`Invalid JSON response from OpenRouter API fallback`)
                  }
                } else {
                  console.error(`[Response Error] OpenRouter API fallback returned non-JSON response with content-type: ${contentType}`)
                  const textResult = await apiResponse.text()
                  throw new Error(`Expected JSON response from OpenRouter API fallback, got: ${textResult.substring(0, 200)}`)
                }
                
                if (apiResponse.ok) {
                  console.log(`OpenRouter API fallback successful for ${modelId}`)
                  return {
                    model: modelId,
                    content: apiResult.choices?.[0]?.message?.content || '',
                    usage: apiResult.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
                    provider: 'OpenRouter (API - CLI Fallback)',
                    fallback_method: 'api'
                  }
                }
              } catch (openrouterError: any) {
                console.error(`OpenRouter API fallback also failed for ${modelId}:`, openrouterError)
                
                // Check for API key exhaustion in OpenRouter API fallback
                const openrouterExhaustionCheck = ResponseValidator.checkApiKeyExhaustion(openrouterError.message || '', 'openrouter')
                if (openrouterExhaustionCheck.isExhausted) {
                  console.warn(`[API Key Exhaustion] OpenRouter API: ${openrouterExhaustionCheck.message}`)
                }
              }
            } else {
              console.log(`❌ No OpenRouter API key configured, will try OpenRouter credits fallback`)
            }
          }
          
          console.log(`🔄 All API fallbacks exhausted, attempting OpenRouter credits fallback for ${modelId}...`)
          // Final fallback: OpenRouter credits
          if (totalCredits > 0 && process.env.OPENROUTER_API_KEY) {
              try {
                const openrouterModelId = await resolveProviderModelId(modelId, 'openrouter')
                if (openrouterModelId !== modelId) {
                  const apiOptions: any = {
                    messages: messages.map((msg: any) => ({
                      role: msg.role,
                      content: msg.content
                    })),
                    model: openrouterModelId,
                    temperature: adjustedTemperature,
                    maxTokens: adjustedMaxTokens,
                    stream,
                    apiKey: process.env.OPENROUTER_API_KEY
                  }
                  
                  const apiResponse = await apiManager.createMessage('openrouter', apiOptions)
                  
                  // Safely parse OpenRouter credits fallback response
                  let apiResult
                  const contentType = apiResponse.headers.get('content-type') || ''
                  if (contentType.includes('application/json')) {
                    try {
                      apiResult = await apiResponse.json()
                    } catch (parseError) {
                      console.error(`[JSON Parse Error] Failed to parse OpenRouter credits fallback response:`, parseError)
                      throw new Error(`Invalid JSON response from OpenRouter credits fallback`)
                    }
                  } else {
                    console.error(`[Response Error] OpenRouter credits fallback returned non-JSON response with content-type: ${contentType}`)
                    const textResult = await apiResponse.text()
                    throw new Error(`Expected JSON response from OpenRouter credits fallback, got: ${textResult.substring(0, 200)}`)
                  }
                  
                  if (apiResponse.ok) {
                    console.log(`OpenRouter credits fallback successful for ${modelId}`)
                    
                    // Calculate cost
                    const parsedUsage = apiResult.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
                    let costInfo = null
                    if (modelPricing && parsedUsage.prompt_tokens && parsedUsage.completion_tokens) {
                      const inputCost = (parsedUsage.prompt_tokens / 1000000) * modelPricing.input
                      const outputCost = (parsedUsage.completion_tokens / 1000000) * modelPricing.output
                      costInfo = {
                        input_cost: inputCost,
                        output_cost: outputCost,
                        total_cost: inputCost + outputCost
                      }
                    }
                    
                    return {
                      model: modelId,
                      content: apiResult.choices?.[0]?.message?.content || '',
                      usage: parsedUsage,
                      costInfo: costInfo,
                      provider: 'OpenRouter (Credits - CLI Fallback)',
                      fallback_method: 'credits',
                      credits_used: (parsedUsage.total_tokens || 0) / 1000000 * 50
                    }
                  }
                }
              } catch (creditsError: any) {
                console.error(`OpenRouter credits fallback also failed for ${modelId}:`, creditsError)
                
                // Check for API key exhaustion in OpenRouter credits fallback
                const creditsExhaustionCheck = ResponseValidator.checkApiKeyExhaustion(creditsError.message || '', 'openrouter')
                if (creditsExhaustionCheck.isExhausted) {
                  console.warn(`[API Key Exhaustion] OpenRouter Credits: ${creditsExhaustionCheck.message}`)
                }
              }
            }
          
          // All fallbacks failed, return error with exhaustion details if applicable
          let errorMessage = `${selectedProvider} failed: ${error.message}. All fallback methods also failed.`
          if (exhaustionCheck.isExhausted) {
            if (exhaustionCheck.isPermanent) {
              errorMessage = `${selectedProvider} API key exhausted (permanent): ${exhaustionCheck.message}. Please check your API key configuration or billing status.`
            } else {
              errorMessage = `${selectedProvider} temporarily unavailable: ${exhaustionCheck.message}. Please try again later.`
            }
          }
          
          return {
            model: modelId,
            content: '',
            error: errorMessage,
            usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
            provider: `${selectedProvider} (${fallbackMethod.toUpperCase()})`,
            fallback_method: fallbackMethod,
            exhaustion_detected: exhaustionCheck.isExhausted,
            exhaustion_permanent: exhaustionCheck.isPermanent
          }
        }
      })
    )
    
    // Save chat history and log the interaction
    try {
      const totalTokens = responses.reduce((sum, r) => sum + (r?.usage?.total_tokens || 0), 0)
      const totalCost = responses.reduce((sum, r) => sum + ((r as any)?.costInfo?.total_cost || 0), 0)
      
      // Get or create chat session if session_id is provided
      const sessionId = body.session_id
      currentSessionId = sessionId
      
      if (!currentSessionId) {
        // Create new session for new conversations with auto-generated title
        const userMessage = messages[messages.length - 1] // Last message is the current user input
        const firstAssistantResponse = responses[0]?.content || ''
        const autoTitle = await generateConversationTitle(userMessage.content, firstAssistantResponse)
        console.log(`[Session Creation] Auto-generated title: "${autoTitle}"`)
        
        const { data: newSession, error: sessionError } = await supabase
          .from('chat_sessions')
          .insert({
            user_id: user.id,
            title: autoTitle
          })
          .select('id')
          .single()
          
        if (sessionError) {
          console.warn('Failed to create chat session:', sessionError)
        } else {
          currentSessionId = newSession.id
        }
      } else {
        // Update existing session title if it's still "New Chat" (first real message)
        const userMessage = messages[messages.length - 1]
        const { data: existingSession } = await supabase
          .from('chat_sessions')
          .select('title')
          .eq('id', currentSessionId)
          .single()
          
        if (existingSession?.title === 'New Chat') {
          const firstAssistantResponse = responses[0]?.content || ''
          const autoTitle = await generateConversationTitle(userMessage.content, firstAssistantResponse)
          console.log(`[Session Update] Auto-generated title: "${autoTitle}" for session: ${currentSessionId}`)
          await supabase
            .from('chat_sessions')
            .update({ title: autoTitle })
            .eq('id', currentSessionId)
        }
      }
      
      // Save messages to chat history if we have a session
      if (currentSessionId) {
        // Save user message
        const userMessage = messages[messages.length - 1] // Last message is the current user input
        await supabase
          .from('chat_messages')
          .insert({
            session_id: currentSessionId,
            role: 'user',
            content: userMessage.content
          })
        
        // Save assistant responses
        const assistantMessages = responses
          .filter(r => r && !r.error)
          .map(r => r!)
          .map(r => ({
            session_id: currentSessionId,
            role: 'assistant',
            content: r.content,
            model_id: r.model,
            provider_info: r.provider ? { provider: r.provider, fallback_method: r.fallback_method } : null,
            usage_info: r.usage || null,
            cost_info: (r as any).costInfo || null,
            metadata: r.credits_used ? { credits_used: r.credits_used } : null
          }))
        
        if (assistantMessages.length > 0) {
          await supabase
            .from('chat_messages')
            .insert(assistantMessages)
        }
      }
      
      // Log the interaction for analytics
      await supabase
        .from('chat_logs')
        .insert({
          user_id: user.id,
          session_id: currentSessionId,
          models_used: targetModels,
          message_count: messages.length,
          total_tokens: totalTokens,
          total_cost: totalCost,
          created_at: new Date().toISOString()
        })
    } catch (logError) {
      console.warn('Failed to save chat history/log interaction:', logError)
    }
    
    // Return response in OpenAI format for single model, Polydev format for multiple
    if (targetModels.length === 1 && model) {
      const response = responses[0]
      if (response?.error) {
        return NextResponse.json({ 
          error: { 
            message: response.error, 
            type: 'api_error' 
          } 
        }, { status: 500 })
      }
      
      // Calculate cost information
      const usage = response?.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
      let costInfo: any = { input_cost: 0, output_cost: 0, total_cost: 0 }
      
      if (response?.fallback_method === 'cli') {
        costInfo = { input_cost: 0, output_cost: 0, total_cost: 0 } // CLI is free
      } else if (response?.credits_used) {
        costInfo = { 
          input_cost: response.credits_used, 
          output_cost: 0, 
          total_cost: response.credits_used,
          credits_used: response.credits_used
        }
      } else {
        // Try to get pricing from model limits (uses corrected pricing data)
        try {
          const modelLimits = await modelsDevService.getModelLimits(response?.model || model, 'openrouter')
          if (modelLimits?.pricing) {
            const inputCost = (usage.prompt_tokens / 1000000) * modelLimits.pricing.input
            const outputCost = (usage.completion_tokens / 1000000) * modelLimits.pricing.output
            costInfo = {
              input_cost: inputCost,
              output_cost: outputCost,
              total_cost: inputCost + outputCost
            }
          }
        } catch (error) {
          console.warn(`Failed to get pricing for ${response?.model || model}:`, error)
        }
      }

      // Handle streaming response for single model (OpenAI format)
      if (stream) {
        const encoder = new TextEncoder()
        
        const streamingResponse = new ReadableStream({
          start(controller) {
            const streamData = {
              type: 'content',
              model: response?.model || model,
              content: response?.content || '',
              provider: response?.provider || 'unknown',
              metadata: {
                cost_info: costInfo,
                source_type: response?.fallback_method || 'api'
              }
            }
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(streamData)}\n\n`))
            
            // Send final metadata
            const metadata = {
              type: 'metadata',
              usage: usage,
              polydev_metadata: {
                provider: response?.provider || 'unknown',
                source_type: response?.fallback_method || 'api',
                cost_info: costInfo,
                model_resolved: response?.model || model,
                session_id: currentSessionId
              }
            }
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(metadata)}\n\n`))
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          }
        })
        
        return new Response(streamingResponse, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          }
        })
      }

      return NextResponse.json({
        id: `chatcmpl-${randomBytes(16).toString('hex')}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: response?.model || model,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: response?.content || ''
          },
          finish_reason: 'stop'
        }],
        usage: usage,
        // Enhanced Polydev metadata
        polydev_metadata: {
          provider: response?.provider || 'unknown',
          source_type: response?.fallback_method || 'api',
          cost_info: costInfo,
          model_resolved: response?.model || model,
          session_id: currentSessionId
        }
      })
    }
    
    // Polydev format for multiple models
    const totalUsage = {
      total_prompt_tokens: responses.reduce((sum, r) => sum + (r?.usage?.prompt_tokens || 0), 0),
      total_completion_tokens: responses.reduce((sum, r) => sum + (r?.usage?.completion_tokens || 0), 0),
      total_tokens: responses.reduce((sum, r) => sum + (r?.usage?.total_tokens || 0), 0)
    }
    
    // Calculate total cost across all models
    let totalCost = 0
    let totalCreditsUsed = 0
    const providerBreakdown: Record<string, any> = {}
    
    for (const response of responses) {
      if (!response || !response.provider) continue
      
      if (response.fallback_method === 'cli') {
        // CLI is free
        if (!providerBreakdown[response.provider]) {
          providerBreakdown[response.provider] = { cost: 0, tokens: 0, type: 'cli' }
        }
        providerBreakdown[response.provider].tokens += (response.usage?.total_tokens || 0)
      } else if (response.credits_used) {
        totalCreditsUsed += response.credits_used
        if (!providerBreakdown[response.provider]) {
          providerBreakdown[response.provider] = { cost: 0, credits: 0, tokens: 0, type: 'credits' }
        }
        providerBreakdown[response.provider].credits += response.credits_used
        providerBreakdown[response.provider].tokens += (response.usage?.total_tokens || 0)
      } else {
        // API key usage - calculate cost from model limits (uses corrected pricing data)
        try {
          const modelLimits = await modelsDevService.getModelLimits(response.model, response.provider)
          if (modelLimits?.pricing && response.usage) {
            const inputCost = (response.usage.prompt_tokens / 1000000) * modelLimits.pricing.input
            const outputCost = (response.usage.completion_tokens / 1000000) * modelLimits.pricing.output
            const responseCost = inputCost + outputCost
            totalCost += responseCost
            
            if (!providerBreakdown[response.provider]) {
              providerBreakdown[response.provider] = { cost: 0, tokens: 0, type: 'api' }
            }
            providerBreakdown[response.provider].cost += responseCost
            providerBreakdown[response.provider].tokens += (response.usage?.total_tokens || 0)
          }
        } catch (error) {
          console.warn(`Failed to get pricing for ${response.model}:`, error)
        }
      }
    }

    // Handle streaming response
    if (stream) {
      const encoder = new TextEncoder()
      
      const streamingResponse = new ReadableStream({
        start(controller) {
          // Stream all model responses
          for (const response of responses) {
            if (response && !response.error) {
              const streamData = {
                type: 'content',
                model: response.model,
                content: response.content || '',
                provider: response.provider,
                metadata: {
                  cost_info: response.costInfo || null,
                  source_type: response.fallback_method || 'api'
                }
              }
              
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(streamData)}\n\n`))
            } else if (response && response.error) {
              const errorData = {
                type: 'error',
                model: response.model,
                message: response.error,
                provider: response.provider
              }
              
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`))
            }
          }
          
          // Send final metadata
          const metadata = {
            type: 'metadata',
            usage: totalUsage,
            polydev_metadata: {
              total_cost: totalCost,
              total_credits_used: totalCreditsUsed,
              provider_breakdown: providerBreakdown,
              models_processed: responses.length,
              successful_models: responses.filter(r => r && !r.error).length,
              failed_models: responses.filter(r => r && r.error).length,
              session_id: currentSessionId
            }
          }
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(metadata)}\n\n`))
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        }
      })
      
      return new Response(streamingResponse, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      })
    }

    return NextResponse.json({
      responses,
      usage: totalUsage,
      // Enhanced Polydev metadata for multiple models
      polydev_metadata: {
        total_cost: totalCost,
        total_credits_used: totalCreditsUsed,
        provider_breakdown: providerBreakdown,
        models_processed: responses.length,
        successful_models: responses.filter(r => r && !r.error).length,
        failed_models: responses.filter(r => r && r.error).length,
        session_id: currentSessionId
      }
    })
    
  } catch (error) {
    console.error('Chat completions error:', error)
    
    if (stream) {
      // Return streaming error response
      const encoder = new TextEncoder()
      const errorData = {
        type: 'error',
        message: 'Failed to process chat completion',
        error_type: 'api_error'
      }
      const errorStream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`))
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        }
      })
      
      return new Response(errorStream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      })
    }
    
    return NextResponse.json(
      { 
        error: { 
          message: 'Failed to process chat completion', 
          type: 'api_error' 
        } 
      },
      { status: 500 }
    )
  }
}