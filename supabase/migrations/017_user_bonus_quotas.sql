-- User Bonus Quotas Schema
-- Table for tracking bonus messages with expiration

CREATE TABLE IF NOT EXISTS user_bonus_quotas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bonus_messages INTEGER NOT NULL DEFAULT 0,
  bonus_type TEXT NOT NULL CHECK (bonus_type IN ('admin_grant', 'referral_signup', 'referral_completion', 'promotion', 'other')),
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL if system-generated
  reason TEXT,
  messages_used INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure non-negative values
  CHECK (bonus_messages >= 0),
  CHECK (messages_used >= 0),
  CHECK (messages_used <= bonus_messages)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_bonus_quotas_user_id ON user_bonus_quotas(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bonus_quotas_expires_at ON user_bonus_quotas(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_bonus_quotas_bonus_type ON user_bonus_quotas(bonus_type);
CREATE INDEX IF NOT EXISTS idx_user_bonus_quotas_user_active ON user_bonus_quotas(user_id, expires_at)
  WHERE messages_used < bonus_messages;

-- Enable Row Level Security (RLS)
ALTER TABLE user_bonus_quotas ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own bonus quotas" ON user_bonus_quotas
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role full access bonus quotas" ON user_bonus_quotas
  FOR ALL USING (auth.role() = 'service_role');

-- Updated_at trigger
CREATE TRIGGER update_user_bonus_quotas_updated_at
  BEFORE UPDATE ON user_bonus_quotas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT ON user_bonus_quotas TO authenticated;
GRANT ALL ON user_bonus_quotas TO service_role;

-- Helper function to get active bonus quota balance for a user
CREATE OR REPLACE FUNCTION get_user_bonus_balance(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  total_remaining INTEGER;
BEGIN
  -- Sum up remaining messages from all non-expired bonuses
  SELECT COALESCE(SUM(bonus_messages - messages_used), 0)
  INTO total_remaining
  FROM user_bonus_quotas
  WHERE user_id = user_uuid
    AND messages_used < bonus_messages
    AND (expires_at IS NULL OR expires_at > NOW());

  RETURN total_remaining;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_bonus_balance(UUID) TO authenticated;

COMMENT ON TABLE user_bonus_quotas IS 'Stores bonus message quotas with expiration tracking';
COMMENT ON FUNCTION get_user_bonus_balance(UUID) IS 'Returns total active bonus messages for a user';