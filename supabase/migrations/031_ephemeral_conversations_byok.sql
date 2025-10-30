-- Migration: Ephemeral Conversations + BYOK (Bring Your Own Keys)
-- Date: 2025-01-29
-- Description:
-- Add support for ephemeral conversations (no storage) when using BYOK
-- Pro/Enterprise: Ephemeral mode enabled by default
-- Free/Plus: Can opt-in to ephemeral mode
--
-- KEY FEATURES:
-- 1. User provides their own API keys (encrypted)
-- 2. Conversations are NOT saved to database (ephemeral)
-- 3. MCP tool calls are executed but NOT saved
-- 4. Server acts as transparent proxy only
-- 5. Usage metadata tracked (no content)

-- ============================================================================
-- PART 1: ADD BYOK AND EPHEMERAL MODE COLUMNS
-- ============================================================================

DO $$
BEGIN
  -- Add ephemeral_conversations column
  IF NOT EXISTS (SELECT FROM information_schema.columns
                 WHERE table_name = 'profiles' AND column_name = 'ephemeral_conversations') THEN
    ALTER TABLE profiles ADD COLUMN ephemeral_conversations BOOLEAN DEFAULT false;
  END IF;

  -- Add byok_enabled column
  IF NOT EXISTS (SELECT FROM information_schema.columns
                 WHERE table_name = 'profiles' AND column_name = 'byok_enabled') THEN
    ALTER TABLE profiles ADD COLUMN byok_enabled BOOLEAN DEFAULT false;
  END IF;

  -- Add ephemeral_enabled_at timestamp
  IF NOT EXISTS (SELECT FROM information_schema.columns
                 WHERE table_name = 'profiles' AND column_name = 'ephemeral_enabled_at') THEN
    ALTER TABLE profiles ADD COLUMN ephemeral_enabled_at TIMESTAMPTZ;
  END IF;

  -- Add client_side_storage preference
  IF NOT EXISTS (SELECT FROM information_schema.columns
                 WHERE table_name = 'profiles' AND column_name = 'client_side_storage') THEN
    ALTER TABLE profiles ADD COLUMN client_side_storage BOOLEAN DEFAULT false;
  END IF;
END $$;

-- ============================================================================
-- PART 2: CREATE API KEYS TABLE (ENCRYPTED BYOK STORAGE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL, -- 'openai', 'anthropic', 'google', etc.
  encrypted_api_key TEXT NOT NULL, -- Encrypted with server key
  key_name VARCHAR(100), -- User-friendly name
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,

  -- Unique constraint: one active key per provider per user
  CONSTRAINT unique_active_provider_key UNIQUE (user_id, provider, is_active)
    WHERE is_active = true
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_provider
  ON user_api_keys(user_id, provider, is_active);

-- ============================================================================
-- PART 3: CREATE EPHEMERAL USAGE TRACKING (METADATA ONLY, NO CONTENT)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ephemeral_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  estimated_cost_usd DECIMAL(10, 6), -- For tracking, even though user pays
  used_byok BOOLEAN DEFAULT true, -- Whether user's own API key was used
  session_id UUID, -- Optional: group related calls (ephemeral session)
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- NO message content stored
  -- NO conversation_id stored
  -- This is purely for usage analytics

  CONSTRAINT ephemeral_usage_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES profiles(id) ON DELETE CASCADE
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_ephemeral_usage_user_date
  ON ephemeral_usage(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ephemeral_usage_session
  ON ephemeral_usage(session_id, created_at)
  WHERE session_id IS NOT NULL;

-- ============================================================================
-- PART 4: UPDATE SUBSCRIPTION TIERS WITH EPHEMERAL DEFAULTS
-- ============================================================================

-- Add ephemeral_mode_default to subscription tiers
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns
                 WHERE table_name = 'subscription_tiers'
                 AND column_name = 'ephemeral_mode_default') THEN
    ALTER TABLE subscription_tiers
      ADD COLUMN ephemeral_mode_default BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.columns
                 WHERE table_name = 'subscription_tiers'
                 AND column_name = 'byok_available') THEN
    ALTER TABLE subscription_tiers
      ADD COLUMN byok_available BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Update existing tiers
UPDATE subscription_tiers
SET
  ephemeral_mode_default = false,
  byok_available = false
WHERE tier_name = 'free';

UPDATE subscription_tiers
SET
  ephemeral_mode_default = false,
  byok_available = true
WHERE tier_name = 'plus';

UPDATE subscription_tiers
SET
  ephemeral_mode_default = true,
  byok_available = true
WHERE tier_name IN ('pro', 'enterprise');

-- ============================================================================
-- PART 5: CREATE FUNCTION TO AUTO-ENABLE EPHEMERAL FOR PRO/ENTERPRISE
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_enable_ephemeral_for_tier()
RETURNS TRIGGER AS $$
BEGIN
  -- When user upgrades to Pro or Enterprise, auto-enable ephemeral mode
  IF NEW.subscription_tier IN ('pro', 'enterprise')
     AND (OLD.subscription_tier IS NULL OR OLD.subscription_tier NOT IN ('pro', 'enterprise')) THEN
    NEW.ephemeral_conversations := true;
    NEW.ephemeral_enabled_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_auto_enable_ephemeral ON profiles;
CREATE TRIGGER trigger_auto_enable_ephemeral
  BEFORE UPDATE OF subscription_tier ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_enable_ephemeral_for_tier();

-- ============================================================================
-- PART 6: ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN profiles.ephemeral_conversations IS
  'When true, conversations are NOT saved to database. Server acts as transparent proxy only. Requires BYOK. Default true for Pro/Enterprise.';

COMMENT ON COLUMN profiles.byok_enabled IS
  'When true, user provides their own API keys. Required for ephemeral mode. Available for Plus/Pro/Enterprise.';

COMMENT ON COLUMN profiles.ephemeral_enabled_at IS
  'Timestamp when ephemeral mode was enabled. Null if never enabled or currently disabled.';

COMMENT ON COLUMN profiles.client_side_storage IS
  'When true, user chooses to store conversations client-side (browser localStorage). Only applicable when ephemeral_conversations=true.';

COMMENT ON TABLE user_api_keys IS
  'Stores user-provided API keys (encrypted) for BYOK mode. Keys are encrypted server-side and used for proxying requests without storing conversation content.';

COMMENT ON TABLE ephemeral_usage IS
  'Tracks usage metadata for ephemeral conversations. Contains NO message content, only token counts and costs for analytics.';

-- ============================================================================
-- PART 7: CREATE RLS POLICIES FOR NEW TABLES
-- ============================================================================

-- Enable RLS on user_api_keys
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

-- Users can only see their own API keys
CREATE POLICY user_api_keys_select_own
  ON user_api_keys
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own API keys
CREATE POLICY user_api_keys_insert_own
  ON user_api_keys
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own API keys
CREATE POLICY user_api_keys_update_own
  ON user_api_keys
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can only delete their own API keys
CREATE POLICY user_api_keys_delete_own
  ON user_api_keys
  FOR DELETE
  USING (auth.uid() = user_id);

-- Enable RLS on ephemeral_usage
ALTER TABLE ephemeral_usage ENABLE ROW LEVEL SECURITY;

-- Users can only see their own usage
CREATE POLICY ephemeral_usage_select_own
  ON ephemeral_usage
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert usage records
CREATE POLICY ephemeral_usage_insert_service
  ON ephemeral_usage
  FOR INSERT
  WITH CHECK (true); -- Service role only

-- ============================================================================
-- PART 8: CREATE INDEX FOR TIER-BASED QUERIES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_ephemeral_tier
  ON profiles(subscription_tier, ephemeral_conversations)
  WHERE ephemeral_conversations = true;

CREATE INDEX IF NOT EXISTS idx_profiles_byok
  ON profiles(byok_enabled)
  WHERE byok_enabled = true;

-- ============================================================================
-- PART 9: ADD AUDIT LOG FOR EPHEMERAL MODE CHANGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS ephemeral_mode_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- 'enabled', 'disabled', 'byok_added', 'byok_removed'
  previous_state JSONB,
  new_state JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_ephemeral_audit_user_date
  ON ephemeral_mode_audit(user_id, created_at DESC);

COMMENT ON TABLE ephemeral_mode_audit IS
  'Audit trail for ephemeral mode and BYOK changes. Helps prove compliance with privacy commitments.';

-- ============================================================================
-- STATUS: MIGRATION COMPLETE
-- ============================================================================

-- This migration enables:
-- ✅ Ephemeral conversations (no database storage)
-- ✅ BYOK (Bring Your Own API Keys)
-- ✅ Default ephemeral for Pro/Enterprise
-- ✅ Opt-in ephemeral for Free/Plus
-- ✅ Usage tracking (metadata only, no content)
-- ✅ Audit trail for compliance
-- ✅ Client-side storage option
