# Browser VM Fix Runbook

## Problem Summary
Browser VMs fail health checks because the Node.js HTTP service on port 8080 doesn't start properly inside the Firecracker VM.

## Root Causes Identified
1. **Missing error handlers** in `server.js` causing silent crashes
2. **systemd service** not properly configured with network dependency
3. **Stale VM records** in database causing session confusion

## Complete Fix Steps

### Step 1: Clean Up Stale Browser VM (Do this FIRST)

```bash
# SSH to mini PC
ssh polydev@192.168.10.133

# Check for running Firecracker processes
ps aux | grep firecracker

# Find the Browser VM process for vm-6b03852d
ps aux | grep 6b03852d

# If found, kill it
sudo kill -9 <PID>

# Clean up any residual files
sudo rm -rf /var/lib/firecracker/vms/vm-6b03852d*
sudo rm -f /var/run/firecracker/vm-6b03852d*.sock

# Remove TAP device if exists
sudo ip link show | grep fc-vm-6b03852d
sudo ip link delete fc-vm-6b03852d-tap0 || true
```

### Step 2: Mark VM as Destroyed in Database

Run this SQL in Supabase:

```sql
UPDATE vms
SET status = 'destroyed', destroyed_at = NOW()
WHERE vm_id = 'vm-6b03852d-0631-4f91-ae8a-fd352348e9c2';

-- Also mark the session as failed
UPDATE auth_sessions
SET status = 'failed',
    error_message = 'VM health check timeout - manual cleanup'
WHERE session_id = '86549de0-c3bf-4803-8ef6-af99e2436023';
```

### Step 3: Fix the Browser VM Golden Snapshot

The Browser VM image needs the Node.js service fixed. Connect to mini PC:

```bash
ssh polydev@192.168.10.133
cd /path/to/browser-vm-build  # wherever your Browser VM code is

# Check if vm-browser-agent exists
ls -la master-controller/vm-browser-agent/

# The server.js file should have proper error handling
cat master-controller/vm-browser-agent/server.js
```

**Required fixes in server.js:**

1. Add process-level error handlers at the TOP of the file:

```javascript
// Add at the very top after requires
process.on('uncaughtException', (error) => {
  console.error('[FATAL] Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
```

2. Add error handling to HTTP server creation:

```javascript
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[SERVER] Browser VM auth service listening on port ${PORT}`);
});

server.on('error', (error) => {
  console.error('[SERVER-ERROR] Failed to start server:', error);
  process.exit(1);
});
```

3. Add timeout handling for Supabase operations:

```javascript
// Wrap Supabase calls with timeout
async function withTimeout(promise, timeoutMs = 5000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
    ),
  ]);
}
```

### Step 4: Fix the systemd Service

The systemd unit file needs network dependencies:

```bash
# Edit the service file
sudo nano /etc/systemd/system/browser-vm-auth.service
```

Required content:

```ini
[Unit]
Description=Browser VM Authentication Service
After=network-online.target
Wants=network-online.target
StartLimitIntervalSec=0

[Service]
Type=simple
Restart=always
RestartSec=5
User=root
WorkingDirectory=/root/vm-browser-agent
Environment=NODE_ENV=production
Environment=PORT=8080
ExecStartPre=/bin/sleep 2
ExecStart=/usr/bin/node /root/vm-browser-agent/server.js
StandardOutput=journal
StandardError=journal
SyslogIdentifier=browser-vm-auth

# Resource limits
LimitNOFILE=65536
MemoryLimit=512M

[Install]
WantedBy=multi-user.target
```

Reload and enable:

```bash
sudo systemctl daemon-reload
sudo systemctl enable browser-vm-auth
```

### Step 5: Rebuild the Golden Snapshot

After making the fixes above, rebuild the Browser VM snapshot:

```bash
cd /path/to/master-controller
./scripts/build-golden-snapshot-complete.sh browser
```

This script should:
1. Boot a temporary Firecracker VM
2. Install dependencies and copy fixed server.js
3. Configure systemd service
4. Create snapshot
5. Save to `/var/lib/firecracker/snapshots/browser-vm-golden.snap`

### Step 6: Verify the Fix

1. Launch a new Browser VM session from the dashboard
2. Watch the master-controller logs:

```bash
# On mini PC
journalctl -u master-controller -f
```

3. You should see:
   - `[LAUNCH-BROWSER-VM] Starting Browser VM...`
   - `[WAIT-VM-READY] Attempting health check...`
   - `[WAIT-VM-READY] Health check successful` ✅

4. The dashboard should show the browser window loading

### Step 7: Database Cleanup (Optional but Recommended)

Clean up all old destroyed Browser VMs:

```sql
-- Delete old destroyed Browser VMs older than 24 hours
DELETE FROM vms
WHERE vm_type = 'browser'
  AND status = 'destroyed'
  AND destroyed_at < NOW() - INTERVAL '24 hours';

-- Delete old failed/timed-out auth sessions
DELETE FROM auth_sessions
WHERE status IN ('failed', 'timeout')
  AND created_at < NOW() - INTERVAL '24 hours';
```

## Testing Checklist

- [ ] Stale VM cleaned up from host
- [ ] Database updated (VM marked destroyed, session marked failed)
- [ ] server.js has error handlers
- [ ] systemd service has network dependencies
- [ ] Golden snapshot rebuilt
- [ ] New session launches successfully
- [ ] Health check passes
- [ ] Browser window loads in dashboard
- [ ] OAuth flow completes

## Troubleshooting

### If health check still fails:

1. Check if service is running inside VM:
```bash
# From mini PC, find the VM's IP
# Then check if port 8080 is listening
curl http://192.168.100.X:8080/health
```

2. Check service logs inside VM (if you can console into it):
```bash
sudo journalctl -u browser-vm-auth -n 50
```

3. Check for firewall rules blocking port 8080:
```bash
sudo iptables -L -n | grep 8080
```

### If VM won't start:

1. Check Firecracker logs:
```bash
journalctl -u master-controller | grep ERROR
```

2. Check snapshot exists:
```bash
ls -lh /var/lib/firecracker/snapshots/browser-vm-golden*
```

3. Try manual Firecracker launch to test snapshot:
```bash
cd /tmp
sudo firecracker --api-sock /tmp/test.sock --config-file test-config.json
```

## Emergency Workaround

If you need to get things working immediately:

1. Mark ALL existing Browser VMs as destroyed:
```sql
UPDATE vms SET status = 'destroyed', destroyed_at = NOW() WHERE vm_type = 'browser' AND status != 'destroyed';
```

2. Restart master-controller:
```bash
ssh polydev@192.168.10.133
sudo systemctl restart master-controller
```

3. Try a fresh session from dashboard

## References

- Polydev AI consultation results (in conversation context)
- master-controller/vm-browser-agent/server.js
- master-controller/scripts/build-golden-snapshot-complete.sh
- Firecracker docs: https://github.com/firecracker-microvm/firecracker/blob/main/docs/snapshotting/snapshot-support.md
