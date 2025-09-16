import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil'
})

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's subscription to find Stripe customer ID
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id, stripe_subscription_id, tier, status')
      .eq('user_id', user.id)
      .single()

    let billingHistory: any[] = []
    
    if (subscription?.stripe_customer_id) {
      // Get invoices from Stripe
      const invoices = await stripe.invoices.list({
        customer: subscription.stripe_customer_id,
        limit: 50
      })

      billingHistory = invoices.data.map(invoice => ({
        id: invoice.id,
        date: new Date(invoice.created * 1000).toISOString(),
        amount: invoice.amount_paid / 100, // Convert cents to dollars
        currency: invoice.currency.toUpperCase(),
        description: invoice.description || 'Subscription payment',
        status: invoice.status,
        invoice_url: invoice.hosted_invoice_url,
        pdf_url: invoice.invoice_pdf,
        period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
        period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null
      }))
    }

    // Get credit purchases from local database
    const { data: purchases } = await supabase
      .from('purchase_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    const creditHistory = (purchases || []).map(purchase => ({
      id: purchase.id,
      date: purchase.created_at,
      amount: purchase.amount_paid / 100, // Convert cents to dollars
      currency: 'USD',
      description: `Credit purchase: ${purchase.metadata?.package_name || 'Credits'}`,
      status: purchase.status,
      credits_purchased: purchase.credits_purchased,
      type: 'credit_purchase'
    }))

    // Combine and sort all billing history
    const allHistory = [...billingHistory, ...creditHistory]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json({
      billing_history: allHistory,
      subscription: subscription || null
    })

  } catch (error) {
    console.error('Error fetching billing history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch billing history' },
      { status: 500 }
    )
  }
}