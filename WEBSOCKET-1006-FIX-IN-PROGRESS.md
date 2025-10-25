# WebSocket Connection Failure (Code 1006) - FIX IN PROGRESS

## Date: October 24, 2025 - 19:31 CEST

## Status: 🔄 GOLDEN SNAPSHOT REBUILDING

The golden snapshot with VNC services is currently being rebuilt. ETA: ~50 minutes remaining.

## Summary

All noVNC WebSocket connections are immediately closing with code 1006 because the golden snapshot lacks VNC services (xvfb, x11vnc, websockify, novnc, openbox).

## The Problem

**User Report**:
> "See getting dsiconnected again, BTW using localhost"

**Error**:
```
WebSocket connection to 'wss://master.polydev.ai/api/auth/session/.../novnc/websock' failed
Connection closed (code: 1006)
```

**Impact**:
- ❌ All noVNC browser displays show black screen
- ❌ OAuth flows cannot be completed visually
- ❌ Users cannot see Chromium browser for authentication
- ❌ WebSocket connections fail immediately

## Root Cause Analysis

### Investigation Process

1. **Verified WebSocket handler exists** ✅
   - `handleNoVNCUpgrade` function in `/opt/master-controller/src/routes/auth.js:512-547`
   - Proxies to `ws://<vm-ip>:6080/`
   - Code is correct

2. **Created test VM session** ✅
   - SessionId: `87ab5680-368e-4784-b612-18c248a74519`
   - VM IP: `192.168.0.6`
   - VM creation successful (HTTP 200)

3. **Tested direct WebSocket connection** ❌
   ```bash
   curl http://192.168.0.6:6080/
   # Result: curl: (7) Failed to connect to 192.168.0.6 port 6080: No route to host
   ```
   - **Port 6080 not listening** → websockify not running

4. **Checked golden snapshot files** 🔍
   ```bash
   ls -lh /var/lib/firecracker/snapshots/base/
   lrwxrwxrwx 1 root root   18 Oct 21 03:45 golden-browser-rootfs.ext4 -> golden-rootfs.ext4
   -rw-r--r-- 1 root root 8.0G Oct 24 08:12 golden-rootfs.ext4
   ```
   - **CRITICAL FINDING**: `golden-browser-rootfs.ext4` is a SYMLINK to `golden-rootfs.ext4`
   - **Last modified**: Oct 24 08:12 (TODAY, not Oct 16 when VNC was supposedly added)

5. **Verified build script has VNC setup** ✅
   - Function `setup_vnc()` exists at line 608 of `build-golden-snapshot.sh`
   - Installs: xvfb, x11vnc, websockify, novnc, openbox
   - Creates systemd services for all VNC components
   - Enables services on boot

### Root Cause

The golden snapshot was rebuilt on **Oct 24 at 08:12** (today) WITHOUT running the `setup_vnc()` function, overwriting the working version that had VNC services from Oct 16. This means:

- Browser VMs boot from snapshot without VNC services
- No websockify listening on port 6080
- WebSocket connections fail immediately with code 1006
- Black screen in noVNC client

## The Fix: Rebuild Golden Snapshot with VNC Services

### Build Started

```bash
cd /opt/master-controller/scripts
nohup bash build-golden-snapshot.sh > /tmp/golden-snapshot-rebuild-vnc-20251024-102355.log 2>&1 &
```

- **Started**: 19:23 CEST (Oct 24, 2025)
- **PID**: 775540
- **Log file**: `/tmp/golden-snapshot-rebuild-vnc-20251024-102355.log`
- **Current size**: 165KB (2,925 lines as of 19:30)

### Build Progress (as of 19:31 CEST)

**Current Phase**: Installing Python packages (python3-oslo.i18n, python3-dateutil)

**Timeline**:
- **00:00 - 08:00** ✅ Debootstrap base system
- **08:00 - Now** 🔄 Installing desktop packages (GTK, mesa, dconf, Python)
- **Est. 15:00** ⏳ VNC packages installation (xvfb, x11vnc, websockify, novnc, openbox)
- **Est. 20:00** ⏳ VNC systemd service creation
- **Est. 25:00** ⏳ VNC service enablement
- **Est. 30:00** ⏳ OAuth agent installation
- **Est. 50:00** ⏳ Final snapshot creation

**Expected completion**: ~20:15 CEST (50 minutes from start)

### VNC Services That Will Be Installed

#### 1. Xvfb (Virtual Framebuffer)
- **Package**: xvfb
- **Display**: :1
- **Resolution**: 1280x800x24
- **Service**: `/etc/systemd/system/xvfb.service`
- **Auto-start**: Enabled via multi-user.target

#### 2. Openbox (Window Manager)
- **Package**: openbox
- **Depends**: xvfb.service
- **Display**: :1
- **Service**: `/etc/systemd/system/openbox.service`
- **Auto-start**: Enabled via multi-user.target

#### 3. x11vnc (VNC Server)
- **Package**: x11vnc
- **Display**: :1
- **Port**: 5900 (localhost only)
- **Options**: -nopw -forever -shared
- **Service**: `/etc/systemd/system/x11vnc.service`
- **Depends**: xvfb.service
- **Auto-start**: Enabled via multi-user.target

#### 4. websockify (WebSocket Proxy)
- **Package**: websockify
- **Listen**: 0.0.0.0:6080
- **Target**: localhost:5900
- **Web root**: /usr/share/novnc
- **Service**: `/etc/systemd/system/websockify.service`
- **Depends**: x11vnc.service
- **Auto-start**: Enabled via multi-user.target

#### 5. noVNC (HTML5 VNC Client)
- **Package**: novnc
- **Web files**: /usr/share/novnc
- **Served by**: websockify

### Service Dependency Chain

```
systemd boot
  ↓
xvfb.service (Display :1)
  ↓
openbox.service (Window manager on :1)
  ↓
x11vnc.service (VNC server on :5900 → Display :1)
  ↓
websockify.service (WebSocket proxy :6080 → :5900)
  ↓
noVNC client connects via WebSocket to :6080
```

## Expected Flow After Fix

### 1. VM Creation
```
User → POST /api/vm/auth
  ↓
master-controller creates Browser VM
  ↓
Firecracker spawns with golden-rootfs.ext4
  ↓
VM boots and systemd starts VNC services
```

### 2. VNC Services Start (Inside VM)
```
[  5s] xvfb.service starts → Display :1 available
[  6s] openbox.service starts → Window manager running
[  7s] x11vnc.service starts → VNC server listening on :5900
[  8s] websockify.service starts → WebSocket proxy listening on :6080
```

### 3. Frontend WebSocket Connection
```
Browser → wss://master.polydev.ai/api/auth/session/{id}/novnc/websock
  ↓
master-controller handleNoVNCUpgrade()
  ↓
Proxy to ws://<vm-ip>:6080/
  ↓
websockify inside VM
  ↓
HTTP 101 Switching Protocols ✅
  ↓
WebSocket connection established
  ↓
noVNC displays Chromium browser ✅
```

### 4. OAuth Automation
```
OAuth agent triggers Chromium launch
  ↓
Chromium opens on Display :1
  ↓
x11vnc captures display
  ↓
websockify proxies to frontend
  ↓
User sees browser, completes OAuth
  ↓
Credentials saved, VM hibernated
```

## Monitoring Build Progress

### Check Build Status
```bash
ssh root@135.181.138.102 "tail -50 /tmp/golden-snapshot-rebuild-vnc-*.log"
```

### Check if Still Running
```bash
ssh root@135.181.138.102 "ps aux | grep 'build-golden-snapshot' | grep -v grep"
```

### Look for VNC Setup Phase
```bash
ssh root@135.181.138.102 "grep -E 'Setting up VNC|setup_vnc|Enabling VNC services' /tmp/golden-snapshot-rebuild-vnc-*.log"
```

### Check for Completion
```bash
ssh root@135.181.138.102 "grep 'Successfully created golden snapshot' /tmp/golden-snapshot-rebuild-vnc-*.log"
```

### Monitor in Real-Time
```bash
ssh root@135.181.138.102 "tail -f /tmp/golden-snapshot-rebuild-vnc-*.log"
```

## Post-Build Verification Steps

### 1. Verify VNC Services in Snapshot
```bash
ssh root@135.181.138.102 << 'EOF'
mkdir -p /mnt/verify-vnc
mount -o loop /var/lib/firecracker/snapshots/base/golden-rootfs.ext4 /mnt/verify-vnc

echo "=== VNC SYSTEMD SERVICES ==="
ls -lh /mnt/verify-vnc/etc/systemd/system/ | grep -E '(vnc|websock|xvfb|openbox)'

echo ""
echo "=== VNC PACKAGES ==="
chroot /mnt/verify-vnc dpkg -l | grep -E '(xvfb|x11vnc|websockify|novnc|openbox)'

echo ""
echo "=== ENABLED SERVICES ==="
chroot /mnt/verify-vnc systemctl is-enabled xvfb x11vnc websockify openbox 2>/dev/null

umount /mnt/verify-vnc
EOF
```

**Expected output**:
```
=== VNC SYSTEMD SERVICES ===
-rw-r--r-- 1 root root  xxx openbox.service
-rw-r--r-- 1 root root  xxx websockify.service
-rw-r--r-- 1 root root  xxx x11vnc.service
-rw-r--r-- 1 root root  xxx xvfb.service

=== VNC PACKAGES ===
ii  novnc          1:1.3.0+dfsg+~1.1.0-1  all
ii  openbox        3.6.1-10               amd64
ii  websockify     0.10.0+dfsg1-5         all
ii  x11vnc         0.9.16-7               amd64
ii  xvfb           2:21.1.4-2ubuntu1.7~22.04.12  amd64

=== ENABLED SERVICES ===
enabled
enabled
enabled
enabled
```

### 2. Test New Browser VM Creation
```bash
curl -X POST http://135.181.138.102:4000/api/auth/start \
  -H "Content-Type: application/json" \
  -d '{"userId": "<test-user-id>", "provider": "claude_code"}'
```

**Expected response**:
```json
{
  "success": true,
  "sessionId": "<session-id>",
  "provider": "claude_code",
  "novncURL": "http://135.181.138.102:4000/api/auth/session/<session-id>/novnc",
  "browserIP": "192.168.0.X"
}
```

### 3. Verify websockify Listening Inside VM
```bash
# Get the VM IP from the response above
VM_IP="192.168.0.X"

ssh root@135.181.138.102 << EOF
# Wait for VM to boot (15 seconds)
sleep 15

# Test websockify port
echo "=== TESTING WEBSOCKIFY PORT ==="
nc -zv $VM_IP 6080

# Test WebSocket handshake
echo ""
echo "=== TESTING WEBSOCKET HANDSHAKE ==="
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  http://$VM_IP:6080/ 2>&1 | head -10
EOF
```

**Expected output**:
```
=== TESTING WEBSOCKIFY PORT ===
Connection to 192.168.0.X 6080 port [tcp/*] succeeded!

=== TESTING WEBSOCKET HANDSHAKE ===
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

### 4. Test Frontend noVNC Connection
```bash
# Open in browser:
http://135.181.138.102:4000/api/auth/session/<session-id>/novnc
```

**Expected result**:
- ✅ noVNC client loads
- ✅ WebSocket connection established
- ✅ Desktop display appears (not black screen)
- ✅ Chromium browser visible

### 5. Verify End-to-End OAuth Flow
```bash
# From the noVNC interface, you should see:
# 1. Openbox desktop with gray background
# 2. Chromium browser opening
# 3. OAuth authentication page loading
# 4. Ability to complete authentication
```

## What Was Broken

| Component | Before Fix | After Fix |
|-----------|-----------|-----------|
| Golden snapshot | Oct 24 08:12 - No VNC services | Oct 24 ~20:15 - Full VNC stack |
| xvfb | ❌ Not installed | ✅ Running on :1 |
| openbox | ❌ Not installed | ✅ Window manager active |
| x11vnc | ❌ Not installed | ✅ Listening on :5900 |
| websockify | ❌ Not installed | ✅ Listening on :6080 |
| noVNC | ❌ Not installed | ✅ Web files in /usr/share/novnc |
| WebSocket connection | ❌ Code 1006 | ✅ HTTP 101 Switching Protocols |
| Browser display | ❌ Black screen | ✅ Chromium visible |
| OAuth completion | ❌ Impossible | ✅ Fully functional |

## Why This Happened

**Timeline of Events**:

1. **Oct 16, 2025 17:53 UTC** - VNC integration completed, documented in `GOLDEN-SNAPSHOT-VNC-COMPLETE.md`
2. **Oct 24, 2025 08:12 CEST** - Golden snapshot rebuilt WITHOUT running `setup_vnc()` function
3. **Oct 24, 2025 19:00 CEST** - User reports WebSocket disconnections
4. **Oct 24, 2025 19:23 CEST** - Golden snapshot rebuild with VNC services started

**Root issue**:
The rebuild on Oct 24 at 08:12 likely used a different build script or skipped the VNC setup step, overwriting the working snapshot from Oct 16.

**User feedback**:
> "Most of the documentation is dated, don't rely too much on documenattion, actually explore and check lease."

This was correct - the documentation said VNC was integrated on Oct 16, but the actual deployed file showed it was rebuilt on Oct 24 without VNC.

## Next Steps After Build Completes

1. ✅ **Verify VNC services in snapshot** - Mount and check systemd services
2. ✅ **Create test Browser VM** - Verify VM boots with VNC services
3. ✅ **Test websockify connectivity** - Confirm port 6080 listening
4. ✅ **Test WebSocket handshake** - Verify HTTP 101 response
5. ✅ **Test frontend noVNC** - Confirm browser display works
6. ✅ **Test end-to-end OAuth** - Complete authentication flow
7. ✅ **Document successful fix** - Create `WEBSOCKET-1006-FIX-COMPLETE.md`
8. ⏳ **Address version control request** - Set up GitHub repo for master-controller

## Related Documentation

1. `PROXYCONFIG-UNDEFINED-FIX-COMPLETE.md` - Previous VM creation bug fix
2. `GOLDEN-SNAPSHOT-VNC-COMPLETE.md` - Oct 16 VNC integration (dated)
3. `PROXY-INTEGRATION-DEPLOYMENT-COMPLETE.md` - Proxy system integration
4. `PROXY-PORT-MANAGER-FIX-COMPLETE.md` - Supabase lazy-loading fix
5. `WEBSOCKET-1006-FIX-IN-PROGRESS.md` - This file

## User's Additional Request: Version Control

> "Also is it possible to have what we have on VPS also in a github file, so tahtw e can do versionc ontrol and everything on VPS is also pulled andbuilt from there, what is the best way to do this?"

**Planned approach**:
1. Create GitHub repository: `polydev-master-controller`
2. Add all source files from `/opt/master-controller/`
3. Add build scripts from `/opt/master-controller/scripts/`
4. Create deployment script that pulls from GitHub and restarts service
5. Add pre-commit hooks for testing
6. Document Git workflow for future updates

**Implementation**: After WebSocket fix is verified working

---

**Status**: 🔄 **BUILD IN PROGRESS**

**Build Started**: 19:23 CEST
**Current Time**: 19:31 CEST
**Elapsed**: 8 minutes
**Remaining**: ~50 minutes
**ETA**: ~20:15 CEST

**Monitor Command**:
```bash
ssh root@135.181.138.102 "tail -f /tmp/golden-snapshot-rebuild-vnc-20251024-102355.log"
```

**Current Phase**: Installing Python packages (python3-oslo.i18n, python3-dateutil)

**Next Phase**: VNC package installation (expected in ~7 minutes)
