# Installation

> This guide shows the fastest way to add Polydev to your setup. You can run the hosted MCP server or the local bridge.

## 1) Install the local MCP bridge (optional)

```bash
# Clone
git clone https://github.com/backspacevenkat/polydev-ai
cd polydev-ai

# Install
npm install

# Run local MCP bridge
node mcp/server.js
```

Configure your MCP client to point at this command (Claude Desktop, Cline, etc.).

## 2) Use the hosted MCP endpoint (recommended for web)

Set an MCP user token in your client and call the hosted JSON-RPC endpoint. Generate a token in the dashboard, then in your MCP client pass:

- `Authorization: Bearer <polydev_token>`
- JSON-RPC method `tools/call` with tool `get_perspectives`

## 3) Optional: dashboard + API

```bash
# Dev server
npm run dev
# Open http://localhost:3000
```

In Settings you can add API keys, configure CLI detection, and manage memory preferences.

## Environment

Create `.env.local` with your Supabase URL and anon key. Service-role is only needed for server actions and should never be used in the browser.

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

That’s it. Move on to the Quick Start to make your first multi-model request.
