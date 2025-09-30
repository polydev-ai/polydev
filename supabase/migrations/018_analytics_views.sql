-- Analytics Views and Functions
-- Provides optimized queries for the analytics dashboard

-- 1. System-wide statistics view
CREATE OR REPLACE VIEW admin_system_stats AS
SELECT
  (SELECT COUNT(DISTINCT id) FROM auth.users) as total_users,
  (SELECT COUNT(DISTINCT id) FROM auth.users WHERE created_at >= date_trunc('month', NOW())) as new_users_this_month,
  (SELECT COUNT(DISTINCT user_id) FROM perspective_usage WHERE created_at >= date_trunc('month', NOW())) as active_users_this_month,
  (SELECT COALESCE(SUM(total_messages), 0) FROM monthly_usage_summary WHERE month_year = to_char(NOW(), 'YYYY-MM')) as total_messages_this_month,
  (SELECT COALESCE(SUM(premium_perspectives_used), 0) FROM monthly_usage_summary WHERE month_year = to_char(NOW(), 'YYYY-MM')) as premium_perspectives_this_month,
  (SELECT COALESCE(SUM(normal_perspectives_used), 0) FROM monthly_usage_summary WHERE month_year = to_char(NOW(), 'YYYY-MM')) as normal_perspectives_this_month,
  (SELECT COALESCE(SUM(eco_perspectives_used), 0) FROM monthly_usage_summary WHERE month_year = to_char(NOW(), 'YYYY-MM')) as eco_perspectives_this_month,
  (SELECT COALESCE(SUM(total_estimated_cost), 0) FROM monthly_usage_summary WHERE month_year = to_char(NOW(), 'YYYY-MM')) as total_cost_this_month,
  (SELECT COUNT(*) FROM user_perspective_quotas WHERE plan_tier = 'free') as free_users,
  (SELECT COUNT(*) FROM user_perspective_quotas WHERE plan_tier = 'plus') as plus_users,
  (SELECT COUNT(*) FROM user_perspective_quotas WHERE plan_tier = 'pro') as pro_users;

-- 2. Provider usage analytics view
CREATE OR REPLACE VIEW admin_provider_analytics AS
SELECT
  provider,
  COUNT(*) as total_requests,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT session_id) as unique_sessions,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  SUM(total_tokens) as total_tokens,
  SUM(estimated_cost) as total_cost,
  AVG(estimated_cost) as avg_cost_per_request,
  date_trunc('day', created_at) as date
FROM perspective_usage
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY provider, date_trunc('day', created_at)
ORDER BY date DESC, total_requests DESC;

-- 3. Model usage analytics view
CREATE OR REPLACE VIEW admin_model_analytics AS
SELECT
  model_name,
  model_tier,
  provider,
  COUNT(*) as total_requests,
  COUNT(DISTINCT user_id) as unique_users,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  SUM(estimated_cost) as total_cost,
  AVG(estimated_cost) as avg_cost_per_request,
  date_trunc('day', created_at) as date
FROM perspective_usage
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY model_name, model_tier, provider, date_trunc('day', created_at)
ORDER BY date DESC, total_requests DESC;

-- 4. Admin API keys usage view
CREATE OR REPLACE VIEW admin_api_keys_usage AS
SELECT
  pu.provider_source_id,
  ask.key_name,
  ask.provider as key_provider,
  COUNT(*) as total_requests,
  COUNT(DISTINCT pu.user_id) as unique_users,
  SUM(pu.estimated_cost) as total_cost,
  SUM(pu.input_tokens) as total_input_tokens,
  SUM(pu.output_tokens) as total_output_tokens,
  date_trunc('day', pu.created_at) as date
FROM perspective_usage pu
JOIN admin_system_api_keys ask ON pu.provider_source_id = ask.id
WHERE pu.created_at >= NOW() - INTERVAL '30 days'
  AND (pu.request_metadata->>'source_type' = 'admin_key' OR pu.request_metadata->>'source_type' = 'admin_credits')
GROUP BY pu.provider_source_id, ask.key_name, ask.provider, date_trunc('day', pu.created_at)
ORDER BY date DESC, total_requests DESC;

-- 5. User API keys usage view
CREATE OR REPLACE VIEW admin_user_keys_analytics AS
SELECT
  COUNT(DISTINCT id) as total_user_keys,
  COUNT(DISTINCT user_id) as users_with_keys,
  provider,
  COUNT(*) as keys_per_provider
FROM user_api_keys
WHERE is_active = true
GROUP BY provider;

-- 6. Bonus quotas analytics view
CREATE OR REPLACE VIEW admin_bonus_analytics AS
SELECT
  bonus_type,
  COUNT(*) as total_bonuses,
  SUM(bonus_messages) as total_messages_granted,
  SUM(messages_used) as total_messages_used,
  SUM(bonus_messages - messages_used) as total_messages_remaining,
  COUNT(*) FILTER (WHERE expires_at IS NULL OR expires_at > NOW()) as active_bonuses,
  COUNT(*) FILTER (WHERE expires_at IS NOT NULL AND expires_at <= NOW()) as expired_bonuses,
  COUNT(*) FILTER (WHERE messages_used >= bonus_messages) as fully_used_bonuses
FROM user_bonus_quotas
GROUP BY bonus_type;

-- 7. Daily usage trends view
CREATE OR REPLACE VIEW admin_daily_trends AS
SELECT
  date_trunc('day', created_at) as date,
  COUNT(*) as total_requests,
  COUNT(DISTINCT user_id) as active_users,
  SUM(estimated_cost) as total_cost,
  SUM(CASE WHEN model_tier = 'premium' THEN 1 ELSE 0 END) as premium_requests,
  SUM(CASE WHEN model_tier = 'normal' THEN 1 ELSE 0 END) as normal_requests,
  SUM(CASE WHEN model_tier = 'eco' THEN 1 ELSE 0 END) as eco_requests,
  SUM(CASE WHEN request_metadata->>'used_bonus_message' = 'true' THEN 1 ELSE 0 END) as bonus_messages_used
FROM perspective_usage
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY date_trunc('day', created_at)
ORDER BY date DESC;

-- 8. User activity summary view
CREATE OR REPLACE VIEW admin_user_activity AS
SELECT
  u.id as user_id,
  p.email,
  p.current_plan_tier,
  q.messages_used,
  q.messages_per_month,
  q.premium_perspectives_used,
  q.premium_perspectives_limit,
  q.normal_perspectives_used,
  q.normal_perspectives_limit,
  q.eco_perspectives_used,
  q.eco_perspectives_limit,
  (SELECT COUNT(*) FROM user_api_keys WHERE user_id = u.id AND is_active = true) as user_keys_count,
  (SELECT COALESCE(SUM(bonus_messages - messages_used), 0) FROM user_bonus_quotas WHERE user_id = u.id AND (expires_at IS NULL OR expires_at > NOW())) as bonus_balance,
  (SELECT COUNT(*) FROM perspective_usage WHERE user_id = u.id AND created_at >= date_trunc('month', NOW())) as requests_this_month,
  (SELECT COALESCE(SUM(estimated_cost), 0) FROM perspective_usage WHERE user_id = u.id AND created_at >= date_trunc('month', NOW())) as cost_this_month,
  u.created_at as user_created_at,
  (SELECT MAX(created_at) FROM perspective_usage WHERE user_id = u.id) as last_activity
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN user_perspective_quotas q ON u.id = q.user_id
ORDER BY requests_this_month DESC;

-- 9. Cost breakdown by tier view
CREATE OR REPLACE VIEW admin_cost_by_tier AS
SELECT
  model_tier,
  date_trunc('day', created_at) as date,
  COUNT(*) as requests,
  SUM(estimated_cost) as total_cost,
  AVG(estimated_cost) as avg_cost_per_request,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens
FROM perspective_usage
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY model_tier, date_trunc('day', created_at)
ORDER BY date DESC, total_cost DESC;

-- 10. Top users by usage view
CREATE OR REPLACE VIEW admin_top_users AS
SELECT
  pu.user_id,
  p.email,
  p.current_plan_tier,
  COUNT(*) as total_requests,
  SUM(pu.estimated_cost) as total_cost,
  SUM(pu.input_tokens) as total_input_tokens,
  SUM(pu.output_tokens) as total_output_tokens,
  MAX(pu.created_at) as last_activity
FROM perspective_usage pu
LEFT JOIN profiles p ON pu.user_id = p.id
WHERE pu.created_at >= NOW() - INTERVAL '30 days'
GROUP BY pu.user_id, p.email, p.current_plan_tier
ORDER BY total_requests DESC
LIMIT 100;

-- Function: Get system stats for a date range
CREATE OR REPLACE FUNCTION get_system_stats(
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  total_requests BIGINT,
  unique_users BIGINT,
  total_cost NUMERIC,
  total_input_tokens BIGINT,
  total_output_tokens BIGINT,
  premium_requests BIGINT,
  normal_requests BIGINT,
  eco_requests BIGINT,
  bonus_messages_used BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT,
    COUNT(DISTINCT user_id)::BIGINT,
    COALESCE(SUM(estimated_cost), 0)::NUMERIC,
    COALESCE(SUM(input_tokens), 0)::BIGINT,
    COALESCE(SUM(output_tokens), 0)::BIGINT,
    COUNT(*) FILTER (WHERE model_tier = 'premium')::BIGINT,
    COUNT(*) FILTER (WHERE model_tier = 'normal')::BIGINT,
    COUNT(*) FILTER (WHERE model_tier = 'eco')::BIGINT,
    COUNT(*) FILTER (WHERE request_metadata->>'used_bonus_message' = 'true')::BIGINT
  FROM perspective_usage
  WHERE created_at BETWEEN start_date AND end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get provider usage for a date range
CREATE OR REPLACE FUNCTION get_provider_usage(
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  provider TEXT,
  total_requests BIGINT,
  unique_users BIGINT,
  total_cost NUMERIC,
  total_tokens BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pu.provider,
    COUNT(*)::BIGINT,
    COUNT(DISTINCT pu.user_id)::BIGINT,
    COALESCE(SUM(pu.estimated_cost), 0)::NUMERIC,
    COALESCE(SUM(pu.total_tokens), 0)::BIGINT
  FROM perspective_usage pu
  WHERE pu.created_at BETWEEN start_date AND end_date
  GROUP BY pu.provider
  ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get model usage for a date range
CREATE OR REPLACE FUNCTION get_model_usage(
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  model_name TEXT,
  model_tier TEXT,
  provider TEXT,
  total_requests BIGINT,
  unique_users BIGINT,
  total_cost NUMERIC,
  avg_cost NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pu.model_name,
    pu.model_tier,
    pu.provider,
    COUNT(*)::BIGINT,
    COUNT(DISTINCT pu.user_id)::BIGINT,
    COALESCE(SUM(pu.estimated_cost), 0)::NUMERIC,
    COALESCE(AVG(pu.estimated_cost), 0)::NUMERIC
  FROM perspective_usage pu
  WHERE pu.created_at BETWEEN start_date AND end_date
  GROUP BY pu.model_name, pu.model_tier, pu.provider
  ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to service role
GRANT SELECT ON admin_system_stats TO service_role;
GRANT SELECT ON admin_provider_analytics TO service_role;
GRANT SELECT ON admin_model_analytics TO service_role;
GRANT SELECT ON admin_api_keys_usage TO service_role;
GRANT SELECT ON admin_user_keys_analytics TO service_role;
GRANT SELECT ON admin_bonus_analytics TO service_role;
GRANT SELECT ON admin_daily_trends TO service_role;
GRANT SELECT ON admin_user_activity TO service_role;
GRANT SELECT ON admin_cost_by_tier TO service_role;
GRANT SELECT ON admin_top_users TO service_role;

GRANT EXECUTE ON FUNCTION get_system_stats TO service_role;
GRANT EXECUTE ON FUNCTION get_provider_usage TO service_role;
GRANT EXECUTE ON FUNCTION get_model_usage TO service_role;