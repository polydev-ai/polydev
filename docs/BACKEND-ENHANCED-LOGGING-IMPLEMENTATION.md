# Backend Enhanced Logging Implementation

**Date:** October 20, 2025, 10:45 PM CEST
**Status:** Implemented and Deployed ✅
**Server:** Hetzner VPS (135.181.138.102)

---

## Executive Summary

Enhanced the backend WebSocket upgrade handler with comprehensive logging to diagnose the root cause of WebSocket connection failures (code 1006). The logging additions capture detailed session state information when `sanitizeVMIP()` returns `undefined`, allowing us to see exactly what data is available when the WebSocket upgrade request arrives.

---

## What Was Done

### 1. Database Verification (Completed)

Queried Supabase database via MCP to verify session data:

```sql
SELECT session_id, provider, status, browser_vm_id, vm_ip, created_at
FROM auth_sessions
ORDER BY created_at DESC
LIMIT 5;
```

**Critical Finding:**
ALL recent sessions have the `vm_ip` field populated correctly (e.g., `192.168.100.3`, `192.168.100.2`). This ruled out the database not being updated and confirmed the issue is likely related to:
- PM2 cluster mode (in-memory cache miss between workers)
- Timing/race conditions in session retrieval
- Some other retrieval or caching mechanism issue

---

### 2. Enhanced Logging Implementation (Completed)

**File Modified:** `/opt/master-controller/src/routes/auth.js`

**Backup Created:** `auth.js.backup-[timestamp]`

#### Changes to `sanitizeVMIP()` Function

**Before:**
```javascript
function sanitizeVMIP(session) {
  return session?.browserIP || session?.vm_ip || session?.vmIp || session?.vm_ip_address;
}
```

**After (Enhanced):**
```javascript
function sanitizeVMIP(session) {
  const vmIP = session?.browserIP || session?.vm_ip || session?.vmIp || session?.vm_ip_address;

  logger.debug('[sanitizeVMIP] Extracting VM IP', {
    hasSession: !!session,
    sessionKeys: session ? Object.keys(session) : [],
    browserIP: session?.browserIP || 'MISSING',
    vm_ip: session?.vm_ip || 'MISSING',
    vmIp: session?.vmIp || 'MISSING',
    vm_ip_address: session?.vm_ip_address || 'MISSING',
    result: vmIP || 'UNDEFINED'
  });

  return vmIP;
}
```

**What This Logs:**
- Whether session object exists
- All keys in the session object (to see the actual shape)
- Status of each field being checked (`browserIP`, `vm_ip`, `vmIp`, `vm_ip_address`)
- Final result (extracted VM IP or UNDEFINED)

---

#### Changes to `handleNoVNCUpgrade()` Function

**Before (Critical Section):**
```javascript
const session = await browserVMAuth.getSessionStatus(sessionId);
if (!session) {
  logger.error('noVNC WebSocket upgrade: session not found', { sessionId });
  socket.destroy();
  return true;
}

const vmIP = sanitizeVMIP(session);
if (!vmIP) {
  logger.error('noVNC WebSocket upgrade: VM IP not available', { sessionId, session });
  socket.destroy();
  return true;
}
```

**After (Enhanced):**
```javascript
const session = await browserVMAuth.getSessionStatus(sessionId);
if (!session) {
  logger.error('[noVNC WS] Session not found', { sessionId });
  socket.destroy();
  return true;
}

// Log session details BEFORE calling sanitizeVMIP
logger.info('[noVNC WS] Session found', {
  sessionId,
  sessionKeys: Object.keys(session),
  status: session.status,
  hasBrowserIP: !!session.browserIP,
  hasVmIp: !!session.vm_ip,
  browserVMId: session.browserVMId || session.browser_vm_id
});

const vmIP = sanitizeVMIP(session);
if (!vmIP) {
  logger.error('[noVNC WS] VM IP not available - DETAILED DEBUG', {
    sessionId,
    sessionKeys: Object.keys(session),
    browserIP: session.browserIP,
    vm_ip: session.vm_ip,
    vmIp: session.vmIp,
    vm_ip_address: session.vm_ip_address,
    status: session.status,
    browserVMId: session.browserVMId || session.browser_vm_id,
    fullSession: JSON.stringify(session)  // FULL SESSION DUMP
  });
  socket.destroy();
  return true;
}

logger.info('[noVNC WS] VM IP extracted successfully', {
  sessionId,
  vmIP,
  maskedIP: vmIP.substring(0, vmIP.lastIndexOf('.')) + '.x'
});
```

**What This Logs:**

1. **Session Found (Info Level):**
   - Session ID
   - All keys present in the session object
   - Session status
   - Boolean flags for `browserIP` and `vm_ip` presence
   - Browser VM ID

2. **VM IP Not Available (Error Level):**
   - Session ID
   - All keys in session object
   - Values of each field being checked
   - Session status
   - Browser VM ID
   - **FULL SESSION AS JSON** (for complete diagnosis)

3. **VM IP Extracted Successfully (Info Level):**
   - Session ID
   - Full VM IP
   - Masked VM IP (for privacy in logs)

---

### 3. Deployment (Completed)

**Process:**
1. Created enhanced functions in `/tmp/auth-enhanced.js`
2. Wrote Python script (`/tmp/replace_functions.py`) to programmatically replace functions
3. Backed up original file: `/opt/master-controller/src/routes/auth.js.backup-[timestamp]`
4. Applied changes using Python script
5. Verified changes were applied correctly using `grep`
6. Restarted systemd service: `systemctl restart master-controller`
7. Confirmed service restarted successfully

**Service Status:**
```
● master-controller.service - Polydev Master Controller
     Loaded: loaded (/etc/systemd/system/master-controller.service; enabled; vendor preset: enabled)
     Active: active (running) since Mon 2025-10-20 22:45:04 CEST
   Main PID: 556548 (node)
```

---

## Why Enhanced Logging Was Needed

### Initial Hypothesis: Race Condition

The original hypothesis was that WebSocket upgrade requests were arriving BEFORE the session was fully populated with VM IP data. However, the database check revealed that `vm_ip` IS being populated in all sessions.

### Current Hypothesis: Retrieval or Caching Issue

The enhanced logging will help determine:

1. **Is the session object empty when retrieved?**
   - If `sessionKeys` is empty or minimal, the issue is with session retrieval

2. **Does the session have `vm_ip` but with wrong field name?**
   - If keys show something like `vmIP` or `ip_address` but not `vm_ip`, it's a field naming issue

3. **Is this a PM2 cluster mode issue?**
   - If in-memory cache misses and database retrieval also fails, it could be multiple workers with separate caches

4. **Is there a timing issue?**
   - If session exists but has status `vm_creating` or similar, the upgrade is happening too early

---

## What to Look For in Logs

### On Next Auth Session Test:

**Good Path (Expected):**
```
[noVNC WS] Session found { sessionId: '...', sessionKeys: ['userId', 'provider', 'browserVMId', 'browserIP', ...], status: 'vm_created', hasBrowserIP: true, hasVmIp: true, ... }
[sanitizeVMIP] Extracting VM IP { hasSession: true, sessionKeys: [...], browserIP: '192.168.100.x', vm_ip: '192.168.100.x', result: '192.168.100.x' }
[noVNC WS] VM IP extracted successfully { sessionId: '...', vmIP: '192.168.100.x', maskedIP: '192.168.100.x' }
```

**Bad Path (What We're Debugging):**
```
[noVNC WS] Session found { sessionId: '...', sessionKeys: ['...'], status: '...', hasBrowserIP: false, hasVmIp: false, ... }
[sanitizeVMIP] Extracting VM IP { hasSession: true, sessionKeys: [...], browserIP: 'MISSING', vm_ip: 'MISSING', vmIp: 'MISSING', vm_ip_address: 'MISSING', result: 'UNDEFINED' }
[noVNC WS] VM IP not available - DETAILED DEBUG { sessionId: '...', sessionKeys: [...], fullSession: '{...}' }
```

The `fullSession` JSON dump will show us EXACTLY what data structure is being returned by `getSessionStatus()`.

---

## Expected Diagnosis Results

Based on enhanced logs, we'll be able to determine:

### Scenario A: Empty Session Object
**Log:** `sessionKeys: []` or `sessionKeys: ['session_id', 'user_id']` (minimal fields)
**Root Cause:** Database query not returning full session data
**Fix:** Investigate `db.authSessions.findById()` in `browser-vm-auth.js`

### Scenario B: Wrong Field Names
**Log:** `sessionKeys: ['...', 'ipAddress', 'vmIP', ...]` (different naming)
**Root Cause:** Database schema or object mapping mismatch
**Fix:** Update `sanitizeVMIP()` to check additional field names

### Scenario C: PM2 Cluster Mode
**Log:** Sometimes has `browserIP` (in-memory), sometimes has `vm_ip` (database), sometimes neither
**Root Cause:** Multiple workers with separate in-memory caches, database query failing
**Fix:** Use Redis for shared session cache or ensure proper database query

### Scenario D: Timing Issue
**Log:** Session exists but `status` is `vm_creating` or `vm_starting`
**Root Cause:** WebSocket upgrade happening before VM creation completes
**Fix:** Add retry logic or block frontend until status is `vm_created`

---

## Testing Instructions

### 1. Create New Auth Session

From frontend:
```
http://localhost:3000/dashboard/remote-cli
```

1. Click "Connect Claude Code"
2. Wait for VM creation (~15-30s)
3. When noVNC iframe appears, it will attempt WebSocket connection
4. Check backend logs for enhanced logging output

### 2. Monitor Backend Logs

From VPS:
```bash
ssh root@135.181.138.102
journalctl -u master-controller -f
```

Or filtered for WebSocket logs:
```bash
journalctl -u master-controller -f | grep -E '\[noVNC WS\]|\[sanitizeVMIP\]'
```

### 3. Analyze Log Output

Look for:
- `[noVNC WS] Session found` - Shows session shape when retrieved
- `[sanitizeVMIP] Extracting VM IP` - Shows which fields were checked
- `[noVNC WS] VM IP not available - DETAILED DEBUG` - Shows full session JSON if failure occurs

---

## Files Modified

| File | Location | Changes | Backup |
|------|----------|---------|--------|
| `auth.js` | `/opt/master-controller/src/routes/auth.js` | Enhanced `sanitizeVMIP()` and `handleNoVNCUpgrade()` with detailed logging | `auth.js.backup-[timestamp]` |

---

## Rollback Instructions

If enhanced logging causes issues:

```bash
ssh root@135.181.138.102
cd /opt/master-controller/src/routes

# Find backup file
ls -la auth.js.backup-*

# Restore original
cp auth.js.backup-[timestamp] auth.js

# Restart service
systemctl restart master-controller
```

---

## Technical Details

### Logger Configuration

The backend uses Winston logger with different levels:
- `logger.debug()` - Debug level (may not show by default)
- `logger.info()` - Info level (shows by default)
- `logger.warn()` - Warning level
- `logger.error()` - Error level

**Note:** If debug logs don't appear, check Winston configuration in `src/config/logger.js` to ensure debug level is enabled.

### Session Object Structure (Expected)

**In-Memory (from `this.authSessions.get()`):**
```javascript
{
  userId: string,
  provider: string,
  browserVMId: string,
  browserIP: string,  // ← This is what we expect
  novncURL: string,
  status: string,
  startedAt: Date,
  proxyConfig: object
}
```

**From Database (from `db.authSessions.findById()`):**
```javascript
{
  session_id: string,
  user_id: string,
  provider: string,
  status: string,
  browser_vm_id: string,
  vm_ip: string,  // ← This is what we expect
  vnc_url: string,
  created_at: timestamp
}
```

### sanitizeVMIP() Logic

The function checks fields in this order:
1. `session.browserIP` - In-memory field
2. `session.vm_ip` - Database field
3. `session.vmIp` - camelCase variant
4. `session.vm_ip_address` - Alternative name

Returns first non-undefined value, or undefined if all are missing.

---

## Next Steps

1. ✅ **Enhanced Logging Applied** - Functions modified and deployed
2. ✅ **Service Restarted** - Changes active in production
3. ⏳ **Test with New Auth Session** - Create new auth session and monitor logs
4. ⏳ **Analyze Diagnostic Data** - Review enhanced logs to identify root cause
5. ⏳ **Implement Actual Fix** - Based on diagnostic results
6. ⏳ **Verify Fix Works** - Test end-to-end OAuth flow

---

## Success Criteria

Enhanced logging is successful when we can see in logs:
- Exact session object structure when WebSocket upgrade happens
- Which fields are present/missing (`browserIP`, `vm_ip`, etc.)
- Session status and metadata
- Full session JSON dump if VM IP is not available

This data will definitively show us why `sanitizeVMIP()` returns `undefined` and allow us to implement the correct fix.

---

**Document Created:** October 20, 2025, 10:45 PM CEST
**Author:** Claude Code
**Status:** ✅ Enhanced Logging Deployed - Ready for Testing
**Next:** Create new auth session and analyze enhanced logs
