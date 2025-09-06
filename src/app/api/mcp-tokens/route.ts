import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { randomBytes, createHash } from 'crypto'

// Generate MCP authentication tokens for CLI status reporting
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user already has an active MCP token
    const { data: existingToken, error: tokenError } = await supabase
      .from('mcp_user_tokens')
      .select('token_preview, created_at, active')
      .eq('user_id', user.id)
      .eq('active', true)
      .single()

    // If user has existing token, we need to generate a new one since we can't retrieve the original
    // The stored token is hashed for security, so we generate fresh tokens for CLI validation
    if (existingToken && !tokenError) {
      console.log('User has existing token, generating fresh token for CLI validation')
    }

    // Generate new token
    const token = `mcp_${randomBytes(32).toString('hex')}`
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const tokenPreview = `${token.substring(0, 12)}...${token.substring(token.length - 8)}`

    // Deactivate old tokens
    await supabase
      .from('mcp_user_tokens')
      .update({ active: false })
      .eq('user_id', user.id)

    // Create new token
    const { data: newToken, error: createError } = await supabase
      .from('mcp_user_tokens')
      .insert({
        user_id: user.id,
        token_name: 'CLI Status Reporter',
        token_hash: tokenHash,
        token_preview: tokenPreview,
        active: true
      })
      .select()
      .single()

    if (createError) {
      console.error('Token creation error:', createError)
      return NextResponse.json({ error: 'Failed to create token' }, { status: 500 })
    }

    return NextResponse.json({
      token,
      token_preview: tokenPreview,
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
      .from('mcp_user_tokens')
      .update({ 
        active: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    return NextResponse.json({ message: 'MCP token revoked successfully' })

  } catch (error) {
    console.error('Token revocation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}