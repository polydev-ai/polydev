-- Add max output token configuration fields to provider_configurations
ALTER TABLE provider_configurations
ADD COLUMN IF NOT EXISTS max_output_tokens_premium INTEGER DEFAULT 16000,
ADD COLUMN IF NOT EXISTS max_output_tokens_normal INTEGER DEFAULT 8000,
ADD COLUMN IF NOT EXISTS max_output_tokens_eco INTEGER DEFAULT 4000,
ADD COLUMN IF NOT EXISTS max_output_tokens_default INTEGER DEFAULT 8000;

-- Add max output token preferences to user_preferences
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS max_output_tokens_premium INTEGER,
ADD COLUMN IF NOT EXISTS max_output_tokens_normal INTEGER,
ADD COLUMN IF NOT EXISTS max_output_tokens_eco INTEGER,
ADD COLUMN IF NOT EXISTS max_output_tokens_custom INTEGER;

COMMENT ON COLUMN provider_configurations.max_output_tokens_premium IS 'Max output tokens for premium tier models';
COMMENT ON COLUMN provider_configurations.max_output_tokens_normal IS 'Max output tokens for normal tier models';
COMMENT ON COLUMN provider_configurations.max_output_tokens_eco IS 'Max output tokens for economy tier models';
COMMENT ON COLUMN provider_configurations.max_output_tokens_default IS 'Default max output tokens when tier is not specified';

COMMENT ON COLUMN user_preferences.max_output_tokens_premium IS 'User override for premium tier max output tokens';
COMMENT ON COLUMN user_preferences.max_output_tokens_normal IS 'User override for normal tier max output tokens';
COMMENT ON COLUMN user_preferences.max_output_tokens_eco IS 'User override for economy tier max output tokens';
COMMENT ON COLUMN user_preferences.max_output_tokens_custom IS 'Custom max output tokens for all models';