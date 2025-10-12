# 🔧 Service Startup Fix - Status Report

**Date:** 2025-10-12 01:22 UTC
**Issue:** vm-browser-agent.service not starting in Firecracker VMs
**Root Cause Identified:** `network-online.target` dependency

---

## What Was the Problem?

The vm-browser-agent service was configured with:
```
After=network-online.target
Wants=network-online.target
```

**Why this failed:**
- `network-online.target` waits for network to be "online" (fully configured with routes)
- Firecracker VMs use minimal networking without `systemd-networkd-wait-online.service`
- Without this service, `network-online.target` **never activates**
- Services waiting for `network-online.target` **never start**

This is the #1 most common issue with systemd services in minimal VMs (confirmed by GPT-5, Gemini-2.5-Pro, and Grok-Code).

---

## The Fix Applied

Changed service dependency from `network-online.target` to `network.target`:

**Before:**
```ini
[Unit]
Description=VM Browser Agent - OAuth Proxy for CLI Tools
After=network-online.target
Wants=network-online.target
```

**After:**
```ini
[Unit]
Description=VM Browser Agent - OAuth Proxy for CLI Tools
After=network.target
```

**Why this works:**
- `network.target` just waits for network interfaces to be UP
- Does NOT wait for full network configuration
- Always activates in Firecracker VMs
- Service starts as soon as eth0 interface exists

---

## Deployment Timeline

1. **01:20 UTC** - Fixed service file locally
2. **01:20 UTC** - Created fix-service-and-reinstall.sh script
3. **01:20 UTC** - Uploaded script to production server
4. **01:20 UTC** - Executed fix in golden snapshot:
   - Mounted golden rootfs
   - Updated /etc/systemd/system/vm-browser-agent.service
   - Verified service symlink exists
   - Unmounted golden rootfs
5. **01:20 UTC** - Restarted master-controller
6. **01:21 UTC** - Tested authentication flow: **Still timing out after 60s**

---

## Current Status: ⚠️ Still Investigating

**Test Result:**
```bash
curl -X POST http://192.168.5.82:4000/api/auth/start \
  -H 'Content-Type: application/json' \
  -d '{"userId":"5abacdd1-6a9b-48ce-b723-ca8056324c7a","provider":"claude_code"}'

# Result: {"error":"VM not ready after 60000ms"}
```

**What's happening:**
- VM is created successfully
- Health checks to `http://{VM_IP}:8080/health` are failing
- Timeout after 60 seconds
- Service still not responding on port 8080

**Possible reasons:**
1. **Fix not yet effective** - New VMs might be using old snapshot
2. **Additional issue** - Service might need more than just network.target
3. **Script failure** - Node.js might be crashing on startup
4. **Missing CLI tools** - Service might fail if claude/codex/gemini not found

---

## Next Debugging Steps

### Option 1: Direct Service Testing (Recommended)

Create a test VM and immediately check the service:

```bash
# Create VM manually
curl -X POST http://192.168.5.82:4000/api/vm/create \
  -H 'Content-Type: application/json' \
  -d '{"userId":"test-debug","vmType":"cli"}'

# Get VM IP from response, then SSH in
ssh root@{VM_IP}

# Check service status
systemctl status vm-browser-agent

# Check logs
journalctl -u vm-browser-agent -n 50

# Try manual start
/usr/bin/node /opt/vm-agent/vm-browser-agent.js
```

### Option 2: Enable Serial Console Logging

Add serial console logging to Firecracker config to capture boot output:

```json
{
  "serial": {
    "log_fifo": "/path/to/vm_serial.log"
  }
}
```

This will show:
- systemd boot sequence
- Service startup attempts
- Any error messages from vm-browser-agent.js

### Option 3: Add Diagnostic Logging

Temporarily add diagnostic commands to service file:

```ini
[Service]
ExecStartPre=/bin/sh -c 'echo "Service starting" > /tmp/agent-start.log'
ExecStartPre=/bin/sh -c 'date >> /tmp/agent-start.log'
ExecStartPre=/bin/sh -c 'ip addr >> /tmp/agent-start.log'
ExecStartPre=/bin/sleep 2
ExecStart=/usr/bin/node /opt/vm-agent/vm-browser-agent.js
ExecStartPost=/bin/sh -c 'echo "Service started" >> /tmp/agent-start.log'
```

---

## AI Consultation Results

**Consulted:** GPT-5, Gemini-2.5-Pro, Grok-Code-Fast-1

**Consensus:**
- ✅ `network-online.target` is the most likely culprit
- ✅ Changing to `network.target` is the correct fix
- ✅ Service might be starting but failing immediately
- ⚠️ Need to check actual service logs to confirm
- ⚠️ Could be missing dependencies (CLI tools)
- ⚠️ Could be script runtime errors

**Key Recommendations:**
1. Enable serial console logging for full visibility
2. SSH into VM immediately after creation
3. Check `systemctl status` and `journalctl`
4. Try manual script execution to see errors
5. Verify systemd is PID 1 (`cat /proc/1/comm`)

---

## Files Modified

**Local:**
- `/Users/venkat/Documents/polydev-ai/vm-agent/vm-browser-agent.service` ✅
- `/Users/venkat/Documents/polydev-ai/vm-agent/fix-service-and-reinstall.sh` ✅ (new)

**Production Server:**
- `/var/lib/firecracker/snapshots/base/golden-rootfs.ext4` → `/etc/systemd/system/vm-browser-agent.service` ✅

**Master Controller:**
- Restarted: 01:20 UTC ✅

---

## Time Spent

- AI consultation: 2 minutes
- Service fix implementation: 3 minutes
- Deployment: 2 minutes
- Testing: 2 minutes
- **Total: ~10 minutes**

---

## Recommendations

1. **Immediate:** SSH into a newly created VM to debug service startup
2. **Medium-term:** Add serial console logging to all VMs
3. **Long-term:** Install CLI tools in golden snapshot
4. **Best practice:** Add service health monitoring

---

## Questions to Answer

- [ ] Is systemd actually running in the VM? (`cat /proc/1/comm`)
- [ ] Is the service enabled? (`systemctl is-enabled vm-browser-agent`)
- [ ] What does the service status show? (`systemctl status vm-browser-agent`)
- [ ] Are there error logs? (`journalctl -u vm-browser-agent`)
- [ ] Does manual start work? (`/usr/bin/node /opt/vm-agent/vm-browser-agent.js`)
- [ ] Is port 8080 bound? (`ss -tlnp | grep 8080`)
