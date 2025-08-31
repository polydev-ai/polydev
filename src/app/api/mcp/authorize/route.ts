import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { randomBytes } from 'crypto'

// Handle OAuth authorization request (GET)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const client_id = searchParams.get('client_id')
  const redirect_uri = searchParams.get('redirect_uri')
  const state = searchParams.get('state')
  const response_type = searchParams.get('response_type')
  const code_challenge = searchParams.get('code_challenge')
  const code_challenge_method = searchParams.get('code_challenge_method')

  if (!client_id || !redirect_uri || response_type !== 'code') {
    return NextResponse.json({
      error: 'invalid_request',
      error_description: 'Missing or invalid parameters'
    }, { status: 400 })
  }

  // Validate PKCE parameters if provided
  if (code_challenge && !code_challenge_method) {
    return NextResponse.json({
      error: 'invalid_request',
      error_description: 'code_challenge_method is required when code_challenge is provided'
    }, { status: 400 })
  }

  if (code_challenge_method && !['S256', 'plain'].includes(code_challenge_method)) {
    return NextResponse.json({
      error: 'invalid_request',
      error_description: 'Unsupported code_challenge_method. Supported methods: S256, plain'
    }, { status: 400 })
  }

  const supabase = await createClient()

  // Validate client_id exists (either dynamic or static)
  const { data: registeredClient } = await supabase
    .from('mcp_registered_clients')
    .select('client_id, redirect_uris')
    .eq('client_id', client_id)
    .single()

  if (!registeredClient) {
    // Check static client list
    const validClientIds = [
      'claude-desktop',
      'cursor', 
      'continue',
      'vscode-copilot',
      'custom-mcp-client'
    ]

    if (!validClientIds.includes(client_id)) {
      return NextResponse.json({
        error: 'invalid_client',
        error_description: 'Unknown or invalid client_id'
      }, { status: 400 })
    }
  } else {
    // Validate redirect_uri for dynamic clients
    if (!registeredClient.redirect_uris.includes(redirect_uri)) {
      return NextResponse.json({
        error: 'invalid_request', 
        error_description: 'redirect_uri does not match registered redirect URIs'
      }, { status: 400 })
    }
  }

  // Redirect to authorization page
  const authUrl = new URL('/auth/mcp-authorize', request.url)
  authUrl.searchParams.set('client_id', client_id)
  authUrl.searchParams.set('redirect_uri', redirect_uri)
  if (state) authUrl.searchParams.set('state', state)
  if (code_challenge) authUrl.searchParams.set('code_challenge', code_challenge)
  if (code_challenge_method) authUrl.searchParams.set('code_challenge_method', code_challenge_method)

  return NextResponse.redirect(authUrl)
}

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7)
  console.log(`[MCP Authorize v3.0] POST request START - ID: ${requestId} - Time: ${new Date().toISOString()}`)
  
  try {
    console.log(`[MCP Authorize] Request headers:`, Object.fromEntries([...request.headers.entries()]))
    
    const supabase = await createClient()
    console.log(`[MCP Authorize] Supabase client created successfully - ID: ${requestId}`)
    
    // Check authentication with detailed context
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    console.log(`[MCP Authorize] Auth check:`, { 
      user: user ? { id: user.id, email: user.email, aud: user.aud, role: user.role } : null, 
      userError,
      session: session ? { 
        user_id: session.user.id, 
        token_type: session.token_type,
        access_token_preview: session.access_token?.substring(0, 20) + '...'
      } : null,
      sessionError
    })
    
    // Test RLS context
    const { data: authTest, error: authTestError } = await supabase
      .rpc('get_auth_uid')
      .single()
    
    console.log(`[MCP Authorize] RLS auth.uid() test:`, { authTest, authTestError })
    
    if (userError || !user) {
      console.error(`[MCP Authorize] Authentication failed:`, { userError, user })
      return NextResponse.json({
        error: 'unauthorized',
        error_description: 'User must be authenticated'
      }, { status: 401 })
    }

    const requestBody = await request.json()
    const { client_id, redirect_uri, state, code_challenge, code_challenge_method } = requestBody
    
    console.log(`[MCP Authorize] Request body:`, { client_id, redirect_uri, state, code_challenge: code_challenge?.substring(0, 10) + '...', code_challenge_method })

    if (!client_id || !redirect_uri) {
      return NextResponse.json({
        error: 'invalid_request',
        error_description: 'Missing required parameters'
      }, { status: 400 })
    }

    // Validate PKCE parameters if provided
    if (code_challenge && !code_challenge_method) {
      return NextResponse.json({
        error: 'invalid_request',
        error_description: 'code_challenge_method is required when code_challenge is provided'
      }, { status: 400 })
    }

    if (code_challenge_method && !['S256', 'plain'].includes(code_challenge_method)) {
      return NextResponse.json({
        error: 'invalid_request',
        error_description: 'Unsupported code_challenge_method. Supported methods: S256, plain'
      }, { status: 400 })
    }

    // Generate authorization code
    const code = randomBytes(32).toString('base64url')
    const expiresAt = new Date(Date.now() + 600000) // 10 minutes

    console.log(`[MCP Authorize] Generating code: ${code.substring(0, 10)}... for client: ${client_id}`)

    // Store the authorization code
    const { error: insertError } = await supabase
      .from('mcp_auth_codes')
      .insert({
        code,
        client_id,
        user_id: user.id,
        redirect_uri,
        state,
        code_challenge,
        code_challenge_method,
        expires_at: expiresAt.toISOString(),
        used: false
      })

    console.log(`[MCP Authorize] Insert result:`, { insertError })

    if (insertError) {
      console.error('Error storing auth code:', insertError)
      return NextResponse.json({
        error: 'server_error',
        error_description: 'Failed to generate authorization code'
      }, { status: 500 })
    }

    return NextResponse.json({ code })

  } catch (error) {
    console.error(`[MCP Authorize] FATAL ERROR - ID: ${requestId}:`, error)
    console.error(`[MCP Authorize] Error stack - ID: ${requestId}:`, error instanceof Error ? error.stack : 'No stack')
    console.error(`[MCP Authorize] Error name - ID: ${requestId}:`, error instanceof Error ? error.name : 'Unknown error type')
    return NextResponse.json({
      error: 'server_error',
      error_description: 'Internal server error',
      debug_id: requestId
    }, { status: 500 })
  }
}

// Handle unsupported methods with proper JSON responses
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