import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/app/utils/supabase/server'
import { apiManager } from '@/lib/api'
import { createHash, randomBytes } from 'crypto'
import { cookies } from 'next/headers'
import { modelsDevService } from '@/lib/models-dev-integration'
import { ResponseValidator } from '@/lib/api/utils/response-validator'
import { computeCostUSD } from '@/utils/modelUtils'
import { checkQuotaMiddleware, deductQuotaMiddleware, generateSessionId, extractUsageFromResponse, calculateEstimatedCost } from '@/lib/api/middleware/quota-middleware'
import { getModelTier } from '@/lib/model-tiers'
import { normalizeProviderName } from '@/lib/provider-utils'
// OpenRouterManager available if we later switch to per-user keys

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
  
  // Handle Groq-specific responses where usage might be missing but content exists
  if (response.choices && response.choices[0]?.message?.content && !response.usage) {
    const content = response.choices[0].message.content
    // Estimate tokens for Groq when usage is missing (common for kimi-k2-instruct)
    const estimatedCompletionTokens = Math.ceil(content.length * 0.25) // ~4 chars per token
    const estimatedPromptTokens = Math.ceil(200 * 0.25) // Rough estimate for typical prompt
    const usage = {
      prompt_tokens: estimatedPromptTokens,
      completion_tokens: estimatedCompletionTokens,
      total_tokens: estimatedPromptTokens + estimatedCompletionTokens
    }
    console.log(`[parseUsageData] Groq response missing usage data, estimated from content:`, usage)
    return usage
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
  
  // Final fallback: If we have any content but no usage, estimate tokens
  let fallbackContent = null
  
  // Try to extract content for estimation
  if (response.choices?.[0]?.message?.content) {
    fallbackContent = response.choices[0].message.content
  } else if (response.content?.[0]?.text) {
    fallbackContent = response.content[0].text
  } else if (typeof response === 'string') {
    fallbackContent = response
  } else if (response.candidates?.[0]?.content?.parts) {
    const parts = Array.isArray(response.candidates[0].content.parts) 
      ? response.candidates[0].content.parts 
      : [response.candidates[0].content.parts]
    fallbackContent = parts.map((p: any) => p?.text || '').join('')
  }
  
  if (fallbackContent && fallbackContent.length > 0) {
    const estimatedCompletionTokens = Math.ceil(fallbackContent.length * 0.25)
    const estimatedPromptTokens = Math.ceil(200 * 0.25) // Conservative estimate
    const usage = {
      prompt_tokens: estimatedPromptTokens,
      completion_tokens: estimatedCompletionTokens,
      total_tokens: estimatedPromptTokens + estimatedCompletionTokens
    }
    console.log(`[parseUsageData] No usage data found, estimated from fallback content:`, usage)
    return usage
  }
  
  console.log(`[parseUsageData] No usage data found and no content to estimate from`)
  // Return null if no usage data found and no content to estimate from
  return null
}

async function authenticateRequest(request: NextRequest): Promise<{ user: any } | null> {
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

    return {
      user: { id: token.user_id }
    }
  }

  // Check for web session
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return null
  }

  return {
    user
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

async function getProviderFromModel(model: string, supabase: any, userId: string): Promise<string> {
  try {
    // FIRST: Check if this model is from admin-provided keys via model_tiers
    const { data: modelTier, error: tierError } = await supabase
      .from('model_tiers')
      .select('provider, tier, id')
      .eq('model_name', model)
      .eq('active', true)
      .maybeSingle()

    if (modelTier) {
      // Return the provider directly from model_tiers
      // This provider indicates which admin API key to use
      const normalizedProvider = normalizeProviderName(modelTier.provider)
      console.log(`[Model Routing] Found model ${model} in model_tiers, using admin key via provider: ${normalizedProvider}`)
      return normalizedProvider
    }

    if (tierError) {
      console.error(`[Model Routing] Error checking model_tiers for ${model}:`, tierError)
    } else {
      console.log(`[Model Routing] Model ${model} not found in model_tiers, checking models_registry`)
    }

    // SECOND: Check models_registry for user's personal API keys
    const { data: modelProviders } = await supabase
      .from('models_registry')
      .select('provider_id')
      .eq('friendly_id', model)
      .eq('is_active', true)

    if (!modelProviders || modelProviders.length === 0) {
      console.log(`[Model Routing] No providers found for model: ${model} in models_registry, using openrouter fallback`)
      return 'openrouter' // Default fallback
    }

    // Get user's API keys to determine which providers they have configured
    const { data: userApiKeys } = await supabase
      .from('user_api_keys')
      .select('provider, default_model, display_order, active')
      .eq('user_id', userId)
      .eq('active', true)
      .eq('is_admin_key', false) // Only personal keys here

    if (userApiKeys && userApiKeys.length > 0) {
      // Check if any user's API key has this model as default_model
      for (const apiKey of userApiKeys) {
        const normalizedProvider = normalizeProviderName(apiKey.provider)
        if (apiKey.default_model === model) {
          // Verify this provider actually supports the model in registry
          const isProviderInRegistry = modelProviders.some((mp: any) =>
            normalizeProviderName(mp.provider_id) === normalizedProvider
          )

          if (isProviderInRegistry) {
            console.log(`Found user preferred provider for ${model}: ${normalizedProvider}`)
            return normalizedProvider
          }
        }
      }

      // If no direct match, check if any configured provider supports this model
      const userProviders = userApiKeys
        .map((key: any) => normalizeProviderName(key.provider))
        .sort((a: string, b: string) => {
          const aApiKey = userApiKeys.find((k: any) => normalizeProviderName(k.provider) === a)
          const bApiKey = userApiKeys.find((k: any) => normalizeProviderName(k.provider) === b)
          return (aApiKey?.display_order ?? 999) - (bApiKey?.display_order ?? 999)
        })

      for (const userProvider of userProviders) {
        const isProviderInRegistry = modelProviders.some((mp: any) =>
          normalizeProviderName(mp.provider_id) === userProvider
        )

        if (isProviderInRegistry) {
          console.log(`Found configured provider for ${model}: ${userProvider}`)
          return userProvider
        }
      }
    }

    // If no user API key found, return the first provider from the registry
    const firstProvider = modelProviders[0].provider_id
    console.log(`Using first available provider for ${model}: ${firstProvider}`)
    return firstProvider
  } catch (error) {
    console.error(`Error determining provider for model ${model}:`, error)
    return 'openrouter' // Safe fallback
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
    
    const { user } = authResult
    const supabase = await createClient()

    // Parse request body - support both OpenAI format and Polydev format
    const body = await request.json()
    let { messages, model, models, temperature = 0.7, max_tokens = 65536, reasoning_effort } = body
    stream = body.stream || false

    // Generate session ID for quota tracking
    const sessionId = generateSessionId()
    
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
      // No model specified - get models from user's configured API keys
      const { data: userApiKeys } = await supabase
        .from('user_api_keys')
        .select('provider, default_model, display_order, active')
        .eq('user_id', user.id)
        .eq('active', true)
        .order('display_order', { ascending: true })

      if (!userApiKeys || userApiKeys.length === 0) {
        throw new Error('No model specified and no API keys configured. Please set up models at https://www.polydev.ai/dashboard/models')
      }

      // Use all default models from configured API keys
      targetModels = userApiKeys
        .filter(key => key.default_model)
        .map(key => key.default_model)

      if (targetModels.length === 0) {
        throw new Error('No default models configured in API keys. Please set up models at https://www.polydev.ai/dashboard/models')
      }
    }

    // Get user preferences for perspectives per message
    const { data: userPrefs } = await supabase
      .from('user_preferences')
      .select('mcp_settings')
      .eq('user_id', user.id)
      .single()

    const perspectivesPerMessage = (userPrefs?.mcp_settings as any)?.perspectives_per_message || 2

    // Limit models to perspectives_per_message if not explicitly provided
    if (!model && !models) {
      // User didn't specify models - limit to perspectives setting
      targetModels = targetModels.slice(0, perspectivesPerMessage)
    }

    // Get tier priority and prefer_own_keys setting
    const tierPriority = (userPrefs?.mcp_settings as any)?.tier_priority || ['normal', 'eco', 'premium']
    const providerPriority = (userPrefs?.mcp_settings as any)?.provider_priority || []
    const preferOwnKeys = (userPrefs as any)?.prefer_own_keys || false
    const useCliTools = (userPrefs?.mcp_settings as any)?.use_cli_tools !== false

    // MCP CLIENT DETECTION: Detect which MCP client is making this request
    // and exclude that client's CLI provider to prevent circular loops
    const userAgent = request.headers.get('user-agent') || ''
    const xRequestSource = request.headers.get('x-request-source') || ''
    const xClientSource = request.headers.get('x-client-source') || ''

    let excludedCliProvider: string | null = null

    // Map MCP client signatures to their CLI provider IDs
    const mcpClientMappings: Record<string, string> = {
      'claude-code': 'claude_code',
      'cline': 'cline',
      'codex': 'codex_cli',
      'cursor': 'cursor',
      'continue': 'continue',
      'aider': 'aider'
    }

    // Check user-agent and headers for MCP client signatures
    const detectedClient = Object.keys(mcpClientMappings).find(client =>
      userAgent.toLowerCase().includes(client) ||
      xClientSource.toLowerCase().includes(client) ||
      xRequestSource.toLowerCase().includes(client)
    )

    if (detectedClient) {
      excludedCliProvider = mcpClientMappings[detectedClient]
      console.log(`[MCP Detection] Detected MCP client: ${detectedClient}, excluding CLI provider: ${excludedCliProvider}`)
    }

    // PRIORITY SYSTEM: CLI > USER API KEYS > ADMIN API KEYS > CREDITS

    // Step 1: Get all CLI configurations (excluding detected MCP client to prevent circular loops)
    let cliQuery = supabase
      .from('cli_provider_configurations')
      .select('provider, custom_path, enabled, status')
      .eq('user_id', user.id)
      .eq('enabled', true)
      .eq('status', 'available')
      .in('provider', ['claude_code', 'codex_cli', 'gemini_cli'])

    // Exclude the MCP client's own CLI provider if detected
    if (excludedCliProvider) {
      cliQuery = cliQuery.neq('provider', excludedCliProvider)
    }

    // Skip CLI configs entirely if user disabled CLI tools
    const { data: cliConfigs } = useCliTools ? await cliQuery : { data: [] }
    
    // Step 2: Get user's own API keys (exclude admin-provided keys)
    const { data: apiKeys } = await supabase
      .from('user_api_keys')
      .select('id, provider, encrypted_key, api_base, active')
      .eq('user_id', user.id)
      .eq('is_admin_key', false)
      .eq('active', true)

    // Step 2.5: Get admin-provided API keys (from user_api_keys with is_admin_key = true)
    // Use service role client to bypass RLS since admin keys are global
    const supabaseAdmin = createAdminClient()
    const { data: adminKeys, error: adminKeysError } = await supabaseAdmin
      .from('user_api_keys')
      .select('id, provider, encrypted_key, api_base, active, priority_order')
      .eq('is_admin_key', true)
      .eq('active', true)
      .order('priority_order', { ascending: true })

    if (adminKeysError) {
      console.error('[Admin Keys] Error fetching admin keys:', adminKeysError)
    } else {
      console.log('[Admin Keys] Fetched admin keys:', adminKeys?.map(k => ({ provider: k.provider, active: k.active })))
    }

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
    const providerConfigs: Record<string, { cli?: any, api?: any, admin?: any }> = {}

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
          customPath: cli.custom_path,
          sourceType: 'user_cli'
        }
      }
    })

    // Process user API key configurations
    ;(apiKeys || []).forEach(key => {
      const providerKey = normalizeProviderName(key.provider)

      if (!providerConfigs[providerKey]) {
        providerConfigs[providerKey] = {}
      }
      providerConfigs[providerKey].api = {
        type: 'api',
        priority: 2,
        apiKey: atob(key.encrypted_key),
        baseUrl: key.api_base,
        keyId: key.id,
        sourceType: 'user_key'
      }
    })

    // Process admin-provided API keys (priority 3 - before credits)
    ;(adminKeys || []).forEach(key => {
      const providerKey = normalizeProviderName(key.provider)

      if (!providerConfigs[providerKey]) {
        providerConfigs[providerKey] = {}
      }
      providerConfigs[providerKey].admin = {
        type: 'admin',
        priority: 3,
        apiKey: atob(key.encrypted_key),
        baseUrl: key.api_base,
        keyId: key.id,
        sourceType: 'admin_key'
      }
      console.log(`[Admin Keys] Added admin config for provider: ${providerKey}`)
    })

    console.log('[Provider Configs] Final provider configs:', Object.keys(providerConfigs).map(p => ({
      provider: p,
      hasCli: !!providerConfigs[p].cli,
      hasApi: !!providerConfigs[p].api,
      hasAdmin: !!providerConfigs[p].admin
    })))
    
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

    // Helper to determine provider source for a model (used for quota checking)
    const getProviderSourceType = async (modelId: string): Promise<'cli' | 'user_key' | 'admin_key' | 'admin_credits' | null> => {
      const requiredProvider = await getProviderFromModel(modelId, supabase, user.id)

      // Check in priority order
      if (providerConfigs[requiredProvider]?.cli) return 'cli'
      if (providerConfigs[requiredProvider]?.api) return 'user_key'
      if (providerConfigs[requiredProvider]?.admin) return 'admin_key'

      // Check OpenRouter special case
      if (requiredProvider === 'openrouter' && providerConfigs['openrouter']?.api) return 'user_key'

      // Check credits availability
      if (totalCredits > 0) {
        const openrouterModelId = await resolveProviderModelId(modelId, 'openrouter')
        if (openrouterModelId !== modelId) return 'admin_credits'
      }

      return null
    }

    // QUOTA CHECK: Only check quota for admin-provided sources (admin_key and admin_credits)
    // CLI and user API keys bypass quota checks
    const resolvedModels: string[] = []

    // Get all available models from model_tiers table for tier fallback
    const { data: availableModels } = await supabase
      .from('model_tiers')
      .select('tier, provider, model_name, display_name')
      .eq('active', true)

    // Build lookup map: tier -> provider -> model for fallback
    const modelsByTierAndProvider = new Map<string, Map<string, any>>()
    for (const model of availableModels || []) {
      if (!modelsByTierAndProvider.has(model.tier)) {
        modelsByTierAndProvider.set(model.tier, new Map())
      }
      modelsByTierAndProvider.get(model.tier)!.set(model.provider.toLowerCase(), model)
    }

    for (const modelName of targetModels) {
      const sourceType = await getProviderSourceType(modelName)

      // Skip quota check for CLI and user API keys
      if (sourceType === 'cli' || sourceType === 'user_key') {
        resolvedModels.push(modelName)
        continue
      }

      // If prefer_own_keys is enabled, skip admin sources
      if (preferOwnKeys && (sourceType === 'admin_key' || sourceType === 'admin_credits')) {
        // Skip this model - user wants own keys only
        continue
      }

      // Check quota only for admin sources
      if (sourceType === 'admin_key' || sourceType === 'admin_credits') {
        const quotaCheck = await checkQuotaMiddleware(request, user.id, modelName)

        if (!quotaCheck.allowed) {
          // Quota exceeded - try tier fallback
          const modelInfo = getModelTier(modelName)
          if (modelInfo) {
            const currentTierIndex = tierPriority.indexOf(modelInfo.tier)
            let fallbackModel: string | null = null

            // Try each tier in priority order (skip current tier)
            for (let i = currentTierIndex + 1; i < tierPriority.length; i++) {
              const fallbackTier = tierPriority[i]
              const tierModels = modelsByTierAndProvider.get(fallbackTier)

              if (tierModels) {
                // Try providers in priority order
                for (const provider of providerPriority) {
                  const model = tierModels.get(provider)
                  if (model) {
                    // Check if this fallback model has quota
                    const fallbackSourceType = await getProviderSourceType(model.model_name)
                    if (fallbackSourceType === 'admin_key' || fallbackSourceType === 'admin_credits') {
                      const fallbackQuotaCheck = await checkQuotaMiddleware(request, user.id, model.model_name)
                      if (fallbackQuotaCheck.allowed) {
                        fallbackModel = model.model_name
                        break
                      }
                    } else if (fallbackSourceType === 'cli' || fallbackSourceType === 'user_key') {
                      // User key or CLI available for this fallback - use it without quota check
                      fallbackModel = model.model_name
                      break
                    }
                  }
                }

                // If no provider match, try first available model in tier
                if (!fallbackModel && tierModels.size > 0) {
                  for (const model of Array.from(tierModels.values())) {
                    const fallbackSourceType = await getProviderSourceType(model.model_name)
                    if (fallbackSourceType === 'admin_key' || fallbackSourceType === 'admin_credits') {
                      const fallbackQuotaCheck = await checkQuotaMiddleware(request, user.id, model.model_name)
                      if (fallbackQuotaCheck.allowed) {
                        fallbackModel = model.model_name
                        break
                      }
                    } else if (fallbackSourceType === 'cli' || fallbackSourceType === 'user_key') {
                      fallbackModel = model.model_name
                      break
                    }
                  }
                }

                if (fallbackModel) break
              }
            }

            if (fallbackModel) {
              resolvedModels.push(fallbackModel)
            } else {
              // No fallback available with quota - return error
              return quotaCheck.response
            }
          } else {
            // Unknown model tier - return quota error
            return quotaCheck.response
          }
        } else {
          // Quota available - use original model
          resolvedModels.push(modelName)
        }
      } else {
        // No source available for this model
        resolvedModels.push(modelName)
      }
    }

    // Replace targetModels with quota-checked and fallback-resolved models
    targetModels = resolvedModels

    let currentSessionId: string | null = null // For chat history tracking

    // If client requested streaming, stream incrementally per provider/model
    if (stream) {
      const encoder = new TextEncoder()

      // Helper to choose provider + config for a model (CLI > User API > Admin API > OpenRouter credits)
      const selectProviderForModel = async (modelId: string) => {
        const requiredProvider = await getProviderFromModel(modelId, supabase, user.id)
        let selectedProvider: string | null = null
        let selectedConfig: any = null
        let fallbackMethod: 'cli' | 'api' | 'admin' | 'credits' = 'api'
        let actualModelId = modelId

        // Priority 1: CLI tools
        if (providerConfigs[requiredProvider]?.cli) {
          selectedProvider = requiredProvider
          selectedConfig = providerConfigs[requiredProvider].cli
          fallbackMethod = 'cli'
          actualModelId = await resolveProviderModelId(modelId, requiredProvider)
        }

        // Priority 2: User API keys
        if (!selectedProvider && providerConfigs[requiredProvider]?.api) {
          selectedProvider = requiredProvider
          selectedConfig = providerConfigs[requiredProvider].api
          fallbackMethod = 'api'
          actualModelId = await resolveProviderModelId(modelId, requiredProvider)
        }

        // Priority 3: Admin system API keys
        if (!selectedProvider && providerConfigs[requiredProvider]?.admin) {
          selectedProvider = requiredProvider
          selectedConfig = providerConfigs[requiredProvider].admin
          fallbackMethod = 'admin'
          actualModelId = await resolveProviderModelId(modelId, requiredProvider)
        }

        // Special handling for OpenRouter
        if (!selectedProvider && requiredProvider === 'openrouter' && providerConfigs['openrouter']?.api) {
          selectedProvider = 'openrouter'
          selectedConfig = providerConfigs['openrouter'].api
          fallbackMethod = 'api'
          actualModelId = await resolveProviderModelId(modelId, 'openrouter')
        }

        // Priority 4: OpenRouter credits (admin-provided fallback)
        if (!selectedProvider && totalCredits > 0) {
          const openrouterModelId = await resolveProviderModelId(modelId, 'openrouter')
          if (openrouterModelId !== modelId) {
            selectedProvider = 'openrouter'
            selectedConfig = { type: 'credits', priority: 4, apiKey: process.env.OPENROUTER_ORG_KEY || process.env.OPENROUTER_API_KEY || '', baseUrl: 'https://openrouter.ai/api/v1', sourceType: 'admin_credits' }
            fallbackMethod = 'credits'
            actualModelId = openrouterModelId
          }
        }

        return { requiredProvider, selectedProvider, selectedConfig, fallbackMethod, actualModelId }
      }

      // Per-model collectors
      const collected: Record<string, { content: string; usage: any; provider: string; fallback?: string; modelResolved?: string; creditsUsed?: number; cost?: { input_cost: number; output_cost: number; total_cost: number }; providerSourceId?: string; sourceType?: string }> = {}
      targetModels.forEach((m) => { collected[m] = { content: '', usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }, provider: 'unknown' } })

      const streamingResponse = new ReadableStream({
        start(controller) {
          const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
          const CHUNK_SIZE = 32 // characters
          const CADENCE_MS = 16 // flush every ~1 frame

          // Kick off all model streams concurrently
          const tasks = targetModels.map(async (friendlyModelId) => {
            try {
              let { requiredProvider, selectedProvider, selectedConfig, fallbackMethod, actualModelId } = await selectProviderForModel(friendlyModelId)
              if (!selectedProvider) {
                // Provider selection failed – clarify if credits can't support due to missing OpenRouter mapping
                let message = 'No available provider'
                try {
                  if (totalCredits > 0) {
                    const openrouterId = await resolveProviderModelId(friendlyModelId, 'openrouter')
                    if (openrouterId === friendlyModelId) {
                      message = `Polydev credits can't support this model without API keys (no OpenRouter mapping for ${friendlyModelId}).`
                    }
                  }
                } catch {}
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', model: friendlyModelId, message, provider: requiredProvider })}\n\n`))
                return
              }

              // Build API options for streaming (clamp to model limits when available)
              let apiOptions: any = {
                messages: messages.map((msg: any) => ({ role: msg.role, content: msg.content })),
                model: actualModelId,
                temperature,
                maxTokens: max_tokens,
                stream: true,
                apiKey: selectedConfig.apiKey,
                metadata: { applicationName: 'https://www.polydev.ai', siteUrl: 'Polydev Multi-LLM Platform' }
              }

              // Clamp maxTokens to model limits from models.dev when available
              try {
                const limits = await modelsDevService.getModelLimits(friendlyModelId, requiredProvider)
                if (limits?.maxTokens && Number.isFinite(limits.maxTokens)) {
                  apiOptions.maxTokens = Math.min(apiOptions.maxTokens || limits.maxTokens, limits.maxTokens)
                }
              } catch {}

              // GPT-5 quirk
              if (friendlyModelId === 'gpt-5' || friendlyModelId.includes('gpt-5')) {
                apiOptions.max_completion_tokens = apiOptions.maxTokens || max_tokens
                delete apiOptions.maxTokens
              }

              // Base URL mapping if present
              try {
                const apiProviderConfig = await apiManager.getProviderConfiguration(selectedProvider)
                if (selectedConfig.baseUrl && apiProviderConfig) {
                  if (apiProviderConfig.baseUrlProperty) {
                    apiOptions[apiProviderConfig.baseUrlProperty] = selectedConfig.baseUrl
                  } else {
                    switch (selectedProvider) {
                      case 'openai':
                      case 'groq':
                      case 'deepseek':
                      case 'mistral':
                        apiOptions.openAiBaseUrl = selectedConfig.baseUrl
                        break
                      default:
                        break
                    }
                  }
                }
              } catch (e) {
                console.warn(`[warn] Base URL mapping failed for ${selectedProvider} ${actualModelId}:`, e)
              }

              // Start provider stream
              let upstream: ReadableStream
              try {
                // For OpenAI-compatible providers, request usage in the final streamed chunk
                if (['openai','openrouter','groq','deepseek','mistral','xai'].includes(selectedProvider)) {
                  (apiOptions as any).streamOptions = { include_usage: true }
                  ;(apiOptions as any).stream_options = { include_usage: true }
                }
                upstream = await apiManager.streamMessage(selectedProvider, apiOptions)
              } catch (err: any) {
                console.error(`[error] Stream start failed for ${selectedProvider} ${actualModelId}:`, err?.message || err)

                // Check if this is a 401 error and we have credits available for retry
                const is401Error = err?.message?.includes('401') || err?.message?.includes('Unauthorized') || err?.message?.includes('No auth credentials')
                if (is401Error && fallbackMethod !== 'credits' && totalCredits > 0) {
                  console.log(`[401 Retry] Attempting to retry ${friendlyModelId} with credits after 401 error`)

                  try {
                    // Try to get OpenRouter model ID for credits fallback
                    const openrouterModelId = await resolveProviderModelId(friendlyModelId, 'openrouter')
                    if (openrouterModelId !== friendlyModelId) {
                      // Update to use credits
                      selectedProvider = 'openrouter'
                      selectedConfig = {
                        type: 'credits',
                        priority: 3,
                        apiKey: process.env.OPENROUTER_ORG_KEY || process.env.OPENROUTER_API_KEY || '',
                        baseUrl: 'https://openrouter.ai/api/v1'
                      }
                      fallbackMethod = 'credits'
                      actualModelId = openrouterModelId

                      // Update API options for credits retry
                      apiOptions = {
                        messages: messages.map((msg: any) => ({ role: msg.role, content: msg.content })),
                        model: actualModelId,
                        temperature,
                        maxTokens: max_tokens,
                        stream: true,
                        apiKey: selectedConfig.apiKey,
                        metadata: { applicationName: 'https://www.polydev.ai', siteUrl: 'Polydev Multi-LLM Platform' }
                      }

                      // Apply OpenAI-compatible streaming options for OpenRouter
                      ;(apiOptions as any).streamOptions = { include_usage: true }
                      ;(apiOptions as any).stream_options = { include_usage: true }

                      console.log(`[401 Retry] Retrying ${friendlyModelId} -> ${actualModelId} on OpenRouter with credits`)
                      upstream = await apiManager.streamMessage(selectedProvider, apiOptions)

                      // Update collected info to reflect the credits fallback
                      collected[friendlyModelId].provider = selectedProvider
                      collected[friendlyModelId].fallback = fallbackMethod
                    } else {
                      // No OpenRouter mapping available
                      console.error(`[401 Retry] No OpenRouter mapping available for ${friendlyModelId}`)
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', model: friendlyModelId, message: `API key failed and no credits mapping available for ${friendlyModelId}`, provider: selectedProvider })}\n\n`))
                      return
                    }
                  } catch (retryErr: any) {
                    console.error(`[401 Retry] Credits retry failed for ${friendlyModelId}:`, retryErr?.message || retryErr)
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', model: friendlyModelId, message: `API key failed and credits retry failed: ${retryErr?.message || 'Unknown error'}`, provider: selectedProvider })}\n\n`))
                    return
                  }
                } else {
                  // Not a 401 error or no credits available
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', model: friendlyModelId, message: err?.message || 'Stream error', provider: selectedProvider })}\n\n`))
                  return
                }
              }

              collected[friendlyModelId].provider = selectedProvider
              collected[friendlyModelId].fallback = fallbackMethod
              collected[friendlyModelId].providerSourceId = selectedConfig?.keyId
              collected[friendlyModelId].sourceType = selectedConfig?.sourceType

              // Metrics for latency
              const modelStart = Date.now()
              let firstTokenAt: number | null = null

              const reader = upstream.getReader()
              const textDecoder = new TextDecoder()
              let buf = ''

              const emitContentChunks = async (text: string) => {
                if (!text) return
                if (text.length <= CHUNK_SIZE) {
                  const contentEvent = { type: 'content', model: friendlyModelId, content: text, provider: selectedProvider, fallback_method: fallbackMethod }
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(contentEvent)}\n\n`))
                  return
                }
                for (let i = 0; i < text.length; i += CHUNK_SIZE) {
                  const piece = text.slice(i, i + CHUNK_SIZE)
                  const contentEvent = { type: 'content', model: friendlyModelId, content: piece, provider: selectedProvider, fallback_method: fallbackMethod }
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(contentEvent)}\n\n`))
                  await sleep(CADENCE_MS)
                }
              }
              while (true) {
                const { done, value } = await reader.read()
                if (done) {
                  // Flush any remaining buffered line
                  if (buf && buf.trim().length) {
                    try {
                      const item = JSON.parse(buf.trim())
                      if (item?.type === 'content' && item.content) {
                        if (!firstTokenAt) firstTokenAt = Date.now()
                        collected[friendlyModelId].content += item.content
                        await emitContentChunks(item.content)
                      } else if (item?.type === 'usage' && item.usage) {
                        collected[friendlyModelId].usage = item.usage
                      }
                    } catch {}
                  }
                  break
                }
                buf += textDecoder.decode(value, { stream: true })
                let idx
                while ((idx = buf.indexOf('\n')) >= 0) {
                  const line = buf.slice(0, idx)
                  buf = buf.slice(idx + 1)
                  if (!line) continue
                  try {
                    const item = JSON.parse(line)
                    if (item?.type === 'content' && item.content) {
                      if (!firstTokenAt) firstTokenAt = Date.now()
                      collected[friendlyModelId].content += item.content
                      await emitContentChunks(item.content)
                    } else if (item?.type === 'usage' && item.usage) {
                      collected[friendlyModelId].usage = item.usage
                    }
                    if (item?.type === 'done') {
                      // End of this model's stream
                    }
                  } catch {}
                }
              }

              // Save latency metrics
              ;(collected as any)[friendlyModelId].responseTimeMs = Date.now() - modelStart

              // If no usage in stream, optionally make a non-streaming call to fetch usage
              // OpenAI & other OpenAI-compatible providers: skip the post-stream usage call to avoid second-billing; estimate tokens instead
              try {
                if (['openai','openrouter','groq','deepseek','mistral','xai'].includes(selectedProvider)) {
                  if (!collected[friendlyModelId].usage || collected[friendlyModelId].usage.total_tokens === 0) {
                    const estimate = (text: string) => Math.ceil((text || '').length / 4)
                    const lastUser = messages[messages.length - 1]
                    const prompt_tokens = estimate(lastUser?.content || '')
                    const completion_tokens = estimate(collected[friendlyModelId].content || '')
                    collected[friendlyModelId].usage = {
                      prompt_tokens,
                      completion_tokens,
                      total_tokens: prompt_tokens + completion_tokens
                    }
                    collected[friendlyModelId].modelResolved = actualModelId
                  }
                } else {
                  const usageOptions = { ...apiOptions, stream: false }
                  const usageResp = await apiManager.createMessage(selectedProvider, usageOptions)
                  if (usageResp.ok) {
                    const ct = usageResp.headers.get('content-type') || ''
                    const payload = ct.includes('application/json') ? await usageResp.json() : await usageResp.text()
                    const usage = parseUsageData(payload) || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
                    collected[friendlyModelId].usage = usage
                    collected[friendlyModelId].modelResolved = (payload && (payload.model || payload?.choices?.[0]?.model)) || actualModelId

                    // Fallback content extraction if streaming yielded no content
                    if (!collected[friendlyModelId].content || collected[friendlyModelId].content.length === 0) {
                      let fallbackContent = ''
                      try {
                        if (typeof payload === 'object') {
                          // Google/Gemini format
                          if (payload.candidates?.[0]?.content?.parts) {
                            const parts = Array.isArray(payload.candidates[0].content.parts)
                              ? payload.candidates[0].content.parts
                              : [payload.candidates[0].content.parts]
                            fallbackContent = parts.map((p: any) => p?.text || '').join('')
                          }
                          // OpenAI-like format
                          else if (payload.choices?.[0]?.message?.content) {
                            fallbackContent = payload.choices[0].message.content
                          }
                        } else if (typeof payload === 'string') {
                          fallbackContent = payload
                        }
                      } catch {}

                      if (fallbackContent) {
                        collected[friendlyModelId].content = fallbackContent
                      }
                    }
                  }
                }
              } catch {}

              // Compute cost if possible and set credits_used properly from models.dev pricing
              try {
                // When using credits (OpenRouter), use openrouter for pricing data
                const pricingProvider = selectedConfig?.type === 'credits' ? 'openrouter' : (requiredProvider || selectedProvider)
                const resolvedModel = collected[friendlyModelId].modelResolved || actualModelId
                // Use the original friendly model id for pricing so mappings work
                const limits = await modelsDevService.getModelLimits(friendlyModelId, pricingProvider)
                const u = collected[friendlyModelId].usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
                if (limits?.pricing) {
                  const totalCost = computeCostUSD(u.prompt_tokens || 0, u.completion_tokens || 0, limits.pricing.input, limits.pricing.output)
                  const inputCost = ((u.prompt_tokens || 0) / 1_000_000) * limits.pricing.input
                  const outputCost = ((u.completion_tokens || 0) / 1_000_000) * limits.pricing.output
                  collected[friendlyModelId].cost = { input_cost: inputCost, output_cost: outputCost, total_cost: totalCost }
                  if (selectedConfig?.type === 'credits') {
                    collected[friendlyModelId].creditsUsed = totalCost
                  }
                } else if (selectedConfig?.type === 'credits') {
                  // No pricing info; as a safe fallback don't deduct blindly
                  collected[friendlyModelId].creditsUsed = 0
                }
              } catch (e) {
                // Leave cost/credits undefined on failure
              }
            } catch (err: any) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', model: friendlyModelId, message: err?.message || 'Provider error' })}\n\n`))
            }
          })

          // When all tasks finish, emit final and close + persist
          ;(async () => {
            await Promise.all(tasks)

            // Build final responses array
            const finalResponses = targetModels.map((m) => ({
              model: m,
              content: collected[m].content || '',
              provider: collected[m].provider,
              usage: collected[m].usage,
              cost: collected[m].cost,
              fallback_method: collected[m].fallback,
              credits_used: collected[m].creditsUsed || 0,
              response_time_ms: (collected as any)[m]?.responseTimeMs || undefined,
              providerSourceId: collected[m].providerSourceId,
              sourceType: collected[m].sourceType
            }))

            // QUOTA DEDUCTION: Deduct perspectives for successful responses
            try {
              for (const response of finalResponses) {
                if (response.content && response.usage) {
                  const usage = extractUsageFromResponse(response)
                  const estimatedCost = response.cost?.total_cost || calculateEstimatedCost(response.model, usage.inputTokens, usage.outputTokens)

                  await deductQuotaMiddleware(
                    user.id,
                    response.model,
                    sessionId,
                    usage,
                    estimatedCost,
                    { messages, temperature, max_tokens },
                    { provider: response.provider, fallback_method: response.fallback_method },
                    response.providerSourceId,
                    response.sourceType as any
                  )
                }
              }
            } catch (quotaDeductionError) {
              console.error('Quota deduction error:', quotaDeductionError)
              // Don't fail the request due to quota deduction errors
            }

            // Persist chat history and logs
            try {
              const totalTokens = finalResponses.reduce((sum, r) => sum + (r.usage?.total_tokens || 0), 0)
              const totalCost = finalResponses.reduce((sum, r) => sum + ((r as any)?.cost?.total_cost || 0), 0)
              const totalCreditsUsedNow = finalResponses.reduce((sum, r) => sum + (r.credits_used || 0), 0)

              const sessionId = body.session_id
              currentSessionId = sessionId

              if (!currentSessionId) {
                const userMessage = messages[messages.length - 1]
                const autoTitle = userMessage.content.length > 50 ? userMessage.content.substring(0, 47) + '...' : userMessage.content
                const { data: newSession } = await supabase
                  .from('chat_sessions')
                  .insert({ user_id: user.id, title: autoTitle })
                  .select('id')
                  .single()
                currentSessionId = newSession?.id || null
              } else {
                const userMessage = messages[messages.length - 1]
                const { data: existingSession } = await supabase
                  .from('chat_sessions')
                  .select('title')
                  .eq('id', currentSessionId)
                  .single()
                if (existingSession && existingSession.title === 'New Chat') {
                  const autoTitle = userMessage.content.length > 50 ? userMessage.content.substring(0, 47) + '...' : userMessage.content
                  await supabase.from('chat_sessions').update({ title: autoTitle }).eq('id', currentSessionId)
                }
              }

              if (currentSessionId) {
                const userMessage = messages[messages.length - 1]
                await supabase.from('chat_messages').insert({ session_id: currentSessionId, role: 'user', content: userMessage.content })
                const assistantMessages = finalResponses
                  .filter(r => r && r.content)
                  .map(r => ({
                    session_id: currentSessionId,
                    role: 'assistant',
                    content: r.content,
                    model_id: r.model,
                    provider_info: r.provider ? { provider: r.provider, fallback_method: r.fallback_method } : null,
                    usage_info: r.usage || null,
                    cost_info: (r as any).cost || null,
                    metadata: (r.credits_used || r.fallback_method) ? { credits_used: r.credits_used || 0, fallback_method: r.fallback_method } : null
                  }))
                if (assistantMessages.length > 0) {
                  await supabase.from('chat_messages').insert(assistantMessages)
                }

                await supabase.from('chat_logs').insert({
                  user_id: user.id,
                  session_id: currentSessionId,
                  models_used: targetModels,
                  message_count: messages.length,
                  total_tokens: totalTokens,
                  total_cost: totalCost,
                  created_at: new Date().toISOString()
                })

                // Deduct credits using unified total balance (promo + purchased treated as one)
                if (totalCreditsUsedNow > 0 && userCredits) {
                  try {
                    const { data: creditRow } = await supabase
                      .from('user_credits')
                      .select('balance, promotional_balance')
                      .eq('user_id', user.id)
                      .single()
                    let promo = parseFloat((creditRow?.promotional_balance ?? 0).toString())
                    let bal = parseFloat((creditRow?.balance ?? 0).toString())
                    const total = Math.max(0, promo + bal)
                    const newTotal = Math.max(0, total - totalCreditsUsedNow)
                    // Keep fields consistent without prioritizing either bucket
                    let newPromo = Math.min(promo, newTotal)
                    let newBal = Math.max(0, newTotal - newPromo)
                    await supabase
                      .from('user_credits')
                      .update({ balance: newBal.toFixed(6), promotional_balance: newPromo.toFixed(6) })
                      .eq('user_id', user.id)
                  } catch (creditErr) {
                    console.warn('Failed to deduct user credits after streaming:', creditErr)
                  }
                }

                // Record analytics in usage_sessions
                try {
                  for (const r of finalResponses) {
                    const tps = r.usage && r.response_time_ms
                      ? (r.usage.completion_tokens || 0) / Math.max(0.001, (r.response_time_ms as number) / 1000)
                      : null
                    await supabase
                      .from('usage_sessions')
                      .insert({
                        user_id: user.id,
                        session_id: currentSessionId || null,
                        model_name: r.model,
                        provider: r.provider,
                        tokens_used: r.usage?.total_tokens || 0,
                        cost: r.cost?.total_cost || 0,
                        session_type: r.fallback_method === 'credits' ? 'credits' : (r.fallback_method === 'cli' ? 'cli' : 'api'),
                        metadata: {
                          app: 'Polydev Multi-LLM Platform',
                          prompt_tokens: r.usage?.prompt_tokens || 0,
                          completion_tokens: r.usage?.completion_tokens || 0,
                          input_cost: r.cost?.input_cost || 0,
                          output_cost: r.cost?.output_cost || 0,
                          response_time_ms: r.response_time_ms || 0,
                          tps: tps ? Number(tps.toFixed(1)) : null,
                          finish: 'stop',
                          fallback_method: r.fallback_method,
                          credits_used: r.credits_used || 0
                        }
                      })
                  }
                } catch (e) {
                  console.warn('Failed to record usage analytics:', e)
                }
              }
            } catch (e) {
              console.warn('Failed to save chat history/log interaction (streaming):', e)
            }

            // Emit final event expected by the UI plus a summary block
            const summary = {
              type: 'summary',
              totals: {
                tokens: finalResponses.reduce((sum, r) => sum + (r.usage?.total_tokens || 0), 0),
                cost: finalResponses.reduce((sum, r) => sum + ((r as any)?.cost?.total_cost || 0), 0)
              },
              responses: finalResponses.map(r => ({
                model: r.model,
                provider: r.provider,
                tokens_used: r.usage?.total_tokens || 0,
                cost: r.cost || null,
                fallback_method: r.fallback_method,
                credits_used: r.credits_used || 0
              }))
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(summary)}\n\n`))
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'final', responses: finalResponses })}\n\n`))
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          })()
        }
      })

      return new Response(streamingResponse, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no'
        }
      })
    }

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
          const openrouterModelId = await resolveProviderModelId(modelId, 'openrouter')
          if (openrouterModelId !== modelId) { // Only use credits if we have a mapping
            selectedProvider = 'openrouter'
            selectedConfig = {
              type: 'credits',
              priority: 3,
              apiKey: process.env.OPENROUTER_ORG_KEY || process.env.OPENROUTER_API_KEY || '',
              baseUrl: 'https://openrouter.ai/api/v1'
            }
            actualModelId = openrouterModelId
            fallbackMethod = 'credits'
          }
        }
        
        // If still nothing selected, emit a clear message when credits can't map this model
        if (!selectedProvider || !selectedConfig) {
          try {
            if (totalCredits > 0) {
              const openrouterId = await resolveProviderModelId(modelId, 'openrouter')
              if (openrouterId === modelId) {
                return {
                  model: modelId,
                  content: '',
                  usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
                  provider: 'N/A',
                  fallback_method: 'none',
                  error: `Polydev credits can't support this model without API keys (no OpenRouter mapping for ${modelId}).`,
                  providerSourceId: undefined,
                  sourceType: undefined
                }
              }
            }
          } catch {}
          return {
            model: modelId,
            content: '',
            usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
            provider: 'N/A',
            fallback_method: 'none',
            error: `No provider available for model: ${modelId}. Please configure API keys at https://www.polydev.ai/dashboard/models or ensure you have sufficient credits.`,
            providerSourceId: undefined,
            sourceType: undefined
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
            // When using credits (OpenRouter), use openrouter for pricing data
            const pricingProvider = selectedConfig?.type === 'credits' ? 'openrouter' : (requiredProvider || selectedProvider)
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
          // If credits were an option but no OpenRouter mapping exists for this model, surface a clear message
          try {
            if (totalCredits > 0) {
              const openrouterId = await resolveProviderModelId(modelId, 'openrouter')
              if (openrouterId === modelId) {
                return {
                  model: modelId,
                  error: `Polydev credits can't support this model without API keys (no OpenRouter mapping for ${modelId}).`,
                  usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
                  fallback_method: 'none'
                }
              }
            }
          } catch {}
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
                const totalCost = computeCostUSD(usage.prompt_tokens, usage.completion_tokens, modelPricing.input, modelPricing.output)
                const inputCost = (usage.prompt_tokens / 1000000) * modelPricing.input
                const outputCost = (usage.completion_tokens / 1000000) * modelPricing.output
                cost = {
                  input_cost: Number(inputCost.toFixed(6)),
                  output_cost: Number(outputCost.toFixed(6)),
                  total_cost: totalCost
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
                  
                  // Extract usage information from any chunk that has it
                  if (parsed.usage) {
                    finalUsage = parsed.usage
                    console.log(`[Streaming] Found usage in chunk for ${selectedProvider}:`, parsed.usage)
                  }
                  
                  // Extract model information
                  if (parsed.model) {
                    finalModel = parsed.model
                  }
                } catch (parseError) {
                  console.warn(`[Streaming] Failed to parse streaming chunk: ${chunk}`)
                }
              }
              
              // IMPORTANT: For OpenAI and other providers, usage data comes AFTER streaming is complete
              // Make a separate non-streaming call to get usage data if no usage found in streaming
              if (finalUsage.total_tokens === 0 && (selectedProvider === 'openai' || selectedProvider === 'anthropic' || modelId === 'kimi-k2-instruct')) {
                console.log(`[Streaming] No usage found in streaming chunks for ${selectedProvider}, making non-streaming call to get exact usage`)
                
                try {
                  // Make the same API call but without streaming to get usage data
                  const usageApiOptions = { ...apiOptions, stream: false }
                  const usageResponse = await apiManager.createMessage(selectedProvider, usageApiOptions)
                  
                  if (usageResponse.ok) {
                    const usageResult = await usageResponse.json()
                    const actualUsage = parseUsageData(usageResult)
                    if (actualUsage && actualUsage.total_tokens > 0) {
                      finalUsage = actualUsage
                      console.log(`[Streaming] Got exact usage from non-streaming call for ${selectedProvider}:`, finalUsage)
                    }
                  }
                } catch (usageError) {
                  console.warn(`[Streaming] Failed to get usage data from non-streaming call:`, usageError)
                }
              }
              
              // Only estimate as last resort if still no usage data
              if (finalUsage.total_tokens === 0 && finalContent) {
                console.log(`[Streaming] No usage found anywhere for ${selectedProvider}, estimating as last resort`)
                const estimatedTokens = Math.ceil(finalContent.length / 4) // Rough estimate: 4 chars per token
                finalUsage = {
                  prompt_tokens: Math.ceil(finalContent.length * 0.1), // Rough estimate for prompt
                  completion_tokens: estimatedTokens,
                  total_tokens: estimatedTokens + Math.ceil(finalContent.length * 0.1)
                }
                console.log(`[Streaming] Estimated usage for ${selectedProvider}:`, finalUsage)
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
            } else if (Array.isArray(result) && result.length > 0) {
              // Google/Gemini streaming array format
              console.log(`[Content Extraction] Processing Google streaming array with ${result.length} chunks`)
              let extractedContent = ''
              
              // Combine content from all chunks
              for (const chunk of result) {
                if (chunk?.candidates?.[0]?.content?.parts) {
                  const parts = Array.isArray(chunk.candidates[0].content.parts) ? chunk.candidates[0].content.parts : [chunk.candidates[0].content.parts]
                  for (const part of parts) {
                    if (part?.text) {
                      extractedContent += part.text
                    }
                  }
                }
              }
              
              content = extractedContent
              console.log(`[Content Extraction] Extracted ${content.length} characters from Google streaming array`)
            } else if (typeof result === 'string') {
              // Plain text response
              content = result
            } else {
              console.warn(`[warn] Unknown response format from ${selectedProvider}:`, result)
              console.warn(`[warn] Result type: ${typeof result}, Array: ${Array.isArray(result)}, Keys: ${Object.keys(result || {}).join(', ')}`)
              // Fallback - try to extract any text content instead of stringifying
              if (result && typeof result === 'object') {
                // Look for any text content in the response
                const findText = (obj: any): string => {
                  if (typeof obj === 'string') return obj
                  if (Array.isArray(obj)) {
                    for (const item of obj) {
                      const text = findText(item)
                      if (text) return text
                    }
                  }
                  if (obj && typeof obj === 'object') {
                    for (const [key, value] of Object.entries(obj)) {
                      if (key === 'text' && typeof value === 'string') return value
                      if (key === 'content' && typeof value === 'string') return value
                      if (key === 'message' && typeof value === 'string') return value
                      const text = findText(value)
                      if (text) return text
                    }
                  }
                  return ''
                }
                content = findText(result) || 'No readable content found in response'
              } else {
                content = 'Invalid response format received'
              }
            }
            
            // Calculate pricing if available
            const usage = parseUsageData(result) || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
            let cost = null
            console.log(`[DEBUG API Cost] Model: ${modelId}, Usage:`, usage, `ModelPricing:`, modelPricing)
            if (modelPricing && usage && (usage.prompt_tokens > 0 || usage.completion_tokens > 0)) {
              const totalCost = computeCostUSD(usage.prompt_tokens || 0, usage.completion_tokens || 0, modelPricing.input, modelPricing.output)
              const inputCost = ((usage.prompt_tokens || 0) / 1000000) * modelPricing.input
              const outputCost = ((usage.completion_tokens || 0) / 1000000) * modelPricing.output
              cost = {
                input_cost: Number(inputCost.toFixed(6)),
                output_cost: Number(outputCost.toFixed(6)),
                total_cost: totalCost
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
              fallback_method: fallbackMethod,
              providerSourceId: selectedConfig?.keyId,
              sourceType: selectedConfig?.sourceType
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
              metadata: { applicationName: 'https://www.polydev.ai', siteUrl: 'Polydev Multi-LLM Platform' }
            }
            
            // Add reasoning effort for reasoning models if supported
            if (modelData?.supports_reasoning && reasoning_effort) {
              apiOptions.reasoning_effort = reasoning_effort
            }
            
            // Make API call through OpenRouter provider (enhanced handler)
            response = await apiManager.createMessage('openrouter', apiOptions)
            
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
            
            // Compute cost using models.dev pricing when available
            const usageForCost = parseUsageData(result) || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
            const totalCostUsd = modelPricing ? 
              computeCostUSD(usageForCost.prompt_tokens || 0, usageForCost.completion_tokens || 0, modelPricing.input, modelPricing.output) : 0

            // Deduct credits using unified total balance (promo + purchased treated as one)
            if (selectedConfig.type === 'credits' && totalCostUsd > 0) {
              try {
                const { data: creditRow } = await supabase
                  .from('user_credits')
                  .select('balance, promotional_balance')
                  .eq('user_id', user.id)
                  .single()
                let promo = parseFloat((creditRow?.promotional_balance ?? 0).toString())
                let bal = parseFloat((creditRow?.balance ?? 0).toString())
                const total = Math.max(0, promo + bal)
                const newTotal = Math.max(0, total - totalCostUsd)
                let newPromo = Math.min(promo, newTotal)
                let newBal = Math.max(0, newTotal - newPromo)
                await supabase
                  .from('user_credits')
                  .update({ balance: newBal.toFixed(6), promotional_balance: newPromo.toFixed(6) })
                  .eq('user_id', user.id)
              } catch (creditErr) {
                console.warn('Failed to deduct user credits (non-stream):', creditErr)
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
              const totalCost = computeCostUSD(parsedUsage.prompt_tokens, parsedUsage.completion_tokens, modelPricing.input, modelPricing.output)
              const inputCost = (parsedUsage.prompt_tokens / 1000000) * modelPricing.input
              const outputCost = (parsedUsage.completion_tokens / 1000000) * modelPricing.output
              costInfo = {
                input_cost: inputCost,
                output_cost: outputCost,
                total_cost: totalCost
              }
            }
            
            return {
              model: modelId,
              content: content,
              usage: parsedUsage,
              costInfo: costInfo,
              cost: costInfo || undefined,
              provider: selectedConfig.type === 'credits' ? 'OpenRouter (Credits)' : 'OpenRouter (API)',
              fallback_method: fallbackMethod,
              credits_used: selectedConfig.type === 'credits' ? totalCostUsd : undefined,
              providerSourceId: selectedConfig?.keyId,
              sourceType: selectedConfig?.sourceType
            }
          }
        } catch (error: any) {
          console.error(`Error with ${selectedProvider} for model ${modelId}:`, error)

          // Check if this is a 401 error and we have credits available for immediate retry
          const is401Error = error?.message?.includes('401') || error?.message?.includes('Unauthorized') || error?.message?.includes('No auth credentials')
          if (is401Error && fallbackMethod !== 'credits' && totalCredits > 0) {
            console.log(`[401 Retry] Attempting to retry ${modelId} with credits after 401 error`)

            try {
              // Try to get OpenRouter model ID for credits fallback
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
                  apiKey: process.env.OPENROUTER_ORG_KEY || process.env.OPENROUTER_API_KEY || '',
                  metadata: { applicationName: 'https://www.polydev.ai', siteUrl: 'Polydev Multi-LLM Platform' }
                }

                // Add reasoning effort for reasoning models if supported
                if (modelData?.supports_reasoning && reasoning_effort) {
                  apiOptions.reasoning_effort = reasoning_effort
                }

                console.log(`[401 Retry] Retrying ${modelId} -> ${openrouterModelId} on OpenRouter with credits`)
                const response = await apiManager.createMessage('openrouter', apiOptions)

                // Handle the response same as normal OpenRouter processing
                let result
                const contentType = response.headers.get('content-type') || ''

                if (contentType.includes('application/json')) {
                  try {
                    result = await response.json()
                  } catch (parseError) {
                    console.error(`[401 Retry] Failed to parse OpenRouter credits response:`, parseError)
                    throw new Error(`Invalid JSON response from OpenRouter credits retry`)
                  }
                } else {
                  console.error(`[401 Retry] OpenRouter credits returned non-JSON response with content-type: ${contentType}`)
                  const textResult = await response.text()
                  throw new Error(`Expected JSON response from OpenRouter credits retry, got: ${textResult.substring(0, 200)}`)
                }

                if (response.ok) {
                  console.log(`[401 Retry] Credits retry successful for ${modelId}`)

                  // Calculate and deduct credits cost
                  const usage = parseUsageData(result) || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
                  let creditsUsed = 0
                  let cost = null
                  if (modelPricing && usage && (usage.prompt_tokens > 0 || usage.completion_tokens > 0)) {
                    const totalCostUsd = computeCostUSD(usage.prompt_tokens || 0, usage.completion_tokens || 0, modelPricing.input, modelPricing.output)
                    const inputCost = ((usage.prompt_tokens || 0) / 1000000) * modelPricing.input
                    const outputCost = ((usage.completion_tokens || 0) / 1000000) * modelPricing.output
                    cost = {
                      input_cost: Number(inputCost.toFixed(6)),
                      output_cost: Number(outputCost.toFixed(6)),
                      total_cost: totalCostUsd
                    }
                    creditsUsed = totalCostUsd

                    // Deduct credits
                    try {
                      const supabase = await createClient()
                      const { error: creditError } = await supabase.rpc('deduct_user_credits', {
                        p_user_id: user.id,
                        p_amount: totalCostUsd
                      })
                      if (creditError) {
                        console.warn('[401 Retry] Failed to deduct user credits:', creditError)
                      }
                    } catch (creditErr) {
                      console.warn('[401 Retry] Failed to deduct user credits:', creditErr)
                    }
                  }

                  return {
                    model: modelId,
                    content: result.choices?.[0]?.message?.content || '',
                    usage: usage,
                    costInfo: cost,
                    provider: 'OpenRouter (Credits - 401 Retry)',
                    fallback_method: 'credits',
                    credits_used: creditsUsed,
                    providerSourceId: undefined,
                    sourceType: 'admin_credits'
                  }
                } else {
                  throw new Error(`OpenRouter credits retry failed: ${result?.error?.message || 'Unknown error'}`)
                }
              } else {
                console.error(`[401 Retry] No OpenRouter mapping available for ${modelId}`)
                // Fall through to normal error handling
              }
            } catch (retryErr: any) {
              console.error(`[401 Retry] Credits retry failed for ${modelId}:`, retryErr?.message || retryErr)
              // Fall through to normal error handling
            }
          }

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
                    const totalCost = computeCostUSD(usage.prompt_tokens, usage.completion_tokens, modelPricing.input, modelPricing.output)
                    const inputCost = (usage.prompt_tokens / 1000000) * modelPricing.input
                    const outputCost = (usage.completion_tokens / 1000000) * modelPricing.output
                    costInfo = {
                      input_cost: inputCost,
                      output_cost: outputCost,
                      total_cost: totalCost
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
                    fallback_method: 'api',
                    providerSourceId: providerConfigs['openrouter']?.api?.keyId,
                    sourceType: providerConfigs['openrouter']?.api?.sourceType
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
          if (totalCredits > 0) {
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
                    apiKey: process.env.OPENROUTER_ORG_KEY || process.env.OPENROUTER_API_KEY || ''
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
                      const totalCost = computeCostUSD(parsedUsage.prompt_tokens, parsedUsage.completion_tokens, modelPricing.input, modelPricing.output)
                      const inputCost = (parsedUsage.prompt_tokens / 1000000) * modelPricing.input
                      const outputCost = (parsedUsage.completion_tokens / 1000000) * modelPricing.output
                      costInfo = {
                        input_cost: inputCost,
                        output_cost: outputCost,
                        total_cost: totalCost
                      }
                    }
                    
                    return {
                      model: modelId,
                      content: apiResult.choices?.[0]?.message?.content || '',
                      usage: parsedUsage,
                      costInfo: costInfo,
                      provider: 'OpenRouter (Credits - CLI Fallback)',
                      fallback_method: 'credits',
                      credits_used: (parsedUsage.total_tokens || 0) / 1000000 * 50,
                      providerSourceId: undefined,
                      sourceType: 'admin_credits'
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
            exhaustion_permanent: exhaustionCheck.isPermanent,
            providerSourceId: selectedConfig?.keyId,
            sourceType: selectedConfig?.sourceType
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
        // Generate simple title without using AI tokens
        const autoTitle = userMessage.content.length > 50 ? 
          userMessage.content.substring(0, 47) + "..." : 
          userMessage.content
        console.log(`[Session Creation] Simple title: "${autoTitle}"`)
        
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
          // Generate simple title without using AI tokens
          const autoTitle = userMessage.content.length > 50 ? 
            userMessage.content.substring(0, 47) + "..." : 
            userMessage.content
          console.log(`[Session Update] Simple title: "${autoTitle}" for session: ${currentSessionId}`)
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
            metadata: (r.credits_used || r.fallback_method) ? { credits_used: r.credits_used || 0, fallback_method: r.fallback_method } : null
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
    
    // QUOTA DEDUCTION: Deduct perspectives for successful responses (non-streaming)
    try {
      for (const response of responses) {
        if (response && response.content && response.usage) {
          const usage = extractUsageFromResponse(response)
          const estimatedCost = response.cost?.total_cost || calculateEstimatedCost(response.model, usage.inputTokens, usage.outputTokens)

          await deductQuotaMiddleware(
            user.id,
            response.model,
            sessionId,
            usage,
            estimatedCost,
            { messages, temperature, max_tokens },
            { provider: response.provider, fallback_method: response.fallback_method },
            response.providerSourceId,
            response.sourceType as any
          )
        }
      }
    } catch (quotaDeductionError) {
      console.error('Non-streaming quota deduction error:', quotaDeductionError)
      // Don't fail the request due to quota deduction errors
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
        // Try to get pricing from model limits using the correct provider
        try {
          const providerLabel = (response?.provider || '').toString().toLowerCase()
          const providerId = providerLabel.startsWith('openrouter') ? 'openrouter'
            : providerLabel.startsWith('openai') ? 'openai'
            : providerLabel.startsWith('anthropic') ? 'anthropic'
            : (providerLabel.startsWith('google') || providerLabel.startsWith('gemini')) ? 'google'
            : providerLabel.startsWith('xai') ? 'xai'
            : providerLabel.startsWith('groq') ? 'groq'
            : 'openai'
          const modelLimits = await modelsDevService.getModelLimits(response?.model || model, providerId)
          if (modelLimits?.pricing) {
            const totalCost = computeCostUSD(usage.prompt_tokens, usage.completion_tokens, modelLimits.pricing.input, modelLimits.pricing.output)
            const inputCost = (usage.prompt_tokens / 1000000) * modelLimits.pricing.input
            const outputCost = (usage.completion_tokens / 1000000) * modelLimits.pricing.output
            costInfo = {
              input_cost: inputCost,
              output_cost: outputCost,
              total_cost: totalCost
            }
          }
        } catch (error) {
          console.warn(`Failed to get pricing for ${response?.model || model}:`, error)
        }
      }

      // Handle streaming response for single model (OpenAI-like SSE to client)
      if (stream) {
        const encoder = new TextEncoder()

        const streamingResponse = new ReadableStream({
          start(controller) {
            // Emit the content (may be full content if upstream didn't stream incrementally)
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

            // Emit a summary and final event compatible with the chat UI
            const summary = {
              type: 'summary',
              totals: {
                tokens: usage.total_tokens || 0,
                cost: (costInfo as any)?.total_cost || 0
              },
              responses: [
                {
                  model: response?.model || model,
                  provider: response?.provider || 'unknown',
                  tokens_used: usage.total_tokens || 0,
                  cost: costInfo,
                  fallback_method: response?.fallback_method,
                  credits_used: (costInfo as any)?.credits_used || 0
                }
              ]
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(summary)}\n\n`))

            const finalPayload = {
              type: 'final',
              responses: [
                {
                  model: response?.model || model,
                  content: response?.content || '',
                  provider: response?.provider || 'unknown',
                  usage: usage,
                  cost: {
                    input_cost: (costInfo as any)?.input_cost || 0,
                    output_cost: (costInfo as any)?.output_cost || 0,
                    total_cost: (costInfo as any)?.total_cost || 0
                  },
                  fallback_method: response?.fallback_method,
                  credits_used: (costInfo as any)?.credits_used || 0
                }
              ]
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalPayload)}\n\n`))
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          }
        })

        return new Response(streamingResponse, {
          headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
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
            const responseCost = computeCostUSD(response.usage.prompt_tokens, response.usage.completion_tokens, modelLimits.pricing.input, modelLimits.pricing.output)
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
          // Emit each model's content (may be full content if upstream streaming was buffered)
          for (const response of responses) {
            if (response && !response.error) {
              const streamData = {
                type: 'content',
                model: response.model,
                content: response.content || '',
                provider: response.provider,
                metadata: {
                  cost_info: (response as any).costInfo || null,
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

          // Emit final event compatible with the chat UI
          const finalPayload = {
            type: 'final',
            responses: responses
              .filter(r => r && !r.error)
              .map(r => ({
                model: r!.model,
                content: r!.content || '',
                provider: r!.provider === 'openrouter'
                  ? ((r as any).fallback_method === 'credits' ? 'OpenRouter (Credits)' : 'OpenRouter (API)')
                  : r!.provider,
                usage: r!.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
                cost: (r as any).costInfo
                  ? {
                      input_cost: (r as any).costInfo.input_cost || 0,
                      output_cost: (r as any).costInfo.output_cost || 0,
                      total_cost: (r as any).costInfo.total_cost || 0
                    }
                  : undefined,
                fallback_method: r!.fallback_method,
                credits_used: (r as any).credits_used || 0
              }))
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalPayload)}\n\n`))
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        }
      })

      return new Response(streamingResponse, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        }
      })
    }

    // Non-stream: persist analytics into usage_sessions for each response
    try {
      const supabase = await createClient()
      for (const r of responses) {
        if (!r || (r as any).error) continue
        const rt = (r as any).response_time_ms as number | undefined
        const tps = r.usage?.completion_tokens && rt
          ? (r.usage.completion_tokens || 0) / Math.max(0.001, (rt as number) / 1000)
          : null
        await supabase
          .from('usage_sessions')
          .insert({
            user_id: user.id,
            session_id: currentSessionId || null,
            model_name: r.model,
            provider: r.provider,
            tokens_used: r.usage?.total_tokens || 0,
            cost: (r as any).costInfo?.total_cost || 0,
            session_type: (r as any).fallback_method === 'credits' ? 'credits' : ((r as any).fallback_method === 'cli' ? 'cli' : 'api'),
            metadata: {
              app: 'Polydev Multi-LLM Platform',
              prompt_tokens: r.usage?.prompt_tokens || 0,
              completion_tokens: r.usage?.completion_tokens || 0,
              input_cost: (r as any).costInfo?.input_cost || 0,
              output_cost: (r as any).costInfo?.output_cost || 0,
              response_time_ms: (r as any).response_time_ms || 0,
              tps: tps ? Number(tps.toFixed(1)) : null,
              finish: 'stop',
              fallback_method: (r as any).fallback_method,
              credits_used: (r as any).credits_used || 0
            }
          })
      }
    } catch (e) {
      console.warn('Failed to record non-stream usage analytics:', e)
    }

    return NextResponse.json({
      responses,
      usage: totalUsage,
      summary: {
        totals: { tokens: totalUsage?.total_tokens || 0, cost: totalCost, credits_used: totalCreditsUsed },
        responses: responses.map((r: any) => ({
          model: r?.model,
          provider: r?.provider,
          tokens_used: r?.usage?.total_tokens || 0,
          cost: r?.costInfo || null,
          fallback_method: r?.fallback_method,
          credits_used: r?.credits_used || 0,
          error: r?.error || null
        }))
      },
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
