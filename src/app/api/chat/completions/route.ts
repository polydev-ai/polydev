import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../utils/supabase/server'
import { apiManager } from '../../../lib/api'
import crypto from 'crypto'
import { cookies } from 'next/headers'

async function authenticateRequest(request: NextRequest): Promise<{ user: any; preferences: any } | null> {
  const supabase = createClient()
  
  // Check for MCP API key in Authorization header
  const authorization = request.headers.get('Authorization')
  if (authorization?.startsWith('Bearer pd_')) {
    const apiKey = authorization.replace('Bearer ', '')
    const tokenHash = crypto.createHash('sha256').update(apiKey).digest('hex')
    
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
  // Map model names to providers
  if (model.includes('gpt') || model.includes('openai')) return 'openai'
  if (model.includes('claude')) return 'anthropic'
  if (model.includes('gemini')) return 'google'
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
    const supabase = createClient()
    
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
          // Prepare API call options
          const apiOptions = {
            messages: messages.map((msg: any) => ({
              role: msg.role,
              content: msg.content
            })),
            model: modelId,
            temperature,
            maxTokens: max_tokens,
            stream: false, // For now, handle streaming separately
            apiKey: providerKey.apiKey,
            baseUrl: providerKey.baseUrl
          }
          
          // Make API call through our provider system
          const response = await apiManager.createMessage(provider, apiOptions)
          const result = await response.json()
          
          if (!response.ok) {
            throw new Error(result.error?.message || 'API call failed')
          }
          
          // Extract response based on provider format
          let content = ''
          let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
          
          if (provider === 'anthropic') {
            content = result.content?.[0]?.text || ''
            usage = {
              prompt_tokens: result.usage?.input_tokens || 0,
              completion_tokens: result.usage?.output_tokens || 0,
              total_tokens: (result.usage?.input_tokens || 0) + (result.usage?.output_tokens || 0)
            }
          } else if (provider === 'openai' || provider === 'groq' || provider === 'deepseek') {
            content = result.choices?.[0]?.message?.content || ''
            usage = result.usage || usage
          } else if (provider === 'google') {
            content = result.candidates?.[0]?.content?.parts?.[0]?.text || ''
            usage = {
              prompt_tokens: result.usageMetadata?.promptTokenCount || 0,
              completion_tokens: result.usageMetadata?.candidatesTokenCount || 0,
              total_tokens: result.usageMetadata?.totalTokenCount || 0
            }
          }
          
          return {
            model: modelId,
            content,
            usage,
            timestamp: new Date().toISOString()
          }
        } catch (error) {
          console.error(`Error calling ${provider} API for model ${modelId}:`, error)
          return {
            model: modelId,
            error: error instanceof Error ? error.message : 'Unknown error',
            usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
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
        id: `chatcmpl-${crypto.randomBytes(16).toString('hex')}`,
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