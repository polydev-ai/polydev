-- Migration: Add MCP authentication tokens and CLI status logging tables

-- Create MCP tokens table for secure CLI status reporting
CREATE TABLE IF NOT EXISTS mcp_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE
);

-- Create index for efficient token lookups
CREATE INDEX IF NOT EXISTS idx_mcp_tokens_user_id ON mcp_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_mcp_tokens_token ON mcp_tokens(token);
CREATE INDEX IF NOT EXISTS idx_mcp_tokens_active ON mcp_tokens(is_active, expires_at);

-- Create CLI status logs table for monitoring and debugging
CREATE TABLE IF NOT EXISTS cli_status_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('claude_code', 'codex_cli', 'gemini_cli')),
    status TEXT NOT NULL CHECK (status IN ('available', 'unavailable', 'not_installed', 'checking')),
    message TEXT,
    cli_version TEXT,
    cli_path TEXT,
    authenticated BOOLEAN,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    source TEXT DEFAULT 'mcp_bridge' CHECK (source IN ('mcp_bridge', 'manual', 'web_ui')),
    additional_data JSONB
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_cli_status_logs_user_provider ON cli_status_logs(user_id, provider);
CREATE INDEX IF NOT EXISTS idx_cli_status_logs_timestamp ON cli_status_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_cli_status_logs_provider ON cli_status_logs(provider);

-- Add new columns to existing CLI provider configurations table
ALTER TABLE cli_provider_configurations 
ADD COLUMN IF NOT EXISTS cli_version TEXT,
ADD COLUMN IF NOT EXISTS authenticated BOOLEAN,
ADD COLUMN IF NOT EXISTS last_used TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS additional_info JSONB;

-- Create RLS policies for MCP tokens
ALTER TABLE mcp_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own MCP tokens" ON mcp_tokens
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own MCP tokens" ON mcp_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own MCP tokens" ON mcp_tokens
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own MCP tokens" ON mcp_tokens
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for CLI status logs
ALTER TABLE cli_status_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own CLI status logs" ON cli_status_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can insert CLI status logs" ON cli_status_logs
    FOR INSERT WITH CHECK (true); -- MCP bridges need to insert without user session

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for mcp_tokens updated_at
CREATE TRIGGER update_mcp_tokens_updated_at BEFORE UPDATE ON mcp_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add helpful comments
COMMENT ON TABLE mcp_tokens IS 'Secure tokens for MCP bridge authentication';
COMMENT ON TABLE cli_status_logs IS 'Audit log of CLI tool status changes from MCP bridges';
COMMENT ON COLUMN cli_provider_configurations.cli_version IS 'Version of the CLI tool reported by MCP';
COMMENT ON COLUMN cli_provider_configurations.authenticated IS 'Whether CLI tool is authenticated';
COMMENT ON COLUMN cli_provider_configurations.last_used IS 'Last time CLI tool was used';
COMMENT ON COLUMN cli_provider_configurations.additional_info IS 'Additional CLI tool information from MCP';