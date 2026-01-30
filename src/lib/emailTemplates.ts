export interface EmailTemplate {
  subject: string
  html: string
  text: string
}

// Helper to format credits with commas
const formatCredits = (credits: number): string => credits.toLocaleString()

// Professional email wrapper with clean design - enhanced for better visual impact
const emailWrapper = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @media only screen and (max-width: 600px) {
      .container { padding: 32px 20px !important; }
      .button { padding: 16px 28px !important; }
      .feature-grid { display: block !important; }
      .feature-item { display: block !important; width: 100% !important; margin-bottom: 16px !important; }
    }
  </style>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; line-height: 1.7; color: #1a1a1a; background: #f5f5f7; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: #fff; border-radius: 16px; padding: 48px 44px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);" class="container">
      <div style="text-align: center; margin-bottom: 36px;">
        <img src="https://www.polydev.ai/logo.png" alt="Polydev" width="48" height="48" style="display: inline-block; margin-bottom: 8px;">
        <p style="margin: 0; font-size: 14px; font-weight: 600; color: #000; letter-spacing: 0.5px;">POLYDEV</p>
      </div>
      ${content}
    </div>
    <div style="text-align: center; padding: 28px 20px;">
      <p style="color: #6b7280; font-size: 13px; margin: 0 0 12px 0;">
        <a href="https://polydev.ai" style="color: #6b7280; text-decoration: none; font-weight: 500;">Polydev</a> · Multi-model AI for developers
      </p>
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        <a href="https://polydev.ai/dashboard" style="color: #9ca3af; text-decoration: none;">Dashboard</a> · 
        <a href="https://polydev.ai/docs" style="color: #9ca3af; text-decoration: none;">Documentation</a> · 
        <a href="https://polydev.ai/docs/mcp-integration" style="color: #9ca3af; text-decoration: none;">Setup Guide</a> · 
        <a href="mailto:support@polydev.ai" style="color: #9ca3af; text-decoration: none;">Support</a>
      </p>
    </div>
  </div>
</body>
</html>
`

// Feature box component for visual hierarchy
const featureBox = (icon: string, title: string, description: string) => `
  <div style="background: #f9fafb; border-radius: 10px; padding: 20px; margin-bottom: 12px;">
    <p style="margin: 0 0 6px 0; font-size: 15px; font-weight: 600; color: #000;">
      <span style="margin-right: 8px;">${icon}</span>${title}
    </p>
    <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.5;">${description}</p>
  </div>
`

// Highlight stat box
const statBox = (value: string, label: string, bgColor: string = '#f9fafb', textColor: string = '#000') => `
  <div style="background: ${bgColor}; border-radius: 12px; padding: 28px 24px; text-align: center;">
    <p style="font-size: 48px; font-weight: 700; color: ${textColor}; margin: 0; letter-spacing: -2px; line-height: 1;">${value}</p>
    <p style="font-size: 14px; color: ${textColor === '#000' ? '#6b7280' : textColor}; margin: 8px 0 0 0; opacity: 0.9;">${label}</p>
  </div>
`

// Plan details for emails
const PLAN_DETAILS: Record<string, { credits: string; price: string }> = {
  premium: { credits: '10,000', price: '$10' },
  plus: { credits: '20,000', price: '$25' },
  pro: { credits: '50,000', price: '$50' }
}

// Available models for display
const AVAILABLE_MODELS = ['GLM-4.7', 'Gemini 3 Flash', 'Grok 4.1 Fast Reasoning', 'GPT-5 Mini']

export const emailTemplates = {
  subscriptionCreated: (userEmail: string, planName: string): EmailTemplate => {
    const planKey = planName.toLowerCase()
    const planInfo = PLAN_DETAILS[planKey] || { credits: '10,000', price: '$10' }
    const modelsText = AVAILABLE_MODELS.join(', ')

    return {
      subject: `🚀 You're in! ${planInfo.credits} credits + unlimited messages activated`,
      html: emailWrapper(`
        <h1 style="font-size: 32px; font-weight: 700; color: #000; margin: 0 0 12px 0; letter-spacing: -1px; text-align: center;">Welcome to Polydev ${planName}</h1>
        
        <p style="font-size: 17px; color: #4b5563; margin: 0 0 32px 0; text-align: center; line-height: 1.6;">Your subscription is now active. Query multiple AI models simultaneously and get diverse perspectives on every problem.</p>
        
        ${statBox(planInfo.credits, 'credits loaded • refreshes monthly', '#000', '#fff')}

        <div style="margin: 32px 0;">
          <p style="font-size: 13px; font-weight: 600; color: #9ca3af; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 1px;">WHAT'S INCLUDED</p>
          
          ${featureBox('∞', 'Unlimited Messages', 'No limits on API requests. Send as many queries as you need.')}
          ${featureBox('↻', 'Credit Rollover', 'Unused credits roll over to next month while subscribed.')}
          ${featureBox('🔗', 'CLI Integration', 'Connect your Claude Code, Codex CLI, or Gemini CLI subscriptions—these don\'t use your Polydev credits.')}
          ${featureBox('⚡', 'All 4 Models', `${modelsText}—each costs just 1 credit.`)}
        </div>

        <div style="background: #f0fdf4; border-radius: 10px; padding: 20px; margin: 24px 0; border-left: 4px solid #22c55e;">
          <p style="margin: 0; font-size: 14px; color: #166534;"><strong>💡 Pro tip:</strong> Bring your own API keys (BYOK) to use external models without consuming credits. Connect them in Settings → API Keys.</p>
        </div>

        <div style="text-align: center; margin: 36px 0;">
          <a href="https://polydev.ai/dashboard" style="background: #000; color: #fff; padding: 16px 40px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; display: inline-block;" class="button">Open Dashboard →</a>
        </div>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 24px; margin-top: 32px;">
          <p style="font-size: 15px; font-weight: 600; color: #000; margin: 0 0 12px 0;">Quick Start Guide</p>
          <ol style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 14px; line-height: 1.8;">
            <li>Visit the <a href="https://polydev.ai/dashboard" style="color: #000; font-weight: 500;">Dashboard</a> to start chatting</li>
            <li>Install MCP in your IDE: <a href="https://polydev.ai/docs/mcp-integration" style="color: #000; font-weight: 500;">Setup Guide</a></li>
            <li>Connect your CLI subscriptions in Settings (optional)</li>
          </ol>
        </div>

        <p style="font-size: 14px; color: #6b7280; margin: 28px 0 0 0; text-align: center;">Questions? Just reply to this email—we read every message.</p>
      `),
      text: `Welcome to Polydev ${planName}!

Your subscription is now active. You have ${planInfo.credits} credits loaded and ready to use.

WHAT'S INCLUDED
───────────────
• Unlimited messages - No limits on API requests
• Credit rollover - Unused credits roll over while subscribed  
• CLI integration - Connect Claude Code, Codex, Gemini (don't use credits)
• All 4 models - ${AVAILABLE_MODELS.join(', ')}—1 credit each

PRO TIP: Bring your own API keys (BYOK) to use external models without consuming credits.

QUICK START
───────────
1. Visit the Dashboard: https://polydev.ai/dashboard
2. Install MCP in your IDE: https://polydev.ai/docs/mcp-integration
3. Connect CLI subscriptions in Settings (optional)

Questions? Reply to this email.

— The Polydev Team`
    }
  },

  subscriptionCancelled: (userEmail: string, planName: string, periodEnd: string): EmailTemplate => {
    const endDate = new Date(periodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

    return {
      subject: `Your Polydev access continues until ${endDate}`,
      html: emailWrapper(`
        <h1 style="font-size: 32px; font-weight: 700; color: #000; margin: 0 0 12px 0; letter-spacing: -1px; text-align: center;">We're sorry to see you go</h1>
        
        <p style="font-size: 17px; color: #4b5563; margin: 0 0 32px 0; text-align: center; line-height: 1.6;">Your ${planName} subscription has been cancelled, but you'll continue to have full access until your billing period ends.</p>

        <div style="background: #fef3c7; border-radius: 12px; padding: 28px; margin: 24px 0; text-align: center; border: 1px solid #fcd34d;">
          <p style="font-size: 14px; color: #92400e; margin: 0 0 4px 0; font-weight: 500;">ACCESS ENDS</p>
          <p style="font-size: 28px; font-weight: 700; color: #92400e; margin: 0; letter-spacing: -1px;">${endDate}</p>
        </div>

        <div style="margin: 32px 0;">
          <p style="font-size: 13px; font-weight: 600; color: #9ca3af; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 1px;">BEFORE YOU GO</p>
          
          ${featureBox('💳', 'Use Your Remaining Credits', `Make the most of your credits before ${endDate}. They won't roll over after cancellation.`)}
          ${featureBox('📁', 'Your Data is Safe', 'Your conversation history and settings are preserved. Resubscribe anytime to restore full access.')}
          ${featureBox('🎁', 'Free Tier Available', 'After cancellation, you\'ll still have access to 500 one-time credits on our free plan.')}
        </div>

        <div style="background: #f9fafb; border-radius: 10px; padding: 20px; margin: 24px 0;">
          <p style="margin: 0; font-size: 14px; color: #374151;"><strong>Changed your mind?</strong> You can reactivate your subscription anytime before ${endDate} and keep all your remaining credits.</p>
        </div>

        <div style="text-align: center; margin: 36px 0;">
          <a href="https://polydev.ai/dashboard/subscription" style="background: #000; color: #fff; padding: 16px 40px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; display: inline-block;" class="button">Reactivate Subscription</a>
        </div>

        <p style="font-size: 14px; color: #6b7280; margin: 28px 0 0 0; text-align: center;">We'd genuinely love to hear your feedback—just reply to this email and let us know how we can improve.</p>
      `),
      text: `We're sorry to see you go

Your ${planName} subscription has been cancelled. You'll continue to have full access until ${endDate}.

BEFORE YOU GO
─────────────
• Use your remaining credits before ${endDate}
• Your data is safe—resubscribe anytime to restore access
• After cancellation, you keep 500 free credits

Changed your mind? Reactivate here: https://polydev.ai/dashboard/subscription

We'd love to hear your feedback—just reply to this email.

— The Polydev Team`
    }
  },

  paymentFailed: (userEmail: string, amount: string, retryDate: string): EmailTemplate => {
    const retry = new Date(retryDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

    return {
      subject: `⚠️ Action needed: Update your payment method`,
      html: emailWrapper(`
        <h1 style="font-size: 32px; font-weight: 700; color: #000; margin: 0 0 12px 0; letter-spacing: -1px; text-align: center;">Payment unsuccessful</h1>
        
        <p style="font-size: 17px; color: #4b5563; margin: 0 0 32px 0; text-align: center; line-height: 1.6;">We couldn't process your payment of <strong>${amount}</strong>. Your access continues while we retry—update your payment method to avoid any interruption.</p>

        <div style="background: #fef2f2; border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #ef4444;">
          <p style="font-size: 14px; color: #991b1b; margin: 0 0 8px 0; font-weight: 600;">⏰ Next automatic retry</p>
          <p style="font-size: 24px; font-weight: 700; color: #991b1b; margin: 0;">${retry}</p>
        </div>

        <div style="margin: 32px 0;">
          <p style="font-size: 13px; font-weight: 600; color: #9ca3af; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 1px;">COMMON FIXES</p>
          
          ${featureBox('💳', 'Update Card Details', 'Your card may have expired. Add a new payment method in your subscription settings.')}
          ${featureBox('💰', 'Check Available Funds', 'Ensure your account has sufficient funds for the ${amount} charge.')}
          ${featureBox('🏦', 'Contact Your Bank', 'Some banks block recurring payments by default. A quick call can resolve this.')}
        </div>

        <div style="text-align: center; margin: 36px 0;">
          <a href="https://polydev.ai/dashboard/subscription" style="background: #000; color: #fff; padding: 16px 40px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; display: inline-block;" class="button">Update Payment Method</a>
        </div>

        <p style="font-size: 14px; color: #6b7280; margin: 28px 0 0 0; text-align: center;">Questions? Reply to this email or contact <a href="mailto:support@polydev.ai" style="color: #000;">support@polydev.ai</a></p>
      `),
      text: `Payment unsuccessful

We couldn't process your payment of ${amount}. Your access continues while we retry.

NEXT RETRY: ${retry}

COMMON FIXES
────────────
• Update card details - Your card may have expired
• Check available funds - Ensure sufficient balance
• Contact your bank - They may have blocked the charge

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
      subject: `✅ +${planInfo.credits} credits added to your account`,
      html: emailWrapper(`
        <h1 style="font-size: 32px; font-weight: 700; color: #000; margin: 0 0 12px 0; letter-spacing: -1px; text-align: center;">You're all set for another month</h1>
        
        <p style="font-size: 17px; color: #4b5563; margin: 0 0 32px 0; text-align: center; line-height: 1.6;">Your ${planName} subscription has renewed and fresh credits have been added to your balance.</p>
        
        ${statBox(`+${planInfo.credits}`, 'credits added', '#f0fdf4', '#166534')}

        <div style="background: #f9fafb; border-radius: 10px; padding: 20px; margin: 24px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Rollover credits</td>
              <td style="padding: 10px 0; text-align: right; color: #166534; font-weight: 600;">Included ✓</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb;">Next renewal</td>
              <td style="padding: 10px 0; text-align: right; color: #374151; border-top: 1px solid #e5e7eb;">${nextDate}</td>
            </tr>
          </table>
        </div>

        <div style="background: #f0f9ff; border-radius: 10px; padding: 20px; margin: 24px 0; border-left: 4px solid #3b82f6;">
          <p style="margin: 0; font-size: 14px; color: #1e40af;"><strong>Reminder:</strong> Your credits are for Polydev's models (${AVAILABLE_MODELS.join(', ')}). CLI subscriptions and BYOK models don't consume credits.</p>
        </div>

        <div style="text-align: center; margin: 36px 0;">
          <a href="https://polydev.ai/dashboard" style="background: #000; color: #fff; padding: 16px 40px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; display: inline-block;" class="button">View Your Balance</a>
        </div>
      `),
      text: `You're all set for another month

Your ${planName} subscription has renewed. +${planInfo.credits} credits have been added to your account.

DETAILS
───────
• Rollover credits: Included ✓
• Next renewal: ${nextDate}

Reminder: Credits are for Polydev's models (${AVAILABLE_MODELS.join(', ')}). CLI subscriptions and BYOK don't consume credits.

View your balance: https://polydev.ai/dashboard

— The Polydev Team`
    }
  },

  paymentSucceeded: (userEmail: string, amount: string, periodEnd: string): EmailTemplate => {
    const nextDate = new Date(periodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

    return {
      subject: `Receipt: ${amount} payment confirmed`,
      html: emailWrapper(`
        <h1 style="font-size: 32px; font-weight: 700; color: #000; margin: 0 0 12px 0; letter-spacing: -1px; text-align: center;">Payment received</h1>
        
        <p style="font-size: 17px; color: #4b5563; margin: 0 0 32px 0; text-align: center; line-height: 1.6;">Thanks for your payment. Here's your receipt for your records.</p>

        <div style="background: #f9fafb; border-radius: 12px; padding: 28px; margin: 24px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">Amount paid</td>
              <td style="padding: 12px 0; text-align: right; font-weight: 700; font-size: 20px; color: #000;">${amount}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb;">Payment date</td>
              <td style="padding: 12px 0; text-align: right; color: #374151; border-top: 1px solid #e5e7eb;">${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb;">Next billing date</td>
              <td style="padding: 12px 0; text-align: right; color: #374151; border-top: 1px solid #e5e7eb;">${nextDate}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 36px 0;">
          <a href="https://polydev.ai/dashboard/subscription" style="background: #000; color: #fff; padding: 16px 40px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; display: inline-block;" class="button">View Billing History</a>
        </div>

        <p style="font-size: 13px; color: #9ca3af; margin: 24px 0 0 0; text-align: center;">This receipt was sent to ${userEmail}</p>
      `),
      text: `Payment received

Thanks for your payment of ${amount}.

RECEIPT
───────
Amount paid: ${amount}
Payment date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
Next billing date: ${nextDate}

View billing history: https://polydev.ai/dashboard/subscription

— The Polydev Team`
    }
  },

  welcomeFreeCredits: (userEmail: string): EmailTemplate => ({
    subject: `🎉 Welcome to Polydev — 500 credits to explore multi-model AI`,
    html: emailWrapper(`
      <h1 style="font-size: 32px; font-weight: 700; color: #000; margin: 0 0 12px 0; letter-spacing: -1px; text-align: center;">Welcome to Polydev</h1>
      
      <p style="font-size: 17px; color: #4b5563; margin: 0 0 12px 0; text-align: center; line-height: 1.6;">Query multiple AI models simultaneously and get diverse perspectives on every coding problem.</p>
      
      <p style="font-size: 15px; color: #6b7280; margin: 0 0 32px 0; text-align: center; font-style: italic;">"What one AI misses, another catches."</p>
      
      ${statBox('500', 'free credits to start', '#000', '#fff')}

      <div style="margin: 36px 0;">
        <p style="font-size: 13px; font-weight: 600; color: #9ca3af; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 1px;">AVAILABLE MODELS (1 CREDIT EACH)</p>
        
        <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px;" class="feature-grid">
          ${AVAILABLE_MODELS.map(model => `
            <span style="background: #f3f4f6; padding: 8px 14px; border-radius: 6px; font-size: 13px; color: #374151; font-weight: 500;">${model}</span>
          `).join('')}
        </div>
      </div>

      <div style="margin: 32px 0;">
        <p style="font-size: 13px; font-weight: 600; color: #9ca3af; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 1px;">THREE WAYS TO USE POLYDEV</p>
        
        ${featureBox('🌐', 'Web Interface', 'Start chatting immediately at polydev.ai. No setup required.')}
        ${featureBox('🔌', 'MCP Integration', 'Use Polydev in Claude Code, Cursor, Cline, Windsurf, or Continue. One-line setup.')}
        ${featureBox('🔗', 'Connect Your CLI Tools', 'Link your Claude Code, Codex CLI, or Gemini CLI subscriptions. These don\'t consume your Polydev credits.')}
      </div>

      <div style="background: #f0fdf4; border-radius: 10px; padding: 20px; margin: 24px 0; border-left: 4px solid #22c55e;">
        <p style="margin: 0; font-size: 14px; color: #166534;"><strong>💡 Credit-free options</strong></p>
        <p style="margin: 0; font-size: 14px; color: #166534;">Bring your own API keys (BYOK) or connect your existing CLI subscriptions to use models without consuming Polydev credits.</p>
      </div>

      <div style="text-align: center; margin: 36px 0;">
        <a href="https://polydev.ai/dashboard" style="background: #000; color: #fff; padding: 16px 40px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; display: inline-block;" class="button">Start Building →</a>
      </div>

      <div style="border-top: 1px solid #e5e7eb; padding-top: 24px; margin-top: 32px;">
        <p style="font-size: 15px; font-weight: 600; color: #000; margin: 0 0 12px 0;">Quick Setup (2 minutes)</p>
        <ol style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 14px; line-height: 1.8;">
          <li>Copy your MCP config from <a href="https://polydev.ai/docs/mcp-integration" style="color: #000; font-weight: 500;">the setup guide</a></li>
          <li>Add it to your IDE's MCP settings</li>
          <li>Start querying multiple models with <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 13px;">polydev.query("your question")</code></li>
        </ol>
      </div>

      <div style="background: #f9fafb; border-radius: 10px; padding: 20px; margin: 28px 0;">
        <p style="margin: 0; font-size: 14px; color: #374151;"><strong>Need more?</strong> Upgrade to Premium for 10,000 credits/month + unlimited messages at just $10/mo. <a href="https://polydev.ai/dashboard/subscription" style="color: #000; font-weight: 500;">Upgrade →</a></p>
      </div>

      <p style="font-size: 14px; color: #6b7280; margin: 0; text-align: center;">Questions? Just reply to this email—we're here to help.</p>
    `),
    text: `Welcome to Polydev

Query multiple AI models simultaneously and get diverse perspectives on every coding problem.

"What one AI misses, another catches."

You have 500 free credits to start.

AVAILABLE MODELS (1 CREDIT EACH)
────────────────────────────────
${AVAILABLE_MODELS.join(' • ')}

THREE WAYS TO USE POLYDEV
─────────────────────────
1. Web Interface — Chat at polydev.ai
2. MCP Integration — Works with Claude Code, Cursor, Cline, Windsurf, Continue
3. Connect CLI Tools — Link Claude Code, Codex, Gemini (don't use credits)

CREDIT-FREE OPTIONS
───────────────────
• Bring your own API keys (BYOK)
• Connect existing CLI subscriptions

QUICK SETUP
───────────
1. Copy MCP config from: https://polydev.ai/docs/mcp-integration
2. Add to your IDE's MCP settings
3. Start querying with polydev.query("your question")

Need more? Upgrade to Premium: $10/mo for 10,000 credits + unlimited messages.

Questions? Reply to this email.

— The Polydev Team`
  }),

  // Legacy template for backward compatibility
  creditPurchase: (userEmail: string, creditAmount: number, packageName: string, amountPaid: number): EmailTemplate => ({
    subject: `✅ +${formatCredits(creditAmount)} credits added to your account`,
    html: emailWrapper(`
      <h1 style="font-size: 32px; font-weight: 700; color: #000; margin: 0 0 12px 0; letter-spacing: -1px; text-align: center;">Credits added successfully</h1>
      
      <p style="font-size: 17px; color: #4b5563; margin: 0 0 32px 0; text-align: center; line-height: 1.6;">Your purchase is complete. Here's your receipt.</p>

      ${statBox(`+${formatCredits(creditAmount)}`, 'credits added', '#f0fdf4', '#166534')}

      <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin: 28px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Package</td>
            <td style="padding: 10px 0; text-align: right; color: #374151; font-weight: 500;">${packageName}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb;">Amount paid</td>
            <td style="padding: 10px 0; text-align: right; font-weight: 700; font-size: 18px; color: #000; border-top: 1px solid #e5e7eb;">$${amountPaid.toFixed(2)}</td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; margin: 36px 0;">
        <a href="https://polydev.ai/dashboard" style="background: #000; color: #fff; padding: 16px 40px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; display: inline-block;" class="button">Use Your Credits</a>
      </div>
    `),
    text: `Credits added successfully

+${formatCredits(creditAmount)} credits have been added to your account.

RECEIPT
───────
Package: ${packageName}
Amount paid: $${amountPaid.toFixed(2)}

Use your credits: https://polydev.ai/dashboard

— The Polydev Team`
  }),

  // Referral email templates
  referralSuccess: (referrerEmail: string, newUserName: string, creditsEarned: number, totalReferrals: number): EmailTemplate => ({
    subject: `🎁 You earned ${creditsEarned} credits — someone joined with your link!`,
    html: emailWrapper(`
      <h1 style="font-size: 32px; font-weight: 700; color: #000; margin: 0 0 12px 0; letter-spacing: -1px; text-align: center;">Nice! You earned credits</h1>
      
      <p style="font-size: 17px; color: #4b5563; margin: 0 0 32px 0; text-align: center; line-height: 1.6;">A friend just signed up using your referral link. Bonus credits have been added to your account.</p>
      
      ${statBox(`+${creditsEarned}`, 'credits earned', '#f0fdf4', '#166534')}

      <div style="background: #f9fafb; border-radius: 10px; padding: 20px; margin: 28px 0; text-align: center;">
        <p style="font-size: 14px; color: #6b7280; margin: 0 0 4px 0;">Total successful referrals</p>
        <p style="font-size: 28px; font-weight: 700; color: #000; margin: 0;">${totalReferrals}</p>
      </div>

      <div style="background: #f0f9ff; border-radius: 10px; padding: 20px; margin: 24px 0; border-left: 4px solid #3b82f6;">
        <p style="margin: 0; font-size: 14px; color: #1e40af;"><strong>Keep sharing!</strong> You earn ${creditsEarned} credits for every friend who joins Polydev with your link.</p>
      </div>

      <div style="text-align: center; margin: 36px 0;">
        <a href="https://polydev.ai/dashboard/referrals" style="background: #000; color: #fff; padding: 16px 40px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; display: inline-block;" class="button">View Referral Dashboard</a>
      </div>
    `),
    text: `Nice! You earned credits

A friend signed up using your referral link, and you've earned +${creditsEarned} bonus credits.

Total successful referrals: ${totalReferrals}

Keep sharing! You earn ${creditsEarned} credits for every friend who joins.

View your referrals: https://polydev.ai/dashboard/referrals

— The Polydev Team`
  }),

  referralWelcome: (newUserEmail: string, creditsReceived: number, referrerName?: string): EmailTemplate => ({
    subject: `🎉 ${creditsReceived} bonus credits added — welcome to Polydev!`,
    html: emailWrapper(`
      <h1 style="font-size: 32px; font-weight: 700; color: #000; margin: 0 0 12px 0; letter-spacing: -1px; text-align: center;">Welcome to Polydev</h1>
      
      <p style="font-size: 17px; color: #4b5563; margin: 0 0 12px 0; text-align: center; line-height: 1.6;">${referrerName ? `Your friend ${referrerName} referred you, so you're ` : 'You\'re '}starting with extra credits!</p>
      
      <p style="font-size: 15px; color: #6b7280; margin: 0 0 32px 0; text-align: center; font-style: italic;">"What one AI misses, another catches."</p>
      
      ${statBox(creditsReceived.toString(), 'bonus credits to start', '#f0fdf4', '#166534')}

      <div style="margin: 36px 0;">
        <p style="font-size: 13px; font-weight: 600; color: #9ca3af; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 1px;">AVAILABLE MODELS (1 CREDIT EACH)</p>
        
        <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px;" class="feature-grid">
          ${AVAILABLE_MODELS.map(model => `
            <span style="background: #f3f4f6; padding: 8px 14px; border-radius: 6px; font-size: 13px; color: #374151; font-weight: 500;">${model}</span>
          `).join('')}
        </div>
      </div>

      <div style="margin: 32px 0;">
        <p style="font-size: 13px; font-weight: 600; color: #9ca3af; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 1px;">THREE WAYS TO USE POLYDEV</p>
        
        ${featureBox('🌐', 'Web Interface', 'Start chatting immediately at polydev.ai. No setup required.')}
        ${featureBox('🔌', 'MCP Integration', 'Use Polydev in Claude Code, Cursor, Cline, Windsurf, or Continue.')}
        ${featureBox('🔗', 'Connect Your CLI Tools', 'Link your Claude Code, Codex CLI, or Gemini CLI subscriptions—these don\'t consume credits.')}
      </div>

      <div style="text-align: center; margin: 36px 0;">
        <a href="https://polydev.ai/dashboard" style="background: #000; color: #fff; padding: 16px 40px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; display: inline-block;" class="button">Start Building →</a>
      </div>

      <div style="background: #f0fdf4; border-radius: 10px; padding: 20px; margin: 24px 0; border-left: 4px solid #22c55e;">
        <p style="margin: 0; font-size: 14px; color: #166534;"><strong>Earn more credits:</strong> Share your own referral link and get ${creditsReceived} credits for each friend who joins.</p>
      </div>
    `),
    text: `Welcome to Polydev

${referrerName ? `Your friend ${referrerName} referred you, so you're ` : 'You\'re '}starting with ${creditsReceived} bonus credits!

AVAILABLE MODELS (1 CREDIT EACH)
────────────────────────────────
${AVAILABLE_MODELS.join(' • ')}

THREE WAYS TO USE POLYDEV
─────────────────────────
1. Web Interface — Chat at polydev.ai
2. MCP Integration — Works with Claude Code, Cursor, Cline, Windsurf, Continue
3. Connect CLI Tools — Link Claude Code, Codex, Gemini (don't use credits)

Get started: https://polydev.ai/dashboard

Earn more credits: Share your referral link and get ${creditsReceived} credits for each friend who joins.

— The Polydev Team`
  })
}
