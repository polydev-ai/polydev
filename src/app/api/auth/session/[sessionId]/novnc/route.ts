import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple proxy for noVNC HTML page from backend.
 * WebSocket connections are handled by server.js upgrade handler.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  const params = await context.params;
  const backendUrl = `http://135.181.138.102:4000/api/auth/session/${params.sessionId}/novnc`;

  try {
    const response = await fetch(backendUrl, {
      headers: {
        'User-Agent': request.headers.get('user-agent') || 'Next.js Proxy',
        'Accept': 'text/html',
        'X-Forwarded-Proto': 'https',
        'X-Forwarded-Host': request.headers.get('host') || 'polydev-ai.vercel.app',
      },
    });

    if (!response.ok) {
      return new NextResponse(
        `<html><body><h1>Error Loading VM Terminal</h1><p>Backend returned status ${response.status}</p></body></html>`,
        {
          status: response.status,
          headers: { 'Content-Type': 'text/html' }
        }
      );
    }

    const html = await response.text();

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    return new NextResponse(
      `<html><body><h1>Connection Error</h1><p>Failed to connect to VM service</p></body></html>`,
      {
        status: 500,
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}
