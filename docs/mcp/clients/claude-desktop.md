# Claude Desktop

Add Polydev as an MCP server in claude_desktop_config.json.

```json
{
  "mcpServers": {
    "polydev": {
      "command": "node",
      "args": ["/path/to/polydev-ai/mcp/server.js"],
      "env": {
        "POLYDEV_USER_TOKEN": "poly_..."
      }
    }
  }
}
```

Restart Claude Desktop and run a tool call to test.

## Gotchas
- On macOS, the config path uses spaces; escape them correctly.
- Ensure `node` is on PATH for Claude Desktop.
- If nothing happens, check the Claude logs for stdio errors from the MCP server.
