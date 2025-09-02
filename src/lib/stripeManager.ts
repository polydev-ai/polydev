// Production-grade Stripe integration manager
import { createClient } from '@/app/utils/supabase/server'
import { CREDIT_PACKAGES, SUBSCRIPTION_PLANS, getCreditPackageByPriceId } from './stripeConfig'

export class StripeManager {
  constructor() {}

  private async getSupabase(useServiceRole: boolean = false) {
    return await createClient(useServiceRole ? 'service_role' : 'authenticated')
  }

  /**
   * Create a checkout session for credit purchase
   */
  async createCreditCheckoutSession(
    userId: string,
    packageId: string,
    successUrl?: string,
    cancelUrl?: string
  ) {
    const creditPackage = CREDIT_PACKAGES.find(pkg => pkg.id === packageId)
    if (!creditPackage) {
      throw new Error('Invalid credit package selected')
    }

    const session = {
      priceId: creditPackage.priceId,
      quantity: 1,
      successUrl: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/credits?success=true`,
      cancelUrl: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/credits?canceled=true`,
      metadata: {
        userId,
        packageId,
        creditsAmount: creditPackage.totalCredits.toString(),
        type: 'credit_purchase'
      }
    }

    return session
  }

  /**
   * Create a checkout session for subscription
   */
  async createSubscriptionCheckoutSession(
    userId: string,
    planKey: keyof typeof SUBSCRIPTION_PLANS,
    successUrl?: string,
    cancelUrl?: string
  ) {
    const plan = SUBSCRIPTION_PLANS[planKey]
    if (!plan) {
      throw new Error('Invalid subscription plan selected')
    }

    const session = {
      priceId: plan.priceId,
      mode: 'subscription' as const,
      successUrl: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscription?success=true`,
      cancelUrl: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscription?canceled=true`,
      metadata: {
        userId,
        planKey,
        type: 'subscription'
      }
    }

    return session
  }

  /**
   * Process successful credit purchase from webhook
   */
  async processCreditPurchase(
    userId: string,
    packageId: string,
    stripeSessionId: string,
    amountPaid: number
  ) {
    const creditPackage = CREDIT_PACKAGES.find(pkg => pkg.id === packageId)
    if (!creditPackage) {
      throw new Error('Invalid credit package')
    }

    const supabase = await this.getSupabase(true) // Use service role for admin operations

    try {
      // Record the purchase in purchase_history
      const { data: purchase, error: purchaseError } = await supabase
        .from('purchase_history')
        .insert({
          user_id: userId,
          item_type: 'credits',
          item_id: packageId,
          amount_paid: amountPaid,
          credits_purchased: creditPackage.totalCredits,
          stripe_session_id: stripeSessionId,
          status: 'completed',
          metadata: {
            package_name: creditPackage.name,
            base_credits: creditPackage.credits,
            bonus_credits: creditPackage.bonusCredits
          }
        })
        .select()
        .single()

      if (purchaseError) {
        throw new Error(`Failed to record purchase: ${purchaseError.message}`)
      }

      // Add credits to user account
      const { error: creditsError } = await supabase
        .from('user_credits')
        .upsert({
          user_id: userId,
          balance: 0, // Will be updated by the trigger
          promotional_balance: 0,
          updated_at: new Date().toISOString()
        })

      if (creditsError) {
        throw new Error(`Failed to initialize credits: ${creditsError.message}`)
      }

      // Add the purchased credits
      const { error: addCreditsError } = await supabase.rpc('add_user_credits', {
        p_user_id: userId,
        p_amount: creditPackage.totalCredits,
        p_transaction_type: 'purchase',
        p_description: `Purchased ${creditPackage.name} package`
      })

      if (addCreditsError) {
        throw new Error(`Failed to add credits: ${addCreditsError.message}`)
      }

      return {
        success: true,
        creditsAdded: creditPackage.totalCredits,
        packageName: creditPackage.name
      }
    } catch (error) {
      console.error('[StripeManager] Credit purchase processing failed:', error)
      throw error
    }
  }

  /**
   * Process successful subscription from webhook
   */
  async processSubscription(
    userId: string,
    stripeCustomerId: string,
    stripeSubscriptionId: string,
    planKey: keyof typeof SUBSCRIPTION_PLANS,
    status: string
  ) {
    const plan = SUBSCRIPTION_PLANS[planKey]
    if (!plan) {
      throw new Error('Invalid subscription plan')
    }

    const supabase = await this.getSupabase(true)

    try {
      // Update or create subscription record
      const { error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: userId,
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: stripeSubscriptionId,
          plan_type: planKey,
          status,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          updated_at: new Date().toISOString()
        })

      if (subscriptionError) {
        throw new Error(`Failed to update subscription: ${subscriptionError.message}`)
      }

      // Add monthly credits for pro plan ($5 = 500 credits at $0.01 per credit)
      if (planKey === 'pro' && status === 'active') {
        await supabase.rpc('add_user_credits', {
          p_user_id: userId,
          p_amount: 500, // $5 worth of credits
          p_transaction_type: 'subscription_bonus',
          p_description: 'Monthly Pro subscription credits'
        })
      }

      return {
        success: true,
        planName: plan.name,
        status
      }
    } catch (error) {
      console.error('[StripeManager] Subscription processing failed:', error)
      throw error
    }
  }

  /**
   * Get user's purchase history
   */
  async getUserPurchaseHistory(userId: string) {
    const supabase = await this.getSupabase(true)

    const { data, error } = await supabase
      .from('purchase_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch purchase history: ${error.message}`)
    }

    return data || []
  }

  /**
   * Cancel user subscription
   */
  async cancelSubscription(userId: string) {
    const supabase = await this.getSupabase(true)

    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'canceled',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Failed to cancel subscription: ${error.message}`)
    }

    return { success: true }
  }
}

export const stripeManager = new StripeManager()