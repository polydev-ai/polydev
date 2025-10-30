-- Migration: Add Privacy Mode with Conversation Storage
-- Date: 2025-01-29
-- Description:
-- Add privacy mode columns for zero-data-retention with AI providers
-- IMPORTANT: When privacy mode is enabled:
--   - Conversations ARE stored in Polydev database (encrypted at rest)
--   - Zero-data-retention agreements used with AI providers (OpenAI, Anthropic, etc.)
--   - Users can see their conversation history
--   - Privacy is achieved through provider agreements, not by skipping storage

-- ============================================================================
-- PART 1: ADD PRIVACY MODE TO PROFILES TABLE
-- ============================================================================

-- Add privacy mode columns to profiles table
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles') THEN
    -- Add privacy_mode column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns
                   WHERE table_name = 'profiles' AND column_name = 'privacy_mode') THEN
      ALTER TABLE profiles ADD COLUMN privacy_mode BOOLEAN DEFAULT false;
    END IF;

    -- Add privacy_mode_enabled_at timestamp
    IF NOT EXISTS (SELECT FROM information_schema.columns
                   WHERE table_name = 'profiles' AND column_name = 'privacy_mode_enabled_at') THEN
      ALTER TABLE profiles ADD COLUMN privacy_mode_enabled_at TIMESTAMPTZ;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- PART 2: CREATE INDEX FOR PRIVACY MODE QUERIES
-- ============================================================================

-- Index for finding users with privacy mode enabled (for compliance reporting)
CREATE INDEX IF NOT EXISTS idx_profiles_privacy_mode
  ON profiles(privacy_mode, privacy_mode_enabled_at)
  WHERE privacy_mode = true;

-- ============================================================================
-- PART 3: ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN profiles.privacy_mode IS
  'When enabled, conversations are stored with zero-data-retention agreements from AI providers. Users can see conversation history. Privacy is achieved through provider agreements (OpenAI, Anthropic, etc.), not by skipping storage.';

COMMENT ON COLUMN profiles.privacy_mode_enabled_at IS
  'Timestamp when privacy mode was enabled. Null if never enabled or currently disabled.';
