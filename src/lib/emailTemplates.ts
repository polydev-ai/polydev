export interface EmailTemplate {
  subject: string
  html: string
  text: string
}

// Helper to format credits with commas
const formatCredits = (credits: number): string => credits.toLocaleString()

// Clean minimal email wrapper - black and white design
const emailWrapper = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #000; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #fff;">
  <div style="text-align: center; margin-bottom: 40px;">
    <img src="https://www.polydev.ai/logo.svg" alt="Polydev" width="48" height="48" style="display: inline-block;">
  </div>
  ${content}
  <div style="border-top: 1px solid #eee; margin-top: 40px; padding-top: 20px; text-align: center;">
    <p style="color: #666; font-size: 14px; margin: 0;">
      Questions? Reply to this email.<br><br>
      <a href="https://www.polydev.ai" style="color: #000;">polydev.ai</a>
    </p>
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
    const isPremium = planKey === 'premium'

    return {
      subject: `Welcome to Polydev ${planName}! Your subscription is active`,
      html: emailWrapper(`
      <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 8px 0;">Welcome to Polydev ${planName}</h1>
      
      <p style="margin: 0 0 24px 0;">Your subscription is now active and ready to use.</p>
      
      <div style="background: #f9f9f9; padding: 24px; border-radius: 8px; margin-bottom: 24px; text-align: center;">
        <p style="font-size: 36px; font-weight: 700; margin: 0;">${planInfo.credits}</p>
        <p style="color: #666; margin: 8px 0 0 0;">credits/month - Use across all AI models</p>
      </div>

      <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 24px 0;">
        <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">How Credits Work</h3>
        <p style="margin: 0;">
          <strong>Premium models</strong> (GPT-5.2, Claude Opus 4.5) = 20 credits<br>
          <strong>Normal models</strong> = 4 credits<br>
          <strong>Eco models</strong> = 1 credit
        </p>
      </div>

      <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 24px 0;">
        <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">What's included:</h3>
        <ul style="padding-left: 20px; margin: 0;">
          <li style="margin-bottom: 8px;">Access to all AI models (GPT-5.2, Claude Opus 4.5, Gemini 3, Grok 4.1)</li>
          <li style="margin-bottom: 8px;">MCP integration for Claude Code, Cursor, and other IDEs</li>
          <li style="margin-bottom: 8px;">Use your existing CLI subscriptions</li>
          <li style="margin-bottom: 8px;">No credit card required</li>
        </ul>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://www.polydev.ai/dashboard" style="background: #000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Go to Dashboard</a>
      </div>
    `),
      text: `
Welcome to Polydev ${planName}!

Your subscription is now active and ready to use.

Your ${planName} Plan Includes:
- ${planInfo.credits} credits/month - Use across all AI models
${isPremium ? '- Unlimited messages - No message limits\n' : ''}- Credits rollover - Unused credits carry forward while subscribed
- All AI models - GPT-5.2, Claude Opus 4.5, Gemini 3, and more
- Use your CLI subscriptions - Connect Claude Code, Codex CLI, Gemini CLI
- Priority support - Get help when you need it

How Credits Work:
- Premium models (GPT-5.2, Claude Opus 4.5) = 20 credits
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
    const planInfo = PLAN_DETAILS[planKey] || { credits: '10,000', price: '$10' }

    return {
      subject: `Your Polydev ${planName} subscription has been cancelled`,
      html: emailWrapper(`
      <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 8px 0;">Subscription Cancelled</h1>
      
      <p style="margin: 0 0 24px 0;">We're sorry to see you go! Your Polydev ${planName} subscription has been cancelled as requested.</p>
      
      <p style="margin: 0 0 24px 0;"><strong>Access until:</strong> ${new Date(periodEnd).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      
      <p style="margin: 0 0 24px 0;">You'll continue to have full ${planName} access and can use your remaining credits until your current billing period ends.</p>

      <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 24px 0;">
        <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">What happens to your credits?</h3>
        <ul style="padding-left: 20px; margin: 0;">
          <li style="margin-bottom: 6px;">Your rolled-over credits will expire when your billing period ends</li>
          <li style="margin-bottom: 6px;">If you resubscribe within 30 days, your credits are restored</li>
          <li style="margin-bottom: 6px;">After 30 days, unused credits are permanently lost</li>
        </ul>
      </div>

      <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 24px 0;">
        <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">What happens next?</h3>
        <ul style="padding-left: 20px; margin: 0;">
          <li style="margin-bottom: 6px;">Your ${planName} features remain active until ${new Date(periodEnd).toLocaleDateString()}</li>
          <li style="margin-bottom: 6px;">After that, you'll be moved to our free plan (500 credits one-time)</li>
          <li style="margin-bottom: 6px;">Your account and data will be preserved</li>
          <li style="margin-bottom: 6px;">You can resubscribe anytime from your dashboard</li>
        </ul>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://www.polydev.ai/dashboard/subscription" style="background: #000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Resubscribe</a>
      </div>

      <p style="margin: 24px 0 0 0; text-align: center; color: #666; font-size: 14px;">Thank you for using Polydev!</p>
    `),
      text: `
Subscription Cancelled

We're sorry to see you go! Your Polydev ${planName} subscription has been cancelled as requested.

Access until: ${new Date(periodEnd).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

You'll continue to have full ${planName} access and can use your remaining credits until your current billing period ends.

What happens to your credits?
- Your rolled-over credits will expire when your billing period ends
- If you resubscribe within 30 days, your credits are restored
- After 30 days, unused credits are permanently lost

What happens next?
- Your ${planName} features remain active until ${new Date(periodEnd).toLocaleDateString()}
- After that, you'll be moved to our free plan (500 credits one-time)
- Your account and data will be preserved
- You can resubscribe anytime from your dashboard

Resubscribe: https://www.polydev.ai/dashboard/subscription

Thank you for using Polydev!
The Polydev Team
    `
    }
  },

  paymentFailed: (userEmail: string, amount: string, retryDate: string): EmailTemplate => ({
    subject: 'Action Required: Payment Failed for Your Polydev Subscription',
    html: emailWrapper(`
      <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 8px 0;">Payment Failed</h1>
      
      <p style="margin: 0 0 24px 0;">We weren't able to process your payment of <strong>${amount}</strong> for your Polydev subscription.</p>
      
      <p style="margin: 0 0 24px 0;">This can happen for various reasons like expired cards, insufficient funds, or bank restrictions.</p>

      <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 24px 0;">
        <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">What you need to do:</h3>
        <ol style="padding-left: 20px; margin: 0;">
          <li style="margin-bottom: 6px;">Update your payment method</li>
          <li style="margin-bottom: 6px;">Ensure your card has sufficient funds</li>
          <li style="margin-bottom: 6px;">Contact your bank if needed</li>
        </ol>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://www.polydev.ai/dashboard/subscription" style="background: #000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Update Payment Method</a>
      </div>

      <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 24px 0;">
        <p style="margin: 0;"><strong>Next retry:</strong> ${new Date(retryDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
        <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">We'll automatically retry the payment. Your access continues until we resolve this.</p>
      </div>

      <p style="margin: 24px 0 0 0; text-align: center; color: #666; font-size: 14px;">Need help? Contact us at <a href="mailto:support@polydev.ai" style="color: #000;">support@polydev.ai</a></p>
    `),
    text: `
Payment Failed - Action Required

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
      html: emailWrapper(`
      <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 8px 0;">Subscription Renewed</h1>
      <p style="font-size: 18px; margin: 0 0 24px 0; color: #666;">+${planInfo.credits} credits added to your account</p>

      <div style="background: #f9f9f9; padding: 24px; border-radius: 8px; margin-bottom: 24px; text-align: center;">
        <p style="font-size: 48px; font-weight: 700; margin: 0;">${planInfo.credits}</p>
        <p style="color: #666; margin: 8px 0 0 0;">credits added to your account</p>
      </div>

      <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 24px 0;">
        <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">Renewal Details</h3>
        <p style="margin: 5px 0;"><strong>Plan:</strong> Polydev ${planName}</p>
        <p style="margin: 5px 0;"><strong>Credits Added:</strong> ${planInfo.credits}</p>
        <p style="margin: 5px 0;"><strong>Next renewal:</strong> ${new Date(periodEnd).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 24px 0;">
        <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">Your Credits Rollover!</h3>
        <p style="margin: 0;">
          Any unused credits from previous months have been preserved. Your new ${planInfo.credits} credits are added on top of your existing balance.
        </p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://www.polydev.ai/dashboard" style="background: #000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; margin-right: 10px;">Use Your Credits</a>
        <a href="https://www.polydev.ai/dashboard/credits" style="background: #fff; color: #000; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; border: 1px solid #000;">View Balance</a>
      </div>

      <p style="margin: 24px 0 0 0; text-align: center; color: #666; font-size: 14px;">Thank you for being a Polydev subscriber!</p>
    `),
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
    html: emailWrapper(`
      <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 8px 0;">Payment Received</h1>
      
      <p style="margin: 0 0 24px 0;">Thank you! We've successfully processed your payment of <strong>${amount}</strong> for your Polydev subscription.</p>

      <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 24px 0;">
        <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">Payment Details</h3>
        <p style="margin: 5px 0;"><strong>Amount:</strong> ${amount}</p>
        <p style="margin: 5px 0;"><strong>Next billing:</strong> ${new Date(periodEnd).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://www.polydev.ai/dashboard" style="background: #000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Go to Dashboard</a>
      </div>

      <p style="margin: 24px 0 0 0; text-align: center; color: #666; font-size: 14px;">View your billing history: <a href="https://www.polydev.ai/dashboard/subscription" style="color: #000;">Manage Subscription</a></p>
    `),
    text: `
Payment Received

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
    html: emailWrapper(`
      <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 8px 0;">Welcome to Polydev!</h1>

      <div style="background: #f9f9f9; padding: 24px; border-radius: 8px; margin-bottom: 24px; text-align: center;">
        <p style="font-size: 36px; font-weight: 700; margin: 0;">500 credits</p>
        <p style="color: #666; margin: 8px 0 0 0;">One-time bonus to get you started</p>
      </div>

      <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 24px 0;">
        <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">How Credits Work</h3>
        <p style="margin: 0;">
          <strong>Premium models</strong> (GPT-5.2, Claude Opus 4.5) = 20 credits<br>
          <strong>Normal models</strong> = 4 credits<br>
          <strong>Eco models</strong> = 1 credit
        </p>
      </div>

      <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 24px 0;">
        <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">What's included:</h3>
        <ul style="padding-left: 20px; margin: 0;">
          <li style="margin-bottom: 8px;">Access to all AI models (GPT-5.2, Claude Opus 4.5, Gemini 3, Grok 4.1)</li>
          <li style="margin-bottom: 8px;">MCP integration for Claude Code, Cursor, and other IDEs</li>
          <li style="margin-bottom: 8px;">Use your existing CLI subscriptions</li>
          <li style="margin-bottom: 8px;">No credit card required</li>
        </ul>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://www.polydev.ai/dashboard" style="background: #000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Start Using Polydev</a>
      </div>

      <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 24px 0;">
        <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">Need more credits?</h3>
        <p style="margin: 0;">
          Upgrade to <strong>Premium ($10/mo)</strong> for 10,000 credits/month + unlimited messages.<br>
          Credits rollover as long as you stay subscribed!
        </p>
      </div>
    `),
    text: `
Welcome to Polydev!

500 free credits are ready to use - a one-time bonus to get you started.

How Credits Work:
- Premium models (GPT-5.2, Claude Opus 4.5) = 20 credits
- Normal models = 4 credits
- Eco models = 1 credit

What's included:
- Access to all AI models (GPT-5.2, Claude Opus 4.5, Gemini 3, Grok 4.1)
- MCP integration for Claude Code, Cursor, and other IDEs
- Use your existing CLI subscriptions
- No credit card required

Start using Polydev: https://www.polydev.ai/dashboard

Need more credits?
Upgrade to Premium ($10/mo) for 10,000 credits/month + unlimited messages.
Credits rollover as long as you stay subscribed!

Questions? Check our documentation: https://www.polydev.ai/docs

Happy coding!
The Polydev Team
    `
  }),

  // Legacy template for backward compatibility (deprecated)
  creditPurchase: (userEmail: string, creditAmount: number, packageName: string, amountPaid: number): EmailTemplate => ({
    subject: 'Credits Added to Your Polydev Account',
    html: emailWrapper(`
      <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 8px 0;">Credits Added!</h1>

      <div style="background: #f9f9f9; padding: 24px; border-radius: 8px; margin-bottom: 24px; text-align: center;">
        <p style="font-size: 36px; font-weight: 700; margin: 0;">${formatCredits(creditAmount)}</p>
        <p style="color: #666; margin: 8px 0 0 0;">credits added to your account</p>
      </div>

      <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 24px 0;">
        <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">Purchase Details</h3>
        <p style="margin: 5px 0;"><strong>Credits Added:</strong> ${formatCredits(creditAmount)}</p>
        <p style="margin: 5px 0;"><strong>Package:</strong> ${packageName}</p>
        <p style="margin: 5px 0;"><strong>Amount Paid:</strong> $${amountPaid.toFixed(2)}</p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://www.polydev.ai/dashboard" style="background: #000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Use Your Credits</a>
      </div>
    `),
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
    html: emailWrapper(`
      <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 8px 0;">You Earned Credits!</h1>
      <p style="margin: 0 0 24px 0; color: #666;">Someone joined using your referral code</p>

      <div style="background: #f9f9f9; padding: 24px; border-radius: 8px; margin-bottom: 24px; text-align: center;">
        <p style="font-size: 48px; font-weight: 700; margin: 0;">+${creditsEarned}</p>
        <p style="color: #666; margin: 8px 0 0 0;">credits added to your account</p>
      </div>

      <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 24px 0;">
        <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">Your Referral Stats</h3>
        <p style="margin: 5px 0;"><strong>Total successful referrals:</strong> ${totalReferrals}</p>
        <p style="margin: 5px 0;"><strong>Credits earned this referral:</strong> ${creditsEarned}</p>
      </div>

      <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 24px 0;">
        <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">Keep sharing!</h3>
        <p style="margin: 0;">
          Every friend you refer earns you <strong>500 credits</strong>.<br>
          Share your referral link to keep growing your credits!
        </p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://www.polydev.ai/dashboard/referrals" style="background: #000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">View Referrals</a>
      </div>

      <p style="margin: 24px 0 0 0; text-align: center; color: #666; font-size: 14px;">Thank you for spreading the word about Polydev!</p>
    `),
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
    html: emailWrapper(`
      <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 8px 0;">Welcome to Polydev!</h1>
      <p style="margin: 0 0 24px 0; color: #666;">You've received ${creditsReceived} bonus credits</p>

      <div style="background: #f9f9f9; padding: 24px; border-radius: 8px; margin-bottom: 24px; text-align: center;">
        <p style="font-size: 48px; font-weight: 700; margin: 0;">${creditsReceived}</p>
        <p style="color: #666; margin: 8px 0 0 0;">bonus credits added to your account</p>
        ${referrerName ? `<p style="color: #666; margin-top: 10px; font-size: 14px;">Thanks to your friend for sharing Polydev!</p>` : ''}
      </div>

      <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 24px 0;">
        <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">How to Use Your Credits</h3>
        <p style="margin: 0;">
          <strong>Premium models</strong> (GPT-5.2, Claude Opus 4.5) = 20 credits<br>
          <strong>Normal models</strong> = 4 credits<br>
          <strong>Eco models</strong> = 1 credit
        </p>
      </div>

      <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 24px 0;">
        <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">What you get with Polydev:</h3>
        <ul style="padding-left: 20px; margin: 0;">
          <li style="margin-bottom: 8px;">Access to all AI models (GPT-5.2, Claude Opus 4.5, Gemini 3, Grok 4.1)</li>
          <li style="margin-bottom: 8px;">MCP integration for Claude Code, Cursor, and other IDEs</li>
          <li style="margin-bottom: 8px;">Web interface, CLI, and API access</li>
          <li style="margin-bottom: 8px;">Use your existing CLI subscriptions</li>
        </ul>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://www.polydev.ai/dashboard" style="background: #000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Start Using Polydev</a>
      </div>

      <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 24px 0;">
        <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">Earn more credits!</h3>
        <p style="margin: 0;">
          Share your own referral code and earn <strong>500 credits</strong> for each friend who joins!
        </p>
      </div>

      <p style="margin: 24px 0 0 0; text-align: center; color: #666; font-size: 14px;">Questions? Check our <a href="https://www.polydev.ai/docs" style="color: #000;">documentation</a> or reply to this email</p>
    `),
    text: `
Welcome to Polydev!

You've received ${creditsReceived} bonus credits${referrerName ? ` thanks to your friend ${referrerName}` : ''}.

Your Welcome Bonus: ${creditsReceived} bonus credits added to your account

How to Use Your Credits:
- Premium models (GPT-5.2, Claude Opus 4.5) = 20 credits
- Normal models = 4 credits
- Eco models = 1 credit

What you get with Polydev:
- Access to all AI models (GPT-5.2, Claude Opus 4.5, Gemini 3, Grok 4.1)
- MCP integration for Claude Code, Cursor, and other IDEs
- Web interface, CLI, and API access
- Use your existing CLI subscriptions

Start using Polydev: https://www.polydev.ai/dashboard

Earn more credits!
Share your own referral code and earn 500 credits for each friend who joins!

Questions? Check our documentation: https://www.polydev.ai/docs

Happy coding!
The Polydev Team
    `
  })
}
