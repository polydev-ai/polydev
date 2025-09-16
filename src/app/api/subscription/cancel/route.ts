import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia'
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { immediately = false } = await request.json()

    // Get user's subscription
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('stripe_subscription_id, status')
      .eq('user_id', user.id)
      .single()

    if (subError || !subscription) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
    }

    if (subscription.status !== 'active') {
      return NextResponse.json({ error: 'Subscription is not active' }, { status: 400 })
    }

    // Cancel subscription in Stripe
    const cancelledSubscription = await stripe.subscriptions.update(
      subscription.stripe_subscription_id,
      {
        cancel_at_period_end: !immediately,
        ...(immediately && { cancel_at: Math.floor(Date.now() / 1000) })
      }
    )

    // Update local database
    const updates: any = {
      cancel_at_period_end: cancelledSubscription.cancel_at_period_end,
      updated_at: new Date().toISOString()
    }

    if (immediately) {
      updates.status = 'canceled'
      updates.canceled_at = new Date().toISOString()
    }

    await supabase
      .from('user_subscriptions')
      .update(updates)
      .eq('user_id', user.id)

    // Get the updated subscription details
    const updatedSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id) as Stripe.Subscription

    return NextResponse.json({
      success: true,
      message: immediately 
        ? 'Subscription cancelled immediately' 
        : 'Subscription will cancel at the end of the current period',
      cancel_at_period_end: updatedSubscription.cancel_at_period_end,
      current_period_end: new Date((updatedSubscription as any).current_period_end * 1000).toISOString()
    })

  } catch (error) {
    console.error('Error cancelling subscription:', error)
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}