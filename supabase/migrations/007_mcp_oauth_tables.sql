-- Create MCP OAuth authorization codes table
CREATE TABLE mcp_auth_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  client_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  redirect_uri TEXT NOT NULL,
  state TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for code lookups
CREATE INDEX mcp_auth_codes_code_idx ON mcp_auth_codes(code);
CREATE INDEX mcp_auth_codes_expires_idx ON mcp_auth_codes(expires_at);

-- Create MCP OAuth access tokens table
CREATE TABLE mcp_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  client_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

-- Create index for token lookups
CREATE INDEX mcp_access_tokens_token_idx ON mcp_access_tokens(token);
CREATE INDEX mcp_access_tokens_user_idx ON mcp_access_tokens(user_id);
CREATE INDEX mcp_access_tokens_expires_idx ON mcp_access_tokens(expires_at);

-- Enable RLS
ALTER TABLE mcp_auth_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_access_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for auth codes
CREATE POLICY "Users can view their own auth codes" ON mcp_auth_codes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own auth codes" ON mcp_auth_codes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own auth codes" ON mcp_auth_codes
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for access tokens
CREATE POLICY "Users can view their own access tokens" ON mcp_access_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own access tokens" ON mcp_access_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own access tokens" ON mcp_access_tokens
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to clean up expired codes and tokens
CREATE OR REPLACE FUNCTION cleanup_expired_mcp_auth()
RETURNS void AS $$
BEGIN
  -- Delete expired authorization codes
  DELETE FROM mcp_auth_codes 
  WHERE expires_at < now() - INTERVAL '1 day';
  
  -- Delete expired access tokens
  DELETE FROM mcp_access_tokens 
  WHERE expires_at < now() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;