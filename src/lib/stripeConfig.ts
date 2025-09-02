// Production-grade Stripe configuration and credit packages

export interface CreditPackage {
  id: string
  name: string
  description: string
  credits: number
  bonusCredits: number
  totalCredits: number
  priceId: string
  productId: string
  price: number // in cents
  displayPrice: string
  savings?: number
  popular?: boolean
  features: string[]
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for getting started',
    credits: 100,
    bonusCredits: 0,
    totalCredits: 100,
    priceId: 'price_1S2q6RJtMA6wwImlHRH4p88T',
    productId: 'prod_SynheFtbhPcQUe',
    price: 999, // $9.99
    displayPrice: '$9.99',
    features: [
      '100 AI model credits',
      'Works with all providers',
      'No expiration',
      'Instant activation'
    ]
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Most popular choice',
    credits: 500,
    bonusCredits: 100,
    totalCredits: 600,
    priceId: 'price_1S2q6aJtMA6wwImlIYbemPU6',
    productId: 'prod_SynhR26vI78whT',
    price: 4499, // $44.99
    displayPrice: '$44.99',
    savings: 20,
    popular: true,
    features: [
      '500 AI model credits',
      '+ 100 bonus credits',
      'Works with all providers',
      'No expiration',
      '20% more value',
      'Priority support'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For power users',
    credits: 1000,
    bonusCredits: 300,
    totalCredits: 1300,
    priceId: 'price_1S2q70JtMA6wwImlQ6T3lrPo',
    productId: 'prod_Syni2GyfwT5FVA',
    price: 7999, // $79.99
    displayPrice: '$79.99',
    savings: 30,
    features: [
      '1000 AI model credits',
      '+ 300 bonus credits',
      'Works with all providers',
      'No expiration',
      '30% more value',
      'Priority support',
      'Advanced analytics'
    ]
  }
]

export const SUBSCRIPTION_PLANS = {
  pro: {
    name: 'Polydev Pro',
    description: 'Unlimited MCP messages, CLI access, and $5 monthly credits',
    priceId: 'price_1S2oYBJtMA6wwImls1Og4rZi',
    productId: 'prod_Sym6JmhSXjOlTj',
    price: 2000, // $20.00/month
    displayPrice: '$20/month',
    features: [
      'Unlimited MCP messages',
      'CLI access',
      '$5 monthly credits',
      'All AI providers',
      'Priority support',
      'Advanced features'
    ]
  }
}

export function getCreditPackageById(id: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find(pkg => pkg.id === id)
}

export function getCreditPackageByPriceId(priceId: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find(pkg => pkg.priceId === priceId)
}