# MCP Environment Replication Guide

This comprehensive guide explains how to replicate the MCP (Model Context Protocol) execution environment used in Claude Code, and how to adapt it for Codex CLI and other AI coding assistants.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [What We Built](#what-we-built)
3. [Step 1: Clone mcp-execution](#step-1-clone-mcp-execution)
4. [Step 2: Configure API Keys](#step-2-configure-api-keys)
5. [Step 3: Claude Code Instructions](#step-3-claude-code-instructions)
6. [Step 4: Codex CLI Setup](#step-4-codex-cli-setup)
7. [Step 5: Cline/VSCode Setup](#step-5-clinevscode-setup)
8. [Architecture Deep Dive](#architecture-deep-dive)
9. [Complete File Templates](#complete-file-templates)

---

## System Overview

### The Problem We Solved

AI coding assistants (Claude Code, Codex CLI, Cline) each have their own MCP configuration formats and limitations:

| Tool | Config Format | Limitations |
|------|---------------|-------------|
| Claude Code | MCP servers via settings | No code execution for MCP tools |
| Codex CLI | TOML (`~/.codex/config.toml`) | Short timeout (~5s), stdio only |
| Cline/VSCode | JSON (`settings.json`) | Different schema |

### Our Solution

We created a **unified MCP execution layer** that:

1. **Wraps all MCP servers** in a consistent TypeScript interface
2. **Executes via code** (not just tool calls) for flexibility
3. **Works across all tools** with adapter configs
4. **Auto-invokes** without asking permission (via CLAUDE.md instructions)

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        AI Assistant                              │
│                 (Claude Code / Codex / Cline)                   │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CLAUDE.md Instructions                      │
│                                                                  │
│  "Auto-invoke MCP servers. Don't ask permission. Just execute." │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                       mcp-execution/                             │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │   exa    │  │ supabase │  │  github  │  │ polydev  │  ...   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
│       │             │             │             │               │
│       ▼             ▼             ▼             ▼               │
│  ┌──────────────────────────────────────────────────────┐       │
│  │              Unified Client Manager                   │       │
│  │         (stdio + HTTP transport handling)            │       │
│  └──────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External MCP Servers                          │
│                                                                  │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐   │
│  │ Exa (HTTP) │ │Supabase(IO)│ │GitHub (IO) │ │Vercel(HTTP)│   │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## What We Built

### 1. mcp-execution Library

A TypeScript library that wraps 20+ MCP servers with:
- Unified `initialize()` / `callTool()` interface
- Automatic connection management
- Type-safe tool invocations
- Support for both stdio and HTTP transports

### 2. CLAUDE.md Instructions

Markdown files that instruct Claude Code to:
- Auto-invoke MCP servers without asking
- Use specific tools for specific tasks
- Execute code to call MCP servers

### 3. Codex CLI Adapters

Local wrappers and configurations that:
- Handle Codex's short timeout constraints
- Convert between config formats
- Provide instant `tools/list` responses

### 4. Config Sync System

Automatic synchronization from:
- Source JSON (Cline format) → Target TOML (Codex format)

---

## Step 1: Clone mcp-execution

### Directory Structure

```bash
# Create the mcp-execution directory
mkdir -p ~/mcp-execution
cd ~/mcp-execution

# Initialize npm project
npm init -y

# Install dependencies
npm install @anthropic-ai/sdk @modelcontextprotocol/sdk dotenv typescript
npm install -D @types/node
```

### Create Source Files

**`src/config.ts`** - Server configurations:

```typescript
import dotenv from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env') });

export interface ServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export const serverConfigs: Record<string, ServerConfig> = {
  memory: {
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory'],
  },
  supabase: {
    command: 'npx',
    args: [
      '-y',
      '@supabase/mcp-server-supabase@latest',
      '--access-token',
      process.env.SUPABASE_ACCESS_TOKEN || '',
      '--project-ref',
      process.env.SUPABASE_PROJECT_REF || '',
    ],
    env: {
      SUPABASE_URL: process.env.SUPABASE_URL || '',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    },
  },
  seq_thinking: {
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
  },
  filesystem: {
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/allowed/directory'],
  },
  github: {
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    env: {
      GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_PERSONAL_ACCESS_TOKEN || '',
    },
  },
  git: {
    command: 'uvx',
    args: ['mcp-server-git'],
  },
  polydev: {
    command: 'npx',
    args: ['-y', 'polydev-ai@latest'],
    env: {
      POLYDEV_USER_TOKEN: process.env.POLYDEV_USER_TOKEN || '',
    },
  },
  context7: {
    command: 'npx',
    args: ['-y', '@upstash/context7-mcp@latest'],
  },
  deepwiki: {
    command: 'npx',
    args: ['-y', 'mcp-deepwiki@latest'],
  },
  upstash: {
    command: 'npx',
    args: [
      '-y',
      '@upstash/mcp-server',
      'run',
      process.env.UPSTASH_EMAIL || '',
      process.env.UPSTASH_API_KEY || '',
    ],
  },
  morpho: {
    command: 'npx',
    args: ['-y', '@morphllm/morphmcp'],
    env: {
      MORPH_API_KEY: process.env.MORPH_API_KEY || '',
      ENABLED_TOOLS: 'edit_file,warpgrep_codebase_search',
      WORKSPACE_MODE: 'true',
    },
  },
};

// HTTP-based servers configuration
export interface HTTPServerConfig {
  url: string;
  headers?: Record<string, string>;
}

export const httpServers: Record<string, HTTPServerConfig> = {
  exa: {
    url: `https://mcp.exa.ai/mcp?exaApiKey=${process.env.EXA_API_KEY}`,
    headers: {
      'Content-Type': 'application/json',
    },
  },
  vercel: {
    url: 'https://mcp.vercel.com',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.VERCEL_ACCESS_TOKEN || ''}`,
    },
  },
  stripe: {
    url: 'https://mcp.stripe.com',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.STRIPE_API_KEY || ''}`,
    },
  },
};
```

**`src/client.ts`** - Stdio MCP client manager:

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { serverConfigs } from './config.js';

class ClientManager {
  private clients: Map<string, Client> = new Map();
  private transports: Map<string, StdioClientTransport> = new Map();

  async getClient(serverName: string): Promise<Client> {
    if (this.clients.has(serverName)) {
      return this.clients.get(serverName)!;
    }

    const config = serverConfigs[serverName];
    if (!config) {
      throw new Error(`Unknown server: ${serverName}`);
    }

    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args,
      env: { ...process.env, ...config.env } as Record<string, string>,
    });

    const client = new Client(
      { name: `mcp-execution-${serverName}`, version: '1.0.0' },
      { capabilities: {} }
    );

    await client.connect(transport);

    this.clients.set(serverName, client);
    this.transports.set(serverName, transport);

    return client;
  }

  async disconnectAll(): Promise<void> {
    for (const [name, client] of this.clients) {
      try {
        await client.close();
      } catch (err) {
        console.error(`Error closing ${name}:`, err);
      }
    }
    this.clients.clear();
    this.transports.clear();
  }
}

const manager = new ClientManager();

export function getClientManager(): ClientManager {
  return manager;
}

export async function initializeServer(serverName: string): Promise<void> {
  await manager.getClient(serverName);
}

export async function callMCPTool(
  serverName: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const client = await manager.getClient(serverName);
  const result = await client.callTool({ name: toolName, arguments: args });
  return result;
}
```

**`src/index.ts`** - Main exports:

```typescript
// Export client functionality
export { getClientManager, initializeServer, callMCPTool } from './client.js';
export { getHTTPClientManager, initializeHTTPServer, callHTTPMCPTool } from './http-client.js';

// Export server configs
export { serverConfigs, httpServers } from './config.js';

// Export all server modules
export * as github from './servers/github/index.js';
export * as git from './servers/git/index.js';
export * as supabase from './servers/supabase/index.js';
export * as memory from './servers/memory/index.js';
export * as polydev from './servers/polydev/index.js';
export * as filesystem from './servers/filesystem/index.js';
export * as seqThinking from './servers/seq_thinking/index.js';
export * as context7 from './servers/context7/index.js';
export * as deepwiki from './servers/deepwiki/index.js';
export * as upstash from './servers/upstash/index.js';
export * as exa from './servers/exa/index.js';
export * as morpho from './servers/morpho/index.js';
export * as vercel from './servers/vercel/index.js';
export * as stripe from './servers/stripe/index.js';
```

**Example server wrapper `src/servers/exa/index.ts`**:

```typescript
import { initializeHTTPServer, callHTTPMCPTool } from '../../http-client.js';

export async function initialize(): Promise<void> {
  await initializeHTTPServer('exa');
}

export async function search(
  query: string,
  options?: { numResults?: number; type?: 'auto' | 'deep' | 'fast'; livecrawl?: string }
): Promise<unknown> {
  return callHTTPMCPTool('exa', 'web_search_exa', {
    query,
    numResults: options?.numResults || 5,
    type: options?.type || 'auto',
    livecrawl: options?.livecrawl || 'preferred',
  });
}

export async function getCodeContext(query: string, maxTokens?: number): Promise<unknown> {
  return callHTTPMCPTool('exa', 'exa-code', {
    query,
    maxTokens: maxTokens || 5000,
  });
}
```

### Build the Project

```bash
# tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src/**/*"]
}
EOF

# Build
npx tsc
```

---

## Step 2: Configure API Keys

Create `~/mcp-execution/.env`:

```bash
# GitHub
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_your_token_here

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
SUPABASE_ACCESS_TOKEN=sbp_your_token
SUPABASE_PROJECT_REF=your_project_ref

# Polydev (Multi-model AI)
POLYDEV_USER_TOKEN=pd_your_token

# Exa (Web Search)
EXA_API_KEY=your_exa_key

# Perplexity
PERPLEXITY_API_KEY=pplx-your_key

# Resend (Email)
RESEND_API_KEY=re_your_key

# Upstash (Redis)
UPSTASH_EMAIL=your@email.com
UPSTASH_API_KEY=your_upstash_key

# Stripe
STRIPE_API_KEY=sk_live_your_key

# Vercel
VERCEL_ACCESS_TOKEN=your_vercel_token

# Morpho (Fast Code Edits)
MORPH_API_KEY=sk-your_morpho_key
```

---

## Step 3: Claude Code Instructions

Claude Code uses CLAUDE.md files to customize behavior. We use three levels:

### Level 1: Global Instructions (`~/.claude/CLAUDE.md`)

These apply to ALL Claude Code sessions:

```markdown
# Claude Code Global Instructions

## Morpho Tools - MANDATORY USAGE

### File Editing - edit_file (REQUIRED)
**ALWAYS use `edit_file` instead of:**
- Built-in `Edit` tool
- `str_replace`
- Full file writes/rewrites

`edit_file` handles indentation and fuzzy matching automatically. It's faster and produces fewer errors.

Example:
```
edit_file(
  target_file="/path/to/file.ts",
  code_edit="function oldName() → function newName()",
  instructions="Rename the function"
)
```

### Code Search - warpgrep_codebase_search (REQUIRED)
**ALWAYS use `warpgrep_codebase_search` instead of:**
- Built-in `Grep` tool
- `rg` or `grep` commands
- Native codebase search

WarpGrep is 20x faster and provides semantic understanding.

## Tool Hierarchy (STRICT)

| Task | USE THIS | NOT THIS |
|------|----------|----------|
| Code search | `warpgrep_codebase_search` | `Grep`, `rg`, native search |
| File editing | `edit_file` | `Edit`, `str_replace`, file writes |
| Web research | `exa_search` | `WebSearch` |
| Multi-model analysis | `polydev_perspectives` | - |
| Database queries | `supabase_execute_sql` | - |
| Git operations | `git_status`, `git_commit` | bash git commands |

## MCP Tools Auto-Invocation

The following MCP tools should be used **automatically without asking**:

- `warpgrep_codebase_search` - For ALL code exploration and search
- `edit_file` - For ALL file modifications
- `exa_search` - For web research and documentation lookup
- `polydev_perspectives` - When stuck or need multi-model analysis
- `supabase_execute_sql` - For database operations
- `git_*` tools - For version control operations
```

### Level 2: Project Root Instructions (`~/CLAUDE.md`)

These apply to projects under your home directory:

```markdown
# Claude Code Configuration

## MANDATORY: MCP Tool Usage

### Code Search - ALWAYS Use Morpho WarpGrep
**DO NOT USE the built-in `Grep` tool. It is BLOCKED by hooks.**
**ALWAYS use `warpgrep_codebase_search` for ALL code searches.**

### Code Editing - ALWAYS Use Morpho edit_file
**DO NOT USE the built-in `Edit` tool or `str_replace`.**
**ALWAYS use `edit_file` for ALL file modifications.**

## BLOCKED Built-in Tools

The following built-in tools are BLOCKED and should NEVER be used:
- `Grep` - Use `warpgrep_codebase_search` instead
- `Edit` - Use `edit_file` instead
- `str_replace` - Use `edit_file` instead

## MCP Servers Available

1. **morph-mcp** (Morpho) - `edit_file`, `warpgrep_codebase_search`
2. **mcp-execution** - All other MCPs (Exa, Supabase, Git, GitHub, Vercel, Stripe, Upstash, etc.)
```

### Level 3: Project-Specific Instructions (`/project/.claude/CLAUDE.md`)

These contain the full auto-invocation protocol:

```markdown
# AUTO-CONSULTATION PROTOCOL

## CRITICAL: Use Polydev & Exa Automatically

**You MUST automatically invoke Polydev and Exa whenever needed - DO NOT ASK PERMISSION.**

## When to Auto-Invoke Polydev (Multi-Model AI Consultation)

**Automatically write code to use Polydev whenever you:**
- Hit an error or unexpected behavior
- Need to debug or troubleshoot
- Are choosing between approaches
- Want validation before implementing
- Encounter unfamiliar territory
- Face any uncertainty or complexity
- Need architecture or design decisions
- Want expert perspectives on implementation

**DO NOT ask "should I consult Polydev?" - JUST DO IT automatically.**

## How to Invoke Polydev

**Write and execute this code automatically:**

```javascript
import { polydev } from '~/mcp-execution/dist/index.js';

await polydev.initialize();

const perspectives = await polydev.getPerspectives(
  "Your detailed question with full context here"
);

console.log('🤖 Expert Perspectives:', perspectives);
```

## When to Auto-Invoke Exa (Research & Documentation)

**Automatically write code to use Exa whenever you:**
- Need recent information or current best practices
- Want to find code examples or documentation
- Are researching a technology or library
- Need to verify information or look up APIs

**DO NOT ask "should I search for this?" - JUST DO IT automatically.**

## How to Invoke Exa

```javascript
import { exa } from '~/mcp-execution/dist/index.js';

await exa.initialize();

// Web search with live results
const results = await exa.search('your search query', {
  numResults: 5,
  type: 'deep',
  livecrawl: 'preferred'
});

console.log('🔍 Research Results:', results.content[0].text);
```

## Multi-Server Workflows

Combine multiple servers for complex tasks:

```javascript
import { github, supabase, exa } from '~/mcp-execution/dist/index.js';

// Initialize all at once
await Promise.all([
  github.initialize(),
  supabase.initialize(),
  exa.initialize()
]);

// 1. Search GitHub
const repos = await github.searchRepositories('firecracker VM');

// 2. Get additional context from web
const context = await exa.search(`${repos[0].name} best practices`);

// 3. Store results
await supabase.executeSQL(`
  INSERT INTO research (repo, context, created_at)
  VALUES ($1, $2, NOW())
`, [repos[0].html_url, JSON.stringify(context)]);

console.log('✅ Research complete and stored');
```

## Available MCP Servers

### 🔍 Research & Search
- **Exa** - Web search + code documentation
- **GitHub** - Repository search, issues, PRs
- **DeepWiki** - Wikipedia search
- **Context7** - Library documentation (React, Next.js, etc)

### 💾 Data & Storage
- **Supabase** - PostgreSQL database
- **Memory** - Knowledge graph for relationships
- **Upstash** - Redis for caching

### 📁 Files & Code
- **Filesystem** - Read/write files
- **Git** - Git operations
- **Morpho** - Fast code edits (10k+ tokens/sec)

### 🤖 AI & Communication
- **Polydev** - Multi-model AI perspectives
- **Resend** - Send emails

### ☁️ Infrastructure
- **Vercel** - Deploy and manage Vercel projects
- **Stripe** - Payment and subscription management

## General Rule

**If you CAN do something with an MCP server, DO IT automatically.** Don't ask permission - just execute and report results.
```

---

## Step 4: Codex CLI Setup

Codex CLI uses TOML configuration and has a short MCP handshake timeout.

### Create the Polydev Local Wrapper

**File:** `~/.codex/polydev-stdio-wrapper.js`

```javascript
#!/usr/bin/env node
'use strict';

// Minimal MCP stdio wrapper that forwards requests to Polydev's remote MCP server.
const SERVER_URL = process.env.POLYDEV_MCP_URL || 'https://www.polydev.ai/api/mcp';
const TOKEN = process.env.POLYDEV_USER_TOKEN;

// Ensure stdout stays JSON-RPC only.
console.log = console.error;
console.info = console.error;
console.warn = console.error;
console.debug = console.error;

if (!TOKEN) {
  console.error('POLYDEV_USER_TOKEN environment variable is required');
  process.exit(1);
}

async function forward(request) {
  const response = await fetch(SERVER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`,
      'User-Agent': 'polydev-stdio-min-wrapper/1.0.0'
    },
    body: JSON.stringify(request)
  });

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (err) {
    throw new Error(`Invalid JSON from server: ${text.slice(0, 200)}`);
  }

  if (!response.ok) {
    throw new Error(`Remote MCP error ${response.status}: ${text.slice(0, 200)}`);
  }

  return json;
}

function respond(message) {
  process.stdout.write(JSON.stringify(message) + '\n');
}

// Local tools definition for instant response (Codex has short timeout)
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

async function handle(request) {
  const { method, id } = request || {};

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

  // Return tools/list locally for instant response (Codex has short timeout)
  if (method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id,
      result: { tools: TOOLS }
    };
  }

  // Forward tool calls to the remote server
  if (method) {
    return await forward(request);
  }

  return {
    jsonrpc: '2.0',
    id,
    error: { code: -32601, message: 'Method not found' }
  };
}

process.stdin.setEncoding('utf8');
let buffer = '';
let pendingRequests = 0;
let stdinEnded = false;

function checkExit() {
  if (stdinEnded && pendingRequests === 0) {
    process.exit(0);
  }
}

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

### Create Codex Config

**File:** `~/.codex/config.toml`

```toml
####################################
# Projects trust
####################################
[projects."/Users/YOUR_USERNAME/Documents"]
trust_level = "trusted"

####################################
# MCP servers
####################################

[mcp_servers.exa]
command = "mcp-proxy"
args = ["https://mcp.exa.ai/mcp?exaApiKey=YOUR_EXA_KEY", "--transport", "streamablehttp"]
env = {}

[mcp_servers.memory]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-memory"]
env = {}

[mcp_servers.supabase]
command = "npx"
args = ["-y", "@supabase/mcp-server-supabase@latest", "--access-token", "YOUR_SUPABASE_TOKEN", "--project-ref", "YOUR_PROJECT_REF"]
env = { SUPABASE_URL = "https://YOUR_PROJECT.supabase.co", SUPABASE_ANON_KEY = "YOUR_ANON_KEY", SUPABASE_SERVICE_ROLE_KEY = "YOUR_SERVICE_ROLE_KEY" }

[mcp_servers.seq_thinking]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-sequential-thinking"]
env = {}

[mcp_servers.filesystem]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-filesystem", "/Users/YOUR_USERNAME/allowed-directory"]
env = {}

[mcp_servers.github]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-github"]
env = { GITHUB_PERSONAL_ACCESS_TOKEN = "YOUR_GITHUB_TOKEN" }

[mcp_servers.vercel]
command = "mcp-proxy"
args = ["https://mcp.vercel.com/YOUR_TEAM/YOUR_PROJECT", "--transport", "streamablehttp", "-H", "Authorization", "Bearer YOUR_VERCEL_TOKEN"]
env = {}

[mcp_servers.polydev]
command = "/opt/homebrew/bin/node"
args = ["/Users/YOUR_USERNAME/.codex/polydev-stdio-wrapper.js"]
env = { POLYDEV_USER_TOKEN = "YOUR_POLYDEV_TOKEN" }
```

### Install mcp-proxy

```bash
pip install mcp-proxy
```

---

## Step 5: Cline/VSCode Setup

Cline uses JSON configuration.

**File:** `~/Documents/Cline/fixed-mcp-config.json` (or VSCode settings)

```json
{
  "mcpServers": {
    "exa": {
      "type": "http",
      "url": "https://mcp.exa.ai/mcp?exaApiKey=YOUR_EXA_KEY",
      "headers": {}
    },
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"],
      "env": {},
      "transportType": "stdio"
    },
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--access-token",
        "YOUR_SUPABASE_TOKEN",
        "--project-ref",
        "YOUR_PROJECT_REF"
      ],
      "env": {
        "SUPABASE_URL": "https://YOUR_PROJECT.supabase.co",
        "SUPABASE_ANON_KEY": "YOUR_ANON_KEY",
        "SUPABASE_SERVICE_ROLE_KEY": "YOUR_SERVICE_ROLE_KEY"
      },
      "transportType": "stdio"
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "YOUR_GITHUB_TOKEN"
      },
      "transportType": "stdio"
    },
    "vercel": {
      "command": "mcp-proxy",
      "args": [
        "https://mcp.vercel.com/YOUR_TEAM/YOUR_PROJECT",
        "--transport",
        "streamablehttp",
        "-H",
        "Authorization",
        "Bearer YOUR_VERCEL_TOKEN"
      ],
      "env": {},
      "transportType": "stdio"
    },
    "polydev": {
      "command": "/opt/homebrew/bin/node",
      "args": ["/Users/YOUR_USERNAME/.codex/polydev-stdio-wrapper.js"],
      "env": {
        "POLYDEV_USER_TOKEN": "YOUR_POLYDEV_TOKEN"
      },
      "transportType": "stdio"
    }
  }
}
```

---

## Architecture Deep Dive

### Why Code Execution Instead of Tool Calls?

| Approach | Pros | Cons |
|----------|------|------|
| **Native MCP Tools** | Simple, built-in | Limited flexibility, no chaining |
| **Code Execution** | Full control, can chain, can parallelize | Requires CLAUDE.md instructions |

We chose code execution because:
1. Can initialize multiple servers in parallel
2. Can chain tool calls (search → process → store)
3. Can handle errors gracefully
4. Works across all AI assistants

### The Auto-Invocation Pattern

```javascript
// Instead of asking "Should I search?"
// Claude Code just does it:

import { exa, polydev } from '~/mcp-execution/dist/index.js';

// Parallel initialization
await Promise.all([exa.initialize(), polydev.initialize()]);

// Execute and report
const results = await exa.search('React hooks best practices');
console.log('Found:', results);
```

### Transport Handling

```
┌─────────────────────────────────────────────────┐
│                 mcp-execution                    │
├─────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────────┐  │
│  │  StdioClient    │  │    HTTPClient       │  │
│  │                 │  │                     │  │
│  │  • Spawns npx   │  │  • POST to URL      │  │
│  │  • JSON-RPC     │  │  • Bearer auth      │  │
│  │  • stdin/stdout │  │  • SSE for streams  │  │
│  └────────┬────────┘  └──────────┬──────────┘  │
│           │                      │              │
│           ▼                      ▼              │
│  ┌─────────────────────────────────────────┐   │
│  │          Unified callMCPTool()           │   │
│  │                                          │   │
│  │  callMCPTool('github', 'search', {...}) │   │
│  │  callMCPTool('exa', 'web_search', {...})│   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

---

## Complete File Templates

### Quick Copy-Paste Setup

**1. Create directories:**
```bash
mkdir -p ~/mcp-execution/src/servers/{exa,github,supabase,polydev,memory}
mkdir -p ~/.codex
mkdir -p ~/.claude
```

**2. Download/create all files** (see sections above)

**3. Install dependencies:**
```bash
cd ~/mcp-execution && npm install
pip install mcp-proxy
```

**4. Build:**
```bash
cd ~/mcp-execution && npx tsc
```

**5. Test:**
```bash
# Test polydev wrapper
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | \
  POLYDEV_USER_TOKEN="your_token" node ~/.codex/polydev-stdio-wrapper.js

# Test mcp-execution
node -e "import('~/mcp-execution/dist/index.js').then(m => m.exa.initialize().then(() => console.log('OK')))"
```

---

## Checklist for New Machine Setup

- [ ] Clone/create `~/mcp-execution/` directory
- [ ] Create `.env` with all API keys
- [ ] Install dependencies (`npm install`)
- [ ] Build TypeScript (`npx tsc`)
- [ ] Create `~/.claude/CLAUDE.md` (global instructions)
- [ ] Create `~/CLAUDE.md` (root instructions)
- [ ] Create project-specific `.claude/CLAUDE.md` files
- [ ] Create `~/.codex/polydev-stdio-wrapper.js`
- [ ] Create `~/.codex/config.toml`
- [ ] Install `mcp-proxy` (`pip install mcp-proxy`)
- [ ] Test each MCP server individually
- [ ] Test full workflow in Claude Code
- [ ] Test Codex CLI MCP startup

---

## Troubleshooting

See [MCP-ARCHITECTURE.md](./MCP-ARCHITECTURE.md#troubleshooting) for common issues and solutions.
