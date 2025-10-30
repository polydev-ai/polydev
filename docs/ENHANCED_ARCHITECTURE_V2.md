# Polydev AI - Enhanced Architecture V2
**Zero-Knowledge, High-Performance OAuth & Chat System**

---

## Executive Summary

**Status**: NOT LIVE - Complete greenfield rebuild
**Goal**: Production-ready, enterprise-grade OAuth + chat system with end-to-end encryption
**Timeline**: Implement immediately, auto-deploy on every commit
**Key Principle**: **WE CANNOT SEE USER DATA** (Like ChatGPT Enterprise / Claude Enterprise)

---

## Critical Requirements (Non-Negotiable)

### 1. Zero-Knowledge Encryption
```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Browser   │ ──TLS──▶│ Control Plane│ ──TLS──▶│  Providers  │
│             │         │              │         │ (OpenAI etc)│
│ User's Key  │         │ Encrypted    │         │             │
│ (only here) │         │ Blobs Only   │         │             │
└─────────────┘         └──────────────┘         └─────────────┘
```

**Encryption Model**:
- **Client-side key generation**: User's master key generated in browser, NEVER sent to server
- **In-transit**: TLS 1.3 for all connections (Control Plane ↔ Browser, Control Plane ↔ Providers)
- **At-rest**: All user data encrypted with user's key before storage in Supabase
  - Provider tokens: Encrypted with user's master key
  - Chat messages: Encrypted with user's master key
  - Prompts & responses: Encrypted end-to-end
- **Server role**: Encrypted blob storage ONLY - cannot decrypt
- **Decryption locations**:
  - Browser: For displaying chat history
  - Ephemeral containers: User's key injected at runtime, memory-only, wiped on exit

### 2. Auto-Deploy Everything
- **Trigger**: Every commit to `main` branch
- **Target**: Hetzner VPS (135.181.138.102)
- **Scope**: Master controller, containers, VM images, database migrations
- **Verification**: Health checks, rollback on failure
- **GitHub Actions**: Already configured, must work flawlessly

### 3. Complete VM Cleanup
- **Destroyed VMs must leave ZERO traces**:
  - Delete overlay disk files
  - Remove Firecracker socket files
  - Clear memory (Firecracker process termination)
  - Remove TAP network interfaces
  - Delete temporary directories
  - Remove from database tracking
- **Audit trail**: Log deletion events for compliance

### 4. Decodo Proxy Integration (Per-User)
```bash
# Each user gets unique port: 10001, 10002, 10003...
# User 1: port 10001
curl -U "sp9dso1iga:GjHd8bKd3hizw05qZ" \
  -x "dc.decodo.com:10001" \
  "https://ip.decodo.com/json"

# User 2: port 10002
curl -U "sp9dso1iga:GjHd8bKd3hizw05qZ" \
  -x "dc.decodo.com:10002" \
  "https://ip.decodo.com/json"
```

**Credentials**:
- Username: `sp9dso1iga`
- Password: `GjHd8bKd3hizw05qZ`
- Base Port: `10001`
- Port Allocation: `10001 + user_number`

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────────────────┐
│                         USER'S BROWSER                             │
│  • Master key generation (local only)                              │
│  • Encrypt prompts before sending                                  │
│  • Decrypt responses after receiving                               │
│  • WebRTC client (for OAuth login VMs)                            │
└────────────────────────────────────────────────────────────────────┘
                            ▲ ▼ TLS 1.3
┌────────────────────────────────────────────────────────────────────┐
│                      CONTROL PLANE API                             │
│  • /v1/auth/* - OAuth session management                           │
│  • /v1/chat/* - Chat sessions (SSE streaming)                      │
│  • /v1/jobs/* - CLI/tool execution                                 │
│  • Stores ENCRYPTED blobs only (cannot decrypt)                    │
└────────────────────────────────────────────────────────────────────┘
        ▲                           ▲                          ▲
        │                           │                          │
        ▼                           ▼                          ▼
┌──────────────┐         ┌──────────────────┐      ┌──────────────────┐
│  LOGIN VMs   │         │  RUNTIME         │      │  SUPABASE DB     │
│ (Firecracker)│         │  CONTAINERS      │      │ (Encrypted Data) │
│              │         │                  │      │                  │
│ • OAuth only │         │ • Chat execution │      │ • provider_tokens│
│ • WebRTC     │         │ • Tool execution │      │ • conversations  │
│ • Terminal+  │         │ • Decodo egress  │      │ • messages       │
│   Browser    │         │ • User key       │      │ • All encrypted  │
│ • Immediate  │         │   injected       │      │   with user key  │
│   destroy    │         │ • tmpfs only     │      │                  │
└──────────────┘         └──────────────────┘      └──────────────────┘
        │                           │
        │                           │
        ▼                           ▼
┌────────────────────────────────────────────────────────────────────┐
│                    DECODO PROXY NETWORK                            │
│  Per-user port allocation: 10001, 10002, 10003...                 │
│  Each user gets stable egress IP                                   │
└────────────────────────────────────────────────────────────────────┘
                            ▲ ▼ HTTPS
┌────────────────────────────────────────────────────────────────────┐
│                         PROVIDERS                                  │
│  OpenAI API, Anthropic API, Google AI API                         │
└────────────────────────────────────────────────────────────────────┘
```

---

## Component Design

### 1. Login VMs (Firecracker - OAuth Only)

**Purpose**: Execute OAuth flows on provider sites with terminal-first UX

**Lifecycle**:
```
Boot (300ms) → OAuth Flow (user-driven) → Token Capture → DESTROY
```

**Components**:
- **OS**: Minimal Ubuntu with i3 window manager
- **Terminal**: Auto-opened on left pane
- **Browser**: Chromium on right pane (auto-opens when URL detected)
- **URL Catcher**: Monitors terminal stdout for OAuth URLs
- **Token Handoff**: mTLS POST to Control Plane with captured token
- **Transport**: WebRTC (NOT noVNC - avoids WebSocket issues)

**Resource Limits**:
- **RAM**: 512MB per VM
- **CPU**: 1 vCPU
- **Disk**: 200MB overlay (on top of golden snapshot)
- **Max Concurrent**: 4-8 login VMs (during peak OAuth)
- **Lifespan**: 2-10 minutes average

**Cleanup Checklist** (CRITICAL):
```bash
# On VM destruction, DELETE ALL:
1. Firecracker socket: /var/lib/firecracker/sockets/<vm-id>.sock
2. Overlay disk: /var/lib/firecracker/users/<vm-id>/rootfs-overlay.ext4
3. VM config: /var/lib/firecracker/users/<vm-id>/vm-config.json
4. TAP interface: tap-<vm-id>
5. Memory: Kill firecracker process (automatic)
6. Database: Mark session as 'destroyed'
7. Logs: Archive to cold storage, delete from memory
```

### 2. Runtime Containers (Ephemeral - Chat & Tools)

**Purpose**: Execute chat requests and CLI tools with provider APIs

**Architecture**:
```
Warm Pool (per provider) → Checkout → Attach User Context → Execute → Cleanup → Return to Pool
```

**Container Images**:
- **OpenAI**: Node.js + OpenAI SDK
- **Anthropic**: Node.js + Anthropic SDK
- **Google**: Node.js + Google AI SDK
- **CLI-based**: Includes `claude`, `codex`, `gemini` CLI binaries

**Resource Limits**:
- **RAM**: 250MB average per container
- **CPU**: 0.5 vCPU per container
- **Disk**: tmpfs only (no persistent storage)
- **Max Concurrent**: 96-128 containers (on 60GB box)
- **Lifespan**: 30-90 seconds (sticky session optimization)

**Execution Flow**:
```javascript
1. Checkout container from warm pool
2. Inject user's decryption key (memory only)
3. Fetch encrypted token from Supabase
4. Decrypt token with user's key (in container memory)
5. Attach Decodo proxy (port 10001 + user_number)
6. Execute API call (OpenAI/Anthropic/Google SDK)
7. Stream response via SSE to browser
8. Encrypt response with user's key
9. Store encrypted response in Supabase
10. WIPE: Zero memory, destroy key, detach proxy
11. Return container to pool (or destroy if sticky timeout)
```

**Decodo Proxy Attachment**:
```bash
# Example: User #5 gets port 10005
export HTTPS_PROXY="http://sp9dso1iga:GjHd8bKd3hizw05qZ@dc.decodo.com:10005"
export HTTP_PROXY="http://sp9dso1iga:GjHd8bKd3hizw05qZ@dc.decodo.com:10005"

# Verify egress IP
curl https://ip.decodo.com/json
# Should return unique IP for user #5
```

### 3. Control Plane API

**REST Endpoints**:

```typescript
// Auth & Account Management
POST   /v1/auth/register              // Create user account
POST   /v1/auth/login                 // Login (returns session token)
GET    /v1/auth/me                    // Get current user info

POST   /v1/accounts/:provider/link/start
  → { login_vm_session_id, webrtc_offer }
  // Allocates Login VM, returns WebRTC connection details

GET    /v1/accounts
  → { providers: [{ provider, scopes, egress_port, last_used }] }

POST   /v1/accounts/:provider/revoke  // Delete provider token
POST   /v1/accounts/:provider/rotate-egress
  → { new_port: 10XXX }               // Rotate to different Decodo port

// Chat (API-first, no terminal)
POST   /v1/chat/sessions
  → { conversation_id }

POST   /v1/chat/:conversation_id/messages
  Body: {
    encrypted_prompt: "...",          // Encrypted with user's key
    model: "gpt-4",
    temperature: 0.7
  }
  Response: SSE stream
    data: { encrypted_chunk: "..." }  // Each chunk encrypted

GET    /v1/chat/sessions              // List all conversations
GET    /v1/chat/:conversation_id      // Get conversation + encrypted messages

// Tools/CLI (Optional)
POST   /v1/jobs
  Body: {
    provider: "claude",
    command: ["claude", "--version"],
    encrypted_env: "...",              // Encrypted environment variables
    timeout_s: 60
  }
  Response: WebSocket stream (stdout/stderr)

GET    /v1/jobs/:job_id/status
```

**Internal Endpoints** (mTLS only):
```typescript
// Called by Login VM after OAuth completion
POST   /internal/tokens/ingest
  Headers: { X-SPIFFE-SVID: "..." }   // Mutual TLS authentication
  Body: {
    user_id: "...",
    provider: "openai",
    refresh_token: "...",              // Will be encrypted before storage
    scopes: ["chat", "api"],
    expires_at: "2025-12-31T23:59:59Z"
  }
```

### 4. Database Schema (Supabase)

```sql
-- Users table (basic info only)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  encrypted_master_key_hint TEXT,        -- Hint for user's key (NOT the key itself)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Provider tokens (ENCRYPTED)
CREATE TABLE provider_tokens (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,                    -- 'openai' | 'anthropic' | 'google'
  encrypted_refresh_token TEXT NOT NULL,     -- Encrypted with user's master key
  scopes TEXT[] NOT NULL DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  decodo_port INT NOT NULL,                  -- Assigned Decodo port (10001+)
  egress_ip TEXT,                            -- Current egress IP
  last_rotated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, provider)
);

-- Conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  encrypted_title TEXT,                      -- Encrypted with user's key
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Messages (ALL ENCRYPTED)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user','assistant','system','tool')) NOT NULL,
  encrypted_content TEXT NOT NULL,           -- Encrypted with user's key
  tokens_used INT DEFAULT 0,
  model TEXT,
  egress_ip TEXT,                            -- Which IP was used
  decodo_port INT,                           -- Which Decodo port was used
  duration_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- VM Sessions (for Login VMs)
CREATE TABLE vm_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  vm_id TEXT NOT NULL,
  vm_ip TEXT NOT NULL,
  webrtc_offer TEXT,
  webrtc_answer TEXT,
  status TEXT CHECK (status IN ('booting','ready','authenticating','completed','failed','destroyed')) NOT NULL,
  token_captured_at TIMESTAMPTZ,
  destroyed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Job executions (for CLI/tools)
CREATE TABLE job_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  container_id TEXT NOT NULL,
  encrypted_command TEXT NOT NULL,           -- Encrypted with user's key
  exit_code INT,
  encrypted_stdout TEXT,                     -- Encrypted with user's key
  encrypted_stderr TEXT,                     -- Encrypted with user's key
  duration_ms INT,
  decodo_port INT,
  egress_ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE vm_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only access their own data)
CREATE POLICY user_own_data ON users FOR ALL USING (auth.uid() = id);
CREATE POLICY pt_own_data ON provider_tokens FOR ALL USING (auth.uid() = user_id);
CREATE POLICY conv_own_data ON conversations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY msg_own_data ON messages FOR ALL USING (
  EXISTS(SELECT 1 FROM conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid())
);
CREATE POLICY vm_own_data ON vm_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY job_own_data ON job_executions FOR ALL USING (auth.uid() = user_id);
```

### 5. Encryption Implementation

**Client-Side (Browser)**:
```javascript
// Generate user's master key (NEVER sent to server)
async function generateMasterKey() {
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,  // extractable
    ["encrypt", "decrypt"]
  );

  // Store in browser's IndexedDB (encrypted with user's password)
  // OR derive from user's password using PBKDF2
  return key;
}

// Encrypt data before sending to server
async function encryptData(plaintext, masterKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    masterKey,
    encoded
  );

  // Return base64: iv || ciphertext
  return btoa(
    Array.from(iv).map(b => String.fromCharCode(b)).join('') +
    Array.from(new Uint8Array(ciphertext)).map(b => String.fromCharCode(b)).join('')
  );
}

// Decrypt data received from server
async function decryptData(encrypted, masterKey) {
  const decoded = atob(encrypted);
  const iv = new Uint8Array(decoded.slice(0, 12).split('').map(c => c.charCodeAt(0)));
  const ciphertext = new Uint8Array(decoded.slice(12).split('').map(c => c.charCodeAt(0)));

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    masterKey,
    ciphertext
  );

  return new TextDecoder().decode(plaintext);
}
```

**Server-Side (Control Plane)**:
```javascript
// Server ONLY stores encrypted data - CANNOT decrypt

// Store encrypted token
async function storeProviderToken(userId, provider, refreshToken, userMasterKey) {
  // THIS IS WRONG - server should NOT have userMasterKey
  // Instead, client encrypts BEFORE sending:

  // CLIENT CODE:
  const encryptedToken = await encryptData(refreshToken, userMasterKey);
  await fetch('/v1/accounts/tokens', {
    method: 'POST',
    body: JSON.stringify({ provider, encrypted_token: encryptedToken })
  });
}

// Retrieve encrypted token (server cannot decrypt)
async function getProviderToken(userId, provider) {
  const { data } = await supabase
    .from('provider_tokens')
    .select('encrypted_refresh_token')
    .eq('user_id', userId)
    .eq('provider', provider)
    .single();

  // Return encrypted blob - client will decrypt
  return data.encrypted_refresh_token;
}
```

**Container Runtime (Ephemeral Decryption)**:
```javascript
// User's key is injected into container at runtime (memory only)
// Container decrypts token, uses it, then WIPES memory

async function executeChat(userId, prompt, userKey) {
  // 1. Fetch encrypted token from Supabase
  const encryptedToken = await getEncryptedToken(userId, 'openai');

  // 2. Decrypt in-memory (user's key was injected by Control Plane)
  const accessToken = await decryptInMemory(encryptedToken, userKey);

  // 3. Call provider API
  const response = await callOpenAI(prompt, accessToken);

  // 4. Encrypt response before returning
  const encryptedResponse = await encryptInMemory(response, userKey);

  // 5. WIPE memory
  userKey = null;
  accessToken = null;

  // 6. Return encrypted response
  return encryptedResponse;
}
```

---

## Deployment Architecture

### Infrastructure

**Single Hetzner VPS**:
- **IP**: 135.181.138.102
- **Specs**: 16 cores, 60GB RAM, KVM enabled
- **OS**: Ubuntu 22.04 (Jammy)

**Services**:
```
/opt/
├── control-plane/              # Control Plane API (Node.js + Express)
├── login-vm-manager/           # Firecracker VM orchestration
├── container-runtime/          # Docker/containerd for runtime containers
└── /var/lib/firecracker/
    ├── snapshots/
    │   └── base/
    │       └── login-vm-golden.ext4    # Golden snapshot for Login VMs
    ├── sockets/                # Firecracker API sockets
    └── users/                  # Per-VM overlay disks
```

### Auto-Deployment Pipeline

**GitHub Actions** (`.github/workflows/deploy.yml`):
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy Control Plane
        run: ./scripts/deploy.sh --target control-plane

      - name: Deploy Container Runtime
        run: ./scripts/deploy.sh --target containers

      - name: Deploy Login VM Manager
        run: ./scripts/deploy.sh --target login-vms

      - name: Run Database Migrations
        run: ./scripts/migrate-db.sh

      - name: Health Check
        run: ./scripts/health-check.sh

      - name: Rollback on Failure
        if: failure()
        run: ./scripts/rollback.sh
```

**Deployment Script** (`scripts/deploy.sh`):
```bash
#!/bin/bash
set -euo pipefail

TARGET="${1:-all}"
VPS_IP="135.181.138.102"
VPS_USER="root"
VPS_PASS="Venkatesh4158198303"

case "$TARGET" in
  control-plane)
    rsync -avz ./control-plane/ "$VPS_USER@$VPS_IP:/opt/control-plane/"
    ssh "$VPS_USER@$VPS_IP" "systemctl restart control-plane.service"
    ;;

  containers)
    # Build and push container images
    docker build -t polydev/openai-runtime:latest ./containers/openai
    docker save polydev/openai-runtime:latest | ssh "$VPS_USER@$VPS_IP" docker load
    ;;

  login-vms)
    # Rebuild golden snapshot if vm-agent changed
    rsync -avz ./vm-agent/ "$VPS_USER@$VPS_IP:/opt/vm-agent/"
    ssh "$VPS_USER@$VPS_IP" "./scripts/rebuild-golden-snapshot.sh"
    ;;

  all)
    ./scripts/deploy.sh control-plane
    ./scripts/deploy.sh containers
    ./scripts/deploy.sh login-vms
    ;;
esac
```

---

## Security Model

### Threat Model

**What We Protect Against**:
1. ✅ **Server compromise**: Even if attacker gets DB access, they cannot decrypt user data
2. ✅ **Network eavesdropping**: TLS 1.3 everywhere
3. ✅ **Provider IP clustering**: Decodo proxy with per-user ports
4. ✅ **Token leakage**: Tokens encrypted at rest, decrypted only in ephemeral containers
5. ✅ **VM forensics**: Destroyed VMs leave no trace

**What We Don't Protect Against** (Out of Scope):
1. ❌ Browser compromise (if attacker controls user's browser, they have master key)
2. ❌ User's device malware
3. ❌ Quantum computing (AES-256 is quantum-resistant for now)

### Compliance

**GDPR**:
- Right to erasure: Delete user record → cascades to all encrypted data
- Data portability: Export encrypted blobs (user decrypts locally)
- Consent: Explicit opt-in for each provider

**SOC 2**:
- Access controls: RLS policies
- Audit logs: All API calls logged
- Encryption: At-rest and in-transit

---

## Performance Targets

**Latency SLOs**:
- Login VM boot: < 500ms
- Container checkout: < 150ms
- Chat TTFB: < 300ms (P50), < 600ms (P90)
- Token encryption/decryption: < 50ms

**Capacity**:
- Max concurrent login VMs: 8
- Max concurrent containers: 96-128
- Max users per VPS: 100-200 (depending on usage patterns)

**Availability**:
- Target: 99.5% monthly (single VPS)
- Upgrade to 99.9%: Add second VPS with failover

---

## Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Database schema migration (Supabase MCP)
- [ ] User registration + authentication (JWT)
- [ ] Client-side encryption library (browser)
- [ ] Control Plane API skeleton (/v1/auth/*, /v1/chat/*)
- [ ] Auto-deploy pipeline (GitHub Actions)

### Phase 2: Login VMs (Week 1-2)
- [ ] WebRTC signaling server
- [ ] Firecracker VM manager (allocate, boot, destroy)
- [ ] Login VM golden image (i3 + Chromium + URL catcher)
- [ ] mTLS token handoff endpoint
- [ ] Complete VM cleanup (all traces removed)

### Phase 3: Runtime Containers (Week 2)
- [ ] Container images (OpenAI, Anthropic, Google)
- [ ] Warm pool manager
- [ ] Decodo proxy integration (per-user port allocation)
- [ ] User key injection (memory-only)
- [ ] Chat execution flow (decrypt token → call API → encrypt response)

### Phase 4: Chat API (Week 2-3)
- [ ] SSE streaming implementation
- [ ] Conversation management
- [ ] Message encryption/decryption flow
- [ ] Token usage tracking

### Phase 5: Production Readiness (Week 3-4)
- [ ] Monitoring & alerting (Prometheus + Grafana)
- [ ] Rate limiting & abuse prevention
- [ ] Error handling & retry logic
- [ ] Documentation & API reference
- [ ] Load testing (simulate 100 concurrent users)

---

## Next Steps (Immediate Actions)

1. **Create database schema** using Supabase MCP
2. **Implement client-side encryption** (browser crypto library)
3. **Build Control Plane API** (Express.js + authentication)
4. **Set up auto-deploy** (GitHub Actions + deployment scripts)
5. **Implement container runtime** (warm pool + Decodo proxy)
6. **Build WebRTC signaling** for Login VMs
7. **Test end-to-end flow** (register → link account → chat)

---

## Credentials Reference

**Hetzner VPS**:
- IP: `135.181.138.102`
- User: `root`
- Password: `Venkatesh4158198303`

**Decodo Proxy**:
- Endpoint: `dc.decodo.com`
- Username: `sp9dso1iga`
- Password: `GjHd8bKd3hizw05qZ`
- Base Port: `10001` (increment per user)

**Supabase**: (via MCP - credentials managed by MCP server)
**GitHub**: (via MCP - credentials managed by MCP server)
**Vercel**: (via MCP - credentials managed by MCP server)

---

## Questions to Resolve Before Implementation

1. **User key storage**: Should master key be:
   - A) Derived from user's password (PBKDF2)?
   - B) Generated randomly and stored in browser IndexedDB (encrypted with password)?
   - C) Both options available?

2. **Container orchestration**: Should we use:
   - A) Docker Compose?
   - B) Nomad?
   - C) Raw Docker API?

3. **WebRTC signaling**: Should we use:
   - A) Simple-peer library?
   - B) Full STUN/TURN server setup?
   - C) Managed service like Twilio?

4. **Monitoring**: Should we set up:
   - A) Prometheus + Grafana (self-hosted)?
   - B) Managed service (Datadog/New Relic)?
   - C) Minimal logging only (for MVP)?

---

**Document Version**: 2.0
**Last Updated**: 2025-10-28
**Status**: READY FOR IMPLEMENTATION
