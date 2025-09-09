-- Zero-Knowledge Memory and Conversation System
-- All sensitive data is encrypted client-side with keys never touching server

-- Memory Storage: Encrypted project and global memory from CLI tools
CREATE TABLE user_memory_storage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  memory_type TEXT CHECK (memory_type IN ('global', 'project', 'conversation', 'pattern')) NOT NULL,
  cli_tool TEXT CHECK (cli_tool IN ('claude_code', 'cline', 'codex_cli', 'cursor', 'continue', 'aider', 'generic')) NOT NULL,
  
  -- Zero-knowledge encrypted data
  encrypted_content TEXT NOT NULL, -- AES-256-GCM encrypted memory content
  content_hash TEXT NOT NULL, -- SHA-256 hash for deduplication (safe to store)
  encryption_version INTEGER DEFAULT 1 NOT NULL, -- For key rotation
  
  -- Compliance-safe metadata (no sensitive content)
  project_path_hash TEXT, -- SHA-256 hash of project path
  file_count INTEGER DEFAULT 0, -- Number of files processed
  memory_size_bytes INTEGER DEFAULT 0, -- Original content size
  extraction_method TEXT, -- Method used for extraction
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  accessed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(user_id, memory_type, cli_tool, content_hash)
);

-- Conversation Logs: Encrypted recent conversations with compliance metadata
CREATE TABLE user_conversation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cli_tool TEXT CHECK (cli_tool IN ('claude_code', 'cline', 'codex_cli', 'cursor', 'continue', 'aider', 'generic')) NOT NULL,
  
  -- Zero-knowledge encrypted conversation
  encrypted_conversation TEXT NOT NULL, -- Full conversation encrypted
  conversation_hash TEXT NOT NULL, -- SHA-256 for deduplication
  encryption_version INTEGER DEFAULT 1 NOT NULL,
  
  -- Compliance-safe metadata
  message_count INTEGER DEFAULT 0, -- Number of messages in conversation
  conversation_length_chars INTEGER DEFAULT 0, -- Character count
  topics_extracted TEXT[], -- Extracted topics (no sensitive content)
  relevance_score DECIMAL(3,2), -- TF-IDF relevance score
  
  conversation_start TIMESTAMPTZ, -- When conversation started
  conversation_end TIMESTAMPTZ, -- When conversation ended
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(user_id, cli_tool, conversation_hash)
);

-- Memory Access Audit: Zero-knowledge audit trail
CREATE TABLE user_memory_audit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Audit metadata (no sensitive content)
  action_type TEXT CHECK (action_type IN ('extract', 'access', 'inject', 'delete')) NOT NULL,
  cli_tool TEXT,
  memory_type TEXT,
  
  -- Performance and usage metrics
  extraction_duration_ms INTEGER,
  memory_sources_found INTEGER DEFAULT 0,
  conversations_processed INTEGER DEFAULT 0,
  context_injected BOOLEAN DEFAULT FALSE,
  
  -- Compliance tracking
  client_ip INET, -- For geographic compliance
  user_agent_hash TEXT, -- Hashed user agent for device tracking
  request_id TEXT, -- Link to main request if applicable
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Encrypted Request Logs: Fix existing privacy violation
ALTER TABLE mcp_request_logs 
ADD COLUMN encrypted_prompt TEXT,
ADD COLUMN encrypted_responses TEXT,
ADD COLUMN encryption_version INTEGER DEFAULT 1,
ADD COLUMN prompt_hash TEXT, -- SHA-256 hash for search without decryption
ADD COLUMN response_summary TEXT; -- Non-sensitive summary for dashboard

-- Update existing request logs to indicate they need migration
UPDATE mcp_request_logs 
SET prompt_hash = encode(sha256(prompt::bytea), 'hex')
WHERE prompt_hash IS NULL;

-- Indexes for performance
CREATE INDEX idx_memory_storage_user_type ON user_memory_storage(user_id, memory_type);
CREATE INDEX idx_memory_storage_tool ON user_memory_storage(user_id, cli_tool);
CREATE INDEX idx_memory_storage_hash ON user_memory_storage(content_hash);
CREATE INDEX idx_conversation_logs_user_tool ON user_conversation_logs(user_id, cli_tool);
CREATE INDEX idx_conversation_logs_relevance ON user_conversation_logs(user_id, relevance_score DESC);
CREATE INDEX idx_memory_audit_user_time ON user_memory_audit(user_id, created_at DESC);
CREATE INDEX idx_request_logs_hash ON mcp_request_logs(user_id, prompt_hash);

-- Row Level Security for enterprise compliance
ALTER TABLE user_memory_storage ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_conversation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memory_audit ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can access own memory" ON user_memory_storage FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access own conversations" ON user_conversation_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access own audit logs" ON user_memory_audit FOR ALL USING (auth.uid() = user_id);

-- Service role can access all data (for admin functions)
CREATE POLICY "Service role full access memory" ON user_memory_storage FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access conversations" ON user_conversation_logs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access audit" ON user_memory_audit FOR ALL USING (auth.role() = 'service_role');