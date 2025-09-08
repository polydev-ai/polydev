# CLI Provider Integration - Polydev MCP

**Direct integration with Claude Code, Codex CLI, and Gemini CLI for seamless AI assistance.**

## Overview

Polydev now provides first-class integration with popular developer CLI tools, offering the highest priority in our fallback system:

**Priority Order**: CLI Providers → Personal API Keys → Provisioned Keys → Credits

## Supported CLI Providers

### Claude Code (`claude_code`)
- **Description**: Official Anthropic CLI for Claude
- **Installation**: `npm install -g @anthropic-ai/claude-code`
- **Authentication**: `claude auth login`
- **Usage**: `claude chat "your prompt"`

### Codex CLI (`codex_cli`)
- **Description**: OpenAI's developer-focused CLI interface
- **Installation**: Install from OpenAI
- **Authentication**: `codex auth`
- **Usage**: `codex chat "your prompt"`

### Gemini CLI (`gemini_cli`)
- **Description**: Google's AI CLI tool for developers
- **Installation**: Install from Google
- **Authentication**: `gemini auth login`
- **Usage**: `gemini chat "your prompt"`

## MCP Tools

### 1. Force CLI Detection

Detects and reports status for all or specific CLI providers.

```javascript
const detection = await mcp.callTool({
  name: "polydev.force_cli_detection",
  arguments: {
    user_id: "user_123",        // Optional for stdio wrapper
    provider_id: "claude_code"   // Optional, detects all if not provided
  }
});
```

**Response:**
```json
{
  "success": true,
  "results": {
    "claude_code": {
      "available": true,
      "authenticated": true,
      "version": "claude-code v1.2.3",
      "path": "/usr/local/bin/claude"
    },
    "codex_cli": {
      "available": false,
      "authenticated": false,
      "error": "Codex CLI not found in PATH. Install Codex CLI from OpenAI"
    },
    "gemini_cli": {
      "available": true,
      "authenticated": false,
      "version": "gemini-cli v0.8.1",
      "path": "/usr/local/bin/gemini",
      "error": "Not authenticated"
    }
  },
  "message": "CLI detection completed for all providers",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 2. Get CLI Status (Cached)

Retrieves cached CLI status with 5-minute cache timeout.

```javascript
const status = await mcp.callTool({
  name: "polydev.get_cli_status", 
  arguments: {
    user_id: "user_123",        // Optional for stdio wrapper
    provider_id: "claude_code"   // Optional, gets all if not provided
  }
});
```

### 3. Send CLI Prompt

Sends a prompt to a specific CLI provider and returns the response.

```javascript
const response = await mcp.callTool({
  name: "polydev.send_cli_prompt",
  arguments: {
    provider_id: "claude_code",
    prompt: "Help me debug this React performance issue. The component re-renders excessively.",
    mode: "args",               // "args" or "stdin"
    timeout_ms: 30000,          // Default: 30 seconds
    user_id: "user_123"         // Optional for usage tracking
  }
});
```

**Response:**
```json
{
  "success": true,
  "content": "Looking at React performance issues, excessive re-renders typically occur due to...",
  "tokens_used": 150,
  "latency_ms": 1200,
  "provider": "claude_code",
  "mode": "args",
  "timestamp": "2024-01-15T10:35:00Z"
}
```

## Integration with OpenRouter Priority System

The CLI integration seamlessly works with the existing OpenRouter Manager:

```typescript
// Priority 1: CLI Tools
const result = await openRouterManager.determineApiKeyStrategy(
  userId,
  userApiKey,
  estimatedCost,
  true,  // isCliRequest
  "claude_code",  // preferredCliProvider
  prompt
);

if (result.strategy === 'cli') {
  // CLI response available in result.cliResponse
  return result.cliResponse.content;
}

// Priority 2-4: Personal API keys, Provisioned keys, Credits
// Existing fallback system continues unchanged
```

## Environment Configuration

### Custom CLI Paths

Set custom paths for CLI executables via environment variables:

```bash
export CLAUDE_CODE_PATH="/custom/path/to/claude"
export CODEX_CLI_PATH="/custom/path/to/codex" 
export GEMINI_CLI_PATH="/custom/path/to/gemini"
```

### Debug Mode

Enable debug logging for CLI operations:

```bash
export POLYDEV_CLI_DEBUG=1
```

## Local File Caching (Stdio Wrapper)

The stdio wrapper provides local-only functionality with file-based caching:

### CLI Status Cache
- **Location**: `~/.polydev/cli-status.json`
- **Format**: JSON with timestamp and results
- **Timeout**: 5 minutes

### Usage Analytics
- **Location**: `~/.polydev/cli-usage.json`
- **Format**: Array of usage records
- **Retention**: Last 1000 records

## Error Handling

### Common Error Scenarios

1. **CLI Not Found**
```json
{
  "success": false,
  "error": "Claude Code not found in PATH. Install via: npm install -g @anthropic-ai/claude-code"
}
```

2. **CLI Not Authenticated**
```json
{
  "success": false,
  "error": "Claude Code is not authenticated. Authenticate with: claude auth login"
}
```

3. **CLI Command Failed**
```json
{
  "success": false,
  "error": "CLI command failed: Command timeout after 30000ms",
  "latency_ms": 30000
}
```

## Cross-Platform Compatibility

### Windows
- Uses `cmd.exe` for command execution
- Supports both `.exe` and `.cmd` executables
- Environment variable paths with drive letters

### macOS/Linux
- Uses shell command execution
- Standard PATH-based resolution
- Unix-style path handling

## Usage Analytics Integration

CLI usage is tracked via MCP Supabase integration:

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
  $1,
  'cli_provider',
  'polydev',
  'cli_claude_code',
  1,
  150,
  '0',  -- No cost for CLI usage
  'cli_request',
  '{"strategy": "cli", "provider": "claude_code", "latency_ms": 1200}'
);
```

## Best Practices

### 1. Graceful Degradation
Always implement fallback to other strategies:

```javascript
// Try CLI first
let response = await tryCliProvider("claude_code", prompt);

// Fallback to API keys if CLI fails
if (!response.success) {
  response = await tryPersonalApiKeys(prompt);
}

// Final fallback to credits
if (!response.success) {
  response = await tryCreditsSystem(prompt);
}
```

### 2. Timeout Management
Use appropriate timeouts for different scenarios:

```javascript
// Quick status check
timeout_ms: 5000

// Complex code generation
timeout_ms: 60000

// Standard prompts  
timeout_ms: 30000  // Default
```

### 3. Error User Experience
Provide actionable error messages:

```javascript
if (error.includes("not found in PATH")) {
  return "Please install Claude Code: npm install -g @anthropic-ai/claude-code";
}

if (error.includes("not authenticated")) {
  return "Please authenticate: claude auth login";
}
```

## Troubleshooting

### CLI Detection Issues

1. **Verify Installation**
```bash
which claude
which codex  
which gemini
```

2. **Check Authentication**
```bash
claude auth status
codex auth status  
gemini auth status
```

3. **Test Manual Execution**
```bash
claude chat "test prompt"
codex chat "test prompt"
gemini chat "test prompt"
```

### Debug CLI Manager

Enable verbose logging in development:

```bash
export NODE_ENV=development
export POLYDEV_CLI_DEBUG=1
node mcp/server.js
```

### Common Issues

**"spawn ENOENT" Error**: CLI executable not found in PATH
- Solution: Install CLI or set custom path via environment variable

**Authentication Timeout**: CLI authentication expired
- Solution: Re-authenticate with the respective CLI tool

**Command Hangs**: Process doesn't terminate
- Solution: Check timeout settings and CLI responsiveness

## Security Considerations

- CLI tools use existing user authentication sessions
- No API keys stored or transmitted through Polydev
- Local file permissions for cache files
- Process isolation for CLI command execution
- Timeout enforcement to prevent hanging processes

## Performance

- **CLI Detection**: ~100-500ms per provider
- **Cached Status**: ~1-5ms response time
- **CLI Prompt**: Variable based on CLI provider response time
- **Local Storage**: Minimal disk usage (~1MB for typical usage)

---

**Ready to use CLI providers in your workflow?**  
Visit [https://polydev.ai/dashboard/cli-integration](https://polydev.ai/dashboard/cli-integration) to get started.