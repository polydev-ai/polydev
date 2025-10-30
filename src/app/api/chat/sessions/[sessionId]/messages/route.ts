import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { createHash } from 'crypto'

async function authenticateRequest(request: NextRequest): Promise<{ user: any } | null> {
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

    return {
      user: { id: token.user_id }
    }
  }

  // Check for session-based authentication (cookies)
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) {
    return null
  }

  return {
    user: authUser
  }
}

/**
 * POST /api/chat/sessions/[sessionId]/messages
 * Create a new message in a chat session with optional client-side encryption
 *
 * Request body:
 * {
 *   role: 'user' | 'assistant' | 'system',
 *   content?: string,                    // Legacy plaintext (optional)
 *   encryptedContent?: string,           // Zero-knowledge encrypted ciphertext
 *   encryptionMetadata?: {               // Encryption metadata
 *     iv: string,
 *     algorithm: 'AES-GCM',
 *     keyId: string,
 *     version: number
 *   },
 *   model_id?: string,
 *   provider_info?: object,
 *   usage_info?: object,
 *   cost_info?: object,
 *   metadata?: object
 * }
 */
export async function POST(
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

    // Validate session belongs to user
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Validate input
    const {
      role,
      content,
      encryptedContent,
      encryptionMetadata,
      model_id,
      provider_info,
      usage_info,
      cost_info,
      metadata
    } = body

    if (!role || !['user', 'assistant', 'system'].includes(role)) {
      return NextResponse.json({
        error: 'Invalid role. Must be one of: user, assistant, system'
      }, { status: 400 })
    }

    // Must have either content OR encrypted content
    if (!content && !encryptedContent) {
      return NextResponse.json({
        error: 'Either content or encryptedContent is required'
      }, { status: 400 })
    }

    // If encrypted content is provided, must have metadata
    if (encryptedContent && !encryptionMetadata) {
      return NextResponse.json({
        error: 'encryptionMetadata is required when providing encryptedContent'
      }, { status: 400 })
    }

    // Validate encryption metadata structure
    if (encryptionMetadata) {
      const { iv, algorithm, keyId, version } = encryptionMetadata
      if (!iv || !algorithm || !keyId || typeof version !== 'number') {
        return NextResponse.json({
          error: 'Invalid encryptionMetadata. Must include: iv, algorithm, keyId, version'
        }, { status: 400 })
      }

      if (algorithm !== 'AES-GCM') {
        return NextResponse.json({
          error: 'Invalid encryption algorithm. Only AES-GCM is supported'
        }, { status: 400 })
      }
    }

    // Insert message
    const { data: message, error: insertError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role: role,
        content: content || null,                      // Legacy plaintext
        encrypted_content: encryptedContent || null,   // Zero-knowledge ciphertext
        encryption_metadata: encryptionMetadata || null, // Encryption metadata (IV, algorithm, keyId)
        model_id: model_id || null,
        provider_info: provider_info || null,
        usage_info: usage_info || null,
        cost_info: cost_info || null,
        metadata: metadata || null,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating message:', insertError)
      return NextResponse.json({ error: 'Failed to create message' }, { status: 500 })
    }

    // Update session's updated_at timestamp
    await supabase
      .from('chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sessionId)

    return NextResponse.json({ message })

  } catch (error) {
    console.error('Create message error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/chat/sessions/[sessionId]/messages
 * Get all messages in a chat session (including encrypted content)
 *
 * Query parameters:
 * - limit: number (default: 100)
 * - offset: number (default: 0)
 */
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

    // Validate session belongs to user
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Fetch messages (including encrypted content and metadata)
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select(`
        id,
        role,
        content,
        encrypted_content,
        encryption_metadata,
        model_id,
        provider_info,
        usage_info,
        cost_info,
        metadata,
        created_at
      `)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (messagesError) {
      console.error('Error fetching messages:', messagesError)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    return NextResponse.json({ messages: messages || [] })

  } catch (error) {
    console.error('Get messages error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
