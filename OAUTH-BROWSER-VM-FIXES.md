# OAuth Browser VM Critical Fixes

**Date**: October 16, 2025 00:20 UTC
**Issue**: Codex OAuth stuck on "Loading secure browser..." with `browser_vm_id: null`
**Status**: ✅ FIXES DEPLOYED

---

## Problems Identified

### Bug #1: Database Field Name Error (CRITICAL)
**File**: `master-controller/src/services/browser-vm-auth.js:97-102`

**Before**:
```javascript
await db.authSessions.update(sessionId, {
  vm_id: browserVM.vmId,  // ❌ OVERWRITES CLI VM ID
  vm_ip: browserVM.ipAddress,
  vnc_url: novncURL,
  status: 'vm_created'
});
```

**After**:
```javascript
await db.authSessions.update(sessionId, {
  browser_vm_id: browserVM.vmId,  // ✅ CORRECT FIELD
  vm_ip: browserVM.ipAddress,  // Browser VM IP for OAuth agent access
  vnc_url: novncURL,
  status: 'vm_created'
});
```

**Impact**: This bug would have overwritten the CLI VM ID with the Browser VM ID, breaking the ability to find the CLI VM later. However, the code was never reaching this point due to Bug #2.

---

### Bug #2: Silent Browser VM Creation Failures (CRITICAL)
**File**: `master-controller/src/services/browser-vm-auth.js:74`

**Problem**: VM creation failures were not being caught or logged, causing the flow to silently fail and leave `browser_vm_id` as `null`.

**Fix Applied**:
```javascript
// BEFORE: No error handling
browserVM = await vmManager.createVM(userId, 'browser', decodoPort, decodoIP);

// AFTER: Comprehensive error handling
try {
  browserVM = await vmManager.createVM(userId, 'browser', decodoPort, decodoIP);
  logger.info('Browser VM created successfully', {
    userId,
    provider,
    sessionId,
    browserVMId: browserVM.vmId,
    browserVMIP: browserVM.ipAddress
  });
} catch (vmCreateError) {
  logger.error('BROWSER VM CREATION FAILED', {
    userId,
    provider,
    sessionId,
    error: vmCreateError.message,
    stack: vmCreateError.stack,
    decodoPort,
    decodoIP
  });

  // Update session status to failed
  await db.authSessions.update(sessionId, {
    status: 'failed',
    error_message: `Browser VM creation failed: ${vmCreateError.message}`
  }).catch(err => logger.error('Failed to update session status', { error: err.message }));

  throw vmCreateError;  // Re-throw to trigger cleanup
}
```

**Impact**: Now VM creation failures will:
1. Be logged with full error details
2. Update the auth session status to "failed" with error message
3. Trigger the cleanup code (destroy VMs)
4. Show meaningful error to frontend instead of infinite polling

---

## Additional Improvements

### Enhanced Logging
Added detailed logging at key points:

1. **Before VM creation** (lines 68-75):
   ```javascript
   logger.info('Creating browser VM for OAuth', {
     userId,
     provider,
     sessionId,
     decodoPort,
     decodoIP
   });
   ```

2. **After successful VM creation** (lines 79-85):
   ```javascript
   logger.info('Browser VM created successfully', {
     userId,
     provider,
     sessionId,
     browserVMId: browserVM.vmId,
     browserVMIP: browserVM.ipAddress
   });
   ```

3. **Before database update** (lines 127-133):
   ```javascript
   logger.info('Updating session with Browser VM details', {
     userId,
     provider,
     sessionId,
     browserVMId: browserVM.vmId,
     browserVMIP: browserVM.ipAddress
   });
   ```

4. **After successful database update** (lines 142-147):
   ```javascript
   logger.info('Session updated successfully', {
     userId,
     provider,
     sessionId,
     status: 'vm_created'
   });
   ```

---

## Deployment

### Files Changed
- `master-controller/src/services/browser-vm-auth.js`

### Deployment Steps
1. ✅ Fixed code committed to git (commit `d4be9ca`)
2. ✅ File copied to master-controller server via SCP
3. ✅ Master-controller service restarted (PID 4011673)
4. ✅ Service status: `active (running)`

### Deployment Command
```bash
scp master-controller/src/services/browser-vm-auth.js root@192.168.5.82:/opt/master-controller/src/services/browser-vm-auth.js
ssh root@192.168.5.82 "systemctl restart master-controller"
```

---

## How to Diagnose Future Issues

### If OAuth Flow Fails Again

1. **Check auth session status in database**:
   ```sql
   SELECT session_id, user_id, provider, status, error_message, browser_vm_id, vm_ip
   FROM auth_sessions
   WHERE user_id = 'USER_ID'
   ORDER BY created_at DESC
   LIMIT 5;
   ```

2. **Check master-controller logs** for detailed error messages:
   ```bash
   ssh root@192.168.5.82 "journalctl -u master-controller -n 100 --no-pager | grep -E '(BROWSER VM|Creating browser|error|FAILED)'"
   ```

3. **Look for specific log patterns**:
   - `"Creating browser VM for OAuth"` - VM creation started
   - `"Browser VM created successfully"` - VM creation succeeded
   - `"BROWSER VM CREATION FAILED"` - VM creation failed (check error details)
   - `"Updating session with Browser VM details"` - Database update starting
   - `"Session updated successfully"` - Database update completed

4. **Check Browser VMs in database**:
   ```sql
   SELECT vm_id, user_id, vm_type, status, ip_address, created_at
   FROM vms
   WHERE vm_type = 'browser'
   ORDER BY created_at DESC
   LIMIT 10;
   ```

---

## Expected Behavior After Fixes

### Successful Flow
1. User clicks "Connect Codex"
2. Master-controller logs: `"Creating browser VM for OAuth"`
3. Master-controller logs: `"Browser VM created successfully"` with VM ID and IP
4. Master-controller logs: `"Updating session with Browser VM details"`
5. Master-controller logs: `"Session updated successfully"`
6. Database: `browser_vm_id` populated, `status: 'vm_created'`
7. Frontend: Stops showing "Loading secure browser...", shows OAuth URL

### Failed Flow (Now Properly Handled)
1. User clicks "Connect Codex"
2. Master-controller logs: `"Creating browser VM for OAuth"`
3. Master-controller logs: `"BROWSER VM CREATION FAILED"` with error details
4. Database: `status: 'failed'`, `error_message` populated
5. Frontend: Shows error message instead of infinite polling

---

## Related Issues

- ✅ Golden snapshot rebuild (8GB) - Codex CLI now installed
- ✅ Database field bug - `browser_vm_id` now correctly updated
- ✅ Silent failures - Now caught and logged
- ⏳ **Next**: Test Codex OAuth flow to verify fixes work

---

## Testing Instructions

### For User
1. Navigate to `http://localhost:3002/dashboard/remote-cli`
2. Click "Connect Codex" (or "Reconnect OpenAI Codex" if already connected)
3. **Expected**: Should see "Connecting..." then browser interface loads
4. **If fails**: Check database for `error_message` in auth_sessions table

### For Developer
Monitor master-controller logs in real-time while user tests:
```bash
ssh root@192.168.5.82 "journalctl -u master-controller -f"
```

Look for the log sequence described in "Expected Behavior After Fixes" above.

---

**Status**: Ready for testing
**Restart Required**: ✅ Already restarted
**Logs Available**: Yes - check via `journalctl -u master-controller`
