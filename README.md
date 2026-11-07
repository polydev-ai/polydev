# Polydev

<p align="center">
  <img src="https://www.polydev.ai/logo.png" alt="Polydev logo" width="120" />
</p>

<p align="center">
  <strong>Every AI model, inside the app you already use.</strong><br>
  Ask GPT from Claude. Ask Claude from ChatGPT. Make an image with Nano Banana from Codex.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/polydev-ai"><img src="https://img.shields.io/npm/v/polydev-ai.svg" alt="npm version"></a>
  <img src="https://img.shields.io/badge/License-Apache--2.0-blue.svg" alt="License: Apache-2.0">
</p>

---

## What it is

Polydev is an MCP server: a tool your app calls. It doesn't replace your app's model.

Claude, ChatGPT, Claude Code, Codex, Cursor, Copilot, Cline, Windsurf, Zed and other MCP clients keep their own model and their own sign-in. When you want another model for a task, say "have GPT check this migration", the app calls Polydev, which asks that model and returns the answer. Name one model, several, or none to use your default set.

```
Your app (its own model) -> Polydev ask_model -> GPT, Claude, Gemini, Grok... -> answer + what paid for it
```

Every answer ends with a "Paid by:" line, so you always know whether your ChatGPT plan, your own key or Polydev's free requests paid for it.

Tools:

| Tool | What it does |
|------|--------------|
| `ask_model` | Send a prompt to one model (`model`), a list (`models`) or your default set, and get each answer with what paid for it. `get_perspectives` is the older name and still works |
| `list_models` | List the models you can reach and what pays for each |
| `search_x` | Search X (Twitter) with xAI's Grok (needs your own xAI key) |
| `rank_perspectives` | Record which answer helped most; rankings feed the public [leaderboard](https://www.polydev.ai/leaderboard) |
| `generate_image` | Make an image with OpenAI or Google models, such as Nano Banana (local server only) |
| `connect_chatgpt_plan` / `chatgpt_plan_status` | Continue with ChatGPT so your ChatGPT plan pays for OpenAI models (local server only) |
| `login` / `get_auth_status` | Sign in to Polydev in the browser; show what's connected (local server only) |

---

## Add it without installing anything

Polydev is a hosted MCP server. Add this URL to your app and sign in once (OAuth):

```
https://polydev.ai/mcp
```

- **Claude** (web, desktop, mobile): Settings → Connectors → Add custom connector, paste the URL, then Connect.
- **ChatGPT**: add a custom MCP server in the apps settings, paste the URL, choose OAuth.
- **Claude Code**: `claude mcp add --transport http polydev https://polydev.ai/mcp`, then `/mcp` to sign in.
- **Codex**: `codex mcp add polydev --url https://polydev.ai/mcp`, then `codex mcp login polydev`.
- **Cursor, VS Code, Windsurf and others**: one-click links and config at [polydev.ai/install](https://polydev.ai/install).

The hosted server answers with your API keys, your OpenRouter key or the free requests. To also use your ChatGPT plan, the Claude Code or Codex you're signed in to on this machine, and image models, install the local server below. (ChatGPT plan use on the hosted server is waiting on OpenAI's approval.)

---

## Install locally (npm)

You need Node.js 20 or newer and a free Polydev account.

### Claude Code

```sh
claude mcp add polydev -- npx -y polydev-ai@latest
```

### Codex

Add to `~/.codex/config.toml`:

```toml
[mcp_servers.polydev]
command = "npx"
args = ["-y", "polydev-ai@latest"]
tool_timeout_sec = 300
```

Some models take a while to answer, so raise the tool timeout.

### Cursor, Cline, Windsurf

Add to your client's MCP config (for Cursor, `~/.cursor/mcp.json`):

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

### GitHub Copilot in VS Code

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "polydev": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "polydev-ai@latest"]
    }
  }
}
```

### Zed and other MCP clients

Use the same command, `npx -y polydev-ai@latest`, as a stdio server in the client's MCP settings.

---

## Sign in

The hosted server signs you in with OAuth when your app first connects. For the local server, ask your agent to run the Polydev `login` tool. It opens your browser, and once you sign in the token is saved on this machine (in `~/.polydev.env`).

Other ways:

- From a terminal: `npx -p polydev-ai polydev-login`
- Advanced, for machines without a browser: copy a token from [polydev.ai/dashboard/mcp-tokens](https://www.polydev.ai/dashboard/mcp-tokens) and set it in the server's environment:

```json
"env": { "POLYDEV_USER_TOKEN": "pd_your_token_here" }
```

In sandboxes without a browser, pass the token to the `login` tool as `user_token`.

### Continue with ChatGPT (local server)

To let your ChatGPT plan (Plus or Pro) pay for OpenAI models, ask your app to run `connect_chatgpt_plan`, or from a terminal:

```sh
npx polydev-ai chatgpt login     # also: chatgpt status | chatgpt models | chatgpt logout
```

This uses OpenAI's Sign in with ChatGPT. Your tokens stay on this machine in `~/.polydev` (file mode 0600) and never reach Polydev's servers. Usage counts against your plan's limits, which you can set in ChatGPT's usage settings. If you hit the limit, Polydev says so and the answer comes from your API key or the free requests instead.

---

## Usage

Ask your agent in plain words:

```
Have GPT check this migration before I run it on prod.
Ask Gemini and Grok whether Redis or Postgres suits session storage here.
Make a 1200x630 cover for this post with Nano Banana.
```

Or call the tool directly:

```json
{
  "tool": "ask_model",
  "arguments": {
    "model": "gpt-6.1-sol",
    "prompt": "Check this migration for anything that could lock the table: <sql>"
  }
}
```

Include the relevant code, errors and constraints in the prompt. The other model only sees what you send.

---

## Cost: free

Polydev has no plans, tiers or credits, and it charges nothing. The tokens are paid by your own access:

- **Your ChatGPT plan** (local server), through Continue with ChatGPT. See above.
- **Your local CLIs** (local server). Polydev runs the Claude Code (`claude -p`) or Codex you're already signed in to, unmodified and under your own login, with your settings, hooks and MCP servers turned off for that call. Polydev never reads their credentials. These calls count against your own plan's limits. Polydev skips the CLI of the app that called it.
- **Your own API keys.** Add keys for OpenAI, Anthropic, Google, xAI, OpenRouter, Cerebras and others at [polydev.ai/dashboard/models](https://www.polydev.ai/dashboard/models). The provider bills you directly.
- **A one-time free allowance.** Every account gets 10 requests on Polydev's keys, never more than $1 in total, served by each provider's newest low-cost model. `search_x` is not part of it.

Models come from a live catalogue that is updated nightly. See [polydev.ai/docs](https://www.polydev.ai/docs) for the current list.

---

## Privacy

Your prompts go to the model providers you chose. Prompts from connected apps are used only to answer you: never for training, never in datasets, never sold. Prompt and response text is deleted after 30 days. Disconnect an app at any time in [Dashboard → Connected apps](https://www.polydev.ai/dashboard/mcp-tokens). Full policy: [polydev.ai/privacy](https://www.polydev.ai/privacy).

---

## Links

- Website: [polydev.ai](https://www.polydev.ai)
- Setup for every app: [polydev.ai/install](https://polydev.ai/install)
- Documentation and live model list: [polydev.ai/docs](https://www.polydev.ai/docs)
- npm: [polydev-ai](https://www.npmjs.com/package/polydev-ai)
- Support: [support@polydev.ai](mailto:support@polydev.ai)

## License

Apache-2.0.
