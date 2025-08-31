-- Add PKCE support columns to mcp_auth_codes table
ALTER TABLE mcp_auth_codes 
ADD COLUMN code_challenge TEXT,
ADD COLUMN code_challenge_method TEXT;

-- Add index for PKCE lookups (optional but good for performance)
CREATE INDEX IF NOT EXISTS mcp_auth_codes_challenge_idx ON mcp_auth_codes(code_challenge) WHERE code_challenge IS NOT NULL;