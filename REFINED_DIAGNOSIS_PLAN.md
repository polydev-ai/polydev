# Refined WebRTC Debugging Plan

## Current State Assessment ✅

**What's Working:**
1. Master controller running on port 4000
2. File injection pipeline with mount verification working
3. GStreamer present in golden snapshot
4. SESSION_ID being injected into /etc/environment (line 338 of vm-manager.js)
5. webrtc-server.js successfully injected into VMs
6. Database accessible and queries working

**The Problem:**
- webrtc-server.js crashes every 10 seconds with NO visible output
- No `[WebRTC]` prefix messages appearing in VM console logs
- This means the process is dying BEFORE any logging can occur

## Root Cause Hypothesis (Refined)

Based on code analysis:

1. **webrtc-server.js line 20**: `const SESSION_ID = process.env.SESSION_ID;`
2. **webrtc-server.js lines 388-392**:
```javascript
if (!SESSION_ID) {
  console.error('[WebRTC] ERROR: SESSION_ID environment variable required');
  process.exit(1);
}
```

**The issue**: `/etc/environment` is a systemd file, but supervisor might NOT be loading it. Environment variables are set in the filesystem but not being applied to the supervisor process.

## Evidence Supporting This:

1. webrtc-server.js logs during initialization (lines 42-45) but NO logs appear
2. This means the process exits BEFORE console.log can execute
3. The only thing that can cause immediate exit before console.log is the SESSION_ID check
4. SESSION_ID is in /etc/environment but supervisor doesn't source that file

## Solution Path

### Phase 1: Immediate Diagnosis (5 minutes)

SSH into the VPS and:

```bash
# 1. Check if we can see the /etc/environment file in a VM
NEWEST_VM=$(ls -1t /var/lib/firecracker/users/ | head -1)
if [ -f "/var/lib/firecracker/users/$NEWEST_VM/rootfs/etc/environment" ]; then
  echo "=== /etc/environment in VM ==="
  cat /var/lib/firecracker/users/$NEWEST_VM/rootfs/etc/environment
else
  echo "No VM found with rootfs mounted"
fi

# 2. Check if supervisor config exists in golden snapshot
echo ""
echo "=== Checking for supervisor config in golden snapshot ==="
mount -o loop /opt/master-controller/resources/golden-rootfs.ext4 /tmp/golden-check
if [ -f /tmp/golden-check/etc/supervisor/conf.d/webrtc-server.conf ]; then
  cat /tmp/golden-check/etc/supervisor/conf.d/webrtc-server.conf
elif [ -f /tmp/golden-check/etc/supervisor/supervisord.conf ]; then
  grep -A5 -B5 "webrtc" /tmp/golden-check/etc/supervisor/supervisord.conf
else
  echo "No supervisor config found"
fi
umount /tmp/golden-check
```

### Phase 2: Fix Implementation (10 minutes)

**Option A: Fix supervisor config to source /etc/environment**

Create or update supervisor config to include:
```ini
[program:webrtc-server]
command=/bin/bash -c 'source /etc/environment && node /opt/webrtc-server.js'
environment=SESSION_ID="%(ENV_SESSION_ID)s",MASTER_CONTROLLER_URL="http://192.168.100.1:4000"
stdout_logfile=/var/log/webrtc-stdout.log
stderr_logfile=/var/log/webrtc-stderr.log
```

**Option B: Add environment variable injection directly in supervisor**

Update the program definition to explicitly pass variables:
```ini
environment=SESSION_ID="%(ENV_SESSION_ID)s",MASTER_CONTROLLER_URL="http://192.168.100.1:4000",DISPLAY=":1"
```

### Phase 3: Verify the Fix (5 minutes)

1. Create fresh Browser VM
2. Monitor console logs for `[WebRTC]` messages
3. Check that process stays running without restart loop

## Alternative Hypothesis (If Above Doesn't Work)

**GStreamer library mismatch**: Native GStreamer bindings might not be compatible with the VM's glibc version.

Check with:
```bash
# In the VM
ldd /usr/bin/gst-launch-1.0 | grep "not found"
```

## Why This Makes Sense

The multiple AI perspectives all pointed to the same thing:
- Environment variables not being available to supervisor
- Early exit before logging can occur
- Silent crashes are almost always environment-related

The fact that SESSION_ID is in /etc/environment but supervisor doesn't source it is the smoking gun.

## Files Modified

1. `/opt/master-controller/vm-browser-agent/supervisord.conf` (need to create/update)
   OR
2. Update `build-golden-snapshot.sh` to include proper supervisor config
   OR
3. Modify `vm-manager.js` to inject supervisor config during file injection

## Time to Fix: ~20 minutes
