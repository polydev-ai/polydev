# Quick Start

Get Polydev running in 2 minutes.

## Install

```bash
git clone https://github.com/polydev-ai/polydev.git
cd polydev
npm install
```

## Setup

**Option 1: Use existing CLI tools (recommended)**

If you have Claude Desktop, Cline, or Cursor installed, you're done. Polydev will use these automatically.

**Option 2: Add your API keys**

```bash
# Start dashboard
npm run dev

# Open http://localhost:3000
# Go to Settings → API Keys
# Add your OpenAI, Anthropic, or other API keys
```

## Configure your agent

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "polydev": {
      "command": "node",
      "args": ["/path/to/polydev/mcp/server.js"]
    }
  }
}
```

## Test it

Ask your agent:

```
"I'm having trouble with React re-renders. Can you get multiple perspectives on debugging this?"
```

Your agent will use Polydev to query multiple AI models and give you diverse solutions.

## That's it

Polydev now handles multi-model requests automatically when your agent gets stuck.
