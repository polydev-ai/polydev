-- Revert google-vertex display names back to "Vertex AI"
-- The admin chose "Google" as the provider, not "Vertex", so these should remain separate

UPDATE providers_registry
SET display_name = 'Vertex AI'
WHERE id IN ('google-vertex', 'google-vertex-anthropic')
  AND is_active = true;

COMMENT ON COLUMN providers_registry.display_name IS
'Human-readable display name for the provider. Use the base provider name (e.g., "Google") for the main entry, and descriptive names (e.g., "Vertex AI") for specialized endpoints';
