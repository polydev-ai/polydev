# Installing Polydev (for AI agents)

Polydev is an MCP server that lets the user ask other AI models (GPT, Claude, Gemini, Grok and more) from the app they already use. Pick one of the two setups below.

## Option A: hosted (no install)

If the client supports remote MCP servers with OAuth, add:

```json
{
  "mcpServers": {
    "polydev": {
      "type": "streamable-http",
      "url": "https://polydev.ai/mcp"
    }
  }
}
```

The first tool call opens a browser sign-in. Nothing else is needed.

## Option B: local (npm)

Requires Node.js 20 or newer.

```json
{
  "mcpServers": {
    "polydev": {
      "command": "npx",
      "args": ["-y", "polydev-ai@latest"]
    }
  }
}
```

No token is needed in the config. After adding the server, call the `login` tool: it opens the user's browser, and once they sign in the token is saved on this machine. In environments without a browser, the user can copy a token from https://polydev.ai/dashboard/mcp-tokens and pass it to `login` as `user_token`, or set `POLYDEV_USER_TOKEN` in the server's `env`.

Some models take a while to answer; if the client has a tool timeout, set it to 300 seconds.

## Check it works

Call `get_auth_status`, then `list_models`, then `ask_model` with a short prompt, for example `{"prompt": "Say hello in five words."}`. Each answer ends with a "Paid by:" line. A new account has 10 free requests.
