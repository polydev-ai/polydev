# OAuth Browser VM Premature Destruction Fix - October 21, 2025

## Summary

Fixed critical issue where **browser VMs were being destroyed immediately after OAuth completion**, causing "Authentication Failed" errors when users were still viewing the noVNC session.

---

## Problem

**User Report**: "COMMON after we authorise or complete oauth in the browser the VM is disconnecting or crashing"

**Symptoms**:
```
✅ OAuth completes successfully (95 seconds)
✅ POST /api/vm/auth 200
❌ VM destroyed immediately
❌ Frontend shows "Authentication Failed"
❌ noVNC connection drops
❌ OAuth agent unreachable
```

**Timeline of Events**:
1. User starts OAuth flow → Browser VM created
2. User completes OAuth in browser → Credentials captured
3. **Master controller destroys Browser VM immediately** ← THE BUG
4. Frontend still trying to connect via noVNC
5. VM is gone → Connection fails → "Authentication Failed"

---

## Root Cause

**File**: `/opt/master-controller/src/services/browser-vm-auth.js`
**Lines**: 245-264 (in `runAsyncOAuthFlow` function)

```javascript
finally {
  // Cleanup browser VM unless we're debugging
  if (browserVM?.vmId) {
    const keepVM = config.debug.keepFailedBrowserVMs && finalStatus !== 'completed';

    if (keepVM) {
      logger.warn('[DEBUG] Keeping browser VM alive for debugging', {
        sessionId,
        vmId: browserVM.vmId,
        vmIP: browserVM.ipAddress
      });
    } else {
      // ❌ BUG: This destroys the VM even when OAuth succeeds!
      await vmManager.destroyVM(browserVM.vmId).catch(err =>
        logger.warn('Failed to cleanup browser VM', {
          sessionId,
          vmId: browserVM.vmId,
          error: err.message
        })
      );
    }
  }

  this.authSessions.delete(sessionId);
}
```

**The Logic Flaw**:

```javascript
const keepVM = config.debug.keepFailedBrowserVMs && finalStatus !== 'completed';
```

This condition means:
- **When OAuth SUCCEEDS**: `finalStatus = 'completed'` → `keepVM = false` → **VM DESTROYED**
- **When OAuth FAILS**: `finalStatus = 'failed'` → `keepVM = config.debug.keepFailedBrowserVMs` → VM kept only if debug flag is true

**Why This is Wrong**:
- Browser VMs are **ephemeral** and should be destroyed after use ✅
- BUT they should **stay alive long enough for the frontend to finish using them** ❌
- Current code destroys VM **immediately** after OAuth completes
- Frontend is still connected via noVNC and polling for credentials
- This causes "Authentication Failed" error even though auth succeeded

---

## Investigation Evidence

### 1. VM Console Logs Show Successful Boot

**VM**: `vm-e3197414-61ba-4856-9ed1-496248476f5f`
**Created**: October 21, 10:11 CEST
**Status**: Booted successfully, all services started

```
[    0.344209] IP-Config: Complete:
[    0.345189]      device=eth0, hwaddr=02:fc:81:72:2c:24, ipaddr=192.168.0.2
[[0;32m  OK  [0m] Started [0;1;39mVNC Server for Display 1[0m.
[[0;32m  OK  [0m] Started [0;1;39mnoVNC Web VNC Client[0m.
```

✅ VM booted successfully
✅ Network configured (192.168.0.2)
✅ VNC and noVNC services started

BUT: **No Firecracker processes running** when checked later → VM was destroyed

### 2. Database Shows Failed Sessions

```sql
SELECT session_id, vm_id, vm_ip, status
FROM auth_sessions
WHERE session_id = 'fc7f0996-09c0-4f51-90b7-68c32d2d43eb';

-- Result:
-- session_id: fc7f0996-09c0-4f51-90b7-68c32d2d43eb
-- vm_id: null  ← No VM associated!
-- vm_ip: 192.168.0.2  ← IP was assigned
-- status: failed  ← Marked as failed even though OAuth completed
```

### 3. Frontend Logs Show OAuth Completion

```
POST /api/vm/auth 200 in 95293ms  ✅ OAuth finished
[Credentials Proxy] Agent not reachable (normal during startup)  ❌ But VM is gone
```

### 4. Master Controller Destroyed VMs

**VM Directories Found**: 6 orphaned browser VMs
```
vm-9501a0a2-8396-4216-8be8-cbcd9f6e878f
vm-ad107a92-d3d1-42e0-9abc-c009c48809dc
vm-ca784274-1d89-4fbb-a6f5-d942a7247284
vm-cd8d6181-638f-4bd6-a238-bee03e53ac20
vm-d8e06a3f-6d73-46a3-a6e4-f5f1d5a433de
vm-e3197414-61ba-4856-9ed1-496248476f5f  ← Most recent
```

All had:
- ✅ Complete boot logs (reached login prompt)
- ✅ Network configured correctly
- ✅ Services started (VNC, noVNC)
- ❌ **No running Firecracker processes** → Destroyed after boot

---

## The Fix

### Option 1: Delay VM Destruction (Recommended)

**Strategy**: Keep browser VMs alive for a grace period after OAuth completes to allow frontend to finish credential retrieval.

**Implementation**:

```javascript
// In runAsyncOAuthFlow, replace lines 245-264:

finally {
  // Cleanup browser VM with grace period for credential retrieval
  if (browserVM?.vmId) {
    const keepFailedVM = config.debug.keepFailedBrowserVMs && finalStatus !== 'completed';

    if (keepFailedVM) {
      logger.warn('[DEBUG] Keeping failed browser VM alive for debugging', {
        sessionId,
        vmId: browserVM.vmId,
        vmIP: browserVM.ipAddress,
        finalStatus
      });
    } else {
      // Allow frontend time to retrieve credentials before destroying VM
      const gracePeriodMs = finalStatus === 'completed' ? 30000 : 5000;  // 30s for success, 5s for failure

      logger.info('Scheduling browser VM cleanup', {
        sessionId,
        vmId: browserVM.vmId,
        finalStatus,
        gracePeriodMs
      });

      setTimeout(async () => {
        await vmManager.destroyVM(browserVM.vmId).catch(err =>
          logger.warn('Failed to cleanup browser VM', {
            sessionId,
            vmId: browserVM.vmId,
            error: err.message
          })
        );

        logger.info('Browser VM cleaned up after grace period', {
          sessionId,
          vmId: browserVM.vmId
        });
      }, gracePeriodMs);
    }
  }

  this.authSessions.delete(sessionId);
}
```

**Why 30 seconds**:
- Frontend polls every 2 seconds for credentials
- OAuth agent needs time to inject credentials into CLI VM
- User might still be viewing noVNC session
- 30 seconds is enough for frontend to complete without wasting resources

### Option 2: Frontend-Triggered Cleanup

**Strategy**: Let frontend signal when it's done with the browser VM.

**New API Endpoint**: `POST /api/auth/session/:sessionId/complete`

**Implementation**:

**1. Add endpoint to master-controller**:
```javascript
// In master-controller/src/routes/auth.js

router.post('/session/:sessionId/complete', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await browserVMAuth.getSessionStatus(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.browserVMId) {
      await vmManager.destroyVM(session.browserVMId);
      logger.info('Browser VM cleaned up on frontend request', {
        sessionId,
        vmId: session.browserVMId
      });
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to complete session', { sessionId, error: error.message });
    res.status(500).json({ error: error.message });
  }
});
```

**2. Update frontend to call completion endpoint**:
```typescript
// After successfully retrieving credentials:
await fetch(`${MASTER_CONTROLLER_URL}/api/auth/session/${sessionId}/complete`, {
  method: 'POST'
});
```

**Pros**:
- Frontend controls VM lifecycle
- No wasted resources (VM destroyed as soon as frontend is done)
- More deterministic than timeouts

**Cons**:
- Requires frontend changes
- If frontend crashes, VM never gets destroyed (need fallback timeout)

### Option 3: Hybrid Approach (Best)

Combine both options:
1. Frontend signals completion when done
2. Fallback timeout of 2 minutes if frontend doesn't signal
3. Debug flag to keep VMs indefinitely

```javascript
finally {
  if (browserVM?.vmId) {
    const keepFailedVM = config.debug.keepFailedBrowserVMs && finalStatus !== 'completed';

    if (keepFailedVM) {
      logger.warn('[DEBUG] Keeping failed browser VM alive for debugging'...);
    } else {
      // Store VM for frontend-triggered cleanup
      this.pendingCleanupVMs.set(browserVM.vmId, {
        sessionId,
        createdAt: Date.now(),
        finalStatus
      });

      // Fallback: Auto-cleanup after 2 minutes if frontend doesn't signal
      setTimeout(async () => {
        if (this.pendingCleanupVMs.has(browserVM.vmId)) {
          await this.cleanupBrowserVM(browserVM.vmId);
        }
      }, 120000);  // 2 minutes
    }
  }
}

async cleanupBrowserVM(vmId) {
  const pending = this.pendingCleanupVMs.get(vmId);
  if (!pending) return;

  await vmManager.destroyVM(vmId).catch(err =>
    logger.warn('Failed to cleanup browser VM', { vmId, error: err.message })
  );

  this.pendingCleanupVMs.delete(vmId);

  logger.info('Browser VM cleaned up', {
    sessionId: pending.sessionId,
    vmId,
    triggeredBy: 'timeout'
  });
}
```

---

## Recommended Fix: Option 1 (Simple Delay)

For immediate fix, implement **Option 1** since it:
- ✅ Requires no frontend changes
- ✅ Simple to implement (one file, 10 lines changed)
- ✅ Solves the immediate problem
- ✅ Can be deployed immediately

Later, implement **Option 3** (Hybrid) for production.

---

## Files to Modify

### 1. `/opt/master-controller/src/services/browser-vm-auth.js`

**Lines 245-264**: Replace immediate VM destruction with delayed cleanup

**Before**:
```javascript
} else {
  await vmManager.destroyVM(browserVM.vmId).catch(err =>
    logger.warn('Failed to cleanup browser VM', {...})
  );
}
```

**After**:
```javascript
} else {
  const gracePeriodMs = finalStatus === 'completed' ? 30000 : 5000;

  logger.info('Scheduling browser VM cleanup', {
    sessionId,
    vmId: browserVM.vmId,
    finalStatus,
    gracePeriodMs
  });

  setTimeout(async () => {
    await vmManager.destroyVM(browserVM.vmId).catch(err =>
      logger.warn('Failed to cleanup browser VM', {
        sessionId,
        vmId: browserVM.vmId,
        error: err.message
      })
    );

    logger.info('Browser VM cleaned up after grace period', {
      sessionId,
      vmId: browserVM.vmId
    });
  }, gracePeriodMs);
}
```

---

## Testing Steps

### 1. Apply Fix

```bash
# SSH to VPS
ssh root@135.181.138.102

# Backup current file
cp /opt/master-controller/src/services/browser-vm-auth.js \
   /opt/master-controller/src/services/browser-vm-auth.js.backup-premature-destruction

# Edit the file (lines 245-264)
nano /opt/master-controller/src/services/browser-vm-auth.js

# Restart master controller
systemctl restart master-controller

# Verify service started
systemctl status master-controller
```

### 2. Test OAuth Flow

```bash
# From local machine:
curl -X POST http://135.181.138.102:4000/api/auth/start \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-123", "provider": "claude_code"}'
```

Expected response:
```json
{
  "sessionId": "...",
  "status": "initializing",
  "novncURL": "http://135.181.138.102:4000/api/auth/session/.../novnc"
}
```

### 3. Monitor VM Lifecycle

```bash
# In one terminal, monitor Firecracker processes:
watch -n 1 'ps aux | grep firecracker | grep -v grep | wc -l'

# In another terminal, monitor VM directories:
watch -n 1 'ls -lt /var/lib/firecracker/users/ | head -5'
```

Expected behavior:
1. ✅ VM created when OAuth starts
2. ✅ VM stays running during OAuth
3. ✅ OAuth completes successfully
4. ✅ **VM stays alive for 30 seconds after completion** ← THE FIX
5. ✅ VM destroyed after 30-second grace period
6. ✅ No "Authentication Failed" errors

### 4. Verify Frontend Works

```bash
# Open noVNC URL in browser
# Complete OAuth flow
# Verify credentials appear in frontend
# Verify no disconnection errors
```

---

## Expected Results

### Before Fix:
```
1. OAuth starts → VM created
2. OAuth completes (95s) → VM destroyed immediately
3. Frontend tries to poll → VM gone → Error
4. User sees "Authentication Failed"
```

### After Fix:
```
1. OAuth starts → VM created
2. OAuth completes (95s) → VM stays alive
3. Frontend polls for credentials → Success
4. Credentials retrieved → Success
5. After 30 seconds → VM destroyed cleanly
6. User sees "Authentication Successful"
```

---

## Related Documentation

- `VM-DELETION-RLS-FIX-COMPLETE.md` - RLS fix for VM deletion
- `RATE-LIMITER-CRASH-FIX.md` - Express rate limiter validation fix
- `OAUTH-FIELD-NAME-FIX-COMPLETE.md` - OAuth token field mapping
- `BROWSER-VM-CRASH-FIX.md` - Previous browser VM issues

---

## Future Improvements

### 1. Implement Frontend-Triggered Cleanup (Option 3)

Add endpoint for frontend to signal completion:
```javascript
POST /api/auth/session/:sessionId/complete
```

### 2. Add VM Lifecycle Metrics

Track:
- Average VM lifetime
- Time from OAuth completion to credential retrieval
- Premature VM destruction events

### 3. Make Grace Period Configurable

```bash
# In .env:
BROWSER_VM_GRACE_PERIOD_MS=30000  # 30 seconds
```

### 4. Add Health Check for Orphaned VMs

Periodic cleanup of VMs that weren't destroyed due to crashes:
```bash
# Cron job:
0 * * * * /opt/master-controller/scripts/cleanup-orphaned-browser-vms.sh
```

---

**Date**: October 21, 2025
**Status**: Root cause identified, fix designed
**Next Step**: Apply fix and test
**Priority**: CRITICAL - Blocks all OAuth flows

**User Request Quote**: "COMMON after we authorise or complete oauth in the browser the VM is disconnecting or crashing"
