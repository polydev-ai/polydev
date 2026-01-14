# Polydev AI MCP Server

Get diverse AI perspectives from multiple LLMs via Model Context Protocol (MCP). Supports Cline, Claude Code, and other MCP clients with local CLI detection and remote AI perspectives.

## Features

- 🤖 **Multi-Model AI Perspectives**: Get responses from multiple AI models simultaneously
- 🔧 **Local CLI Detection**: Automatically detect and use Claude Code, Codex CLI, Gemini CLI
- ⚡ **Smart Caching**: Intelligent refresh intervals based on CLI status
- 🔄 **Fallback Support**: Local CLI + remote perspectives for comprehensive responses
- 🔐 **Secure**: Token-based authentication with your Polydev account

## Installation

### For Claude Code Users

```bash
# Install globally
npm install -g polydev-ai

# Or use directly with npx
npx polydev-ai
```

### For Cline Users

Add to your MCP settings (`.cline/mcp_servers.json`):

```json
{
  "mcpServers": {
    "polydev": {
      "command": "npx",
      "args": ["polydev-ai"],
      "env": {
        "POLYDEV_USER_TOKEN": "your_token_here"
      }
    }
  }
}
```

## Configuration

### Get Your Token

1. Sign up at [polydev.ai](https://polydev.ai)
2. Go to your dashboard and copy your MCP token
3. Set the environment variable:

```bash
export POLYDEV_USER_TOKEN="pd_your_token_here"
```

### Claude Code Integration

Add to your Claude Code MCP configuration:

```json
"polydev": {
  "disabled": false,
  "timeout": 120,
  "type": "http",
  "url": "https://www.polydev.ai/api/mcp"
}
```

### Codex CLI Integration (OpenAI)

Add to `~/.codex/config.toml`:

```toml
[mcp_servers.polydev]
command = "/path/to/node"
args = ["/path/to/node_modules/polydev-ai/mcp/stdio-wrapper.js"]
env = { POLYDEV_USER_TOKEN = "pd_your_token_here" }

[mcp_servers.polydev.timeouts]
tool_timeout = 180
session_timeout = 600
```

**Important for Codex CLI:**
- Use direct `node` path instead of `npx` for faster startup
- Find your node path with: `which node`
- Find polydev path with: `npm root -g`

Example with typical paths:
```toml
[mcp_servers.polydev]
command = "/Users/yourname/.nvm/versions/node/v22.20.0/bin/node"
args = ["/Users/yourname/.nvm/versions/node/v22.20.0/lib/node_modules/polydev-ai/mcp/stdio-wrapper.js"]
env = { POLYDEV_USER_TOKEN = "pd_your_token_here" }

[mcp_servers.polydev.timeouts]
tool_timeout = 180
session_timeout = 600
```

## Available Tools

- `get_perspectives` - Get AI responses from multiple models (models managed by Polydev)
- `force_cli_detection` - Force detection of local CLI tools
- `get_cli_status` - Check status of CLI tools (Claude Code, Codex, Gemini)
- `send_cli_prompt` - Send prompts to local CLI with perspectives fallback

## Usage Examples

### Get Multi-Model Perspectives

```typescript
// Use the get_perspectives tool
{
  "prompt": "How do I optimize React performance?"
}
```

### Check CLI Status

```typescript
// Check all CLI tools
await get_cli_status({})

// Check specific tool
await get_cli_status({ provider_id: "claude_code" })
```

### Send CLI Prompt with Fallback

```typescript
await send_cli_prompt({
  provider_id: "claude_code",
  prompt: "Write a Python function to parse JSON",
  mode: "args"
})
```

## Supported CLI Tools

- **Claude Code** (`claude`) - Anthropic's official CLI
- **Codex CLI** (`codex`) - OpenAI's code CLI
- **Gemini CLI** (`gemini`) - Google's Gemini CLI

## Smart Refresh System

The MCP server automatically detects CLI status changes:

- **Unavailable CLIs**: Check every 2 minutes
- **Unauthenticated CLIs**: Check every 3 minutes  
- **Working CLIs**: Check every 10 minutes
- **Fallback detection**: Check every 5 minutes

## Environment Variables

- `POLYDEV_USER_TOKEN` - Your Polydev authentication token (required)
- `POLYDEV_CLI_DEBUG` - Enable CLI debugging output
- `CLAUDE_CODE_PATH` - Custom path to Claude Code CLI
- `CODEX_CLI_PATH` - Custom path to Codex CLI
- `GEMINI_CLI_PATH` - Custom path to Gemini CLI

## Troubleshooting

### Codex CLI: "Transport closed" Error

This error occurs when the MCP handshake fails. Common causes and fixes:

1. **Use direct node path instead of npx**
   ```toml
   # Wrong - npx has startup overhead
   command = "npx"
   args = ["-y", "polydev-ai"]

   # Correct - direct node path
   command = "/path/to/node"
   args = ["/path/to/polydev-ai/mcp/stdio-wrapper.js"]
   ```

2. **Use inline env format**
   ```toml
   # Correct format
   env = { POLYDEV_USER_TOKEN = "pd_xxx" }
   ```

3. **Protocol version mismatch**: Ensure polydev-ai version >= 1.8.36 which supports MCP protocol 2025-06-18

4. **Check Codex logs** for details:
   ```bash
   cat ~/.codex/log/codex-tui.log | tail -50
   ```

### CLI Not Detected

1. Ensure the CLI is installed and in your PATH
2. Check authentication: `claude auth status` / `codex login status`
3. Enable debugging: `export POLYDEV_CLI_DEBUG=1`

### Gemini CLI: Truncated "I will search..." Responses

If Gemini CLI returns truncated responses like "I will search for..." or "I will look up..." instead of actual analysis:

**Cause**: Gemini CLI has an "agentic mode" that triggers when prompts mention code, files, or repositories. In headless `-p` mode, Gemini tries to use tools (file search, web search) but they can't execute, so it outputs intentions instead of analysis.

**Fix**: The `-s` (sandbox) flag disables tool use. As of v1.8.37, polydev-ai automatically adds this flag. To update:

```bash
# Update polydev-ai
npm update -g polydev-ai

# Or in mcp-execution
cd ~/mcp-execution && npm update polydev-ai
```

**Note**: Simple prompts (like "What is 5 + 5?") work correctly because they don't trigger agentic behavior. Complex prompts about code/repositories do.

### Token Issues

1. Verify your token at [polydev.ai/dashboard](https://polydev.ai/dashboard)
2. Ensure the token starts with `pd_`
3. Check environment variable is set correctly

### Permission Errors

```bash
# Fix npm permissions
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
```

### Debugging MCP Connection

Test the wrapper manually:
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' | \
  POLYDEV_USER_TOKEN="pd_xxx" node /path/to/stdio-wrapper.js
```

You should see a JSON response with `protocolVersion: "2025-06-18"`

## Support

- 📧 Email: [support@polydev.ai](mailto:support@polydev.ai)
- 📖 Docs: [polydev.ai/docs](https://polydev.ai/docs)
- 🐛 Issues: [GitHub Issues](https://github.com/backspacevenkat/polydev-website/issues)

## License

MIT License - see LICENSE file for details.
