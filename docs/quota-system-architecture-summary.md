# Quota-Perspective System Architecture Summary

**Last Updated**: 2025-09-29
**Status**: Database Schema ✅ | Implementation In Progress ⚠️

---

## Executive Summary

Polydev uses a **perspective-based quota system** where users receive monthly allocations of "perspectives" (AI model responses) across three model tiers. This eliminates the need for users to provide their own API keys while maintaining predictable costs and transparent usage limits.

### Core Concept
- **Perspective** = One AI model response to a user prompt
- **Three Model Tiers**: Premium, Normal, Eco (different cost points)
- **Three User Plans**: Free, Plus ($25/mo), Pro ($60/mo)
- **Zero API Keys Required**: Admin manages provider keys, users just use the service

---

## Current Database Schema

### ✅ Implemented Tables

#### 1. `user_perspective_quotas`
Tracks monthly quota allocations and usage per user.

```sql
Columns:
- id (uuid)
- user_id (uuid) → profiles(id)
- plan_tier (text) → 'free', 'plus', 'pro'
- messages_per_month (integer) → NULL for unlimited
- premium_perspectives_limit (integer)
- normal_perspectives_limit (integer)
- eco_perspectives_limit (integer)
- current_month_start (date)
- messages_used (integer)
- premium_perspectives_used (integer)
- normal_perspectives_used (integer)
- eco_perspectives_used (integer)
- last_reset_date (date)
- created_at, updated_at (timestamptz)
```

**Current State**: 4 free users with OLD quota values
- ❌ Current: Premium=10, Normal=100, Eco=500
- ✅ Should be: Premium=10, Normal=50, Eco=150

#### 2. `model_tiers`
Defines model classifications, pricing, and routing strategies.

```sql
Columns:
- id (uuid)
- model_name (text) UNIQUE
- provider (text) → 'anthropic', 'openai', 'google', 'xai', 'cerebras', 'zai'
- tier (text) → 'premium', 'normal', 'eco'
- display_name (text)
- cost_per_1k_input (numeric)
- cost_per_1k_output (numeric)
- routing_strategy (text) → 'api_key', 'unlimited_account', 'mixed'
- active (boolean)
- created_at, updated_at (timestamptz)
```

**Current Active Models** (13 total):

**Premium Tier** (4 models):
- `gpt-5` (OpenAI): $2.00/$8.00 per 1K tokens
- `claude-sonnet-4-20250514` (Anthropic): $3.00/$15.00 per 1K tokens
- `gemini-2.5-pro` (Google): $1.25/$5.00 per 1K tokens
- `grok-4` (xAI): $1.50/$6.00 per 1K tokens

**Normal Tier** (6 models):
- `gpt-5-mini` (OpenAI): $0.15/$0.60 per 1K tokens
- `claude-3-5-haiku-20241022` (Anthropic): $0.25/$1.25 per 1K tokens
- `gemini-2.5-flash` (Google): $0.075/$0.30 per 1K tokens
- `grok-code-fast-1` (xAI): $0.10/$0.40 per 1K tokens
- `qwen-3-coder-480b` (Cerebras): $0.05/$0.20 per 1K tokens - **unlimited_account**
- `glm-4.5` (ZAI): $0.03/$0.12 per 1K tokens - **unlimited_account**

**Eco Tier** (3 models):
- `gpt-5-nano` (OpenAI): $0.075/$0.30 per 1K tokens
- `gemini-2.5-flash-lite` (Google): $0.0375/$0.15 per 1K tokens
- `grok-4-fast-reasoning` (xAI): $0.05/$0.20 per 1K tokens

#### 3. `perspective_usage`
Granular per-request usage tracking.

```sql
Columns:
- id (uuid)
- user_id (uuid) → profiles(id)
- session_id (text)
- model_name (text)
- model_tier (text) → 'premium', 'normal', 'eco'
- provider (text)
- provider_source_id (uuid) → References user_api_keys.id
- input_tokens (integer)
- output_tokens (integer)
- total_tokens (integer)
- estimated_cost (numeric)
- perspectives_deducted (integer) → Usually 1
- request_metadata (jsonb)
- response_metadata (jsonb)
- created_at (timestamptz)
```

**Purpose**:
- Track actual token usage and costs per request
- Link usage to specific admin API keys via `provider_source_id`
- Enable detailed cost analysis and provider performance monitoring

#### 4. `monthly_usage_summary`
Aggregated monthly statistics per user.

```sql
Columns:
- id (uuid)
- user_id (uuid) → profiles(id)
- month_year (text) → '2025-01', '2025-02', etc.
- plan_tier (text)
- total_messages (integer)
- premium_perspectives_used (integer)
- normal_perspectives_used (integer)
- eco_perspectives_used (integer)
- total_estimated_cost (numeric)
- premium_cost (numeric)
- normal_cost (numeric)
- eco_cost (numeric)
- created_at, updated_at (timestamptz)
- UNIQUE(user_id, month_year)
```

#### 5. `user_api_keys`
Admin-managed provider API keys with budget/rate limiting.

```sql
Columns:
- id (uuid)
- user_id (uuid) → Admin user ID (00000000-0000-0000-0000-000000000000)
- provider (text)
- key_name (text)
- encrypted_key (text)
- key_preview (text)
- monthly_budget (numeric) → NULL for unlimited
- daily_limit (numeric) → NULL for unlimited
- rate_limit_rpm (integer) → Requests per minute
- priority_order (integer) → Fallback order (lower = higher priority)
- current_usage (numeric) → Running monthly total
- daily_usage (numeric) → Running daily total
- active (boolean)
- last_used_at (timestamptz)
- created_at, updated_at (timestamptz)
```

**Purpose**:
- Ordered fallback mechanism for provider API keys
- Budget and rate limit enforcement per key
- Automatic selection of next available key when limits exceeded

---

## Corrected Quota Limits

### ❌ Current (WRONG) Values in Database
```
Free:  Premium: 10,  Normal: 100,  Eco: 500
Plus:  [Not Set]
Pro:   [Not Set]
```

### ✅ Correct Values (TO IMPLEMENT)

```
┌──────────┬─────────┬────────┬──────┬───────────────┐
│ Plan     │ Premium │ Normal │ Eco  │ Monthly Price │
├──────────┼─────────┼────────┼──────┼───────────────┤
│ Free     │    10   │   50   │ 150  │      $0       │
│ Plus     │   500   │ 2000   │ 4000 │     $25       │
│ Pro      │  1500   │ 6000   │  ∞   │     $60       │
└──────────┴─────────┴────────┴──────┴───────────────┘
```

**Messages Per Month**:
- Free: 200 messages
- Plus: Unlimited
- Pro: Unlimited

---

## Economic Model & Cost Analysis

### Average Cost Per Perspective

Based on actual pricing from `model_tiers` table:

**Premium Tier**:
- Avg input: $(2.00 + 3.00 + 1.25 + 1.50) / 4 = $1.9375 per 1K
- Avg output: $(8.00 + 15.00 + 5.00 + 6.00) / 4 = $8.50 per 1K
- **Estimated cost per perspective**: ~$0.042 (assuming 2K input, 2K output)

**Normal Tier**:
- Avg input (API key models): $0.1475 per 1K
- Avg output (API key models): $0.6375 per 1K
- **Estimated cost per perspective**: ~$0.008 (with unlimited accounts bringing cost down)

**Eco Tier**:
- Avg input: $0.0542 per 1K
- Avg output: $0.2167 per 1K
- **Estimated cost per perspective**: ~$0.0027

### User Tier Cost Projection

**Free Tier** (200 messages, 10/50/150 perspectives):
- Premium: 10 × $0.042 = $0.42
- Normal: 50 × $0.008 = $0.40
- Eco: 150 × $0.0027 = $0.41
- **Total cost per free user**: ~$1.23/month

**Plus Tier** ($25/month, 500/2000/4000 perspectives):
- Premium: 500 × $0.042 = $21.00
- Normal: 2000 × $0.008 = $16.00
- Eco: 4000 × $0.0027 = $10.80
- **Total cost per plus user**: ~$47.80/month
- **Gross margin**: NEGATIVE ($25 revenue - $47.80 cost = -$22.80)
- ⚠️ **ISSUE**: Plus tier is unprofitable at full usage

**Pro Tier** ($60/month, 1500/6000/∞ perspectives):
- Premium: 1500 × $0.042 = $63.00
- Normal: 6000 × $0.008 = $48.00
- Eco: Unlimited (average usage ~10K) = ~$27.00
- **Total cost per pro user**: ~$138.00/month at heavy usage
- **Gross margin**: NEGATIVE ($60 revenue - $138.00 cost = -$78.00)
- ⚠️ **CRITICAL ISSUE**: Pro tier is unprofitable at full usage

### Optimization Strategies

1. **Leverage Unlimited Accounts** (Qwen3, GLM):
   - Route normal/eco requests to unlimited accounts when possible
   - Can reduce normal tier cost from $0.008 to ~$0.001 per perspective

2. **Dynamic Model Selection**:
   - Default to lowest-cost model in each tier
   - Offer "premium model selection" as paid add-on

3. **Usage Pattern Analysis**:
   - Most users don't hit limits (typically 20-30% utilization)
   - Adjust based on actual 90th percentile usage

4. **Tier Pricing Adjustment Options**:
   - Plus: $35-40/month (increase by 40-60%)
   - Pro: $80-100/month (increase by 33-66%)
   - OR reduce perspective limits by 30-40%

---

## Provider Routing Strategy

### Current Routing Mechanisms

#### 1. API Key Routing (Premium & most Normal/Eco)
```typescript
Flow:
1. User requests perspective with model
2. Check user quota availability
3. Query user_api_keys table:
   - WHERE provider = {model_provider}
   - AND active = true
   - ORDER BY priority_order ASC
4. For each key (in priority order):
   - Check monthly_budget vs current_usage
   - Check daily_limit vs daily_usage
   - Check rate_limit_rpm
   - If available → use key
   - If exceeded → try next key
5. If all keys exhausted → return 429 Too Many Requests
6. Record usage in perspective_usage with provider_source_id
7. Update user_api_keys usage counters
8. Deduct from user_perspective_quotas
```

#### 2. Unlimited Account Routing (Qwen3, GLM)
```typescript
Flow:
1. Route to dedicated unlimited account pool
2. No per-request API key needed
3. Session-based authentication
4. Much lower cost per request
5. Higher daily limits (50K-60K per account)
```

### Provider Pool Management

**Current Admin Keys** (via `/admin/providers`):
- Each provider can have multiple API keys
- Keys have priority ordering (1 = highest priority)
- Automatic fallback to next key when limits exceeded
- Budget/rate limit tracking per key
- Edit/toggle/delete capabilities in admin UI

---

## API Integration Points

### Required API Changes

#### 1. Main Chat Endpoint (`/api/chat/route.ts`)

**Current Flow**:
```typescript
POST /api/chat
→ User authentication
→ Model selection
→ Direct provider API call
→ Stream response
```

**Required New Flow**:
```typescript
POST /api/chat
→ User authentication
→ Model selection
→ ✅ Check quota availability (QuotaManager.checkQuota)
→ ✅ Get next available provider key (ProviderRouter.getKey)
→ Provider API call with selected key
→ ✅ Track usage (perspective_usage insert)
→ ✅ Update quota counters (user_perspective_quotas)
→ ✅ Update key usage (user_api_keys)
→ Stream response
```

#### 2. Quota Check API (`/api/quota/check`)

```typescript
GET /api/quota/check
Response:
{
  plan_tier: "free",
  premium: { used: 5, limit: 10, remaining: 5 },
  normal: { used: 23, limit: 50, remaining: 27 },
  eco: { used: 89, limit: 150, remaining: 61 },
  messages: { used: 117, limit: 200, remaining: 83 },
  reset_date: "2025-10-01"
}
```

#### 3. Admin Analytics API (`/api/admin/analytics/usage`)

```typescript
GET /api/admin/analytics/usage?period=month
Response:
{
  total_users: 4,
  by_tier: {
    free: { count: 4, avg_cost: 1.23 },
    plus: { count: 0, avg_cost: 0 },
    pro: { count: 0, avg_cost: 0 }
  },
  total_perspectives: 0,
  total_cost: 4.92,
  by_model_tier: {
    premium: { count: 0, cost: 0 },
    normal: { count: 0, cost: 0 },
    eco: { count: 0, cost: 0 }
  }
}
```

---

## Critical Implementation Tasks

### Phase 1: Database Updates (URGENT)
- [ ] Update all free user quotas: Normal 100→50, Eco 500→150
- [ ] Create Plus tier quota records (500/2000/4000)
- [ ] Create Pro tier quota records (1500/6000/NULL for unlimited)
- [ ] Add indexes on user_id, plan_tier in quota tables

### Phase 2: Core Services
- [ ] Implement QuotaManager service
  - `checkQuotaAvailability(userId, modelName)`
  - `deductQuota(userId, modelName, tokensUsed)`
  - `resetMonthlyQuotas()` (cron job)
- [ ] Implement ProviderRouter service
  - `getNextAvailableKey(provider, modelName)`
  - `updateKeyUsage(keyId, tokensUsed, cost)`
- [ ] Implement ModelTierManager service
  - `getModelInfo(modelName)` → tier, cost, routing

### Phase 3: API Integration
- [ ] Update `/api/chat/route.ts` with quota checks
- [ ] Create `/api/quota/check` endpoint
- [ ] Create `/api/admin/analytics/usage` endpoint
- [ ] Add quota enforcement middleware

### Phase 4: Admin UI
- [ ] Create `/admin/quotas` page
  - View all users' quota status
  - Manually adjust user quotas
  - Reset usage counters
- [ ] Create `/admin/analytics/perspectives` page
  - Cost breakdown by tier
  - Provider key utilization
  - User tier distribution
  - Monthly cost projections
- [ ] Add quota warnings to provider key management

### Phase 5: User-Facing UI
- [ ] Add quota display to dashboard
- [ ] Show remaining perspectives per tier
- [ ] Upgrade prompts when limits approached
- [ ] Quota reset countdown timer

---

## Known Issues & Risks

### 🚨 Critical Issues

1. **Unprofitable Pricing** (URGENT)
   - Plus tier: $25 revenue vs $47.80 cost at full usage
   - Pro tier: $60 revenue vs $138.00 cost at full usage
   - **Action Required**: Either increase prices or reduce quotas

2. **No Quota Enforcement** (BLOCKING)
   - Users can currently make unlimited requests
   - No quota checks in API layer
   - **Action Required**: Implement QuotaManager immediately

3. **Wrong Default Quotas** (DATA ISSUE)
   - All 4 free users have incorrect limits
   - **Action Required**: Run UPDATE queries to fix

### ⚠️ Medium Priority Issues

4. **Provider Key Exhaustion**
   - No monitoring for when all keys hit limits
   - No alerts for admin when capacity low
   - **Action Required**: Add monitoring dashboard

5. **Cost Tracking Accuracy**
   - Estimated costs may not match actual API bills
   - No reconciliation process with provider invoices
   - **Action Required**: Build reconciliation tool

6. **Unlimited Account Management**
   - No automated account provisioning for Qwen3/GLM
   - Manual setup required for each account
   - **Action Required**: Document account creation process

### ℹ️ Low Priority Issues

7. **Monthly Reset Timing**
   - No automated cron job for quota resets
   - Requires manual intervention at month end
   - **Action Required**: Set up scheduled task

8. **Usage Analytics Lag**
   - `monthly_usage_summary` not auto-populated
   - Admin must manually aggregate data
   - **Action Required**: Create aggregation function

---

## Next Steps (Prioritized)

### Week 1: Emergency Fixes
1. ✅ Fix free user quota limits (UPDATE queries)
2. ✅ Implement basic quota check in `/api/chat`
3. ⚠️ Review and adjust tier pricing OR quota limits
4. ⚠️ Add "quota exceeded" error handling

### Week 2: Core Infrastructure
5. ⏳ Build QuotaManager service (full implementation)
6. ⏳ Build ProviderRouter service (key selection logic)
7. ⏳ Create `/api/quota/check` endpoint
8. ⏳ Add usage tracking to all API calls

### Week 3: Admin Tools
9. ⏳ Build `/admin/quotas` management page
10. ⏳ Build `/admin/analytics/perspectives` page
11. ⏳ Add provider key health monitoring
12. ⏳ Create cost projection dashboard

### Week 4: User Experience
13. ⏳ Add quota display to user dashboard
14. ⏳ Implement upgrade prompts/modals
15. ⏳ Add email notifications for quota limits
16. ⏳ Create usage history page for users

### Week 5: Optimization
17. ⏳ Implement unlimited account routing
18. ⏳ Build cost reconciliation tool
19. ⏳ Add A/B testing for pricing
20. ⏳ Create automated quota reset cron job

---

## Technical Debt & Future Enhancements

### Short Term (1-2 months)
- Implement proper rate limiting per user
- Add request queueing for high-traffic periods
- Build comprehensive error tracking
- Create user usage analytics dashboard

### Medium Term (3-6 months)
- Add perspective "rollover" (unused quotas carry forward)
- Implement "boost" purchases (buy extra perspectives)
- Create enterprise tier with custom quotas
- Add model preference settings per user

### Long Term (6-12 months)
- Build ML model for cost prediction
- Implement dynamic pricing based on provider costs
- Add usage-based billing for overages
- Create white-label solution for resellers

---

## Monitoring & Alerts

### Key Metrics to Track

1. **User Metrics**
   - Quota utilization rate by tier
   - Upgrade conversion rate (free → plus → pro)
   - Churn rate by tier
   - Average perspectives per user per day

2. **Cost Metrics**
   - Cost per perspective by tier
   - Gross margin by user tier
   - Provider cost variance vs. budgeted
   - Key exhaustion frequency

3. **Performance Metrics**
   - API response time (quota check overhead)
   - Provider API latency by provider
   - Key rotation frequency
   - Quota check cache hit rate

### Alert Thresholds

- 🚨 Any provider all keys exhausted
- ⚠️ User tier gross margin < 20%
- ⚠️ Individual key usage > 90% of budget
- ℹ️ Free user quota utilization > 80%
- ℹ️ Monthly cost variance > 15% vs. forecast

---

## Conclusion

The quota-perspective system is **architecturally sound** with proper database schema and multi-tier model classification. However, **critical implementation gaps** exist:

1. ❌ **No quota enforcement** in API layer
2. ❌ **Unprofitable pricing** at current limits
3. ❌ **Incorrect default quotas** for free users
4. ⚠️ **Missing admin analytics** for cost monitoring

**Immediate Action Required**:
1. Fix free user quota limits (10/50/150)
2. Implement quota checks in `/api/chat`
3. Decide on pricing adjustment or quota reduction
4. Build basic admin analytics dashboard

**Timeline to Production-Ready**: 4-5 weeks with dedicated focus.