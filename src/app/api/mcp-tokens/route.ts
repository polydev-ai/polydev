import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { randomBytes } from 'crypto'

// Generate MCP authentication tokens for CLI status reporting
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user already has an MCP token
    const { data: existingToken, error: tokenError } = await supabase
      .from('mcp_tokens')
      .select('token, created_at, expires_at, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (existingToken && new Date(existingToken.expires_at) > new Date()) {
      return NextResponse.json({
        token: existingToken.token,
        expires_at: existingToken.expires_at,
        created_at: existingToken.created_at
      })
    }

    // Generate new token
    const token = `mcp_${randomBytes(32).toString('hex')}`
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year

    // Deactivate old tokens
    await supabase
      .from('mcp_tokens')
      .update({ is_active: false })
      .eq('user_id', user.id)

    // Create new token
    const { data: newToken, error: createError } = await supabase
      .from('mcp_tokens')
      .insert({
        user_id: user.id,
        token,
        expires_at: expiresAt.toISOString(),
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (createError) {
      console.error('Token creation error:', createError)
      return NextResponse.json({ error: 'Failed to create token' }, { status: 500 })
    }

    return NextResponse.json({
      token,
      expires_at: expiresAt.toISOString(),
      created_at: newToken.created_at,
      setup_instructions: {
        description: "Use this token to configure your local MCP bridge for CLI status reporting",
        environment_variable: `POLYDEV_MCP_TOKEN=${token}`,
        config_example: {
          polydev_api_url: "https://polydev.com/api/cli-status-update",
          mcp_token: token,
          user_id: user.id
        }
      }
    })

  } catch (error) {
    console.error('MCP token generation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Revoke MCP token
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Deactivate all user tokens
    await supabase
      .from('mcp_tokens')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    return NextResponse.json({ message: 'MCP token revoked successfully' })

  } catch (error) {
    console.error('Token revocation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}