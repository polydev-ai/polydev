import { NextRequest, NextResponse } from 'next/server';

const MASTER_CONTROLLER_URL = process.env.MASTER_CONTROLLER_URL || 'http://135.181.138.102:4000';

// POST - Start authentication (create auth session)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('[Auth Start] Forwarding to master controller', { userId: body.userId });

    const response = await fetch(
      `${MASTER_CONTROLLER_URL}/api/auth/start`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

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
    console.error('Auth start error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
