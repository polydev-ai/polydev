-- Enhance user_api_keys table for ordered fallback system
-- Add missing columns for priority ordering and usage tracking

-- Add new columns if they don't exist
ALTER TABLE user_api_keys
ADD COLUMN IF NOT EXISTS priority_order INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS daily_limit DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS daily_usage DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS disabled_reason TEXT,
ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMP WITH TIME ZONE;

-- Create index for efficient key lookup by provider and priority
CREATE INDEX IF NOT EXISTS idx_user_api_keys_provider_priority
ON user_api_keys(provider, user_id, priority_order, active);

-- Create index for usage queries
CREATE INDEX IF NOT EXISTS idx_user_api_keys_usage
ON user_api_keys(provider, user_id, current_usage, monthly_budget);

-- Create table for detailed API key usage logging
CREATE TABLE IF NOT EXISTS api_key_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID REFERENCES user_api_keys(id) ON DELETE CASCADE,
  cost DECIMAL(10,4) NOT NULL DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  success BOOLEAN NOT NULL DEFAULT true,
  error_type TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient log queries
CREATE INDEX IF NOT EXISTS idx_api_key_usage_logs_key_time
ON api_key_usage_logs(api_key_id, timestamp DESC);

-- Create index for success/error analysis
CREATE INDEX IF NOT EXISTS idx_api_key_usage_logs_success
ON api_key_usage_logs(api_key_id, success, timestamp DESC);

-- Update existing records to have priority_order if not set
UPDATE user_api_keys
SET priority_order = 1
WHERE priority_order IS NULL;

-- Make priority_order NOT NULL after setting defaults
ALTER TABLE user_api_keys
ALTER COLUMN priority_order SET NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN user_api_keys.priority_order IS 'Order of key usage (lower number = higher priority)';
COMMENT ON COLUMN user_api_keys.daily_limit IS 'Daily spending limit in USD';
COMMENT ON COLUMN user_api_keys.daily_usage IS 'Current daily usage in USD';
COMMENT ON COLUMN user_api_keys.last_used_at IS 'Timestamp of last API call using this key';
COMMENT ON COLUMN user_api_keys.disabled_reason IS 'Reason why key was disabled (if applicable)';
COMMENT ON COLUMN user_api_keys.disabled_at IS 'Timestamp when key was disabled';

COMMENT ON TABLE api_key_usage_logs IS 'Detailed logging of API key usage for analytics and monitoring';
COMMENT ON COLUMN api_key_usage_logs.cost IS 'Cost of the API call in USD';
COMMENT ON COLUMN api_key_usage_logs.tokens_used IS 'Number of tokens consumed';
COMMENT ON COLUMN api_key_usage_logs.success IS 'Whether the API call was successful';
COMMENT ON COLUMN api_key_usage_logs.error_type IS 'Type of error if call failed';