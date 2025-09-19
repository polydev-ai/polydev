# **Claude Desktop**

Add Polydev to Claude Desktop in 2 steps.

## **Setup**

**1. Add to config** → `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "polydev": {
      "command": "node",
      "args": ["/path/to/polydev-ai/mcp/server.js"]
    }
  }
}
```

**2. Restart Claude Desktop**

## **Test**

Ask Claude: *"Get multiple perspectives on React performance optimization"*

Done.