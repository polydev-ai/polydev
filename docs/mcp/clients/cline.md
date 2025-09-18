# Cline (VS Code)

Open Cline settings and add Polydev as an MCP server.

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

Use `@polydev` in a prompt to fan out to multiple models.

## Gotchas
- On Windows, wrap the MCP server path in quotes if it contains spaces.
- Restart VS Code after changing the MCP settings.
- If prompts stall, check the VS Code Output panel for MCP errors.
