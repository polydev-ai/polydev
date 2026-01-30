export interface EmailTemplate {
  subject: string
  html: string
  text: string
}

// Helper to format credits with commas
const formatCredits = (credits: number): string => credits.toLocaleString()

// Professional email wrapper with clean design
const emailWrapper = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @media only screen and (max-width: 600px) {
      .container { padding: 24px 16px !important; }
      .button { padding: 14px 24px !important; }
    }
  </style>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; line-height: 1.7; color: #1a1a1a; background: #f8f9fa; margin: 0; padding: 0;">
  <div style="max-width: 560px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: #fff; border-radius: 12px; padding: 48px 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);" class="container">
      <div style="text-align: center; margin-bottom: 32px;">
        <img src="https://www.polydev.ai/logo.png" alt="Polydev" width="40" height="40" style="display: inline-block;">
      </div>
      ${content}
    </div>
    <div style="text-align: center; padding: 24px 20px;">
      <p style="color: #6b7280; font-size: 13px; margin: 0 0 8px 0;">
        <a href="https://polydev.ai" style="color: #6b7280; text-decoration: none;">Polydev</a> · Multi-model AI for developers
      </p>
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        <a href="https://polydev.ai/dashboard" style="color: #9ca3af;">Dashboard</a> · 
        <a href="https://polydev.ai/docs" style="color: #9ca3af;">Docs</a> · 
        <a href="mailto:support@polydev.ai" style="color: #9ca3af;">Support</a>
      </p>
    </div>
  </div>
</body>
</html>
`

// Plan details for emails
const PLAN_DETAILS: Record<string, { credits: string; price: string }> = {
  premium: { credits: '10,000', price: '$10' },
  plus: { credits: '20,000', price: '$25' },
  pro: { credits: '50,000', price: '$50' }
}

export const emailTemplates = {
  subscriptionCreated: (userEmail: string, planName: string): EmailTemplate => {
    const planKey = planName.toLowerCase()
    const planInfo = PLAN_DETAILS[planKey] || { credits: '10,000', price: '$10' }

    return {
      subject: `You're in! ${planInfo.credits} credits ready to use`,
      html: emailWrapper(`
        <h1 style="font-size: 28px; font-weight: 700; color: #000; margin: 0 0 16px 0; letter-spacing: -0.5px;">Welcome to ${planName}</h1>
        
        <p style="font-size: 16px; color: #4b5563; margin: 0 0 24px 0;">Your subscription is active. You now have access to GPT-5, Claude Opus 4.5, Gemini, Grok, and 40+ other AI models—all through one simple API.</p>
        
        <div style="background: #f9fafb; border-radius: 8px; padding: 24px; margin: 24px 0;">
          <div style="text-align: center;">
            <p style="font-size: 42px; font-weight: 700; color: #000; margin: 0; letter-spacing: -1px;">${planInfo.credits}</p>
            <p style="font-size: 14px; color: #6b7280; margin: 4px 0 0 0;">credits loaded</p>
          </div>
        </div>

        <p style="font-size: 15px; color: #374151; margin: 0 0 24px 0;"><strong>What's included:</strong></p>
        
        <ul style="margin: 0 0 24px 0; padding-left: 20px; color: #374151;">
          <li style="margin-bottom: 8px;">Unlimited messages every month</li>
          <li style="margin-bottom: 8px;">Credits rollover while subscribed</li>
          <li style="margin-bottom: 8px;">Connect your CLI tools (Claude Code, Codex, Gemini)</li>
          <li style="margin-bottom: 8px;">Priority support</li>
        </ul>

        <div style="text-align: center; margin: 32px 0;">
          <a href="https://polydev.ai/dashboard" style="background: #000; color: #fff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;" class="button">Open Dashboard →</a>
        </div>

        <p style="font-size: 14px; color: #6b7280; margin: 24px 0 0 0; text-align: center;">Need help getting started? Just reply to this email.</p>
      `),
      text: `Welcome to Polydev ${planName}!

Your subscription is active. You now have ${planInfo.credits} credits loaded and ready to use.

What's included:
- Unlimited messages every month
- Credits rollover while subscribed
- Connect your CLI tools (Claude Code, Codex, Gemini)
- Priority support

Get started: https://polydev.ai/dashboard

Need help? Reply to this email.

— The Polydev Team`
    }
  },

  subscriptionCancelled: (userEmail: string, planName: string, periodEnd: string): EmailTemplate => {
    const endDate = new Date(periodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

    return {
      subject: `Your subscription ends on ${endDate}`,
      html: emailWrapper(`
        <h1 style="font-size: 28px; font-weight: 700; color: #000; margin: 0 0 16px 0; letter-spacing: -0.5px;">We'll miss you</h1>
        
        <p style="font-size: 16px; color: #4b5563; margin: 0 0 24px 0;">Your ${planName} subscription has been cancelled. You'll continue to have full access until <strong>${endDate}</strong>.</p>

        <div style="background: #f9fafb; border-radius: 8px; padding: 24px; margin: 24px 0;">
          <p style="font-size: 15px; color: #374151; margin: 0 0 12px 0; font-weight: 600;">Before you go:</p>
          <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
            <li style="margin-bottom: 6px;">Use your remaining credits before ${endDate}</li>
            <li style="margin-bottom: 6px;">Your data stays safe—resubscribe anytime to restore access</li>
            <li style="margin-bottom: 6px;">After cancellation, you keep 500 free credits</li>
          </ul>
        </div>

        <p style="font-size: 15px; color: #374151; margin: 24px 0;">Changed your mind? You can reactivate anytime before your billing period ends.</p>

        <div style="text-align: center; margin: 32px 0;">
          <a href="https://polydev.ai/dashboard/subscription" style="background: #000; color: #fff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;" class="button">Reactivate Subscription</a>
        </div>

        <p style="font-size: 14px; color: #6b7280; margin: 24px 0 0 0; text-align: center;">We'd love to hear your feedback—just reply to this email.</p>
      `),
      text: `We'll miss you

Your ${planName} subscription has been cancelled. You'll continue to have full access until ${endDate}.

Before you go:
- Use your remaining credits before ${endDate}
- Your data stays safe—resubscribe anytime to restore access
- After cancellation, you keep 500 free credits

Changed your mind? Reactivate here: https://polydev.ai/dashboard/subscription

We'd love to hear your feedback—just reply to this email.

— The Polydev Team`
    }
  },

  paymentFailed: (userEmail: string, amount: string, retryDate: string): EmailTemplate => {
    const retry = new Date(retryDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

    return {
      subject: `Action needed: Update your payment method`,
      html: emailWrapper(`
        <h1 style="font-size: 28px; font-weight: 700; color: #000; margin: 0 0 16px 0; letter-spacing: -0.5px;">Payment unsuccessful</h1>
        
        <p style="font-size: 16px; color: #4b5563; margin: 0 0 24px 0;">We couldn't process your payment of <strong>${amount}</strong>. Your access continues while we retry—no action needed if you've already updated your card.</p>

        <div style="background: #fef2f2; border-radius: 8px; padding: 24px; margin: 24px 0; border-left: 3px solid #ef4444;">
          <p style="font-size: 15px; color: #991b1b; margin: 0;"><strong>Next retry:</strong> ${retry}</p>
        </div>

        <p style="font-size: 15px; color: #374151; margin: 0 0 24px 0;">Common fixes:</p>
        <ul style="margin: 0 0 24px 0; padding-left: 20px; color: #4b5563;">
          <li style="margin-bottom: 6px;">Update expired card details</li>
          <li style="margin-bottom: 6px;">Ensure sufficient funds</li>
          <li style="margin-bottom: 6px;">Contact your bank if payments are blocked</li>
        </ul>

        <div style="text-align: center; margin: 32px 0;">
          <a href="https://polydev.ai/dashboard/subscription" style="background: #000; color: #fff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;" class="button">Update Payment Method</a>
        </div>

        <p style="font-size: 14px; color: #6b7280; margin: 24px 0 0 0; text-align: center;">Questions? Reply to this email or contact support@polydev.ai</p>
      `),
      text: `Payment unsuccessful

We couldn't process your payment of ${amount}. Your access continues while we retry.

Next retry: ${retry}

Common fixes:
- Update expired card details
- Ensure sufficient funds
- Contact your bank if payments are blocked

Update payment method: https://polydev.ai/dashboard/subscription

Questions? Reply to this email.

— The Polydev Team`
    }
  },

  subscriptionRenewal: (userEmail: string, planName: string, creditsAdded: number, periodEnd: string): EmailTemplate => {
    const planKey = planName.toLowerCase()
    const planInfo = PLAN_DETAILS[planKey] || { credits: formatCredits(creditsAdded), price: '$10' }
    const nextDate = new Date(periodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

    return {
      subject: `+${planInfo.credits} credits added to your account`,
      html: emailWrapper(`
        <h1 style="font-size: 28px; font-weight: 700; color: #000; margin: 0 0 16px 0; letter-spacing: -0.5px;">You're all set for another month</h1>
        
        <p style="font-size: 16px; color: #4b5563; margin: 0 0 24px 0;">Your ${planName} subscription has renewed. Fresh credits have been added to your balance.</p>
        
        <div style="background: #f0fdf4; border-radius: 8px; padding: 24px; margin: 24px 0; text-align: center;">
          <p style="font-size: 42px; font-weight: 700; color: #166534; margin: 0; letter-spacing: -1px;">+${planInfo.credits}</p>
          <p style="font-size: 14px; color: #166534; margin: 4px 0 0 0;">credits added</p>
        </div>

        <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <p style="font-size: 14px; color: #6b7280; margin: 0;"><strong>Note:</strong> Your unused credits from last month have rolled over. Next renewal: ${nextDate}</p>
        </div>

        <div style="text-align: center; margin: 32px 0;">
          <a href="https://polydev.ai/dashboard" style="background: #000; color: #fff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;" class="button">View Your Balance</a>
        </div>
      `),
      text: `You're all set for another month

Your ${planName} subscription has renewed. +${planInfo.credits} credits have been added to your account.

Your unused credits from last month have rolled over.
Next renewal: ${nextDate}

View your balance: https://polydev.ai/dashboard

— The Polydev Team`
    }
  },

  paymentSucceeded: (userEmail: string, amount: string, periodEnd: string): EmailTemplate => {
    const nextDate = new Date(periodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

    return {
      subject: `Receipt: ${amount} payment received`,
      html: emailWrapper(`
        <h1 style="font-size: 28px; font-weight: 700; color: #000; margin: 0 0 16px 0; letter-spacing: -0.5px;">Payment received</h1>
        
        <p style="font-size: 16px; color: #4b5563; margin: 0 0 24px 0;">Thanks for your payment. Here's your receipt.</p>

        <div style="background: #f9fafb; border-radius: 8px; padding: 24px; margin: 24px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Amount paid</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #000;">${amount}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb;">Next billing date</td>
              <td style="padding: 8px 0; text-align: right; color: #374151; border-top: 1px solid #e5e7eb;">${nextDate}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 32px 0;">
          <a href="https://polydev.ai/dashboard/subscription" style="background: #000; color: #fff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;" class="button">View Billing History</a>
        </div>
      `),
      text: `Payment received

Thanks for your payment of ${amount}.

Next billing date: ${nextDate}

View billing history: https://polydev.ai/dashboard/subscription

— The Polydev Team`
    }
  },

  welcomeFreeCredits: (userEmail: string): EmailTemplate => ({
    subject: `500 credits are waiting for you`,
    html: emailWrapper(`
      <h1 style="font-size: 28px; font-weight: 700; color: #000; margin: 0 0 16px 0; letter-spacing: -0.5px;">Welcome to Polydev</h1>
      
      <p style="font-size: 16px; color: #4b5563; margin: 0 0 24px 0;">You've got 500 free credits to explore. Use them to try GPT-5, Claude Opus 4.5, Gemini, Grok, and 40+ other AI models.</p>
      
      <div style="background: #f9fafb; border-radius: 8px; padding: 24px; margin: 24px 0; text-align: center;">
        <p style="font-size: 42px; font-weight: 700; color: #000; margin: 0; letter-spacing: -1px;">500</p>
        <p style="font-size: 14px; color: #6b7280; margin: 4px 0 0 0;">credits to start</p>
      </div>

      <p style="font-size: 15px; color: #374151; margin: 0 0 16px 0;"><strong>Three ways to use Polydev:</strong></p>
      
      <div style="margin: 0 0 24px 0;">
        <p style="font-size: 14px; color: #374151; margin: 0 0 8px 0;"><strong>1. Web interface</strong> — Chat with any model at polydev.ai</p>
        <p style="font-size: 14px; color: #374151; margin: 0 0 8px 0;"><strong>2. MCP integration</strong> — Use in Claude Code, Cursor, or any MCP-compatible tool</p>
        <p style="font-size: 14px; color: #374151; margin: 0;"><strong>3. Your CLI subscriptions</strong> — Connect Claude Code, Codex CLI, or Gemini CLI</p>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="https://polydev.ai/dashboard" style="background: #000; color: #fff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;" class="button">Start Building →</a>
      </div>

      <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <p style="font-size: 14px; color: #374151; margin: 0;"><strong>Need more?</strong> Upgrade to Premium for 10,000 credits/month + unlimited messages at $10/mo.</p>
      </div>
    `),
    text: `Welcome to Polydev

You've got 500 free credits to explore. Use them to try GPT-5, Claude Opus 4.5, Gemini, Grok, and 40+ other AI models.

Three ways to use Polydev:
1. Web interface — Chat with any model at polydev.ai
2. MCP integration — Use in Claude Code, Cursor, or any MCP-compatible tool
3. Your CLI subscriptions — Connect Claude Code, Codex CLI, or Gemini CLI

Get started: https://polydev.ai/dashboard

Need more? Upgrade to Premium for 10,000 credits/month + unlimited messages at $10/mo.

— The Polydev Team`
  }),

  // Legacy template for backward compatibility
  creditPurchase: (userEmail: string, creditAmount: number, packageName: string, amountPaid: number): EmailTemplate => ({
    subject: `+${formatCredits(creditAmount)} credits added`,
    html: emailWrapper(`
      <h1 style="font-size: 28px; font-weight: 700; color: #000; margin: 0 0 16px 0; letter-spacing: -0.5px;">Credits added</h1>
      
      <p style="font-size: 16px; color: #4b5563; margin: 0 0 24px 0;">Your purchase is complete. Here's your receipt.</p>

      <div style="background: #f0fdf4; border-radius: 8px; padding: 24px; margin: 24px 0; text-align: center;">
        <p style="font-size: 42px; font-weight: 700; color: #166534; margin: 0; letter-spacing: -1px;">+${formatCredits(creditAmount)}</p>
        <p style="font-size: 14px; color: #166534; margin: 4px 0 0 0;">credits added</p>
      </div>

      <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Package</td>
            <td style="padding: 6px 0; text-align: right; color: #374151;">${packageName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Amount</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #000;">$${amountPaid.toFixed(2)}</td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="https://polydev.ai/dashboard" style="background: #000; color: #fff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;" class="button">Use Your Credits</a>
      </div>
    `),
    text: `Credits added

+${formatCredits(creditAmount)} credits have been added to your account.

Package: ${packageName}
Amount paid: $${amountPaid.toFixed(2)}

Use your credits: https://polydev.ai/dashboard

— The Polydev Team`
  }),

  // Referral email templates
  referralSuccess: (referrerEmail: string, newUserName: string, creditsEarned: number, totalReferrals: number): EmailTemplate => ({
    subject: `You earned ${creditsEarned} credits!`,
    html: emailWrapper(`
      <h1 style="font-size: 28px; font-weight: 700; color: #000; margin: 0 0 16px 0; letter-spacing: -0.5px;">Someone joined with your link</h1>
      
      <p style="font-size: 16px; color: #4b5563; margin: 0 0 24px 0;">Nice! A friend signed up using your referral, and you've earned bonus credits.</p>
      
      <div style="background: #f0fdf4; border-radius: 8px; padding: 24px; margin: 24px 0; text-align: center;">
        <p style="font-size: 42px; font-weight: 700; color: #166534; margin: 0; letter-spacing: -1px;">+${creditsEarned}</p>
        <p style="font-size: 14px; color: #166534; margin: 4px 0 0 0;">credits earned</p>
      </div>

      <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <p style="font-size: 14px; color: #374151; margin: 0;"><strong>Total referrals:</strong> ${totalReferrals} · Keep sharing to earn more!</p>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="https://polydev.ai/dashboard/referrals" style="background: #000; color: #fff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;" class="button">View Your Referrals</a>
      </div>
    `),
    text: `Someone joined with your link!

A friend signed up using your referral, and you've earned +${creditsEarned} bonus credits.

Total referrals: ${totalReferrals}

Keep sharing to earn more: https://polydev.ai/dashboard/referrals

— The Polydev Team`
  }),

  referralWelcome: (newUserEmail: string, creditsReceived: number, referrerName?: string): EmailTemplate => ({
    subject: `${creditsReceived} bonus credits added to your account`,
    html: emailWrapper(`
      <h1 style="font-size: 28px; font-weight: 700; color: #000; margin: 0 0 16px 0; letter-spacing: -0.5px;">Welcome to Polydev</h1>
      
      <p style="font-size: 16px; color: #4b5563; margin: 0 0 24px 0;">${referrerName ? `Your friend ${referrerName} referred you, so ` : ''}you're starting with bonus credits. Use them to try GPT-5, Claude Opus 4.5, Gemini, and 40+ other models.</p>
      
      <div style="background: #f0fdf4; border-radius: 8px; padding: 24px; margin: 24px 0; text-align: center;">
        <p style="font-size: 42px; font-weight: 700; color: #166534; margin: 0; letter-spacing: -1px;">${creditsReceived}</p>
        <p style="font-size: 14px; color: #166534; margin: 4px 0 0 0;">bonus credits</p>
      </div>

      <p style="font-size: 15px; color: #374151; margin: 0 0 16px 0;"><strong>Three ways to use Polydev:</strong></p>
      
      <div style="margin: 0 0 24px 0;">
        <p style="font-size: 14px; color: #374151; margin: 0 0 8px 0;"><strong>1. Web interface</strong> — Chat with any model at polydev.ai</p>
        <p style="font-size: 14px; color: #374151; margin: 0 0 8px 0;"><strong>2. MCP integration</strong> — Use in Claude Code, Cursor, or any MCP-compatible tool</p>
        <p style="font-size: 14px; color: #374151; margin: 0;"><strong>3. Your CLI subscriptions</strong> — Connect Claude Code, Codex CLI, or Gemini CLI</p>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="https://polydev.ai/dashboard" style="background: #000; color: #fff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;" class="button">Start Building →</a>
      </div>

      <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <p style="font-size: 14px; color: #374151; margin: 0;"><strong>Earn more credits:</strong> Share your referral link and get 500 credits for each friend who joins.</p>
      </div>
    `),
    text: `Welcome to Polydev

${referrerName ? `Your friend ${referrerName} referred you, so ` : ''}you're starting with ${creditsReceived} bonus credits.

Three ways to use Polydev:
1. Web interface — Chat with any model at polydev.ai
2. MCP integration — Use in Claude Code, Cursor, or any MCP-compatible tool
3. Your CLI subscriptions — Connect Claude Code, Codex CLI, or Gemini CLI

Get started: https://polydev.ai/dashboard

Earn more credits: Share your referral link and get 500 credits for each friend who joins.

— The Polydev Team`
  })
}
