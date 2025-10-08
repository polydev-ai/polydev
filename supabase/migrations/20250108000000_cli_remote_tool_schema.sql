-- CLI Remote Tool Database Schema Migration
-- This migration creates all tables for the Firecracker VM management system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  supabase_auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- VM Assignment
  vm_id TEXT UNIQUE,
  vm_ip TEXT,

  -- Decodo Proxy
  decodo_proxy_port INTEGER UNIQUE,
  decodo_fixed_ip TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'created',
  subscription_plan TEXT DEFAULT 'free',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ,
  vm_destroyed_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('created', 'authenticating', 'authenticated', 'active', 'hibernated', 'failed', 'vm_destroyed')),
  CONSTRAINT valid_plan CHECK (subscription_plan IN ('free', 'pro', 'enterprise')),
  CONSTRAINT valid_port CHECK (decodo_proxy_port IS NULL OR decodo_proxy_port >= 10001)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_vm_id ON users(vm_id);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_last_active ON users(last_active_at);
CREATE INDEX idx_users_decodo_port ON users(decodo_proxy_port) WHERE decodo_proxy_port IS NOT NULL;

-- ============================================================================
-- VMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS vms (
  vm_id TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,

  -- VM Configuration
  vm_type TEXT NOT NULL,
  vcpu_count NUMERIC(3,1),
  memory_mb INTEGER,

  -- Network
  ip_address TEXT,
  tap_device TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'created',
  firecracker_pid INTEGER,
  socket_path TEXT,

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
  CONSTRAINT valid_vm_status CHECK (status IN ('creating', 'running', 'hibernated', 'stopping', 'stopped', 'failed', 'destroyed'))
);

CREATE INDEX idx_vms_user_id ON vms(user_id);
CREATE INDEX idx_vms_status ON vms(status);
CREATE INDEX idx_vms_type ON vms(vm_type);
CREATE INDEX idx_vms_heartbeat ON vms(last_heartbeat);
CREATE INDEX idx_vms_pid ON vms(firecracker_pid) WHERE firecracker_pid IS NOT NULL;

-- ============================================================================
-- PROVIDER CREDENTIALS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS provider_credentials (
  credential_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,

  -- Provider Info
  provider TEXT NOT NULL,

  -- Encrypted Credentials
  encrypted_data TEXT NOT NULL,
  encryption_iv TEXT NOT NULL,
  encryption_tag TEXT NOT NULL,
  encryption_salt TEXT NOT NULL,

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
CREATE INDEX idx_credentials_valid ON provider_credentials(is_valid);

-- ============================================================================
-- PROMPTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS prompts (
  prompt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  vm_id TEXT REFERENCES vms(vm_id) ON DELETE SET NULL,

  -- Request Details
  provider TEXT NOT NULL,
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
  error_message TEXT,

  CONSTRAINT valid_prompt_status CHECK (status IN ('pending', 'streaming', 'completed', 'failed', 'cancelled')),
  CONSTRAINT valid_provider CHECK (provider IN ('claude_code', 'codex_cli', 'gemini_cli'))
);

CREATE INDEX idx_prompts_user_id ON prompts(user_id);
CREATE INDEX idx_prompts_started_at ON prompts(started_at);
CREATE INDEX idx_prompts_status ON prompts(status);
CREATE INDEX idx_prompts_provider ON prompts(provider);
CREATE INDEX idx_prompts_completed ON prompts(completed_at) WHERE completed_at IS NOT NULL;

-- ============================================================================
-- SYSTEM METRICS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS system_metrics (
  metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Resource Usage
  total_vms_running INTEGER,
  browser_vms_active INTEGER,
  cli_vms_active INTEGER,

  cpu_usage_percent NUMERIC(5,2),
  memory_used_mb INTEGER,
  memory_available_mb INTEGER,

  -- Decodo Usage
  active_proxy_ports INTEGER[],

  -- Request Stats
  prompts_last_hour INTEGER,
  prompts_today INTEGER,
  failed_prompts_last_hour INTEGER,

  -- Recorded at
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_metrics_time ON system_metrics(recorded_at);

-- ============================================================================
-- AUTH SESSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS auth_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,

  -- Browser VM Assignment
  browser_vm_id TEXT REFERENCES vms(vm_id) ON DELETE SET NULL,

  -- Provider
  provider TEXT NOT NULL,

  -- OAuth Flow
  auth_url TEXT,
  redirect_url TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'started',

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  timeout_at TIMESTAMPTZ,

  -- Error Handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  CONSTRAINT valid_auth_status CHECK (status IN ('started', 'url_captured', 'user_authenticating', 'completed', 'failed', 'timeout')),
  CONSTRAINT valid_provider CHECK (provider IN ('claude_code', 'codex_cli', 'gemini_cli'))
);

CREATE INDEX idx_auth_sessions_user ON auth_sessions(user_id);
CREATE INDEX idx_auth_sessions_status ON auth_sessions(status);
CREATE INDEX idx_auth_sessions_started ON auth_sessions(started_at);
CREATE INDEX idx_auth_sessions_browser_vm ON auth_sessions(browser_vm_id) WHERE browser_vm_id IS NOT NULL;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for provider_credentials
CREATE TRIGGER update_provider_credentials_updated_at
    BEFORE UPDATE ON provider_credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to get next available Decodo port
CREATE OR REPLACE FUNCTION get_next_decodo_port()
RETURNS INTEGER AS $$
DECLARE
    next_port INTEGER;
BEGIN
    SELECT COALESCE(MAX(decodo_proxy_port), 10000) + 1 INTO next_port FROM users;
    RETURN next_port;
END;
$$ LANGUAGE plpgsql;

-- Function to get VM statistics
CREATE OR REPLACE FUNCTION get_vm_statistics()
RETURNS TABLE (
    total_vms BIGINT,
    running_vms BIGINT,
    hibernated_vms BIGINT,
    browser_vms BIGINT,
    cli_vms BIGINT,
    failed_vms BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) as total_vms,
        COUNT(*) FILTER (WHERE status = 'running') as running_vms,
        COUNT(*) FILTER (WHERE status = 'hibernated') as hibernated_vms,
        COUNT(*) FILTER (WHERE vm_type = 'browser') as browser_vms,
        COUNT(*) FILTER (WHERE vm_type = 'cli') as cli_vms,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_vms
    FROM vms
    WHERE destroyed_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to get user prompt statistics
CREATE OR REPLACE FUNCTION get_user_prompt_stats(p_user_id UUID)
RETURNS TABLE (
    total_prompts BIGINT,
    prompts_today BIGINT,
    prompts_this_month BIGINT,
    failed_prompts BIGINT,
    avg_duration_ms NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) as total_prompts,
        COUNT(*) FILTER (WHERE started_at >= CURRENT_DATE) as prompts_today,
        COUNT(*) FILTER (WHERE started_at >= DATE_TRUNC('month', CURRENT_DATE)) as prompts_this_month,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_prompts,
        AVG(duration_ms) as avg_duration_ms
    FROM prompts
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vms ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY users_select_own ON users
    FOR SELECT
    USING (auth.uid() = supabase_auth_id);

CREATE POLICY users_update_own ON users
    FOR UPDATE
    USING (auth.uid() = supabase_auth_id);

-- VMs policies
CREATE POLICY vms_select_own ON vms
    FOR SELECT
    USING (user_id IN (SELECT user_id FROM users WHERE supabase_auth_id = auth.uid()));

-- Credentials policies (extra security)
CREATE POLICY credentials_select_own ON provider_credentials
    FOR SELECT
    USING (user_id IN (SELECT user_id FROM users WHERE supabase_auth_id = auth.uid()));

CREATE POLICY credentials_update_own ON provider_credentials
    FOR UPDATE
    USING (user_id IN (SELECT user_id FROM users WHERE supabase_auth_id = auth.uid()));

-- Prompts policies
CREATE POLICY prompts_select_own ON prompts
    FOR SELECT
    USING (user_id IN (SELECT user_id FROM users WHERE supabase_auth_id = auth.uid()));

CREATE POLICY prompts_insert_own ON prompts
    FOR INSERT
    WITH CHECK (user_id IN (SELECT user_id FROM users WHERE supabase_auth_id = auth.uid()));

-- Auth sessions policies
CREATE POLICY auth_sessions_select_own ON auth_sessions
    FOR SELECT
    USING (user_id IN (SELECT user_id FROM users WHERE supabase_auth_id = auth.uid()));

-- Service role can do everything (for Master Controller)
-- System metrics table has no RLS (admin only via service key)

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert initial system metrics record
INSERT INTO system_metrics (
    total_vms_running,
    browser_vms_active,
    cli_vms_active,
    cpu_usage_percent,
    memory_used_mb,
    memory_available_mb,
    active_proxy_ports,
    prompts_last_hour,
    prompts_today,
    failed_prompts_last_hour
) VALUES (
    0, 0, 0, 0, 0, 32768, ARRAY[]::INTEGER[], 0, 0, 0
);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE users IS 'User accounts with VM and Decodo proxy assignments';
COMMENT ON TABLE vms IS 'Firecracker VM instances (browser and CLI types)';
COMMENT ON TABLE provider_credentials IS 'Encrypted CLI provider credentials';
COMMENT ON TABLE prompts IS 'User prompt execution history and tracking';
COMMENT ON TABLE system_metrics IS 'System-wide resource and usage metrics';
COMMENT ON TABLE auth_sessions IS 'OAuth authentication session tracking';

COMMENT ON COLUMN users.decodo_proxy_port IS 'Dedicated Decodo proxy port (10001+)';
COMMENT ON COLUMN users.decodo_fixed_ip IS 'Fixed residential IP for this port';
COMMENT ON COLUMN vms.vm_type IS 'browser (2GB, temporary) or cli (256MB, permanent)';
COMMENT ON COLUMN provider_credentials.encrypted_data IS 'AES-256-GCM encrypted credentials JSON';
COMMENT ON COLUMN prompts.duration_ms IS 'Total execution time in milliseconds';
