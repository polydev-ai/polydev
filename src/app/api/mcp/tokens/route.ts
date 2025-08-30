import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../utils/supabase/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'

export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { data: tokens, error } = await supabase
      .from('mcp_user_tokens')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching MCP tokens:', error)
      return NextResponse.json({ error: 'Failed to fetch tokens' }, { status: 500 })
    }
    
    return NextResponse.json({ tokens })
  } catch (error) {
    console.error('Error in GET /api/mcp/tokens:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { token_name, rate_limit_tier = 'standard' } = await request.json()
    
    if (!token_name || token_name.trim().length === 0) {
      return NextResponse.json({ error: 'Token name is required' }, { status: 400 })
    }
    
    // Generate a secure token
    const token = `pd_${crypto.randomBytes(32).toString('hex')}`
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const tokenPreview = `${token.slice(0, 12)}...${token.slice(-8)}`
    
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
      console.error('Error creating MCP token:', error)
      return NextResponse.json({ error: 'Failed to create token' }, { status: 500 })
    }
    
    // Return the token only once (for security)
    return NextResponse.json({ 
      token: newToken, 
      api_key: token,
      message: 'Token created successfully. Save this API key securely - it won\'t be shown again.'
    })
  } catch (error) {
    console.error('Error in POST /api/mcp/tokens:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient()
    
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
    const cookieStore = cookies()
    const supabase = createClient()
    
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