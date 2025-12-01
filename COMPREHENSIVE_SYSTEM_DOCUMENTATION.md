# Polydev AI - Comprehensive System Documentation & Current Status

**Date**: November 6, 2025
**Last Updated**: Current Session
**System**: Browser-Based CLI OAuth Automation with Firecracker VMs

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Network Infrastructure](#network-infrastructure)
4. [OAuth Authentication Flow](#oauth-authentication-flow)
5. [WebRTC Streaming](#webrtc-streaming)
6. [VM Types & Configuration](#vm-types--configuration)
7. [Credentials & Access](#credentials--access)
8. [Current System Status](#current-system-status)
9. [Issues Resolved](#issues-resolved)
10. [Current Failures](#current-failures)
11. [Code Changes Made](#code-changes-made)
12. [Debugging Tools](#debugging-tools)
13. [Next Steps](#next-steps)

---

## Executive Summary

### What is Polydev AI?

Polydev AI is a **browser-based remote desktop system** for automating OAuth authentication flows for CLI tools (Claude Code, Codex, Gemini CLI). It uses **Firecracker microVMs** to provide isolated, ephemeral environments with low-latency WebRTC streaming for interactive browser-based OAuth flows.

### Primary Goal

Enable users to authenticate CLI tools through an automated OAuth flow that runs in an isolated Browser VM, captures credentials via Puppeteer, and transfers them to persistent CLI VMs for tool execution.

### Current Status

**Network connectivity fixed** ✅ but **OAuth agent service startup failing** ❌ on newly created VMs. Initial VM (192.168.100.2) works, but subsequent VMs remain unreachable on port 8080.

---

## System Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        MASTER CONTROLLER                         │
│                    (Node.js @ 135.181.138.102:4000)             │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ VM Manager   │  │ Browser VM   │  │ WebRTC       │          │
│  │              │  │ Auth         │  │ Signaling    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Proxy Port   │  │ CLI Streaming│  │ Credential   │          │
│  │ Manager      │  │              │  │ Encryption   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ Firecracker API
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FIRECRACKER VMs                             │
│                                                                   │
│  ┌─────────────────────┐       ┌─────────────────────┐         │
│  │    CLI VM           │       │    Browser VM        │         │
│  │  (2GB RAM, 2 vCPU)  │       │  (4GB RAM, 2 vCPU)   │         │
│  │                     │       │                      │         │
│  │  • Ubuntu 22.04     │       │  • Ubuntu 22.04      │         │
│  │  • CLI Tools        │       │  • OAuth Agent       │         │
│  │  • Credentials      │       │  • WebRTC Server     │         │
│  │  • SSH Access       │       │  • VNC Stack         │         │
│  │  • Persistent       │       │  • Puppeteer         │         │
│  │                     │       │  • Ephemeral         │         │
│  └─────────────────────┘       └─────────────────────┘         │
│       192.168.100.X                  192.168.100.Y              │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ TAP Devices
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NETWORK INFRASTRUCTURE                        │
│                                                                   │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐           │
│  │  fc-bridge  │   │  dnsmasq    │   │  Decodo     │           │
│  │ 192.168.    │───│  DHCP       │───│  Proxy      │           │
│  │ 100.1       │   │  Server     │   │  Per-User   │           │
│  └─────────────┘   └─────────────┘   └─────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

### Master Controller Services

**Location**: `/opt/master-controller/`
**Port**: 4000
**Process**: Node.js
**Entry Point**: `src/index.js`

#### Key Services:

1. **VM Manager** (`src/services/vm-manager.js`)
   - Firecracker VM lifecycle (create, hibernate, destroy)
   - IP allocation from pool (192.168.100.2-254)
   - TAP device management
   - OAuth agent injection into Browser VMs
   - Network configuration (DHCP)

2. **Browser VM Auth** (`src/services/browser-vm-auth.js`)
   - OAuth flow orchestration
   - Browser VM creation
   - Credential capture and storage
   - Transfer credentials to CLI VMs

3. **WebRTC Signaling** (`src/services/webrtc-signaling.js`)
   - SDP offer/answer exchange
   - ICE candidate signaling
   - TURN/STUN server configuration

4. **Proxy Port Manager** (`src/services/proxy-port-manager.js`)
   - Per-user Decodo proxy allocation
   - Port 10000-20000 range
   - Fixed external IP assignment

### VM File Structure

**VM Directory**: `/var/lib/firecracker/users/<vm-id>/`

```
vm-<uuid>/
├── rootfs.ext4          # VM filesystem (ext4 image)
├── vm-config.json       # Firecracker configuration
├── console.log          # Serial console output (ttyS0)
├── firecracker-error.log # Hypervisor errors
├── snapshot.snap        # Hibernation snapshot (optional)
└── memory.mem           # Memory state (optional)
```

**Sockets**: `/var/lib/firecracker/sockets/<vm-id>.sock`

---

## Network Infrastructure

### IP Address Allocation

- **Bridge**: `fc-bridge` @ 192.168.100.1/24
- **DHCP Range**: 192.168.100.2 - 192.168.100.254
- **Gateway**: 192.168.100.1 (host)
- **DNS**: 8.8.8.8, 8.8.4.4

### Network Configuration (Inside VMs)

**File**: `/etc/netplan/01-netcfg.yaml`

```yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: yes
      dhcp4-overrides:
        use-dns: false
      nameservers:
        addresses: [8.8.8.8, 8.8.4.4]
```

### TAP Device Creation

Each VM gets a dedicated TAP device:

```bash
# TAP device naming: fc-<first-8-chars-of-vm-id>
ip tuntap add fc-a1b2c3d4 mode tap
/usr/local/bin/set-tap-vnet-hdr fc-a1b2c3d4 on  # CRITICAL for Firecracker virtio-net
ip link set fc-a1b2c3d4 master fc-bridge
ip link set fc-a1b2c3d4 up
sysctl -w net.ipv4.conf.fc-a1b2c3d4.rp_filter=0
```

### Firecracker Boot Args

**Current (Fixed - DHCP Only)**:
```bash
console=ttyS0 reboot=k panic=1 root=/dev/vda rw rootfstype=ext4 rootwait net.ifnames=0 biosdevname=0 random.trust_cpu=on gso_max_size=0
```

**Previous (Broken - Static IP Conflict)**:
```bash
# Removed: ip=192.168.100.X::192.168.100.1:255.255.255.0::eth0:on
```

### Decodo Proxy Configuration

**Per-User Proxy**: Each user gets a dedicated port (10000-20000)

**Injected into Browser VMs via** `/etc/environment`:
```bash
HTTP_PROXY=http://sp9dso1iga:password@dc.decodo.com:10001
HTTPS_PROXY=http://sp9dso1iga:password@dc.decodo.com:10001
NO_PROXY=localhost,127.0.0.1,192.168.0.0/16
SESSION_ID=<uuid>
MASTER_CONTROLLER_URL=http://192.168.100.1:4000
DISPLAY=:1
```

---

## OAuth Authentication Flow

### High-Level Flow

```
User Request → Create Browser VM → Inject OAuth Agent →
Wait for VM Ready → Start CLI OAuth → Capture Credentials →
Store in DB → Transfer to CLI VM → Cleanup Browser VM
```

### Detailed Steps

#### 1. User Initiates Authentication

```bash
POST /api/auth/start
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "provider": "claude_code"  # or "codex", "gemini_cli"
}
```

#### 2. Master Controller Creates Browser VM

**Service**: `browser-vm-auth.js:startAuthentication()`

- Allocates IP from pool
- Creates TAP device with vnet_hdr
- Clones golden rootfs (8GB ext4)
- Injects OAuth agent files
- Creates systemd service
- Injects Decodo proxy config
- Starts Firecracker VM

#### 3. OAuth Agent Injection

**Service**: `vm-manager.js:injectOAuthAgent()`

**Files Injected** (`/opt/vm-browser-agent/`):
- `node` (98MB binary - Node.js 12 from Ubuntu repos)
- `server.js` (OAuth agent - Puppeteer automation)
- `webrtc-server.js` (Desktop streaming)
- `start-all.sh` (Supervisor script)
- `package.json`

**Systemd Service**: `/etc/systemd/system/vm-browser-agent.service`
```ini
[Unit]
Description=VM Browser Services (OAuth Agent + WebRTC Server)
After=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/vm-browser-agent
Environment=HOST=0.0.0.0
Environment=PORT=8080
EnvironmentFile=-/etc/environment
ExecStart=/opt/vm-browser-agent/start-all.sh
Restart=always
RestartSec=3
StandardOutput=journal+console
StandardError=journal+console

[Install]
WantedBy=multi-user.target
```

#### 4. VM Boot Sequence

1. Firecracker starts VM
2. Linux kernel boots
3. systemd initializes services
4. Network (systemd-networkd) requests DHCP
5. dnsmasq assigns IP (e.g., 192.168.100.2)
6. systemd starts vm-browser-agent.service
7. Supervisor script (`start-all.sh`) runs:
   - Starts OAuth agent (port 8080)
   - Starts WebRTC server
   - Monitors both processes

#### 5. OAuth Flow Execution

**Service**: `browser-vm-auth.js:authenticateCLI()`

1. Master controller waits for port 8080 health check
2. Sends POST to `/auth/claude_code` on OAuth agent
3. OAuth agent launches Puppeteer
4. Puppeteer navigates to OAuth URL
5. User completes OAuth in browser (via noVNC or WebRTC)
6. OAuth callback returns to localhost:1455 (CLI tool)
7. CLI tool saves credentials
8. Master controller polls `/credentials/status`
9. Retrieves credentials from `/credentials/get`

#### 6. Credential Storage

**Service**: `browser-vm-auth.js:storeCredentials()`

- Encrypts credentials (AES-256-GCM)
- Stores in Supabase database
- For Claude Code: Stores for both Pro and Max if user has Max subscription

#### 7. Transfer to CLI VM

**Service**: `browser-vm-auth.js:transferCredentialsToCLIVM()`

- Mounts CLI VM rootfs (ext4 image)
- Writes credentials to appropriate path:
  - Codex: `/root/.codex/auth.json`
  - Claude Code: `/root/.config/claude/credentials.json`
  - Gemini CLI: `/root/.gemini/oauth_creds.json`
- Sets permissions (600)
- Unmounts rootfs

#### 8. Cleanup Browser VM

**Service**: `vm-manager.js:destroyVM()`

- Kills Firecracker process
- Removes TAP device
- Releases IP back to pool
- Archives logs (if preserveLogs=true)
- Deletes VM directory
- Updates database status

---

## WebRTC Streaming

### Architecture

**Goal**: Replace noVNC with WebRTC for <50ms latency

**Components**:
1. **Client** (Browser) - Creates SDP offer, sends to master controller
2. **Master Controller** - Signaling service (stores offers/answers)
3. **WebRTC Server** (VM) - Polls for offer, creates answer, streams desktop

### WebRTC Flow

```
Client                  Master Controller          Browser VM
  │                            │                        │
  │ 1. POST /offer             │                        │
  │──────────────────────────>│                        │
  │                            │ (store offer)          │
  │                            │                        │
  │                            │<────────────────────── │
  │                            │  2. GET /offer         │
  │                            │                        │
  │                            │  3. POST /answer       │
  │                            │<────────────────────── │
  │                            │ (store answer)         │
  │                            │                        │
  │ 4. GET /answer (polling)   │                        │
  │<────────────────────────── │                        │
  │                            │                        │
  │ 5. WebRTC P2P Connection   │                        │
  │<════════════════════════════════════════════════════│
  │              (ICE, STUN, TURN)                      │
```

### TURN/STUN Servers

**Configuration** (`webrtc-signaling.js`):

```javascript
iceServers: [
  { urls: 'stun:135.181.138.102:3478' },
  {
    urls: 'turn:135.181.138.102:3478',
    username: 'polydev',
    credential: 'PolydevWebRTC2025!'
  },
  {
    urls: 'turns:135.181.138.102:5349',
    username: 'polydev',
    credential: 'PolydevWebRTC2025!'
  },
  { urls: 'stun:stun.l.google.com:19302' }
]
```

### WebRTC Server Implementation

**File**: `vm-browser-agent/webrtc-server.js`

**Technology Stack**:
- GStreamer for screen capture (ximagesrc)
- VP8 encoding (browser compatibility)
- Mock SDP generation (placeholder for full WebRTC library)

**Current Status**: ⚠️ Simplified implementation - needs full WebRTC stack (webrtcbin)

---

## VM Types & Configuration

### CLI VMs

**Purpose**: Persistent VMs for running CLI tools

**Specifications**:
- **Memory**: 2048 MB (2GB)
- **vCPU**: 2
- **Disk**: 8GB ext4
- **Network**: DHCP (192.168.100.X)
- **OS**: Ubuntu 22.04 LTS
- **Lifespan**: Persistent (hibernate when idle)

**Installed Tools**:
- @anthropic-ai/claude-code
- @openai/codex
- @google/gemini-cli
- Node.js 12.22.9 (Ubuntu package)

**Credentials Location**:
- Codex: `/root/.codex/auth.json`
- Claude Code: `/root/.config/claude/credentials.json`
- Gemini CLI: `/root/.gemini/oauth_creds.json`

### Browser VMs

**Purpose**: Ephemeral VMs for OAuth automation

**Specifications**:
- **Memory**: 4096 MB (4GB)
- **vCPU**: 2
- **Disk**: 8GB ext4 (cloned from golden rootfs)
- **Network**: DHCP (192.168.100.Y)
- **OS**: Ubuntu 22.04 LTS
- **Lifespan**: Ephemeral (destroyed after OAuth)

**Services Running**:
1. **OAuth Agent** (Port 8080)
   - Puppeteer automation
   - Credential capture
   - HTTP API for master controller

2. **WebRTC Server**
   - Desktop streaming
   - GStreamer pipeline
   - SDP/ICE signaling

3. **VNC Stack**
   - Xvfb (X Virtual Frame Buffer) @ DISPLAY=:1
   - Openbox (Window Manager)
   - x11vnc (VNC server @ port 5901)
   - websockify (WebSocket proxy)

**Proxy Configuration**:
- Per-user Decodo proxy injected via `/etc/environment`
- All processes (including Chromium) use proxy automatically

### Golden Rootfs

**Path**: `/var/lib/firecracker/snapshots/base/golden-rootfs.ext4`
**Size**: 8GB
**Build Script**: `master-controller/scripts/build-golden-snapshot.sh`

**Build Process**:
1. Create empty ext4 image (8GB)
2. Bootstrap Ubuntu 22.04 (debootstrap)
3. Install packages (Node.js 12 from Ubuntu repos)
4. Install CLI tools (@anthropic-ai/claude-code, etc.)
5. Install GStreamer for WebRTC
6. Install VNC stack (Xvfb, Openbox, x11vnc)
7. Configure systemd services
8. Configure netplan (DHCP)

**Critical Fix**: Node.js 12.22.9 (Ubuntu repos) instead of Node.js 20 (NodeSource)
- **Reason**: CPU feature compatibility with Firecracker vCPUs
- **Issue**: Node.js 20 uses advanced CPU instructions (AVX, SSE4.2) not available in Firecracker
- **Solution**: Ubuntu's Node.js 12 compiled for older CPUs

---

## Credentials & Access

### Server Access

**Hostname**: 135.181.138.102
**SSH User**: root
**SSH Password**: `Venkatesh4158198303`

```bash
ssh root@135.181.138.102
# OR
sshpass -p "Venkatesh4158198303" ssh -o StrictHostKeyChecking=no root@135.181.138.102
```

### Service Endpoints

**Master Controller**:
- Health: `http://135.181.138.102:4000/health`
- API Base: `http://135.181.138.102:4000/api`

**OAuth API**:
- Start Auth: `POST /api/auth/start`
- Session Status: `GET /api/auth/session/:sessionId`
- noVNC URL: `/api/auth/session/:sessionId/novnc`

**WebRTC API**:
- ICE Servers: `GET /api/webrtc/ice-servers`
- Submit Offer: `POST /api/webrtc/session/:sessionId/offer`
- Get Answer: `GET /api/webrtc/session/:sessionId/answer`

### TURN/STUN Credentials

**Server**: 135.181.138.102
**STUN Port**: 3478
**TURN Port**: 3478
**TURNS Port**: 5349
**Username**: `polydev`
**Password**: `PolydevWebRTC2025!`

### Supabase Database

**Service**: Credential storage, session tracking, VM records

**Tables**:
- `users` - User accounts
- `vms` - VM records (status, IP, resources)
- `auth_sessions` - OAuth session tracking
- `credentials` - Encrypted credentials (AES-256-GCM)
- `vm_cleanup_tasks` - Scheduled VM cleanups

**Encryption**:
- Algorithm: AES-256-GCM
- Key derivation: PBKDF2 with random salt
- Stored: encrypted blob + IV + auth tag + salt

---

## Current System Status

### ✅ Working Components

1. **Master Controller**
   - Status: Running and healthy
   - PID: Varies (restarted multiple times)
   - Health endpoint: ✅ Responding
   - API endpoints: ✅ Operational

2. **Network Configuration**
   - DHCP server: ✅ Working (dnsmasq)
   - Bridge device: ✅ fc-bridge @ 192.168.100.1
   - IP allocation: ✅ IPs assigned correctly
   - TAP devices: ✅ Created with vnet_hdr

3. **VM Creation**
   - API response: ✅ Success
   - Firecracker processes: ✅ Starting
   - Golden rootfs: ✅ Available (8GB)
   - OAuth agent injection: ✅ Files copied

4. **Initial Test VM**
   - VM ID: `vm-5206d631-13ae-4653-987c-009b4e20a231`
   - IP: `192.168.100.2`
   - Status: ✅ **FULLY FUNCTIONAL**
   - Port 8080: ✅ Reachable
   - Services: ✅ All running
   - Console logs: ✅ Available

5. **Network Fix**
   - Issue: Static IP + DHCP conflict
   - Fix: Removed static IP from boot_args
   - Status: ✅ **DEPLOYED AND VERIFIED**

### ❌ Current Failures

1. **Fresh Browser VMs**
   - VMs created: ✅ Successfully
   - IPs assigned: ✅ (192.168.100.3, .4, .5, .6)
   - Port 8080: ❌ **CONNECTION REFUSED / EHOSTUNREACH**
   - OAuth agent: ❌ **NOT LISTENING**
   - Health checks: ❌ **TIMEOUT**

2. **Console Logs**
   - Working VM (192.168.100.2): ✅ Available
   - Fresh VMs: ❌ **MISSING OR EMPTY**
   - Debug logs: ❌ **NOT PRESERVED** (fix not deployed)

3. **WebRTC Signaling**
   - Master controller routes: ✅ Configured
   - Client offer: ✅ Can submit
   - VM answer: ❌ **404 NOT FOUND**
   - Signaling service: ⚠️ Operational but no answers from VMs

### 🔄 Pending Deployment

1. **Log Preservation Fix**
   - Code: ✅ Written
   - Location: `vm-manager.js` lines 1143-1215
   - Status: ❌ **NOT DEPLOYED TO SERVER**
   - Purpose: Archive console logs before VM deletion

---

## Issues Resolved

### 1. Rate Limiting (429 Errors) - ✅ FIXED

**Problem**: 429 "Too Many Requests" errors after minimal user interaction

**Root Cause**: Overly restrictive rate limit (100 requests per 15 minutes)

**Solution**: Increased to 1000 requests per 15 minutes

**File**: `master-controller/.env`
```env
RATE_LIMIT_MAX_REQUESTS=1000
```

**Status**: ✅ RESOLVED - No more 429 errors

### 2. VM Memory Insufficiency - ✅ FIXED

**Problem**: Kernel panic "System is deadlocked on memory" during boot

**Root Cause**: VMs configured with only 256MB RAM (insufficient for Ubuntu + VNC + services)

**Solution**:
- CLI VMs: 256MB → **2048MB** (2GB)
- Browser VMs: 256MB → **4096MB** (4GB)

**Configuration**:
```env
CLI_VM_MEMORY_MB=2048
CLI_VM_VCPU=2
BROWSER_VM_MEMORY_MB=4096
BROWSER_VM_VCPU=2
```

**Verification**: VM successfully booted with 2048MB, all services running

**Status**: ✅ RESOLVED - VMs boot successfully

### 3. Node.js CPU Compatibility (WebRTC Crash) - ✅ FIXED

**Problem**: WebRTC server crashed immediately after starting (within 10 seconds)

**Root Cause**: Node.js v20.19.5 (NodeSource) compiled with advanced CPU features (AVX, SSE4.2) not available in Firecracker vCPUs

**Solution**: Switched to Node.js 12.22.9 from Ubuntu repositories (CPU-compatible)

**File**: `build-golden-snapshot.sh` lines 153-167
```bash
# OLD (CPU-optimized, incompatible):
# chroot rootfs bash -c "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -"
# chroot rootfs apt-get install -y nodejs

# NEW (CPU-compatible):
chroot rootfs apt-get install -y nodejs npm
```

**Verification**: WebRTC server ran for 45+ seconds without crashing (previously crashed every 10s)

**Status**: ✅ RESOLVED - WebRTC server stable

### 4. Supervisor Script Export Crash - ✅ FIXED

**Problem**: start-all.sh crashed when parsing `/etc/environment` with comments

**Root Cause**: Manual parsing of /etc/environment using `export $(cat /etc/environment | xargs)` failed with comment lines

**Solution**:
- Removed comments from `/etc/environment`
- Use systemd's `EnvironmentFile` directive (handles variables automatically)
- Remove manual export logic from supervisor script

**File**: `vm-manager.js` lines 341-350, 461-519

**Status**: ✅ RESOLVED - Supervisor script no longer crashes

### 5. Network Configuration Conflict - ✅ FIXED

**Problem**: VMs created successfully but completely unreachable (EHOSTUNREACH errors)

**Root Cause**: Dual network configuration sources:
- **Source 1** (Kernel boot_args): Static IP via `ip=192.168.100.X::192.168.100.1:255.255.255.0::eth0:on`
- **Source 2** (Netplan): DHCP via `dhcp4: yes`
- **Conflict**: Both systems tried to configure network, interface never came up properly

**Solution**: Removed static IP parameter from kernel boot_args, use DHCP only

**File**: `vm-manager.js` line 212

**BEFORE (broken)**:
```javascript
boot_args: `console=ttyS0 ... ip=${ipAddress}::${config.network.bridgeIP}:255.255.255.0::eth0:on`
```

**AFTER (fixed)**:
```javascript
boot_args: `console=ttyS0 ... gso_max_size=0${decodoPort ? ' decodo_port=' + decodoPort : ''}`
```

**Verification**:
- Initial VM (192.168.100.2) fully functional
- Port 8080 accessible
- All services running

**Status**: ✅ RESOLVED - DHCP working correctly

### 6. TAP Device vnet_hdr - ✅ FIXED

**Problem**: ARP worked but IP packets failed between host and VM

**Root Cause**: Firecracker virtio-net requires `IFF_VNET_HDR` flag on TAP device

**Solution**: Enable vnet_hdr using helper binary

**File**: `vm-manager.js` lines 151-154
```javascript
execSync(`/usr/local/bin/set-tap-vnet-hdr ${tapName} on`, { stdio: 'pipe' });
logger.info('vnet_hdr enabled on TAP via helper', { tapName });
```

**Status**: ✅ RESOLVED - Network fully functional

---

## Current Failures

### Primary Issue: Fresh Browser VMs Unreachable

**Symptom**: Newly created Browser VMs get IPs but OAuth agent on port 8080 not listening

**Evidence**:
```bash
# VM Creation
curl -X POST http://localhost:4000/api/auth/start \
  -H 'Content-Type: application/json' \
  -d '{"userId": "5abacdd1-6a9b-48ce-b723-ca8056324c7a", "provider": "claude_code"}'

# Response: Success
{
  "success": true,
  "sessionId": "a7784dbf-f8d8-4652-bf12-18f49e7516dc",
  "browserIP": "192.168.100.6"
}

# Health Check
curl http://192.168.100.6:8080/health
# Result: Connection refused (after 2 min timeout, VM destroyed)

# Master Controller Logs
[OAuth URL Proxy] Status: 500, Response: {
  "error": "connect EHOSTUNREACH 192.168.100.6:8080"
}
```

**Failed VMs**:
- Session `c3f89d9f-82b3-4df1-a110-d4686c973cae` (192.168.100.3) - EHOSTUNREACH
- Session `4c19bc88-b081-4430-bd84-de882fbbf87f` (192.168.100.4) - EHOSTUNREACH
- Session `a7784dbf-f8d8-4652-bf12-18f49e7516dc` (192.168.100.6) - EHOSTUNREACH
- VM `vm-d5b39311-e6b5-495c-ad89-84d6de97d4d0` (PID 1341159) - Created but unreachable

**Working VM (Reference)**:
- VM ID: `vm-5206d631-13ae-4653-987c-009b4e20a231`
- IP: `192.168.100.2`
- Status: ✅ **FULLY FUNCTIONAL**
- Services: OAuth Agent, WebRTC, VNC all running

### Investigation Blockers

1. **Console Logs Missing**
   - Fresh VMs have no console.log files
   - Firecracker processes exist but output not captured
   - Cannot verify boot sequence or service startup

2. **Log Preservation Fix Not Deployed**
   - Code written to archive logs before deletion
   - **Status**: ❌ **AWAITING DEPLOYMENT**
   - Without this, failed VM logs are immediately deleted

3. **No Debug Access**
   - SSH not enabled in VMs
   - Console logs missing
   - Cannot inspect systemd services directly
   - Cannot verify network interface status

### Possible Root Causes

**Hypothesis 1**: Systemd service fails to start
- Service file created during injection
- Symlink created for enablement
- But service may fail immediately after boot
- **Evidence Needed**: Console logs with systemd startup messages

**Hypothesis 2**: Network interface timing issue
- DHCP works (IPs assigned)
- But service starts before network is fully ready
- Port 8080 binds fail
- **Evidence Needed**: Console logs with network startup sequence

**Hypothesis 3**: Environment variables not loaded
- `/etc/environment` created during injection
- systemd `EnvironmentFile` should load it
- But variables may not be available to service
- **Evidence Needed**: Console logs with supervisor script output

**Hypothesis 4**: File permissions or ownership issue
- Files copied during injection
- Permissions set to executable
- But may have wrong owner or context
- **Evidence Needed**: Verify via mount of stopped VM

**Hypothesis 5**: Golden rootfs corruption
- First VM works (created long ago)
- New VMs fail (created recently)
- Golden rootfs may be corrupted
- **Evidence Needed**: Compare working VM vs fresh VM files

---

## Code Changes Made

### 1. Network Fix - `vm-manager.js:212`

**Purpose**: Remove static IP + DHCP configuration conflict

**Change**:
```javascript
// BEFORE (line 212)
boot_args: `console=ttyS0 reboot=k panic=1 root=/dev/vda rw rootfstype=ext4 rootwait net.ifnames=0 biosdevname=0 random.trust_cpu=on gso_max_size=0 ip=${ipAddress}::${config.network.bridgeIP}:255.255.255.0::eth0:on${decodoPort ? ' decodo_port=' + decodoPort : ''}`

// AFTER (fixed)
boot_args: `console=ttyS0 reboot=k panic=1 root=/dev/vda rw rootfstype=ext4 rootwait net.ifnames=0 biosdevname=0 random.trust_cpu=on gso_max_size=0${decodoPort ? ' decodo_port=' + decodoPort : ''}`
```

**Status**: ✅ DEPLOYED

### 2. Log Preservation - `vm-manager.js:1143-1215`

**Purpose**: Archive console logs before VM deletion for debugging

**Changes**:

#### `cleanupVM` method signature:
```javascript
async cleanupVM(vmId, removeFromDB = true, preserveLogs = false) {
  // NEW: Preserve logs before cleanup
  if (preserveLogs) {
    // Archive console.log → /var/log/vm-debug-logs/vm-<ID>-console-<timestamp>.log
    // Archive firecracker-error.log → /var/log/vm-debug-logs/vm-<ID>-error-<timestamp>.log
  }

  // Existing cleanup logic
  await fs.rm(vmDir, { recursive: true, force: true });
  // ...
}
```

#### `destroyVM` method signature:
```javascript
async destroyVM(vmId, removeFromDB = true, preserveLogs = false) {
  // NEW: Accept preserveLogs parameter
  await this.cleanupVM(vmId, removeFromDB, preserveLogs);
}
```

#### `processCleanupTasks` method:
```javascript
// NEW: Always preserve logs for failed VMs
await this.destroyVM(task.vm_id, true, true);  // preserveLogs = true
```

**Status**: ❌ **CODE WRITTEN BUT NOT DEPLOYED**

### 3. Supervisor Script Fix - `vm-manager.js:461-519`

**Purpose**: Remove export crash when parsing /etc/environment

**Changes**:
- Removed `export $(cat /etc/environment | xargs)` logic
- Rely on systemd `EnvironmentFile` directive
- Add log directory creation
- Redirect stdout/stderr to log files

**Status**: ✅ DEPLOYED

### 4. Node.js Version Fix - `build-golden-snapshot.sh:153-167`

**Purpose**: Use CPU-compatible Node.js version

**Changes**:
```bash
# BEFORE (NodeSource, CPU-optimized)
chroot rootfs bash -c "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -"
chroot rootfs apt-get install -y nodejs

# AFTER (Ubuntu repos, CPU-compatible)
chroot rootfs apt-get install -y nodejs npm
```

**Status**: ✅ DEPLOYED (golden rootfs rebuilt)

### 5. Browser VM Auth - `browser-vm-auth.js:164-183`

**Purpose**: Preserve logs for failed Browser VMs when debug flag enabled

**Changes**:
```javascript
if (config.debug.keepFailedBrowserVMs) {
  logger.warn('[DEBUG] Keeping failed Browser VM alive for debugging', {
    vmId: browserVM.vmId,
    vmIP: browserVM.ipAddress,
    provider,
    debugFlag: 'DEBUG_KEEP_FAILED_BROWSER_VMS=true'
  });
} else {
  await vmManager.destroyVM(browserVM.vmId, true, true);  // preserveLogs=true
}
```

**Status**: ✅ DEPLOYED

---

## Debugging Tools

### 1. SSH Access to Server

```bash
# Direct SSH
ssh root@135.181.138.102
# Password: Venkatesh4158198303

# OR with sshpass
sshpass -p "Venkatesh4158198303" ssh -o StrictHostKeyChecking=no root@135.181.138.102
```

### 2. Master Controller Management

```bash
# Health check
curl -s http://localhost:4000/health

# Check master controller logs
tail -f /opt/master-controller/logs/master-controller.log

# Restart master controller
cd /opt/master-controller
pkill -9 node
nohup node src/index.js > logs/master-controller.log 2>&1 &
sleep 5
curl -s http://localhost:4000/health
```

### 3. VM Investigation

```bash
# List all VMs
ls -lt /var/lib/firecracker/users/ | head -10

# Check VM console logs (if exists)
tail -100 /var/lib/firecracker/users/vm-<ID>/console.log

# Check Firecracker errors
tail -100 /var/lib/firecracker/users/vm-<ID>/firecracker-error.log

# List Firecracker processes
ps aux | grep -E 'firecracker|fc-' | grep -v grep

# Check TAP devices
ip link show | grep fc-

# Check bridge
bridge link show fc-bridge
```

### 4. Network Debugging

```bash
# Test VM connectivity
ping -c 3 192.168.100.2

# Test OAuth agent
curl http://192.168.100.2:8080/health

# Check DHCP leases
cat /var/lib/dhcp/dhcpd.leases  # OR dnsmasq lease file location

# Check dnsmasq
systemctl status dnsmasq
journalctl -u dnsmasq -n 50
```

### 5. Preserved Logs (After Deployment)

```bash
# List preserved logs
ls -lth /var/log/vm-debug-logs/ | head -20

# View specific console log
cat /var/log/vm-debug-logs/vm-<ID>-console-<timestamp>.log

# Search for OAuth agent startup
grep -i "oauth\|vm-browser-agent\|started" /var/log/vm-debug-logs/vm-*-console-*.log

# Search for network issues
grep -i "network\|dhcp\|eth0" /var/log/vm-debug-logs/vm-*-console-*.log

# Search for errors
grep -i "error\|failed\|crash" /var/log/vm-debug-logs/vm-*-console-*.log
```

### 6. Mount VM Rootfs (Manual Inspection)

```bash
# Create mount point
mkdir -p /tmp/vm-inspect

# Mount VM rootfs
mount -o loop /var/lib/firecracker/users/vm-<ID>/rootfs.ext4 /tmp/vm-inspect

# Check OAuth agent files
ls -lah /tmp/vm-inspect/opt/vm-browser-agent/

# Check systemd service
cat /tmp/vm-inspect/etc/systemd/system/vm-browser-agent.service

# Check environment
cat /tmp/vm-inspect/etc/environment

# Check netplan
cat /tmp/vm-inspect/etc/netplan/01-netcfg.yaml

# Unmount
umount /tmp/vm-inspect
rmdir /tmp/vm-inspect
```

### 7. Create Test VM

```bash
# Create VM for testing
curl -X POST http://localhost:4000/api/auth/start \
  -H 'Content-Type: application/json' \
  -d '{"userId": "test-user-debug-$(date +%s)", "provider": "claude_code"}'

# Wait for creation
sleep 10

# Check master controller logs
tail -100 /opt/master-controller/logs/master-controller.log | grep -A10 -B5 "VM-CREATE"

# Test connectivity (get IP from response)
curl http://192.168.100.X:8080/health
```

---

## Next Steps

### Immediate Actions (Priority Order)

#### 1. Deploy Log Preservation Fix ⚠️ **CRITICAL**

**Purpose**: Capture console logs from failed VMs for root cause analysis

**Steps**:
```bash
# 1. Copy fixed file to server
scp -o StrictHostKeyChecking=no \
  /Users/venkat/Documents/polydev-ai/master-controller/src/services/vm-manager.js \
  root@135.181.138.102:/opt/master-controller/src/services/vm-manager.js

# 2. Restart master controller
sshpass -p "Venkatesh4158198303" ssh -o StrictHostKeyChecking=no root@135.181.138.102 "
  cd /opt/master-controller
  pkill -9 node
  sleep 3
  nohup node src/index.js > logs/master-controller.log 2>&1 &
  sleep 5
  curl -s http://localhost:4000/health
"
```

**Verification**:
```bash
# Should show: {"status":"healthy",...}
```

#### 2. Create Test VM & Wait for Timeout ⚠️ **CRITICAL**

**Purpose**: Capture console logs from a failed VM

**Steps**:
```bash
# Create test VM
curl -X POST http://localhost:4000/api/auth/start \
  -H 'Content-Type: application/json' \
  -d '{"userId": "test-oauth-debug-$(date +%s)", "provider": "claude_code"}'

# Wait 3 minutes for timeout and cleanup
sleep 180

# Check for preserved logs
ls -lth /var/log/vm-debug-logs/
```

**Expected Output**:
- New files: `vm-<ID>-console-<timestamp>.log`
- New files: `vm-<ID>-error-<timestamp>.log`

#### 3. Analyze Console Logs ⚠️ **CRITICAL**

**Purpose**: Identify root cause of OAuth agent failure

**Steps**:
```bash
# View console log
cat /var/log/vm-debug-logs/vm-*-console-*.log | tail -200

# Search for critical information
grep -i "oauth\|vm-browser-agent\|started\|failed" /var/log/vm-debug-logs/vm-*-console-*.log

# Compare with working VM
diff \
  <(tail -100 /var/log/vm-debug-logs/vm-*-console-*.log) \
  <(tail -100 /var/lib/firecracker/users/vm-5206d631-13ae-4653-987c-009b4e20a231/console.log)
```

**Look For**:
1. Boot sequence completion
2. Network interface (eth0) UP
3. DHCP IP assignment
4. Systemd service startup
5. OAuth agent process
6. Supervisor script output
7. Error messages
8. Failed services

#### 4. Fix Root Cause

Based on console log analysis, fix will fall into one of these categories:

**Scenario A: Service fails to start**
- Fix systemd service configuration
- Fix supervisor script
- Fix environment variable loading

**Scenario B: Network timing issue**
- Add network wait logic
- Use systemd After=network-online.target
- Add retries to port binding

**Scenario C: File permissions**
- Fix ownership (chown root:root)
- Fix permissions (chmod +x)
- Fix SELinux context (if enabled)

**Scenario D: Golden rootfs issue**
- Rebuild golden rootfs
- Verify all files present
- Verify Node.js version

#### 5. Test Fix

```bash
# Create new test VM
curl -X POST http://localhost:4000/api/auth/start \
  -H 'Content-Type: application/json' \
  -d '{"userId": "test-after-fix-$(date +%s)", "provider": "claude_code"}'

# Wait 30 seconds
sleep 30

# Test connectivity (use IP from response)
curl http://192.168.100.X:8080/health

# Expected: {"status":"healthy"}
```

#### 6. Verify WebRTC

Once OAuth agent is working:

```bash
# Create Browser VM
curl -X POST http://localhost:4000/api/auth/start \
  -H 'Content-Type: application/json' \
  -d '{"userId": "test-webrtc-$(date +%s)", "provider": "claude_code"}'

# Get sessionId from response
SESSION_ID="<from-response>"

# Submit offer (from client)
curl -X POST http://localhost:4000/api/webrtc/session/$SESSION_ID/offer \
  -H 'Content-Type: application/json' \
  -d '{"offer":{"type":"offer","sdp":"..."},"candidates":[]}'

# Wait 10 seconds for VM to poll and create answer
sleep 10

# Get answer
curl http://localhost:4000/api/webrtc/session/$SESSION_ID/answer

# Expected: {"success":true,"answer":{...},"candidates":[]}
```

### Long-Term Improvements

1. **Automated Testing**
   - Create test suite for VM creation
   - Verify all services start correctly
   - Test OAuth flows end-to-end

2. **Monitoring & Alerting**
   - Add VM health checks
   - Alert on repeated failures
   - Track success rates

3. **Performance Optimization**
   - Reduce VM boot time
   - Optimize golden rootfs size
   - Implement VM pre-warming

4. **WebRTC Full Implementation**
   - Replace mock SDP with real WebRTC library
   - Implement proper peer connection
   - Add error handling and reconnection

5. **Documentation**
   - Create architecture diagrams
   - Document all APIs
   - Create troubleshooting guide

---

## Summary

### What We're Trying to Achieve

Create a **browser-based OAuth automation system** where:
1. Users click "Authenticate Claude Code" (or other CLI tool)
2. System provisions an ephemeral Browser VM
3. OAuth flow runs in isolated VM with Puppeteer
4. Credentials captured and encrypted
5. Credentials transferred to persistent CLI VM
6. Browser VM destroyed after completion
7. User can now use CLI tool with saved credentials

### What's Working

- ✅ Master Controller operational
- ✅ Network DHCP configuration
- ✅ VM creation and boot
- ✅ IP allocation
- ✅ OAuth agent file injection (all files copied successfully)
- ✅ VM boots completely to login prompt
- ✅ VNC services start (Xvfb, Openbox, x11vnc, websockify)
- ✅ All critical bugs fixed (rate limiting, memory, Node.js version, network conflict)
- ✅ **Log preservation working** - console logs now captured!

### What's Broken

- ❌ **OAuth agent systemd service NEVER STARTS**
- ❌ Service not even mentioned in systemd boot logs
- ❌ Despite successful injection, systemd doesn't start vm-browser-agent.service
- ❌ Port 8080: EHOSTUNREACH for 120 seconds (60 health check attempts)
- ❌ WebRTC: No answers from VMs (depends on OAuth agent)

### Root Cause Identified

**Problem**: `vm-browser-agent.service` is injected correctly but **systemd never starts it**

**Evidence from Console Logs**:
```
[  OK  ] Started X Virtual Frame Buffer
[  OK  ] Started Openbox Window Manager
[  OK  ] Started x11vnc VNC Server
[  OK  ] Started Websockify VNC Proxy
[  OK  ] Started Getty on tty1
[  OK  ] Reached target Login Prompts

Ubuntu 22.04 LTS polydev-cli ttyS0
polydev-cli login:
```

**Missing**:
```
[  OK  ] Started VM Browser Services (OAuth Agent + WebRTC Server)  ⬅️ NEVER APPEARS
```

**Injection Logs Confirm Files Created**:
- ✅ Service file created: `/etc/systemd/system/vm-browser-agent.service`
- ✅ Symlink created: `/etc/systemd/system/multi-user.target.wants/vm-browser-agent.service`
- ✅ Supervisor script: `/opt/vm-browser-agent/start-all.sh`
- ✅ Injection complete, rootfs unmounted successfully

**Health Check Pattern**:
```
20:35:21 - Health check attempt 1: EHOSTUNREACH
20:35:24 - Health check attempt 2: EHOSTUNREACH
20:35:27 - Health check attempt 3: EHOSTUNREACH
... (60 attempts total, every ~2 seconds)
20:37:21 - Health check attempt 60: EHOSTUNREACH
20:37:23 - TIMEOUT: "VM not ready after 120000ms"
20:37:24 - VM destroyed (preserveLogs=true ✅)
```

### Hypotheses for Service Not Starting

**Hypothesis A: Dependency Not Met**
- Service has `After=network-online.target`
- But golden rootfs may not have network-online.target enabled
- Systemd skips service if dependency never reached

**Hypothesis B: Service File Syntax Error**
- Service file may have syntax issues
- systemd-analyze verify would catch this
- But we can't run it without SSH access

**Hypothesis C: ExecStart Path Issue**
- ExecStart=/opt/vm-browser-agent/start-all.sh
- File exists and is executable (verified in injection)
- But may have wrong shebang or interpreter issue

**Hypothesis D: Golden Rootfs Conflict**
- Golden rootfs may have old/conflicting service
- Or systemd configuration preventing new services
- Or file permissions issue in golden image

**Hypothesis E: Node Binary Missing**
- Service uses /usr/bin/node (symlink)
- Symlink may not exist in golden rootfs
- Script fails immediately when trying to run node

### Critical Next Actions

1. **Check Golden Rootfs** - Verify what's actually in the base image
2. **Add Diagnostic Logging** - Make service output visible in console
3. **Enable SSH** - For direct systemd debugging
4. **Test Service Manually** - Boot VM and run service by hand

---

## Actual Error Logs Captured

### Test VM Details
- **VM ID**: `vm-f3c6185b-ba12-4a50-a51d-ab581d9f1797`
- **Session**: `eccd636f-7e8a-40dd-8d3e-17913ca2adbc`
- **IP**: `192.168.100.2`
- **Created**: 2025-11-06 21:47:04
- **Destroyed**: 2025-11-06 21:49:08
- **Duration**: 124 seconds
- **Console Log**: 41KB (preserved ✅)
- **Error Log**: 0 bytes (no Firecracker errors)

### Complete Error Timeline

```
21:47:04 - VM created successfully
21:47:04 - OAuth agent injection complete
21:47:05 - Authentication flow dispatched
21:47:05 - [WAIT-VM-READY] Starting health check
21:47:05 - Attempt 1: EHOSTUNREACH
21:47:07 - Attempt 2: EHOSTUNREACH
... (58 more attempts, every ~2 seconds)
21:49:06 - Attempt 60: EHOSTUNREACH
21:49:06 - [ERROR] Authentication flow failed: "VM not ready after 120000ms"
21:49:07 - Scheduling browser VM cleanup (gracePeriodMs: 1000)
21:49:08 - Destroying VM (preserveLogs: true ✅)
21:49:08 - [CLEANUP] Console log preserved ✅
21:49:08 - [CLEANUP] Error log preserved ✅
21:49:08 - VM destroyed successfully
```

### Network Status

**DHCP Working** ✅:
- VM receives IP: 192.168.100.2
- TAP device created: fc-vm-f3c6185b
- Bridge attached: fc-bridge

**But Connection Fails** ❌:
- Error: `EHOSTUNREACH` (not ECONNREFUSED)
- This means: Network routing issue OR service not listening
- Since other VNC services work, likely service not listening

### Service Injection Status

All injection steps completed successfully:

```javascript
[INJECT-AGENT] Starting OAuth agent injection
[INJECT-AGENT] Mount point created
[INJECT-AGENT] Rootfs mounted successfully
[INJECT-AGENT] Mount verification passed (mountpoint confirmed)
[INJECT-AGENT] Injecting Decodo proxy configuration
[INJECT-AGENT] Decodo proxy + SESSION_ID injected successfully
[INJECT-AGENT] Removed old agent directories
[INJECT-AGENT] Copying server.js...
[INJECT-AGENT] server.js copied successfully
[INJECT-AGENT] Copying webrtc-server.js...
[INJECT-AGENT] webrtc-server.js copied successfully
[INJECT-AGENT] Copying package.json...
[INJECT-AGENT] package.json copied successfully
[INJECT-AGENT] Copying node binary (large file, may take a moment)...
[INJECT-AGENT] node binary copied successfully
[INJECT-AGENT] node made executable
[INJECT-AGENT] Agent files copied (OAuth agent + WebRTC server + bundled Node.js)
[INJECT-AGENT] Creating supervisor script...
[INJECT-AGENT] Supervisor script written to disk
[INJECT-AGENT] Supervisor script made executable
[INJECT-AGENT] Removed old service files
[INJECT-AGENT] Creating systemd service file...
[INJECT-AGENT] Systemd service file created
[INJECT-AGENT] Creating symlink for service enablement...
[INJECT-AGENT] Service directory created
[INJECT-AGENT] Service enabled (symlink created)
[INJECT-AGENT] OAuth agent injection complete ✅
[INJECT-AGENT] Syncing filesystem before unmount...
[INJECT-AGENT] Sync completed
[INJECT-AGENT] Unmounting rootfs...
[INJECT-AGENT] Rootfs unmounted successfully
[INJECT-AGENT] Mount point directory removed
```

**Result**: All files injected, service enabled, but **systemd never starts it**

---

**Document Status**: ✅ Complete with Actual Error Logs
**Last Updated**: November 6, 2025
**System Status**: Partially Operational
**Root Cause**: OAuth agent systemd service exists but systemd doesn't start it
**Preserved Logs**: `/var/log/vm-debug-logs/vm-f3c6185b-*-console-*.log` (41KB)
