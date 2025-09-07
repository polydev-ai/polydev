-- Create table for storing user OpenRouter API keys
CREATE TABLE IF NOT EXISTS openrouter_user_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  openrouter_key_id TEXT NOT NULL,
  openrouter_key_hash TEXT NOT NULL UNIQUE,
  openrouter_key_label TEXT NOT NULL,
  spending_limit DECIMAL(10,2) DEFAULT 10.00,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_active_user_key UNIQUE(user_id, is_active) DEFERRABLE INITIALLY DEFERRED
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_openrouter_user_keys_user_id ON openrouter_user_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_openrouter_user_keys_hash ON openrouter_user_keys(openrouter_key_hash);
CREATE INDEX IF NOT EXISTS idx_openrouter_user_keys_active ON openrouter_user_keys(user_id, is_active);

-- Enable RLS
ALTER TABLE openrouter_user_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own OpenRouter keys" ON openrouter_user_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own OpenRouter keys" ON openrouter_user_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own OpenRouter keys" ON openrouter_user_keys
  FOR UPDATE USING (auth.uid() = user_id);

-- Service role can manage all keys
CREATE POLICY "Service role can manage all OpenRouter keys" ON openrouter_user_keys
  FOR ALL USING (current_setting('role') = 'service_role');