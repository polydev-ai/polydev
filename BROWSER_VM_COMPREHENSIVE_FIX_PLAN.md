# Browser VM System: Comprehensive Fix Plan

**Date**: October 31, 2025
**Status**: ⚠️ **NEEDS FIXING** (Pre-existing issues from Phase 1)

---

## 🔍 Executive Summary

Browser VMs are currently **partially broken** with multiple critical issues:

**Critical Issues Found**:
1. 🔴 **Dual session tracking** (`auth_sessions` vs non-existent `oauth_sessions`)
2. 🔴 **Decodo proxy NOT injected** into Browser VM guest OS
3. 🟡 **noVNC connections disconnect** immediately (session not found)
4. 🟡 **WebRTC infrastructure NOT integrated** (built but unused)
5. 🟡 **30+ failed Browser VMs** accumulating in database

**Current Evidence**:
- 8 Firecracker VMs running
- VM at 192.168.100.2 pingable
- VM Agent responding (HTTP 200)
- But session bf41f495 returns null from database
- noVNC WebSocket disconnects (code 1006)

---

## 🏗️ Current Browser VM Architecture

### Purpose:
**Capture OAuth tokens** from CLI tools (codex, claude, gemini) via isolated browser environment

### Complete Flow:

```
1. User clicks "Connect Claude" in frontend
   ↓
2. Frontend → POST /api/vm/auth { provider: 'claude_code' }
   ↓
3. Next.js API → POST master-controller/api/auth/start
   ↓
4. browser-vm-auth.js startAuthentication():
   a. Create auth_sessions record
   b. Ensure CLI VM exists (for credential transfer)
   c. Create Browser VM (Firecracker + Chromium)
   d. Associate session with VM
   e. Return noVNC URL to frontend
   ↓
5. Browser VM boots:
   a. Firecracker starts from golden snapshot
   b. Ubuntu guest boots
   c. systemd starts vm-browser-agent/server.js
   d. OAuth agent listens on port 8080
   ↓
6. Master-controller → POST VM_IP:8080/auth/claude
   ↓
7. VM Agent:
   a. Spawns: claude auth login
   b. Captures OAuth URL from CLI
   c. Launches Chromium with OAuth URL
   d. User completes OAuth in browser
   e. CLI saves tokens to ~/.config/claude/credentials.json
   f. Agent monitors file
   ↓
8. Master-controller → GET VM_IP:8080/credentials/status
   (polls until authenticated: true)
   ↓
9. Master-controller → GET VM_IP:8080/credentials/get
   Returns: { provider, credentials: {...} }
   ↓
10. Master-controller:
    a. Encrypts credentials (AES-256-GCM)
    b. Stores in provider_credentials table
    c. Transfers to CLI VM
    d. Updates auth_sessions status: 'completed'
    e. Destroys Browser VM
```

---

## 🚨 Critical Problems Detailed

### **Problem 1: Dual Session Tracking System** 🔴

**Root Cause**: Code references `oauth_sessions` table that **doesn't exist in schema**

**Evidence**:
```javascript
// vm-manager.js line 1091
await db.client.from('oauth_sessions').upsert({
  session_id: sessionId,
  vm_id: vmId,
  vm_ip: vmIP,
  status: 'active'
})
```

**But**: `oauth_sessions` table not in any migration file!

**Schema has**: `auth_sessions` table (migration 20250108)

**Impact**:
- Sessions only in memory (lost on restart)
- WebSocket handler can't find VM IP
- Frontend can't reconnect
- "Session not found" errors

**Fix**:
1. Add missing columns to `auth_sessions`:
   ```sql
   ALTER TABLE auth_sessions
     ADD COLUMN IF NOT EXISTS vm_ip TEXT,
     ADD COLUMN IF NOT EXISTS vnc_url TEXT,
     ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMPTZ;
   ```

2. Replace all `oauth_sessions` with `auth_sessions` in vm-manager.js

3. Update queries to use `auth_sessions.browser_vm_id` and `auth_sessions.vm_ip`

---

### **Problem 2: Decodo Proxy NOT Injected Into Guest VM** 🔴

**Root Cause**: Firecracker process env vars don't propagate to guest OS

**Current Code** (vm-manager.js line 415-579):
```javascript
// Correctly gets proxy for user
const proxyEnv = await proxyPortManager.getProxyEnvVars(userId);
// Example: { HTTP_PROXY: 'http://user:pass@dc.decodo.com:10001' }

// Correctly passes to Firecracker process
const env = { ...process.env, ...proxyEnv };
const firecrackerProcess = spawn('firecracker', args, { env });
```

**Problem**: Firecracker HOST process has proxy env, but GUEST VM doesn't!

**Why**: Guest VM boots from snapshot, has its own init system, doesn't inherit host env

**Current Workaround** (browser-vm-auth.js line 448):
```javascript
// Uses SHARED Tinyproxy for ALL users
const proxyConfig = {
  httpProxy: 'http://192.168.100.1:3128',
  httpsProxy: 'http://192.168.100.1:3128'
};
```

**Impact**:
- All Browser VMs share same external IP
- Can't track per-user activity
- Defeats purpose of Decodo's per-port IPs

**Fix Required**:

**Option A: Inject /etc/environment** (Recommended)
```javascript
// In injectOAuthAgent() after mounting rootfs
const envContent = `HTTP_PROXY=${proxyEnv.HTTP_PROXY}
HTTPS_PROXY=${proxyEnv.HTTPS_PROXY}
NO_PROXY=localhost,127.0.0.1,192.168.0.0/16
http_proxy=${proxyEnv.http_proxy}
https_proxy=${proxyEnv.https_proxy}
no_proxy=localhost,127.0.0.1,192.168.0.0/16
`;

await fs.writeFile(
  path.join(mountPoint, 'etc/environment'),
  envContent
);
```

**Option B: systemd Service Environment**
```javascript
// Update vm-browser-agent.service
[Service]
...
Environment=HTTP_PROXY=${proxyEnv.HTTP_PROXY}
Environment=HTTPS_PROXY=${proxyEnv.HTTPS_PROXY}
...
```

**Option C: Kernel Boot Args** (Most reliable)
```javascript
// vm-manager.js line 556 - add to boot_args
const bootArgs = `console=ttyS0 reboot=k panic=1 pci=off ip=${ipAddr}::${gateway}:${netmask}::eth0:off http_proxy=${proxyEnv.HTTP_PROXY} https_proxy=${proxyEnv.HTTPS_PROXY}`;
```

**Testing**:
```bash
# After fix, SSH into Browser VM
ssh root@192.168.100.X

# Should see proxy
echo $HTTP_PROXY
# http://sp9dso1iga:...@dc.decodo.com:10001

# Test external access
curl https://auth.openai.com
# Should succeed

# Verify external IP
curl https://ip.decodo.com/json
# Should show assigned Decodo IP
```

---

### **Problem 3: noVNC WebSocket Disconnects** 🟡

**Root Cause**: Session lookup fails due to Problem 1

**Code Path**:
```javascript
// index.js line 285
server.on('upgrade', async (request, socket, head) => {
  // Delegates to auth.js
  handleNoVNCUpgrade(request, socket, head, wss);
});

// auth.js line 646
async function handleNoVNCUpgrade(request, socket, head, wss) {
  const sessionId = request.url.match(/sessionId=([^&]+)/)?.[1];

  // Gets session from memory OR database
  const session = await browserVMAuth.getSessionStatus(sessionId);

  if (!session?.browserVMId) {
    // FAILS HERE - session not found
    socket.destroy();
    return;
  }

  // Get VM details
  const vm = await db.vms.findById(session.browserVMId);
  const vmIP = sanitizeVMIP(vm);  // 192.168.100.X

  // Proxy to VM's VNC server (5900)
  proxyToVNC(socket, vmIP, 5900);
}
```

**When Problem 1 is fixed**: This will work automatically

---

### **Problem 4: WebRTC Not Integrated** 🟡

**Built Components** ✅:
1. coturn TURN/STUN server (running)
2. WebRTC signaling service (operational)
3. 8 WebRTC API endpoints (all tested)
4. VM-side webrtc-server.js (created)
5. Frontend WebRTCViewer component (created)

**Missing Integrations** ❌:

**A. Browser VM doesn't start WebRTC server**
- Current: Only OAuth agent runs
- Needed: Start both OAuth agent AND webrtc-server.js
- File: vm-browser-agent/server.js needs supervisor

**B. SESSION_ID not passed to VM**
- Current: No way for webrtc-server.js to know its session
- Needed: Pass via kernel cmdline or /etc/environment
- Example: `session_id=bf41f495-...` in boot args

**C. Frontend still uses noVNC**
- Current: iframe with noVNC URL
- Needed: Use WebRTCViewer component
- File: src/app/dashboard/remote-cli/auth/page.tsx line 221

**D. GStreamer not installed in golden image**
- Needed for webrtc-server.js screen capture
- Must install: gstreamer1.0-tools, gstreamer1.0-plugins-*

**Fix Plan**:

**Step 1: Update Golden Image**
```bash
# Mount golden snapshot
sudo mount golden-rootfs.ext4 /mnt

# Install GStreamer
sudo chroot /mnt apt-get install -y \
  gstreamer1.0-tools \
  gstreamer1.0-plugins-base \
  gstreamer1.0-plugins-good \
  gstreamer1.0-plugins-bad \
  gstreamer1.0-libav

# Unmount
sudo umount /mnt
```

**Step 2: Create Supervisor Script**
```javascript
// vm-browser-agent/start-all.sh
#!/bin/bash
# Start OAuth agent
node /opt/vm-browser-agent/server.js &
OAUTH_PID=$!

# Start WebRTC server
export SESSION_ID=$(cat /etc/session_id)
node /opt/vm-browser-agent/webrtc-server.js &
WEBRTC_PID=$!

# Wait for either to exit
wait -n

# Kill both on exit
kill $OAUTH_PID $WEBRTC_PID
```

**Step 3: Inject SESSION_ID**
```javascript
// vm-manager.js in createVM()
await fs.writeFile(
  path.join(mountPoint, 'etc/session_id'),
  sessionId
);
```

**Step 4: Update Frontend**
```typescript
// auth/page.tsx - replace noVNC iframe
{session && (
  <WebRTCViewer
    sessionId={session.session_id}
    fallbackToNoVNC={true}
  />
)}
```

---

### **Problem 5: 30+ Failed Browser VMs** 🟢

**Evidence from Database**:
```
vm-0d3a969a: failed (2025-10-28)
vm-99a3b764: failed (2025-10-28)
vm-735e4666: failed (2025-10-28)
... 30+ more
```

**Common Failure Reasons**:
1. **IP pool exhausted** (254 max IPs)
2. **Firecracker timeout** (30s)
3. **Snapshot clone failure**
4. **TAP device conflicts**

**Fix**:
1. **Auto-cleanup failed VMs**:
   ```javascript
   // background.js - run every hour
   const failedVMs = await db.vms.find({
     status: 'failed',
     created_at: { $lt: Date.now() - 3600000 }
   });
   for (const vm of failedVMs) {
     await vmManager.destroyVM(vm.vm_id);
   }
   ```

2. **Add retry logic**:
   ```javascript
   // browser-vm-auth.js
   let attempts = 0;
   while (attempts < 3) {
     try {
       const vm = await vmManager.createVM(userId, 'browser');
       break;
     } catch (error) {
       attempts++;
       if (attempts >= 3) throw error;
       await sleep(5000);  // Wait 5s before retry
     }
   }
   ```

3. **Monitor IP pool**:
   ```javascript
   const available = vmManager.ipPool.size;
   if (available < 10) {
     logger.error('IP pool critical!', { available });
     // Force cleanup of old VMs
   }
   ```

---

## 📋 Complete Implementation Checklist

### **Phase 1: Fix Session Persistence** 🔴 CRITICAL

- [ ] Run database migration:
  ```sql
  ALTER TABLE auth_sessions
    ADD COLUMN IF NOT EXISTS vm_ip TEXT,
    ADD COLUMN IF NOT EXISTS vnc_url TEXT,
    ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMPTZ;
  ```

- [ ] Update vm-manager.js:
  - [ ] Replace `oauth_sessions` with `auth_sessions` (6 locations)
  - [ ] Update associateSessionWithVM()
  - [ ] Update getVMForSession()
  - [ ] Update removeSessionMapping()

- [ ] Update browser-vm-auth.js:
  - [ ] Store vm_ip in database during creation
  - [ ] Store vnc_url in database

- [ ] Update auth.js:
  - [ ] Query auth_sessions directly in handleNoVNCUpgrade()
  - [ ] Remove fallback to non-existent oauth_sessions

- [ ] Test:
  - [ ] Start OAuth flow
  - [ ] Restart master-controller mid-flow
  - [ ] Verify session still accessible
  - [ ] Verify noVNC reconnects

---

### **Phase 2: Fix Decodo Proxy Injection** 🔴 CRITICAL

- [ ] Update injectOAuthAgent() (vm-manager.js line 282):
  - [ ] Add /etc/environment injection with HTTP_PROXY
  - [ ] Add systemd service Environment= directives
  - [ ] Test proxy env vars visible in VM

- [ ] Remove local Tinyproxy workaround:
  - [ ] Delete proxyConfig from browser-vm-auth.js line 448
  - [ ] Verify using user's Decodo port

- [ ] Update Chromium launch (vm-browser-agent/server.js):
  - [ ] Already has --proxy-server flag
  - [ ] Verify uses HTTP_PROXY env var

- [ ] Test:
  - [ ] SSH into Browser VM
  - [ ] Check: echo $HTTP_PROXY shows user's Decodo port
  - [ ] Test: curl https://claude.ai succeeds
  - [ ] Verify: curl https://ip.decodo.com/json shows correct IP

---

### **Phase 3: Verify noVNC Connections** 🟡 MEDIUM

- [ ] After Phase 1 fixes, test:
  - [ ] Start OAuth flow
  - [ ] noVNC connects immediately (no 1006 error)
  - [ ] Can interact with Chromium
  - [ ] Can complete OAuth

- [ ] Add retry logic:
  - [ ] If WebSocket upgrade fails, retry 3 times
  - [ ] Log detailed error messages

- [ ] Add monitoring:
  - [ ] Track WebSocket connection success rate
  - [ ] Alert if success rate < 90%

---

### **Phase 4: Integrate WebRTC** 🟡 MEDIUM

- [ ] Update golden snapshot:
  - [ ] Install GStreamer packages
  - [ ] Test X11 screen capture works

- [ ] Update injectOAuthAgent():
  - [ ] Copy both server.js and webrtc-server.js
  - [ ] Create supervisor script (start-all.sh)
  - [ ] Inject SESSION_ID to /etc/session_id

- [ ] Update systemd service:
  - [ ] ExecStart=/opt/vm-browser-agent/start-all.sh
  - [ ] Restart=always for both services

- [ ] Update frontend (auth/page.tsx):
  - [ ] Replace noVNC iframe with WebRTCViewer
  - [ ] Add fallback logic
  - [ ] Test connection

- [ ] Test:
  - [ ] WebRTC connects automatically
  - [ ] Measure latency (should be <100ms)
  - [ ] Test fallback to noVNC works

---

### **Phase 5: Cleanup & Monitoring** 🟢 LOW

- [ ] Add auto-cleanup cron:
  - [ ] Cleanup failed VMs after 1 hour
  - [ ] Run every 10 minutes

- [ ] Add IP pool monitoring:
  - [ ] Alert when <10 IPs available
  - [ ] Force cleanup if exhausted

- [ ] Add metrics:
  - [ ] Browser VM creation success rate
  - [ ] Average OAuth completion time
  - [ ] Failed VM reasons

---

## 🔧 Decodo Proxy Requirements for Browser VMs

### **Why Each Browser VM Needs Its Own IP**:

**OAuth Providers Track**:
- Source IP addresses for fraud detection
- Rate limiting per IP
- Geographic location verification

**With Shared IP** (current Tinyproxy):
- All users appear from same IP
- Rate limits shared across users
- Potential OAuth failures due to suspicious activity

**With Per-User Decodo IP**:
- Each user has consistent external IP
- Independent rate limits
- Better OAuth success rate
- Proper geographic attribution

### **Implementation**:

**Already Working for CLI VMs** ✅:
```javascript
// vm-manager.js line 415
const proxyEnv = await proxyPortManager.getProxyEnvVars(userId);
// Returns: {
//   HTTP_PROXY: 'http://sp9dso1iga:GjHd8bKd3hizw05qZ=@dc.decodo.com:10001',
//   HTTPS_PROXY: '...',
//   NO_PROXY: '...'
// }
```

**Missing for Browser VMs** ❌:
- Guest VM doesn't have these env vars
- Chromium uses local Tinyproxy instead
- Need injection mechanism (see Problem 2 fix)

---

## 📊 File Locations Reference

### Backend:
- `master-controller/src/services/browser-vm-auth.js` - OAuth orchestration
- `master-controller/src/services/vm-manager.js` - VM lifecycle, **contains oauth_sessions bug**
- `master-controller/src/services/proxy-port-manager.js` - Decodo proxy (working)
- `master-controller/src/routes/auth.js` - WebSocket upgrade handler
- `master-controller/src/index.js` - HTTP server, upgrade handler

### VM Agent:
- `master-controller/vm-browser-agent/server.js` - OAuth automation (working)
- `vm-browser-agent/webrtc-server.js` - WebRTC server (not integrated)

### WebRTC (Built, Not Integrated):
- `master-controller/src/services/webrtc-signaling.js` - Signaling service
- `master-controller/src/routes/webrtc.js` - 8 API endpoints
- `webrtc-config/turnserver.conf` - coturn config

### Frontend:
- `src/app/dashboard/remote-cli/auth/page.tsx` - OAuth UI (uses noVNC)
- `src/components/WebRTCViewer.tsx` - WebRTC viewer (not used)
- `src/app/api/vm/auth/route.ts` - API proxy (fixed URL)
- `src/app/api/vm/status/route.ts` - VM status (fixed URL)

### Database:
- `supabase/migrations/20250108000000_cli_remote_tool_schema.sql` - Main schema
- `supabase/migrations/029_fix_auth_sessions_constraint.sql` - Added vm_ip, vnc_url

---

## 🎯 Priority Order

1. **CRITICAL** (Fix This Week):
   - Fix session persistence (Problem 1)
   - Fix Decodo proxy injection (Problem 2)
   - Verify noVNC works (Problem 3)

2. **IMPORTANT** (Next Week):
   - Integrate WebRTC (Problem 4)
   - Test with real users

3. **NICE TO HAVE** (Later):
   - Auto-cleanup failed VMs (Problem 5)
   - Monitoring & alerts
   - WebRTC migration complete

---

## 🧪 Testing Plan

### **Smoke Tests** (After Each Fix):
1. Start OAuth flow for Claude
2. Verify Browser VM creates successfully
3. Verify noVNC connects
4. Verify can interact with Chromium
5. Complete OAuth in browser
6. Verify credentials captured
7. Verify credentials encrypted & stored
8. Verify Browser VM destroyed

### **Integration Tests**:
1. Test all 3 providers (codex, claude, gemini)
2. Test concurrent OAuth flows (3-5 simultaneous)
3. Test session persistence across restarts
4. Test WebRTC failover to noVNC
5. Test Decodo proxy external IP

### **Load Tests**:
1. 10 concurrent OAuth flows
2. Monitor: VM creation time, memory, IP pool
3. Verify: No IP conflicts, no TAP collisions
4. Check: All sessions complete successfully

---

## 🚀 Estimated Effort

**Phase 1** (Session Persistence): 2-3 hours
- Database migration: 30 min
- Code updates: 1.5 hours
- Testing: 1 hour

**Phase 2** (Decodo Proxy): 2-3 hours
- Code changes: 1 hour
- Golden image update: 1 hour
- Testing: 1 hour

**Phase 3** (Verify noVNC): 1 hour
- Testing after Phases 1-2

**Phase 4** (WebRTC Integration): 3-4 hours
- Golden image GStreamer: 1 hour
- Integration code: 1.5 hours
- Frontend update: 30 min
- Testing: 1 hour

**Phase 5** (Cleanup): 1-2 hours
- Background tasks: 30 min
- Monitoring: 1 hour
- Testing: 30 min

**Total**: 9-13 hours across 5 phases

---

## 📝 Success Criteria

**Browser VM System Considered Fixed When**:
- [ ] 0 session persistence errors
- [ ] noVNC connects 100% of time
- [ ] Each Browser VM has unique Decodo IP
- [ ] OAuth flows complete successfully (>95%)
- [ ] WebRTC latency < 100ms (when integrated)
- [ ] <5% failed VMs (down from current ~50%+)
- [ ] All sessions cleanly tracked in database

---

**Status**: Comprehensive analysis complete
**Next**: Review plan, then execute in focused session
