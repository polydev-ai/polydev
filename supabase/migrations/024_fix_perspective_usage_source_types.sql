-- Fix perspective_usage source_type for admin keys
-- Admin keys were being labeled as 'user_key' due to provider name case mismatch
-- This updates all historical usage records for admin keys to have correct source_type

UPDATE perspective_usage
SET request_metadata = jsonb_set(
  COALESCE(request_metadata, '{}'::jsonb),
  '{source_type}',
  '"admin_key"'
)
WHERE provider_source_id IN (
  SELECT id FROM user_api_keys WHERE is_admin_key = true
)
AND (
  request_metadata->>'source_type' = 'user_key'
  OR request_metadata->>'source_type' IS NULL
);

COMMENT ON TABLE perspective_usage IS
'Records all LLM API usage with source tracking. source_type can be: user_key (user''s own API key), admin_key (admin-provided key), cli (CLI tool), or admin_credits (admin credit allowance)';
