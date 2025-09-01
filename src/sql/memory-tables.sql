-- MCP Memory System Database Tables
-- Add these to your Supabase database

-- Conversation Memory Table
CREATE TABLE IF NOT EXISTS mcp_conversation_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_message TEXT NOT NULL,
    assistant_response TEXT NOT NULL,
    model_used TEXT NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    conversation_hash TEXT NOT NULL,
    session_id TEXT,
    project_identifier TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Memory Table  
CREATE TABLE IF NOT EXISTS mcp_project_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    project_identifier TEXT NOT NULL,
    memory_type TEXT CHECK (memory_type IN ('context', 'pattern', 'decision', 'issue', 'preference')) NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    relevance_score DECIMAL(3,2) DEFAULT 0.5 CHECK (relevance_score >= 0 AND relevance_score <= 1),
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_mcp_conversation_user_project 
    ON mcp_conversation_memory(user_id, project_identifier, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mcp_conversation_hash 
    ON mcp_conversation_memory(conversation_hash);

CREATE INDEX IF NOT EXISTS idx_mcp_project_memories_user_project 
    ON mcp_project_memories(user_id, project_identifier, relevance_score DESC);

CREATE INDEX IF NOT EXISTS idx_mcp_project_memories_tags 
    ON mcp_project_memories USING gin(tags);

CREATE INDEX IF NOT EXISTS idx_mcp_project_memories_content 
    ON mcp_project_memories USING gin(to_tsvector('english', content));

-- RLS Policies
ALTER TABLE mcp_conversation_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_project_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own conversation memory" 
    ON mcp_conversation_memory 
    FOR ALL 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own project memories" 
    ON mcp_project_memories 
    FOR ALL 
    USING (auth.uid() = user_id);

-- Update user_preferences to include memory settings
-- This extends the existing mcp_settings jsonb column
-- Example structure:
-- {
--   "memory_settings": {
--     "enable_conversation_memory": true,
--     "enable_project_memory": true,
--     "max_conversation_history": 10,
--     "auto_extract_patterns": true,
--     "enable_prompt_cache": true
--   }
-- }