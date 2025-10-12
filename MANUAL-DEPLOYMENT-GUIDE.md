# 🚀 MANUAL DEPLOYMENT GUIDE

## Problem
Automated SSH deployment is failing with "Permission denied" errors. This guide provides manual deployment steps.

## Prerequisites
- You have an active SSH session to 192.168.5.82 (detected process ID 1085)
- OR you can SSH manually: `ssh backspace@192.168.5.82`

## Option 1: Copy Files via Active SSH Session

### Step 1: Copy files to server
In a NEW terminal on your Mac (not the SSH session):

```bash
# Copy the updated files to /tmp on the server
# You'll need to enter the password when prompted
scp /Users/venkat/Documents/polydev-ai/master-controller/src/index.js backspace@192.168.5.82:/tmp/index.js
scp /Users/venkat/Documents/polydev-ai/master-controller/src/services/vm-manager.js backspace@192.168.5.82:/tmp/vm-manager.js
```

### Step 2: Move files and restart service
In your EXISTING SSH session (or new one):

```bash
# Move files to correct location
sudo cp /tmp/index.js /opt/master-controller/src/index.js
sudo cp /tmp/vm-manager.js /opt/master-controller/src/services/vm-manager.js

# Restart service
sudo systemctl restart master-controller

# Wait and check status
sleep 5
sudo systemctl status master-controller --no-pager | head -20
```

## Option 2: Copy-Paste File Contents

If SCP also fails, you can copy-paste the file contents directly.

### Step 1: SSH into server
```bash
ssh backspace@192.168.5.82
```

### Step 2: Edit index.js
```bash
sudo nano /opt/master-controller/src/index.js
```

**Copy the entire contents from:**
`/Users/venkat/Documents/polydev-ai/master-controller/src/index.js`

Key changes to verify:
- Lines 32-44: Request-entry logging middleware
- Lines 86-95: Canary /debug/ping endpoint

### Step 3: Edit vm-manager.js
```bash
sudo nano /opt/master-controller/src/services/vm-manager.js
```

**Copy the entire contents from:**
`/Users/venkat/Documents/polydev-ai/master-controller/src/services/vm-manager.js`

Key changes to verify:
- Lines 228-235: withTimeout() helper function
- Lines 237-345: Refactored createVM() with per-step logging

### Step 4: Restart service
```bash
sudo systemctl restart master-controller
sleep 5
sudo systemctl status master-controller --no-pager | head -20
```

## Option 3: Use Git (If Available)

If you have git set up on the production server:

```bash
# On production server
cd /opt/master-controller
sudo git pull origin main  # or whatever branch has the fixes
sudo systemctl restart master-controller
```

## Verification Steps

### Test 1: Canary Endpoint (30 seconds)
```bash
curl http://192.168.5.82:4000/api/debug/ping
```

**Expected Response:**
```json
{
  "success": true,
  "message": "pong",
  "timestamp": "2025-10-11T...",
  "requestId": "req-..."
}
```

**If this fails:**
- ❌ Node.js process is not running or blocked
- Check: `sudo systemctl status master-controller`
- Check: `sudo journalctl -u master-controller -n 50`

**If this succeeds:**
- ✅ Node.js is healthy and receiving requests
- ✅ Request-entry logging is working
- Proceed to Test 2

### Test 2: Monitor Logs in Real-Time

Open a terminal and keep this running:
```bash
ssh backspace@192.168.5.82
sudo journalctl -u master-controller -f
```

You should see:
```
[CANARY] /api/debug/ping hit
```

### Test 3: Auth Endpoint Test

In ANOTHER terminal (while monitoring logs from Test 2):
```bash
curl -v -X POST http://192.168.5.82:4000/api/auth/start \
  -H 'Content-Type: application/json' \
  -d '{"userId":"5abacdd1-6a9b-48ce-b723-ca8056324c7a","provider":"claude_code"}' \
  --connect-timeout 30 \
  --max-time 30
```

Watch the logs from Test 2. You should see:

### Scenario A: Request Reaches Node.js (GOOD)
```
[REQUEST-ENTRY] Incoming request { url: '/api/auth/start', method: 'POST' }
[routes:auth] Starting authentication { userId, provider }
[browser-auth] Starting authentication
[browser-auth] Creating CLI VM before authentication
[VM-CREATE] Starting VM creation { vmId, vmType: 'cli' }
[VM-CREATE] Step 1: Allocating IP
[VM-CREATE] Step 1: IP allocated { ipAddress, elapsed: 2 }
[VM-CREATE] Step 2: Creating TAP device
...
```

**This means:** Request reached Node.js. Look at which step fails/hangs.

### Scenario B: Request NEVER Reaches Node.js (BAD)
```
(no logs at all)
```

**This means:** Request blocked at proxy/load balancer layer. Need to check:
1. Nginx/HAProxy/ALB configuration
2. Timeout settings in reverse proxy
3. Network routing
4. Firewall rules

Check for reverse proxy:
```bash
# On production server
sudo ss -tlnp | grep :4000
sudo nginx -T 2>/dev/null | grep timeout
sudo cat /etc/haproxy/haproxy.cfg 2>/dev/null | grep timeout
```

### Scenario C: Hangs at Specific Step
```
[VM-CREATE] Step 2: TAP device created { elapsed: 178 }
[VM-CREATE] Step 3: Cloning golden snapshot
(no more logs, times out)
```

**This means:** Specific step is hanging. Check based on step number:

**Step 1 (Allocate IP):** Network pool exhaustion
```bash
ip addr show | grep "192.168.100"
```

**Step 2 (TAP device):** TAP device exhaustion or bridge issues
```bash
ip link show | grep -c "tap"
ip link show br0
```

**Step 3 (Clone snapshot):** Disk issues or corrupted snapshot
```bash
df -h /opt/firecracker
ls -lh /opt/firecracker/golden/rootfs.ext4
time sudo cp --reflink=auto /opt/firecracker/golden/rootfs.ext4 /tmp/test.ext4
```

**Step 4 (Create config):** File system permissions
```bash
ls -la /opt/firecracker/configs/
```

**Step 5 (Database):** Connection pool exhaustion
```bash
# Look for "connection pool" in logs
sudo journalctl -u master-controller -n 200 | grep -i "pool"
```

**Step 6 (Start Firecracker):** Firecracker process or KVM issues
```bash
ps aux | grep firecracker | grep -v grep
ls -la /dev/kvm
ls -la /dev/net/tun
sudo lsmod | grep kvm
```

## Success Criteria

✅ `/api/debug/ping` responds in <1 second
✅ `[REQUEST-ENTRY]` logs appear for `/api/auth/start`
✅ All 6 VM creation steps complete
✅ CLI VM created with `vm_type='cli'`
✅ Authentication completes successfully

## If Still Failing

If diagnostic logs reveal the exact failure point but you can't resolve it:

1. **Take Screenshots** of the logs showing the failure
2. **Copy Full Log Output**:
   ```bash
   sudo journalctl -u master-controller -n 500 > /tmp/logs.txt
   ```
3. **Share System Metrics**:
   ```bash
   top -b -n 1 | head -20
   free -h
   df -h
   ip link show
   ulimit -a
   ```
4. **Use Polydev AI** with the specific error details

## Files Modified

1. `/opt/master-controller/src/index.js`
   - Added request-entry logging (lines 32-44)
   - Added canary endpoint (lines 86-95)

2. `/opt/master-controller/src/services/vm-manager.js`
   - Added withTimeout() helper (lines 228-235)
   - Refactored createVM() with per-step timeouts (lines 237-345)

## Rollback (If Needed)

If you need to rollback the changes:

```bash
cd /opt/master-controller
sudo git log --oneline -5  # see recent commits
sudo git checkout HEAD~1   # go back one commit
sudo systemctl restart master-controller
```

---

**Created:** 2025-10-11
**Issue:** 24-second authentication timeout (100+ failures)
**Status:** Awaiting manual deployment due to SSH authentication issues
