# Existing Schema Analysis - Polydev AI Production Database

**Analysis Date**: 2025-10-28
**Purpose**: Understand current production schema before implementing OAuth + zero-knowledge architecture

---

## Executive Summary

The existing database supports **two major product lines**:

1. **Polydev MCP Perspectives** (Core Product)
   - Multi-model AI query system with quota management
   - Active users, billing tiers, usage tracking
   - **MUST PRESERVE** - This is the revenue-generating core

2. **OAuth VM Authentication** (Being Rebuilt)
   - VM-based OAuth flows for CLI tools
   - Browser automation for token capture
   - **NEEDS ENHANCEMENT** - Moving to containers + WebRTC + zero-knowledge

---

## Core Product: Polydev MCP Perspectives

### User & Authentication Tables

#### `users` - Core user registry
```sql
user_id UUID (PK)
email TEXT
tier TEXT                    -- Subscription level
status TEXT
supabase_auth_id UUID        -- Links to Supabase Auth
decodo_proxy_port INTEGER    -- Already allocated!
decodo_fixed_ip TEXT         -- Already tracked!
vm_id TEXT                   -- Current OAuth VM (nullable)
vm_ip TEXT
subscription_plan TEXT
created_at, updated_at, last_active_at, vm_destroyed_at
```

**Key Insight**: Decodo proxy ports are ALREADY allocated per user! Don't duplicate.

#### `profiles` - Extended user metadata
```sql
id UUID (PK)
email TEXT
full_name TEXT
display_name TEXT
company TEXT
subscription_tier TEXT       -- Plan level
current_plan_tier TEXT
perspective_quota_id UUID    -- Links to quotas
is_admin BOOLEAN
theme, timezone, role
email_notifications, security_notifications, marketing_emails
monthly_queries INTEGER
queries_used INTEGER
api_keys_count INTEGER
created_at, updated_at
```

**Key Insight**: Rich user profile already exists. Reuse for V2.

#### `mcp_user_tokens` - API token management
```sql
id UUID (PK)
user_id UUID (FK → users)
token_name TEXT
token_hash TEXT              -- Secure token storage
token_preview TEXT           -- Last 4 chars for UI
active BOOLEAN
rate_limit_tier TEXT
created_at, updated_at, last_used_at
```

**Key Insight**: Token management already implemented. Keep for MCP continuity.

### Perspectives & Usage Tracking

#### `perspective_usage` - Usage analytics (CRITICAL)
```sql
id UUID (PK)
user_id UUID (FK → users)
session_id TEXT
model_name TEXT              -- e.g., "gpt-4", "claude-3-opus"
model_tier TEXT              -- "premium", "normal", "eco"
provider TEXT                -- "openai", "anthropic", "google"
provider_source_id UUID
input_tokens INTEGER
output_tokens INTEGER
total_tokens INTEGER
estimated_cost NUMERIC
perspectives_deducted INTEGER  -- Quota consumption
request_metadata JSONB
response_metadata JSONB
created_at TIMESTAMPTZ
```

**Key Insight**: Detailed usage tracking for billing. **MUST PRESERVE**.

#### `user_perspective_quotas` - Quota management
```sql
id UUID (PK)
user_id UUID (FK → users)
plan_tier TEXT                         -- "free", "pro", "enterprise"
messages_per_month INTEGER
premium_perspectives_limit INTEGER     -- GPT-4, Claude Opus, etc.
normal_perspectives_limit INTEGER      -- GPT-3.5, Claude Sonnet
eco_perspectives_limit INTEGER         -- Smaller models
current_month_start DATE
messages_used INTEGER
premium_perspectives_used INTEGER
normal_perspectives_used INTEGER
eco_perspectives_used INTEGER
last_reset_date DATE
created_at, updated_at
```

**Key Insight**: Sophisticated quota system. Don't rebuild, integrate with.

#### `user_proxy_ports` - Decodo port assignments
```sql
user_id UUID (PK, FK → users)
proxy_port INTEGER                     -- 10001, 10002, 10003...
proxy_ip TEXT                          -- Stable egress IP
assigned_at TIMESTAMPTZ
last_verified_at TIMESTAMPTZ
```

**Key Insight**: Port allocation ALREADY DONE! Reuse this table.

### Chat & Session Tables

#### `chat_sessions` - Chat conversations
```sql
id UUID (PK)
user_id UUID (FK → users)
title TEXT
archived BOOLEAN
created_at, updated_at
```

#### `chat_messages` - Chat history
```sql
id UUID (PK)
session_id UUID (FK → chat_sessions)
role TEXT                    -- "user", "assistant", "system"
content TEXT                 -- ❌ NOT ENCRYPTED (needs migration)
model_id TEXT
provider_info JSONB
usage_info JSONB
cost_info JSONB
metadata JSONB
created_at TIMESTAMPTZ
```

**Key Insight**: Chat messages are currently PLAINTEXT. Need to migrate to encrypted.

#### `sessions` - Alternative session tracking
```sql
id UUID (PK)
user_id UUID (FK → users)
name TEXT
description TEXT
model TEXT
provider TEXT
system_prompt TEXT
is_active BOOLEAN
message_count INTEGER
total_tokens INTEGER
total_cost_usd NUMERIC
last_activity_at TIMESTAMPTZ
created_at, updated_at
```

#### `messages` - Alternative message storage
```sql
id UUID (PK)
session_id UUID (FK → sessions)
role TEXT
content TEXT                 -- ❌ NOT ENCRYPTED
tokens INTEGER
cost_usd NUMERIC
created_at TIMESTAMPTZ
```

**Question**: Why two chat systems? (`chat_sessions`/`chat_messages` vs `sessions`/`messages`)

---

## OAuth VM System (Being Rebuilt)

### VM Management Tables

#### `vms` - Firecracker VM tracking
```sql
vm_id TEXT (PK)
user_id UUID (FK → users)
type TEXT                    -- "auth", "runtime"?
vm_type TEXT
status TEXT                  -- "running", "stopped", "destroyed"
provider TEXT                -- "openai", "anthropic", "google"
ip_address INET
tap_device TEXT              -- TAP network interface
socket_path TEXT             -- Firecracker socket
snapshot_path TEXT
memory_path TEXT
memory_mb INTEGER
vcpu_count NUMERIC
cpu_usage_percent NUMERIC
memory_usage_mb INTEGER
firecracker_pid INTEGER
last_heartbeat TIMESTAMPTZ
created_at, destroyed_at
```

**Key Insight**: VM tracking already robust. Adapt for Login VMs (auth-only).

#### `auth_sessions` - OAuth flow tracking
```sql
session_id UUID (PK)
user_id UUID (FK → users)
provider TEXT                -- "openai", "anthropic", "google"
status TEXT                  -- "pending", "authenticating", "completed", "failed"
vm_id TEXT                   -- Links to `vms`
browser_vm_id TEXT
vm_ip TEXT
vnc_url TEXT                 -- ❌ Will become WebRTC offer/answer
auth_url TEXT                -- OAuth URL
redirect_url TEXT            -- Callback URL
error_message TEXT
retry_count INTEGER
started_at, timeout_at, completed_at
last_heartbeat TIMESTAMPTZ
created_at TIMESTAMPTZ
```

**Key Insight**: OAuth flow tracking exists. Need to add:
- `webrtc_offer TEXT`
- `webrtc_answer TEXT`
- Remove `vnc_url`

#### `vm_cleanup_tasks` - Automated cleanup
```sql
id UUID (PK)
vm_id TEXT (FK → vms)
session_id TEXT
cleanup_at TIMESTAMPTZ
status TEXT                  -- "pending", "completed", "failed"
error_message TEXT
created_at, completed_at
```

**Key Insight**: Cleanup tracking exists. Enhance for complete teardown (sockets, disks, TAP).

### Credentials Storage

#### `provider_credentials` - OAuth tokens (ENCRYPTED!)
```sql
credential_id UUID (PK)
user_id UUID (FK → users)
provider TEXT                -- "openai", "anthropic", "google"
encrypted_credentials BYTEA  -- ✅ Already encrypted!
encryption_iv BYTEA
encryption_salt BYTEA
encryption_tag BYTEA
is_valid BOOLEAN
last_verified TIMESTAMPTZ
created_at, updated_at
```

**Key Insight**: Credentials are ALREADY ENCRYPTED with server-side keys.
**Problem**: Not zero-knowledge (server can decrypt).
**Solution**: Migrate to client-side encryption with user's master key.

#### `cli_credentials` - CLI tool credentials
```sql
credential_id UUID (PK)
user_id UUID (FK → users)
provider TEXT
encrypted_data TEXT          -- ✅ Encrypted
encryption_iv TEXT
encryption_auth_tag TEXT
created_at, updated_at, last_used_at
```

**Same Issue**: Server-side encryption, not zero-knowledge.

---

## MCP OAuth System

#### `mcp_registered_clients` - OAuth clients
```sql
client_id TEXT (PK)
client_secret TEXT
client_name TEXT
redirect_uris JSONB
scope TEXT
client_uri, logo_uri, tos_uri, policy_uri
registration_access_token TEXT
created_at, updated_at
```

**Key Insight**: OAuth client registry for MCP. Keep as-is.

---

## Foreign Key Dependencies Map

```
users (user_id)
├── profiles (id)
├── mcp_user_tokens (user_id)
├── perspective_usage (user_id)
├── user_perspective_quotas (user_id)
├── user_proxy_ports (user_id)
├── chat_sessions (user_id)
│   └── chat_messages (session_id)
├── sessions (user_id)
│   └── messages (session_id)
├── vms (user_id)
├── auth_sessions (user_id)
├── provider_credentials (user_id)
└── cli_credentials (user_id)
```

---

## Migration Strategy: Work WITH Existing Tables

### Phase 1: Add Zero-Knowledge Encryption Columns

**DO NOT create new tables**. Instead, ADD encrypted columns to existing tables:

```sql
-- Add to chat_messages
ALTER TABLE chat_messages
  ADD COLUMN encrypted_content_v2 TEXT,           -- Client-side encrypted
  ADD COLUMN encryption_metadata_v2 JSONB,        -- IV, auth tag, key ID
  ADD COLUMN migrated_to_zk BOOLEAN DEFAULT FALSE;

-- Add to messages
ALTER TABLE messages
  ADD COLUMN encrypted_content_v2 TEXT,
  ADD COLUMN encryption_metadata_v2 JSONB,
  ADD COLUMN migrated_to_zk BOOLEAN DEFAULT FALSE;

-- Add to users (for master key hint)
ALTER TABLE users
  ADD COLUMN encrypted_master_key_hint TEXT,     -- Password hint (encrypted)
  ADD COLUMN key_derivation_salt TEXT,           -- For deriving key from password
  ADD COLUMN zero_knowledge_enabled BOOLEAN DEFAULT FALSE;
```

**Migration Flow**:
1. User logs in → Prompted to create master password (if not set)
2. Browser derives encryption key from password
3. Browser fetches old plaintext messages
4. Browser encrypts with new key → Saves to `encrypted_content_v2`
5. Mark `migrated_to_zk = TRUE`
6. Application code checks: if `migrated_to_zk`, use `encrypted_content_v2`, else use `content`

### Phase 2: Enhance OAuth Tables for WebRTC

```sql
-- Modify auth_sessions
ALTER TABLE auth_sessions
  ADD COLUMN webrtc_offer TEXT,                   -- SDP offer from client
  ADD COLUMN webrtc_answer TEXT,                  -- SDP answer from VM
  ADD COLUMN ice_candidates JSONB,                -- ICE candidates
  ADD COLUMN signaling_completed_at TIMESTAMPTZ;

-- Keep vnc_url for backward compatibility during migration
```

### Phase 3: Add Container Runtime Tables (NEW)

**Only create NEW tables for features that don't exist**:

```sql
-- Runtime containers (for chat/tools execution)
CREATE TABLE runtime_containers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'google')),
  container_id TEXT NOT NULL UNIQUE,         -- Nomad allocation ID
  status TEXT CHECK (status IN ('warming', 'ready', 'assigned', 'executing', 'destroyed')),
  assigned_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  decodo_port INTEGER,                       -- Reference to user_proxy_ports
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  destroyed_at TIMESTAMPTZ
);

-- Job executions (CLI/tool runs)
CREATE TABLE job_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  container_id UUID REFERENCES runtime_containers(id),
  job_type TEXT NOT NULL CHECK (job_type IN ('cli', 'tool', 'function')),
  encrypted_command TEXT NOT NULL,           -- Client-side encrypted
  encrypted_stdout TEXT,
  encrypted_stderr TEXT,
  encryption_metadata JSONB,
  exit_code INTEGER,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

---

## What NOT to Change

### Keep As-Is (Core Product):
1. ✅ `users` table (add columns only)
2. ✅ `profiles` table
3. ✅ `mcp_user_tokens` table
4. ✅ `perspective_usage` table (billing data!)
5. ✅ `user_perspective_quotas` table
6. ✅ `user_proxy_ports` table (Decodo allocation!)
7. ✅ `mcp_registered_clients` table
8. ✅ All admin/analytics tables

### Enhance with Encryption (Gradual Migration):
1. 🔄 `chat_messages` → Add `encrypted_content_v2`
2. 🔄 `messages` → Add `encrypted_content_v2`
3. 🔄 `provider_credentials` → Migrate to client-side keys
4. 🔄 `cli_credentials` → Migrate to client-side keys

### Enhance for WebRTC:
1. 🔄 `auth_sessions` → Add WebRTC signaling columns
2. 🔄 `vms` → Keep for Login VMs only

### Create New (Containers):
1. ✨ `runtime_containers` (NEW)
2. ✨ `job_executions` (NEW)

---

## Recommended V2 Architecture

```
┌─────────────────────────────────────────────────────┐
│ EXISTING CORE PRODUCT (Keep Running)                │
├─────────────────────────────────────────────────────┤
│ • users, profiles                                   │
│ • mcp_user_tokens                                   │
│ • perspective_usage, user_perspective_quotas        │
│ • user_proxy_ports (Decodo allocation)              │
│ • All billing/analytics tables                      │
└─────────────────────────────────────────────────────┘
                    ▲
                    │ (Reuse)
                    │
┌─────────────────────────────────────────────────────┐
│ ENHANCED OAUTH + CHAT (Add Encryption)              │
├─────────────────────────────────────────────────────┤
│ • chat_messages + encrypted_content_v2              │
│ • messages + encrypted_content_v2                   │
│ • auth_sessions + webrtc_offer/answer               │
│ • provider_credentials (migrate to client-side)     │
│ • vms (Login VMs only, with WebRTC)                 │
└─────────────────────────────────────────────────────┘
                    +
┌─────────────────────────────────────────────────────┐
│ NEW CONTAINER RUNTIME (Add Tables)                  │
├─────────────────────────────────────────────────────┤
│ • runtime_containers (NEW)                          │
│ • job_executions (NEW)                              │
│ • Nomad orchestration integration                   │
└─────────────────────────────────────────────────────┘
```

---

## Next Steps

1. **Add encryption columns** to existing tables
2. **Create migration UI** for users to set master password
3. **Implement client-side crypto library** (AES-GCM with user's key)
4. **Add WebRTC signaling** to `auth_sessions`
5. **Create container tables** (`runtime_containers`, `job_executions`)
6. **Deploy incrementally** - core product never goes down

**Timeline**: Weeks, not months. No data loss. No downtime.
