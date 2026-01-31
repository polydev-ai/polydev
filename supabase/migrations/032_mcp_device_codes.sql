-- MCP Device Authorization Codes Table
-- Implements OAuth Device Authorization Grant (RFC 8628) for CLI authentication

-- Create the device codes table
CREATE TABLE IF NOT EXISTS mcp_device_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_code TEXT NOT NULL UNIQUE,
    user_code TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'denied', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_mcp_device_codes_device_code ON mcp_device_codes(device_code);
CREATE INDEX IF NOT EXISTS idx_mcp_device_codes_user_code ON mcp_device_codes(user_code);
CREATE INDEX IF NOT EXISTS idx_mcp_device_codes_status ON mcp_device_codes(status);
CREATE INDEX IF NOT EXISTS idx_mcp_device_codes_expires_at ON mcp_device_codes(expires_at);

-- Enable RLS
ALTER TABLE mcp_device_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything (for API operations)
CREATE POLICY "Service role full access on mcp_device_codes"
    ON mcp_device_codes
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy: Users can only complete/deny their own device codes
CREATE POLICY "Users can complete their own device codes"
    ON mcp_device_codes
    FOR UPDATE
    TO authenticated
    USING (
        status = 'pending' AND
        expires_at > NOW()
    )
    WITH CHECK (
        user_id = auth.uid()
    );

-- Auto-cleanup expired device codes (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_device_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM mcp_device_codes
    WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$;

-- Add comment for documentation
COMMENT ON TABLE mcp_device_codes IS 'Stores device authorization codes for CLI-based OAuth authentication (RFC 8628)';
COMMENT ON COLUMN mcp_device_codes.device_code IS 'Secret code used by CLI to poll for token';
COMMENT ON COLUMN mcp_device_codes.user_code IS 'Human-readable code displayed to user for verification';
COMMENT ON COLUMN mcp_device_codes.status IS 'Authorization status: pending, completed, denied, or expired';
