# CLI Remote Tool - Comprehensive System Design

## Executive Summary

**Objective:** Enable users to access premium CLI tools (Claude Code, Codex CLI, Gemini CLI) through their existing subscriptions without local installation, using isolated Firecracker VMs with fixed residential IPs via Decodo proxy.

**Core Innovation:**
- **Two-VM Architecture**: Heavy browser VM (temporary, auth only) + lightweight CLI VM (permanent, execution)
- **Fixed IP per User**: Each user gets dedicated Decodo port (10001+) with consistent residential IP
- **Sub-second Boot**: Golden snapshot + memory resume = <400ms VM startup
- **Maximum Security**: Encrypted credentials at rest, VM isolation, Firecracker jailer
- **API-like Experience**: Users send prompts, receive streaming responses without CLI installation

---

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          POLYDEV FRONTEND (Next.js 15)                   │
│  Dashboard → VM Management → Provider Auth → Prompt Interface → Admin   │
└─────────────────────────────────────────────────────────────────────────┘
                                      ↓ HTTPS
┌─────────────────────────────────────────────────────────────────────────┐
│                     NEXT.JS API ROUTES (Vercel/Self-hosted)              │
│  /api/vm/create  /api/vm/status  /api/auth/start  /api/chat/completions │
└─────────────────────────────────────────────────────────────────────────┘
                                      ↓ HTTP
┌─────────────────────────────────────────────────────────────────────────┐
│                  MASTER CONTROLLER (192.168.5.82:4000)                   │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │ - User Management         - Decodo Port Allocation             │     │
│  │ - VM Lifecycle Control    - Request Routing                    │     │
│  │ - Health Monitoring       - Prometheus Metrics Export          │     │
│  └────────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────┘
                    ↓                                    ↓
    ┌───────────────────────────┐      ┌──────────────────────────────┐
    │   BROWSER VM POOL         │      │    USER CLI VMs              │
    │   (2 vCPU, 2GB RAM)      │      │    (0.5 vCPU, 256MB RAM)    │
    ├───────────────────────────┤      ├──────────────────────────────┤
    │ - Puppeteer/Playwright    │      │ Per-User Isolated VMs:       │
    │ - OAuth automation        │      │ • fc-user-123-xyz            │
    │ - Credential extraction   │      │ • fc-user-456-abc            │
    │ - 2-5 min lifetime        │      │ • fc-user-789-def            │
    │ - 1-2 shared instances    │      │ Each running:                │
    │                           │      │ • streaming-proxy (port 3000)│
    │ Spawned on-demand for:    │      │ • CLI tools (pre-installed)  │
    │ • codex login             │      │ • Encrypted credentials      │
    │ • claude login            │      │ • Decodo proxy config        │
    │ • gemini login            │      └──────────────────────────────┘
    └───────────────────────────┘                      ↓
                                          ┌──────────────────────────────┐
                                          │  DECODO PROXY NETWORK        │
                                          │  dc.decodo.com:10001-10100+  │
                                          │  Fixed IP per port:          │
                                          │  • Port 10001 → 203.45.67.89 │
                                          │  • Port 10002 → 104.28.19.45 │
                                          │  • Port 10003 → 198.51.100.7 │
                                          └──────────────────────────────┘
                                                      ↓
                                          ┌──────────────────────────────┐
                                          │  EXTERNAL AI APIS            │
                                          │  • api.anthropic.com         │
                                          │  • api.openai.com            │
                                          │  • generativelanguage.googleapis.com │
                                          └──────────────────────────────┘
```

---

## 2. Database Schema (Supabase PostgreSQL)

### 2.1 Users Table
```sql
CREATE TABLE users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  supabase_auth_id UUID REFERENCES auth.users(id),

  -- VM Assignment
  vm_id TEXT UNIQUE,                    -- fc-user-123-xyz
  vm_ip TEXT,                           -- 192.168.100.50

  -- Decodo Proxy
  decodo_proxy_port INTEGER UNIQUE,    -- 10001-10100+
  decodo_fixed_ip TEXT,                -- 203.45.67.89 (cached)

  -- Status
  status TEXT NOT NULL DEFAULT 'created',
    -- Possible values: created, authenticating, authenticated, active, hibernated, failed
  subscription_plan TEXT DEFAULT 'free',
    -- Possible values: free, pro, enterprise

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ,
  vm_destroyed_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('created', 'authenticating', 'authenticated', 'active', 'hibernated', 'failed')),
  CONSTRAINT valid_plan CHECK (subscription_plan IN ('free', 'pro', 'enterprise')),
  CONSTRAINT valid_port CHECK (decodo_proxy_port >= 10001)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_vm_id ON users(vm_id);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_last_active ON users(last_active_at);
```

### 2.2 VMs Table
```sql
CREATE TABLE vms (
  vm_id TEXT PRIMARY KEY,               -- fc-user-123-xyz
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,

  -- VM Configuration
  vm_type TEXT NOT NULL,                -- 'browser' or 'cli'
  vcpu_count NUMERIC(3,1),              -- 0.5, 1.0, 2.0
  memory_mb INTEGER,                    -- 256, 512, 2048

  -- Network
  ip_address TEXT,                      -- 192.168.100.50
  tap_device TEXT,                      -- tap-fc-user-123

  -- Status
  status TEXT NOT NULL DEFAULT 'created',
    -- Possible values: creating, running, hibernated, stopping, stopped, failed
  firecracker_pid INTEGER,              -- Process ID
  socket_path TEXT,                     -- /var/lib/firecracker/sockets/fc-user-123.socket

  -- Performance Metrics
  cpu_usage_percent NUMERIC(5,2),
  memory_usage_mb INTEGER,
  last_heartbeat TIMESTAMPTZ,

  -- Lifecycle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  stopped_at TIMESTAMPTZ,
  destroyed_at TIMESTAMPTZ,

  CONSTRAINT valid_vm_type CHECK (vm_type IN ('browser', 'cli')),
  CONSTRAINT valid_vm_status CHECK (status IN ('creating', 'running', 'hibernated', 'stopping', 'stopped', 'failed'))
);

CREATE INDEX idx_vms_user_id ON vms(user_id);
CREATE INDEX idx_vms_status ON vms(status);
CREATE INDEX idx_vms_type ON vms(vm_type);
CREATE INDEX idx_vms_heartbeat ON vms(last_heartbeat);
```

### 2.3 Provider Credentials Table
```sql
CREATE TABLE provider_credentials (
  credential_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,

  -- Provider Info
  provider TEXT NOT NULL,               -- 'claude_code', 'codex_cli', 'gemini_cli'

  -- Encrypted Credentials
  encrypted_data TEXT NOT NULL,         -- AES-256-GCM encrypted JSON
  encryption_iv TEXT NOT NULL,          -- Initialization vector
  encryption_tag TEXT NOT NULL,         -- Authentication tag

  -- Status
  is_valid BOOLEAN DEFAULT true,
  last_verified TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, provider),
  CONSTRAINT valid_provider CHECK (provider IN ('claude_code', 'codex_cli', 'gemini_cli'))
);

CREATE INDEX idx_credentials_user_provider ON provider_credentials(user_id, provider);
CREATE INDEX idx_credentials_expiry ON provider_credentials(expires_at) WHERE is_valid = true;
```

### 2.4 Prompts Table (Usage Tracking)
```sql
CREATE TABLE prompts (
  prompt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  vm_id TEXT REFERENCES vms(vm_id) ON DELETE SET NULL,

  -- Request Details
  provider TEXT NOT NULL,               -- 'claude_code', 'codex_cli', 'gemini_cli'
  prompt_text TEXT NOT NULL,

  -- Response Details
  response_text TEXT,
  response_tokens INTEGER,
  exit_code INTEGER,

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending',
    -- Possible values: pending, streaming, completed, failed, cancelled
  error_message TEXT,

  CONSTRAINT valid_prompt_status CHECK (status IN ('pending', 'streaming', 'completed', 'failed', 'cancelled'))
);

CREATE INDEX idx_prompts_user_id ON prompts(user_id);
CREATE INDEX idx_prompts_started_at ON prompts(started_at);
CREATE INDEX idx_prompts_status ON prompts(status);
CREATE INDEX idx_prompts_provider ON prompts(provider);
```

### 2.5 System Metrics Table (for Admin Portal)
```sql
CREATE TABLE system_metrics (
  metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Resource Usage
  total_vms_running INTEGER,
  browser_vms_active INTEGER,
  cli_vms_active INTEGER,

  cpu_usage_percent NUMERIC(5,2),       -- Mini PC overall CPU
  memory_used_mb INTEGER,               -- Out of 32GB
  memory_available_mb INTEGER,

  -- Decodo Usage
  active_proxy_ports INTEGER[],         -- [10001, 10002, 10005, ...]

  -- Request Stats
  prompts_last_hour INTEGER,
  prompts_today INTEGER,
  failed_prompts_last_hour INTEGER,

  -- Recorded at
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_metrics_time ON system_metrics(recorded_at);
```

### 2.6 Auth Sessions Table (Browser VM tracking)
```sql
CREATE TABLE auth_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,

  -- Browser VM Assignment
  browser_vm_id TEXT REFERENCES vms(vm_id) ON DELETE SET NULL,

  -- Provider
  provider TEXT NOT NULL,

  -- OAuth Flow
  auth_url TEXT,                        -- Captured OAuth URL
  redirect_url TEXT,                    -- Final redirect with token

  -- Status
  status TEXT NOT NULL DEFAULT 'started',
    -- Possible values: started, url_captured, user_authenticating, completed, failed, timeout

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  timeout_at TIMESTAMPTZ,

  -- Error Handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  CONSTRAINT valid_auth_status CHECK (status IN ('started', 'url_captured', 'user_authenticating', 'completed', 'failed', 'timeout'))
);

CREATE INDEX idx_auth_sessions_user ON auth_sessions(user_id);
CREATE INDEX idx_auth_sessions_status ON auth_sessions(status);
CREATE INDEX idx_auth_sessions_started ON auth_sessions(started_at);
```

---

## 3. Master Controller API Specification

**Base URL:** `http://192.168.5.82:4000`

### 3.1 User Management

#### POST /api/users
Create new user and allocate resources.

**Request:**
```json
{
  "email": "user@example.com",
  "subscriptionPlan": "free"
}
```

**Response:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "decodoProxyPort": 10001,
  "decodoFixedIP": "203.45.67.89",
  "status": "created",
  "vmId": "fc-user-123-1733702400",
  "vmIP": "192.168.100.50"
}
```

**Logic:**
1. Allocate next available Decodo port (sequential: 10001, 10002, ...)
2. Test Decodo proxy to get fixed IP
3. Allocate internal VM IP from pool (192.168.100.2-254)
4. Create user record in database
5. Create CLI VM (status: created, not started)

#### GET /api/users/:userId
Get user details.

**Response:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "status": "authenticated",
  "subscriptionPlan": "free",
  "vm": {
    "vmId": "fc-user-123-1733702400",
    "status": "hibernated",
    "ipAddress": "192.168.100.50",
    "uptime": 0,
    "lastHeartbeat": "2025-10-08T02:30:00Z"
  },
  "decodo": {
    "port": 10001,
    "fixedIP": "203.45.67.89"
  },
  "credentials": [
    { "provider": "claude_code", "isValid": true, "lastVerified": "2025-10-08T01:00:00Z" },
    { "provider": "codex_cli", "isValid": true, "lastVerified": "2025-10-08T01:15:00Z" }
  ],
  "usage": {
    "monthlyPromptsUsed": 45,
    "monthlyPromptLimit": 100
  }
}
```

### 3.2 VM Lifecycle

#### POST /api/vms/:userId/create
Create CLI VM for user (called automatically on user creation).

**Response:**
```json
{
  "vmId": "fc-user-123-1733702400",
  "vmIP": "192.168.100.50",
  "status": "created",
  "tapDevice": "tap-fc-user-123",
  "message": "CLI VM created but not started. Will wake on first prompt."
}
```

**Logic:**
1. Call `vm-manager.js` to clone golden snapshot
2. Create TAP device and bridge to fcbr0
3. Generate VM config with encrypted Decodo proxy settings
4. Register VM in database (status: created)
5. Do NOT start Firecracker yet (lazy start on first prompt)

#### POST /api/vms/:userId/start
Manually start/wake hibernated VM.

**Response:**
```json
{
  "vmId": "fc-user-123-1733702400",
  "status": "running",
  "bootTime": "387ms",
  "pid": 12345
}
```

**Logic:**
1. Check if VM already running (return immediately)
2. If hibernated: Resume from snapshot (<400ms)
3. If stopped: Cold boot from snapshot (~2s)
4. Wait for health check (port 3000 responds)
5. Update database with started_at, pid, status

#### POST /api/vms/:userId/stop
Stop/hibernate VM.

**Request:**
```json
{
  "mode": "hibernate"  // or "stop"
}
```

**Response:**
```json
{
  "vmId": "fc-user-123-1733702400",
  "status": "hibernated",
  "message": "VM hibernated. Will resume in <400ms on next request."
}
```

#### GET /api/vms/:userId/status
Get VM status and metrics.

**Response:**
```json
{
  "vmId": "fc-user-123-1733702400",
  "status": "running",
  "uptime": 3600,
  "cpuUsage": 12.5,
  "memoryUsage": 187,
  "lastHeartbeat": "2025-10-08T02:30:45Z",
  "activeStreams": 0
}
```

### 3.3 Authentication Flow

#### POST /api/auth/start
Start CLI tool authentication via browser VM.

**Request:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "provider": "codex_cli"
}
```

**Response:**
```json
{
  "sessionId": "auth-session-abc123",
  "status": "browser_vm_spawning",
  "estimatedTime": "10-15 seconds",
  "message": "Spawning browser VM for OAuth automation..."
}
```

**Logic:**
1. Create auth_session record
2. Check browser VM pool availability
3. Spawn new browser VM (on-demand approach)
4. Return session ID for status polling

#### GET /api/auth/status/:sessionId
Poll authentication status.

**Response (in progress):**
```json
{
  "sessionId": "auth-session-abc123",
  "status": "user_authenticating",
  "authURL": "https://auth.openai.com/oauth/authorize?...",
  "message": "Please complete authentication in the opened browser window",
  "progress": {
    "step": "waiting_for_oauth",
    "steps": ["vm_spawned", "cli_started", "url_captured", "waiting_for_oauth", "credentials_extracted"]
  }
}
```

**Response (completed):**
```json
{
  "sessionId": "auth-session-abc123",
  "status": "completed",
  "provider": "codex_cli",
  "credentialId": "cred-xyz789",
  "isValid": true,
  "completedAt": "2025-10-08T02:31:00Z",
  "message": "Authentication successful! You can now use Codex CLI."
}
```

**Response (failed):**
```json
{
  "sessionId": "auth-session-abc123",
  "status": "failed",
  "error": "OAuth timeout after 120 seconds",
  "retryable": true,
  "message": "Authentication failed. Please try again."
}
```

### 3.4 Prompt Execution

#### POST /api/vms/:userId/stream
Stream prompt to CLI tool with SSE.

**Request:**
```json
{
  "provider": "codex_cli",
  "prompt": "Write a Python function to calculate fibonacci numbers",
  "stream": true
}
```

**Response:** Server-Sent Events stream

```
data: {"type":"vm_status","status":"waking","message":"Waking VM from hibernation..."}

data: {"type":"vm_status","status":"ready","bootTime":"394ms"}

data: {"type":"connected","provider":"codex_cli","sessionId":"prompt-abc123"}

data: {"type":"content","content":"Here's a Python function to calculate Fibonacci numbers:\n\n"}

data: {"type":"content","content":"```python\ndef fibonacci(n):\n"}

data: {"type":"content","content":"    if n <= 1:\n        return n\n"}

data: {"type":"content","content":"    return fibonacci(n-1) + fibonacci(n-2)\n```"}

data: {"type":"complete","sessionId":"prompt-abc123","exitCode":0,"duration":2847}
```

**Logic:**
1. Check user's VM status (hibernate/stopped → wake first)
2. If hibernated: Resume VM (~400ms), show loading indicator
3. Forward request to user's CLI VM (192.168.100.50:3000/stream)
4. Stream response back to frontend via SSE
5. Log prompt to database
6. Start 30min idle timer (hibernate if no new prompts)

#### POST /api/vms/:userId/prompt
Non-streaming prompt execution (wait for full response).

**Request:**
```json
{
  "provider": "claude_code",
  "prompt": "Explain async/await in JavaScript"
}
```

**Response:**
```json
{
  "success": true,
  "provider": "claude_code",
  "output": "Async/await is a modern JavaScript syntax for handling asynchronous operations...",
  "exitCode": 0,
  "duration": 3245,
  "promptId": "550e8400-e29b-41d4-a716-446655440001"
}
```

### 3.5 Admin Endpoints

#### GET /api/admin/stats
System-wide statistics for admin portal.

**Response:**
```json
{
  "system": {
    "totalUsers": 47,
    "activeUsers24h": 23,
    "totalVMs": 49,
    "runningVMs": 12,
    "hibernatedVMs": 35,
    "browserVMsActive": 1,
    "cpuUsage": 34.5,
    "memoryUsed": 18432,
    "memoryTotal": 32768,
    "memoryPercent": 56.25
  },
  "decodo": {
    "activePorts": [10001, 10002, 10005, 10007],
    "totalPortsAllocated": 47,
    "availablePorts": 53
  },
  "prompts": {
    "lastHour": 134,
    "today": 1872,
    "thisMonth": 23456,
    "failedLastHour": 3
  },
  "performance": {
    "avgVMBootTime": 394,
    "avgPromptResponseTime": 2847,
    "authSuccessRate": 97.8
  }
}
```

#### GET /api/admin/users
List all users with pagination.

**Query Params:**
- `page` (default: 1)
- `limit` (default: 50)
- `status` (filter: active, hibernated, failed)
- `search` (email search)

**Response:**
```json
{
  "users": [
    {
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "status": "active",
      "subscriptionPlan": "free",
      "vmId": "fc-user-123-1733702400",
      "vmStatus": "running",
      "decodoPort": 10001,
      "decodoIP": "203.45.67.89",
      "lastActive": "2025-10-08T02:30:00Z",
      "promptsToday": 12,
      "authenticatedProviders": ["claude_code", "codex_cli"]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 47,
    "totalPages": 1
  }
}
```

#### POST /api/admin/users/:userId/restart
Manually restart user's VM.

**Response:**
```json
{
  "vmId": "fc-user-123-1733702400",
  "status": "restarting",
  "message": "VM is being restarted. This may take 5-10 seconds."
}
```

#### POST /api/admin/users/:userId/destroy
Permanently delete user's VM.

**Response:**
```json
{
  "vmId": "fc-user-123-1733702400",
  "status": "destroyed",
  "message": "VM and all associated data permanently deleted."
}
```

#### GET /api/admin/vm/:vmId/console
Get VM console output (last 100 lines).

**Response:**
```json
{
  "vmId": "fc-user-123-1733702400",
  "consoleOutput": "...",
  "lines": 100
}
```

#### GET /metrics
Prometheus metrics endpoint.

**Response:** Prometheus text format
```
# HELP polydev_vms_total Total number of VMs
# TYPE polydev_vms_total gauge
polydev_vms_total{status="running"} 12
polydev_vms_total{status="hibernated"} 35

# HELP polydev_prompts_total Total prompts processed
# TYPE polydev_prompts_total counter
polydev_prompts_total{provider="claude_code"} 8934
polydev_prompts_total{provider="codex_cli"} 7821
polydev_prompts_total{provider="gemini_cli"} 6667

# HELP polydev_cpu_usage CPU usage percentage
# TYPE polydev_cpu_usage gauge
polydev_cpu_usage 34.5

# HELP polydev_memory_bytes Memory usage in bytes
# TYPE polydev_memory_bytes gauge
polydev_memory_bytes{type="used"} 19327352832
polydev_memory_bytes{type="total"} 34359738368
```

---

## 4. Network Architecture

### 4.1 Internal VM Network (fcbr0 Bridge)

```
┌─────────────────────────────────────────────────────────────┐
│ Mini PC (192.168.5.82)                                      │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ fcbr0 Bridge (192.168.100.1/24)                      │  │
│  └──────────────────────────────────────────────────────┘  │
│       │           │            │            │              │
│   ┌───┴───┐   ┌───┴───┐   ┌───┴───┐   ┌───┴───┐         │
│   │ TAP 1 │   │ TAP 2 │   │ TAP 3 │   │ TAP N │         │
│   └───┬───┘   └───┬───┘   └───┬───┘   └───┬───┘         │
│       │           │            │            │              │
│   ┌───▼───┐   ┌───▼───┐   ┌───▼───┐   ┌───▼───┐         │
│   │ VM 1  │   │ VM 2  │   │ VM 3  │   │ VM N  │         │
│   │.100.2 │   │.100.3 │   │.100.4 │   │.100.N │         │
│   └───────┘   └───────┘   └───────┘   └───────┘         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Setup Commands:**
```bash
# Create bridge
sudo ip link add fcbr0 type bridge
sudo ip addr add 192.168.100.1/24 dev fcbr0
sudo ip link set fcbr0 up

# Enable IP forwarding
sudo sysctl -w net.ipv4.ip_forward=1
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf

# NAT for outbound traffic
sudo iptables -t nat -A POSTROUTING -s 192.168.100.0/24 -o eth0 -j MASQUERADE

# Per-VM TAP device creation (done by vm-manager.js)
sudo ip tuntap add tap-fc-user-123 mode tap
sudo ip link set tap-fc-user-123 master fcbr0
sudo ip link set tap-fc-user-123 up
```

### 4.2 Decodo Proxy Integration

**Fixed IP Mapping:**
```bash
# Each port gives SAME IP consistently
curl -U "sp9dso1iga:GjHd8bKd3hizw05qZ=" -x "dc.decodo.com:10001" "https://ip.decodo.com/json"
# → {"ip": "203.45.67.89", ...}  (ALWAYS same IP for port 10001)

curl -U "sp9dso1iga:GjHd8bKd3hizw05qZ=" -x "dc.decodo.com:10002" "https://ip.decodo.com/json"
# → {"ip": "104.28.19.45", ...}  (ALWAYS same IP for port 10002)
```

**Port Allocation Strategy:**
- Sequential assignment: User 1→10001, User 2→10002, User 3→10003
- Track in database: `users.decodo_proxy_port`
- Test proxy on user creation to cache fixed IP
- No bandwidth tracking needed (Decodo manages limits)

**CLI VM Proxy Configuration:**
```javascript
// Inside streaming-proxy-corrected.js (running in CLI VM)
const DECODO_PORT = process.env.DECODO_PROXY_PORT; // e.g., "10001"
const PROXY_URL = `http://sp9dso1iga:GjHd8bKd3hizw05qZ=@dc.decodo.com:${DECODO_PORT}`;

// Apply to all CLI tool spawns
const proc = spawn('codex', [prompt], {
  env: {
    ...process.env,
    HTTP_PROXY: PROXY_URL,
    HTTPS_PROXY: PROXY_URL,
    http_proxy: PROXY_URL,
    https_proxy: PROXY_URL
  }
});
```

**Traffic Flow:**
```
CLI VM (192.168.100.50)
  ↓ spawns: codex "Write Python code"
  ↓ HTTP_PROXY=dc.decodo.com:10001
Decodo Proxy
  ↓ Source IP: 203.45.67.89 (fixed for port 10001)
OpenAI API (api.openai.com)
  ↓ sees request from 203.45.67.89
  ↓ responds
Decodo Proxy
  ↓ forwards response
CLI VM → streaming-proxy → SSE → Frontend
```

### 4.3 Port Mapping Summary

| Service | Port | Access | Purpose |
|---------|------|--------|---------|
| Master Controller | 4000 | External (Next.js) | Main orchestration API |
| Credential Upload Handler | 3002 | Internal | Legacy credential upload (backup auth method) |
| CLI VM Streaming Proxy | 3000 | Internal (Master Controller) | Per-VM prompt execution |
| Prometheus | 9090 | Internal (Grafana) | Metrics collection |
| Grafana | 3001 | External (Admin Portal) | Monitoring dashboards |
| SSH | 22 | External | Remote administration |

---

## 5. Golden Snapshot Build Process

### 5.1 Base VM Creation

**Script: `scripts/build-golden-snapshot.sh`**

```bash
#!/bin/bash
set -e

SNAPSHOT_DIR="/var/lib/firecracker/snapshots/base"
ROOTFS_SIZE="2G"
KERNEL_URL="https://s3.amazonaws.com/spec.ccfc.min/firecracker-ci/v1.13/x86_64/vmlinux-5.10.223"

echo "=== Building Golden Snapshot for CLI Remote Tool ==="

# Step 1: Create directory structure
sudo mkdir -p $SNAPSHOT_DIR
cd $SNAPSHOT_DIR

# Step 2: Download Firecracker kernel
echo "[1/8] Downloading Firecracker kernel..."
wget -O vmlinux $KERNEL_URL

# Step 3: Create root filesystem
echo "[2/8] Creating ext4 root filesystem..."
dd if=/dev/zero of=rootfs.ext4 bs=1M count=2048
mkfs.ext4 rootfs.ext4

# Step 4: Mount and install Ubuntu base
echo "[3/8] Installing Ubuntu minimal base..."
MOUNT_DIR=$(mktemp -d)
sudo mount rootfs.ext4 $MOUNT_DIR

# Use debootstrap for minimal Ubuntu
sudo debootstrap --arch=amd64 --variant=minbase jammy $MOUNT_DIR http://archive.ubuntu.com/ubuntu/

# Step 5: Chroot and install packages
echo "[4/8] Installing Node.js and CLI tools..."
sudo chroot $MOUNT_DIR /bin/bash <<'CHROOT_COMMANDS'
# Update package lists
apt-get update

# Install essentials
apt-get install -y curl wget ca-certificates gnupg

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install Python (for Gemini CLI)
apt-get install -y python3 python3-pip

# Install CLI tools
npm install -g @anthropic-ai/claude-code
npm install -g @openai/codex
npm install -g @google/gemini-cli

# Install networking tools
apt-get install -y iproute2 iptables curl

# Clean up
apt-get clean
rm -rf /var/lib/apt/lists/*

exit
CHROOT_COMMANDS

# Step 6: Copy streaming proxy into VM
echo "[5/8] Installing streaming proxy service..."
sudo mkdir -p $MOUNT_DIR/opt/cli-proxy
sudo cp /opt/firecracker/streaming-proxy-corrected.js $MOUNT_DIR/opt/cli-proxy/
sudo cp /opt/firecracker/package.json $MOUNT_DIR/opt/cli-proxy/

sudo chroot $MOUNT_DIR /bin/bash <<'CHROOT_COMMANDS'
cd /opt/cli-proxy
npm install
exit
CHROOT_COMMANDS

# Step 7: Create systemd service for streaming proxy
echo "[6/8] Creating systemd service..."
sudo cat > $MOUNT_DIR/etc/systemd/system/streaming-proxy.service <<'SERVICE'
[Unit]
Description=CLI Streaming Proxy
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/cli-proxy
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node /opt/cli-proxy/streaming-proxy-corrected.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SERVICE

sudo chroot $MOUNT_DIR systemctl enable streaming-proxy

# Step 8: Unmount
echo "[7/8] Finalizing filesystem..."
sudo umount $MOUNT_DIR
rmdir $MOUNT_DIR

# Step 9: Create memory snapshot
echo "[8/8] Creating memory snapshot..."
# This requires booting the VM once and creating snapshot
# (Manual step - see next section)

echo "=== Golden snapshot base created at $SNAPSHOT_DIR ==="
echo "Next: Boot VM and create memory snapshot"
```

### 5.2 Memory Snapshot Creation

**One-time process to create golden.snap + golden.mem:**

```bash
#!/bin/bash
# Script: create-memory-snapshot.sh

SNAPSHOT_DIR="/var/lib/firecracker/snapshots/base"
SOCKET_PATH="/tmp/firecracker-golden.socket"

# Start Firecracker with golden rootfs
firecracker --api-sock $SOCKET_PATH &
FC_PID=$!

# Configure via API
curl --unix-socket $SOCKET_PATH -X PUT http://localhost/boot-source \
  -d '{
    "kernel_image_path": "'$SNAPSHOT_DIR'/vmlinux",
    "boot_args": "console=ttyS0 reboot=k panic=1 pci=off"
  }'

curl --unix-socket $SOCKET_PATH -X PUT http://localhost/drives/rootfs \
  -d '{
    "drive_id": "rootfs",
    "path_on_host": "'$SNAPSHOT_DIR'/rootfs.ext4",
    "is_root_device": true,
    "is_read_only": false
  }'

curl --unix-socket $SOCKET_PATH -X PUT http://localhost/machine-config \
  -d '{
    "vcpu_count": 1,
    "mem_size_mib": 256
  }'

# Start VM
curl --unix-socket $SOCKET_PATH -X PUT http://localhost/actions \
  -d '{"action_type": "InstanceStart"}'

# Wait for boot (check via serial console)
sleep 10

# Create snapshot
curl --unix-socket $SOCKET_PATH -X PUT http://localhost/snapshot/create \
  -d '{
    "snapshot_type": "Full",
    "snapshot_path": "'$SNAPSHOT_DIR'/golden.snap",
    "mem_file_path": "'$SNAPSHOT_DIR'/golden.mem"
  }'

echo "Golden snapshot created!"
echo "  Snapshot: $SNAPSHOT_DIR/golden.snap"
echo "  Memory:   $SNAPSHOT_DIR/golden.mem"
echo "  Kernel:   $SNAPSHOT_DIR/vmlinux"
echo "  Rootfs:   $SNAPSHOT_DIR/rootfs.ext4"

# Stop Firecracker
kill $FC_PID
```

### 5.3 Per-User VM Creation (vm-manager.js)

**Fast VM spawn using Copy-on-Write:**

```javascript
async cloneSnapshot(vmId) {
  const vmDir = path.join(this.vmsDir, vmId);
  await fs.mkdir(vmDir, { recursive: true });

  // CoW copy of rootfs (instant on btrfs/xfs)
  const goldenRootfs = path.join(this.snapshotsDir, 'base', 'rootfs.ext4');
  const vmRootfs = path.join(vmDir, 'rootfs.ext4');

  await execCommand(`cp --reflink=auto ${goldenRootfs} ${vmRootfs}`);

  return vmDir;
}

async resumeFromSnapshot(vmId, decodoPort, userId) {
  const socketPath = path.join(this.socketDir, `${vmId}.socket`);

  // Start Firecracker with snapshot resume
  const firecracker = spawn('firecracker', [
    '--api-sock', socketPath
  ], { detached: true });

  // Load snapshot via API
  await this.apiCall(socketPath, 'PUT', '/snapshot/load', {
    snapshot_path: this.goldenSnapshot,
    mem_file_path: this.goldenMemory,
    enable_diff_snapshots: true,
    resume_vm: true
  });

  // Inject environment variables via metadata
  await this.apiCall(socketPath, 'PUT', '/mmds', {
    DECODO_PROXY_PORT: decodoPort.toString(),
    USER_ID: userId,
    VM_ID: vmId
  });

  // VM boots in <400ms!
  return { vmId, pid: firecracker.pid, socketPath };
}
```

---

## 6. Browser VM Authentication Flow

### 6.1 Puppeteer Automation Script

**File: `/opt/firecracker/browser-vm-auth.js`**

```javascript
#!/usr/bin/env node
/**
 * Browser VM Authentication Script
 * Runs inside high-resource browser VM to automate CLI OAuth
 */

const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const fs = require('fs').promises;

class BrowserAuthHandler {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  /**
   * Authenticate Codex CLI via automated browser
   */
  async authenticateCodex(userId, targetVMPath) {
    console.log(`[Codex Auth] Starting for user ${userId}`);

    // Launch browser
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });

    this.page = await this.browser.newPage();

    // Spawn codex login in browser VM
    const codexProc = spawn('codex', ['login'], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let authURL = null;

    // Capture OAuth URL
    codexProc.stdout.on('data', async (chunk) => {
      const text = chunk.toString();
      console.log('[Codex]', text);

      const match = text.match(/https:\/\/auth\.openai\.com\/oauth\/authorize[^\s]+/);
      if (match && !authURL) {
        authURL = match[0];
        console.log(`[Codex Auth] Captured URL: ${authURL}`);

        try {
          // Navigate to OAuth URL
          await this.page.goto(authURL, { waitUntil: 'networkidle2' });

          // Wait for redirect to localhost:1455/success
          await this.page.waitForNavigation({
            url: /localhost:1455\/success/,
            timeout: 120000  // 2 min timeout
          });

          // Extract id_token from final URL
          const finalURL = this.page.url();
          console.log(`[Codex Auth] Final URL: ${finalURL}`);

          const tokenMatch = finalURL.match(/id_token=([^&]+)/);
          if (tokenMatch) {
            console.log('[Codex Auth] Token captured successfully!');
          }

          // Credentials now stored in ~/.config/codex/credentials.json
          await this.transferCredentials('codex', targetVMPath);

          await this.browser.close();
          codexProc.kill();

          return {
            success: true,
            provider: 'codex_cli',
            message: 'Authentication completed successfully'
          };

        } catch (error) {
          console.error('[Codex Auth] Error:', error);
          await this.browser.close();
          codexProc.kill();
          throw error;
        }
      }
    });

    codexProc.stderr.on('data', (chunk) => {
      console.error('[Codex Error]', chunk.toString());
    });

    // Wait for process completion
    return new Promise((resolve, reject) => {
      codexProc.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          reject(new Error(`Codex authentication failed: exit code ${code}`));
        }
      });

      // Timeout after 3 minutes
      setTimeout(() => {
        if (this.browser) this.browser.close();
        codexProc.kill();
        reject(new Error('Authentication timeout'));
      }, 180000);
    });
  }

  /**
   * Transfer credentials from browser VM to user's CLI VM
   */
  async transferCredentials(provider, targetVMPath) {
    const credentialPaths = {
      'codex': '~/.config/codex/credentials.json',
      'claude': '~/.config/claude/credentials.json',
      'gemini': '~/.config/gemini/credentials.json'
    };

    const sourcePath = credentialPaths[provider].replace('~', process.env.HOME);
    const targetPath = `${targetVMPath}/.config/${provider}/credentials.json`;

    console.log(`[Transfer] Copying credentials: ${sourcePath} → ${targetPath}`);

    // Read credentials
    const credentials = await fs.readFile(sourcePath, 'utf8');

    // Encrypt before transfer (AES-256-GCM)
    const encrypted = this.encryptCredentials(credentials);

    // Write to target VM's mount point
    await fs.mkdir(`${targetVMPath}/.config/${provider}`, { recursive: true });
    await fs.writeFile(targetPath, JSON.stringify(encrypted));

    console.log('[Transfer] Credentials transferred successfully');
  }

  /**
   * Encrypt credentials before storage
   */
  encryptCredentials(plaintext) {
    const crypto = require('crypto');
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: cipher.getAuthTag().toString('hex'),
      algorithm
    };
  }

  /**
   * Similar methods for Claude Code and Gemini CLI
   */
  async authenticateClaude(userId, targetVMPath) {
    // Similar pattern to authenticateCodex
    // Spawn: claude login
    // Capture: https://auth.anthropic.com/...
    // Wait for redirect: http://localhost:XXXX/success
  }

  async authenticateGemini(userId, targetVMPath) {
    // Similar pattern
    // Spawn: gemini login
    // Capture: https://accounts.google.com/...
    // Wait for redirect: http://localhost:XXXX/success
  }
}

// HTTP API for Master Controller
const http = require('http');
const authHandler = new BrowserAuthHandler();

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/auth/start') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { userId, provider, targetVMPath } = JSON.parse(body);

        let result;
        if (provider === 'codex_cli') {
          result = await authHandler.authenticateCodex(userId, targetVMPath);
        } else if (provider === 'claude_code') {
          result = await authHandler.authenticateClaude(userId, targetVMPath);
        } else if (provider === 'gemini_cli') {
          result = await authHandler.authenticateGemini(userId, targetVMPath);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));

        // Self-terminate browser VM after auth
        setTimeout(() => process.exit(0), 5000);

      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
        setTimeout(() => process.exit(1), 1000);
      }
    });
  }
});

server.listen(3100, () => {
  console.log('[Browser VM] Auth API listening on port 3100');
});
```

### 6.2 Browser VM Lifecycle

**Master Controller Logic:**

```javascript
class BrowserVMManager {
  constructor() {
    this.activeBrowserVMs = new Map(); // sessionId → { vmId, pid, port }
  }

  /**
   * Spawn on-demand browser VM for authentication
   */
  async spawnBrowserVM(sessionId, userId, provider) {
    console.log(`[Browser VM] Spawning for session ${sessionId}`);

    // Create browser VM with high resources
    const vmId = `browser-${sessionId}`;
    const browserVM = await this.createBrowserVM(vmId);

    // Wait for VM to boot (~5-10 seconds cold boot)
    await this.waitForVMReady(browserVM.ip, 3100);

    // Send auth request to browser VM
    const response = await fetch(`http://${browserVM.ip}:3100/auth/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        provider,
        targetVMPath: `/mnt/user-vms/fc-user-${userId}-xyz`
      })
    });

    const result = await response.json();

    // Browser VM will self-terminate after completion
    // (or we kill it after 5 minutes timeout)
    setTimeout(() => {
      this.killBrowserVM(vmId);
    }, 300000);

    return result;
  }

  async createBrowserVM(vmId) {
    // Clone browser-specific golden snapshot (with Chrome/Puppeteer)
    // Allocate: 2 vCPU, 2GB RAM
    // Network: TAP device, internal IP
    // Return: { vmId, ip, pid }
  }

  async killBrowserVM(vmId) {
    // Stop Firecracker process
    // Remove TAP device
    // Delete VM rootfs
    // Clean up socket
  }
}
```

---

## 7. Credential Encryption & Security

### 7.1 Encryption Strategy

**At Rest Encryption (database):**
```javascript
const crypto = require('crypto');

class CredentialEncryption {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.masterKey = process.env.ENCRYPTION_MASTER_KEY; // 32-byte key from .env
  }

  /**
   * Encrypt credentials before database storage
   */
  encrypt(plaintext) {
    const salt = crypto.randomBytes(16);
    const key = crypto.scryptSync(this.masterKey, salt, 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);

    let encrypted = cipher.update(JSON.stringify(plaintext), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      salt: salt.toString('hex')
    };
  }

  /**
   * Decrypt credentials from database
   */
  decrypt(encryptedData) {
    const { encrypted, iv, authTag, salt } = encryptedData;

    const key = crypto.scryptSync(this.masterKey, Buffer.from(salt, 'hex'), 32);
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      key,
      Buffer.from(iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }
}

// Usage in Master Controller
const credentialEncryption = new CredentialEncryption();

// When storing credentials
const plainCredentials = { token: 'sk-...', expires: '2025-12-31' };
const encrypted = credentialEncryption.encrypt(plainCredentials);

await supabase.from('provider_credentials').insert({
  user_id: userId,
  provider: 'codex_cli',
  encrypted_data: encrypted.encrypted,
  encryption_iv: encrypted.iv,
  encryption_tag: encrypted.authTag,
  salt: encrypted.salt
});

// When retrieving credentials
const { data } = await supabase
  .from('provider_credentials')
  .select('*')
  .eq('user_id', userId)
  .eq('provider', 'codex_cli')
  .single();

const decrypted = credentialEncryption.decrypt({
  encrypted: data.encrypted_data,
  iv: data.encryption_iv,
  authTag: data.encryption_tag,
  salt: data.salt
});
```

### 7.2 Firecracker VM Encryption

**VM rootfs encryption using dm-crypt:**

```bash
# Create encrypted rootfs for user VM
ROOTFS_SIZE="2G"
VM_ID="fc-user-123-xyz"
ENCRYPTED_ROOTFS="/var/lib/firecracker/users/${VM_ID}/rootfs.img"

# Create encrypted container
sudo cryptsetup luksFormat $ENCRYPTED_ROOTFS

# Open encrypted container
sudo cryptsetup luksOpen $ENCRYPTED_ROOTFS ${VM_ID}-crypt

# Create filesystem
sudo mkfs.ext4 /dev/mapper/${VM_ID}-crypt

# Copy from golden snapshot
sudo mount /dev/mapper/${VM_ID}-crypt /mnt
sudo cp -a /var/lib/firecracker/snapshots/base/rootfs/* /mnt/
sudo umount /mnt

# Close encrypted container
sudo cryptsetup luksClose ${VM_ID}-crypt
```

**Automatic unlock in vm-manager.js:**
```javascript
async startEncryptedVM(vmId, encryptionKey) {
  const encryptedRootfs = `/var/lib/firecracker/users/${vmId}/rootfs.img`;
  const cryptName = `${vmId}-crypt`;

  // Unlock encrypted rootfs
  await execCommand(`echo ${encryptionKey} | sudo cryptsetup luksOpen ${encryptedRootfs} ${cryptName}`);

  // Start Firecracker with decrypted device
  const config = {
    drives: [{
      drive_id: 'rootfs',
      path_on_host: `/dev/mapper/${cryptName}`,
      is_root_device: true,
      is_read_only: false
    }]
  };

  // ... rest of Firecracker config
}
```

### 7.3 Credential Rotation & Expiry

**Automatic credential validation:**

```javascript
class CredentialValidator {
  /**
   * Check if CLI credentials are still valid
   */
  async validateCredentials(userId, provider) {
    // Get encrypted credentials from database
    const { data } = await supabase
      .from('provider_credentials')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', provider)
      .single();

    if (!data) {
      return { valid: false, reason: 'not_found' };
    }

    // Check expiry
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      await supabase
        .from('provider_credentials')
        .update({ is_valid: false })
        .eq('credential_id', data.credential_id);

      return { valid: false, reason: 'expired' };
    }

    // Test credentials by making API call
    try {
      const decrypted = credentialEncryption.decrypt(data);
      const testResult = await this.testProviderAPI(provider, decrypted);

      if (!testResult.success) {
        await supabase
          .from('provider_credentials')
          .update({ is_valid: false })
          .eq('credential_id', data.credential_id);

        return { valid: false, reason: 'api_rejected' };
      }

      // Update last_verified
      await supabase
        .from('provider_credentials')
        .update({ last_verified: new Date().toISOString() })
        .eq('credential_id', data.credential_id);

      return { valid: true };

    } catch (error) {
      return { valid: false, reason: error.message };
    }
  }

  /**
   * Test credentials against provider API
   */
  async testProviderAPI(provider, credentials) {
    switch (provider) {
      case 'codex_cli':
        // Make test API call to OpenAI
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${credentials.token}` }
        });
        return { success: response.ok };

      case 'claude_code':
        // Test Anthropic API
        // ...

      case 'gemini_cli':
        // Test Google API
        // ...
    }
  }
}

// Cron job: Validate all credentials every 6 hours
setInterval(async () => {
  const { data: allCredentials } = await supabase
    .from('provider_credentials')
    .select('user_id, provider')
    .eq('is_valid', true);

  for (const cred of allCredentials) {
    await credentialValidator.validateCredentials(cred.user_id, cred.provider);
  }
}, 6 * 60 * 60 * 1000);
```

**Handle credential expiry in frontend:**
```typescript
// src/app/api/chat/completions/route.ts

export async function POST(request: NextRequest) {
  const { provider, prompt } = await request.json();
  const user = await getAuthenticatedUser();

  // Validate credentials before executing prompt
  const validation = await validateCredentials(user.id, provider);

  if (!validation.valid) {
    return NextResponse.json({
      error: 'credentials_invalid',
      reason: validation.reason,
      message: 'Please re-authenticate with ' + provider,
      action: 'redirect_to_auth'
    }, { status: 401 });
  }

  // Continue with prompt execution...
}
```

---

## 8. VM Lifecycle Management

### 8.1 Lifecycle States

```
┌─────────────────────────────────────────────────────────────┐
│ VM Lifecycle State Machine                                  │
└─────────────────────────────────────────────────────────────┘

  [User Created]
       │
       ↓
  ┌──────────┐
  │ CREATED  │  (VM allocated but not started)
  └──────────┘
       │
       ↓ First prompt OR manual start
  ┌──────────┐
  │ BOOTING  │  (Resuming from snapshot, ~400ms)
  └──────────┘
       │
       ↓ Health check passes
  ┌──────────┐
  │ RUNNING  │  (Active, accepting prompts)
  └──────────┘
       │
       ├──→ 30 min idle ──→ ┌─────────────┐
       │                     │ HIBERNATED  │  (Suspended, memory saved)
       │                     └─────────────┘
       │                            │
       │                            ↓ New prompt arrives
       │                     ┌──────────┐
       │                     │ WAKING   │  (Resuming, <400ms)
       │                     └──────────┘
       │                            │
       │                            ↓
       │                     Back to RUNNING
       │
       ├──→ Manual stop ──→ ┌──────────┐
       │                     │ STOPPED  │  (Fully stopped, cold boot needed)
       │                     └──────────┘
       │
       ├──→ Crash ──→ ┌──────────┐
       │               │ FAILED   │  (Automatic restart attempt)
       │               └──────────┘
       │                     │
       │                     ↓ Restart
       │               Back to BOOTING
       │
       └──→ 2 weeks inactive ──→ ┌────────────┐
                                  │ DESTROYED  │  (Permanently deleted)
                                  └────────────┘
```

### 8.2 Idle Timeout & Hibernation

**vm-lifecycle-manager.js:**

```javascript
class VMLifecycleManager {
  constructor() {
    this.idleTimers = new Map(); // vmId → setTimeout
    this.IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes
    this.DESTROY_TIMEOUT = 14 * 24 * 60 * 60 * 1000; // 2 weeks
  }

  /**
   * Reset idle timer on activity
   */
  onVMActivity(vmId) {
    // Clear existing timer
    if (this.idleTimers.has(vmId)) {
      clearTimeout(this.idleTimers.get(vmId));
    }

    // Update last_active in database
    await supabase
      .from('users')
      .update({ last_active_at: new Date().toISOString() })
      .eq('vm_id', vmId);

    // Set new idle timer
    const timer = setTimeout(async () => {
      console.log(`[Lifecycle] VM ${vmId} idle for 30 minutes, hibernating...`);
      await this.hibernateVM(vmId);
    }, this.IDLE_TIMEOUT);

    this.idleTimers.set(vmId, timer);
  }

  /**
   * Hibernate VM (save memory state)
   */
  async hibernateVM(vmId) {
    const socketPath = `/var/lib/firecracker/sockets/${vmId}.socket`;

    try {
      // Pause VM and create snapshot
      await this.firecrackerAPI(socketPath, 'PUT', '/snapshot/create', {
        snapshot_type: 'Diff',
        snapshot_path: `/var/lib/firecracker/users/${vmId}/hibernate.snap`,
        mem_file_path: `/var/lib/firecracker/users/${vmId}/hibernate.mem`
      });

      // Stop Firecracker process
      const { data: vm } = await supabase
        .from('vms')
        .select('firecracker_pid')
        .eq('vm_id', vmId)
        .single();

      process.kill(vm.firecracker_pid, 'SIGTERM');

      // Update database
      await supabase
        .from('vms')
        .update({
          status: 'hibernated',
          stopped_at: new Date().toISOString()
        })
        .eq('vm_id', vmId);

      console.log(`[Lifecycle] VM ${vmId} hibernated successfully`);

    } catch (error) {
      console.error(`[Lifecycle] Failed to hibernate ${vmId}:`, error);
      await this.markVMFailed(vmId, error.message);
    }
  }

  /**
   * Wake hibernated VM
   */
  async wakeVM(vmId) {
    console.log(`[Lifecycle] Waking VM ${vmId}...`);
    const startTime = Date.now();

    try {
      const socketPath = `/var/lib/firecracker/sockets/${vmId}.socket`;

      // Start Firecracker
      const firecracker = spawn('firecracker', ['--api-sock', socketPath], {
        detached: true
      });

      // Load hibernate snapshot
      await this.firecrackerAPI(socketPath, 'PUT', '/snapshot/load', {
        snapshot_path: `/var/lib/firecracker/users/${vmId}/hibernate.snap`,
        mem_file_path: `/var/lib/firecracker/users/${vmId}/hibernate.mem`,
        resume_vm: true
      });

      const wakeTime = Date.now() - startTime;
      console.log(`[Lifecycle] VM ${vmId} woke in ${wakeTime}ms`);

      // Update database
      await supabase
        .from('vms')
        .update({
          status: 'running',
          started_at: new Date().toISOString(),
          firecracker_pid: firecracker.pid
        })
        .eq('vm_id', vmId);

      // Restart idle timer
      this.onVMActivity(vmId);

      return { success: true, wakeTime };

    } catch (error) {
      console.error(`[Lifecycle] Failed to wake ${vmId}:`, error);
      throw error;
    }
  }

  /**
   * Crash recovery
   */
  async onVMCrash(vmId, error) {
    console.error(`[Lifecycle] VM ${vmId} crashed:`, error);

    // Update status
    await supabase
      .from('vms')
      .update({ status: 'failed' })
      .eq('vm_id', vmId);

    // Automatic restart (one attempt)
    try {
      console.log(`[Lifecycle] Attempting automatic restart of ${vmId}...`);

      // Cold boot from golden snapshot
      await this.coldBootVM(vmId);

      console.log(`[Lifecycle] VM ${vmId} restarted successfully`);

      // Notify frontend via WebSocket
      await this.notifyFrontend(vmId, {
        type: 'vm_recovered',
        message: 'Your VM encountered an issue and has been automatically restarted.'
      });

    } catch (restartError) {
      console.error(`[Lifecycle] Failed to restart ${vmId}:`, restartError);

      // Notify user
      await this.notifyFrontend(vmId, {
        type: 'vm_restart_failed',
        message: 'Your VM is currently unavailable. Please contact support.',
        action: 'show_error_banner'
      });
    }
  }

  /**
   * Destroy inactive VMs (2 week cleanup)
   */
  async cleanupInactiveVMs() {
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const { data: inactiveUsers } = await supabase
      .from('users')
      .select('user_id, vm_id, email')
      .lt('last_active_at', twoWeeksAgo.toISOString())
      .not('vm_id', 'is', null);

    for (const user of inactiveUsers) {
      console.log(`[Lifecycle] Destroying inactive VM: ${user.vm_id} (user: ${user.email})`);

      try {
        // Stop VM if running
        await this.stopVM(user.vm_id);

        // Delete VM files
        await execCommand(`sudo rm -rf /var/lib/firecracker/users/${user.vm_id}`);

        // Update database
        await supabase
          .from('vms')
          .update({
            status: 'destroyed',
            destroyed_at: new Date().toISOString()
          })
          .eq('vm_id', user.vm_id);

        await supabase
          .from('users')
          .update({
            vm_id: null,
            vm_destroyed_at: new Date().toISOString(),
            status: 'vm_destroyed'
          })
          .eq('user_id', user.user_id);

        // Send email notification
        await this.sendEmail(user.email, {
          subject: 'Your Polydev VM has been removed',
          body: 'Due to 2 weeks of inactivity, your VM has been destroyed. You can create a new one anytime from your dashboard.'
        });

      } catch (error) {
        console.error(`[Lifecycle] Failed to destroy ${user.vm_id}:`, error);
      }
    }
  }
}

// Cron job: Run cleanup daily at 3 AM
const cron = require('node-cron');
const lifecycleManager = new VMLifecycleManager();

cron.schedule('0 3 * * *', async () => {
  console.log('[Lifecycle] Running daily VM cleanup...');
  await lifecycleManager.cleanupInactiveVMs();
});
```

---

## 9. Admin Portal Features

### 9.1 Dashboard Overview

**Component: `src/app/dashboard/admin/page.tsx`**

```typescript
// Real-time system stats
interface AdminDashboardStats {
  system: {
    totalUsers: number;
    activeUsers24h: number;
    totalVMs: number;
    runningVMs: number;
    hibernatedVMs: number;
    browserVMsActive: number;
    cpuUsage: number;
    memoryUsed: number;
    memoryTotal: number;
    memoryPercent: number;
  };
  decodo: {
    activePorts: number[];
    totalPortsAllocated: number;
    availablePorts: number;
  };
  prompts: {
    lastHour: number;
    today: number;
    thisMonth: number;
    failedLastHour: number;
  };
  performance: {
    avgVMBootTime: number;
    avgPromptResponseTime: number;
    authSuccessRate: number;
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);

  useEffect(() => {
    // Fetch stats every 10 seconds
    const fetchStats = async () => {
      const response = await fetch('/api/admin/stats');
      const data = await response.json();
      setStats(data);
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!stats) return <LoadingSpinner />;

  return (
    <div className="admin-dashboard">
      {/* System Resources */}
      <div className="stats-grid">
        <StatCard
          title="CPU Usage"
          value={`${stats.system.cpuUsage.toFixed(1)}%`}
          icon={<CpuIcon />}
          trend={stats.system.cpuUsage > 80 ? 'warning' : 'normal'}
        />
        <StatCard
          title="Memory Usage"
          value={`${stats.system.memoryPercent.toFixed(1)}%`}
          subtitle={`${(stats.system.memoryUsed / 1024).toFixed(1)} / ${(stats.system.memoryTotal / 1024).toFixed(1)} GB`}
          icon={<MemoryIcon />}
          trend={stats.system.memoryPercent > 90 ? 'critical' : 'normal'}
        />
        <StatCard
          title="Active VMs"
          value={stats.system.runningVMs}
          subtitle={`${stats.system.hibernatedVMs} hibernated`}
          icon={<ServerIcon />}
        />
        <StatCard
          title="Active Users (24h)"
          value={stats.system.activeUsers24h}
          subtitle={`${stats.system.totalUsers} total`}
          icon={<UsersIcon />}
        />
      </div>

      {/* Prompts Statistics */}
      <div className="prompts-chart">
        <h3>Prompt Activity</h3>
        <TimeSeriesChart
          data={[
            { label: 'Last Hour', value: stats.prompts.lastHour },
            { label: 'Today', value: stats.prompts.today },
            { label: 'This Month', value: stats.prompts.thisMonth }
          ]}
        />
        {stats.prompts.failedLastHour > 0 && (
          <Alert severity="warning">
            {stats.prompts.failedLastHour} failed prompts in the last hour
          </Alert>
        )}
      </div>

      {/* Decodo Proxy Status */}
      <div className="decodo-status">
        <h3>Decodo Proxy Network</h3>
        <p>Active Ports: {stats.decodo.activePorts.length} / {stats.decodo.totalPortsAllocated}</p>
        <p>Available: {stats.decodo.availablePorts} ports</p>
        <PortAllocationChart activePorts={stats.decodo.activePorts} />
      </div>

      {/* Performance Metrics */}
      <div className="performance-grid">
        <MetricCard
          title="Avg VM Boot Time"
          value={`${stats.performance.avgVMBootTime}ms`}
          target="< 500ms"
          status={stats.performance.avgVMBootTime < 500 ? 'good' : 'degraded'}
        />
        <MetricCard
          title="Avg Prompt Response"
          value={`${(stats.performance.avgPromptResponseTime / 1000).toFixed(2)}s`}
          target="< 5s"
          status={stats.performance.avgPromptResponseTime < 5000 ? 'good' : 'degraded'}
        />
        <MetricCard
          title="Auth Success Rate"
          value={`${stats.performance.authSuccessRate.toFixed(1)}%`}
          target="> 95%"
          status={stats.performance.authSuccessRate > 95 ? 'good' : 'needs_attention'}
        />
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <Button onClick={() => navigate('/admin/users')}>
          Manage Users
        </Button>
        <Button onClick={() => navigate('/admin/vms')}>
          VM Monitor
        </Button>
        <Button onClick={() => navigate('/admin/logs')}>
          System Logs
        </Button>
        <Button onClick={() => window.open('http://192.168.5.82:3001', '_blank')}>
          Open Grafana
        </Button>
      </div>
    </div>
  );
}
```

### 9.2 User Management Interface

**Component: `src/app/dashboard/admin/users/page.tsx`**

```typescript
interface AdminUser {
  userId: string;
  email: string;
  status: string;
  subscriptionPlan: string;
  vmId: string;
  vmStatus: string;
  decodoPort: number;
  decodoIP: string;
  lastActive: string;
  promptsToday: number;
  authenticatedProviders: string[];
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchUsers = async () => {
    const response = await fetch(`/api/admin/users?search=${searchTerm}&status=${statusFilter}`);
    const data = await response.json();
    setUsers(data.users);
  };

  const handleRestartVM = async (userId: string) => {
    if (confirm('Are you sure you want to restart this VM?')) {
      await fetch(`/api/admin/users/${userId}/restart`, { method: 'POST' });
      await fetchUsers();
      toast.success('VM restart initiated');
    }
  };

  const handleDestroyVM = async (userId: string) => {
    const confirmed = prompt('Type "DESTROY" to confirm VM deletion:');
    if (confirmed === 'DESTROY') {
      await fetch(`/api/admin/users/${userId}/destroy`, { method: 'POST' });
      await fetchUsers();
      toast.success('VM destroyed');
    }
  };

  return (
    <div className="admin-users">
      <div className="filters">
        <input
          type="text"
          placeholder="Search by email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="hibernated">Hibernated</option>
          <option value="failed">Failed</option>
        </select>
        <button onClick={fetchUsers}>Search</button>
      </div>

      <table className="users-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Status</th>
            <th>Plan</th>
            <th>VM Status</th>
            <th>Decodo Port/IP</th>
            <th>Providers</th>
            <th>Last Active</th>
            <th>Prompts Today</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.userId}>
              <td>{user.email}</td>
              <td>
                <StatusBadge status={user.status} />
              </td>
              <td>{user.subscriptionPlan}</td>
              <td>
                <VMStatusBadge status={user.vmStatus} />
              </td>
              <td>
                {user.decodoPort} <br />
                <code>{user.decodoIP}</code>
              </td>
              <td>
                {user.authenticatedProviders.map((p) => (
                  <ProviderBadge key={p} provider={p} />
                ))}
              </td>
              <td>{formatRelativeTime(user.lastActive)}</td>
              <td>{user.promptsToday}</td>
              <td>
                <DropdownMenu>
                  <MenuItem onClick={() => navigate(`/admin/users/${user.userId}`)}>
                    View Details
                  </MenuItem>
                  <MenuItem onClick={() => handleRestartVM(user.userId)}>
                    Restart VM
                  </MenuItem>
                  <MenuItem onClick={() => window.open(`/api/admin/vm/${user.vmId}/console`)}>
                    View Console
                  </MenuItem>
                  <MenuItem onClick={() => handleDestroyVM(user.userId)} danger>
                    Destroy VM
                  </MenuItem>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### 9.3 VM Monitor (Real-time)

**Component: `src/app/dashboard/admin/vms/page.tsx`**

```typescript
export default function AdminVMMonitor() {
  const [vms, setVMs] = useState([]);

  useEffect(() => {
    // WebSocket connection for real-time updates
    const ws = new WebSocket('ws://192.168.5.82:4000/ws/admin/vms');

    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      setVMs((prev) => {
        const index = prev.findIndex((vm) => vm.vmId === update.vmId);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = { ...updated[index], ...update };
          return updated;
        }
        return [...prev, update];
      });
    };

    return () => ws.close();
  }, []);

  return (
    <div className="vm-monitor">
      <h2>Live VM Monitor</h2>

      <div className="vm-grid">
        {vms.map((vm) => (
          <VMCard key={vm.vmId} vm={vm}>
            <div className="vm-header">
              <h3>{vm.vmId}</h3>
              <StatusDot status={vm.status} />
            </div>

            <div className="vm-metrics">
              <Metric label="CPU" value={`${vm.cpuUsage}%`} />
              <Metric label="Memory" value={`${vm.memoryUsage} MB`} />
              <Metric label="Uptime" value={formatUptime(vm.uptime)} />
            </div>

            <div className="vm-network">
              <p>Internal IP: {vm.ipAddress}</p>
              <p>Decodo Port: {vm.decodoPort}</p>
            </div>

            {vm.activeStreams > 0 && (
              <div className="active-streams">
                <StreamIcon />
                {vm.activeStreams} active prompt(s)
              </div>
            )}

            <div className="vm-actions">
              <Button onClick={() => restartVM(vm.vmId)} size="sm">
                Restart
              </Button>
              <Button onClick={() => viewConsole(vm.vmId)} size="sm" variant="outline">
                Console
              </Button>
            </div>
          </VMCard>
        ))}
      </div>
    </div>
  );
}
```

### 9.4 Grafana Integration

**Prometheus Exporter in Master Controller:**

```javascript
const promClient = require('prom-client');

class PrometheusExporter {
  constructor() {
    this.register = new promClient.Registry();

    // System metrics
    this.cpuGauge = new promClient.Gauge({
      name: 'polydev_cpu_usage_percent',
      help: 'CPU usage percentage',
      registers: [this.register]
    });

    this.memoryGauge = new promClient.Gauge({
      name: 'polydev_memory_bytes',
      help: 'Memory usage in bytes',
      labelNames: ['type'],
      registers: [this.register]
    });

    this.vmsGauge = new promClient.Gauge({
      name: 'polydev_vms_total',
      help: 'Total number of VMs',
      labelNames: ['status', 'type'],
      registers: [this.register]
    });

    this.promptsCounter = new promClient.Counter({
      name: 'polydev_prompts_total',
      help: 'Total prompts processed',
      labelNames: ['provider', 'status'],
      registers: [this.register]
    });

    this.promptDurationHistogram = new promClient.Histogram({
      name: 'polydev_prompt_duration_seconds',
      help: 'Prompt execution duration',
      labelNames: ['provider'],
      buckets: [0.5, 1, 2, 5, 10, 30],
      registers: [this.register]
    });

    this.vmBootTimeHistogram = new promClient.Histogram({
      name: 'polydev_vm_boot_time_seconds',
      help: 'VM boot time',
      labelNames: ['type'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
      registers: [this.register]
    });

    // Start collecting
    this.collectMetrics();
    setInterval(() => this.collectMetrics(), 10000); // Every 10 seconds
  }

  async collectMetrics() {
    // CPU usage
    const cpuUsage = await this.getCPUUsage();
    this.cpuGauge.set(cpuUsage);

    // Memory usage
    const memStats = await this.getMemoryStats();
    this.memoryGauge.set({ type: 'used' }, memStats.used);
    this.memoryGauge.set({ type: 'total' }, memStats.total);

    // VM counts
    const vmCounts = await this.getVMCounts();
    this.vmsGauge.set({ status: 'running', type: 'cli' }, vmCounts.runningCLI);
    this.vmsGauge.set({ status: 'running', type: 'browser' }, vmCounts.runningBrowser);
    this.vmsGauge.set({ status: 'hibernated', type: 'cli' }, vmCounts.hibernated);
  }

  async getMetrics() {
    return this.register.metrics();
  }
}

// Expose /metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await prometheusExporter.getMetrics());
});
```

**Grafana Dashboard JSON:**
```json
{
  "dashboard": {
    "title": "Polydev CLI Remote Tool",
    "panels": [
      {
        "title": "System Resources",
        "targets": [
          {
            "expr": "polydev_cpu_usage_percent",
            "legendFormat": "CPU Usage"
          },
          {
            "expr": "polydev_memory_bytes{type=\"used\"} / polydev_memory_bytes{type=\"total\"} * 100",
            "legendFormat": "Memory Usage %"
          }
        ]
      },
      {
        "title": "Active VMs",
        "targets": [
          {
            "expr": "polydev_vms_total{status=\"running\",type=\"cli\"}",
            "legendFormat": "Running CLI VMs"
          },
          {
            "expr": "polydev_vms_total{status=\"running\",type=\"browser\"}",
            "legendFormat": "Running Browser VMs"
          },
          {
            "expr": "polydev_vms_total{status=\"hibernated\"}",
            "legendFormat": "Hibernated VMs"
          }
        ]
      },
      {
        "title": "Prompt Volume",
        "targets": [
          {
            "expr": "rate(polydev_prompts_total[5m])",
            "legendFormat": "{{provider}}"
          }
        ]
      },
      {
        "title": "Prompt Duration (p95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(polydev_prompt_duration_seconds_bucket[5m]))",
            "legendFormat": "{{provider}}"
          }
        ]
      },
      {
        "title": "VM Boot Time",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(polydev_vm_boot_time_seconds_bucket[5m]))",
            "legendFormat": "{{type}}"
          }
        ]
      }
    ]
  }
}
```

---

## 10. Frontend User Experience

### 10.1 Loading States & Indicators

**Global Loading Context:**

```typescript
// src/contexts/LoadingContext.tsx
export const LoadingContext = createContext({
  isLoading: false,
  loadingMessage: '',
  setLoading: (loading: boolean, message?: string) => {}
});

export function LoadingProvider({ children }) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const setLoading = (loading: boolean, message = '') => {
    setIsLoading(loading);
    setLoadingMessage(message);
  };

  return (
    <LoadingContext.Provider value={{ isLoading, loadingMessage, setLoading }}>
      {children}
      {isLoading && (
        <div className="global-loading-overlay">
          <div className="loading-spinner" />
          <p>{loadingMessage}</p>
        </div>
      )}
    </LoadingContext.Provider>
  );
}
```

**Prompt Execution with Loading:**

```typescript
// src/components/PromptInterface.tsx
export function PromptInterface() {
  const { setLoading } = useContext(LoadingContext);
  const [response, setResponse] = useState('');

  const handleSubmitPrompt = async (prompt: string, provider: string) => {
    setLoading(true, 'Waking your VM...');

    try {
      const eventSource = new EventSource(
        `/api/chat/completions?provider=${provider}&prompt=${encodeURIComponent(prompt)}`
      );

      eventSource.addEventListener('message', (event) => {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'vm_status':
            if (data.status === 'waking') {
              setLoading(true, `Waking VM from hibernation... (${data.bootTime || '~400ms'})`);
            } else if (data.status === 'ready') {
              setLoading(true, 'VM ready, executing prompt...');
            }
            break;

          case 'connected':
            setLoading(false);
            setResponse(''); // Clear previous response
            break;

          case 'content':
            setResponse((prev) => prev + data.content);
            break;

          case 'complete':
            setLoading(false);
            toast.success(`Completed in ${(data.duration / 1000).toFixed(2)}s`);
            eventSource.close();
            break;

          case 'error':
            setLoading(false);
            toast.error(data.error);
            eventSource.close();
            break;
        }
      });

      eventSource.onerror = () => {
        setLoading(false);
        toast.error('Connection lost. Please try again.');
        eventSource.close();
      };

    } catch (error) {
      setLoading(false);
      toast.error('Failed to execute prompt');
    }
  };

  return (
    <div className="prompt-interface">
      <textarea
        placeholder="Enter your prompt..."
        value={promptText}
        onChange={(e) => setPromptText(e.target.value)}
        disabled={isLoading}
      />
      <button
        onClick={() => handleSubmitPrompt(promptText, selectedProvider)}
        disabled={isLoading}
      >
        {isLoading ? 'Processing...' : 'Submit'}
      </button>

      {response && (
        <div className="response-container">
          <ReactMarkdown>{response}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
```

### 10.2 Error Handling & Recovery

**Crash Recovery UI:**

```typescript
// src/components/VMErrorBanner.tsx
export function VMErrorBanner() {
  const [vmStatus, setVMStatus] = useState('healthy');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // WebSocket for real-time VM status
    const ws = new WebSocket(`wss://${window.location.host}/ws/vm-status`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'vm_recovered') {
        setVMStatus('recovered');
        setErrorMessage(data.message);
        setTimeout(() => setVMStatus('healthy'), 10000); // Clear after 10s
      } else if (data.type === 'vm_restart_failed') {
        setVMStatus('failed');
        setErrorMessage(data.message);
      }
    };

    return () => ws.close();
  }, []);

  if (vmStatus === 'healthy') return null;

  return (
    <div className={`error-banner ${vmStatus}`}>
      <div className="error-content">
        <AlertIcon />
        <div>
          <h4>
            {vmStatus === 'recovered' ? 'VM Recovered' : 'VM Error'}
          </h4>
          <p>{errorMessage}</p>
        </div>
      </div>

      {vmStatus === 'failed' && (
        <div className="error-actions">
          <Button onClick={handleManualRestart} variant="primary">
            Restart VM
          </Button>
          <Button onClick={handleContactSupport} variant="outline">
            Contact Support
          </Button>
        </div>
      )}
    </div>
  );
}
```

---

## 11. Deployment & Operations

### 11.1 Master Controller Deployment

**Systemd service file: `/etc/systemd/system/polydev-master-controller.service`**

```ini
[Unit]
Description=Polydev Master Controller
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/polydev-master-controller
Environment="NODE_ENV=production"
Environment="PORT=4000"
EnvironmentFile=/opt/polydev-master-controller/.env
ExecStart=/usr/bin/node /opt/polydev-master-controller/server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Security
PrivateTmp=true
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
```

**Environment file: `/opt/polydev-master-controller/.env`**

```bash
# Database
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

# Encryption
ENCRYPTION_MASTER_KEY=<32-byte-hex-key>

# Decodo Proxy
DECODO_USER=sp9dso1iga
DECODO_PASSWORD=GjHd8bKd3hizw05qZ=
DECODO_HOST=dc.decodo.com
DECODO_PORT_START=10001
DECODO_PORT_END=10100

# Firecracker
FIRECRACKER_BASE=/var/lib/firecracker
GOLDEN_SNAPSHOT=/var/lib/firecracker/snapshots/base/golden.snap

# Network
INTERNAL_NETWORK=192.168.100.0/24
BRIDGE_DEVICE=fcbr0

# Performance
VM_IDLE_TIMEOUT=1800000          # 30 minutes
VM_DESTROY_TIMEOUT=1209600000    # 2 weeks
MAX_CONCURRENT_VMS=180
```

**Start service:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable polydev-master-controller
sudo systemctl start polydev-master-controller
sudo systemctl status polydev-master-controller
```

### 11.2 Prometheus + Grafana Setup

**docker-compose.yml for monitoring:**

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: polydev-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: polydev-grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_INSTALL_PLUGINS=grafana-clock-panel
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana-dashboards:/etc/grafana/provisioning/dashboards
    depends_on:
      - prometheus
    restart: unless-stopped

volumes:
  prometheus-data:
  grafana-data:
```

**prometheus.yml:**
```yaml
global:
  scrape_interval: 10s
  evaluation_interval: 10s

scrape_configs:
  - job_name: 'polydev-master-controller'
    static_configs:
      - targets: ['192.168.5.82:4000']
    metrics_path: '/metrics'
```

### 11.3 Backup & Disaster Recovery

**Daily backup script:**

```bash
#!/bin/bash
# /opt/polydev-master-controller/backup.sh

BACKUP_DIR="/mnt/backups/polydev"
DATE=$(date +%Y%m%d)

# Backup Supabase database (via pg_dump)
PGPASSWORD=$DB_PASSWORD pg_dump -h $DB_HOST -U $DB_USER -d polydev \
  > $BACKUP_DIR/db-$DATE.sql

# Backup VM snapshots (incremental)
rsync -av --delete /var/lib/firecracker/users/ $BACKUP_DIR/vm-users-$DATE/

# Backup credentials encryption keys
cp /opt/polydev-master-controller/.env $BACKUP_DIR/env-$DATE.bak

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -type f -mtime +30 -delete

echo "Backup completed: $DATE"
```

**Cron job:**
```bash
0 2 * * * /opt/polydev-master-controller/backup.sh >> /var/log/polydev-backup.log 2>&1
```

---

## 12. Security Hardening

### 12.1 Firecracker Jailer

**Use jailer for VM isolation:**

```bash
# Instead of running Firecracker directly, use jailer
sudo jailer \
  --id fc-user-123-xyz \
  --exec-file /usr/bin/firecracker \
  --uid 1000 \
  --gid 1000 \
  --chroot-base-dir /var/lib/firecracker/jail \
  --netns /var/run/netns/fc-user-123 \
  -- \
  --api-sock /run/firecracker.socket \
  --config-file /config.json
```

**Benefits:**
- Process runs as non-root user
- Chroot isolation
- Network namespace isolation
- cgroup resource limits

### 12.2 Network Isolation

**Create separate network namespace per VM:**

```bash
# Create network namespace
sudo ip netns add fc-user-123

# Create veth pair
sudo ip link add veth-host-123 type veth peer name veth-vm-123

# Move VM end into namespace
sudo ip link set veth-vm-123 netns fc-user-123

# Configure
sudo ip addr add 192.168.100.1/24 dev veth-host-123
sudo ip link set veth-host-123 up

sudo ip netns exec fc-user-123 ip addr add 192.168.100.50/24 dev veth-vm-123
sudo ip netns exec fc-user-123 ip link set veth-vm-123 up
sudo ip netns exec fc-user-123 ip route add default via 192.168.100.1
```

### 12.3 Rate Limiting

**Prevent abuse:**

```javascript
const rateLimit = require('express-rate-limit');

// Global rate limit
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later.'
}));

// Per-user prompt rate limit
const promptLimiter = new Map(); // userId → { count, resetAt }

async function checkPromptLimit(userId, subscriptionPlan) {
  const limits = {
    free: { perHour: 20, perDay: 100 },
    pro: { perHour: 100, perDay: 1000 },
    enterprise: { perHour: Infinity, perDay: Infinity }
  };

  const userLimit = limits[subscriptionPlan];

  // Check hourly
  const hourlyCount = await getPromptCount(userId, '1 hour');
  if (hourlyCount >= userLimit.perHour) {
    throw new Error('Hourly prompt limit exceeded');
  }

  // Check daily
  const dailyCount = await getPromptCount(userId, '1 day');
  if (dailyCount >= userLimit.perDay) {
    throw new Error('Daily prompt limit exceeded');
  }
}
```

---

## 13. Monitoring & Alerts

### 13.1 Alert Rules

**Prometheus alert rules:**

```yaml
# /etc/prometheus/rules.yml
groups:
  - name: polydev_alerts
    interval: 30s
    rules:
      - alert: HighCPUUsage
        expr: polydev_cpu_usage_percent > 90
        for: 5m
        annotations:
          summary: "High CPU usage detected"
          description: "CPU usage is {{ $value }}%"

      - alert: HighMemoryUsage
        expr: (polydev_memory_bytes{type="used"} / polydev_memory_bytes{type="total"}) > 0.95
        for: 5m
        annotations:
          summary: "High memory usage detected"
          description: "Memory usage is {{ $value | humanizePercentage }}"

      - alert: VMBootTimeDegraded
        expr: histogram_quantile(0.95, rate(polydev_vm_boot_time_seconds_bucket[5m])) > 1
        for: 10m
        annotations:
          summary: "VM boot time degraded"
          description: "P95 boot time is {{ $value }}s (target: <0.5s)"

      - alert: HighPromptFailureRate
        expr: rate(polydev_prompts_total{status="failed"}[5m]) > 0.1
        for: 5m
        annotations:
          summary: "High prompt failure rate"
          description: "{{ $value }} failed prompts per second"

      - alert: VMCrashRate
        expr: rate(polydev_vms_total{status="failed"}[10m]) > 0.05
        for: 5m
        annotations:
          summary: "High VM crash rate"
          description: "VMs are crashing frequently"
```

### 13.2 Logging

**Structured logging with Winston:**

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: '/var/log/polydev/error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: '/var/log/polydev/combined.log'
    }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Usage
logger.info('VM created', {
  vmId: 'fc-user-123-xyz',
  userId: 'user-123',
  decodoPort: 10001
});

logger.error('VM boot failed', {
  vmId: 'fc-user-123-xyz',
  error: error.message,
  stack: error.stack
});
```

---

## Summary & Next Steps

This comprehensive design document covers:

✅ **Complete Architecture** - Two-VM approach (browser + CLI), Decodo fixed IP integration
✅ **Database Schema** - All tables with indexes, constraints, relationships
✅ **API Specifications** - Master Controller endpoints for all operations
✅ **Network Design** - Internal bridge, Decodo proxy, TAP devices
✅ **Golden Snapshot** - Build process from scratch with all CLI tools
✅ **Authentication Flow** - Puppeteer browser automation for OAuth
✅ **Credential Security** - AES-256-GCM encryption, Firecracker encryption, rotation
✅ **VM Lifecycle** - Hibernation, crash recovery, 2-week cleanup
✅ **Admin Portal** - Real-time monitoring, user management, VM control
✅ **Frontend UX** - Loading states, error handling, SSE streaming
✅ **Deployment** - Systemd services, Prometheus/Grafana, backups
✅ **Security** - Jailer isolation, network namespaces, rate limiting

**Ready to proceed with implementation?**

I can now:
1. Implement the Master Controller service
2. Create the golden snapshot build scripts
3. Build the browser VM authentication handler
4. Set up Prometheus/Grafana monitoring
5. Develop admin portal components
6. Configure network infrastructure

Please confirm if this design meets your requirements or if you need any clarifications!
