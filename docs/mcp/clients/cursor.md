# **Cursor**

Connect Cursor to Polydev MCP server.

## **Setup**

**1. Open Cursor Settings** → MCP Servers

**2. Add Configuration:**

```json
{
  "polydev": {
    "command": "npx",
    "args": ["-y", "@polydev-ai/mcp-server"]
  }
}
```

**3. Restart Cursor**

## **Test**

Ask Cursor:

*"Get multiple AI perspectives on this architecture"*

**Done!** Cursor now has access to multiple AI models through Polydev.