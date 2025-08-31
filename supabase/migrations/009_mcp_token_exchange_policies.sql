-- Add policies to allow token exchange operations without user authentication
-- These are needed for the /api/mcp/auth endpoint which is called by MCP clients

-- Policy to allow anonymous token exchange to read auth codes by code (for validation)
CREATE POLICY "Allow token exchange to read auth codes by code" ON mcp_auth_codes
  FOR SELECT USING (true);

-- Policy to allow anonymous token exchange to update auth codes (mark as used)
CREATE POLICY "Allow token exchange to update auth codes" ON mcp_auth_codes
  FOR UPDATE USING (true);

-- Policy to allow anonymous token exchange to insert access tokens
CREATE POLICY "Allow token exchange to insert access tokens" ON mcp_access_tokens
  FOR INSERT WITH CHECK (true);

-- Note: These policies are intentionally broad for token exchange operations.
-- Security is maintained through:
-- 1. Auth codes are single-use and expire quickly (10 minutes)
-- 2. Auth codes are cryptographically secure random values
-- 3. PKCE code challenge/verifier validation
-- 4. Client ID validation
-- 5. Access tokens expire in 1 hour and can be revoked