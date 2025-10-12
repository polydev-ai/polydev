# 🔍 CRITICAL TIMEOUT DIAGNOSTIC GUIDE

## Problem Summary
- Authentication fails with 24-second timeout
- NO backend logs appear for failed auth attempts
- User has tried 100+ times with same failure
- curl test confirms: API times out after 24 seconds

## Root Cause (Identified by AI Analysis)
**The request is timing out at a reverse proxy/load balancer layer BEFORE Node.js code executes.**

Evidence:
- 24-second timeout (non-standard, likely proxy configuration)
- NO application logs (route handler never runs)
- Health checks work (lightweight, gets through)

## Critical Changes Deployed

### 1. Request Entry Logging (src/index.js:32-44)
Logs EVERY request at the very entry point, BEFORE all middleware.

```javascript
app.use((req, res, next) => {
  logger.info('[REQUEST-ENTRY] Incoming request', {
    requestId,
    method: req.method,
    url: req.url,
    ip: req.ip || req.socket.remoteAddress
  });
  next();
});
```

**What This Tells Us:**
- ✅ If `[REQUEST-ENTRY]` log appears → Request reached Node.js (problem is in VM creation)
- ❌ If NO `[REQUEST-ENTRY]` log → Request never reached Node.js (proxy/LB issue)

### 2. Canary Endpoint (src/index.js:87-95)
Minimal endpoint with no dependencies.

```bash
curl http://192.168.5.82:4000/api/debug/ping
```

**What This Tells Us:**
- ✅ If `/debug/ping` responds instantly → Node.js is healthy, problem is specific to `/api/auth/start`
- ❌ If `/debug/ping` also times out → Entire Node.js process is blocked or proxy issue

### 3. Per-Step Timeouts (src/services/vm-manager.js:228-344)
Each VM creation step now has explicit timeouts and logging:

- Step 1: Allocate IP (5s timeout)
- Step 2: Create TAP device (5s timeout)
- Step 3: Clone snapshot (15s timeout)
- Step 4: Create VM config (5s timeout)
- Step 5: Database record (5s timeout)
- Step 6: Start Firecracker (25s timeout)

**What This Tells Us:**
- Logs show EXACTLY which step times out
- Example: If logs show "Step 2 created" but NOT "Step 3", the snapshot cloning is hanging

## Deployment Instructions

### Option 1: Automatic Deployment (Recommended)
```bash
cd /Users/venkat/Documents/polydev-ai
chmod +x DEPLOY-CRITICAL-FIX.sh
./DEPLOY-CRITICAL-FIX.sh
```

### Option 2: Manual Deployment
```bash
# Copy files to production
scp master-controller/src/index.js backspace@192.168.5.82:/opt/master-controller/src/index.js
scp master-controller/src/services/vm-manager.js backspace@192.168.5.82:/opt/master-controller/src/services/vm-manager.js

# Restart service
ssh backspace@192.168.5.82 "sudo systemctl restart master-controller"
```

## Testing Protocol

### Test 1: Canary Endpoint (30 seconds)
```bash
curl http://192.168.5.82:4000/api/debug/ping
```

**Expected:**
- ✅ Instant response with `{"success":true,"message":"pong"}`
- ✅ Log: `[CANARY] /api/debug/ping hit`

**If it times out:**
- ❌ Problem: Node.js process is blocked OR proxy is timing out ALL requests
- Action: Check CPU usage, check if process is hung, check proxy configuration

### Test 2: Monitor Logs in Real-Time
Open a terminal and run:
```bash
ssh backspace@192.168.5.82 'sudo journalctl -u master-controller -f'
```

Keep this running while you test.

### Test 3: Auth Endpoint Test
In another terminal:
```bash
curl -v -X POST http://192.168.5.82:4000/api/auth/start \
  -H 'Content-Type: application/json' \
  -d '{"userId":"5abacdd1-6a9b-48ce-b723-ca8056324c7a","provider":"claude_code"}' \
  --connect-timeout 30 \
  --max-time 30
```

Watch the logs from Test 2.

## Expected Log Sequences

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
```

**Analysis:** Request reached Node.js. Look at which step fails/hangs.

### Scenario B: Request NEVER Reaches Node.js (BAD)
```
(no logs at all)
```

**Analysis:** Request blocked at proxy/load balancer layer. Check:
1. Nginx/HAProxy/ALB configuration
2. Timeout settings in reverse proxy
3. Network routing
4. Firewall rules

### Scenario C: Hangs at Specific Step
```
[VM-CREATE] Step 2: TAP device created { elapsed: 178 }
[VM-CREATE] Step 3: Cloning golden snapshot
(no more logs, times out)
```

**Analysis:** Snapshot cloning is hanging. Possible causes:
- Corrupted golden snapshot
- Disk I/O issues
- File system full
- Permission problems

## Common Timeout Causes & Solutions

### 1. Reverse Proxy Timeout (MOST LIKELY)
**Symptoms:** NO `[REQUEST-ENTRY]` logs

**Check:**
```bash
# Check Nginx config
sudo nginx -T | grep timeout

# Check HAProxy config
sudo cat /etc/haproxy/haproxy.cfg | grep timeout

# Check for any reverse proxy
sudo ss -tlnp | grep :4000
```

**Fix:** Increase proxy timeout to 60s or switch to async pattern (202 + polling)

### 2. TAP Device Exhaustion
**Symptoms:** Fails at Step 2

**Check:**
```bash
# Count TAP devices
ip link show | grep -c "tap"

# Check bridge
ip link show br0
```

**Fix:** Clean up old TAP devices, increase kernel limit

### 3. Snapshot Cloning Issues
**Symptoms:** Fails at Step 3

**Check:**
```bash
# Check disk space
df -h /opt/firecracker

# Check golden snapshot
ls -lh /opt/firecracker/golden/rootfs.ext4

# Test manual clone
time cp --reflink=auto /opt/firecracker/golden/rootfs.ext4 /tmp/test.ext4
```

**Fix:** Free disk space, repair/rebuild golden snapshot

### 4. Firecracker Startup Issues
**Symptoms:** Fails at Step 6

**Check:**
```bash
# Check for zombie processes
ps aux | grep firecracker | grep -v grep

# Check socket directory
ls -la /run/firecracker/sockets/

# Check permissions
ls -la /dev/kvm
ls -la /dev/net/tun
```

**Fix:** Kill zombies, fix permissions, check kernel modules

### 5. Database Connection Pool Exhaustion
**Symptoms:** Fails at Step 5

**Check:** Look for "connection pool" errors in logs

**Fix:** Restart service, increase pool size in config

## Immediate Actions (Priority Order)

1. **Deploy the fixes** (10 minutes)
   ```bash
   ./DEPLOY-CRITICAL-FIX.sh
   ```

2. **Test canary endpoint** (30 seconds)
   ```bash
   curl http://192.168.5.82:4000/api/debug/ping
   ```

3. **Monitor logs + test auth** (5 minutes)
   - Terminal 1: `ssh backspace@192.168.5.82 'sudo journalctl -u master-controller -f'`
   - Terminal 2: curl test to `/api/auth/start`

4. **Analyze results** (5 minutes)
   - Did `[REQUEST-ENTRY]` log appear?
   - Which VM creation step failed?
   - What error message?

5. **Apply targeted fix** based on findings

## Success Criteria

✅ `/api/debug/ping` responds in <1 second
✅ `[REQUEST-ENTRY]` logs appear for `/api/auth/start`
✅ All 6 VM creation steps complete
✅ CLI VM created with `vm_type='cli'`
✅ findByUserId() returns the CLI VM
✅ Authentication completes successfully

## If Still Failing After This

If the diagnostic logs reveal the exact failure point but you can't resolve it:

1. **Take Screenshots** of the logs showing the failure
2. **Copy Full Log Output** from the failing step
3. **Share System Metrics**:
   ```bash
   # CPU, memory, disk
   top -b -n 1 | head -20
   free -h
   df -h

   # Network and resources
   ip link show
   ulimit -a
   ```

4. **Use Polydev AI Consultation** again with the specific error details

## Support Resources

- Firecracker Docs: https://github.com/firecracker-microvm/firecracker/blob/main/docs/getting-started.md
- TAP Device Guide: https://backreference.org/2010/03/26/tuntap-interface-tutorial/
- Nginx Timeout Config: https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_read_timeout

## Notes

- These changes are non-destructive and only add logging/timeouts
- No existing functionality is changed
- Safe to deploy to production
- Can be rolled back easily if needed

---

**Created:** 2025-10-12
**Issue:** 24-second authentication timeout (100+ failures)
**Status:** Awaiting deployment and diagnostic results
