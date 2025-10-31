import { NextResponse } from 'next/server';

const MASTER_CONTROLLER_URL = process.env.MASTER_CONTROLLER_URL || 'http://135.181.138.102:4000';

export async function GET() {
  try {
    // Proxy to master-controller WebRTC service
    const response = await fetch(`${MASTER_CONTROLLER_URL}/api/webrtc/ice-servers`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Master controller returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('WebRTC ICE servers error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch ICE servers' },
      { status: 500 }
    );
  }
}
