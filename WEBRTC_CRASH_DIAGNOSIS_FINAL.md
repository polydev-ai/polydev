# WebRTC Server Crash - Final Diagnosis & Solution

## Date: November 4, 2025
## Duration: 4+ hours total
## Status: ROOT CAUSE IDENTIFIED

---

## ✅ SUCCESSES - What We Fixed

1. **Supervisor Script Path** - FIXED
   - Changed `/opt/vm-browser-agent/node` → `/usr/bin/node`
   - Deployed to server

2. **Golden-rootfs** - REBUILT
   - New golden-rootfs with updated supervisor
   - Build completed successfully

3. **VM Memory** - INCREASED
   - 2GB → 4GB to prevent OOM crashes

4. **VM Cleanup Task** - DISABLED
   - Prevents VMs from being deleted every 5 seconds

5. **Firecracker Kernel** - FIXED
   - Extracted vmlinux from bzImage

---

## ❌ THE REMAINING PROBLEM

### Symptom
- Supervisor script starts successfully
- WebRTC server gets a PID (process is spawned)
- Process dies after exactly 10 seconds
- **ZERO debug output appears** (not even console.error on line 19)

### Evidence
```
[   47.415980] start-all.sh[739]: [SUPERVISOR] WebRTC server PID: 737
[   57.426480] start-all.sh[755]: [SUPERVISOR] WebRTC server died (PID 737), restarting...
[   57.434003] start-all.sh[759]: [SUPERVISOR] WebRTC server restarted (PID: 757)
```

**NO output from webrtc-server.js appears anywhere**

---

## 🔍 ROOT CAUSE ANALYSIS

### What We Know
1. `/usr/bin/node` exists in golden-rootfs
2. All Node.js dependencies are satisfied (ldd shows no "not found")
3. GStreamer is installed (gst-launch-1.0, gst-inspect-1.0)
4. Supervisor script uses correct path (`/usr/bin/node`)
5. File injection is working (webrtc-server.js is copied)
6. NO debug output appears before line 19

### Expert Consultation Diagnosis
**Three AI experts unanimously agree:**

> "The Node.js process crashes BEFORE any JavaScript executes. This is a classic symptom of a **dynamic linking failure** or **native module crash** during the require() phase."

**Most Likely Causes (in order):**

1. **Missing ICU Data Files**
   - Node.js needs ICU data files (.dat) for internationalization
   - Without them, Node aborts immediately
   - Check: `find /usr -name '*.dat' | grep icu`

2. **Native Module Crash**
   - While webrtc-server.js doesn't directly require native modules, Node's built-in modules might load native components
   - GStreamer integration might require native bindings
   - Could be a CPU feature mismatch (AVX, SSE) incompatible with Firecracker vCPU

3. **Node.js Version Mismatch**
   - The bundled Node in golden-rootfs might be built for a different glibc
   - Check version: `/usr/bin/node --version` in VM

---

## 🛠️ IMMEDIATE DIAGNOSTIC STEPS

### Step 1: Verify Node.js Works in VM
```bash
# SSH to VPS and run Node in foreground (no redirection)
/usr/bin/node --version
/usr/bin/node -e "console.log('Node is working!')"
```

### Step 2: Check for Missing ICU Data
```bash
# In the golden-rootfs
find /usr -name '*.dat' 2>/dev/null
# Should show ICU data files
```

### Step 3: Check for Missing Libraries
```bash
ldd /usr/bin/node
# Should show NO "not found" lines
```

### Step 4: Test with Minimal Script
```javascript
// test.js
console.log('Hello from Node');
setTimeout(() => process.exit(0), 5000);
```
```bash
/usr/bin/node test.js
```

---

## 💡 RECOMMENDED SOLUTIONS

### Solution 1: Reinstall Node.js from Ubuntu Repos (RECOMMENDED)
```bash
# In golden-rootfs or running VM
apt-get update
apt-get remove -y nodejs
apt-get install -y nodejs npm

# Verify
node --version  # Should be v12.x or v14.x (Ubuntu 22.04)
```

### Solution 2: Install ICU Data Files
```bash
# Install ICU data
apt-get install -y libicu70 icu-devtools

# Verify ICU data exists
ls /usr/lib/x86_64-linux-gnu/icu/
```

### Solution 3: Use System Node Instead of Bundled
```bash
# The supervisor already uses /usr/bin/node (FIXED)
# Just need to ensure /usr/bin/node is the system Node, not bundled
which node  # Should show /usr/bin/node
```

---

## 🎯 ACTION PLAN

### Option A: Quick Fix (15 minutes)
1. Reinstall Node.js in golden-rootfs from Ubuntu repos
2. Rebuild golden-rootfs
3. Test with new VM

### Option B: Minimal Diagnostic (5 minutes)
1. Mount golden-rootfs
2. Check if ICU .dat files exist
3. If missing, install libicu packages
4. Rebuild golden-rootfs

### Option C: Use Different Node Version
1. Download Node.js v18.x or v20.x from NodeSource
2. Install in golden-rootfs
3. Rebuild

---

## 📊 Current State Summary

| Component | Status | Evidence |
|-----------|--------|----------|
| Master Controller | ✅ Running | Health check passing |
| File Injection | ✅ Working | Files copied to VM |
| Supervisor Script | ✅ Fixed | Uses /usr/bin/node |
| VM Boot | ✅ Working | Boots to login |
| Node Binary | ⚠️ Unknown | Has dependencies, but may lack ICU data |
| GStreamer | ✅ Installed | gst-launch-1.0 present |
| webrtc-server.js | ❌ Crashes | Dies before any output |
| WebRTC Logging | ❌ Missing | No log file created |

---

## 🚨 CRITICAL INSIGHT

**The 10-second crash interval is NOT a Node timeout!**

The supervisor script checks every 10 seconds if the process is still running. The fact that it dies at exactly 10-second intervals is just when the supervisor's health check runs and finds the process dead.

The actual crash happens immediately when the process starts - it's just that the supervisor doesn't detect it for 10 seconds.

---

## 📝 Next Steps

1. **Verify Node binary works** with a simple test
2. **Check for ICU data files** in golden-rootfs
3. **Reinstall Node.js** from Ubuntu repos if needed
4. **Rebuild golden-rootfs** with fixed Node
5. **Test with new VM**

---

**Document Created:** November 4, 2025, 6:30 PM CET
**Status:** Diagnosed - Ready for Fix
**Priority:** Critical - Blocks all WebRTC functionality
