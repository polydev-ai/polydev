# Polydev AI

**Advanced Model Context Protocol Platform with Multi-LLM Integrations**

[polydev.ai](https://polydev.ai) | Live Platform

---

## Overview

Polydev AI is an advanced Model Context Protocol (MCP) platform providing comprehensive multi-LLM integrations, subscription-based CLI access, OAuth bridges, and advanced tooling for AI development.

## Features

### 🤖 Comprehensive LLM Integration

- **API-Based Providers**: Direct integration with 8+ providers (Anthropic, OpenAI, Google, etc.)
- **Subscription-Based CLI Access**: Use your existing ChatGPT Plus, Claude Pro, GitHub Copilot subscriptions
- **Unified Interface**: Single API for all providers with consistent streaming responses
- **Auto-Detection**: Automatic CLI tool discovery and path configuration

### 🔧 CLI Provider Support

| Provider | Integration | Authentication |
|----------|-------------|----------------|
| **Codex CLI** | Access GPT-5 with high reasoning | ChatGPT Plus subscription |
| **Claude Code CLI** | Claude via Anthropic | Anthropic Pro subscription |
| **Gemini CLI** | Google Cloud | Google Cloud authentication |
| **GitHub Copilot** | VS Code Language Model API | GitHub Copilot subscription |

### 🛠 Advanced Tooling

- **Model Context Protocol (MCP)**: Hosted MCP server with OAuth authentication
- **Multi-Authentication**: Both OAuth and API token support for maximum flexibility
- **Process Execution**: Cross-platform CLI management with timeout handling
- **Path Auto-Discovery**: Smart detection of CLI installations across Windows, macOS, Linux
- **Real-time Status**: Live CLI availability and authentication checking

### 🔒 Security & Authentication

- **Encrypted Storage**: Browser-based API key encryption using SubtleCrypto API
- **OAuth Bridges**: Secure authentication flows
- **Subscription Auth**: No API costs - use existing subscriptions
- **Local Storage**: Keys never leave your device

### 📊 Monitoring & Analytics

- **PostHog Integration**: Advanced user analytics and feature tracking
- **BetterStack Monitoring**: System health and performance monitoring
- **Upstash Redis**: High-performance caching layer
- **Supabase Auth**: Robust authentication system

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15 (App Router), React 18, TypeScript, Tailwind CSS, shadcn/ui |
| **Backend** | Supabase (PostgreSQL + Auth), Upstash Redis |
| **AI Integration** | Custom TypeScript handlers for 8+ LLM providers |
| **CLI Integration** | Cross-platform process execution utilities |
| **Streaming** | Server-Sent Events for real-time responses |
| **Monitoring** | PostHog Analytics, BetterStack |

## Supported LLM Providers

| Provider | Models | Context Window | Features |
|----------|--------|----------------|----------|
| **Anthropic** | Claude 3.5 Sonnet, Haiku, Opus | 200K tokens | Best for reasoning and code |
| **OpenAI** | GPT-4o, GPT-4 Turbo, GPT-3.5 | 128K tokens | Versatile, widely adopted |
| **Google Gemini** | Gemini 1.5 Pro, Flash | 1M+ tokens | Large context window |
| **OpenRouter** | 100+ models | Varies | Access to multiple providers |
| **Groq** | Open-source models | Varies | Ultra-fast inference |
| **Perplexity** | Search-optimized models | Varies | AI search and reasoning |
| **DeepSeek** | Reasoning models | Varies | Advanced reasoning capabilities |
| **Mistral AI** | European AI models | Varies | Strong performance, EU-based |

## MCP Tools Available

- **Research**: Exa (web search), DeepWiki, Context7
- **Storage**: Supabase, Upstash Redis, Memory (knowledge graph)
- **Development**: GitHub, Git, Filesystem
- **Infrastructure**: Vercel, Stripe
- **AI**: Polydev (multi-model consultation)
- **Communication**: Resend (email)

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend UI   │────│  Process Utils   │────│   CLI Tools     │
│   (React/TS)    │    │  (Node.js)       │    │   (External)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ LLM Service     │    │ CLI Handlers     │    │ Subscriptions   │
│ (Unified API)   │    │ (Per Provider)   │    │ (ChatGPT+, etc) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │
         │                        │
         ▼                        ▼
┌─────────────────┐    ┌──────────────────┐
│   Supabase      │    │   MCP Platform   │
│   (Auth + DB)   │    │   (16+ Tools)    │
└─────────────────┘    └──────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn package manager
- (Optional) CLI tools for subscription-based access:
  - Codex CLI for ChatGPT Plus integration
  - Claude Code CLI for Anthropic Pro integration
  - Gemini CLI for Google Cloud integration
  - VS Code with GitHub Copilot for Copilot integration

### Installation

```bash
# Clone the repository
git clone https://github.com/backspacevenkat/polydev-ai.git
cd polydev-ai

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

Open the application at http://localhost:3000

### Quick Configuration

1. **API Key Setup**: Go to Settings → API Keys tab to configure traditional API access
2. **CLI Setup**: Go to Settings → CLI Subscriptions tab to set up subscription-based access
3. **Provider Selection**: Choose your preferred LLM provider from the dropdown
4. **Test Integration**: Use the chat interface to test your configuration

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# PostHog Analytics
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Upstash Redis
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token

# BetterStack Logging
BETTERSTACK_LOGS_TOKEN=your_betterstack_token
```

## CLI Provider Setup

### Codex CLI (ChatGPT Plus Integration)

```bash
# Install and authenticate
codex auth
codex --version
```

### Claude Code CLI (Anthropic Pro Integration)

```bash
# Install and authenticate
claude login
claude --version
```

### Gemini CLI (Google Cloud Integration)

```bash
# Install Google Cloud SDK and authenticate
gcloud auth login
gcloud auth application-default login
```

### GitHub Copilot Integration

1. Install VS Code with GitHub Copilot extension
2. Sign in with your GitHub account that has Copilot access
3. The application will detect VS Code and Copilot availability automatically

## Development Status

**Current Status**: Active Development

The platform is fully functional for:
- Multi-LLM chat interface with streaming
- API key management with client-side encryption
- CLI subscription integration
- MCP server with 16+ tools
- Real-time streaming responses

## License

MIT

## Links

- **Website**: [polydev.ai](https://polydev.ai)
- **Repository**: [github.com/backspacevenkat/polydev-ai](https://github.com/backspacevenkat/polydev-ai)
