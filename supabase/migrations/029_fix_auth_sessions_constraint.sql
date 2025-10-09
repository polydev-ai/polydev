-- Fix auth_sessions status constraint to match actual implementation
-- The original constraint had wrong status values that don't match the code

-- Drop the old conflicting constraint that was causing 406 errors
ALTER TABLE auth_sessions DROP CONSTRAINT IF EXISTS auth_sessions_status_check;

-- The correct constraint 'valid_auth_status' already exists with proper values
-- Ensure it has all the status values used by browser-vm-auth.js
-- Status values: 'started', 'vm_created', 'awaiting_user_auth', 'completed', 'failed', 'timeout', 'cancelled'

-- Add missing columns if they don't exist (already added via MCP but documenting here)
ALTER TABLE auth_sessions ADD COLUMN IF NOT EXISTS vm_id TEXT;
ALTER TABLE auth_sessions ADD COLUMN IF NOT EXISTS vm_ip TEXT;
ALTER TABLE auth_sessions ADD COLUMN IF NOT EXISTS vnc_url TEXT;

-- Cleanup old stale sessions (optional, already done but good practice for future)
-- DELETE FROM auth_sessions
-- WHERE status NOT IN ('completed', 'cancelled')
--   AND started_at < NOW() - INTERVAL '1 hour';
