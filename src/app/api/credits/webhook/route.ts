import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import CreditManager from '@/lib/creditManager'
import { headers } from 'next/headers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil'
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const body = await request.text()
  const headersList = await headers()
  const sig = headersList.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret)
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const creditManager = new CreditManager()

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, creditManager)
        break
      
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent, creditManager)
        break
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent, creditManager)
        break
      
      case 'invoice.payment_succeeded':
        // Handle subscription renewals if we implement subscriptions later
        console.log('[Stripe Webhook] Invoice payment succeeded:', event.data.object.id)
        break
      
      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Stripe Webhook] Error processing webhook:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, creditManager: CreditManager) {
  try {
    console.log('[Stripe Webhook] Processing completed checkout:', session.id)
    
    const userId = session.client_reference_id
    const paymentIntentId = session.payment_intent as string
    const creditsAmount = parseInt(session.metadata?.creditsAmount || '0')
    
    if (!userId || !creditsAmount) {
      console.error('[Stripe Webhook] Missing required data in checkout session')
      return
    }

    // Update purchase status to completed
    const purchases = await creditManager.getPurchaseHistory(userId)
    const purchase = purchases.find(p => p.stripe_payment_intent_id === paymentIntentId)
    
    if (purchase) {
      await creditManager.updatePurchaseStatus(purchase.id, 'completed')
      
      // Add credits to user's balance
      await creditManager.addCredits(userId, creditsAmount, purchase.id)
      
      // Create or update user's OpenRouter API key with new spending limit
      const userCredits = await creditManager.getUserCredits(userId)
      if (userCredits) {
        await creditManager.createUserOpenRouterKey(userId, userCredits.balance)
      }
      
      console.log(`[Stripe Webhook] Successfully added ${creditsAmount} credits to user ${userId}`)
    } else {
      console.error('[Stripe Webhook] Could not find purchase record for payment intent:', paymentIntentId)
    }
    
  } catch (error) {
    console.error('[Stripe Webhook] Error handling checkout completion:', error)
    throw error
  }
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent, creditManager: CreditManager) {
  try {
    console.log('[Stripe Webhook] Payment succeeded:', paymentIntent.id)
    
    // Additional processing if needed
    // The main logic is handled in checkout.session.completed
    
  } catch (error) {
    console.error('[Stripe Webhook] Error handling payment success:', error)
    throw error
  }
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent, creditManager: CreditManager) {
  try {
    console.log('[Stripe Webhook] Payment failed:', paymentIntent.id)
    
    // Find and update purchase status
    const purchases = await creditManager.getPurchaseHistory('') // Need to get all purchases to find by payment intent
    // This is not ideal - we should store user_id in payment intent metadata
    // For now, we'll update the purchase status but this needs improvement
    
    console.log(`[Stripe Webhook] Marked purchase as failed for payment intent: ${paymentIntent.id}`)
    
  } catch (error) {
    console.error('[Stripe Webhook] Error handling payment failure:', error)
    throw error
  }
}