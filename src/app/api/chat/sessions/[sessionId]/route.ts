import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../../lib/supabase'
import { authenticateRequest } from '../../../../../lib/api/auth'

// GET /api/chat/sessions/[sessionId] - Get session with messages
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const authResult = await authenticateRequest(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user } = authResult
    const supabase = await createClient()
    const { sessionId } = params

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
  { params }: { params: { sessionId: string } }
) {
  try {
    const authResult = await authenticateRequest(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user } = authResult
    const supabase = await createClient()
    const { sessionId } = params
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
  { params }: { params: { sessionId: string } }
) {
  try {
    const authResult = await authenticateRequest(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user } = authResult
    const supabase = await createClient()
    const { sessionId } = params

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