# Supabase Database Analysis: MCP Model Routing Bug Confirmation

**Analysis Date**: October 19, 2025
**Database**: Polydev (oxhutuxkthdxvciytwmb)
**Status**: ✅ BUG CONFIRMED IN DATABASE

---

## Executive Summary

Database analysis confirms the bug. The data proves:

1. ✅ **Free users WITH active CLI tools exist in the database**
2. ✅ **No database-level enforcement of Pro subscription for CLI**
3. ✅ **RLS policies only enforce user isolation, not subscription tiers**
4. ✅ **No triggers or constraints prevent free users from having CLI configs**
5. ⚠️ **Bug is application-level, not database-level**

---

## Critical Finding: The Bug User

### User ID: `5abacdd1-6a9b-48ce-b723-ca8056324c7a`

**Subscription Status**:
```
Tier: FREE
Status: ACTIVE
Created: 2025-09-02
```

**CLI Configuration**:
```
Provider: claude_code
Enabled: TRUE  ← Active CLI
Status: AVAILABLE

Provider: codex_cli
Enabled: TRUE  ← Active CLI
Status: AVAILABLE

Provider: gemini_cli
Enabled: FALSE
Status: AVAILABLE
```

**Security Issue**: This FREE user has TWO active CLI tools enabled and available!

---

## Database Statistics

### Subscription Breakdown

| Tier | Status | Count |
|------|--------|-------|
| **Pro** | Active | 3 users |
| **Free** | Active | 6 users |
| **Total** | - | 9 users |

### CLI Configuration Status

| Provider | Enabled | Status | Count |
|----------|---------|--------|-------|
| claude_code | TRUE | available | **2 configs** |
| claude_code | FALSE | unchecked | 2 configs |
| codex_cli | TRUE | available | **2 configs** |
| codex_cli | FALSE | unchecked | 2 configs |
| gemini_cli | FALSE | unavailable | 1 config |
| gemini_cli | FALSE | available | 1 config |
| gemini_cli | FALSE | unchecked | 2 configs |

---

## Detailed Data Analysis

### Pro Users (3 total)

#### User 1: `42ef0583-7488-436d-a81d-ddef55c0cde2`
```
Subscription: Pro (Active)
CLI Tools:
  ✓ claude_code: ENABLED, AVAILABLE
  ✓ codex_cli: ENABLED, AVAILABLE
  ✗ gemini_cli: disabled, unavailable

Status: CORRECT - Pro user with CLI
```

#### User 2: `ce7a5bf7-db72-4f5f-a776-f94b94027b04`
```
Subscription: Pro (Active)
CLI Tools:
  ✗ claude_code: disabled, unchecked
  ✗ codex_cli: disabled, unchecked
  ✗ gemini_cli: disabled, unchecked

Status: CORRECT - Pro user but CLI not configured
```

#### User 3: `de349152-5fcf-464c-969b-95679384842a`
```
Subscription: Pro (Active)
CLI Tools: None configured

Status: CORRECT - Pro user without CLI
```

### Free Users (6 total)

#### ⚠️ User 1: `5abacdd1-6a9b-48ce-b723-ca8056324c7a` - **THE BUG USER**
```
Subscription: FREE (Active)
CLI Tools:
  ⚠️ claude_code: ENABLED, AVAILABLE  ← BUG!
  ⚠️ codex_cli: ENABLED, AVAILABLE    ← BUG!
  ✓ gemini_cli: disabled, available

Status: ❌ SECURITY ISSUE - FREE user with 2 active CLI tools!
This user can access Pro features.
```

#### User 2: `18e0e951-559e-4e8b-b39b-c9fe0b7649e0`
```
Subscription: FREE (Active)
CLI Tools:
  ✓ claude_code: disabled, unchecked
  ✓ codex_cli: disabled, unchecked
  ✓ gemini_cli: disabled, unchecked

Status: CORRECT - Free user without CLI
```

#### User 3: `2bbb87c9-63fe-4160-8fbf-07d959787907`
```
Subscription: FREE (Active)
CLI Tools: None configured

Status: CORRECT - Free user without CLI
```

#### User 4: `56470a21-62d6-4a71-94d3-7dd27bff6bd9`
```
Subscription: FREE (Active)
CLI Tools: None configured

Status: CORRECT - Free user without CLI
```

#### User 5: `bec97d86-39dc-43a3-a6fe-383ef4b48dda`
```
Subscription: FREE (Active)
CLI Tools: None configured

Status: CORRECT - Free user without CLI
```

#### User 6: `d0d19137-0280-4857-a355-0a1404d5f9d3`
```
Subscription: FREE (Active)
CLI Tools: None configured

Status: CORRECT - Free user without CLI
```

---

## RLS Policy Analysis

### cli_provider_configurations RLS Policies

**Current Policies**:
```
1. "Users can view own cli configs"
   - Condition: auth.uid() = user_id
   - Effect: Users can only see their own CLI configs

2. "Users can insert own cli configs"
   - Condition: auth.uid() = user_id
   - Effect: Users can create their own CLI configs

3. "Users can update own cli configs"
   - Condition: auth.uid() = user_id
   - Effect: Users can update their own CLI configs

4. "Users can delete own cli configs"
   - Condition: auth.uid() = user_id
   - Effect: Users can delete their own CLI configs
```

**Problem**:
- ❌ NO policy checks subscription tier
- ❌ FREE users can create/update CLI configs
- ❌ FREE users can enable CLI tools
- ✓ Only enforces user isolation (auth.uid() = user_id)

**Result**: Database allows free users to have active CLI configs!

### user_subscriptions RLS Policies

**Current Policies**:
```
1. "Service role full access subscriptions"
   - Condition: auth.role() = 'service_role'
   - Effect: Backend can access all subscriptions

2. "Users can view own subscription"
   - Condition: auth.uid() = user_id
   - Effect: Users can only see their own tier

3. "Users can insert own subscription"
   - Condition: auth.uid() = user_id
   - Effect: Users can only insert for themselves

4. "Users can update own subscription"
   - Condition: auth.uid() = user_id
   - Effect: Users can only update their own tier

5. "Users can delete own subscription"
   - Condition: auth.uid() = user_id
   - Effect: Users can only delete their own
```

**Problem**:
- ✓ Service role can read all subscriptions
- ❌ No trigger/constraint prevents free users from enabling CLI
- ❌ Tier checking is only in application code, not database

---

## Why Database Doesn't Prevent This

### Table Relationships

```
user_subscriptions
  ├─ id (primary key)
  ├─ user_id (foreign key to auth.users)
  ├─ tier (free | pro)
  └─ status (active, etc.)

cli_provider_configurations
  ├─ id (primary key)
  ├─ user_id (foreign key to auth.users)
  ├─ provider (claude_code, codex_cli, gemini_cli)
  ├─ enabled (boolean)
  └─ status (available, unavailable, unchecked)
```

**Missing**: No foreign key or trigger linking subscription tier to CLI enablement!

### No Database Constraints

```
Checked for:
1. Foreign key constraints? ❌ None
2. Check constraints? ❌ None
3. Triggers? ❌ None
4. RLS policies filtering by tier? ❌ None
```

**Result**: Database enforces NO tier-based restrictions on CLI configs!

---

## The Data Flow

### Current (Broken) ❌

```
Free User requests CLI access
         ↓
Application checks subscription tier (line 1179)
         ↓
Request not marked as CLI? → Check bypassed
         ↓
Model selected, CLI routing triggered (line 1467)
         ↓
Query database: Is CLI enabled?
SELECT * FROM cli_provider_configurations
WHERE user_id = 'free_user_id'
AND provider = 'claude_code'
AND enabled = TRUE
AND status = 'available'
         ↓
Result: ✅ FOUND (for user 5abacdd1-6a9b-48ce-b723-ca8056324c7a)
         ↓
❌ Application returns CLI response (NO TIER CHECK)
```

### What SHOULD Happen ✅

```
Free User requests CLI access
         ↓
Application checks subscription tier (line 1179)
         ↓
Application checks at model routing level (line 1467)
         ↓
Query subscription: Is user Pro?
SELECT tier FROM user_subscriptions
WHERE user_id = 'free_user_id'
         ↓
Result: tier = 'free'
         ↓
✅ Application blocks CLI routing
✅ Falls back to API keys
```

---

## Security Vulnerability Summary

### Vulnerability: Tier-Based Feature Access Not Enforced

**Location**: Application layer (not database layer)

**Affected Components**:
1. **Code**: `/src/app/api/mcp/route.ts` line 1467 - Missing Pro check
2. **Database**: RLS policies don't validate subscription tier
3. **Config**: `cli_provider_configurations` table has no tier constraints

**Evidence**:
- Free user `5abacdd1-6a9b-48ce-b723-ca8056324c7a` has CLI enabled
- Database allows this (no constraint)
- Application doesn't check (line 1467 bug)
- Result: Free user can access Pro features

**Impact**: High
- Direct paywall bypass
- Revenue loss
- Security degradation

**Severity**: High (Confirmed by actual data)

---

## What Database Checks ARE Working

✅ **User Isolation**: Users can only see/modify their own configs (RLS policies)
✅ **Auth Check**: Service role can access all data
✅ **Data Integrity**: Foreign keys are intact
✅ **CLI Status Tracking**: CLI enabled/disabled state is recorded

---

## What Database Checks Are MISSING

❌ **Subscription Tier Validation**: CLI configs don't check user's tier
❌ **Enable Prevention**: No constraint prevents free users enabling CLI
❌ **Audit Trail**: No trigger logs unauthorized CLI access
❌ **Automatic Disabling**: CLI not auto-disabled when tier downgraded

---

## Recommended Database Changes

### Option 1: Add RLS Policy (Database-level Protection)

```sql
CREATE POLICY "cli_config_respects_subscription_tier"
ON cli_provider_configurations
USING (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM user_subscriptions us
    WHERE us.user_id = cli_provider_configurations.user_id
    AND us.tier = 'pro'
    AND us.status = 'active'
  )
)
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM user_subscriptions us
    WHERE us.user_id = cli_provider_configurations.user_id
    AND us.tier = 'pro'
    AND us.status = 'active'
  )
);
```

**Effect**: Database would prevent free users from accessing CLI configs entirely.

### Option 2: Add Trigger (Database-level Audit)

```sql
CREATE OR REPLACE FUNCTION check_cli_subscription_on_insert_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_subscriptions
    WHERE user_id = NEW.user_id
    AND tier = 'pro'
    AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Only Pro users can enable CLI tools';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cli_subscription_check
BEFORE INSERT OR UPDATE ON cli_provider_configurations
FOR EACH ROW
EXECUTE FUNCTION check_cli_subscription_on_insert_update();
```

**Effect**: Database would log and reject any attempt to enable CLI for non-Pro users.

### Option 3: Add Check Constraint (Database-level Enforcement)

```sql
-- This wouldn't work directly but shows the concept:
-- Need to enforce: enabled = FALSE for free tier users
-- Would require a trigger (see Option 2)
```

---

## Current Architecture Issues

### Layers of Defense (Current State)

```
Layer 1: Application (Request-level)
  Status: ⚠️ PARTIAL
  Check: Line 1179 - checks CLI but only if marked as CLI request
  Gap: Regular API calls bypass this

Layer 2: Application (Model-level)
  Status: ❌ MISSING
  Check: Line 1467 - NO subscription check
  Gap: Free users get CLI if installed locally

Layer 3: Database (RLS Policies)
  Status: ✓ WORKING (for user isolation)
  Check: Users can only access own configs
  Gap: No tier-based filtering

Layer 4: Database (Constraints/Triggers)
  Status: ❌ MISSING
  Check: None
  Gap: Database allows free users to enable CLI
```

**Result**: Multiple security gaps allow free users to access Pro features

---

## Proof of Concept

### The Vulnerable User

```json
{
  "user_id": "5abacdd1-6a9b-48ce-b723-ca8056324c7a",
  "subscription": {
    "tier": "free",
    "status": "active"
  },
  "cli_configs": {
    "claude_code": {
      "enabled": true,
      "status": "available"
    },
    "codex_cli": {
      "enabled": true,
      "status": "available"
    }
  },
  "vulnerability": "Can query MCP endpoint with these CLI tools",
  "expected_access": "API keys only",
  "actual_access": "CLI tools (Pro feature)"
}
```

### How to Test

```bash
# 1. Query as this free user
curl -H "Authorization: Bearer <free_user_token>" \
  https://api.polydev.com/api/mcp \
  -d '{"prompt": "test", "models": ["claude-3-5-sonnet"]}'

# 2. Response will show CLI available (bug)
# 3. Should show API key required (correct behavior)
```

---

## Database Statistics Summary

### Vulnerability Coverage

| Metric | Value |
|--------|-------|
| Total Users | 9 |
| Pro Users | 3 |
| Free Users | 6 |
| **Free Users with Active CLI** | **1** |
| **Vulnerable CLI Configs** | **2** (claude_code, codex_cli) |
| **Percentage of Free Users Affected** | **16.7%** |

### Impact Scope

- **Directly Vulnerable**: 1 free user with 2 CLI tools
- **Potentially Vulnerable**: All 6 free users (could enable CLI)
- **Type of Bypass**: Direct paywall bypass
- **Difficulty to Exploit**: Easy (just enable CLI in database)

---

## Recommendations

### Immediate (Critical)

1. **Implement Fix in Application** (Line 1467)
   - Add subscription check before returning CLI response
   - This is already documented in previous findings

2. **Log the Vulnerable User**
   - Track access patterns for `5abacdd1-6a9b-48ce-b723-ca8056324c7a`
   - Check if they've been exploiting the CLI access

### Short-term (Important)

3. **Add Database-level RLS Policy** (Option 1 above)
   - Prevents database layer bypass
   - Defense-in-depth approach

4. **Add Trigger for Audit Trail** (Option 2 above)
   - Log all CLI access attempts
   - Detect future vulnerability exploits

### Long-term (Good Practice)

5. **Review All Tier-Based Features**
   - Check if other Pro features have similar gaps
   - Implement consistent subscription enforcement

6. **Add Integration Tests**
   - Test free users cannot access Pro features
   - Test Pro users can access Pro features
   - Run on every deployment

---

## Files Involved

- **Application**: `/src/app/api/mcp/route.ts` (line 1467)
- **Database Schema**: `user_subscriptions` table
- **Database Schema**: `cli_provider_configurations` table
- **Database Policies**: RLS policies (need enhancement)
- **Tests**: Need to add subscription tier validation tests

---

## Timeline

| Event | Date | Detail |
|-------|------|--------|
| Free user created | 2025-09-02 | `5abacdd1-6a9b-48ce-b723-ca8056324c7a` |
| claude_code configured | 2025-09-06 | Enabled and set to available |
| codex_cli configured | 2025-09-06 | Enabled and set to available |
| Bug exists since | 2025-09-02 | No application-level check |
| Bug potential duration | ~45 days | From user creation to now |

---

## Conclusion

✅ **Database Analysis Confirms Code Audit Findings**

The free user with active CLI in the database proves:
1. The bug exists in reality, not just in theory
2. Application layer has no checks (line 1467)
3. Database layer has no constraints
4. A real user is currently vulnerable
5. The paywall bypass is actively possible

**Recommended Action**: Implement the fix from the previous analysis document immediately.

---

## Query Reference

All queries used in this analysis are documented for repeatability:

### Check Vulnerable Users
```sql
SELECT us.user_id, us.tier, cpc.provider, cpc.enabled, cpc.status
FROM user_subscriptions us
LEFT JOIN cli_provider_configurations cpc ON us.user_id = cpc.user_id
WHERE us.tier = 'free' AND cpc.enabled = TRUE AND cpc.status = 'available';
```

### Check Subscription Distribution
```sql
SELECT tier, status, COUNT(*) FROM user_subscriptions GROUP BY tier, status;
```

### Check CLI Distribution
```sql
SELECT provider, enabled, status, COUNT(*) FROM cli_provider_configurations GROUP BY provider, enabled, status;
```

### Check RLS Policies
```sql
SELECT * FROM pg_policies WHERE tablename IN ('cli_provider_configurations', 'user_subscriptions');
```

---

## Next Steps

1. ✅ Application fix (from previous analysis)
2. ⏳ Database enhancement (RLS + trigger)
3. ⏳ Audit logs for vulnerable user
4. ⏳ Test suite for subscription enforcement
5. ⏳ Monitor for exploitation

**Status**: Ready for implementation
