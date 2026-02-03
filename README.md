# Polydev

<p align="center">
  <img src="https://raw.githubusercontent.com/polydev-ai/polydev/main/public/logo.png" alt="Polydev Logo" width="120" />
</p>

<p align="center">
  <strong>Multi-model AI perspectives for your coding agents</strong><br>
  Query GPT-5, Claude, Gemini, and Grok simultaneously through one MCP server
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/polydev-ai"><img src="https://img.shields.io/npm/v/polydev-ai.svg" alt="npm version"></a>
  <a href="https://polydev.ai/articles/swe-bench-paper"><img src="https://img.shields.io/badge/SWE--bench-74.6%25-brightgreen" alt="SWE-bench Verified"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
</p>

---

## 🚀 One-Command Install

### Claude Code
```sh
claude mcp add polydev -- npx -y polydev-ai@latest
```

### Cursor / Windsurf / Cline
```sh
npx polydev-ai@latest
```

### OpenAI Codex CLI
```sh
npx polydev-ai@latest
```

> Get your token at **[polydev.ai/dashboard/mcp-tokens](https://polydev.ai/dashboard/mcp-tokens)**

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

## How It Works

```
Your Agent → Polydev MCP → [GPT-5, Claude, Gemini, Grok] → Synthesized Answer
```

When your AI agent gets stuck, Polydev consults multiple frontier models simultaneously and returns their combined perspectives. One request, four expert opinions.

---

## Quick Start

### Option 1: Use Hosted Service (Recommended)

Get started instantly at **[polydev.ai](https://polydev.ai)**

**Step 1:** Install the MCP server
```sh
npx polydev-ai@latest
```

**Step 2:** Set your token (get it from [polydev.ai/dashboard/mcp-tokens](https://polydev.ai/dashboard/mcp-tokens))
```sh
export POLYDEV_USER_TOKEN="pd_your_token_here"
```

### Option 2: Self-Host with Your Own API Keys

**Step 1:** Clone and install
```sh
git clone https://github.com/polydev-ai/polydev.git
```
```sh
cd polydev && npm install
```

**Step 2:** Configure environment
```sh
cp .env.example .env.local
```

**Step 3:** Add your API keys to `.env.local` and run
```sh
npm run dev
```

---

## IDE Configuration

### Claude Code

**One command:**
```sh
claude mcp add polydev -- npx -y polydev-ai@latest
```

**Or add to `~/.claude.json`:**
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

**Add to your MCP config (usually `~/.cursor/mcp.json` or similar):**
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

**Add to `~/.codex/config.toml`:**
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

```json
{
  "tool": "get_perspectives",
  "arguments": {
    "prompt": "How should I refactor this authentication flow?"
  }
}
```

Or just mention "polydev" or "perspectives" in your prompt:

```
"Use polydev to debug this infinite loop"
"Get perspectives on: Should I use Redis or PostgreSQL for caching?"
```

---

## Use Your Existing CLI Subscriptions

**Already paying for ChatGPT Plus, Claude Pro, or Gemini Advanced?** Use those subscriptions directly through your CLI tools.

| Subscription | CLI Tool | Setup |
|--------------|----------|-------|
| Claude Pro ($20/mo) | Claude Code | `claude login` |
| ChatGPT Plus ($20/mo) | Codex CLI | `codex login` |
| Gemini Advanced ($20/mo) | Gemini CLI | `gemini login` |

Polydev can route requests through your authenticated CLI sessions — your subscription quota is used, no extra API costs.

---

## Self-Hosting

### Requirements

- Node.js 18+
- PostgreSQL (or Supabase)
- API keys for the models you want to use

### Environment Variables

Create a `.env.local` file:

```sh
# Database
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Providers (add the ones you want)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
XAI_API_KEY=...
```

### Database Setup

```sh
cd supabase && supabase db push
```

### Run

```sh
npm run dev
```

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

## Project Structure

```
polydev/
├── src/                    # Next.js application
│   ├── app/               # App router pages & API routes
│   ├── components/        # React components
│   ├── hooks/             # Custom React hooks
│   └── lib/               # Utilities and services
├── mcp/                   # MCP server implementation
├── supabase/              # Database migrations
├── docs/                  # Documentation
└── public/                # Static assets
```

---

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

```sh
# Fork the repository, then:
git clone https://github.com/YOUR_USERNAME/polydev.git
```
```sh
cd polydev && npm install
```
```sh
git checkout -b feature/amazing-feature
```
```sh
git commit -m 'Add amazing feature'
```
```sh
git push origin feature/amazing-feature
```

Then open a Pull Request.

---

## Links

- **Website:** [polydev.ai](https://polydev.ai)
- **Documentation:** [polydev.ai/docs](https://polydev.ai/docs)
- **npm:** [npmjs.com/package/polydev-ai](https://www.npmjs.com/package/polydev-ai)
- **Research:** [SWE-bench Paper](https://polydev.ai/articles/swe-bench-paper)

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<p align="center">
  <b>Built by <a href="https://polydev.ai">Polydev AI</a></b><br>
  <sub>Multi-model consultation for better code</sub>
</p>
