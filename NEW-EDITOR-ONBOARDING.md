# New Code Editor - Complete Onboarding Guide

**Created:** 2025-10-12
**Purpose:** Provide comprehensive context for new AI code editors to understand and work on the Polydev OAuth system
**Status:** Active - Current blocker is Browser VM health check failure

---

## Table of Contents

1. [Critical Context - Read This First](#critical-context---read-this-first)
2. [System Architecture Overview](#system-architecture-overview)
3. [Current Problem Statement](#current-problem-statement)
4. [Essential Documentation Files](#essential-documentation-files)
5. [Code Structure & Key Files](#code-structure--key-files)
6. [Infrastructure Access](#infrastructure-access)
7. [How to Get Started](#how-to-get-started)
8. [Investigation Workflow](#investigation-workflow)
9. [Common Commands Reference](#common-commands-reference)
10. [Troubleshooting Decision Tree](#troubleshooting-decision-tree)

---

## Critical Context - Read This First

### What You're Working On

**Polydev AI** is a multi-AI agent platform that allows users to interact with various CLI tools (Claude Code, Codex, Gemini CLI) through a unified web interface. The system uses **Firecracker MicroVMs** to provide isolated, secure execution environments.

### Current System Status

🔴 **CRITICAL BLOCKER:** OAuth authentication is currently **completely broken** due to Browser VM health check failures.

**Symptom:** All OAuth attempts timeout with "VM not ready after 60000ms" error

**Impact:** Users cannot authenticate their CLI tools, making the entire platform unusable

**Debug Status:** Debug flag deployed (2025-10-12) to preserve failed VMs for investigation

### Why This Problem Is Hard

The Browser VM boots successfully, network is configured correctly, and systemd claims the service started - but the HTTP service on port 8080 never responds to health checks. The service output goes to systemd journal (not console), making it difficult to see what's actually happening inside the VM.

---

## System Architecture Overview

### High-Level Components

```
┌─────────────────────────────────────────────────────────────┐
│                    User's Web Browser                        │
│               (https://polydev.ai)                          │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ HTTPS
                 ▼
┌─────────────────────────────────────────────────────────────┐
│          Next.js Frontend (Port 3000)                        │
│     /Users/venkat/Documents/polydev-ai/src/app              │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ HTTP API
                 ▼
┌─────────────────────────────────────────────────────────────┐
│     Master Controller (Node.js Express, Port 4000)          │
│   /Users/venkat/Documents/polydev-ai/master-controller      │
│   Deployed: /opt/master-controller (on 192.168.5.82)       │
│                                                              │
│  Key Services:                                              │
│  • vm-manager.js - Creates/destroys Firecracker VMs        │
│  • browser-vm-auth.js - Orchestrates OAuth flow            │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ Firecracker API
                 ▼
┌─────────────────────────────────────────────────────────────┐
│               Firecracker VMs (192.168.5.82)                │
│                                                              │
│  ┌───────────────────────┐  ┌─────────────────────────┐   │
│  │  CLI VM (Persistent)  │  │ Browser VM (Temporary)  │   │
│  │  • 256MB RAM          │  │ • 2GB RAM               │   │
│  │  • 1 vCPU             │  │ • 2 vCPU                │   │
│  │  • No HTTP service    │  │ • HTTP service :8080 ❌ │   │
│  │  • Runs AI CLI tool   │  │ • X11 + VNC + Browser   │   │
│  │  IP: 192.168.100.X    │  │ IP: 192.168.100.Y       │   │
│  └───────────────────────┘  └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│            Supabase Database (PostgreSQL)                    │
│  Tables: users, vms, auth_sessions, credentials            │
└─────────────────────────────────────────────────────────────┘
```

### Two-VM Architecture Explained

**Why Two VMs?**

The system needs to run CLI tools (like Claude Code) that open browser windows for OAuth. Since the server has no physical display, we create two VMs:

1. **CLI VM (Persistent)**
   - Minimal Ubuntu installation
   - No graphics, no HTTP service
   - Runs user's AI CLI tool
   - Stays alive for chatting
   - IP: 192.168.100.X (varies)

2. **Browser VM (Temporary)**
   - Full Ubuntu desktop with X11 and VNC
   - Runs HTTP service on port 8080 (**CURRENTLY BROKEN**)
   - Handles OAuth browser flow
   - Gets destroyed after auth completes
   - IP: 192.168.100.Y (varies)

### OAuth Flow (When Working)

1. User clicks "Connect Claude Code" in web UI
2. Master controller creates CLI VM (user will need this for chatting)
3. Master controller creates Browser VM (for OAuth only)
4. Master controller polls Browser VM's health endpoint: `http://192.168.100.Y:8080/health`
   - **This is where it fails currently** ❌
5. Once healthy, master controller POSTs to Browser VM to start OAuth
6. Browser VM starts Claude Code CLI, which spawns OAuth callback server
7. Frontend shows OAuth URL in iframe, user logs in
8. Credentials captured and encrypted
9. Credentials written to CLI VM's filesystem (via loop mount)
10. Browser VM destroyed
11. User continues chatting via CLI VM

---

## Current Problem Statement

### What's Happening

```
[Timeline of OAuth Attempt]

T+0s:    User clicks "Connect"
T+1s:    CLI VM created ✅
T+2s:    Browser VM created ✅
T+3s:    Browser VM boots ✅
T+4s:    Network configured (192.168.100.Y/24) ✅
T+5s:    Systemd service starts ("Started VM Browser Agent") ✅
T+6-60s: Health check polling http://192.168.100.Y:8080/health ❌
         (Every 2 seconds, times out)
T+60s:   "VM not ready after 60000ms" - OAuth FAILS ❌
```

### Evidence from Console Logs

```
[    0.424345] IP-Config: Complete:
[    0.425039]      device=eth0, hwaddr=02:fc:71:9b:8a:e9,
                ipaddr=192.168.100.3, mask=255.255.255.0,
                gw=192.168.100.1

[[0;32m  OK  [0m] Started [0;1;39mVM Browser Agent - OAuth Proxy for CLI Tools[0m.

Ubuntu 22.04 LTS polydev-vm ttyS0
```

**Analysis:**
- ✅ VM boots successfully
- ✅ Network is UP and configured correctly
- ✅ Systemd says service started
- ❌ No service output after "Started" message (logs go to journal, not console)
- ❌ Port 8080 never responds

### Root Cause Hypotheses

The Node.js HTTP service inside the Browser VM that should respond on port 8080 is either:

1. **Not starting** (despite systemd saying it did)
   - Service file might be misconfigured
   - Binary might not have execute permissions

2. **Crashing immediately** after start
   - Node.js binary might be wrong architecture
   - Missing dependencies
   - JavaScript syntax error

3. **Starting but not binding to port 8080**
   - Port conflict (unlikely in fresh VM)
   - Binding to wrong interface (localhost vs 0.0.0.0)

4. **Starting but unable to communicate with host**
   - Firewall blocking port 8080
   - Network routing issue specific to that port

### Debug Flag Solution Implemented

**Problem:** Browser VMs were being destroyed immediately after health check failure, preventing investigation.

**Solution:** Implemented debug flag to conditionally preserve failed Browser VMs.

**Status:** ✅ Deployed to production (2025-10-12 22:47 UTC)

**Files Modified:**
- `/opt/master-controller/src/config/index.js` - Lines 100-104 (debug section)
- `/opt/master-controller/src/services/browser-vm-auth.js` - Lines 97-114 (conditional destruction)

**Environment Variable:** `DEBUG_KEEP_FAILED_BROWSER_VMS=true` (set in `/opt/master-controller/.env`)

**How It Works:**
```javascript
// In browser-vm-auth.js error handler
if (browserVM?.vmId) {
  if (config.debug.keepFailedBrowserVMs) {
    logger.warn('[DEBUG] Keeping failed Browser VM alive for debugging', {
      vmId: browserVM.vmId,
      vmIP: browserVM.ipAddress
    });
    // VM is preserved, not destroyed
  } else {
    await vmManager.destroyVM(browserVM.vmId);
  }
}
```

---

## Essential Documentation Files

### Must-Read Documents (Priority Order)

#### 1. **QUICK-REFERENCE.md** (Start Here)
**Location:** `/Users/venkat/Documents/polydev-ai/QUICK-REFERENCE.md`

**Purpose:** Quick command reference for common operations

**Key Sections:**
- Emergency commands (lines 6-64)
- SSH access credentials (lines 7-9)
- Service management commands (lines 24-28)
- VM cleanup commands (lines 36-55)
- **Debug flag usage (lines 259-335)** ⭐ CRITICAL

**When to Use:** Need quick copy-paste commands for troubleshooting

#### 2. **COMPREHENSIVE-OAUTH-DOCUMENTATION.md** (Deep Dive)
**Location:** `/Users/venkat/Documents/polydev-ai/COMPREHENSIVE-OAUTH-DOCUMENTATION.md`

**Purpose:** Complete system architecture and implementation details

**Key Sections:**
- System architecture diagrams (lines 32-136)
- OAuth flow step-by-step (lines 185-258)
- Code documentation (lines 445-673)
- **Current status & issues (lines 677-770)** ⭐ CRITICAL
- **Troubleshooting guide (lines 773-932)** ⭐ CRITICAL

**When to Use:** Need to understand how the system works, or need detailed investigation steps

#### 3. **SOLUTION-IMPLEMENTED.md** (Historical Context)
**Location:** `/Users/venkat/Documents/polydev-ai/SOLUTION-IMPLEMENTED.md`

**Purpose:** Documents previously solved issues and current debug flag implementation

**Key Sections:**
- Network bridge setup (lines 47-70)
- Database query fixes (lines 72-106)
- **NEW ISSUE: Browser VM health check (lines 15-26)** ⭐
- **Debug flag implementation (lines 239-404)** ⭐ CRITICAL

**When to Use:** Need context on what was already tried and fixed

#### 4. **FRONTEND-FIX-REQUIRED.md** (Next Steps After Fix)
**Location:** `/Users/venkat/Documents/polydev-ai/FRONTEND-FIX-REQUIRED.md`

**Purpose:** Documents frontend fix needed AFTER Browser VM issue is resolved

**Key Sections:**
- Original frontend VM connection issue (lines 10-250)
- **NEW ISSUE: Browser VM health check blocking (lines 401-503)** ⭐
- Frontend fix implementation (lines 36-206)

**When to Use:** Once Browser VM health check is fixed, this is the next task

### Reference Documents (As Needed)

- **OAUTH-FIX-COMPLETE.md** - Historical documentation of previous OAuth fixes
- **CLI_VALIDATION_SOLUTION.md** - Details about CLI VM validation logic
- **QUICK-DEPLOY.md** - Deployment procedures for code changes

---

## Code Structure & Key Files

### Development Machine (Mac)
**Base Path:** `/Users/venkat/Documents/polydev-ai`

```
polydev-ai/
├── src/                          # Next.js Frontend
│   ├── app/
│   │   ├── api/                  # Frontend API routes
│   │   │   ├── auth/             # Auth-related endpoints
│   │   │   └── vm/               # VM-related endpoints
│   │   ├── dashboard/            # Dashboard pages
│   │   └── ...
│   └── ...
│
├── master-controller/            # Backend (copied to production)
│   ├── src/
│   │   ├── config/
│   │   │   └── index.js          ⭐ Configuration (debug flag at lines 100-104)
│   │   ├── services/
│   │   │   ├── vm-manager.js     ⭐ VM lifecycle management
│   │   │   └── browser-vm-auth.js ⭐ OAuth orchestration (debug logic at lines 97-114)
│   │   ├── db/
│   │   │   └── supabase.js       Database operations
│   │   ├── routes/               API routes
│   │   └── index.js              Express server entry point
│   └── .env                      Environment variables (NOT committed)
│
├── *.md                          # Documentation files
└── ...
```

### Production Server (Mini PC)
**Server:** 192.168.5.82
**User:** backspace
**Password:** Venkatesh4158198303

```
/opt/master-controller/           # Deployed backend code
├── src/                          # Same structure as dev
│   ├── config/index.js           ⭐ Production config
│   ├── services/
│   │   ├── vm-manager.js         ⭐ Production VM manager
│   │   └── browser-vm-auth.js    ⭐ Production OAuth handler
│   └── ...
├── .env                          ⭐ Production environment variables
└── ...

/var/lib/firecracker/             # Firecracker data
├── vmlinux-5.10.217              # Kernel image
├── golden-snapshots/             # Base VM images
│   ├── cli-ubuntu.ext4           # 4GB CLI VM base
│   └── browser-ubuntu.ext4       # 6GB Browser VM base
├── users/                        # User VM instances
│   └── vm-{uuid}/                # Per-VM directory
│       ├── rootfs.ext4           # VM filesystem
│       ├── vm-config.json        # Firecracker config
│       ├── console.log           ⭐ VM boot logs
│       └── error.log             Firecracker errors
├── sockets/                      # Firecracker API sockets
│   └── vm-{uuid}.sock
└── ...

/etc/systemd/system/
└── master-controller.service     # Systemd service definition

/var/log/
└── syslog                        # System logs (includes master-controller)
```

### Key Code Files Explained

#### 1. `/opt/master-controller/src/config/index.js`
**Purpose:** Central configuration that loads environment variables

**Critical Section (Lines 100-104):**
```javascript
// Debug Options
debug: {
  // Keep failed Browser VMs alive for debugging
  keepFailedBrowserVMs: process.env.DEBUG_KEEP_FAILED_BROWSER_VMS === 'true'
}
```

**Why Important:** This controls whether failed Browser VMs are preserved or destroyed

#### 2. `/opt/master-controller/src/services/browser-vm-auth.js`
**Purpose:** Orchestrates entire OAuth authentication flow

**Critical Section (Lines 97-114):**
```javascript
// Cleanup on failure - destroy VMs
// For Browser VMs: Check debug flag before destroying
if (browserVM?.vmId) {
  if (config.debug.keepFailedBrowserVMs) {
    logger.warn('[DEBUG] Keeping failed Browser VM alive for debugging', {
      vmId: browserVM.vmId,
      vmIP: browserVM.ipAddress,
      provider,
      debugFlag: 'DEBUG_KEEP_FAILED_BROWSER_VMS=true'
    });
  } else {
    await vmManager.destroyVM(browserVM.vmId).catch(err =>
      logger.warn('Failed to cleanup browser VM', { error: err.message })
    );
  }
}
```

**Why Important:** This is where the decision is made to preserve or destroy failed Browser VMs

**Other Key Methods:**
- `startAuthentication(userId, provider)` (lines 20-112) - Main OAuth flow
- `waitForVMReady(vmIP, maxWaitMs)` (lines 117-176) - Health check polling (**WHERE IT FAILS**)
- `transferCredentialsToCLIVM()` (lines 220-274) - Filesystem-based credential transfer

#### 3. `/opt/master-controller/src/services/vm-manager.js`
**Purpose:** Manages Firecracker VM lifecycle

**Key Methods:**
- `createVM(userId, vmType)` (lines 150-548) - Creates and spawns VM
- `destroyVM(vmId)` - Kills VM and cleans up resources
- `_spawnFirecrackerProcess()` (lines 397-548) - Low-level VM spawn logic

**Why Important:** This is what actually creates the Browser VMs that are failing

#### 4. Browser VM HTTP Service (Inside VM)
**Location (Inside VM):** `/root/vm-http-service/server.js`

**Purpose:** Node.js HTTP server that listens on port 8080 for health checks and OAuth requests

**Key Endpoints:**
```javascript
GET  /health                    // ⭐ Health check endpoint (FAILING)
POST /auth/:provider            // Start OAuth flow
GET  /auth/:provider/oauth-url  // Get OAuth URL from CLI output
GET  /auth/:provider/credentials/status  // Check if credentials ready
```

**Why Important:** This is the service that's supposed to respond but doesn't

**Systemd Service File (Inside VM):** `/etc/systemd/system/vm-browser-agent.service`
```ini
[Unit]
Description=VM Browser Agent - OAuth Proxy for CLI Tools
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/vm-http-service
ExecStart=/usr/bin/node /root/vm-http-service/server.js
Restart=always
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

**Note:** `StandardOutput=journal` means service logs go to systemd journal, not console

---

## Infrastructure Access

### SSH Access to Production Server

```bash
# SSH command
ssh backspace@192.168.5.82

# Password
Venkatesh4158198303

# Become root (if needed)
echo "Venkatesh4158198303" | sudo -S su -
```

### Important Directories

```bash
# Master controller code
cd /opt/master-controller

# Check environment variables
cat /opt/master-controller/.env | grep -v "^#" | grep .

# Verify debug flag is set
grep DEBUG_KEEP_FAILED_BROWSER_VMS /opt/master-controller/.env
# Should show: DEBUG_KEEP_FAILED_BROWSER_VMS=true

# VM files
cd /var/lib/firecracker/users

# List recent VMs (newest first)
ls -lt /var/lib/firecracker/users/ | grep vm- | head -10

# Golden snapshot images
ls -lh /var/lib/firecracker/golden-snapshots/
```

### Service Management

```bash
# Check service status
sudo systemctl status master-controller

# View live logs
sudo journalctl -u master-controller -f

# View last 100 lines
sudo journalctl -u master-controller -n 100 --no-pager

# Filter for errors
sudo journalctl -u master-controller -n 500 --no-pager | grep -i error

# Restart service (if needed)
sudo systemctl restart master-controller
```

### Database Access

The system uses Supabase (hosted PostgreSQL). Access via:
- Dashboard: https://supabase.com/dashboard
- Credentials: In `/opt/master-controller/.env` (SUPABASE_SERVICE_KEY)

**Key Tables:**
- `vms` - VM metadata (vm_id, user_id, ip_address, status, vm_type)
- `auth_sessions` - OAuth session tracking
- `credentials` - Encrypted CLI credentials
- `users` - User accounts

---

## How to Get Started

### Step 1: Read Documentation (30 minutes)

Read these files in order:

1. **This file** (NEW-EDITOR-ONBOARDING.md) - You're reading it now ✅
2. **QUICK-REFERENCE.md** - Lines 259-335 (debug flag commands)
3. **COMPREHENSIVE-OAUTH-DOCUMENTATION.md** - Lines 677-770 (current status) and 777-884 (troubleshooting)
4. **SOLUTION-IMPLEMENTED.md** - Lines 239-404 (debug flag implementation)

### Step 2: Understand the Code (30 minutes)

Read these code files:

1. `/opt/master-controller/src/config/index.js` - Lines 100-104
2. `/opt/master-controller/src/services/browser-vm-auth.js` - Lines 20-176
3. Look at `waitForVMReady()` method - This is where health check fails

### Step 3: Verify Debug Flag Active (5 minutes)

```bash
# SSH into server
ssh backspace@192.168.5.82

# Check debug flag is set
grep DEBUG_KEEP_FAILED_BROWSER_VMS /opt/master-controller/.env

# Check service is running
sudo systemctl status master-controller

# Verify config was loaded correctly
sudo journalctl -u master-controller -n 50 --no-pager | grep -i debug
```

### Step 4: Trigger OAuth to Create Browser VM (10 minutes)

```bash
# From your dev machine or from the server
curl -X POST http://192.168.5.82:4000/api/auth/start \
  -H 'Content-Type: application/json' \
  -d '{"userId":"5abacdd1-6a9b-48ce-b723-ca8056324c7a","provider":"claude_code"}' \
  --max-time 90

# Expected result: Will timeout after 60 seconds with error
# But Browser VM should be preserved!
```

### Step 5: Find Preserved Browser VM (5 minutes)

```bash
# SSH into server
ssh backspace@192.168.5.82

# Find newest VM directory
ls -lt /var/lib/firecracker/users/ | grep vm- | head -5

# Note the VM ID (e.g., vm-abc123-def456-ghi789)
VM_ID="vm-XXXXX-XXXXX-XXXXX"  # Replace with actual ID

# Check if it's still running
ps aux | grep firecracker | grep $VM_ID

# Check console logs
sudo tail -100 /var/lib/firecracker/users/$VM_ID/console.log
```

### Step 6: Investigate Browser VM (See Investigation Workflow section)

---

## Investigation Workflow

### Complete Investigation Checklist

Follow these steps to investigate the preserved Browser VM:

#### 1. Identify the Browser VM

```bash
# SSH into server
ssh backspace@192.168.5.82

# List recent VM directories (Browser VM will be newest with "browser" type)
ls -lt /var/lib/firecracker/users/ | grep vm- | head -10

# Get VM ID from the listing
VM_ID="vm-XXXXX-XXXXX-XXXXX"  # Replace with actual ID

# Alternatively, query database for recent Browser VMs
curl "http://localhost:4000/api/admin/vms/recent?limit=5&vmType=browser" | jq -r '.vms[] | "\(.vm_id) - \(.ip_address) - \(.status)"'
```

#### 2. Check Console Logs

```bash
# View last 100 lines of console output
sudo tail -100 /var/lib/firecracker/users/$VM_ID/console.log

# What to look for:
# ✅ "IP-Config: Complete" - Network configured
# ✅ "Started VM Browser Agent" - Systemd started service
# ❌ No output after service start - Service logs go to journal
```

#### 3. Get VM IP Address

```bash
# From console logs (look for line like):
# device=eth0, ipaddr=192.168.100.X, mask=255.255.255.0

# Or from database query (step 1)
VM_IP="192.168.100.X"  # Replace with actual IP
```

#### 4. Test Network Connectivity

```bash
# Test if VM is reachable at network layer
ping -c 3 $VM_IP

# Expected result: Should succeed (network works)

# Test if port 8080 is responding
curl -v --max-time 5 http://$VM_IP:8080/health

# Expected result: Will timeout (this is the problem)

# Check if firewall is blocking
sudo iptables -L -n | grep 192.168.100
sudo iptables -L -n | grep 8080
```

#### 5. Check if VM Process is Running

```bash
# Check Firecracker process
ps aux | grep firecracker | grep $VM_ID

# Expected result: Should show running process

# Check TAP interface
ip link show | grep fc-$VM_ID
```

#### 6. Mount VM Filesystem and Inspect Service

```bash
# Create mount point
sudo mkdir -p /tmp/vm-inspect

# Mount VM's ext4 filesystem
sudo mount -o loop /var/lib/firecracker/users/$VM_ID/rootfs.ext4 /tmp/vm-inspect

# Check if service files exist
sudo ls -la /tmp/vm-inspect/root/vm-http-service/
# Expected files:
# - server.js (Node.js HTTP server)
# - package.json
# - node_modules/ (if dependencies installed)

# Read service file
sudo cat /tmp/vm-inspect/etc/systemd/system/vm-browser-agent.service
# Verify ExecStart path is correct

# Check Node.js binary exists and is correct architecture
sudo file /tmp/vm-inspect/usr/bin/node
# Expected: ELF 64-bit LSB executable, x86-64

# Try to run Node.js binary to check version
sudo /tmp/vm-inspect/usr/bin/node --version 2>&1
# If error: Binary might not be executable or wrong arch

# Check service JavaScript for syntax errors
sudo cat /tmp/vm-inspect/root/vm-http-service/server.js | head -100
# Look for:
# - Correct port binding (should be 0.0.0.0:8080, not localhost:8080)
# - Proper require() statements
# - Health endpoint defined

# Check permissions
sudo ls -la /tmp/vm-inspect/root/vm-http-service/server.js
sudo ls -la /tmp/vm-inspect/usr/bin/node

# Unmount when done
sudo umount /tmp/vm-inspect
```

#### 7. Check Journal Logs (If Accessible)

```bash
# Try to view journal logs from VM filesystem
# (This may not work if journal wasn't persisted)
sudo journalctl --root=/tmp/vm-inspect -u vm-browser-agent -n 100

# Or check if journal files exist
sudo ls -la /tmp/vm-inspect/var/log/journal/
```

#### 8. Attempt Direct Debugging (Advanced)

If you need to debug inside the running VM:

```bash
# Via Firecracker API socket
curl --unix-socket /var/lib/firecracker/sockets/$VM_ID.sock \
  http://localhost/

# Note: This is low-level Firecracker API, not the HTTP service
```

#### 9. Test Network from VM Side (If Accessible)

If you can get console access to VM:

```bash
# Check if service is running
ps aux | grep node

# Check if port 8080 is listening
netstat -tlnp | grep 8080

# Check network interfaces
ip addr show

# Test network from inside VM
ping 8.8.8.8
curl http://google.com
```

#### 10. Manually Destroy VM When Done

```bash
# Once investigation is complete, destroy the VM
curl -X POST "http://localhost:4000/api/vm/destroy" \
  -H 'Content-Type: application/json' \
  -d "{\"vmId\":\"$VM_ID\"}"

# Verify VM is destroyed
ps aux | grep firecracker | grep $VM_ID
# Should show nothing

# Check VM directory removed
ls /var/lib/firecracker/users/$VM_ID
# Should show "No such file or directory"
```

### What We're Looking For

After investigation, we need to determine:

1. **Is the Node.js binary present and executable?**
   - Check with `file` command
   - Verify architecture is x86_64
   - Check execute permissions

2. **Is the service code correct?**
   - Check for syntax errors
   - Verify it binds to `0.0.0.0:8080` (not `localhost:8080`)
   - Verify health endpoint exists

3. **Is the service actually starting?**
   - Check journal logs for startup messages
   - Check for crash messages
   - Look for error output

4. **Is the network route correct?**
   - Can host ping VM? ✅ (Should work)
   - Can host curl other ports on VM?
   - Is firewall blocking port 8080?

5. **Is the golden snapshot image correct?**
   - Does `/var/lib/firecracker/golden-snapshots/browser-ubuntu.ext4` have the service?
   - Was it built correctly?
   - Does it need to be rebuilt?

---

## Common Commands Reference

### Quick Copy-Paste Commands

#### Check System Health

```bash
# SSH into server
ssh backspace@192.168.5.82

# Check master-controller is running
sudo systemctl status master-controller --no-pager | head -3

# Count running VMs
ps aux | grep firecracker | grep -v grep | wc -l

# Check bridge interface
ip link show fcbr0 | head -1

# View recent errors
sudo journalctl -u master-controller -n 100 --no-pager | grep -i error

# Check disk space
df -h /var/lib/firecracker
```

#### Trigger OAuth Flow

```bash
# Start OAuth (will timeout, but creates Browser VM)
curl -X POST http://192.168.5.82:4000/api/auth/start \
  -H 'Content-Type: application/json' \
  -d '{"userId":"5abacdd1-6a9b-48ce-b723-ca8056324c7a","provider":"claude_code"}' \
  --max-time 90
```

#### Find and Inspect VM

```bash
# List recent VMs
ls -lt /var/lib/firecracker/users/ | grep vm- | head -5

# Set VM ID (replace with actual)
VM_ID="vm-XXXXX-XXXXX-XXXXX"

# View console logs
sudo tail -100 /var/lib/firecracker/users/$VM_ID/console.log

# Get VM IP from logs (look for "ipaddr=192.168.100.X")
# Or query database
curl "http://localhost:4000/api/admin/vms/recent?limit=5&vmType=browser" | jq

# Test connectivity
VM_IP="192.168.100.X"  # Replace with actual
ping -c 3 $VM_IP
curl -v --max-time 5 http://$VM_IP:8080/health
```

#### Mount and Inspect VM Filesystem

```bash
# Mount
sudo mkdir -p /tmp/vm-inspect
sudo mount -o loop /var/lib/firecracker/users/$VM_ID/rootfs.ext4 /tmp/vm-inspect

# Check service files
sudo ls -la /tmp/vm-inspect/root/vm-http-service/
sudo cat /tmp/vm-inspect/etc/systemd/system/vm-browser-agent.service
sudo cat /tmp/vm-inspect/root/vm-http-service/server.js | head -50

# Check Node.js
sudo file /tmp/vm-inspect/usr/bin/node
sudo /tmp/vm-inspect/usr/bin/node --version 2>&1

# Unmount
sudo umount /tmp/vm-inspect
```

#### Cleanup VM

```bash
# Destroy specific VM
curl -X POST "http://localhost:4000/api/vm/destroy" \
  -H 'Content-Type: application/json' \
  -d "{\"vmId\":\"$VM_ID\"}"

# Or manually (CAREFUL!)
sudo kill -9 $(ps aux | grep firecracker | grep $VM_ID | awk '{print $2}')
sudo rm -rf /var/lib/firecracker/users/$VM_ID
```

#### Disable Debug Flag (When Done)

```bash
# Remove debug flag
ssh backspace@192.168.5.82
sudo sed -i '/DEBUG_KEEP_FAILED_BROWSER_VMS/d' /opt/master-controller/.env

# Restart service
sudo systemctl restart master-controller

# Verify removed
grep DEBUG_KEEP_FAILED_BROWSER_VMS /opt/master-controller/.env
# Should show nothing
```

---

## Troubleshooting Decision Tree

Use this flowchart to guide investigation:

```
Start: OAuth times out with "VM not ready after 60000ms"
  │
  ├─> Is debug flag active? (grep DEBUG_KEEP_FAILED_BROWSER_VMS .env)
  │     ├─> NO: Enable it and restart service
  │     └─> YES: Continue
  │
  ├─> Trigger OAuth to create Browser VM
  │
  ├─> Find preserved Browser VM (ls -lt /var/lib/firecracker/users/)
  │
  ├─> Check console logs (tail console.log)
  │     ├─> VM didn't boot: Check Firecracker errors
  │     ├─> Network not configured: Check kernel boot args
  │     └─> Service started but no output: Continue
  │
  ├─> Get VM IP address (from console logs or database)
  │
  ├─> Test network connectivity (ping VM_IP)
  │     ├─> Ping fails: Network routing problem
  │     └─> Ping succeeds: Continue
  │
  ├─> Test port 8080 (curl VM_IP:8080/health)
  │     ├─> Timeout: Continue to filesystem check
  │     └─> Response: Weird, health check should work then!
  │
  ├─> Mount VM filesystem and inspect
  │     │
  │     ├─> Check /root/vm-http-service/ exists
  │     │     ├─> Missing: Golden snapshot doesn't have service
  │     │     └─> Present: Continue
  │     │
  │     ├─> Check /usr/bin/node exists and is correct arch
  │     │     ├─> Missing or wrong arch: Golden snapshot issue
  │     │     └─> Correct: Continue
  │     │
  │     ├─> Check service file /etc/systemd/system/vm-browser-agent.service
  │     │     ├─> ExecStart path wrong: Fix golden snapshot
  │     │     └─> Looks correct: Continue
  │     │
  │     ├─> Check server.js for issues
  │     │     ├─> Binds to localhost:8080: BUG FOUND! Should be 0.0.0.0:8080
  │     │     ├─> Syntax errors: Fix and rebuild golden snapshot
  │     │     └─> Looks correct: Continue
  │     │
  │     └─> Check journal logs (if accessible)
  │           ├─> Service crashed: See error message
  │           ├─> Port conflict: Unlikely but possible
  │           └─> No logs: Journal not persisting
  │
  └─> If still stuck: Consider using Polydev get_perspectives tool
        for fresh ideas from multiple AI models
```

---

## Tips for Effective Debugging

### 1. Document Everything

As you investigate, add notes to a new file:

```bash
echo "# Investigation Log - $(date)" > ~/vm-investigation.log
echo "VM_ID: $VM_ID" >> ~/vm-investigation.log
echo "VM_IP: $VM_IP" >> ~/vm-investigation.log
# ... add findings as you go
```

### 2. Take Snapshots of Findings

```bash
# Save console logs
sudo cp /var/lib/firecracker/users/$VM_ID/console.log ~/console-$VM_ID.log

# Save service file
sudo cp /tmp/vm-inspect/etc/systemd/system/vm-browser-agent.service ~/service-file.txt

# Save server.js
sudo cp /tmp/vm-inspect/root/vm-http-service/server.js ~/server-js-$VM_ID.js
```

### 3. Use Polydev AI Consultation

If stuck, use the Polydev `get_perspectives` MCP tool to get insights from multiple AI models:

```javascript
// Example consultation
mcp__polydev__get_perspectives({
  prompt: "Firecracker Browser VM boots successfully, systemd says service started, but HTTP port 8080 doesn't respond. Console logs show: [boot logs here]. Service is configured to run: /usr/bin/node /root/vm-http-service/server.js. What could cause this?"
})
```

### 4. Compare Working vs Non-Working

If you have access to a working Browser VM (or historical logs from when it worked), compare:
- Console log patterns
- Service file differences
- server.js code differences
- Node.js versions

### 5. Test Minimal Reproduction

Create a minimal test:
1. Mount VM filesystem
2. Try running the Node.js service manually (if possible)
3. Check for missing dependencies
4. Verify binary is executable

---

## Next Steps After Finding Root Cause

Once you identify the issue:

### 1. Document the Finding

Add to a new file `ROOT-CAUSE-FOUND.md`:

```markdown
# Root Cause Found

**Date:** 2025-10-XX
**Issue:** Browser VM health check timeout
**Root Cause:** [Describe what you found]

## Evidence
[Console logs, filesystem inspection results, etc.]

## Fix Required
[Describe what needs to be changed]

## Files to Modify
[List files that need changes]
```

### 2. Fix the Issue

Depending on the root cause:

- **Service code issue:** Fix `server.js` in golden snapshot
- **Systemd config issue:** Fix service file in golden snapshot
- **Node.js binary issue:** Reinstall/rebuild golden snapshot
- **Network issue:** Fix firewall or routing rules
- **Host issue:** Fix master-controller code

### 3. Test the Fix

```bash
# Rebuild golden snapshot (if needed)
# Deploy code changes (if needed)
# Trigger OAuth again
# Verify health check succeeds
```

### 4. Update Documentation

Update these files:
- `SOLUTION-IMPLEMENTED.md` - Add section about this fix
- `QUICK-REFERENCE.md` - Update troubleshooting section
- `COMPREHENSIVE-OAUTH-DOCUMENTATION.md` - Update status

### 5. Disable Debug Flag

Once verified working:

```bash
ssh backspace@192.168.5.82
sudo sed -i '/DEBUG_KEEP_FAILED_BROWSER_VMS/d' /opt/master-controller/.env
sudo systemctl restart master-controller
```

### 6. Move to Frontend Fix

Once Browser VM health check works, the next task is fixing the frontend VM connection issue (see `FRONTEND-FIX-REQUIRED.md`).

---

## Summary

### What You Need to Know

1. **System Status:** OAuth is completely broken due to Browser VM health check failures
2. **Debug Flag:** Active and deployed, will preserve failed Browser VMs
3. **Next Step:** Trigger OAuth, investigate preserved VM, find root cause
4. **Documentation:** Four key files explain everything (QUICK-REFERENCE, COMPREHENSIVE-OAUTH, SOLUTION-IMPLEMENTED, FRONTEND-FIX)
5. **Access:** SSH credentials provided, all paths documented

### Your Mission

1. Read documentation (this file and the 3 key reference files)
2. Understand the two-VM architecture and OAuth flow
3. Trigger OAuth to create a preserved Browser VM
4. Follow investigation workflow to determine root cause
5. Fix the issue and test
6. Update documentation

### Critical Files to Reference

- **QUICK-REFERENCE.md** - Lines 259-335 (debug flag commands)
- **COMPREHENSIVE-OAUTH-DOCUMENTATION.md** - Lines 677-884 (status + troubleshooting)
- **SOLUTION-IMPLEMENTED.md** - Lines 239-404 (debug flag implementation)

### Key Commands

```bash
# SSH
ssh backspace@192.168.5.82
# Password: Venkatesh4158198303

# Trigger OAuth
curl -X POST http://192.168.5.82:4000/api/auth/start \
  -H 'Content-Type: application/json' \
  -d '{"userId":"5abacdd1-6a9b-48ce-b723-ca8056324c7a","provider":"claude_code"}' \
  --max-time 90

# Find VM
ls -lt /var/lib/firecracker/users/ | grep vm- | head -5

# Inspect
VM_ID="vm-XXX-XXX-XXX"
sudo tail -100 /var/lib/firecracker/users/$VM_ID/console.log
```

---

**Good luck! The system is waiting for you to fix it.** 🚀

**Questions?** Re-read COMPREHENSIVE-OAUTH-DOCUMENTATION.md sections 677-884 for detailed troubleshooting.

---

**Document Created:** 2025-10-12
**Author:** Claude Code (AI Assistant)
**Project:** Polydev AI - OAuth Authentication System
**Status:** Active - Use this as your starting point
