import { Resend } from 'resend'
import { emailTemplates, EmailTemplate } from './emailTemplates'

const resend = new Resend(process.env.RESEND_API_KEY)

interface SendEmailOptions {
  to: string
  template: EmailTemplate
  from?: string
}

export async function sendEmail({ to, template, from = 'Polydev <noreply@polydev.ai>' }: SendEmailOptions) {
  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject: template.subject,
      html: template.html,
      text: template.text
    })

    if (error) {
      console.error('[Resend] Email send error:', error)
      throw error
    }

    console.log(`[Resend] Email sent successfully to ${to}, ID: ${data?.id}`)
    return data
  } catch (error) {
    console.error('[Resend] Failed to send email:', error)
    throw error
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