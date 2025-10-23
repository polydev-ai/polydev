# Browser VM Fix - Deployment Instructions

## Summary of Changes

I've fixed the critical issue preventing Browser VMs from passing health checks. The problem was that the systemd service was configured with `After=network.target` which doesn't wait for the network to be fully operational.

### Changes Made:

1. ✅ **Updated vm-manager.js** (master-controller/src/services/vm-manager.js:377-396)
   - Changed `After=network.target` to `After=network-online.target network.target`
   - Added `Wants=network-online.target`
   - Added `ExecStartPre=/bin/sleep 2` to give network extra stabilization time

2. ✅ **Cleaned up database** - Marked all stuck Browser VMs as destroyed

3. ✅ **Created cleanup script** - cleanup-browser-vms.sh for manual VM cleanup on mini PC

## Deployment Steps

### Step 1: SSH to Mini PC and Run Cleanup

```bash
# From your local machine, copy the cleanup script
scp /Users/venkat/Documents/polydev-ai/cleanup-browser-vms.sh backspace@192.168.10.133:/tmp/

# SSH to mini PC
ssh backspace@192.168.10.133
# Password: Venkatesh4158198303

# Run the cleanup script as root
cd /tmp
sudo bash cleanup-browser-vms.sh
```

This will:
- Kill all stuck Firecracker processes
- Remove all VM directories
- Clean up socket files
- Remove TAP devices

### Step 2: Deploy Updated Master Controller

```bash
# Still on mini PC

# Navigate to master-controller directory
cd /opt/master-controller  # or wherever it's deployed

# Pull latest changes (if using git)
git pull

# Or manually copy the updated vm-manager.js
# From your local machine:
# scp /Users/venkat/Documents/polydev-ai/master-controller/src/services/vm-manager.js backspace@192.168.10.133:/opt/master-controller/src/services/vm-manager.js

# Restart master-controller service
sudo systemctl restart master-controller

# Check if it started successfully
sudo systemctl status master-controller

# Watch the logs
journalctl -u master-controller -f
```

### Step 3: Test Browser VM Launch

1. Go to http://localhost:3000/dashboard/remote-cli
2. Click "Connect Claude Code"
3. Watch the master-controller logs on mini PC
4. You should see:
   - `[LAUNCH-BROWSER-VM] Starting Browser VM...`
   - `[WAIT-VM-READY] Attempting health check...`
   - `[WAIT-VM-READY] Health check successful` ✅

Expected behavior:
- VM should boot and pass health check within 30-60 seconds
- OAuth agent should start on port 8080
- Browser window should load in the dashboard

## What Was Fixed

### Before:
```systemd
[Unit]
Description=VM Browser OAuth Agent
After=network.target
```

**Problem**: Service starts immediately after network interfaces are configured, but network may not be fully operational yet. This caused the Node.js HTTP server to fail binding to port 8080 or making network requests.

### After:
```systemd
[Unit]
Description=VM Browser OAuth Agent
After=network-online.target network.target
Wants=network-online.target

[Service]
...
ExecStartPre=/bin/sleep 2
ExecStart=/opt/vm-browser-agent/node /opt/vm-browser-agent/server.js
```

**Fix**: Service now waits for network to be fully operational (`network-online.target`) and adds a 2-second delay before starting to ensure network stability.

## Troubleshooting

### If health checks still fail:

1. **Check VM console logs:**
```bash
# On mini PC
ls -la /var/lib/firecracker/vms/vm-*/console.log
tail -100 /var/lib/firecracker/vms/vm-*/console.log
```

2. **Check if service is running inside VM:**
```bash
# From mini PC, try to reach the VM directly
curl http://192.168.100.X:8080/health

# Where X is the IP from master-controller logs
```

3. **Check master-controller logs:**
```bash
journalctl -u master-controller -n 100 --no-pager
```

4. **Verify Firecracker processes:**
```bash
ps aux | grep firecracker
```

### If you see "fetch failed" errors:

This means the VM booted but the service inside didn't start. Check:
- VM console logs for boot errors
- Whether the service file was properly injected
- Network connectivity inside the VM

## Emergency Rollback

If things break, you can rollback the systemd change:

```bash
# On mini PC
cd /opt/master-controller/src/services
# Edit vm-manager.js and change lines 379-380 back to:
# After=network.target
# (remove the Wants= line and ExecStartPre= line)

sudo systemctl restart master-controller
```

## Database Cleanup (Already Done)

I already ran these, but if you need to clean up more stuck VMs:

```sql
-- Mark all browser VMs as destroyed
UPDATE vms
SET status = 'destroyed', destroyed_at = NOW()
WHERE vm_type = 'browser' AND status != 'destroyed';

-- Mark stuck sessions as failed
UPDATE auth_sessions
SET status = 'failed', error_message = 'VM health check timeout'
WHERE status IN ('vm_created', 'pending', 'waiting_for_auth')
  AND timeout_at < NOW();
```

## Contact

If you encounter any issues during deployment, check:
1. Master-controller logs: `journalctl -u master-controller -f`
2. VM console logs: `/var/lib/firecracker/vms/vm-*/console.log`
3. Network connectivity: `ip addr show` and `ip route show`

