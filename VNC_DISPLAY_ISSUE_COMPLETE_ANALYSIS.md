# VNC Display Issue - Complete Root Cause Analysis

**Session Date**: November 21, 2025
**Tokens Used**: 670k/1M
**Status**: ❌ UNRESOLVED - Display shows small window instead of full 1920x1080 XFCE

---

## CRITICAL DISCOVERIES

### ROOT CAUSE (Confirmed by Codex AI):
**Direct `Xtigervnc` bypasses `~/.vnc/xstartup` script entirely.**

Only the `vncserver` WRAPPER executes xstartup. When systemd calls `/usr/bin/Xtigervnc` directly, it ignores xstartup and shows fallback xterm window.

### BLOCKING ISSUE:
**`vncserver` command DOESN'T EXIST in golden rootfs** (`/var/lib/firecracker/snapshots/base/golden-rootfs-production.ext4`)

Attempted fix: Change service to use `vncserver :1` → **FAILED** (command not found)

---

## WORKING COMPONENTS

✅ **Firecracker VMs**: Boot successfully
✅ **Network**: 192.168.100.x IPs work
✅ **Xtigervnc**: Starts and listens on port 5901
✅ **noVNC**: Connects and shows display
✅ **OAuth Agent**: Runs on port 8080
✅ **VNC WebSocket Proxy**: Routes connections correctly
✅ **Auto-reconnect**: Frontend retries on connection drops

---

## BROKEN/UNSTABLE

❌ **VNC Display Resolution**: Shows tiny window instead of 1920x1080 XFCE
❌ **XFCE Desktop**: Not launching properly (black screen + orphan xterm)
❌ **Service Configuration**: ExecStartPost doesn't reliably start XFCE
❌ **vncserver wrapper**: Missing from golden rootfs
❌ **Every attempted fix breaks something new**

---

## ATTEMPTED FIXES (All Failed)

### Fix #1: Separate xfce-desktop.service
- **Approach**: systemd service with `startxfce4`
- **Result**: ❌ XFCE doesn't authenticate to Xtigervnc's X server
- **Why Failed**: Missing `XAUTHORITY` environment variable

### Fix #2: Add XAUTHORITY + xdpyinfo wait check
- **Approach**: `Environment=XAUTHORITY=/root/.Xauthority` + wait for X ready
- **Result**: ❌ Still shows small window
- **Why Failed**: Separate service doesn't work - wrong approach entirely

### Fix #3: Create ~/.vnc/xstartup script
- **Approach**: Script for TigerVNC to execute
- **Result**: ❌ Never executed
- **Why Failed**: Direct `Xtigervnc` ignores xstartup (only `vncserver` wrapper uses it)

### Fix #4: Change to vncserver wrapper
- **Approach**: `ExecStart=/usr/bin/vncserver :1 -geometry 1920x1080...`
- **Result**: ❌ Service FAILED - vncserver not found
- **Why Failed**: `vncserver` command doesn't exist in golden rootfs

### Fix #5: Xtigervnc + ExecStartPost
- **Approach**: `ExecStartPost=/bin/bash -c 'DISPLAY=:1 startxfce4 &'`
- **Result**: ⏳ Not tested yet (mount failed)
- **Status**: Ready to apply

---

## CURRENT STABLE VM

**IP**: 192.168.100.5
**VM ID**: vm-5477336b-0b76-483c-8f6d-8dca6936fc69
**Uptime**: 20+ minutes
**Ports**: 5901 (VNC) ✅ OPEN, 8080 (OAuth) ✅ OPEN
**VNC Status**: Connects but shows black screen + small window
**Configuration**: Has Xtigervnc + xstartup (but xstartup never executes)

---

## FILES MODIFIED

### Golden Rootfs: `/var/lib/firecracker/snapshots/base/golden-rootfs-production.ext4`

**TigerVNC Service** (`/etc/systemd/system/tigervnc.service`):
```ini
[Unit]
Description=TigerVNC Server (using vncserver wrapper)
After=network.target

[Service]
Type=forking
User=root
WorkingDirectory=/root
Environment=HOME=/root
ExecStartPre=-/usr/bin/vncserver -kill :1
ExecStart=/usr/bin/vncserver :1 -geometry 1920x1080 -depth 24 -localhost no -SecurityTypes None
ExecStop=/usr/bin/vncserver -kill :1
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

**xstartup Script** (`/root/.vnc/xstartup`):
```bash
#!/bin/sh
unset SESSION_MANAGER
unset DBUS_SESSION_BUS_ADDRESS
exec startxfce4
```
- Permissions: 755 (executable)
- **Problem**: Never executed because `vncserver` command doesn't exist

---

## RECOMMENDED NEXT STEPS

### Option A: Install TigerVNC Properly
1. Mount golden rootfs
2. `chroot` into it
3. `apt-get install tigervnc-standalone-server`
4. Verify `vncserver` command exists
5. Test service starts

### Option B: Fix with ExecStartPost (Simpler)
1. Revert to direct `Xtigervnc` service (we know this works)
2. Add: `ExecStartPost=/bin/bash -c 'sleep 5 && DISPLAY=:1 XAUTHORITY=/root/.Xauthority startxfce4 &'`
3. Test immediately with new VM

### Option C: Research Alternatives to VNC
- Replit may not use VNC at all
- Consider WebRTC screen sharing
- Or simpler terminal-only approach

---

## WHY THIS ISN'T LIKE REPLIT

**Replit's Advantages**:
- Tested production configurations
- Likely simpler technology stack
- Validation before shipping
- Clear error messages
- Robust fallback handling

**Our Issues**:
- Applying untested "fixes" that break more things
- No validation between iterations
- Complex VNC + systemd + XFCE stack
- Each fix introduces new failures
- Week 4 and still unstable

---

##NEXT AI SESSION - START HERE

**CURRENT VM THAT WORKS** (sort of):
- VM: 192.168.100.5 (vm-5477336b)
- Ports: 5901 ✅, 8080 ✅
- Issue: Shows small window, not full XFCE

**IMMEDIATE ACTION**:
1. Test ExecStartPost fix (Option B above)
2. If that fails, install TigerVNC properly (Option A)
3. VALIDATE each step before moving on
4. Don't claim success until TESTED

**Golden Rootfs Location**: `/var/lib/firecracker/snapshots/base/golden-rootfs-production.ext4`

**Config to Test**:
```ini
[Service]
ExecStart=/usr/bin/Xtigervnc :1 -geometry 1920x1080 -depth 24 -rfbport 5901 -localhost no -SecurityTypes None
ExecStartPost=/bin/bash -c 'sleep 5 && DISPLAY=:1 XAUTHORITY=/root/.Xauthority startxfce4 &'
```

---

**Tokens Remaining**: 330k (33%) - Enough to debug and fix properly

**Documentation**: Complete in /Users/venkat/Documents/polydev-ai/
