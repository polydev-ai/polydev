import { NextRequest, NextResponse } from 'next/server';

/**
 * Redirects to noVNC HTML page served directly from master-controller via Caddy HTTPS.
 *
 * Vercel doesn't support WebSocket upgrade handlers in serverless mode,
 * so we redirect to master.polydev.ai which has:
 * - Caddy reverse proxy for HTTPS termination
 * - Native WebSocket support for noVNC connections
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  const params = await context.params;

  // Redirect to master-controller served via Caddy with HTTPS
  const masterControllerUrl = `https://master.polydev.ai/api/auth/session/${params.sessionId}/novnc`;

  return NextResponse.redirect(masterControllerUrl, {
    status: 302, // Temporary redirect
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    }
  });
}
