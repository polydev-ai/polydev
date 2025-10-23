# WebSocket Failure Root Cause FOUND

**Date:** October 20, 2025, 11:00 PM CEST
**Status:** 🎯 ROOT CAUSE IDENTIFIED
**Session ID:** d6c8b577-a4e7-410a-b641-d3bd8ae3b2a2
**VM IP:** 192.168.100.2

---

## Executive Summary

After extensive investigation, I've identified the **actual root cause** of the WebSocket code 1006 failures:

**The Browser VMs are NOT RUNNING.**

The enhanced logging revealed that:
1. ✅ WebSocket upgrade handler IS working correctly
2. ✅ Session retrieval IS working correctly
3. ✅ VM IP extraction IS working correctly (`vm_ip: 192.168.100.2`)
4. ❌ **The target VM at 192.168.100.2:6080 is UNREACHABLE** (status: `vm_stopped`)

**Error:** `EHOSTUNREACH 192.168.100.2:6080`

---

## Investigation Timeline

### 1. Initial Hypothesis (INCORRECT)
**Thought:** Race condition - WebSocket upgrade happening before VM IP is populated in database.

**Why Wrong:** Database query showed `vm_ip` IS populated in all sessions.

### 2. Second Hypothesis (INCORRECT)
**Thought:** Enhanced logging not firing - WebSocket upgrade not reaching handler.

**Why Wrong:** Log level was set to `info` (not `debug`), but I was using `logger.info()` calls which should have appeared.

### 3. Breakthrough Discovery
Found the correct log file path: `/var/log/polydev/master-controller.log`

Used command:
```bash
tail -100 /var/log/polydev/master-controller.log | grep -E 'noVNC|websock|VM IP|sanitize'
```

### 4. Enhanced Logging Output (SUCCESS!)

```
2025-10-20 22:58:17 [INFO]: [noVNC WS] Upgrade attempt
{"url":"/api/auth/session/d6c8b577-a4e7-410a-b641-d3bd8ae3b2a2/novnc/websock"}

2025-10-20 22:58:17 [INFO]: [noVNC WS] Session lookup
{"sessionId":"d6c8b577-a4e7-410a-b641-d3bd8ae3b2a2","suffix":""}

2025-10-20 22:58:17 [INFO]: [noVNC WS] Session found
{
  "sessionId":"d6c8b577-a4e7-410a-b641-d3bd8ae3b2a2",
  "sessionKeys":["session_id","user_id","provider","status","vm_id",...,"vm_ip","vnc_url",...],
  "status":"vm_stopped",  // ← THE PROBLEM!
  "hasBrowserIP":false,
  "hasVmIp":true,
  "browserVMId":"vm-155c47cb-c1a0-4695-9162-b2f480d2db11"
}

2025-10-20 22:58:17 [INFO]: [noVNC WS] VM IP extracted successfully
{"sessionId":"...","vmIP":"192.168.100.2","maskedIP":"192.168.100.x"}

2025-10-20 22:58:17 [INFO]: [noVNC WS] Proxying to target
{"sessionId":"...","target":"ws://192.168.100.2:6080/"}

2025-10-20 22:58:17 [INFO]: noVNC WebSocket proxy: backend connection initiated
{"url":"/api/auth/session/.../novnc/websock","target":{"protocol":"ws:","hostname":"192.168.100.2","port":"6080"}}

2025-10-20 22:58:17 [INFO]: [noVNC WS] Proxy call completed
{"sessionId":"d6c8b577-a4e7-410a-b641-d3bd8ae3b2a2"}

2025-10-20 22:58:20 [ERROR]: noVNC WebSocket proxy error
{
  "error":"connect EHOSTUNREACH 192.168.100.2:6080",
  "code":"EHOSTUNREACH",
  "url":"/api/auth/session/.../novnc/websock",
  "socketDestroyed":false
}
```

**Key Finding:** Session has `status:"vm_stopped"` and the connection to `192.168.100.2:6080` fails with `EHOSTUNREACH`.

### 5. VM Process Verification

Command:
```bash
ps aux | grep -E 'firecracker|vm-' | grep -v grep
```

**Result:** NO Firecracker VMs running! Only `kvm-irqfd-cleanup` kernel worker threads exist.

---

## Root Cause Analysis

### Problem 1: Browser VMs Not Running ⚠️ CRITICAL

**Symptom:**
- Session exists in database with `vm_ip: 192.168.100.2`
- Session has `status: "vm_stopped"`
- No Firecracker processes running
- Connection to VM fails with `EHOSTUNREACH`

**Why This Happens:**
Browser VMs are being created initially, but then either:
1. **Never started** - VM process never launched
2. **Stopped prematurely** - VM process crashed or was terminated
3. **Timeout/cleanup** - VM was stopped due to inactivity timeout

**Impact:**
- noVNC WebSocket cannot connect (code 1006)
- OAuth agent cannot run inside VM
- No credentials can be detected
- User cannot interact with terminal

### Problem 2: Missing Credentials Store Endpoint ⚠️ CRITICAL

**Symptom:**
From previous logs:
```
2025-10-20 22:52:18 [INFO]: POST /api/auth/credentials/store 404
```

OAuth agent inside VM is trying to POST credentials to this endpoint, but it doesn't exist on the backend.

**Impact:**
Even if VM were running, credentials couldn't be saved.

---

## Code Analysis

### WebSocket Handler (WORKING CORRECTLY) ✅

**File:** `/opt/master-controller/src/routes/auth.js`

The enhanced logging shows the handler is executing perfectly:
1. Upgrade request received ✅
2. Session lookup successful ✅
3. Session found with `vm_ip` populated ✅
4. VM IP extracted: `192.168.100.2` ✅
5. Proxy attempt to `ws://192.168.100.2:6080/` ✅
6. **Proxy connection fails:** `EHOSTUNREACH` ❌

The code is correct - the problem is the target VM is not running.

### Session Object Structure (AS RETRIEVED)

```javascript
{
  session_id: "d6c8b577-a4e7-410a-b641-d3bd8ae3b2a2",
  user_id: "...",
  provider: "claude_code",
  status: "vm_stopped",  // ← Indicates VM is not running
  browser_vm_id: "vm-155c47cb-c1a0-4695-9162-b2f480d2db11",
  vm_ip: "192.168.100.2",  // ← IP is populated but VM is unreachable
  vnc_url: "...",
  created_at: "...",
  // ... other fields
}
```

---

## Why Previous Logs Didn't Show This

**journalctl output contained binary/ANSI escape codes** which made logs unreadable through SSH stdout.

**Solution:** Check log file directly at `/var/log/polydev/master-controller.log` instead of using journalctl.

---

## Enhanced Logging Success Metrics

✅ **Logger configuration verified:** Using `config.logging.level` (default: `info`)
✅ **Enhanced logging applied:** Both `sanitizeVMIP()` and `handleNoVNCUpgrade()` modified
✅ **Logs appearing correctly:** All `logger.info()` calls showing up in log file
✅ **Session data captured:** Full session object structure visible
✅ **Error pinpointed:** `EHOSTUNREACH` clearly indicates VM not running

---

## Next Steps (Priority Order)

### 1. Investigate Browser VM Lifecycle (URGENT)

**Questions to answer:**
- Why are VMs marked as `vm_stopped`?
- Are VMs being created but never started?
- Are VMs crashing after creation?
- Is there a timeout that stops VMs?

**Action:** Check VM manager service logs and code.

### 2. Implement Missing `/api/auth/credentials/store` Endpoint (CRITICAL)

**Location:** `/opt/master-controller/src/routes/auth.js`

**Requirements:**
- Accept POST from OAuth agent (VM internal IP)
- Extract credentials from request body
- Save to database `auth_sessions` table
- Update session status to `completed`
- Return success response

### 3. Fix Browser VM Startup/Persistence

Once we understand why VMs are stopped, implement fixes:
- Ensure VMs stay running during OAuth flow
- Add health checks
- Implement automatic restart on failure
- Add proper cleanup only after session completes

### 4. Test End-to-End Flow

With VMs running and credentials endpoint working:
1. Create fresh OAuth session
2. Verify VM starts and stays running
3. Verify noVNC connects successfully
4. Complete OAuth in terminal
5. Verify credentials detected and saved
6. Verify session status updates to `completed`

---

## Technical Details

### Log File Locations

| Log Type | Path | Format |
|----------|------|--------|
| Master Controller | `/var/log/polydev/master-controller.log` | Text (JSON) |
| Master Controller Errors | `/var/log/polydev/master-controller-error.log` | Text (JSON) |
| journalctl (systemd) | `journalctl -u master-controller` | Binary/ANSI (unreadable via SSH) |

**Recommendation:** Always use log files directly, not journalctl output.

### Session States

| Status | Meaning | VM Running? |
|--------|---------|-------------|
| `vm_creating` | VM being provisioned | No |
| `vm_created` | VM provisioned successfully | Yes (should be) |
| `vm_started` | VM process launched | Yes |
| `vm_stopped` | VM process terminated | **No** ← Current problem |
| `authenticating` | OAuth in progress | Yes (should be) |
| `completed` | OAuth successful | Yes (until cleanup) |
| `failed` | OAuth failed/timeout | No |

### WebSocket Error Codes

| Code | Meaning | Cause in This Case |
|------|---------|-------------------|
| 1006 | Abnormal closure | Backend closes socket after `EHOSTUNREACH` error |
| 1000 | Normal closure | Not applicable |
| 1002 | Protocol error | Not applicable |

---

## Files Involved

### Backend (VPS)

| File | Purpose | Status |
|------|---------|--------|
| `/opt/master-controller/src/routes/auth.js` | WebSocket handler | ✅ Working correctly |
| `/opt/master-controller/src/services/browser-vm-auth.js` | Session management | ✅ Stores `vm_ip` correctly |
| `/opt/master-controller/src/services/vm-manager.js` | VM lifecycle | ⚠️ Need to investigate |
| `/opt/master-controller/src/utils/logger.js` | Logging config | ✅ Configured correctly |

### Frontend (Already Fixed)

| File | Purpose | Status |
|------|---------|--------|
| `src/app/api/auth/session/[sessionId]/novnc/route.ts` | noVNC HTML proxy | ✅ Protocol-relative URLs implemented |
| `src/app/api/auth/session/[sessionId]/credentials/route.ts` | Credentials polling proxy | ✅ Server-side proxy implemented |
| `src/app/dashboard/remote-cli/auth/page.tsx` | OAuth UI | ✅ Exponential backoff implemented |

---

## Summary

**What We Thought Was Wrong:**
1. ❌ Race condition with database updates
2. ❌ WebSocket handler not firing
3. ❌ Session retrieval failing

**What's Actually Wrong:**
1. ✅ **Browser VMs are not running** (status: `vm_stopped`)
2. ✅ **Missing credentials store endpoint** (404 error)

**What's Working:**
1. ✅ Database stores `vm_ip` correctly
2. ✅ WebSocket handler executes correctly
3. ✅ Session retrieval works perfectly
4. ✅ VM IP extraction works correctly
5. ✅ Enhanced logging captures all diagnostic data

**Next Action:**
Investigate why Browser VMs have `status:"vm_stopped"` and are not running, then create the missing `/api/auth/credentials/store` endpoint.

---

**Document Created:** October 20, 2025, 11:00 PM CEST
**Author:** Claude Code
**Status:** 🎯 ROOT CAUSE IDENTIFIED - Ready to Fix
**Enhanced Logging:** ✅ SUCCESS - Provided exact diagnosis
