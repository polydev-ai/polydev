import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { randomBytes, createHash } from 'crypto'

export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.error('Auth error in MCP tokens GET:', userError)
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }
    
    if (!user) {
      console.log('No user found in MCP tokens GET')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log('MCP tokens GET - User authenticated:', user.id)
    
    // Get manual API tokens (pd_) from mcp_user_tokens
    const { data: userTokens, error: userTokensError } = await supabase
      .from('mcp_user_tokens')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    if (userTokensError) {
      console.error('Database error fetching user tokens:', userTokensError)
      return NextResponse.json({ error: `Database error: ${userTokensError.message}` }, { status: 500 })
    }

    // Get OAuth access tokens (polydev_) from mcp_access_tokens
    const { data: oauthTokens, error: oauthTokensError } = await supabase
      .from('mcp_access_tokens')
      .select('token, client_id, created_at, expires_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    if (oauthTokensError) {
      console.error('Database error fetching OAuth tokens:', oauthTokensError)
      // Don't fail - just continue without OAuth tokens
    }

    // Transform OAuth tokens to match the expected format
    const transformedOauthTokens = (oauthTokens || []).map(token => ({
      id: `oauth_${token.token.substring(8, 16)}`, // Use part of token as ID
      token_name: `OAuth Token (${token.client_id})`,
      token_preview: token.token.substring(0, 12) + '...' + token.token.slice(-8),
      active: new Date(token.expires_at) > new Date(), // Active if not expired
      rate_limit_tier: 'oauth',
      created_at: token.created_at,
      token_type: 'oauth',
      expires_at: token.expires_at,
      full_token: token.token // Include full token for copying
    }))

    // Combine both token types
    const allTokens = [...(userTokens || []).map(t => ({ ...t, token_type: 'api' })), ...transformedOauthTokens]
    
    console.log('All tokens fetched successfully, count:', allTokens?.length || 0)
    
    return NextResponse.json({ tokens: allTokens })
  } catch (error) {
    console.error('Unexpected error in GET /api/mcp/tokens:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.error('Auth error in MCP tokens POST:', userError)
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }
    
    if (!user) {
      console.log('No user found in MCP tokens POST')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log('MCP tokens POST - User authenticated:', user.id)
    
    const { token_name, rate_limit_tier = 'standard', token_type = 'api' } = await request.json()
    
    if (!token_name || token_name.trim().length === 0) {
      return NextResponse.json({ error: 'Token name is required' }, { status: 400 })
    }
    
    if (!['api', 'cli'].includes(token_type)) {
      return NextResponse.json({ error: 'Invalid token type. Must be "api" or "cli"' }, { status: 400 })
    }
    
    // Generate a secure token based on type
    let token: string
    if (token_type === 'api') {
      token = `pd_${randomBytes(32).toString('hex')}`
    } else if (token_type === 'cli') {
      token = `cli_${Buffer.from(`${user.id}_${Date.now()}_${Math.random()}`).toString('base64url')}`
    } else {
      return NextResponse.json({ error: 'Invalid token type' }, { status: 400 })
    }
    
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const tokenPreview = token_type === 'api' 
      ? `${token.slice(0, 12)}...${token.slice(-8)}`
      : token.substring(0, 8) + '...'
    
    // Insert the token
    const { data: newToken, error } = await supabase
      .from('mcp_user_tokens')
      .insert({
        user_id: user.id,
        token_name: token_name.trim(),
        token_hash: tokenHash,
        token_preview: tokenPreview,
        rate_limit_tier,
        active: true
      })
      .select()
      .single()
    
    if (error) {
      console.error('Database error creating MCP token:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 })
    }
    
    console.log('MCP token created successfully:', newToken?.id)
    
    // Return the token only once (for security)
    return NextResponse.json({ 
      token: newToken, 
      api_key: token,
      message: 'Token created successfully. Save this API key securely - it won\'t be shown again.'
    })
  } catch (error) {
    console.error('Unexpected error in POST /api/mcp/tokens:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { id, active, token_name, rate_limit_tier } = await request.json()
    
    if (!id) {
      return NextResponse.json({ error: 'Token ID is required' }, { status: 400 })
    }
    
    const updates: any = {}
    if (typeof active === 'boolean') updates.active = active
    if (token_name) updates.token_name = token_name.trim()
    if (rate_limit_tier) updates.rate_limit_tier = rate_limit_tier
    
    const { data: updatedToken, error } = await supabase
      .from('mcp_user_tokens')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id) // Ensure user can only update their own tokens
      .select()
      .single()
    
    if (error) {
      console.error('Error updating MCP token:', error)
      return NextResponse.json({ error: 'Failed to update token' }, { status: 500 })
    }
    
    return NextResponse.json({ token: updatedToken })
  } catch (error) {
    console.error('Error in PATCH /api/mcp/tokens:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Token ID is required' }, { status: 400 })
    }
    
    const { error } = await supabase
      .from('mcp_user_tokens')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id) // Ensure user can only delete their own tokens
    
    if (error) {
      console.error('Error deleting MCP token:', error)
      return NextResponse.json({ error: 'Failed to delete token' }, { status: 500 })
    }
    
    return NextResponse.json({ message: 'Token deleted successfully' })
  } catch (error) {
    console.error('Error in DELETE /api/mcp/tokens:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}