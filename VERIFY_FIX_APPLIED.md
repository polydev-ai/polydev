# Verification Guide: MCP Model Routing Fix Applied ✅

**Date**: October 19, 2025
**Status**: All fixes applied and ready for testing

---

## Quick Verification Steps

### Step 1: Verify Code Changes

```bash
# Check if early subscription load is in place (line ~1210)
grep -n "Loading user subscription status for CLI tier enforcement" \
  /Users/venkat/Documents/polydev-ai/src/app/api/mcp/route.ts

# Expected output: Line number around 1211
# Result: [MCP] Loading user subscription status for CLI tier enforcement...
```

```bash
# Check if Pro subscription check is in place (line ~1477)
grep -n "CRITICAL FIX: Check subscription tier BEFORE routing to CLI" \
  /Users/venkat/Documents/polydev-ai/src/app/api/mcp/route.ts

# Expected output: Line number around 1477
# Result: // ✅ CRITICAL FIX: Check subscription tier BEFORE routing to CLI
```

```bash
# Check if security logging is in place
grep -n "SECURITY: User.*attempted to use CLI tool" \
  /Users/venkat/Documents/polydev-ai/src/app/api/mcp/route.ts

# Expected output: Line number around 1484
# Result: [MCP] ⛔ SECURITY: User...
```

### Step 2: Verify Database Changes

**Check if RLS Policy was applied:**
```sql
SELECT policyname, permissive, roles
FROM pg_policies
WHERE tablename = 'cli_provider_configurations'
AND policyname = 'cli_requires_pro_subscription';

-- Expected result:
-- policyname: cli_requires_pro_subscription
-- permissive: PERMISSIVE
-- roles: {public}
```

**Check if Trigger was applied:**
```sql
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'cli_provider_configurations'
AND trigger_name = 'prevent_free_tier_cli_enable';

-- Expected result:
-- trigger_name: prevent_free_tier_cli_enable
-- event_object_table: cli_provider_configurations
```

**Check if Trigger Function exists:**
```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'enforce_cli_subscription_tier';

-- Expected result:
-- routine_name: enforce_cli_subscription_tier
-- routine_type: FUNCTION
```

### Step 3: Test with Vulnerable User

**Use the known vulnerable user from database audit:**

```
User ID: 5abacdd1-6a9b-48ce-b723-ca8056324c7a
Tier: FREE
CLI: claude_code installed
```

**Test 1: Verify user is still free and CLI is still installed**
```sql
SELECT us.tier, us.status, cpc.provider, cpc.enabled, cpc.status
FROM user_subscriptions us
LEFT JOIN cli_provider_configurations cpc ON us.user_id = cpc.user_id
WHERE us.user_id = '5abacdd1-6a9b-48ce-b723-ca8056324c7a';

-- Expected result:
-- tier: free, status: active
-- provider: claude_code, enabled: true, status: available
```

**Test 2: Try to enable CLI (should fail at trigger)**
```sql
UPDATE cli_provider_configurations
SET enabled = true
WHERE user_id = '5abacdd1-6a9b-48ce-b723-ca8056324c7a'
AND provider = 'claude_code';

-- Expected error:
-- ERROR: CLI tools require Pro subscription (tier: free, status: active)
-- [SECURITY] Non-Pro user... attempted to enable CLI...
```

**Test 3: Call MCP endpoint as this free user**
```bash
# Using the free user's auth token
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <free_user_token>" \
  -d '{
    "prompt": "Hello, world!",
    "models": ["claude-3-5-sonnet-20241022"]
  }'

# Expected response:
# - NOT a CLI response
# - Uses API key instead
# - Console log shows: "⛔ SECURITY: User X attempted to use CLI - BLOCKED"
```

---

## Detailed Verification

### Verification 1: Code Changes in Route Handler

**File**: `/src/app/api/mcp/route.ts`

**Expected Change 1** (Lines ~1210-1218):
```typescript
// ✅ EARLY LOAD: Get subscription status early...
console.log(`[MCP] Loading user subscription status for CLI tier enforcement...`)
const userSubscription = await subscriptionManager.getUserSubscription(user.id, true, false)
console.log(`[MCP] User subscription loaded:`, {
  user_id: user.id,
  tier: userSubscription?.tier,
  status: userSubscription?.status,
  canUseCLI: userSubscription?.tier === 'pro' && userSubscription?.status === 'active'
})
```

✅ Verify this code exists

**Expected Change 2** (Lines ~1477-1502):
```typescript
// ✅ CRITICAL FIX: Check subscription tier BEFORE routing to CLI
if (cliConfig) {
  const canUseCLI = userSubscription?.tier === 'pro' && userSubscription?.status === 'active'

  if (!canUseCLI) {
    console.log(`[MCP] ⛔ SECURITY: User ${user.id} (tier: ${userSubscription?.tier}) attempted to use CLI...`)
    cliConfig = null  // Clear to force API key routing
  } else {
    skipApiKey = true
    return { /* CLI response */ }
  }
}
```

✅ Verify this code exists

---

### Verification 2: Database RLS Policy

**Query:**
```sql
SELECT schemaname, tablename, policyname, permissive, qual
FROM pg_policies
WHERE tablename = 'cli_provider_configurations'
ORDER BY policyname;
```

**Expected Result** (should see new policy):
```
cli_requires_pro_subscription | PERMISSIVE | auth.uid() = user_id AND (enabled = false OR EXISTS(...))
```

✅ Verify "cli_requires_pro_subscription" exists

---

### Verification 3: Database Trigger

**Query:**
```sql
SELECT trigger_schema, trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'cli_provider_configurations'
AND trigger_name LIKE '%prevent%';
```

**Expected Result:**
```
trigger_name: prevent_free_tier_cli_enable
event_object_table: cli_provider_configurations
action_timing: BEFORE
event_manipulation: INSERT, UPDATE
```

✅ Verify trigger exists

---

### Verification 4: Trigger Function

**Query:**
```sql
SELECT routine_schema, routine_name, routine_type, data_type
FROM information_schema.routines
WHERE routine_name = 'enforce_cli_subscription_tier';
```

**Expected Result:**
```
routine_name: enforce_cli_subscription_tier
routine_type: FUNCTION
```

✅ Verify function exists

---

## Testing Scenarios

### Scenario A: Free User with CLI (Should use API keys)

**Setup**:
```
User: free@example.com
Tier: FREE
CLI: Installed locally
API Key: Configured
```

**Expected Behavior**:
1. Request comes in
2. Application loads subscription: tier='free'
3. CLI is available, but subscription check fails
4. Log: "⛔ SECURITY: User X attempted to use CLI - BLOCKED"
5. Request continues to API key handling
6. Response uses API key (not CLI)

**Verification**:
```bash
# Check logs for:
[MCP] ⛔ SECURITY: User X attempted to use CLI tool claude_code - BLOCKED
[MCP] Reason: CLI access requires Pro subscription. Falling back to API keys.
```

✅ If you see both logs, fix is working!

---

### Scenario B: Pro User with CLI (Should use CLI)

**Setup**:
```
User: pro@example.com
Tier: PRO
Status: ACTIVE
CLI: Installed locally
```

**Expected Behavior**:
1. Request comes in
2. Application loads subscription: tier='pro', status='active'
3. CLI is available, subscription check passes
4. Log: "✅ Pro user X - CLI tool available"
5. Return CLI response

**Verification**:
```bash
# Check logs for:
[MCP] ✅ Pro user X - CLI tool claude_code is available and authenticated
```

✅ If you see this log, Pro users still work!

---

### Scenario C: Free User Tries to Enable CLI (Should fail)

**Setup**:
```
User: free_user_id
Tier: FREE
Action: UPDATE CLI to enabled=true
```

**Expected Behavior**:
1. Query: UPDATE enabled=true
2. Trigger fires BEFORE INSERT/UPDATE
3. Function checks: Is user Pro?
4. Answer: No (tier='free')
5. Raise exception: "CLI tools require Pro subscription"
6. Update rejected

**Verification**:
```bash
# Try the update:
UPDATE cli_provider_configurations
SET enabled = true
WHERE user_id = 'free_user_id'
AND provider = 'claude_code';

# Should get error:
ERROR: CLI tools require Pro subscription (tier: free, status: active)
```

✅ If you get this error, trigger is working!

---

## Rollback Plan (If Needed)

### Rollback Code Changes
```bash
# Revert the route.ts file (undo the edits)
git checkout src/app/api/mcp/route.ts

# Redeploy
npm run build
```

### Rollback Database Changes
```sql
-- Drop the trigger
DROP TRIGGER IF EXISTS prevent_free_tier_cli_enable ON cli_provider_configurations;

-- Drop the function
DROP FUNCTION IF EXISTS enforce_cli_subscription_tier();

-- Drop the RLS policy
DROP POLICY IF EXISTS "cli_requires_pro_subscription" ON cli_provider_configurations;
```

**Estimated rollback time**: 5 minutes

---

## Verification Checklist

After applying the fix:

- [ ] Code change 1: Early subscription load exists (line ~1210)
- [ ] Code change 2: Pro subscription check exists (line ~1477)
- [ ] Code change 3: Security logging exists (line ~1484)
- [ ] Database: RLS policy "cli_requires_pro_subscription" exists
- [ ] Database: Trigger "prevent_free_tier_cli_enable" exists
- [ ] Database: Function "enforce_cli_subscription_tier" exists
- [ ] Test: Free user with CLI falls back to API keys
- [ ] Test: Pro user with CLI still gets CLI
- [ ] Test: Free user cannot enable CLI in database
- [ ] Logs show security messages for free users
- [ ] No errors in console
- [ ] Build succeeds without errors
- [ ] TypeScript types check out

---

## Success Criteria

You'll know the fix is working when:

1. **Free user test**: "⛔ SECURITY: User X attempted to use CLI - BLOCKED" appears in logs
2. **Pro user test**: "✅ Pro user X - CLI tool available" appears in logs
3. **Database test**: Trigger prevents CLI enablement with specific error
4. **No regression**: Pro users still have full access to CLI

---

## Post-Deployment Monitoring

### Key Metrics to Watch

```
1. Security log frequency:
   Expected: Multiple "⛔ SECURITY" logs for free users
   Alert if: Zero logs (might mean fix didn't apply)

2. CLI usage by tier:
   Expected: CLI only for pro tier, API keys for free tier
   Alert if: Free users using CLI

3. API key fallback usage:
   Expected: Increase in free users using API keys
   Alert if: Stays the same (fix may not be working)

4. Database errors:
   Expected: No new errors
   Alert if: "CLI tools require Pro subscription" errors in app logs
```

---

## Questions?

If verification fails:

1. Check if migrations were applied: `SELECT * FROM pg_migrations;`
2. Check PostgreSQL logs for trigger errors
3. Check application logs for security messages
4. Verify userSubscription is loaded (not null)
5. Verify user subscription tier is correct in database

All fixes are documented in: `/Users/venkat/Documents/polydev-ai/COMPREHENSIVE_FIX_IMPLEMENTED.md`

---

## Summary

✅ Three-layer fix has been applied:
- Application code checks Pro subscription before CLI
- Database RLS policy prevents free users from accessing CLI configs
- Database trigger prevents free users from enabling CLI

✅ Ready for testing and deployment

✅ Free users will now ALWAYS use API keys or admin models, never CLI
