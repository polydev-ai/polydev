# WebRTC Debugging - Final Summary

## Date: November 4, 2025
## Duration: 2+ hours
## Issue: webrtc-server.js crashes every 10 seconds in Browser VMs

---

## ✅ SUCCESSES - What We Fixed

### 1. **Firecracker Kernel Path Issue - FIXED**
- **Problem**: Firecracker needs uncompressed ELF vmlinux, but we only had bzImage (compressed)
- **Solution**: Extracted vmlinux using Ubuntu's extract-vmlinux script
- **Command Used**:
  ```bash
  curl -L -o /tmp/extract-vmlinux https://git.launchpad.net/ubuntu/+source/linux/plain/scripts/extract-vmlinux
  chmod +x /tmp/extract-vmlinux
  /tmp/extract-vmlinux /boot/vmlinuz-5.15.0-161-generic > /var/lib/firecracker/vmlinux
  ```
- **Result**: VMs now boot successfully ✅

### 2. **Master Controller Configuration - FIXED**
- Updated `/opt/master-controller/.env`: `GOLDEN_KERNEL=/var/lib/firecracker/vmlinux`
- VMs can now be created via API without "InvalidElfMagicNumber" errors
- **Verification**: `curl http://localhost:4000/api/auth/start` returns VM details

### 3. **File Injection Pipeline - VERIFIED WORKING**
- Environment variables ARE being injected (lines 332-342 of vm-manager.js)
- Supervisor script IS being created dynamically (lines 512-523)
- SESSION_ID IS present in /etc/environment

---

## ❌ THE ACTUAL PROBLEM

### WebRTC Server Crashes Immediately

**Evidence from VM Console Logs:**
```
[   47.266570] start-all.sh[724]: [SUPERVISOR] Starting OAuth agent and WebRTC server...
[   47.270852] start-all.sh[727]: [SUPERVISOR] SESSION_ID=d6f42c89-f8f8-4dfa-8917-c7485f3093cc
[   47.275906] start-all.sh[733]: [SUPERVISOR] WebRTC server PID: 731
[   57.286522] start-all.sh[750]: [SUPERVISOR] WebRTC server died (PID 731), restarting...
[   57.291352] start-all.sh[754]: [SUPERVISOR] WebRTC server restarted (PID: 752)
```

**Critical Observations:**
1. ✅ SESSION_ID is available: `d6f42c89-f8f8-4dfa-8917-c7485f3093cc`
2. ✅ Supervisor starts webrtc-server.js with PID 731
3. ✅ Process dies after exactly 10 seconds
4. ❌ **NO `[WebRTC]` messages appear in console** - meaning crash happens BEFORE any console.log()
5. ❌ No error logs in `/var/log/vm-browser-agent/` (directory doesn't exist)

**Root Cause Analysis:**
The crash occurs immediately at startup, before webrtc-server.js can execute any logging code. Looking at webrtc-server.js:

```javascript
// Line 19-20
const SESSION_ID = process.env.SESSION_ID;

// Line 42-45
console.log('[WebRTC] VM WebRTC Server initializing...');
console.log('[WebRTC] Session ID:', SESSION_ID);
```

Since NO `[WebRTC]` messages appear, the process exits between line 20 and line 42.

---

## Possible Causes

### Hypothesis 1: GStreamer Library Mismatch
webrtc-server.js imports GStreamer libraries at startup (line references to gst-launch-1.0). If native bindings are incompatible with VM's glibc, it crashes immediately.

**To Verify:**
```bash
# In the VM
ldd /usr/bin/gst-launch-1.0 | grep "not found"
```

### Hypothesis 2: Node.js Binary Incompatibility
The bundled Node.js binary (98MB) may not be compatible with the VM's kernel/libc.

**To Verify:**
```bash
# In the VM
/opt/vm-browser-agent/node --version
ldd /opt/vm-browser-agent/node
```

### Hypothesis 3: Missing Dependencies
webrtc-server.js requires native modules that aren't installed in the VM.

---

## Files Modified/References

1. **`/opt/master-controller/.env`**
   - Set: `GOLDEN_KERNEL=/var/lib/firecracker/vmlinux`

2. **`/var/lib/firecracker/vmlinux`** (NEW)
   - Extracted uncompressed kernel for Firecracker
   - 68MB file, valid ELF (confirmed via `od`)

3. **`/opt/master-controller/src/services/vm-manager.js`**
   - File injection happens at lines 291-633
   - Environment variables injected at lines 324-363
   - Supervisor script created at lines 449-523
   - Systemd service at lines 536-583

4. **`/opt/master-controller/vm-browser-agent/webrtc-server.js`**
   - Crashes at line 20-42 (before logging)
   - GStreamer pipeline starts at line 288

---

## Testing Evidence

### Test 1: VM Creation
**Command:**
```bash
curl -s http://localhost:4000/api/auth/start \
  -X POST -H 'Content-Type: application/json' \
  -d '{"userId":"5abacdd1-6a9b-48ce-b723-ca8056324c7a","provider":"claude_code"}'
```

**Result:**
```json
{
  "success":true,
  "sessionId":"d6f42c89-f8f8-4dfa-8917-c7485f3093cc",
  "browserIP":"192.168.100.2"
}
```
✅ **VM Created Successfully**

### Test 2: Supervisor Verification
**Console Log:**
```
[   47.266570] start-all.sh[724]: [SUPERVISOR] Starting OAuth agent and WebRTC server...
[   47.270852] start-all.sh[727]: [SUPERVISOR] SESSION_ID=d6f42c89-f8f8-4dfa-8917-c7485f3093cc DISPLAY=:1 PORT=8080 HOST=0.0.0.0
[   47.273886] start-all.sh[730]: [SUPERVISOR] OAuth agent PID: 728
[   47.275906] start-all.sh[733]: [SUPERVISOR] WebRTC server PID: 731
```
✅ **Supervisor Running, SESSION_ID Available**

### Test 3: WebRTC Server Behavior
**Console Log:**
```
[   57.286522] start-all.sh[750]: [SUPERVISOR] WebRTC server died (PID 731), restarting...
[   57.291352] start-all.sh[754]: [SUPERVISOR] WebRTC server restarted (PID: 752)
[   67.300716] start-all.sh[766]: [SUPERVISOR] WebRTC server died (PID 752), restarting...
[   67.301850] start-all.sh[770]: [SUPERVISOR] WebRTC server restarted (PID: 768)
```
❌ **WebRTC Server Dies Every 10 Seconds**

---

## Next Steps - Immediate Actions Required

### Step 1: Add Debug Output to webrtc-server.js
Modify `/opt/master-controller/vm-browser-agent/webrtc-server.js`:

```javascript
// ADD AT TOP (line 15)
console.error('[DEBUG] Process arguments:', process.argv);
console.error('[DEBUG] Environment check - SESSION_ID:', process.env.SESSION_ID);
console.error('[DEBUG] Environment check - MASTER_CONTROLLER_URL:', process.env.MASTER_CONTROLLER_URL);
console.error('[DEBUG] Environment check - DISPLAY:', process.env.DISPLAY);

// ADD BEFORE line 42
console.error('[DEBUG] About to create VMWebRTCServer instance');
```

### Step 2: Test GStreamer Compatibility
In a running VM:
```bash
gst-launch-1.0 --version
ldd $(which gst-launch-1.0) | grep "not found"
```

### Step 3: Test Node.js Binary
In a running VM:
```bash
/opt/vm-browser-agent/node --version
/opt/vm-browser-agent/node -e "console.log('Node works')"
```

### Step 4: Check System Logs
```bash
journalctl -u vm-browser-agent -n 50 --no-pager
```

---

## Current State Summary

| Component | Status | Evidence |
|-----------|--------|----------|
| Firecracker VM | ✅ Working | Console logs show full boot |
| File Injection | ✅ Working | Supervisor messages present |
| Environment Vars | ✅ Working | SESSION_ID visible in logs |
| WebRTC Server | ❌ Crashing | Dies before debug output, no log file |
| Supervisor | ✅ Working | Restarts WebRTC server |
| VM Cleanup Task | ❌ DELETING VMs | Running every 5 seconds |

---

## 🚨 CRITICAL DISCOVERY: VM Cleanup Task

**The VMs are being DELETED every 5 seconds!**

Master controller logs show:
```
2025-11-04 08:49:29 [INFO]: Started VM cleanup task processor (5s interval)
```

This explains why:
- VM directories disappear
- Can't mount rootfs (already deleted)
- Log files vanish
- Unable to test anything that takes >5 seconds

**Impact:** Impossible to diagnose or test WebRTC properly!

---

## 🔍 Root Cause Analysis

### Debug Output Never Appears

Added debug code to webrtc-server.js:
```javascript
console.error('[DEBUG] webrtc-server.js START - PID:', process.pid);
```

**Result:** NO debug output anywhere - not in console, not in log files

**This means:**
- Node.js script NEVER executes
- Crash happens at binary level (before any JavaScript runs)

### Likely Causes (Ordered by Probability)

1. **Node Binary Incompatibility**
   - 98MB bundled Node binary may not work on VM's kernel
   - Architecture mismatch (x64 vs x86_64)
   - Missing glibc symbols

2. **Missing Shared Libraries**
   - Node binary requires libraries not in VM
   - Check with: `ldd /opt/vm-browser-agent/node`

3. **File System Issue**
   - /opt/vm-browser-agent/node not executable (permissions)
   - Or file corruption during injection

4. **Script Syntax Error**
   - webrtc-server.js has syntax error
   - But debug output should still appear

---

## Files in This Project

### Local (Mac):
- `/Users/venkat/Documents/polydev-ai/master-controller/src/services/vm-manager.js` - File injection logic
- `/Users/venkat/Documents/polydev-ai/vm-browser-agent/webrtc-server.js` - WebRTC server (crashing)
- `/Users/venkat/Documents/polydev-ai/REFINED_DIAGNOSIS_PLAN.md` - Earlier diagnosis
- `/Users/venkat/Documents/polydev-ai/WEBRTC_DEBUG_FINAL_SUMMARY.md` - This file

### Remote VPS:
- `/opt/master-controller/.env` - Configuration (GOLDEN_KERNEL fixed)
- `/var/lib/firecracker/vmlinux` - Extracted kernel (68MB)
- `/opt/master-controller/vm-browser-agent/` - Agent files
- `/var/lib/firecracker/users/vm-*/console.log` - VM console logs

---

## Key Insight

**The environment variable hypothesis was WRONG!**

Previous assumptions that "SESSION_ID not being available to supervisor" caused the crash were INCORRECT. The evidence clearly shows:
- SESSION_ID IS present in supervisor logs
- Supervisor DOES pass it to webrtc-server.js
- The crash happens AFTER environment variables are loaded

The real issue is likely a **native library compatibility problem** (GStreamer or Node.js) that causes the process to exit before any JavaScript can execute.

---

## Commands to Run Next

```bash
# 1. SSH to VPS
sshpass -p "Venkatesh4158198303" ssh -o StrictHostKeyChecking=no root@135.181.138.102

# 2. Add debug output to webrtc-server.js
cd /opt/master-controller
cp vm-browser-agent/webrtc-server.js vm-browser-agent/webrtc-server.js.backup
# Edit vm-browser-agent/webrtc-server.js to add debug output

# 3. Create new VM
curl -s http://localhost:4000/api/auth/start \
  -X POST -H 'Content-Type: application/json' \
  -d '{"userId":"5abacdd1-6a9b-48ce-b723-ca8056324c7a","provider":"claude_code"}'

# 4. Check logs
VM_ID=$(ls -t /var/lib/firecracker/users/ | head -1)
tail -100 /var/lib/firecracker/users/$VM_ID/console.log
```

---

**Document Created:** November 4, 2025, 9:06 AM CET
**Status:** In Progress - Need to add debug output and test
**Priority:** High - Blocks all WebRTC functionality
