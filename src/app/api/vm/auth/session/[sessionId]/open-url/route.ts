/**
 * API Route: /api/vm/auth/session/[sessionId]/open-url
 * Trigger automatic navigation to OAuth URL in VM Firefox browser
 */

import { NextRequest, NextResponse } from 'next/server';

const MASTER_CONTROLLER_URL = process.env.MASTER_CONTROLLER_URL || 'http://135.181.138.102:4000';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'url is required' },
        { status: 400 }
      );
    }

    // Forward request to master controller
    const response = await fetch(
      `${MASTER_CONTROLLER_URL}/api/auth/session/${sessionId}/open-url`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': request.headers.get('x-user-id') || '',
        },
        body: JSON.stringify({ url }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: errorText || 'Failed to open URL in browser' },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to proxy open-url request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
