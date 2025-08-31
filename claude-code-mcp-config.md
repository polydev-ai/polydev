# Claude Code MCP Configuration

## Issue Identified

Claude Code is showing "server reconnection failed" because it's likely configured with curl commands instead of HTTP transport. OAuth MCP servers require HTTP transport to handle token storage and re-authentication.

## Correct Configuration

Your Claude Code configuration should use **HTTP transport**, not curl commands:

### ✅ Correct (HTTP Transport)
```json
{
  "mcpServers": {
    "polydev": {
      "transport": {
        "type": "http",
        "url": "https://www.polydev.ai/api/mcp"
      }
    }
  }
}
```

### ❌ Incorrect (Curl Commands)
```json
{
  "mcpServers": {
    "polydev": {
      "command": "curl",
      "args": ["-X", "POST", "https://www.polydev.ai/api/mcp", "-H", "Content-Type: application/json"]
    }
  }
}
```

## Why Curl Configuration Fails

1. **No OAuth Token Storage**: Curl can't store OAuth tokens between requests
2. **No Re-authentication**: Curl can't handle OAuth flow during reconnection
3. **No HTTP Transport Protocol**: MCP with OAuth requires persistent HTTP transport

## How to Fix

1. Update your Claude Code configuration to use HTTP transport (see correct config above)
2. Remove any curl-based MCP server configurations
3. Restart Claude Code
4. The OAuth flow will work automatically with HTTP transport

## Verification

After updating the configuration:
1. You should see MCP server logs when Claude Code reconnects
2. No more "server reconnection failed" errors
3. OAuth authentication will work seamlessly

## Current Status

✅ OAuth flow working (authorization codes and tokens generated)
✅ MCP server endpoints working correctly
✅ Bearer token authentication implemented
🔄 Need to update Claude Code configuration to use HTTP transport