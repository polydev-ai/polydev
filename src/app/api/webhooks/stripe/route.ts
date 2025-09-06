import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

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
        event_id: event.id,
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

      case 'customer.subscription.created':
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
      .eq('event_id', event.id)

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
    
    // Find pending purchase
    const { data: pendingPurchase, error: findError } = await supabase
      .from('pending_purchases')
      .select('*')
      .eq('payment_link_id', session.id)
      .eq('status', 'pending')
      .single()

    if (findError || !pendingPurchase) {
      console.error('[Stripe Webhook] Pending purchase not found:', findError)
      return
    }

    // Get the line items to determine what was purchased
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 10 })
    if (!lineItems.data.length) {
      console.error('[Stripe Webhook] No line items found for session')
      return
    }

    const priceId = lineItems.data[0].price?.id
    if (!priceId) {
      console.error('[Stripe Webhook] No price ID found in line items')
      return
    }

    // Import credit package config
    const { getCreditPackageByPriceId } = await import('@/lib/stripeConfig')
    const creditPackage = getCreditPackageByPriceId(priceId)
    
    if (!creditPackage) {
      console.error('[Stripe Webhook] Credit package not found for price ID:', priceId)
      return
    }

    // Add credits to user account using RPC function
    const { error: creditsError } = await supabase.rpc('add_user_credits', {
      p_user_id: pendingPurchase.user_id,
      p_amount: creditPackage.totalCredits,
      p_transaction_type: 'purchase',
      p_description: `Purchased ${creditPackage.name} package`
    })

    if (creditsError) {
      console.error('[Stripe Webhook] Failed to add credits:', creditsError)
      return
    }

    // Record completed purchase
    const { error: purchaseError } = await supabase
      .from('purchase_history')
      .insert({
        user_id: pendingPurchase.user_id,
        item_type: 'credits',
        item_id: creditPackage.id,
        amount_paid: session.amount_total || 0,
        credits_purchased: creditPackage.totalCredits,
        stripe_session_id: session.id,
        status: 'completed',
        metadata: {
          package_name: creditPackage.name,
          base_credits: creditPackage.credits,
          bonus_credits: creditPackage.bonusCredits
        }
      })

    if (purchaseError) {
      console.error('[Stripe Webhook] Failed to record purchase:', purchaseError)
    }

    // Update pending purchase status
    const { error: updateError } = await supabase
      .from('pending_purchases')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', pendingPurchase.id)

    if (updateError) {
      console.error('[Stripe Webhook] Failed to update pending purchase:', updateError)
    }

    console.log(`[Stripe Webhook] Successfully processed credit purchase for user: ${pendingPurchase.user_id}`)

  } catch (error) {
    console.error('[Stripe Webhook] Error handling checkout session completed:', error)
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

    // Find user by email
    const { data: user, error: userError } = await supabase.auth.admin.getUserByEmail(customerEmail)
    if (userError || !user) {
      console.error('[Stripe Webhook] User not found:', userError)
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
    // Update subscription status
    await supabase
      .from('user_subscriptions')
      .update({
        status: 'canceled',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id)

    console.log(`[Stripe Webhook] Canceled subscription ${subscription.id}`)

  } catch (error) {
    console.error('[Stripe Webhook] Error handling subscription cancellation:', error)
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice, supabase: any) {
  try {
    if (!(invoice as any).subscription) return

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

    console.log(`[Stripe Webhook] Payment succeeded for subscription ${(invoice as any).subscription}`)

  } catch (error) {
    console.error('[Stripe Webhook] Error handling payment success:', error)
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice, supabase: any) {
  try {
    if (!(invoice as any).subscription) return

    // Update subscription status
    await supabase
      .from('user_subscriptions')
      .update({
        status: 'past_due',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', (invoice as any).subscription)

    console.log(`[Stripe Webhook] Payment failed for subscription ${(invoice as any).subscription}`)

  } catch (error) {
    console.error('[Stripe Webhook] Error handling payment failure:', error)
  }
}
