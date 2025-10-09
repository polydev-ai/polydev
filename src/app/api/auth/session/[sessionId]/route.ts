import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';

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

    // Get auth session
    const { data: session, error } = await supabase
      .from('auth_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (error || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Include VM info if available
    const response: any = { session };
    if (session.vm_ip) {
      response.vm = {
        ip_address: session.vm_ip,
        vm_id: session.vm_id,
        vnc_url: session.vnc_url
      };
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error fetching auth session:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
