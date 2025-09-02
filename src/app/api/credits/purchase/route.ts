import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { stripeManager } from '@/lib/stripeManager'
import { CREDIT_PACKAGES } from '@/lib/stripeConfig'

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
    
    // Create checkout session using StripeManager
    try {
      const session = await stripeManager.createCreditCheckoutSession(
        user.id,
        packageId,
        successUrl,
        cancelUrl
      )

      // The StripeManager returns session data, not a direct URL
      // In a real implementation, you'd create the actual Stripe session here
      return NextResponse.json({
        success: true,
        session,
        message: 'Checkout session prepared successfully'
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