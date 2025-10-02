-- Fix admin_api_keys_usage view to use correct table name
-- The view was referencing non-existent 'admin_system_api_keys' table
-- Should use 'user_api_keys' with is_admin_key = true filter

DROP VIEW IF EXISTS admin_api_keys_usage;

CREATE OR REPLACE VIEW admin_api_keys_usage AS
SELECT
  pu.provider_source_id,
  uak.key_name,
  uak.provider as key_provider,
  COUNT(*) as total_requests,
  COUNT(DISTINCT pu.user_id) as unique_users,
  SUM(pu.estimated_cost) as total_cost,
  SUM(pu.input_tokens) as total_input_tokens,
  SUM(pu.output_tokens) as total_output_tokens,
  date_trunc('day', pu.created_at) as date
FROM perspective_usage pu
JOIN user_api_keys uak ON pu.provider_source_id = uak.id
WHERE pu.created_at >= NOW() - INTERVAL '30 days'
  AND uak.is_admin_key = true
  AND (pu.request_metadata->>'source_type' = 'admin_key' OR pu.request_metadata->>'fallback_method' = 'admin')
GROUP BY pu.provider_source_id, uak.key_name, uak.provider, date_trunc('day', pu.created_at)
ORDER BY date DESC, total_requests DESC;

-- Grant access to service role
GRANT SELECT ON admin_api_keys_usage TO service_role;

COMMENT ON VIEW admin_api_keys_usage IS 'Admin API keys usage analytics - tracks requests made using admin-provided API keys';
