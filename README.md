# Polydev AI

**Modern Multi-LLM MCP Platform with Next.js and Supabase**

[polydev.ai](https://polydev-xi.vercel.app) | Live Demo

---

## Overview

Polydev AI is an advanced Model Context Protocol (MCP) platform providing comprehensive multi-LLM integrations, subscription-based CLI access, OAuth bridges, and advanced tooling for AI development.

## Features

### Multi-LLM Integration
- **8+ API Providers**: Anthropic, OpenAI, Google Gemini, OpenRouter, Groq, Perplexity, DeepSeek, Mistral
- **CLI Subscription Access**: Use existing ChatGPT Plus, Claude Pro, GitHub Copilot subscriptions
- **Unified Interface**: Single API for all providers with consistent streaming responses

### MCP Server Platform
- **Hosted MCP Server**: OAuth-authenticated MCP endpoints
- **16+ Integrated Tools**: Exa search, Supabase, GitHub, Memory, Vercel, Stripe, and more
- **Multi-Model Consultation**: Query multiple AI models simultaneously via Polydev

### Developer Tools
- **Real-time Streaming**: Server-Sent Events for live responses
- **Cross-platform CLI**: Auto-detection and path configuration
- **Encrypted Storage**: Client-side API key encryption

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 18, TypeScript, Tailwind CSS |
| Backend | Supabase (PostgreSQL + Auth), Upstash Redis |
| AI Integration | Custom handlers for 8+ LLM providers |
| Monitoring | PostHog Analytics, BetterStack |
| Deployment | Vercel |

## Quick Start

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

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Analytics & Monitoring
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
BETTERSTACK_LOGS_TOKEN=your_betterstack_token

# Caching
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
```

## Supported LLM Providers

| Provider | Models | Features |
|----------|--------|----------|
| Anthropic | Claude 3.5 Sonnet, Haiku, Opus | 200K context, best for reasoning |
| OpenAI | GPT-4o, GPT-4 Turbo | 128K context, versatile |
| Google | Gemini 1.5 Pro/Flash | 1M+ context |
| OpenRouter | 100+ models | Multi-provider access |
| Groq | Open-source models | Ultra-fast inference |
| Perplexity | Search-optimized | AI search |
| DeepSeek | Reasoning models | Advanced reasoning |
| Mistral | European models | Strong performance |

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Next.js App   │────│   LLM Service    │────│   API Providers │
│   (React/TS)    │    │   (Handlers)     │    │   (8+ LLMs)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │
         │                        │
         ▼                        ▼
┌─────────────────┐    ┌──────────────────┐
│   Supabase      │    │   MCP Platform   │
│   (Auth + DB)   │    │   (16+ Tools)    │
└─────────────────┘    └──────────────────┘
```

## MCP Tools Available

- **Research**: Exa (web search), DeepWiki, Context7
- **Storage**: Supabase, Upstash Redis, Memory (knowledge graph)
- **Development**: GitHub, Git, Filesystem
- **Infrastructure**: Vercel, Stripe
- **AI**: Polydev (multi-model consultation)
- **Communication**: Resend (email)

## Development Status

**Current Status**: Active Development

The platform is fully functional for:
- Multi-LLM chat interface
- API key management with encryption
- MCP server integration
- Real-time streaming responses

## License

MIT

## Links

- **Website**: [polydev.ai](https://polydev-xi.vercel.app)
- **Repository**: [github.com/backspacevenkat/polydev-ai](https://github.com/backspacevenkat/polydev-ai)
