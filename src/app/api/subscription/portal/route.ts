import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { subscriptionManager } from '@/lib/subscriptionManager'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia'
})

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

    // Create customer portal session
    try {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: subscription.stripe_customer_id,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscription`
      })

      return NextResponse.json({ portalUrl: portalSession.url })

    } catch (stripeError) {
      console.error('[Subscription] Portal session error:', stripeError)
      return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 })
    }

  } catch (error) {
    console.error('[Subscription] Portal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}