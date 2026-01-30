// Production-grade Stripe configuration and subscription plans
// Credit System: Premium = 20 credits, Normal = 4 credits, Eco = 1 credit

export interface SubscriptionPlan {
  id: string
  name: string
  description: string
  monthlyCredits: number
  priceId: string
  productId: string
  price: number // in cents
  displayPrice: string
  popular?: boolean
  features: string[]
  unlimitedMessages?: boolean
}

// Simplified 2-tier pricing
// Free: First 500 credits (one-time)
// Premium: $10/month, 10K credits + unlimited messages
export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Get started',
    monthlyCredits: 500, // One-time, not monthly
    priceId: '', // No Stripe price for free tier
    productId: '',
    price: 0,
    displayPrice: '$0',
    unlimitedMessages: false,
    features: [
      'First 500 credits (one-time)',
      'All AI models access',
      'MCP integration',
      'Community support'
    ]
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    description: 'For serious developers',
    monthlyCredits: 10000,
    priceId: 'price_1Sv5OsJtMA6wwImlHfcg42aU', // Real Stripe price ID
    productId: 'prod_Tsr7xvlOeRBOj9', // Real Stripe product ID
    price: 1000, // $10.00/month
    displayPrice: '$10/month',
    popular: true,
    unlimitedMessages: true,
    features: [
      '10,000 credits/month',
      'Unlimited messages',
      'Credits rollover (while subscribed)',
      'All AI models access',
      'Use your CLI subscriptions',
      'Priority support'
    ]
  }
}

// Keep legacy plus/pro mappings for backward compatibility with existing subscribers
export const LEGACY_PLANS: Record<string, SubscriptionPlan> = {
  plus: {
    id: 'plus',
    name: 'Plus (Legacy)',
    description: 'Legacy plan',
    monthlyCredits: 20000,
    priceId: 'price_1Scw7FJtMA6wwImlxicpgLmQ',
    productId: 'prod_Ta6JZabJj1dbhU',
    price: 2500,
    displayPrice: '$25/month',
    features: ['20,000 credits/month', 'Legacy plan - no longer available']
  },
  pro: {
    id: 'pro',
    name: 'Pro (Legacy)',
    description: 'Legacy plan',
    monthlyCredits: 50000,
    priceId: 'price_1Scw7FJtMA6wwImlH8SulHFv',
    productId: 'prod_Ta6J26mimjYWJF',
    price: 5000,
    displayPrice: '$50/month',
    features: ['50,000 credits/month', 'Legacy plan - no longer available']
  }
}

// Credit cost per model tier (used for deduction calculations)
// Simplified: All models now cost 1 credit per request
export const CREDIT_COSTS = {
  default: 1  // All models cost 1 credit per request
} as const

// Legacy tier costs (deprecated - kept for backward compatibility)
export const LEGACY_CREDIT_COSTS = {
  premium: 20,  // Deprecated
  normal: 4,    // Deprecated
  eco: 1        // Deprecated
} as const

// Legacy credit packages (deprecated - kept for backward compatibility)
export interface CreditPackage {
  id: string
  name: string
  description: string
  credits: number
  bonusCredits: number
  totalCredits: number
  priceId: string
  productId: string
  price: number
  displayPrice: string
  savings?: number
  popular?: boolean
  features: string[]
}

// Deprecated: Use SUBSCRIPTION_PLANS instead
export const CREDIT_PACKAGES: CreditPackage[] = []

export function getCreditPackageById(id: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find(pkg => pkg.id === id)
}

export function getCreditPackageByPriceId(priceId: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find(pkg => pkg.priceId === priceId)
}