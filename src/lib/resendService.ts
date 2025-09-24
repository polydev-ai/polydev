import { emailTemplates, EmailTemplate } from './emailTemplates'

interface SendEmailOptions {
  to: string
  template: EmailTemplate
  from?: string
}

// Note: This function would need to be called from an API route to use MCP
// For now, keeping the direct implementation but adding MCP integration point
export async function sendEmailViaMCP(to: string, subject: string, text: string, html?: string, from: string = 'noreply@polydev.ai') {
  // This would be called from API routes that have access to MCP
  // Implementation moved to webhook handler
  throw new Error('sendEmailViaMCP should be called from API routes with MCP access')
}

export async function sendEmail({ to, template, from = 'noreply@polydev.ai' }: SendEmailOptions) {
  // For server-side usage, we'll integrate MCP calls in the webhook handler
  // This keeps the interface the same but the actual sending will use MCP
  return {
    to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    from,
    // Mark for MCP processing
    _useMCP: true
  }
}

export async function sendSubscriptionCreatedEmail(userEmail: string, planName: string = 'Pro') {
  const template = emailTemplates.subscriptionCreated(userEmail, planName)
  return sendEmail({ to: userEmail, template })
}

export async function sendSubscriptionCancelledEmail(userEmail: string, planName: string = 'Pro', periodEnd: string) {
  const template = emailTemplates.subscriptionCancelled(userEmail, planName, periodEnd)
  return sendEmail({ to: userEmail, template })
}

export async function sendPaymentFailedEmail(userEmail: string, amount: string, retryDate: string) {
  const template = emailTemplates.paymentFailed(userEmail, amount, retryDate)
  return sendEmail({ to: userEmail, template })
}

export async function sendPaymentSucceededEmail(userEmail: string, amount: string, periodEnd: string) {
  const template = emailTemplates.paymentSucceeded(userEmail, amount, periodEnd)
  return sendEmail({ to: userEmail, template })
}

export async function sendCreditPurchaseEmail(userEmail: string, creditAmount: number, packageName: string, amountPaid: number) {
  const template = emailTemplates.creditPurchase(userEmail, creditAmount, packageName, amountPaid)
  return sendEmail({ to: userEmail, template })
}