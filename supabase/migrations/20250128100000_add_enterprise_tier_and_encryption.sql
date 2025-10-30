-- Migration: Add Enterprise Tier, Update Pro Quotas, and Add Zero-Knowledge Encryption
-- Date: 2025-01-28
-- Description:
-- 1. Add Enterprise tier to system
-- 2. Update Pro tier quotas (600/2,500/8,000)
-- 3. Add encryption columns for MCP provider credentials
-- 4. Update admin_pricing_config with new Stripe price IDs

-- ============================================================================
-- PART 1: ADD ENTERPRISE TIER SUPPORT
-- ============================================================================

-- Check if admin_tier_limits table exists, if not create it
CREATE TABLE IF NOT EXISTS admin_tier_limits (
  tier TEXT PRIMARY KEY CHECK (tier IN ('free', 'plus', 'pro', 'enterprise')),
  messages_per_month INTEGER,
  premium_perspectives_limit INTEGER NOT NULL,
  normal_perspectives_limit INTEGER NOT NULL,
  eco_perspectives_limit INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert or update tier limits for all 4 tiers
INSERT INTO admin_tier_limits (tier, messages_per_month, premium_perspectives_limit, normal_perspectives_limit, eco_perspectives_limit)
VALUES
  ('free', 200, 10, 40, 150),
  ('plus', NULL, 400, 1600, 4000),
  ('pro', NULL, 600, 2500, 8000),
  ('enterprise', NULL, 1200, 5000, 20000)
ON CONFLICT (tier) DO UPDATE SET
  messages_per_month = EXCLUDED.messages_per_month,
  premium_perspectives_limit = EXCLUDED.premium_perspectives_limit,
  normal_perspectives_limit = EXCLUDED.normal_perspectives_limit,
  eco_perspectives_limit = EXCLUDED.eco_perspectives_limit,
  updated_at = NOW();

-- ============================================================================
-- PART 2: UPDATE ADMIN PRICING CONFIG WITH NEW STRIPE PRICE IDs
-- ============================================================================

-- Create admin_pricing_config table if it doesn't exist
CREATE TABLE IF NOT EXISTS admin_pricing_config (
  config_key TEXT PRIMARY KEY,
  config_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update subscription pricing with new Pro and Enterprise tiers
INSERT INTO admin_pricing_config (config_key, config_value)
VALUES (
  'subscription_pricing',
  jsonb_build_object(
    'free_tier', jsonb_build_object(
      'name', 'Free',
      'monthly_price', 0,
      'annual_price', 0,
      'stripe_price_id_monthly', null,
      'stripe_price_id_annual', null
    ),
    'plus_tier', jsonb_build_object(
      'name', 'Plus',
      'monthly_price', 25,
      'annual_price', 20,
      'stripe_price_id_monthly', 'price_1SCtz8JtMA6wwImlnhBuvZnu',
      'stripe_price_id_annual', 'price_1SCtzKJtMA6wwImlMm1QdrRZ'
    ),
    'pro_tier', jsonb_build_object(
      'name', 'Pro',
      'monthly_price', 35,
      'annual_price', 30,
      'stripe_price_id_monthly', 'price_1SNRr7JtMA6wwImlukUSmOnP',
      'stripe_price_id_annual', 'price_1SNRr8JtMA6wwImlImglzsQw',
      'stripe_product_id_monthly', 'prod_TK63eqDrxh8u02',
      'stripe_product_id_annual', 'prod_TK63Uzfz6BfUFV'
    ),
    'enterprise_tier', jsonb_build_object(
      'name', 'Enterprise',
      'monthly_price', 60,
      'annual_price', 50,
      'stripe_price_id_monthly', 'price_1SNRriJtMA6wwImllzzC4oGC',
      'stripe_price_id_annual', 'price_1SNRrjJtMA6wwImlpStnncAL',
      'stripe_product_id_monthly', 'prod_TK63A1Knat2TG0',
      'stripe_product_id_annual', 'prod_TK63iMtjELsfjX'
    )
  )
)
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  updated_at = NOW();

-- ============================================================================
-- PART 3: ADD ENCRYPTION COLUMNS FOR MCP TABLES
-- ============================================================================

-- Add encryption columns to mcp_access_tokens (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'mcp_access_tokens') THEN
    -- Add encrypted_token column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns
                   WHERE table_name = 'mcp_access_tokens' AND column_name = 'encrypted_token') THEN
      ALTER TABLE mcp_access_tokens ADD COLUMN encrypted_token TEXT;
    END IF;

    -- Add encryption_metadata column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns
                   WHERE table_name = 'mcp_access_tokens' AND column_name = 'encryption_metadata') THEN
      ALTER TABLE mcp_access_tokens ADD COLUMN encryption_metadata JSONB;
    END IF;
  END IF;
END $$;

-- Add encryption support for users table zero_knowledge_enabled flag
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    -- Create users_metadata table in public schema for zero-knowledge preferences
    CREATE TABLE IF NOT EXISTS users_encryption_preferences (
      user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      zero_knowledge_enabled BOOLEAN DEFAULT false,
      encryption_tier TEXT DEFAULT 'none' CHECK (encryption_tier IN ('none', 'standard', 'enterprise')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Create index for faster lookups
    CREATE INDEX IF NOT EXISTS idx_users_encryption_preferences_user_id
      ON users_encryption_preferences(user_id);
  END IF;
END $$;

-- ============================================================================
-- PART 4: UPDATE user_perspective_quotas TO SUPPORT ENTERPRISE TIER
-- ============================================================================

-- Modify plan_tier column to support enterprise (if the table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_perspective_quotas') THEN
    -- Drop existing check constraint if it exists
    ALTER TABLE user_perspective_quotas DROP CONSTRAINT IF EXISTS user_perspective_quotas_plan_tier_check;

    -- Add new check constraint with enterprise
    ALTER TABLE user_perspective_quotas
    ADD CONSTRAINT user_perspective_quotas_plan_tier_check
    CHECK (plan_tier IN ('free', 'plus', 'pro', 'enterprise'));
  END IF;
END $$;

-- ============================================================================
-- PART 5: MIGRATE EXISTING PRO USERS TO NEW PRO QUOTAS
-- ============================================================================

-- Update existing Pro users to new quota limits
UPDATE user_perspective_quotas
SET
  premium_perspectives_limit = 600,
  normal_perspectives_limit = 2500,
  eco_perspectives_limit = 8000,
  -- Reset usage to 0 for fair start with new quotas
  premium_perspectives_used = 0,
  normal_perspectives_used = 0,
  eco_perspectives_used = 0
WHERE plan_tier = 'pro';

-- ============================================================================
-- PART 6: UPDATE TRIGGER TO HANDLE ENTERPRISE TIER
-- ============================================================================

-- Update the initialize_new_user function to handle enterprise tier
CREATE OR REPLACE FUNCTION initialize_new_user()
RETURNS TRIGGER AS $$
DECLARE
  free_tier_limits RECORD;
BEGIN
  -- Get free tier limits from admin_tier_limits
  SELECT * INTO free_tier_limits
  FROM admin_tier_limits
  WHERE tier = 'free'
  LIMIT 1;

  -- Create user_perspective_quotas with free tier limits
  INSERT INTO user_perspective_quotas (
    user_id,
    plan_tier,
    messages_per_month,
    premium_perspectives_limit,
    normal_perspectives_limit,
    eco_perspectives_limit
  ) VALUES (
    NEW.id,
    'free',
    COALESCE(free_tier_limits.messages_per_month, 200),
    COALESCE(free_tier_limits.premium_perspectives_limit, 10),
    COALESCE(free_tier_limits.normal_perspectives_limit, 40),
    COALESCE(free_tier_limits.eco_perspectives_limit, 150)
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Create EMPTY user_preferences row - user configures in dashboard
  INSERT INTO user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Create encryption preferences with defaults
  INSERT INTO users_encryption_preferences (user_id, zero_knowledge_enabled, encryption_tier)
  VALUES (NEW.id, false, 'none')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_new_user();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify tier limits
SELECT
  'admin_tier_limits' as table_name,
  tier,
  messages_per_month,
  premium_perspectives_limit,
  normal_perspectives_limit,
  eco_perspectives_limit
FROM admin_tier_limits
ORDER BY
  CASE tier
    WHEN 'free' THEN 1
    WHEN 'plus' THEN 2
    WHEN 'pro' THEN 3
    WHEN 'enterprise' THEN 4
  END;

-- Verify pricing config
SELECT
  'admin_pricing_config' as table_name,
  config_key,
  config_value->>'name' as config_name
FROM admin_pricing_config
WHERE config_key = 'subscription_pricing';

-- Count users by tier
SELECT
  'user_perspective_quotas' as table_name,
  plan_tier,
  COUNT(*) as user_count
FROM user_perspective_quotas
GROUP BY plan_tier
ORDER BY
  CASE plan_tier
    WHEN 'free' THEN 1
    WHEN 'plus' THEN 2
    WHEN 'pro' THEN 3
    WHEN 'enterprise' THEN 4
  END;
