-- Create function to initialize new user with MINIMAL defaults
-- NO hardcoded model preferences - user selects from dashboard
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
  -- Only set columns that are NOT NULL or have constraints
  INSERT INTO user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_new_user();

-- Backfill existing users who don't have quotas or preferences
DO $$
DECLARE
  user_record RECORD;
  free_tier_limits RECORD;
BEGIN
  -- Get free tier limits
  SELECT * INTO free_tier_limits
  FROM admin_tier_limits
  WHERE tier = 'free'
  LIMIT 1;

  -- Loop through all users and create missing records
  FOR user_record IN
    SELECT id FROM auth.users
  LOOP
    -- Create quota if missing
    INSERT INTO user_perspective_quotas (
      user_id,
      plan_tier,
      messages_per_month,
      premium_perspectives_limit,
      normal_perspectives_limit,
      eco_perspectives_limit
    ) VALUES (
      user_record.id,
      'free',
      COALESCE(free_tier_limits.messages_per_month, 200),
      COALESCE(free_tier_limits.premium_perspectives_limit, 10),
      COALESCE(free_tier_limits.normal_perspectives_limit, 40),
      COALESCE(free_tier_limits.eco_perspectives_limit, 150)
    )
    ON CONFLICT (user_id) DO NOTHING;

    -- Create EMPTY preferences if missing - user configures in dashboard
    INSERT INTO user_preferences (user_id)
    VALUES (user_record.id)
    ON CONFLICT (user_id) DO NOTHING;
  END LOOP;

  RAISE NOTICE 'Backfill completed for all existing users';
END $$;
