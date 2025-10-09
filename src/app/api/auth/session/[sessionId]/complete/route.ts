import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';

export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;

    const supabase = createClient();

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get auth session
    const { data: session, error: sessionError } = await supabase
      .from('auth_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.status !== 'awaiting_user_auth') {
      return NextResponse.json(
        { error: 'Invalid session status', current_status: session.status },
        { status: 400 }
      );
    }

    // Call Master Controller API to complete authentication
    // This will extract credentials, store them, transfer to CLI VM, and cleanup
    const masterControllerUrl = process.env.MASTER_CONTROLLER_URL || 'http://192.168.5.82:3001';

    const response = await fetch(`${masterControllerUrl}/api/auth/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        userId: user.id,
        provider: session.provider,
        vmIp: session.vm_ip
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to complete authentication');
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      sessionId,
      provider: session.provider
    });
  } catch (error: any) {
    console.error('Error completing auth session:', error);
    return NextResponse.json(
      { error: 'Failed to complete authentication', message: error.message },
      { status: 500 }
    );
  }
}
