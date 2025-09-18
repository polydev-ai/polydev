# Continue (VS Code)

Configure Continue to call the local MCP bridge.

```json
{
  "continue.mcpServers": {
    "polydev": {
      "command": "node",
      "args": ["/path/to/polydev-ai/mcp/server.js"]
    }
  }
}
```

## Gotchas
- Continue caches some settings; restart the extension after changes.
- Ensure the server path is executable and accessible by VS Code.
