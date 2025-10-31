-- Browser VM Session Persistence Fix
-- Adds last_heartbeat column to auth_sessions for session health monitoring
-- Ensures all columns needed for session tracking are present

-- Migration created: 2025-10-31
-- Related to: BROWSER_VM_COMPREHENSIVE_FIX_PLAN.md Phase 1

-- Add last_heartbeat column if it doesn't exist
-- This allows tracking session health and detecting stale sessions
ALTER TABLE auth_sessions
  ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMPTZ;

-- Ensure vm_ip and vnc_url columns exist (may have been added in migration 029)
ALTER TABLE auth_sessions
  ADD COLUMN IF NOT EXISTS vm_ip TEXT;

ALTER TABLE auth_sessions
  ADD COLUMN IF NOT EXISTS vnc_url TEXT;

-- Create index for efficient heartbeat queries
CREATE INDEX IF NOT EXISTS idx_auth_sessions_heartbeat
  ON auth_sessions(last_heartbeat)
  WHERE last_heartbeat IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN auth_sessions.last_heartbeat IS 'Last WebSocket/API heartbeat from frontend - used to detect stale sessions';
COMMENT ON COLUMN auth_sessions.vm_ip IS 'Browser VM IP address (192.168.100.X) - used for noVNC WebSocket routing';
COMMENT ON COLUMN auth_sessions.vnc_url IS 'Complete noVNC URL for frontend iframe';
