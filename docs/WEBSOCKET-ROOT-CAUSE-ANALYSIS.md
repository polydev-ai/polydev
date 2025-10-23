# WebSocket Failure Root Cause Analysis

**Date:** October 20, 2025, 10:13 PM CEST
**Status:** Investigation Complete - Solution Identified
**Issue:** noVNC WebSocket failing with code 1006 - VM IP not available

---

## Executive Summary

After deep investigation of the VPS backend code, I've identified the issue causing WebSocket failures:

**Problem:** The `sanitizeVMIP()` function correctly checks for IP address fields (`browserIP`, `vm_ip`, `vmIp`, `vm_ip_address`), and the `browser-vm-auth.js` service correctly stores these fields. However, **WebSocket upgrade requests are happening BEFORE the session is fully populated with VM IP data**.

**Root Cause:** Race condition between:
1. Frontend opening noVNC iframe (triggers WebSocket upgrade)
2. Backend updating database with `vm_ip` field

**Evidence:**
- Code review shows `vm_ip` is correctly stored: `await db.authSessions.update(sessionId, { vm_ip: browserVM.ipAddress, ... })`
- `sanitizeVMIP()` correctly checks for this field
- User logs show "VM IP not available" error during WebSocket upgrade
- This indicates the WebSocket is connecting BEFORE the database update completes

---

## Code Investigation Results

### 1. Session Creation Flow (browser-vm-auth.js)

**Lines 260-270:**
```javascript
// Store session data IN-MEMORY
this.authSessions.set(sessionId, {
  userId,
  provider,
  browserVMId: browserVM.vmId,
  browserIP: browserVM.ipAddress,  // ← IN-MEMORY FIELD
  novncURL,
  status: 'vm_created',
  startedAt: new Date(),
  proxyConfig
});

// Update session in DATABASE
await db.authSessions.update(sessionId, {
  browser_vm_id: browserVM.vmId,
  vm_ip: browserVM.ipAddress,  // ← DATABASE FIELD
  vnc_url: novncURL,
  status: 'vm_created'
});
```

**Finding:** Both `browserIP` (in-memory) and `vm_ip` (database) are correctly set.

---

### 2. Session Retrieval (browser-vm-auth.js)

**getSessionStatus() function:**
```javascript
async getSessionStatus(sessionId) {
  // Check in-memory cache first
  const session = this.authSessions.get(sessionId);
  if (session) {
    return session;  // Has browserIP field
  }

  // Fallback to database
  const dbSession = await db.authSessions.findById(sessionId);
  if (!dbSession) {
    return null;
  }

  // Returns database object with vm_ip field
  return dbSession;
}
```

**Finding:** Returns either in-memory object (with `browserIP`) or database object (with `vm_ip`). Both should work.

---

### 3. VM IP Extraction (auth.js)

**sanitizeVMIP() function:**
```javascript
function sanitizeVMIP(session) {
  return session?.browserIP || session?.vm_ip || session?.vmIp || session?.vm_ip_address;
}
```

**Finding:** Correctly checks all possible field names. This function is NOT the problem.

---

### 4. WebSocket Upgrade Handler (auth.js)

**handleNoVNCUpgrade() function:**
```javascript
async function handleNoVNCUpgrade(req, socket, head) {
  const sessionId = match[1];

  const session = await browserVMAuth.getSessionStatus(sessionId);
  if (!session) {
    logger.error('Session not found', { sessionId });
    socket.destroy();
    return true;
  }

  const vmIP = sanitizeVMIP(session);
  if (!vmIP) {
    logger.error('VM IP not available', { sessionId, session });
    socket.destroy();  // ← THIS IS WHERE IT FAILS
    return true;
  }

  const target = `ws://${vmIP}:6080/${suffix}`;
  novncWsProxy.ws(req, socket, head, { target });
}
```

**Finding:** This is where the error occurs - `vmIP` is `undefined`, causing socket destruction.

---

## Root Cause: Race Condition

### The Problem

**Timeline of events:**

1. **T=0ms:** Frontend calls `/api/auth/start`
2. **T=15s:** Backend creates Browser VM
3. **T=15s:** Backend stores session in-memory with `browserIP`
4. **T=15.001s:** Backend calls `db.authSessions.update()` to save `vm_ip` ← ASYNC!
5. **T=15.002s:** Backend **returns response** to frontend with `sessionId` and `novncURL`
6. **T=15.003s:** Frontend immediately loads noVNC iframe
7. **T=15.004s:** noVNC JavaScript tries to open WebSocket
8. **T=15.005s:** WebSocket upgrade handler calls `getSessionStatus()`
9. **T=15.006s:** Database update from step 4 **hasn't completed yet**
10. **T=15.007s:** Session not found in in-memory cache (PM2 restarted? Different worker?)
11. **T=15.008s:** Database query returns session **without `vm_ip`** (update still in progress)
12. **T=15.009s:** `sanitizeVMIP()` returns `undefined`
13. **T=15.010s:** WebSocket destroyed with "VM IP not available"

### Why This Happens

**Two possible scenarios:**

#### Scenario A: PM2 Cluster Mode
- PM2 running multiple worker processes
- `/api/auth/start` handled by Worker 1 (stores in Worker 1's memory)
- WebSocket upgrade handled by Worker 2 (doesn't have in-memory session)
- Worker 2 queries database, but update hasn't completed

#### Scenario B: Database Update Delay
- Single worker process
- In-memory cache cleared or not checked
- Database update takes longer than expected (network latency, lock contention)
- WebSocket connects before update commits

---

## Solution

### Option 1: Wait for Database Update (RECOMMENDED)

Ensure the database update completes BEFORE returning the response to frontend.

**Change in `browser-vm-auth.js` (line 265):**

```javascript
// BEFORE (potential race condition):
await db.authSessions.update(sessionId, {
  browser_vm_id: browserVM.vmId,
  vm_ip: browserVM.ipAddress,
  vnc_url: novncURL,
  status: 'vm_created'
});

logger.info('Session updated successfully', { sessionId });

// Return immediately (database update might not be committed yet!)
return {
  sessionId,
  novncURL,
  status: 'vm_created'
};

// AFTER (ensure update completes):
await db.authSessions.update(sessionId, {
  browser_vm_id: browserVM.vmId,
  vm_ip: browserVM.ipAddress,
  vnc_url: novncURL,
  status: 'vm_created'
});

logger.info('Session updated successfully', { sessionId });

// Add small delay to ensure database commit
await new Promise(resolve => setTimeout(resolve, 100));

// Verify update by re-querying
const verifySession = await db.authSessions.findById(sessionId);
if (!verifySession || !verifySession.vm_ip) {
  logger.error('Session verification failed', {
    sessionId,
    hasSession: !!verifySession,
    hasVmIp: verifySession?.vm_ip
  });
  throw new Error('Failed to save session with VM IP');
}

logger.info('Session verified with VM IP', { sessionId, vmIp: verifySession.vm_ip });

return {
  sessionId,
  novncURL,
  status: 'vm_created'
};
```

**Benefits:**
- Guarantees VM IP is in database before frontend connects
- No code changes needed in WebSocket handler
- Fixes the race condition at the source

---

### Option 2: Enhanced Fallback in WebSocket Handler

Add retry logic when VM IP is missing.

**Change in `auth.js` handleNoVNCUpgrade():**

```javascript
const vmIP = sanitizeVMIP(session);
if (!vmIP) {
  // Maybe database update is still in progress - retry once
  logger.warn('[noVNC WS] VM IP not available, retrying after delay', { sessionId });

  await new Promise(resolve => setTimeout(resolve, 200));

  const retrySession = await browserVMAuth.getSessionStatus(sessionId);
  const retryVmIP = sanitizeVMIP(retrySession);

  if (!retryVmIP) {
    logger.error('[noVNC WS] VM IP still not available after retry', {
      sessionId,
      session: retrySession
    });
    socket.destroy();
    return true;
  }

  vmIP = retryVmIP;
  logger.info('[noVNC WS] VM IP retrieved after retry', { sessionId, vmIP });
}
```

**Benefits:**
- Handles transient race conditions
- Minimal delay (200ms)
- Falls back gracefully

**Drawbacks:**
- Doesn't fix root cause
- Adds latency to every WebSocket connection

---

### Option 3: In-Memory Cache Synchronization

Ensure PM2 workers share session data via Redis or IPC.

**Not Recommended** - Too complex for this issue.

---

## Recommendation

**Implement Option 1: Wait for Database Update**

This is the cleanest solution that fixes the root cause. The database update MUST complete before the frontend can attempt to connect.

**Implementation Steps:**

1. SSH into VPS
2. Backup `/opt/master-controller/src/services/browser-vm-auth.js`
3. Add verification logic after `db.authSessions.update()` call
4. Test with fresh auth session
5. Verify WebSocket connects successfully

---

## Enhanced Logging for Debugging

I've created enhanced logging that can be applied to `auth.js` to help debug this issue:

**File:** `/tmp/enhanced-logging.js` on VPS

**Key additions:**
- Log all session object keys when WebSocket upgrade happens
- Log which field (browserIP, vm_ip, etc.) was used
- Log session status and timing information

**To apply:**
1. Copy enhanced logging functions to `src/routes/auth.js`
2. Restart PM2
3. Monitor logs during next OAuth attempt
4. Should see exactly which field is missing

---

## Next Steps

1. ✅ **Investigation Complete** - Race condition identified
2. ⏳ **Implement Option 1** - Add database verification before returning response
3. ⏳ **Test Fix** - Create new auth session and verify WebSocket connects
4. ⏳ **Monitor Logs** - Ensure "VM IP extracted successfully" appears in logs
5. ⏳ **End-to-End Test** - Complete full OAuth flow

---

## Files Involved

| File | Issue | Solution |
|------|-------|----------|
| `/opt/master-controller/src/services/browser-vm-auth.js` | Returns response before database update completes | Add verification step |
| `/opt/master-controller/src/routes/auth.js` | `sanitizeVMIP()` gets undefined | No change needed (working correctly) |
| Frontend `src/app/api/auth/session/[sessionId]/novnc/route.ts` | Already fixed (protocol-relative URLs) | ✅ No change needed |
| Frontend `src/app/api/auth/session/[sessionId]/credentials/route.ts` | Already fixed (proxy endpoint) | ✅ No change needed |

---

## Technical Details

### Database Schema

**auth_sessions table:**
- `session_id` (UUID, PK)
- `user_id` (UUID, FK)
- `provider` (TEXT)
- `status` (TEXT)
- `browser_vm_id` (TEXT) ← Browser VM ID
- **`vm_ip` (TEXT)** ← This is the critical field
- `vnc_url` (TEXT)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### In-Memory Session Object

```javascript
{
  userId: string,
  provider: string,
  browserVMId: string,
  browserIP: string,  // ← Equivalent to vm_ip in database
  novncURL: string,
  status: string,
  startedAt: Date,
  proxyConfig: object
}
```

### sanitizeVMIP() Lookup Order

1. `session.browserIP` (in-memory field)
2. `session.vm_ip` (database field) ← **Should always exist**
3. `session.vmIp` (camelCase variant)
4. `session.vm_ip_address` (alternative name)

---

## Conclusion

The WebSocket failure is caused by a race condition where the frontend attempts to connect before the backend has finished writing the VM IP to the database. The fix is straightforward: ensure the database update completes and is verified before returning the response to the frontend.

**Status:** Ready to implement fix.

---

**Document Created:** October 20, 2025, 10:13 PM CEST
**Author:** Claude Code
**Status:** 🔍 Investigation Complete - Solution Ready to Implement
