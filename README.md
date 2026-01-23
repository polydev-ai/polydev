# Polydev AI

**Multi-model AI perspectives for your coding agents.**

Get insights from GPT-5.2, Claude Opus 4.5, Gemini 3 Pro, and Grok 4.1 — all through one MCP server.

---

## Quick Start

```bash
npx polydev-ai@latest
```

## What It Does

When your AI agent gets stuck, Polydev consults multiple frontier models simultaneously and returns their perspectives. One API call, four expert opinions.

```
Your Agent → Polydev → [GPT-5.2, Claude, Gemini, Grok] → Synthesized Answer
```

## Setup

### Claude Code

```bash
claude mcp add polydev-ai -- npx polydev-ai@latest
```

### Cursor / Windsurf / Cline

Add to your MCP config:

```json
{
  "mcpServers": {
    "polydev-ai": {
      "command": "npx",
      "args": ["polydev-ai@latest"]
    }
  }
}
```

## Usage

Once connected, your agent can call:

```
polydev.getPerspectives("How should I refactor this authentication flow?")
```

Returns structured perspectives from multiple models with reasoning and recommendations.

## Why Multi-Model?

Different models have different blind spots. Our [research](https://polydev.ai/articles/swe-bench-paper) shows that consulting multiple models improves success rates by 10%+ on coding benchmarks — at lower cost than using a single frontier model.

---

**[Get Started](https://polydev.ai)** · **[Docs](https://polydev.ai/docs/mcp-integration)** · **[Research](https://polydev.ai/articles/swe-bench-paper)**
