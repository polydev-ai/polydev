# **Cline**

Connect Cline (VS Code extension) to Polydev MCP server.

## **Setup**

**1. Open VS Code Settings** → Extensions → Cline → MCP Servers

**2. Add Server Configuration:**

```json
{
  "cline.mcpServers": {
    "polydev": {
      "command": "npx",
      "args": ["-y", "@polydev-ai/mcp-server"]
    }
  }
}
```

**3. Restart VS Code**

## **Test**

Ask Cline:

*"Use polydev to get multiple perspectives on this code"*

**Done!** Cline now has access to multiple AI models through Polydev.