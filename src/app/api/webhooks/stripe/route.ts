import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { 
  sendSubscriptionCreatedEmail, 
  sendSubscriptionCancelledEmail, 
  sendPaymentFailedEmail, 
  sendPaymentSucceededEmail,
  sendCreditPurchaseEmail
} from '@/lib/resendService'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil'
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = (await headers()).get('stripe-signature')!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (error: any) {
      console.error(`Webhook signature verification failed:`, error.message)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Log the webhook event
    await supabase
      .from('stripe_webhook_events')
      .insert({
        stripe_event_id: event.id,
        event_type: event.type,
        processed: false,
        data: event.data,
        created_at: new Date().toISOString()
      })

    console.log(`[Stripe Webhook] Processing event: ${event.type}`)

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutSessionCompleted(session, supabase)
        break
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionCreated(subscription, supabase)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionChange(subscription, supabase)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionCancellation(subscription, supabase)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentSucceeded(invoice, supabase)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(invoice, supabase)
        break
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`)
    }

    // Mark event as processed
    await supabase
      .from('stripe_webhook_events')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('stripe_event_id', event.id)

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('[Stripe Webhook] Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' }, 
      { status: 500 }
    )
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session, supabase: any) {
  try {
    console.log(`[Stripe Webhook] Processing checkout session: ${session.id}`)
    
    // Check if this is a subscription or one-time payment
    if (session.mode === 'subscription') {
      console.log(`[Stripe Webhook] Checkout session is for subscription, handled by customer.subscription.created event`)
      return
    }

    // This is a one-time payment (credit purchase)
    if (session.mode === 'payment') {
      console.log(`[Stripe Webhook] Processing credit purchase checkout session: ${session.id}`)
      
      // Get customer details
      const customer = await stripe.customers.retrieve(session.customer as string)
      if (!customer || customer.deleted) {
        console.error('[Stripe Webhook] Customer not found or deleted')
        return
      }

      const customerEmail = (customer as Stripe.Customer).email
      if (!customerEmail) {
        console.error('[Stripe Webhook] Customer email not found')
        return
      }

      // Find user by email using admin auth API
      const { data: authUsers, error: userError } = await supabase.auth.admin.listUsers()
      
      if (userError || !authUsers.users) {
        console.error('[Stripe Webhook] Error fetching users:', userError)
        return
      }

      const user = authUsers.users.find((u: any) => u.email === customerEmail)
      if (!user) {
        console.error('[Stripe Webhook] User not found for email:', customerEmail)
        return
      }

      // Parse metadata to get credit amount (handle both 'credits' and 'creditsAmount' fields)
      const creditAmount = parseFloat(session.metadata?.credits || session.metadata?.creditsAmount || '0')
      const packageName = session.metadata?.package_name || session.metadata?.packageId || 'Credit Purchase'
      
      if (creditAmount <= 0) {
        console.error('[Stripe Webhook] Invalid credit amount:', creditAmount)
        return
      }

      // Record the purchase in purchase_history
      const purchaseRecord = {
        user_id: user.id,
        stripe_session_id: session.id,
        stripe_customer_id: session.customer as string,
        amount_paid: session.amount_total || 0,
        credits_purchased: creditAmount,
        status: 'completed',
        metadata: {
          package_name: packageName,
          session_id: session.id
        },
        created_at: new Date().toISOString()
      }

      const { error: purchaseError } = await supabase
        .from('purchase_history')
        .insert(purchaseRecord)

      if (purchaseError) {
        console.error('[Stripe Webhook] Failed to record purchase:', purchaseError)
        return
      }

      // Add credits to user account
      const { error: creditError } = await supabase.rpc('add_user_credits', {
        p_user_id: user.id,
        p_amount: creditAmount
      })

      if (creditError) {
        console.error('[Stripe Webhook] Failed to add credits:', creditError)
        return
      }

      // Send credit purchase email notification
      try {
        await sendCreditPurchaseEmail(customerEmail, creditAmount, packageName, session.amount_total! / 100)
        console.log(`[Stripe Webhook] Credit purchase email sent to ${customerEmail}`)
      } catch (emailError) {
        console.error('[Stripe Webhook] Failed to send credit purchase email:', emailError)
      }

      console.log(`[Stripe Webhook] Successfully processed credit purchase: ${creditAmount} credits for user ${user.id}`)
    }

  } catch (error) {
    console.error('[Stripe Webhook] Error handling checkout session completed:', error)
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription, supabase: any) {
  try {
    console.log(`[Stripe Webhook] Processing new subscription: ${subscription.id}`)
    
    // Get customer to find user
    const customer = await stripe.customers.retrieve(subscription.customer as string)
    if (!customer || customer.deleted) {
      console.error('[Stripe Webhook] Customer not found or deleted')
      return
    }

    const customerEmail = (customer as Stripe.Customer).email
    if (!customerEmail) {
      console.error('[Stripe Webhook] Customer email not found')
      return
    }

    // Find user by email using admin auth API
    const { data: authUsers, error: userError } = await supabase.auth.admin.listUsers()
    
    if (userError || !authUsers.users) {
      console.error('[Stripe Webhook] Error fetching users:', userError)
      return
    }

    const user = authUsers.users.find((u: any) => u.email === customerEmail)
    if (!user) {
      console.error('[Stripe Webhook] User not found for email:', customerEmail)
      return
    }

    const userId = user.id

    // Create subscription record
    const subscriptionData = {
      user_id: userId,
      stripe_customer_id: subscription.customer as string,
      stripe_subscription_id: subscription.id,
      tier: 'pro' as const,
      status: subscription.status as any,
      current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
      current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from('user_subscriptions')
      .upsert(subscriptionData, { onConflict: 'user_id' })

    if (error) {
      console.error('[Stripe Webhook] Failed to create subscription:', error)
      return
    }

    // Update user message usage for Pro users
    const currentMonth = new Date().toISOString().substring(0, 7)
    await supabase
      .from('user_message_usage')
      .upsert({
        user_id: userId,
        month_year: currentMonth,
        messages_sent: 0,
        messages_limit: 999999,
        cli_usage_allowed: true
      }, { onConflict: 'user_id,month_year' })

    // Initialize credits for Pro users
    if (subscription.status === 'active') {
      await supabase
        .from('user_credits')
        .upsert({
          user_id: userId,
          balance: 5.0,
          promotional_balance: 0.0,
          monthly_allocation: 5.0,
          total_purchased: 0.0,
          total_spent: 0.0,
          last_monthly_reset: new Date().toISOString()
        }, { 
          onConflict: 'user_id',
          ignoreDuplicates: false 
        })
    }

    // Send welcome email
    try {
      await sendSubscriptionCreatedEmail(customerEmail, 'Pro')
      console.log(`[Stripe Webhook] Welcome email sent to ${customerEmail}`)
    } catch (emailError) {
      console.error('[Stripe Webhook] Failed to send welcome email:', emailError)
    }

    console.log(`[Stripe Webhook] Created subscription for user ${userId}`)

  } catch (error) {
    console.error('[Stripe Webhook] Error handling subscription creation:', error)
  }
}

async function handleSubscriptionChange(subscription: Stripe.Subscription, supabase: any) {
  try {
    // Get customer to find user
    const customer = await stripe.customers.retrieve(subscription.customer as string)
    if (!customer || customer.deleted) {
      console.error('[Stripe Webhook] Customer not found or deleted')
      return
    }

    const customerEmail = (customer as Stripe.Customer).email
    if (!customerEmail) {
      console.error('[Stripe Webhook] Customer email not found')
      return
    }

    // Find user by email using admin auth API
    const { data: authUsers, error: userError } = await supabase.auth.admin.listUsers()
    
    if (userError || !authUsers.users) {
      console.error('[Stripe Webhook] Error fetching users:', userError)
      return
    }

    const user = authUsers.users.find((u: any) => u.email === customerEmail)
    if (!user) {
      console.error('[Stripe Webhook] User not found for email:', customerEmail)
      return
    }

    const userId = user.id

    // Update subscription record  
    const subscriptionData = {
      user_id: userId,
      stripe_customer_id: subscription.customer as string,
      stripe_subscription_id: subscription.id,
      tier: 'pro' as const,
      status: subscription.status as any,
      current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
      current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from('user_subscriptions')
      .upsert(subscriptionData, { onConflict: 'user_id' })

    if (error) {
      console.error('[Stripe Webhook] Failed to update subscription:', error)
      return
    }

    // Update user message usage for Pro users
    const currentMonth = new Date().toISOString().substring(0, 7)
    await supabase
      .from('user_message_usage')
      .upsert({
        user_id: userId,
        month_year: currentMonth,
        messages_sent: 0,
        messages_limit: 999999, // Unlimited for pro users
        cli_usage_allowed: true
      }, { onConflict: 'user_id,month_year' })

    // Allocate $5 monthly credits for Pro users
    if (subscription.status === 'active') {
      await supabase
        .from('user_credits')
        .upsert({
          user_id: userId,
          balance: 5.0, // Start with $5
          promotional_balance: 0.0,
          monthly_allocation: 5.0,
          total_purchased: 0.0,
          total_spent: 0.0,
          last_monthly_reset: new Date().toISOString()
        }, { 
          onConflict: 'user_id',
          ignoreDuplicates: false 
        })
    }

    console.log(`[Stripe Webhook] Updated subscription for user ${userId}`)

  } catch (error) {
    console.error('[Stripe Webhook] Error handling subscription change:', error)
  }
}

async function handleSubscriptionCancellation(subscription: Stripe.Subscription, supabase: any) {
  try {
    // Get customer to find user
    const customer = await stripe.customers.retrieve(subscription.customer as string)
    if (!customer || customer.deleted) {
      console.error('[Stripe Webhook] Customer not found or deleted')
      return
    }

    const customerEmail = (customer as Stripe.Customer).email
    if (!customerEmail) {
      console.error('[Stripe Webhook] Customer email not found')
      return
    }

    // Update subscription status
    await supabase
      .from('user_subscriptions')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id)

    // Send cancellation email
    try {
      const periodEnd = new Date((subscription as any).current_period_end * 1000).toISOString()
      await sendSubscriptionCancelledEmail(customerEmail, 'Pro', periodEnd)
      console.log(`[Stripe Webhook] Cancellation email sent to ${customerEmail}`)
    } catch (emailError) {
      console.error('[Stripe Webhook] Failed to send cancellation email:', emailError)
    }

    console.log(`[Stripe Webhook] Canceled subscription ${subscription.id}`)

  } catch (error) {
    console.error('[Stripe Webhook] Error handling subscription cancellation:', error)
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice, supabase: any) {
  try {
    if (!(invoice as any).subscription) return

    // Get customer for email
    const customer = await stripe.customers.retrieve(invoice.customer as string)
    const customerEmail = customer && !customer.deleted ? (customer as Stripe.Customer).email : null

    // Update subscription status to active
    await supabase
      .from('user_subscriptions')
      .update({
        status: 'active',
        current_period_start: new Date((invoice as any).period_start * 1000).toISOString(),
        current_period_end: new Date((invoice as any).period_end * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', (invoice as any).subscription)

    // Allocate monthly credits if this is a subscription payment
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', (invoice as any).subscription)
      .single()

    if (subscription?.user_id) {
      // Add $5 monthly allocation
      await supabase.rpc('allocate_monthly_credits', {
        p_user_id: subscription.user_id,
        p_amount: 5.0
      })
    }

    // Send payment success email
    if (customerEmail) {
      try {
        const amount = `$${((invoice.amount_paid || 0) / 100).toFixed(2)}`
        const periodEnd = new Date((invoice as any).period_end * 1000).toISOString()
        await sendPaymentSucceededEmail(customerEmail, amount, periodEnd)
        console.log(`[Stripe Webhook] Payment success email sent to ${customerEmail}`)
      } catch (emailError) {
        console.error('[Stripe Webhook] Failed to send payment success email:', emailError)
      }
    }

    console.log(`[Stripe Webhook] Payment succeeded for subscription ${(invoice as any).subscription}`)

  } catch (error) {
    console.error('[Stripe Webhook] Error handling payment success:', error)
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice, supabase: any) {
  try {
    if (!(invoice as any).subscription) return

    // Get customer for email
    const customer = await stripe.customers.retrieve(invoice.customer as string)
    const customerEmail = customer && !customer.deleted ? (customer as Stripe.Customer).email : null

    // Update subscription status
    await supabase
      .from('user_subscriptions')
      .update({
        status: 'past_due',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', (invoice as any).subscription)

    // Send payment failed email
    if (customerEmail) {
      try {
        const amount = `$${((invoice.amount_due || 0) / 100).toFixed(2)}`
        // Calculate next retry date (typically 3-7 days later)
        const retryDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
        await sendPaymentFailedEmail(customerEmail, amount, retryDate)
        console.log(`[Stripe Webhook] Payment failed email sent to ${customerEmail}`)
      } catch (emailError) {
        console.error('[Stripe Webhook] Failed to send payment failed email:', emailError)
      }
    }

    console.log(`[Stripe Webhook] Payment failed for subscription ${(invoice as any).subscription}`)

  } catch (error) {
    console.error('[Stripe Webhook] Error handling payment failure:', error)
  }
}
