import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase'
import { authenticateRequest } from '../../../../lib/api/auth'

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

    // Transform the data to include message counts
    const transformedSessions = sessions?.map(session => ({
      ...session,
      message_count: session.message_count?.[0]?.count || 0
    })) || []

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