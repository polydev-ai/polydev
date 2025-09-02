-- Credit System Database Schema Migration
-- This creates all necessary tables for the OpenRouter credit-based subscription system

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Credit Management
CREATE TABLE IF NOT EXISTS user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  balance DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
  total_purchased DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
  total_spent DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT balance_non_negative CHECK (balance >= 0),
  CONSTRAINT totals_non_negative CHECK (total_purchased >= 0 AND total_spent >= 0)
);

-- Create unique index for user_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);

-- Credit Purchase History
CREATE TABLE IF NOT EXISTS credit_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  stripe_payment_intent_id TEXT,
  status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'refunded')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT amount_positive CHECK (amount > 0)
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_credit_purchases_user_id ON credit_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_status ON credit_purchases(status);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_stripe_id ON credit_purchases(stripe_payment_intent_id);

-- OpenRouter API Keys (per user)
CREATE TABLE IF NOT EXISTS openrouter_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  openrouter_key_hash TEXT NOT NULL,
  openrouter_key_label TEXT NOT NULL,
  spending_limit DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT spending_limit_positive CHECK (spending_limit IS NULL OR spending_limit > 0)
);

-- Ensure one active key per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_openrouter_keys_user_active ON openrouter_keys(user_id) 
  WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_openrouter_keys_hash ON openrouter_keys(openrouter_key_hash);

-- Model Usage Tracking
CREATE TABLE IF NOT EXISTS model_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  openrouter_key_hash TEXT,
  model_id TEXT NOT NULL,
  prompt_tokens INTEGER DEFAULT 0 NOT NULL,
  completion_tokens INTEGER DEFAULT 0 NOT NULL,
  reasoning_tokens INTEGER DEFAULT 0 NOT NULL,
  total_cost DECIMAL(10,6) NOT NULL,
  request_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT tokens_non_negative CHECK (
    prompt_tokens >= 0 AND 
    completion_tokens >= 0 AND 
    reasoning_tokens >= 0
  ),
  CONSTRAINT cost_non_negative CHECK (total_cost >= 0)
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_model_usage_user_id ON model_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_model_usage_timestamp ON model_usage(request_timestamp);
CREATE INDEX IF NOT EXISTS idx_model_usage_model_id ON model_usage(model_id);
CREATE INDEX IF NOT EXISTS idx_model_usage_user_timestamp ON model_usage(user_id, request_timestamp);

-- User Budget Settings
CREATE TABLE IF NOT EXISTS user_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  daily_limit DECIMAL(10,2),
  weekly_limit DECIMAL(10,2),
  monthly_limit DECIMAL(10,2),
  preferred_models TEXT[] DEFAULT '{}', -- Array of model IDs
  auto_top_up_enabled BOOLEAN DEFAULT false,
  auto_top_up_threshold DECIMAL(10,2),
  auto_top_up_amount DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT limits_positive CHECK (
    (daily_limit IS NULL OR daily_limit > 0) AND
    (weekly_limit IS NULL OR weekly_limit > 0) AND
    (monthly_limit IS NULL OR monthly_limit > 0) AND
    (auto_top_up_threshold IS NULL OR auto_top_up_threshold >= 0) AND
    (auto_top_up_amount IS NULL OR auto_top_up_amount > 0)
  )
);

-- One budget record per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_budgets_user_id ON user_budgets(user_id);

-- Model Pricing Cache
CREATE TABLE IF NOT EXISTS model_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id TEXT UNIQUE NOT NULL,
  model_name TEXT NOT NULL,
  prompt_price DECIMAL(12,8) NOT NULL,
  completion_price DECIMAL(12,8) NOT NULL,
  reasoning_price DECIMAL(12,8) DEFAULT 0,
  context_length INTEGER,
  description TEXT,
  architecture JSONB, -- Store model architecture info
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT prices_non_negative CHECK (
    prompt_price >= 0 AND 
    completion_price >= 0 AND 
    reasoning_price >= 0
  )
);

-- Index for fast model lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_model_pricing_model_id ON model_pricing(model_id);
CREATE INDEX IF NOT EXISTS idx_model_pricing_updated ON model_pricing(last_updated);

-- Create function to automatically update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at columns
CREATE TRIGGER update_user_credits_updated_at BEFORE UPDATE ON user_credits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_openrouter_keys_updated_at BEFORE UPDATE ON openrouter_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_budgets_updated_at BEFORE UPDATE ON user_budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE openrouter_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_pricing ENABLE ROW LEVEL SECURITY;

-- Policies for user_credits
CREATE POLICY "Users can view own credits" ON user_credits
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own credits" ON user_credits
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert credits" ON user_credits
    FOR INSERT WITH CHECK (true);

-- Policies for credit_purchases
CREATE POLICY "Users can view own purchases" ON credit_purchases
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert purchases" ON credit_purchases
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update purchases" ON credit_purchases
    FOR UPDATE USING (true);

-- Policies for openrouter_keys
CREATE POLICY "Users can view own keys" ON openrouter_keys
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage keys" ON openrouter_keys
    FOR ALL USING (true);

-- Policies for model_usage
CREATE POLICY "Users can view own usage" ON model_usage
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert usage" ON model_usage
    FOR INSERT WITH CHECK (true);

-- Policies for user_budgets
CREATE POLICY "Users can view own budgets" ON user_budgets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets" ON user_budgets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert budgets" ON user_budgets
    FOR INSERT WITH CHECK (true);

-- Policies for model_pricing (read-only for users)
CREATE POLICY "Anyone can view model pricing" ON model_pricing
    FOR SELECT USING (true);

CREATE POLICY "System can manage model pricing" ON model_pricing
    FOR ALL USING (true);

-- Create views for analytics
CREATE OR REPLACE VIEW user_spending_summary AS
SELECT 
    user_id,
    DATE_TRUNC('day', request_timestamp) as day,
    COUNT(*) as requests_count,
    SUM(total_cost) as daily_spent,
    SUM(prompt_tokens + completion_tokens + reasoning_tokens) as total_tokens,
    ARRAY_AGG(DISTINCT model_id) as models_used
FROM model_usage
GROUP BY user_id, DATE_TRUNC('day', request_timestamp);

-- Create view for model popularity
CREATE OR REPLACE VIEW model_popularity AS
SELECT 
    model_id,
    COUNT(*) as usage_count,
    COUNT(DISTINCT user_id) as unique_users,
    AVG(total_cost) as avg_cost,
    SUM(total_cost) as total_revenue
FROM model_usage
WHERE request_timestamp >= NOW() - INTERVAL '30 days'
GROUP BY model_id
ORDER BY usage_count DESC;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Insert default credit packages data
INSERT INTO model_pricing (model_id, model_name, prompt_price, completion_price, reasoning_price, context_length, description) VALUES
('openai/gpt-4o', 'GPT-4o', 0.000005, 0.000015, 0.000060, 128000, 'OpenAI GPT-4o - Latest multimodal model'),
('anthropic/claude-3.5-sonnet', 'Claude 3.5 Sonnet', 0.000003, 0.000015, 0, 200000, 'Anthropic Claude 3.5 Sonnet - Balanced performance'),
('meta-llama/llama-3.1-405b-instruct', 'Llama 3.1 405B', 0.000005, 0.000015, 0, 131072, 'Meta Llama 3.1 405B - Open source flagship'),
('google/gemini-pro-1.5', 'Gemini Pro 1.5', 0.000003, 0.000015, 0, 2097152, 'Google Gemini Pro 1.5 - Long context')
ON CONFLICT (model_id) DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Credit system schema migration completed successfully!';
    RAISE NOTICE 'Created tables: user_credits, credit_purchases, openrouter_keys, model_usage, user_budgets, model_pricing';
    RAISE NOTICE 'Created indexes, triggers, RLS policies, and analytics views';
    RAISE NOTICE 'Inserted sample model pricing data';
END $$;