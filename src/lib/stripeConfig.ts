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
}

// New simplified subscription-based pricing
// Credits rollover as long as user maintains at least Plus subscription
export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Try it out',
    monthlyCredits: 500, // One-time, not monthly
    priceId: '', // No Stripe price for free tier
    productId: '',
    price: 0,
    displayPrice: '$0',
    features: [
      '500 credits to start',
      'All AI models access',
      'MCP integration',
      'Basic support'
    ]
  },
  plus: {
    id: 'plus',
    name: 'Plus',
    description: 'Most popular for developers',
    monthlyCredits: 20000,
    priceId: 'price_1Scw7FJtMA6wwImlxicpgLmQ',
    productId: 'prod_Ta6JZabJj1dbhU',
    price: 2500, // $25.00/month
    displayPrice: '$25/month',
    popular: true,
    features: [
      '20,000 credits/month',
      'Credits rollover (while subscribed)',
      'All AI models access',
      'BYOK (use your own API keys)',
      'Priority support'
    ]
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'For power users',
    monthlyCredits: 50000,
    priceId: 'price_1Scw7FJtMA6wwImlH8SulHFv',
    productId: 'prod_Ta6J26mimjYWJF',
    price: 5000, // $50.00/month
    displayPrice: '$50/month',
    features: [
      '50,000 credits/month',
      'Credits rollover (while subscribed)',
      'All AI models access',
      'BYOK (use your own API keys)',
      'Priority support',
      'Advanced analytics'
    ]
  }
}

// Credit cost per model tier (used for deduction calculations)
export const CREDIT_COSTS = {
  premium: 20,  // Premium models (GPT-5.1, Claude Opus 4.5, etc.)
  normal: 4,    // Normal models
  eco: 1        // Eco/fast models
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