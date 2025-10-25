# OAuth Session Status Fix - Root Cause Analysis

## Problem Summary

User reports: *"BTW all these crashes are happening when oauth is finished it's detecting as completed, but soon it's showing these errors"*

### Current Behavior (BROKEN)
1. User completes OAuth authentication successfully
2. Browser VM OAuth agent detects credentials
3. OAuth agent calls master-controller to store credentials in database ✅
4. Credentials stored successfully in `provider_credentials` table ✅
5. Browser VM destroyed after 30-second grace period
6. Firecracker exits with code 1 (normal for VM shutdown)
7. **Session marked as 'failed' in database** ❌
8. Frontend shows "Authentication Failed" despite success ❌

### Expected Behavior (FIX NEEDED)
1. User completes OAuth authentication successfully
2. Browser VM OAuth agent detects credentials
3. OAuth agent calls master-controller to store credentials in database ✅
4. Credentials stored successfully in `provider_credentials` table ✅
5. **Session marked as status='completed' in `auth_sessions` table** ← MISSING!
6. Browser VM destroyed after 30-second grace period
7. Firecracker exits with code 1 (expected)
8. Session REMAINS as 'completed' (not changed to 'failed') ✅
9. Frontend shows "Success" screen ✅

## Root Cause

**Missing Logic**: When credentials are successfully stored, the `auth_sessions` table is NEVER updated to set `status='completed'`.

**Location of Issue**: The OAuth agent calls master-controller to store credentials, but there's no code to update the session status to 'completed' at that time.

### Evidence from Database

All recent OAuth attempts show `status='failed'`:

```sql
SELECT session_id, provider, status FROM auth_sessions
WHERE session_id IN (
  '235b8048-a60d-4e30-8d53-8d6fab75347a',  -- gemini_cli: failed ❌
  'b30e86ef-b7cf-404e-ab57-09d28b93cde0',  -- codex: failed ❌
  'cc29a920-2791-4903-a6a1-a8144886db7f'   -- claude_code: failed ❌
);
```

Yet the user confirmed OAuth actually completed successfully!

## Files Involved

###  `/opt/master-controller/src/routes/auth.js`
- **Issue**: No endpoint exists to handle session completion after credentials stored
- **What Calls It**: OAuth agent inside Browser VM should call this after storing credentials
- **Fix Needed**: Add logic to mark session as 'completed' when credentials stored

### `/opt/master-controller/src/services/browser-vm-auth.js`
- **Lines 580-680**: `storeCredentials()` function
- **Issue**: This function stores credentials but does NOT update session status
- **Fix Needed**: After `db.credentials.create()` succeeds, call `db.authSessions.update(sessionId, { status: 'completed' })`

### `/opt/master-controller/src/services/vm-manager.js`
- **Lines 749-794**: Firecracker exit handler
- **Issue**: When Firecracker exits with code !== 0, it calls `reject(new Error(...))`
- **Problem**: This error propagates and marks session as 'failed'
- **Fix Needed**: Before marking as failed, check if credentials were already stored (session.status === 'completed')

## Proposed Fix

### Option 1: Update Session Status When Credentials Stored (RECOMMENDED)

**File**: `/opt/master-controller/src/services/browser-vm-auth.js`
**Function**: `storeCredentials()` (around line 650)

**Add after successful credential storage**:

```javascript
async storeCredentials(userId, provider, credentials, sessionId) {  // ← Add sessionId parameter
  try {
    // ... existing normalization code ...

    // Store credentials (existing code)
    const encryptedData = credentialEncryption.encrypt(credentials);
    await db.credentials.create(userId, normalizedProvider, encryptedData);
    logger.info('Credentials stored', { userId, provider });

    // ✅ NEW: Mark session as completed
    if (sessionId) {
      await db.authSessions.update(sessionId, {
        status: 'completed',
        completed_at: new Date().toISOString()
      });
      logger.info('Session marked as completed', { sessionId, userId, provider });
    }

  } catch (error) {
    // ... existing error handling ...
  }
}
```

**Requires**: OAuth agent must pass `sessionId` when calling master-controller to store credentials.

### Option 2: Protect Completed Sessions from Being Marked Failed

**File**: `/opt/master-controller/src/services/vm-manager.js`
**Function**: `cleanupVM()` or wherever session status is set to 'failed'

**Add check before marking as failed**:

```javascript
// Before updating session status to 'failed', check if already completed
const session = await db.authSessions.findBySessionId(sessionId);
if (session && session.status === 'completed') {
  logger.info('Session already completed, not marking as failed', { sessionId });
  return; // Don't overwrite 'completed' status
}

// Only mark as failed if not completed
await db.authSessions.update(sessionId, {
  status: 'failed',
  error_message: errorMessage
});
```

### Recommended Approach: Combine Both Options

1. **Fix 1**: Update `storeCredentials()` to mark session as 'completed' when credentials stored
2. **Fix 2**: Add protection in VM cleanup to never overwrite 'completed' status with 'failed'

This provides defense-in-depth: even if VM crashes AFTER credentials stored, the 'completed' status is protected.

## Implementation Steps

1. Locate where OAuth agent calls master-controller to store credentials
2. Ensure `sessionId` is passed in that call
3. Update `storeCredentials()` to accept `sessionId` parameter
4. After `db.credentials.create()` succeeds, call `db.authSessions.update(sessionId, { status: 'completed' })`
5. Find where sessions are marked as 'failed' (likely in VM cleanup)
6. Add check: if `session.status === 'completed'`, don't overwrite with 'failed'
7. Test OAuth flow end-to-end
8. Verify sessions remain 'completed' even after VM destroyed

## Success Criteria

✅ OAuth completes successfully → credentials stored → session marked as 'completed'
✅ VM destroyed with exit code 1 → session REMAINS 'completed'
✅ Frontend detects 'completed' status → shows success screen
✅ No "Authentication Failed" errors after successful OAuth
✅ Database shows `status='completed'` for successful OAuth flows

## Next Action

Implement Fix 1 (update `storeCredentials()`) as the immediate solution, then add Fix 2 (protect completed sessions) as a safety measure.
