-- Fix API key default_model fields that contain provider prefixes
-- This migration cleans up any existing API keys that have provider prefixes in default_model

-- Update existing API keys to remove provider prefixes from default_model
UPDATE user_api_keys 
SET default_model = CASE 
  WHEN default_model LIKE '%/%' THEN 
    SUBSTRING(default_model FROM POSITION('/' IN REVERSE(default_model)) + 1)
  ELSE default_model 
END,
updated_at = NOW()
WHERE default_model LIKE '%/%';

-- Create a function to automatically clean model names when inserting/updating API keys
CREATE OR REPLACE FUNCTION clean_api_key_model_name()
RETURNS TRIGGER AS $$
BEGIN
  -- Strip provider prefix from default_model if it exists
  IF NEW.default_model IS NOT NULL AND NEW.default_model LIKE '%/%' THEN
    -- Get the part after the last slash
    NEW.default_model := SUBSTRING(NEW.default_model FROM POSITION('/' IN REVERSE(NEW.default_model)) + 1);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically clean model names on insert/update
DROP TRIGGER IF EXISTS trigger_clean_api_key_model_name ON user_api_keys;
CREATE TRIGGER trigger_clean_api_key_model_name
  BEFORE INSERT OR UPDATE ON user_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION clean_api_key_model_name();