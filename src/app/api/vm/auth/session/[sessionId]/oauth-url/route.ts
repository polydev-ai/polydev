import { NextRequest, NextResponse } from 'next/server';
import { Agent } from 'undici';
import { createClient } from '@/app/utils/supabase/server';

const MASTER_CONTROLLER_URL = process.env.MASTER_CONTROLLER_URL || 'http://127.0.0.1:4000';

// Disable Undici's default 30s headers timeout so long-running requests can complete
const longLivedAgent = new Agent({ headersTimeout: 0, bodyTimeout: 0 });

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const response = await fetch(`${MASTER_CONTROLLER_URL}/api/auth/session/${sessionId}/oauth-url`, {
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': user.id,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(120000), // 2 minute timeout for polling
      // @ts-ignore - undici agent not in standard fetch types
      dispatcher: longLivedAgent
    });

    const text = await response.text();
    console.log(`[OAuth URL Proxy] Status: ${response.status}, Response: ${text.substring(0, 200)}`);

    return new NextResponse(text, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
      },
    });
  } catch (error: any) {
    console.error('[OAuth URL Proxy] Error details:', {
      message: error.message,
      name: error.name,
      cause: error.cause,
      stack: error.stack?.substring(0, 500)
    });
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
