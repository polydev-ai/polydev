export interface EmailTemplate {
  subject: string
  html: string
  text: string
}

// Helper to format credits with commas
const formatCredits = (credits: number): string => credits.toLocaleString()

// Plan details for emails
const PLAN_DETAILS: Record<string, { credits: string; price: string }> = {
  plus: { credits: '20,000', price: '$25' },
  pro: { credits: '50,000', price: '$50' }
}

export const emailTemplates = {
  subscriptionCreated: (userEmail: string, planName: string): EmailTemplate => {
    const planKey = planName.toLowerCase()
    const planInfo = PLAN_DETAILS[planKey] || { credits: '20,000', price: '$25' }
    const isPro = planKey === 'pro'

    return {
      subject: `Welcome to Polydev ${planName}! Your subscription is active`,
      html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Polydev ${planName}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px 20px; text-align: center; border-radius: 10px; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Polydev ${planName}!</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Your subscription is now active</p>
        </div>

        <div style="background: #f8fafc; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #0f172a; margin-top: 0;">Your ${planName} Plan Includes:</h2>
          <ul style="padding-left: 20px;">
            <li style="margin-bottom: 10px;"><strong style="color: #0f172a;">${planInfo.credits} credits/month</strong> - Use across all AI models</li>
            <li style="margin-bottom: 10px;"><strong>Credits rollover</strong> - Unused credits carry forward while subscribed</li>
            <li style="margin-bottom: 10px;"><strong>340+ AI models</strong> - GPT-5.1, Claude Opus 4.5, Gemini 3.0 Pro, and more</li>
            <li style="margin-bottom: 10px;"><strong>BYOK support</strong> - Use your own API keys for unlimited usage</li>
            <li style="margin-bottom: 10px;"><strong>Priority support</strong> - Get help when you need it</li>
            ${isPro ? '<li style="margin-bottom: 10px;"><strong>Advanced analytics</strong> - Track your usage in detail</li>' : ''}
          </ul>
        </div>

        <div style="background: #f0f9ff; padding: 20px; border-radius: 10px; margin-bottom: 20px; border-left: 4px solid #0284c7;">
          <h3 style="color: #0369a1; margin-top: 0;">How Credits Work</h3>
          <p style="margin: 0; color: #0c4a6e;">
            <strong>Premium models</strong> (GPT-5.1, Claude Opus 4.5) = 20 credits<br>
            <strong>Normal models</strong> = 4 credits<br>
            <strong>Eco models</strong> = 1 credit
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://www.polydev.ai/dashboard" style="background: #0f172a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Go to Dashboard</a>
        </div>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px; text-align: center; color: #64748b; font-size: 14px;">
          <p>Questions? Reply to this email or visit our <a href="https://www.polydev.ai/docs" style="color: #0284c7;">documentation</a></p>
          <p style="margin-top: 20px;">
            Polydev Team<br>
            <a href="https://www.polydev.ai" style="color: #0284c7;">www.polydev.ai</a>
          </p>
        </div>
      </body>
      </html>
    `,
      text: `
Welcome to Polydev ${planName}!

Your subscription is now active and ready to use.

Your ${planName} Plan Includes:
- ${planInfo.credits} credits/month - Use across all AI models
- Credits rollover - Unused credits carry forward while subscribed
- 340+ AI models - GPT-5.1, Claude Opus 4.5, Gemini 3.0 Pro, and more
- BYOK support - Use your own API keys for unlimited usage
- Priority support - Get help when you need it
${isPro ? '- Advanced analytics - Track your usage in detail\n' : ''}
How Credits Work:
- Premium models (GPT-5.1, Claude Opus 4.5) = 20 credits
- Normal models = 4 credits
- Eco models = 1 credit

Get started: https://www.polydev.ai/dashboard

Questions? Reply to this email or visit our documentation: https://www.polydev.ai/docs

Thanks for choosing Polydev!
The Polydev Team
    `
    }
  },

  subscriptionCancelled: (userEmail: string, planName: string, periodEnd: string): EmailTemplate => {
    const planKey = planName.toLowerCase()
    const planInfo = PLAN_DETAILS[planKey] || { credits: '20,000', price: '$25' }

    return {
      subject: `Your Polydev ${planName} subscription has been cancelled`,
      html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Subscription Cancelled</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f8fafc; padding: 30px; text-align: center; border-radius: 10px; margin-bottom: 30px; border-left: 4px solid #64748b;">
          <h1 style="color: #0f172a; margin: 0; font-size: 24px;">Subscription Cancelled</h1>
        </div>

        <div style="margin-bottom: 20px;">
          <p>Hi there,</p>
          <p>We're sorry to see you go! Your Polydev ${planName} subscription has been cancelled as requested.</p>
          <p><strong>Access until:</strong> ${new Date(periodEnd).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <p>You'll continue to have full ${planName} access and can use your remaining credits until your current billing period ends.</p>
        </div>

        <div style="background: #fef3c7; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <h3 style="color: #92400e; margin-top: 0;">What happens to your credits?</h3>
          <ul style="padding-left: 20px; margin-bottom: 0; color: #78350f;">
            <li>Your rolled-over credits will expire when your billing period ends</li>
            <li>If you resubscribe within 30 days (to at least Plus), your credits are restored</li>
            <li>After 30 days, unused credits are permanently lost</li>
          </ul>
        </div>

        <div style="background: #f0fdf4; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="color: #166534; margin-top: 0;">What happens next?</h3>
          <ul style="padding-left: 20px; margin-bottom: 0;">
            <li>Your ${planName} features remain active until ${new Date(periodEnd).toLocaleDateString()}</li>
            <li>After that, you'll be moved to our free plan (500 credits one-time)</li>
            <li>Your account and data will be preserved</li>
            <li>You can resubscribe anytime from your dashboard</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://www.polydev.ai/dashboard/subscription" style="background: #0f172a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Resubscribe</a>
        </div>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px;">
          <p><strong>We'd love your feedback!</strong> If you have a moment, please let us know why you cancelled so we can improve Polydev for everyone.</p>
        </div>

        <div style="text-align: center; color: #64748b; font-size: 14px; margin-top: 20px;">
          <p>Thanks for using Polydev!</p>
          <p>
            The Polydev Team<br>
            <a href="https://www.polydev.ai" style="color: #0284c7;">www.polydev.ai</a>
          </p>
        </div>
      </body>
      </html>
    `,
      text: `
Subscription Cancelled

Hi there,

We're sorry to see you go! Your Polydev ${planName} subscription has been cancelled as requested.

Access until: ${new Date(periodEnd).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

You'll continue to have full ${planName} access and can use your remaining credits until your current billing period ends.

What happens to your credits?
- Your rolled-over credits will expire when your billing period ends
- If you resubscribe within 30 days (to at least Plus), your credits are restored
- After 30 days, unused credits are permanently lost

What happens next?
- Your ${planName} features remain active until ${new Date(periodEnd).toLocaleDateString()}
- After that, you'll be moved to our free plan (500 credits one-time)
- Your account and data will be preserved
- You can resubscribe anytime from your dashboard

Resubscribe: https://www.polydev.ai/dashboard/subscription

We'd love your feedback! If you have a moment, please let us know why you cancelled so we can improve Polydev for everyone.

Thanks for using Polydev!
The Polydev Team
    `
    }
  },

  paymentFailed: (userEmail: string, amount: string, retryDate: string): EmailTemplate => ({
    subject: 'Action Required: Payment Failed for Your Polydev Subscription',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Failed</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #fef3c7; padding: 30px; text-align: center; border-radius: 10px; margin-bottom: 30px; border-left: 4px solid #f59e0b;">
          <h1 style="color: #92400e; margin: 0; font-size: 24px;">Payment Failed</h1>
          <p style="color: #92400e; margin: 10px 0 0 0;">Action required for your Polydev subscription</p>
        </div>

        <div style="margin-bottom: 20px;">
          <p>Hi there,</p>
          <p>We weren't able to process your payment of <strong>${amount}</strong> for your Polydev subscription.</p>
          <p>This can happen for various reasons like expired cards, insufficient funds, or bank restrictions.</p>
        </div>

        <div style="background: #fef2f2; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #ef4444;">
          <h3 style="color: #991b1b; margin-top: 0;">What you need to do:</h3>
          <ol style="padding-left: 20px; margin-bottom: 0;">
            <li>Update your payment method</li>
            <li>Ensure your card has sufficient funds</li>
            <li>Contact your bank if needed</li>
          </ol>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://www.polydev.ai/dashboard/subscription" style="background: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Update Payment Method</a>
        </div>

        <div style="background: #f0f9ff; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Next retry:</strong> ${new Date(retryDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
          <p style="margin: 10px 0 0 0; font-size: 14px; color: #64748b;">We'll automatically retry the payment. Your access continues until we resolve this.</p>
        </div>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px; text-align: center; color: #64748b; font-size: 14px;">
          <p>Need help? Contact us at <a href="mailto:support@polydev.ai" style="color: #0284c7;">support@polydev.ai</a></p>
          <p>
            The Polydev Team<br>
            <a href="https://www.polydev.ai" style="color: #0284c7;">www.polydev.ai</a>
          </p>
        </div>
      </body>
      </html>
    `,
    text: `
Payment Failed - Action Required

Hi there,

We weren't able to process your payment of ${amount} for your Polydev subscription.

This can happen for various reasons like expired cards, insufficient funds, or bank restrictions.

What you need to do:
1. Update your payment method
2. Ensure your card has sufficient funds
3. Contact your bank if needed

Update your payment method: https://www.polydev.ai/dashboard/subscription

Next retry: ${new Date(retryDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}

We'll automatically retry the payment. Your access continues until we resolve this.

Need help? Contact us at support@polydev.ai

The Polydev Team
    `
  }),

  subscriptionRenewal: (userEmail: string, planName: string, creditsAdded: number, periodEnd: string): EmailTemplate => {
    const planKey = planName.toLowerCase()
    const planInfo = PLAN_DETAILS[planKey] || { credits: formatCredits(creditsAdded), price: '$25' }

    return {
      subject: `Your Polydev ${planName} subscription renewed - ${planInfo.credits} credits added`,
      html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Subscription Renewed</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 40px 20px; text-align: center; border-radius: 10px; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Subscription Renewed!</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 18px;">+${planInfo.credits} credits added to your account</p>
        </div>

        <div style="background: #f0fdf4; padding: 30px; border-radius: 10px; margin-bottom: 20px; border-left: 4px solid #22c55e;">
          <h2 style="color: #166534; margin-top: 0;">Renewal Details</h2>
          <div style="background: white; padding: 20px; border-radius: 8px;">
            <p style="margin: 5px 0;"><strong>Plan:</strong> Polydev ${planName}</p>
            <p style="margin: 5px 0;"><strong>Credits Added:</strong> <span style="color: #22c55e; font-weight: bold;">${planInfo.credits}</span></p>
            <p style="margin: 5px 0;"><strong>Next renewal:</strong> ${new Date(periodEnd).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>

        <div style="background: #f0f9ff; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #0284c7;">
          <h3 style="color: #0369a1; margin-top: 0;">Your Credits Rollover!</h3>
          <p style="margin: 0; color: #0c4a6e;">
            Any unused credits from previous months have been preserved. Your new ${planInfo.credits} credits are added on top of your existing balance.
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://www.polydev.ai/dashboard" style="background: #0f172a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; margin-right: 10px;">Use Your Credits</a>
          <a href="https://www.polydev.ai/dashboard/credits" style="background: #64748b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">View Balance</a>
        </div>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px; text-align: center; color: #64748b; font-size: 14px;">
          <p>Thank you for being a Polydev subscriber!</p>
          <p>
            The Polydev Team<br>
            <a href="https://www.polydev.ai" style="color: #0284c7;">www.polydev.ai</a>
          </p>
        </div>
      </body>
      </html>
    `,
      text: `
Subscription Renewed!

+${planInfo.credits} credits added to your account

Renewal Details:
- Plan: Polydev ${planName}
- Credits Added: ${planInfo.credits}
- Next renewal: ${new Date(periodEnd).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

Your Credits Rollover!
Any unused credits from previous months have been preserved. Your new ${planInfo.credits} credits are added on top of your existing balance.

Use your credits: https://www.polydev.ai/dashboard
View balance: https://www.polydev.ai/dashboard/credits

Thank you for being a Polydev subscriber!
The Polydev Team
    `
    }
  },

  paymentSucceeded: (userEmail: string, amount: string, periodEnd: string): EmailTemplate => ({
    subject: 'Payment Received - Your Polydev subscription is active',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Received</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f0fdf4; padding: 30px; text-align: center; border-radius: 10px; margin-bottom: 30px; border-left: 4px solid #22c55e;">
          <h1 style="color: #166534; margin: 0; font-size: 24px;">Payment Received</h1>
          <p style="color: #166534; margin: 10px 0 0 0;">Your Polydev subscription is active</p>
        </div>

        <div style="margin-bottom: 20px;">
          <p>Hi there,</p>
          <p>Thank you! We've successfully processed your payment of <strong>${amount}</strong> for your Polydev subscription.</p>
        </div>

        <div style="background: #f8fafc; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Payment Details:</h3>
          <p style="margin: 5px 0;"><strong>Amount:</strong> ${amount}</p>
          <p style="margin: 5px 0;"><strong>Next billing:</strong> ${new Date(periodEnd).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://www.polydev.ai/dashboard" style="background: #0f172a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Go to Dashboard</a>
        </div>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px; text-align: center; color: #64748b; font-size: 14px;">
          <p>View your billing history: <a href="https://www.polydev.ai/dashboard/subscription" style="color: #0284c7;">Manage Subscription</a></p>
          <p>
            The Polydev Team<br>
            <a href="https://www.polydev.ai" style="color: #0284c7;">www.polydev.ai</a>
          </p>
        </div>
      </body>
      </html>
    `,
    text: `
Payment Received

Hi there,

Thank you! We've successfully processed your payment of ${amount} for your Polydev subscription.

Payment Details:
- Amount: ${amount}
- Next billing: ${new Date(periodEnd).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

Dashboard: https://www.polydev.ai/dashboard
Manage Subscription: https://www.polydev.ai/dashboard/subscription

The Polydev Team
    `
  }),

  welcomeFreeCredits: (userEmail: string): EmailTemplate => ({
    subject: 'Welcome to Polydev! Your 500 free credits are ready',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Polydev</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px 20px; text-align: center; border-radius: 10px; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Polydev!</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 18px;">500 free credits are ready to use</p>
        </div>

        <div style="background: #f0fdf4; padding: 30px; border-radius: 10px; margin-bottom: 20px; border-left: 4px solid #22c55e;">
          <h2 style="color: #166534; margin-top: 0;">Your Free Credits</h2>
          <p style="font-size: 36px; font-weight: bold; color: #22c55e; margin: 10px 0;">500 credits</p>
          <p style="color: #166534; margin: 0;">Use them across 340+ AI models</p>
        </div>

        <div style="background: #f0f9ff; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #0284c7;">
          <h3 style="color: #0369a1; margin-top: 0;">How Credits Work</h3>
          <p style="margin: 0; color: #0c4a6e;">
            <strong>Premium models</strong> (GPT-5.1, Claude Opus 4.5) = 20 credits<br>
            <strong>Normal models</strong> = 4 credits<br>
            <strong>Eco models</strong> = 1 credit
          </p>
        </div>

        <div style="background: #f8fafc; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="color: #0f172a; margin-top: 0;">What's included:</h3>
          <ul style="padding-left: 20px; margin-bottom: 0;">
            <li style="margin-bottom: 8px;">Access to 340+ AI models from 37+ providers</li>
            <li style="margin-bottom: 8px;">MCP integration for Claude Code and other IDEs</li>
            <li style="margin-bottom: 8px;">Web interface, CLI, and API access</li>
            <li style="margin-bottom: 8px;">No credit card required</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://www.polydev.ai/dashboard" style="background: #0f172a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Start Using Polydev</a>
        </div>

        <div style="background: #fef3c7; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <h3 style="color: #92400e; margin-top: 0;">Need more credits?</h3>
          <p style="margin: 0; color: #78350f;">
            Upgrade to <strong>Plus ($25/mo)</strong> for 20,000 credits/month<br>
            Or <strong>Pro ($50/mo)</strong> for 50,000 credits/month<br>
            Credits rollover as long as you stay subscribed!
          </p>
        </div>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px; text-align: center; color: #64748b; font-size: 14px;">
          <p>Questions? Check our <a href="https://www.polydev.ai/docs" style="color: #0284c7;">documentation</a> or reply to this email</p>
          <p style="margin-top: 20px;">
            Happy coding!<br>
            The Polydev Team<br>
            <a href="https://www.polydev.ai" style="color: #0284c7;">www.polydev.ai</a>
          </p>
        </div>
      </body>
      </html>
    `,
    text: `
Welcome to Polydev!

500 free credits are ready to use across 340+ AI models.

How Credits Work:
- Premium models (GPT-5.1, Claude Opus 4.5) = 20 credits
- Normal models = 4 credits
- Eco models = 1 credit

What's included:
- Access to 340+ AI models from 37+ providers
- MCP integration for Claude Code and other IDEs
- Web interface, CLI, and API access
- No credit card required

Start using Polydev: https://www.polydev.ai/dashboard

Need more credits?
- Plus ($25/mo): 20,000 credits/month
- Pro ($50/mo): 50,000 credits/month
Credits rollover as long as you stay subscribed!

Questions? Check our documentation: https://www.polydev.ai/docs

Happy coding!
The Polydev Team
    `
  }),

  // Legacy template for backward compatibility (deprecated)
  creditPurchase: (userEmail: string, creditAmount: number, packageName: string, amountPaid: number): EmailTemplate => ({
    subject: 'Credits Added to Your Polydev Account',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Credits Added</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 40px 20px; text-align: center; border-radius: 10px; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Credits Added!</h1>
        </div>

        <div style="background: #f0fdf4; padding: 30px; border-radius: 10px; margin-bottom: 20px; border-left: 4px solid #22c55e;">
          <h2 style="color: #166534; margin-top: 0;">Purchase Details</h2>
          <div style="background: white; padding: 20px; border-radius: 8px;">
            <p style="margin: 5px 0;"><strong>Credits Added:</strong> <span style="color: #22c55e; font-weight: bold;">${formatCredits(creditAmount)}</span></p>
            <p style="margin: 5px 0;"><strong>Package:</strong> ${packageName}</p>
            <p style="margin: 5px 0;"><strong>Amount Paid:</strong> $${amountPaid.toFixed(2)}</p>
          </div>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://www.polydev.ai/dashboard" style="background: #0f172a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Use Your Credits</a>
        </div>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px; text-align: center; color: #64748b; font-size: 14px;">
          <p>
            The Polydev Team<br>
            <a href="https://www.polydev.ai" style="color: #0284c7;">www.polydev.ai</a>
          </p>
        </div>
      </body>
      </html>
    `,
    text: `
Credits Added to Your Polydev Account

Purchase Details:
- Credits Added: ${formatCredits(creditAmount)}
- Package: ${packageName}
- Amount Paid: $${amountPaid.toFixed(2)}

Use your credits: https://www.polydev.ai/dashboard

The Polydev Team
    `
  }),

  // Referral email templates
  referralSuccess: (referrerEmail: string, newUserName: string, creditsEarned: number, totalReferrals: number): EmailTemplate => ({
    subject: `You earned ${creditsEarned} credits! Someone used your referral code`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Referral Reward</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 40px 20px; text-align: center; border-radius: 10px; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">You Earned Credits!</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 18px;">Someone joined using your referral code</p>
        </div>

        <div style="background: #f5f3ff; padding: 30px; border-radius: 10px; margin-bottom: 20px; border-left: 4px solid #8b5cf6;">
          <h2 style="color: #5b21b6; margin-top: 0;">Referral Reward</h2>
          <p style="font-size: 48px; font-weight: bold; color: #7c3aed; margin: 10px 0;">+${creditsEarned}</p>
          <p style="color: #5b21b6; margin: 0;">credits added to your account</p>
        </div>

        <div style="background: #f8fafc; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="color: #0f172a; margin-top: 0;">Your Referral Stats</h3>
          <p style="margin: 5px 0;"><strong>Total successful referrals:</strong> ${totalReferrals}</p>
          <p style="margin: 5px 0;"><strong>Credits earned this referral:</strong> ${creditsEarned}</p>
        </div>

        <div style="background: #fef3c7; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <h3 style="color: #92400e; margin-top: 0;">Keep sharing!</h3>
          <p style="margin: 0; color: #78350f;">
            Every friend you refer earns you <strong>500 credits</strong>.<br>
            Share your referral link to keep growing your credits!
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://www.polydev.ai/dashboard/referrals" style="background: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">View Referrals</a>
        </div>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px; text-align: center; color: #64748b; font-size: 14px;">
          <p>Thank you for spreading the word about Polydev!</p>
          <p>
            The Polydev Team<br>
            <a href="https://www.polydev.ai" style="color: #0284c7;">www.polydev.ai</a>
          </p>
        </div>
      </body>
      </html>
    `,
    text: `
You Earned Credits!

Someone joined Polydev using your referral code.

Referral Reward: +${creditsEarned} credits added to your account

Your Referral Stats:
- Total successful referrals: ${totalReferrals}
- Credits earned this referral: ${creditsEarned}

Keep sharing!
Every friend you refer earns you 500 credits.
Share your referral link to keep growing your credits!

View your referrals: https://www.polydev.ai/dashboard/referrals

Thank you for spreading the word about Polydev!
The Polydev Team
    `
  }),

  referralWelcome: (newUserEmail: string, creditsReceived: number, referrerName?: string): EmailTemplate => ({
    subject: `Welcome to Polydev! You received ${creditsReceived} bonus credits`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome Bonus</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px 20px; text-align: center; border-radius: 10px; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Polydev!</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 18px;">You've received ${creditsReceived} bonus credits</p>
        </div>

        <div style="background: #f0fdf4; padding: 30px; border-radius: 10px; margin-bottom: 20px; border-left: 4px solid #22c55e;">
          <h2 style="color: #166534; margin-top: 0;">Your Welcome Bonus</h2>
          <p style="font-size: 48px; font-weight: bold; color: #22c55e; margin: 10px 0;">${creditsReceived}</p>
          <p style="color: #166534; margin: 0;">bonus credits added to your account</p>
          ${referrerName ? `<p style="color: #166534; margin-top: 10px; font-size: 14px;">Thanks to your friend for sharing Polydev!</p>` : ''}
        </div>

        <div style="background: #f0f9ff; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #0284c7;">
          <h3 style="color: #0369a1; margin-top: 0;">How to Use Your Credits</h3>
          <p style="margin: 0; color: #0c4a6e;">
            <strong>Premium models</strong> (GPT-5.1, Claude Opus 4.5) = 20 credits<br>
            <strong>Normal models</strong> = 4 credits<br>
            <strong>Eco models</strong> = 1 credit
          </p>
        </div>

        <div style="background: #f8fafc; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="color: #0f172a; margin-top: 0;">What you get with Polydev:</h3>
          <ul style="padding-left: 20px; margin-bottom: 0;">
            <li style="margin-bottom: 8px;">Access to 340+ AI models from 37+ providers</li>
            <li style="margin-bottom: 8px;">MCP integration for Claude Code and other IDEs</li>
            <li style="margin-bottom: 8px;">Web interface, CLI, and API access</li>
            <li style="margin-bottom: 8px;">Unified billing across all providers</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://www.polydev.ai/dashboard" style="background: #0f172a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Start Using Polydev</a>
        </div>

        <div style="background: #fef3c7; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <h3 style="color: #92400e; margin-top: 0;">Earn more credits!</h3>
          <p style="margin: 0; color: #78350f;">
            Share your own referral code and earn <strong>500 credits</strong> for each friend who joins!
          </p>
        </div>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px; text-align: center; color: #64748b; font-size: 14px;">
          <p>Questions? Check our <a href="https://www.polydev.ai/docs" style="color: #0284c7;">documentation</a> or reply to this email</p>
          <p>
            Happy coding!<br>
            The Polydev Team<br>
            <a href="https://www.polydev.ai" style="color: #0284c7;">www.polydev.ai</a>
          </p>
        </div>
      </body>
      </html>
    `,
    text: `
Welcome to Polydev!

You've received ${creditsReceived} bonus credits${referrerName ? ` thanks to your friend ${referrerName}` : ''}.

Your Welcome Bonus: ${creditsReceived} bonus credits added to your account

How to Use Your Credits:
- Premium models (GPT-5.1, Claude Opus 4.5) = 20 credits
- Normal models = 4 credits
- Eco models = 1 credit

What you get with Polydev:
- Access to 340+ AI models from 37+ providers
- MCP integration for Claude Code and other IDEs
- Web interface, CLI, and API access
- Unified billing across all providers

Start using Polydev: https://www.polydev.ai/dashboard

Earn more credits!
Share your own referral code and earn 500 credits for each friend who joins!

Questions? Check our documentation: https://www.polydev.ai/docs

Happy coding!
The Polydev Team
    `
  })
}
