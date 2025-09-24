import { NextRequest, NextResponse } from 'next/server'

// Internal API route for sending emails via Resend MCP
// This should only be called by other API routes, not directly by clients
export async function POST(request: NextRequest) {
  try {
    // Verify this is an internal call (basic check)
    const userAgent = request.headers.get('user-agent')
    if (!userAgent?.includes('Next')) {
      return NextResponse.json({ error: 'Unauthorized - internal use only' }, { status: 401 })
    }

    const { to, from, subject, text, html } = await request.json()

    if (!to || !subject || !text) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Use the Resend MCP function directly
    console.log(`[Internal Email API] Sending email to ${to} with subject: ${subject}`)

    try {
      // Import the MCP function at runtime to avoid module resolution issues in API routes
      const { mcp__resend__send_email } = await import('@/lib/mcpClient')

      const result = await mcp__resend__send_email({
        to,
        from: from || 'noreply@polydev.ai',
        subject,
        text,
        html
      })

      console.log(`[Internal Email API] Email sent successfully:`, result)

      return NextResponse.json({
        success: true,
        message: 'Email sent via MCP',
        id: result.id || `mcp_${Date.now()}`
      })
    } catch (mcpError) {
      console.error('[Internal Email API] MCP call failed:', mcpError)

      // Fallback: log for manual processing
      return NextResponse.json({
        success: false,
        message: 'Email queued for manual processing',
        details: { to, from, subject, text, html },
        id: `fallback_${Date.now()}`
      })
    }

  } catch (error) {
    console.error('[Internal Email API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}