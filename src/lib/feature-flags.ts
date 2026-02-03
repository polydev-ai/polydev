/**
 * Feature Flags for Polydev
 *
 * These flags control which features are enabled in the application.
 * - Open-source/self-hosted: Most features disabled by default
 * - Hosted (polydev.ai): All features enabled
 *
 * Set these in your .env.local file:
 *
 * NEXT_PUBLIC_CREDITS_ENABLED=true
 * NEXT_PUBLIC_CHAT_ENABLED=true
 * NEXT_PUBLIC_SUBSCRIPTION_ENABLED=true
 * NEXT_PUBLIC_ADMIN_ENABLED=true
 */

// Credits system - purchase and track credits
export const CREDITS_ENABLED = process.env.NEXT_PUBLIC_CREDITS_ENABLED === 'true'

// Chat interface - multi-model chat UI
export const CHAT_ENABLED = process.env.NEXT_PUBLIC_CHAT_ENABLED === 'true'

// Subscription system - Stripe integration, tiers
export const SUBSCRIPTION_ENABLED = process.env.NEXT_PUBLIC_SUBSCRIPTION_ENABLED === 'true'

// Admin panel - user management, analytics
export const ADMIN_ENABLED = process.env.NEXT_PUBLIC_ADMIN_ENABLED === 'true'

// VM/Browser features - Firecracker VMs
export const VM_ENABLED = process.env.NEXT_PUBLIC_VM_ENABLED === 'true'

// Referral system
export const REFERRALS_ENABLED = process.env.NEXT_PUBLIC_REFERRALS_ENABLED === 'true'

// Remote CLI features
export const REMOTE_CLI_ENABLED = process.env.NEXT_PUBLIC_REMOTE_CLI_ENABLED === 'true'

/**
 * Check if running in hosted mode (polydev.ai)
 * When hosted, all premium features are available
 */
export const IS_HOSTED = process.env.NEXT_PUBLIC_IS_HOSTED === 'true'

/**
 * Helper to check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof FEATURES): boolean {
  return FEATURES[feature]
}

/**
 * All feature flags in one object
 */
export const FEATURES = {
  credits: CREDITS_ENABLED,
  chat: CHAT_ENABLED,
  subscription: SUBSCRIPTION_ENABLED,
  admin: ADMIN_ENABLED,
  vm: VM_ENABLED,
  referrals: REFERRALS_ENABLED,
  remoteCli: REMOTE_CLI_ENABLED,
  isHosted: IS_HOSTED,
} as const

/**
 * Feature flag presets for different deployment modes
 */
export const PRESETS = {
  // Open source / self-hosted - minimal features
  openSource: {
    credits: false,
    chat: false,
    subscription: false,
    admin: false,
    vm: false,
    referrals: false,
    remoteCli: false,
    isHosted: false,
  },
  // Hosted version - all features
  hosted: {
    credits: true,
    chat: true,
    subscription: true,
    admin: true,
    vm: true,
    referrals: true,
    remoteCli: true,
    isHosted: true,
  },
} as const

export default FEATURES
