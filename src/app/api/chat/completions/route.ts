import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { apiManager } from '@/lib/api'
import { CLINE_PROVIDERS } from '@/types/providers'
import { createHash, randomBytes } from 'crypto'
import { cookies } from 'next/headers'
import { modelsDevService } from '@/lib/models-dev-integration'

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

async function resolveProviderModelId(friendlyModelId: string, providerId: string): Promise<string> {
  try {
    // First try to get provider-specific model ID from models.dev database
    const providerSpecificId = await modelsDevService.getProviderSpecificModelId(friendlyModelId, providerId)
    if (providerSpecificId) {
      console.log(`Resolved ${friendlyModelId} for ${providerId} to: ${providerSpecificId}`)
      return providerSpecificId
    }
    
    // Fall back to the friendly model ID if no mapping found
    console.log(`No mapping found for ${friendlyModelId} with provider ${providerId}, using original ID`)
    return friendlyModelId
  } catch (error) {
    console.warn(`Error resolving model ID for ${friendlyModelId} with provider ${providerId}:`, error)
    return friendlyModelId
  }
}

async function getProviderFromModel(model: string, supabase: any, userId?: string): Promise<string> {
  try {
    // Get all providers that support this model from models_registry
    const { data: modelProviders } = await supabase
      .from('models_registry')
      .select('provider_id, provider_name')
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
            mp.provider_id === providerKey || mp.provider_name?.toLowerCase() === providerKey.toLowerCase()
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
  try {
    const authResult = await authenticateRequest(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { user, preferences } = authResult
    const supabase = await createClient()
    
    // Parse request body - support both OpenAI format and Polydev format
    const body = await request.json()
    let { messages, model, models, temperature = 0.7, max_tokens, stream = false, reasoning_effort } = body
    
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
      'codex_cli': 'openai', 
      'gemini_cli': 'google'
    }
    
    const providerConfigs: Record<string, any> = {}
    
    // PRIORITY 1: CLI providers (highest priority)
    ;(cliConfigs || []).forEach(cli => {
      const mappedProvider = cliProviderMappings[cli.provider]
      if (mappedProvider) {
        providerConfigs[mappedProvider] = {
          type: 'cli',
          priority: 1,
          cliProvider: cli.provider,
          customPath: cli.custom_path
        }
      }
    })
    
    // PRIORITY 2: API keys (including OpenRouter as a provider, not credits)
    ;(apiKeys || []).forEach(key => {
      // Always add API key config, even if CLI exists for the provider
      const apiConfigKey = `${key.provider}_api`
      providerConfigs[apiConfigKey] = {
        type: 'api',
        priority: 2,
        provider: key.provider,
        apiKey: atob(key.encrypted_key),
        baseUrl: key.api_base
      }
      
      // Also add under the original provider name if no CLI config exists
      if (!providerConfigs[key.provider]) {
        providerConfigs[key.provider] = {
          type: 'api',
          priority: 2,
          apiKey: atob(key.encrypted_key),
          baseUrl: key.api_base
        }
      }
    })
    
    // PRIORITY 3: OpenRouter credits will be handled per-model in the loop below
    
    // Get additional model data (reasoning support, etc.)
    const modelDataMap = new Map()
    const modelMappingMap = new Map()
    
    for (const modelId of targetModels) {
      // Store model mapping for this model
      const mapping = modelMappings?.find(m => m.friendly_id === modelId)
      if (mapping) {
        modelMappingMap.set(modelId, mapping.providers_mapping)
      }
      
      try {
        const response = await fetch(`${request.nextUrl.origin}/api/models-dev/providers?models_only=true&model_id=${encodeURIComponent(modelId)}`)
        if (response.ok) {
          const data = await response.json()
          const modelData = data.models?.find((m: any) => m.id === modelId)
          if (modelData) {
            modelDataMap.set(modelId, modelData)
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch model data for ${modelId}:`, error)
      }
    }

    let currentSessionId: string | null = null // For chat history tracking
    
    // Process requests for each model with STRICT PRIORITY: CLI > API > OPENROUTER(CREDITS)
    const responses = await Promise.all(
      targetModels.map(async (modelId: string) => {
        const modelMapping = modelMappingMap.get(modelId)
        const modelData = modelDataMap.get(modelId)
        
        let selectedProvider: string | null = null
        let selectedConfig: any = null
        let fallbackMethod: 'cli' | 'api' | 'credits' = 'api'
        let actualModelId = modelId
        
        // STEP 1: PRIORITY 1 - CLI Tools (highest priority, ignore preferences)
        const requiredProvider = await getProviderFromModel(modelId, supabase, user.id)
        if (providerConfigs[requiredProvider]?.type === 'cli' && providerConfigs[requiredProvider]?.priority === 1) {
          selectedProvider = requiredProvider
          selectedConfig = providerConfigs[requiredProvider]
          fallbackMethod = 'cli'
          // Resolve CLI-specific model ID
          actualModelId = await resolveProviderModelId(modelId, requiredProvider)
        }
        
        // STEP 2: PRIORITY 2 - Direct API Keys (if CLI not available)
        if (!selectedProvider && providerConfigs[requiredProvider]?.type === 'api' && providerConfigs[requiredProvider]?.priority === 2) {
          selectedProvider = requiredProvider
          selectedConfig = providerConfigs[requiredProvider]
          fallbackMethod = 'api'
          // Resolve API-specific model ID
          actualModelId = await resolveProviderModelId(modelId, requiredProvider)
        }
        
        // STEP 3: Check if user has OpenRouter as API provider for this model
        if (!selectedProvider && providerConfigs['openrouter']?.type === 'api') {
          // User has OpenRouter API key - treat as regular API provider
          selectedProvider = 'openrouter'
          selectedConfig = providerConfigs['openrouter']
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
              'codex_cli': 'codex-cli',
              'gemini_cli': 'gemini-cli'
            }
            
            const handlerName = cliProviderMap[selectedConfig.cliProvider]
            if (!handlerName) {
              throw new Error(`Unsupported CLI provider: ${selectedConfig.cliProvider}`)
            }
            
            const handler = apiManager.getHandler(handlerName)
            const messageParams: any = {
              messages: messages.map((msg: any) => ({
                role: msg.role,
                content: msg.content
              })),
              model: actualModelId,
              temperature,
              maxTokens: max_tokens,
              apiKey: '' // CLI handlers don't use API keys
            }
            
            // Add reasoning effort for reasoning models
            if (modelData?.supports_reasoning && reasoning_effort) {
              messageParams.reasoning_effort = reasoning_effort
            }
            
            response = await handler.createMessage(messageParams)
            
            const responseData = await response.json()
            return {
              model: modelId,
              content: responseData.content?.[0]?.text || responseData.choices?.[0]?.message?.content || '',
              usage: responseData.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
              provider: `${selectedProvider} (CLI)`,
              fallback_method: fallbackMethod
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
              stream: false,
              apiKey: selectedConfig.apiKey
            }
            
            // Add reasoning effort for reasoning models
            if (modelData?.supports_reasoning && reasoning_effort) {
              apiOptions.reasoning_effort = reasoning_effort
            }
            
            // Use provider configuration for correct baseUrl property name
            const apiProviderConfig = apiManager.getProviderConfiguration(selectedProvider)
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
            response = await apiManager.createMessage(selectedProvider, apiOptions)
            const result = await response.json()
            
            if (!response.ok) {
              throw new Error(result.error?.message || 'API call failed')
            }
            
            // Extract content based on provider format
            let content = ''
            if (result.content?.[0]?.text) {
              // Anthropic format
              content = result.content[0].text
            } else if (result.choices?.[0]?.message?.content) {
              // OpenAI format
              content = result.choices[0].message.content
            }
            
            return {
              model: modelId,
              content: content,
              usage: result.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
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
              stream: false,
              apiKey: selectedConfig.apiKey,
              openAiBaseUrl: selectedConfig.baseUrl || 'https://openrouter.ai/api/v1'
            }
            
            // Add reasoning effort for reasoning models if supported
            if (modelData?.supports_reasoning && reasoning_effort) {
              apiOptions.reasoning_effort = reasoning_effort
            }
            
            // Make API call through OpenRouter
            response = await apiManager.createMessage('openai', apiOptions)
            const result = await response.json()
            
            if (!response.ok) {
              throw new Error(result.error?.message || 'OpenRouter API call failed')
            }
            
            // Get cost from models.dev database for credits calculation
            const pricingData = await modelsDevService.getModelPricing(modelId, 'openrouter')
            const inputCostPerMillion = pricingData?.input || 1
            
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
            
            return {
              model: modelId,
              content: content,
              usage: result.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
              provider: selectedConfig.type === 'credits' ? 'OpenRouter (Credits)' : 'OpenRouter (API)',
              fallback_method: fallbackMethod,
              credits_used: selectedConfig.type === 'credits' ? (result.usage?.total_tokens || 0) / 1000000 * inputCostPerMillion : undefined
            }
          }
        } catch (error: any) {
          console.error(`Error with ${selectedProvider} for model ${modelId}:`, error)
          
          // FALLBACK LOGIC: If CLI fails, try API keys, then credits
          if (fallbackMethod === 'cli') {
            console.log(`CLI failed for ${modelId}, trying API fallback...`)
            console.log(`Checking if ${requiredProvider} has API key configured...`)
            console.log(`Provider configs for ${requiredProvider}:`, providerConfigs[requiredProvider] || 'NOT FOUND')
            
            // Try API key for the same provider first (check both original and _api versions)
            const apiConfig = providerConfigs[requiredProvider]?.type === 'api' ? providerConfigs[requiredProvider] : providerConfigs[`${requiredProvider}_api`]
            if (apiConfig) {
              console.log(`✅ ${requiredProvider} API key found, attempting API fallback...`)
              try {
                const apiOptions: any = {
                  messages: messages.map((msg: any) => ({
                    role: msg.role,
                    content: msg.content
                  })),
                  model: await resolveProviderModelId(modelId, requiredProvider),
                  temperature: adjustedTemperature,
                  maxTokens: adjustedMaxTokens,
                  stream: false,
                  apiKey: apiConfig.apiKey
                }
                
                if (modelData?.supports_reasoning && reasoning_effort) {
                  apiOptions.reasoning_effort = reasoning_effort
                }
                
                const apiResponse = await apiManager.createMessage(apiConfig.provider || requiredProvider, apiOptions)
                const apiResult = await apiResponse.json()
                
                if (apiResponse.ok) {
                  console.log(`API fallback successful for ${modelId} with ${requiredProvider}`)
                  return {
                    model: modelId,
                    content: apiResult.choices?.[0]?.message?.content || apiResult.content?.[0]?.text || '',
                    usage: apiResult.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
                    provider: `${requiredProvider} (API - CLI Fallback)`,
                    fallback_method: 'api'
                  }
                }
              } catch (apiError) {
                console.error(`API fallback also failed for ${modelId}:`, apiError)
              }
            } else {
              console.log(`❌ No ${requiredProvider} API key configured, skipping API fallback for this provider`)
            }
            
            // Try OpenRouter API key fallback
            console.log(`Checking if OpenRouter API key is available for fallback...`)
            if (providerConfigs['openrouter']?.type === 'api') {
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
                  stream: false,
                  apiKey: providerConfigs['openrouter'].apiKey
                }
                
                const apiResponse = await apiManager.createMessage('openrouter', apiOptions)
                const apiResult = await apiResponse.json()
                
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
              } catch (openrouterError) {
                console.error(`OpenRouter API fallback also failed for ${modelId}:`, openrouterError)
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
                    stream: false,
                    apiKey: process.env.OPENROUTER_API_KEY
                  }
                  
                  const apiResponse = await apiManager.createMessage('openrouter', apiOptions)
                  const apiResult = await apiResponse.json()
                  
                  if (apiResponse.ok) {
                    console.log(`OpenRouter credits fallback successful for ${modelId}`)
                    return {
                      model: modelId,
                      content: apiResult.choices?.[0]?.message?.content || '',
                      usage: apiResult.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
                      provider: 'OpenRouter (Credits - CLI Fallback)',
                      fallback_method: 'credits',
                      credits_used: (apiResult.usage?.total_tokens || 0) / 1000000 * 50
                    }
                  }
                }
              } catch (creditsError) {
                console.error(`OpenRouter credits fallback also failed for ${modelId}:`, creditsError)
              }
            }
          
          // All fallbacks failed, return error
          return {
            model: modelId,
            content: '',
            error: `${selectedProvider} failed: ${error.message}. All fallback methods also failed.`,
            usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
            provider: `${selectedProvider} (${fallbackMethod.toUpperCase()})`,
            fallback_method: fallbackMethod
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
        // Create new session for new conversations
        const { data: newSession, error: sessionError } = await supabase
          .from('chat_sessions')
          .insert({
            user_id: user.id,
            title: 'New Chat'
          })
          .select('id')
          .single()
          
        if (sessionError) {
          console.warn('Failed to create chat session:', sessionError)
        } else {
          currentSessionId = newSession.id
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
        // Try to get pricing from model data
        const modelData = modelDataMap.get(response?.model || model)
        if (modelData?.pricing) {
          const inputCost = (usage.prompt_tokens / 1000000) * (modelData.pricing.input || 0)
          const outputCost = (usage.completion_tokens / 1000000) * (modelData.pricing.output || 0)
          costInfo = {
            input_cost: inputCost,
            output_cost: outputCost,
            total_cost: inputCost + outputCost
          }
        }
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
    
    responses.forEach(response => {
      if (!response || !response.provider) return
      
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
        // API key usage - calculate cost from model data
        const modelData = modelDataMap.get(response.model)
        if (modelData?.pricing && response.usage) {
          const inputCost = (response.usage.prompt_tokens / 1000000) * (modelData.pricing.input || 0)
          const outputCost = (response.usage.completion_tokens / 1000000) * (modelData.pricing.output || 0)
          const responseCost = inputCost + outputCost
          totalCost += responseCost
          
          if (!providerBreakdown[response.provider]) {
            providerBreakdown[response.provider] = { cost: 0, tokens: 0, type: 'api' }
          }
          providerBreakdown[response.provider].cost += responseCost
          providerBreakdown[response.provider].tokens += (response.usage?.total_tokens || 0)
        }
      }
    })

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