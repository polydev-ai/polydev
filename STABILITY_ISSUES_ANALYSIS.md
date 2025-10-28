# VM Connection Stability Issues - Analysis & Fixes

**Date:** October 28, 2025, 19:45 CET
**Status:** DNS Fixed ✅ | Session Management Broken ❌

## Summary of Current State

### What's Working ✅
1. **DNS Configuration**: Golden image now has static Google DNS (8.8.8.8, 8.8.4.4)
2. **VM Creation**: VMs boot successfully and all services start
3. **Network**: VMs have IP addresses and can be reached on ports 8080, 5901, 6080
4. **Agent Status**: vm-browser-agent responds with health checks

### What's Broken ❌
1. **Session Tracking**: Frontend loses track of sessions after VM creation
2. **IP Address Mismatch**: Frontend queries wrong IPs (stale data)
3. **404 Errors**: Session lookup failures in master-controller
4. **Frequent Disconnects**: Frontend shows "Creating VM" then disconnects
5. **Refresh Failures**: Page refresh causes complete connection loss

## Root Causes Identified

### 1. Session State Desync
**Problem**: Session created in database but not properly associated with VM

**Evidence from logs**:
```
[OAuth URL Proxy] Status: 404, Response: {"error":"Session not found"}
GET /api/vm/auth/session/547b1680-3aa8-44a5-b75d-7a3eaebf872b/oauth-url 202
```

**Root Cause**:
- Frontend creates session with session ID
- Master-controller creates VM with different ID/mapping
- Database query returns `null` for sessions
- Frontend polls endpoints that don't exist

### 2. IP Address Tracking Issues
**Problem**: System tries to connect to wrong VM IP addresses

**Evidence**:
```
[VM Status] { vmId: 'vm-e12f9', internalIP: '192.168.100.22', status: 'failed' }
[OAuth URL Proxy] {"error":"connect ECONNREFUSED 192.168.100.10:8080"}
```

**Actual VM**: 192.168.100.11 (working fine)
**Frontend trying**: 192.168.100.10, 192.168.100.22 (non-existent or destroyed)

### 3. VM Auto-Destruction
**Problem**: VMs may be getting destroyed too quickly on health check failures

**Evidence**:
- 10 old VM directories exist but no processes running
- Only newest VM (vm-e146c784) is running
- Session `547b1680` returns 404 (VM likely destroyed)

### 4. Database Connection Issues
**Problem**: Supabase queries returning `null` instead of data

**Evidence**:
```javascript
const { data } = await supabase.from('oauth_sessions').select('*')...
console.log(JSON.stringify(data, null, 2));
// Output: null
```

## Proposed Fixes

### Fix 1: Improve Session-to-VM Mapping

**File**: `master-controller/src/services/vm-manager.js`

**Changes Needed**:
1. Store session-to-VM mapping in memory AND database
2. Add session lookup endpoint that returns VM details
3. Prevent VM destruction if session is active
4. Add session heartbeat/keepalive mechanism

```javascript
// Add to VM manager
const sessionVMMap = new Map(); // In-memory cache

async function createVMForSession(sessionId, userId, provider) {
  const vm = await createVM(...);

  // Store mapping in memory
  sessionVMMap.set(sessionId, {
    vmId: vm.id,
    vmIP: vm.internalIP,
    created: Date.now(),
    lastHeartbeat: Date.now()
  });

  // Store in database
  await supabase.from('oauth_sessions').upsert({
    session_id: sessionId,
    vm_id: vm.id,
    vm_ip: vm.internalIP,
    status: 'active'
  });

  return vm;
}
```

### Fix 2: Add Session Lookup Endpoint

**File**: `master-controller/src/routes/auth.js`

```javascript
// GET /api/auth/session/:sessionId/vm
router.get('/session/:sessionId/vm', async (req, res) => {
  const { sessionId } = req.params;

  // Try in-memory first
  let vmInfo = sessionVMMap.get(sessionId);

  // Fallback to database
  if (!vmInfo) {
    const { data } = await supabase
      .from('oauth_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (data) {
      vmInfo = {
        vmId: data.vm_id,
        vmIP: data.vm_ip,
        created: new Date(data.created_at).getTime(),
        lastHeartbeat: new Date(data.updated_at).getTime()
      };
    }
  }

  if (!vmInfo) {
    return res.status(404).json({ error: 'Session not found' });
  }

  // Verify VM still exists
  const vmExists = await checkVMExists(vmInfo.vmId);
  if (!vmExists) {
    return res.status(410).json({ error: 'VM no longer exists' });
  }

  res.json(vmInfo);
});
```

### Fix 3: Prevent Premature VM Destruction

**File**: `master-controller/src/tasks/background.js`

**Current Issue**: VMs are destroyed after 2 minutes of failed health checks

**Fix**: Check for active sessions before destroying

```javascript
async function healthCheckTask() {
  for (const vm of runningVMs) {
    const isHealthy = await checkVMHealth(vm);

    if (!isHealthy) {
      vm.failedHealthChecks++;

      if (vm.failedHealthChecks >= 3) {
        // CHECK FOR ACTIVE SESSIONS FIRST
        const hasActiveSessions = await checkActiveSessions(vm.id);

        if (hasActiveSessions) {
          logger.warn(`VM ${vm.id} unhealthy but has active sessions, keeping alive`);
          continue;
        }

        logger.info(`Destroying unhealthy VM ${vm.id}`);
        await destroyVM(vm.id);
      }
    }
  }
}
```

### Fix 4: Add Session Heartbeat

**File**: `src/app/dashboard/remote-cli/auth/page.tsx`

```typescript
// Add heartbeat every 10 seconds
useEffect(() => {
  if (!sessionId) return;

  const heartbeat = setInterval(async () => {
    try {
      await fetch(`/api/auth/session/${sessionId}/heartbeat`, {
        method: 'POST'
      });
    } catch (error) {
      console.warn('Heartbeat failed:', error);
    }
  }, 10000);

  return () => clearInterval(heartbeat);
}, [sessionId]);
```

### Fix 5: Improve Error Handling on Refresh

**File**: `src/app/dashboard/remote-cli/auth/page.tsx`

**Current Issue**: Page refresh loses all state

**Fix**: Store session in URL params and restore from server

```typescript
// On mount, check URL params
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const urlSessionId = params.get('session');

  if (urlSessionId) {
    // Restore session from server
    fetch(`/api/auth/session/${urlSessionId}/vm`)
      .then(res => res.json())
      .then(data => {
        setSessionId(urlSessionId);
        setVmIP(data.vmIP);
        // Resume connection
      })
      .catch(err => {
        console.error('Failed to restore session:', err);
        // Start fresh
      });
  }
}, []);
```

### Fix 6: Add Connection Retry Logic

**File**: `src/components/VNCViewer.tsx` (if exists) or noVNC integration

```typescript
const connectWithRetry = async (url: string, maxRetries = 5) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await connect(url);
      return;
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      // Exponential backoff: 1s, 2s, 4s, 8s, 16s
      const delay = Math.min(1000 * Math.pow(2, i), 16000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};
```

### Fix 7: Database Query Debugging

**File**: `master-controller/src/db/supabase.js`

**Issue**: Queries returning `null`

**Possible Causes**:
1. RLS policies blocking read access
2. Wrong table name
3. Connection not initialized

**Debug**:
```javascript
// Add detailed logging
const { data, error } = await supabase
  .from('oauth_sessions')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(5);

console.log('Supabase query result:', {
  data,
  error,
  count: data?.length
});

if (error) {
  console.error('Supabase error:', error);
}
```

## Implementation Priority

### Phase 1: Critical Stability (Do First)
1. ✅ Fix DNS (DONE)
2. ⏳ Add session-to-VM mapping with in-memory cache
3. ⏳ Fix database query issues (debug why returning null)
4. ⏳ Add session lookup endpoint
5. ⏳ Prevent premature VM destruction

### Phase 2: Connection Reliability
1. ⏳ Add session heartbeat
2. ⏳ Improve error handling on refresh
3. ⏳ Add connection retry logic
4. ⏳ Better state management in frontend

### Phase 3: Multi-VM Support
1. ⏳ Test multiple simultaneous VMs
2. ⏳ Ensure unique ports/IPs for each VM
3. ⏳ Load balancing if needed
4. ⏳ Resource cleanup for old VMs

## Testing Checklist

Once fixes are implemented:

- [ ] Create new VM via frontend
- [ ] Verify session tracking works
- [ ] Refresh page and verify reconnection
- [ ] Create second VM (concurrent)
- [ ] Verify both VMs work independently
- [ ] Test noVNC connection stability
- [ ] Verify OAuth URL generation is fast (<5s)
- [ ] Test browser auto-launch in VM
- [ ] Test terminal auto-launch in VM
- [ ] Verify VM doesn't disconnect prematurely
- [ ] Test 10+ minute session longevity

## Current VM Inventory

**Running VMs**: 10 total Firecracker processes
**Latest VM**: vm-e146c784-61f8-4cd7-86c4-eae71252c961
**IP**: 192.168.100.11
**Status**: ✅ Healthy (agent responding, noVNC working, 1 active session)

**Issue**: Frontend is trying to connect to non-existent sessions/VMs instead of the working one.

## Next Steps

1. **Immediate**: Debug why Supabase queries return null
2. **High Priority**: Implement session-to-VM mapping
3. **High Priority**: Add session lookup endpoint
4. **Medium Priority**: Add heartbeat and retry logic
5. **Medium Priority**: Improve frontend state management
6. **Low Priority**: Clean up old VM directories

