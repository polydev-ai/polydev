import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';

const MASTER_CONTROLLER_URL = process.env.MASTER_CONTROLLER_URL || 'http://135.181.138.102:4000';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get provider from request body
    const body = await request.json();
    const { provider } = body;

    if (!provider || !['codex_cli', 'claude_code', 'gemini_cli'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider. Must be one of: codex_cli, claude_code, gemini_cli' },
        { status: 400 }
      );
    }

    // Get user ID from VM system
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('user_id')
      .eq('email', user.email)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found in VM system' }, { status: 404 });
    }

    // Start browser auth session via Master Controller
    const authResponse = await fetch(
      `${MASTER_CONTROLLER_URL}/api/auth/start`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userData.user_id,
          provider
        })
      }
    );

    if (!authResponse.ok) {
      const errorData = await authResponse.json();
      return NextResponse.json(
        { error: errorData.error || 'Failed to start authentication session' },
        { status: 500 }
      );
    }

    const authData = await authResponse.json();

    // Get session details from database
    const { data: session } = await supabase
      .from('auth_sessions')
      .select('*')
      .eq('session_id', authData.sessionId)
      .single();

    return NextResponse.json({
      message: 'Browser authentication session started',
      session: {
        sessionId: session.session_id,
        provider: session.provider,
        status: session.status,
        novncURL: authData.novncURL,
        browserVMId: session.browser_vm_id,
        timeoutAt: session.timeout_at
      }
    });

  } catch (error) {
    console.error('[VM Auth Start API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
