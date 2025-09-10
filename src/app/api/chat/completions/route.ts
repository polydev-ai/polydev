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
    
    // Get user preferences
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', token.user_id)
      .single()
    
    return {
      user: { id: token.user_id },
      preferences: preferences || {
        default_provider: 'openai',
        default_model: 'gpt-4o',
        model_preferences: { openai: 'gpt-4o' }
      }
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
  
  return {
    user,
    preferences: preferences || {
      default_provider: 'openai',
      default_model: 'gpt-4o',
      model_preferences: { openai: 'gpt-4o' }
    }
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
  if (model.includes('kimi')) return 'moonshot'
  
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
      // Polydev format - multiple models
      targetModels = models
    } else {
      // No model specified - use user preferences
      const defaultModel = preferences.default_model || 'gpt-4o'
      targetModels = [defaultModel]
    }
    
    // Get user's provider configurations (CLI + API keys) for required providers
    const requiredProviders = [...new Set(await Promise.all(targetModels.map(model => getProviderFromModel(model, supabase))))]
    
    // Priority 1: Check for enabled CLI providers
    const { data: cliConfigs } = await supabase
      .from('cli_provider_configurations')
      .select('provider, custom_path, enabled, status')
      .eq('user_id', user.id)
      .eq('enabled', true)
      .eq('status', 'available')
      .in('provider', ['claude_code', 'codex_cli', 'gemini_cli'])
      
    // Priority 2: Get API keys for providers not covered by CLI
    const cliProviderMappings: Record<string, string> = {
      'claude_code': 'anthropic',
      'codex_cli': 'openai', 
      'gemini_cli': 'google'
    }
    
    const enabledCliProviders = (cliConfigs || [])
      .map(cli => cliProviderMappings[cli.provider])
      .filter(Boolean)
    
    const providersNeedingApiKeys = requiredProviders.filter(p => !enabledCliProviders.includes(p))
    
    const { data: apiKeys } = await supabase
      .from('user_api_keys')
      .select('provider, encrypted_key, api_base, active')
      .eq('user_id', user.id)
      .eq('active', true)
      .in('provider', providersNeedingApiKeys)
    
    // Check if we have any way to handle the required providers (CLI or API keys)
    const availableProviders = [
      ...enabledCliProviders,
      ...(apiKeys || []).map(key => key.provider)
    ]
    
    const missingProviders = requiredProviders.filter(p => !availableProviders.includes(p))
    
    if (missingProviders.length > 0 && availableProviders.length === 0) {
      return NextResponse.json({ 
        error: { 
          message: `No active API keys or CLI providers found for required providers: ${requiredProviders.join(', ')}. Please configure API keys or enable CLI tools in your settings.`, 
          type: 'authentication_error' 
        } 
      }, { status: 401 })
    }
    
    // Create a comprehensive provider configuration map (CLI first, then API keys)
    const providerConfigs: Record<string, any> = {}
    
    // Priority 1: CLI providers
    ;(cliConfigs || []).forEach(cli => {
      const mappedProvider = cliProviderMappings[cli.provider]
      if (mappedProvider) {
        providerConfigs[mappedProvider] = {
          type: 'cli',
          cliProvider: cli.provider,
          customPath: cli.custom_path
        }
      }
    })
    
    // Priority 2: API keys (only for providers not handled by CLI)
    ;(apiKeys || []).forEach(key => {
      if (!providerConfigs[key.provider]) {
        providerConfigs[key.provider] = {
          type: 'api',
          apiKey: atob(key.encrypted_key), // Decrypt (basic base64 for now)
          baseUrl: key.api_base
        }
      }
    })
    
    // Get model mappings for intelligent fallback
    const { data: modelMappings } = await supabase
      .from('model_mappings')
      .select('friendly_id, providers_mapping')
      .in('friendly_id', targetModels)
    
    // Get user credit balance for OpenRouter fallback
    const { data: userCredits } = await supabase
      .from('user_credits')
      .select('balance, promotional_balance')
      .eq('user_id', user.id)
      .single()
    
    const totalCredits = (parseFloat(userCredits?.balance || '0') + parseFloat(userCredits?.promotional_balance || '0'))
    
    // Check which models support reasoning and get their data
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

    // Process requests for each model with intelligent fallback
    const responses = await Promise.all(
      targetModels.map(async (modelId: string) => {
        const modelMapping = modelMappingMap.get(modelId)
        const modelData = modelDataMap.get(modelId)
        
        // Determine the best provider using intelligent fallback
        let selectedProvider: string | null = null
        let selectedConfig: any = null
        let fallbackMethod: 'cli' | 'api' | 'credits' = 'api'
        let actualModelId = modelId
        
        // Priority 1: CLI Tools (if available and user preference allows)
        if (preferences.usage_preference !== 'api_keys' && preferences.usage_preference !== 'credits') {
          const provider = await getProviderFromModel(modelId, supabase)
          if (providerConfigs[provider]?.type === 'cli') {
            selectedProvider = provider
            selectedConfig = providerConfigs[provider]
            fallbackMethod = 'cli'
          }
        }
        
        // Priority 2: Direct API Keys (if CLI not available or preference set)
        if (!selectedProvider && preferences.usage_preference !== 'cli' && preferences.usage_preference !== 'credits') {
          const provider = await getProviderFromModel(modelId, supabase)
          if (providerConfigs[provider]?.type === 'api') {
            selectedProvider = provider
            selectedConfig = providerConfigs[provider]
            fallbackMethod = 'api'
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
        
        // Priority 3: Credits via OpenRouter (fallback)
        if (!selectedProvider && totalCredits > 0) {
          if (modelMapping?.openrouter) {
            selectedProvider = 'openrouter'
            selectedConfig = {
              type: 'credits',
              apiKey: process.env.OPENROUTER_API_KEY || 'fallback-credits-key'
            }
            actualModelId = modelMapping.openrouter.api_model_id
            fallbackMethod = 'credits'
          }
        }
        
        if (!selectedProvider || !selectedConfig) {
          let errorMessage = `No provider available for model: ${modelId}`
          if (totalCredits <= 0 && !Object.keys(providerConfigs).length) {
            errorMessage += '. No API keys configured and insufficient credits.'
          }
          
          return {
            model: modelId,
            error: errorMessage,
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
          } else {
            // Use credits via OpenRouter
            const apiOptions: any = {
              messages: messages.map((msg: any) => ({
                role: msg.role,
                content: msg.content
              })),
              model: actualModelId,
              temperature: adjustedTemperature,
              maxTokens: adjustedMaxTokens,
              stream: false,
              apiKey: selectedConfig.apiKey,
              openAiBaseUrl: 'https://openrouter.ai/api/v1'
            }
            
            // Add reasoning effort for reasoning models if supported
            if (modelData?.supports_reasoning && reasoning_effort && modelMapping?.openrouter?.capabilities?.reasoning_levels) {
              apiOptions.reasoning_effort = reasoning_effort
            }
            
            // Make API call through OpenRouter
            response = await apiManager.createMessage('openai', apiOptions) // Use openai handler for OpenRouter compatibility
            const result = await response.json()
            
            if (!response.ok) {
              throw new Error(result.error?.message || 'Credits API call failed')
            }
            
            // Deduct credits based on usage (simplified - you may want more sophisticated cost calculation)
            const usageTokens = result.usage?.total_tokens || 0
            const costEstimate = (usageTokens / 1000000) * (modelMapping.openrouter?.cost?.input || 1)
            
            if (costEstimate > 0 && userCredits) {
              await supabase
                .from('user_credits')
                .update({ 
                  balance: Math.max(0, parseFloat(userCredits.balance) - costEstimate).toFixed(6)
                })
                .eq('user_id', user.id)
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
              provider: `OpenRouter (Credits)`,
              fallback_method: fallbackMethod,
              credits_used: costEstimate
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