import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import crypto from 'crypto'

// Handle OAuth authorization request (GET)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const client_id = searchParams.get('client_id')
  const redirect_uri = searchParams.get('redirect_uri')
  const state = searchParams.get('state')
  const response_type = searchParams.get('response_type')

  if (!client_id || !redirect_uri || response_type !== 'code') {
    return NextResponse.json({
      error: 'invalid_request',
      error_description: 'Missing or invalid parameters'
    }, { status: 400 })
  }

  // Redirect to authorization page
  const authUrl = new URL('/auth/mcp-authorize', request.url)
  authUrl.searchParams.set('client_id', client_id)
  authUrl.searchParams.set('redirect_uri', redirect_uri)
  if (state) authUrl.searchParams.set('state', state)

  return NextResponse.redirect(authUrl)
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({
        error: 'unauthorized',
        error_description: 'User must be authenticated'
      }, { status: 401 })
    }

    const { client_id, redirect_uri, state } = await request.json()

    if (!client_id || !redirect_uri) {
      return NextResponse.json({
        error: 'invalid_request',
        error_description: 'Missing required parameters'
      }, { status: 400 })
    }

    // Generate authorization code
    const code = crypto.randomBytes(32).toString('base64url')
    const expiresAt = new Date(Date.now() + 600000) // 10 minutes

    // Store the authorization code
    const { error: insertError } = await supabase
      .from('mcp_auth_codes')
      .insert({
        code,
        client_id,
        user_id: user.id,
        redirect_uri,
        state,
        expires_at: expiresAt.toISOString(),
        used: false
      })

    if (insertError) {
      console.error('Error storing auth code:', insertError)
      return NextResponse.json({
        error: 'server_error',
        error_description: 'Failed to generate authorization code'
      }, { status: 500 })
    }

    return NextResponse.json({ code })

  } catch (error) {
    console.error('Authorization error:', error)
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