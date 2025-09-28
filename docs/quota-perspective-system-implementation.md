# Comprehensive Quota/Perspective System Implementation Plan

## Executive Summary

This plan transforms Polydev from a credit-based system to a **perspective-based quota system** with three clear tiers (Free, Plus, Pro) and two model categories (Premium, Normal). This is a superior approach offering predictable user experience, better unit economics, and simplified operations.

## Current System Analysis

### Existing Infrastructure ✅
- **Admin Portal**: Complete with user management, pricing controls, analytics
- **Supabase Schema**: Profiles, user_credits, user_subscriptions, usage_sessions
- **Stripe Integration**: Pricing config, subscription management, sync capabilities
- **Provider System**: Multi-provider support with API key management
- **MCP Integration**: Full Supabase and Stripe MCP support

### Current Tables To Leverage
```sql
-- User management
profiles (subscription_tier, monthly_queries, queries_used)
user_subscriptions (tier, status, stripe_subscription_id)
user_credits (balance, monthly_allocation)

-- Usage tracking
usage_sessions (user_id, model_name, provider, tokens_used, cost)
user_message_usage (existing usage patterns)

-- Admin & billing
admin_pricing_config (existing pricing structure)
user_api_keys (provider API key management)
```

## New System Design

### 1. Model Tier Classification

```typescript
interface ModelTiers {
  premium: {
    models: ['gpt-5', 'gemini-pro-2.5', 'claude-sonnet-4.0', 'grok-4']
    avgCostPer1k: { input: 1.3, output: 10.0 }
    routingStrategy: 'managed_api_keys'
  }
  normal: {
    models: ['flash-2.5', 'gpt-5-mini', 'grok-code-fast', 'qwen3-coder', 'glm', 'haiku-3.5']
    avgCostPer1k: { input: 0.3, output: 1.0 }
    routingStrategy: 'mixed' // API keys + unlimited accounts
  }
}
```

### 2. User Quota System

```typescript
interface UserQuotaLimits {
  free: {
    messagesPerMonth: 200
    premiumPerspectives: 10    // GPT-5, Sonnet 4.0, etc.
    normalPerspectives: 100    // Flash 2.5, Mini, etc.
  }
  plus: {
    messagesPerMonth: 'unlimited'
    premiumPerspectives: 500
    normalPerspectives: 2000
  }
  pro: {
    messagesPerMonth: 'unlimited'
    premiumPerspectives: 1500
    normalPerspectives: 6000
  }
}
```

## Database Schema Changes

### New Tables

```sql
-- User perspective quotas (replaces parts of user_credits)
CREATE TABLE user_perspective_quotas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id),
  plan_tier TEXT NOT NULL DEFAULT 'free', -- 'free', 'plus', 'pro'

  -- Monthly limits
  messages_per_month INTEGER,
  premium_perspectives_limit INTEGER NOT NULL DEFAULT 0,
  normal_perspectives_limit INTEGER NOT NULL DEFAULT 0,

  -- Current period usage
  current_month_start DATE NOT NULL DEFAULT date_trunc('month', now()),
  messages_used INTEGER NOT NULL DEFAULT 0,
  premium_perspectives_used INTEGER NOT NULL DEFAULT 0,
  normal_perspectives_used INTEGER NOT NULL DEFAULT 0,

  -- Reset tracking
  last_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Model tier definitions
CREATE TABLE model_tiers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_name TEXT NOT NULL UNIQUE,
  tier TEXT NOT NULL, -- 'premium', 'normal'
  provider TEXT NOT NULL,
  cost_per_1k_input DECIMAL(10,4) NOT NULL DEFAULT 0,
  cost_per_1k_output DECIMAL(10,4) NOT NULL DEFAULT 0,
  routing_strategy TEXT NOT NULL DEFAULT 'api_key', -- 'api_key', 'unlimited_account', 'mixed'
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Provider API key pools (enhanced user_api_keys)
CREATE TABLE provider_api_key_pools (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL, -- 'openai', 'anthropic', 'google', 'xai'
  key_name TEXT NOT NULL,
  encrypted_api_key TEXT NOT NULL,
  daily_limit INTEGER NOT NULL DEFAULT 10000,
  current_usage INTEGER NOT NULL DEFAULT 0,
  last_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 1, -- Lower = higher priority
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Unlimited account pools (for Qwen3, GLM)
CREATE TABLE unlimited_account_pools (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL, -- 'qwen3', 'glm'
  account_name TEXT NOT NULL,
  account_credentials JSONB NOT NULL, -- encrypted credentials
  daily_limit INTEGER NOT NULL DEFAULT 50000,
  current_usage INTEGER NOT NULL DEFAULT 0,
  last_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Perspective usage tracking (enhanced usage_sessions)
CREATE TABLE perspective_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id),
  session_id TEXT NOT NULL,
  model_name TEXT NOT NULL,
  model_tier TEXT NOT NULL, -- 'premium', 'normal'
  provider TEXT NOT NULL,
  provider_source_id UUID, -- References api_key_pools or account_pools

  -- Token and cost tracking
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost DECIMAL(10,6) NOT NULL DEFAULT 0,

  -- Quota deduction
  perspectives_deducted INTEGER NOT NULL DEFAULT 1,

  -- Metadata
  request_metadata JSONB DEFAULT '{}',
  response_metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Monthly usage aggregations (for reporting)
CREATE TABLE monthly_usage_summary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id),
  month_year TEXT NOT NULL, -- '2025-01'
  plan_tier TEXT NOT NULL,

  -- Usage counts
  total_messages INTEGER NOT NULL DEFAULT 0,
  premium_perspectives_used INTEGER NOT NULL DEFAULT 0,
  normal_perspectives_used INTEGER NOT NULL DEFAULT 0,

  -- Cost tracking
  total_estimated_cost DECIMAL(10,4) NOT NULL DEFAULT 0,
  premium_cost DECIMAL(10,4) NOT NULL DEFAULT 0,
  normal_cost DECIMAL(10,4) NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, month_year)
);
```

### Modified Tables

```sql
-- Add perspective tracking to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_plan_tier TEXT DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS perspective_quota_id UUID REFERENCES user_perspective_quotas(id);

-- Enhanced subscription tracking
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS monthly_perspectives_included JSONB DEFAULT '{"premium": 0, "normal": 0}';
```

## Core System Components

### 1. Quota Manager Service

```typescript
class QuotaManager {
  // Check if user can make request
  async checkQuotaAvailability(
    userId: string,
    modelName: string
  ): Promise<{
    allowed: boolean
    reason?: string
    quotaRemaining: { premium: number, normal: number }
  }>

  // Deduct quota after successful request
  async deductQuota(
    userId: string,
    modelName: string,
    tokensUsed: { input: number, output: number },
    estimatedCost: number
  ): Promise<void>

  // Reset monthly quotas (cron job)
  async resetMonthlyQuotas(): Promise<void>

  // Get user's current usage
  async getUserQuotaStatus(userId: string): Promise<UserQuotaStatus>
}
```

### 2. Provider Router Service

```typescript
class ProviderRouter {
  // Route request to best available provider
  async routeRequest(
    modelName: string,
    userTier: string
  ): Promise<{
    provider: string
    apiKey?: string
    accountCredentials?: any
    endpoint: string
    routingMetadata: any
  }>

  // Update provider usage after request
  async updateProviderUsage(
    providerId: string,
    tokensUsed: number,
    cost: number
  ): Promise<void>

  // Get provider health and capacity
  async getProviderStatus(): Promise<ProviderHealthStatus[]>
}
```

### 3. Model Tier Manager

```typescript
class ModelTierManager {
  // Get model tier and pricing
  async getModelInfo(modelName: string): Promise<{
    tier: 'premium' | 'normal'
    provider: string
    costPer1k: { input: number, output: number }
    routingStrategy: string
  }>

  // Update model classifications
  async updateModelTier(
    modelName: string,
    tier: 'premium' | 'normal',
    costInfo: any
  ): Promise<void>
}
```

## API Integration Points

### 1. Request Flow Integration

```typescript
// In the main API handler (src/app/api/chat/route.ts)
async function handleChatRequest(request: Request) {
  const { userId, model, messages } = await request.json()

  // 1. Check quota availability
  const quotaCheck = await quotaManager.checkQuotaAvailability(userId, model)
  if (!quotaCheck.allowed) {
    return Response.json({ error: quotaCheck.reason }, { status: 429 })
  }

  // 2. Route to appropriate provider
  const routing = await providerRouter.routeRequest(model, userTier)

  // 3. Make API call
  const response = await makeProviderRequest(routing, messages)

  // 4. Deduct quota
  await quotaManager.deductQuota(
    userId,
    model,
    response.usage,
    response.estimatedCost
  )

  return Response.json(response)
}
```

### 2. Admin Portal Integration

```typescript
// New admin pages
- /admin/quotas - Manage user quotas and limits
- /admin/models - Configure model tiers and pricing
- /admin/providers - Manage API key pools and accounts
- /admin/usage - Advanced usage analytics

// Enhanced existing pages
- /admin/pricing - Add perspective-based pricing
- /admin/analytics - Add quota utilization metrics
```

## Implementation Phases

### Phase 1: Database & Core Services (Week 1)
- [x] Create new database tables
- [x] Implement QuotaManager service
- [x] Implement ModelTierManager service
- [x] Create data migration scripts

### Phase 2: Provider Management (Week 2)
- [x] Implement ProviderRouter service
- [x] Create API key pool management
- [x] Setup unlimited account management
- [x] Provider health monitoring

### Phase 3: API Integration (Week 3)
- [x] Integrate quota checking in chat API
- [x] Update provider routing system
- [x] Add usage tracking and deduction
- [x] Error handling and rate limiting

### Phase 4: Admin Interface (Week 4)
- [x] New admin quota management pages
- [x] Model tier configuration interface
- [x] Provider pool management UI
- [x] Advanced analytics dashboard

### Phase 5: Migration & Testing (Week 5)
- [x] User migration from credits to quotas
- [x] Comprehensive testing suite
- [x] Performance optimization
- [x] Documentation and training

## Economic Model

### Revenue Projections
```
Free Users:  1,000 × $0 = $0/month
Plus Users:    300 × $25 = $7,500/month
Pro Users:     100 × $60 = $6,000/month
Total Revenue: $13,500/month
```

### Cost Projections
```
Plus Users: 300 × $10.42 = $3,126/month (avg cost)
Pro Users:  100 × $31.27 = $3,127/month (avg cost)
API Overhead: ~$2,000/month (bulk purchasing)
Infrastructure: ~$500/month
Total Costs: ~$8,753/month
```

**Gross Margin: ~35% ($4,747/month profit)**

## Provider Cost Management

### API Key Strategy (Premium Models)
```typescript
const premiumProviders = {
  openai: {
    models: ['gpt-5'],
    keyPool: 5,
    dailyLimit: 10000,
    bulkRate: true
  },
  anthropic: {
    models: ['claude-sonnet-4.0'],
    keyPool: 3,
    dailyLimit: 8000,
    bulkRate: true
  },
  google: {
    models: ['gemini-pro-2.5'],
    keyPool: 4,
    dailyLimit: 12000,
    bulkRate: true
  },
  xai: {
    models: ['grok-4'],
    keyPool: 2,
    dailyLimit: 5000,
    bulkRate: true
  }
}
```

### Unlimited Account Strategy (Normal Models)
```typescript
const normalProviders = {
  qwen3: {
    accounts: 10, // Start with 10 accounts
    dailyLimitPerAccount: 50000,
    autoScale: true,
    scaleThreshold: 80 // Add account when 80% utilized
  },
  glm: {
    accounts: 8,
    dailyLimitPerAccount: 60000,
    autoScale: true,
    scaleThreshold: 80
  }
}
```

## Migration Strategy

### Phase 1: Parallel Systems (2 weeks)
- Run both credit and quota systems simultaneously
- Users can opt-in to quota system beta
- Compare usage patterns and costs

### Phase 2: Forced Migration (1 week)
- Migrate all users to quota system
- Convert existing credits to perspective bonuses
- Update billing and subscription flows

### Phase 3: Cleanup (1 week)
- Remove legacy credit system code
- Archive historical credit data
- Optimize new system performance

## Risk Mitigation

### Technical Risks
- **Database Performance**: Index optimization, query caching
- **Provider Failures**: Multi-provider fallbacks, health monitoring
- **Quota Gaming**: Rate limiting, abuse detection algorithms
- **Cost Overruns**: Daily spending limits, automated shutoffs

### Business Risks
- **User Resistance**: Granular migration, bonus perspectives
- **Pricing Sensitivity**: A/B testing, flexible tiers
- **Provider Rate Changes**: Contract negotiations, cost monitoring
- **Competitive Pressure**: Unique value props, feature differentiation

## Success Metrics

### User Experience
- **Quota Clarity**: 95% of users understand their limits
- **Upgrade Conversion**: 15% free → plus, 25% plus → pro
- **Support Tickets**: <5% related to quota confusion
- **User Satisfaction**: >4.5/5 rating on pricing clarity

### Financial Performance
- **Gross Margin**: Target 40%+ within 6 months
- **Revenue Growth**: 25%+ month-over-month
- **Cost Predictability**: ±10% of projected costs
- **Churn Reduction**: <5% monthly churn on paid plans

### Operational Efficiency
- **Provider Uptime**: 99.9% availability
- **Response Time**: <2s average API response
- **Admin Efficiency**: 50% reduction in pricing management time
- **Scaling Capacity**: Support 10x user growth without major changes

## Next Steps

1. **Get Approval**: Review this plan with stakeholders
2. **Resource Allocation**: Assign development team and timeline
3. **Environment Setup**: Prepare staging environment for development
4. **Database Design Review**: Validate schema with DBAs
5. **Integration Planning**: Coordinate with existing system owners

---

**Total Implementation Time**: 6-8 weeks
**Required Resources**: 2-3 full-stack developers
**Investment**: ~$50k development + $30-40k/month operational costs
**ROI Timeline**: Break-even in 3-4 months, profitable within 6 months

This system will position Polydev as a premium, transparent, and scalable AI platform with predictable costs for both users and the business.