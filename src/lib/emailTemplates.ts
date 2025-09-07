export interface EmailTemplate {
  subject: string
  html: string
  text: string
}

export const emailTemplates = {
  subscriptionCreated: (userEmail: string, planName: string): EmailTemplate => ({
    subject: 'Welcome to Polydev Pro! 🎉',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Polydev Pro</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 10px; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Polydev Pro! 🚀</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Your subscription is now active</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #333; margin-top: 0;">What's Next?</h2>
          <ul style="padding-left: 20px;">
            <li style="margin-bottom: 10px;">🤖 <strong>Unlimited AI conversations</strong> - Chat without message limits</li>
            <li style="margin-bottom: 10px;">💰 <strong>$5 monthly credits</strong> - Use premium AI models and tools</li>
            <li style="margin-bottom: 10px;">⚡ <strong>CLI access</strong> - Use Polydev in your terminal</li>
            <li style="margin-bottom: 10px;">🎯 <strong>Priority support</strong> - Get help when you need it</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://www.polydev.ai/dashboard" style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Go to Dashboard</a>
        </div>
        
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center; color: #666; font-size: 14px;">
          <p>Questions? Reply to this email or visit our <a href="https://www.polydev.ai/support" style="color: #007bff;">support center</a></p>
          <p style="margin-top: 20px;">
            Polydev Team<br>
            <a href="https://www.polydev.ai" style="color: #007bff;">www.polydev.ai</a>
          </p>
        </div>
      </body>
      </html>
    `,
    text: `
Welcome to Polydev Pro! 🎉

Your ${planName} subscription is now active and ready to use.

What's included:
• Unlimited AI conversations - Chat without message limits
• $5 monthly credits - Use premium AI models and tools  
• CLI access - Use Polydev in your terminal
• Priority support - Get help when you need it

Get started: https://www.polydev.ai/dashboard

Questions? Reply to this email or visit our support center: https://www.polydev.ai/support

Thanks for choosing Polydev!
The Polydev Team
    `
  }),

  subscriptionCancelled: (userEmail: string, planName: string, periodEnd: string): EmailTemplate => ({
    subject: 'Your Polydev subscription has been cancelled',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Subscription Cancelled</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f8f9fa; padding: 30px; text-align: center; border-radius: 10px; margin-bottom: 30px; border-left: 4px solid #dc3545;">
          <h1 style="color: #333; margin: 0; font-size: 24px;">Subscription Cancelled</h1>
        </div>
        
        <div style="margin-bottom: 20px;">
          <p>Hi there,</p>
          <p>We're sorry to see you go! Your ${planName} subscription has been cancelled as requested.</p>
          <p><strong>Access until:</strong> ${new Date(periodEnd).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <p>You'll continue to have full access to all Pro features until your current billing period ends.</p>
        </div>
        
        <div style="background: #e3f2fd; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="color: #1976d2; margin-top: 0;">What happens next?</h3>
          <ul style="padding-left: 20px; margin-bottom: 0;">
            <li>Your Pro features remain active until ${new Date(periodEnd).toLocaleDateString()}</li>
            <li>After that, you'll be moved to our free plan</li>
            <li>Your account and data will be preserved</li>
            <li>You can resubscribe anytime from your dashboard</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://www.polydev.ai/dashboard/billing" style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Manage Billing</a>
        </div>
        
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
          <p><strong>We'd love your feedback!</strong> If you have a moment, please let us know why you cancelled so we can improve Polydev for everyone.</p>
        </div>
        
        <div style="text-align: center; color: #666; font-size: 14px; margin-top: 20px;">
          <p>Thanks for using Polydev!</p>
          <p>
            The Polydev Team<br>
            <a href="https://www.polydev.ai" style="color: #007bff;">www.polydev.ai</a>
          </p>
        </div>
      </body>
      </html>
    `,
    text: `
Subscription Cancelled

Hi there,

We're sorry to see you go! Your ${planName} subscription has been cancelled as requested.

Access until: ${new Date(periodEnd).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

You'll continue to have full access to all Pro features until your current billing period ends.

What happens next?
• Your Pro features remain active until ${new Date(periodEnd).toLocaleDateString()}
• After that, you'll be moved to our free plan
• Your account and data will be preserved
• You can resubscribe anytime from your dashboard

Manage your billing: https://www.polydev.ai/dashboard/billing

We'd love your feedback! If you have a moment, please let us know why you cancelled so we can improve Polydev for everyone.

Thanks for using Polydev!
The Polydev Team
    `
  }),

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
        <div style="background: #fff3cd; padding: 30px; text-align: center; border-radius: 10px; margin-bottom: 30px; border-left: 4px solid #ffc107;">
          <h1 style="color: #856404; margin: 0; font-size: 24px;">⚠️ Payment Failed</h1>
          <p style="color: #856404; margin: 10px 0 0 0;">Action required for your Polydev subscription</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <p>Hi there,</p>
          <p>We weren't able to process your payment of <strong>${amount}</strong> for your Polydev Pro subscription.</p>
          <p>This can happen for various reasons like expired cards, insufficient funds, or bank restrictions.</p>
        </div>
        
        <div style="background: #f8d7da; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #dc3545;">
          <h3 style="color: #721c24; margin-top: 0;">What you need to do:</h3>
          <ol style="padding-left: 20px; margin-bottom: 0;">
            <li>Update your payment method</li>
            <li>Ensure your card has sufficient funds</li>
            <li>Contact your bank if needed</li>
          </ol>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://www.polydev.ai/dashboard/billing" style="background: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Update Payment Method</a>
        </div>
        
        <div style="background: #e3f2fd; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Next retry:</strong> ${new Date(retryDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
          <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">We'll automatically retry the payment. Your access continues until we resolve this.</p>
        </div>
        
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center; color: #666; font-size: 14px;">
          <p>Need help? Contact us at <a href="mailto:support@polydev.ai" style="color: #007bff;">support@polydev.ai</a></p>
          <p>
            The Polydev Team<br>
            <a href="https://www.polydev.ai" style="color: #007bff;">www.polydev.ai</a>
          </p>
        </div>
      </body>
      </html>
    `,
    text: `
⚠️ Payment Failed - Action Required

Hi there,

We weren't able to process your payment of ${amount} for your Polydev Pro subscription.

This can happen for various reasons like expired cards, insufficient funds, or bank restrictions.

What you need to do:
1. Update your payment method
2. Ensure your card has sufficient funds
3. Contact your bank if needed

Update your payment method: https://www.polydev.ai/dashboard/billing

Next retry: ${new Date(retryDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}

We'll automatically retry the payment. Your access continues until we resolve this.

Need help? Contact us at support@polydev.ai

The Polydev Team
    `
  }),

  paymentSucceeded: (userEmail: string, amount: string, periodEnd: string): EmailTemplate => ({
    subject: 'Payment Received - Your Polydev Pro subscription is active',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Received</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #d4edda; padding: 30px; text-align: center; border-radius: 10px; margin-bottom: 30px; border-left: 4px solid #28a745;">
          <h1 style="color: #155724; margin: 0; font-size: 24px;">✅ Payment Received</h1>
          <p style="color: #155724; margin: 10px 0 0 0;">Your Polydev Pro subscription is active</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <p>Hi there,</p>
          <p>Thank you! We've successfully processed your payment of <strong>${amount}</strong> for your Polydev Pro subscription.</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Subscription Details:</h3>
          <p style="margin: 5px 0;"><strong>Plan:</strong> Polydev Pro</p>
          <p style="margin: 5px 0;"><strong>Amount:</strong> ${amount}</p>
          <p style="margin: 5px 0;"><strong>Next billing:</strong> ${new Date(periodEnd).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        
        <div style="background: #e3f2fd; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="color: #1976d2; margin-top: 0;">Your Pro benefits:</h3>
          <ul style="padding-left: 20px; margin-bottom: 0;">
            <li>🤖 Unlimited AI conversations</li>
            <li>💰 $5 monthly credits added to your account</li>
            <li>⚡ Full CLI access</li>
            <li>🎯 Priority support</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://www.polydev.ai/dashboard" style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Go to Dashboard</a>
        </div>
        
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center; color: #666; font-size: 14px;">
          <p>View your billing history: <a href="https://www.polydev.ai/dashboard/billing" style="color: #007bff;">Manage Billing</a></p>
          <p>
            The Polydev Team<br>
            <a href="https://www.polydev.ai" style="color: #007bff;">www.polydev.ai</a>
          </p>
        </div>
      </body>
      </html>
    `,
    text: `
✅ Payment Received

Hi there,

Thank you! We've successfully processed your payment of ${amount} for your Polydev Pro subscription.

Subscription Details:
• Plan: Polydev Pro
• Amount: ${amount}
• Next billing: ${new Date(periodEnd).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

Your Pro benefits:
• 🤖 Unlimited AI conversations
• 💰 $5 monthly credits added to your account
• ⚡ Full CLI access
• 🎯 Priority support

Dashboard: https://www.polydev.ai/dashboard
Billing: https://www.polydev.ai/dashboard/billing

The Polydev Team
    `
  })
}