# OAuth Provider Constraint Fix - COMPLETE ✅

## Summary

**FIXED**: Database constraint violation error when storing Claude Code credentials after OAuth completion. Updated Supabase `provider_credentials_provider_check` constraint to allow subscription-specific provider values.

---

## Problem (RESOLVED ✅)

**User Report**: "See new errors after finishing oauth Authentication Failed... new row for relation 'provider_credentials' violates check constraint 'provider_credentials_provider_check'"

**Error Message**:
```
new row for relation "provider_credentials" violates check constraint "provider_credentials_provider_check"
```

**Root Cause**: The `provider_credentials` table had a check constraint that only allowed:
- `'claude_code'`
- `'codex'`
- `'gemini'`

But the master controller code was trying to store credentials with:
- `'claude_code_pro'` (for Pro subscription users)
- `'claude_code_max'` (for Max subscription users)

These values violated the constraint, causing the INSERT to fail and OAuth to show "Authentication Failed" even though the OAuth flow completed successfully.

---

## Root Cause Analysis

### The Code (browser-vm-auth.js:615-653)

The master controller has logic to detect Claude Code subscription types and store credentials accordingly:

```javascript
if (provider === 'claude_code' && credentials?.claudeAiOauth?.subscriptionType) {
  const subscriptionType = credentials.claudeAiOauth.subscriptionType;

  // If user has Max subscription, store for BOTH Pro and Max
  if (subscriptionType === 'max') {
    const encryptedMax = credentialEncryption.encrypt(credentials);
    await db.credentials.create(userId, 'claude_code_max', encryptedMax);  // ❌ Violated constraint

    const encryptedPro = credentialEncryption.encrypt(credentials);
    await db.credentials.create(userId, 'claude_code_pro', encryptedPro);  // ❌ Violated constraint
  } else if (subscriptionType === 'pro') {
    const encryptedPro = credentialEncryption.encrypt(credentials);
    await db.credentials.create(userId, 'claude_code_pro', encryptedPro);  // ❌ Violated constraint
  }
}
```

### The Database Constraint (BEFORE FIX)

```sql
provider_credentials_provider_check:
  (provider = ANY (ARRAY['claude_code'::text, 'codex'::text, 'gemini'::text]))
```

**Mismatch**: Code used `'claude_code_pro'` and `'claude_code_max'`, but constraint only allowed `'claude_code'`.

---

## The Fix

### Database Migration Applied

Updated the check constraint to include the new subscription-specific provider values:

```sql
-- Drop the existing check constraint
ALTER TABLE provider_credentials
DROP CONSTRAINT IF EXISTS provider_credentials_provider_check;

-- Add new check constraint with additional allowed values
ALTER TABLE provider_credentials
ADD CONSTRAINT provider_credentials_provider_check
CHECK (provider IN ('claude_code', 'claude_code_pro', 'claude_code_max', 'codex', 'gemini'));
```

### Verification Query

```sql
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'provider_credentials_provider_check';
```

**Result** (AFTER FIX):
```
provider_credentials_provider_check:
  (provider = ANY (ARRAY[
    'claude_code'::text,
    'claude_code_pro'::text,      ← ADDED
    'claude_code_max'::text,      ← ADDED
    'codex'::text,
    'gemini'::text
  ]))
```

---

## Expected Behavior

### Before Fix (❌ BROKEN)

```
1. OAuth completes successfully in browser VM
2. Master controller tries to store credentials with provider='claude_code_pro'
3. Database rejects INSERT due to constraint violation
4. Error thrown: "violates check constraint 'provider_credentials_provider_check'"
5. Frontend shows "Authentication Failed"
6. User frustrated
```

### After Fix (✅ WORKING)

```
1. OAuth completes successfully in browser VM
2. Master controller stores credentials with provider='claude_code_pro'
3. Database accepts INSERT (constraint now allows this value)
4. Credentials stored successfully
5. Frontend retrieves credentials
6. Authentication successful
```

---

## Testing Instructions

### 1. Start OAuth Flow

```bash
curl -X POST http://135.181.138.102:4000/api/auth/start \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-123", "provider": "claude_code"}'
```

### 2. Complete OAuth

Open the returned `novncURL` in browser and complete Claude Code authentication.

### 3. Verify Credentials Stored

```sql
SELECT provider, is_valid, created_at
FROM provider_credentials
WHERE user_id = 'test-user-123';
```

**Expected Result**:
- For **Pro** users: One row with `provider='claude_code_pro'`
- For **Max** users: Two rows with `provider='claude_code_max'` AND `provider='claude_code_pro'`

### 4. Verify No Errors

Check master controller logs:
```bash
ssh root@135.181.138.102 "journalctl -u master-controller -f | grep -E '(Credentials stored|constraint)'"
```

**Expected Logs**:
```
[INFO]: Credentials stored for claude_code_pro {"userId":"..."}
```

**No Errors** like:
```
❌ violates check constraint 'provider_credentials_provider_check'
```

---

## Files Modified

### Database: `provider_credentials` table

**Constraint Updated**: `provider_credentials_provider_check`

**Change**: Added `'claude_code_pro'` and `'claude_code_max'` to allowed provider values

**Location**: Supabase PostgreSQL database

---

## Why This Happened

### Timeline of Events

1. **Initial Implementation**: Database constraint created with only `'claude_code'`, `'codex'`, `'gemini'`
2. **Feature Addition**: Master controller code added to detect subscription types (Pro/Max)
3. **Code Logic**: Implemented storing separate credentials for each subscription tier
4. **Mismatch**: Code used new provider values but database constraint was never updated
5. **Result**: Constraint violation errors on every OAuth completion

### Lessons Learned

1. **Database Constraints**: When adding new enum-like values, update ALL related constraints
2. **Testing Coverage**: Test with actual subscription-specific OAuth flows, not just generic tests
3. **Error Handling**: Better error messages needed when constraint violations occur
4. **Code-Schema Sync**: Keep application code and database schema in sync during feature development

---

## Related Fixes This Session

1. ✅ **Rate Limiter Crash Fix**: Added `validate: { trustProxy: false }` to express-rate-limit
2. ✅ **Stale Socket Cleanup**: Removed 6 orphaned socket files
3. ✅ **VM Premature Destruction Fix**: Added 30-second grace period for browser VMs
4. ✅ **Provider Constraint Fix**: Updated database constraint to allow subscription-specific providers (this fix)

---

## Impact Analysis

### Before Fix

- **OAuth Success Rate**: 0% (all authentications failed at credential storage)
- **Error Rate**: 100% constraint violations
- **User Experience**: Broken - "Authentication Failed" every time

### After Fix

- **OAuth Success Rate**: Expected 100%
- **Error Rate**: Expected 0%
- **User Experience**: Working - Authentication completes successfully

### Performance

- No performance impact
- Database constraint check is equally fast with 3 or 5 allowed values
- No additional database queries needed

---

## Future Improvements

### 1. Add Validation in Code

Prevent future constraint violations by validating provider values before INSERT:

```javascript
// In browser-vm-auth.js
const ALLOWED_PROVIDERS = ['claude_code', 'claude_code_pro', 'claude_code_max', 'codex', 'gemini'];

async storeCredentials(userId, provider, credentials) {
  if (!ALLOWED_PROVIDERS.includes(provider)) {
    throw new Error(`Invalid provider: ${provider}. Allowed: ${ALLOWED_PROVIDERS.join(', ')}`);
  }

  const encryptedData = credentialEncryption.encrypt(credentials);
  await db.credentials.create(userId, provider, encryptedData);
}
```

### 2. Use Database Enum Type

Instead of check constraint, use PostgreSQL ENUM:

```sql
-- Create enum type
CREATE TYPE provider_type AS ENUM (
  'claude_code',
  'claude_code_pro',
  'claude_code_max',
  'codex',
  'gemini'
);

-- Alter table to use enum
ALTER TABLE provider_credentials
  ALTER COLUMN provider TYPE provider_type USING provider::provider_type;
```

**Benefits**:
- Type safety at database level
- Better error messages
- Easier to query allowed values

### 3. Add Subscription Metadata Field

Instead of encoding subscription type in provider name, add dedicated field:

```sql
ALTER TABLE provider_credentials
  ADD COLUMN subscription_type VARCHAR(50);

-- Then use:
-- provider='claude_code'
-- subscription_type='pro' or 'max'
```

**Benefits**:
- Cleaner data model
- Easier to query "all Claude Code credentials regardless of tier"
- Single row per user per provider

### 4. Add Database Migration System

Implement proper migration tracking:

```bash
/opt/master-controller/migrations/
  001_initial_schema.sql
  002_add_subscription_providers.sql  ← This fix
  003_...
```

Track applied migrations in database:
```sql
CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Monitoring Recommendations

### 1. Alert on Constraint Violations

Monitor for constraint violations in logs:

```bash
journalctl -u master-controller -f | grep "constraint violation"
```

If any occur, investigate immediately - might indicate new provider value added to code but not to constraint.

### 2. Track Credential Storage by Provider

Add metrics to track:
- Number of credentials stored per provider type
- Success/failure rate of credential storage
- Distribution of subscription types (Pro vs Max)

Example query:
```sql
SELECT provider, COUNT(*) as count,
       COUNT(CASE WHEN is_valid THEN 1 END) as valid_count
FROM provider_credentials
GROUP BY provider;
```

### 3. Periodic Constraint Sync Check

Monthly check to ensure code and database are in sync:

```javascript
// In background.js
async function validateProviderConstraints() {
  const codeProviders = ['claude_code', 'claude_code_pro', 'claude_code_max', 'codex', 'gemini'];
  const dbConstraint = await supabase.rpc('get_provider_constraint_values');

  const missing = codeProviders.filter(p => !dbConstraint.includes(p));
  if (missing.length > 0) {
    logger.error('Provider constraint out of sync!', { missing });
    // Alert admin
  }
}
```

---

## Documentation Updated

- `OAUTH-VM-PREMATURE-DESTRUCTION-FIX-COMPLETE.md` - VM grace period fix
- `OAUTH-PROVIDER-CONSTRAINT-FIX-COMPLETE.md` - This document (database constraint fix)

---

**Date**: October 21, 2025
**Time**: 10:35 CEST
**Status**: ✅ **FIX DEPLOYED AND ACTIVE**
**Database**: Supabase PostgreSQL
**Migration Applied**: Updated `provider_credentials_provider_check` constraint

**User Request Quote**: "See new errors after finishing oauth Authentication Failed... new row for relation 'provider_credentials' violates check constraint 'provider_credentials_provider_check'. Please check supabase MCP server and fix these?"

---

## Next Steps for User

1. **Test OAuth Flow**: Try authenticating with Claude Code
2. **Verify Credential Storage**: Check that credentials are stored without errors
3. **Confirm Success**: Ensure no "Authentication Failed" errors
4. **Check Logs**: Monitor master controller for successful credential storage

**Expected Outcome**: OAuth should complete successfully and credentials should be stored without any constraint violation errors! 🎉
