import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import Stripe from 'stripe'
import CreditManager, { CREDIT_PACKAGES } from '@/lib/creditManager'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil'
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const creditManager = new CreditManager()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const { packageIndex, successUrl, cancelUrl } = await request.json()
    
    // Validate package index
    if (typeof packageIndex !== 'number' || packageIndex < 0 || packageIndex >= CREDIT_PACKAGES.length) {
      return NextResponse.json({ error: 'Invalid package selected' }, { status: 400 })
    }

    const selectedPackage = CREDIT_PACKAGES[packageIndex]
    const totalCredits = selectedPackage.amount + selectedPackage.bonus

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Polydev Credits - ${selectedPackage.description}`,
              description: `${selectedPackage.amount} credits${selectedPackage.bonus > 0 ? ` + ${selectedPackage.bonus} bonus credits` : ''} = ${totalCredits} total credits`,
              images: ['https://polydev.ai/logo.png'] // Update with actual logo URL
            },
            unit_amount: selectedPackage.price, // Amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/credits?success=true`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/credits?canceled=true`,
      client_reference_id: user.id,
      metadata: {
        userId: user.id,
        packageIndex: packageIndex.toString(),
        creditsAmount: totalCredits.toString(),
        packageDescription: selectedPackage.description
      }
    })

    // Note: We'll record the purchase when the webhook confirms payment
    // The session.payment_intent is null at creation time

    return NextResponse.json({
      sessionId: session.id,
      checkoutUrl: session.url,
      package: {
        ...selectedPackage,
        totalCredits
      }
    })

  } catch (error) {
    console.error('[Credits Purchase] Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create payment session' },
      { status: 500 }
    )
  }
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
      packages: CREDIT_PACKAGES.map((pkg, index) => ({
        ...pkg,
        index,
        totalCredits: pkg.amount + pkg.bonus,
        savings: pkg.bonus > 0 ? Math.round((pkg.bonus / pkg.amount) * 100) : 0
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