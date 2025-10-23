# Testing Instructions - VNC Golden Snapshot

**Status**: Old Browser VMs terminated - Please create fresh VMs

---

## Problem Identified

The Browser VMs you were testing (created at 18:08 and 18:15) were created from the **OLD golden snapshot** (before VNC was added).

I verified:
- ✅ NEW VM (192.168.100.6) has working VNC on port 6080
- ❌ OLD VM (192.168.100.5) has NO VNC (connection refused)

The black screen you're seeing is because:
1. Browser VMs are from old snapshot (no proper Chromium installation)
2. Browser isn't launching the OAuth URL automatically
3. VNC is working but there's nothing to display

---

## Solution

I've terminated the old Browser VMs. Please create fresh ones:

1. **Refresh your dashboard page** (to clear old sessions)
2. **Click "Connect Claude CLI" again** - This will create a NEW Browser VM from the updated golden snapshot
3. **Click "Connect OpenAI Codex" again** - This will create another fresh Browser VM

---

## What Should Happen Now

### Claude Code OAuth

**Expected Flow**:
1. Click "Connect Claude CLI"
2. Dashboard shows "Creating VM..." (~10 seconds)
3. Browser modal opens with noVNC interface
4. **Chromium browser loads automatically** with Claude OAuth page
5. You see Claude login page (NOT black screen)
6. Complete OAuth
7. Session becomes ready

### Codex OAuth

**Expected Flow**:
1. Click "Connect OpenAI Codex"
2. Dashboard shows "Creating VM..." (~10 seconds)
3. "Loading secure browser..." appears briefly
4. **Browser interface loads** (NOT stuck on loading)
5. Chromium displays OpenAI OAuth page
6. Complete OAuth
7. Session becomes ready

---

## What's Different in New VMs

**New Golden Snapshot** (built today at 17:48 UTC) includes:
- ✅ **VNC Services**: Xvfb, x11vnc, websockify, openbox (auto-start on boot)
- ✅ **Chromium Browser**: Properly installed and configured
- ✅ **OAuth Agent**: Updated code with browser launch logic
- ✅ **Complete APT Sources**: Security repos for all dependencies

**Old VMs** (you were testing) had:
- ❌ No VNC services
- ❌ Incomplete Chromium installation
- ❌ No display server

---

## Debugging Commands (If Issues Persist)

### Check New VM IP and VNC

After creating a new VM, check master-controller logs:

```bash
# On your local machine
ssh root@192.168.5.82 "journalctl -u master-controller -n 50 --no-pager | grep -E 'Browser VM|192.168.100'"
```

Look for lines like:
```
{"level":"info","msg":"VM health check passed","vmId":"vm-...","vmIP":"192.168.100.X"}
```

Then test VNC:
```bash
ssh root@192.168.5.82 "curl -v http://192.168.100.X:6080/"
```

Should return HTTP 200 with noVNC HTML (NOT connection refused).

### Check OAuth Agent Logs

If browser still doesn't load:

```bash
# Get VM ID from dashboard or logs
VM_ID="vm-xxxxx"

# Check OAuth agent is running
ssh root@192.168.5.82 "cat /var/lib/firecracker/users/$VM_ID/vm-config.json | grep ip"
```

---

## Expected Success Indicators

### ✅ VNC Working
- Browser interface loads (not blank or stuck)
- Can see browser window in noVNC

### ✅ Browser Launching
- Chromium opens automatically
- OAuth page loads
- No "Loading..." spinner forever

### ✅ OAuth Completing
- User completes authentication
- Credentials saved
- Session becomes "ready"

---

## If Still Having Issues

1. **Check VM creation logs**:
   - Look for "Cloning golden snapshot" with `golden-browser-rootfs.ext4`
   - NOT `golden-rootfs.ext4` (wrong snapshot)

2. **Verify golden snapshot timestamp**:
   ```bash
   ssh root@192.168.5.82 "ls -lh /var/lib/firecracker/snapshots/base/golden-browser-rootfs.ext4"
   ```
   Should show: `-rw-r--r-- 1 root root 8.0G Oct 16 17:53`

3. **Check Chromium in new VM** (after stopping it):
   ```bash
   ssh root@192.168.5.82 "mount /var/lib/firecracker/users/$VM_ID/rootfs.ext4 /mnt/debug-vm"
   ssh root@192.168.5.82 "ls -la /mnt/debug-vm/usr/bin/chromium-browser"
   ssh root@192.168.5.82 "umount /mnt/debug-vm"
   ```

---

## Current System State

| Component | Status |
|-----------|--------|
| **Golden Snapshot** | ✅ Ready (17:53 UTC, 8.0GB) |
| **VNC Services** | ✅ Installed and verified |
| **Old Browser VMs** | ✅ Terminated and cleaned up |
| **Master-Controller** | ✅ Running latest code |
| **Ready for Testing** | ✅ Create fresh VMs now |

---

**Action Required**: Please refresh dashboard and create fresh Browser VMs for both Claude Code and Codex.
