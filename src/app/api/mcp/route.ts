// Import crypto polyfill first
import '@/lib/crypto-polyfill'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { createHash } from 'crypto'
import { MCPMemoryManager } from '@/lib/mcpMemory'

// Vercel configuration for MCP server
export const dynamic = 'force-dynamic'
export const maxDuration = 300
// Trigger deployment

// Provider Configuration Interface
interface ProviderConfig {
  id: string
  provider_name: string
  display_name: string
  base_url: string
  api_key_required: boolean
  supports_streaming: boolean
  supports_tools: boolean
  supports_images: boolean
  supports_prompt_cache: boolean
  authentication_method: string
  models: any[]
  created_at: string
  updated_at: string
}

// API Response Interface
interface APIResponse {
  content: string
  tokens_used: number
}

// Universal LLM API caller
async function callLLMAPI(
  model: string, 
  prompt: string, 
  apiKey: string, 
  providerConfig: ProviderConfig,
  temperature?: number, 
  maxTokens?: number
): Promise<APIResponse> {
  const temp = temperature || 0.7
  const tokens = maxTokens || 1000
  
  // Build request configuration based on provider
  const requestConfig = buildRequestConfig(
    providerConfig.provider_name,
    providerConfig.base_url,
    model,
    prompt,
    apiKey,
    temp,
    tokens
  )
  
  // Make the API call
  console.log(`[MCP] Making API call to: ${requestConfig.url}`)
  console.log(`[MCP] Request body:`, JSON.stringify(requestConfig.body, null, 2))
  
  const response = await fetch(requestConfig.url, {
    method: 'POST',
    headers: requestConfig.headers,
    body: JSON.stringify(requestConfig.body),
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error(`[MCP] API error details:`, errorText)
    throw new Error(`${providerConfig.display_name} API error: ${response.status} ${response.statusText} - ${errorText}`)
  }
  
  const data = await response.json()
  
  // Parse response based on provider format (use actualModel if available)
  const modelForParsing = requestConfig.actualModel || model
  return parseResponse(providerConfig.provider_name, data, modelForParsing)
}

// Request configuration interface
interface RequestConfig {
  url: string
  headers: Record<string, string>
  body: any
  actualModel?: string  // Track the actual model used (for fallbacks)
}

// Build request configuration for different providers
function buildRequestConfig(
  provider: string,
  baseUrl: string,
  model: string,
  prompt: string,
  apiKey: string,
  temperature: number,
  maxTokens: number
): RequestConfig {
  switch (provider) {
    case 'openai':
    case 'openai-native':
      const isGPT5Model = model.startsWith('gpt-5')
      
      if (isGPT5Model) {
        // Use GPT-5 with proper Responses API (this was working before)
        console.log(`[MCP] Using GPT-5 with Responses API: ${model}`)
        return {
          url: `${baseUrl}/responses`,
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: {
            model,  // Use exact model name from user
            input: prompt,  // Use 'input' for responses endpoint
            max_output_tokens: maxTokens,  // Use max_output_tokens for responses
            // Note: GPT-5 doesn't support temperature parameter
          },
        }
      }
      
      // Non-GPT-5 models use Chat Completions API
      return {
        url: `${baseUrl}/chat/completions`,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: {
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature,
          max_tokens: maxTokens,
        },
      }
    
    case 'anthropic':
      return {
        url: `${baseUrl}/v1/messages`,
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: {
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature,
          max_tokens: maxTokens,
        },
      }
    
    case 'gemini':
    case 'google':
      return {
        url: `${baseUrl}/models/${model}:generateContent?key=${apiKey}`,
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
          },
        },
      }
    
    case 'openrouter':
    case 'groq':
    case 'perplexity':
    case 'deepseek':
    case 'mistral':
      // OpenAI-compatible format
      return {
        url: `${baseUrl}/chat/completions`,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: {
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature,
          max_tokens: maxTokens,
        },
      }
    
    default:
      // Default to OpenAI-compatible format for unknown providers
      return {
        url: `${baseUrl}/chat/completions`,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: {
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature,
          max_tokens: maxTokens,
        },
      }
  }
}

// Extract text content from GPT-5 Responses API object structure
function extractGPT5Text(data: any): string {
  if (!data) return '';
  
  // 1) Use convenience field if present
  if (typeof data.output_text === 'string' && data.output_text.length > 0) {
    return data.output_text;
  }
  
  // 2) Collect text from output[].content[].text
  const texts: string[] = [];
  const outputs = Array.isArray(data.output) ? data.output : [];
  for (const out of outputs) {
    const parts = Array.isArray(out?.content) ? out.content : [];
    for (const part of parts) {
      // Most common cases
      if (typeof part === 'string') {
        texts.push(part);
      } else if (part?.type === 'output_text' && typeof part.text === 'string') {
        texts.push(part.text);
      } else if (part?.type === 'text' && typeof part.text === 'string') {
        texts.push(part.text); // fallback
      }
    }
  }
  
  if (texts.length > 0) return texts.join('');
  
  // 3) Last resort: stringify for debugging
  return JSON.stringify(data);
}

// Parse response based on provider format
function parseResponse(provider: string, data: any, model?: string): APIResponse {
  switch (provider) {
    case 'openai':
    case 'openai-native':
      // Handle GPT-5 Responses API format
      if (model?.startsWith('gpt-5')) {
        console.log(`[MCP] Parsing GPT-5 Responses API response`)
        console.log(`[MCP] Raw GPT-5 response structure:`, JSON.stringify(data, null, 2))
        const content = extractGPT5Text(data) || 'No response'
        const tokens_used = data?.usage?.total_tokens ?? 
          ((data?.usage?.input_tokens || 0) + (data?.usage?.output_tokens || 0))
        return {
          content,
          tokens_used
        }
      }
      console.log(`[MCP] Parsing standard OpenAI response for model: ${model}`)
      // Fall through to standard OpenAI format
    case 'openrouter':
    case 'groq':
    case 'perplexity':
    case 'deepseek':
    case 'mistral':
      return {
        content: data.choices?.[0]?.message?.content || 'No response',
        tokens_used: data.usage?.total_tokens || 0
      }
    
    case 'anthropic':
      return {
        content: data.content?.[0]?.text || 'No response',
        tokens_used: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
      }
    
    case 'gemini':
    case 'google':
      return {
        content: data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response',
        tokens_used: data.usageMetadata?.totalTokenCount || 0
      }
    
    default:
      // Default to OpenAI format
      return {
        content: data.choices?.[0]?.message?.content || data.content || 'No response',
        tokens_used: data.usage?.total_tokens || 0
      }
  }
}

// Get provider configuration from database
async function getProviderConfig(providerName: string): Promise<ProviderConfig | null> {
  const supabase = await createClient()
  
  const { data: config, error } = await supabase
    .from('provider_configurations')
    .select('*')
    .eq('provider_name', providerName)
    .eq('active', true)
    .single()
  
  if (error || !config) {
    console.warn(`No configuration found for provider: ${providerName}`)
    return null
  }
  
  return config
}

// Legacy helper functions (keeping for backward compatibility)
async function callOpenAI(model: string, prompt: string, apiKey: string, temperature?: number, maxTokens?: number) {
  const config = await getProviderConfig('openai')
  if (!config) {
    throw new Error('OpenAI provider configuration not found')
  }
  return callLLMAPI(model, prompt, apiKey, config, temperature, maxTokens)
}

async function callAnthropic(model: string, prompt: string, apiKey: string, temperature?: number, maxTokens?: number) {
  const config = await getProviderConfig('anthropic')
  if (!config) {
    throw new Error('Anthropic provider configuration not found')
  }
  return callLLMAPI(model, prompt, apiKey, config, temperature, maxTokens)
}

async function callGoogle(model: string, prompt: string, apiKey: string, temperature?: number, maxTokens?: number) {
  const config = await getProviderConfig('gemini')
  if (!config) {
    throw new Error('Google/Gemini provider configuration not found')
  }
  return callLLMAPI(model, prompt, apiKey, config, temperature, maxTokens)
}

// MCP Server Implementation with Bearer Token Authentication
export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json()
    const { method, params, id } = requestBody
    
    // Log all MCP requests for debugging reconnection issues
    console.log(`[MCP Server] Method: ${method}, ID: ${id}`)
    console.log(`[MCP Server] Params:`, params)
    console.log(`[MCP Server] Auth header:`, request.headers.get('authorization') ? 'Present' : 'Missing')
    console.log(`[MCP Server] Request URL:`, request.url)
    console.log(`[MCP Server] Request headers:`, Object.fromEntries(request.headers.entries()))
    
    // Handle MCP protocol requests
    switch (method) {
      case 'initialize':
        // Initialize doesn't require authentication - similar to Vercel's OAuth flow
        return handleInitialize(params, id)
      
      case 'initialized':
        // Handle initialized notification - Claude Code sends this after initialize
        // Notifications don't expect a response, but we'll return 200 OK
        console.log(`[MCP Server] Initialized notification received from client`)
        return new NextResponse(null, {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        })
      
      case 'tools/list':
        // Allow tools/list without authentication for initial handshake
        // Authentication will be required for actual tool calls
        return handleToolsList(id)
      
      case 'tools/call':
        // tools/call requires authentication
        const authResult = await authenticateBearerToken(request)
        console.log(`[MCP] Authentication result for tools/call:`, authResult)
        if (!authResult.success) {
          console.log(`[MCP Server] Authentication failed for tools/call: ${authResult.error}`)
          
          // Check if this is a token expiration error for better UX
          const isTokenExpired = authResult.errorCode === 'TOKEN_EXPIRED'
          const errorResponse = {
            jsonrpc: '2.0',
            id,
            error: {
              code: isTokenExpired ? -32001 : -32602, // Custom code for token expiration
              message: authResult.error,
              data: isTokenExpired ? {
                errorType: 'TOKEN_EXPIRED',
                reAuthUrl: authResult.reAuthUrl,
                instructions: [
                  '🔑 Your Polydev MCP authentication has expired (renews every 30 days)',
                  '🌐 Visit the re-authentication URL to sign in again',
                  '✅ Complete the OAuth flow in your browser', 
                  '🚀 Your MCP tools will work immediately after re-authentication',
                  '💡 Alternative: Restart Claude Code to auto-trigger authentication'
                ],
                quickFix: 'Restart Claude Code or visit the re-authentication URL to continue using Polydev MCP tools.'
              } : { details: authResult.error }
            }
          }
          
          return NextResponse.json(errorResponse, {
            status: 401,
            headers: {
              'WWW-Authenticate': isTokenExpired 
                ? 'Bearer realm="mcp", error="invalid_token", error_description="Token expired - re-authentication required"'
                : 'Bearer realm="mcp", error="invalid_token"',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
          })
        }
        return await handleToolCall(params, id, request, authResult.user)
      
      case 'resources/list':
        // We don't implement resources, but return empty list to avoid errors
        console.log(`[MCP Server] Resources list requested - returning empty list`)
        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          result: { resources: [] }
        }, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        })
      
      case 'prompts/list':
        // We don't implement prompts, but return empty list to avoid errors
        console.log(`[MCP Server] Prompts list requested - returning empty list`)
        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          result: { prompts: [] }
        }, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        })
      
      default:
        console.log(`[MCP Server] Unknown method: ${method}`)
        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Method not found: ${method}`
          }
        }, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        })
    }
  } catch (error) {
    console.error('MCP server error:', error)
    return NextResponse.json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Internal error',
        data: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    })
  }
}

function handleInitialize(params: any, id: string) {
  // Support the protocol version that Claude Code is using
  const clientProtocolVersion = params?.protocolVersion || '2024-11-05'
  
  console.log(`[MCP Server] Initialize - client protocol: ${clientProtocolVersion}`)
  console.log(`[MCP Server] Initialize - client capabilities:`, params?.capabilities)
  console.log(`[MCP Server] Initialize - client info:`, params?.clientInfo)
  
  const response = {
    jsonrpc: '2.0',
    id,
    result: {
      protocolVersion: clientProtocolVersion, // Match client's protocol version
      capabilities: {
        tools: {}  // MCP 2025-06-18 requires objects, not booleans
        // Only include supported capabilities - omit resources and prompts
      },
      serverInfo: {
        name: 'polydev-mcp-server',
        version: '1.0.0'
      }
    }
  }
  
  console.log(`[MCP Server] Initialize response:`, response)
  
  return NextResponse.json(response, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  })
}

function handleToolsList(id: string) {
  const tools = [
    {
      name: 'get_perspectives',
      description: 'Get multiple AI perspectives on a prompt using configured LLM providers',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'The prompt to get perspectives on'
          },
          models: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of model names to use (optional, defaults to user preferred providers)'
          },
          temperature: {
            type: 'number',
            description: 'Temperature for response generation (0.0-2.0, default from user preferences)',
            minimum: 0,
            maximum: 2
          },
          max_tokens: {
            type: 'number',
            description: 'Maximum tokens per response (default from user preferences)',
            minimum: 1,
            maximum: 32000
          },
          provider_settings: {
            type: 'object',
            description: 'Per-provider settings for temperature and token limits',
            additionalProperties: {
              type: 'object',
              properties: {
                temperature: { type: 'number', minimum: 0, maximum: 2 },
                max_tokens: { type: 'number', minimum: 1, maximum: 32000 }
              }
            }
          }
        },
        required: ['prompt']
      }
    },
    {
      name: 'search_documentation',
      description: 'Search Polydev documentation for specific topics',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query for documentation'
          }
        },
        required: ['query']
      }
    }
  ]

  return NextResponse.json({
    jsonrpc: '2.0',
    id,
    result: { tools }
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  })
}

async function handleToolCall(params: any, id: string, request: NextRequest, user: any) {
  const { name, arguments: args } = params

  try {
    let result
    
    switch (name) {
      case 'get_perspectives':
        result = await callPerspectivesAPI(args, user, request)
        break
      
      case 'search_documentation':
        result = await searchDocumentation(args)
        break
      
      default:
        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          error: {
            code: -32602,
            message: `Unknown tool: ${name}`
          }
        }, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        })
    }

    return NextResponse.json({
      jsonrpc: '2.0',
      id,
      result: {
        content: [
          {
            type: 'text',
            text: result
          }
        ]
      }
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    })
  } catch (error) {
    console.error(`Tool call error for ${name}:`, error)
    return NextResponse.json({
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : 'Tool execution failed'
      }
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    })
  }
}

// New function for Bearer token authentication (used by MCP tools/call)
async function authenticateBearerToken(request: NextRequest): Promise<{ success: boolean; user?: any; error?: string; errorCode?: string; reAuthUrl?: string }> {
  const authorization = request.headers.get('authorization')
  
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return { success: false, error: 'Missing or invalid Authorization header. Use Bearer token.' }
  }

  const token = authorization.replace('Bearer ', '')
  console.log(`[MCP Auth] Token received:`, token.substring(0, 20) + '...')
  
  // Use service role for validation to bypass RLS
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  let supabase = await createClient()
  
  if (serviceRoleKey && serviceRoleKey !== 'your_service_role_key') {
    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    )
  }
  
  // Check if it's an OAuth access token (starts with polydev_)
  if (token.startsWith('polydev_')) {
    console.log(`[MCP Auth] OAuth token detected, validating...`)
    const { data: tokenData, error } = await supabase
      .from('mcp_access_tokens')
      .select('user_id, expires_at, revoked')
      .eq('token', token)
      .eq('revoked', false)
      .single()
    
    console.log(`[MCP Auth] Token query result:`, { tokenData, error })
    
    if (error || !tokenData) {
      console.log(`[MCP Auth] Token validation failed:`, error?.message || 'No token data')
      return { success: false, error: 'Invalid or expired OAuth token' }
    }

    // Check if token is expired
    const tokenExpiry = new Date(tokenData.expires_at)
    const now = new Date()
    console.log(`[MCP Auth] Token expiry check:`, { expires_at: tokenExpiry, now, expired: tokenExpiry < now })
    
    if (tokenExpiry < now) {
      console.log(`[MCP Auth] Token expired on: ${tokenExpiry.toISOString()}, current time: ${now.toISOString()}`)
      return { 
        success: false, 
        error: 'Your authentication has expired. Please re-authenticate to continue using Polydev MCP.',
        errorCode: 'TOKEN_EXPIRED',
        reAuthUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://api.polydev.ai'}/api/mcp/auth?client_id=claude-desktop&redirect_uri=http://localhost:8080/oauth/callback&response_type=code`
      }
    }

    // Update last used timestamp
    await supabase
      .from('mcp_access_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('token', token)

    return { success: true, user: { id: tokenData.user_id } }
  }

  // Check if it's an MCP token (starts with pd_)
  if (token.startsWith('pd_')) {
    const tokenHash = createHash('sha256').update(token).digest('hex')
    
    const { data: tokenData, error } = await supabase
      .from('mcp_user_tokens')
      .select('user_id, active, last_used_at')
      .eq('token_hash', tokenHash)
      .eq('active', true)
      .single()
    
    if (error || !tokenData) {
      return { success: false, error: 'Invalid or expired MCP token' }
    }

    // Update last used timestamp
    await supabase
      .from('mcp_user_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('token_hash', tokenHash)

    return { success: true, user: { id: tokenData.user_id } }
  }

  return { success: false, error: 'Unsupported token format. Use OAuth tokens (polydev_) or MCP tokens (pd_)' }
}

// Legacy function for backward compatibility (keeping existing behavior)
async function authenticateRequest(request: NextRequest): Promise<{ success: boolean; user?: any; error?: string; errorCode?: string; reAuthUrl?: string }> {
  const authorization = request.headers.get('authorization')
  
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return { success: false, error: 'Missing or invalid authorization header' }
  }

  const token = authorization.replace('Bearer ', '')
  const supabase = await createClient()
  
  // Check if it's an MCP token (starts with pd_)
  if (token.startsWith('pd_')) {
    const tokenHash = createHash('sha256').update(token).digest('hex')
    
    const { data: tokenData, error } = await supabase
      .from('mcp_user_tokens')
      .select('user_id, active, last_used_at')
      .eq('token_hash', tokenHash)
      .eq('active', true)
      .single()
    
    if (error || !tokenData) {
      return { success: false, error: 'Invalid or expired MCP token' }
    }

    // Update last used timestamp
    await supabase
      .from('mcp_user_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('token_hash', tokenHash)

    return { success: true, user: { id: tokenData.user_id } }
  }

  // Check if it's an OAuth access token (starts with polydev_)
  if (token.startsWith('polydev_')) {
    const { data: tokenData, error } = await supabase
      .from('mcp_access_tokens')
      .select('user_id, expires_at, revoked')
      .eq('token', token)
      .eq('revoked', false)
      .single()
    
    if (error || !tokenData) {
      return { success: false, error: 'Invalid or expired OAuth token' }
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return { 
        success: false, 
        error: 'Your authentication has expired. Please re-authenticate to continue using Polydev MCP.',
        errorCode: 'TOKEN_EXPIRED',
        reAuthUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://api.polydev.ai'}/api/mcp/auth?client_id=claude-desktop&redirect_uri=http://localhost:8080/oauth/callback&response_type=code`
      }
    }

    // Update last used timestamp
    await supabase
      .from('mcp_access_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('token', token)

    return { success: true, user: { id: tokenData.user_id } }
  }

  return { success: false, error: 'Unsupported authentication method. Use either MCP tokens (pd_) or OAuth tokens (polydev_)' }
}

async function callPerspectivesAPI(args: any, user: any, request?: NextRequest): Promise<string> {
  // Validate required arguments
  if (!args.prompt || typeof args.prompt !== 'string') {
    throw new Error('prompt is required and must be a string')
  }

  // Use service role client for all database operations since we already validated OAuth
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  console.log(`[MCP] Service role key available:`, !!serviceRoleKey)
  
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY not found in environment')
  }
  
  const { createClient: createServiceClient } = await import('@supabase/supabase-js')
  const serviceRoleSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`
        }
      }
    }
  )
  
  console.log(`[MCP] Service role client created successfully`)
  console.log(`[MCP] Service role key starts with:`, serviceRoleKey.substring(0, 20))
  console.log(`[MCP] Testing service role client with simple query...`)
  
  try {
    const { count, error } = await serviceRoleSupabase
      .from('mcp_conversation_memory')
      .select('*', { count: 'exact', head: true })
    console.log(`[MCP] Service role test query result - count: ${count}, error:`, error)
  } catch (testError) {
    console.error(`[MCP] Service role test query failed:`, testError)
  }

  // Initialize memory manager with service role client and get relevant context
  const memoryManager = new MCPMemoryManager({}, serviceRoleSupabase)
  const requestId = createHash('md5').update(args.prompt + Date.now()).digest('hex').substring(0, 16)
  
  console.log(`[MCP] Memory - Request ID: ${requestId}`)
  
  // Get memory preferences
  const memoryPreferences = await memoryManager.getMemoryPreferences(user.id)
  console.log(`[MCP] Memory preferences:`, memoryPreferences)
  
  // Search for relevant context if enabled
  let contextualPrompt = args.prompt
  let relevantContext = null
  
  // Check if client provided context (from context bridge)
  let clientContext = ''
  if (args.client_context) {
    console.log(`[MCP] Client context received - status: ${args.client_context.contextStatus}`)
    
    if (args.client_context.summary) {
      clientContext += `# Recent Claude Code Session\n${args.client_context.summary}\n\n`
    }
    
    if (args.client_context.recentTurns && args.client_context.recentTurns.length > 0) {
      clientContext += `## Recent Conversation:\n`
      args.client_context.recentTurns.slice(-4).forEach((turn: any, idx: number) => {
        clientContext += `**${turn.role.toUpperCase()}**: ${turn.text.substring(0, 150)}...\n`
      })
      clientContext += '\n'
    }
  }
  
  if (memoryPreferences.enable_conversation_memory || memoryPreferences.enable_project_memory) {
    relevantContext = await memoryManager.searchRelevantContext(
      user.id,
      args.prompt,
      args.project_context
    )
    
    console.log(`[MCP] Found relevant context:`, {
      conversations: relevantContext.conversations.length,
      projectMemories: relevantContext.projectMemories.length
    })

    // Enhance prompt with context if available
    if (relevantContext.relevantContext && relevantContext.relevantContext.trim()) {
      contextualPrompt = `${relevantContext.relevantContext}\n\n# Current Request\n${args.prompt}`
      console.log(`[MCP] Enhanced prompt with context (${relevantContext.relevantContext.length} chars)`)
    }
  }
  
  // Add client context from context bridge (higher priority than stored context)
  if (clientContext) {
    contextualPrompt = `${clientContext}${contextualPrompt}`
    console.log(`[MCP] Added client context from bridge (${clientContext.length} chars)`)
  }
  
  // Get user preferences with comprehensive settings using service role
  const { data: preferences } = await serviceRoleSupabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single()

  console.log(`[MCP] User preferences:`, preferences)

  // Use models from args, or user preferences, or fallback defaults
  const models = args.models || 
    (preferences?.preferred_providers?.length > 0 
      ? preferences.preferred_providers.map((provider: string) => {
          const modelPref = preferences?.model_preferences?.[provider]
          return modelPref || getDefaultModelForProvider(provider)
        })
      : (preferences?.default_model 
          ? [preferences.default_model]  // Use user's default model (GPT-5)
          : ['gpt-5-2025-08-07']        // System fallback to GPT-5
        )
    )

  // Use temperature and max_tokens from args, or user preferences, or defaults
  const temperature = args.temperature ?? preferences?.default_temperature ?? 0.7
  const maxTokens = args.max_tokens ?? preferences?.default_max_tokens ?? 1000

  console.log(`[MCP] Using temperature: ${temperature}, maxTokens: ${maxTokens}`)

  console.log(`[MCP] Getting perspectives for user ${user.id}: "${args.prompt.substring(0, 60)}${args.prompt.length > 60 ? '...' : ''}"`)
  console.log(`[MCP] Models: ${models.join(', ')}`)

  // Get user API keys from database using service role (bypasses RLS since we already validated OAuth)
  console.log(`[MCP] Authenticated user: ${user.id}`)
  console.log(`[MCP] Querying API keys for user_id: ${user.id}`)
  const { data: apiKeys, error: apiKeysError } = await serviceRoleSupabase
    .from('user_api_keys')
    .select('provider, encrypted_key, key_preview, api_base, default_model, monthly_budget, current_usage, max_tokens')
    .eq('user_id', user.id)

  console.log(`[MCP] API Keys Query Result:`, { apiKeys, error: apiKeysError })
  console.log(`[MCP] Found ${apiKeys?.length || 0} API keys for user ${user.id}`)
  if (apiKeys && apiKeys.length > 0) {
    console.log(`[MCP] API Keys:`, apiKeys.map(k => ({ provider: k.provider, preview: k.key_preview })))
  }

  // Get all provider configurations using service role
  const { data: providerConfigs } = await serviceRoleSupabase
    .from('provider_configurations')
    .select('*')

  // Create provider lookup map
  const configMap = new Map<string, ProviderConfig>()
  providerConfigs?.forEach(config => {
    configMap.set(config.provider_name, config)
  })

  // Call actual LLM APIs
  const responses = await Promise.all(
    models.map(async (model: string) => {
      const startTime = Date.now()
      try {
        // Determine provider from model name or use intelligent matching
        const provider = determineProvider(model, configMap)
        if (!provider) {
          return {
            model,
            error: `No provider configuration found for model: ${model}`
          }
        }

        // Find API key for this provider with fallback matching
        console.log(`[MCP] Looking for API key - Provider: ${provider.provider_name}/${provider.id}, Available keys: ${apiKeys?.map(k => k.provider).join(', ')}`)
        
        // Enhanced provider matching to handle variations like openai <-> openai-native
        const findApiKeyForProvider = (providerName: string) => {
          return apiKeys?.find(key => {
            // Direct match
            if (key.provider === providerName || key.provider === provider.id) return true
            
            // Handle OpenAI variations
            if ((providerName === 'openai' && key.provider === 'openai-native') ||
                (providerName === 'openai-native' && key.provider === 'openai')) return true
                
            // Handle Google/Gemini variations  
            if ((providerName === 'google' && key.provider === 'gemini') ||
                (providerName === 'gemini' && key.provider === 'google')) return true
                
            return false
          })
        }
        
        const apiKey = findApiKeyForProvider(provider.provider_name)
        if (!apiKey) {
          return {
            model,
            error: `No API key found for provider: ${provider.display_name} (${provider.provider_name}). Available: ${apiKeys?.map(k => k.provider).join(', ')}. Please add your ${provider.display_name} API key in the dashboard.`
          }
        }

        // Check provider budget before making API call
        if (apiKey.monthly_budget && apiKey.current_usage && 
            parseFloat(apiKey.current_usage.toString()) >= parseFloat(apiKey.monthly_budget.toString())) {
          return {
            model,
            error: `Monthly budget of $${apiKey.monthly_budget} exceeded for ${provider.display_name}. Current usage: $${apiKey.current_usage}`
          }
        }

        // Decode the Base64 encoded API key
        const decryptedKey = Buffer.from(apiKey.encrypted_key, 'base64').toString('utf-8')
        console.log(`[MCP] Decoded key for ${provider.display_name}: ${decryptedKey.substring(0, 10)}...`)

        // Use provider-specific settings if provided, otherwise use global settings
        const providerSettings = args.provider_settings?.[provider.provider_name] || {}
        const providerTemperature = providerSettings.temperature ?? temperature
        
        // Max tokens priority: provider_settings > API key config > user preferences > global default
        const preferencesMaxTokens = preferences?.model_preferences?.[`${provider.provider_name}_max_tokens`] || 
                                    preferences?.model_preferences?.[`${provider.id}_max_tokens`]
        const providerMaxTokens = providerSettings.max_tokens ?? 
                                 apiKey.max_tokens ?? 
                                 preferencesMaxTokens ?? 
                                 maxTokens

        console.log(`[MCP] ${provider.display_name} settings - temp: ${providerTemperature}, tokens: ${providerMaxTokens} (API budget: $${apiKey.monthly_budget || 'unlimited'}, used: $${apiKey.current_usage || '0'})`)

        // Determine usage path: Check if user has API keys for this provider first
        let usagePath = 'credits' // Default to credits path
        let sessionType = 'credits'
        
        if (apiKey && decryptedKey && decryptedKey !== 'demo_key') {
          usagePath = 'api_key'
          sessionType = 'api_key'
        }
        
        console.log(`[MCP Usage] Usage path: ${usagePath} for ${provider.display_name}`)

        // Check credits only if using credits path
        let userCredits = null
        if (usagePath === 'credits') {
          try {
            const { data: balanceResults } = await serviceRoleSupabase
              .from('user_credits')
              .select('balance, promotional_balance, total_purchased, total_spent')
              .eq('user_id', user.id)
              .single()
            userCredits = balanceResults
          } catch (creditError) {
            console.warn(`[MCP Credit] Failed to check credits, allowing request:`, creditError)
          }

          const totalBalance = (userCredits?.balance || 0) + (userCredits?.promotional_balance || 0)
          if (totalBalance <= 0) {
            return {
              model,
              error: `Insufficient credits. Current balance: ${totalBalance} credits (${userCredits?.balance || 0} purchased + ${userCredits?.promotional_balance || 0} promotional). Please purchase more credits to continue using AI models.`,
              requiresCredits: true
            }
          }
        }

        // Simple cost estimation based on model and tokens
        const estimatedInputTokens = Math.ceil(contextualPrompt.length / 4)
        const estimatedOutputTokens = Math.min(providerMaxTokens, 1000)
        let estimatedCost = 0.1 // Default fallback cost
        
        // Basic cost estimation for common models
        if (model.includes('gpt-4') || model.includes('claude-3')) {
          estimatedCost = (estimatedInputTokens * 0.00003 + estimatedOutputTokens * 0.00006) * 10 // Convert to credits
        } else if (model.includes('gpt-3.5') || model.includes('claude-haiku')) {
          estimatedCost = (estimatedInputTokens * 0.0000015 + estimatedOutputTokens * 0.000002) * 10
        } else {
          estimatedCost = 0.05 // Very conservative estimate for other models
        }

        console.log(`[MCP Credit] Estimated cost for ${model}: ${estimatedCost} credits`)

        // Check if user has enough credits for this specific request
        if (userCredits && userCredits.balance < estimatedCost) {
          return {
            model,
            error: `Insufficient credits for this request. Estimated cost: ${estimatedCost} credits, available: ${userCredits.balance} credits. Please purchase more credits.`,
            requiresCredits: true,
            estimatedCost
          }
        }

        // Check user's budget limits using direct query
        let budgetExceeded = false
        try {
          const { data: budgetData } = await serviceRoleSupabase
            .from('user_budgets')
            .select('daily_limit, weekly_limit, monthly_limit, daily_spent, weekly_spent, monthly_spent')
            .eq('user_id', user.id)
            .single()
          
          if (budgetData) {
            if ((budgetData.daily_limit && budgetData.daily_spent >= budgetData.daily_limit) ||
                (budgetData.weekly_limit && budgetData.weekly_spent >= budgetData.weekly_limit) ||
                (budgetData.monthly_limit && budgetData.monthly_spent >= budgetData.monthly_limit)) {
              budgetExceeded = true
            }
          }
        } catch (budgetError) {
          console.warn(`[MCP Credit] Budget check failed, allowing request:`, budgetError)
        }

        if (budgetExceeded) {
          return {
            model,
            error: `Daily, weekly, or monthly budget limit exceeded. Please adjust your budget limits or wait for the next period.`,
            budgetExceeded: true
          }
        }

        // Use the unified API caller with provider-specific preferences
        const response = await callLLMAPI(
          model, 
          contextualPrompt, 
          decryptedKey, 
          provider,
          providerTemperature, 
          providerMaxTokens
        )

        // Track usage and deduct costs based on usage path
        try {
          const actualInputTokens = Math.ceil(contextualPrompt.length / 4)
          const actualOutputTokens = response.tokens_used || estimatedOutputTokens
          const actualCost = usagePath === 'credits' ? Math.min(estimatedCost, actualOutputTokens / 1000) : 0
          const costUSD = usagePath === 'api_key' ? estimatedCost * 0.1 : 0 // Rough USD estimate for API key usage
          
          // Track comprehensive usage session
          await serviceRoleSupabase.rpc('track_usage_session', {
            p_user_id: user.id,
            p_session_type: sessionType,
            p_tool_name: 'polydev_mcp',
            p_model_name: model,
            p_provider: provider.display_name,
            p_message_count: 1,
            p_input_tokens: actualInputTokens,
            p_output_tokens: actualOutputTokens,
            p_cost_usd: costUSD,
            p_cost_credits: actualCost,
            p_metadata: JSON.stringify({
              estimated_cost: estimatedCost,
              usage_path: usagePath,
              api_key_provider: usagePath === 'api_key' ? provider.display_name : null,
              request_source: 'mcp_api'
            })
          })
          
          // Deduct credits only if using credits path
          if (usagePath === 'credits' && actualCost > 0) {
            // Try promotional credits first, then regular credits
            const promotionalUsed = Math.min(actualCost, userCredits?.promotional_balance || 0)
            const regularUsed = actualCost - promotionalUsed
            
            if (promotionalUsed > 0) {
              await serviceRoleSupabase
                .from('user_credits')
                .update({ 
                  promotional_balance: (userCredits?.promotional_balance || 0) - promotionalUsed,
                  updated_at: new Date().toISOString()
                })
                .eq('user_id', user.id)
            }
            
            if (regularUsed > 0) {
              await serviceRoleSupabase.rpc('deduct_user_credits', {
                p_user_id: user.id,
                p_amount: regularUsed
              })
            }
            
            console.log(`[MCP Credit] Deducted ${actualCost} credits (${promotionalUsed} promotional + ${regularUsed} regular) for ${model} request`)
          } else {
            console.log(`[MCP Usage] Tracked API key usage for ${model} request`)
          }
          
          // Record in legacy model_usage table for backwards compatibility
          const legacyResult = await serviceRoleSupabase
            .from('model_usage')
            .insert({
              user_id: user.id,
              model_name: model,
              provider: provider.display_name,
              input_tokens: actualInputTokens,
              output_tokens: actualOutputTokens,
              total_tokens: actualInputTokens + actualOutputTokens,
              cost_credits: actualCost,
              request_timestamp: new Date().toISOString()
            })
          
          if (legacyResult.error) {
            console.warn('[MCP] Legacy model_usage insert failed:', legacyResult.error)
          }
            
        } catch (trackingError) {
          console.error(`[MCP] Failed to track usage:`, trackingError)
          // Continue with response even if tracking fails to avoid user disruption
        }

        const latency = Date.now() - startTime
        return {
          model,
          provider: provider.display_name,
          content: response.content,
          tokens_used: response.tokens_used,
          latency_ms: latency
        }
      } catch (error) {
        const latency = Date.now() - startTime
        return {
          model,
          error: `Failed to get response from ${model}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          latency_ms: latency
        }
      }
    })
  )

  const totalTokens = responses.reduce((sum, r) => sum + (r.tokens_used || 0), 0)
  const totalLatency = Math.max(...responses.map(r => r.latency_ms || 0))
  const successCount = responses.filter(r => !r.error).length

  // Log MCP tool call to mcp_usage_logs for dashboard statistics
  // Get the access token for this request from the auth header
  let accessTokenId = null
  let clientId = 'unknown'
  
  try {
    
    if (request) {
      const authHeader = request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '')
        if (token.startsWith('polydev_')) {
          const { data: tokenData } = await serviceRoleSupabase
            .from('mcp_access_tokens')
            .select('id, client_id')
            .eq('token', token)
            .single()
          accessTokenId = tokenData?.id
          clientId = tokenData?.client_id || 'unknown'
        } else if (token.startsWith('pd_')) {
          clientId = 'mcp-token' // Legacy pd_ token
        }
      }
    }
    
    console.log(`[MCP] Logging usage for user ${user.id}, client: ${clientId}`)

    // Calculate total cost (simplified estimation - could be more accurate with provider-specific pricing)
    const estimatedCost = totalTokens * 0.00002 // $0.00002 per token rough estimate
    
    // Create models used object with response details
    const modelsUsed: Record<string, any> = {}
    responses.forEach(response => {
      if (!response.error) {
        modelsUsed[response.model] = {
          provider: response.provider,
          tokens: response.tokens_used,
          latency_ms: response.latency_ms
        }
      }
    })

    await serviceRoleSupabase
      .from('mcp_usage_logs')
      .insert({
        user_id: user.id,
        access_token_id: accessTokenId,
        client_id: clientId,
        prompt: args.prompt.substring(0, 1000), // Truncate long prompts
        models_requested: models,
        models_used: modelsUsed,
        total_tokens: totalTokens,
        total_cost: estimatedCost,
        response_time_ms: totalLatency,
        status: successCount > 0 ? 'success' : 'error',
        error_message: successCount === 0 ? 'All providers failed' : null,
        created_at: new Date().toISOString()
      })
    console.log(`[MCP] Logged usage to mcp_usage_logs: ${models.length} models, ${totalTokens} tokens, $${estimatedCost.toFixed(6)}`)
  } catch (logError) {
    console.warn('[MCP] Failed to log usage to mcp_usage_logs:', logError)
  }

  // Enhanced logging to detailed request logs table
  try {
    // Get accurate pricing for each model
    const { data: modelPricing } = await serviceRoleSupabase
      .from('model_pricing')
      .select('*')
    
    const pricingMap = new Map<string, any>()
    modelPricing?.forEach(price => {
      const key = `${price.provider_name}:${price.model_name}`
      pricingMap.set(key, price)
    })

    // Calculate accurate costs per provider
    let totalAccurateCost = 0
    const providerCosts: Record<string, number> = {}
    const providerRequests: Record<string, any> = {}
    const providerResponses: Record<string, any> = {}
    const providerLatencies: Record<string, number> = {}

    responses.forEach(response => {
      const provider = determineProvider(response.model, configMap)?.provider_name || 'unknown'
      const pricingKey = `${provider}:${response.model}`
      const pricing = pricingMap.get(pricingKey)
      
      let cost = 0
      if (pricing && response.tokens_used && !response.error) {
        // Estimate input/output split (typically 1:3 ratio for responses)
        const estimatedInputTokens = Math.floor(response.tokens_used * 0.25)
        const estimatedOutputTokens = response.tokens_used - estimatedInputTokens
        
        cost = (estimatedInputTokens * pricing.input_cost_per_token) + 
               (estimatedOutputTokens * pricing.output_cost_per_token)
      } else if (response.tokens_used) {
        // Fallback to generic pricing if no specific pricing found
        cost = response.tokens_used * 0.00002
      }

      providerCosts[`${provider}:${response.model}`] = cost
      totalAccurateCost += cost

      providerRequests[`${provider}:${response.model}`] = {
        model: response.model,
        provider: response.provider,
        tokens_requested: maxTokens,
        temperature: temperature
      }

      if (!response.error) {
        providerResponses[`${provider}:${response.model}`] = {
          content: response.content.substring(0, 2000), // Limit content size
          tokens_used: response.tokens_used,
          finish_reason: 'stop'
        }
      }

      providerLatencies[`${provider}:${response.model}`] = response.latency_ms || 0
    })

    // Insert comprehensive log
    await serviceRoleSupabase
      .from('mcp_request_logs')
      .insert({
        user_id: user.id,
        access_token_id: accessTokenId,
        client_id: clientId,
        prompt: args.prompt,
        prompt_tokens: Math.floor(args.prompt.length / 4), // Rough token estimate
        max_tokens_requested: maxTokens,
        temperature: temperature,
        models_requested: models,
        provider_requests: providerRequests,
        total_completion_tokens: responses.reduce((sum, r) => sum + (r.tokens_used || 0), 0),
        total_prompt_tokens: Math.floor(args.prompt.length / 4) * responses.filter(r => !r.error).length,
        total_tokens: totalTokens,
        provider_costs: providerCosts,
        total_cost: totalAccurateCost,
        response_time_ms: totalLatency,
        first_token_time_ms: Math.min(...responses.map(r => r.latency_ms || totalLatency)),
        provider_latencies: providerLatencies,
        status: successCount === responses.length ? 'success' : 
                successCount > 0 ? 'partial_success' : 'error',
        error_message: responses.filter(r => r.error).map(r => r.error).join('; ') || null,
        successful_providers: successCount,
        failed_providers: responses.length - successCount,
        store_responses: true,
        provider_responses: providerResponses,
        created_at: new Date().toISOString()
      })

    console.log(`[MCP] Logged detailed request: ${models.length} models, ${totalTokens} tokens, accurate cost: $${totalAccurateCost.toFixed(6)}`)
  } catch (detailedLogError) {
    console.warn('[MCP] Failed to log to detailed request logs:', detailedLogError)
  }

  // Format the response
  let formatted = `# Multiple AI Perspectives\n\n`
  formatted += `Got ${successCount}/${responses.length} perspectives in ${totalLatency}ms using ${totalTokens} tokens.\n\n`

  responses.forEach((response, index) => {
    const modelName = response.model.toUpperCase()
    const providerName = response.provider ? ` (${response.provider})` : ''
    
    if (response.error) {
      formatted += `## ${modelName}${providerName} - ERROR\n`
      formatted += `❌ ${response.error}\n\n`
    } else {
      formatted += `## ${modelName}${providerName}\n`
      formatted += `${response.content}\n\n`
      if (response.tokens_used) {
        formatted += `*Tokens: ${response.tokens_used}, Latency: ${response.latency_ms}ms*\n\n`
      }
    }
    
    if (index < responses.length - 1) {
      formatted += '---\n\n'
    }
  })

  // Store conversation in memory system if enabled
  console.log(`[MCP] Memory - Checking conversation storage. Enabled: ${memoryPreferences.enable_conversation_memory}`)
  
  if (memoryPreferences.enable_conversation_memory) {
    try {
      const totalTokensUsed = responses.reduce((sum, r) => sum + (r.tokens_used || 0), 0)
      const primaryModel = responses.find(r => !r.error)?.model || models[0] || 'unknown'
      
      console.log(`[MCP] Memory - About to store conversation:`, {
        user_id: user.id,
        prompt_length: args.prompt?.length,
        response_length: formatted?.length,
        model: primaryModel,
        tokens: totalTokensUsed
      })
      
      await memoryManager.storeConversation(user.id, {
        user_message: args.prompt,
        assistant_response: formatted,
        model_used: primaryModel,
        tokens_used: totalTokensUsed,
        session_id: args.session_id,
        project_context: args.project_context
      })
      
      console.log(`[MCP] Memory - Successfully stored conversation for user ${user.id}`)
    } catch (memoryError) {
      console.error('[MCP] Memory - Failed to store conversation:', memoryError)
      console.error('[MCP] Memory - Error stack:', (memoryError as Error).stack)
    }
  } else {
    console.log(`[MCP] Memory - Conversation memory disabled`)
  }

  // Sync dynamic project memories if enabled and context provided
  if (memoryPreferences.enable_project_memory && args.project_context) {
    try {
      // Extract project information from context and responses for memory sync
      const projectId = args.project_identifier || 'current-project'
      
      // Sync current project state
      await memoryManager.bulkSyncProjectState(user.id, requestId, {
        project_identifier: projectId,
        current_context: `Current request: ${args.prompt}\n\nResponses:\n${formatted.substring(0, 2000)}...`,
        tech_stack: args.tech_stack,
        recent_changes: args.recent_changes,
        file_structure: args.file_structure,
        dependencies: args.dependencies
      })
      
      console.log(`[MCP] Memory - Synced project state for ${projectId}`)
    } catch (memoryError) {
      console.warn('[MCP] Memory - Failed to sync project state:', memoryError)
    }
  }

  return formatted
}

// Helper function to get default model for a provider
function getDefaultModelForProvider(provider: string): string {
  const defaults: Record<string, string> = {
    'openai': 'gpt-4o',
    'openai-native': 'gpt-4o', 
    'anthropic': 'claude-3-5-sonnet-20241022',
    'gemini': 'gemini-2.0-flash-exp',
    'google': 'gemini-2.0-flash-exp',
    'openrouter': 'meta-llama/llama-3.2-90b-vision-instruct',
    'groq': 'llama-3.1-70b-versatile',
    'perplexity': 'llama-3.1-sonar-large-128k-online',
    'deepseek': 'deepseek-chat',
    'mistral': 'mistral-large-latest'
  }
  return defaults[provider] || 'gpt-4o'
}

// Intelligent provider determination based on model name
function determineProvider(model: string, configMap: Map<string, ProviderConfig>): ProviderConfig | null {
  // Direct model name matching first
  for (const [providerName, config] of configMap) {
    if (config.models?.some((m: any) => m.id === model || m.name === model)) {
      return config
    }
  }
  
  // Pattern matching based on model name
  const modelLower = model.toLowerCase()
  
  if (modelLower.includes('gpt') || modelLower.includes('o1') || modelLower.includes('o3') || modelLower.includes('o4')) {
    return configMap.get('openai') || configMap.get('openai-native') || null
  }
  
  if (modelLower.includes('claude')) {
    return configMap.get('anthropic') || null
  }
  
  if (modelLower.includes('gemini')) {
    return configMap.get('gemini') || configMap.get('google') || null
  }
  
  if (modelLower.includes('llama') || modelLower.includes('mistral') || modelLower.includes('mixtral')) {
    return configMap.get('openrouter') || configMap.get('groq') || null
  }
  
  if (modelLower.includes('deepseek')) {
    return configMap.get('deepseek') || null
  }
  
  if (modelLower.includes('sonar')) {
    return configMap.get('perplexity') || null
  }
  
  // Default fallback to first available OpenAI-compatible provider
  return configMap.get('openai') || configMap.get('openrouter') || null
}

async function searchDocumentation(args: any): Promise<string> {
  if (!args.query || typeof args.query !== 'string') {
    throw new Error('query is required and must be a string')
  }

  // Simple documentation search (you could enhance this with a real search system)
  const docs = [
    {
      title: 'Getting Started',
      content: 'Learn how to set up Polydev with your LLM providers and start getting multiple AI perspectives.',
      url: '/docs'
    },
    {
      title: 'MCP Integration',
      content: 'Connect your favorite MCP clients to Polydev for seamless multi-model access.',
      url: '/docs/mcp-integration'
    },
    {
      title: 'API Configuration',
      content: 'Configure API keys for OpenAI, Anthropic, Google, and other LLM providers.',
      url: '/dashboard/api-keys'
    }
  ]

  const query = args.query.toLowerCase()
  const results = docs.filter(doc => 
    doc.title.toLowerCase().includes(query) || 
    doc.content.toLowerCase().includes(query)
  )

  if (results.length === 0) {
    return `No documentation found for query: "${args.query}"\n\nTry searching for terms like "getting started", "mcp", "api keys", or "configuration".`
  }

  let formatted = `# Documentation Search Results\n\n`
  formatted += `Found ${results.length} result(s) for "${args.query}":\n\n`

  results.forEach((result, index) => {
    formatted += `## ${result.title}\n`
    formatted += `${result.content}\n`
    formatted += `[View more →](https://polydev.ai${result.url})\n\n`
  })

  return formatted
}

// Handle OAuth discovery (GET requests)
export async function GET(request: NextRequest) {
  // Return OAuth server configuration like Vercel MCP does
  return NextResponse.json({
    issuer: 'https://www.polydev.ai',
    authorization_endpoint: 'https://www.polydev.ai/api/mcp/authorize',
    token_endpoint: 'https://www.polydev.ai/api/mcp/auth',
    registration_endpoint: 'https://www.polydev.ai/api/mcp/register',
    jwks_uri: 'https://www.polydev.ai/api/mcp/jwks',
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: ['mcp'],
    code_challenge_methods_supported: ['S256', 'plain'],
    // Support dynamic client registration
    registration_endpoint_auth_methods_supported: ['none'],
    client_registration_types_supported: ['dynamic']
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  })
}

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}

// Handle unsupported methods with proper JSON responses
export async function PUT(request: NextRequest) {
  return NextResponse.json({
    error: 'method_not_allowed',
    error_description: 'PUT method not supported'
  }, { 
    status: 405,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  })
}

export async function PATCH(request: NextRequest) {
  return NextResponse.json({
    error: 'method_not_allowed',
    error_description: 'PATCH method not supported'
  }, { 
    status: 405,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  })
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json({
    error: 'method_not_allowed',
    error_description: 'DELETE method not supported'
  }, { 
    status: 405,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  })
}