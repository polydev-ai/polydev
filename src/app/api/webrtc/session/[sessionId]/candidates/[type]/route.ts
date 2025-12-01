import { NextRequest, NextResponse } from 'next/server';

const MASTER_CONTROLLER_URL = process.env.MASTER_CONTROLLER_URL || 'http://localhost:4000';

// GET - Fetch ICE candidates by type (local or remote)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string; type: string }> }
) {
  try {
    const { sessionId, type } = await params;

    console.log('[WebRTC Candidates] Fetching candidates from master controller', { sessionId, type });

    const response = await fetch(
      `${MASTER_CONTROLLER_URL}/api/webrtc/session/${sessionId}/candidates/${type}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.message || 'Failed to get candidates' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('WebRTC candidates fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
