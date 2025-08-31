import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import crypto from 'crypto'

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