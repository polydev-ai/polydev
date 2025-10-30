# Enterprise Tier Implementation Proposal

**Date**: 2025-10-28
**Status**: Awaiting Approval
**Version**: 1.0

---

## Executive Summary

This document proposes the implementation of a new **Enterprise tier** for Polydev AI, along with restructuring the **Pro tier** pricing. Based on comprehensive analysis of the existing pricing implementation, this proposal includes:

1. **NEW Enterprise Tier** - Premium offering with zero-knowledge encryption by default
2. **Pro Tier Repricing** - Reduced from $60/month to $40/month
3. **Encryption Policy** - Tier-based encryption defaults with user override capability
4. **Complete Implementation Plan** - Database, backend, frontend, and Stripe integration

---

## Current Pricing Structure Analysis

### Existing Tiers (from `src/app/pricing/page.tsx`)

| Tier | Monthly Price | Annual Price | Messages | Perspectives (Premium/Normal/Eco) | Features |
|------|---------------|--------------|----------|-----------------------------------|----------|
| **Free** | $0 | - | 200/month | 10 / 40 / 150 | Top models, basic features |
| **Plus** | $25 | $20/month | Unlimited | 400 / 1,600 / 4,000 | All 340+ models, advanced memory |
| **Pro** | $60 | $50/month | Unlimited | 1,200 / 4,800 / 10,000 | Priority access, team features |

### Key Implementation Files Analyzed

✅ **Frontend**: `src/app/pricing/page.tsx` - React pricing display
✅ **Backend API**: `src/app/api/subscription/upgrade/route.ts` - Stripe checkout
✅ **Webhook Handler**: `src/app/api/webhooks/stripe/route.ts` - Subscription events
✅ **Quota Manager**: `src/lib/quota-manager.ts` - Tier limit enforcement
✅ **Pricing Config**: `src/app/api/pricing/config/route.ts` - Dynamic config from DB
✅ **Stripe Config**: `src/lib/stripeConfig.ts` - Product/Price IDs
✅ **Database**: `admin_tier_limits` table (referenced, not in migrations - managed via UI/admin)

---

## Proposed New Pricing Structure

### Updated 4-Tier System

| Tier | Monthly Price | Annual Price | Messages | Perspectives (Premium/Normal/Eco) | Encryption Default | Features |
|------|---------------|--------------|----------|-----------------------------------|--------------------|----------|
| **Free** | $0 | - | 200/month | 10 / 40 / 150 | ❌ OFF (opt-in) | Basic usage, training data usage allowed |
| **Plus** | $25 | $20/month | Unlimited | 400 / 1,600 / 4,000 | ❌ OFF (opt-in) | All models, training data usage allowed |
| **Pro** | **$40** ⬇️ | **$33/month** | Unlimited | 600 / 2,500 / 6,000 | ✅ ON (opt-out) | Zero-knowledge encryption, privacy-first |
| **Enterprise** | **$99** 🆕 | **$82/month** | Unlimited | 2,000 / 8,000 / 20,000 | ✅ ON (mandatory) | Maximum security, audit logs, priority support |

### Pricing Notes

1. **Pro Tier Price Reduction**: Current $60/month → New $40/month (33% reduction)
   - Makes encryption more accessible
   - Better value proposition between Plus and Enterprise
   - Annual: $50/month → $33/month ($396/year)

2. **Enterprise Tier Pricing**: NEW at $99/month
   - 2.5x price increase over Pro
   - Justified by 3-4x perspective quotas
   - Includes enterprise features (audit logs, dedicated support, SSO ready)
   - Annual: $82/month ($984/year) - 17% discount

3. **Perspective Quota Progression**:
   - Free → Plus: 40x increase (10 → 400 Premium)
   - Plus → Pro: 1.5x increase (400 → 600 Premium)
   - Pro → Enterprise: 3.3x increase (600 → 2,000 Premium)

---

## Encryption Policy Design

### Tier-Based Encryption Defaults

```typescript
interface EncryptionPolicy {
  tier: 'free' | 'plus' | 'pro' | 'enterprise'
  defaultEncryptionEnabled: boolean
  canToggleEncryption: boolean
  encryptionScope: string[]
}

const ENCRYPTION_POLICIES: Record<string, EncryptionPolicy> = {
  free: {
    tier: 'free',
    defaultEncryptionEnabled: false,  // Allow training data usage
    canToggleEncryption: true,         // User can enable encryption
    encryptionScope: ['chat_messages'] // Only chat if enabled
  },
  plus: {
    tier: 'plus',
    defaultEncryptionEnabled: false,  // Allow training data usage
    canToggleEncryption: true,         // User can enable encryption
    encryptionScope: ['chat_messages', 'provider_credentials'] // Chat + API keys if enabled
  },
  pro: {
    tier: 'pro',
    defaultEncryptionEnabled: true,   // Privacy-first default
    canToggleEncryption: true,         // User can disable (warning shown)
    encryptionScope: ['chat_messages', 'provider_credentials', 'cli_credentials', 'mcp_access_tokens']
  },
  enterprise: {
    tier: 'enterprise',
    defaultEncryptionEnabled: true,   // Mandatory encryption
    canToggleEncryption: false,        // Cannot disable (compliance requirement)
    encryptionScope: ['chat_messages', 'provider_credentials', 'cli_credentials', 'mcp_access_tokens', 'audit_logs']
  }
}
```

### Encryption Scope Breakdown

**Tier 1 - CRITICAL (Always encrypted when encryption enabled)**:
- ✅ `provider_credentials.api_key` - OpenAI, Anthropic, Google API keys
- ✅ `cli_credentials` - CLI tool credentials

**Tier 2 - IMPORTANT (Encrypted for Pro+)**:
- ✅ `mcp_access_tokens.token` - Long-lived OAuth tokens (30 days)
- ✅ `mcp_user_tokens.token_hash` - CLI status tokens (1 year)

**Tier 3 - OPTIONAL (Encrypted for all tiers if enabled)**:
- ✅ `chat_messages.content` - User chat history

**NOT Encrypted**:
- ❌ `mcp_auth_codes.code` - Temporary (10 min expiry)
- ❌ `mcp_registered_clients` - OAuth client credentials (server-side standard)

---

## Database Schema Changes

### 1. Add Encryption Columns to Existing Tables

```sql
-- Migration: 030_add_encryption_support_to_credentials.sql

-- Add encryption support to provider_credentials
ALTER TABLE provider_credentials
  ADD COLUMN IF NOT EXISTS encrypted_api_key TEXT,
  ADD COLUMN IF NOT EXISTS encryption_metadata JSONB;

-- Add encryption support to cli_credentials
ALTER TABLE cli_credentials
  ADD COLUMN IF NOT EXISTS encrypted_credentials TEXT,
  ADD COLUMN IF NOT EXISTS encryption_metadata JSONB;

-- Add encryption support to mcp_access_tokens (Pro+ tier)
ALTER TABLE mcp_access_tokens
  ADD COLUMN IF NOT EXISTS encrypted_token TEXT,
  ADD COLUMN IF NOT EXISTS encryption_metadata JSONB;

-- Add encryption preference to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS encryption_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS encryption_tier TEXT DEFAULT 'none';

-- Create index for encryption lookups
CREATE INDEX IF NOT EXISTS idx_provider_credentials_encrypted
  ON provider_credentials(user_id)
  WHERE encrypted_api_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cli_credentials_encrypted
  ON cli_credentials(user_id)
  WHERE encrypted_credentials IS NOT NULL;
```

### 2. Add Enterprise Tier to admin_tier_limits

**Note**: The `admin_tier_limits` table is managed via admin UI or direct Supabase console, not in migrations. This is the SQL to execute:

```sql
-- Add Enterprise tier configuration
INSERT INTO admin_tier_limits (
  tier,
  messages_per_month,
  premium_perspectives_limit,
  normal_perspectives_limit,
  eco_perspectives_limit,
  created_at,
  updated_at
) VALUES (
  'enterprise',
  999999,  -- Effectively unlimited (999,999)
  2000,    -- 2,000 Premium perspectives
  8000,    -- 8,000 Normal perspectives
  20000,   -- 20,000 Eco perspectives
  NOW(),
  NOW()
) ON CONFLICT (tier) DO UPDATE SET
  messages_per_month = EXCLUDED.messages_per_month,
  premium_perspectives_limit = EXCLUDED.premium_perspectives_limit,
  normal_perspectives_limit = EXCLUDED.normal_perspectives_limit,
  eco_perspectives_limit = EXCLUDED.eco_perspectives_limit,
  updated_at = NOW();

-- Update Pro tier quotas (reduced from current values)
UPDATE admin_tier_limits SET
  premium_perspectives_limit = 600,
  normal_perspectives_limit = 2500,
  eco_perspectives_limit = 6000,
  updated_at = NOW()
WHERE tier = 'pro';
```

### 3. Update admin_pricing_config for Enterprise Tier

```sql
-- Add Enterprise tier pricing configuration
-- Note: Stripe price IDs must be created first in Stripe Dashboard

-- Example structure (adjust based on your config schema):
INSERT INTO admin_pricing_config (config_key, config_value, created_at, updated_at)
VALUES
  ('subscription_pricing.enterprise_tier.stripe_price_id_monthly', 'price_XXXXXXXXX', NOW(), NOW()),
  ('subscription_pricing.enterprise_tier.stripe_price_id_annual', 'price_YYYYYYYYY', NOW(), NOW()),
  ('subscription_pricing.enterprise_tier.monthly_price_usd', '99', NOW(), NOW()),
  ('subscription_pricing.enterprise_tier.annual_price_usd', '82', NOW(), NOW())
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  updated_at = NOW();

-- Update Pro tier pricing (price reduction)
UPDATE admin_pricing_config SET
  config_value = '40',
  updated_at = NOW()
WHERE config_key = 'subscription_pricing.pro_tier.monthly_price_usd';

UPDATE admin_pricing_config SET
  config_value = '33',
  updated_at = NOW()
WHERE config_key = 'subscription_pricing.pro_tier.annual_price_usd';
```

---

## TypeScript Type Updates

### 1. Update Tier Type Definitions

```typescript
// src/types/subscription.ts (create if doesn't exist)

export type SubscriptionTier = 'free' | 'plus' | 'pro' | 'enterprise'

export interface TierLimits {
  tier: SubscriptionTier
  messages_per_month: number
  premium_perspectives_limit: number
  normal_perspectives_limit: number
  eco_perspectives_limit: number
}

export interface TierPricing {
  monthly_price_usd: number
  annual_price_usd: number
  stripe_price_id_monthly: string
  stripe_price_id_annual: string
}

export interface SubscriptionPlan {
  tier: SubscriptionTier
  name: string
  description: string
  pricing: TierPricing
  limits: TierLimits
  features: string[]
  encryption_default: boolean
  can_toggle_encryption: boolean
}
```

### 2. Update Quota Manager Types

```typescript
// In src/lib/quota-manager.ts

// Update method signature:
async updateUserPlan(userId: string, newTier: 'free' | 'plus' | 'pro' | 'enterprise'): Promise<void>

// Update tier validation in all methods to include 'enterprise'
```

---

## Backend Implementation Changes

### 1. Update Subscription Upgrade Route

**File**: `src/app/api/subscription/upgrade/route.ts`

```typescript
// Add enterprise tier handling

export async function POST(request: NextRequest) {
  // ... existing code ...

  // Update tier validation to include 'enterprise'
  if (tier === 'plus') {
    priceId = interval === 'year'
      ? config.subscription_pricing.plus_tier.stripe_price_id_annual
      : config.subscription_pricing.plus_tier.stripe_price_id_monthly
    planKey = 'plus'
  } else if (tier === 'pro') {
    priceId = interval === 'year'
      ? config.subscription_pricing.pro_tier.stripe_price_id_annual
      : config.subscription_pricing.pro_tier.stripe_price_id_monthly
    planKey = 'pro'
  } else if (tier === 'enterprise') {  // NEW
    priceId = interval === 'year'
      ? config.subscription_pricing.enterprise_tier.stripe_price_id_annual
      : config.subscription_pricing.enterprise_tier.stripe_price_id_monthly
    planKey = 'enterprise'
  } else {
    return NextResponse.json({ error: 'Invalid tier specified' }, { status: 400 })
  }

  // ... rest of checkout logic ...
}
```

### 2. Update Stripe Webhook Handler

**File**: `src/app/api/webhooks/stripe/route.ts`

```typescript
// Update handleSubscriptionCreated and handleSubscriptionChange functions

async function handleSubscriptionCreated(subscription: Stripe.Subscription, supabase: any) {
  // ... existing code ...

  // Map Stripe price ID to tier (including enterprise)
  let tier: 'free' | 'plus' | 'pro' | 'enterprise' = 'free'
  const priceId = subscription.items.data[0]?.price.id

  // Get pricing config and check for enterprise tier
  const config = await fetchPricingConfig(supabase)

  if (priceId === config.subscription_pricing.enterprise_tier.stripe_price_id_monthly ||
      priceId === config.subscription_pricing.enterprise_tier.stripe_price_id_annual) {
    tier = 'enterprise'
  } else if (priceId === config.subscription_pricing.pro_tier.stripe_price_id_monthly ||
             priceId === config.subscription_pricing.pro_tier.stripe_price_id_annual) {
    tier = 'pro'
  } else if (priceId === config.subscription_pricing.plus_tier.stripe_price_id_monthly ||
             priceId === config.subscription_pricing.plus_tier.stripe_price_id_annual) {
    tier = 'plus'
  }

  // Update user tier in quota manager
  await quotaManager.updateUserPlan(userId, tier)

  // Set encryption default based on tier
  if (tier === 'pro' || tier === 'enterprise') {
    await supabase
      .from('users')
      .update({
        encryption_enabled: true,
        encryption_tier: tier
      })
      .eq('id', userId)
  }
}
```

### 3. Update Quota Manager

**File**: `src/lib/quota-manager.ts`

```typescript
// Update tier type throughout the file

async updateUserPlan(userId: string, newTier: 'free' | 'plus' | 'pro' | 'enterprise'): Promise<void> {
  // Existing logic already fetches from admin_tier_limits dynamically
  // Just update the type signature - the database query will handle enterprise tier automatically

  const { data: tierLimits, error: tierError } = await supabase
    .from('admin_tier_limits')
    .select('*')
    .eq('tier', newTier)  // This will now accept 'enterprise'
    .single()

  // ... rest of existing code unchanged ...
}
```

---

## Frontend Implementation Changes

### 1. Update Pricing Page

**File**: `src/app/pricing/page.tsx`

```typescript
// Add Enterprise tier to plans array

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    features: [
      '200 messages/month',
      '10 Premium / 40 Normal / 150 Eco perspectives',
      'Query top AI models',
      'Compare responses side-by-side'
    ]
  },
  {
    name: 'Plus',
    price: '$25',
    period: '/month',
    annualPrice: '$20',
    description: 'Most popular for individual developers',
    features: [
      'Unlimited messages',
      '400 Premium / 1,600 Normal / 4,000 Eco perspectives',
      'All AI models access',
      'Advanced memory features'
    ],
    highlighted: true  // Keep Plus as highlighted for now
  },
  {
    name: 'Pro',
    price: '$40',  // UPDATED from $60
    period: '/month',
    annualPrice: '$33',  // UPDATED from $50
    description: 'Privacy-first with zero-knowledge encryption',
    features: [
      'Unlimited messages',
      '600 Premium / 2,500 Normal / 6,000 Eco perspectives',  // UPDATED quotas
      'Zero-knowledge encryption by default',
      'All AI models + priority access',
      'Automatic data encryption'
    ],
    badge: 'Privacy First'  // NEW badge
  },
  {
    name: 'Enterprise',  // NEW TIER
    price: '$99',
    period: '/month',
    annualPrice: '$82',
    description: 'Maximum security for teams and organizations',
    features: [
      'Unlimited messages',
      '2,000 Premium / 8,000 Normal / 20,000 Eco perspectives',
      'Mandatory zero-knowledge encryption',
      'Audit logs and compliance reports',
      'Priority support and SLA',
      'SSO ready (coming soon)',
      'Team collaboration features'
    ],
    badge: 'Enterprise',
    highlighted: false
  }
]
```

### 2. Add Encryption Settings UI

**File**: `src/components/settings/EncryptionSettings.tsx` (NEW)

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { isEncryptionUnlocked, unlockEncryption } from '@/lib/crypto'

export default function EncryptionSettings() {
  const { user } = useAuth()
  const [encryptionEnabled, setEncryptionEnabled] = useState(false)
  const [tier, setTier] = useState<string>('free')
  const [canToggle, setCanToggle] = useState(true)

  useEffect(() => {
    if (user) {
      setEncryptionEnabled(user.encryption_enabled || false)
      setTier(user.encryption_tier || 'free')
      setCanToggle(tier !== 'enterprise')  // Enterprise users cannot disable
    }
  }, [user])

  const handleToggle = async () => {
    if (!canToggle) {
      alert('Encryption cannot be disabled on Enterprise tier for compliance reasons')
      return
    }

    if (!encryptionEnabled) {
      // Enabling encryption - show migration flow
      const password = prompt('Create encryption password (min 12 characters):')
      if (!password || password.length < 12) {
        alert('Password must be at least 12 characters')
        return
      }

      // Initialize encryption and migrate existing data
      await unlockEncryption(password)
      await migrateExistingData()

      setEncryptionEnabled(true)
    } else {
      // Disabling encryption - show warning
      const confirm = window.confirm(
        'Warning: Disabling encryption will decrypt your data and allow it to be used for AI training. Continue?'
      )
      if (confirm) {
        await disableEncryption()
        setEncryptionEnabled(false)
      }
    }
  }

  return (
    <div className="encryption-settings">
      <h3>Zero-Knowledge Encryption</h3>
      <p>
        {tier === 'enterprise' && 'Enterprise tier requires encryption (compliance)'}
        {tier === 'pro' && 'Pro tier has encryption enabled by default (privacy-first)'}
        {(tier === 'plus' || tier === 'free') && 'Enable encryption to protect your data and opt out of training data usage'}
      </p>

      <button
        onClick={handleToggle}
        disabled={!canToggle && encryptionEnabled}
        className={encryptionEnabled ? 'btn-enabled' : 'btn-disabled'}
      >
        {encryptionEnabled ? 'Encryption Enabled ✓' : 'Enable Encryption'}
      </button>

      {encryptionEnabled && (
        <div className="encryption-status">
          <p>🔒 Your data is encrypted end-to-end. Only you can decrypt it.</p>
          <p>Encrypted: Chat messages, API keys, CLI credentials, OAuth tokens</p>
        </div>
      )}
    </div>
  )
}
```

---

## Stripe Configuration

### Create Stripe Products and Prices

**Step 1: Create Enterprise Product in Stripe Dashboard**

```
Product Name: Polydev Enterprise
Description: Maximum security for teams and organizations
```

**Step 2: Create Price Objects**

```
Monthly Price:
  - Amount: $99.00 USD
  - Billing Period: Monthly
  - Price ID: price_XXXXXXXXX (save this)

Annual Price:
  - Amount: $984.00 USD ($82/month)
  - Billing Period: Yearly
  - Price ID: price_YYYYYYYYY (save this)
```

**Step 3: Update Pro Tier Prices**

```
Pro Monthly: Update to $40.00 USD
Pro Annual: Update to $396.00 USD ($33/month)
```

**Step 4: Add Price IDs to Database**

After creating Stripe products, update `admin_pricing_config` table with the new price IDs (see SQL section above).

---

## Migration Strategy

### Phase 1: Database Setup (Week 1)

1. ✅ Add encryption columns to credentials tables
2. ✅ Add Enterprise tier to `admin_tier_limits`
3. ✅ Update Pro tier quotas in `admin_tier_limits`
4. ✅ Add encryption preferences to `users` table

### Phase 2: Backend Implementation (Week 2)

1. ✅ Update TypeScript types for 4-tier system
2. ✅ Update quota manager to support enterprise tier
3. ✅ Update subscription upgrade API
4. ✅ Update Stripe webhook handlers
5. ✅ Implement encryption helpers for credentials
6. ✅ Update MCP routes to handle encrypted API keys

### Phase 3: Frontend Implementation (Week 3)

1. ✅ Update pricing page with 4 tiers
2. ✅ Build encryption settings UI
3. ✅ Implement automatic migration flow
4. ✅ Add encryption unlock/lock UI
5. ✅ Update account dashboard with tier info

### Phase 4: Stripe Integration (Week 4)

1. ✅ Create Enterprise products in Stripe
2. ✅ Update Pro tier pricing in Stripe
3. ✅ Test checkout flow for all tiers
4. ✅ Test webhook subscription events
5. ✅ Validate tier upgrades/downgrades

### Phase 5: Testing & Launch (Week 5)

1. ✅ End-to-end testing of all 4 tiers
2. ✅ Test encryption enable/disable flow
3. ✅ Test automatic migration
4. ✅ Verify quota enforcement
5. ✅ Security audit of encryption implementation
6. ✅ Launch announcement and migration guide

---

## Open Questions for Approval

1. **Enterprise Pricing**: Is $99/month appropriate, or should it be higher/lower?
   - Current proposal: $99/month ($82/month annual)
   - Alternative: $149/month for more premium positioning

2. **Pro Tier Pricing**: Confirm $40/month reduction is acceptable
   - This is a 33% price decrease for existing Pro users
   - Will this require grandfather pricing for existing customers?

3. **Enterprise Features**: Should we include additional features beyond encryption?
   - SSO/SAML authentication (ready for implementation)
   - Audit logs (already in design)
   - Dedicated Slack support channel
   - Custom SLA agreements

4. **Migration Timeline**: Should existing Pro users ($60/month) be:
   - Automatically migrated to $40/month plan (goodwill gesture)
   - Grandfathered at $60/month
   - Given option to upgrade to Enterprise at discount

5. **Encryption Mandatory**: Should Free/Plus users ever be forced to encrypt?
   - Current proposal: No, encryption always opt-in for Free/Plus
   - Alternative: Make encryption mandatory after certain data volume

---

## Success Metrics

### Business Metrics
- Enterprise tier conversion rate target: 5-10% of Pro users
- Pro tier adoption increase with lower price: +30% conversions
- Average revenue per user (ARPU) increase: +15%

### Technical Metrics
- Encryption adoption rate (Free/Plus): Target 10-15%
- Encryption adoption rate (Pro): Target 80-90%
- MCP API key encryption coverage: 100% for Pro/Enterprise

### Security Metrics
- Zero plaintext API keys in database (Pro/Enterprise)
- 100% of chat messages encrypted (when enabled)
- Zero-knowledge architecture validated by security audit

---

## Recommendation

**Proceed with Implementation**: The proposed 4-tier structure with Pro repricing and Enterprise tier provides:

1. **Better Value Ladder**: Clear progression from Free → Plus → Pro → Enterprise
2. **Privacy Positioning**: Pro and Enterprise clearly differentiated on encryption/privacy
3. **Revenue Growth**: Higher-tier Enterprise offsets Pro price reduction
4. **Security Improvement**: Addresses critical security issue (plaintext API keys)
5. **Market Positioning**: Competitive with other AI platforms offering enterprise tiers

**Next Steps**:
1. Approve Enterprise tier pricing and features
2. Decide on existing Pro user migration strategy
3. Begin Phase 1 (Database Setup) implementation
4. Create Stripe products for Enterprise tier

---

**Prepared by**: Claude Code (Sonnet 4.5)
**Review Status**: Awaiting user approval
**Implementation Start**: Upon approval
