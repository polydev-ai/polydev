-- Add flag to distinguish admin-managed keys from personal user keys
-- This allows admins to manage both personal keys and admin keys separately

ALTER TABLE user_api_keys
ADD COLUMN IF NOT EXISTS is_admin_key BOOLEAN NOT NULL DEFAULT FALSE;

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_user_api_keys_admin_flag ON user_api_keys(user_id, is_admin_key);

COMMENT ON COLUMN user_api_keys.is_admin_key IS 'Distinguishes admin-managed keys (true) from personal user keys (false)';
