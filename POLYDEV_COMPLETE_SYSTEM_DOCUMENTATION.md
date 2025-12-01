# Polydev AI - Complete System Documentation

**Date:** December 1, 2025
**Status:** Development Complete - IP Blocking Issue Unresolved
**Author:** Development Team

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Components Built](#components-built)
4. [What Works](#what-works)
5. [What Doesn't Work](#what-doesnt-work)
6. [Technical Deep Dive](#technical-deep-dive)
7. [Proxy Research Findings](#proxy-research-findings)
8. [Alternative Architectures](#alternative-architectures)
9. [Code Reference](#code-reference)
10. [Infrastructure Details](#infrastructure-details)
11. [Future Recommendations](#future-recommendations)

---

## Executive Summary

### Project Vision
Build a multi-user platform that provides isolated AI coding assistant sessions using Firecracker microVMs. Each user gets their own sandboxed environment running Claude Code CLI, with browser-based access via WebRTC streaming.

### What Was Built
A complete infrastructure including:
- Firecracker microVM orchestration system
- Golden rootfs snapshot with pre-installed Claude Code CLI
- OAuth agent for CLI authentication
- WebRTC video streaming pipeline
- VNC-based fallback streaming
- Master controller API (Node.js/Express)
- Next.js frontend with session management
- Supabase database integration
- Redis session caching

### Why It's Blocked
**Anthropic blocks all proxy IP addresses** from accessing Claude Code CLI's OAuth endpoints. This includes:
- Residential proxies (Decodo/Smartproxy)
- ISP/Static residential proxies
- Datacenter proxies
- Rotating proxies

The Claude Code CLI is designed for individual developers on local machines, not for server-side SaaS deployments.

---

## System Architecture

### Original Design

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Dashboard  │  │  WebRTC     │  │  Auth UI    │              │
│  │  (Next.js)  │  │  Viewer     │  │  (OAuth)    │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
└─────────┼────────────────┼────────────────┼─────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      NEXT.JS FRONTEND                            │
│                     (polydev.ai / Vercel)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  /dashboard │  │  /api/      │  │  /auth/     │              │
│  │  /remote-cli│  │  webrtc/    │  │  callback   │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
└─────────┼────────────────┼────────────────┼─────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MASTER CONTROLLER                             │
│              (Hetzner VPS: 135.181.138.102:4000)                 │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                     Express.js API                          │ │
│  │  /api/auth/start     - Create VM, start OAuth               │ │
│  │  /api/auth/session/* - Session management                   │ │
│  │  /api/webrtc/*       - WebRTC signaling                     │ │
│  │  /health             - Health check                         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│  │  VM Manager   │  │  Browser Auth │  │  WebRTC       │       │
│  │  (Firecracker)│  │  Service      │  │  Signaling    │       │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘       │
└──────────┼──────────────────┼──────────────────┼────────────────┘
           │                  │                  │
           ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FIRECRACKER MICROVMS                          │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  VM-1 (192.168.100.2)                                   │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │    │
│  │  │ OAuth Agent │  │ Claude CLI  │  │ Chromium    │     │    │
│  │  │ (port 8080) │  │ (Terminal)  │  │ (Browser)   │     │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │    │
│  │  ┌─────────────┐  ┌─────────────┐                      │    │
│  │  │ TigerVNC    │  │ WebRTC Srv  │                      │    │
│  │  │ (port 5900) │  │ (GStreamer) │                      │    │
│  │  └─────────────┘  └─────────────┘                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Golden Rootfs: /var/lib/firecracker/snapshots/base/             │
│  VM Storage:    /var/lib/firecracker/users/vm-{uuid}/            │
└─────────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                             │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Anthropic  │  │  Supabase   │  │  Redis      │              │
│  │  (Claude)   │  │  (Database) │  │  (Cache)    │              │
│  │  ⚠️ BLOCKED │  │  ✅ Working │  │  ✅ Working │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐                               │
│  │  Decodo     │  │  Cloudflare │                               │
│  │  (Proxy)    │  │  (CDN/WAF)  │                               │
│  │  ⚠️ BLOCKED │  │  ✅ Working │                               │
│  └─────────────┘  └─────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
```

### Network Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      HOST (Hetzner VPS)                       │
│                      IP: 135.181.138.102                      │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  TAP Network Bridge (fc-tap0)                          │  │
│  │  Gateway: 192.168.100.1                                │  │
│  │  Subnet:  192.168.100.0/24                             │  │
│  └────────────────────────────────────────────────────────┘  │
│           │                    │                    │         │
│           ▼                    ▼                    ▼         │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐   │
│  │    VM-1     │      │    VM-2     │      │    VM-N     │   │
│  │192.168.100.2│      │192.168.100.3│      │192.168.100.X│   │
│  │   (DHCP)    │      │   (DHCP)    │      │   (DHCP)    │   │
│  └─────────────┘      └─────────────┘      └─────────────┘   │
│                                                               │
│  iptables NAT: MASQUERADE all VM traffic                     │
│  Port forwarding: Host:8080 → VM:8080 (dynamic per session)  │
└──────────────────────────────────────────────────────────────┘
```

---

## Components Built

### 1. Master Controller (`/master-controller/`)

**Location:** VPS `/opt/master-controller/`

```
master-controller/
├── src/
│   ├── index.js              # Express server entry point
│   ├── config/
│   │   └── index.js          # Configuration (Supabase, Redis, Decodo)
│   ├── db/
│   │   └── supabase.js       # Database client
│   ├── routes/
│   │   ├── auth.js           # /api/auth/* endpoints
│   │   └── webrtc.js         # /api/webrtc/* endpoints
│   └── services/
│       ├── vm-manager.js     # Firecracker VM lifecycle
│       ├── browser-vm-auth.js # OAuth flow management
│       ├── webrtc-signaling.js # WebRTC SDP/ICE exchange
│       └── redis-client.js   # Session caching
├── vm-browser-agent/         # Code injected into VMs
│   └── server.js             # OAuth agent (runs in VM)
├── scripts/
│   └── build-golden-snapshot.sh # Build VM template
└── logs/
    └── master-controller.log
```

**Key Features:**
- VM creation with CoW (Copy-on-Write) rootfs cloning
- DHCP-based IP allocation
- Session state management
- Health monitoring
- Cleanup on timeout

### 2. VM Browser Agent (`/vm-browser-agent/`)

**Location:** VM `/opt/vm-browser-agent/`

```javascript
// server.js - OAuth Agent running inside each VM
// Handles:
// - /health endpoint
// - /auth/start - Trigger Claude Code CLI OAuth
// - Session management
// - CLI process spawning
// - Error handling and diagnostics
```

**Key Features:**
- Express server on port 8080
- Claude Code CLI spawning with PTY
- OAuth URL extraction
- Session status reporting

### 3. Golden Rootfs

**Location:** VPS `/var/lib/firecracker/snapshots/base/golden-rootfs.ext4`

**Contents:**
- Ubuntu 22.04 base
- Node.js 18.x (LTS)
- Chromium browser
- TigerVNC server
- Claude Code CLI (pre-installed via npx)
- Supervisor scripts
- dnsmasq for DNS
- Network configuration

### 4. Frontend (`/src/`)

**Key Pages:**
- `/dashboard/remote-cli/` - Session management UI
- `/dashboard/remote-cli/auth/` - OAuth callback handler

**Key Components:**
- `WebRTCViewer.tsx` - Video streaming component

### 5. Build Scripts

**`build-golden-snapshot.sh`:**
- Creates base rootfs from Ubuntu cloud image
- Installs all dependencies
- Configures systemd services
- Sets up network (IPv4-only)
- Pre-caches Claude Code CLI

---

## What Works

### Fully Functional Components

| Component | Status | Notes |
|-----------|--------|-------|
| Firecracker VM creation | ✅ Working | VMs boot in ~3 seconds |
| CoW rootfs cloning | ✅ Working | Efficient disk usage |
| DHCP IP allocation | ✅ Working | 192.168.100.X range |
| NAT networking | ✅ Working | VMs can reach internet |
| DNS resolution | ✅ Working | dnsmasq with IPv4 hardcoding |
| OAuth Agent (port 8080) | ✅ Working | Responds to health checks |
| TigerVNC server | ✅ Working | Display :0 |
| Supervisor process management | ✅ Working | Keeps services alive |
| Supabase database | ✅ Working | Sessions, users, VMs |
| Redis caching | ✅ Working | Session state |
| Master controller API | ✅ Working | All endpoints functional |
| VM cleanup on timeout | ✅ Working | 3-minute idle cleanup |

### Partially Working

| Component | Status | Notes |
|-----------|--------|-------|
| WebRTC streaming | ⚠️ Partial | GStreamer pipeline needs tuning |
| VNC WebSocket proxy | ⚠️ Partial | Works but high latency |
| Claude Code CLI spawn | ⚠️ Partial | Spawns but fails to connect |

---

## What Doesn't Work

### Critical Blocker: Anthropic IP Blocking

**The Problem:**
Claude Code CLI cannot connect to `api.anthropic.com` from VPS IP addresses.

**Error Message:**
```
Failed to connect to api.anthropic.com: ERR_INVALID_IP_ADDRESS
```

**Tested Solutions:**

| Solution | Result |
|----------|--------|
| Direct NAT (no proxy) | ❌ Blocked by Anthropic |
| Decodo Residential Proxy | ❌ Blocked by Anthropic |
| Decodo ISP Proxy | ❌ Blocked by Anthropic |
| Rotating Residential Proxy | ❌ Blocked by Anthropic |
| SOCKS5 Proxy | ❌ Blocked by Anthropic |
| Transparent Proxy (redsocks) | ❌ Blocked by Anthropic |

**Root Cause:**
Anthropic uses Cloudflare and IP reputation databases (MaxMind, IPinfo) to block:
1. Known datacenter IP ranges
2. Known proxy provider IP ranges
3. Automated/headless behavior patterns

**Why This Is Unfixable (with current approach):**
- Claude Code CLI is designed for individual developers
- OAuth flow expects consumer devices with browser fingerprints
- Anthropic rate-limits per IP + per account
- Wrapping consumer service into SaaS violates ToS

---

## Technical Deep Dive

### VM Lifecycle

```javascript
// vm-manager.js - VM Creation Flow

async createVM(userId, sessionId) {
  // 1. Clone golden rootfs (CoW)
  const vmId = `vm-${uuidv4()}`;
  const vmDir = `/var/lib/firecracker/users/${vmId}`;
  await exec(`cp --reflink=auto golden-rootfs.ext4 ${vmDir}/rootfs.ext4`);

  // 2. Generate VM config
  const vmConfig = {
    boot_source: { kernel_path, boot_args },
    drives: [{ path_on_host: `${vmDir}/rootfs.ext4` }],
    network_interfaces: [{ tap: 'fc-tap0', mac: generateMAC() }]
  };

  // 3. Start Firecracker process
  const fc = spawn('firecracker', ['--config-file', configPath]);

  // 4. Wait for DHCP assignment
  const ip = await waitForDHCP(vmId);

  // 5. Wait for OAuth agent health
  await waitForHealth(`http://${ip}:8080/health`);

  // 6. Store in database
  await supabase.from('browser_vms').insert({ vmId, ip, userId, sessionId });

  return { vmId, ip };
}
```

### OAuth Agent Flow

```javascript
// server.js (inside VM) - OAuth Flow

app.post('/auth/start', async (req, res) => {
  const { sessionId, provider } = req.body;

  // 1. Spawn Claude Code CLI with PTY
  const pty = spawn('npx', ['@anthropic-ai/claude-code', 'auth', 'login'], {
    env: {
      ...process.env,
      NODE_OPTIONS: '--dns-result-order=ipv4first',
      // No proxy - direct connection
    }
  });

  // 2. Capture OAuth URL from CLI output
  pty.onData((data) => {
    const match = data.match(/https:\/\/claude\.ai\/oauth\/.*/);
    if (match) {
      oauthUrl = match[0];
      sendStatusUpdate({ status: 'oauth_url_ready', oauthUrl });
    }
  });

  // 3. Wait for completion or error
  pty.onExit((code) => {
    if (code === 0) {
      sendStatusUpdate({ status: 'authenticated' });
    } else {
      sendStatusUpdate({ status: 'failed', error: lastError });
    }
  });
});
```

### Network Configuration

```bash
# /etc/environment (in VM)
PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
LC_ALL=C.UTF-8
LANG=C.UTF-8
NODE_OPTIONS="--dns-result-order=ipv4first"

# /etc/resolv.conf (in VM)
nameserver 127.0.0.1

# /etc/dnsmasq.conf (in VM)
listen-address=127.0.0.1
bind-interfaces
no-resolv
server=8.8.8.8
address=/api.anthropic.com/160.79.104.10  # Hardcoded to bypass DNS issues
```

### Kernel Boot Args

```bash
# Firecracker kernel boot arguments
"console=ttyS0 reboot=k panic=1 pci=off \
 ip=dhcp \
 ipv6.disable=1 \
 net.ifnames=0 \
 init=/sbin/init"
```

---

## Proxy Research Findings

### Why ALL Proxies Fail

**1. IP Reputation Databases**
Anthropic/Cloudflare uses services like MaxMind, IPinfo, and IP2Location that track:
- Entire proxy provider IP pools (not just individual IPs)
- ASN patterns of proxy networks
- Historical abuse data

**2. Detection Mechanisms**
| Detection Type | Description |
|----------------|-------------|
| ASN Analysis | Proxy providers have recognizable network signatures |
| Behavioral | Headless browser patterns, rapid requests |
| Session Fingerprinting | Missing browser fingerprints |
| Connection Patterns | Multiple accounts from same IP range |

**3. Provider-Specific Blocking**
Major proxy providers blocked by Anthropic:
- Smartproxy/Decodo (all products)
- Bright Data
- Oxylabs
- NetNut
- Most residential proxy pools

### Research Sources

From official Anthropic documentation:
> Claude Code supports routing traffic through corporate proxy servers using standard environment variables: `HTTPS_PROXY`, `HTTP_PROXY`, and `NO_PROXY`. It does **not** support SOCKS proxies.
>
> Source: [docs.anthropic.com/en/docs/claude-code/corporate-proxy](https://docs.anthropic.com/en/docs/claude-code/corporate-proxy)

Key insight:
> The CLI is currently in "Research Preview." It is explicitly designed for a single developer working on a local machine. There is no official support for running it as a backend service for multiple users.

---

## Alternative Architectures

### Option 1: Anthropic API + Firecracker (Recommended)

**Architecture:**
```
User -> Your App -> Anthropic API (Intelligence) -> Firecracker (Execution)
```

**Implementation:**
```javascript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Define tools that map to Firecracker VM operations
const tools = [
  {
    name: 'read_file',
    description: 'Read a file from the user workspace',
    input_schema: { type: 'object', properties: { path: { type: 'string' } } }
  },
  {
    name: 'write_file',
    description: 'Write content to a file',
    input_schema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } } }
  },
  {
    name: 'execute_command',
    description: 'Execute a shell command in the user sandbox',
    input_schema: { type: 'object', properties: { command: { type: 'string' } } }
  }
];

async function handleUserRequest(userId, prompt) {
  // 1. Get or create Firecracker VM for user
  const vm = await vmManager.getOrCreateVM(userId);

  // 2. Send to Anthropic API with tool definitions
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: 'You are a coding assistant with access to a sandboxed Linux environment...',
    tools,
    messages: [{ role: 'user', content: prompt }]
  });

  // 3. Handle tool calls by executing in Firecracker VM
  for (const block of response.content) {
    if (block.type === 'tool_use') {
      const result = await executeToolInVM(vm, block.name, block.input);
      // Send result back to API...
    }
  }
}
```

**Pros:**
- ✅ Works from datacenter IPs
- ✅ Scalable (per-token billing)
- ✅ TOS-compliant
- ✅ Your Firecracker infra still provides isolation

**Cons:**
- ❌ Requires API key (user or platform)
- ❌ More implementation work
- ❌ Not "Claude Code" branding

### Option 2: OpenRouter

**Architecture:**
Use OpenRouter as a unified API gateway that may have different IP reputation.

```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY
});

const response = await client.chat.completions.create({
  model: 'anthropic/claude-3.5-sonnet',
  messages: [{ role: 'user', content: prompt }]
});
```

**Status:** Untested - may still be blocked.

### Option 3: Anthropic Enterprise Agreement

**Path:**
1. Contact Anthropic sales
2. Negotiate enterprise API contract
3. Get IP whitelisting for your servers
4. Proper multi-user support via SSO/SCIM

**URL:** [anthropic.com/enterprise](https://www.anthropic.com/enterprise)

---

## Code Reference

### Key Files and Their Purpose

| File | Purpose |
|------|---------|
| `master-controller/src/index.js` | Express server entry, routes setup |
| `master-controller/src/services/vm-manager.js` | VM lifecycle (create, destroy, clone) |
| `master-controller/src/services/browser-vm-auth.js` | OAuth session management |
| `master-controller/src/services/webrtc-signaling.js` | WebRTC SDP/ICE exchange |
| `master-controller/src/config/index.js` | Environment config (Supabase, Redis, Decodo) |
| `master-controller/vm-browser-agent/server.js` | OAuth agent (runs in VM) |
| `master-controller/scripts/build-golden-snapshot.sh` | VM template builder |
| `src/app/dashboard/remote-cli/page.tsx` | Frontend session management |
| `src/components/WebRTCViewer.tsx` | Video streaming component |

### Database Schema (Supabase)

```sql
-- browser_vms table
CREATE TABLE browser_vms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  session_id UUID NOT NULL,
  vm_id VARCHAR(255),
  ip_address VARCHAR(45),
  status VARCHAR(50) DEFAULT 'pending',
  provider VARCHAR(50),
  oauth_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_browser_vms_user_id ON browser_vms(user_id);
CREATE INDEX idx_browser_vms_session_id ON browser_vms(session_id);
CREATE INDEX idx_browser_vms_status ON browser_vms(status);
```

---

## Infrastructure Details

### VPS Configuration

| Property | Value |
|----------|-------|
| Provider | Hetzner |
| IP | 135.181.138.102 |
| OS | Ubuntu 22.04 |
| CPU | 4 vCPUs |
| RAM | 16 GB |
| Disk | 160 GB NVMe |

### Installed Software

```bash
# Firecracker
firecracker --version  # v1.5.0

# Node.js
node --version  # v18.x

# Dependencies
- dnsmasq
- iptables
- screen
- rsync
- cloud-utils
```

### Directory Structure on VPS

```
/opt/master-controller/       # Master controller application
/var/lib/firecracker/
├── snapshots/
│   └── base/
│       ├── golden-rootfs.ext4  # VM template
│       └── vmlinux             # Linux kernel
├── users/
│   └── vm-{uuid}/             # Per-VM storage
│       ├── rootfs.ext4
│       ├── console.log
│       └── vm-config.json
```

### Environment Variables

```bash
# Master Controller
PORT=4000
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
REDIS_URL=redis://xxx
DECODO_USER=xxx
DECODO_PASSWORD=xxx
DECODO_HOST=dc.decodo.com
DECODO_PORT_START=10001
```

---

## Future Recommendations

### If Continuing Development

1. **Pivot to Anthropic API Architecture**
   - Use API for intelligence
   - Keep Firecracker for execution isolation
   - Implement tool definitions matching Claude Code

2. **Consider OpenAI Codex**
   - Similar tool use capabilities
   - Different IP reputation

3. **Anthropic Enterprise**
   - For production SaaS, get proper agreement
   - IP whitelisting available

### Preserving Current Work

The Firecracker + OAuth agent infrastructure is valuable for:
- Any AI API integration (not just Claude Code CLI)
- Sandboxed code execution
- Multi-tenant isolated environments
- Browser automation tasks

### Components Worth Keeping

| Component | Reusability |
|-----------|-------------|
| VM Manager | ★★★★★ Excellent - works for any workload |
| Golden Rootfs | ★★★★☆ Good - customize for different use cases |
| Master Controller | ★★★★☆ Good - API structure is solid |
| WebRTC Pipeline | ★★★☆☆ Moderate - needs work but foundation is there |
| Frontend | ★★★★☆ Good - session management works |

---

## Appendix: Error Messages Encountered

### ERR_INVALID_IP_ADDRESS
```
Failed to connect to api.anthropic.com: ERR_INVALID_IP_ADDRESS
```
**Cause:** Anthropic blocking proxy/datacenter IPs

### EHOSTUNREACH
```
connect EHOSTUNREACH 192.168.100.X:8080
```
**Cause:** VM not booted yet, health check too early

### IPv6 DNS Issues
```
getaddrinfo ENOTFOUND api.anthropic.com
```
**Cause:** IPv6 preference returning unreachable address
**Fix:** `NODE_OPTIONS="--dns-result-order=ipv4first"`

---

## Conclusion

The Polydev AI platform successfully implements a complete Firecracker-based sandboxing infrastructure with VM orchestration, networking, and monitoring. However, the intended use case (running Claude Code CLI for multiple users) is blocked by Anthropic's IP-based access restrictions.

**The technology is sound. The business model requires pivot.**

The recommended path forward is to use the Anthropic API directly with tool use, keeping Firecracker VMs as execution sandboxes. This provides the same user experience while being compliant with Anthropic's terms of service.

---

*Document generated: December 1, 2025*
