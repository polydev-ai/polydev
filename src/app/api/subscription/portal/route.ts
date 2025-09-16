import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { subscriptionManager } from '@/lib/subscriptionManager'
import Stripe from 'stripe'

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
      return NextResponse.json({
        error: 'No billing portal available',
        details: 'No active Stripe subscription found. Please upgrade to Pro to access billing management.',
        action: 'upgrade_required'
      }, { status: 404 })
    }

    // Get the base URL from the request
    const protocol = request.headers.get('x-forwarded-proto') || 'https'
    const host = request.headers.get('host') || 'www.polydev.ai'
    const baseUrl = `${protocol}://${host}`
    const returnUrl = `${baseUrl}/dashboard/subscription`

    // Create customer portal session using Stripe SDK
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2025-08-27.basil'
      })

      // First, try to create with default configuration
      let portalSession
      try {
        portalSession = await stripe.billingPortal.sessions.create({
          customer: subscription.stripe_customer_id,
          return_url: returnUrl,
        })
      } catch (configError: any) {
        // If no default configuration exists, create one
        if (configError.message.includes('No configuration provided')) {
          console.log('[Subscription] Creating default portal configuration...')
          
          const configuration = await stripe.billingPortal.configurations.create({
            features: {
              payment_method_update: {
                enabled: true,
              },
              invoice_history: {
                enabled: true,
              },
              subscription_cancel: {
                enabled: true,
                mode: 'at_period_end',
                cancellation_reason: {
                  enabled: true,
                  options: [
                    'too_expensive',
                    'missing_features',
                    'switched_service',
                    'unused',
                    'other',
                  ],
                },
              },
              subscription_update: {
                enabled: true,
                default_allowed_updates: ['price'],
                proration_behavior: 'create_prorations',
              },
            },
            business_profile: {
              headline: 'Manage your Polydev subscription',
            },
          })

          // Now create the session with the new configuration
          portalSession = await stripe.billingPortal.sessions.create({
            customer: subscription.stripe_customer_id,
            return_url: returnUrl,
            configuration: configuration.id,
          })
        } else {
          throw configError
        }
      }

      return NextResponse.json({ portalUrl: portalSession.url })

    } catch (stripeError: any) {
      console.error('[Subscription] Portal session error:', stripeError)
      
      // Provide more specific error messages
      if (stripeError.message.includes('No configuration provided')) {
        return NextResponse.json({ 
          error: 'Billing portal not configured',
          details: 'Please configure the customer portal in your Stripe dashboard at https://dashboard.stripe.com/settings/billing/portal',
          action: 'contact_support'
        }, { status: 503 })
      }
      
      return NextResponse.json({ 
        error: 'Failed to create portal session',
        details: stripeError.message 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('[Subscription] Portal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Add GET method that does the same as POST for compatibility
export async function GET(request: NextRequest) {
  return POST(request)
}