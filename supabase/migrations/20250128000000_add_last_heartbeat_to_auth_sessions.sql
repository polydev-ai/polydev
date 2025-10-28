-- Migration: Add last_heartbeat column to auth_sessions
-- Description: Enables session heartbeat tracking for active session monitoring
-- Created: 2025-01-28

ALTER TABLE auth_sessions
ADD COLUMN last_heartbeat TIMESTAMPTZ DEFAULT NOW();

-- Create index for efficient heartbeat-based queries
CREATE INDEX idx_auth_sessions_heartbeat ON auth_sessions(last_heartbeat);

-- Add comment
COMMENT ON COLUMN auth_sessions.last_heartbeat IS 'Timestamp of last session heartbeat/activity, used to detect stale sessions';
