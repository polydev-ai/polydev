-- Migration: Create VM cleanup tasks table
-- Description: Database-backed cleanup queue that survives controller restarts
-- Created: 2025-10-28

CREATE TABLE IF NOT EXISTS vm_cleanup_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vm_id TEXT NOT NULL,
  session_id TEXT,
  cleanup_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Index for efficient cleanup task queries
  INDEX idx_vm_cleanup_status_time (status, cleanup_at)
);

-- Add comment
COMMENT ON TABLE vm_cleanup_tasks IS 'Queue of VM cleanup tasks that survive controller restarts';
COMMENT ON COLUMN vm_cleanup_tasks.cleanup_at IS 'Timestamp when VM should be cleaned up';
COMMENT ON COLUMN vm_cleanup_tasks.status IS 'pending | processing | completed | failed';
