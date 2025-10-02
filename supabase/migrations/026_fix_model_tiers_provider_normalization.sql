-- Fix model_tiers provider IDs to match normalized form in user_api_keys
-- The admin_api_keys have "x-ai" but model_tiers has "xAI"

UPDATE model_tiers
SET provider = 'x-ai'
WHERE LOWER(provider) = 'xai'
  AND active = true;

-- Ensure future inserts are normalized by adding a trigger
CREATE OR REPLACE FUNCTION normalize_model_tiers_provider()
RETURNS TRIGGER AS $$
BEGIN
  NEW.provider = (
    SELECT COALESCE(
      (SELECT id FROM providers_registry WHERE LOWER(id) = LOWER(NEW.provider) LIMIT 1),
      LOWER(REGEXP_REPLACE(TRIM(NEW.provider), '[^a-zA-Z0-9]+', '-', 'g'))
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS normalize_model_tiers_provider_trigger ON model_tiers;
CREATE TRIGGER normalize_model_tiers_provider_trigger
  BEFORE INSERT OR UPDATE ON model_tiers
  FOR EACH ROW
  EXECUTE FUNCTION normalize_model_tiers_provider();

COMMENT ON TABLE model_tiers IS
'Model tier configurations for different providers. Provider names are automatically normalized to match providers_registry IDs (lowercase, hyphenated format).';
