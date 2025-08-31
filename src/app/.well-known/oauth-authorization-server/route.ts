import { NextRequest, NextResponse } from 'next/server'

// OAuth 2.0 Authorization Server Metadata
export async function GET(request: NextRequest) {
  return NextResponse.json({
    issuer: 'https://www.polydev.ai',
    authorization_endpoint: 'https://www.polydev.ai/api/mcp/authorize',
    token_endpoint: 'https://www.polydev.ai/api/mcp/auth',
    jwks_uri: 'https://www.polydev.ai/api/mcp/jwks',
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: ['mcp'],
    code_challenge_methods_supported: []
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  })
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}