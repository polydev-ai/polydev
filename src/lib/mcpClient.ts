// MCP Client wrapper for API routes
// Uses actual Resend API for email sending

interface ResendEmailParams {
  to: string
  from: string
  subject: string
  text: string
  html?: string
}

interface ResendEmailResult {
  id: string
}

// Send email using Resend API directly
export async function mcp__resend__send_email(params: ResendEmailParams): Promise<ResendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    console.error('[MCP Client] RESEND_API_KEY is not configured')
    throw new Error('RESEND_API_KEY not configured')
  }

  console.log('[MCP Client] Sending email via Resend:', {
    to: params.to,
    subject: params.subject,
    from: params.from
  })

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: params.from,
        to: [params.to],
        subject: params.subject,
        text: params.text,
        html: params.html
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('[MCP Client] Resend API error:', errorData)
      throw new Error(`Resend API error: ${response.status} - ${JSON.stringify(errorData)}`)
    }

    const data = await response.json()
    console.log('[MCP Client] Email sent successfully:', data)

    return {
      id: data.id || `resend_${Date.now()}`
    }
  } catch (error) {
    console.error('[MCP Client] Error sending email:', error)
    throw error
  }
}
