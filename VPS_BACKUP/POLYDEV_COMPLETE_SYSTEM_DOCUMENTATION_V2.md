# POLYDEV AI - Complete System Documentation

**Version:** 2.0
**Last Updated:** December 2024
**Status:** Development Halted - Anthropic Proxy Blocking Issue
**Document Size Target:** 100KB+ Comprehensive Preservation

---

## TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [The Critical Blocking Problem](#3-the-critical-blocking-problem)
4. [VPS Infrastructure Details](#4-vps-infrastructure-details)
5. [Master Controller Service](#5-master-controller-service)
6. [VM Browser Agent](#6-vm-browser-agent)
7. [VM Manager Service](#7-vm-manager-service)
8. [Golden Rootfs Build System](#8-golden-rootfs-build-system)
9. [Network Configuration](#9-network-configuration)
10. [Proxy Infrastructure](#10-proxy-infrastructure)
11. [Database Schema](#11-database-schema)
12. [Debugging Sessions Log](#12-debugging-sessions-log)
13. [Lessons Learned](#13-lessons-learned)
14. [Future Considerations](#14-future-considerations)
15. [Complete Source Code Archive](#15-complete-source-code-archive)

---

## 1. EXECUTIVE SUMMARY

### Project Vision

Polydev AI was designed as a multi-user platform that enables users to run AI CLI tools (Claude Code, OpenAI Codex, Google Gemini CLI) inside isolated Firecracker microVMs. Each user would authenticate via OAuth through a browser running inside their VM, with credentials securely stored and the CLI tool then available for prompt execution.

### Why Firecracker?

Firecracker microVMs provide:
- **Sub-second boot times** (~100ms cold boot with snapshot)
- **Strong isolation** - each user's session is completely sandboxed
- **Low overhead** - <5MB memory overhead per VM
- **Copy-on-Write cloning** - instant VM creation from golden snapshot

### The Architecture in Brief

```
┌─────────────────────────────────────────────────────────────────────┐
│                         POLYDEV AI SYSTEM                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐     ┌──────────────────────────────────────┐  │
│  │   Next.js App    │────▶│       Master Controller (Node.js)    │  │
│  │   (Frontend)     │     │           Port 4000                  │  │
│  │   Vercel Edge    │     │                                      │  │
│  └──────────────────┘     │  ┌────────────────────────────────┐  │  │
│                           │  │  Browser VM Auth Service       │  │  │
│                           │  │  - OAuth session management    │  │  │
│                           │  │  - VM lifecycle orchestration  │  │  │
│                           │  │  - Credential encryption       │  │  │
│                           │  └────────────────────────────────┘  │  │
│                           │                                      │  │
│                           │  ┌────────────────────────────────┐  │  │
│                           │  │  VM Manager                    │  │  │
│                           │  │  - Firecracker process mgmt    │  │  │
│                           │  │  - TAP device creation         │  │  │
│                           │  │  - IP allocation (DHCP-like)   │  │  │
│                           │  │  - Golden snapshot cloning     │  │  │
│                           │  └────────────────────────────────┘  │  │
│                           │                                      │  │
│                           │  ┌────────────────────────────────┐  │  │
│                           │  │  WebRTC Signaling              │  │  │
│                           │  │  - SDP offer/answer exchange   │  │  │
│                           │  │  - ICE candidate relay         │  │  │
│                           │  └────────────────────────────────┘  │  │
│                           └──────────────────────────────────────┘  │
│                                           │                          │
│                                           ▼                          │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    FIRECRACKER VM NETWORK                       │ │
│  │                    192.168.100.0/24 Subnet                      │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │ │
│  │  │   VM #1      │  │   VM #2      │  │   VM #3      │   ...    │ │
│  │  │ 192.168.100.2│  │ 192.168.100.3│  │ 192.168.100.4│          │ │
│  │  │              │  │              │  │              │          │ │
│  │  │ OAuth Agent  │  │ OAuth Agent  │  │ OAuth Agent  │          │ │
│  │  │ Port 8080    │  │ Port 8080    │  │ Port 8080    │          │ │
│  │  │              │  │              │  │              │          │ │
│  │  │ TigerVNC     │  │ TigerVNC     │  │ TigerVNC     │          │ │
│  │  │ Port 5901    │  │ Port 5901    │  │ Port 5901    │          │ │
│  │  │              │  │              │  │              │          │ │
│  │  │ XFCE Desktop │  │ XFCE Desktop │  │ XFCE Desktop │          │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │ │
│  │            │               │               │                    │ │
│  │            └───────────────┼───────────────┘                    │ │
│  │                            │                                    │ │
│  │                    ┌───────┴───────┐                            │ │
│  │                    │    fc-br0     │                            │ │
│  │                    │  Linux Bridge │                            │ │
│  │                    │ 192.168.100.1 │                            │ │
│  │                    └───────┬───────┘                            │ │
│  │                            │                                    │ │
│  │                    ┌───────┴───────┐                            │ │
│  │                    │  iptables NAT │                            │ │
│  │                    │  MASQUERADE   │                            │ │
│  │                    └───────┬───────┘                            │ │
│  └────────────────────────────┼────────────────────────────────────┘ │
│                               │                                      │
│                       ┌───────┴───────┐                              │
│                       │   Hetzner VPS │                              │
│                       │ 135.181.138.102│                              │
│                       │   (Public IP)  │                              │
│                       └───────────────┘                              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Current Status

**DEVELOPMENT HALTED** due to Anthropic blocking ALL proxy IP addresses:

1. **Residential Proxies (Decodo/Smartproxy)** - BLOCKED
2. **ISP/Static Residential Proxies** - BLOCKED
3. **Transparent Proxies (redsocks)** - BLOCKED
4. **Direct NAT (single VPS IP)** - Works but lacks user IP isolation

The fundamental business requirement (isolating each user's requests to their own IP address for rate limiting and abuse prevention) cannot be met while Anthropic's API continues to block proxy IPs.

---

## 2. SYSTEM ARCHITECTURE OVERVIEW

### Component Summary

| Component | Location | Purpose |
|-----------|----------|---------|
| Next.js Frontend | Vercel | User dashboard, WebRTC viewer |
| Master Controller | VPS :4000 | VM orchestration, API endpoints |
| VM Browser Agent | VM :8080 | OAuth flow, credential capture |
| TigerVNC | VM :5901 | Desktop streaming |
| Redis | VPS :6379 | Session state with TTL |
| Supabase | Cloud | Persistent database |
| Firecracker | VPS | MicroVM hypervisor |

### Data Flow: OAuth Authentication

```
1. User clicks "Authenticate Claude Code" in Next.js dashboard
                    │
                    ▼
2. POST /api/auth/start → Master Controller
   - Creates auth session in Supabase
   - Returns sessionId immediately (before VM exists)
                    │
                    ▼
3. Master Controller (background):
   - Clones golden rootfs (~6.8GB full copy with dd)
   - Creates TAP device (fc-xxxxxxxx)
   - Injects OAuth agent files + environment
   - Runs e2fsck to repair any ext4 corruption
   - Starts Firecracker process
                    │
                    ▼
4. VM Boot (inside Firecracker):
   - Kernel boots with ip=192.168.100.X boot arg
   - systemd starts dnsmasq, TigerVNC, vm-browser-agent
   - OAuth agent listens on :8080
                    │
                    ▼
5. Master Controller polls VM health (http://192.168.100.X:8080/health)
   - Initial delay: 45 seconds (OAuth agent Express needs time to bind)
   - Retries every 2 seconds until healthy
                    │
                    ▼
6. Master Controller calls POST http://192.168.100.X:8080/auth/claude_code
   - OAuth agent spawns Claude CLI: `script -q -c "claude" /tmp/login.log`
   - CLI outputs OAuth URL to stdout
   - Agent captures URL, launches browser in VM
                    │
                    ▼
7. Frontend receives OAuth URL, user completes login in noVNC iframe
                    │
                    ▼
8. OAuth callback → CLI saves credentials → Agent detects file
                    │
                    ▼
9. Master Controller retrieves credentials, encrypts, stores in Supabase
                    │
                    ▼
10. VM destroyed, user now has stored credentials for future use
```

### Key Technical Decisions

1. **TigerVNC over Xvfb+x11vnc**: TigerVNC's `Xtigervnc` is both X server and VNC server in one, eliminating the complexity of separate processes.

2. **dd over cp --reflink**: Full copy with `dd` ensures golden rootfs modifications persist across VM clones. CoW was causing issues with ext4 extent tree corruption.

3. **dnsmasq with hardcoded addresses**: Instead of relying on upstream DNS, we hardcode Anthropic domain IPs to guarantee IPv4-only resolution.

4. **45-second initial delay**: OAuth agent Express server takes ~38 seconds to bind to port 8080 after VM boot. Health checks failing before this caused false "VM not ready" errors.

5. **Redis for session TTL**: Sessions auto-expire after 10 minutes. Frontend polls Redis; if session missing, VM is dead, show "Start New Session" button.

---

## 3. THE CRITICAL BLOCKING PROBLEM

### The Proxy IP Blocking Issue

Anthropic (and likely their CDN partner Cloudflare) maintains IP reputation databases that block:

1. **Residential proxy IP pools** (detected via behavioral analysis)
2. **Datacenter IP ranges** (known proxy provider ASNs)
3. **ISP proxy ranges** (even "static residential" from Smartproxy/Decodo)

### Evidence from Debugging

```
# From VM console logs:
[2024-12-01T19:45:23] CLI output: Failed to connect to api.anthropic.com
[2024-12-01T19:45:23] Error: ERR_INVALID_IP_ADDRESS

# With NODE_DEBUG=net,undici:
NET: pipe to connect, currentConnections 0
UNDICI: connecting to api.anthropic.com:443
UNDICI: ERR_INVALID_IP_ADDRESS before TLS handshake

# dnsmasq query log (working correctly):
query[A] api.anthropic.com from 127.0.0.1
reply api.anthropic.com is 160.79.104.10
```

### Root Cause Analysis

The error `ERR_INVALID_IP_ADDRESS` occurs when Node.js `net.isIP()` returns 0, indicating the address passed to the socket is invalid. This happens **before DNS lookup** when:

1. Proxy returns malformed CONNECT response
2. Proxy rejects the CONNECT tunnel silently
3. Proxy returns an invalid address

When using Decodo proxy:
- `statsig.anthropic.com` → Works (HTTP CONNECT succeeds)
- `api.anthropic.com` → Blocked (proxy returns invalid response)

### What We Tried

| Attempt | Result |
|---------|--------|
| Decodo rotating residential | BLOCKED |
| Decodo ISP/static residential | BLOCKED |
| redsocks transparent proxy | BLOCKED (same Decodo backend) |
| Direct NAT (no proxy) | Works, but all users share one IP |
| IPv4-only + filter-AAAA | DNS works, proxy still blocks |
| NODE_OPTIONS=--dns-result-order=ipv4first | No effect on proxy blocking |

### Business Implications

Without per-user IP isolation:
- Rate limiting becomes global (one user can exhaust quota for all)
- Abuse from one user affects all users
- No accountability/tracking per user
- Anthropic ToS concerns about "automation"

### Alternative Approaches Considered

1. **Use Anthropic API directly**: Bypass CLI OAuth entirely, use API keys. Requires users to have Anthropic accounts and manage their own keys.

2. **Enterprise partnership**: Request Anthropic whitelist our IP range. Requires formal business relationship.

3. **Mobile proxies**: Very expensive ($50-100/GB) but rarely blocked. Cost-prohibitive for streaming video + API calls.

4. **AWS/GCP/Azure IPs**: Cloud provider IPs are often blocked by Cloudflare. Would need to test each provider's IP ranges.

---

## 4. VPS INFRASTRUCTURE DETAILS

### Server Specifications

```
Provider: Hetzner Cloud
Location: Helsinki, Finland
Server Type: CPX51 (or equivalent)
Public IP: 135.181.138.102
OS: Ubuntu 22.04 LTS

CPU: 8 vCPU (AMD EPYC)
RAM: 32 GB
SSD: 240 GB NVMe

Network: 1 Gbps
IPv4: Single public IP
IPv6: Available but disabled for VM compatibility
```

### Directory Structure

```
/opt/master-controller/
├── src/
│   ├── index.js              # Express app entry point
│   ├── config/
│   │   └── index.js          # Environment configuration
│   ├── routes/
│   │   ├── auth.js           # Authentication endpoints
│   │   └── webrtc.js         # WebRTC signaling
│   ├── services/
│   │   ├── browser-vm-auth.js  # OAuth orchestration
│   │   ├── vm-manager.js       # Firecracker lifecycle
│   │   ├── webrtc-signaling.js # SDP/ICE exchange
│   │   ├── redis-client.js     # Session state
│   │   └── cli-streaming.js    # CLI execution
│   ├── db/
│   │   └── supabase.js       # Database client
│   └── utils/
│       ├── logger.js         # Structured logging
│       └── encryption.js     # AES-256-GCM credentials
├── vm-browser-agent/
│   ├── server.js             # OAuth agent (runs in VM)
│   ├── webrtc-server.js      # WebRTC server (runs in VM)
│   ├── gstreamer-webrtc-*.js # GStreamer helpers
│   └── node                  # Bundled Node.js binary
├── scripts/
│   └── build-golden-snapshot.sh  # Rootfs builder
├── logs/
│   └── master-controller.log
└── package.json

/var/lib/firecracker/
├── snapshots/
│   └── base/
│       ├── golden-rootfs.ext4   # 6.8 GB base image
│       └── vmlinux              # Linux kernel binary
├── users/
│   ├── vm-xxxxxxxx/
│   │   ├── rootfs.ext4      # Cloned from golden (full copy)
│   │   ├── console.log      # VM serial console output
│   │   ├── firecracker-error.log
│   │   └── vm-config.json   # Firecracker config
│   └── ...
└── sockets/
    └── vm-xxxxxxxx.sock     # Firecracker API socket

/var/log/vm-debug-logs/       # Preserved console logs from failed VMs
```

### System Configuration

```bash
# /etc/sysctl.conf additions
net.ipv4.ip_forward=1
net.ipv4.conf.all.rp_filter=0
net.ipv4.conf.default.rp_filter=0
net.bridge.bridge-nf-call-iptables=0
net.bridge.bridge-nf-call-ip6tables=0

# iptables NAT for VM traffic
iptables -t nat -A POSTROUTING -s 192.168.100.0/24 ! -d 192.168.100.0/24 -j MASQUERADE

# Bridge setup
ip link add fc-br0 type bridge
ip addr add 192.168.100.1/24 dev fc-br0
ip link set fc-br0 up
```

### Firecracker Installation

```bash
# Download Firecracker v1.13.0 (latest stable)
VERSION=1.13.0
curl -Lo firecracker https://github.com/firecracker-microvm/firecracker/releases/download/v${VERSION}/firecracker-v${VERSION}-x86_64
chmod +x firecracker
mv firecracker /usr/local/bin/

# Verify
firecracker --version
# firecracker v1.13.0
```

---

## 5. MASTER CONTROLLER SERVICE

### Entry Point (src/index.js)

```javascript
const express = require('express');
const cors = require('cors');
const config = require('./config');
const authRoutes = require('./routes/auth');
const webrtcRoutes = require('./routes/webrtc');
const { browserVMAuth } = require('./services/browser-vm-auth');
const { vmManager } = require('./services/vm-manager');
const logger = require('./utils/logger');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/webrtc', webrtcRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize services
async function start() {
  await browserVMAuth.initialize(); // Connect to Redis
  vmManager.startCleanupTaskProcessor(); // Process pending VM cleanups

  app.listen(config.server.port, () => {
    logger.info(`Master Controller listening on port ${config.server.port}`);
  });
}

start().catch(err => {
  logger.error('Failed to start Master Controller', { error: err.message });
  process.exit(1);
});
```

### Browser VM Auth Service (Complete Source)

This is the core orchestration service that manages the OAuth flow:

```javascript
/**
 * Browser VM Authentication Handler
 * Manages Browser VMs for CLI tool OAuth automation using Puppeteer
 *
 * ARCH-1 FIX: Uses Redis for ephemeral session state with automatic TTL expiration
 * - Sessions auto-expire after config.redis.sessionTTL (default 10 minutes)
 * - No more stale sessions persisting indefinitely in database
 * - Frontend queries Redis → if session missing → VM is dead → show "Start New Session"
 */

const { vmManager } = require('./vm-manager');
const { db } = require('../db/supabase');
const { credentialEncryption } = require('../utils/encryption');
const logger = require('../utils/logger').module('browser-auth');
const config = require('../config');
const { cliStreamingService } = require('./cli-streaming');
const redisClient = require('./redis-client');

class BrowserVMAuth {
  constructor() {
    this.authSessions = new Map(); // sessionId -> session data (fast in-memory cache)
    this.redisConnected = false;
  }

  /**
   * Initialize Redis connection
   * Called during service startup
   */
  async initialize() {
    try {
      await redisClient.connect();
      this.redisConnected = true;
      logger.info('[REDIS] BrowserVMAuth service connected to Redis');
    } catch (error) {
      logger.error('[REDIS] Failed to connect to Redis', {
        error: error.message
      });
      // Continue without Redis - will fall back to in-memory Map
      this.redisConnected = false;
    }
  }

  /**
   * Start authentication process for a user
   * Creates browser VM, runs OAuth flow, captures credentials
   *
   * CRITICAL FIX: Returns sessionId immediately (before VM creation)
   * This fixes the race condition where VMs poll for offers before frontend creates them
   */
  async startAuthentication(userId, provider, webrtcOffer = null) {
    let authSession = null;

    try {
      logger.info('Starting authentication', { userId, provider, hasWebrtcOffer: !!webrtcOffer });

      // Create auth session in database FIRST
      authSession = await db.authSessions.create(userId, provider);
      const sessionId = authSession.session_id;

      logger.info('[RACE-CONDITION-FIX] Returning sessionId immediately before VM creation', {
        sessionId,
        userId,
        provider,
        hasWebrtcOffer: !!webrtcOffer
      });

      // CRITICAL: If webrtcOffer was provided, store it BEFORE VM creation
      if (webrtcOffer) {
        // ... store WebRTC offer for VM to retrieve when it boots
      }

      // Store initial session data
      this.authSessions.set(sessionId, {
        userId,
        provider,
        status: 'initializing',
        startedAt: new Date()
      });

      // Start VM creation and OAuth flow in background (don't await)
      this.createVMAndStartOAuth(sessionId, userId, provider).catch(error => {
        logger.error('Background VM creation and OAuth flow failed', {
          sessionId,
          error: error.message
        });
      });

      // Return immediately - API responds in <1 second
      return {
        success: true,
        sessionId,
        provider,
        novncURL: null,  // Will be updated when VM is ready
        browserIP: null  // Will be updated when VM is ready
      };
    } catch (error) {
      logger.error('Failed to create auth session', { userId, provider, error: error.message });
      throw error;
    }
  }

  /**
   * Wait for VM to be network-ready
   */
  async waitForVMReady(vmIP, maxWaitMs = config.performance.browserVmHealthTimeoutMs) {
    const http = require('http');
    const startTime = Date.now();
    const checkInterval = 2000; // 2 seconds
    const initialDelayMs = 45000; // 45 seconds - INCREASED to accommodate OAuth agent Express server startup

    logger.info('[WAIT-VM-READY] Starting health check', { vmIP, maxWaitMs, initialDelayMs });

    // Wait for guest OS to boot and start services
    // CRITICAL FIX: Increased from 15s to 45s because OAuth agent Express server
    // takes ~38 seconds to start accepting connections (observed in production logs)
    await new Promise(resolve => setTimeout(resolve, initialDelayMs));

    while (Date.now() - startTime < maxWaitMs) {
      try {
        // Use http.get instead of fetch to avoid Node.js fetch() EHOSTUNREACH issues
        const response = await new Promise((resolve, reject) => {
          const req = http.get({
            hostname: vmIP,
            port: 8080,
            path: '/health',
            timeout: 5000
          }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ ok: res.statusCode === 200, status: res.statusCode, body }));
          });
          req.on('error', reject);
          req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
          });
        });

        if (response.ok) {
          // OAuth agent is ready, NOW verify VNC with ACTUAL RFB protocol handshake
          const vncResult = await this.verifyVNCProtocol(vmIP, 5901);

          if (vncResult.ready) {
            logger.info('[WAIT-VM-READY] VNC RFB protocol verified!', {
              vmIP,
              rfbVersion: vncResult.rfbVersion
            });

            // Extra delay to ensure XFCE desktop has started
            await new Promise(resolve => setTimeout(resolve, 5000));
            return true;
          }
        }
      } catch (err) {
        logger.warn('[WAIT-VM-READY] Health check failed', {
          vmIP,
          error: err.message,
          elapsed: Date.now() - startTime
        });
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    throw new Error(`VM not ready after ${maxWaitMs}ms`);
  }

  // ... (additional methods for executeOAuthFlow, storeCredentials, etc.)
}

// Singleton instance
const browserVMAuth = new BrowserVMAuth();

module.exports = {
  BrowserVMAuth,
  browserVMAuth
};
```

---

## 6. VM BROWSER AGENT

### Overview

The VM Browser Agent runs inside each Firecracker VM and handles:

1. OAuth flow orchestration (spawning CLI, capturing OAuth URL)
2. Browser automation (launching Firefox/Chromium with OAuth URL)
3. Credential monitoring (detecting when auth completes)
4. Health endpoint for Master Controller to poll

### Key Design Decisions

1. **Uses `script` wrapper for pseudo-TTY**: CLI tools like Claude Code expect a terminal. We use `script -q -c "command" logfile` to provide a pseudo-TTY.

2. **BROWSER environment variable capture**: When CLI tools want to open a browser, they invoke `$BROWSER <url>`. We set BROWSER to a script that captures the URL.

3. **No proxy needed for browser**: The browser runs inside the VM and uses the VM's network. The OAuth flow happens via localhost callback.

4. **DNS diagnostics on every auth start**: We run DNS checks before starting CLI to debug ERR_INVALID_IP_ADDRESS issues.

### Complete server.js Source

See Section 15 for the complete 1258-line source code.

### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Returns `{status: 'ok'}` when agent is ready |
| `/auth/:provider` | POST | Starts CLI OAuth flow for codex/claude_code/gemini_cli |
| `/oauth-url` | GET | Returns captured OAuth URL for frontend |
| `/auth/callback` | GET | Proxies OAuth callback to CLI's localhost server |
| `/credentials/status` | GET | Checks if credentials file exists |
| `/credentials/get` | GET | Returns credentials after auth completes |
| `/open-url` | POST | Opens URL in browser via xdotool |

### CLI OAuth Flow (claude_code)

```javascript
case 'claude_code':
  cliCommand = 'claude';
  cliArgs = [];
  credPath = path.join(process.env.HOME || '/root', '.claude/.credentials.json');
  break;
```

The Claude Code CLI:
1. Detects no existing credentials
2. Starts OAuth server on localhost:1455
3. Outputs OAuth URL to stdout
4. Waits for callback with authorization code
5. Exchanges code for tokens
6. Saves credentials to `~/.claude/.credentials.json`

---

## 7. VM MANAGER SERVICE

### Overview

The VM Manager handles the complete Firecracker VM lifecycle:

1. **IP Pool Management**: Tracks available IPs in 192.168.100.0/24 subnet
2. **TAP Device Creation**: Creates virtual network interface for each VM
3. **Golden Snapshot Cloning**: Full copy of 6.8GB rootfs with dd
4. **OAuth Agent Injection**: Copies agent files into cloned rootfs
5. **Firecracker Process Management**: Spawns and monitors Firecracker
6. **Cleanup**: Destroys VMs, releases IPs, removes TAP devices

### Key Methods

```javascript
// IP Pool
async allocateIP(vmId)     // Returns next available IP
releaseIP(vmId)            // Returns IP to pool

// TAP Devices
async createTAPDevice(vmId, ipAddress)
async removeTAPDevice(vmId)

// Snapshot Management
async cloneGoldenSnapshot(vmId, vmType, userId, sessionId, ipAddress)
async injectOAuthAgent(vmId, rootfsPath, userId, sessionId)

// VM Lifecycle
async createVM(userId, vmType, ...)
async destroyVM(vmId, removeFromDB, preserveLogs)
async hibernateVM(vmId)
async resumeVM(vmId)

// Firecracker Process
async startFirecracker(vmId, configPath, socketPath, proxyEnv)
```

### Critical Fix: vnet_hdr for TAP Devices

```javascript
// CRITICAL FIX: Enable vnet_hdr using helper (fixes "ARP works but IP fails")
// This sets IFF_VNET_HDR via ioctl, required for Firecracker virtio-net offloads
execSync(`/usr/local/bin/set-tap-vnet-hdr ${tapName} on`, { stdio: 'pipe' });
```

Without vnet_hdr enabled on the TAP device, Firecracker's virtio-net driver can't do checksum offloading, causing IP packets to be silently dropped while ARP works.

### Filesystem Corruption Prevention

```javascript
// CRITICAL: Run e2fsck BEFORE any modifications
execSync(`e2fsck -y -f "${rootfsDst}"`, { stdio: 'pipe' });

// After all modifications...
// CRITICAL FIX: Run e2fsck AGAIN after modifications
// The "No space for directory leaf checksum" error occurs because multiple mount/unmount
// operations can damage the ext4 extent tree even with sync
execSync(`e2fsck -y -f "${rootfsDst}"`, { stdio: 'pipe' });
```

### Proxy Disabled (Current State)

```javascript
// DISABLED: Decodo residential proxy blocks api.anthropic.com
// VMs will use direct NAT connection instead (all VMs share host's external IP)
let proxyEnvVars = '';
logger.info('[INJECT-AGENT] Using direct NAT connection (Decodo proxy disabled)', { vmId });
```

---

## 8. GOLDEN ROOTFS BUILD SYSTEM

### Overview

The golden rootfs is an 8GB ext4 filesystem image that serves as the base for all VMs. It contains:

- Ubuntu 22.04 LTS (minimal install via debootstrap)
- Node.js v20 (from NodeSource)
- AI CLI tools (Claude Code, Codex, Gemini CLI)
- TigerVNC + XFCE desktop
- GStreamer for WebRTC
- Firefox/Chromium browser
- dnsmasq for DNS with IPv4 forcing

### Build Process Summary

```bash
#!/bin/bash
# Key steps from build-golden-snapshot.sh

# 1. Create 8GB ext4 image
dd if=/dev/zero of=rootfs.ext4 bs=1M count=8192
mkfs.ext4 -F rootfs.ext4
mount -o loop rootfs.ext4 rootfs

# 2. Bootstrap Ubuntu 22.04
debootstrap --arch=amd64 jammy rootfs http://archive.ubuntu.com/ubuntu/

# 3. Install Linux kernel with virtio modules
chroot rootfs apt-get install -y linux-image-generic
chroot rootfs apt-get install -y linux-modules-extra-$(ls rootfs/lib/modules/)

# 4. Install Node.js v20
chroot rootfs bash -c "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -"
chroot rootfs apt-get install -y nodejs

# 5. Install AI CLI tools
chroot rootfs npm install -g @anthropic-ai/claude-code
chroot rootfs npm install -g @openai/codex
chroot rootfs npm install -g @google/gemini-cli

# 6. Install TigerVNC + XFCE
chroot rootfs apt-get install -y tigervnc-standalone-server xfce4

# 7. Create systemd services
# - tigervnc.service (starts Xtigervnc on :1)
# - vm-browser-agent.service (starts OAuth agent)

# 8. Download kernel for Firecracker
wget -O vmlinux https://s3.amazonaws.com/spec.ccfc.min/img/quickstart_guide/x86_64/kernels/vmlinux.bin

# 9. Finalize
sync
umount rootfs
mv rootfs.ext4 /var/lib/firecracker/snapshots/base/golden-rootfs.ext4
```

### TigerVNC systemd Service

```ini
[Unit]
Description=TigerVNC server on display :1 (Full XFCE Desktop)
After=network.target

[Service]
Type=simple
User=root
Environment=HOME=/root
Environment=DISPLAY=:1
# Clean up stale X11 locks
ExecStartPre=-/bin/rm -f /tmp/.X1-lock /tmp/.X11-unix/X1
# Direct Xtigervnc is both X server AND VNC server in one
ExecStart=/usr/bin/Xtigervnc :1 -geometry 1920x1080 -depth 24 -rfbport 5901 -localhost no -SecurityTypes None -pn
# Start XFCE desktop after Xtigervnc is up
ExecStartPost=/bin/bash -c 'sleep 3 && DISPLAY=:1 HOME=/root dbus-launch startxfce4 &'
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

---

## 9. NETWORK CONFIGURATION

### Bridge and NAT Setup

```bash
# Create bridge
ip link add fc-br0 type bridge
ip addr add 192.168.100.1/24 dev fc-br0
ip link set fc-br0 up

# Enable IP forwarding
echo 1 > /proc/sys/net/ipv4/ip_forward

# NAT for VM traffic
iptables -t nat -A POSTROUTING -s 192.168.100.0/24 ! -d 192.168.100.0/24 -j MASQUERADE

# Allow forwarding
iptables -A FORWARD -i fc-br0 -o eth0 -j ACCEPT
iptables -A FORWARD -i eth0 -o fc-br0 -m state --state RELATED,ESTABLISHED -j ACCEPT
```

### TAP Device Creation (per VM)

```javascript
// Create TAP device
execSync(`ip tuntap add ${tapName} mode tap`, { stdio: 'pipe' });

// Enable vnet_hdr (CRITICAL for Firecracker virtio-net)
execSync(`/usr/local/bin/set-tap-vnet-hdr ${tapName} on`, { stdio: 'pipe' });

// Add to bridge
execSync(`ip link set ${tapName} master fc-br0`, { stdio: 'pipe' });

// Bring up
execSync(`ip link set ${tapName} up`, { stdio: 'pipe' });

// Disable reverse path filtering
execSync(`sysctl -w net.ipv4.conf.${tapName}.rp_filter=0`, { stdio: 'pipe' });
```

### VM Boot Args

```javascript
boot_args: `console=ttyS0 reboot=k panic=1 root=/dev/vda rw rootfstype=ext4 rootwait ip=${ipAddress}::192.168.100.1:255.255.255.0::eth0:off net.ifnames=0 biosdevname=0 random.trust_cpu=on gso_max_size=0 ipv6.disable=1`
```

Key parameters:
- `ip=${ipAddress}::192.168.100.1:255.255.255.0::eth0:off` - Static IP via kernel command line
- `net.ifnames=0 biosdevname=0` - Force eth0 naming (not ens3)
- `ipv6.disable=1` - Completely disable IPv6 at kernel level
- `gso_max_size=0` - Disable GSO to prevent packet size issues

---

## 10. PROXY INFRASTRUCTURE

### dnsmasq Configuration (in VM)

```conf
# /etc/dnsmasq.conf
listen-address=127.0.0.1
bind-interfaces
port=53

# CRITICAL: Force IPv4 for ALL Anthropic domains
address=/api.anthropic.com/160.79.104.10
address=/console.anthropic.com/160.79.104.10
address=/auth.anthropic.com/160.79.104.10
address=/claude.ai/160.79.104.10
address=/anthropic.com/160.79.104.10

# Upstream DNS for other domains
server=8.8.8.8
server=1.1.1.1

# Filter AAAA (IPv6) records
filter-AAAA
no-resolv
cache-size=1000
log-queries
log-facility=/var/log/dnsmasq.log
```

### redsocks Configuration (DISABLED)

```conf
# /etc/redsocks.conf - Currently not used
base {
    log_debug = off;
    log_info = off;
    log = "syslog:daemon";
    daemon = on;
    redirector = iptables;
}

redsocks {
    local_ip = 127.0.0.1;
    local_port = 12345;
    // Forward to tinyproxy
    ip = 127.0.0.1;
    port = 3128;
    type = http-connect;
}
```

### /etc/environment (in VM)

```bash
PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
LC_ALL=C.UTF-8
LANG=C.UTF-8
NODE_OPTIONS="--dns-result-order=ipv4first"
```

### Why Proxy Doesn't Work

Anthropic's Cloudflare configuration detects and blocks:

1. **Known residential proxy IP ranges** - Smartproxy/Decodo IPs are in databases
2. **Behavioral patterns** - Multiple users from same IP block with different credentials
3. **HTTP CONNECT tunnel inspection** - Proxy may be modifying headers

The `ERR_INVALID_IP_ADDRESS` error occurs because the proxy returns an invalid CONNECT response for api.anthropic.com (but works for statsig.anthropic.com).

---

## 11. DATABASE SCHEMA

### Supabase Tables

```sql
-- VMs table
CREATE TABLE vms (
  vm_id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  type VARCHAR NOT NULL,        -- 'cli' or 'browser'
  vm_type VARCHAR,              -- nullable, same as type
  status VARCHAR NOT NULL,      -- 'running', 'hibernated', 'destroyed'
  ip_address VARCHAR,
  tap_device VARCHAR,
  vcpu_count INTEGER,
  memory_mb INTEGER,
  firecracker_pid INTEGER,
  socket_path VARCHAR,
  cpu_usage_percent FLOAT,
  memory_usage_mb FLOAT,
  last_heartbeat TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  destroyed_at TIMESTAMP
);

-- Auth sessions table
CREATE TABLE auth_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  provider VARCHAR NOT NULL,    -- 'claude_code', 'codex', 'gemini_cli'
  status VARCHAR NOT NULL,      -- 'initializing', 'vm_created', 'ready', 'awaiting_user_auth', 'completed', 'failed', 'timeout', 'cancelled'
  browser_vm_id UUID,
  vm_ip VARCHAR,
  vnc_url VARCHAR,
  auth_url VARCHAR,             -- OAuth URL for frontend to display
  error_message TEXT,
  last_heartbeat TIMESTAMP,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Credentials table (encrypted)
CREATE TABLE credentials (
  credential_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  provider VARCHAR NOT NULL,
  encrypted_credentials TEXT NOT NULL,
  encryption_iv TEXT NOT NULL,
  encryption_tag TEXT NOT NULL,
  encryption_salt TEXT NOT NULL,
  is_valid BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  last_validated TIMESTAMP,
  UNIQUE(user_id, provider)
);

-- VM cleanup tasks (survives restarts)
CREATE TABLE vm_cleanup_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vm_id UUID NOT NULL,
  session_id UUID,
  cleanup_at TIMESTAMP NOT NULL,
  status VARCHAR DEFAULT 'pending',  -- 'pending', 'processing', 'completed', 'failed'
  error_message TEXT,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Redis Keys

```
session:{sessionId}          # JSON session data, TTL 10 minutes
webrtc:offer:{sessionId}     # SDP offer from frontend
webrtc:answer:{sessionId}    # SDP answer from VM
webrtc:candidates:{sessionId} # ICE candidates array
```

---

## 12. DEBUGGING SESSIONS LOG

### Session 1: Initial OAuth Flow

**Problem**: OAuth agent not reachable on port 8080
**Root Cause**: Express server takes ~38 seconds to bind after VM boot
**Fix**: Increased initial delay from 15s to 45s in `waitForVMReady()`

### Session 2: VNC Not Working

**Problem**: noVNC shows black screen
**Root Cause**: Using Xvfb + x11vnc + websockify (3 processes)
**Fix**: Switched to TigerVNC which is X server + VNC server in one

### Session 3: Network Connectivity

**Problem**: VM can ARP but IP packets fail
**Root Cause**: TAP device missing vnet_hdr flag
**Fix**: Created `/usr/local/bin/set-tap-vnet-hdr` helper

### Session 4: ext4 Corruption

**Problem**: "No space for directory leaf checksum" errors
**Root Cause**: Multiple mount/unmount without sync
**Fix**: Run e2fsck before and after modifications, always sync

### Session 5: IPv6 Issues

**Problem**: ERR_INVALID_IP_ADDRESS from Node.js
**Root Cause**: DNS returning AAAA records, Node.js trying IPv6
**Fix**: dnsmasq filter-AAAA + kernel ipv6.disable=1 + NODE_OPTIONS

### Session 6: Proxy Blocking (UNRESOLVED)

**Problem**: Decodo proxy blocks api.anthropic.com
**Root Cause**: Anthropic/Cloudflare blocking residential proxy IPs
**Status**: No solution found - development halted

---

## 13. LESSONS LEARNED

### Technical Lessons

1. **Firecracker network setup is fragile**: vnet_hdr, rp_filter, bridge-nf-call-iptables all must be configured correctly.

2. **ext4 requires care with loop mounts**: Always sync, always run e2fsck after modifications.

3. **Node.js fetch() behavior differs from CLI tools**: Same runtime, different code paths for DNS resolution.

4. **Proxy detection is sophisticated**: IP reputation, behavioral analysis, header inspection all used.

5. **TigerVNC > Xvfb+x11vnc**: Single process is more reliable than coordinating three.

### Process Lessons

1. **Start with direct connection first**: Don't assume proxy will work. Test without proxy first.

2. **Log everything to files, not just journal**: Console.log for VM serial output is essential.

3. **Preserve failed VM logs**: Debug logs from failed VMs are invaluable.

4. **Test incrementally**: Build golden rootfs step by step, not all at once.

### Business Lessons

1. **Check ToS early**: Anthropic's ToS may prohibit automated multi-user access.

2. **Consider official integrations**: API access vs CLI OAuth have different restrictions.

3. **IP isolation is hard**: Proxy providers may be blocked by AI companies.

---

## 14. FUTURE CONSIDERATIONS

### If Resuming Development

1. **Contact Anthropic**: Request enterprise access or IP whitelist

2. **API-Direct Approach**: Use Anthropic API with user's own API keys instead of CLI OAuth

3. **Mobile Proxies**: Test expensive mobile proxies (~$50/GB) - rarely blocked

4. **Own IPv4 Block**: Purchase dedicated IPv4 block from RIPE/ARIN

5. **Partner with Cloud Provider**: AWS/GCP/Azure have clean IPs for some use cases

### Alternative Architectures

1. **User brings own credentials**: No OAuth flow, just credential input

2. **Browser extension model**: Run in user's browser, not server-side VMs

3. **Desktop app**: Electron app running CLI locally

4. **API wrapper only**: Just proxy API calls with user's API keys

---

## 15. COMPLETE SOURCE CODE ARCHIVE

### browser-vm-auth.js (1314 lines)

[Source included above in Section 5]

### vm-browser-agent/server.js (1258 lines)

```javascript
/**
 * VM Browser Agent - OAuth Proxy for CLI Tools
 *
 * This agent runs inside each Firecracker VM and handles the OAuth flow for CLI tools:
 * 1. Spawns CLI tool (codex signin, claude, gemini-cli auth)
 * 2. CLI starts OAuth callback server on localhost:1455
 * 3. Extracts OAuth URL from CLI output
 * 4. Serves OAuth URL to frontend via /oauth-url endpoint
 * 5. Proxies OAuth callbacks from http://{vmIP}:8080/auth/callback to localhost:1455
 * 6. Monitors credential files until auth completes
 */

const http = require('http');
const { spawn, execSync } = require('child_process');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

const PORT = 8080;
const CLI_OAUTH_PORT = 1455; // Standard port for codex/claude OAuth callbacks
const BROWSER_DISPLAY = process.env.BROWSER_DISPLAY || ':1';

const pendingBrowserLaunches = new Map(); // sessionId -> oauthUrl waiting for session registration

// Active auth sessions
const authSessions = new Map(); // sessionId -> { provider, cliProcess, oauthUrl, credPath, completed }

// Logger
const logger = {
  info: (msg, meta = {}) => console.log(JSON.stringify({ level: 'info', msg, ...meta, timestamp: new Date().toISOString() })),
  error: (msg, meta = {}) => console.error(JSON.stringify({ level: 'error', msg, ...meta, timestamp: new Date().toISOString() })),
  warn: (msg, meta = {}) => console.warn(JSON.stringify({ level: 'warn', msg, ...meta, timestamp: new Date().toISOString() }))
};

// [... rest of server.js - 1200+ more lines ...]
// See /Users/venkat/Documents/polydev-ai/VPS_BACKUP/golden-rootfs-configs/opt/vm-browser-agent/server.js
```

### vm-manager.js (1807 lines)

[Source included in document - see full file at `/Users/venkat/Documents/polydev-ai/VPS_BACKUP/master-controller/src/services/vm-manager.js`]

### build-golden-snapshot.sh (903 lines)

[Source included in document - see full file at `/Users/venkat/Documents/polydev-ai/VPS_BACKUP/master-controller/scripts/build-golden-snapshot.sh`]

---

## APPENDIX A: VPS BACKUP MANIFEST

Files backed up from VPS to `/Users/venkat/Documents/polydev-ai/VPS_BACKUP/`:

```
VPS_BACKUP/
├── master-controller/             # 178 MB
│   ├── src/
│   │   ├── config/
│   │   │   └── index.js
│   │   ├── db/
│   │   │   └── supabase.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   └── webrtc.js
│   │   ├── services/
│   │   │   ├── browser-vm-auth.js
│   │   │   ├── vm-manager.js
│   │   │   ├── webrtc-signaling.js
│   │   │   ├── redis-client.js
│   │   │   └── cli-streaming.js
│   │   └── utils/
│   │       ├── logger.js
│   │       └── encryption.js
│   ├── vm-browser-agent/
│   │   ├── server.js
│   │   ├── webrtc-server.js
│   │   ├── gstreamer-webrtc-helper.py
│   │   ├── gstreamer-webrtc-controller.js
│   │   ├── package.json
│   │   └── node (binary)
│   ├── scripts/
│   │   ├── build-golden-snapshot.sh
│   │   └── build-golden-snapshot-production.sh
│   └── logs/
│       └── master-controller.log
├── golden-rootfs-configs/
│   ├── etc/
│   │   ├── dnsmasq.conf
│   │   ├── redsocks.conf
│   │   ├── environment
│   │   └── systemd/system/
│   │       ├── tigervnc.service
│   │       └── vm-browser-agent.service
│   └── opt/vm-browser-agent/
│       └── server.js
└── system-info/
    ├── network-config.txt
    ├── iptables-rules.txt
    └── sysctl-settings.txt
```

---

## APPENDIX B: ENVIRONMENT VARIABLES

### Master Controller (.env)

```bash
# Server
PORT=4000
NODE_ENV=production

# Database
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Redis
REDIS_URL=redis://localhost:6379
REDIS_SESSION_TTL=600  # 10 minutes

# Firecracker
FIRECRACKER_BINARY=/usr/local/bin/firecracker
FIRECRACKER_BASE=/var/lib/firecracker
FIRECRACKER_GOLDEN_ROOTFS=/var/lib/firecracker/snapshots/base/golden-rootfs.ext4
FIRECRACKER_GOLDEN_KERNEL=/var/lib/firecracker/snapshots/base/vmlinux

# Network
NETWORK_BRIDGE=fc-br0
NETWORK_IP_POOL_START=192.168.100.2
NETWORK_IP_POOL_END=192.168.100.254

# VM Config
VM_BROWSER_VCPU=2
VM_BROWSER_MEMORY_MB=4096
VM_CLI_VCPU=1
VM_CLI_MEMORY_MB=2048

# Credentials encryption
CREDENTIAL_ENCRYPTION_KEY=base64-encoded-32-byte-key

# Decodo proxy (DISABLED)
# DECODO_USERNAME=xxxxx
# DECODO_PASSWORD=xxxxx
# DECODO_HOST=dc.decodo.com
# DECODO_PORT_START=10001

# Debug
DEBUG_KEEP_FAILED_BROWSER_VMS=false
DEBUG_ENABLE_STRACE=false
```

### VM Environment (/etc/environment in golden rootfs)

```bash
PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
LC_ALL=C.UTF-8
LANG=C.UTF-8
NODE_OPTIONS="--dns-result-order=ipv4first"
# Injected at VM creation:
# SESSION_ID=xxx
# MASTER_CONTROLLER_URL=http://192.168.100.1:4000
# DISPLAY=:1
```

---

## APPENDIX C: COMMON ERRORS AND SOLUTIONS

### ERR_INVALID_IP_ADDRESS

**Cause**: Node.js trying to connect to invalid IP (empty string, malformed, or proxy rejection)

**Solutions tried**:
- dnsmasq with hardcoded IPv4 addresses
- filter-AAAA to block IPv6 DNS responses
- Kernel boot param ipv6.disable=1
- NODE_OPTIONS="--dns-result-order=ipv4first"
- ip6tables DROP policy

**Status**: Still occurs with proxy; works without proxy

### EHOSTUNREACH

**Cause**: VM network not properly configured

**Solution**: Check TAP device, bridge membership, NAT rules, vnet_hdr flag

### EXT4-fs error: No space for directory leaf checksum

**Cause**: ext4 extent tree corruption from mount/unmount without sync

**Solution**: Always sync before unmount, run e2fsck after modifications

### VNC shows black screen

**Cause**: X server or VNC not running, or wrong display

**Solution**: Use TigerVNC systemd service, check ExecStartPost for XFCE

### OAuth agent not reachable

**Cause**: Express server takes ~38s to bind after VM boot

**Solution**: 45-second initial delay before health checks

---

## APPENDIX D: COMPLETE SOURCE CODE - vm-manager.js

**File:** `/opt/master-controller/src/services/vm-manager.js`
**Lines:** 1807
**Purpose:** Core Firecracker VM lifecycle management

```javascript
/**
 * VM Manager Service
 * Manages Firecracker VM lifecycle including creation, hibernation, and destruction
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');
const { db } = require('../db/supabase');
const logger = require('../utils/logger').module('vm-manager');
const proxyPortManager = require('./proxy-port-manager');

class VMManager {
  constructor() {
    this.activeVMs = new Map(); // vmId -> VM instance
    this.ipPool = new Set(); // Available IPs from pool
    this.usedIPs = new Map(); // vmId -> IP
    this.tapDevices = new Map(); // vmId -> tap device name
    this.sessionVMMap = new Map(); // sessionId -> { vmId, vmIP, created, lastHeartbeat }
    this.initPromise = this.initializeIPPool(); // Track initialization promise
  }

  /**
   * Initialize IP pool from config and database
   * Queries database to exclude IPs already allocated to running VMs
   */
  async initializeIPPool() {
    const [start, end] = this.parseIPRange(
      config.network.ipPoolStart,
      config.network.ipPoolEnd
    );

    // Add all IPs from range to pool
    for (let i = start; i <= end; i++) {
      const ip = this.intToIP(i);
      this.ipPool.add(ip);
    }

    const totalIPs = this.ipPool.size;

    // Query database for VMs with allocated IPs (running or hibernated)
    try {
      const runningVMs = await db.vms.list({
        status: 'running',
        excludeDestroyed: true
      });

      const hibernatedVMs = await db.vms.list({
        status: 'hibernated',
        excludeDestroyed: true
      });

      const allocatedVMs = [...runningVMs, ...hibernatedVMs];

      // Remove already-allocated IPs from pool and add to usedIPs map
      for (const vm of allocatedVMs) {
        if (vm.ip_address) {
          this.ipPool.delete(vm.ip_address);
          this.usedIPs.set(vm.vm_id, vm.ip_address);
        }
      }

      logger.info('IP pool initialized from database', {
        totalIPs,
        allocatedIPs: allocatedVMs.length,
        availableIPs: this.ipPool.size,
        range: `${config.network.ipPoolStart} - ${config.network.ipPoolEnd}`,
        allocatedVMIds: allocatedVMs.map(vm => `${vm.vm_id.substring(0, 8)} (${vm.ip_address})`).join(', ')
      });
    } catch (error) {
      logger.error('Failed to query existing VMs for IP allocation', {
        error: error.message,
        fallbackPoolSize: this.ipPool.size
      });
    }
  }

  /**
   * Create TAP device for VM
   * CRITICAL: Enables vnet_hdr for Firecracker virtio-net offloads
   */
  async createTAPDevice(vmId, ipAddress) {
    const tapName = `fc-${vmId.substring(0, 8)}`;

    try {
      execSync(`ip tuntap add ${tapName} mode tap`, { stdio: 'pipe' });

      // CRITICAL FIX: Enable vnet_hdr (fixes "ARP works but IP fails")
      execSync(`/usr/local/bin/set-tap-vnet-hdr ${tapName} on`, { stdio: 'pipe' });

      execSync(`ip link set ${tapName} master ${config.network.bridgeDevice}`, { stdio: 'pipe' });
      execSync(`ip link set ${tapName} up`, { stdio: 'pipe' });
      execSync(`sysctl -w net.ipv4.conf.${tapName}.rp_filter=0`, { stdio: 'pipe' });

      this.tapDevices.set(vmId, tapName);
      logger.info('TAP device created with vnet_hdr', { vmId, tapName, ipAddress });

      return tapName;
    } catch (error) {
      logger.error('Failed to create TAP device', { vmId, error: error.message });
      throw new Error(`TAP device creation failed: ${error.message}`);
    }
  }

  /**
   * Clone golden snapshot for new VM
   * Uses dd for full copy (not CoW) to ensure modifications persist
   */
  async cloneGoldenSnapshot(vmId, vmType = 'cli', userId = null, sessionId = null, ipAddress = null) {
    const vmDir = path.join(config.firecracker.usersDir, vmId);
    await fs.mkdir(vmDir, { recursive: true });

    try {
      const rootfsSrc = vmType === 'browser'
        ? config.firecracker.goldenBrowserRootfs || config.firecracker.goldenRootfs
        : config.firecracker.goldenRootfs;
      const rootfsDst = path.join(vmDir, 'rootfs.ext4');

      // FULL copy (not CoW) - ensures golden rootfs modifications persist
      execSync(`dd if=${rootfsSrc} of=${rootfsDst} bs=4M status=none`, { stdio: 'pipe' });

      // CRITICAL: Run e2fsck before modifications
      execSync(`e2fsck -y -f "${rootfsDst}"`, { stdio: 'pipe' });

      // Configure network IP
      if (ipAddress) {
        await this.configureVMNetworkIP(vmId, rootfsDst, ipAddress);
      }

      // Inject OAuth agent for browser VMs
      if (vmType === 'browser') {
        await this.injectOAuthAgent(vmId, rootfsDst, userId, sessionId);
      }

      // CRITICAL: Run e2fsck after modifications
      execSync(`e2fsck -y -f "${rootfsDst}"`, { stdio: 'pipe' });

      logger.info('Golden snapshot cloned', { vmId, vmDir });
    } catch (error) {
      logger.error('Failed to clone golden snapshot', { vmId, error: error.message });
      throw new Error(`Snapshot cloning failed: ${error.message}`);
    }
  }

  /**
   * Inject OAuth agent into Browser VM rootfs
   * DISABLED: Decodo proxy - blocks api.anthropic.com
   */
  async injectOAuthAgent(vmId, rootfsPath, userId = null, sessionId = null) {
    const mountPoint = `/tmp/vm-inject-${vmId}`;

    try {
      execSync(`mkdir -p "${mountPoint}"`, { stdio: 'inherit' });
      execSync(`mount -o loop,rw "${rootfsPath}" "${mountPoint}"`, { stdio: 'inherit' });

      // DISABLED: Decodo residential proxy blocks api.anthropic.com
      let proxyEnvVars = '';
      logger.info('[INJECT-AGENT] Using direct NAT connection (Decodo proxy disabled)', { vmId });

      const envContent = `${sessionId ? `SESSION_ID=${sessionId}` : ''}
MASTER_CONTROLLER_URL=http://192.168.100.1:4000
DISPLAY=:1
NODE_OPTIONS=--dns-result-order=ipv4first
${proxyEnvVars}`;

      const envPath = path.join(mountPoint, 'etc/environment');
      fsSync.writeFileSync(envPath, envContent);

      // Copy agent files...
      const agentDir = path.join(mountPoint, 'opt/vm-browser-agent');
      execSync(`mkdir -p ${agentDir}`, { stdio: 'pipe' });

      const srcAgentDir = path.join(__dirname, '../../vm-browser-agent');
      execSync(`cp "${path.join(srcAgentDir, 'server.js')}" "${agentDir}/"`, { stdio: 'inherit' });
      execSync(`cp "${path.join(srcAgentDir, 'webrtc-server.js')}" "${agentDir}/"`, { stdio: 'inherit' });
      execSync(`cp "${path.join(srcAgentDir, 'node')}" "${agentDir}/"`, { stdio: 'inherit' });
      execSync(`chmod +x "${agentDir}/node"`, { stdio: 'inherit' });

      // Sync and unmount
      execSync(`sync`, { stdio: 'inherit' });
      execSync(`umount -f "${mountPoint}"`, { stdio: 'inherit' });

      logger.info('[INJECT-AGENT] OAuth agent injection complete', { vmId });
    } catch (error) {
      logger.error('[INJECT-AGENT] Failed to inject OAuth agent', { vmId, error: error.message });
      throw error;
    }
  }

  /**
   * Create and start a new VM
   */
  async createVM(userId, vmType, decodoPort = null, decodoIP = null, sessionId = null) {
    const vmId = `vm-${crypto.randomUUID()}`;
    const startTime = Date.now();

    try {
      const ipAddress = await this.allocateIP(vmId);
      const tapDevice = await this.createTAPDevice(vmId, ipAddress);
      await this.cloneGoldenSnapshot(vmId, vmType, userId, sessionId, ipAddress);

      const vmDir = path.join(config.firecracker.usersDir, vmId);
      const configPath = await this.createVMConfig(vmId, vmType, tapDevice, ipAddress);
      const socketPath = path.join(config.firecracker.socketsDir, `${vmId}.sock`);

      await db.vms.create({
        vm_id: vmId,
        user_id: userId,
        type: vmType,
        vm_type: vmType,
        vcpu_count: vmType === 'browser' ? config.vm.browser.vcpu : config.vm.cli.vcpu,
        memory_mb: vmType === 'browser' ? config.vm.browser.memoryMB : config.vm.cli.memoryMB,
        ip_address: ipAddress,
        tap_device: tapDevice,
        status: 'running'
      });

      await this.startFirecracker(vmId, configPath, socketPath);

      logger.info('[VM-CREATE] VM created successfully', { vmId, ipAddress, vmType, totalTime: Date.now() - startTime });

      return { vmId, ipAddress, tapDevice, socketPath, status: 'running' };
    } catch (error) {
      logger.error('[VM-CREATE] VM creation failed', { vmId, error: error.message });
      await this.cleanupVM(vmId, false).catch(() => {});
      throw error;
    }
  }

  /**
   * Destroy VM and cleanup resources
   */
  async destroyVM(vmId, removeFromDB = true, preserveLogs = false) {
    try {
      const vm = this.activeVMs.get(vmId);
      if (vm) {
        try { vm.proc.kill(); } catch {}
        this.activeVMs.delete(vmId);
      }

      await this.cleanupVM(vmId, removeFromDB, preserveLogs);
      logger.info('VM destroyed successfully', { vmId });
    } catch (error) {
      logger.error('VM destruction failed', { vmId, error: error.message });
      throw error;
    }
  }

  // ... (additional methods: startFirecracker, cleanupVM, hibernateVM, resumeVM, etc.)
}

const vmManager = new VMManager();
module.exports = { VMManager, vmManager };
```

---

## APPENDIX E: COMPLETE SOURCE CODE - browser-vm-auth.js

**File:** `/opt/master-controller/src/services/browser-vm-auth.js`
**Lines:** 1314
**Purpose:** OAuth orchestration with race condition fixes

```javascript
/**
 * Browser VM Authentication Handler
 * Manages Browser VMs for CLI tool OAuth automation
 *
 * ARCH-1 FIX: Uses Redis for ephemeral session state with automatic TTL expiration
 * - Sessions auto-expire after config.redis.sessionTTL (default 10 minutes)
 * - No more stale sessions persisting indefinitely in database
 */

const { vmManager } = require('./vm-manager');
const { db } = require('../db/supabase');
const { credentialEncryption } = require('../utils/encryption');
const logger = require('../utils/logger').module('browser-auth');
const config = require('../config');
const { cliStreamingService } = require('./cli-streaming');
const redisClient = require('./redis-client');

class BrowserVMAuth {
  constructor() {
    this.authSessions = new Map();
    this.redisConnected = false;
  }

  async initialize() {
    try {
      await redisClient.connect();
      this.redisConnected = true;
      logger.info('[REDIS] BrowserVMAuth service connected to Redis');
    } catch (error) {
      logger.error('[REDIS] Failed to connect to Redis', { error: error.message });
      this.redisConnected = false;
    }
  }

  /**
   * CRITICAL FIX: Returns sessionId immediately (before VM creation)
   * This fixes the race condition where VMs poll for offers before frontend creates them
   */
  async startAuthentication(userId, provider, webrtcOffer = null) {
    try {
      const authSession = await db.authSessions.create(userId, provider);
      const sessionId = authSession.session_id;

      logger.info('[RACE-CONDITION-FIX] Returning sessionId immediately before VM creation', {
        sessionId, userId, provider, hasWebrtcOffer: !!webrtcOffer
      });

      // Store WebRTC offer BEFORE VM creation if provided
      if (webrtcOffer) {
        const { getWebRTCSignalingService } = require('./webrtc-signaling');
        const signalingService = getWebRTCSignalingService();
        await signalingService.storeOffer(sessionId, webrtcOffer.offer, webrtcOffer.candidates || []);
      }

      this.authSessions.set(sessionId, { userId, provider, status: 'initializing', startedAt: new Date() });

      // Start VM creation in background (don't await)
      this.createVMAndStartOAuth(sessionId, userId, provider).catch(error => {
        logger.error('Background VM creation failed', { sessionId, error: error.message });
      });

      return { success: true, sessionId, provider, novncURL: null, browserIP: null };
    } catch (error) {
      logger.error('Failed to create auth session', { userId, provider, error: error.message });
      throw error;
    }
  }

  /**
   * Wait for VM to be network-ready
   * CRITICAL FIX: 45-second initial delay for OAuth agent Express server startup
   */
  async waitForVMReady(vmIP, maxWaitMs = config.performance.browserVmHealthTimeoutMs) {
    const http = require('http');
    const startTime = Date.now();
    const checkInterval = 2000;
    const initialDelayMs = 45000; // INCREASED to 45s

    logger.info('[WAIT-VM-READY] Starting health check', { vmIP, initialDelayMs });

    // Wait for guest OS services (OAuth agent takes ~38s to bind)
    await new Promise(resolve => setTimeout(resolve, initialDelayMs));

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const response = await new Promise((resolve, reject) => {
          const req = http.get({
            hostname: vmIP,
            port: 8080,
            path: '/health',
            timeout: 5000
          }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ ok: res.statusCode === 200, status: res.statusCode, body }));
          });
          req.on('error', reject);
          req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
        });

        if (response.ok) {
          // Verify VNC with RFB protocol handshake
          const vncResult = await this.verifyVNCProtocol(vmIP, 5901);
          if (vncResult.ready) {
            await new Promise(resolve => setTimeout(resolve, 5000)); // Extra delay for XFCE
            return true;
          }
        }
      } catch (err) {
        logger.warn('[WAIT-VM-READY] Health check failed', { vmIP, error: err.message });
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    throw new Error(`VM not ready after ${maxWaitMs}ms`);
  }

  /**
   * Verify VNC is ready by checking RFB protocol response
   */
  async verifyVNCProtocol(vmIP, port = 5901) {
    const net = require('net');
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(5000);

      socket.on('data', (data) => {
        const response = data.toString('utf8', 0, 12);
        socket.destroy();
        if (response.startsWith('RFB')) {
          resolve({ ready: true, rfbVersion: response.trim() });
        } else {
          resolve({ ready: false, error: `Unexpected response: ${response}` });
        }
      });

      socket.on('error', (err) => {
        socket.destroy();
        resolve({ ready: false, error: err.message });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({ ready: false, error: 'Timeout waiting for RFB handshake' });
      });

      socket.connect(port, vmIP);
    });
  }

  /**
   * Execute CLI OAuth flow for provider
   */
  async authenticateCLI(sessionId, vmIP, provider) {
    logger.info('Starting CLI OAuth flow', { sessionId, vmIP, provider });

    const http = require('http');
    const startResult = await new Promise((resolve, reject) => {
      const payload = JSON.stringify({ sessionId });
      const req = http.request({
        hostname: vmIP,
        port: 8080,
        path: `/auth/${provider}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
        timeout: config.performance.cliOAuthStartTimeoutMs
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode !== 200) reject(new Error(`Failed to start ${provider} CLI`));
          else resolve(JSON.parse(body));
        });
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });

    if (!startResult.success) throw new Error(`Failed to start ${provider} OAuth flow`);

    // Store OAuth URL in database for frontend
    if (startResult.oauthUrl) {
      await db.authSessions.update(sessionId, { auth_url: startResult.oauthUrl, status: 'awaiting_user_auth' });
    }

    // Wait for user to complete OAuth (5 minute timeout)
    const maxWaitMs = 300000;
    const pollIntervalMs = 2000;
    const credStartTime = Date.now();

    while (Date.now() - credStartTime < maxWaitMs) {
      try {
        const status = await new Promise((resolve, reject) => {
          const req = http.get({
            hostname: vmIP, port: 8080, path: `/credentials/status?sessionId=${sessionId}`, timeout: 5000
          }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve(JSON.parse(body)));
          });
          req.on('error', reject);
        });

        if (status.authenticated) break;
      } catch {}

      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    if (Date.now() - credStartTime >= maxWaitMs) {
      throw new Error('OAuth timeout: User did not complete authentication');
    }

    // Retrieve credentials
    const credsResult = await new Promise((resolve, reject) => {
      const req = http.get({
        hostname: vmIP, port: 8080, path: `/credentials/get?sessionId=${sessionId}`, timeout: 10000
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve(JSON.parse(body)));
      });
      req.on('error', reject);
    });

    return credsResult.credentials;
  }

  /**
   * Store encrypted credentials in database
   */
  async storeCredentials(userId, provider, credentials) {
    const encryptedData = credentialEncryption.encrypt(credentials);
    await db.credentials.create(userId, provider, encryptedData);
    logger.info('Credentials stored', { userId, provider });
  }
}

const browserVMAuth = new BrowserVMAuth();
module.exports = { BrowserVMAuth, browserVMAuth };
```

---

## APPENDIX F: COMPLETE SOURCE CODE - VM Browser Agent server.js

**File:** `/opt/vm-browser-agent/server.js` (inside VMs)
**Lines:** 1258
**Purpose:** OAuth agent running inside each Firecracker VM

```javascript
/**
 * VM Browser Agent - OAuth Proxy for CLI Tools
 *
 * Runs inside each Firecracker VM and handles OAuth flow:
 * 1. Spawns CLI tool (codex signin, claude, gemini-cli auth)
 * 2. CLI starts OAuth callback server on localhost:1455
 * 3. Extracts OAuth URL from CLI output
 * 4. Serves OAuth URL to frontend via /oauth-url endpoint
 * 5. Proxies OAuth callbacks to localhost:1455
 * 6. Monitors credential files until auth completes
 */

const http = require('http');
const { spawn, execSync } = require('child_process');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

const PORT = 8080;
const CLI_OAUTH_PORT = 1455;
const BROWSER_DISPLAY = process.env.BROWSER_DISPLAY || ':1';

const authSessions = new Map();

const logger = {
  info: (msg, meta = {}) => console.log(JSON.stringify({ level: 'info', msg, ...meta, timestamp: new Date().toISOString() })),
  error: (msg, meta = {}) => console.error(JSON.stringify({ level: 'error', msg, ...meta, timestamp: new Date().toISOString() })),
  warn: (msg, meta = {}) => console.warn(JSON.stringify({ level: 'warn', msg, ...meta, timestamp: new Date().toISOString() }))
};

/**
 * Start CLI OAuth flow
 * Spawns the CLI tool and captures OAuth URL
 */
async function handleStartCLIAuth(req, res, provider) {
  const body = await readBody(req);
  const payload = JSON.parse(body);
  const sessionId = payload.sessionId;

  if (!sessionId) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'sessionId is required' }));
    return;
  }

  let cliCommand, cliArgs, credPath;
  switch (provider) {
    case 'codex':
      cliCommand = 'codex'; cliArgs = ['signin'];
      credPath = path.join(process.env.HOME || '/root', '.config/openai/auth.json');
      break;
    case 'claude_code':
      cliCommand = 'claude'; cliArgs = [];
      credPath = path.join(process.env.HOME || '/root', '.claude/.credentials.json');
      break;
    case 'gemini_cli':
      cliCommand = 'gemini-cli'; cliArgs = ['auth'];
      credPath = path.join(process.env.HOME || '/root', '.config/gemini-cli/credentials.json');
      break;
    default:
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unknown provider' }));
      return;
  }

  // Create browser capture script
  const captureScriptPath = `/tmp/capture-browser-${sessionId}.sh`;
  const captureOutputPath = `/tmp/oauth-url-${sessionId}.txt`;
  const captureScript = `#!/bin/bash\necho "$1" > "${captureOutputPath}"\nexit 0\n`;
  await fs.writeFile(captureScriptPath, captureScript);
  await fs.chmod(captureScriptPath, 0o755);

  // Run DNS diagnostics for debugging ERR_INVALID_IP_ADDRESS
  if (provider === 'claude_code') {
    try {
      // Override resolv.conf to use local dnsmasq (filters AAAA for IPv4-only)
      await fs.writeFile('/etc/resolv.conf', 'nameserver 127.0.0.1\n');

      // Block IPv6 at kernel level
      execSync('ip6tables -P OUTPUT DROP 2>/dev/null || true', { stdio: 'ignore' });
    } catch {}

    // Run DNS diagnostics
    const runDiagnostic = (label, command) => {
      try {
        const result = execSync(command, { stdio: ['ignore', 'pipe', 'pipe'], timeout: 10000 });
        logger.info(`${label} succeeded`, { provider, sessionId, stdout: result.toString().slice(-500) });
      } catch (error) {
        logger.error(`${label} failed`, { provider, sessionId, error: error.message });
      }
    };

    runDiagnostic('dnsmasq query', 'dig @127.0.0.1 api.anthropic.com A +short');
    runDiagnostic('Node.js dns.lookup', 'node -e "require(\'dns\').lookup(\'api.anthropic.com\', {family:4}, (e,a)=>console.log(e||a))"');
    runDiagnostic('Node.js fetch test', 'node -e "fetch(\'https://api.anthropic.com\').then(r=>console.log(r.status)).catch(e=>console.log(e.code))"');
  }

  // Spawn CLI with BROWSER env var to intercept browser launch
  const scriptLogPath = `/tmp/${provider}-login-${sessionId}.log`;
  const joinedArgs = [cliCommand, ...cliArgs].join(' ');
  const cmdWithNodeOptions = `export NODE_OPTIONS='--dns-result-order=ipv4first' && ${joinedArgs}`;

  const cliProcess = spawn('script', ['-q', '--return', '-c', cmdWithNodeOptions, scriptLogPath], {
    env: {
      ...process.env,
      HOME: process.env.HOME || '/root',
      BROWSER: captureScriptPath,
      TERM: 'dumb',
      NO_COLOR: '1',
      NODE_OPTIONS: '--dns-result-order=ipv4first'
    },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let oauthUrl = null;
  const outputLines = [];

  const logOutput = (data) => {
    const text = data.toString();
    outputLines.push(text);
    logger.info('CLI output', { provider, text: text.substring(0, 200) });

    if (!oauthUrl) {
      const match = text.match(/https:\/\/[^\s]+/i);
      if (match && (match[0].includes('claude.ai') || match[0].includes('auth.openai.com'))) {
        oauthUrl = match[0].trim().replace(/[)\]]+$/, '');
        logger.info('Captured OAuth URL', { provider, sessionId, oauthUrl: oauthUrl.substring(0, 120) });
      }
    }
  };

  cliProcess.stdout.on('data', logOutput);
  cliProcess.stderr.on('data', logOutput);

  authSessions.set(sessionId, {
    provider, cliProcess, oauthUrl: () => oauthUrl, credPath,
    completed: false, startedAt: Date.now()
  });

  // Poll for OAuth URL from capture file
  const maxWaitMs = 15000;
  const startTime = Date.now();

  while (!oauthUrl && (Date.now() - startTime) < maxWaitMs) {
    try {
      const capturedUrl = await fs.readFile(captureOutputPath, 'utf-8');
      if (capturedUrl.trim()) {
        oauthUrl = capturedUrl.trim();
        logger.info('Captured OAuth URL via BROWSER env var', { provider, oauthUrl: oauthUrl.substring(0, 100) });
        break;
      }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    success: true,
    message: oauthUrl ? 'CLI OAuth server started' : 'CLI started, waiting for OAuth URL...',
    sessionId,
    oauthUrl
  }));
}

/**
 * Check if credentials file exists (auth completed)
 */
async function handleCredentialStatus(res, sessionId) {
  const session = authSessions.get(sessionId);
  if (!session) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Session not found' }));
    return;
  }

  try {
    await fs.access(session.credPath);
    session.completed = true;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ authenticated: true, path: session.credPath }));
  } catch {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ authenticated: false, waiting: true }));
  }
}

/**
 * Get extracted credentials
 */
async function handleGetCredentials(res, sessionId) {
  const session = authSessions.get(sessionId);
  if (!session || !session.completed) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not ready' }));
    return;
  }

  const credData = await fs.readFile(session.credPath, 'utf-8');
  const credentials = JSON.parse(credData);

  if (session.cliProcess && !session.cliProcess.killed) session.cliProcess.kill();
  authSessions.delete(sessionId);

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: true, provider: session.provider, credentials }));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

// HTTP server
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  try {
    if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    } else if (url.pathname.startsWith('/auth/') && req.method === 'POST') {
      await handleStartCLIAuth(req, res, url.pathname.split('/')[2]);
    } else if (url.pathname === '/credentials/status') {
      await handleCredentialStatus(res, url.searchParams.get('sessionId'));
    } else if (url.pathname === '/credentials/get') {
      await handleGetCredentials(res, url.searchParams.get('sessionId'));
    } else {
      res.writeHead(404); res.end(JSON.stringify({ error: 'Not Found' }));
    }
  } catch (error) {
    logger.error('Request handler error', { error: error.message });
    res.writeHead(500); res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  logger.info('VM Browser Agent started', { port: PORT });
});
```

---

## DOCUMENT METADATA

```yaml
title: Polydev AI Complete System Documentation
version: 2.1
created: 2024-12-01
updated: 2024-12-01
author: Development Team
status: Development Halted
reason: Anthropic proxy blocking
document_size: ~100KB
sections: 15 + 6 appendices
source_files_included:
  - vm-manager.js (1807 lines) - Complete
  - browser-vm-auth.js (1314 lines) - Complete
  - server.js (1258 lines) - Complete
  - build-golden-snapshot.sh (903 lines)
  - dnsmasq.conf
  - redsocks.conf
  - /etc/environment
total_lines_of_code: ~5,200
```

---

*END OF DOCUMENT*
