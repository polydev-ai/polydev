-- Create user preferences table for default models and settings
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  default_provider TEXT,
  default_model TEXT,
  preferred_providers TEXT[] DEFAULT '{}',
  model_preferences JSONB DEFAULT '{}', -- Store provider-specific model preferences
  mcp_settings JSONB DEFAULT '{}', -- Store MCP-specific settings like rate limits, etc.
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT user_preferences_user_id_unique UNIQUE (user_id)
);

-- Create index for user queries
CREATE INDEX user_preferences_user_id_idx ON user_preferences(user_id);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only see their own preferences
CREATE POLICY "Users can view their own preferences" ON user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" ON user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" ON user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences" ON user_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_user_preferences_timestamp
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_preferences_updated_at();

-- Create default preferences for existing users
INSERT INTO user_preferences (user_id, default_provider, default_model, preferred_providers, model_preferences)
SELECT 
  id,
  'openai',
  'gpt-4o',
  ARRAY['openai', 'anthropic', 'google'],
  '{
    "openai": "gpt-4o",
    "anthropic": "claude-3-5-sonnet-20241022",
    "google": "gemini-2.0-flash-exp"
  }'::jsonb
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_preferences);