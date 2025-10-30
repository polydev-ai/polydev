import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get tier and interval from request body
    const body = await request.json().catch(() => ({}))
    const tier = body.tier || 'plus' // Default to plus
    const interval = body.interval || 'month' // Default to monthly

    // Fetch pricing config from database
    const adminSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: configData, error: configError } = await adminSupabase
      .from('admin_pricing_config')
      .select('*')

    if (configError || !configData) {
      console.error('[Subscription] Failed to fetch pricing config:', configError)
      return NextResponse.json({ error: 'Failed to fetch pricing configuration' }, { status: 500 })
    }

    // Build config object from key-value pairs
    const config: any = {}
    configData.forEach(item => {
      config[item.config_key] = item.config_value
    })

    // Get the correct price ID based on tier and interval
    let priceId: string
    let planKey: string

    if (tier === 'plus') {
      if (!config.subscription_pricing?.plus_tier) {
        console.error('[Subscription] Plus tier configuration not found in database')
        return NextResponse.json({ error: 'Plus tier configuration not found' }, { status: 500 })
      }
      priceId = interval === 'year'
        ? config.subscription_pricing.plus_tier.stripe_price_id_annual
        : config.subscription_pricing.plus_tier.stripe_price_id_monthly
      planKey = 'plus'
    } else if (tier === 'pro') {
      if (!config.subscription_pricing?.pro_tier) {
        console.error('[Subscription] Pro tier configuration not found in database')
        return NextResponse.json({ error: 'Pro tier configuration not found' }, { status: 500 })
      }
      priceId = interval === 'year'
        ? config.subscription_pricing.pro_tier.stripe_price_id_annual
        : config.subscription_pricing.pro_tier.stripe_price_id_monthly
      planKey = 'pro'
    } else if (tier === 'enterprise') {
      if (!config.subscription_pricing?.enterprise_tier) {
        console.error('[Subscription] Enterprise tier configuration not found in database')
        return NextResponse.json({ error: 'Enterprise tier configuration not found. Please contact support.' }, { status: 500 })
      }
      priceId = interval === 'year'
        ? config.subscription_pricing.enterprise_tier.stripe_price_id_annual
        : config.subscription_pricing.enterprise_tier.stripe_price_id_monthly
      planKey = 'enterprise'
    } else {
      return NextResponse.json({ error: 'Invalid tier specified' }, { status: 400 })
    }

    if (!priceId) {
      console.error('[Subscription] Missing price ID for tier:', tier, 'interval:', interval)
      return NextResponse.json({ error: 'Price configuration not found' }, { status: 500 })
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
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `https://www.polydev.ai/dashboard/subscription?success=true`,
        cancel_url: `https://www.polydev.ai/dashboard/subscription?canceled=true`,
        metadata: {
          userId: user.id,
          planKey: planKey,
          type: 'subscription',
          interval: interval
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