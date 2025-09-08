# Polydev MCP Integration Guide

**Complete Model Context Protocol integration with CLI providers, perspectives, and comprehensive MCP server ecosystem.**

## Overview

Polydev provides a complete MCP (Model Context Protocol) server implementation with:

- **CLI Provider Integration**: Direct integration with Claude Code, Codex CLI, and Gemini CLI
- **Multi-LLM Perspectives**: Query multiple AI models simultaneously  
- **Comprehensive MCP Ecosystem**: Integration with Supabase, Vercel, Stripe, Resend MCP servers
- **Priority-Based Fallback**: Intelligent routing between CLI tools, API keys, and credits

## MCP Server Architecture

```
┌─────────────────────────────────────────────────────────┐
│                MCP Client (Agent/IDE)                   │
│              (Claude, Cline, etc.)                      │
└──────────────────────┬──────────────────────────────────┘
                       │ JSON-RPC over stdio
                       ▼
┌─────────────────────────────────────────────────────────┐
│              Polydev MCP Server                         │
│                                                         │
│  ┌─────────────────┐  ┌─────────────────┐             │
│  │ CLI Integration │  │ Perspectives    │             │
│  │                 │  │ Multi-LLM       │             │
│  │ • Claude Code   │  │                 │             │
│  │ • Codex CLI     │  │ • 37+ Models    │             │
│  │ • Gemini CLI    │  │ • 20+ Providers │             │
│  └─────────────────┘  └─────────────────┘             │
│                                                         │
│  ┌─────────────────┐  ┌─────────────────┐             │
│  │ MCP Integration │  │ Priority System │             │
│  │                 │  │                 │             │
│  │ • Supabase MCP  │  │ CLI → API Keys  │             │
│  │ • Vercel MCP    │  │ → Credits       │             │
│  │ • Stripe MCP    │  └─────────────────┘             │
│  │ • Resend MCP    │                                   │
│  └─────────────────┘                                   │
└─────────────────────────────────────────────────────────┘
```

## Available MCP Tools

### Core Perspectives Tool

#### `get_perspectives`
Get diverse perspectives from multiple AI models simultaneously.

**Parameters:**
```typescript
{
  prompt: string                    // The prompt to get perspectives on
  user_token?: string               // MCP token for managed mode
  models?: string[]                 // Models to query (default: user preferences)
  mode?: 'managed' | 'user_keys'    // API key mode
  project_memory?: 'none' | 'light' | 'full'
  max_messages?: number
  temperature?: number
  max_tokens?: number
  project_context?: {
    root_path?: string
    includes?: string[]
    excludes?: string[]
  }
}
```

**Example:**
```javascript
const perspectives = await mcp.callTool({
  name: "get_perspectives",
  arguments: {
    prompt: "How can I optimize this React component for performance?",
    mode: "user_keys",
    models: ["gpt-4", "claude-3-sonnet", "gemini-pro"],
    project_memory: "light"
  }
});
```

### CLI Provider Tools

#### `polydev.force_cli_detection`
Detect and report status for CLI providers.

**Parameters:**
```typescript
{
  user_id?: string                  // User ID for database updates
  provider_id?: string              // Specific provider or all
}
```

#### `polydev.get_cli_status`
Get cached CLI provider status.

**Parameters:**
```typescript
{
  user_id?: string                  // User ID for database retrieval
  provider_id?: string              // Specific provider or all
}
```

#### `polydev.send_cli_prompt`
Send prompt to CLI provider.

**Parameters:**
```typescript
{
  provider_id: string               // "claude_code", "codex_cli", "gemini_cli"
  prompt: string                    // Prompt to send
  mode?: string                     // "args" or "stdin"
  timeout_ms?: number               // Timeout in milliseconds
  user_id?: string                  // User ID for tracking
}
```

## Integration Modes

### 1. Full MCP Server Mode

Use the complete MCP server with all functionality:

**Configuration:**
```json
{
  "mcpServers": {
    "polydev": {
      "command": "node",
      "args": ["/path/to/polydev/mcp/server.js"],
      "env": {
        "POLYDEV_USER_TOKEN": "your-token-here"
      }
    }
  }
}
```

**Features:**
- ✅ CLI provider integration
- ✅ Multi-LLM perspectives  
- ✅ MCP server integration
- ✅ Database status tracking
- ✅ Usage analytics
- ✅ Remote API fallback

### 2. Stdio Wrapper Mode (Local)

Use the lightweight stdio wrapper for local-only functionality:

**Configuration:**
```json
{
  "mcpServers": {
    "polydev-local": {
      "command": "node", 
      "args": ["/path/to/polydev/mcp/stdio-wrapper.js"],
      "env": {
        "POLYDEV_USER_TOKEN": "your-token-here"
      }
    }
  }
}
```

**Features:**
- ✅ CLI provider integration (local)
- ✅ File-based caching
- ✅ Local usage analytics
- ❌ Remote API calls (for perspectives)
- ❌ Database integration
- ❌ Usage tracking in cloud

## MCP Server Ecosystem Integration

Polydev integrates with multiple MCP servers for comprehensive functionality:

### Supabase MCP
Used for database operations, user management, and analytics.

**Integration Points:**
- User authentication and session management
- CLI status tracking in `cli_status` table
- Usage analytics in `usage_sessions` table  
- API key management in encrypted tables
- Project memory caching

### Vercel MCP  
Used for deployment and hosting operations.

**Integration Points:**
- Project deployment status
- Environment variable management
- Build and deployment logs
- Domain and DNS management

### Stripe MCP
Used for payment processing and subscription management.

**Integration Points:**
- User subscription validation
- Usage-based billing calculations
- Payment method management
- Invoice generation for overages

### Resend MCP
Used for email communications and notifications.

**Integration Points:**
- CLI authentication notifications
- Usage threshold alerts
- System status notifications
- User onboarding emails

## Priority-Based Request Routing

Polydev implements intelligent request routing based on user preferences and availability:

### Priority Level 1: CLI Providers
```typescript
// Check if user has authenticated CLI tools
const cliStatus = await this.cliManager.getCliStatus(preferredProvider);

if (cliStatus.available && cliStatus.authenticated) {
  const response = await this.cliManager.sendCliPrompt(
    preferredProvider,
    prompt,
    'args',
    30000
  );
  
  if (response.success) {
    return { strategy: 'cli', content: response.content };
  }
}
```

### Priority Level 2: Personal API Keys
```typescript
// Check user's personal API keys
const keyTest = await this.testUserApiKey(userProvidedKey);

if (keyTest.success) {
  return {
    apiKey: userProvidedKey,
    strategy: 'personal',
    canProceed: true
  };
}
```

### Priority Level 3: Provisioned Keys
```typescript
// Check user's provisioned OpenRouter keys
const userKey = await this.getUserProvisionedKey(userId);

if (userKey) {
  const keyTest = await this.testUserApiKey(userKey.hash);
  if (keyTest.success) {
    return { 
      apiKey: userKey.hash, 
      strategy: 'provisioned' 
    };
  }
}
```

### Priority Level 4: Credits System
```typescript
// Final fallback to organizational credits
const creditCheck = await this.checkUserCredits(userId, estimatedCost);

if (creditCheck.canAfford) {
  return {
    apiKey: process.env.OPENROUTER_ORG_KEY,
    strategy: 'credits',
    canProceed: true
  };
}
```

## Usage Analytics and Tracking

### CLI Usage Tracking
```sql
INSERT INTO usage_sessions (
  user_id,
  tool_name,
  provider,
  model_name,
  message_count,
  total_tokens,
  cost_credits,
  session_type,
  metadata
) VALUES (
  $1, 'cli_provider', 'polydev', 'cli_claude_code', 
  1, 150, '0', 'cli_request',
  '{"strategy": "cli", "provider": "claude_code", "latency_ms": 1200}'
);
```

### Perspectives Usage Tracking
```sql
INSERT INTO perspectives_io_log (
  user_id,
  input_prompt,
  output_data,
  tokens_used,
  latency_ms,
  models_used,
  mode
) VALUES (
  $1, $2, $3, $4, $5, $6, $7
);
```

### Local Analytics (Stdio Wrapper)
```json
{
  "timestamp": "2024-01-15T10:35:00Z",
  "provider": "claude_code",
  "prompt_length": 85,
  "success": true,
  "latency_ms": 1200,
  "tokens_used": 150
}
```

## Configuration Options

### Environment Variables

**Required:**
```bash
export POLYDEV_USER_TOKEN="poly_your_token_here"
export POLYDEV_API_URL="https://polydev.ai/api/mcp"
```

**Optional:**
```bash
export POLYDEV_CLI_DEBUG=1                    # Enable CLI debug logging
export CLAUDE_CODE_PATH="/custom/path/claude" # Custom CLI paths
export CODEX_CLI_PATH="/custom/path/codex"
export GEMINI_CLI_PATH="/custom/path/gemini"
```

### MCP Server Configuration

**Full Server (server.js):**
```json
{
  "command": "node",
  "args": ["./mcp/server.js"],
  "env": {
    "POLYDEV_USER_TOKEN": "poly_abc123..."
  }
}
```

**Stdio Wrapper (stdio-wrapper.js):**
```json
{
  "command": "node",
  "args": ["./mcp/stdio-wrapper.js"], 
  "env": {
    "POLYDEV_USER_TOKEN": "poly_abc123..."
  }
}
```

## Error Handling and Resilience

### Graceful Degradation
```javascript
class PolydevMCP {
  async handleRequest(prompt) {
    try {
      // Try CLI providers first
      const cliResponse = await this.tryCliProviders(prompt);
      if (cliResponse.success) return cliResponse;
      
      // Fallback to API keys
      const apiResponse = await this.tryApiKeys(prompt);
      if (apiResponse.success) return apiResponse;
      
      // Final fallback to credits
      const creditResponse = await this.tryCredits(prompt);
      return creditResponse;
      
    } catch (error) {
      return {
        success: false,
        error: `All request methods failed: ${error.message}`
      };
    }
  }
}
```

### Timeout Management
- CLI commands: 30 second default timeout
- API requests: 60 second timeout
- Cache operations: 5 second timeout
- Health checks: 10 second timeout

### Retry Logic
```javascript
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function withRetry(operation) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === MAX_RETRIES) throw error;
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
    }
  }
}
```

## Performance Optimization

### Caching Strategy
- **CLI Status**: 5-minute cache timeout
- **API Key Validation**: 1-hour cache timeout  
- **User Preferences**: 15-minute cache timeout
- **Project Memory**: File-based persistent cache

### Concurrent Operations
```javascript
// Parallel CLI detection
const providers = ['claude_code', 'codex_cli', 'gemini_cli'];
const statusPromises = providers.map(id => 
  this.cliManager.getCliStatus(id)
);
const results = await Promise.allSettled(statusPromises);
```

### Resource Management
- Connection pooling for database operations
- Memory-efficient project file processing
- Automatic cleanup of temporary files
- Process isolation for CLI commands

## Security Considerations

### Data Protection
- API keys encrypted at rest using AES-256
- CLI commands executed in isolated processes
- No logging of sensitive user data
- Secure token validation for all requests

### Authentication
- JWT-based authentication for web dashboard
- Token-based authentication for MCP requests
- Row-level security for database access
- Rate limiting per user and endpoint

### Process Security
- CLI commands run with limited privileges
- Timeout enforcement prevents resource exhaustion
- Input sanitization for all CLI prompts
- Process isolation prevents system access

## Testing and Development

### Local Development Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Test MCP server
node mcp/server.js

# Test stdio wrapper
node mcp/stdio-wrapper.js
```

### Testing CLI Integration
```bash
# Test CLI detection
node -e "
const CLIManager = require('./lib/cliManager').default;
const manager = new CLIManager();
manager.forceCliDetection().then(console.log);
"

# Test CLI prompt sending
node -e "
const CLIManager = require('./lib/cliManager').default;
const manager = new CLIManager();
manager.sendCliPrompt('claude_code', 'Hello world', 'args').then(console.log);
"
```

### MCP Server Testing
```bash
# Test MCP communication
echo '{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}' | node mcp/server.js

# Test tool listing
echo '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":2}' | node mcp/server.js
```

## Deployment

### Production Environment Variables
```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key  
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# MCP Integration
POLYDEV_USER_TOKEN=poly_production_token
POLYDEV_API_URL=https://polydev.ai/api/mcp

# CLI Integration  
POLYDEV_CLI_DEBUG=0
```

### Database Schema
Apply the required migrations for CLI integration:

```sql
-- CLI status tracking
CREATE TABLE cli_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  provider_id TEXT NOT NULL,
  available BOOLEAN DEFAULT false,
  authenticated BOOLEAN DEFAULT false,  
  version TEXT,
  path TEXT,
  last_checked TIMESTAMPTZ DEFAULT now(),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Usage tracking for CLI operations
ALTER TABLE usage_sessions ADD COLUMN IF NOT EXISTS strategy TEXT;
ALTER TABLE usage_sessions ADD COLUMN IF NOT EXISTS cli_provider TEXT;
```

### Vercel Deployment
```bash
# Deploy with all environment variables
vercel --prod --env POLYDEV_USER_TOKEN=poly_production_token
```

---

**Ready to integrate Polydev MCP?**  
Visit [https://polydev.ai/dashboard/mcp-integration](https://polydev.ai/dashboard/mcp-integration) for setup instructions.