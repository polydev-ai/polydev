import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';

/**
 * Proxy endpoint for checking credential status from Browser VM OAuth agent.
 *
 * This prevents the frontend from directly polling private LAN IPs (192.168.x.x)
 * which are unreachable from the user's browser.
 *
 * Flow:
 * 1. Frontend calls: GET /api/auth/session/{sessionId}/credentials
 * 2. Backend fetches session from DB to get vm_ip
 * 3. Backend polls: http://{vm_ip}:8080/credentials/status
 * 4. Returns result to frontend
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    const supabase = await createClient();

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get auth session to retrieve VM IP
    const { data: session, error } = await supabase
      .from('auth_sessions')
      .select('vm_ip, status')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (error || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // If session already completed/failed, return that status
    if (session.status === 'completed') {
      return NextResponse.json({ authenticated: true, status: 'completed' });
    }

    if (session.status === 'failed' || session.status === 'cancelled') {
      return NextResponse.json({ authenticated: false, status: session.status });
    }

    // If no VM IP yet, credentials can't be ready
    if (!session.vm_ip) {
      return NextResponse.json({ authenticated: false, status: 'no_vm' });
    }

    // Poll the OAuth agent in the Browser VM
    const agentUrl = `http://${session.vm_ip}:8080/credentials/status?sessionId=${sessionId}`;

    console.log('[Credentials Proxy] Polling OAuth agent:', {
      sessionId,
      vmIp: session.vm_ip,
      agentUrl
    });

    try {
      const agentResponse = await fetch(agentUrl, {
        signal: AbortSignal.timeout(5000), // 5 second timeout
        headers: {
          'User-Agent': 'Next.js Credentials Proxy'
        }
      });

      if (!agentResponse.ok) {
        console.warn('[Credentials Proxy] Agent returned non-OK status:', {
          status: agentResponse.status,
          sessionId
        });
        return NextResponse.json({
          authenticated: false,
          status: 'agent_error',
          error: `Agent returned ${agentResponse.status}`
        });
      }

      const agentData = await agentResponse.json();

      console.log('[Credentials Proxy] Agent response:', {
        sessionId,
        authenticated: agentData.authenticated
      });

      return NextResponse.json(agentData);

    } catch (fetchError: any) {
      // OAuth agent might not be ready yet - this is normal during VM startup
      console.log('[Credentials Proxy] Agent not reachable (normal during startup):', {
        error: fetchError.message,
        sessionId
      });

      return NextResponse.json({
        authenticated: false,
        status: 'agent_unreachable'
      });
    }

  } catch (error: any) {
    console.error('[Credentials Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
