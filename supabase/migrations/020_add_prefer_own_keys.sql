-- Add prefer_own_keys preference to user_preferences table
-- This allows users to set a global preference to only use their own API keys
-- and never fall back to platform credits/keys

-- Add the prefer_own_keys column
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS prefer_own_keys BOOLEAN DEFAULT false;

-- Add a comment to document the column
COMMENT ON COLUMN user_preferences.prefer_own_keys IS 'When true, only use user-provided API keys and never fall back to platform credits. This gives users complete control over which keys are used for their requests.';
