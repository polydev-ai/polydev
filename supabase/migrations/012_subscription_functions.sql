-- Functions for subscription system operations
-- These functions use SECURITY DEFINER to bypass RLS when called

-- Function to increment message count safely
CREATE OR REPLACE FUNCTION increment_message_count(p_user_id UUID, p_month_year TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_message_usage (user_id, month_year, messages_sent, messages_limit, cli_usage_allowed)
  VALUES (p_user_id, p_month_year, 1, 50, false)
  ON CONFLICT (user_id, month_year)
  DO UPDATE SET 
    messages_sent = user_message_usage.messages_sent + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add referral bonus messages
CREATE OR REPLACE FUNCTION add_referral_bonus(
  p_user_id UUID, 
  p_month_year TEXT, 
  p_bonus_messages INTEGER
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_message_usage (user_id, month_year, messages_sent, messages_limit, cli_usage_allowed)
  VALUES (p_user_id, p_month_year, 0, 50 + p_bonus_messages, false)
  ON CONFLICT (user_id, month_year)
  DO UPDATE SET 
    messages_limit = user_message_usage.messages_limit + p_bonus_messages,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to allocate monthly credits for Pro users
CREATE OR REPLACE FUNCTION allocate_monthly_credits(p_user_id UUID, p_amount DECIMAL(10,4))
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_credits (user_id, balance, promotional_balance, monthly_allocation, total_purchased, total_spent, last_monthly_reset)
  VALUES (p_user_id, p_amount, 0, p_amount, 0, 0, NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET 
    balance = user_credits.balance + p_amount,
    monthly_allocation = p_amount,
    last_monthly_reset = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to deduct user credits safely
CREATE OR REPLACE FUNCTION deduct_user_credits(p_user_id UUID, p_amount DECIMAL(10,4))
RETURNS VOID AS $$
BEGIN
  UPDATE user_credits 
  SET 
    balance = GREATEST(0, balance - p_amount),
    total_spent = total_spent + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users and service role
GRANT EXECUTE ON FUNCTION increment_message_count TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION add_referral_bonus TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION allocate_monthly_credits TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION deduct_user_credits TO authenticated, service_role;