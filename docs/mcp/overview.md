# MCP Overview

Model Context Protocol (MCP) lets agents call tools over a simple, standard JSON-RPC interface. Polydev exposes a few focused tools so your editor can fan out to multiple models, add just enough context, and stream results back into the same thread.

## What you need to know
- Transport: JSON-RPC over stdio/HTTP
- Tools you’ll use most:
  - `get_perspectives` — query several models in parallel
  - `send_cli_prompt` — prefer local CLIs when authenticated
  - `report_cli_status` — update CLI availability
  - `search_documentation` — (optional) project docs lookup
- Routing: CLIs -> your API keys -> credits
- Context: project memory is client-side encrypted; only minimal snippets are attached

## Quick example

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "get_perspectives",
    "arguments": {
      "prompt": "Explain React hooks",
      "models": ["gpt-5", "claude-opus-4"]
    }
  }
}
```

## Next steps
- Add Polydev to your client:
  - [Claude Desktop](clients/claude-desktop.md)
  - [Cline (VS Code)](clients/cline.md)
  - [Cursor](clients/cursor.md)
  - [Continue (VS Code)](clients/continue.md)
  - [Gemini CLI](clients/gemini-cli.md)
- Want to self-host? See [Server Setup](server-setup.md)
