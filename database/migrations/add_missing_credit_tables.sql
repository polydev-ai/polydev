-- Migration: Add missing credit system tables
-- Created: 2025-01-02

-- Create credit_purchases table
CREATE TABLE IF NOT EXISTS credit_purchases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    stripe_payment_intent_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create model_usage table
CREATE TABLE IF NOT EXISTS model_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    openrouter_key_hash TEXT,
    model_id TEXT NOT NULL,
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    reasoning_tokens INTEGER NOT NULL DEFAULT 0,
    total_cost NUMERIC NOT NULL DEFAULT 0,
    request_timestamp TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create openrouter_keys table
CREATE TABLE IF NOT EXISTS openrouter_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    openrouter_key_hash TEXT NOT NULL,
    openrouter_key_label TEXT NOT NULL,
    spending_limit NUMERIC,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create user_budgets table
CREATE TABLE IF NOT EXISTS user_budgets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    daily_limit NUMERIC,
    weekly_limit NUMERIC,
    monthly_limit NUMERIC,
    preferred_models TEXT[] DEFAULT '{}',
    auto_top_up_enabled BOOLEAN DEFAULT false NOT NULL,
    auto_top_up_threshold NUMERIC,
    auto_top_up_amount NUMERIC,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_credit_purchases_user_id ON credit_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_status ON credit_purchases(status);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_stripe_payment_intent ON credit_purchases(stripe_payment_intent_id);

CREATE INDEX IF NOT EXISTS idx_model_usage_user_id ON model_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_model_usage_request_timestamp ON model_usage(request_timestamp);
CREATE INDEX IF NOT EXISTS idx_model_usage_model_id ON model_usage(model_id);

CREATE INDEX IF NOT EXISTS idx_openrouter_keys_user_id ON openrouter_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_openrouter_keys_active ON openrouter_keys(is_active);

CREATE INDEX IF NOT EXISTS idx_user_budgets_user_id ON user_budgets(user_id);

-- Enable RLS on all tables
ALTER TABLE credit_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE openrouter_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_budgets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- credit_purchases policies
CREATE POLICY "Users can view their own credit purchases"
    ON credit_purchases FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credit purchases"
    ON credit_purchases FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- model_usage policies
CREATE POLICY "Users can view their own model usage"
    ON model_usage FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own model usage"
    ON model_usage FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- openrouter_keys policies
CREATE POLICY "Users can manage their own openrouter keys"
    ON openrouter_keys FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- user_budgets policies
CREATE POLICY "Users can manage their own budgets"
    ON user_budgets FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON credit_purchases TO authenticated;
GRANT ALL ON model_usage TO authenticated;
GRANT ALL ON openrouter_keys TO authenticated;
GRANT ALL ON user_budgets TO authenticated;

-- Allow service role to access all data (for webhooks, etc.)
GRANT ALL ON credit_purchases TO service_role;
GRANT ALL ON model_usage TO service_role;
GRANT ALL ON openrouter_keys TO service_role;
GRANT ALL ON user_budgets TO service_role;