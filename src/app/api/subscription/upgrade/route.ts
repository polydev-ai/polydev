import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil'
})

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'your_stripe_secret_key') {
      return NextResponse.json({ 
        error: 'Stripe payment system is not configured. Please contact support.' 
      }, { status: 503 })
    }

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create or get Stripe customer
    let customerId: string
    
    try {
      // Check if customer already exists
      const customers = await stripe.customers.list({
        email: user.email!,
        limit: 1
      })

      if (customers.data.length > 0) {
        customerId = customers.data[0].id
      } else {
        // Create new customer
        const customer = await stripe.customers.create({
          email: user.email!,
          metadata: {
            user_id: user.id
          }
        })
        customerId = customer.id
      }
    } catch (stripeError) {
      console.error('[Subscription] Stripe customer error:', stripeError)
      return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
    }

    // Create checkout session
    try {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{
          price: 'price_1S2oYBJtMA6wwImls1Og4rZi', // Pro monthly price ID
          quantity: 1
        }],
        mode: 'subscription',
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscription?success=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscription?canceled=true`,
        metadata: {
          user_id: user.id
        }
      })

      return NextResponse.json({ checkoutUrl: session.url })

    } catch (stripeError) {
      console.error('[Subscription] Checkout session error:', stripeError)
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
    }

  } catch (error) {
    console.error('[Subscription] Upgrade error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}