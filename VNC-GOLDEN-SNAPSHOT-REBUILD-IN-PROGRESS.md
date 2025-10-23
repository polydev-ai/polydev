# VNC Golden Snapshot Rebuild - IN PROGRESS

**Date**: October 16, 2025 10:32 UTC
**Status**: 🔄 **BUILD RUNNING** - VNC services being added

---

## Executive Summary

Golden snapshot rebuild initiated with VNC services to fix Claude Code OAuth blank browser issue. The rebuild includes:

- ✅ **VNC stack**: Xvfb, x11vnc, websockify, openbox
- ✅ **Systemd services**: 4 new services with proper dependency ordering
- ✅ **Expect package**: Already included from previous rebuild
- ✅ **OAuth agent paths**: Already fixed (`/opt/vm-browser-agent/`)

---

## Build Status

| Component | Status | Details |
|-----------|--------|---------|
| **Build Started** | ✅ 10:32 UTC | PIDs: 1085549, 1085550, 1085552 |
| **Log File** | ✅ Active | `/tmp/snapshot-vnc-rebuild-20251016-103228.log` |
| **Current Phase** | 🔄 Debootstrap | Unpacking base packages (line 734) |
| **Estimated Completion** | ⏳ ~10:50 UTC | 15-20 minutes total |

**Progress Indicators**:
```bash
# Check log line count (updates every few seconds)
ssh root@192.168.5.82 "wc -l /tmp/snapshot-vnc-rebuild-20251016-103228.log"

# Monitor VNC setup phase (will appear later)
ssh root@192.168.5.82 "tail -f /tmp/snapshot-vnc-rebuild-20251016-103228.log | grep -i vnc"
```

---

## What Was Missing (Root Cause)

### The Problem

User reported: **"Claude Code which was previously working is now giving blank browser?"**

Investigation revealed:
1. Browser VM created successfully ✅
2. VM IP assigned and responding ✅
3. **WebSocket to port 6080 failed** ❌ (connection refused, code 1006)
4. **VNC server not running** ❌ in Browser VM

### Root Cause Discovery

Mounted active Browser VM and checked services:

```bash
mount /var/lib/firecracker/users/vm-5b5d60bc-.../rootfs.ext4 /mnt/debug-vm
ls /mnt/debug-vm/etc/systemd/system/*.service

# Only 6 services found:
# - getty@tty1.service
# - multi-user.target.wants/
# - serial-getty@ttyS0.service
# - sockets.target.wants/
# - sysinit.target.wants/
# - vm-browser-agent.service  ← OAuth agent (correct path)

# NO VNC SERVICES! ❌
```

**Checked golden snapshot build script**:
```bash
grep -i vnc /opt/master-controller/scripts/build-golden-snapshot.sh
# No matches ❌
```

**Realization**: The previous golden snapshot rebuild (for OAuth agent path fix) created a FRESH snapshot WITHOUT VNC. The user's "previously working" Claude Code was using an OLDER manually-configured snapshot that HAD VNC services.

---

## VNC Services Added to Build Script

### Systemd Services Created

The `setup_vnc()` function (line 218) installs and configures:

#### 1. **xvfb.service** - Virtual Display
```systemd
[Unit]
Description=X Virtual Frame Buffer
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/bin/Xvfb :1 -screen 0 1280x800x24 -nolisten tcp
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

**Purpose**: Creates virtual display `:1` at 1280x800 resolution for browser rendering.

#### 2. **openbox.service** - Window Manager
```systemd
[Unit]
Description=Openbox Window Manager
After=xvfb.service
Requires=xvfb.service

[Service]
Type=simple
User=root
Environment="DISPLAY=:1"
ExecStart=/usr/bin/openbox
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

**Purpose**: Manages browser windows on the virtual display.

#### 3. **x11vnc.service** - VNC Server
```systemd
[Unit]
Description=x11vnc VNC Server
After=openbox.service
Requires=openbox.service

[Service]
Type=simple
User=root
ExecStart=/usr/bin/x11vnc -display :1 -rfbport 5900 -listen 127.0.0.1 -nopw -forever -shared
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

**Purpose**: Exposes display `:1` via VNC protocol on `localhost:5900`.

#### 4. **websockify.service** - WebSocket Proxy
```systemd
[Unit]
Description=Websockify VNC Proxy
After=x11vnc.service
Requires=x11vnc.service

[Service]
Type=simple
User=root
ExecStart=/usr/bin/websockify --web /usr/share/novnc 0.0.0.0:6080 localhost:5900
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

**Purpose**: Bridges WebSocket (port 6080) to VNC (port 5900) for noVNC browser client.

### Packages Installed

```bash
chroot rootfs apt-get install -y \
    xvfb \
    x11vnc \
    websockify \
    novnc \
    openbox \
    xdotool \
    python3-numpy
```

---

## Polydev AI Consultation

Consulted 3 AI models for VNC architecture guidance:

### GPT-5 Recommendation
- Use x11vnc (not tightvncserver) for headless environments
- Xvfb for virtual display
- websockify for WebSocket bridging
- Systemd for auto-start and dependency management

### Gemini-2.5-Pro Recommendation
- Same stack as GPT-5
- Emphasized proper service ordering (Xvfb → openbox → x11vnc → websockify)
- Suggested `Requires=` directives for dependency enforcement

### Grok-Code-Fast-1 Recommendation
- Agreed on x11vnc + websockify + Xvfb
- Recommended openbox for window management
- Highlighted importance of `DISPLAY=:1` environment variable

**Consensus**: All three models recommended the SAME architecture now implemented in the build script.

---

## Build Phases (Expected Timeline)

| Phase | Duration | Status | Details |
|-------|----------|--------|---------|
| **Debootstrap** | 5-7 min | 🔄 In progress | Bootstrap Ubuntu 22.04 base |
| **Configure System** | 1-2 min | ⏳ Pending | Network, hostname, apt sources |
| **Install Packages** | 3-5 min | ⏳ Pending | Base tools, networking, systemd |
| **Install CLI Tools** | 2-3 min | ⏳ Pending | Node.js, Codex, Claude, Gemini |
| **Setup VNC** | 2-3 min | ⏳ **NEW** | Xvfb, x11vnc, websockify, openbox |
| **Setup OAuth Agent** | 1 min | ⏳ Pending | Create `/opt/vm-browser-agent/` |
| **Cleanup** | 1 min | ⏳ Pending | Remove cache, logs |
| **Get Kernel** | 1 min | ⏳ Pending | Download vmlinux if needed |
| **Create Snapshot** | 1-2 min | ⏳ Pending | Package into .ext4 image |

**Total**: ~15-20 minutes

---

## Verification Plan (After Build Completes)

### 1. Check Golden Snapshot File Size

```bash
ssh root@192.168.5.82 "ls -lh /var/lib/firecracker/snapshots/base/golden-rootfs.ext4"
# Expected: ~8.0GB with fresh timestamp
```

### 2. Mount and Verify VNC Services Present

```bash
ssh root@192.168.5.82 "mount -o loop /var/lib/firecracker/snapshots/base/golden-rootfs.ext4 /mnt/debug-vm"

# Check for VNC services
ssh root@192.168.5.82 "ls /mnt/debug-vm/etc/systemd/system/*.service | grep -E 'xvfb|vnc|websockify|openbox'"

# Expected output:
# /mnt/debug-vm/etc/systemd/system/openbox.service
# /mnt/debug-vm/etc/systemd/system/websockify.service
# /mnt/debug-vm/etc/systemd/system/x11vnc.service
# /mnt/debug-vm/etc/systemd/system/xvfb.service
```

### 3. Verify VNC Packages Installed

```bash
ssh root@192.168.5.82 "chroot /mnt/debug-vm dpkg -l | grep -E 'xvfb|x11vnc|websockify|novnc|openbox'"

# Expected: All packages marked 'ii' (installed)
```

### 4. Check Service Enabled

```bash
ssh root@192.168.5.82 "ls /mnt/debug-vm/etc/systemd/system/multi-user.target.wants/ | grep -E 'xvfb|vnc|websockify|openbox'"

# Expected: Symlinks for all 4 services
```

### 5. Verify OAuth Agent Path Still Correct

```bash
ssh root@192.168.5.82 "cat /mnt/debug-vm/etc/systemd/system/vm-browser-agent.service | grep ExecStart"

# Expected: ExecStart=/usr/bin/node /opt/vm-browser-agent/server.js
```

### 6. Unmount

```bash
ssh root@192.168.5.82 "umount /mnt/debug-vm"
```

### 7. Copy to Browser VM Filename

```bash
ssh root@192.168.5.82 "cp /var/lib/firecracker/snapshots/base/golden-rootfs.ext4 /var/lib/firecracker/snapshots/base/golden-browser-rootfs.ext4"
```

---

## End-to-End Testing (After Deployment)

### Test 1: Create Browser VM and Check VNC Connectivity

**Frontend Action**: User clicks "Connect Claude CLI" in dashboard

**Expected Backend Logs**:
```json
{"level":"info","msg":"Creating Browser VM","userId":"...","vmType":"browser"}
{"level":"info","msg":"Cloning golden snapshot","src":"golden-browser-rootfs.ext4"}
{"level":"info","msg":"Browser VM - injecting OAuth agent","vmId":"vm-..."}
{"level":"info","msg":"Starting Firecracker VM","vmId":"vm-..."}
{"level":"info","msg":"VM health check passed","vmId":"vm-...","vmIP":"192.168.100.X"}
```

**VNC Connectivity Test**:
```bash
# Get VM IP from logs
VM_IP="192.168.100.X"

# Test websockify port
curl -v http://$VM_IP:6080/

# Expected: HTTP 200 with noVNC HTML
# NOT "Connection refused" ✅
```

**Check Services Running**:
```bash
# SSH into mini PC
ssh root@192.168.5.82

# Find VM rootfs
ls -lt /var/lib/firecracker/users/ | grep vm- | head -1

# Mount and check running services (or use journald if accessible)
mount /var/lib/firecracker/users/vm-XXX/rootfs.ext4 /mnt/debug-vm
chroot /mnt/debug-vm systemctl list-units | grep -E 'xvfb|vnc|websockify|openbox'

# Expected: All 4 services "active (running)"
umount /mnt/debug-vm
```

### Test 2: Verify Browser Interface Displays

**Frontend Action**: OAuth modal appears with browser interface

**Expected**:
- ✅ Browser loads with OAuth URL
- ✅ No blank screen
- ✅ No WebSocket connection errors in browser console
- ✅ User can interact with browser (click, type)

**Should NOT see**:
- ❌ Blank white/black screen
- ❌ "WebSocket connection to 'ws://...' failed" console errors
- ❌ "Connection closed with code 1006" errors

### Test 3: Complete Claude Code OAuth Flow

**User Actions**:
1. Click "Connect Claude CLI"
2. See browser interface load ✅
3. Complete OAuth in displayed browser
4. Close browser modal
5. Session becomes ready

**Expected Master-Controller Logs**:
```json
{"level":"info","msg":"Starting CLI auth","provider":"claude","sessionId":"..."}
{"level":"info","msg":"Browser VM created for OAuth","vmId":"...","vmIP":"..."}
{"level":"info","msg":"Polling for OAuth completion","sessionId":"..."}
{"level":"info","msg":"OAuth completed","sessionId":"...","hasCredentials":true}
{"level":"info","msg":"Session ready","sessionId":"..."}
```

**Should NOT see**:
- ❌ HTTP 404 errors (OAuth agent path was fixed in previous rebuild)
- ❌ WebSocket connection failures (VNC now installed)
- ❌ Blank browser screen (VNC services running)

---

## Codex OAuth Secondary Test

After Claude Code OAuth succeeds, test Codex OAuth with fixed expect wrapper:

**User Action**: Click "Connect Codex CLI"

**Expected Browser VM Logs** (from `/var/log/vm-browser-agent.log` or journald):
```json
{"level":"info","msg":"Starting CLI auth","provider":"codex","sessionId":"..."}
{"level":"info","msg":"Created expect wrapper for Codex CLI","expectScriptPath":"/tmp/codex-expect-..."}
{"level":"info","msg":"CLI output","text":"Finish signing in via your browser"}
{"level":"info","msg":"Captured OAuth URL","oauthUrl":"https://auth.openai.com/..."}
```

**Should NOT see**:
- ❌ `"invalid command name"` Tcl errors (regex escaping fixed)
- ❌ `"expect: command not found"` (expect already in golden snapshot)
- ❌ Cursor position timeout errors (expect wrapper handles this)

---

## Files Modified (Current Session)

### 1. `/Users/venkat/Documents/polydev-ai/master-controller/scripts/build-golden-snapshot.sh`

**Added**:
- `setup_vnc()` function (line 218)
- Call to `setup_vnc()` in `main()` (line 604)

**Deployed**: ✅ Copied to mini PC via SCP

### 2. `/Users/venkat/Documents/polydev-ai/master-controller/vm-browser-agent/server.js`

**Changed** (line 567-571):
```javascript
// BEFORE (Tcl escaping issues):
-re "\\033\\\\[\\[?=>;0-9\\]+\\[a-zA-Z\\]" {
    exp_continue
}

// AFTER (simplified, properly escaped):
-re "\\033\\[\\[?0-9;\\]*[a-zA-Z]" {
    exp_continue
}
```

**Deployed**: ✅ Copied to mini PC, master-controller restarted (PID 1085304)

---

## Current System State

| Component | Status | Details |
|-----------|--------|---------|
| **Master-Controller** | ✅ Running | PID 1085304, restarted 10:30 UTC |
| **Build Script** | ✅ Deployed | VNC setup function at line 218 |
| **OAuth Agent** | ✅ Deployed | Fixed expect regex in server.js |
| **Golden Snapshot** | 🔄 Building | Started 10:32 UTC, ~15-20 min ETA |
| **Old Golden Snapshot** | ❌ Stale | No VNC services, will be replaced |

---

## Timeline Summary

| Time (UTC) | Event | Status |
|------------|-------|--------|
| **Previous Session** | Rebuilt golden snapshot for OAuth agent path fix | ✅ Complete |
| **Previous Session** | User reports Claude Code now broken (blank browser) | ❌ Regression |
| **10:15** | Investigated VNC connectivity, found port 6080 refused | 🔍 Root cause found |
| **10:20** | Consulted Polydev AI (GPT-5, Gemini, Grok) for VNC guidance | ✅ Consensus reached |
| **10:25** | Added VNC setup to build script | ✅ Code complete |
| **10:28** | Fixed Codex expect wrapper regex escaping | ✅ Code complete |
| **10:30** | Deployed changes, restarted master-controller | ✅ Deployed |
| **10:32** | Started fresh golden snapshot rebuild with VNC | 🔄 In progress |
| **~10:50** | Expected build completion | ⏳ Pending |
| **~10:55** | Verification and deployment | ⏳ Pending |
| **~11:00** | End-to-end testing | ⏳ Pending |

---

## Related Documentation

1. **`GOLDEN-SNAPSHOT-REBUILD-COMPLETE.md`** - Previous rebuild (OAuth agent path fix)
2. **`OAUTH-AGENT-PATH-MISMATCH-FIX.md`** - OAuth agent service path alignment
3. **`CODEX-CURSOR-QUERY-EXPECT-FIX.md`** - Expect wrapper implementation
4. **`VNC-GOLDEN-SNAPSHOT-REBUILD-IN-PROGRESS.md`** - **THIS DOCUMENT**

---

## Next Actions

### Immediate (Build Running)
- ⏳ Wait for build completion (~15-20 minutes from 10:32 UTC)
- 🔍 Monitor log for VNC setup phase: `tail -f /tmp/snapshot-vnc-rebuild-*.log | grep -i vnc`

### After Build Completes
1. ✅ Verify VNC services in golden snapshot (see Verification Plan)
2. ✅ Copy to Browser VM filename (`golden-browser-rootfs.ext4`)
3. ✅ Test Claude Code OAuth end-to-end
4. ✅ Test Codex OAuth with fixed expect wrapper

### If Tests Pass
- 🎯 Claude Code OAuth restored ✅
- 🎯 Browser-in-browser functionality working ✅
- 🎯 Codex OAuth expect wrapper validated ✅
- 📝 Update documentation with success confirmation

### If Tests Fail
- 🔍 SSH into Browser VM and check service status
- 📋 Collect logs from failed services
- 🤖 Consult Polydev AI with specific error messages
- 🔧 Iterate on service configuration

---

**Confidence Level**: **HIGH** - VNC services definitively missing, fix is straightforward package installation and systemd service creation. Consulted 3 AI models, all recommended same approach.

🔄 **Status**: BUILD IN PROGRESS - Check back at ~10:50 UTC for completion.
