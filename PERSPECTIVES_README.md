# Polydev Perspectives - Agentic Workflow Bridge

**When AI agents get stuck, Polydev bridges the gap with multiple model perspectives.**

Polydev Perspectives is an MCP (Model Context Protocol) tool specifically designed for agentic workflows. When your agent encounters roadblocks, difficult decisions, or complex problems, it can call our tool to get diverse perspectives from multiple leading AI models simultaneously - no API key management required.

## Features

- 🤖 **Multi-LLM Perspectives**: Query 37+ models across 20+ providers including GPT-4, Claude 3, Gemini Pro, Groq, Perplexity, Together AI simultaneously
- 🔑 **Comprehensive API Key Management**: Support for OpenAI, Anthropic, Google, Azure, AWS Bedrock, Cohere, Mistral, Groq, Together, Perplexity, and 15+ more providers
- 🛠️ **CLI Provider Integration**: Direct integration with Claude Code, Codex CLI, and Gemini CLI for authenticated users
- 🧠 **Smart Project Memory**: TF-IDF-based context selection for better debugging assistance
- 🛠️ **MCP Native**: Built specifically for Model Context Protocol agent integration
- ⚡ **Priority-Based Fallback**: CLI tools → Personal API keys → Provisioned keys → Credits system
- 🌐 **Modern Dashboard**: Configure API keys, rate limits, budgets, and usage analytics
- 📊 **Advanced Analytics**: Track token usage, costs, latency, and success rates per provider
- 💾 **Encrypted Key Storage**: Secure storage with provider-specific configuration options
- 💰 **Budget Controls**: Set monthly spending limits and rate limits per API key
- 🔧 **Custom Endpoints**: Support for custom API bases, regions, and deployment configurations

## Agent Integration Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    AI Agent                             │
│                 (Claude/GPT/etc)                        │
│  ┌─────────────┐ encounters difficult problem           │
│  │ gets stuck  │ ──────────────┐                        │
│  │ on problem  │               │                        │
│  └─────────────┘               │                        │
└──────────────────────────────────────┼─────────────────▲┘
                                       │                 │
                                       ▼                 │
                          ┌─────────────────────────────────┐
                          │      Polydev MCP Tool           │
                          │     (Bridge/Orchestrator)       │
                          └──────────────┬──────────────────┘
                                         │
                                         ▼
                          ┌─────────────────────────────────┐
                          │    Perspectives API             │
                          │   (Polydev-managed keys)        │
                          └─────────────┬───────────────────┘
                                        │
          ┌─────────────────────────────┼─────────────────────────┐
          │                             │                         │
  ┌───────▼────┐                ┌──────▼──────┐           ┌──────▼──────┐
  │   GPT-4    │                │ Claude 3    │           │  Gemini Pro │
  │ Perspective │                │ Perspective │           │ Perspective │
  └────────────┘                └─────────────┘           └─────────────┘
          │                             │                         │
          └─────────────────────────────┼─────────────────────────┘
                                        │
                                        ▼
                          ┌─────────────────────────────────┐
                          │   Formatted Multi-Perspective   │
                          │        Response                 │
                          └─────────────────────────────────┘
                                        │
                                        │ Agent proceeds with
                                        │ diverse insights
                                        ▼
┌─────────────────────────────────────────────────────────┐
│                   AI Agent                              │
│               Overcomes Roadblock                       │
└─────────────────────────────────────────────────────────┘
```

## Quick Start for Agents

### 1. Set Up API Keys & Authentication

**Option A: Use Your Own API Keys (Recommended)**
1. Visit [https://polydev.ai/dashboard/api-keys](https://polydev.ai/dashboard/api-keys)
2. Add API keys for providers you want to use (OpenAI, Anthropic, Google, Groq, etc.)
3. Configure custom endpoints, budgets, and rate limits as needed
4. Sign in to authenticate when using the API

**Option B: Use MCP Tokens with Managed Keys**
1. Visit [https://polydev.ai/dashboard/mcp-tools](https://polydev.ai/dashboard/mcp-tools) 
2. Generate MCP access token (starts with `poly_`)
3. Uses Polydev-managed API keys (limited model selection)

### 2. Add MCP Server to Agent Configuration

```json
{
  "mcpServers": {
    "polydev-perspectives": {
      "command": "node",
      "args": ["/path/to/polydev/mcp/server.js"],
      "env": {
        "POLYDEV_API_URL": "https://polydev.ai/api/perspectives"
      }
    }
  }
}
```

### 3. Agent Integration - When Stuck, Call Tool

**Using CLI Providers (Highest Priority):**
```javascript
// If you have Claude Code, Codex CLI, or Gemini CLI authenticated
const perspectives = await callTool({
  name: "polydev.send_cli_prompt",
  arguments: {
    provider_id: "claude_code",  // or "codex_cli", "gemini_cli"
    prompt: "I'm debugging this React performance issue but can't identify the root cause. Help me find what's causing excessive re-renders.",
    mode: "args",  // or "stdin"
    user_id: "user_123"  // for usage tracking
  }
});
```

**Using Your Own API Keys (Second Priority):**
```javascript
// Agent must be authenticated - uses your configured API keys
const perspectives = await callTool({
  name: "get_perspectives", 
  arguments: {
    prompt: "I'm debugging this React performance issue but can't identify the root cause. Help me find what's causing excessive re-renders.",
    mode: "user_keys",  // Use your API keys
    models: ["gpt-4", "claude-3-sonnet", "gemini-pro", "llama-3.1-70b-versatile"],  // Any models you have keys for
    project_memory: "light"
  }
});
```

**Using MCP Tokens (Third Priority):**
```javascript
const perspectives = await callTool({
  name: "get_perspectives", 
  arguments: {
    prompt: "I'm debugging this React performance issue...",
    user_token: "poly_your_generated_token_here",  // MCP token
    mode: "managed",  // Use Polydev-managed keys
    models: ["gpt-4", "claude-3-sonnet", "gemini-pro"]  // Limited to managed models
  }
});
```

## CLI Provider Integration

Polydev now includes direct integration with popular CLI tools used by developers:

### Available CLI Providers

- **Claude Code** (`claude_code`): Official Claude CLI from Anthropic
- **Codex CLI** (`codex_cli`): OpenAI's code-focused CLI interface
- **Gemini CLI** (`gemini_cli`): Google's AI CLI tool

### CLI Provider Tools

#### Force CLI Detection
```javascript
await callTool({
  name: "polydev.force_cli_detection",
  arguments: {
    user_id: "user_123",  // optional for stdio wrapper
    provider_id: "claude_code"  // optional, detects all if not provided
  }
});
```

#### Get CLI Status
```javascript
await callTool({
  name: "polydev.get_cli_status", 
  arguments: {
    user_id: "user_123",  // optional for stdio wrapper
    provider_id: "claude_code"  // optional, gets all if not provided
  }
});
```

#### Send CLI Prompt
```javascript
await callTool({
  name: "polydev.send_cli_prompt",
  arguments: {
    provider_id: "claude_code",
    prompt: "Debug this TypeScript error: Property 'map' does not exist on type 'string'",
    mode: "args",  // or "stdin"
    timeout_ms: 30000,
    user_id: "user_123"  // optional for usage tracking
  }
});
```

## Usage Examples

### Basic Perspectives Query

```bash
# Simple query with default models
./perspectives.py get "Explain the benefits of TypeScript over JavaScript"

# Specify custom models
./perspectives.py get "How to optimize React performance?" --models gpt-4 claude-3-sonnet

# Use managed mode with temperature control
./perspectives.py get "Design a REST API for user management" --mode managed --temperature 0.3
```

### With Project Memory

```bash
# Light project memory (recent files)
./perspectives.py get "Review this code for improvements" \
  --memory light \
  --project-root /path/to/your/project

# Full TF-IDF similarity-based context
./perspectives.py get "Add error handling to the authentication module" \
  --memory full \
  --project-root /path/to/your/project \
  --includes "**/*.ts" "**/*.tsx" \
  --excludes "node_modules/**" "dist/**" \
  --context-files 8 \
  --context-budget 12000
```

### MCP Tool Integration

```json
{
  "name": "get_perspectives",
  "arguments": {
    "prompt": "How can I improve the performance of this database query?",
    "models": ["gpt-4", "claude-3-sonnet"],
    "mode": "byo",
    "project_memory": "full",
    "project_context": {
      "root_path": "/workspace/myproject",
      "includes": ["**/*.sql", "**/*.py"],
      "excludes": ["migrations/**"]
    }
  }
}
```

## API Reference

### POST /api/perspectives

Get perspectives from multiple AI models.

**Request Body:**

```typescript
interface GetPerspectivesRequest {
  prompt: string                    // The prompt to get perspectives on
  user_token?: string               // MCP token (for managed mode)
  models?: string[]                 // Models to query (default: [gpt-4, claude-3-sonnet, gemini-pro])
  mode?: 'managed' | 'user_keys'    // API key mode (default: user_keys)
  project_memory?: 'none' | 'light' | 'full'  // Project context level (default: none)
  max_messages?: number             // Max messages for tool calls (default: 10)
  temperature?: number              // Model temperature (default: 0.7)
  max_tokens?: number              // Max tokens per response (default: 2000)
  project_context?: {              // Project context for memory
    root_path?: string
    includes?: string[]
    excludes?: string[]
  }
}
```

**Response:**

```typescript
interface PerspectivesResponse {
  responses: Array<{
    model: string
    content: string
    tokens_used?: number
    latency_ms?: number
    error?: string
  }>
  total_tokens?: number
  total_latency_ms?: number
  cached?: boolean
}
```

## Configuration

### Web Dashboard

Navigate to `/settings/perspectives` to configure:

- **Default Mode**: Managed vs BYO keys
- **Project Memory**: None, Light, or Full TF-IDF
- **Model Settings**: Temperature, max tokens, message limits
- **API Key Management**: Add, disable, delete BYO keys

### CLI Configuration

```bash
# View current configuration
./perspectives.py config --list

# Set individual values
./perspectives.py config --set default_models '["gpt-4", "claude-3-sonnet"]'
./perspectives.py config --set project_memory "full"
./perspectives.py config --set temperature 0.8
```

### Environment Variables

```bash
# API authentication token
export POLYDEV_API_TOKEN="your-api-token"

# Custom API URL
export POLYDEV_API_URL="https://your-domain.com/api/perspectives"
```

## Project Memory

The project memory system uses TF-IDF (Term Frequency-Inverse Document Frequency) to select the most relevant code snippets based on your prompt:

### Memory Levels

- **None**: No project context added
- **Light**: Include recently modified files  
- **Full**: TF-IDF similarity-based selection of most relevant snippets

### File Selection

```python
# Default includes (can be overridden)
includes = [
    "**/*.py", "**/*.js", "**/*.ts", "**/*.tsx", "**/*.jsx",
    "**/*.java", "**/*.cpp", "**/*.c", "**/*.h", "**/*.cs",
    "**/*.go", "**/*.rs", "**/*.php", "**/*.rb", "**/*.swift",
    "**/*.kt", "**/*.scala", "**/*.md", "**/*.txt"
]

# Default excludes (can be overridden)  
excludes = [
    "node_modules/**", "venv/**", "env/**", "__pycache__/**",
    ".git/**", ".next/**", "dist/**", "build/**", "target/**"
]
```

### Caching

Project files are cached locally with content hashing:

- **Location**: `~/.polydev/cache/project_memory.db`
- **Cache Key**: File path + content hash + modification time
- **Storage**: SQLite database with TF-IDF vectors

## Database Schema

### User API Keys

```sql
CREATE TABLE user_api_keys (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  provider TEXT CHECK (provider IN ('openai', 'anthropic', 'google')),
  encrypted_key TEXT NOT NULL,
  key_name TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### I/O Logging

```sql
CREATE TABLE perspectives_io_log (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  input_prompt TEXT NOT NULL,
  output_data JSONB NOT NULL,
  tokens_used INTEGER,
  latency_ms INTEGER,
  models_used TEXT[],
  mode TEXT CHECK (mode IN ('managed', 'byo')),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Project Memory Cache

```sql
CREATE TABLE project_memory (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  project_name TEXT NOT NULL,
  root_path TEXT NOT NULL,
  file_path TEXT NOT NULL,
  content_snippet TEXT NOT NULL,
  tfidf_vector JSONB,
  last_updated TIMESTAMPTZ DEFAULT now()
);
```

## Security

### API Key Encryption

- BYO API keys are encrypted before storage
- Keys are decrypted only during API calls
- No keys are logged or cached in plaintext

### Rate Limiting

- **Managed Mode**: 60 requests/minute, 1000/hour
- **BYO Mode**: 100 requests/minute, 5000/hour
- Per-user limits with token bucket algorithm

### Authentication

- JWT-based authentication for web dashboard
- API token authentication for CLI and MCP
- Row-level security (RLS) for all data access

## Deployment

### Environment Variables

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# API Keys (for managed mode)
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
GOOGLE_API_KEY=your-google-ai-key

# Optional
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

### Database Migration

```bash
# Apply the perspectives schema migration
supabase db push
```

### Vercel Deployment

```bash
# Deploy with environment variables
vercel --prod
```

## Troubleshooting

### Common Issues

1. **"No valid models/API keys available"**
   - Verify BYO keys are active in dashboard
   - Check managed mode environment variables
   - Ensure selected models match available providers

2. **"Project memory not working"**
   - Verify project root path exists
   - Check file patterns include target files
   - Ensure sufficient permissions for file access

3. **"TF-IDF computation failed"**
   - Install required Python dependencies
   - Check for empty or binary files in corpus
   - Reduce context budget if memory issues occur

### Debug Mode

```bash
# Enable verbose logging
export POLYDEV_DEBUG=1

# View detailed API responses
./perspectives.py get "test prompt" --output json
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.