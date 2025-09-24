-- Create user_message_logs table to track message types
CREATE TABLE IF NOT EXISTS user_message_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL CHECK (message_type IN ('chat', 'mcp')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_message_logs_user_created ON user_message_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_user_message_logs_type ON user_message_logs(message_type);

-- Enable RLS
ALTER TABLE user_message_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_message_logs
CREATE POLICY "Users can view their own message logs" ON user_message_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own message logs" ON user_message_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role can access all
CREATE POLICY "Service role can access all message logs" ON user_message_logs
  FOR ALL USING (auth.role() = 'service_role');