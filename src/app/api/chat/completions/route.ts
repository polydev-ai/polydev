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
    
    // Get user's API keys for required providers
    const requiredProviders = [...new Set(targetModels.map(getProviderFromModel))]
    const { data: apiKeys } = await supabase
      .from('user_api_keys')
      .select('provider, encrypted_key, api_base, active')
      .eq('user_id', user.id)
      .eq('active', true)
      .in('provider', requiredProviders)
    
    if (!apiKeys || apiKeys.length === 0) {
      return NextResponse.json({ 
        error: { 
          message: `No active API keys found for required providers: ${requiredProviders.join(', ')}`, 
          type: 'authentication_error' 
        } 
      }, { status: 401 })
    }
    
    // Create a map of provider to API key
    const providerKeys: Record<string, any> = {}
    apiKeys.forEach(key => {
      providerKeys[key.provider] = {
        apiKey: atob(key.encrypted_key), // Decrypt (basic base64 for now)
        baseUrl: key.api_base
      }
    })
    
    // Process requests for each model
    const responses = await Promise.all(
      targetModels.map(async (modelId: string) => {
        const provider = getProviderFromModel(modelId)
        const providerKey = providerKeys[provider]
        
        if (!providerKey) {
          return {
            model: modelId,
            error: `No API key configured for provider: ${provider}`,
            usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
          }
        }
        
        try {
          // Prepare API call options with comprehensive provider support
          const apiOptions: any = {
            messages: messages.map((msg: any) => ({
              role: msg.role,
              content: msg.content
            })),
            model: modelId,
            temperature,
            maxTokens: max_tokens,
            stream: false, // For now, handle streaming separately
            apiKey: providerKey.apiKey
          }
          
          // Use provider configuration for correct baseUrl property name
          const providerConfig = apiManager.getProviderConfiguration(provider)
          if (providerKey.baseUrl && providerConfig) {
            // Set the baseUrl using the provider's expected property name
            if (providerConfig.baseUrlProperty) {
              apiOptions[providerConfig.baseUrlProperty] = providerKey.baseUrl
            } else {
              // Fallback to common patterns
              switch (provider) {
                case 'openai':
                case 'groq':
                case 'deepseek':
                case 'xai':
                  apiOptions.openAiBaseUrl = providerKey.baseUrl
                  break
                case 'anthropic':
                  apiOptions.anthropicBaseUrl = providerKey.baseUrl
                  break
                case 'gemini':
                case 'google':
                  apiOptions.googleBaseUrl = providerKey.baseUrl
                  break
                default:
                  apiOptions.openAiBaseUrl = providerKey.baseUrl
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
          const response = await apiManager.createMessage(provider, apiOptions)
          const result = await response.json()
          
          if (!response.ok) {
            throw new Error(result.error?.message || 'API call failed')
          }
          
          // Validate response using comprehensive validator
          const validation = apiManager.validateResponse(result, provider, modelId)
          if (!validation.isValid) {
            console.warn(`Response validation failed for ${provider}:`, validation.errors)
            // Continue with processing but log the issues
          }
          
          if (validation.warnings.length > 0) {
            console.warn(`Response validation warnings for ${provider}:`, validation.warnings)
          }
          
          // Use normalized response format for consistent extraction
          const normalizedResult = validation.sanitizedResponse || result
          
          // Extract content and usage using universal approach
          let content = ''
          let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
          
          // Try provider-specific extraction patterns
          switch (provider) {
            case 'anthropic':
              content = normalizedResult.content?.[0]?.text || ''
              usage = {
                prompt_tokens: normalizedResult.usage?.input_tokens || 0,
                completion_tokens: normalizedResult.usage?.output_tokens || 0,
                total_tokens: (normalizedResult.usage?.input_tokens || 0) + (normalizedResult.usage?.output_tokens || 0)
              }
              break
            case 'openai':
            case 'groq':
            case 'deepseek':
            case 'xai':
              content = normalizedResult.choices?.[0]?.message?.content || ''
              usage = normalizedResult.usage || usage
              break
            case 'gemini':
            case 'google':
              content = normalizedResult.candidates?.[0]?.content?.parts?.[0]?.text || ''
              usage = {
                prompt_tokens: normalizedResult.usageMetadata?.promptTokenCount || 0,
                completion_tokens: normalizedResult.usageMetadata?.candidatesTokenCount || 0,
                total_tokens: normalizedResult.usageMetadata?.totalTokenCount || 0
              }
              break
            default:
              // Universal fallback extraction
              content = normalizedResult.content || 
                       normalizedResult.choices?.[0]?.message?.content ||
                       normalizedResult.candidates?.[0]?.content?.parts?.[0]?.text ||
                       ''
              usage = normalizedResult.usage || normalizedResult.usageMetadata || usage
          }
          
          // Log successful call with comprehensive stats
          const finalTokens = apiManager.getTokenCount(provider, { 
            ...apiOptions, 
            messages: [...apiOptions.messages, { role: 'assistant', content }] 
          })
          
          return {
            model: modelId,
            provider,
            content,
            usage,
            timestamp: new Date().toISOString(),
            validation: {
              isValid: validation.isValid,
              warnings: validation.warnings
            },
            estimatedTokens: estimatedTokens.total,
            actualTokens: usage.total_tokens || finalTokens.total,
            rateLimitStatus: apiManager.getRateLimitStatus(provider)
          }
        } catch (error) {
          console.error(`Error calling ${provider} API for model ${modelId}:`, error)
          
          // Get retry stats if available
          const retryStats = apiManager.getRetryStats(provider)
          
          return {
            model: modelId,
            provider,
            error: error instanceof Error ? error.message : 'Unknown error',
            usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
            retryStats: retryStats,
            timestamp: new Date().toISOString()
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