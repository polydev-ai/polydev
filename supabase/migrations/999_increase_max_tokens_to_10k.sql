-- Increase max_tokens from 1000 to 10,000 for all AI providers
-- This fixes the Gemini MAX_TOKENS issue where thinking tokens were consuming all available output tokens

-- 1. Update api_keys table to increase max_tokens for all users
UPDATE api_keys
SET
  max_tokens = 10000,
  updated_at = NOW()
WHERE max_tokens < 10000 OR max_tokens IS NULL;

-- 2. Update provider_configurations table to increase max_output_tokens
UPDATE provider_configurations
SET
  max_output_tokens_premium = 10000,
  max_output_tokens_normal = 10000,
  max_output_tokens_eco = 10000,
  max_output_tokens_default = 10000,
  updated_at = NOW()
WHERE
  max_output_tokens_premium < 10000 OR
  max_output_tokens_normal < 10000 OR
  max_output_tokens_eco < 10000 OR
  max_output_tokens_default < 10000;

-- 3. Update admin_pricing_config table for global max_output_tokens
INSERT INTO admin_pricing_config (config_key, config_value, updated_at)
VALUES ('global_max_output_tokens', '{"max_tokens": 10000}'::jsonb, NOW())
ON CONFLICT (config_key)
DO UPDATE SET
  config_value = '{"max_tokens": 10000}'::jsonb,
  updated_at = NOW();

-- Verify the changes
SELECT
  'api_keys' as table_name,
  COUNT(*) as rows_updated,
  MIN(max_tokens) as min_max_tokens,
  MAX(max_tokens) as max_max_tokens,
  AVG(max_tokens) as avg_max_tokens
FROM api_keys
UNION ALL
SELECT
  'provider_configurations' as table_name,
  COUNT(*) as rows_updated,
  MIN(max_output_tokens_default) as min_max_tokens,
  MAX(max_output_tokens_premium) as max_max_tokens,
  AVG(max_output_tokens_default) as avg_max_tokens
FROM provider_configurations;
