# **Claude Desktop**

Connect Claude Desktop to Polydev MCP server.

## **Setup**

**1. Add MCP Server** → Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "polydev": {
      "command": "npx",
      "args": ["-y", "@polydev-ai/mcp-server"]
    }
  }
}
```

**2. Restart Claude Desktop**

## **Test**

Ask Claude:

*"Get multiple perspectives on React performance optimization"*

**Done!** Claude now has access to multiple AI models through Polydev.