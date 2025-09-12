import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { createHash } from 'crypto'

async function authenticateRequest(request: NextRequest): Promise<{ user: any; preferences: any } | null> {
  const supabase = await createClient()
  
  // Check for MCP API key in Authorization header
  const authorization = request.headers.get('Authorization')
  if (authorization?.startsWith('Bearer pd_')) {
    const apiKey = authorization.replace('Bearer ', '')
    const tokenHash = createHash('sha256').update(apiKey).digest('hex')
    
    // Find user by token hash
    const { data: token, error } = await supabase
      .from('mcp_user_tokens')
      .select('user_id, active, last_used_at')
      .eq('token_hash', tokenHash)
      .eq('active', true)
      .single()
    
    if (error || !token) {
      return null
    }
    
    // Update last_used_at
    await supabase
      .from('mcp_user_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('token_hash', tokenHash)
    
    // Get user preferences - NO HARDCODED DEFAULTS
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', token.user_id)
      .single()
    
    if (!preferences) {
      throw new Error('User preferences not found. Please configure models at https://www.polydev.ai/dashboard/models')
    }
    
    return {
      user: { id: token.user_id },
      preferences
    }
  }
  
  // Check for session-based authentication (cookies)
  const { data: { user: authUser } } = await supabase.auth.getUser()
  
  if (!authUser) {
    return null
  }
  
  // Get user preferences
  const { data: preferences } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', authUser.id)
    .single()
  
  if (!preferences) {
    throw new Error('User preferences not found. Please configure models at https://www.polydev.ai/dashboard/models')
  }
  
  return {
    user: authUser,
    preferences
  }
}

// GET /api/chat/sessions - List user's chat sessions
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user } = authResult
    const supabase = await createClient()

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const archived = searchParams.get('archived') === 'true'

    // Fetch sessions with message counts
    const { data: sessions, error } = await supabase
      .from('chat_sessions')
      .select(`
        id,
        title,
        created_at,
        updated_at,
        archived,
        message_count:chat_messages(count)
      `)
      .eq('user_id', user.id)
      .eq('archived', archived)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching chat sessions:', error)
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
    }

    // Transform the data to include message counts and filter out empty sessions
    const transformedSessions = sessions?.map(session => ({
      ...session,
      message_count: session.message_count?.[0]?.count || 0
    })).filter(session => session.message_count > 0) || []

    return NextResponse.json({ sessions: transformedSessions })

  } catch (error) {
    console.error('Chat sessions API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/chat/sessions - Create new chat session
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user } = authResult
    const supabase = await createClient()
    const body = await request.json()

    const { title = 'New Chat' } = body

    const { data: session, error } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: user.id,
        title: title
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating chat session:', error)
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
    }

    return NextResponse.json({ session })

  } catch (error) {
    console.error('Create chat session error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}