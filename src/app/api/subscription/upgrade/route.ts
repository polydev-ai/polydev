import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get or create Stripe customer
    try {
      const customer = await getOrCreateStripeCustomer(
        user.id, 
        user.email || '', 
        user.user_metadata?.full_name || user.email || ''
      )

      // Create Stripe checkout session for subscription
      const session = await stripe.checkout.sessions.create({
        customer: customer.id,
        payment_method_types: ['card'],
        line_items: [
          {
            price: 'price_1S2oYBJtMA6wwImls1Og4rZi', // Pro monthly price ID
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `https://www.polydev.ai/dashboard/subscription?success=true`,
        cancel_url: `https://www.polydev.ai/dashboard/subscription?canceled=true`,
        metadata: {
          userId: user.id,
          planKey: 'pro',
          type: 'subscription'
        }
      })

      return NextResponse.json({ 
        checkoutUrl: session.url,
        session: { id: session.id, url: session.url }
      })

    } catch (error) {
      console.error('[Subscription] Upgrade error:', error)
      return NextResponse.json({ error: 'Failed to create subscription session' }, { status: 500 })
    }

  } catch (error) {
    console.error('[Subscription] Upgrade error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function getOrCreateStripeCustomer(userId: string, email: string, name: string) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  // Check if customer already exists in our DB
  const { data: existingCustomer } = await supabase
    .from('stripe_customers')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .single()

  if (existingCustomer) {
    return { id: existingCustomer.stripe_customer_id }
  }

  // Create new customer using Stripe SDK
  const customer = await stripe.customers.create({
    name,
    email
  })
  
  // Store customer ID in our DB
  await supabase
    .from('stripe_customers')
    .insert({
      user_id: userId,
      stripe_customer_id: customer.id,
      email: email
    })

  return customer
}