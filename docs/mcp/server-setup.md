# MCP Server Setup

Use the hosted MCP endpoint for web, or run the local bridge for editors.

## Hosted (recommended)
- Generate a user token in the dashboard
- Your client sends JSON-RPC to the hosted MCP endpoint with `Authorization: Bearer poly_...`
- Call `tools/call` with `get_perspectives`

## Local bridge (optional)
```bash
git clone https://github.com/backspacevenkat/polydev-ai
cd polydev-ai
npm install
node mcp/server.js
```

Point your client to the local command (Claude Desktop / Cline / Continue). You can keep both configured and switch as needed.

## Minimal configuration
- Routing order: CLIs first, then your API keys, then credits
- Memory: Smart mode by default; limit to the folders you trust
- Streaming: On, to see models respond in real time

See MCP client guides:
- [Claude Desktop](clients/claude-desktop.md)
- [Cline (VS Code)](clients/cline.md)
- [Cursor](clients/cursor.md)
- [Continue (VS Code)](clients/continue.md)
- [Gemini CLI](clients/gemini-cli.md)
