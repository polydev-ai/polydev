# VM Browser Authentication Fix - Complete Summary

## Date: October 9, 2025

## Problem Statement

The browser-in-browser authentication flow at `https://www.polydev.ai/dashboard/remote-cli/auth` was failing with 500 errors. VMs were booting successfully and responding to ping, but the Master Controller couldn't communicate with the VM Browser Agent on port 8080.

## Root Cause Analysis

### Issue 1: Race Condition in VM Readiness Check
**File**: `/opt/master-controller/src/services/browser-vm-auth.js:147-197`

The `waitForVMReady` method only checked if the VM responded to ping, then immediately tried to communicate with the VM Browser Agent on port 8080. However, there's a timing gap between:
1. Network interface becoming available (ping works)
2. VM Browser Agent service starting and binding to port 8080

**Error Message**:
```
Authentication start failed {"metadata":{"module":"browser-auth","error":"fetch failed"}}
```

### Issue 2: VM Browser Agent Service Timing
**File**: `/var/lib/firecracker/snapshots/base/golden-rootfs.ext4:/etc/systemd/system/vm-browser-agent.service`

The VM Browser Agent systemd service was configured to start `After=network.target`, but this only ensures the network subsystem is initialized, not that the network interface has an IP address configured and is fully operational.

### Issue 3: Build Script Missing the Fix
**File**: `/opt/master-controller/scripts/build-golden-snapshot-complete.sh`

Even though we manually added the 10-second delay to a test VM's golden snapshot, the build script itself didn't have this configuration. When golden snapshots were rebuilt, they didn't include the fix.

## Solutions Implemented

### Fix 1: Enhanced VM Readiness Checking
**File Modified**: `/opt/master-controller/src/services/browser-vm-auth.js`
**Lines**: 147-229

Added a two-phase readiness check:

```javascript
async waitForVMReady(vmIP, maxWaitMs = 60000) {
    // ... ping checking logic ...

    const checkAgentHealth = async (vmIP, timeoutMs = 3000) => {
      try {
        const response = await fetch(`http://${vmIP}:8080/health`, {
          signal: AbortSignal.timeout(timeoutMs)
        });
        if (response.ok) {
          const data = await response.json();
          return data.status === 'ok';
        }
        return false;
      } catch (err) {
        return false;
      }
    };

    // First wait for ping, then wait for Agent health
    while (Date.now() - startTime < maxWaitMs) {
      if (!pingReady) {
        const reachable = await pingHost(vmIP, 5000);
        if (reachable) {
          pingReady = true;
          console.log('[WAIT-VM-READY] Ping successful, now checking Agent health');
        }
      }

      if (pingReady) {
        const agentHealthy = await checkAgentHealth(vmIP, 3000);
        if (agentHealthy) {
          return true;  // Both ping AND Agent are ready
        }
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }
}
```

**Backup Created**: `/opt/master-controller/src/services/browser-vm-auth.js.bak`

### Fix 2: Systemd Service Startup Delay
**File Modified**: `/opt/master-controller/scripts/build-golden-snapshot-complete.sh`
**Line**: 331

Added `ExecStartPre=/bin/sleep 10` to the VM Browser Agent systemd service configuration:

```ini
[Unit]
Description=VM Browser Agent
After=network.target vncserver@1.service
Wants=vncserver@1.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/vm-browser-agent
Environment=NODE_ENV=production
Environment=DISPLAY=:1
ExecStartPre=/bin/sleep 10          # ← ADDED THIS LINE
ExecStart=/usr/bin/node /opt/vm-browser-agent/server.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

This gives the network interface 10 seconds to fully initialize before the Agent tries to bind to port 8080.

### Fix 3: Master Controller Service Restart
Restarted the Master Controller service to apply the updated `waitForVMReady` code:

```bash
sudo systemctl restart master-controller
```

### Fix 4: Golden Snapshot Rebuild
Triggered a complete rebuild of the golden snapshot using the updated build script to ensure all new VMs include the systemd service fix:

```bash
cd /tmp && rm -rf fc-golden-build && \
/opt/master-controller/scripts/build-golden-snapshot-complete.sh
```

## Files Modified

### Remote Server Files (192.168.5.82)

1. **`/opt/master-controller/src/services/browser-vm-auth.js`**
   - Updated `waitForVMReady` method (lines 147-229)
   - Added `checkAgentHealth` function for Agent health checking
   - Backup: `/opt/master-controller/src/services/browser-vm-auth.js.bak`

2. **`/opt/master-controller/scripts/build-golden-snapshot-complete.sh`**
   - Added `ExecStartPre=/bin/sleep 10` to systemd service template (line 331)

3. **`/var/lib/firecracker/snapshots/base/golden-rootfs.ext4`**
   - Rebuilt with updated systemd service configuration
   - Timestamp: Oct 9 06:55 (first rebuild without fix)
   - Final rebuild: In progress (with fix)

### Local Files (No changes)

- `/Users/venkat/Documents/polydev-ai/src/app/api/vm/auth/route.ts` (no changes needed)
- `/Users/venkat/Documents/polydev-ai/src/app/api/auth/session/[sessionId]/route.ts` (no changes needed)
- `/Users/venkat/Documents/polydev-ai/src/app/api/auth/session/[sessionId]/complete/route.ts` (no changes needed)

## Testing Status

### Completed Tests
- ✅ Manual curl to VM Browser Agent health endpoint: `curl http://192.168.100.2:8080/health` returns `{"status":"ok"}`
- ✅ Master Controller service restart successful
- ✅ Updated `waitForVMReady` code verified in logs (shows "Ping successful, now checking Agent health")

### Pending Tests
- ⏳ Golden snapshot rebuild with 10-second delay (in progress)
- ⏳ Full authentication flow test with fresh VM
- ⏳ Verify Agent health check succeeds after 10-second delay

## Expected Behavior After Fix

1. User navigates to `https://www.polydev.ai/dashboard/remote-cli/auth`
2. Clicks "Authenticate with [Provider]"
3. Next.js API `/api/vm/auth` forwards request to Master Controller
4. Master Controller creates VM from golden snapshot
5. Master Controller waits for VM readiness:
   - First checks ping (network layer ready)
   - Then checks Agent `/health` endpoint (application layer ready)
6. Master Controller calls Agent's `/auth/[provider]` endpoint
7. Agent opens Firefox to OAuth page via VNC
8. User completes OAuth in browser
9. Credentials extracted and stored
10. Authentication complete

## Verification Commands

```bash
# Check if golden snapshot has latest timestamp
ls -lh /var/lib/firecracker/snapshots/base/golden-rootfs.ext4

# Monitor build progress
tail -f /tmp/golden-rebuild-final.log

# Test authentication flow
curl -X POST http://localhost:4000/api/auth/start \
  -H 'Content-Type: application/json' \
  -d '{"userId":"5abacdd1-6a9b-48ce-b723-ca8056324c7a","provider":"claude_code"}'

# Check Master Controller logs
sudo journalctl -u master-controller -f --output=cat

# Verify VM responds to ping
ping 192.168.100.2

# Verify Agent health endpoint
curl http://192.168.100.2:8080/health
```

## Timeline

- **06:39 UTC**: First golden snapshot rebuild (without systemd delay in build script)
- **06:52 UTC**: Updated `waitForVMReady` in Master Controller
- **06:52 UTC**: Restarted Master Controller service
- **06:53-06:54 UTC**: Tested authentication flow - VM ping works but Agent health fails
- **06:55 UTC**: Second golden snapshot rebuild completed (still without fix)
- **06:56 UTC**: Discovered build script doesn't have systemd delay
- **06:57 UTC**: Updated build script to include `ExecStartPre=/bin/sleep 10`
- **06:57 UTC**: Started final golden snapshot rebuild with complete fix

## Next Steps

1. ✅ Wait for golden snapshot rebuild to complete (~5 minutes)
2. Test authentication flow with fresh VM
3. Monitor logs to verify:
   - VM boots successfully
   - Ping succeeds within 5 seconds
   - Agent health check succeeds after ~10-15 seconds
   - Master Controller successfully communicates with Agent
4. Test full OAuth flow in browser

## Known Issues

### EXT4 Filesystem Errors (Non-Blocking)
During VM boot, there are EXT4-fs errors visible in the console logs:
```
EXT4-fs (vda): mounted filesystem with ordered data mode. Opts: (null). Quota mode: none.
```

These errors don't prevent the VM from functioning, but may indicate minor filesystem corruption. If issues persist, consider rebuilding the golden snapshot from scratch with a clean filesystem.

## Rollback Plan

If the fix doesn't work:

1. Restore original `waitForVMReady`:
   ```bash
   sudo cp /opt/master-controller/src/services/browser-vm-auth.js.bak \
          /opt/master-controller/src/services/browser-vm-auth.js
   sudo systemctl restart master-controller
   ```

2. Investigate alternative approaches:
   - Use `After=network-online.target` in systemd service
   - Add network interface readiness check in systemd service
   - Increase wait timeout in Master Controller
   - Add retry logic with exponential backoff

## References

- Master Controller Repository: `/opt/master-controller/`
- Golden Snapshot Build Script: `/opt/master-controller/scripts/build-golden-snapshot-complete.sh`
- VM Browser Agent: `/opt/master-controller/vm-browser-agent/server.js`
- VNC Configuration: Port 5901 (VNC), 6080 (noVNC), 8080 (Agent HTTP)
