# Polydev AI

**Multi-model AI perspectives for your coding agents.**

Get insights from GPT 5.2, Claude Opus 4.5, Gemini 3, and Grok 4.1 — all through one MCP server.

[![npm version](https://img.shields.io/npm/v/polydev-ai.svg)](https://www.npmjs.com/package/polydev-ai)
[![SWE-bench Verified](https://img.shields.io/badge/SWE--bench-74.6%25-brightgreen)](https://polydev.ai/articles/swe-bench-paper)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

---

## Why Polydev?

**Stop copy-pasting between ChatGPT, Claude, and Gemini.** Get all their perspectives in your IDE with one request.

| Metric | Result |
|--------|--------|
| **SWE-bench Verified** | 74.6% Resolve@2 |
| **Cost vs Claude Opus** | 62% lower |
| **Response time** | 10-40 seconds |

> *"Different models have different blind spots. Combining their perspectives eliminates yours."*

---

## 🔑 Key Advantage: Use Your Existing Subscriptions

**Already paying for ChatGPT Plus, Claude Pro, or Gemini Advanced?** Use those subscriptions directly through your CLI tools — no API keys needed.

| Subscription | CLI Tool | How to Use |
|--------------|----------|------------|
| Claude Pro ($20/mo) | Claude Code | `claude login` with your Anthropic account |
| ChatGPT Plus ($20/mo) | Codex CLI | `codex login` with your OpenAI account |
| Gemini Advanced ($20/mo) | Gemini CLI | `gemini login` with your Google account |

**How it works:**
1. Login to your CLI tool with your subscription account (no API keys!)
2. Add Polydev as an MCP server to your CLI
3. Polydev queries models through your authenticated CLI sessions
4. Your subscription quota is used — no extra costs

**No API keys. No double-paying.** Your existing subscriptions just work.

---

## Quick Start

### 1. Get your free API token

**[polydev.ai/dashboard/mcp-tokens](https://polydev.ai/dashboard/mcp-tokens)**

| Tier | Messages/Month | Price |
|------|----------------|-------|
| **Free** | 1,000 | $0 |
| **Pro** | 10,000 | $19/mo |

### 2. Install

```bash
npx polydev-ai@latest
```

---

## Setup

### Claude Code

```bash
claude mcp add polydev -- npx -y polydev-ai@latest
```

Then set your token:
```bash
export POLYDEV_USER_TOKEN="pd_your_token_here"
```

Or add to `~/.claude.json`:

```json
{
  "mcpServers": {
    "polydev": {
      "command": "npx",
      "args": ["-y", "polydev-ai@latest"],
      "env": {
        "POLYDEV_USER_TOKEN": "pd_your_token_here"
      }
    }
  }
}
```

### Cursor / Windsurf / Cline

Add to your MCP config:

```json
{
  "mcpServers": {
    "polydev": {
      "command": "npx",
      "args": ["-y", "polydev-ai@latest"],
      "env": {
        "POLYDEV_USER_TOKEN": "pd_your_token_here"
      }
    }
  }
}
```

### OpenAI Codex CLI

Add to `~/.codex/config.toml`:

```toml
[mcp_servers.polydev]
command = "npx"
args = ["-y", "polydev-ai@latest"]

[mcp_servers.polydev.env]
POLYDEV_USER_TOKEN = "pd_your_token_here"

[mcp_servers.polydev.timeouts]
tool_timeout = 180
session_timeout = 600
```

---

## Usage

Once connected, your agent can call:

```typescript
{
  "tool": "get_perspectives",
  "arguments": {
    "prompt": "How should I refactor this authentication flow?",
    "user_token": "pd_your_token_here"
  }
}
```

Or just mention "polydev" or "perspectives" in your prompt:

```
"Use polydev to debug this infinite loop"
"Get perspectives on: Should I use Redis or PostgreSQL for caching?"
```

Returns structured perspectives from multiple models with reasoning and recommendations.

---

## How It Works

```
Your Agent → Polydev → [GPT 5.2, Claude Opus 4.5, Gemini 3, Grok 4.1] → Synthesized Answer
```

When your AI agent gets stuck, Polydev consults multiple frontier models simultaneously and returns their perspectives. One API call, four expert opinions.

---

## Research

Our approach achieves **74.6% on SWE-bench Verified** (Resolve@2), matching Claude Opus at 62% lower cost.

| Approach | Resolution Rate | Cost/Instance |
|----------|-----------------|---------------|
| Claude Haiku (baseline) | 64.6% | $0.18 |
| + Polydev consultation | 66.6% | $0.24 |
| **Resolve@2 (best of both)** | **74.6%** | $0.37 |
| Claude Opus (reference) | 74.4% | $0.97 |

**[Read the full paper →](https://polydev.ai/articles/swe-bench-paper)**

---

## Links

- **Website:** [polydev.ai](https://polydev.ai)
- **Dashboard:** [polydev.ai/dashboard](https://polydev.ai/dashboard)
- **npm:** [npmjs.com/package/polydev-ai](https://www.npmjs.com/package/polydev-ai)
- **Research:** [SWE-bench Paper](https://polydev.ai/articles/swe-bench-paper)

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<p align="center">
  <b>Built by <a href="https://polydev.ai">Polydev AI</a></b><br>
  <i>Multi-model consultation for better code</i>
</p>
