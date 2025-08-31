import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { createHash } from 'crypto'

// Vercel configuration for MCP server
export const dynamic = 'force-dynamic'
export const maxDuration = 300

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
        if (!authResult.success) {
          return NextResponse.json({
            jsonrpc: '2.0',
            id,
            error: {
              code: -32602,
              message: authResult.error
            }
          }, {
            status: 401,
            headers: {
              'WWW-Authenticate': 'Bearer realm="mcp", error="invalid_token"',
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
            description: 'Array of model names to use (optional, defaults to user preferences)'
          },
          temperature: {
            type: 'number',
            description: 'Temperature for response generation (0.0-2.0, default: 0.7)',
            minimum: 0,
            maximum: 2
          },
          max_tokens: {
            type: 'number',
            description: 'Maximum tokens per response (default: 2000)',
            minimum: 1,
            maximum: 8000
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
        result = await callPerspectivesAPI(args, user)
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
async function authenticateBearerToken(request: NextRequest): Promise<{ success: boolean; user?: any; error?: string }> {
  const authorization = request.headers.get('authorization')
  
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return { success: false, error: 'Missing or invalid Authorization header. Use Bearer token.' }
  }

  const token = authorization.replace('Bearer ', '')
  
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
      return { success: false, error: 'OAuth token has expired' }
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
async function authenticateRequest(request: NextRequest): Promise<{ success: boolean; user?: any; error?: string }> {
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
      return { success: false, error: 'OAuth token has expired' }
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

async function callPerspectivesAPI(args: any, user: any): Promise<string> {
  // Validate required arguments
  if (!args.prompt || typeof args.prompt !== 'string') {
    throw new Error('prompt is required and must be a string')
  }

  const supabase = await createClient()
  
  // Get user preferences
  const { data: preferences } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const models = args.models || Object.values(preferences?.model_preferences || {
    'openai': 'gpt-4o',
    'anthropic': 'claude-3-5-sonnet-20241022',
    'google': 'gemini-2.0-flash-exp'
  })

  console.log(`[MCP] Getting perspectives for user ${user.id}: "${args.prompt.substring(0, 60)}${args.prompt.length > 60 ? '...' : ''}"`)
  console.log(`[MCP] Models: ${models.join(', ')}`)

  // Simulate multi-model response (in a real implementation, you'd call your LLM service)
  const responses = await Promise.all(
    models.map(async (model: string) => {
      try {
        // This is a placeholder - you'd replace with actual LLM API calls
        return {
          model,
          content: `This is a perspective from ${model} on: "${args.prompt}"\n\nThis would contain the actual AI response in a real implementation.`,
          tokens_used: Math.floor(Math.random() * 500) + 100,
          latency_ms: Math.floor(Math.random() * 2000) + 500
        }
      } catch (error) {
        return {
          model,
          error: `Failed to get response from ${model}: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      }
    })
  )

  const totalTokens = responses.reduce((sum, r) => sum + (r.tokens_used || 0), 0)
  const totalLatency = Math.max(...responses.map(r => r.latency_ms || 0))

  // Format the response
  let formatted = `# Multiple AI Perspectives\n\n`
  formatted += `Got ${responses.length} perspectives in ${totalLatency}ms using ${totalTokens} tokens.\n\n`

  responses.forEach((response, index) => {
    const modelName = response.model.toUpperCase()
    
    if (response.error) {
      formatted += `## ${modelName} - ERROR\n`
      formatted += `❌ ${response.error}\n\n`
    } else {
      formatted += `## ${modelName} Perspective\n`
      formatted += `${response.content}\n\n`
      if (response.tokens_used) {
        formatted += `*Tokens: ${response.tokens_used}, Latency: ${response.latency_ms}ms*\n\n`
      }
    }
    
    if (index < responses.length - 1) {
      formatted += '---\n\n'
    }
  })

  return formatted
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