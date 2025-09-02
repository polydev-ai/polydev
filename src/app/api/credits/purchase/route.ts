import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import { CREDIT_PACKAGES } from '@/lib/stripeConfig'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const { packageId, successUrl, cancelUrl } = await request.json()
    
    // Find the credit package
    const creditPackage = CREDIT_PACKAGES.find(pkg => pkg.id === packageId)
    if (!creditPackage) {
      return NextResponse.json({ error: 'Invalid credit package' }, { status: 400 })
    }
    
    // Get or create Stripe customer
    try {
      let customer = await getOrCreateStripeCustomer(user.id, user.email || '', user.user_metadata?.full_name || user.email || '')

      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customer.id,
        payment_method_types: ['card'],
        line_items: [
          {
            price: creditPackage.priceId,
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/credits?success=true`,
        cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/credits?canceled=true`,
        metadata: {
          userId: user.id,
          packageId: packageId,
          creditsAmount: creditPackage.totalCredits.toString(),
          type: 'credit_purchase'
        }
      })

      return NextResponse.json({
        success: true,
        url: session.url,
        session: { id: session.id, url: session.url },
        message: 'Checkout session created successfully'
      })

    } catch (error) {
      console.error('[Credits] Checkout session creation failed:', error)
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
    }

  } catch (error) {
    console.error('[Credits Purchase] Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create payment session' },
      { status: 500 }
    )
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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Return available credit packages
    return NextResponse.json({
      packages: CREDIT_PACKAGES.map((pkg) => ({
        ...pkg,
        savings: pkg.bonusCredits > 0 ? Math.round((pkg.bonusCredits / pkg.credits) * 100) : 0
      }))
    })

  } catch (error) {
    console.error('[Credits Purchase] Error fetching packages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch credit packages' },
      { status: 500 }
    )
  }
}