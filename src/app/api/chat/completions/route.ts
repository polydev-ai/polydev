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

function getProviderFromModel(model: string): string {
  // Use CLINE_PROVIDERS system to find the correct provider
  for (const [providerId, config] of Object.entries(CLINE_PROVIDERS)) {
    if (config.supportedModels) {
      // Check in supportedModels object
      if (config.supportedModels[model] || Object.keys(config.supportedModels).some(modelName => 
        modelName === model || model.includes(modelName.split('-')[0])
      )) {
        return providerId
      }
    }
  }
  
  // Legacy fallback mapping for models not yet in comprehensive system
  if (model.includes('gpt') || model.includes('openai')) return 'openai'
  if (model.includes('claude')) return 'anthropic'
  if (model.includes('gemini')) return 'gemini'
  if (model.includes('llama')) return 'groq'
  if (model.includes('mixtral')) return 'groq'
  if (model.includes('deepseek')) return 'deepseek'
  if (model.includes('grok')) return 'xai'
  
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
    let { messages, model, models, temperature = 0.7, max_tokens, stream = false } = body
    
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
    const requiredProviders = [...new Set(targetModels.map(getProviderFromModel))]
    
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
    
    // Process requests for each model
    const responses = await Promise.all(
      targetModels.map(async (modelId: string) => {
        const provider = getProviderFromModel(modelId)
        const providerConfig = providerConfigs[provider]
        
        if (!providerConfig) {
          return {
            model: modelId,
            error: `No CLI provider or API key configured for provider: ${provider}`,
            usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
          }
        }
        
        try {
          let response
          
          if (providerConfig.type === 'cli') {
            // Use CLI provider through existing handler
            const cliProviderMap: Record<string, string> = {
              'claude_code': 'claude-code',
              'codex_cli': 'codex-cli',
              'gemini_cli': 'gemini-cli'
            }
            
            const handlerName = cliProviderMap[providerConfig.cliProvider]
            if (!handlerName) {
              throw new Error(`Unsupported CLI provider: ${providerConfig.cliProvider}`)
            }
            
            const handler = apiManager.getHandler(handlerName)
            response = await handler.createMessage({
              messages: messages.map((msg: any) => ({
                role: msg.role,
                content: msg.content
              })),
              model: modelId,
              temperature,
              maxTokens: max_tokens,
              apiKey: '' // CLI handlers don't use API keys
            })
            
            const responseData = await response.json()
            return {
              model: modelId,
              content: responseData.content?.[0]?.text || responseData.choices?.[0]?.message?.content || '',
              usage: responseData.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
              provider: `${provider} (CLI)`
            }
          } else {
            // Use API key provider (existing logic)
            const apiOptions: any = {
              messages: messages.map((msg: any) => ({
                role: msg.role,
                content: msg.content
              })),
              model: modelId,
              temperature,
              maxTokens: max_tokens,
              stream: false,
              apiKey: providerConfig.apiKey
            }
            
            // Use provider configuration for correct baseUrl property name
            const apiProviderConfig = apiManager.getProviderConfiguration(provider)
            if (providerConfig.baseUrl && apiProviderConfig) {
              // Set the baseUrl using the provider's expected property name
              if (apiProviderConfig.baseUrlProperty) {
                apiOptions[apiProviderConfig.baseUrlProperty] = providerConfig.baseUrl
              } else {
                // Fallback to common patterns
                switch (provider) {
                  case 'openai':
                  case 'groq':
                  case 'deepseek':
                  case 'xai':
                    apiOptions.openAiBaseUrl = providerConfig.baseUrl
                    break
                  case 'anthropic':
                    apiOptions.anthropicBaseUrl = providerConfig.baseUrl
                    break
                  case 'gemini':
                  case 'google':
                    apiOptions.googleBaseUrl = providerConfig.baseUrl
                    break
                  default:
                    apiOptions.openAiBaseUrl = providerConfig.baseUrl
                }
              }
            }
            
            // Get estimated token count before request
            const estimatedTokens = apiManager.getTokenCount(provider, apiOptions)
            console.log(`Estimated tokens for ${provider}:`, estimatedTokens)
            
            // Check rate limit status
            const rateLimitStatus = apiManager.getRateLimitStatus(provider)
            if (rateLimitStatus) {
              console.log(`Rate limit status for ${provider}:`, rateLimitStatus)
            }
            
            // Make API call through enhanced provider system
            response = await apiManager.createMessage(provider, apiOptions)
            const result = await response.json()
            
            if (!response.ok) {
              throw new Error(result.error?.message || 'API call failed')
            }
            
            // Validate response using comprehensive validator
            const validation = apiManager.validateResponse(result, provider, modelId)
            if (!validation.isValid) {
              console.warn(`Response validation failed for ${provider}:`, validation.errors)
            }
            
            if (validation.warnings.length > 0) {
              console.warn(`Response validation warnings for ${provider}:`, validation.warnings)
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
              provider: `${provider} (API)`
            }
          }
        } catch (error: any) {
          console.error(`Error with ${provider} for model ${modelId}:`, error)
          return {
            model: modelId,
            content: '',
            error: error.message,
            usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
            provider: providerConfig.type === 'cli' ? `${provider} (CLI)` : `${provider} (API)`
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