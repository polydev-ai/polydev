-- Add missing providers to providers_registry
-- This ensures all provider references have corresponding registry entries

-- Add x-ai as the normalized form (xai already exists but we use x-ai internally)
INSERT INTO providers_registry (id, name, display_name, is_active)
VALUES ('x-ai', 'xAI', 'xAI', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  display_name = EXCLUDED.display_name,
  is_active = EXCLUDED.is_active;

-- Add zai-coding-plan provider (Zhipu AI coding specialized endpoint)
INSERT INTO providers_registry (id, name, display_name, description, is_active, website, supports_streaming, supports_tools)
VALUES (
  'zai-coding-plan',
  'Zhipu AI Coding',
  'Zhipu AI (Coding Plan)',
  'Zhipu AI specialized coding endpoint for GLM models',
  true,
  'https://open.bigmodel.cn/',
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  website = EXCLUDED.website,
  supports_streaming = EXCLUDED.supports_streaming,
  supports_tools = EXCLUDED.supports_tools;

-- Update google-vertex entries to point to google as the canonical provider
-- but keep them for backward compatibility
UPDATE providers_registry
SET display_name = 'Google (Vertex AI)'
WHERE id IN ('google-vertex', 'google-vertex-anthropic')
  AND is_active = true;

-- Ensure main google provider exists and is properly configured
INSERT INTO providers_registry (id, name, display_name, is_active, supports_streaming, supports_tools, supports_images)
VALUES ('google', 'Google', 'Google', true, true, true, true)
ON CONFLICT (id) DO UPDATE SET
  is_active = true,
  supports_streaming = COALESCE(providers_registry.supports_streaming, true),
  supports_tools = COALESCE(providers_registry.supports_tools, true),
  supports_images = COALESCE(providers_registry.supports_images, true);

-- Update models that reference old provider IDs to use normalized ones
-- This is a one-time migration to fix existing data
UPDATE models_registry
SET provider_id = 'x-ai'
WHERE provider_id = 'xai'
  AND NOT EXISTS (
    SELECT 1 FROM models_registry m2
    WHERE m2.provider_id = 'x-ai'
      AND m2.friendly_id = models_registry.friendly_id
  );

-- Add index on provider_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_models_registry_provider_id
  ON models_registry(provider_id)
  WHERE is_active = true;

-- Add comments explaining the providers
COMMENT ON TABLE providers_registry IS 'Registry of all AI model providers with their capabilities and configuration';

-- Create a view that shows provider usage summary
CREATE OR REPLACE VIEW provider_usage_summary AS
SELECT
  uak.provider,
  pr.display_name as provider_display_name,
  COUNT(DISTINCT uak.id) as total_keys,
  COUNT(DISTINCT CASE WHEN uak.is_admin_key THEN uak.id END) as admin_keys,
  COUNT(DISTINCT CASE WHEN NOT uak.is_admin_key THEN uak.id END) as user_keys,
  COUNT(DISTINCT CASE WHEN uak.active THEN uak.id END) as active_keys,
  MAX(uak.updated_at) as last_key_update
FROM user_api_keys uak
LEFT JOIN providers_registry pr ON pr.id = uak.provider
GROUP BY uak.provider, pr.display_name
ORDER BY total_keys DESC;

GRANT SELECT ON provider_usage_summary TO service_role;

COMMENT ON VIEW provider_usage_summary IS 'Summary of API key distribution across providers';
