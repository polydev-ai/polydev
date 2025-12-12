# Polydev AI MCP Server

Get diverse AI perspectives from multiple LLMs via Model Context Protocol (MCP). Supports Cline, Claude Code, and other MCP clients with local CLI detection and remote AI perspectives.

## Features

- 🤖 **Multi-Model AI Perspectives**: Get responses from GPT-4, Claude, Gemini, and more
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
        },
```

## Available Tools

- `get_perspectives` - Get AI responses from multiple models
- `force_cli_detection` - Force detection of local CLI tools
- `get_cli_status` - Check status of CLI tools (Claude Code, Codex, Gemini)
- `send_cli_prompt` - Send prompts to local CLI with perspectives fallback

## Usage Examples

### Get Multi-Model Perspectives

```typescript
// Use the get_perspectives tool
{
  "prompt": "How do I optimize React performance?",
  "models": ["gpt-4", "claude-3-sonnet", "gemini-pro"]
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

### CLI Not Detected

1. Ensure the CLI is installed and in your PATH
2. Check authentication: `claude auth status` / `codex login status`
3. Enable debugging: `export POLYDEV_CLI_DEBUG=1`

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

## Support

- 📧 Email: [support@polydev.ai](mailto:support@polydev.ai)
- 📖 Docs: [polydev.ai/docs](https://polydev.ai/docs)
- 🐛 Issues: [GitHub Issues](https://github.com/backspacevenkat/polydev-website/issues)

## License

MIT License - see LICENSE file for details.
