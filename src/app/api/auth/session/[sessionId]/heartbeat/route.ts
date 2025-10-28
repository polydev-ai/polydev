import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';

export async function POST(
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

    // Update session heartbeat timestamp
    const { error } = await supabase
      .from('auth_sessions')
      .update({
        last_heartbeat: new Date().toISOString()
      })
      .eq('session_id', sessionId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to update session heartbeat:', error);
      return NextResponse.json(
        { error: 'Failed to update heartbeat', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Heartbeat endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
