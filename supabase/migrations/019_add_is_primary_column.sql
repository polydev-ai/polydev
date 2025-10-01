-- Add is_primary column to user_api_keys table
-- This allows users to mark one API key per provider as their primary/preferred key
-- The primary key will be prioritized when multiple keys are available for a provider

-- Add the is_primary column
ALTER TABLE user_api_keys
ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;

-- Create an index for efficient primary key lookups
CREATE INDEX IF NOT EXISTS user_api_keys_is_primary_idx ON user_api_keys(user_id, provider, is_primary)
WHERE is_primary = true;

-- Add a partial unique constraint to ensure only one primary key per user per provider
-- This uses a unique partial index to enforce the constraint efficiently
CREATE UNIQUE INDEX IF NOT EXISTS user_api_keys_one_primary_per_provider
ON user_api_keys(user_id, provider)
WHERE is_primary = true;

-- Add a comment to document the column
COMMENT ON COLUMN user_api_keys.is_primary IS 'Indicates if this is the primary/preferred API key for this provider. Only one key per user per provider can be marked as primary.';
