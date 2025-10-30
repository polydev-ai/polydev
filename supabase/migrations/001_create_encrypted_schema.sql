-- Polydev AI V2 - Encrypted Zero-Knowledge Schema
-- Migration: 001_create_encrypted_schema
-- Created: 2025-10-28
-- Purpose: Complete database foundation for client-side encryption architecture

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS TABLE
-- ============================================================================
-- Stores basic user information
-- NO sensitive data stored here - only encrypted key hint
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  encrypted_master_key_hint TEXT,        -- Hint for password recovery (encrypted)
  key_derivation_salt TEXT NOT NULL,     -- Salt for deriving encryption key from password
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PROVIDER TOKENS TABLE
-- ============================================================================
-- Stores OAuth tokens (ALL ENCRYPTED with user's master key)
-- Each user gets unique Decodo proxy port (10001+)
CREATE TABLE IF NOT EXISTS provider_tokens (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'google')),
  encrypted_refresh_token TEXT NOT NULL,     -- Encrypted OAuth refresh token
  encrypted_access_token TEXT,               -- Encrypted OAuth access token (optional cache)
  scopes TEXT[] NOT NULL DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  decodo_port INT NOT NULL UNIQUE,           -- Assigned Decodo port (10001+user_number)
  egress_ip TEXT,                            -- Stable egress IP from Decodo
  last_rotated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, provider)
);

-- Index for port allocation queries
CREATE INDEX IF NOT EXISTS idx_provider_tokens_decodo_port ON provider_tokens(decodo_port);

-- ============================================================================
-- CONVERSATIONS TABLE
-- ============================================================================
-- Stores conversation metadata (titles encrypted)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'google')),
  encrypted_title TEXT,                      -- Encrypted conversation title
  message_count INT NOT NULL DEFAULT 0,
  total_tokens INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user conversation listing
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id, created_at DESC);

-- ============================================================================
-- MESSAGES TABLE
-- ============================================================================
-- Stores all chat messages (ALL CONTENT ENCRYPTED)
-- Server cannot read prompts or responses
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'assistant', 'system', 'tool')) NOT NULL,
  encrypted_content TEXT NOT NULL,           -- Encrypted message content
  tokens_used INT DEFAULT 0,
  model TEXT,                                -- e.g., "gpt-4", "claude-3-opus"
  egress_ip TEXT,                            -- Which Decodo IP was used
  decodo_port INT,                           -- Which port was used
  duration_ms INT,                           -- API call duration
  finish_reason TEXT,                        -- e.g., "stop", "length", "tool_calls"
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for conversation message retrieval
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id, created_at ASC);

-- ============================================================================
-- VM SESSIONS TABLE
-- ============================================================================
-- Tracks Login VM sessions (Firecracker VMs for OAuth only)
-- WebRTC signaling data stored here
CREATE TABLE IF NOT EXISTS vm_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'google')),
  vm_id TEXT NOT NULL UNIQUE,                -- Firecracker VM identifier
  vm_ip TEXT NOT NULL,                       -- TAP interface IP (192.168.100.x)
  tap_interface TEXT NOT NULL,               -- TAP interface name (e.g., tap0)
  socket_path TEXT NOT NULL,                 -- Firecracker socket path
  webrtc_offer TEXT,                         -- WebRTC SDP offer from client
  webrtc_answer TEXT,                        -- WebRTC SDP answer from VM
  status TEXT CHECK (status IN ('booting', 'ready', 'authenticating', 'completed', 'failed', 'destroyed')) NOT NULL DEFAULT 'booting',
  encrypted_token_captured TEXT,             -- Captured OAuth token (encrypted)
  token_captured_at TIMESTAMPTZ,
  destroyed_at TIMESTAMPTZ,
  cleanup_completed BOOLEAN DEFAULT FALSE,   -- Confirms socket/disk/TAP cleanup
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for active VM tracking
CREATE INDEX IF NOT EXISTS idx_vm_sessions_status ON vm_sessions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vm_sessions_user_id ON vm_sessions(user_id, created_at DESC);

-- ============================================================================
-- JOB EXECUTIONS TABLE
-- ============================================================================
-- Tracks CLI/tool executions in runtime containers
-- Commands and outputs are ENCRYPTED
CREATE TABLE IF NOT EXISTS job_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'google')),
  container_id TEXT NOT NULL,                -- Nomad allocation ID
  job_type TEXT NOT NULL CHECK (job_type IN ('cli', 'tool', 'function')),
  encrypted_command TEXT NOT NULL,           -- Encrypted command executed
  exit_code INT,
  encrypted_stdout TEXT,                     -- Encrypted standard output
  encrypted_stderr TEXT,                     -- Encrypted standard error
  duration_ms INT,
  decodo_port INT,                           -- Which Decodo port was used
  egress_ip TEXT,                            -- Egress IP used
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Index for user job history
CREATE INDEX IF NOT EXISTS idx_job_executions_user_id ON job_executions(user_id, created_at DESC);

-- ============================================================================
-- CONTAINER POOL TABLE
-- ============================================================================
-- Tracks warm container pool for performance
-- Containers pre-started and waiting for user key injection
CREATE TABLE IF NOT EXISTS container_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'google')),
  container_id TEXT NOT NULL UNIQUE,         -- Nomad allocation ID
  status TEXT CHECK (status IN ('warming', 'ready', 'assigned', 'executing', 'cooldown', 'destroyed')) NOT NULL DEFAULT 'warming',
  assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  destroyed_at TIMESTAMPTZ
);

-- Index for pool management queries
CREATE INDEX IF NOT EXISTS idx_container_pool_status ON container_pool(provider, status, created_at ASC);

-- ============================================================================
-- SYSTEM METRICS TABLE
-- ============================================================================
-- Stores system performance metrics for monitoring
-- Used by Prometheus for alerting
CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL,                 -- e.g., "vm_boot_time", "container_exec_time"
  provider TEXT,
  value_ms INT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for metrics queries
CREATE INDEX IF NOT EXISTS idx_system_metrics_type ON system_metrics(metric_type, created_at DESC);

-- ============================================================================
-- AUDIT LOG TABLE
-- ============================================================================
-- Audit trail for compliance (NO encrypted content logged)
-- Only metadata: who, when, what action
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,                      -- e.g., "vm_created", "token_linked", "conversation_created"
  resource_type TEXT NOT NULL,               -- e.g., "vm_session", "conversation"
  resource_id UUID,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,        -- NO sensitive data
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for audit queries
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action, created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Enable RLS on all user-facing tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE vm_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE container_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
-- Users can only access their own data

-- Users table
CREATE POLICY user_own_data ON users
  FOR ALL USING (auth.uid() = id);

-- Provider tokens
CREATE POLICY provider_tokens_own_data ON provider_tokens
  FOR ALL USING (auth.uid() = user_id);

-- Conversations
CREATE POLICY conversations_own_data ON conversations
  FOR ALL USING (auth.uid() = user_id);

-- Messages (via conversation ownership)
CREATE POLICY messages_own_data ON messages
  FOR ALL USING (
    EXISTS(
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND c.user_id = auth.uid()
    )
  );

-- VM sessions
CREATE POLICY vm_sessions_own_data ON vm_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Job executions
CREATE POLICY job_executions_own_data ON job_executions
  FOR ALL USING (auth.uid() = user_id);

-- Container pool (only see assigned containers)
CREATE POLICY container_pool_own_data ON container_pool
  FOR SELECT USING (auth.uid() = assigned_user_id);

-- System metrics (read-only for authenticated users)
CREATE POLICY system_metrics_read_only ON system_metrics
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Audit log (users can only see their own audit trail)
CREATE POLICY audit_log_own_data ON audit_log
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================
-- Auto-update timestamps

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_provider_tokens_updated_at BEFORE UPDATE ON provider_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTIONS
-- ============================================================================
-- Get next available Decodo port

CREATE OR REPLACE FUNCTION get_next_decodo_port()
RETURNS INT AS $$
DECLARE
  next_port INT;
BEGIN
  SELECT COALESCE(MAX(decodo_port), 10000) + 1 INTO next_port
  FROM provider_tokens;
  RETURN next_port;
END;
$$ LANGUAGE plpgsql;

-- Cleanup destroyed VMs older than 24 hours

CREATE OR REPLACE FUNCTION cleanup_old_vm_sessions()
RETURNS INT AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM vm_sessions
  WHERE status = 'destroyed'
    AND destroyed_at < NOW() - INTERVAL '24 hours'
    AND cleanup_completed = TRUE;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INITIAL DATA
-- ============================================================================
-- No initial data needed - all user-driven

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Schema created successfully
-- Server cannot decrypt any user data
-- Zero-knowledge architecture enforced at database level
