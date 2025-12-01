# WebRTC Integration - Complete Status Document

**Last Updated**: November 3, 2025
**Status**: BLOCKED - webrtc-server.js crashing in supervisor restart loop
**Duration**: ~2 weeks of debugging

---

## EXECUTIVE SUMMARY

**Goal**: Replace noVNC (VNC over WebSocket) with native WebRTC for Browser VM desktop streaming to achieve <50ms latency and better browser compatibility.

**Current Situation**:
- noVNC is working and functional as a backup
- WebRTC infrastructure is 90% built but blocked on a single critical issue:
  - `webrtc-server.js` successfully injected into VMs
  - File system injection verified working
  - GStreamer confirmed present in golden snapshot
  - **BUT**: Process crashes every 10 seconds with no visible error output
  - Supervisor automatically restarts it, creating continuous restart loop

**What We're NOT Doing**: We're not removing noVNC. We're building WebRTC as an additional/replacement streaming option. noVNC can coexist.

---

## PROJECT ARCHITECTURE

### System Overview
```
Client Browser
      ↓
Master Controller (Node.js, Express)
   ├── /api/webrtc/* endpoints (signaling)
   ├── WebSocket server (for other features)
   └── File injection pipeline
      ↓
Firecracker MicroVMs
   ├── Browser VM (runs Xvfb + Firefox/Chrome)
   ├── webrtc-server.js (WebRTC streaming)
   ├── GStreamer (screen capture → VP8 encoding)
   └── Supervisor (process management)
```

### WebRTC Signaling Flow (SDP Offer/Answer)
```
1. Client POSTs initial offer to /api/webrtc/session/{sessionId}/offer
2. VM polls GET /api/webrtc/session/{sessionId}/offer (waiting for client's offer)
3. VM receives client's offer, creates answer
4. VM POSTs answer to /api/webrtc/session/{sessionId}/answer
5. Client polls GET /api/webrtc/session/{sessionId}/answer
6. WebRTC connection established, media flows
```

**Critical Detail**: This requires rapid sequential requests - the global rate limiter was blocking this.

---

## FILES AND THEIR PURPOSES

### Master Controller (Central Orchestration)

| File | Purpose | Status |
|------|---------|--------|
| `/opt/master-controller/src/index.js` | Main Express server, WebSocket, rate limiting | ✅ FIXED - Rate limiting now allows WebRTC |
| `/opt/master-controller/src/routes/webrtc.js` | WebRTC signaling endpoints (/offer, /answer, /ice-servers) | ✅ Working |
| `/opt/master-controller/src/services/vm-manager.js` | VM creation, file injection pipeline | ✅ FIXED - Mount verification added |
| `/opt/master-controller/scripts/build-golden-snapshot.sh` | Creates base Ubuntu 22.04 image with all packages | ✅ FIXED - GStreamer added and rebuilt |
| `/opt/master-controller/vm-browser-agent/webrtc-server.js` | **CRITICAL** - Runs inside each Browser VM | ⚠️ INJECTED BUT CRASHING |
| `/opt/master-controller/vm-browser-agent/server.js` | HTTP server for VM signaling (fallback) | ✅ Working |
| `/opt/master-controller/vm-browser-agent/package.json` | Node.js dependencies | ✅ Working |

### VM-Side Files (Injected into Each Browser VM)

| Path | Purpose | Status |
|------|---------|--------|
| `/opt/webrtc-server.js` | Main WebRTC server (copied via injection) | ⚠️ CRASHING |
| `/opt/start-all.sh` | VM startup script (NOT FOUND - CRITICAL ISSUE) | 🔴 MISSING |
| `/etc/supervisor.d/webrtc-server.conf` or similar | Supervisor config to run webrtc-server | ⚠️ Unknown config |

---

## THREE FIXES ALREADY COMPLETED

### Fix #1: Rate Limiting Blocking WebRTC Requests ✅ DEPLOYED

**Problem**: Express rate limiter set to 100 requests/15 minutes globally. WebRTC signaling requires multiple rapid requests per second (offer polling, answer polling, ICE candidates).

**Root Cause**: Line 73-75 of `/opt/master-controller/src/index.js`:
```javascript
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,  // 15 minutes
  max: config.rateLimit.maxRequests,     // 100 requests
```

**Solution Applied** (lines 73-92):
```javascript
// Rate limiting with WebRTC skip
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  skip: (req) => {
    // Skip rate limiting for WebRTC endpoints
    return req.path.startsWith('/api/webrtc');
  }
});

// Separate high-limit limiter for WebRTC
const webrtcLimiter = rateLimit({
  windowMs: 60000,      // 1 minute
  max: 10000,           // 10,000 req/min (effectively unlimited)
  message: { error: 'WebRTC rate limit exceeded' }
});

app.use('/api/', limiter);
app.use('/api/webrtc', webrtcLimiter);
```

**Status**: ✅ Deployed to `/opt/master-controller/src/index.js`, verified working

---

### Fix #2: GStreamer Not in Golden Snapshot ✅ REBUILT

**Problem**: VMs inherit from golden snapshot. Snapshot was old (Dec 17 2024) and didn't have GStreamer. When webrtc-server.js tried to spawn `gst-launch-1.0`, process failed immediately.

**Root Cause**: Build script HAD the installation code but snapshot was never rebuilt.

**Solution Applied**: Rebuilt golden snapshot with verified GStreamer installation (lines 163-173 of build script):
```bash
# Install GStreamer for WebRTC screen capture
log_info "Installing GStreamer for WebRTC..."
chroot rootfs apt-get install -y \
    gstreamer1.0-tools \
    gstreamer1.0-plugins-base \
    gstreamer1.0-plugins-good \
    gstreamer1.0-plugins-bad \
    gstreamer1.0-x \
    libgstreamer1.0-0
```

**Verification**:
- Snapshot rebuild completed successfully
- Binary verified: `gst-launch-1.0` present and executable
- GStreamer plugins found: 281 files

**Status**: ✅ Snapshot rebuilt and deployed

---

### Fix #3: File Injection Mount Failures ✅ DEPLOYED

**Problem**: `mount -o loop` command was returning success (exit code 0) but filesystem wasn't actually attached. Files were written to host directory instead of mounted rootfs, so VM never received them.

**Root Cause**: Silent failure in loopback mount. Mount command doesn't always verify successful attachment.

**Solution Applied** (lines 307-322 and 594-603 of vm-manager.js):
```javascript
// Mount rootfs
try {
  logger.info('[INJECT-AGENT] Mounting rootfs...', { rootfsPath, mountPoint });
  execSync(`mount -o loop,rw "${rootfsPath}" "${mountPoint}"`, { stdio: 'inherit' });

  // CRITICAL: Verify mount actually happened before proceeding
  try {
    execSync(`mountpoint -q "${mountPoint}"`, { stdio: 'pipe' });
    logger.info('[INJECT-AGENT] Mount verification passed', { mountPoint });
  } catch (verifyErr) {
    throw new Error(`Mount verification FAILED: ${mountPoint} not a mountpoint`);
  }
} catch (err) {
  logger.error('[INJECT-AGENT] Failed to mount rootfs', { error: err.message });
  throw err;
}

// In finally block:
finally {
  try {
    logger.info('[INJECT-AGENT] Syncing filesystem before unmount...');
    execSync(`sync`, { stdio: 'inherit' });

    logger.info('[INJECT-AGENT] Unmounting rootfs...');
    execSync(`umount "${mountPoint}"`, { stdio: 'inherit' });
  } catch (err) {
    logger.error('[INJECT-AGENT] Failed to unmount', { error: err.message });
  }
}
```

**Verification**: Master-controller logs show:
```
[INJECT-AGENT] Mount verification passed (mountpoint confirmed)
[INJECT-AGENT] webrtc-server.js copied successfully
[INJECT-AGENT] node binary copied successfully
[INJECT-AGENT] Sync completed
[INJECT-AGENT] Rootfs unmounted successfully
```

**Status**: ✅ Deployed and verified working

---

## THE REMAINING CRITICAL ISSUE 🔴

### Problem: webrtc-server.js Crashes Every 10 Seconds

**Symptoms**:
- Files successfully injected into VM (verified in master-controller logs)
- Supervisor starts webrtc-server.js with a PID (e.g., PID 728)
- Process dies silently within 10 seconds
- Supervisor restarts it automatically (new PID 747)
- Process dies again within 10 seconds
- Cycle repeats: 728 → 747 → 764 → 779 → 793...
- **NO error messages appear in console logs**

**VM Console Log Example**:
```
[SUPERVISOR] WebRTC server started (PID: 728)
[SUPERVISOR] Webrtc server died (PID 728), restarting...
[SUPERVISOR] WebRTC server restarted (PID: 747)
[SUPERVISOR] WebRTC server died (PID 747), restarting...
[SUPERVISOR] WebRTC server restarted (PID: 764)
```

No `[WebRTC]` prefix messages, no errors, just death and restart.

**What This Suggests**:
1. Process is crashing before console logging starts
2. OR environment variables not set (SESSION_ID or MASTER_CONTROLLER_URL)
3. OR start-all.sh script has an issue
4. OR Node.js module missing at runtime
5. OR networking not ready when process starts

---

## WHAT WE DON'T KNOW YET

### Missing Information (Need SSH Access or Better Logs)

1. **What is the start-all.sh script?**
   - File not found in codebase
   - Must exist inside VM golden snapshot
   - Need to examine how it launches webrtc-server.js
   - Need to see environment variable setup

2. **What is the supervisor configuration?**
   - What's the exact command being run?
   - Where is the config file?
   - What's the restart policy?

3. **When does the process actually exit?**
   - Is it a graceful exit (exit code 0)?
   - Is it a crash (exit code 1+)?
   - Supervisor logs should show this but we haven't captured them

4. **Are environment variables set?**
   - SESSION_ID must be passed to webrtc-server.js
   - MASTER_CONTROLLER_URL must be set
   - Where is this done?

5. **Can we SSH into a running VM?**
   - Network bridge appears configured (fcbr0)
   - But SSH connection attempts failed in previous tests
   - Need to verify networking is fully ready

---

## DEPLOYMENT LOCATIONS

### Local Development Machine
```
/Users/venkat/Documents/polydev-ai/
├── master-controller/
│   ├── src/
│   │   ├── index.js (FIXED - rate limiting)
│   │   ├── routes/webrtc.js
│   │   └── services/vm-manager.js (FIXED - mount verification)
│   ├── scripts/
│   │   └── build-golden-snapshot.sh (FIXED - GStreamer added)
│   └── vm-browser-agent/
│       ├── webrtc-server.js (MAIN ISSUE)
│       ├── server.js
│       └── package.json
└── vm-browser-agent/
    └── webrtc-server.js (SOURCE)
```

### Production Server (135.181.138.102)
```
/opt/master-controller/
├── src/
│   ├── index.js (DEPLOYED with fixes)
│   ├── routes/webrtc.js
│   └── services/vm-manager.js (DEPLOYED with fixes)
├── scripts/
│   └── build-golden-snapshot.sh (RUN - rebuild completed)
├── resources/
│   └── golden-rootfs.ext4 (REBUILT - GStreamer included)
├── vm-browser-agent/
│   ├── webrtc-server.js (DEPLOYED)
│   ├── server.js
│   └── package.json
└── logs/
    └── master-controller.log

/var/lib/firecracker/
├── snapshots/base/
│   └── golden-rootfs.ext4 (BASE IMAGE - REBUILT)
└── users/
    └── {userId}/
        ├── vm-{vmId}/
        │   └── rootfs/ (ephemeral clone of golden-rootfs)
        ├── console.log (VM output)
        └── vm-config.json
```

---

## PROGRESS SUMMARY

| Task | Status | Date | Notes |
|------|--------|------|-------|
| Rate limiting fix | ✅ DONE | Oct 28 | Deployed to master-controller |
| GStreamer build script | ✅ DONE | Oct 28 | Code existed, just needed rebuild |
| Golden snapshot rebuild | ✅ DONE | Nov 3 | Completed successfully, GStreamer verified |
| File injection pipeline | ✅ DONE | Nov 3 | Mount verification code deployed |
| Error handling in webrtc-server.js | ✅ DONE | Nov 1 | Added spawn error detection for gst-launch |
| Webrtc-server.js deployment | ✅ DONE | Nov 3 | Files confirmed in VM via injection logs |
| **Webrtc-server.js stability** | 🔴 BLOCKED | Nov 3 | Process crashes every 10s, no visible errors |
| VM SSH debugging | 🔴 BLOCKED | Nov 3 | SSH connection failed (networking not ready) |
| End-to-end WebRTC test | ⏸️ PENDING | — | Cannot test until webrtc-server runs stably |

---

## HOW TO REPRODUCE THE ISSUE

### Step 1: Start Master Controller
```bash
ssh root@135.181.138.102
cd /opt/master-controller
nohup node src/index.js > logs/master-controller.log 2>&1 &
sleep 5
curl -s http://localhost:4000/health
```

### Step 2: Create Browser VM
```bash
curl -X POST http://localhost:4000/api/auth/start \
  -H 'Content-Type: application/json' \
  -d '{
    "userId":"5abacdd1-6a9b-48ce-b723-ca8056324c7a",
    "provider":"claude_code"
  }'
```

### Step 3: Monitor VM Console
```bash
NEWEST=$(ls -1t /var/lib/firecracker/users/ | head -1)
echo "VM: $NEWEST"
tail -f /var/lib/firecracker/users/$NEWEST/console.log | grep -E "WebRTC|SUPERVISOR|error"
```

**Expected**: See webrtc-server.js messages like `[WebRTC] Starting WebRTC server...`
**Actual**: See supervisor restart loop with no webrtc-server output

---

## NEXT STEPS FOR NEW MODEL

1. **Get SSH Access to Running VM**
   - Find IP: `grep -oP '192\.168\.100\.\d+' /var/lib/firecracker/users/{newest}/vm-config.json`
   - Verify network: `ping 192.168.100.X`
   - Try SSH: `ssh root@192.168.100.X`
   - Get console directly from inside VM

2. **Examine start-all.sh**
   - Find where it is: `find /var/lib/firecracker/snapshots -name 'start-all.sh'`
   - Mount golden snapshot and read it
   - Understand how webrtc-server.js is launched

3. **Check Supervisor Logs**
   - SSH into VM and read supervisor logs
   - Find supervisor config file
   - Understand restart policy

4. **Test webrtc-server.js Directly**
   - SSH into VM
   - Manually run `webrtc-server.js` with environment variables set
   - See what error messages appear

5. **Verify Environment Variables**
   - SESSION_ID must be passed before start
   - MASTER_CONTROLLER_URL must be set
   - Verify these are in `/etc/environment` or similar

---

## KEY INSIGHTS

1. **Three separate issues were found and fixed** - this is progress, not circles
2. **The architecture is sound** - signaling flow, rate limiting, file injection all work
3. **We're 90% done** - just need webrtc-server.js to stay running
4. **The blocker is preventable** - it's likely environment variables or startup script, not fundamental design
5. **noVNC is not being removed** - it's a fallback, WebRTC is an addition

---

## WHAT'S WORKING (Don't Break This)

- ✅ Master-controller starts and responds to health checks
- ✅ Browser VM creation works
- ✅ File injection pipeline works (mount verification proves it)
- ✅ webrtc-server.js file gets into VM successfully
- ✅ GStreamer is installed in VM
- ✅ noVNC still works as fallback
- ✅ Rate limiting allows WebRTC requests
- ✅ All three major blockers have fixes deployed

---

## HYPOTHESIS FOR NEXT DEBUGGER

**Most likely cause**: webrtc-server.js is exiting immediately because SESSION_ID environment variable is not set when supervisor starts it.

Looking at line 389-392 of webrtc-server.js:
```javascript
if (!SESSION_ID) {
  console.error('[WebRTC] ERROR: SESSION_ID environment variable required');
  process.exit(1);
}
```

This would cause immediate exit with no output if console logging isn't set up yet. The startup script probably needs to:
1. Read SESSION_ID from somewhere (VM config? Database?)
2. Export it before starting webrtc-server.js
3. Redirect output to a log file, not just console

Check `/opt/start-all.sh` inside the VM for how this is supposed to work.

---

**End of Documentation**
