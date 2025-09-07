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
    credits: 20,
    bonusCredits: 0,
    totalCredits: 20,
    priceId: 'price_1S4euAJtMA6wwImle3TlCfMo',
    productId: 'prod_T0gGwoVYkYvZPY',
    price: 2200, // $22.00 (10% markup - $20 in credits)
    displayPrice: '$22.00',
    features: [
      '$20 AI model credits',
      'Works with all providers',
      'No expiration',
      'Instant activation',
      '10% covers payment processing & platform maintenance'
    ]
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Most popular choice',
    credits: 40,
    bonusCredits: 0,
    totalCredits: 40,
    priceId: 'price_1S4euSJtMA6wwIml8sSfQfon',
    productId: 'prod_T0gGpZlpFHDD6v',
    price: 4400, // $44.00 (10% markup - $40 in credits)
    displayPrice: '$44.00',
    popular: true,
    features: [
      '$40 AI model credits',
      'Works with all providers',
      'No expiration',
      'Instant activation',
      '10% covers payment processing & platform maintenance',
      'Priority support'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For power users',
    credits: 90,
    bonusCredits: 0,
    totalCredits: 90,
    priceId: 'price_1S4eucJtMA6wwImlC3N4YoBl',
    productId: 'prod_T0gHVaYypV8qu3',
    price: 9900, // $99.00 (10% markup - $90 in credits)
    displayPrice: '$99.00',
    features: [
      '$90 AI model credits',
      'Works with all providers',
      'No expiration',
      'Instant activation',
      '10% covers payment processing & platform maintenance',
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