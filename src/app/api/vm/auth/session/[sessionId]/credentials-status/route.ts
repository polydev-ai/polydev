import { NextRequest, NextResponse } from 'next/server';
import { Agent } from 'undici';
import { createClient } from '@/app/utils/supabase/server';

const MASTER_CONTROLLER_URL = process.env.MASTER_CONTROLLER_URL || 'http://135.181.138.102:4000';

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

    const response = await fetch(`${MASTER_CONTROLLER_URL}/api/auth/session/${sessionId}/credentials/status`, {
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

    return new NextResponse(text, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
      },
    });
  } catch (error: any) {
    console.error('Credential status proxy error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
