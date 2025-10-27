# Browser Auto-Launch Fix - Complete Analysis and Resolution

## Problem Summary

The OAuth browser auto-launch feature was **not working** because the `vm-browser-agent` systemd service was missing the critical `DISPLAY=:1` environment variable. When the agent tried to launch the browser using `xdg-open`, it failed silently because there was no X11 display environment configured.

### Root Cause Analysis

**The Issue:**
- OAuth agent runs in Firecracker VM with X11 desktop environment (TigerVNC on :1)
- When OAuth flow generates a URL, the agent calls `xdg-open` to launch browser
- `xdg-open` is a standard Linux utility that requires `DISPLAY` environment variable to know which X11 server to connect to
- **The service file was missing `Environment=DISPLAY=:1`**, so `xdg-open` had no display to connect to
- Result: Browser launch silently failed, showing "Browser didn't open? Use the url below to sign in:"

**Why This Happened:**
- The `build-golden-snapshot-complete.sh` script **correctly sets** `Environment=DISPLAY=:1` in line 337
- But the `vm-agent/vm-browser-agent.service` file in the repository was **out of sync** with the build script
- This caused a mismatch between what was being built and what was in the codebase

### Timeline

1. **User reported**: "browser was auto initiated in the VM before" - indicating feature worked at some point
2. **Investigation revealed**: Golden rootfs has TigerVNC server, Openbox, xdg-utils, but service file was missing DISPLAY
3. **Root cause confirmed**: Service file at `vm-agent/vm-browser-agent.service` lacked `Environment=DISPLAY=:1`

---

## Solution Implemented

### 1. **Fixed vm-agent/vm-browser-agent.service**

**Added missing DISPLAY variable:**
```ini
[Unit]
Description=VM Browser Agent - OAuth Proxy for CLI Tools
After=network.target vncserver@1.service
Wants=vncserver@1.service

[Service]
Type=simple
ExecStart=/usr/bin/node /opt/vm-agent/vm-browser-agent.js
Restart=always
RestartSec=1
StandardOutput=append:/tmp/vm-browser-agent.log
StandardError=append:/tmp/vm-browser-agent-error.log
Environment=HOME=/root
Environment=NODE_ENV=production
Environment=DISPLAY=:1        # <-- THIS WAS MISSING
```

**Additional improvements:**
- Added `vncserver@1.service` dependency in `After=` and `Wants=` fields
- This ensures VNC server starts before OAuth agent
- Prevents race condition where agent tries to use DISPLAY before VNC is ready

### 2. **Enhanced Error Logging in vm-agent/vm-browser-agent.js**

Added comprehensive error handling for `xdg-open` calls:

**What was logged before:**
- Only log message about opening browser (no error capture)

**What is logged now:**
- DISPLAY value when attempting to open browser
- xdg-open stderr output if command writes errors
- xdg-open spawn errors if process fails to start
- Exit code and signal if xdg-open terminates with non-zero status

```javascript
// Capture DISPLAY value in logs
logger.info('Auto-opening browser with OAuth URL', { oauthUrl, display: cliEnv.DISPLAY });

// Capture stderr from xdg-open
browserProcess.stderr.on('data', (data) => {
  logger.error('xdg-open stderr', { error: data.toString() });
});

// Capture spawn errors
browserProcess.on('error', (err) => {
  logger.error('xdg-open spawn error', { error: err.message, display: cliEnv.DISPLAY });
});

// Capture exit codes
browserProcess.on('exit', (code, signal) => {
  if (code !== 0) {
    logger.warn('xdg-open exited with non-zero code', { code, signal, display: cliEnv.DISPLAY });
  }
});
```

This will help debug any future issues immediately.

---

## Installation Steps

### Option 1: Update via install-complete-agent.sh (Recommended)

```bash
cd /Users/venkat/Documents/polydev-ai/vm-agent

# Run as root (this script modifies golden rootfs)
sudo bash install-complete-agent.sh
```

**What this does:**
- Mounts golden rootfs
- Copies updated `vm-browser-agent.js` with error logging
- Copies updated `vm-browser-agent.service` with DISPLAY variable
- Enables service via systemd
- Unmounts golden rootfs

**Expected output:**
```
✅ INSTALLATION COMPLETE
```

### Option 2: Manual Installation (if automated script fails)

```bash
# Mount golden rootfs
sudo mount -o loop /var/lib/firecracker/snapshots/base/golden-browser-rootfs.ext4 /mnt/golden-browser

# Update agent code
sudo cp vm-agent/vm-browser-agent.js /mnt/golden-browser/opt/vm-agent/

# Update service file
sudo cp vm-agent/vm-browser-agent.service /mnt/golden-browser/etc/systemd/system/

# Ensure proper permissions
sudo chmod 0755 /mnt/golden-browser/opt/vm-agent/vm-browser-agent.js
sudo chmod 0644 /mnt/golden-browser/etc/systemd/system/vm-browser-agent.service

# Unmount
sudo umount /mnt/golden-browser
```

---

## Verification Steps

After installation, verify the fix works:

### 1. **Check Service File in Golden Rootfs**

```bash
# Mount to verify
sudo mount -o loop /var/lib/firecracker/snapshots/base/golden-browser-rootfs.ext4 /mnt/golden-browser

# Verify DISPLAY is set
grep "DISPLAY" /mnt/golden-browser/etc/systemd/system/vm-browser-agent.service
# Should output: Environment=DISPLAY=:1

# Verify service dependencies
grep "After=\|Wants=" /mnt/golden-browser/etc/systemd/system/vm-browser-agent.service
# Should output: After=network.target vncserver@1.service
#               Wants=vncserver@1.service

sudo umount /mnt/golden-browser
```

### 2. **Test OAuth Flow with New VM**

```bash
# Create new VM (uses updated golden rootfs)
curl -X POST http://192.168.5.82:4000/api/auth/start \
  -H 'Content-Type: application/json' \
  -d '{
    "userId":"test-user-'$(date +%s)'",
    "provider":"claude_code"
  }' | jq .

# Should return: sessionId, browserIP, novncURL

# Check service status in running VM
ssh root@<VM_IP> systemctl status vm-browser-agent
# Should show: Active (running)

# Monitor agent logs
ssh root@<VM_IP> tail -f /tmp/vm-browser-agent.log
# Should show: "Auto-opening browser with OAuth URL { oauthUrl: '...', display: ':1' }"
```

### 3. **Browser Auto-Launch Test**

```bash
# In the VM, manually trigger OAuth flow
ssh root@<VM_IP>

# From within VM:
cd /opt/vm-browser-agent
node vm-browser-agent.js  # Start agent if not running as service

# In another VM terminal or via noVNC, start Claude CLI:
claude auth

# Browser should auto-launch in VNC window showing OAuth URL
```

---

## What Changed (Git Diffs)

### vm-agent/vm-browser-agent.service

```diff
 [Unit]
 Description=VM Browser Agent - OAuth Proxy for CLI Tools
-After=network.target
+After=network.target vncserver@1.service
+Wants=vncserver@1.service

 [Service]
 Type=simple
 ExecStart=/usr/bin/node /opt/vm-agent/vm-browser-agent.js
 Restart=always
 RestartSec=1
 StandardOutput=append:/tmp/vm-browser-agent.log
 StandardError=append:/tmp/vm-browser-agent-error.log
 Environment=HOME=/root
 Environment=NODE_ENV=production
+Environment=DISPLAY=:1
```

### vm-agent/vm-browser-agent.js

**Key improvements:**
- Added logging of DISPLAY variable when opening browser
- Added error handlers for xdg-open process (stderr, spawn errors, exit codes)
- These handlers log detailed error information for debugging

---

## Expected Behavior After Fix

### Before Fix:
1. Claude CLI starts OAuth flow
2. OAuth agent receives URL
3. `xdg-open` called with no DISPLAY set
4. xdg-open silently fails
5. User sees: "Browser didn't open? Use the url below to sign in:"

### After Fix:
1. Claude CLI starts OAuth flow
2. OAuth agent receives URL
3. `xdg-open` called with `DISPLAY=:1` set ✅
4. Browser launches in VNC window ✅
5. User sees browser with OAuth URL loaded
6. User logs in, credentials captured
7. OAuth flow completes successfully ✅

---

## Files Modified

1. **vm-agent/vm-browser-agent.service** ✅
   - Added `Environment=DISPLAY=:1`
   - Added VNC server dependency

2. **vm-agent/vm-browser-agent.js** ✅
   - Added comprehensive error logging for xdg-open
   - Logs DISPLAY value in all error scenarios

3. **This document** (BROWSER_AUTOLAUNCH_FIX.md) ✅
   - Complete analysis and resolution guide

---

## Testing Priority

1. **HIGH PRIORITY**: Run `install-complete-agent.sh` to update golden rootfs
2. Create new Browser VM and test OAuth flow
3. Verify browser auto-launches in noVNC window
4. Check logs for error-free "Auto-opening browser" messages

---

## Questions & Troubleshooting

**Q: Do I need to rebuild the entire golden rootfs?**
A: No, you can use `install-complete-agent.sh` to update just the agent code and service file in the existing golden rootfs.

**Q: Will existing VMs be affected?**
A: No, only new VMs created after running the installation script will have the fix. Existing VMs will continue to use the old configuration.

**Q: How do I know if the fix is working?**
A: The logs will show `"Auto-opening browser with OAuth URL { oauthUrl: '...', display: ':1' }"` with `display: ':1'` (not missing/undefined).

**Q: What if xdg-open still fails after applying the fix?**
A: The improved error logging will capture the exact error in `/tmp/vm-browser-agent.log`. This will show what went wrong (e.g., "Cannot connect to :1 display", "xdg-utils not installed", etc.).

---

## Next Steps

1. Run installation script: `sudo bash /Users/venkat/Documents/polydev-ai/vm-agent/install-complete-agent.sh`
2. Create test VM and verify OAuth flow works
3. Check logs: `ssh root@<VM_IP> tail -f /tmp/vm-browser-agent.log`
4. Test full OAuth flow with CLI tools (claude, codex, gemini-cli)

---

**Status**: ✅ Ready to deploy
**Files**: 2 modified, 1 created
**Testing**: Requires user to run installation and test with new VMs
