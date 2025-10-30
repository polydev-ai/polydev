# Complete Tier Restructuring Analysis

**Date**: 2025-10-28
**Status**: Analysis Complete - Awaiting User Approval for Implementation

---

## Executive Summary

**Task**: Add new Enterprise tier + restructure pricing for existing tiers + integrate zero-knowledge encryption defaults

**Current State**: 3 tiers (Free, Plus, Pro)
**Target State**: 4 tiers (Free, Plus, Pro, Enterprise)

**Key Changes Required**:
1. Add Enterprise tier at $60/month ($50 annual) with 1,200/4,800/10,000 perspectives
2. Change Pro tier from $60/$50 to **$35/$30** per month
3. Set encryption defaults: Free/Plus OFF (allow training), Pro/Enterprise ON
4. Preserve existing bonus message system
5. Zero-disruption migration for existing users

---

## Current Implementation Analysis

### 1. Pricing Structure (From Codebase)

**Current Tiers** (as implemented):
```typescript
type SubscriptionTier = 'free' | 'plus' | 'pro'
```

| Tier | Monthly | Annual (per month) | Messages | Premium | Normal | Eco |
|------|---------|-------------------|----------|---------|---------|-----|
| Free | $0 | $0 | 200 | 10 | 40 | 150 |
| Plus | $25 | $20 | Unlimited | 400 | 1,600 | 4,000 |
| Pro | $60 | $50 | Unlimited | 1,200 | 4,800 | 10,000 |

**Note**: Pro pricing appears to be $60/$50 in current implementation but user wants it changed to $35/$30.

### 2. Database Tables

#### admin_tier_limits
**Purpose**: Store tier configuration (messages, perspectives limits)
**Managed**: Via admin UI (not in migrations)
**Current Rows**: free, plus, pro
**Columns**:
- `tier` (TEXT) - Primary key: 'free' | 'plus' | 'pro'
- `messages_per_month` (INTEGER) - NULL = unlimited
- `premium_perspectives_limit` (INTEGER)
- `normal_perspectives_limit` (INTEGER)
- `eco_perspectives_limit` (INTEGER)
- `created_at`, `updated_at`, `updated_by`

**Action Required**: Add new row for 'enterprise' tier

#### admin_pricing_config
**Purpose**: Store pricing configuration as JSON
**Structure**: Key-value pairs with config_key and config_value (JSONB)
**Current Keys**:
- `subscription_pricing` - Contains free_tier, plus_tier, pro_tier objects

**Current Pro Tier Config**:
```typescript
pro_tier: {
  name: 'Pro',
  price_cents_monthly: 6000,  // $60
  price_cents_annual: 5000,   // $50
  price_display_monthly: '$60',
  price_display_annual: '$50',
  stripe_price_id_monthly: 'price_xxx',
  stripe_price_id_annual: 'price_xxx',
  message_limit: null,
  features: [...]
}
```

**Action Required**:
1. Update pro_tier pricing to $35/$30
2. Add new enterprise_tier object

#### user_perspective_quotas
**Purpose**: Track user quotas and usage
**Columns**:
- `user_id` (UUID) - Primary key
- `plan_tier` (TEXT) - 'free' | 'plus' | 'pro'
- `messages_per_month` (INTEGER)
- `messages_used` (INTEGER)
- `premium_perspectives_limit` (INTEGER)
- `premium_perspectives_used` (INTEGER)
- `normal_perspectives_limit` (INTEGER)
- `normal_perspectives_used` (INTEGER)
- `eco_perspectives_limit` (INTEGER)
- `eco_perspectives_used` (INTEGER)
- `current_month_start` (DATE)
- `last_reset_date` (DATE)

**Action Required**: Update plan_tier to support 'enterprise' value

#### user_bonus_quotas (EXISTING - PRESERVE)
**Purpose**: Admin-granted bonus messages with expiration
**Status**: ✅ Fully working - DO NOT MODIFY
**Features**:
- Bonus messages separate from regular quota
- Expiration tracking
- FIFO deduction (oldest/expiring first)
- Types: admin_grant, referral_signup, referral_completion, promotion, other
- Admin can grant arbitrary bonuses to any user

**Key Functions** (`src/lib/bonus-manager.ts`):
- `grantBonus()` - Admin grants bonus to user
- `getAvailableBonusBalance()` - Get total available bonus
- `deductFromBonuses()` - FIFO deduction logic
- Used by quota-manager for message counting

**Integration Point**: Quota manager already checks bonus balance before blocking users

### 3. Backend Files Requiring Changes

#### Type Definitions (4 files found)
**Files with `'free' | 'plus' | 'pro'` type**:
1. `src/lib/quota-manager.ts:430` - `updateUserPlan()` function
2. `src/app/admin/tier-limits/page.tsx:21` - `TierLimits` interface
3. `src/app/dashboard/subscription/page.tsx:21` - `Subscription` interface
4. `src/app/dashboard/credits/page.tsx` - (need to read)

**Required Change**: Add `| 'enterprise'` to all type definitions

#### API Routes
1. **`src/app/api/subscription/upgrade/route.ts`**
   - Lines 49-61: Only handles 'plus' and 'pro' tiers
   - Needs to add 'enterprise' case
   - Maps tier → Stripe price ID

2. **`src/app/api/webhooks/stripe/route.ts`**
   - Line 276: Hardcoded `tier: 'pro' as const`
   - Does NOT differentiate between plus/pro/enterprise subscriptions
   - **CRITICAL**: Need to determine tier from Stripe price ID

3. **`src/app/api/pricing/config/route.ts`**
   - Reads from admin_pricing_config table
   - Should work automatically once database updated

#### Core Libraries
1. **`src/lib/quota-manager.ts`**
   - Line 430: `updateUserPlan(userId, newTier: 'free' | 'plus' | 'pro')`
   - Fetches limits from admin_tier_limits table dynamically
   - Should work automatically once table updated
   - **Change**: Update type signature to include 'enterprise'

2. **`src/lib/stripeConfig.ts`**
   - Currently defines outdated SUBSCRIPTION_PLANS
   - Only has one plan: 'pro' at $20/month (INCORRECT)
   - This file seems deprecated - pricing now in database
   - **Action**: Either update or remove if unused

### 4. Frontend Files Requiring Changes

#### Admin UI
1. **`src/app/admin/pricing/page.tsx`**
   - Lines 23-57: PricingConfig interface (free_tier, plus_tier, pro_tier)
   - Line 180: `updateSubscriptionPrice(tier: 'free_tier' | 'plus_tier' | 'pro_tier', ...)`
   - Lines 253-559: Renders 3-column grid for tiers
   - **Changes Needed**:
     - Add `enterprise_tier` to interface
     - Add 4th column in UI grid
     - Update Pro tier pricing displays
     - Add enterprise tier pricing fields

2. **`src/app/admin/tier-limits/page.tsx`**
   - Line 21: `tier: 'free' | 'plus' | 'pro'` interface
   - Lines 203-357: 3-column grid (Free $0, Plus $25, Pro $60)
   - **Changes Needed**:
     - Update type to include 'enterprise'
     - Add 4th column for enterprise tier
     - Update Pro badge from $60 to $35

3. **`src/app/admin/quotas/page.tsx`**
   - Shows individual user quota overrides
   - Uses plan_tier field
   - Should work automatically once type updated

#### Public Pages
1. **`src/app/pricing/page.tsx`**
   - Displays pricing to public users
   - Currently shows 3 tiers
   - **Changes Needed**:
     - Add 4th tier (Enterprise)
     - Update Pro pricing $60→$35
     - Update Pro annual $50→$30
     - Show enterprise at $60/$50

2. **`src/app/dashboard/subscription/page.tsx`**
   - Line 21: `tier: 'free' | 'plus' | 'pro'` interface
   - Line 163: `handleUpgrade(tier: 'plus' | 'pro' = 'plus', ...)`
   - **Changes Needed**:
     - Update type to include 'enterprise'
     - Add upgrade button for enterprise tier

---

## New Pricing Structure (User-Specified)

| Tier | Monthly | Annual (per month) | Annual (total) | Messages | Premium | Normal | Eco | Encryption Default |
|------|---------|-------------------|----------------|----------|---------|---------|-----|-------------------|
| Free | $0 | $0 | $0 | 200 | 10 | 40 | 150 | OFF (toggle ON) |
| Plus | $25 | $20 | $240 | Unlimited | 400 | 1,600 | 4,000 | OFF (toggle ON) |
| Pro | **$35** | **$30** | **$360** | Unlimited | 1,200 | 4,800 | 10,000 | **ON (toggle OFF)** |
| Enterprise | **$60** | **$50** | **$600** | Unlimited | **1,200** | **4,800** | **10,000** | **ON (toggle OFF)** |

**Key Changes from Current**:
- Pro pricing: $60/$50 → **$35/$30** (lower price, same quotas)
- New Enterprise tier: $60/$50 with same quotas as current Pro
- Enterprise has same quotas as Pro (per user correction)

---

## Encryption Integration (From MCP_ENCRYPTION_ANALYSIS.md)

### Current Encryption Status
**Chat Messages**: ✅ Already support encryption (`encrypted_content`, `encryption_metadata` columns)
**Provider API Keys**: ❌ **STORED IN PLAINTEXT** (security risk)
**CLI Credentials**: ❌ **STORED IN PLAINTEXT** (security risk)

### Encryption Tier Strategy

#### Tier 1 - CRITICAL (Mandatory for ALL users)
**Must be encrypted regardless of tier**:
- Provider API keys (`provider_credentials.api_key`)
- CLI credentials (`cli_credentials` table)
- **Recommendation**: Implement for all tiers before launch

#### Tier 2 - Per-Tier Defaults (User-Configurable)
**Chat message encryption defaults**:
- **Free/Plus**: Default OFF (allow training data usage), user can toggle ON
- **Pro/Enterprise**: Default ON (zero-knowledge), user can toggle OFF

### Implementation Approach
**Option B - Random Key + IndexedDB** (as documented):
1. Generate random 256-bit key on first encryption
2. Derive wrapping key from user password
3. Store encrypted key in IndexedDB
4. Server only stores ciphertext + metadata (zero-knowledge)

### User Preference Storage
```sql
ALTER TABLE users ADD COLUMN zero_knowledge_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN encryption_default_enabled BOOLEAN DEFAULT false;
```

**Logic**:
```typescript
// On user signup or tier change
if (tier === 'pro' || tier === 'enterprise') {
  user.encryption_default_enabled = true
} else {
  user.encryption_default_enabled = false
}
```

---

## Required Changes - Complete Checklist

### Phase 1: Database Schema Changes

#### 1.1 Add Enterprise Tier Limits
```sql
-- Add enterprise row to admin_tier_limits table
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
  NULL,  -- Unlimited messages
  1200,  -- Premium perspectives
  4800,  -- Normal perspectives
  10000, -- Eco perspectives
  NOW(),
  NOW()
);
```

#### 1.2 Update Admin Pricing Config
```sql
-- Fetch current subscription_pricing
SELECT config_value FROM admin_pricing_config
WHERE config_key = 'subscription_pricing';

-- Update pro_tier pricing (manual JSON edit or via admin UI)
-- Change: price_cents_monthly: 6000 → 3500
-- Change: price_cents_annual: 5000 → 3000
-- Change: price_display_monthly: '$60' → '$35'
-- Change: price_display_annual: '$50' → '$30'

-- Add enterprise_tier object
{
  "name": "Enterprise",
  "price_cents_monthly": 6000,
  "price_cents_annual": 5000,
  "price_display_monthly": "$60",
  "price_display_annual": "$50",
  "stripe_price_id_monthly": "price_<to_be_created>",
  "stripe_price_id_annual": "price_<to_be_created>",
  "message_limit": null,
  "features": [
    "Unlimited messages",
    "1,200 Premium perspectives/month",
    "4,800 Normal perspectives/month",
    "10,000 Eco perspectives/month",
    "Zero-knowledge encryption enabled",
    "Priority support",
    "Advanced analytics",
    "Custom integrations"
  ]
}
```

#### 1.3 Add Encryption Preference Columns
```sql
ALTER TABLE users
ADD COLUMN zero_knowledge_enabled BOOLEAN DEFAULT false,
ADD COLUMN encryption_default_enabled BOOLEAN DEFAULT false;

-- Set defaults based on current tier
UPDATE users u
SET encryption_default_enabled = true
FROM user_perspective_quotas upq
WHERE u.id = upq.user_id
  AND upq.plan_tier IN ('pro', 'enterprise');
```

### Phase 2: Stripe Configuration

#### 2.1 Create New Products/Prices in Stripe
**Action**: Create in Stripe Dashboard or via API

1. **Update Pro Plan Prices**:
   - Monthly: $35 → Create new price
   - Annual: $360/year ($30/month) → Create new price
   - Keep old prices active for existing subscribers

2. **Create Enterprise Plan Prices**:
   - Monthly: $60 → Create new price
   - Annual: $600/year ($50/month) → Create new price

3. **Record Price IDs**:
   - pro_monthly: `price_1NewProMonthlyID`
   - pro_annual: `price_1NewProAnnualID`
   - enterprise_monthly: `price_1EnterpriseMonthlyID`
   - enterprise_annual: `price_1EnterpriseAnnualID`

#### 2.2 Update Database with New Price IDs
```sql
-- Update subscription_pricing in admin_pricing_config
-- with new Stripe price IDs
```

### Phase 3: TypeScript Type Updates

**Files to Update**:
1. `src/lib/quota-manager.ts:430`
   ```typescript
   async updateUserPlan(
     userId: string,
     newTier: 'free' | 'plus' | 'pro' | 'enterprise'
   ): Promise<void>
   ```

2. `src/app/admin/tier-limits/page.tsx:21`
   ```typescript
   interface TierLimits {
     tier: 'free' | 'plus' | 'pro' | 'enterprise'
     // ... rest
   }
   ```

3. `src/app/dashboard/subscription/page.tsx:21`
   ```typescript
   interface Subscription {
     tier: 'free' | 'plus' | 'pro' | 'enterprise'
     // ... rest
   }
   ```

4. `src/app/dashboard/credits/page.tsx` - Add 'enterprise' to tier type

### Phase 4: Backend API Updates

#### 4.1 Subscription Upgrade Route
**File**: `src/app/api/subscription/upgrade/route.ts`

```typescript
// Lines 49-61: Add enterprise case
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
} else if (tier === 'enterprise') {
  priceId = interval === 'year'
    ? config.subscription_pricing.enterprise_tier.stripe_price_id_annual
    : config.subscription_pricing.enterprise_tier.stripe_price_id_monthly
  planKey = 'enterprise'
} else {
  return NextResponse.json({ error: 'Invalid tier specified' }, { status: 400 })
}
```

#### 4.2 Stripe Webhook Handler
**File**: `src/app/api/webhooks/stripe/route.ts`

**CRITICAL ISSUE**: Line 276 hardcodes `tier: 'pro'` for ALL subscriptions

**Fix**: Determine tier from Stripe price ID
```typescript
// In handleSubscriptionCreated() and handleSubscriptionChange()

// Get the price ID from subscription
const priceId = subscription.items.data[0]?.price.id

// Determine tier from price ID
let tier: 'plus' | 'pro' | 'enterprise' = 'plus'
if (priceId === config.subscription_pricing.pro_tier.stripe_price_id_monthly ||
    priceId === config.subscription_pricing.pro_tier.stripe_price_id_annual) {
  tier = 'pro'
} else if (priceId === config.subscription_pricing.enterprise_tier.stripe_price_id_monthly ||
           priceId === config.subscription_pricing.enterprise_tier.stripe_price_id_annual) {
  tier = 'enterprise'
} else {
  tier = 'plus'
}

// Use determined tier instead of hardcoded 'pro'
const subscriptionData = {
  user_id: userId,
  stripe_customer_id: subscription.customer as string,
  stripe_subscription_id: subscription.id,
  tier: tier,  // NOT hardcoded 'pro'
  status: subscription.status as any,
  // ... rest
}
```

### Phase 5: Frontend Admin UI Updates

#### 5.1 Admin Pricing Page
**File**: `src/app/admin/pricing/page.tsx`

1. **Update Interface** (Lines 23-57):
   ```typescript
   interface PricingConfig {
     subscription_pricing: {
       free_tier: { ... }
       plus_tier: { ... }
       pro_tier: { ... }
       enterprise_tier: {  // ADD THIS
         name: string
         price_cents_monthly: number
         price_cents_annual: number
         price_display_monthly: string
         price_display_annual: string
         stripe_price_id_monthly: string
         stripe_price_id_annual: string
         message_limit: number | null
         features: string[]
       }
     }
   }
   ```

2. **Update Function Signature** (Line 180):
   ```typescript
   const updateSubscriptionPrice = (
     tier: 'free_tier' | 'plus_tier' | 'pro_tier' | 'enterprise_tier',
     field: string,
     value: any
   ) => { ... }
   ```

3. **Update UI Grid** (Lines 253-559):
   - Change from `grid-cols-1 lg:grid-cols-3` to `grid-cols-1 lg:grid-cols-4`
   - Add 4th Card for Enterprise tier
   - Update Pro tier badges: $60 → $35, $50 → $30

#### 5.2 Admin Tier Limits Page
**File**: `src/app/admin/tier-limits/page.tsx`

1. **Update Interface** (Line 21):
   ```typescript
   interface TierLimits {
     tier: 'free' | 'plus' | 'pro' | 'enterprise'
     // ... rest
   }
   ```

2. **Update Grid** (Lines 203-357):
   - Change from `grid-cols-1 lg:grid-cols-3` to `grid-cols-1 lg:grid-cols-4`
   - Update Pro badge: $60 → $35
   - Add Enterprise card with $60 badge

#### 5.3 Public Pricing Page
**File**: `src/app/pricing/page.tsx`

1. **Add 4th Tier to Plans Array**:
   ```typescript
   const plans = [
     { name: 'Free', price: '$0', period: 'forever', ... },
     { name: 'Plus', price: '$25', period: '/month', annualPrice: '$20', ... },
     { name: 'Pro', price: '$35', period: '/month', annualPrice: '$30', highlighted: true },
     {
       name: 'Enterprise',
       price: '$60',
       period: '/month',
       annualPrice: '$50',
       perspectives: { premium: 1200, normal: 4800, eco: 10000 },
       features: [
         'Everything in Pro',
         'Zero-knowledge encryption',
         'Priority support',
         'Advanced analytics',
         'Custom integrations'
       ]
     }
   ]
   ```

2. **Update Features**:
   - Ensure Pro shows updated pricing
   - Highlight encryption differences

#### 5.4 User Subscription Dashboard
**File**: `src/app/dashboard/subscription/page.tsx`

1. **Update Interface** (Line 21):
   ```typescript
   interface Subscription {
     tier: 'free' | 'plus' | 'pro' | 'enterprise'
     // ... rest
   }
   ```

2. **Add Enterprise Upgrade Option** (Line 163):
   ```typescript
   const handleUpgrade = useCallback(async (
     tier: 'plus' | 'pro' | 'enterprise' = 'plus',
     interval: 'month' | 'year' = 'month'
   ) => { ... }, [])
   ```

---

## Migration Strategy - Zero Disruption

### Existing Users

#### Plus Subscribers ($25/month or $20/month annual)
- **No Change**: Keep existing subscription unchanged
- Pricing stays same
- Quotas stay same
- No action required

#### Pro Subscribers ($60/month or $50/month annual)
**Option A - Automatic Downgrade (Recommended)**:
- Detect Pro subscribers on old pricing
- Automatically migrate to new Pro tier ($35/$30)
- **Benefit**: Lower price, same quotas
- **Communication**: Email notification of price reduction

**Option B - Grandfather Clause**:
- Keep existing Pro users at $60/$50 pricing
- New subscribers get $35/$30 pricing
- Requires maintaining old price IDs in Stripe
- More complex

**User's Decision Needed**: Which option to use?

#### Free Users
- No change required
- Automatically get encryption toggle in dashboard

### New Signups
- See updated pricing page with 4 tiers
- Can subscribe to Plus ($25/$30), Pro ($35/$30), or Enterprise ($60/$50)
- Encryption defaults set based on tier

### Stripe Price Management
**Best Practice**: Don't delete old prices, mark as archived
- Keeps existing subscribers on old prices
- Prevents breaking active subscriptions
- Create new prices for new pricing

---

## Encryption Implementation Plan

### Phase 1: Database Preparation
```sql
-- Add encryption columns to critical tables
ALTER TABLE provider_credentials
ADD COLUMN encrypted_api_key TEXT,
ADD COLUMN encryption_metadata JSONB;

ALTER TABLE cli_credentials
ADD COLUMN encrypted_credentials TEXT,
ADD COLUMN encryption_metadata JSONB;

ALTER TABLE mcp_access_tokens
ADD COLUMN encrypted_token TEXT,
ADD COLUMN encryption_metadata JSONB;

-- Add user encryption preferences
ALTER TABLE users
ADD COLUMN zero_knowledge_enabled BOOLEAN DEFAULT false,
ADD COLUMN encryption_default_enabled BOOLEAN DEFAULT false;
```

### Phase 2: Crypto Library Enhancement
**File**: `src/lib/crypto/database-crypto.ts`

Add encryption helpers:
- `encryptProviderApiKey(apiKey: string): Promise<EncryptedData>`
- `decryptProviderApiKey(encrypted: EncryptedData): Promise<string>`
- `encryptCliCredentials(creds: any): Promise<EncryptedData>`
- `decryptCliCredentials(encrypted: EncryptedData): Promise<any>`

### Phase 3: API Route Updates
Update MCP routes to handle encrypted data:
- `/api/mcp/route.ts` - Decrypt API keys before calling LLM
- `/api/mcp/token/route.ts` - Encrypt tokens before storage
- Provider credentials UI - Encrypt on save

### Phase 4: Frontend Updates
1. **Encryption Toggle** in User Settings:
   ```typescript
   <Switch
     checked={user.zero_knowledge_enabled}
     onChange={handleToggleEncryption}
     label="Enable Zero-Knowledge Encryption"
     description={
       tier === 'pro' || tier === 'enterprise'
         ? "Recommended for your tier. Server cannot decrypt your data."
         : "Enable to prevent your data from being used for training."
     }
   />
   ```

2. **Automatic Migration Flow**:
   - When user enables encryption first time
   - Fetch existing plaintext data
   - Encrypt with master key
   - Upload encrypted version
   - Delete plaintext (or keep for rollback period)

---

## Testing Checklist

### Database Tests
- [ ] Enterprise tier row added to admin_tier_limits
- [ ] Pricing config updated with enterprise_tier
- [ ] Pro tier pricing updated correctly
- [ ] Encryption columns added
- [ ] User preferences columns added

### Stripe Tests
- [ ] New Pro prices created ($35/$30)
- [ ] Enterprise prices created ($60/$50)
- [ ] Old Pro prices still work for existing subscribers
- [ ] Webhook correctly identifies tier from price ID

### Backend Tests
- [ ] Subscription upgrade works for all 4 tiers
- [ ] Quota manager handles enterprise tier
- [ ] Webhook creates correct tier for each subscription
- [ ] Bonus system still works (unchanged)

### Frontend Tests
- [ ] Pricing page shows 4 tiers correctly
- [ ] Admin pricing UI shows 4 columns
- [ ] Admin tier limits shows 4 columns
- [ ] User dashboard shows correct tier
- [ ] Upgrade flow works for enterprise

### Encryption Tests
- [ ] Free/Plus users can toggle encryption ON
- [ ] Pro/Enterprise users can toggle encryption OFF
- [ ] API keys encrypted correctly
- [ ] Server cannot decrypt user data
- [ ] Migration from plaintext to encrypted works

---

## Rollback Plan

If issues arise:

1. **Database Rollback**:
   ```sql
   DELETE FROM admin_tier_limits WHERE tier = 'enterprise';
   -- Restore old pro_tier pricing in admin_pricing_config
   ```

2. **Stripe Rollback**:
   - Archive new prices
   - Revert to old price IDs in config

3. **Code Rollback**:
   - Git revert to previous commit
   - Deploy previous version

---

## Open Questions for User

1. **Existing Pro Subscribers ($60/$50)**:
   - Option A: Auto-migrate to new Pro ($35/$30) - saves them money?
   - Option B: Grandfather old pricing - more complex?

2. **Enterprise vs Pro Quotas**:
   - Confirmed both have same quotas (1,200/4,800/10,000)?
   - What differentiates Enterprise besides price?
   - Custom features? SLA? Support level?

3. **Encryption Rollout**:
   - Mandatory for Tier 1 (API keys) for ALL users?
   - Or phase in gradually?

4. **Timeline**:
   - When to implement?
   - Need Stripe products created first?
   - Can start with database/code changes?

---

## Next Steps

**Awaiting User Approval on**:
1. Confirm all pricing details correct
2. Decision on existing Pro subscriber migration
3. Clarify Enterprise tier differentiators
4. Approval to proceed with implementation

**Once Approved**:
1. Create Stripe products/prices
2. Execute database migrations
3. Deploy code changes
4. Test thoroughly in staging
5. Deploy to production
6. Monitor for issues

**Estimated Timeline**: 2-3 days for implementation + testing

---

## Files Modified Summary

### Database Migrations (New)
- `supabase/migrations/030_add_enterprise_tier.sql`
- `supabase/migrations/031_update_pro_pricing.sql`
- `supabase/migrations/032_add_encryption_preferences.sql`

### TypeScript Files (8 files)
1. `src/lib/quota-manager.ts` - Add 'enterprise' to type
2. `src/app/admin/tier-limits/page.tsx` - Add 'enterprise' + 4th column
3. `src/app/dashboard/subscription/page.tsx` - Add 'enterprise' to type
4. `src/app/dashboard/credits/page.tsx` - Add 'enterprise' to type
5. `src/app/admin/pricing/page.tsx` - Add enterprise_tier interface + UI
6. `src/app/pricing/page.tsx` - Add 4th tier display
7. `src/app/api/subscription/upgrade/route.ts` - Add enterprise case
8. `src/app/api/webhooks/stripe/route.ts` - Fix hardcoded tier logic

### New Files (Encryption)
- `src/lib/crypto/database-crypto.ts` - API key encryption helpers
- `src/components/EncryptionToggle.tsx` - UI component
- `src/hooks/useEncryptionMigration.ts` - Migration helper

### Total Files: ~11-15 modified/created

---

**End of Analysis Document**
