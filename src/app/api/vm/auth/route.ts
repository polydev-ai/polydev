import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';

const MASTER_CONTROLLER_URL = process.env.MASTER_CONTROLLER_URL || 'http://135.181.138.102:4000';

// VM startup can take up to 3 minutes, so we need a longer timeout
export const maxDuration = 300; // 5 minutes

export async function POST(request: NextRequest) {
  console.log('[VM AUTH] 1. Starting POST /api/vm/auth');
  try {
    console.log('[VM AUTH] 2. Creating Supabase client');
    const supabase = await createClient();
    console.log('[VM AUTH] 3. Supabase client created');

    console.log('[VM AUTH] 4. Getting user');
    const {
      data: { user },
    } = await supabase.auth.getUser();
    console.log('[VM AUTH] 5. User retrieved:', user?.id);

    if (!user) {
      console.log('[VM AUTH] 6. No user - returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[VM AUTH] 7. Parsing request body');
    const body = await request.json();
    const { provider, webrtcOffer } = body;
    console.log('[VM AUTH] 8. Provider:', provider);
    console.log('[VM AUTH] 8b. WebRTC offer present:', !!webrtcOffer);

    if (!provider) {
      console.log('[VM AUTH] 9. No provider - returning 400');
      return NextResponse.json(
        { error: 'Provider is required' },
        { status: 400 }
      );
    }

    console.log('[VM AUTH] 10. Starting fetch to master-controller:', MASTER_CONTROLLER_URL);
    // Start authentication via Master Controller
    // Include webrtcOffer if present (race condition fix)
    const requestBody: any = {
      userId: user.id,
      provider
    };

    if (webrtcOffer) {
      console.log('[RACE-FIX] Including WebRTC offer in auth start request');
      requestBody.webrtcOffer = webrtcOffer;
    }

    const response = await fetch(`${MASTER_CONTROLLER_URL}/api/auth/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(300000), // 5 minute timeout for VM startup
    });
    console.log('[VM AUTH] 11. Fetch completed with status:', response.status);

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.message || 'Failed to start authentication' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('VM auth error DETAILS:', {
      message: error.message,
      name: error.name,
      cause: error.cause,
      stack: error.stack,
      fullError: error
    });
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Get auth session status via Master Controller
    const response = await fetch(`${MASTER_CONTROLLER_URL}/api/auth/session/${sessionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(300000), // 5 minute timeout
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.message || 'Failed to get auth session' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('VM auth status error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
