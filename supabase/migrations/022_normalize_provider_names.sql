-- Normalize provider names in user_api_keys table
-- This ensures consistent provider name casing for accurate analytics and lookups

-- Update provider names to lowercase with special case mappings
UPDATE user_api_keys
SET provider = CASE
  WHEN LOWER(provider) = 'xai' THEN 'x-ai'
  WHEN LOWER(provider) = 'x.ai' THEN 'x-ai'
  WHEN LOWER(provider) = 'togetherai' THEN 'together'
  WHEN LOWER(provider) = 'google-vertex' THEN 'google'
  WHEN LOWER(provider) = 'google-vertex-anthropic' THEN 'google'
  WHEN LOWER(provider) = 'openai-native' THEN 'openai'
  ELSE LOWER(provider)
END
WHERE provider != CASE
  WHEN LOWER(provider) = 'xai' THEN 'x-ai'
  WHEN LOWER(provider) = 'x.ai' THEN 'x-ai'
  WHEN LOWER(provider) = 'togetherai' THEN 'together'
  WHEN LOWER(provider) = 'google-vertex' THEN 'google'
  WHEN LOWER(provider) = 'google-vertex-anthropic' THEN 'google'
  WHEN LOWER(provider) = 'openai-native' THEN 'openai'
  ELSE LOWER(provider)
END;

-- Add a trigger to normalize provider names on insert/update
CREATE OR REPLACE FUNCTION normalize_provider_name()
RETURNS TRIGGER AS $$
BEGIN
  NEW.provider := CASE
    WHEN LOWER(NEW.provider) = 'xai' THEN 'x-ai'
    WHEN LOWER(NEW.provider) = 'x.ai' THEN 'x-ai'
    WHEN LOWER(NEW.provider) = 'togetherai' THEN 'together'
    WHEN LOWER(NEW.provider) = 'google-vertex' THEN 'google'
    WHEN LOWER(NEW.provider) = 'google-vertex-anthropic' THEN 'google'
    WHEN LOWER(NEW.provider) = 'openai-native' THEN 'openai'
    ELSE LOWER(NEW.provider)
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for user_api_keys
DROP TRIGGER IF EXISTS normalize_provider_name_trigger ON user_api_keys;
CREATE TRIGGER normalize_provider_name_trigger
  BEFORE INSERT OR UPDATE OF provider ON user_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION normalize_provider_name();

-- Add comment explaining the normalization
COMMENT ON FUNCTION normalize_provider_name() IS
'Automatically normalizes provider names to lowercase with special case mappings (xai->x-ai, etc.) to ensure consistent provider identification across the system';

-- Create index on normalized provider names for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_api_keys_provider_normalized
  ON user_api_keys(provider)
  WHERE active = true;

COMMENT ON INDEX idx_user_api_keys_provider_normalized IS
'Optimizes lookups by normalized provider name for active API keys';
