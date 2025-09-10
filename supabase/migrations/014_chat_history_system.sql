-- Chat History System
-- Create tables for persistent chat history like ChatGPT

-- Chat Sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Chat',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  archived BOOLEAN DEFAULT FALSE
);

-- Chat Messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  model_id TEXT,
  provider_info JSONB,
  usage_info JSONB,
  cost_info JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat Logs table (for analytics/monitoring)
CREATE TABLE IF NOT EXISTS chat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
  models_used TEXT[] NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  total_cost DECIMAL(10,6) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated ON chat_sessions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_logs_user_id ON chat_logs(user_id, created_at DESC);

-- RLS Policies
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_logs ENABLE ROW LEVEL SECURITY;

-- Chat Sessions Policies
CREATE POLICY "Users can view their own chat sessions"
ON chat_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chat sessions"
ON chat_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat sessions"
ON chat_sessions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat sessions"
ON chat_sessions FOR DELETE
USING (auth.uid() = user_id);

-- Chat Messages Policies
CREATE POLICY "Users can view messages from their sessions"
ON chat_messages FOR SELECT
USING (
  session_id IN (
    SELECT id FROM chat_sessions WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create messages in their sessions"
ON chat_messages FOR INSERT
WITH CHECK (
  session_id IN (
    SELECT id FROM chat_sessions WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update messages in their sessions"
ON chat_messages FOR UPDATE
USING (
  session_id IN (
    SELECT id FROM chat_sessions WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete messages from their sessions"
ON chat_messages FOR DELETE
USING (
  session_id IN (
    SELECT id FROM chat_sessions WHERE user_id = auth.uid()
  )
);

-- Chat Logs Policies
CREATE POLICY "Users can view their own chat logs"
ON chat_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can create chat logs"
ON chat_logs FOR INSERT
WITH CHECK (true); -- Allow system to log all chats

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_chat_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on chat_sessions
CREATE TRIGGER trigger_update_chat_session_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_session_updated_at();

-- Function to auto-generate chat titles based on first user message
CREATE OR REPLACE FUNCTION generate_chat_title(session_id_param UUID)
RETURNS TEXT AS $$
DECLARE
  first_message TEXT;
  generated_title TEXT;
BEGIN
  -- Get the first user message from the session
  SELECT content INTO first_message
  FROM chat_messages
  WHERE session_id = session_id_param AND role = 'user'
  ORDER BY created_at ASC
  LIMIT 1;
  
  IF first_message IS NULL THEN
    RETURN 'New Chat';
  END IF;
  
  -- Generate title from first 50 characters, clean up
  generated_title := TRIM(SUBSTRING(first_message FROM 1 FOR 50));
  
  -- Remove line breaks and extra spaces
  generated_title := REGEXP_REPLACE(generated_title, '\s+', ' ', 'g');
  
  -- If it ends with incomplete word, try to cut at last space
  IF LENGTH(first_message) > 50 AND POSITION(' ' IN REVERSE(SUBSTRING(generated_title FROM 40))) > 0 THEN
    generated_title := SUBSTRING(generated_title FROM 1 FOR 50 - POSITION(' ' IN REVERSE(SUBSTRING(generated_title FROM 40))));
  END IF;
  
  -- Add ellipsis if truncated
  IF LENGTH(first_message) > LENGTH(generated_title) THEN
    generated_title := generated_title || '...';
  END IF;
  
  RETURN generated_title;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-update session title when first message is added
CREATE OR REPLACE FUNCTION auto_update_session_title()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if it's the first user message and session title is still default
  IF NEW.role = 'user' THEN
    UPDATE chat_sessions 
    SET title = generate_chat_title(NEW.session_id)
    WHERE id = NEW.session_id 
      AND title IN ('New Chat', '')
      AND NOT EXISTS (
        SELECT 1 FROM chat_messages 
        WHERE session_id = NEW.session_id 
          AND role = 'user' 
          AND id != NEW.id
      );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update session titles
CREATE TRIGGER trigger_auto_update_session_title
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_session_title();