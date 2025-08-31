import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { randomBytes } from 'crypto'

// Dynamic Client Registration for MCP OAuth
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      client_name, 
      redirect_uris, 
      scope = 'mcp',
      client_uri,
      logo_uri,
      tos_uri,
      policy_uri
    } = body

    // Validate required parameters
    if (!client_name || !redirect_uris || !Array.isArray(redirect_uris) || redirect_uris.length === 0) {
      return NextResponse.json({
        error: 'invalid_request',
        error_description: 'client_name and redirect_uris (array) are required'
      }, { status: 400 })
    }

    // Validate redirect URIs
    for (const uri of redirect_uris) {
      try {
        const url = new URL(uri)
        // Allow localhost for development and https for production
        if (!['http:', 'https:'].includes(url.protocol)) {
          return NextResponse.json({
            error: 'invalid_redirect_uri',
            error_description: 'redirect_uri must use http or https protocol'
          }, { status: 400 })
        }
      } catch (error) {
        return NextResponse.json({
          error: 'invalid_redirect_uri',
          error_description: `Invalid redirect_uri: ${uri}`
        }, { status: 400 })
      }
    }

    // Generate client credentials
    const client_id = `mcp_${randomBytes(16).toString('hex')}`
    const client_secret = randomBytes(32).toString('hex')
    const registration_access_token = randomBytes(32).toString('hex')

    const supabase = await createClient()

    // Store the registered client
    const { error: insertError } = await supabase
      .from('mcp_registered_clients')
      .insert({
        client_id,
        client_secret,
        client_name,
        redirect_uris,
        scope,
        client_uri,
        logo_uri,
        tos_uri,
        policy_uri,
        registration_access_token,
        created_at: new Date().toISOString()
      })

    if (insertError) {
      console.error('Error storing registered client:', insertError)
      return NextResponse.json({
        error: 'server_error',
        error_description: 'Failed to register client'
      }, { status: 500 })
    }

    // Return client registration response
    return NextResponse.json({
      client_id,
      client_secret,
      client_name,
      redirect_uris,
      scope,
      client_uri,
      logo_uri,
      tos_uri,
      policy_uri,
      registration_access_token,
      registration_client_uri: `https://www.polydev.ai/api/mcp/register/${client_id}`,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      // No expiration for MCP clients
      token_endpoint_auth_method: 'none'
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    })

  } catch (error) {
    console.error('Client registration error:', error)
    return NextResponse.json({
      error: 'server_error',
      error_description: 'Internal server error'
    }, { status: 500 })
  }
}

// Get registered client information
export async function GET(request: NextRequest) {
  const authorization = request.headers.get('authorization')
  
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return NextResponse.json({
      error: 'invalid_token',
      error_description: 'Missing or invalid authorization header'
    }, { status: 401 })
  }

  const token = authorization.replace('Bearer ', '')
  const supabase = await createClient()

  try {
    const { data: clientData, error } = await supabase
      .from('mcp_registered_clients')
      .select('*')
      .eq('registration_access_token', token)
      .single()

    if (error || !clientData) {
      return NextResponse.json({
        error: 'invalid_token',
        error_description: 'Invalid registration access token'
      }, { status: 401 })
    }

    return NextResponse.json({
      client_id: clientData.client_id,
      client_secret: clientData.client_secret,
      client_name: clientData.client_name,
      redirect_uris: clientData.redirect_uris,
      scope: clientData.scope,
      client_uri: clientData.client_uri,
      logo_uri: clientData.logo_uri,
      tos_uri: clientData.tos_uri,
      policy_uri: clientData.policy_uri,
      registration_access_token: clientData.registration_access_token,
      registration_client_uri: `https://www.polydev.ai/api/mcp/register/${clientData.client_id}`,
      client_id_issued_at: Math.floor(new Date(clientData.created_at).getTime() / 1000),
      token_endpoint_auth_method: 'none'
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    })

  } catch (error) {
    console.error('Get client registration error:', error)
    return NextResponse.json({
      error: 'server_error',
      error_description: 'Internal server error'
    }, { status: 500 })
  }
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

// Handle unsupported methods
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