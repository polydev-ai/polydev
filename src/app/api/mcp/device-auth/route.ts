import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { randomBytes, createHash } from 'crypto'

// Vercel configuration
export const dynamic = 'force-dynamic'
export const maxDuration = 10

/**
 * MCP Device Authorization Endpoint
 * Implements OAuth Device Authorization Grant (RFC 8628) for CLI-based authentication
 *
 * Flow:
 * 1. Client calls init -> gets device_code, user_code, verification_url
 * 2. Client opens browser to verification_url
 * 3. User authenticates and approves
 * 4. Client polls with device_code -> gets token when approved
 */

// In-memory store for device codes (in production, use Redis/database)
// For serverless, we'll use Supabase
const DEVICE_CODE_EXPIRY_SECONDS = 600 // 10 minutes
const POLL_INTERVAL_SECONDS = 5

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, device_code } = body

    const supabase = await createClient()

    // Get service role client for bypassing RLS
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    let supabaseService = supabase

    if (serviceRoleKey && serviceRoleKey !== 'your_service_role_key') {
      const { createClient: createServiceClient } = await import('@supabase/supabase-js')
      supabaseService = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey
      )
    }

    switch (action) {
      case 'init':
        return handleInit(supabaseService)

      case 'poll':
        return handlePoll(supabaseService, device_code)

      case 'complete':
        // Called by the web app when user completes authentication
        return handleComplete(supabaseService, body)

      default:
        return NextResponse.json({
          error: 'invalid_action',
          message: 'Action must be "init", "poll", or "complete"'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('[Device Auth] Error:', error)
    return NextResponse.json({
      error: 'server_error',
      message: 'Internal server error'
    }, { status: 500 })
  }
}

/**
 * Initialize device authorization - generate codes
 */
async function handleInit(supabase: any) {
  // Generate secure random codes
  const deviceCode = `pd_device_${randomBytes(32).toString('hex')}`
  const userCode = generateUserCode() // Human-friendly code like "ABCD-1234"

  const expiresAt = new Date(Date.now() + DEVICE_CODE_EXPIRY_SECONDS * 1000)

  // Store device code in database
  const { error } = await supabase
    .from('mcp_device_codes')
    .insert({
      device_code: deviceCode,
      user_code: userCode,
      status: 'pending',
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString()
    })

  if (error) {
    console.error('[Device Auth] Failed to store device code:', error)
    return NextResponse.json({
      error: 'storage_error',
      message: 'Failed to initialize device authorization'
    }, { status: 500 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://polydev.ai'

  return NextResponse.json({
    device_code: deviceCode,
    user_code: userCode,
    verification_url: `${baseUrl}/auth/device?code=${userCode}`,
    verification_uri_complete: `${baseUrl}/auth/device?code=${userCode}`,
    expires_in: DEVICE_CODE_EXPIRY_SECONDS,
    interval: POLL_INTERVAL_SECONDS,
    message: 'Open the verification URL in your browser to complete authentication'
  })
}

/**
 * Poll for token - check if user has completed authentication
 */
async function handlePoll(supabase: any, deviceCode: string) {
  if (!deviceCode) {
    return NextResponse.json({
      error: 'missing_device_code',
      message: 'device_code is required for polling'
    }, { status: 400 })
  }

  // Look up device code
  const { data: deviceData, error: lookupError } = await supabase
    .from('mcp_device_codes')
    .select('*')
    .eq('device_code', deviceCode)
    .single()

  if (lookupError || !deviceData) {
    return NextResponse.json({
      status: 'invalid',
      error: 'invalid_device_code',
      message: 'Device code not found or invalid'
    }, { status: 404 })
  }

  // Check expiration
  if (new Date(deviceData.expires_at) < new Date()) {
    // Clean up expired code
    await supabase
      .from('mcp_device_codes')
      .delete()
      .eq('device_code', deviceCode)

    return NextResponse.json({
      status: 'expired',
      error: 'expired_token',
      message: 'Device code has expired. Please start a new login.'
    })
  }

  // Check status
  if (deviceData.status === 'pending') {
    return NextResponse.json({
      status: 'pending',
      message: 'Waiting for user to complete authentication in browser'
    })
  }

  if (deviceData.status === 'completed' && deviceData.user_id) {
    // Get user profile and generate token
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, credits, subscription_tier')
      .eq('id', deviceData.user_id)
      .single()

    if (!profile) {
      return NextResponse.json({
        status: 'error',
        error: 'user_not_found',
        message: 'User profile not found'
      }, { status: 500 })
    }

    // Generate access token
    const token = `polydev_${randomBytes(32).toString('hex')}`
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    // Store token
    const { error: tokenError } = await supabase
      .from('mcp_access_tokens')
      .insert({
        user_id: deviceData.user_id,
        token: token,
        token_hash: tokenHash,
        client_id: 'device_auth',
        expires_at: tokenExpiresAt.toISOString(),
        created_at: new Date().toISOString()
      })

    if (tokenError) {
      console.error('[Device Auth] Failed to create token:', tokenError)
      return NextResponse.json({
        status: 'error',
        error: 'token_creation_failed',
        message: 'Failed to create access token'
      }, { status: 500 })
    }

    // Clean up device code
    await supabase
      .from('mcp_device_codes')
      .delete()
      .eq('device_code', deviceCode)

    return NextResponse.json({
      status: 'completed',
      token: token,
      email: profile.email,
      credits_remaining: profile.credits || 500,
      subscription_tier: profile.subscription_tier || 'Free',
      expires_at: tokenExpiresAt.toISOString(),
      message: 'Authentication successful!'
    })
  }

  if (deviceData.status === 'denied') {
    // Clean up
    await supabase
      .from('mcp_device_codes')
      .delete()
      .eq('device_code', deviceCode)

    return NextResponse.json({
      status: 'denied',
      error: 'access_denied',
      message: 'User denied the authorization request'
    })
  }

  return NextResponse.json({
    status: 'pending',
    message: 'Waiting for user to complete authentication'
  })
}

/**
 * Complete authentication - called by web app when user approves
 */
async function handleComplete(supabase: any, body: any) {
  const { user_code, user_id, approved } = body

  if (!user_code || !user_id) {
    return NextResponse.json({
      error: 'missing_parameters',
      message: 'user_code and user_id are required'
    }, { status: 400 })
  }

  // Find device code by user code
  const { data: deviceData, error: lookupError } = await supabase
    .from('mcp_device_codes')
    .select('*')
    .eq('user_code', user_code)
    .single()

  if (lookupError || !deviceData) {
    return NextResponse.json({
      error: 'invalid_code',
      message: 'User code not found or expired'
    }, { status: 404 })
  }

  // Check expiration
  if (new Date(deviceData.expires_at) < new Date()) {
    return NextResponse.json({
      error: 'expired_code',
      message: 'Authorization code has expired'
    }, { status: 410 })
  }

  // Update status
  const newStatus = approved !== false ? 'completed' : 'denied'

  const { error: updateError } = await supabase
    .from('mcp_device_codes')
    .update({
      status: newStatus,
      user_id: approved !== false ? user_id : null,
      completed_at: new Date().toISOString()
    })
    .eq('user_code', user_code)

  if (updateError) {
    console.error('[Device Auth] Failed to update device code:', updateError)
    return NextResponse.json({
      error: 'update_failed',
      message: 'Failed to complete authorization'
    }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    status: newStatus,
    message: approved !== false
      ? 'Authorization completed. You can close this window.'
      : 'Authorization denied.'
  })
}

/**
 * Generate a human-friendly user code
 * Format: XXXX-XXXX (8 characters, easy to type)
 */
function generateUserCode(): string {
  // Use characters that are easy to distinguish
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No I, O, 0, 1
  let code = ''

  for (let i = 0; i < 8; i++) {
    if (i === 4) code += '-'
    code += chars[Math.floor(Math.random() * chars.length)]
  }

  return code
}

// CORS support
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
