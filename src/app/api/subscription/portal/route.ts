import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { subscriptionManager } from '@/lib/subscriptionManager'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's subscription to find Stripe customer ID
    const subscription = await subscriptionManager.getUserSubscription(user.id)
    
    if (!subscription?.stripe_customer_id) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    // Get the base URL from the request
    const protocol = request.headers.get('x-forwarded-proto') || 'https'
    const host = request.headers.get('host') || 'www.polydev.ai'
    const baseUrl = `${protocol}://${host}`
    const returnUrl = `${baseUrl}/dashboard/subscription`

    // Create customer portal session using Stripe SDK
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2025-08-27.basil'
      })

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: subscription.stripe_customer_id,
        return_url: returnUrl,
      })

      return NextResponse.json({ portalUrl: portalSession.url })

    } catch (stripeError: any) {
      console.error('[Subscription] Portal session error:', stripeError)
      return NextResponse.json({ 
        error: 'Failed to create portal session',
        details: stripeError.message 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('[Subscription] Portal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}