import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const { sessionId } = params;

    // Get session from database
    const { data: session, error: sessionError } = await supabase
      .from('auth_sessions')
      .select(`
        *,
        users!inner(email)
      `)
      .eq('session_id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Verify session belongs to current user
    if (session.users.email !== user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if session has timed out
    const now = new Date();
    const timeoutAt = new Date(session.timeout_at);
    const isExpired = now > timeoutAt;

    return NextResponse.json({
      sessionId: session.session_id,
      provider: session.provider,
      status: isExpired && session.status === 'in_progress' ? 'expired' : session.status,
      browserVMId: session.browser_vm_id,
      createdAt: session.created_at,
      startedAt: session.started_at,
      completedAt: session.completed_at,
      errorMessage: session.error_message,
      timeoutAt: session.timeout_at,
      isExpired
    });

  } catch (error) {
    console.error('[VM Auth Status API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
