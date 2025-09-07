-- Fix MCP token constraints to allow multiple tokens per user
-- but prevent duplicate CLI Status tokens

BEGIN;

-- Drop the problematic unique constraint on user_id only
ALTER TABLE mcp_user_tokens DROP CONSTRAINT IF EXISTS mcp_user_tokens_user_id_unique;

-- Add a unique constraint on (user_id, token_name) to prevent duplicate CLI Status tokens
-- while allowing multiple API tokens per user
ALTER TABLE mcp_user_tokens ADD CONSTRAINT mcp_user_tokens_user_id_token_name_unique 
UNIQUE (user_id, token_name);

COMMIT;