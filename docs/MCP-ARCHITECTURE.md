# MCP Architecture & Configuration Guide

This document describes the Model Context Protocol (MCP) server architecture used across Claude Code, Codex CLI, and other AI coding assistants.

> **See Also:** [MCP-REPLICATION-GUIDE.md](./MCP-REPLICATION-GUIDE.md) for step-by-step instructions to replicate this setup on a new machine.

---

## Table of Contents

1. [Overview](#overview)
2. [Codex CLI Fixes](#codex-cli-fixes)
3. [MCP-Execution Architecture](#mcp-execution-architecture)
4. [Server Configurations](#server-configurations)
5. [Cross-Tool Compatibility](#cross-tool-compatibility)
6. [Troubleshooting](#troubleshooting)

---

## Overview

### What is MCP?

Model Context Protocol (MCP) is a standard for AI assistants to communicate with external tools and services. MCP servers expose capabilities (tools) that AI models can invoke.

### Transport Types

| Type | Description | Use Case |
|------|-------------|----------|
| **stdio** | Process-based, JSON-RPC over stdin/stdout | Local tools, fast startup |
| **HTTP/SSE** | HTTP-based with Server-Sent Events | Remote APIs, cloud services |
| **Streamable HTTP** | HTTP with streaming support | Modern remote MCPs (Vercel, Exa) |

### Our Setup

We maintain MCP configurations in two places:

1. **`mcp-execution/`** - Unified MCP client library for Claude Code
2. **`~/.codex/config.toml`** - Codex CLI configuration (synced from source)

---

## Codex CLI Fixes

### Problem: MCP Startup Failures

Codex CLI has a **short timeout** (~5 seconds) for MCP handshake. This caused failures for:

1. **polydev** - Remote API call for `tools/list` was too slow
2. **vercel** - Missing authentication (401 Unauthorized)
3. **seq_thinking** - Corrupted npx cache

### Solution 1: Polydev Local Wrapper

Created a local stdio wrapper that:
- Returns `tools/list` **instantly** (no network call)
- Forwards actual tool calls to remote API
- Handles async exit properly (waits for pending requests)

**File:** `~/.codex/polydev-stdio-wrapper.js`

```javascript
#!/usr/bin/env node
'use strict';

const SERVER_URL = process.env.POLYDEV_MCP_URL || 'https://www.polydev.ai/api/mcp';
const TOKEN = process.env.POLYDEV_USER_TOKEN;

// Redirect console to stderr (stdout must be JSON-RPC only)
console.log = console.error;
console.info = console.error;

// Local tools definition for INSTANT response (bypasses network latency)
const TOOLS = [
  {
    name: 'get_perspectives',
    description: 'Get multiple AI perspectives on a prompt using Polydev',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'The prompt to get perspectives on' },
        models: { type: 'array', items: { type: 'string' }, description: 'Models to use' }
      },
      required: ['prompt']
    }
  }
];

async function forward(request) {
  const response = await fetch(SERVER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`,
      'User-Agent': 'polydev-stdio-wrapper/1.0.0'
    },
    body: JSON.stringify(request)
  });
  return response.json();
}

function respond(message) {
  process.stdout.write(JSON.stringify(message) + '\n');
}

async function handle(request) {
  const { method, id } = request || {};

  // Handle initialize locally
  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'polydev-stdio', version: '1.0.0' }
      }
    };
  }

  // Return tools/list LOCALLY for instant response (Codex has short timeout)
  if (method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id,
      result: { tools: TOOLS }
    };
  }

  // Forward actual tool calls to remote server
  if (method) {
    return await forward(request);
  }

  return {
    jsonrpc: '2.0',
    id,
    error: { code: -32601, message: 'Method not found' }
  };
}

// Async exit handling - wait for pending requests before exit
let pendingRequests = 0;
let stdinEnded = false;

function checkExit() {
  if (stdinEnded && pendingRequests === 0) {
    process.exit(0);
  }
}

process.stdin.setEncoding('utf8');
let buffer = '';

process.stdin.on('data', async (chunk) => {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';

  for (const line of lines) {
    if (!line.trim()) continue;
    pendingRequests++;
    try {
      const request = JSON.parse(line);
      const response = await handle(request);
      respond(response);
    } catch (err) {
      respond({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32603, message: err.message }
      });
    } finally {
      pendingRequests--;
      checkExit();
    }
  }
});

process.stdin.on('end', () => {
  stdinEnded = true;
  checkExit();
});
```

### Solution 2: Vercel Authentication

Added Bearer token authentication via `mcp-proxy` command args:

```toml
[mcp_servers.vercel]
command = "mcp-proxy"
args = [
  "https://mcp.vercel.com/gvsfans-projects/polydev",
  "--transport", "streamablehttp",
  "-H", "Authorization", "Bearer YOUR_VERCEL_TOKEN"
]
env = {}
```

### Solution 3: Config Sync Architecture

Discovered that `codex-mcp-sync.js` syncs from a source JSON file to `~/.codex/config.toml`.

**Source of Truth:** `/Users/venkat/Documents/Cline/fixed-mcp-config.json`

This file uses Cline/VSCode MCP format (JSON) and gets converted to Codex TOML format automatically.

---

## MCP-Execution Architecture

### Directory Structure

```
mcp-execution/
├── .env                    # API keys and credentials
├── src/
│   ├── index.ts           # Main exports
│   ├── config.ts          # Server configurations
│   ├── client.ts          # Stdio MCP client manager
│   ├── http-client.ts     # HTTP MCP client manager
│   └── servers/           # Individual server wrappers
│       ├── github/
│       ├── supabase/
│       ├── memory/
│       ├── polydev/
│       ├── exa/
│       ├── vercel/
│       ├── stripe/
│       ├── morpho/
│       └── ... (20+ servers)
└── dist/                  # Compiled JavaScript
```

### Design Principles

1. **Unified Interface** - All servers expose `initialize()` and tool-specific methods
2. **Lazy Loading** - Servers only start when first used
3. **Auto-Cleanup** - Connection management handled automatically
4. **Type Safety** - Full TypeScript with proper types

### Usage Example

```typescript
import { exa, supabase, polydev } from '~/mcp-execution/dist/index.js';

// Initialize servers (lazy - only connects when needed)
await Promise.all([
  exa.initialize(),
  supabase.initialize(),
  polydev.initialize()
]);

// Use Exa for web search
const results = await exa.search('React hooks best practices', {
  numResults: 5,
  type: 'deep'
});

// Use Supabase for database
const users = await supabase.executeSQL('SELECT * FROM users LIMIT 10');

// Use Polydev for multi-model perspectives
const perspectives = await polydev.getPerspectives('How should I structure this API?');
```

---

## Server Configurations

### Environment Variables (`.env`)

```bash
# GitHub
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_xxxxx

# Supabase (Primary)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
SUPABASE_ACCESS_TOKEN=sbp_xxxxx
SUPABASE_PROJECT_REF=xxxxx

# Polydev
POLYDEV_USER_TOKEN=pd_xxxxx

# Exa (Web Search)
EXA_API_KEY=xxxxx

# Perplexity
PERPLEXITY_API_KEY=pplx-xxxxx

# Resend (Email)
RESEND_API_KEY=re_xxxxx

# Upstash (Redis)
UPSTASH_EMAIL=your@email.com
UPSTASH_API_KEY=xxxxx

# Stripe
STRIPE_API_KEY=sk_live_xxxxx

# Vercel
VERCEL_ACCESS_TOKEN=xxxxx

# Morpho (Fast Code Edits)
MORPH_API_KEY=sk-xxxxx
```

### Stdio Servers (12)

| Server | Package | Purpose |
|--------|---------|---------|
| `memory` | `@modelcontextprotocol/server-memory` | Knowledge graph storage |
| `supabase` | `@supabase/mcp-server-supabase@latest` | PostgreSQL database |
| `seq_thinking` | `@modelcontextprotocol/server-sequential-thinking` | Step-by-step reasoning |
| `filesystem` | `@modelcontextprotocol/server-filesystem` | File system access |
| `github` | `@modelcontextprotocol/server-github` | GitHub API |
| `git` | `mcp-server-git` (uvx) | Git operations |
| `polydev` | `polydev-ai@latest` | Multi-model AI |
| `perplexity` | Custom build | AI-powered search |
| `context7` | `@upstash/context7-mcp@latest` | Library documentation |
| `deepwiki` | `mcp-deepwiki@latest` | Wikipedia search |
| `upstash` | `@upstash/mcp-server` | Redis cache |
| `resend` | Custom build | Email sending |
| `morpho` | `@morphllm/morphmcp` | Fast code edits (10k+ tokens/sec) |

### HTTP Servers (3)

| Server | URL | Auth Method |
|--------|-----|-------------|
| `exa` | `https://mcp.exa.ai/mcp` | API key in query param |
| `vercel` | `https://mcp.vercel.com` | Bearer token header |
| `stripe` | `https://mcp.stripe.com` | Bearer token header |

### Server Config Types

```typescript
// Stdio server config
interface ServerConfig {
  command: string;      // e.g., "npx", "node", "uvx"
  args: string[];       // Command arguments
  env?: Record<string, string>;  // Environment variables
}

// HTTP server config
interface HTTPServerConfig {
  url: string;
  headers?: Record<string, string>;
}
```

---

## Cross-Tool Compatibility

### Claude Code (mcp-execution)

Uses the `mcp-execution` library directly:

```typescript
import { exa, supabase } from '~/mcp-execution/dist/index.js';
await exa.initialize();
const results = await exa.search('query');
```

### Codex CLI (~/.codex/config.toml)

Uses TOML configuration:

```toml
[mcp_servers.exa]
command = "mcp-proxy"
args = ["https://mcp.exa.ai/mcp?exaApiKey=YOUR_KEY", "--transport", "streamablehttp"]
env = {}

[mcp_servers.polydev]
command = "/opt/homebrew/bin/node"
args = ["/Users/venkat/.codex/polydev-stdio-wrapper.js"]
env = { POLYDEV_USER_TOKEN = "pd_xxxxx" }
```

### Cline/VSCode (fixed-mcp-config.json)

Uses JSON configuration (source of truth for Codex sync):

```json
{
  "mcpServers": {
    "exa": {
      "type": "http",
      "url": "https://mcp.exa.ai/mcp?exaApiKey=YOUR_KEY",
      "headers": {}
    },
    "polydev": {
      "command": "/opt/homebrew/bin/node",
      "args": ["/Users/venkat/.codex/polydev-stdio-wrapper.js"],
      "env": { "POLYDEV_USER_TOKEN": "pd_xxxxx" },
      "transportType": "stdio"
    }
  }
}
```

### Conversion Between Formats

| Feature | JSON (Cline) | TOML (Codex) |
|---------|--------------|--------------|
| HTTP server | `"type": "http"` | Uses `mcp-proxy` command |
| Headers | `"headers": {...}` | `-H key value` in args |
| Env vars | `"env": {...}` | `env = {...}` |
| Transport | `"transportType": "stdio"` | Implicit (command-based) |

---

## Troubleshooting

### Common Issues

#### 1. "Transport closed" on tools/list

**Cause:** MCP server takes too long to respond to `tools/list`.

**Fix:** Create a local wrapper that returns `tools/list` instantly and forwards tool calls to remote.

#### 2. "401 Unauthorized"

**Cause:** Missing or invalid authentication.

**Fix:** Add Bearer token via:
- HTTP: `headers: { "Authorization": "Bearer TOKEN" }`
- mcp-proxy: `-H Authorization "Bearer TOKEN"` in args

#### 3. Config keeps reverting

**Cause:** Sync script overwriting changes.

**Fix:** Edit the SOURCE file instead (`fixed-mcp-config.json`), not the target (`config.toml`).

#### 4. "ENOENT" or corrupted npx cache

**Cause:** npx cache corruption.

**Fix:** Clear the npx cache:
```bash
rm -rf ~/.npm/_npx/*
```

#### 5. Process exits before response

**Cause:** Node.js exits when stdin closes, before async operations complete.

**Fix:** Track pending requests and only exit when all complete:
```javascript
let pendingRequests = 0;
let stdinEnded = false;

function checkExit() {
  if (stdinEnded && pendingRequests === 0) process.exit(0);
}
```

### Debugging Commands

```bash
# Test stdio MCP manually
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}
{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' | \
  POLYDEV_USER_TOKEN="xxx" node ~/.codex/polydev-stdio-wrapper.js

# Test HTTP MCP via mcp-proxy
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' | \
  mcp-proxy "https://mcp.vercel.com/..." --transport streamablehttp -H Authorization "Bearer xxx"

# Check Codex config
cat ~/.codex/config.toml

# Kill stale Codex processes
pkill -9 -f codex

# Clear npx cache
rm -rf ~/.npm/_npx/*
```

---

## File Locations

| File | Purpose |
|------|---------|
| `~/mcp-execution/.env` | API keys for Claude Code |
| `~/mcp-execution/src/config.ts` | Server configurations |
| `~/.codex/config.toml` | Codex CLI config (synced) |
| `~/.codex/polydev-stdio-wrapper.js` | Polydev local wrapper |
| `~/Documents/Cline/fixed-mcp-config.json` | Source for Codex sync |

---

## Adding a New MCP Server

### 1. Add to mcp-execution

**a. Add credentials to `.env`:**
```bash
NEW_SERVICE_API_KEY=xxxxx
```

**b. Add config to `src/config.ts`:**
```typescript
// For stdio server
export const serverConfigs = {
  // ...existing...
  new_service: {
    command: 'npx',
    args: ['-y', '@new/mcp-server'],
    env: {
      API_KEY: process.env.NEW_SERVICE_API_KEY || '',
    },
  },
};

// For HTTP server
export const httpServers = {
  // ...existing...
  new_service: {
    url: 'https://mcp.new-service.com',
    headers: {
      'Authorization': `Bearer ${process.env.NEW_SERVICE_API_KEY}`,
    },
  },
};
```

**c. Create server wrapper `src/servers/new_service/index.ts`:**
```typescript
import { initializeServer, callMCPTool } from '../../client.js';

export async function initialize() {
  await initializeServer('new_service');
}

export async function someMethod(param: string) {
  return callMCPTool('new_service', 'tool_name', { param });
}
```

**d. Export from `src/index.ts`:**
```typescript
export * as newService from './servers/new_service/index.js';
```

### 2. Add to Codex CLI

**Add to `fixed-mcp-config.json`:**
```json
{
  "mcpServers": {
    "new_service": {
      "command": "npx",
      "args": ["-y", "@new/mcp-server"],
      "env": { "API_KEY": "xxxxx" },
      "transportType": "stdio"
    }
  }
}
```

The sync script will automatically update `~/.codex/config.toml`.

---

## Best Practices

1. **Always use local wrappers for slow MCPs** - Codex has short timeouts
2. **Store credentials in `.env`** - Never hardcode API keys
3. **Use mcp-proxy for HTTP servers** - Converts HTTP to stdio for compatibility
4. **Edit source files, not synced files** - Changes will be overwritten
5. **Test MCPs manually before adding** - Use echo + pipe to test JSON-RPC
6. **Handle async exit properly** - Track pending requests before exiting
