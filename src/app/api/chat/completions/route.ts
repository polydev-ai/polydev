import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { apiManager } from '@/lib/api'
import { CLINE_PROVIDERS } from '@/types/providers'
import { createHash, randomBytes } from 'crypto'
import { cookies } from 'next/headers'

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

async function getProviderFromModel(model: string, supabase: any): Promise<string> {
  try {
    // First try to find the model in our models_registry
    const { data: modelData } = await supabase
      .from('models_registry')
      .select('provider_id')
      .eq('friendly_id', model)
      .eq('is_active', true)
      .limit(1)
      .single()
    
    if (modelData?.provider_id) {
      // Map provider IDs to our internal provider names
      const providerMapping: Record<string, string> = {
        'anthropic': 'anthropic',
        'openai': 'openai',
        'google': 'gemini',
        'groq': 'groq',
        'deepseek': 'deepseek',
        'xai': 'xai',
        'moonshotai': 'openai', // Moonshot uses OpenAI-compatible API
        'moonshotai-cn': 'openai', // Moonshot CN uses OpenAI-compatible API
        'vercel': 'openai', // Vercel uses OpenAI-compatible API
        'github-models': 'openai', // GitHub Models uses OpenAI-compatible API
        'nvidia': 'openai', // NVIDIA uses OpenAI-compatible API
        'fireworks-ai': 'openai' // Fireworks uses OpenAI-compatible API
      }
      
      return providerMapping[modelData.provider_id] || modelData.provider_id
    }
  } catch (error) {
    console.warn(`Failed to lookup provider for model ${model}:`, error)
  }
  
  // Fallback to legacy string matching if database lookup fails
  if (model.includes('gpt') || model.includes('openai')) return 'openai'
  if (model.includes('claude')) return 'anthropic'
  if (model.includes('gemini')) return 'gemini'
  if (model.includes('llama')) return 'groq'
  if (model.includes('mixtral')) return 'groq'
  if (model.includes('deepseek')) return 'deepseek'
  if (model.includes('grok')) return 'xai'
  if (model.includes('kimi')) return 'groq'  // Kimi K2 is available via Groq
  
  // Default fallback
  return 'openai'
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
      if (!providerConfigs[key.provider]) { // Only if not already covered by CLI
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
        const requiredProvider = await getProviderFromModel(modelId, supabase)
        if (providerConfigs[requiredProvider]?.type === 'cli' && providerConfigs[requiredProvider]?.priority === 1) {
          selectedProvider = requiredProvider
          selectedConfig = providerConfigs[requiredProvider]
          fallbackMethod = 'cli'
        }
        
        // STEP 2: PRIORITY 2 - Direct API Keys (if CLI not available)
        if (!selectedProvider && providerConfigs[requiredProvider]?.type === 'api' && providerConfigs[requiredProvider]?.priority === 2) {
          selectedProvider = requiredProvider
          selectedConfig = providerConfigs[requiredProvider]
          fallbackMethod = 'api'
        }
        
        // STEP 3: Check if user has OpenRouter as API provider for this model
        if (!selectedProvider && providerConfigs['openrouter']?.type === 'api') {
          // User has OpenRouter API key - treat as regular API provider
          selectedProvider = 'openrouter'
          selectedConfig = providerConfigs['openrouter']
          fallbackMethod = 'api'
          // Keep original model ID for OpenRouter API usage
        }
        
        // STEP 4: PRIORITY 3 - OpenRouter Credits (lowest priority, last resort)
        if (!selectedProvider && totalCredits > 0 && modelMapping?.openrouter) {
          // Use system OpenRouter key for credits
          if (process.env.OPENROUTER_API_KEY) {
            selectedProvider = 'openrouter'
            selectedConfig = {
              type: 'credits',
              priority: 3,
              apiKey: process.env.OPENROUTER_API_KEY
            }
            actualModelId = modelMapping.openrouter.api_model_id // Use OpenRouter-specific model ID
            fallbackMethod = 'credits'
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
            
            // Make API call through OpenRouter (always use openai handler for compatibility)
            response = await apiManager.createMessage('openai', apiOptions)
            const result = await response.json()
            
            if (!response.ok) {
              throw new Error(result.error?.message || 'OpenRouter API call failed')
            }
            
            // If using credits, deduct from balance
            if (selectedConfig.type === 'credits') {
              const usageTokens = result.usage?.total_tokens || 0
              const costEstimate = (usageTokens / 1000000) * (modelMapping?.openrouter?.cost?.input || 1)
              
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
              credits_used: selectedConfig.type === 'credits' ? (result.usage?.total_tokens || 0) / 1000000 * (modelMapping?.openrouter?.cost?.input || 1) : undefined
            }
          }
        } catch (error: any) {
          console.error(`Error with ${selectedProvider} for model ${modelId}:`, error)
          return {
            model: modelId,
            content: '',
            error: error.message,
            usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
            provider: `${selectedProvider} (${fallbackMethod.toUpperCase()})`,
            fallback_method: fallbackMethod
          }
        }
      })
    )
    
    // Log the interaction
    try {
      await supabase
        .from('chat_logs')
        .insert({
          user_id: user.id,
          models_used: targetModels,
          message_count: messages.length,
          total_tokens: responses.reduce((sum, r) => sum + (r.usage?.total_tokens || 0), 0),
          created_at: new Date().toISOString()
        })
    } catch (logError) {
      console.warn('Failed to log chat interaction:', logError)
    }
    
    // Return response in OpenAI format for single model, Polydev format for multiple
    if (targetModels.length === 1 && model) {
      const response = responses[0]
      if (response.error) {
        return NextResponse.json({ 
          error: { 
            message: response.error, 
            type: 'api_error' 
          } 
        }, { status: 500 })
      }
      
      return NextResponse.json({
        id: `chatcmpl-${randomBytes(16).toString('hex')}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: response.model,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: response.content
          },
          finish_reason: 'stop'
        }],
        usage: response.usage
      })
    }
    
    // Polydev format for multiple models
    return NextResponse.json({
      responses,
      usage: {
        total_prompt_tokens: responses.reduce((sum, r) => sum + (r.usage?.prompt_tokens || 0), 0),
        total_completion_tokens: responses.reduce((sum, r) => sum + (r.usage?.completion_tokens || 0), 0),
        total_tokens: responses.reduce((sum, r) => sum + (r.usage?.total_tokens || 0), 0)
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