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

// GET /api/chat/sessions/[sessionId] - Get session with messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const authResult = await authenticateRequest(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user } = authResult
    const supabase = await createClient()
    const { sessionId } = await params

    // Fetch session with messages
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select(`
        id,
        title,
        created_at,
        updated_at,
        archived,
        chat_messages (
          id,
          role,
          content,
          model_id,
          provider_info,
          usage_info,
          cost_info,
          metadata,
          created_at
        )
      `)
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (sessionError) {
      if (sessionError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 })
      }
      console.error('Error fetching chat session:', sessionError)
      return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 })
    }

    // Sort messages by creation time
    if (session.chat_messages) {
      session.chat_messages.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    }

    return NextResponse.json({ session })

  } catch (error) {
    console.error('Get chat session error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/chat/sessions/[sessionId] - Update session (title, archive status)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const authResult = await authenticateRequest(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user } = authResult
    const supabase = await createClient()
    const { sessionId } = await params
    const body = await request.json()

    const updateData: any = {}
    if (body.title !== undefined) updateData.title = body.title
    if (body.archived !== undefined) updateData.archived = body.archived

    const { data: session, error } = await supabase
      .from('chat_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 })
      }
      console.error('Error updating chat session:', error)
      return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
    }

    return NextResponse.json({ session })

  } catch (error) {
    console.error('Update chat session error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/chat/sessions/[sessionId] - Delete session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const authResult = await authenticateRequest(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user } = authResult
    const supabase = await createClient()
    const { sessionId } = await params

    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting chat session:', error)
      return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete chat session error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}