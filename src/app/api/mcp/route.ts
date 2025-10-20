// Import crypto polyfill first
import '@/lib/crypto-polyfill'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { createHash } from 'crypto'
import { MCPMemoryManager } from '@/lib/mcpMemory'
import { subscriptionManager } from '@/lib/subscriptionManager'
import { OpenRouterManager } from '@/lib/openrouterManager'
import { modelsDevService } from '@/lib/models-dev-integration'
import { resolveProviderModelId } from '@/lib/model-resolver'
import { apiManager } from '@/lib/api'
import { SmartCliCache } from '@/lib/smartCliCache'

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

  // CRITICAL FIX: Check if this is a GPT-5 response from /responses endpoint
  // The /responses endpoint returns a different format than /chat/completions
  if (model?.includes('gpt-5') || requestConfig.url?.includes('/responses')) {
    console.log(`[MCP] GPT-5 /responses endpoint detected, extracting content properly`)
    console.log(`[MCP DEBUG] GPT-5 response data structure:`, {
      hasChoices: !!data.choices,
      hasMessage: !!data.choices?.[0]?.message,
      hasContent: !!data.choices?.[0]?.message?.content
    })

    // Check if it's the standard chat completion format (which GPT-5 now uses)
    if (data.choices?.[0]?.message?.content) {
      console.log(`[MCP] Extracting content from GPT-5 standard format`)
      return {
        content: data.choices[0].message.content,
        tokens_used: data.usage?.total_tokens || 0
      }
    }

    // Fallback: handle legacy GPT-5 /responses format
    if (data.output_text) {
      return {
        content: data.output_text,
        tokens_used: data.usage?.total_tokens || 0
      }
    }

    // ERROR: This is where the bug was! We were returning stringified JSON as content
    console.error(`[MCP] ERROR: GPT-5 response format not recognized, data:`, data)
    return {
      content: 'Error: Unable to parse GPT-5 response',
      tokens_used: data.usage?.total_tokens || 0
    }
  }

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

// Helper function to get provider display name
function getProviderDisplayName(provider: string): string {
  const displayNames: Record<string, string> = {
    'openai': 'OpenAI',
    'anthropic': 'Anthropic',
    'google': 'Google',
    'openrouter': 'OpenRouter',
    'groq': 'Groq',
    'deepseek': 'DeepSeek',
    'azure': 'Azure OpenAI',
    'mistral': 'Mistral AI',
    'perplexity': 'Perplexity',
    'fireworks': 'Fireworks AI'
  }
  return displayNames[provider.toLowerCase()] || provider
}

// Helper function to get provider base URL
function getProviderBaseUrl(provider: string): string {
  const baseUrls: Record<string, string> = {
    'openai': 'https://api.openai.com/v1',
    'anthropic': 'https://api.anthropic.com/v1',
    'google': 'https://generativelanguage.googleapis.com/v1beta',
    'openrouter': 'https://openrouter.ai/api/v1',
    'groq': 'https://api.groq.com/openai/v1',
    'deepseek': 'https://api.deepseek.com/v1',
    'azure': '', // Azure URLs are dynamic based on deployment
    'mistral': 'https://api.mistral.ai/v1',
    'perplexity': 'https://api.perplexity.ai',
    'fireworks': 'https://api.fireworks.ai/inference/v1'
  }
  return baseUrls[provider.toLowerCase()] || ''
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
    case 'xai':
    case 'x-ai':
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

  // 1) Check standard OpenAI format first (GPT-5 now uses this)
  if (data.choices?.[0]?.message?.content) {
    const content = data.choices[0].message.content;
    // Ensure we don't return the whole JSON object as string
    if (typeof content === 'string') {
      return content;
    }
  }

  // 2) Use convenience field if present (legacy GPT-5 format)
  if (typeof data.output_text === 'string' && data.output_text.length > 0) {
    return data.output_text;
  }

  // 3) Collect text from output[].content[].text (legacy format)
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

  // 4) Last resort: return error message instead of raw JSON
  console.error('[MCP] Unexpected GPT-5 response format:', JSON.stringify(data, null, 2));
  return 'Error: Unable to parse GPT-5 response';
}

// Parse response based on provider format
function parseResponse(provider: string, data: any, model?: string): APIResponse {
  switch (provider) {
    case 'openai':
    case 'openai-native':
      // Handle GPT-5 Responses API format
      if (model?.startsWith('gpt-5')) {
        console.log(`[MCP] Parsing GPT-5 Responses API response for model: ${model}`)
        console.log(`[MCP DEBUG] GPT-5 Raw data type:`, typeof data, 'Is string:', typeof data === 'string')
        console.log(`[MCP DEBUG] GPT-5 Data preview:`, JSON.stringify(data).substring(0, 200))

        // Check if data is a string (which would be wrong)
        if (typeof data === 'string') {
          console.error('[MCP] ERROR: GPT-5 data is a string instead of object!')
          try {
            data = JSON.parse(data)
            console.log('[MCP] Successfully parsed string data to object')
          } catch (e) {
            console.error('[MCP] Failed to parse string data:', e)
            return { content: 'Error: Invalid GPT-5 response format', tokens_used: 0 }
          }
        }

        // First check standard OpenAI format (GPT-5 now uses this primarily)
        if (data.choices?.[0]?.message?.content) {
          const content = data.choices[0].message.content
          const tokens_used = data?.usage?.total_tokens || 0

          console.log(`[MCP DEBUG] GPT-5 extracted content:`, JSON.stringify(content).substring(0, 100))

          // Validate content is not JSON and is a proper string response
          if (typeof content === 'string' && !content.trim().startsWith('{') &&
              !content.includes('"choices"') && !content.includes('"object":"chat.completion"')) {
            console.log('[MCP] GPT-5 content validation passed')
            return { content, tokens_used }
          }

          console.error('[MCP] GPT-5 content validation failed - appears to be JSON:', content?.substring(0, 100))
        }

        // Fallback to legacy GPT-5 format extraction
        const content = extractGPT5Text(data) || 'No response'
        const tokens_used = data?.usage?.total_tokens ??
          ((data?.usage?.input_tokens || 0) + (data?.usage?.output_tokens || 0))

        // Strict validation: try to extract text from JSON if detected
        if (content.includes('"choices"') || content.includes('"message"') ||
            (content.trim().startsWith('{') && content.includes('"id"'))) {
          console.error('[MCP] ERROR: GPT-5 returned raw JSON instead of text content, attempting extraction...')

          try {
            // Try to parse the JSON and extract the actual message content
            const parsed = JSON.parse(content)
            if (parsed.choices?.[0]?.message?.content) {
              const extractedContent = parsed.choices[0].message.content
              console.log('[MCP] Successfully extracted content from JSON:', extractedContent)
              return {
                content: extractedContent,
                tokens_used: parsed.usage?.total_tokens || tokens_used
              }
            }
          } catch (e) {
            console.error('[MCP] Failed to parse JSON content:', e)
          }

          return {
            content: 'Error: GPT-5 returned malformed JSON response',
            tokens_used
          }
        }

        return { content, tokens_used }
      }
      console.log(`[MCP] Parsing standard OpenAI response for model: ${model}`)
      // Fall through to standard OpenAI format
    case 'openrouter':
    case 'groq':
    case 'perplexity':
    case 'deepseek':
    case 'mistral':
    case 'xai':
    case 'x-ai':
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
      // Debug logging for Gemini response
      console.log('[DEBUG] Raw Gemini API response:', JSON.stringify(data, null, 2))
      console.log('[DEBUG] Has candidates:', !!data.candidates)
      console.log('[DEBUG] Candidates type:', Array.isArray(data.candidates) ? 'array' : typeof data.candidates)

      return {
        content: (() => {
          // Handle both array and non-array candidates
          if (data.candidates) {
            let candidate = null
            if (Array.isArray(data.candidates)) {
              candidate = data.candidates[0]
              console.log('[DEBUG] First candidate:', JSON.stringify(candidate, null, 2))
            } else {
              candidate = data.candidates
              console.log('[DEBUG] Single candidate:', JSON.stringify(candidate, null, 2))
            }

            if (candidate?.content?.parts) {
              const parts = Array.isArray(candidate.content.parts) ? candidate.content.parts : [candidate.content.parts]
              console.log('[DEBUG] Parts:', JSON.stringify(parts, null, 2))
              const text = parts[0]?.text
              console.log('[DEBUG] Extracted text:', text)
              return text || 'No response'
            } else {
              console.log('[DEBUG] No content.parts found. Candidate structure:', Object.keys(candidate || {}))
            }
          } else {
            console.log('[DEBUG] No candidates in response. Response keys:', Object.keys(data))
          }
          return 'No response'
        })(),
        tokens_used: data.usageMetadata?.totalTokenCount || 0
      }
    
    default:
      // Default to OpenAI format - use actual API token counts
      const tokens_used = data.usage?.total_tokens || 0
      const content = data.choices?.[0]?.message?.content || data.content || 'No response'

      return {
        content,
        tokens_used
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
  console.log('=============================================')
  console.log('[MCP] POST HANDLER CALLED at', new Date().toISOString())
  console.log('=============================================')

  try {
    // Get the raw text first to debug parsing issues
    const rawText = await request.text()
    console.log(`[MCP Server] Raw request text:`, rawText)
    
    let requestBody
    try {
      requestBody = JSON.parse(rawText)
    } catch (parseError) {
      console.error(`[MCP Server] JSON parse error:`, parseError)
      console.log(`[MCP Server] Failed to parse body:`, rawText.substring(0, 200))
      return NextResponse.json({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32700,
          message: 'Parse error - Invalid JSON'
        }
      }, { status: 400 })
    }
    
    const { method, params, id, jsonrpc } = requestBody
    
    // Validate JSON-RPC 2.0 format
    if (!method || !jsonrpc || jsonrpc !== '2.0') {
      console.log(`[MCP Server] Invalid request format - not JSON-RPC 2.0`)
      console.log(`[MCP Server] Missing required fields: method=${!!method}, jsonrpc=${!!jsonrpc}`)
      console.log(`[MCP Server] This appears to be a frontend API request, not MCP`)
      
      // Return a 400 error for invalid MCP requests
      return NextResponse.json({
        jsonrpc: '2.0',
        id: id || null,
        error: {
          code: -32600,
          message: 'Invalid Request - This endpoint only accepts JSON-RPC 2.0 MCP protocol requests'
        }
      }, { 
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      })
    }
    
    // Log all valid MCP requests for debugging reconnection issues
    console.log(`[MCP Server] Valid MCP request received`)
    console.log(`[MCP Server] Method: ${method}, ID: ${id}`)
    console.log(`[MCP Server] Params:`, params)
    console.log(`[MCP Server] Auth header:`, request.headers.get('authorization') ? 'Present' : 'Missing')
    
    // Handle MCP protocol requests
    switch (method) {
      case 'initialize':
        // Initialize doesn't require authentication - similar to Vercel's OAuth flow
        return handleInitialize(params, id)
      
      case 'initialized':
      case 'notifications/initialized':
        // Handle initialized notification - Claude Code sends this after initialize
        console.log(`[MCP Server] Initialized notification received from client`)
        console.log(`[MCP Server] Client should now report CLI status using report_cli_status tool`)
        
        // Notifications don't expect a response, but we'll return 200 OK
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
    },
    {
      name: 'report_cli_status',
      description: 'Report CLI tool status (Claude Code, Codex CLI, Gemini CLI) from client-side detection to your Polydev dashboard. The MCP client detects local CLI installations and reports the status.',
      inputSchema: {
        type: 'object',
        properties: {
          provider: {
            type: 'string',
            enum: ['claude_code', 'codex_cli', 'gemini_cli'],
            description: 'Which CLI tool to report status for'
          },
          status: {
            type: 'string',
            enum: ['available', 'unavailable', 'not_installed', 'error'],
            description: 'Current status of the CLI tool'
          },
          authenticated: {
            type: 'boolean',
            description: 'Whether the CLI tool is authenticated'
          },
          version: {
            type: 'string',
            description: 'Version of the CLI tool (if detected)'
          },
          message: {
            type: 'string',
            description: 'Additional status message or error details'
          }
        },
        required: ['provider', 'status']
      }
    },
    {
      name: 'setup_cli_monitoring',
      description: 'Configure automatic CLI status monitoring intervals for continuous status reporting',
      inputSchema: {
        type: 'object',
        properties: {
          interval_minutes: {
            type: 'number',
            description: 'Check interval in minutes (default: 15)',
            default: 15,
            minimum: 5,
            maximum: 1440
          },
          enabled: {
            type: 'boolean',
            description: 'Enable/disable monitoring',
            default: true
          }
        }
      }
    },
    {
      name: 'list_available_models',
      description: 'Get a list of available AI models with their availability status, cost, and quota information. Shows which models are available via CLI, API keys, or admin perspectives.',
      inputSchema: {
        type: 'object',
        properties: {
          filter_by_tier: {
            type: 'string',
            enum: ['premium', 'normal', 'eco', 'all'],
            description: 'Filter models by tier (default: all)',
            default: 'all'
          },
          show_only_available: {
            type: 'boolean',
            description: 'Only show available models (default: false)',
            default: false
          }
        }
      }
    },
    {
      name: 'select_models_interactive',
      description: 'Select models interactively for use in get_perspectives. Returns formatted model selection with availability and cost information to help users choose appropriate models.',
      inputSchema: {
        type: 'object',
        properties: {
          model_ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of model IDs to use for perspectives'
          },
          validate_only: {
            type: 'boolean',
            description: 'Only validate selection without confirming (default: false)',
            default: false
          }
        },
        required: ['model_ids']
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
      
      case 'report_cli_status':
        result = await handleCliStatusReport(args, user)
        break
      
      case 'setup_cli_monitoring':
        result = await handleCliMonitoringSetup(args, user)
        break

      case 'list_available_models':
        result = await handleListAvailableModels(args, user, request)
        break

      case 'select_models_interactive':
        result = await handleSelectModelsInteractive(args, user, request)
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

  // Check if it's an MCP token (starts with pd_ or legacy poly_)
  if (token.startsWith('pd_') || token.startsWith('poly_')) {
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

  return { success: false, error: 'Unsupported token format. Use OAuth tokens (polydev_) or MCP tokens (pd_/poly_)' }
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
  console.log(`[MCP] ========== callPerspectivesAPI CALLED ==========`)
  console.log(`[MCP] Prompt: "${args.prompt}"`)
  console.log(`[MCP] User ID: ${user?.id}`)

  // Validate required arguments
  if (!args.prompt || typeof args.prompt !== 'string') {
    throw new Error('prompt is required and must be a string')
  }

  // Check message limits and subscription status
  const messageCheck = await subscriptionManager.canSendMessage(user.id)
  if (!messageCheck.canSend) {
    throw new Error(messageCheck.reason || 'Message limit exceeded')
  }

  // Check CLI usage restrictions (detect if request is from CLI)
  const isCliRequest = request?.headers.get('user-agent')?.includes('cli') ||
                      request?.headers.get('x-request-source') === 'cli' ||
                      args.source === 'cli'

  if (isCliRequest) {
    const cliCheck = await subscriptionManager.canUseCLI(user.id)
    if (!cliCheck.canUse) {
      throw new Error(cliCheck.reason || 'CLI access requires Pro subscription')
    }
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

  // ✅ EARLY LOAD: Get subscription status early so we can use it for CLI routing decisions
  console.log(`[MCP] Loading user subscription status for CLI tier enforcement...`)
  const userSubscription = await subscriptionManager.getUserSubscription(user.id, true, false)
  console.log(`[MCP] User subscription loaded:`, {
    user_id: user.id,
    tier: userSubscription?.tier,
    status: userSubscription?.status,
    canUseCLI: userSubscription?.tier === 'pro' && userSubscription?.status === 'active'
  })

  // Initialize smart cache for CLI status
  const smartCache = new SmartCliCache(serviceRoleSupabase);
  const cliConfigs = await smartCache.getCliStatusWithCache(user.id);
  const cliSummary = smartCache.getClimiStatusSummary(cliConfigs);

  console.log(`[MCP] Smart cache CLI summary:`, {
    hasAnyCli: cliSummary.hasAnyCli,
    totalAvailable: cliSummary.totalAvailable,
    totalAuthenticated: cliSummary.totalAuthenticated,
    availableProviders: cliSummary.availableProviders,
    authenticatedProviders: cliSummary.authenticatedProviders
  });
  
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
    // DISABLED: Context contamination causes models to mimic MCP response format
    // if (relevantContext.relevantContext && relevantContext.relevantContext.trim()) {
    //   contextualPrompt = `${relevantContext.relevantContext}\n\n# Current Request\n${args.prompt}`
    //   console.log(`[MCP] Enhanced prompt with context (${relevantContext.relevantContext.length} chars)`)
    // }
  }
  
  // IMPORTANT: For MCP, we don't include context to avoid contamination
  // The context often contains previous MCP responses which cause models to
  // mimic the format instead of just answering the question
  // Comment out context inclusion for now:
  // if (clientContext) {
  //   contextualPrompt = `${clientContext}${contextualPrompt}`
  //   console.log(`[MCP] Added client context from bridge (${clientContext.length} chars)`)
  // }
  
  // No user_preferences dependency - MCP uses simple defaults

  // Get user API keys from database - SAME AS CHAT API
  console.log(`[MCP] Authenticated user: ${user.id}`)
  console.log(`[MCP] Querying API keys for user_id: ${user.id}`)
  const { data: apiKeys, error: apiKeysError } = await serviceRoleSupabase
    .from('user_api_keys')
    .select('provider, encrypted_key, key_preview, api_base, default_model, monthly_budget, current_usage, max_tokens, display_order')
    .eq('user_id', user.id)
    .eq('active', true)
    .order('display_order', { ascending: true })

  console.log(`[MCP] API Keys Query Result:`, { apiKeys, error: apiKeysError })
  console.log(`[MCP] Found ${apiKeys?.length || 0} API keys for user ${user.id}`)
  if (apiKeys && apiKeys.length > 0) {
    console.log(`[MCP] API Keys (ordered by display_order):`, apiKeys.map(k => ({
      provider: k.provider,
      model: k.default_model,
      order: k.display_order,
      preview: k.key_preview
    })))
  }

  // SIMPLIFIED: Use models from args OR directly from user_api_keys (like chat API)
  // No more complex preferences logic
  let models: string[] = []

  if (args.models && args.models.length > 0) {
    // If models explicitly specified, use those
    models = args.models
    console.log(`[MCP] Using explicitly specified models:`, models)
  } else if (apiKeys && apiKeys.length > 0) {
    // Use models from API keys directly, respecting display_order
    // Take up to 3 models for performance (configurable)
    const maxModels = 3

    // Sort by display_order to ensure proper priority
    console.log(`[MCP DEBUG] Before filtering - all keys:`, apiKeys?.map(k => ({
      provider: k.provider,
      model: k.default_model,
      order: k.display_order,
      hasKey: !!k.encrypted_key
    })))

    const filteredKeys = apiKeys.filter(key => {
      const hasModel = !!key.default_model
      console.log(`[MCP DEBUG] Filter check for ${key.provider}: hasModel=${hasModel}, model=${key.default_model}`)
      return hasModel
    })

    console.log(`[MCP DEBUG] After filter, before sort:`, filteredKeys.map(k => ({
      provider: k.provider,
      model: k.default_model,
      order: k.display_order
    })))

    const afterSort = filteredKeys.sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999))

    console.log(`[MCP DEBUG] After sort:`, afterSort.map(k => ({
      provider: k.provider,
      model: k.default_model,
      order: k.display_order
    })))

    const sortedKeys = afterSort.slice(0, maxModels)

    console.log(`[MCP DEBUG] After slice(0, ${maxModels}):`, sortedKeys.map(k => ({
      provider: k.provider,
      model: k.default_model,
      order: k.display_order
    })))

    models = sortedKeys.map(key => key.default_model)

    console.log(`[MCP] Using models from API keys (top ${maxModels}, ordered by display_order):`, models)
    console.log(`[MCP] API key display orders:`, sortedKeys.map(k => ({
      model: k.default_model,
      provider: k.provider,
      order: k.display_order
    })))
  } else {
    // Fallback if no API keys configured
    models = ['gpt-5-2025-08-07']
    console.log(`[MCP] No API keys found, using fallback model:`, models)
  }

  // Fetch default max_tokens from admin config
  let defaultMaxTokens = 10000 // Fallback default
  try {
    const { data: mcpConfig } = await serviceRoleSupabase
      .from('admin_pricing_config')
      .select('config_value')
      .eq('config_key', 'mcp_default_max_tokens')
      .single()

    if (mcpConfig?.config_value?.max_tokens) {
      defaultMaxTokens = mcpConfig.config_value.max_tokens
      console.log(`[MCP] Using admin-configured max_tokens: ${defaultMaxTokens}`)
    } else {
      console.log(`[MCP] No admin config found, using fallback max_tokens: ${defaultMaxTokens}`)
    }
  } catch (error) {
    console.log(`[MCP] Error fetching admin max_tokens config, using fallback:`, error)
  }

  // Use temperature and max_tokens from args or admin defaults
  const temperature = args.temperature ?? 0.7
  const maxTokens = args.max_tokens ?? defaultMaxTokens

  console.log(`[MCP] Using temperature: ${temperature}, maxTokens: ${maxTokens}`)
  console.log(`[MCP] Getting perspectives for user ${user.id}: "${args.prompt.substring(0, 60)}${args.prompt.length > 60 ? '...' : ''}"`)
  console.log(`[MCP] Final selected models: ${models.join(', ')}`)
  console.log(`[MCP] CRITICAL DEBUG - Models array:`, JSON.stringify(models))
  console.log(`[MCP] CRITICAL DEBUG - First model check: "${models[0]}", includes gpt-5: ${models[0]?.includes('gpt-5')}`)

  // Call actual LLM APIs using apiManager (like chat API does)
  const responses = await Promise.all(
    models.map(async (model: string) => {
      const startTime = Date.now()
      console.log(`[MCP] PROCESSING MODEL: "${model}" (type: ${typeof model})`)
      
      // Clean model name by removing provider prefixes that cause API errors
      let cleanModel = model
      if (model.includes('/')) {
        const parts = model.split('/')
        const providerPrefix = parts[0].toLowerCase()
        const modelName = parts.slice(1).join('/')
        
        // Only strip known problematic prefixes, keep others for OpenRouter compatibility
        if (['x-ai', 'xai', 'google'].includes(providerPrefix)) {
          cleanModel = modelName
          console.log(`[MCP] Stripped provider prefix: ${model} → ${cleanModel}`)
        }
      }
      
      try {
        // Find the API key configuration for this model (same as chat API)
        const apiKeyForModel = apiKeys?.find(key => key.default_model === model)

        if (!apiKeyForModel) {
          return {
            model,
            error: `Model ${model} not found in your API keys configuration`
          }
        }

        const providerName = apiKeyForModel.provider
        console.log(`[MCP] Found model ${model} configured for provider ${providerName}`)

        // CLI-FIRST ROUTING: Skip API keys if local CLI is available for this provider
        // Map provider names to CLI tool names
        const providerToCliMap: Record<string, string> = {
          'openai': 'codex_cli',
          'anthropic': 'claude_code', 
          'google': 'gemini_cli',
          'gemini': 'gemini_cli'
        }

        const cliToolName = providerToCliMap[providerName.toLowerCase()]
        let skipApiKey = false
        let cliConfig = null

        if (cliToolName) {
          // Check if CLI tool is available and authenticated from the database
          cliConfig = cliConfigs.find((config: any) =>
            config.provider === cliToolName &&
            config.status === 'available' &&
            config.enabled === true
          )

          // ✅ CRITICAL FIX: Check subscription tier BEFORE routing to CLI
          if (cliConfig) {
            // Only Pro users can use CLI - free users MUST use API keys
            const canUseCLI = userSubscription?.tier === 'pro' && userSubscription?.status === 'active'

            if (!canUseCLI) {
              // ⛔ Non-Pro user attempting to use CLI - log this and prevent it
              console.log(`[MCP] ⛔ SECURITY: User ${user.id} (tier: ${userSubscription?.tier}) attempted to use CLI tool ${cliToolName} - BLOCKED`)
              console.log(`[MCP] Reason: CLI access requires Pro subscription. Falling back to API keys.`)
              // Do NOT set skipApiKey = true
              // Do NOT return CLI response
              // Continue to API key handling below
              cliConfig = null  // Clear cliConfig to force API key routing
            } else {
              // ✅ Pro user with CLI available - use it
              skipApiKey = true
              console.log(`[MCP] ✅ Pro user ${user.id} - CLI tool ${cliToolName} is available and authenticated - SKIPPING API key for ${providerName}`)
              return {
                model,
                provider: `${providerName} (CLI Available)`,
                content: `Local CLI tool ${cliToolName} is available and will be used instead of API keys for ${providerName}. This model will be handled by the CLI tool.`,
                tokens_used: 0,
                latency_ms: 0,
                cli_available: true
              }
            }
          }

          if (!cliConfig) {
            // Check if CLI exists but is not available or authenticated
            const cliExists = cliConfigs.find((config: any) => config.provider === cliToolName)
            if (cliExists) {
              console.log(`[MCP] ⚠️  CLI tool ${cliToolName} found in database but not available/authenticated - using API keys`)
              console.log(`[MCP] CLI Status - Status: ${cliExists.status}, Enabled: ${cliExists.enabled}`)
            } else {
              console.log(`[MCP] ❌ CLI tool ${cliToolName} not found in database - using API keys`)
            }
          }
        } else {
          console.log(`[MCP] ❓ No CLI tool mapping for provider ${providerName} - using API keys`)
        }

        // Create a provider object with necessary fields (similar to what we had from provider_configurations)
        const provider = {
          provider_name: providerName,
          display_name: getProviderDisplayName(providerName),
          base_url: getProviderBaseUrl(providerName)
        }

        // Log the routing decision
        console.log(`[MCP] Routing Decision - Provider: ${providerName}, CLI Tool: ${cliToolName || 'none'}, Skip API Key: ${skipApiKey}, Reason: ${
          skipApiKey ? 'CLI available' : 
          cliToolName ? 'CLI not available/authenticated' : 'No CLI mapping'
        }`)

        // Calculate provider settings
        const providerSettings = args.provider_settings?.[providerName] || {}
        const providerTemperature = providerSettings.temperature ?? temperature
        const providerMaxTokens = providerSettings.max_tokens ??
                                 apiKeyForModel?.max_tokens ??
                                 maxTokens
        // Handle Credits Only mode (when encrypted_key is empty)
        console.log(`[MCP] CRITICAL - Checking credits-only for model "${model}":`, {
          hasEncryptedKey: !!apiKeyForModel.encrypted_key,
          keyPreview: apiKeyForModel.key_preview,
          provider: providerName
        })
        if (!apiKeyForModel.encrypted_key || apiKeyForModel.key_preview === 'Credits Only') {
          console.log(`[MCP] Credits-only configuration for ${providerName}, using OpenRouter credits...`)

          try {
            // Resolve model ID for OpenRouter
            console.log(`[MCP] Resolving model ${model} for OpenRouter...`)
            const openrouterModelId = await resolveProviderModelId(model, 'openrouter')
            console.log(`[MCP] Resolved ${model} → ${openrouterModelId}`)

            if (openrouterModelId === model) {
              console.error(`[MCP] No OpenRouter mapping found for ${model}`)
              return {
                model,
                error: `Polydev credits can't support this model without API keys (no OpenRouter mapping).`
              }
            }

            // Get OpenRouter strategy for credits
            const openRouterManager = new OpenRouterManager()
            const estimatedTokens = Math.min(providerMaxTokens || 1000, 4000)
            const estimatedCost = estimatedTokens * 0.00003
            const isCliRequest = request?.headers.get('user-agent')?.includes('cli') ||
                                request?.headers.get('x-request-source') === 'cli' ||
                                args.source === 'cli'

            const strategy = await openRouterManager.determineApiKeyStrategy(
              user.id,
              undefined,
              estimatedCost,
              isCliRequest
            )

            if (!strategy.canProceed) {
              return {
                model,
                error: strategy.error || 'Cannot proceed with request'
              }
            }

            console.log(`[MCP] Using OpenRouter ${strategy.strategy} strategy for ${model}`)

            // Use apiManager like chat API does
            const apiOptions = {
              model: openrouterModelId,
              messages: [{ role: 'user' as const, content: contextualPrompt }],
              temperature: providerTemperature,
              maxTokens: providerMaxTokens,
              stream: false,
              apiKey: strategy.apiKey,
              baseUrl: 'https://openrouter.ai/api/v1'
            }

            const apiResponse = await apiManager.createMessage('openrouter', apiOptions)

            // Parse the response
            const contentType = apiResponse.headers.get('content-type') || ''
            if (!contentType.includes('application/json')) {
              throw new Error('Invalid response from OpenRouter')
            }

            const result = await apiResponse.json()
            if (result.error) {
              throw new Error(result.error.message || 'OpenRouter API error')
            }

            const endTime = Date.now()
            const duration = endTime - startTime
            const tokensUsed = result.usage?.total_tokens || 0

            // Handle credits if using credits strategy
            if (strategy.strategy === 'credits') {
              try {
                const actualCost = tokensUsed * 0.00003
                await openRouterManager.deductCredits(user.id, actualCost)
                await openRouterManager.recordUsage(
                  user.id,
                  model,
                  Math.floor(tokensUsed * 0.7),
                  Math.floor(tokensUsed * 0.3),
                  actualCost,
                  strategy.strategy
                )
              } catch (creditError) {
                console.error('[MCP] Error handling credits:', creditError)
              }
            }

            return {
              model,
              provider: 'OpenRouter (Credits)',
              content: result.choices?.[0]?.message?.content || '',
              tokens_used: tokensUsed,
              response_time_ms: duration,
              latency_ms: duration
            }

          } catch (openRouterError) {
            console.error(`[MCP] OpenRouter fallback failed:`, openRouterError)
            return {
              model,
              error: `No API key found for ${provider.display_name} and OpenRouter fallback failed. Please add your API key in the dashboard or purchase credits.`
            }
          }
        }

        // Check provider budget before making API call
        if (apiKeyForModel.monthly_budget && apiKeyForModel.current_usage &&
            parseFloat(apiKeyForModel.current_usage.toString()) >= parseFloat(apiKeyForModel.monthly_budget.toString())) {
          
          console.log(`[MCP] Budget exceeded for ${provider.display_name}, attempting OpenRouter fallback...`)
          
          try {
            // Initialize OpenRouter manager for budget fallback
            const openRouterManager = new OpenRouterManager()
            
            // Estimate request cost
            const estimatedTokens = Math.min(maxTokens || 1000, 4000)
            const estimatedCost = estimatedTokens * 0.00003
            
            // Determine API key strategy with CLI priority
            const strategy = await openRouterManager.determineApiKeyStrategy(
              user.id,
              undefined,
              estimatedCost,
              isCliRequest
            )
            
            if (!strategy.canProceed) {
              return {
                model,
                error: `Monthly budget of $${apiKeyForModel.monthly_budget} exceeded for ${provider.display_name}. ${strategy.error || 'No credits available for fallback.'}`
              }
            }
            
            // Use OpenRouter as fallback with apiManager (same as chat API)
            console.log(`[MCP] Using OpenRouter ${strategy.strategy} strategy due to budget limit`)

            // Map to OpenRouter-specific model ID using shared resolver
            const openrouterModelIdB = await resolveProviderModelId(model, 'openrouter')
            if (openrouterModelIdB === model) {
              // No mapping found - resolver returns original ID when no mapping exists
              console.warn(`[MCP] Budget-fallback credits blocked: no OpenRouter mapping for ${model}`)
              return {
                model,
                error: `Polydev credits can't support this model without API keys (no OpenRouter mapping).`
              }
            }

            // Use apiManager like chat API does for OpenRouter credits
            const apiOptions = {
              model: openrouterModelIdB,
              messages: [{ role: 'user' as const, content: contextualPrompt }],
              temperature: providerTemperature,
              maxTokens: providerMaxTokens,
              stream: false,
              apiKey: strategy.apiKey,
              baseUrl: 'https://openrouter.ai/api/v1'
            }

            const apiResponse = await apiManager.createMessage('openrouter', apiOptions)

            // Parse the response
            let response: APIResponse
            const contentType = apiResponse.headers.get('content-type') || ''
            if (contentType.includes('application/json')) {
              const result = await apiResponse.json()
              if (result.error) {
                throw new Error(result.error.message || 'OpenRouter API error')
              }
              response = {
                content: result.choices?.[0]?.message?.content || '',
                tokens_used: result.usage?.total_tokens || 0
              }
            } else {
              throw new Error('Invalid response from OpenRouter')
            }
              
              const endTime = Date.now()
              const duration = endTime - startTime
              
              // Handle credits if using credits strategy
              if (strategy.strategy === 'credits') {
                try {
                  const actualCost = response.tokens_used * 0.00003
                  await openRouterManager.deductCredits(user.id, actualCost)
                  await openRouterManager.recordUsage(
                    user.id,
                    model,
                    Math.floor(response.tokens_used * 0.7),
                    Math.floor(response.tokens_used * 0.3),
                    actualCost,
                    strategy.strategy
                  )
                } catch (creditError) {
                  console.error('[MCP] Error handling credits:', creditError)
                }
              }
              
              return {
                model,
                provider: `${provider.display_name} (Credits - Budget Exceeded)`,
                content: response.content,
                tokens_used: response.tokens_used,
                response_time_ms: duration,
                strategy: strategy.strategy,
                fallback: true
              }
          } catch (fallbackError) {
            console.error(`[MCP] Budget fallback failed:`, fallbackError)
          }
          
          return {
            model,
            error: `Monthly budget of $${apiKeyForModel.monthly_budget} exceeded for ${provider.display_name}. Current usage: $${apiKeyForModel.current_usage}. OpenRouter fallback not available.`
          }
        }

        // Handle credits-only mode or decode API key
        if (!apiKeyForModel.encrypted_key) {
          // This is a credits-only configuration, trigger OpenRouter fallback
          console.log(`[MCP] Credits-only configuration for ${provider.display_name}, using OpenRouter fallback...`)
          
          try {
            // Initialize OpenRouter manager for credits-only fallback
            const openRouterManager = new OpenRouterManager()
            
            // Estimate request cost
            const estimatedTokens = Math.min(maxTokens || 1000, 4000)
            const estimatedCost = estimatedTokens * 0.00003
            
            // Check if this is a CLI request
            const isCliRequest = request?.headers.get('user-agent')?.includes('cli') || 
                                request?.headers.get('x-request-source') === 'cli' ||
                                args.source === 'cli'
            
            // Determine API key strategy with CLI priority
            const strategy = await openRouterManager.determineApiKeyStrategy(
              user.id,
              undefined,
              estimatedCost,
              isCliRequest
            )
            
            if (!strategy.canProceed) {
              return {
                model,
                error: `${strategy.error || 'Cannot proceed with request'}`
              }
            }
            
            console.log(`[MCP] Using OpenRouter ${strategy.strategy} strategy for credits-only ${model}`)

            // Resolve OpenRouter model ID using shared resolver
            const openrouterModelIdCO = await resolveProviderModelId(model, 'openrouter')
            if (openrouterModelIdCO === model) {
              // No mapping found - resolver returns original ID when no mapping exists
              console.warn(`[MCP] Credits-only fallback blocked: no OpenRouter mapping for ${model}`)
              return {
                model,
                error: `Polydev credits can't support this model without API keys (no OpenRouter mapping).`
              }
            }

            // Use apiManager like chat API does for OpenRouter credits
            const apiOptions = {
              model: openrouterModelIdCO,
              messages: [{ role: 'user' as const, content: contextualPrompt }],
              temperature: providerTemperature,
              maxTokens: providerMaxTokens,
              stream: false,
              apiKey: strategy.apiKey,
              baseUrl: 'https://openrouter.ai/api/v1'
            }

            const apiResponse = await apiManager.createMessage('openrouter', apiOptions)

            // Parse the response
            let response: APIResponse
            const contentType = apiResponse.headers.get('content-type') || ''
            if (contentType.includes('application/json')) {
              const result = await apiResponse.json()
              if (result.error) {
                throw new Error(result.error.message || 'OpenRouter API error')
              }
              response = {
                content: result.choices?.[0]?.message?.content || '',
                tokens_used: result.usage?.total_tokens || 0
              }
            } else {
              throw new Error('Invalid response from OpenRouter')
            }
            
            const endTime = Date.now()
            const duration = endTime - startTime
            
            // Handle credits if using credits strategy
            if (strategy.strategy === 'credits') {
              try {
                const actualCost = response.tokens_used * 0.00003
                await openRouterManager.deductCredits(user.id, actualCost)
                await openRouterManager.recordUsage(
                  user.id,
                  model,
                  Math.floor(response.tokens_used * 0.7),
                  Math.floor(response.tokens_used * 0.3),
                  actualCost,
                  strategy.strategy
                )
              } catch (creditError) {
                console.error('[MCP] Error handling credits:', creditError)
              }
            }
            
            console.log(`[MCP] ${provider.display_name} (${model}) credits-only - Duration: ${duration}ms, Tokens: ${response.tokens_used}`)
            return {
              model,
              provider: `${provider.display_name} (Credits Only)`,
              content: response.content,
              tokens_used: response.tokens_used,
              response_time_ms: duration,
              strategy: strategy.strategy,
              fallback: true
            }
            
          } catch (creditsError) {
            console.error(`[MCP] Credits-only fallback failed:`, creditsError)
            return {
              model,
              error: `Credits-only mode failed. Please add your API key or purchase more credits.`
            }
          }
        }

        // Decode the Base64 encoded API key
        const decryptedKey = Buffer.from(apiKeyForModel.encrypted_key, 'base64').toString('utf-8')
        console.log(`[MCP] Decoded key for ${provider.display_name}: ${decryptedKey.substring(0, 10)}...`)

        console.log(`[MCP] ${provider.display_name} settings - temp: ${providerTemperature}, tokens: ${providerMaxTokens} (API budget: $${apiKeyForModel.monthly_budget || 'unlimited'}, used: $${apiKeyForModel.current_usage || '0'})`)

        // Determine usage path based on user preference and availability
        let usagePath = 'credits' // Default fallback
        let sessionType = 'credits'
        
        const hasValidApiKey = apiKeyForModel && decryptedKey && decryptedKey !== 'demo_key'
        const userUsagePreference = 'auto' // Default usage preference

        // Apply usage preference logic
        switch (userUsagePreference) {
          case 'auto':
            // CLI preference - CLI integration handled by separate CLI handlers (codex-cli, claude-code, gemini-cli)
            // For MCP route, fall back to API keys → credits as per user's preference order
            if (hasValidApiKey) {
              usagePath = 'api_key'
              sessionType = 'api_key'
            } else {
              usagePath = 'credits'
              sessionType = 'credits'
            }
            break
          case 'auto':
          default:
            // Auto mode: prefer CLI → API keys → Credits (as user specified)
            // For now CLI integration is handled by separate CLI handlers
            // So we check: API keys first, then credits as fallback
            if (hasValidApiKey) {
              usagePath = 'api_key'
              sessionType = 'api_key'
            } else {
              usagePath = 'credits'
              sessionType = 'credits'
            }
            break
        }
        
        console.log(`[MCP Usage] Usage path: ${usagePath} for ${provider.display_name} (user preference: ${userUsagePreference})`)

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

        // Simple cost estimation based on model and tokens (always needed for tracking)
        const estimatedInputTokens = Math.ceil(contextualPrompt.length / 4)
        const estimatedOutputTokens = Math.min(providerMaxTokens, 1000)
        
        // Only check credits if using credits path
        let estimatedCost = 0
        if (usagePath === 'credits') {
          let baseCost = 0.1 // Default fallback cost
          
          // Basic cost estimation for common models
          if (model.includes('gpt-4') || model.includes('claude-3')) {
            baseCost = (estimatedInputTokens * 0.00003 + estimatedOutputTokens * 0.00006) * 10 // Convert to credits
          } else if (model.includes('gpt-3.5') || model.includes('claude-haiku')) {
            baseCost = (estimatedInputTokens * 0.0000015 + estimatedOutputTokens * 0.000002) * 10
          } else {
            baseCost = 0.05 // Very conservative estimate for other models
          }

          console.log(`[MCP Credit] Base cost for ${model}: ${baseCost} credits`)

          // Check credit sufficiency with 10% markup
          const creditCheck = await subscriptionManager.checkCreditSufficiency(user.id, baseCost, true)
          if (!creditCheck.sufficient) {
            return {
              model,
              error: creditCheck.reason,
              requiresCredits: true,
              estimatedCost: creditCheck.markedUpCost
            }
          }
          estimatedCost = creditCheck.markedUpCost
        }

        // Check user's budget limits using direct query
        let budgetExceeded = false
        try {
          let { data: budgetData, error: budgetError } = await serviceRoleSupabase
            .from('user_budgets')
            .select('daily_limit, weekly_limit, monthly_limit')
            .eq('user_id', user.id)
            .single()
          
          // If no budget exists, create a default one
          if (budgetError && budgetError.code === 'PGRST116') {
            const { data: newBudget, error: createError } = await serviceRoleSupabase
              .from('user_budgets')
              .insert({
                user_id: user.id,
                daily_limit: null,
                weekly_limit: null,
                monthly_limit: null,
                preferred_models: [],
                auto_top_up_enabled: false,
                auto_top_up_threshold: null,
                auto_top_up_amount: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select('daily_limit, weekly_limit, monthly_limit')
              .single()
            
            if (createError) {
              console.error('[MCP] Failed to create default budget:', createError)
              budgetData = null
            } else {
              budgetData = newBudget
            }
          }
          
          if (budgetData) {
            const now = new Date()
            
            // Check daily limit
            if (budgetData.daily_limit) {
              const startOfDay = new Date(now)
              startOfDay.setHours(0, 0, 0, 0)
              const { data: dailyUsage } = await serviceRoleSupabase
                .from('model_usage')
                .select('total_cost')
                .eq('user_id', user.id)
                .gte('request_timestamp', startOfDay.toISOString())
                .lte('request_timestamp', now.toISOString())
              
              const dailySpent = (dailyUsage || []).reduce((sum: number, usage: any) => sum + usage.total_cost, 0)
              if (dailySpent >= budgetData.daily_limit) {
                budgetExceeded = true
              }
            }
            
            // Check weekly limit if daily didn't exceed
            if (!budgetExceeded && budgetData.weekly_limit) {
              const startOfWeek = new Date(now)
              startOfWeek.setDate(now.getDate() - now.getDay())
              startOfWeek.setHours(0, 0, 0, 0)
              const { data: weeklyUsage } = await serviceRoleSupabase
                .from('model_usage')
                .select('total_cost')
                .eq('user_id', user.id)
                .gte('request_timestamp', startOfWeek.toISOString())
                .lte('request_timestamp', now.toISOString())
              
              const weeklySpent = (weeklyUsage || []).reduce((sum: number, usage: any) => sum + usage.total_cost, 0)
              if (weeklySpent >= budgetData.weekly_limit) {
                budgetExceeded = true
              }
            }
            
            // Check monthly limit if weekly didn't exceed
            if (!budgetExceeded && budgetData.monthly_limit) {
              const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
              const { data: monthlyUsage } = await serviceRoleSupabase
                .from('model_usage')
                .select('total_cost')
                .eq('user_id', user.id)
                .gte('request_timestamp', startOfMonth.toISOString())
                .lte('request_timestamp', now.toISOString())
              
              const monthlySpent = (monthlyUsage || []).reduce((sum: number, usage: any) => sum + usage.total_cost, 0)
              if (monthlySpent >= budgetData.monthly_limit) {
                budgetExceeded = true
              }
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

        // Resolve model ID for the specific provider using shared resolver (same as chat API)
        let resolvedModelId = cleanModel
        try {
          resolvedModelId = await resolveProviderModelId(cleanModel, provider.provider_name)
          console.log(`[MCP] Model resolution for ${cleanModel} with ${provider.provider_name}: ${resolvedModelId}`)
        } catch (resolutionError) {
          console.warn(`[MCP] Model resolution failed for ${cleanModel}:`, resolutionError)
          // Continue with original model ID
        }

        // Use apiManager directly like the chat API does
        let response: APIResponse
        try {
          // Build API options similar to chat API
          const apiOptions: any = {
            model: resolvedModelId, // Use resolved model ID
            messages: [{ role: 'user' as const, content: contextualPrompt }],
            temperature: providerTemperature,
            maxTokens: providerMaxTokens,
            stream: false,
            apiKey: decryptedKey,
            baseUrl: provider.base_url
          }

          // Handle model-specific parameter requirements (same as chat API)
          if (model === 'gpt-5' || model.includes('gpt-5')) {
            apiOptions.max_completion_tokens = providerMaxTokens
            delete apiOptions.maxTokens
          }

          // Call apiManager.createMessage directly like chat API does
          const apiResponse = await apiManager.createMessage(provider.provider_name, apiOptions)

          // Parse the response based on content type
          const contentType = apiResponse.headers.get('content-type') || ''
          if (contentType.includes('application/json')) {
            const result = await apiResponse.json()
            console.log(`[MCP DEBUG] API Response for ${resolvedModelId}:`, {
              provider: provider.provider_name,
              hasChoices: !!result.choices,
              hasError: !!result.error,
              contentPreview: result.choices?.[0]?.message?.content?.substring(0, 100)
            })

            if (result.error) {
              throw new Error(result.error.message || 'API error')
            }

            // CRITICAL FIX: For GPT-5, extract content directly like chat API does
            // Check both the resolved model ID and the original model name
            const isGPT5 = resolvedModelId?.includes('gpt-5') ||
                           model?.includes('gpt-5') ||
                           cleanModel?.includes('gpt-5') ||
                           provider.provider_name === 'openai' && model === 'gpt-5'

            console.log(`[MCP JSON DEBUG] Pre-extraction check:`, {
              isGPT5,
              model,
              resolvedModelId,
              cleanModel,
              providerName: provider.provider_name,
              resultType: typeof result,
              hasChoices: !!result.choices,
              contentPreview: result.choices?.[0]?.message?.content?.substring(0, 50)
            })

            if (isGPT5) {
              console.log(`[MCP] GPT-5 detected (model: ${model}, resolved: ${resolvedModelId}), extracting content directly`)

              // Extract content directly from the standard OpenAI response format
              if (result.choices?.[0]?.message?.content !== undefined) {
                const extractedContent = result.choices[0].message.content
                response = {
                  content: extractedContent,
                  tokens_used: result.usage?.total_tokens || 0
                }
                console.log(`[MCP] EXTRACTION SUCCESS - GPT-5 content: "${extractedContent}"`)
                console.log(`[MCP] Response object created:`, { content: response.content, tokens: response.tokens_used })
              } else {
                console.error(`[MCP] GPT-5 response missing expected structure:`, result)
                response = {
                  content: 'Error: Unable to extract GPT-5 response',
                  tokens_used: result.usage?.total_tokens || 0
                }
              }
            } else {
              // Use the existing parseResponse function for other providers
              response = parseResponse(provider.provider_name, result, resolvedModelId)
              console.log(`[MCP] Used parseResponse, got:`, { content: response.content?.substring(0, 50), tokens: response.tokens_used })
            }

            // Additional safety check: if content is still JSON, extract it
            if (response.content && typeof response.content === 'string') {
              const trimmed = response.content.trim()
              if (trimmed.startsWith('{') && trimmed.includes('"choices"')) {
                console.error(`[MCP] WARNING: response.content still contains JSON, extracting...`)
                try {
                  const parsed = JSON.parse(response.content)
                  if (parsed.choices?.[0]?.message?.content) {
                    response.content = parsed.choices[0].message.content
                    console.log(`[MCP] Extracted actual content: "${response.content}"`)
                  }
                } catch (e) {
                  console.error(`[MCP] Failed to extract content from JSON:`, e)
                }
              }
            }

            console.log(`[MCP DEBUG] Parsed response for ${resolvedModelId}:`, {
              contentPreview: response.content?.substring(0, 100),
              tokens: response.tokens_used,
              isJsonContent: response.content?.includes('"choices"')
            })
          } else if (contentType.includes('text/event-stream')) {
            // Handle streaming responses if needed
            const text = await apiResponse.text()
            response = {
              content: text,
              tokens_used: Math.ceil(text.length / 4) // Estimate tokens
            }
          } else {
            throw new Error('Invalid response format from provider')
          }
        } catch (apiKeyErr: any) {
          const msg = apiKeyErr instanceof Error ? apiKeyErr.message : String(apiKeyErr)
          const isAuth = /401|unauthori(z|s)ed|invalid api key|forbidden|key/i.test(msg)
          console.error(`[MCP] API key issue for ${provider.display_name}: ${msg}`)
          return {
            model: cleanModel,
            originalModel: model,
            error: isAuth
              ? `Your API key for ${provider.display_name} appears invalid or unauthorized. Unable to send perspectives with this provider.`
              : `Provider call failed for ${provider.display_name}: ${msg}`,
            latency_ms: Date.now() - startTime
          }
        }

        // Track usage and deduct costs based on usage path
        try {
          const actualInputTokens = Math.ceil(contextualPrompt.length / 4)
          const actualOutputTokens = response.tokens_used || estimatedOutputTokens
          
          // Calculate actual cost with 10% markup for credits
          let actualCost = 0
          if (usagePath === 'credits') {
            // Use the marked-up cost we already calculated
            actualCost = estimatedCost // This already includes the 10% markup
          }
          const costUSD = usagePath === 'api_key' ? estimatedCost / 1.1 * 0.1 : 0 // Rough USD estimate for API key usage
          
          // Track comprehensive usage session
          await serviceRoleSupabase.rpc('track_usage_session', {
            p_user_id: user.id,
            p_session_type: sessionType,
            p_tool_name: 'polydev_mcp',
            p_model_name: cleanModel,
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
              model_name: cleanModel,
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

        // Increment message count for successful requests
        try {
          await subscriptionManager.incrementMessageCount(user.id, false, 'mcp')
        } catch (messageError) {
          console.warn('[MCP] Failed to increment message count:', messageError)
        }

        const latency = Date.now() - startTime

        // Debug: Log if response content looks like it contains formatted output
        if (response.content && typeof response.content === 'string') {
          if (response.content.includes('# Multiple AI Perspectives') ||
              response.content.includes('Got ') && response.content.includes('perspectives in')) {
            console.error(`[MCP] WARNING: ${cleanModel} response contains MCP-formatted content!`)
            console.error(`[MCP] Response preview: ${response.content.substring(0, 200)}...`)
          }
          if (response.content.includes('"id"') && response.content.includes('"object"') &&
              response.content.includes('"chat.completion"')) {
            console.error(`[MCP] WARNING: ${cleanModel} response contains raw JSON API response!`)
            console.error(`[MCP] Response preview: ${response.content.substring(0, 200)}...`)
          }
        }

        // Check if response.content is raw JSON and extract the actual content
        let finalContent = response.content
        console.log(`[MCP FINAL CHECK] Model: ${cleanModel}, Content type: ${typeof finalContent}, Length: ${finalContent?.length || 0}`)
        console.log(`[MCP FINAL CHECK] Content preview:`, finalContent?.substring(0, 100))

        if (finalContent && typeof finalContent === 'string') {
          const trimmed = finalContent.trim()
          if (trimmed.startsWith('{') && trimmed.includes('"choices"')) {
            console.log(`[MCP CRITICAL] JSON DETECTED in finalContent for ${cleanModel}! Extracting...`)
            console.log(`[MCP CRITICAL] Full JSON:`, trimmed.substring(0, 300))
            try {
              const parsed = JSON.parse(finalContent)
              if (parsed.choices?.[0]?.message?.content !== undefined) {
                finalContent = parsed.choices[0].message.content
                console.log(`[MCP CRITICAL] EXTRACTION SUCCESS: "${finalContent}"`)
              } else {
                console.error(`[MCP CRITICAL] No content field in parsed JSON`)
              }
            } catch (e) {
              console.error(`[MCP CRITICAL] Failed to parse JSON:`, e)
            }
          }
        }

        // Final JSON check before returning
        if (finalContent && typeof finalContent === 'string') {
          const trimCheck = finalContent.trim()
          if (trimCheck.startsWith('{') && trimCheck.includes('"choices"')) {
            console.error(`[MCP RETURN ERROR] STILL JSON at return point for ${cleanModel}!`)
            try {
              const parsed = JSON.parse(finalContent)
              if (parsed.choices?.[0]?.message?.content !== undefined) {
                finalContent = parsed.choices[0].message.content
                console.log(`[MCP RETURN FIX] Extracted at return: "${finalContent}"`)
              }
            } catch (e) {
              console.error(`[MCP RETURN ERROR] Failed to parse:`, e)
            }
          }
        }

        const returnValue = {
          model: cleanModel, // Use clean model name in response
          originalModel: model, // Keep original for debugging
          provider: provider.display_name,
          content: finalContent,
          tokens_used: response.tokens_used,
          latency_ms: latency
        }

        console.log(`[MCP RETURN] Returning response for ${cleanModel}:`, {
          hasContent: !!returnValue.content,
          contentLength: returnValue.content?.length || 0,
          contentPreview: returnValue.content?.substring(0, 50),
          isJson: returnValue.content?.includes('"choices"') || false
        })

        return returnValue
      } catch (error) {
        const latency = Date.now() - startTime
        return {
          model: cleanModel || model,
          originalModel: model,
          error: `Failed to get response from ${cleanModel || model}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          latency_ms: latency
        }
      }
    })
  )

  const totalTokens = responses.reduce((sum, r) => sum + (r.tokens_used || 0), 0)
  const totalLatency = Math.max(...responses.map(r => r.latency_ms || 0))
  const successCount = responses.filter(r => !r.content.error).length

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
      if (!response.content?.error) {
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
      // Extract provider from the response.provider field, or determine from model name
      const providerName = response.provider?.toLowerCase() || 'unknown'
      const provider = providerName.replace(/\s*\(.*\)$/, '').trim() // Remove any suffixes like "(Credits)"
      const pricingKey = `${provider}:${response.model}`
      const pricing = pricingMap.get(pricingKey)
      
      let cost = 0
      if (pricing && response.tokens_used && !response.content?.error) {
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

      if (!response.content?.error && response.content) {
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
        total_prompt_tokens: Math.floor(args.prompt.length / 4) * responses.filter(r => !r.content.error).length,
        total_tokens: totalTokens,
        provider_costs: providerCosts,
        total_cost: totalAccurateCost,
        response_time_ms: totalLatency,
        first_token_time_ms: Math.min(...responses.map(r => r.latency_ms || totalLatency)),
        provider_latencies: providerLatencies,
        status: successCount === responses.length ? 'success' : 
                successCount > 0 ? 'partial_success' : 'error',
        error_message: responses.filter(r => r.content?.error).map(r => r.content?.error).join('; ') || null,
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

  // Get updated credit balance and subscription status for display
  let statusDisplay = ''
  try {
    // Get subscription using service role and avoid auto-creation for status display
    const subscription = await subscriptionManager.getUserSubscription(user.id, true, false)
    const messageUsage = await subscriptionManager.getUserMessageUsage(user.id)
    
    // Determine which usage method was primarily used for this request
    // Since we already tracked the usage paths during processing, we can derive this from successful responses
    const successfulResponses = responses.filter(r => !r.content?.error)
    let primaryUsageMethod = 'api_keys'
    
    // Simple heuristic: if we have successful responses, assume API keys were primarily used
    // unless user preference was explicitly set to credits
    //   const userUsagePreference = 'auto' // Default usage preference
    // //if (userUsagePreference === 'credits') {
    //  // primaryUsageMethod = 'credits'
    // //} else if (successfulResponses.length > 0) {
    //  // primaryUsageMethod = 'api_keys'
    // //} else {
    //  // primaryUsageMethod = 'credits'
    // //}
    //     const hasValidApiKey = apiKeyForModel && decryptedKey && decryptedKey !== 'demo_key'
    //     const userUsagePreference = 'auto' // Default usage preference

    //     // Apply usage preference logic
    //     switch (userUsagePreference) {
    //       case 'auto':
    //         // CLI preference - CLI integration handled by separate CLI handlers (codex-cli, claude-code, gemini-cli)
    //         // For MCP route, fall back to API keys → credits as per user's preference order
    //         if (hasValidApiKey) {
    //           usagePath = 'api_key'
    //           sessionType = 'api_key'
    //         } else {
    //           usagePath = 'credits'
    //           sessionType = 'credits'
    //         }
    //         break
    //       case 'auto':
    //       default:
    //         // Auto mode: prefer CLI → API keys → Credits (as user specified)
    //         // For now CLI integration is handled by separate CLI handlers
    //         // So we check: API keys first, then credits as fallback
    //         if (hasValidApiKey) {
    //           usagePath = 'api_key'
    //           sessionType = 'api_key'
    //         } else {
    //           usagePath = 'credits'
    //           sessionType = 'credits'
    //         }
    //         break
    //     }
    
    // // Display usage method clearly
    // if (primaryUsageMethod === 'api_keys') {
    //   statusDisplay += `\n🔑 **Usage Method**: Own API Keys`
    //   if (successfulResponses.length > 0) {
    //     statusDisplay += ` (${successfulResponses.length} model${successfulResponses.length > 1 ? 's' : ''})`
    //   }
    // } else {
    //   // Get credit balance for credits usage
    //   const { data: currentCredits } = await serviceRoleSupabase
    //     .from('user_credits')
    //     .select('balance, promotional_balance, total_purchased, total_spent')
    //     .eq('user_id', user.id)
    //     .single()
      
    //   if (currentCredits) {
    //     const totalBalance = (currentCredits.balance || 0) + (currentCredits.promotional_balance || 0)
    //     const lifetimeSpent = currentCredits.total_spent || 0
        
    //     statusDisplay += `\n💰 **Usage Method**: Credits - ${totalBalance.toFixed(3)} remaining (${currentCredits.balance?.toFixed(3) || 0} purchased + ${currentCredits.promotional_balance?.toFixed(3) || 0} promotional)`
    //     statusDisplay += ` | Lifetime spent: ${lifetimeSpent.toFixed(3)} credits`
        
    //     // Calculate cost for this specific request with 10% markup
    //     const requestCosts = responses
    //       .filter(r => !r.error && r.tokens_used)
    //       .map(r => {
    //         const estimatedInputTokens = Math.ceil(contextualPrompt.length / 4)
    //         const estimatedOutputTokens = r.tokens_used || 0
    //         let baseCost = 0.05 // Conservative fallback
            
    //         if (r.model.includes('gpt-4') || r.model.includes('claude-3')) {
    //           baseCost = (estimatedInputTokens * 0.00003 + estimatedOutputTokens * 0.00006) * 10
    //         } else if (r.model.includes('gpt-3.5') || r.model.includes('claude-haiku')) {
    //           baseCost = (estimatedInputTokens * 0.0000015 + estimatedOutputTokens * 0.000002) * 10
    //         }
            
    //         return subscriptionManager.applyMarkup(baseCost) // Apply 10% markup
    //       })
        
    //     const totalRequestCost = requestCosts.reduce((sum, cost) => sum + cost, 0)
        
    //     if (totalRequestCost > 0) {
    //       statusDisplay += ` | Request cost: ~${totalRequestCost.toFixed(4)} credits (includes 10% markup)`
    //     }
    //   }
    // }
    
    // Add subscription status
    const planTier = subscription?.tier
    const planStatus = subscription?.status || 'N/A'
    statusDisplay += `\n📋 **Plan**: ${planTier === 'pro' ? 'Polydev Pro ($20/month)' : 'Free'} (${planStatus})`
    
    // Add message usage status
    if (messageUsage) {
      const messagesLeft = messageUsage.messages_limit - messageUsage.messages_sent
      statusDisplay += `\n📨 **Messages**: ${messageUsage.messages_sent}/${messageUsage.messages_limit} used this month`
      
      if (planTier === 'free' && messagesLeft <= 10) {
        statusDisplay += ` | ⚠️ ${messagesLeft} messages left - upgrade to Pro for unlimited messages!`
      } else if (planTier === 'pro') {
        statusDisplay += ` | ✅ Unlimited messages available`
      }
    }
    
    // Add CLI status using canUseCLI for accurate check
    const cliCheck = await subscriptionManager.canUseCLI(user.id, true)
    if (cliCheck.canUse) {
      statusDisplay += `\n🖥️ **CLI Access**: ✅ Available`
    } else {
      statusDisplay += `\n🖥️ **CLI Access**: ❌ Requires Pro subscription`
    }
    
    // Log potential mismatch for debugging
    if (planTier !== 'pro' && cliCheck.canUse) {
      console.warn('[MCP Status] CLI allowed but subscription not pro – investigate RLS / duplicate row', { userId: user.id, planTier, cliAccess: cliCheck.canUse })
    }
    
    statusDisplay += '\n'
    
  } catch (statusError) {
    console.warn('[MCP] Failed to get account status:', statusError)
  }

  // Compute per-response cost using models.dev-backed pricing
  const perResponseCost: Record<number, number> = {}
  for (let i = 0; i < responses.length; i++) {
    const r: any = responses[i]
    if (r && !r.error && r.tokens_used) {
      try {
        // Try to resolve friendly id for pricing lookup
        let friendlyId = r.model
        if (friendlyId.includes('/')) {
          const resolved = await modelsDevService.getFriendlyIdFromProviderModelId(friendlyId)
          friendlyId = resolved || friendlyId
        }
        // Determine provider id (normalized)
        let providerId = 'openrouter' // Default
        if (typeof r.provider === 'string') {
          const providerLower = r.provider.toLowerCase()
          if (providerLower.includes('openrouter')) {
            providerId = 'openrouter'
          } else if (providerLower.includes('openai')) {
            providerId = 'openai'
          } else if (providerLower.includes('anthropic')) {
            providerId = 'anthropic'
          } else if (providerLower.includes('google') || providerLower.includes('gemini')) {
            providerId = 'google'
          } else if (providerLower.includes('groq')) {
            providerId = 'groq'
          } else if (providerLower.includes('deepseek')) {
            providerId = 'deepseek'
          }
        }
        const limits = await modelsDevService.getModelLimits(friendlyId, providerId)
        const pricing = limits?.pricing
        if (pricing) {
          const inputTokens = Math.floor(r.tokens_used * 0.25)
          const outputTokens = r.tokens_used - inputTokens
          const cost = (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output
          perResponseCost[i] = Number(cost.toFixed(6))
        }
      } catch (e) {
        // Ignore pricing errors; cost will be omitted for that response
      }
    }
  }

  // Format the response
  let formatted = `# Multiple AI Perspectives\n\n`
  formatted += `Got ${successCount}/${responses.length} perspectives in ${totalLatency}ms using ${totalTokens} tokens.${statusDisplay}\n`

  responses.forEach((response, index) => {
    const modelName = response.model.toUpperCase()
    const providerName = response.provider ? ` (${response.provider})` : ''

    if (response.content.error) {
      formatted += `## ${modelName}${providerName} - ERROR\n`
      formatted += `❌ ${response.content.error}\n\n`
    } else {
      formatted += `## ${modelName}${providerName}\n`

      // Extract actual content from response
      let content = response.content || ''

      // For GPT-5, extract from JSON if needed
      if (response.model.toLowerCase().includes('gpt-5') && content) {
        try {
          // Try to parse as JSON if it looks like JSON
          if (typeof content === 'string' && content.trim().startsWith('{')) {
            const parsed = JSON.parse(content)

            // Extract from OpenAI response format
            if (parsed.choices && parsed.choices[0]) {
              if (parsed.choices[0].message?.content) {
                content = parsed.choices[0].message.content
              } else if (parsed.choices[0].text) {
                content = parsed.choices[0].text
              }
            }
            // Also handle if content is nested
            else if (parsed.content) {
              content = parsed.content
            }
          }
        } catch (e) {
          // If parsing fails, use content as is
          console.log('[MCP] GPT-5 JSON parse failed, using raw content')
        }
      }

      formatted += `${content}\n\n`

      if (response.tokens_used) {
        const costStr = perResponseCost[index] != null ? `, Cost: $${perResponseCost[index].toFixed(6)}` : ''
        formatted += `*Tokens: ${response.tokens_used}, Latency: ${response.latency_ms}ms${costStr}*\n\n`
      }
    }

    if (index < responses.length - 1) {
      formatted += '---\n\n'
    }
  })

  // Append a hidden JSON summary for programmatic parsing in clients
  try {
    const summary = {
      perspectives: responses.map((r: any, i: number) => ({
        model: r.model,
        provider: r.provider,
        tokens_used: r.tokens_used || 0,
        cost_usd: perResponseCost[i] ?? null,
        error: r.error || null
      })),
      totals: {
        tokens: totalTokens,
        cost_usd: Object.values(perResponseCost).reduce((sum: number, v: any) => sum + (typeof v === 'number' ? v : 0), 0)
      }
    }
    formatted += `\n\n\n\u0060\u0060\u0060json\n${JSON.stringify(summary)}\n\u0060\u0060\u0060\n`
  } catch (e) {
    // Do not fail the request if summary building fails
  }

  // Store conversation in memory system if enabled
  console.log(`[MCP] Memory - Checking conversation storage. Enabled: ${memoryPreferences.enable_conversation_memory}`)
  
  if (memoryPreferences.enable_conversation_memory) {
    try {
      const totalTokensUsed = responses.reduce((sum, r) => sum + (r.tokens_used || 0), 0)
      const primaryModel = responses.find(r => !r.content?.error)?.model || models[0] || 'unknown'
      
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

// CLI Status Reporting Tool Handlers
async function handleCliStatusReport(args: any, user: any): Promise<string> {
  const { provider, status, authenticated, version, message } = args
  
  // Helper function to format provider name for display  
  const formatProvider = (provider: string): string => {
    switch (provider) {
      case 'claude_code': return 'Claude Code'
      case 'codex_cli': return 'Codex CLI'
      case 'gemini_cli': return 'Gemini CLI'
      default: return provider
    }
  }
  
  if (!provider || !['claude_code', 'codex_cli', 'gemini_cli'].includes(provider)) {
    throw new Error('provider is required and must be one of: claude_code, codex_cli, gemini_cli')
  }

  if (!status || !['available', 'unavailable', 'not_installed', 'error'].includes(status)) {
    throw new Error('status is required and must be one of: available, unavailable, not_installed, error')
  }

  // Get service role client for database operations
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error('CLI status reporting is not properly configured')
  }
  
  const { createClient: createServiceClient } = await import('@supabase/supabase-js')
  const serviceRoleSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  )

  console.log(`[MCP] Recording CLI status for ${provider}: ${status}`)

  try {
    // Prepare update data from client-provided information
    const updateData = {
      user_id: user.id,
      provider: provider,
      status: status,
      last_checked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status_message: message || `Client reported status: ${status}`,
      cli_version: version || null,
      authenticated: authenticated !== undefined ? authenticated : null
    }

    // Check if configuration exists
    const { data: existingConfig } = await serviceRoleSupabase
      .from('cli_provider_configurations')
      .select('user_id, provider')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .single()

    // Update existing or create new configuration
    if (existingConfig) {
      const { error: updateError } = await serviceRoleSupabase
        .from('cli_provider_configurations')
        .update(updateData)
        .eq('user_id', user.id)
        .eq('provider', provider)

      if (updateError) {
        console.error(`[MCP] Error updating CLI status for ${provider}:`, updateError)
        throw new Error(`Failed to update CLI status: ${updateError.message}`)
      }
    } else {
      const { error: insertError } = await serviceRoleSupabase
        .from('cli_provider_configurations')
        .insert({
          ...updateData,
          enabled: status === 'available',
          created_at: new Date().toISOString()
        })

      if (insertError) {
        console.error(`[MCP] Error inserting CLI status for ${provider}:`, insertError)
        throw new Error(`Failed to record CLI status: ${insertError.message}`)
      }
    }

    // Format provider name for user-friendly display
    const formatProvider = (provider: string): string => {
      switch (provider) {
        case 'claude_code': return 'Claude Code'
        case 'codex_cli': return 'Codex CLI'
        case 'gemini_cli': return 'Gemini CLI'
        default: return provider
      }
    }

    const providerName = formatProvider(provider)
    const statusIconMap: Record<string, string> = {
      'available': '✅',
      'unavailable': '⚠️',
      'not_installed': '❌',
      'error': '🔥'
    }
    const statusIcon = statusIconMap[status] || '❓'

    let responseMessage = `${statusIcon} **${providerName} Status Updated**\n\n`
    responseMessage += `**Status:** ${status}\n`
    
    if (version) {
      responseMessage += `**Version:** ${version}\n`
    }
    
    if (authenticated !== undefined) {
      responseMessage += `**Authenticated:** ${authenticated ? '✅ Yes' : '❌ No'}\n`
    }
    
    if (message) {
      responseMessage += `**Details:** ${message}\n`
    }

    responseMessage += `\n**Reported at:** ${new Date().toLocaleString()}`
    responseMessage += `\n\n💡 Visit your [Polydev dashboard](https://polydev.com/dashboard) to see all CLI status updates.`

    console.log(`[MCP] Successfully recorded CLI status for ${provider}`)
    return responseMessage

  } catch (error) {
    console.error(`[MCP] Error in CLI status report:`, error)
    return `❌ **Error Recording CLI Status**

Failed to record status for ${formatProvider(provider)}: ${error instanceof Error ? error.message : 'Unknown error'}

Please try again or contact support if the issue persists.`
  }
}

async function handleCliMonitoringSetup(args: any, user: any): Promise<string> {
  const { interval_minutes = 15, enabled = true } = args
  
  if (interval_minutes < 5 || interval_minutes > 1440) {
    throw new Error('interval_minutes must be between 5 and 1440 (24 hours)')
  }

  // This is a placeholder - in a real implementation you might store monitoring preferences
  // For now, we'll just provide guidance on how to set up monitoring
  
  return `⚙️ **CLI Monitoring Configuration**

${enabled ? '✅ **Enabled**' : '❌ **Disabled**'} - Check every ${interval_minutes} minutes

**Automatic CLI Status Monitoring Setup:**

1. **Environment Variables** (already configured):
   \`\`\`bash
   export POLYDEV_MCP_TOKEN="your_token"
   export POLYDEV_USER_ID="${user.id}"
   export POLYDEV_API_URL="https://polydev.com/api/cli-status-update"
   \`\`\`

2. **Set up automatic monitoring** with cron (optional):
   \`\`\`bash
   # Add to crontab for every ${interval_minutes} minutes
   */${interval_minutes} * * * * /usr/local/bin/node /path/to/cli-status-reporter.js
   \`\`\`

3. **MCP Client Integration** (recommended):
   Your MCP client (Claude Code, Cursor, etc.) can automatically run status checks when tools are used.

**What gets monitored:**
- 🔍 **Claude Code**: Installation, authentication, version
- 🔍 **Codex CLI**: Installation, authentication, version  
- 🔍 **Gemini CLI**: Installation, authentication, version

**Status Updates:**
- Real-time reporting to Polydev dashboard
- Authentication status changes
- Installation detection
- Error diagnostics and resolution hints

**Monitor your CLI status** at: [Polydev Dashboard → API Keys → CLI Providers](https://polydev.com/dashboard/models)`
}

async function handleListAvailableModels(args: any, user: any, request: NextRequest): Promise<string> {
  const { filter_by_tier = 'all', show_only_available = false } = args

  try {
    // Call the /api/models/available endpoint
    const baseUrl = request.nextUrl.origin
    const response = await fetch(`${baseUrl}/api/models/available`, {
      headers: {
        'Authorization': request.headers.get('authorization') || '',
        'Cookie': request.headers.get('cookie') || '',
        'x-client-source': request.headers.get('x-client-source') || '',
        'user-agent': request.headers.get('user-agent') || ''
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`)
    }

    const data = await response.json()
    const { subscription, models, meta } = data

    // Filter models
    let filteredModels = models
    if (filter_by_tier !== 'all') {
      filteredModels = models.filter((m: any) => m.tier === filter_by_tier)
    }
    if (show_only_available) {
      filteredModels = filteredModels.filter((m: any) => m.availability.status === 'available')
    }

    // Group by tier
    const premium = filteredModels.filter((m: any) => m.tier === 'premium')
    const normal = filteredModels.filter((m: any) => m.tier === 'normal')
    const eco = filteredModels.filter((m: any) => m.tier === 'eco')

    // Format output
    let output = `## 📊 Available AI Models\n\n`
    output += `**Your Subscription:** ${subscription.tier}\n`
    output += `**Perspectives Remaining:** Premium: ${subscription.perspectives.premium.remaining}/${subscription.perspectives.premium.total} | `
    output += `Normal: ${subscription.perspectives.normal.remaining}/${subscription.perspectives.normal.total} | `
    output += `Eco: ${subscription.perspectives.eco.remaining}/${subscription.perspectives.eco.total}\n\n`

    if (meta.auto_exclusions.length > 0) {
      output += `⚠️ **Auto-excluded providers:** ${meta.auto_exclusions.join(', ')}\n\n`
    }

    const formatModel = (m: any) => {
      const icon = m.availability.status === 'available' ? '✅' :
                   m.availability.status === 'fallback' ? '⚡' :
                   m.availability.status === 'locked' ? '🔒' : '❌'

      const source = m.availability.primary_source === 'cli' ? 'CLI (FREE)' :
                     m.availability.primary_source === 'api' ? 'API (FREE)' :
                     m.availability.primary_source === 'admin' ? `${m.availability.perspectives_needed} ${m.tier.toUpperCase()}` :
                     'Unavailable'

      return `${icon} **${m.display_name}** (${m.model_id})\n   Source: ${source}\n`
    }

    if (premium.length > 0) {
      output += `### 🔮 Premium Models (${premium.length})\n`
      premium.forEach((m: any) => { output += formatModel(m) })
      output += '\n'
    }

    if (normal.length > 0) {
      output += `### ⚙️ Normal Models (${normal.length})\n`
      normal.forEach((m: any) => { output += formatModel(m) })
      output += '\n'
    }

    if (eco.length > 0) {
      output += `### 🌿 Eco Models (${eco.length})\n`
      eco.forEach((m: any) => { output += formatModel(m) })
      output += '\n'
    }

    output += `\n**Usage:** Use \`select_models_interactive\` to select models for your next perspective request.`

    return output

  } catch (error) {
    console.error('Error in handleListAvailableModels:', error)
    throw error
  }
}

async function handleSelectModelsInteractive(args: any, user: any, request: NextRequest): Promise<string> {
  const { model_ids, validate_only = false } = args

  try {
    // Call the /api/perspectives/validate endpoint
    const baseUrl = request.nextUrl.origin
    const response = await fetch(`${baseUrl}/api/perspectives/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('authorization') || '',
        'Cookie': request.headers.get('cookie') || '',
        'x-client-source': request.headers.get('x-client-source') || '',
        'user-agent': request.headers.get('user-agent') || ''
      },
      body: JSON.stringify({ model_ids })
    })

    if (!response.ok) {
      throw new Error(`Failed to validate models: ${response.statusText}`)
    }

    const data = await response.json()
    const { valid, warnings, estimated_usage, cost_breakdown, quotas_remaining } = data

    let output = `## 🎯 Model Selection\n\n`

    if (valid) {
      output += `✅ **Selection Valid**\n\n`
    } else {
      output += `⚠️ **Selection Issues Found**\n\n`
    }

    // Show cost breakdown
    output += `### 💰 Cost Breakdown\n`
    cost_breakdown.forEach((item: any) => {
      const costStr = item.cost === 0 ? 'FREE' : `${item.cost} ${item.tier.toUpperCase()}`
      output += `- **${item.model_name}**: ${costStr} (via ${item.source.toUpperCase()})\n`
    })

    // Show estimated usage
    output += `\n### 📊 Estimated Perspective Usage\n`
    output += `- Premium: ${estimated_usage.premium_perspectives}\n`
    output += `- Normal: ${estimated_usage.normal_perspectives}\n`
    output += `- Eco: ${estimated_usage.eco_perspectives}\n`

    // Show remaining quotas
    output += `\n### 📈 Quotas After This Request\n`
    output += `- Premium: ${quotas_remaining.premium} remaining\n`
    output += `- Normal: ${quotas_remaining.normal} remaining\n`
    output += `- Eco: ${quotas_remaining.eco} remaining\n`

    // Show warnings if any
    if (warnings.length > 0) {
      output += `\n### ⚠️ Warnings\n`
      warnings.forEach((w: any) => {
        output += `- **${w.model_name}**: ${w.message}\n`
        if (w.suggested_alternative) {
          output += `  → Suggested alternative: ${w.suggested_alternative.model_name}\n`
        }
      })
    }

    if (!validate_only && valid) {
      output += `\n✅ **Ready to use!** Pass these model_ids to \`get_perspectives\` tool:\n\`\`\`json\n${JSON.stringify(model_ids, null, 2)}\n\`\`\``
    } else if (validate_only) {
      output += `\n💡 Set \`validate_only: false\` to confirm selection.`
    }

    return output

  } catch (error) {
    console.error('Error in handleSelectModelsInteractive:', error)
    throw error
  }
}

// Helper function to get default model for a provider
// Returns null if no default_model is configured - user must set it in dashboard
function getDefaultModelForProvider(provider: string): string | null {
  // No hardcoded defaults - user must configure default_model in dashboard/models
  return null
}

// Get models from available API keys and user preferences
function getModelsFromApiKeysAndPreferences(apiKeys: any[], preferences: any): string[] {
  if (!apiKeys || apiKeys.length === 0) {
    console.log('[MCP] No API keys available')
    return [] // User must configure API keys in dashboard
  }
  
  console.log('[MCP] Getting models from API keys and preferences')
  console.log('[MCP] Available API keys:', apiKeys.map(k => ({ provider: k.provider, default_model: k.default_model })))
  console.log('[MCP] User preferences:', preferences?.model_preferences)
  
  const models: string[] = []
  const usedProviders = new Set<string>()
  
  // First, try to use models from user preferences if they match available API keys
  if (preferences?.model_preferences && typeof preferences.model_preferences === 'object') {
    const sortedProviders = Object.entries(preferences.model_preferences)
      .filter(([_, pref]: [string, any]) => pref && typeof pref === 'object')
      .sort(([_, a]: [string, any], [__, b]: [string, any]) => (a.order || 0) - (b.order || 0))
    
    for (const [prefProvider, pref] of sortedProviders) {
      // Normalize provider names for matching
      const normalizedPrefProvider = normalizeProviderName(prefProvider)
      
      // Find matching API key with flexible provider name matching
      const matchingApiKey = apiKeys.find(key => {
        const normalizedKeyProvider = normalizeProviderName(key.provider)
        return normalizedKeyProvider === normalizedPrefProvider
      })
      
      if (matchingApiKey) {
        // Use the model from preferences or the default model from API key
        let selectedModel: string | null = null

        if (pref && typeof pref === 'object' && (pref as any).models && Array.isArray((pref as any).models) && (pref as any).models.length > 0) {
          selectedModel = (pref as any).models[0]
        } else if (matchingApiKey.default_model) {
          selectedModel = matchingApiKey.default_model
        }
        // No hardcoded fallback - user must set default_model in API key

        if (selectedModel) {
          models.push(selectedModel)
          usedProviders.add(normalizedPrefProvider)
          console.log(`[MCP] Added model from preferences: ${selectedModel} (${matchingApiKey.provider})`)
        } else {
          console.log(`[MCP] No model configured for ${matchingApiKey.provider} - user must set default_model in dashboard`)
        }
      } else {
        console.log(`[MCP] Preference provider ${prefProvider} not found in API keys`)
      }
    }
  }
  
  // Then, add models from remaining API keys that weren't in preferences (max 3 total)
  for (const apiKey of apiKeys) {
    if (models.length >= 3) break // Limit to 3 models for performance

    const normalizedProvider = normalizeProviderName(apiKey.provider)
    if (!usedProviders.has(normalizedProvider)) {
      const selectedModel = apiKey.default_model
      if (selectedModel) {
        models.push(selectedModel)
        usedProviders.add(normalizedProvider)
        console.log(`[MCP] Added model from available API key: ${selectedModel} (${apiKey.provider})`)
      } else {
        console.log(`[MCP] Skipping ${apiKey.provider} - no default_model configured`)
      }
    }
  }

  // If still no models, return empty array - user must configure default_model in dashboard
  if (models.length === 0 && apiKeys.length > 0) {
    console.log(`[MCP] No models available - all API keys missing default_model. User must configure in dashboard/models`)
  }
  
  console.log(`[MCP] Final selected models: ${models.join(', ')}`)
  return models
}

// Get top N models directly from user's Models page (preferences), in provider order
function getTopModelsFromPreferences(preferences: any, count: number = 3): string[] {
  try {
    const modelPrefs = preferences?.model_preferences
    console.log('[MCP] getTopModelsFromPreferences - Input preferences:', JSON.stringify(modelPrefs, null, 2))

    if (!modelPrefs || typeof modelPrefs !== 'object') {
      console.log('[MCP] getTopModelsFromPreferences - No valid model preferences found')
      return []
    }

    // Sort providers by 'order'
    const providersSorted = Object.entries(modelPrefs)
      .filter(([, pref]) => pref && typeof pref === 'object')
      .sort(([, a]: any, [, b]: any) => (a.order || 0) - (b.order || 0))

    console.log('[MCP] getTopModelsFromPreferences - Sorted providers:',
      providersSorted.map(([p, pref]: any) => `${p}(order:${pref.order}, models:${pref.models})`))

    const list: string[] = []
    const seen = new Set<string>()

    for (const [provider, pref] of providersSorted) {
      const prefAny = pref as any
      const models: string[] = Array.isArray(prefAny?.models) ? (prefAny.models as string[]) : []
      console.log(`[MCP] getTopModelsFromPreferences - Processing ${provider}: models = ${JSON.stringify(models)}`)

      for (const m of models) {
        if (typeof m === 'string' && !seen.has(m)) {
          list.push(m)
          seen.add(m)
          console.log(`[MCP] getTopModelsFromPreferences - Added "${m}" from ${provider} (total: ${list.length}/${count})`)

          if (list.length >= count) {
            console.log(`[MCP] getTopModelsFromPreferences - Reached limit of ${count}, returning:`, list)
            return list
          }
        }
      }
    }

    console.log(`[MCP] getTopModelsFromPreferences - Final list (${list.length} models):`, list)
    return list
  } catch (error) {
    console.error('[MCP] getTopModelsFromPreferences - Error:', error)
    return []
  }
}

// Normalize provider names to handle variations like "xai" vs "x-ai", "openai" vs "openai-native"
function normalizeProviderName(provider: string): string {
  if (!provider) return ''
  
  const normalized = provider.toLowerCase().trim()
  
  // Handle common variations
  const mappings: Record<string, string> = {
    'x-ai': 'xai',
    'openai-native': 'openai',
    'gemini': 'google' // Normalize gemini to google for consistent matching
  }
  
  return mappings[normalized] || normalized
}

// Get ordered models from new preference structure (keeping for backward compatibility)
function getModelsFromPreferences(modelPreferences: any): string[] {
  if (!modelPreferences || typeof modelPreferences !== 'object') {
    return []
  }
  
  // Convert to array and sort by order
  const sortedProviders = Object.entries(modelPreferences)
    .filter(([_, pref]: [string, any]) => pref && typeof pref === 'object' && Array.isArray(pref.models))
    .sort(([_, a]: [string, any], [__, b]: [string, any]) => (a.order || 0) - (b.order || 0))
  
  // Extract first model from each provider in order
  const models = sortedProviders
    .map(([provider, pref]: [string, any]) => pref.models[0]) // No hardcoded fallback
    .filter(Boolean) // Filter out null/undefined values

  return models.length > 0 ? models : []
}

// Intelligent provider determination based on model name (DEPRECATED - no longer used)
// Kept for reference only
function determineProvider_DEPRECATED(model: string, configMap: Map<string, ProviderConfig>): ProviderConfig | null {
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

  // Kimi models should use OpenRouter or other compatible providers
  if (modelLower.includes('kimi')) {
    // Kimi models are available on OpenRouter, not OpenAI
    // Check OpenRouter first, then Groq as a fallback
    const openrouterConfig = configMap.get('openrouter')
    if (openrouterConfig) {
      return openrouterConfig
    }

    // Check if user has Groq configured as a fallback
    const groqConfig = configMap.get('groq')
    if (groqConfig) {
      return groqConfig
    }

    // Don't return OpenAI for Kimi models as they're not available there
    return null
  }

  if (modelLower.includes('deepseek')) {
    return configMap.get('deepseek') || {
      id: 'deepseek',
      provider_name: 'deepseek',
      display_name: 'DeepSeek',
      base_url: 'https://api.deepseek.com/v1',
      api_key_required: true,
      supports_streaming: true,
      supports_tools: false,
      supports_images: false,
      supports_prompt_cache: false,
      authentication_method: 'api_key',
      models: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }
  
  if (modelLower.includes('grok')) {
    return configMap.get('xai') || configMap.get('x-ai') || {
      id: 'xai',
      provider_name: 'xai',
      display_name: 'xAI',
      base_url: 'https://api.x.ai/v1',
      api_key_required: true,
      supports_streaming: true,
      supports_tools: false,
      supports_images: false,
      supports_prompt_cache: false,
      authentication_method: 'api_key',
      models: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
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
      url: '/dashboard/models'
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
  console.log('[MCP GET] GET handler called!')
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
