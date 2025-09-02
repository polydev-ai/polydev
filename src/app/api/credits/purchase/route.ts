import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
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
    const { packageId } = await request.json()
    
    // Validate package ID
    const selectedPackage = CREDIT_PACKAGES.find(pkg => pkg.id === packageId)
    if (!selectedPackage) {
      return NextResponse.json({ error: 'Invalid package selected' }, { status: 400 })
    }

    // Create customer first
    let customer
    try {
      customer = await mcp__stripe__create_customer(user.email || 'no-email@polydev.ai', `${user.id}-${Date.now()}`)
    } catch (customerError) {
      console.error('[Credits] Customer creation failed:', customerError)
      return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
    }

    // Create payment link using Stripe MCP
    let paymentLink
    try {
      paymentLink = await mcp__stripe__create_payment_link(
        selectedPackage.priceId,
        1
      )
    } catch (linkError) {
      console.error('[Credits] Payment link creation failed:', linkError)
      return NextResponse.json({ error: 'Failed to create payment link' }, { status: 500 })
    }

    // Store pending purchase for tracking
    const { error: sessionError } = await supabase
      .from('pending_purchases')
      .insert({
        user_id: user.id,
        payment_link_id: paymentLink.id,
        package_id: packageId,
        customer_id: customer.id,
        amount: selectedPackage.price,
        credits: selectedPackage.totalCredits,
        status: 'pending',
        created_at: new Date().toISOString()
      })

    if (sessionError) {
      console.error('[Credits] Failed to store pending purchase:', sessionError)
    }

    return NextResponse.json({
      checkoutUrl: paymentLink.url,
      paymentLinkId: paymentLink.id,
      package: selectedPackage
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