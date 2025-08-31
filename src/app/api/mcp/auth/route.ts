import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { cookies } from 'next/headers'
import { createHash } from 'crypto'

// OAuth-style authentication for MCP clients
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('client_id')
  const redirectUri = searchParams.get('redirect_uri')
  const state = searchParams.get('state')
  
  // Validate required parameters
  if (!clientId || !redirectUri) {
    return NextResponse.json({
      error: 'invalid_request',
      error_description: 'Missing required parameters: client_id and redirect_uri are required'
    }, { status: 400 })
  }

  const supabase = await createClient()

  // Check if it's a dynamically registered client
  const { data: registeredClient } = await supabase
    .from('mcp_registered_clients')
    .select('client_id, redirect_uris')
    .eq('client_id', clientId)
    .single()

  if (!registeredClient) {
    // Fall back to static client list for backward compatibility
    const validClientIds = [
      'claude-desktop',
      'cursor',
      'continue',
      'vscode-copilot',
      'custom-mcp-client'
    ]

    if (!validClientIds.includes(clientId)) {
      return NextResponse.json({
        error: 'invalid_client',
        error_description: 'Unknown or invalid client_id. Please register your client first.'
      }, { status: 400 })
    }
  } else {
    // Validate redirect_uri against registered URIs
    if (!registeredClient.redirect_uris.includes(redirectUri)) {
      return NextResponse.json({
        error: 'invalid_request',
        error_description: 'redirect_uri does not match registered redirect URIs'
      }, { status: 400 })
    }
  }

  // Create authorization URL with state
  const authUrl = new URL('/auth/mcp-authorize', request.nextUrl.origin)
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  if (state) authUrl.searchParams.set('state', state)

  // Redirect to authorization page
  return NextResponse.redirect(authUrl)
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''
    
    let body: any
    if (contentType.includes('application/json')) {
      body = await request.json()
    } else {
      // OAuth 2.0 token requests are typically sent as application/x-www-form-urlencoded
      const text = await request.text()
      const searchParams = new URLSearchParams(text)
      body = Object.fromEntries(searchParams)
    }
    
    const { grant_type, code, client_id, client_secret, redirect_uri, code_verifier } = body

    console.log(`[MCP Auth] Request body:`, { grant_type, code: code?.substring(0, 10) + '...', client_id, redirect_uri, code_verifier: code_verifier?.substring(0, 10) + '...' })

    if (grant_type !== 'authorization_code') {
      return NextResponse.json({
        error: 'unsupported_grant_type',
        error_description: 'Only authorization_code grant type is supported'
      }, { status: 400 })
    }

    if (!code || !client_id || !redirect_uri) {
      return NextResponse.json({
        error: 'invalid_request',
        error_description: 'Missing required parameters'
      }, { status: 400 })
    }

    const supabase = await createClient()

    console.log(`[MCP Auth] Verifying code: ${code.substring(0, 10)}... for client: ${client_id}`)

    // Verify the authorization code
    const { data: authData, error: authError } = await supabase
      .from('mcp_auth_codes')
      .select('user_id, expires_at, used, code_challenge, code_challenge_method')
      .eq('code', code)
      .eq('client_id', client_id)
      .single()

    console.log(`[MCP Auth] Query result:`, { authData, authError })

    if (authError || !authData) {
      return NextResponse.json({
        error: 'invalid_grant',
        error_description: 'Invalid or expired authorization code'
      }, { status: 400 })
    }

    if (authData.used) {
      return NextResponse.json({
        error: 'invalid_grant',
        error_description: 'Authorization code has already been used'
      }, { status: 400 })
    }

    if (new Date(authData.expires_at) < new Date()) {
      return NextResponse.json({
        error: 'invalid_grant',
        error_description: 'Authorization code has expired'
      }, { status: 400 })
    }

    // Verify PKCE if code_challenge was provided
    if (authData.code_challenge) {
      if (!code_verifier) {
        return NextResponse.json({
          error: 'invalid_request',
          error_description: 'code_verifier is required when PKCE was used'
        }, { status: 400 })
      }

      let expectedChallenge: string
      if (authData.code_challenge_method === 'S256') {
        // For S256, hash the code_verifier with SHA256 and base64url encode
        const hash = createHash('sha256').update(code_verifier).digest()
        expectedChallenge = Buffer.from(hash).toString('base64url')
      } else if (authData.code_challenge_method === 'plain') {
        // For plain, the code_verifier should match the code_challenge exactly
        expectedChallenge = code_verifier
      } else {
        return NextResponse.json({
          error: 'invalid_request',
          error_description: 'Unsupported code_challenge_method'
        }, { status: 400 })
      }

      if (expectedChallenge !== authData.code_challenge) {
        return NextResponse.json({
          error: 'invalid_grant',
          error_description: 'Code verifier does not match code challenge'
        }, { status: 400 })
      }
    }

    // Mark the code as used
    await supabase
      .from('mcp_auth_codes')
      .update({ used: true })
      .eq('code', code)

    // Generate access token
    const accessToken = `polydev_${Buffer.from(`${authData.user_id}_${Date.now()}_${Math.random()}`).toString('base64url')}`

    // Store the access token
    const expiresAt = new Date(Date.now() + 3600000) // 1 hour
    await supabase
      .from('mcp_access_tokens')
      .insert({
        token: accessToken,
        user_id: authData.user_id,
        client_id,
        expires_at: expiresAt.toISOString()
      })

    return NextResponse.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'mcp:tools'
    })

  } catch (error) {
    console.error('MCP OAuth error:', error)
    return NextResponse.json({
      error: 'server_error',
      error_description: 'Internal server error'
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