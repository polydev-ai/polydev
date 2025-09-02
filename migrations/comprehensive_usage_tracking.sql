-- Comprehensive Usage Tracking Schema
-- Supports 3 paths: Own API Keys, Credits, CLI Tools

-- Update user_credits table to support promotional credits
ALTER TABLE user_credits ADD COLUMN IF NOT EXISTS promotional_balance DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE user_credits ADD COLUMN IF NOT EXISTS promotional_total DECIMAL(10,2) DEFAULT 0.00;

-- Create usage_sessions table for comprehensive tracking
CREATE TABLE IF NOT EXISTS usage_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    session_type TEXT NOT NULL CHECK (session_type IN ('api_key', 'credits', 'cli_tool')),
    tool_name TEXT, -- For CLI tools: 'claude_code', 'github_copilot', 'codex_cli', 'gemini_cli', etc.
    cli_path TEXT, -- Custom CLI path if user provided
    model_name TEXT,
    provider TEXT,
    message_count INTEGER DEFAULT 1,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    cost_usd DECIMAL(10,4) DEFAULT 0.0000,
    cost_credits DECIMAL(10,4) DEFAULT 0.0000,
    promotional_credits_used DECIMAL(10,4) DEFAULT 0.0000,
    session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_end TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create CLI configurations table
CREATE TABLE IF NOT EXISTS user_cli_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    tool_name TEXT NOT NULL, -- 'claude_code', 'github_copilot', 'codex_cli', 'gemini_cli'
    cli_path TEXT NOT NULL,
    is_default BOOLEAN DEFAULT TRUE,
    auto_detect BOOLEAN DEFAULT TRUE,
    enabled BOOLEAN DEFAULT TRUE,
    config_options JSONB DEFAULT '{}',
    last_verified TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, tool_name)
);

-- Create promotional credits tracking
CREATE TABLE IF NOT EXISTS promotional_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    amount DECIMAL(10,2) NOT NULL,
    reason TEXT NOT NULL, -- 'welcome_bonus', 'referral', 'campaign_xyz', etc.
    expires_at TIMESTAMP WITH TIME ZONE,
    used_amount DECIMAL(10,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    granted_by UUID REFERENCES auth.users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Create monthly usage summary for billing
CREATE TABLE IF NOT EXISTS monthly_usage_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    api_key_messages INTEGER DEFAULT 0,
    credit_messages INTEGER DEFAULT 0,
    cli_tool_messages INTEGER DEFAULT 0,
    total_messages INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    total_cost_usd DECIMAL(10,2) DEFAULT 0.00,
    total_credits_used DECIMAL(10,2) DEFAULT 0.00,
    promotional_credits_used DECIMAL(10,2) DEFAULT 0.00,
    breakdown JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, year, month)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_usage_sessions_user_id ON usage_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_sessions_session_type ON usage_sessions(session_type);
CREATE INDEX IF NOT EXISTS idx_usage_sessions_created_at ON usage_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_cli_configs_user_id ON user_cli_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_promotional_credits_user_id ON promotional_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_summary_user_date ON monthly_usage_summary(user_id, year, month);

-- RLS policies
ALTER TABLE usage_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cli_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotional_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_usage_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage sessions" ON usage_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage sessions" ON usage_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own CLI configs" ON user_cli_configs
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own promotional credits" ON promotional_credits
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own monthly summary" ON monthly_usage_summary
    FOR SELECT USING (auth.uid() = user_id);

-- Functions for usage tracking
CREATE OR REPLACE FUNCTION track_usage_session(
    p_user_id UUID,
    p_session_type TEXT,
    p_tool_name TEXT DEFAULT NULL,
    p_model_name TEXT DEFAULT NULL,
    p_provider TEXT DEFAULT NULL,
    p_message_count INTEGER DEFAULT 1,
    p_input_tokens INTEGER DEFAULT 0,
    p_output_tokens INTEGER DEFAULT 0,
    p_cost_usd DECIMAL DEFAULT 0.0000,
    p_cost_credits DECIMAL DEFAULT 0.0000,
    p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    session_id UUID;
BEGIN
    INSERT INTO usage_sessions (
        user_id, session_type, tool_name, model_name, provider,
        message_count, input_tokens, output_tokens, 
        total_tokens, cost_usd, cost_credits, metadata
    ) VALUES (
        p_user_id, p_session_type, p_tool_name, p_model_name, p_provider,
        p_message_count, p_input_tokens, p_output_tokens,
        p_input_tokens + p_output_tokens, p_cost_usd, p_cost_credits, p_metadata
    ) RETURNING id INTO session_id;
    
    -- Update monthly summary
    INSERT INTO monthly_usage_summary (
        user_id, year, month, total_messages, total_tokens, 
        total_cost_usd, total_credits_used,
        api_key_messages, credit_messages, cli_tool_messages
    ) VALUES (
        p_user_id, 
        EXTRACT(YEAR FROM NOW())::INTEGER,
        EXTRACT(MONTH FROM NOW())::INTEGER,
        p_message_count,
        p_input_tokens + p_output_tokens,
        p_cost_usd,
        p_cost_credits,
        CASE WHEN p_session_type = 'api_key' THEN p_message_count ELSE 0 END,
        CASE WHEN p_session_type = 'credits' THEN p_message_count ELSE 0 END,
        CASE WHEN p_session_type = 'cli_tool' THEN p_message_count ELSE 0 END
    ) ON CONFLICT (user_id, year, month) DO UPDATE SET
        total_messages = monthly_usage_summary.total_messages + p_message_count,
        total_tokens = monthly_usage_summary.total_tokens + (p_input_tokens + p_output_tokens),
        total_cost_usd = monthly_usage_summary.total_cost_usd + p_cost_usd,
        total_credits_used = monthly_usage_summary.total_credits_used + p_cost_credits,
        api_key_messages = monthly_usage_summary.api_key_messages + 
            CASE WHEN p_session_type = 'api_key' THEN p_message_count ELSE 0 END,
        credit_messages = monthly_usage_summary.credit_messages + 
            CASE WHEN p_session_type = 'credits' THEN p_message_count ELSE 0 END,
        cli_tool_messages = monthly_usage_summary.cli_tool_messages + 
            CASE WHEN p_session_type = 'cli_tool' THEN p_message_count ELSE 0 END,
        updated_at = NOW();
    
    RETURN session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to grant promotional credits
CREATE OR REPLACE FUNCTION grant_promotional_credits(
    p_user_id UUID,
    p_amount DECIMAL,
    p_reason TEXT,
    p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_granted_by UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    credit_id UUID;
BEGIN
    INSERT INTO promotional_credits (
        user_id, amount, reason, expires_at, granted_by
    ) VALUES (
        p_user_id, p_amount, p_reason, p_expires_at, p_granted_by
    ) RETURNING id INTO credit_id;
    
    -- Update user credits balance
    INSERT INTO user_credits (user_id, balance, promotional_balance, promotional_total)
    VALUES (p_user_id, 0, p_amount, p_amount)
    ON CONFLICT (user_id) DO UPDATE SET
        promotional_balance = user_credits.promotional_balance + p_amount,
        promotional_total = user_credits.promotional_total + p_amount,
        updated_at = NOW();
    
    RETURN credit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Default CLI configurations
INSERT INTO user_cli_configs (user_id, tool_name, cli_path, is_default, auto_detect) 
SELECT 
    auth.uid(),
    tool,
    path,
    true,
    true
FROM (
    VALUES 
        ('claude_code', '/usr/local/bin/claude'),
        ('github_copilot', '/usr/local/bin/gh'),
        ('codex_cli', '/usr/local/bin/codex'),
        ('gemini_cli', '/usr/local/bin/gemini'),
        ('openai_cli', '/usr/local/bin/openai')
) AS defaults(tool, path)
WHERE auth.uid() IS NOT NULL
ON CONFLICT (user_id, tool_name) DO NOTHING;