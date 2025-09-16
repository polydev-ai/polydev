-- Comprehensive subscription system schema for Polydev
-- Includes proper RLS policies for service role operations

-- 1. Create or update user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'pro')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id),
  UNIQUE(stripe_subscription_id)
);

-- 2. Create or update user_message_usage table
CREATE TABLE IF NOT EXISTS user_message_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL, -- Format: YYYY-MM
  messages_sent INTEGER DEFAULT 0,
  messages_limit INTEGER DEFAULT 1000,
  cli_usage_allowed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month_year)
);

-- 3. Create or update user_referrals table
CREATE TABLE IF NOT EXISTS user_referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL UNIQUE,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  bonus_messages INTEGER DEFAULT 100,
  uses_remaining INTEGER DEFAULT 5,
  total_uses INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create or update user_credits table
CREATE TABLE IF NOT EXISTS user_credits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance DECIMAL(10,4) DEFAULT 0.00,
  promotional_balance DECIMAL(10,4) DEFAULT 0.00,
  monthly_allocation DECIMAL(10,4) DEFAULT 0.00,
  total_purchased DECIMAL(10,4) DEFAULT 0.00,
  total_spent DECIMAL(10,4) DEFAULT 0.00,
  last_monthly_reset TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id),
  CHECK (balance >= 0),
  CHECK (promotional_balance >= 0),
  CHECK (monthly_allocation >= 0)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer ON user_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_message_usage_user_month ON user_message_usage(user_id, month_year);
CREATE INDEX IF NOT EXISTS idx_user_referrals_referrer ON user_referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_user_referrals_code ON user_referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_user_referrals_referred ON user_referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_message_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can view own message usage" ON user_message_usage;
DROP POLICY IF EXISTS "Users can view own referrals" ON user_referrals;
DROP POLICY IF EXISTS "Users can view own credits" ON user_credits;
DROP POLICY IF EXISTS "Service role full access subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Service role full access message usage" ON user_message_usage;
DROP POLICY IF EXISTS "Service role full access referrals" ON user_referrals;
DROP POLICY IF EXISTS "Service role full access credits" ON user_credits;

-- Create RLS policies for user data access
-- Users can only access their own subscription data
CREATE POLICY "Users can view own subscription" ON user_subscriptions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own message usage" ON user_message_usage
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own referrals" ON user_referrals
  FOR ALL USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id);

CREATE POLICY "Users can view own credits" ON user_credits
  FOR ALL USING (auth.uid() = user_id);

-- Service role can access all data (for backend operations)
CREATE POLICY "Service role full access subscriptions" ON user_subscriptions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access message usage" ON user_message_usage
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access referrals" ON user_referrals
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access credits" ON user_credits
  FOR ALL USING (auth.role() = 'service_role');

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON user_subscriptions;
DROP TRIGGER IF EXISTS update_user_message_usage_updated_at ON user_message_usage;
DROP TRIGGER IF EXISTS update_user_referrals_updated_at ON user_referrals;
DROP TRIGGER IF EXISTS update_user_credits_updated_at ON user_credits;

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_message_usage_updated_at
  BEFORE UPDATE ON user_message_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_referrals_updated_at
  BEFORE UPDATE ON user_referrals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_credits_updated_at
  BEFORE UPDATE ON user_credits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON user_subscriptions TO authenticated;
GRANT ALL ON user_message_usage TO authenticated;
GRANT ALL ON user_referrals TO authenticated; 
GRANT ALL ON user_credits TO authenticated;

-- Also ensure service_role has access
GRANT ALL ON user_subscriptions TO service_role;
GRANT ALL ON user_message_usage TO service_role;
GRANT ALL ON user_referrals TO service_role;
GRANT ALL ON user_credits TO service_role;