# **Cline**

Add Polydev to Cline (VS Code extension).

## **Setup**

**1. Open VS Code settings** → Extensions → Cline → MCP Servers

**2. Add server:**

```json
{
  "cline.mcpServers": {
    "polydev": {
      "command": "node",
      "args": ["/path/to/polydev-ai/mcp/server.js"]
    }
  }
}
```

**3. Restart VS Code**

## **Test**

Ask Cline: *"Use polydev to get multiple perspectives on this code"*

Done.