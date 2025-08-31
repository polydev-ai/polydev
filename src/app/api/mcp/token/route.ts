import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { randomBytes, createHash } from 'crypto'

// Vercel configuration
export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Handle OAuth token exchange request (POST)
export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7)
  console.log(`[MCP Token Exchange] POST request START - ID: ${requestId} - Time: ${new Date().toISOString()}`)
  
  try {
    const supabase = await createClient()
    
    const requestBody = await request.json()
    const { 
      grant_type, 
      code, 
      client_id, 
      redirect_uri, 
      code_verifier 
    } = requestBody
    
    console.log(`[MCP Token Exchange] Request body:`, { 
      grant_type, 
      code: code?.substring(0, 10) + '...', 
      client_id, 
      redirect_uri,
      code_verifier: code_verifier?.substring(0, 10) + '...'
    })

    // Validate grant type
    if (grant_type !== 'authorization_code') {
      return NextResponse.json({
        error: 'unsupported_grant_type',
        error_description: 'Only authorization_code grant type is supported'
      }, { status: 400 })
    }

    // Validate required parameters
    if (!code || !client_id || !redirect_uri) {
      return NextResponse.json({
        error: 'invalid_request',
        error_description: 'Missing required parameters: code, client_id, redirect_uri'
      }, { status: 400 })
    }

    // Look up the authorization code
    const { data: authCode, error: codeError } = await supabase
      .from('mcp_auth_codes')
      .select('*')
      .eq('code', code)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single()

    console.log(`[MCP Token Exchange] Auth code lookup:`, { authCode: authCode ? { 
      id: authCode.id, 
      client_id: authCode.client_id, 
      user_id: authCode.user_id,
      expires_at: authCode.expires_at,
      used: authCode.used,
      has_challenge: !!authCode.code_challenge
    } : null, codeError })

    if (codeError || !authCode) {
      console.error(`[MCP Token Exchange] Invalid authorization code:`, codeError)
      return NextResponse.json({
        error: 'invalid_grant',
        error_description: 'Authorization code is invalid, expired, or already used'
      }, { status: 400 })
    }

    // Validate client_id and redirect_uri match
    if (authCode.client_id !== client_id || authCode.redirect_uri !== redirect_uri) {
      console.error(`[MCP Token Exchange] Client validation failed:`, { 
        expected: { client_id: authCode.client_id, redirect_uri: authCode.redirect_uri },
        received: { client_id, redirect_uri }
      })
      return NextResponse.json({
        error: 'invalid_grant',
        error_description: 'Authorization code client_id or redirect_uri mismatch'
      }, { status: 400 })
    }

    // Verify PKCE challenge if present
    if (authCode.code_challenge) {
      if (!code_verifier) {
        return NextResponse.json({
          error: 'invalid_request',
          error_description: 'code_verifier is required when PKCE was used in authorization'
        }, { status: 400 })
      }

      let computedChallenge: string
      if (authCode.code_challenge_method === 'S256') {
        computedChallenge = createHash('sha256')
          .update(code_verifier, 'ascii')
          .digest('base64url')
      } else {
        // Plain method
        computedChallenge = code_verifier
      }

      if (computedChallenge !== authCode.code_challenge) {
        console.error(`[MCP Token Exchange] PKCE verification failed:`, {
          method: authCode.code_challenge_method,
          expected: authCode.code_challenge,
          computed: computedChallenge
        })
        return NextResponse.json({
          error: 'invalid_grant',
          error_description: 'PKCE verification failed'
        }, { status: 400 })
      }

      console.log(`[MCP Token Exchange] PKCE verification successful`)
    }

    // Mark authorization code as used
    const { error: updateError } = await supabase
      .from('mcp_auth_codes')
      .update({ used: true })
      .eq('id', authCode.id)

    if (updateError) {
      console.error(`[MCP Token Exchange] Failed to mark auth code as used:`, updateError)
      return NextResponse.json({
        error: 'server_error',
        error_description: 'Failed to process authorization code'
      }, { status: 500 })
    }

    // Generate access token
    const accessToken = `polydev_${randomBytes(32).toString('base64url')}`
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    console.log(`[MCP Token Exchange] Generating access token: ${accessToken.substring(0, 20)}... for user: ${authCode.user_id}`)

    // Store access token
    const { error: tokenError } = await supabase
      .from('mcp_access_tokens')
      .insert({
        token: accessToken,
        client_id: authCode.client_id,
        user_id: authCode.user_id,
        expires_at: expiresAt.toISOString(),
        revoked: false
      })

    if (tokenError) {
      console.error(`[MCP Token Exchange] Failed to store access token:`, tokenError)
      return NextResponse.json({
        error: 'server_error',
        error_description: 'Failed to generate access token'
      }, { status: 500 })
    }

    console.log(`[MCP Token Exchange] Token exchange successful - ID: ${requestId}`)

    // Return access token response
    return NextResponse.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 30 * 24 * 60 * 60, // 30 days in seconds
      scope: 'mcp:tools'
    })

  } catch (error) {
    console.error(`[MCP Token Exchange] FATAL ERROR - ID: ${requestId}:`, error)
    console.error(`[MCP Token Exchange] Error stack - ID: ${requestId}:`, error instanceof Error ? error.stack : 'No stack')
    return NextResponse.json({
      error: 'server_error',
      error_description: 'Internal server error',
      debug_id: requestId
    }, { status: 500 })
  }
}

// Handle unsupported methods
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    error: 'method_not_allowed',
    error_description: 'GET method not supported. Use POST for token exchange'
  }, { 
    status: 405,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  })
}