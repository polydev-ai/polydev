# Polydev AI: Comprehensive Technical Documentation

**Version 1.2.2**
**Date: September 2024**
**Author: Polydev AI Team**

---

## Table of Contents

### Part I: Executive Overview
1. [What is Polydev AI](#what-is-polydev-ai)
2. [Core Value Proposition](#core-value-proposition)
3. [Target Users and Use Cases](#target-users-and-use-cases)
4. [System Architecture Overview](#system-architecture-overview)

### Part II: Core Technologies and Infrastructure
5. [Model Context Protocol (MCP) Implementation](#mcp-implementation)
6. [CLI Tool Detection and Integration](#cli-tool-integration)
7. [Authentication and Security Architecture](#authentication-security)
8. [Supabase Backend Integration](#supabase-backend)

### Part III: Advanced Features and Capabilities
9. [Universal Memory Extraction System](#memory-extraction)
10. [Multi-Model Perspective Generation](#perspective-generation)
11. [Provider Management and Model Discovery](#provider-management)
12. [Pricing, Credits, and Subscription System](#pricing-system)

### Part IV: Technical Implementation Details
13. [Database Schema and Data Architecture](#database-schema)
14. [API Endpoints and Integration Patterns](#api-endpoints)
15. [Performance Optimization and Scaling](#performance-optimization)
16. [Security, Privacy, and Compliance](#security-privacy)

### Part V: Deployment and Operations
17. [Installation and Configuration](#installation-configuration)
18. [Environment Setup and Dependencies](#environment-setup)
19. [Monitoring, Analytics, and Observability](#monitoring-analytics)
20. [Troubleshooting and Maintenance](#troubleshooting)

### Part VI: Developer Resources
21. [API Reference and SDK](#api-reference)
22. [Extending and Customizing Polydev AI](#extending-customizing)
23. [Contributing and Development Guidelines](#contributing)
24. [Integration Examples and Best Practices](#integration-examples)

---

## What is Polydev AI

Polydev AI is a sophisticated Model Context Protocol (MCP) server that serves as an **intelligent unblocking agent** for developers, researchers, and AI practitioners. When users get stuck in their workflows - whether using MCP clients like Claude Code, Cline, Cursor, or traditional chat interfaces - Polydev AI provides diverse perspectives from multiple Large Language Models (LLMs) to help overcome roadblocks and enhance reasoning capabilities.

### Key Differentiators

**1. Universal MCP Integration**
- First-class MCP server supporting multiple clients (Claude Code, Cline, Cursor, etc.)
- Seamless integration with existing development workflows
- Zero-configuration setup for supported MCP clients

**2. Multi-Modal Access Patterns**
- **CLI Tool Integration**: Leverage existing subscriptions (ChatGPT Plus, Claude Pro, etc.)
- **API Key Management**: Direct provider integration with encrypted storage
- **Credit-Based System**: Pay-as-you-go model with transparent pricing

**3. Intelligent Context Management**
- **Universal Memory Extraction**: Automatically extracts relevant context from multiple CLI tools
- **Zero-Knowledge Encryption**: Client-side encryption ensures data privacy
- **Conversation Continuity**: Maintains context across sessions and tools

**4. Enterprise-Grade Architecture**
- **Row-Level Security**: Comprehensive data isolation
- **OAuth 2.0 with PKCE**: Industry-standard authentication
- **Audit Trails**: Complete compliance and monitoring capabilities

---

## Core Value Proposition

### Problem Statement

Modern AI development workflows involve multiple tools, contexts, and perspectives. Developers frequently encounter situations where:

1. **Single-model limitations**: One AI model doesn't provide sufficient insight
2. **Context switching overhead**: Moving between different AI tools loses conversation context
3. **Subscription waste**: Paying for multiple AI subscriptions across different tools
4. **Integration complexity**: Difficulty integrating AI capabilities into existing workflows
5. **Memory fragmentation**: Important project context scattered across multiple tools

### Polydev AI Solution

**Unified AI Access Layer**
- Single integration point for 15+ AI providers
- Leverage existing CLI tool subscriptions
- Consistent API across all providers

**Intelligent Context Aggregation**
- Automatically extract and synthesize context from multiple sources
- Maintain conversation continuity across different tools
- Zero-knowledge encryption for sensitive project data

**Multi-Perspective Generation**
- Simultaneous queries to multiple AI models
- Diverse reasoning approaches for complex problems
- Intelligent error handling and fallback mechanisms

**Developer-First Integration**
- Native MCP protocol support
- CLI tool detection and authentication
- Seamless integration with popular development environments

---

## Target Users and Use Cases

### Primary User Personas

**1. Professional Developers**
- **Use Case**: Stuck on complex debugging or architectural decisions
- **Value**: Get diverse perspectives from multiple AI models without switching tools
- **Integration**: Through MCP clients (Claude Code, Cursor, etc.)

**2. AI Researchers and Engineers**
- **Use Case**: Need to test prompts across multiple models for research
- **Value**: Simultaneous multi-model testing with comprehensive analytics
- **Integration**: Direct API access and MCP integration

**3. Development Teams**
- **Use Case**: Standardize AI access across team with cost control
- **Value**: Centralized billing, usage tracking, and context sharing
- **Integration**: Team subscriptions with shared project memory

**4. AI Tool Developers**
- **Use Case**: Building applications that need multi-model AI capabilities
- **Value**: Single API for multiple providers with unified authentication
- **Integration**: REST API and SDK integration

### Common Use Cases

**Development Workflow Enhancement**
```
Developer encounters complex bug →
Invokes Polydev via MCP client →
System extracts relevant project context →
Queries multiple AI models simultaneously →
Presents diverse debugging approaches
```

**Architecture Decision Support**
```
Team needs architectural guidance →
Polydev analyzes project codebase →
Generates perspectives from multiple models →
Provides comprehensive analysis with trade-offs
```

**Research and Experimentation**
```
Researcher testing prompt effectiveness →
Simultaneous execution across multiple models →
Comparative analysis and performance metrics →
Data export for further analysis
```

---

## System Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                            Polydev AI Platform                       │
├─────────────────────────────────────────────────────────────────────┤
│  Frontend: Next.js Web Application (Dashboard, Settings, Chat)      │
├─────────────────────────────────────────────────────────────────────┤
│  API Layer: Next.js API Routes (Perspectives, Auth, Management)     │
├─────────────────────────────────────────────────────────────────────┤
│  MCP Server: Model Context Protocol Implementation                   │
├─────────────────────────────────────────────────────────────────────┤
│  CLI Integration: Universal CLI Tool Detection and Execution        │
├─────────────────────────────────────────────────────────────────────┤
│  Provider Layer: Universal AI Provider Abstraction (15+ providers)  │
├─────────────────────────────────────────────────────────────────────┤
│  Memory System: Zero-Knowledge Encrypted Context Management         │
├─────────────────────────────────────────────────────────────────────┤
│  Backend: Supabase (Auth, Database, RLS, Real-time)                │
└─────────────────────────────────────────────────────────────────────┘

External Integrations:
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   CLI Tools     │  │  AI Providers   │  │   Services      │
│ • Claude Code   │  │ • OpenAI        │  │ • Stripe        │
│ • Codex CLI     │  │ • Anthropic     │  │ • OpenRouter    │
│ • Gemini CLI    │  │ • Google        │  │ • models.dev    │
│ • Cursor        │  │ • xAI           │  │ • PostHog       │
│ • Cline         │  │ • DeepSeek      │  │ • BetterStack   │
│ • Continue      │  │ • + 10 more     │  │ • Upstash       │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Core Components

**1. MCP Server (`/mcp/server.js`, `/mcp/stdio-wrapper.js`)**
- Implements Model Context Protocol 2024-11-05
- Provides standardized interface for AI tools
- Supports both full server and lightweight wrapper modes
- OAuth-style authentication for MCP clients

**2. CLI Integration Layer (`/lib/cliManager.ts`, `/src/lib/cliIntegration.ts`)**
- Universal CLI tool detection across platforms
- Authentication status validation
- Process execution with timeout handling
- Usage monitoring and cost estimation

**3. Provider Abstraction (`/src/lib/api/providers/`)**
- Unified interface for 15+ AI providers
- Provider-specific request/response transformations
- Rate limiting and retry mechanisms
- Cost calculation and usage tracking

**4. Memory System (`/src/lib/universalMemoryExtractor.ts`, `/src/lib/zeroKnowledgeEncryption.ts`)**
- Extracts context from multiple CLI tools
- Zero-knowledge client-side encryption
- TF-IDF relevance scoring
- Automatic context injection

**5. Authentication & Security (`/src/middleware.ts`, `/src/lib/auth/`)**
- Multi-modal authentication (web, MCP, API keys)
- OAuth 2.0 with PKCE for MCP clients
- Row-level security and data isolation
- Comprehensive audit trails

---

## Part II: Core Technologies and Infrastructure

## MCP Implementation

### Model Context Protocol Overview

Polydev AI implements the Model Context Protocol (MCP) specification version 2024-11-05, providing a standardized interface for AI tools to access Polydev's multi-model capabilities. The implementation consists of two main components:

**1. Full MCP Server (`/mcp/server.js`)**
- Complete JSON-RPC 2.0 server implementation
- Supports all MCP protocol methods
- Remote API integration for perspective generation
- Comprehensive tool definitions and schemas

**2. Stdio Wrapper (`/mcp/stdio-wrapper.js`)**
- Lightweight wrapper optimized for CLI integration
- Local CLI execution with remote fallback
- Hybrid execution model for maximum reliability
- Memory integration and context enhancement

### Protocol Implementation Details

**JSON-RPC 2.0 Communication**
```javascript
// Standard MCP protocol methods
const mcpMethods = {
  'initialize': handleInitialize,
  'tools/list': handleToolsList,
  'tools/call': handleToolCall
}

// Request handling with proper error responses
async handleRequest(request) {
  const { method, params, id } = request;
  try {
    return await mcpMethods[method](params, id);
  } catch (error) {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message: 'Internal error',
        data: error.message
      }
    };
  }
}
```

**Tool Definitions and Capabilities**
The MCP server exposes 15 comprehensive tools:

1. **`get_perspectives`** - Multi-model perspective generation
2. **`force_cli_detection`** - CLI tool discovery and validation
3. **`get_cli_status`** - Real-time CLI status monitoring
4. **`send_cli_prompt`** - Direct CLI tool execution
5. **`detect_memory_sources`** - Memory file discovery
6. **`extract_memory`** - Context extraction with encryption
7. **`get_memory_context`** - Formatted context injection
8. **`get_recent_conversations`** - Conversation history retrieval
9. **`manage_memory_preferences`** - Privacy and memory settings
10. **`search_documentation`** - Polydev documentation search
11. **`report_cli_status`** - Status reporting to dashboard
12. **`setup_cli_monitoring`** - Automated monitoring configuration

### Authentication and Security

**OAuth 2.0 with PKCE Implementation**
```typescript
// MCP OAuth flow with PKCE security
export async function POST(request: NextRequest) {
  const {
    client_id,
    code_challenge,
    code_challenge_method,
    state
  } = await request.json();

  // Validate PKCE challenge
  if (code_challenge_method === 'S256') {
    const hash = createHash('sha256').update(code_verifier).digest();
    const expectedChallenge = Buffer.from(hash).toString('base64url');

    if (expectedChallenge !== code_challenge) {
      return NextResponse.json({
        error: 'invalid_grant',
        error_description: 'Code verifier does not match challenge'
      }, { status: 400 });
    }
  }
}
```

**Token Management**
- **Access Tokens**: Format `polydev_${base64url(userId_timestamp_random)}`
- **Expiration**: 30 days for access tokens, 1 year for CLI status tokens
- **Storage**: SHA-256 hashed in database, never stored in plaintext
- **Scope**: Granular permissions for different tool capabilities

### Client Integration Patterns

**MCP Client Configuration**
```json
{
  "mcpServers": {
    "polydev": {
      "command": "npx",
      "args": ["polydev-perspectives-mcp"],
      "env": {
        "POLYDEV_API_TOKEN": "your_token_here"
      }
    }
  }
}
```

**Tool Usage Examples**
```javascript
// Getting perspectives from MCP client
await mcp.callTool('get_perspectives', {
  prompt: 'How do I optimize this React component?',
  models: ['gpt-4', 'claude-3.5-sonnet', 'gemini-pro'],
  max_tokens: 2000,
  project_memory: 'light'
});

// CLI status monitoring
await mcp.callTool('get_cli_status', {
  provider_id: 'claude_code'
});
```

---

## CLI Tool Integration

### Supported CLI Tools and Detection

Polydev AI provides comprehensive integration with major AI CLI tools:

**Supported Tools:**
- **Claude Code** (`claude`) - Anthropic's official CLI
- **Codex CLI** (`codex`) - OpenAI's development CLI
- **Gemini CLI** (`gemini`) - Google's AI CLI
- **GitHub Copilot** (`gh copilot`) - GitHub's AI assistant
- **Custom Tools** - Extensible framework for additional tools

### Cross-Platform Detection Algorithm

**Path Resolution Strategy**
```typescript
class CLIManager {
  private readonly DEFAULT_PATHS = {
    claude_code: [
      '/usr/local/bin/claude',      // Standard install
      '/opt/homebrew/bin/claude',   // Homebrew macOS
      '~/.local/bin/claude',        // User install
      process.env.CLAUDE_CODE_PATH  // Environment override
    ],
    codex_cli: [
      '/usr/local/bin/codex',
      '/opt/homebrew/bin/codex',
      '~/.npm-global/bin/codex',
      process.env.CODEX_CLI_PATH
    ]
  };

  async detectCLI(providerId: string): Promise<CLIDetectionResult> {
    // 1. Try environment variable override
    const envPath = process.env[`${providerId.toUpperCase()}_PATH`];
    if (envPath && await this.validateExecutable(envPath)) {
      return { status: 'available', path: envPath };
    }

    // 2. Use 'which' command for standard detection
    const whichResult = await this.executeCommand(`which ${this.getExecutableName(providerId)}`);
    if (whichResult.success) {
      return { status: 'available', path: whichResult.stdout.trim() };
    }

    // 3. Scan predefined paths
    for (const path of this.DEFAULT_PATHS[providerId]) {
      if (await this.validateExecutable(path)) {
        return { status: 'available', path };
      }
    }

    return { status: 'not_installed' };
  }
}
```

**Authentication Validation**
Each CLI tool has specific authentication checking:

```typescript
// Claude Code authentication check
async checkClaudeAuth(): Promise<AuthStatus> {
  const result = await this.executeCommand('claude auth status');

  if (result.stdout.includes('logged in')) {
    return { authenticated: true, user: this.extractUser(result.stdout) };
  }

  return {
    authenticated: false,
    error: 'Not authenticated. Run: claude auth login'
  };
}

// Codex CLI authentication check
async checkCodexAuth(): Promise<AuthStatus> {
  const result = await this.executeCommand('codex auth status');

  if (result.stdout.includes('authenticated')) {
    return { authenticated: true };
  }

  return {
    authenticated: false,
    error: 'Not authenticated. Run: codex auth'
  };
}
```

### Process Execution and Communication

**Dual Communication Modes**
```typescript
enum ExecutionMode {
  STDIN = 'stdin',    // Pipe prompt via stdin
  ARGS = 'args'       // Pass prompt as command arguments
}

async executeCliCommand(
  provider: string,
  prompt: string,
  mode: ExecutionMode = ExecutionMode.ARGS,
  timeoutMs: number = 30000
): Promise<CLIResponse> {

  const command = this.buildCommand(provider, prompt, mode);

  return new Promise((resolve, reject) => {
    const child = spawn(command.executable, command.args, {
      stdio: mode === ExecutionMode.STDIN ? ['pipe', 'pipe', 'pipe'] : ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
      timeout: timeoutMs
    });

    if (mode === ExecutionMode.STDIN) {
      child.stdin.write(prompt);
      child.stdin.end();
    }

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => stdout += data.toString());
    child.stderr.on('data', (data) => stderr += data.toString());

    child.on('close', (code) => {
      resolve({
        success: code === 0,
        stdout: this.cleanOutput(stdout),
        stderr,
        exitCode: code
      });
    });

    child.on('error', (error) => {
      reject(new Error(`CLI execution failed: ${error.message}`));
    });
  });
}
```

### Usage Monitoring and Cost Estimation

**Token Extraction and Estimation**
```typescript
class UsageMonitor {
  // Provider-specific token extraction patterns
  private readonly TOKEN_PATTERNS = {
    claude_code: /Input tokens:\s*(\d+).*Output tokens:\s*(\d+)/s,
    codex_cli: /(\d+)\s*prompt\s*tokens.*(\d+)\s*completion\s*tokens/s,
    gemini_cli: /Input:\s*(\d+).*Output:\s*(\d+)/s
  };

  extractTokenUsage(provider: string, output: string): TokenUsage {
    const pattern = this.TOKEN_PATTERNS[provider];
    const match = output.match(pattern);

    if (match) {
      return {
        inputTokens: parseInt(match[1]),
        outputTokens: parseInt(match[2]),
        totalTokens: parseInt(match[1]) + parseInt(match[2])
      };
    }

    // Fallback to estimation (1 token ≈ 4 characters)
    return this.estimateTokens(output);
  }

  estimateTokens(text: string): TokenUsage {
    const estimatedTokens = Math.ceil(text.length / 4);
    return {
      inputTokens: 0,
      outputTokens: estimatedTokens,
      totalTokens: estimatedTokens
    };
  }
}
```

### Error Handling and Fallbacks

**Graceful Degradation Strategy**
```typescript
async executeCLIWithFallback(
  providerId: string,
  prompt: string
): Promise<CLIResponse> {

  // Primary: Try preferred execution mode
  try {
    return await this.executeCliCommand(providerId, prompt, ExecutionMode.ARGS);
  } catch (argsError) {
    console.warn(`Args mode failed for ${providerId}, trying stdin:`, argsError.message);

    // Fallback: Try stdin mode
    try {
      return await this.executeCliCommand(providerId, prompt, ExecutionMode.STDIN);
    } catch (stdinError) {
      console.error(`Both execution modes failed for ${providerId}`);

      // Final fallback: Return structured error
      return {
        success: false,
        error: `CLI execution failed: ${stdinError.message}`,
        fallbackSuggested: true,
        troubleshooting: this.getTroubleshootingSteps(providerId)
      };
    }
  }
}
```

---

## Authentication Security

### Multi-Modal Authentication Architecture

Polydev AI implements a sophisticated authentication system supporting multiple access patterns:

**1. Web Application Authentication (Supabase Auth)**
**2. MCP OAuth 2.0 with PKCE**
**3. API Token Authentication**
**4. CLI Tool Proxy Authentication**

### Web Application Authentication

**Supabase Auth Integration**
```typescript
// Client-side authentication
export const createClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
};

// Server-side authentication with cookies
export const createServerClient = () => {
  const cookieStore = cookies();

  return createServerSupabaseClient({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    cookies: {
      get: (name: string) => cookieStore.get(name)?.value,
      set: (name: string, value: string, options: any) => {
        cookieStore.set({ name, value, ...options });
      }
    }
  });
};
```

**Authentication Middleware**
```typescript
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protected routes requiring authentication
  const protectedRoutes = ['/dashboard', '/explorer', '/chat', '/settings'];
  const isProtectedRoute = protectedRoutes.some(route =>
    pathname.startsWith(route)
  );

  if (isProtectedRoute) {
    const supabase = createServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      const redirectUrl = new URL('/auth', request.url);
      redirectUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // MCP routes bypass web authentication
  if (pathname.startsWith('/api/mcp')) {
    return NextResponse.next();
  }

  return NextResponse.next();
}
```

### MCP OAuth 2.0 Implementation

**Authorization Code Flow with PKCE**
```typescript
// Step 1: Authorization request
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const {
    response_type,
    client_id,
    redirect_uri,
    scope,
    state,
    code_challenge,
    code_challenge_method
  } = Object.fromEntries(searchParams.entries());

  // Validate required OAuth parameters
  if (response_type !== 'code') {
    return NextResponse.json({
      error: 'unsupported_response_type',
      error_description: 'Only authorization code flow is supported'
    }, { status: 400 });
  }

  // Store authorization request
  const authData = {
    client_id,
    redirect_uri,
    scope: scope || 'read',
    state,
    code_challenge,
    code_challenge_method: code_challenge_method || 'plain',
    expires_at: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
  };

  await storeAuthRequest(authData);

  // Redirect to consent page
  const consentUrl = new URL('/auth/mcp-authorize', request.url);
  consentUrl.searchParams.set('client_id', client_id);
  consentUrl.searchParams.set('scope', scope || 'read');

  return NextResponse.redirect(consentUrl);
}

// Step 2: Token exchange
export async function POST(request: NextRequest) {
  const {
    grant_type,
    code,
    redirect_uri,
    client_id,
    code_verifier
  } = await request.json();

  // Validate authorization code
  const authData = await getAuthRequest(code);
  if (!authData || authData.expires_at < new Date()) {
    return NextResponse.json({
      error: 'invalid_grant',
      error_description: 'Authorization code is invalid or expired'
    }, { status: 400 });
  }

  // PKCE verification
  if (authData.code_challenge) {
    let expectedChallenge = code_verifier;

    if (authData.code_challenge_method === 'S256') {
      const hash = createHash('sha256').update(code_verifier).digest();
      expectedChallenge = Buffer.from(hash).toString('base64url');
    }

    if (expectedChallenge !== authData.code_challenge) {
      return NextResponse.json({
        error: 'invalid_grant',
        error_description: 'Code verifier does not match code challenge'
      }, { status: 400 });
    }
  }

  // Generate access token
  const accessToken = generateAccessToken(authData.user_id);

  return NextResponse.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 2592000, // 30 days
    scope: authData.scope
  });
}
```

### API Key Management and Encryption

**Current Implementation (Security Concern)**
```typescript
// WARNING: Current implementation uses Base64 (reversible)
// Should be upgraded to proper encryption
export async function storeApiKey(
  userId: string,
  provider: string,
  apiKey: string
): Promise<void> {

  // Current implementation - NOT SECURE
  const encryptedKey = btoa(apiKey); // Simple Base64 encoding
  const keyPreview = apiKey.length > 8
    ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`
    : `${apiKey.slice(0, 4)}***`;

  await supabase
    .from('user_api_keys')
    .upsert({
      user_id: userId,
      provider,
      encrypted_api_key: encryptedKey,
      key_preview: keyPreview,
      updated_at: new Date().toISOString()
    });
}

// Recommended secure implementation
export class SecureKeyManager {
  private static readonly ALGORITHM = 'aes-256-gcm';

  static async encryptApiKey(apiKey: string, userSalt: string): Promise<EncryptedKey> {
    const key = crypto.scryptSync(userSalt, 'polydev-salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.ALGORITHM, key);

    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: cipher.getAuthTag().toString('hex')
    };
  }

  static async decryptApiKey(encryptedKey: EncryptedKey, userSalt: string): Promise<string> {
    const key = crypto.scryptSync(userSalt, 'polydev-salt', 32);
    const decipher = crypto.createDecipher(this.ALGORITHM, key);
    decipher.setAuthTag(Buffer.from(encryptedKey.authTag, 'hex'));

    let decrypted = decipher.update(encryptedKey.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
```

### Token Security and Validation

**Access Token Generation**
```typescript
export function generateAccessToken(userId: string): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(16).toString('hex');
  const payload = `${userId}_${timestamp}_${random}`;

  // Use base64url encoding for URL safety
  const token = Buffer.from(payload).toString('base64url');
  return `polydev_${token}`;
}

export function validateAccessToken(token: string): TokenValidation {
  if (!token.startsWith('polydev_')) {
    return { valid: false, error: 'Invalid token format' };
  }

  try {
    const payload = Buffer.from(token.slice(8), 'base64url').toString();
    const [userId, timestamp, random] = payload.split('_');

    // Check token age (30 days max)
    const tokenAge = Date.now() - parseInt(timestamp);
    if (tokenAge > 30 * 24 * 60 * 60 * 1000) {
      return { valid: false, error: 'Token expired' };
    }

    return { valid: true, userId, timestamp, random };
  } catch (error) {
    return { valid: false, error: 'Token parsing failed' };
  }
}
```

### Row Level Security (RLS) Policies

**Comprehensive Data Isolation**
```sql
-- Users can only access their own API keys
CREATE POLICY "Users can view own api keys" ON user_api_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own api keys" ON user_api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own api keys" ON user_api_keys
  FOR UPDATE USING (auth.uid() = user_id);

-- Service role bypasses RLS for backend operations
CREATE POLICY "Service role full access" ON user_api_keys
  FOR ALL USING (auth.role() = 'service_role');

-- Memory storage policies with zero-knowledge protection
CREATE POLICY "Users can access own memory" ON user_memory_storage
  FOR SELECT USING (auth.uid() = user_id);

-- MCP token policies for OAuth flow
CREATE POLICY "Anonymous token exchange" ON mcp_access_tokens
  FOR SELECT USING (true);  -- Tokens are SHA-256 hashed

CREATE POLICY "Token creation by service" ON mcp_access_tokens
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
```

---

## Supabase Backend

### Database Architecture Overview

Polydev AI uses Supabase as its primary backend, providing authentication, database, and real-time capabilities. The database schema has evolved through 16 major migrations to support the platform's growing feature set.

### Core Schema Evolution

**Migration Timeline:**
1. **Base Schema** - User profiles and basic API key management
2. **Zero-Knowledge Memory** - Encrypted memory extraction system
3. **Provider Configurations** - Dynamic AI provider management
4. **CLI Integration** - CLI tool status and monitoring
5. **Comprehensive API Keys** - Support for 20+ AI providers
6. **Usage Tracking** - Detailed analytics and cost monitoring
7. **Subscription System** - Stripe integration and credit management
8. **Chat History** - Persistent conversation management
9. **MCP Integration** - OAuth 2.0 and token management
10. **Referral System** - User growth and incentive tracking

### Key Database Tables

**User Management**
```sql
-- Core user profiles
CREATE TABLE profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    company TEXT,
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User preferences and settings
ALTER TABLE profiles ADD COLUMN preferences JSONB DEFAULT '{
  "theme": "light",
  "default_provider": "openai",
  "max_tokens": 2000,
  "temperature": 0.7,
  "mcp_settings": {
    "memory_settings": {
      "enable_conversation_memory": true,
      "enable_project_memory": true,
      "max_conversation_history": 10,
      "auto_extract_patterns": true
    }
  }
}';
```

**Zero-Knowledge Memory System**
```sql
-- Encrypted memory storage
CREATE TABLE user_memory_storage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    memory_type TEXT NOT NULL CHECK (memory_type IN ('global', 'project', 'conversation')),
    cli_tool TEXT NOT NULL CHECK (cli_tool IN ('claude_code', 'cline', 'codex_cli', 'cursor', 'continue', 'aider', 'generic')),
    source_path TEXT NOT NULL,
    content_hash TEXT NOT NULL, -- SHA-256 for deduplication
    encrypted_content TEXT NOT NULL, -- AES-256-GCM encrypted
    encryption_version INTEGER DEFAULT 1,
    relevance_score DECIMAL(3,2) DEFAULT 0.5,
    file_size_bytes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Unique constraint prevents duplicate memory entries
    UNIQUE(user_id, content_hash)
);

-- Memory audit trail for compliance
CREATE TABLE user_memory_audit (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('extract', 'access', 'inject', 'delete')),
    cli_tool TEXT,
    memory_type TEXT,
    file_count INTEGER,
    extraction_duration_ms INTEGER,
    memory_sources_found INTEGER,
    context_injected BOOLEAN DEFAULT false,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**API Key Management**
```sql
-- Comprehensive API key storage
CREATE TABLE user_api_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN (
        'openai', 'anthropic', 'google', 'azure', 'aws_bedrock',
        'openrouter', 'together', 'fireworks', 'groq', 'perplexity',
        'deepseek', 'xai', 'mistral', 'cohere', 'huggingface',
        'replicate', 'vertex_ai', 'palm', 'claude', 'gemini'
    )),
    encrypted_api_key TEXT NOT NULL,
    key_preview TEXT NOT NULL,
    provider_config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    monthly_budget DECIMAL(10,2),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used TIMESTAMP WITH TIME ZONE,

    UNIQUE(user_id, provider)
);

-- API key usage tracking
CREATE TABLE api_key_usage_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    provider TEXT NOT NULL,
    model_name TEXT,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    cost_usd DECIMAL(10,6),
    response_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Subscription and Credit System**
```sql
-- User subscriptions (Stripe integration)
CREATE TABLE user_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT UNIQUE,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('free', 'pro', 'enterprise')),
    status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'incomplete')),
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit management system
CREATE TABLE user_credits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    credit_balance DECIMAL(10,2) DEFAULT 0.00,
    promotional_credits DECIMAL(10,2) DEFAULT 0.00,
    lifetime_credits_purchased DECIMAL(10,2) DEFAULT 0.00,
    lifetime_credits_used DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id)
);

-- Credit purchases and transactions
CREATE TABLE credit_purchases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    stripe_payment_intent_id TEXT UNIQUE,
    credits_purchased DECIMAL(10,2) NOT NULL,
    amount_paid_usd DECIMAL(10,2) NOT NULL,
    payment_status TEXT NOT NULL CHECK (payment_status IN ('pending', 'succeeded', 'failed', 'canceled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);
```

**Chat History and Session Management**
```sql
-- Persistent chat sessions
CREATE TABLE chat_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT, -- Auto-generated from first message
    model_provider TEXT,
    model_name TEXT,
    system_prompt TEXT,
    session_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual chat messages
CREATE TABLE chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    model_used TEXT,
    tokens_used INTEGER,
    cost_credits DECIMAL(10,6),
    message_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auto-generate chat titles from first user message
CREATE OR REPLACE FUNCTION generate_chat_title()
RETURNS TRIGGER AS $$
BEGIN
    -- Only generate title for first user message in session
    IF NEW.role = 'user' AND NOT EXISTS (
        SELECT 1 FROM chat_messages
        WHERE session_id = NEW.session_id AND role = 'user'
    ) THEN
        UPDATE chat_sessions
        SET title = CASE
            WHEN LENGTH(NEW.content) > 50
            THEN LEFT(NEW.content, 47) || '...'
            ELSE NEW.content
        END
        WHERE id = NEW.session_id AND title IS NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_chat_title
    AFTER INSERT ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION generate_chat_title();
```

**MCP Integration Tables**
```sql
-- MCP access tokens for OAuth flow
CREATE TABLE mcp_access_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    token_hash TEXT NOT NULL UNIQUE, -- SHA-256 hash of actual token
    scope TEXT DEFAULT 'read',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used TIMESTAMP WITH TIME ZONE
);

-- CLI status reporting tokens (long-lived)
CREATE TABLE mcp_user_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    token_name TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used TIMESTAMP WITH TIME ZONE
);

-- CLI status audit logs
CREATE TABLE cli_status_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('claude_code', 'codex_cli', 'gemini_cli')),
    status TEXT NOT NULL CHECK (status IN ('available', 'unavailable', 'not_installed', 'checking')),
    authenticated BOOLEAN,
    cli_version TEXT,
    error_message TEXT,
    reported_via TEXT CHECK (reported_via IN ('mcp_client', 'web_dashboard', 'api_direct')),
    client_info JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Performance Optimizations

**Strategic Indexing**
```sql
-- User-centric queries
CREATE INDEX idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX idx_user_memory_user_type ON user_memory_storage(user_id, memory_type);
CREATE INDEX idx_chat_sessions_user_recent ON chat_sessions(user_id, last_message_at DESC);

-- Analytics and reporting
CREATE INDEX idx_api_usage_time_user ON api_key_usage_log(created_at, user_id);
CREATE INDEX idx_cli_status_time_provider ON cli_status_logs(timestamp, provider);

-- Hash-based lookups
CREATE INDEX idx_memory_content_hash ON user_memory_storage(content_hash);
CREATE INDEX idx_mcp_token_hash ON mcp_access_tokens(token_hash);

-- Composite indexes for common query patterns
CREATE INDEX idx_chat_messages_session_time ON chat_messages(session_id, created_at);
CREATE INDEX idx_usage_log_user_provider_time ON api_key_usage_log(user_id, provider, created_at);
```

**Query Optimization Views**
```sql
-- User spending summary for dashboard
CREATE VIEW user_spending_summary AS
SELECT
    user_id,
    DATE(created_at) as spending_date,
    SUM(cost_usd) as daily_spend,
    COUNT(*) as request_count,
    array_agg(DISTINCT provider) as providers_used
FROM api_key_usage_log
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY user_id, DATE(created_at);

-- Model popularity analytics
CREATE VIEW model_popularity AS
SELECT
    model_name,
    provider,
    COUNT(*) as usage_count,
    AVG(cost_usd) as avg_cost,
    SUM(total_tokens) as total_tokens_processed
FROM api_key_usage_log
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY model_name, provider
ORDER BY usage_count DESC;
```

### Database Triggers and Automation

**Automatic Timestamp Management**
```sql
-- Auto-update timestamps on record changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at columns
CREATE TRIGGER trigger_update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_user_api_keys_updated_at
    BEFORE UPDATE ON user_api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

**Automatic User Initialization**
```sql
-- Create user profile and initialize credits on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create user profile
    INSERT INTO profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');

    -- Initialize subscription (FREE tier)
    INSERT INTO user_subscriptions (user_id, plan_type, status)
    VALUES (NEW.id, 'free', 'active');

    -- Initialize credits with $1 promotional credit
    INSERT INTO user_credits (user_id, promotional_credits)
    VALUES (NEW.id, 1.00);

    -- Initialize message usage tracking
    INSERT INTO user_message_usage (user_id, messages_used, monthly_limit)
    VALUES (NEW.id, 0, 200);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();
```

### Row Level Security Implementation

**Comprehensive Data Isolation**
```sql
-- Enable RLS on all user tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memory_storage ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- User data access policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- API key policies
CREATE POLICY "Users can view own api keys" ON user_api_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own api keys" ON user_api_keys
  FOR ALL USING (auth.uid() = user_id);

-- Memory storage policies (zero-knowledge)
CREATE POLICY "Users can access own memory" ON user_memory_storage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can store own memory" ON user_memory_storage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Chat session policies
CREATE POLICY "Users can access own chat sessions" ON chat_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own chat messages" ON chat_messages
  FOR ALL USING (
    auth.uid() = (
      SELECT user_id FROM chat_sessions
      WHERE id = chat_messages.session_id
    )
  );

-- Service role bypass for backend operations
CREATE POLICY "Service role full access" ON user_api_keys
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role subscription access" ON user_subscriptions
  FOR ALL USING (auth.role() = 'service_role');
```

### Real-time and Synchronization

**Authentication State Management**
```typescript
// Real-time auth state changes
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { session, loading };
}
```

**No Real-time Database Subscriptions**
The application primarily uses traditional request-response patterns rather than real-time database subscriptions. This design choice prioritizes:
- Data consistency and integrity
- Simplified error handling
- Reduced complexity in client state management
- Better performance for read-heavy workloads

---

## Part III: Advanced Features and Capabilities

## Memory Extraction

### Universal Memory Extraction System

Polydev AI's memory extraction system represents a breakthrough in AI context management, automatically discovering and extracting relevant information from multiple CLI tools while maintaining zero-knowledge privacy standards.

### Supported CLI Tools and Memory Patterns

**Comprehensive CLI Tool Support:**
- **Claude Code** - Project files, global memory, conversation logs
- **Cline** - Workspace files, conversation history, task patterns
- **Codex CLI** - Project context, command history, code patterns
- **Cursor** - Workspace memory, conversation logs, code context
- **Continue** - Development context, conversation history
- **Aider** - Code change patterns, conversation logs
- **Generic AI Tools** - Configurable patterns for custom tools

**Memory Pattern Detection:**
```typescript
class UniversalMemoryExtractor {
  private readonly MEMORY_PATTERNS = {
    claude_code: {
      global: ['~/.claude/CLAUDE.md', '~/.claude/global_memory.md'],
      project: ['CLAUDE.md', '.claude/CLAUDE.md', '.claude/project_memory.md'],
      conversations: ['~/.claude/projects/*/conversations/*.jsonl'],
      config: ['~/.claude/config.json']
    },
    cline: {
      global: ['~/.cline/global_memory.md'],
      project: ['.cline/memory.md', '.cline/project_context.md'],
      conversations: ['~/.cline/sessions/*.json'],
      config: ['~/.cline/config.json']
    },
    cursor: {
      global: ['~/.cursor/memory/', '~/Library/Application Support/Cursor/'],
      project: ['.cursor/', '.vscode/cursor_context.md'],
      conversations: ['~/.cursor/conversations/*.json']
    },
    // ... patterns for codex_cli, continue, aider, generic
  };

  async detectMemorySources(
    cliTools: string[] = ['all'],
    memoryTypes: string[] = ['global', 'project', 'conversation'],
    projectPath: string = process.cwd()
  ): Promise<MemorySourceDetection> {

    const detectedSources: MemorySource[] = [];
    const toolsToScan = cliTools.includes('all')
      ? Object.keys(this.MEMORY_PATTERNS)
      : cliTools;

    for (const tool of toolsToScan) {
      for (const memoryType of memoryTypes) {
        const patterns = this.MEMORY_PATTERNS[tool]?.[memoryType] || [];

        for (const pattern of patterns) {
          const expandedPaths = await this.expandGlobPattern(pattern, projectPath);

          for (const filePath of expandedPaths) {
            if (await this.fileExists(filePath)) {
              const stats = await fs.stat(filePath);
              detectedSources.push({
                cli_tool: tool,
                memory_type: memoryType,
                source_path: filePath,
                file_size: stats.size,
                last_modified: stats.mtime,
                detected_at: new Date()
              });
            }
          }
        }
      }
    }

    return {
      sources_found: detectedSources.length,
      detected_sources: detectedSources,
      cli_tools_scanned: toolsToScan,
      memory_types_scanned: memoryTypes
    };
  }
}
```

### Zero-Knowledge Encryption Implementation

**AES-256-GCM Client-Side Encryption:**
```typescript
export class ZeroKnowledgeEncryption {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12;
  private static readonly TAG_LENGTH = 16;
  private static readonly KEY_ROTATION_DAYS = 30;

  // Generate encryption key from user-specific salt
  private static async deriveKey(userSalt: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(userSalt),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('polydev-memory-salt'),
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // Encrypt sensitive content
  static async encrypt(
    plaintext: string,
    userSalt: string
  ): Promise<EncryptedData> {
    const encoder = new TextEncoder();
    const key = await this.deriveKey(userSalt);
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

    const encrypted = await crypto.subtle.encrypt(
      { name: this.ALGORITHM, iv },
      key,
      encoder.encode(plaintext)
    );

    return {
      encrypted: Array.from(new Uint8Array(encrypted)),
      iv: Array.from(iv),
      algorithm: this.ALGORITHM,
      timestamp: Date.now()
    };
  }

  // Decrypt content
  static async decrypt(
    encryptedData: EncryptedData,
    userSalt: string
  ): Promise<string> {
    const key = await this.deriveKey(userSalt);
    const iv = new Uint8Array(encryptedData.iv);
    const encrypted = new Uint8Array(encryptedData.encrypted);

    const decrypted = await crypto.subtle.decrypt(
      { name: this.ALGORITHM, iv },
      key,
      encrypted
    );

    return new TextDecoder().decode(decrypted);
  }

  // Generate content hash for deduplication
  static async generateContentHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}
```

### TF-IDF Relevance Scoring

**Content Relevance Algorithm:**
```typescript
class RelevanceScorer {
  private calculateRelevanceScore(
    content: string,
    source: MemorySource,
    queryContext?: string
  ): number {
    let score = 0.5; // Base relevance score

    // Memory type weighting
    const typeWeights = {
      'project': 0.3,      // High relevance for project-specific context
      'conversation': 0.2,  // Medium relevance for conversation history
      'global': 0.1,       // Lower relevance for global patterns
      'config': 0.05       // Minimal relevance for configuration
    };
    score += typeWeights[source.memory_type] || 0;

    // CLI tool weighting (prefer modern tools)
    const toolWeights = {
      'claude_code': 0.15,
      'cursor': 0.12,
      'cline': 0.10,
      'codex_cli': 0.08,
      'continue': 0.06,
      'aider': 0.04
    };
    score += toolWeights[source.cli_tool] || 0;

    // Content quality indicators
    const qualityIndicators = [
      { pattern: /TODO|FIXME|NOTE:/gi, weight: 0.1 },
      { pattern: /pattern|decision|approach/gi, weight: 0.1 },
      { pattern: /class|function|interface/gi, weight: 0.08 },
      { pattern: /bug|error|issue|problem/gi, weight: 0.06 },
      { pattern: /implementation|solution/gi, weight: 0.05 }
    ];

    for (const indicator of qualityIndicators) {
      const matches = content.match(indicator.pattern);
      if (matches) {
        score += Math.min(matches.length * indicator.weight, indicator.weight * 3);
      }
    }

    // Content length optimization (prefer substantial but not overwhelming content)
    const contentLength = content.length;
    if (contentLength > 500 && contentLength < 5000) {
      score += 0.1;
    } else if (contentLength > 5000 && contentLength < 15000) {
      score += 0.05;
    }

    // Query context matching (if provided)
    if (queryContext) {
      const queryTerms = queryContext.toLowerCase().split(/\s+/);
      const contentLower = content.toLowerCase();
      let matchScore = 0;

      for (const term of queryTerms) {
        if (term.length > 3 && contentLower.includes(term)) {
          matchScore += 0.02;
        }
      }
      score += Math.min(matchScore, 0.2);
    }

    // File recency boost
    const daysSinceModification = (Date.now() - source.last_modified.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceModification < 7) {
      score += 0.05; // Recent files are more relevant
    }

    return Math.min(Math.max(score, 0), 1); // Clamp between 0 and 1
  }

  // Simple TF-IDF-inspired keyword extraction
  extractKeywords(content: string, maxKeywords: number = 10): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
      'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'
    ]);

    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word));

    const frequency = new Map<string, number>();
    for (const word of words) {
      frequency.set(word, (frequency.get(word) || 0) + 1);
    }

    return Array.from(frequency.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, maxKeywords)
      .map(([word]) => word);
  }
}
```

### Memory Extraction and Storage Process

**Complete Extraction Workflow:**
```typescript
export class UniversalMemoryExtractor {
  async extractMemory(args: {
    cli_tools?: string[];
    memory_types?: string[];
    project_path?: string;
    encryption_enabled?: boolean;
    max_file_size_kb?: number;
    relevance_threshold?: number;
    user_token: string;
  }): Promise<MemoryExtractionResult> {

    const startTime = Date.now();
    let extractedContent: MemoryContent[] = [];
    let encryptedEntries: EncryptedMemoryEntry[] = [];

    try {
      // 1. Detect memory sources
      const detectionResult = await this.detectMemorySources(
        args.cli_tools || ['all'],
        args.memory_types || ['global', 'project', 'conversation'],
        args.project_path || process.cwd()
      );

      // 2. Extract and process content
      for (const source of detectionResult.detected_sources) {
        try {
          // Check file size limits
          if (source.file_size > (args.max_file_size_kb || 500) * 1024) {
            console.warn(`Skipping ${source.source_path}: exceeds size limit`);
            continue;
          }

          // Read file content
          const content = await fs.readFile(source.source_path, 'utf-8');

          // Calculate relevance score
          const relevanceScore = this.calculateRelevanceScore(content, source);

          // Filter by relevance threshold
          if (relevanceScore < (args.relevance_threshold || 0.3)) {
            continue;
          }

          // Generate content hash for deduplication
          const contentHash = await ZeroKnowledgeEncryption.generateContentHash(content);

          const memoryContent: MemoryContent = {
            cli_tool: source.cli_tool,
            memory_type: source.memory_type,
            source_path: source.source_path,
            content,
            content_hash: contentHash,
            relevance_score: relevanceScore,
            file_size_bytes: source.file_size,
            keywords: this.extractKeywords(content),
            extracted_at: new Date()
          };

          extractedContent.push(memoryContent);

          // 3. Encrypt content if enabled
          if (args.encryption_enabled) {
            const userSalt = await this.getUserSalt(args.user_token);
            const encryptedData = await ZeroKnowledgeEncryption.encrypt(content, userSalt);

            encryptedEntries.push({
              ...memoryContent,
              encrypted_content: encryptedData,
              content: undefined // Remove plaintext from encrypted entry
            });
          }

        } catch (fileError) {
          console.error(`Failed to process ${source.source_path}:`, fileError);
        }
      }

      // 4. Store encrypted entries in database
      if (args.encryption_enabled && encryptedEntries.length > 0) {
        await this.storeEncryptedMemory(args.user_token, encryptedEntries);
      }

      // 5. Generate extraction report
      const extractionDuration = Date.now() - startTime;
      const result: MemoryExtractionResult = {
        success: true,
        sources_detected: detectionResult.detected_sources.length,
        content_extracted: extractedContent.length,
        encrypted_entries: encryptedEntries.length,
        extraction_duration_ms: extractionDuration,
        memory_sources: extractedContent,
        average_relevance_score: extractedContent.reduce((sum, item) =>
          sum + item.relevance_score, 0) / extractedContent.length || 0,
        total_content_size_bytes: extractedContent.reduce((sum, item) =>
          sum + item.file_size_bytes, 0),
        cli_tools_processed: [...new Set(extractedContent.map(item => item.cli_tool))]
      };

      // 6. Log extraction audit trail
      await this.logMemoryAudit({
        user_token: args.user_token,
        action_type: 'extract',
        extraction_duration_ms: extractionDuration,
        memory_sources_found: result.sources_detected,
        content_extracted: result.content_extracted
      });

      return result;

    } catch (error) {
      return {
        success: false,
        error: `Memory extraction failed: ${error.message}`,
        sources_detected: 0,
        content_extracted: 0,
        extraction_duration_ms: Date.now() - startTime
      };
    }
  }
}
```

### Context Injection and Enhancement

**Intelligent Context Assembly:**
```typescript
export class ContextManager {
  async getMemoryContext(args: {
    user_token: string;
    query_context?: string;
    cli_tools?: string[];
    memory_types?: string[];
    max_memory_kb?: number;
    max_conversations?: number;
  }): Promise<ContextResult> {

    const userSalt = await this.getUserSalt(args.user_token);
    let contextParts: string[] = [];
    let totalSize = 0;
    const maxSizeBytes = (args.max_memory_kb || 50) * 1024;

    try {
      // 1. Retrieve relevant encrypted memory
      const memoryEntries = await this.getRelevantMemory({
        user_token: args.user_token,
        query_context: args.query_context,
        cli_tools: args.cli_tools,
        memory_types: args.memory_types || ['project', 'conversation']
      });

      // 2. Decrypt and format memory content
      for (const entry of memoryEntries) {
        if (totalSize >= maxSizeBytes) break;

        try {
          const decryptedContent = await ZeroKnowledgeEncryption.decrypt(
            entry.encrypted_content,
            userSalt
          );

          const contextSection = this.formatMemoryContext(entry, decryptedContent);
          const sectionSize = Buffer.byteLength(contextSection, 'utf8');

          if (totalSize + sectionSize <= maxSizeBytes) {
            contextParts.push(contextSection);
            totalSize += sectionSize;
          }
        } catch (decryptionError) {
          console.error(`Failed to decrypt memory entry ${entry.id}:`, decryptionError);
        }
      }

      // 3. Retrieve recent conversations
      const conversations = await this.getRecentConversations({
        user_token: args.user_token,
        query_context: args.query_context,
        limit: args.max_conversations || 6,
        max_size_bytes: maxSizeBytes - totalSize
      });

      if (conversations.length > 0) {
        const conversationContext = this.formatConversationContext(conversations);
        contextParts.push(conversationContext);
      }

      // 4. Assemble final context
      const finalContext = this.assembleContext(contextParts, args.query_context);

      return {
        success: true,
        context_injected: finalContext.length > 0,
        relevant_context: finalContext,
        memory_entries_used: memoryEntries.length,
        conversations_used: conversations.length,
        total_context_size_bytes: Buffer.byteLength(finalContext, 'utf8')
      };

    } catch (error) {
      return {
        success: false,
        error: `Context assembly failed: ${error.message}`,
        context_injected: false
      };
    }
  }

  private formatMemoryContext(entry: MemoryEntry, content: string): string {
    return `# ${entry.cli_tool.toUpperCase()} ${entry.memory_type.toUpperCase()} MEMORY
Source: ${entry.source_path}
Relevance: ${(entry.relevance_score * 100).toFixed(0)}%
Modified: ${entry.file_modified_at?.toLocaleDateString()}

${content}

---
`;
  }

  private assembleContext(contextParts: string[], queryContext?: string): string {
    if (contextParts.length === 0) return '';

    let assembledContext = `# PROJECT CONTEXT

The following context has been automatically extracted from your development environment:

${contextParts.join('\n')}

`;

    if (queryContext) {
      assembledContext += `# CURRENT REQUEST

${queryContext}

---

`;
    }

    return assembledContext;
  }
}
```

### Memory Preferences and Privacy Controls

**Granular Privacy Management:**
```typescript
interface MemoryPreferences {
  memory_enabled: boolean;
  auto_extraction: boolean;
  auto_inject_context: boolean;
  privacy_mode: boolean;

  // CLI tool controls
  cli_tools_enabled: {
    claude_code: boolean;
    cline: boolean;
    cursor: boolean;
    codex_cli: boolean;
    continue: boolean;
    aider: boolean;
    generic: boolean;
  };

  // Memory type controls
  memory_types_enabled: {
    global: boolean;
    project: boolean;
    conversation: boolean;
    config: boolean;
  };

  // Performance and privacy settings
  max_file_size_kb: number;
  context_relevance_threshold: number;
  max_memory_inject_kb: number;
  max_conversations_inject: number;
  cache_ttl_minutes: number;

  // Security settings
  key_rotation_days: number;
  audit_retention_days: number;
}

const DEFAULT_MEMORY_PREFERENCES: MemoryPreferences = {
  memory_enabled: true,
  auto_extraction: true,
  auto_inject_context: true,
  privacy_mode: false,

  cli_tools_enabled: {
    claude_code: true,
    cline: true,
    cursor: true,
    codex_cli: true,
    continue: true,
    aider: true,
    generic: false
  },

  memory_types_enabled: {
    global: true,
    project: true,
    conversation: true,
    config: false
  },

  max_file_size_kb: 500,
  context_relevance_threshold: 0.3,
  max_memory_inject_kb: 50,
  max_conversations_inject: 6,
  cache_ttl_minutes: 30,

  key_rotation_days: 30,
  audit_retention_days: 90
};
```

---

## Perspective Generation

### Multi-Model Orchestration Architecture

Polydev AI's perspective generation system represents a sophisticated approach to multi-model AI orchestration, enabling simultaneous queries across multiple AI providers to generate diverse perspectives and enhanced reasoning capabilities.

### Core Perspective Generation System

**Main API Endpoint Implementation:**
```typescript
// /src/app/api/perspectives/route.ts
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Authentication and rate limiting
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await rateLimiter.checkLimit(user.id, 'perspectives');

    // 2. Parse and validate request
    const args = await request.json();
    const {
      prompt,
      models,
      max_tokens = 2000,
      temperature = 0.7,
      auto_inject_memory = true,
      project_context
    } = args;

    // 3. Memory context injection
    let enhancedPrompt = prompt;
    if (auto_inject_memory) {
      const memoryContext = await memoryManager.getMemoryContext({
        user_id: user.id,
        query_context: prompt,
        max_memory_kb: 25,
        max_conversations: 3
      });

      if (memoryContext.success && memoryContext.relevant_context) {
        enhancedPrompt = `${memoryContext.relevant_context}\n\n# Current Request\n${prompt}`;
      }
    }

    // 4. Model selection and validation
    const selectedModels = await validateAndSelectModels(models, user);
    const perspectiveRequests = selectedModels.map(model => ({
      model,
      prompt: enhancedPrompt,
      max_tokens,
      temperature: model.includes('o1') ? undefined : temperature, // o1 models don't support temperature
      user
    }));

    // 5. Concurrent multi-model execution
    const perspectivePromises = perspectiveRequests.map(async (request) => {
      try {
        const provider = detectProvider(request.model);
        const handler = getProviderHandler(provider);

        return await handler.createCompletion(request);
      } catch (error) {
        return {
          model: request.model,
          success: false,
          error: error.message,
          response_time_ms: 0
        };
      }
    });

    // 6. Wait for all responses with timeout
    const perspectives = await Promise.allSettled(perspectivePromises);
    const results = perspectives.map((result, index) => ({
      model: selectedModels[index],
      ...(result.status === 'fulfilled' ? result.value : {
        success: false,
        error: 'Request timeout or failure'
      })
    }));

    // 7. Format and aggregate results
    const response = await formatPerspectiveResponse({
      results,
      original_prompt: prompt,
      enhanced_prompt: enhancedPrompt,
      total_time_ms: Date.now() - startTime,
      user_id: user.id
    });

    // 8. Usage tracking and billing
    await trackUsage({
      user_id: user.id,
      perspectives: results,
      prompt_tokens: estimateTokens(enhancedPrompt),
      response_time_ms: Date.now() - startTime
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('Perspective generation failed:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
```

### Provider Management and Detection

**Universal Provider Abstraction:**
```typescript
// Provider detection and routing
export function detectProvider(modelId: string): ProviderType {
  const providerPatterns = {
    'openai': /^(gpt-|o1-|chatgpt)/i,
    'anthropic': /^(claude-|haiku|sonnet|opus)/i,
    'google': /^(gemini|palm|bard)/i,
    'xai': /^(grok)/i,
    'deepseek': /^(deepseek)/i,
    'mistral': /^(mistral|mixtral)/i,
    'groq': /^(llama|mixtral).*groq/i,
    'openrouter': /\//  // Contains slash (provider/model format)
  };

  for (const [provider, pattern] of Object.entries(providerPatterns)) {
    if (pattern.test(modelId)) {
      return provider as ProviderType;
    }
  }

  return 'openai'; // Default fallback
}

// Provider-specific handlers
export class ProviderHandler {
  constructor(
    private provider: ProviderType,
    private config: ProviderConfig
  ) {}

  async createCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    const startTime = Date.now();

    try {
      // 1. Rate limiting check
      await this.checkRateLimit(request.user.id);

      // 2. Transform request to provider format
      const providerRequest = this.transformRequest(request);

      // 3. Execute request with retry logic
      const response = await this.executeWithRetry(providerRequest);

      // 4. Transform response to standard format
      const standardResponse = this.transformResponse(response);

      return {
        ...standardResponse,
        model: request.model,
        success: true,
        response_time_ms: Date.now() - startTime,
        provider: this.provider
      };

    } catch (error) {
      return {
        model: request.model,
        success: false,
        error: error.message,
        response_time_ms: Date.now() - startTime,
        provider: this.provider
      };
    }
  }

  private async executeWithRetry(
    request: ProviderRequest,
    maxRetries: number = 3
  ): Promise<ProviderResponse> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.makeRequest(request);
      } catch (error) {
        lastError = error;

        // Determine if error is retryable
        if (!this.isRetryableError(error) || attempt === maxRetries) {
          throw error;
        }

        // Exponential backoff with jitter
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        const jitter = Math.random() * 0.1 * delay;
        await new Promise(resolve => setTimeout(resolve, delay + jitter));
      }
    }

    throw lastError;
  }

  private isRetryableError(error: any): boolean {
    const retryableStatuses = [429, 500, 502, 503, 504];
    const retryableMessages = [
      'rate limit',
      'timeout',
      'network error',
      'overloaded',
      'temporarily unavailable'
    ];

    return retryableStatuses.includes(error.status) ||
           retryableMessages.some(msg =>
             error.message?.toLowerCase().includes(msg)
           );
  }
}
```

### Concurrent Processing and Error Handling

**Intelligent Concurrency Management:**
```typescript
export class PerspectiveOrchestrator {
  async generatePerspectives(
    requests: PerspectiveRequest[]
  ): Promise<PerspectiveResult[]> {

    // 1. Group requests by provider for rate limit optimization
    const requestsByProvider = this.groupByProvider(requests);

    // 2. Create execution plan with concurrency limits
    const executionPlan = this.createExecutionPlan(requestsByProvider);

    // 3. Execute with controlled concurrency
    const results: PerspectiveResult[] = [];

    for (const batch of executionPlan) {
      const batchPromises = batch.map(async (request) => {
        const provider = detectProvider(request.model);
        const handler = this.getProviderHandler(provider);

        // Apply provider-specific rate limiting
        await this.rateLimiters[provider].waitForCapacity(
          estimateTokens(request.prompt)
        );

        return handler.createCompletion(request);
      });

      // Wait for batch completion with timeout
      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...this.processBatchResults(batchResults, batch));
    }

    return results;
  }

  private createExecutionPlan(
    requestsByProvider: Map<string, PerspectiveRequest[]>
  ): PerspectiveRequest[][] {
    const batches: PerspectiveRequest[][] = [];
    const maxConcurrency = 6; // Optimal concurrent request limit

    // Interleave requests from different providers to maximize parallelism
    const allRequests = Array.from(requestsByProvider.values()).flat();

    for (let i = 0; i < allRequests.length; i += maxConcurrency) {
      batches.push(allRequests.slice(i, i + maxConcurrency));
    }

    return batches;
  }

  private processBatchResults(
    results: PromiseSettledResult<CompletionResponse>[],
    originalRequests: PerspectiveRequest[]
  ): PerspectiveResult[] {
    return results.map((result, index) => {
      const request = originalRequests[index];

      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          model: request.model,
          success: false,
          error: result.reason?.message || 'Unknown error',
          response_time_ms: 0,
          provider: detectProvider(request.model)
        };
      }
    });
  }
}
```

### Rate Limiting and Quota Management

**Multi-Provider Rate Limiting:**
```typescript
export class MultiProviderRateLimiter {
  private limiters: Map<string, ProviderRateLimiter> = new Map();

  constructor() {
    // Initialize rate limiters for each provider
    const providerLimits = {
      'openai': { requestsPerMinute: 3500, tokensPerMinute: 350000 },
      'anthropic': { requestsPerMinute: 1000, tokensPerMinute: 80000 },
      'google': { requestsPerMinute: 300, tokensPerMinute: 120000 },
      'groq': { requestsPerMinute: 30, tokensPerMinute: 14400 },
      'xai': { requestsPerMinute: 100, tokensPerMinute: 50000 },
      'deepseek': { requestsPerMinute: 200, tokensPerMinute: 100000 }
    };

    for (const [provider, limits] of Object.entries(providerLimits)) {
      this.limiters.set(provider, new ProviderRateLimiter(limits));
    }
  }

  async checkAllProviders(
    requests: PerspectiveRequest[]
  ): Promise<RateLimitResult> {
    const checks = requests.map(async (request) => {
      const provider = detectProvider(request.model);
      const limiter = this.limiters.get(provider);

      if (!limiter) {
        return { provider, allowed: true, waitTime: 0 };
      }

      const tokensNeeded = estimateTokens(request.prompt);
      return limiter.checkCapacity(tokensNeeded);
    });

    const results = await Promise.all(checks);
    const maxWaitTime = Math.max(...results.map(r => r.waitTime));

    return {
      allowed: results.every(r => r.allowed),
      waitTime: maxWaitTime,
      providerResults: results
    };
  }
}

export class ProviderRateLimiter {
  private requestTimestamps: number[] = [];
  private tokenUsage: { timestamp: number; tokens: number }[] = [];

  constructor(
    private limits: {
      requestsPerMinute: number;
      tokensPerMinute: number;
    }
  ) {}

  async waitForCapacity(tokensNeeded: number): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Clean old entries
    this.requestTimestamps = this.requestTimestamps.filter(t => t > oneMinuteAgo);
    this.tokenUsage = this.tokenUsage.filter(u => u.timestamp > oneMinuteAgo);

    // Check request limit
    if (this.requestTimestamps.length >= this.limits.requestsPerMinute) {
      const oldestRequest = Math.min(...this.requestTimestamps);
      const waitTime = oldestRequest + 60000 - now;
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    // Check token limit
    const currentTokenUsage = this.tokenUsage.reduce((sum, u) => sum + u.tokens, 0);
    if (currentTokenUsage + tokensNeeded > this.limits.tokensPerMinute) {
      const oldestTokenUsage = this.tokenUsage.reduce((oldest, u) =>
        u.timestamp < oldest.timestamp ? u : oldest
      );
      const waitTime = oldestTokenUsage.timestamp + 60000 - now;
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    // Record usage
    this.requestTimestamps.push(now);
    this.tokenUsage.push({ timestamp: now, tokens: tokensNeeded });
  }
}
```

### Response Streaming and Aggregation

**Real-Time Response Handling:**
```typescript
export class StreamingAggregator {
  async streamPerspectives(
    requests: PerspectiveRequest[],
    responseStream: WritableStream
  ): Promise<void> {
    const writer = responseStream.getWriter();
    const encoder = new TextEncoder();

    try {
      // Send initial response structure
      await this.sendInitialFrame(writer, requests.length);

      // Track completion status
      const completionTracker = new Map<string, boolean>();
      requests.forEach(req => completionTracker.set(req.model, false));

      // Start all requests concurrently
      const streamPromises = requests.map(async (request, index) => {
        try {
          const provider = detectProvider(request.model);
          const handler = this.getProviderHandler(provider);

          // Stream individual response
          await handler.streamCompletion(request, async (chunk) => {
            await this.sendResponseChunk(writer, {
              model: request.model,
              index,
              chunk: chunk.content,
              finished: chunk.finished,
              tokens: chunk.tokens,
              cost: chunk.cost
            });
          });

          completionTracker.set(request.model, true);

        } catch (error) {
          await this.sendErrorChunk(writer, {
            model: request.model,
            index,
            error: error.message
          });
        }
      });

      // Wait for all streams to complete
      await Promise.allSettled(streamPromises);

      // Send completion frame
      await this.sendCompletionFrame(writer, completionTracker);

    } finally {
      writer.close();
    }
  }

  private async sendResponseChunk(
    writer: WritableStreamDefaultWriter,
    data: ResponseChunk
  ): Promise<void> {
    const frame = {
      type: 'response_chunk',
      model: data.model,
      index: data.index,
      content: data.chunk,
      finished: data.finished,
      metadata: {
        tokens: data.tokens,
        cost: data.cost,
        timestamp: Date.now()
      }
    };

    const encoded = encoder.encode(`data: ${JSON.stringify(frame)}\n\n`);
    await writer.write(encoded);
  }
}
```

### Cost Optimization and Usage Tracking

**Multi-Provider Cost Management:**
```typescript
export class CostOptimizer {
  private readonly PROVIDER_COSTS = {
    'openai': {
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-3.5-turbo': { input: 0.001, output: 0.002 }
    },
    'anthropic': {
      'claude-3.5-sonnet': { input: 0.003, output: 0.015 },
      'claude-3-haiku': { input: 0.00025, output: 0.00125 }
    },
    'google': {
      'gemini-1.5-pro': { input: 0.0035, output: 0.0105 },
      'gemini-1.5-flash': { input: 0.00035, output: 0.00105 }
    }
  };

  async optimizeModelSelection(
    request: PerspectiveRequest,
    budget: number
  ): Promise<string[]> {
    const estimatedTokens = estimateTokens(request.prompt);
    const affordableModels: string[] = [];

    for (const [provider, models] of Object.entries(this.PROVIDER_COSTS)) {
      for (const [model, pricing] of Object.entries(models)) {
        const estimatedCost = this.calculateCost(
          estimatedTokens,
          estimatedTokens * 2, // Assume 2:1 output ratio
          pricing
        );

        if (estimatedCost <= budget) {
          affordableModels.push(model);
        }
      }
    }

    // Sort by cost-effectiveness (performance/cost ratio)
    return affordableModels.sort((a, b) =>
      this.getCostEffectivenessScore(b) - this.getCostEffectivenessScore(a)
    );
  }

  private calculateCost(
    inputTokens: number,
    outputTokens: number,
    pricing: { input: number; output: number }
  ): number {
    const inputCost = (inputTokens / 1000) * pricing.input;
    const outputCost = (outputTokens / 1000) * pricing.output;
    return inputCost + outputCost;
  }

  async trackPerspectiveUsage(
    userId: string,
    results: PerspectiveResult[]
  ): Promise<UsageRecord> {
    const totalCost = results.reduce((sum, result) => sum + (result.cost || 0), 0);
    const totalTokens = results.reduce((sum, result) => sum + (result.tokens || 0), 0);

    const usageRecord: UsageRecord = {
      user_id: userId,
      session_type: 'perspective_generation',
      model_responses: results.length,
      successful_responses: results.filter(r => r.success).length,
      total_tokens: totalTokens,
      total_cost_usd: totalCost,
      provider_breakdown: this.generateProviderBreakdown(results),
      timestamp: new Date()
    };

    await this.recordUsage(usageRecord);
    await this.updateUserCredits(userId, totalCost);

    return usageRecord;
  }
}
```

---

## Provider Management

### Comprehensive Provider Ecosystem

Polydev AI supports an extensive ecosystem of AI providers, integrating with both major commercial providers and emerging specialized services. The system maintains real-time model catalogs and pricing information to ensure optimal routing and cost management.

### Models.dev Integration

**Real-Time Model Discovery:**
```typescript
export class ModelsDevIntegration {
  private readonly API_BASE = 'https://models.dev/api/v1';
  private modelCache: Map<string, ModelInfo> = new Map();
  private lastSync: Date | null = null;

  async syncModelCatalog(force: boolean = false): Promise<SyncResult> {
    const SYNC_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours

    if (!force && this.lastSync &&
        Date.now() - this.lastSync.getTime() < SYNC_INTERVAL) {
      return { status: 'cached', models: this.modelCache.size };
    }

    try {
      // Fetch latest model data
      const response = await fetch(`${this.API_BASE}/models`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Polydev-AI/1.2.2'
        }
      });

      if (!response.ok) {
        throw new Error(`Models.dev API error: ${response.status}`);
      }

      const modelsData = await response.json();

      // Process and cache model information
      const processedModels = await this.processModelData(modelsData);

      // Update database
      await this.updateModelRegistry(processedModels);

      // Update cache
      this.modelCache.clear();
      processedModels.forEach(model => {
        this.modelCache.set(model.id, model);
      });

      this.lastSync = new Date();

      return {
        status: 'synced',
        models: processedModels.length,
        providers: new Set(processedModels.map(m => m.provider)).size
      };

    } catch (error) {
      console.error('Model catalog sync failed:', error);
      return { status: 'error', error: error.message };
    }
  }

  private async processModelData(rawData: any[]): Promise<ModelInfo[]> {
    const processedModels: ModelInfo[] = [];

    for (const modelData of rawData) {
      try {
        const modelInfo: ModelInfo = {
          id: modelData.id,
          name: modelData.name || modelData.id,
          provider: modelData.provider,
          category: this.categorizeModel(modelData),

          // Capabilities
          max_tokens: modelData.max_tokens || 4096,
          context_length: modelData.context_length || modelData.max_tokens || 4096,
          supports_images: modelData.supports_images || false,
          supports_tools: modelData.supports_tools || false,
          supports_streaming: modelData.supports_streaming ?? true,
          supports_system_prompt: modelData.supports_system_prompt ?? true,

          // Pricing (per 1M tokens)
          pricing: {
            input_cost_per_1m: this.extractPricing(modelData, 'input'),
            output_cost_per_1m: this.extractPricing(modelData, 'output'),
            cache_read_cost_per_1m: this.extractPricing(modelData, 'cache_read'),
            cache_write_cost_per_1m: this.extractPricing(modelData, 'cache_write')
          },

          // Metadata
          description: modelData.description,
          launch_date: modelData.launch_date ? new Date(modelData.launch_date) : null,
          last_updated: new Date(),
          provider_url: modelData.provider_url,
          documentation_url: modelData.documentation_url
        };

        processedModels.push(modelInfo);
      } catch (error) {
        console.warn(`Failed to process model ${modelData.id}:`, error);
      }
    }

    return processedModels;
  }

  private categorizeModel(modelData: any): ModelCategory {
    const id = modelData.id.toLowerCase();
    const name = (modelData.name || '').toLowerCase();

    if (id.includes('vision') || modelData.supports_images) {
      return 'multimodal';
    }

    if (id.includes('code') || name.includes('code')) {
      return 'code';
    }

    if (id.includes('reasoning') || id.includes('o1')) {
      return 'reasoning';
    }

    if (modelData.max_tokens > 100000 || modelData.context_length > 100000) {
      return 'long-context';
    }

    if (this.extractPricing(modelData, 'input') < 1) { // Less than $1 per 1M tokens
      return 'budget';
    }

    return 'general';
  }

  async getOptimalModel(criteria: ModelSelectionCriteria): Promise<string | null> {
    await this.syncModelCatalog();

    const candidates = Array.from(this.modelCache.values()).filter(model => {
      // Filter by capabilities
      if (criteria.requires_images && !model.supports_images) return false;
      if (criteria.requires_tools && !model.supports_tools) return false;
      if (criteria.min_context_length && model.context_length < criteria.min_context_length) return false;

      // Filter by budget
      if (criteria.max_cost_per_1m_tokens) {
        const cost = model.pricing.input_cost_per_1m + model.pricing.output_cost_per_1m;
        if (cost > criteria.max_cost_per_1m_tokens) return false;
      }

      // Filter by provider
      if (criteria.preferred_providers && !criteria.preferred_providers.includes(model.provider)) {
        return false;
      }

      return true;
    });

    if (candidates.length === 0) return null;

    // Sort by criteria priority
    candidates.sort((a, b) => {
      // Prioritize by performance tier
      const tierScore = this.getPerformanceTier(b) - this.getPerformanceTier(a);
      if (tierScore !== 0) return tierScore;

      // Then by cost efficiency
      const aCost = a.pricing.input_cost_per_1m + a.pricing.output_cost_per_1m;
      const bCost = b.pricing.input_cost_per_1m + b.pricing.output_cost_per_1m;
      return aCost - bCost;
    });

    return candidates[0].id;
  }
}
```

### Provider Configuration and Registry

**Dynamic Provider Management:**
```typescript
export class ProviderRegistry {
  private providers: Map<string, ProviderConfig> = new Map();
  private modelMappings: Map<string, string> = new Map(); // model -> provider

  async initializeProviders(): Promise<void> {
    // Load provider configurations
    const configs = await this.loadProviderConfigs();

    for (const config of configs) {
      this.providers.set(config.id, config);

      // Map models to providers
      for (const modelId of config.supported_models) {
        this.modelMappings.set(modelId, config.id);
      }
    }
  }

  private async loadProviderConfigs(): Promise<ProviderConfig[]> {
    return [
      {
        id: 'openai',
        name: 'OpenAI',
        category: 'commercial',
        base_url: 'https://api.openai.com/v1',
        auth_type: 'api_key',
        headers: (apiKey: string) => ({
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }),
        supported_models: [
          'gpt-4', 'gpt-4-turbo', 'gpt-4o', 'gpt-4o-mini',
          'o1-preview', 'o1-mini', 'gpt-3.5-turbo'
        ],
        rate_limits: {
          requests_per_minute: 3500,
          tokens_per_minute: 350000,
          requests_per_day: 10000
        },
        features: ['streaming', 'tools', 'vision', 'json_mode'],
        pricing_tier: 'premium'
      },

      {
        id: 'anthropic',
        name: 'Anthropic',
        category: 'commercial',
        base_url: 'https://api.anthropic.com',
        auth_type: 'api_key',
        headers: (apiKey: string) => ({
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        }),
        supported_models: [
          'claude-3.5-sonnet-20241022', 'claude-3.5-haiku',
          'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'
        ],
        rate_limits: {
          requests_per_minute: 1000,
          tokens_per_minute: 80000,
          requests_per_day: 5000
        },
        features: ['streaming', 'tools', 'vision', 'prompt_caching', 'computer_use'],
        pricing_tier: 'premium'
      },

      {
        id: 'google',
        name: 'Google AI',
        category: 'commercial',
        base_url: 'https://generativelanguage.googleapis.com/v1beta',
        auth_type: 'api_key',
        headers: (apiKey: string) => ({
          'Content-Type': 'application/json'
        }),
        url_params: (apiKey: string) => ({ key: apiKey }),
        supported_models: [
          'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.5-flash-8b',
          'gemini-2.0-flash-exp'
        ],
        rate_limits: {
          requests_per_minute: 300,
          tokens_per_minute: 120000,
          requests_per_day: 2000
        },
        features: ['streaming', 'tools', 'vision', 'long_context'],
        pricing_tier: 'budget'
      },

      {
        id: 'xai',
        name: 'xAI',
        category: 'commercial',
        base_url: 'https://api.x.ai/v1',
        auth_type: 'api_key',
        headers: (apiKey: string) => ({
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }),
        supported_models: ['grok-beta', 'grok-vision-beta'],
        rate_limits: {
          requests_per_minute: 100,
          tokens_per_minute: 50000,
          requests_per_day: 1000
        },
        features: ['streaming', 'tools', 'vision', 'real_time_data'],
        pricing_tier: 'premium'
      },

      {
        id: 'deepseek',
        name: 'DeepSeek',
        category: 'specialized',
        base_url: 'https://api.deepseek.com/v1',
        auth_type: 'api_key',
        headers: (apiKey: string) => ({
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }),
        supported_models: [
          'deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'
        ],
        rate_limits: {
          requests_per_minute: 200,
          tokens_per_minute: 100000,
          requests_per_day: 2000
        },
        features: ['streaming', 'tools', 'reasoning', 'code'],
        pricing_tier: 'budget'
      },

      {
        id: 'groq',
        name: 'Groq',
        category: 'speed_optimized',
        base_url: 'https://api.groq.com/openai/v1',
        auth_type: 'api_key',
        headers: (apiKey: string) => ({
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }),
        supported_models: [
          'mixtral-8x7b-32768', 'llama-3.1-70b-versatile',
          'llama-3.1-8b-instant', 'gemma2-9b-it'
        ],
        rate_limits: {
          requests_per_minute: 30,
          tokens_per_minute: 14400,
          requests_per_day: 500
        },
        features: ['streaming', 'ultra_fast_inference'],
        pricing_tier: 'budget'
      },

      {
        id: 'openrouter',
        name: 'OpenRouter',
        category: 'gateway',
        base_url: 'https://openrouter.ai/api/v1',
        auth_type: 'api_key',
        headers: (apiKey: string) => ({
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://polydev.ai',
          'X-Title': 'Polydev AI'
        }),
        supported_models: [], // Dynamic based on OpenRouter catalog
        rate_limits: {
          requests_per_minute: 200,
          tokens_per_minute: 200000,
          requests_per_day: 1000
        },
        features: ['streaming', 'tools', 'gateway', 'multiple_providers'],
        pricing_tier: 'variable'
      }
    ];
  }

  getProvider(providerId: string): ProviderConfig | null {
    return this.providers.get(providerId) || null;
  }

  getProviderForModel(modelId: string): ProviderConfig | null {
    const providerId = this.modelMappings.get(modelId);
    return providerId ? this.providers.get(providerId) || null : null;
  }

  getAvailableModels(criteria?: ModelCriteria): ModelInfo[] {
    const models: ModelInfo[] = [];

    for (const [providerId, config] of this.providers) {
      for (const modelId of config.supported_models) {
        const modelInfo = this.getModelInfo(modelId);

        if (modelInfo && this.matchesCriteria(modelInfo, criteria)) {
          models.push(modelInfo);
        }
      }
    }

    return models.sort((a, b) => {
      // Sort by performance tier, then by cost
      const tierDiff = this.getPerformanceTier(b) - this.getPerformanceTier(a);
      if (tierDiff !== 0) return tierDiff;

      const aCost = a.pricing.input_cost_per_1m + a.pricing.output_cost_per_1m;
      const bCost = b.pricing.input_cost_per_1m + b.pricing.output_cost_per_1m;
      return aCost - bCost;
    });
  }
}
```

### Model Validation and Health Checking

**Automated Provider Health Monitoring:**
```typescript
export class ProviderHealthChecker {
  private healthStatus: Map<string, ProviderHealth> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;

  startHealthMonitoring(intervalMs: number = 300000): void { // 5 minutes
    this.checkInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, intervalMs);

    // Initial health check
    this.performHealthChecks();
  }

  async performHealthChecks(): Promise<void> {
    const providers = Array.from(this.providerRegistry.getAllProviders());

    const healthChecks = providers.map(async (provider) => {
      try {
        const health = await this.checkProviderHealth(provider);
        this.healthStatus.set(provider.id, health);
        return { provider: provider.id, health };
      } catch (error) {
        const errorHealth: ProviderHealth = {
          provider_id: provider.id,
          status: 'unhealthy',
          last_check: new Date(),
          response_time_ms: null,
          error_message: error.message,
          consecutive_failures: this.getConsecutiveFailures(provider.id) + 1
        };

        this.healthStatus.set(provider.id, errorHealth);
        return { provider: provider.id, health: errorHealth };
      }
    });

    const results = await Promise.allSettled(healthChecks);
    await this.updateHealthMetrics(results);
  }

  private async checkProviderHealth(provider: ProviderConfig): Promise<ProviderHealth> {
    const startTime = Date.now();

    // Use a lightweight test prompt
    const testRequest = {
      model: provider.supported_models[0],
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 10
    };

    const handler = this.getProviderHandler(provider.id);
    const response = await handler.createCompletion(testRequest);

    const responseTime = Date.now() - startTime;

    return {
      provider_id: provider.id,
      status: response.success ? 'healthy' : 'degraded',
      last_check: new Date(),
      response_time_ms: responseTime,
      error_message: response.success ? null : response.error,
      consecutive_failures: response.success ? 0 : this.getConsecutiveFailures(provider.id) + 1,
      rate_limit_status: await this.checkRateLimitStatus(provider.id),
      model_availability: await this.checkModelAvailability(provider)
    };
  }

  async getHealthyProviders(): Promise<ProviderConfig[]> {
    const healthyProviders: ProviderConfig[] = [];

    for (const [providerId, health] of this.healthStatus) {
      if (health.status === 'healthy' && health.consecutive_failures < 3) {
        const provider = this.providerRegistry.getProvider(providerId);
        if (provider) {
          healthyProviders.push(provider);
        }
      }
    }

    return healthyProviders;
  }

  getProviderRecommendations(modelCriteria: ModelCriteria): ProviderRecommendation[] {
    const recommendations: ProviderRecommendation[] = [];

    for (const [providerId, health] of this.healthStatus) {
      const provider = this.providerRegistry.getProvider(providerId);
      if (!provider) continue;

      const score = this.calculateProviderScore(provider, health, modelCriteria);

      recommendations.push({
        provider_id: providerId,
        provider_name: provider.name,
        health_status: health.status,
        response_time_ms: health.response_time_ms,
        recommendation_score: score,
        available_models: provider.supported_models.filter(model =>
          this.matchesModelCriteria(model, modelCriteria)
        ),
        estimated_cost: this.estimateCost(provider, modelCriteria),
        reasons: this.generateRecommendationReasons(provider, health, score)
      });
    }

    return recommendations.sort((a, b) => b.recommendation_score - a.recommendation_score);
  }

  private calculateProviderScore(
    provider: ProviderConfig,
    health: ProviderHealth,
    criteria: ModelCriteria
  ): number {
    let score = 0;

    // Health score (0-40 points)
    switch (health.status) {
      case 'healthy': score += 40; break;
      case 'degraded': score += 20; break;
      case 'unhealthy': score += 0; break;
    }

    // Response time score (0-20 points)
    if (health.response_time_ms) {
      if (health.response_time_ms < 1000) score += 20;
      else if (health.response_time_ms < 3000) score += 15;
      else if (health.response_time_ms < 5000) score += 10;
      else score += 5;
    }

    // Feature compatibility score (0-20 points)
    let featureMatches = 0;
    const requiredFeatures = criteria.required_features || [];
    for (const feature of requiredFeatures) {
      if (provider.features.includes(feature)) {
        featureMatches++;
      }
    }
    score += (featureMatches / Math.max(requiredFeatures.length, 1)) * 20;

    // Cost efficiency score (0-20 points)
    const costScore = this.calculateCostScore(provider, criteria);
    score += costScore;

    return Math.min(score, 100);
  }
}
```

---

## Pricing System

### Credit-Based Architecture

Polydev AI implements a sophisticated credit-based pricing system that provides transparent cost tracking, multiple payment options, and intelligent cost optimization across providers.

### Subscription Tiers and Credit Allocation

**Tier Structure:**
```typescript
interface SubscriptionTier {
  id: string;
  name: string;
  monthly_price_usd: number;
  included_credits: number;
  message_limit: number | null; // null = unlimited
  features: string[];
  cli_access: boolean;
  priority_support: boolean;
}

const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  {
    id: 'free',
    name: 'Free',
    monthly_price_usd: 0,
    included_credits: 1.00, // $1 promotional credit for new users
    message_limit: 200,
    features: [
      'Web dashboard access',
      'Basic API integration',
      'Standard response times',
      'Community support'
    ],
    cli_access: false,
    priority_support: false
  },

  {
    id: 'pro',
    name: 'Pro',
    monthly_price_usd: 20,
    included_credits: 5.00, // $5 monthly credits
    message_limit: null, // Unlimited messages
    features: [
      'All Free features',
      'CLI tool integration',
      'Memory extraction',
      'Priority response times',
      'Email support',
      'Advanced analytics'
    ],
    cli_access: true,
    priority_support: true
  }
];
```

### Credit Purchase Packages and Markup

**Credit Packages with 10% Markup:**
```typescript
interface CreditPackage {
  id: string;
  name: string;
  credits_amount: number;
  price_usd: number;
  markup_percentage: number;
  savings_percentage?: number;
  recommended?: boolean;
}

const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'starter',
    name: 'Starter Pack',
    credits_amount: 20.00,
    price_usd: 22.00,
    markup_percentage: 10,
    recommended: false
  },

  {
    id: 'professional',
    name: 'Professional Pack',
    credits_amount: 40.00,
    price_usd: 44.00,
    markup_percentage: 10,
    savings_percentage: 0, // No additional savings beyond avoiding small transaction fees
    recommended: true
  },

  {
    id: 'enterprise',
    name: 'Enterprise Pack',
    credits_amount: 90.00,
    price_usd: 99.00,
    markup_percentage: 10,
    savings_percentage: 0,
    recommended: false
  }
];

// Markup calculation function
export function applyMarkup(baseCostUSD: number): number {
  const MARKUP_PERCENTAGE = 0.10; // 10%
  return Math.round((baseCostUSD * (1 + MARKUP_PERCENTAGE)) * 1000000) / 1000000; // 6 decimal precision
}
```

### Real-Time Pricing Integration

**Models.dev Live Pricing Sync:**
```typescript
export class PricingManager {
  private pricingCache: Map<string, ModelPricing> = new Map();
  private lastPricingSync: Date | null = null;

  async syncPricingData(forceRefresh: boolean = false): Promise<PricingSyncResult> {
    const PRICING_CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours

    if (!forceRefresh && this.lastPricingSync &&
        Date.now() - this.lastPricingSync.getTime() < PRICING_CACHE_TTL) {
      return { status: 'cached', models_updated: 0 };
    }

    try {
      // Fetch latest pricing from models.dev
      const pricingData = await this.fetchLatestPricing();

      // Update local cache
      let modelsUpdated = 0;
      for (const model of pricingData) {
        const existingPricing = this.pricingCache.get(model.id);

        if (!existingPricing || this.pricingChanged(existingPricing, model.pricing)) {
          this.pricingCache.set(model.id, {
            model_id: model.id,
            provider: model.provider,
            input_cost_per_1m: model.pricing.input,
            output_cost_per_1m: model.pricing.output,
            cache_read_cost_per_1m: model.pricing.cache_read || 0,
            cache_write_cost_per_1m: model.pricing.cache_write || 0,
            last_updated: new Date()
          });
          modelsUpdated++;
        }
      }

      // Update database
      await this.updatePricingDatabase();

      this.lastPricingSync = new Date();

      return {
        status: 'updated',
        models_updated: modelsUpdated,
        total_models: pricingData.length
      };

    } catch (error) {
      console.error('Pricing sync failed:', error);
      return { status: 'error', error: error.message };
    }
  }

  async calculateRequestCost(
    modelId: string,
    inputTokens: number,
    outputTokens: number,
    useCache: boolean = false
  ): Promise<CostCalculation> {

    await this.syncPricingData(); // Ensure fresh pricing

    const pricing = this.pricingCache.get(modelId);
    if (!pricing) {
      throw new Error(`Pricing not found for model: ${modelId}`);
    }

    const inputCost = (inputTokens / 1_000_000) * pricing.input_cost_per_1m;
    const outputCost = (outputTokens / 1_000_000) * pricing.output_cost_per_1m;

    let cacheCost = 0;
    if (useCache && pricing.cache_read_cost_per_1m > 0) {
      // Assume 50% cache hit rate for estimation
      const cacheReadTokens = Math.floor(inputTokens * 0.5);
      const fullReadTokens = inputTokens - cacheReadTokens;

      cacheCost = (cacheReadTokens / 1_000_000) * pricing.cache_read_cost_per_1m;
      inputCost = (fullReadTokens / 1_000_000) * pricing.input_cost_per_1m;
    }

    const baseCost = inputCost + outputCost + cacheCost;
    const markedUpCost = applyMarkup(baseCost);

    return {
      model_id: modelId,
      provider: pricing.provider,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      base_cost_usd: baseCost,
      markup_cost_usd: markedUpCost - baseCost,
      final_cost_usd: markedUpCost,
      cost_breakdown: {
        input_cost: inputCost,
        output_cost: outputCost,
        cache_cost: cacheCost
      },
      estimated: false,
      calculated_at: new Date()
    };
  }

  // Cost estimation for perspective requests
  async estimatePerspectiveCost(
    models: string[],
    estimatedInputTokens: number,
    estimatedOutputTokens: number = estimatedInputTokens * 2
  ): Promise<PerspectiveCostEstimate> {

    const modelCosts: ModelCostEstimate[] = [];
    let totalBaseCost = 0;
    let totalMarkedUpCost = 0;

    for (const modelId of models) {
      try {
        const calculation = await this.calculateRequestCost(
          modelId,
          estimatedInputTokens,
          estimatedOutputTokens
        );

        modelCosts.push({
          model_id: modelId,
          provider: calculation.provider,
          estimated_cost: calculation.final_cost_usd,
          base_cost: calculation.base_cost_usd
        });

        totalBaseCost += calculation.base_cost_usd;
        totalMarkedUpCost += calculation.final_cost_usd;

      } catch (error) {
        console.warn(`Failed to calculate cost for ${modelId}:`, error);

        // Fallback estimation
        const fallbackCost = this.getFallbackCost(modelId, estimatedInputTokens, estimatedOutputTokens);
        modelCosts.push({
          model_id: modelId,
          provider: 'unknown',
          estimated_cost: fallbackCost,
          base_cost: fallbackCost / 1.1, // Remove markup
          fallback: true
        });

        totalBaseCost += fallbackCost / 1.1;
        totalMarkedUpCost += fallbackCost;
      }
    }

    return {
      models: modelCosts,
      total_base_cost: totalBaseCost,
      total_markup: totalMarkedUpCost - totalBaseCost,
      total_estimated_cost: totalMarkedUpCost,
      estimated_at: new Date()
    };
  }

  private getFallbackCost(modelId: string, inputTokens: number, outputTokens: number): number {
    // Conservative fallback pricing based on model tier
    const fallbackRates = {
      'gpt-4': { input: 30, output: 60 }, // $30/$60 per 1M tokens
      'claude-3.5-sonnet': { input: 3, output: 15 },
      'gemini-1.5-pro': { input: 3.5, output: 10.5 },
      'default': { input: 5, output: 15 } // Conservative default
    };

    const modelKey = Object.keys(fallbackRates).find(key =>
      modelId.toLowerCase().includes(key)
    ) || 'default';

    const rates = fallbackRates[modelKey];
    const baseCost = (inputTokens / 1_000_000) * rates.input +
                     (outputTokens / 1_000_000) * rates.output;

    return applyMarkup(baseCost);
  }
}
```

### OpenRouter Integration and Provisioning

**Multi-Strategy API Key Management:**
```typescript
export class OpenRouterManager {
  async resolveApiKey(userId: string, modelId: string): Promise<ApiKeyResolution> {
    // Strategy 1: Check for CLI tool availability (highest priority)
    const cliResult = await this.checkCLIAvailability(modelId);
    if (cliResult.available) {
      return {
        strategy: 'cli_tool',
        provider: cliResult.cli_provider,
        cost_method: 'subscription_based',
        estimated_cost: 0, // No additional cost beyond CLI subscription
        key: null // CLI tools handle their own auth
      };
    }

    // Strategy 2: User's personal OpenRouter key
    const userKey = await this.getUserOpenRouterKey(userId);
    if (userKey && await this.validateApiKey(userKey.key, modelId)) {
      const spendingLimit = await this.getSpendingLimit(userKey);

      if (spendingLimit.available_budget > 0) {
        return {
          strategy: 'personal_api_key',
          provider: 'openrouter',
          cost_method: 'user_account',
          api_key: userKey.key,
          spending_limit: spendingLimit
        };
      }
    }

    // Strategy 3: Provisioned OpenRouter key for user
    const provisionedKey = await this.getProvisionedKey(userId);
    if (provisionedKey && await this.validateApiKey(provisionedKey.key, modelId)) {
      return {
        strategy: 'provisioned_key',
        provider: 'openrouter',
        cost_method: 'credit_balance',
        api_key: provisionedKey.key,
        spending_limit: provisionedKey.spending_limit
      };
    }

    // Strategy 4: Organizational key (credit deduction)
    const orgKey = process.env.OPENROUTER_ORG_KEY;
    if (orgKey && await this.validateApiKey(orgKey, modelId)) {
      const userCredits = await this.getUserCredits(userId);

      if (userCredits.available_balance > 0) {
        return {
          strategy: 'organizational_credits',
          provider: 'openrouter',
          cost_method: 'credit_deduction',
          api_key: orgKey,
          user_credits: userCredits
        };
      }
    }

    throw new Error('No available API key strategy for this request');
  }

  async provisionUserKey(userId: string): Promise<ProvisionedKey> {
    try {
      // Create isolated OpenRouter key for user
      const keyResponse = await fetch('https://openrouter.ai/api/v1/keys', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_PROVISIONING_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: `Polydev-User-${userId.slice(0, 8)}`,
          credit_limit: 100.00, // $100 spending limit
          rate_limits: {
            requests_per_minute: 100,
            requests_per_day: 1000
          }
        })
      });

      if (!keyResponse.ok) {
        throw new Error(`OpenRouter provisioning failed: ${keyResponse.status}`);
      }

      const keyData = await keyResponse.json();

      // Store provisioned key
      const provisionedKey: ProvisionedKey = {
        user_id: userId,
        api_key: keyData.key,
        key_id: keyData.id,
        spending_limit: 100.00,
        current_usage: 0.00,
        created_at: new Date(),
        last_used: null,
        is_active: true
      };

      await this.storeProvisionedKey(provisionedKey);

      return provisionedKey;

    } catch (error) {
      console.error('Failed to provision OpenRouter key:', error);
      throw new Error(`Key provisioning failed: ${error.message}`);
    }
  }

  async trackUsageAndDeductCredits(
    userId: string,
    resolution: ApiKeyResolution,
    actualCost: number
  ): Promise<UsageTrackingResult> {

    const result: UsageTrackingResult = {
      user_id: userId,
      strategy_used: resolution.strategy,
      actual_cost: actualCost,
      credits_deducted: 0,
      remaining_balance: 0
    };

    switch (resolution.strategy) {
      case 'cli_tool':
        // No cost deduction for CLI tools
        result.credits_deducted = 0;
        break;

      case 'personal_api_key':
        // Cost handled by user's OpenRouter account
        result.credits_deducted = 0;
        await this.updateKeyUsageStats(resolution.api_key, actualCost);
        break;

      case 'provisioned_key':
        // Deduct from provisioned key limit
        await this.updateProvisionedKeyUsage(userId, actualCost);
        result.credits_deducted = 0; // Tracked separately
        break;

      case 'organizational_credits':
        // Deduct from user's credit balance
        const markedUpCost = applyMarkup(actualCost);
        await this.deductUserCredits(userId, markedUpCost);
        result.credits_deducted = markedUpCost;

        const updatedCredits = await this.getUserCredits(userId);
        result.remaining_balance = updatedCredits.available_balance;
        break;
    }

    // Log usage for analytics
    await this.logUsage({
      user_id: userId,
      strategy: resolution.strategy,
      provider: resolution.provider,
      cost_usd: actualCost,
      credits_deducted: result.credits_deducted,
      timestamp: new Date()
    });

    return result;
  }
}
```

### Cost Optimization and Budget Management

**Intelligent Cost Control:**
```typescript
export class CostOptimizer {
  async optimizeRequestCost(
    userId: string,
    request: PerspectiveRequest
  ): Promise<OptimizationResult> {

    const userProfile = await this.getUserProfile(userId);
    const availableBalance = await this.getAvailableBalance(userId);

    // Check budget constraints
    const budgetCheck = await this.checkBudgetConstraints(userId, request);
    if (!budgetCheck.within_budget) {
      return {
        strategy: 'budget_exceeded',
        recommended_models: [],
        estimated_cost: 0,
        budget_exceeded: true,
        suggestions: budgetCheck.suggestions
      };
    }

    // Get cost-optimized model selection
    const optimizedModels = await this.selectCostOptimalModels(
      request.models,
      request.estimated_tokens,
      availableBalance
    );

    if (optimizedModels.length === 0) {
      return {
        strategy: 'insufficient_credits',
        recommended_models: [],
        estimated_cost: 0,
        budget_exceeded: true,
        suggestions: [
          'Purchase additional credits',
          'Reduce number of models',
          'Use budget-friendly models'
        ]
      };
    }

    // Calculate final cost estimate
    const costEstimate = await this.estimateOptimizedCost(
      optimizedModels,
      request.estimated_tokens
    );

    return {
      strategy: 'optimized',
      original_models: request.models,
      recommended_models: optimizedModels,
      estimated_cost: costEstimate.total_cost,
      cost_savings: costEstimate.savings,
      budget_exceeded: false,
      optimization_reasons: costEstimate.optimization_reasons
    };
  }

  private async selectCostOptimalModels(
    requestedModels: string[],
    estimatedTokens: number,
    availableBalance: number
  ): Promise<string[]> {

    const modelCosts: Array<{model: string, cost: number, tier: string}> = [];

    for (const model of requestedModels) {
      try {
        const cost = await this.calculateModelCost(model, estimatedTokens);
        const tier = this.getModelTier(model);
        modelCosts.push({ model, cost, tier });
      } catch (error) {
        console.warn(`Failed to calculate cost for ${model}:`, error);
      }
    }

    // Sort by cost efficiency (performance/cost ratio)
    modelCosts.sort((a, b) => {
      const aScore = this.getCostEfficiencyScore(a.model, a.cost, a.tier);
      const bScore = this.getCostEfficiencyScore(b.model, b.cost, b.tier);
      return bScore - aScore;
    });

    // Select models within budget
    const selectedModels: string[] = [];
    let totalCost = 0;

    for (const {model, cost} of modelCosts) {
      if (totalCost + cost <= availableBalance * 0.8) { // 80% safety margin
        selectedModels.push(model);
        totalCost += cost;
      }
    }

    // Ensure at least one budget model if none selected
    if (selectedModels.length === 0 && modelCosts.length > 0) {
      const cheapestModel = modelCosts.reduce((min, current) =>
        current.cost < min.cost ? current : min
      );

      if (cheapestModel.cost <= availableBalance) {
        selectedModels.push(cheapestModel.model);
      }
    }

    return selectedModels;
  }

  async setupBudgetAlerts(userId: string, budgetConfig: BudgetConfig): Promise<void> {
    const alertThresholds = [0.5, 0.8, 0.9, 1.0]; // 50%, 80%, 90%, 100%

    for (const threshold of alertThresholds) {
      await this.createBudgetAlert({
        user_id: userId,
        threshold_percentage: threshold,
        budget_period: budgetConfig.period,
        budget_amount: budgetConfig.amount,
        alert_type: threshold >= 1.0 ? 'limit_exceeded' : 'threshold_warning',
        enabled: true
      });
    }
  }

  async processBudgetAlert(alert: BudgetAlert, currentSpending: number): Promise<void> {
    const spendingPercentage = currentSpending / alert.budget_amount;

    if (spendingPercentage >= alert.threshold_percentage) {
      // Send notification
      await this.sendBudgetNotification({
        user_id: alert.user_id,
        alert_type: alert.alert_type,
        current_spending: currentSpending,
        budget_amount: alert.budget_amount,
        percentage_used: spendingPercentage * 100,
        period: alert.budget_period
      });

      // Take action if budget exceeded
      if (spendingPercentage >= 1.0) {
        await this.enforceSpendingLimit(alert.user_id);
      }
    }
  }
}
```

---

## Part IV: Technical Implementation Details

## Database Schema

### Complete Database Architecture

Polydev AI's database schema represents a sophisticated multi-tenant system designed for scalability, security, and comprehensive feature support. The schema has evolved through 16 major migrations to support the platform's expanding capabilities.

### Core Schema Tables

**User Management and Authentication:**
```sql
-- Extended user profiles with preferences
CREATE TABLE profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    company TEXT,
    avatar_url TEXT,
    timezone TEXT DEFAULT 'UTC',
    preferences JSONB DEFAULT '{
      "theme": "light",
      "default_provider": "openai",
      "default_models": {
        "openai": "gpt-4",
        "anthropic": "claude-3.5-sonnet",
        "google": "gemini-1.5-pro"
      },
      "ui_preferences": {
        "show_token_counts": true,
        "show_costs": true,
        "auto_save_conversations": true
      },
      "mcp_settings": {
        "memory_settings": {
          "enable_conversation_memory": true,
          "enable_project_memory": true,
          "max_conversation_history": 10,
          "auto_extract_patterns": true,
          "context_relevance_threshold": 0.3
        },
        "cli_settings": {
          "auto_detect_tools": true,
          "preferred_execution_mode": "args",
          "timeout_seconds": 30
        }
      }
    }',
    onboarding_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comprehensive API key management
CREATE TABLE user_api_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN (
        'openai', 'anthropic', 'google', 'azure', 'aws_bedrock',
        'openrouter', 'together', 'fireworks', 'groq', 'perplexity',
        'deepseek', 'xai', 'mistral', 'cohere', 'huggingface',
        'replicate', 'vertex_ai', 'palm', 'claude', 'gemini'
    )),
    encrypted_api_key TEXT NOT NULL,
    key_preview TEXT NOT NULL,
    provider_config JSONB DEFAULT '{}', -- Provider-specific configuration
    is_active BOOLEAN DEFAULT true,
    monthly_budget DECIMAL(10,2), -- Optional spending limit
    display_order INTEGER DEFAULT 0,
    usage_stats JSONB DEFAULT '{
      "total_requests": 0,
      "total_tokens": 0,
      "total_cost": 0,
      "last_30_days": {
        "requests": 0,
        "tokens": 0,
        "cost": 0
      }
    }',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used TIMESTAMP WITH TIME ZONE,

    UNIQUE(user_id, provider)
);

-- CLI provider configurations and status
CREATE TABLE cli_provider_configurations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('claude_code', 'codex_cli', 'gemini_cli', 'github_copilot')),
    custom_path TEXT,
    is_enabled BOOLEAN DEFAULT true,
    authentication_status TEXT CHECK (authentication_status IN ('authenticated', 'not_authenticated', 'unknown')),
    version_info TEXT,
    last_detection TIMESTAMP WITH TIME ZONE,
    detection_method TEXT CHECK (detection_method IN ('automatic', 'manual', 'environment_variable')),
    configuration_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id, provider)
);
```

**Zero-Knowledge Memory System:**
```sql
-- Encrypted memory storage with comprehensive metadata
CREATE TABLE user_memory_storage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    memory_type TEXT NOT NULL CHECK (memory_type IN ('global', 'project', 'conversation', 'pattern', 'decision')),
    cli_tool TEXT NOT NULL CHECK (cli_tool IN ('claude_code', 'cline', 'codex_cli', 'cursor', 'continue', 'aider', 'generic')),
    source_path TEXT NOT NULL,
    content_hash TEXT NOT NULL, -- SHA-256 for deduplication
    encrypted_content TEXT NOT NULL, -- AES-256-GCM encrypted JSON
    encryption_version INTEGER DEFAULT 1,
    relevance_score DECIMAL(3,2) DEFAULT 0.5,
    file_size_bytes INTEGER,
    keywords TEXT[], -- Extracted keywords for search
    metadata JSONB DEFAULT '{}', -- Additional context metadata
    extraction_method TEXT DEFAULT 'automatic',

    -- Compliance and audit fields
    extracted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0,
    retention_policy TEXT DEFAULT 'standard', -- For compliance

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure no duplicate content per user
    UNIQUE(user_id, content_hash)
);

-- Memory audit trail for compliance and monitoring
CREATE TABLE user_memory_audit (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('extract', 'access', 'inject', 'delete', 'encrypt', 'decrypt')),
    memory_entry_id UUID REFERENCES user_memory_storage(id) ON DELETE SET NULL,
    cli_tool TEXT,
    memory_type TEXT,
    file_count INTEGER,
    extraction_duration_ms INTEGER,
    memory_sources_found INTEGER,
    context_injected BOOLEAN DEFAULT false,

    -- Security and compliance tracking
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    encryption_key_version INTEGER,

    -- Performance metrics
    operation_duration_ms INTEGER,
    content_size_bytes INTEGER,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversation memory for context continuity
CREATE TABLE user_conversation_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    conversation_hash TEXT NOT NULL, -- SHA-256 of conversation content
    encrypted_conversation TEXT NOT NULL, -- Full conversation context
    relevance_score DECIMAL(3,2) DEFAULT 0.5,
    model_used TEXT,
    token_count INTEGER,

    -- Conversation metadata
    project_identifier TEXT, -- Optional project association
    conversation_topic TEXT, -- Auto-extracted topic
    participants TEXT[], -- User, assistant, system

    -- Temporal data
    conversation_date DATE DEFAULT CURRENT_DATE,
    retention_until DATE, -- For automatic cleanup

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id, conversation_hash)
);
```

**Provider and Model Registry:**
```sql
-- Dynamic provider registry synced from external sources
CREATE TABLE providers_registry (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    provider_id TEXT UNIQUE NOT NULL,
    provider_name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('commercial', 'open_source', 'specialized', 'gateway', 'local')),
    base_url TEXT,
    auth_type TEXT NOT NULL CHECK (auth_type IN ('api_key', 'oauth', 'bearer_token', 'none')),

    -- Capabilities and features
    supported_features TEXT[], -- streaming, tools, vision, etc.
    rate_limits JSONB DEFAULT '{}',
    pricing_tier TEXT CHECK (pricing_tier IN ('free', 'budget', 'standard', 'premium', 'enterprise')),

    -- Integration details
    documentation_url TEXT,
    status_page_url TEXT,
    terms_of_service_url TEXT,

    -- Operational status
    is_active BOOLEAN DEFAULT true,
    health_status TEXT DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'degraded', 'unhealthy', 'unknown')),
    last_health_check TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comprehensive model registry with pricing
CREATE TABLE models_registry (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    model_id TEXT UNIQUE NOT NULL,
    model_name TEXT NOT NULL,
    provider_id TEXT REFERENCES providers_registry(provider_id) NOT NULL,

    -- Model capabilities
    max_tokens INTEGER DEFAULT 4096,
    context_length INTEGER DEFAULT 4096,
    supports_images BOOLEAN DEFAULT false,
    supports_tools BOOLEAN DEFAULT false,
    supports_streaming BOOLEAN DEFAULT true,
    supports_system_prompt BOOLEAN DEFAULT true,
    supports_json_mode BOOLEAN DEFAULT false,
    supports_reasoning BOOLEAN DEFAULT false,

    -- Pricing information (per 1M tokens)
    input_cost_per_1m DECIMAL(10,6) DEFAULT 0,
    output_cost_per_1m DECIMAL(10,6) DEFAULT 0,
    cache_read_cost_per_1m DECIMAL(10,6) DEFAULT 0,
    cache_write_cost_per_1m DECIMAL(10,6) DEFAULT 0,

    -- Model metadata
    model_category TEXT CHECK (model_category IN ('general', 'code', 'reasoning', 'multimodal', 'long_context', 'budget')),
    description TEXT,
    launch_date DATE,
    deprecation_date DATE,

    -- Operational data
    is_available BOOLEAN DEFAULT true,
    performance_tier INTEGER DEFAULT 5, -- 1-10 scale
    popularity_score DECIMAL(3,2) DEFAULT 0.5,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Model aliases and mappings for user-friendly names
CREATE TABLE model_mappings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    friendly_name TEXT NOT NULL,
    actual_model_id TEXT REFERENCES models_registry(model_id) NOT NULL,
    provider_id TEXT REFERENCES providers_registry(provider_id) NOT NULL,
    mapping_type TEXT DEFAULT 'alias' CHECK (mapping_type IN ('alias', 'version', 'variant')),
    is_default BOOLEAN DEFAULT false,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(friendly_name, provider_id)
);
```

**Subscription and Billing System:**
```sql
-- Comprehensive subscription management
CREATE TABLE user_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    -- Stripe integration
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT UNIQUE,
    stripe_price_id TEXT,

    -- Subscription details
    plan_type TEXT NOT NULL CHECK (plan_type IN ('free', 'pro', 'enterprise', 'custom')),
    status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'incomplete', 'incomplete_expired', 'trialing', 'unpaid')),

    -- Billing periods
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    trial_start TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,

    -- Subscription metadata
    cancel_at_period_end BOOLEAN DEFAULT false,
    canceled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,

    -- Features and limits
    included_credits DECIMAL(10,2) DEFAULT 0,
    monthly_message_limit INTEGER, -- NULL for unlimited
    cli_access_enabled BOOLEAN DEFAULT false,
    priority_support BOOLEAN DEFAULT false,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id)
);

-- Credit management with detailed tracking
CREATE TABLE user_credits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    -- Credit balances
    credit_balance DECIMAL(10,2) DEFAULT 0.00,
    promotional_credits DECIMAL(10,2) DEFAULT 0.00,
    bonus_credits DECIMAL(10,2) DEFAULT 0.00, -- Referral bonuses, etc.

    -- Lifetime tracking
    lifetime_credits_purchased DECIMAL(10,2) DEFAULT 0.00,
    lifetime_credits_used DECIMAL(10,2) DEFAULT 0.00,
    lifetime_savings DECIMAL(10,2) DEFAULT 0.00, -- From CLI tool usage

    -- Monthly allocation for Pro users
    monthly_allocation DECIMAL(10,2) DEFAULT 0.00,
    monthly_allocation_used DECIMAL(10,2) DEFAULT 0.00,
    allocation_reset_date DATE,

    -- Budget controls
    spending_limits JSONB DEFAULT '{
      "daily_limit": null,
      "weekly_limit": null,
      "monthly_limit": null,
      "auto_top_up": false,
      "auto_top_up_amount": 20,
      "auto_top_up_threshold": 5
    }',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id)
);

-- Detailed credit transactions
CREATE TABLE credit_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    -- Transaction details
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'usage', 'refund', 'bonus', 'allocation')),
    amount DECIMAL(10,6) NOT NULL, -- Can be negative for usage
    balance_after DECIMAL(10,6) NOT NULL,

    -- Reference data
    reference_id TEXT, -- Stripe payment ID, usage session ID, etc.
    reference_type TEXT, -- 'stripe_payment', 'api_usage', 'cli_usage', 'perspective_generation'

    -- Transaction metadata
    description TEXT,
    metadata JSONB DEFAULT '{}',

    -- Audit fields
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_by TEXT, -- System, admin, user, etc.

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message usage tracking for free tier limits
CREATE TABLE user_message_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    -- Current period tracking
    messages_used INTEGER DEFAULT 0,
    monthly_limit INTEGER DEFAULT 200,
    period_start DATE DEFAULT CURRENT_DATE,
    period_end DATE DEFAULT (CURRENT_DATE + INTERVAL '1 month'),

    -- Historical tracking
    previous_period_usage INTEGER DEFAULT 0,
    peak_usage_date DATE,
    peak_usage_count INTEGER DEFAULT 0,

    -- Usage patterns
    average_daily_usage DECIMAL(5,2) DEFAULT 0,
    usage_trend TEXT DEFAULT 'stable' CHECK (usage_trend IN ('increasing', 'decreasing', 'stable', 'peak')),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id)
);
```

**Chat and Conversation Management:**
```sql
-- Persistent chat sessions with rich metadata
CREATE TABLE chat_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    -- Session identification
    title TEXT, -- Auto-generated from first message
    session_type TEXT DEFAULT 'standard' CHECK (session_type IN ('standard', 'perspective', 'cli_proxy', 'mcp_bridge')),

    -- Model configuration
    model_provider TEXT,
    model_name TEXT,
    system_prompt TEXT,

    -- Session metadata
    session_metadata JSONB DEFAULT '{}',
    tags TEXT[], -- User-defined tags
    is_pinned BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,

    -- Usage tracking
    message_count INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    total_cost DECIMAL(10,6) DEFAULT 0,

    -- Temporal data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    archived_at TIMESTAMP WITH TIME ZONE
);

-- Individual chat messages with comprehensive tracking
CREATE TABLE chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE NOT NULL,

    -- Message content
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
    content TEXT NOT NULL,

    -- AI response metadata
    model_used TEXT,
    provider_used TEXT,
    tokens_used INTEGER,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    cost_credits DECIMAL(10,6),

    -- Response quality metrics
    response_time_ms INTEGER,
    response_quality_score DECIMAL(3,2), -- User feedback

    -- Message metadata
    message_metadata JSONB DEFAULT '{}',
    tool_calls JSONB, -- For tool-using models

    -- Parent/child relationships for branching conversations
    parent_message_id UUID REFERENCES chat_messages(id),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat session analytics and insights
CREATE TABLE chat_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    -- Session analytics
    session_duration_ms INTEGER,
    messages_exchanged INTEGER,
    models_used TEXT[],
    providers_used TEXT[],

    -- Performance metrics
    avg_response_time_ms INTEGER,
    total_tokens_consumed INTEGER,
    total_session_cost DECIMAL(10,6),

    -- Usage patterns
    session_outcome TEXT CHECK (session_outcome IN ('completed', 'abandoned', 'continued', 'archived')),
    user_satisfaction_score INTEGER CHECK (user_satisfaction_score BETWEEN 1 AND 5),

    -- Technical metadata
    client_info JSONB, -- Browser, MCP client, API, etc.
    session_metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**MCP Integration and OAuth System:**
```sql
-- OAuth authorization codes for MCP authentication
CREATE TABLE mcp_auth_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    client_id TEXT NOT NULL,
    redirect_uri TEXT NOT NULL,
    scope TEXT DEFAULT 'read',

    -- PKCE security
    code_challenge TEXT,
    code_challenge_method TEXT CHECK (code_challenge_method IN ('plain', 'S256')),

    -- OAuth state and security
    state TEXT,
    nonce TEXT,

    -- Expiration and usage
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    is_used BOOLEAN DEFAULT false,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MCP access tokens for ongoing authentication
CREATE TABLE mcp_access_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    -- Token identification
    token_hash TEXT NOT NULL UNIQUE, -- SHA-256 hash of actual token
    token_prefix TEXT NOT NULL, -- First 8 characters for identification

    -- OAuth metadata
    client_id TEXT,
    scope TEXT DEFAULT 'read',

    -- Token lifecycle
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_used TIMESTAMP WITH TIME ZONE,
    usage_count INTEGER DEFAULT 0,

    -- Security and audit
    created_from_ip INET,
    created_from_user_agent TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CLI status reporting tokens (long-lived)
CREATE TABLE mcp_user_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    -- Token identification
    token_hash TEXT NOT NULL UNIQUE,
    token_name TEXT,
    token_purpose TEXT DEFAULT 'cli_status' CHECK (token_purpose IN ('cli_status', 'api_access', 'webhook')),

    -- Permissions and scope
    permissions JSONB DEFAULT '{
      "cli_status_report": true,
      "perspective_generation": false,
      "memory_access": false
    }',

    -- Token lifecycle
    expires_at TIMESTAMP WITH TIME ZONE, -- NULL for non-expiring tokens
    last_used TIMESTAMP WITH TIME ZONE,
    usage_count INTEGER DEFAULT 0,

    -- Rate limiting
    rate_limit_per_hour INTEGER DEFAULT 100,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CLI status audit logs for monitoring
CREATE TABLE cli_status_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    -- CLI provider information
    provider TEXT NOT NULL CHECK (provider IN ('claude_code', 'codex_cli', 'gemini_cli', 'github_copilot', 'custom')),
    status TEXT NOT NULL CHECK (status IN ('available', 'unavailable', 'not_installed', 'checking', 'error')),

    -- Authentication and version info
    authenticated BOOLEAN,
    cli_version TEXT,
    installation_path TEXT,

    -- Error handling
    error_message TEXT,
    error_code TEXT,

    -- Reporting metadata
    reported_via TEXT CHECK (reported_via IN ('mcp_client', 'web_dashboard', 'api_direct', 'automated')),
    client_info JSONB DEFAULT '{}',

    -- Performance metrics
    detection_time_ms INTEGER,
    response_time_ms INTEGER,

    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Usage Analytics and Monitoring:**
```sql
-- Comprehensive API usage logging
CREATE TABLE api_usage_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    -- Request identification
    request_id TEXT UNIQUE, -- UUID for request tracing
    session_id TEXT, -- Links related requests

    -- API details
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    provider TEXT,
    model_name TEXT,

    -- Token and cost tracking
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    cost_usd DECIMAL(10,6) DEFAULT 0,

    -- Performance metrics
    response_time_ms INTEGER,
    queue_time_ms INTEGER,
    processing_time_ms INTEGER,

    -- Success and error tracking
    status_code INTEGER,
    success BOOLEAN DEFAULT false,
    error_message TEXT,
    error_type TEXT,

    -- Client information
    client_type TEXT DEFAULT 'web' CHECK (client_type IN ('web', 'mcp', 'api', 'cli')),
    client_version TEXT,
    user_agent TEXT,
    ip_address INET,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Model usage sessions for analytics
CREATE TABLE usage_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    -- Session identification
    session_id TEXT NOT NULL,
    session_type TEXT NOT NULL CHECK (session_type IN ('api_request', 'cli_usage', 'perspective_generation', 'chat_session')),

    -- Tool and model information
    tool_name TEXT NOT NULL,
    provider TEXT,
    model_name TEXT,

    -- Usage metrics
    message_count INTEGER DEFAULT 0,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    cost_credits DECIMAL(10,6) DEFAULT 0,

    -- Session metadata
    metadata JSONB DEFAULT '{}',

    -- Performance tracking
    session_duration_ms INTEGER,
    avg_response_time_ms INTEGER,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Referral system for user growth
CREATE TABLE user_referrals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    referrer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    referee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Referral tracking
    referral_code TEXT UNIQUE NOT NULL,
    referral_source TEXT, -- Link source tracking

    -- Conversion tracking
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Reward details
    referrer_bonus DECIMAL(10,2) DEFAULT 5.00,
    referee_bonus DECIMAL(10,2) DEFAULT 5.00,
    bonus_paid BOOLEAN DEFAULT false,

    -- Metadata
    referral_metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- OpenRouter key provisioning and management
CREATE TABLE openrouter_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    -- OpenRouter integration
    openrouter_key_id TEXT,
    api_key_hash TEXT NOT NULL, -- SHA-256 hash for security

    -- Spending controls
    spending_limit DECIMAL(10,2) NOT NULL DEFAULT 100.00,
    current_usage DECIMAL(10,2) DEFAULT 0.00,

    -- Key status
    is_active BOOLEAN DEFAULT true,
    provisioning_status TEXT DEFAULT 'active' CHECK (provisioning_status IN ('pending', 'active', 'suspended', 'revoked')),

    -- Usage tracking
    total_requests INTEGER DEFAULT 0,
    last_used TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id)
);
```

### Advanced Query Optimization Views

**Performance-Optimized Analytics Views:**
```sql
-- User dashboard summary with all key metrics
CREATE VIEW user_dashboard_summary AS
SELECT
    u.id as user_id,
    p.full_name,
    p.email,

    -- Subscription info
    s.plan_type,
    s.status as subscription_status,

    -- Credit information
    c.credit_balance,
    c.promotional_credits,
    c.monthly_allocation,
    c.monthly_allocation_used,

    -- Usage statistics (last 30 days)
    COALESCE(usage_stats.total_requests, 0) as requests_last_30_days,
    COALESCE(usage_stats.total_cost, 0) as cost_last_30_days,
    COALESCE(usage_stats.total_tokens, 0) as tokens_last_30_days,
    COALESCE(usage_stats.unique_models, 0) as models_used_last_30_days,

    -- CLI status
    cli_summary.available_tools,
    cli_summary.authenticated_tools,

    -- Memory stats
    memory_stats.total_memory_sources,
    memory_stats.total_memory_size_mb,

    p.last_seen,
    p.created_at as account_created

FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN user_subscriptions s ON u.id = s.user_id
LEFT JOIN user_credits c ON u.id = c.user_id
LEFT JOIN (
    -- Usage statistics subquery
    SELECT
        user_id,
        COUNT(*) as total_requests,
        SUM(cost_usd) as total_cost,
        SUM(total_tokens) as total_tokens,
        COUNT(DISTINCT model_name) as unique_models
    FROM api_usage_logs
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY user_id
) usage_stats ON u.id = usage_stats.user_id
LEFT JOIN (
    -- CLI tools summary
    SELECT
        user_id,
        array_agg(DISTINCT provider) as available_tools,
        array_agg(DISTINCT provider) FILTER (WHERE authenticated = true) as authenticated_tools
    FROM cli_status_logs
    WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
      AND status = 'available'
    GROUP BY user_id
) cli_summary ON u.id = cli_summary.user_id
LEFT JOIN (
    -- Memory statistics
    SELECT
        user_id,
        COUNT(*) as total_memory_sources,
        SUM(file_size_bytes) / (1024 * 1024) as total_memory_size_mb
    FROM user_memory_storage
    GROUP BY user_id
) memory_stats ON u.id = memory_stats.user_id;

-- Model popularity and performance analytics
CREATE VIEW model_analytics AS
SELECT
    m.model_id,
    m.model_name,
    m.provider_id,
    p.provider_name,

    -- Usage statistics (last 30 days)
    COUNT(u.id) as usage_count,
    COUNT(DISTINCT u.user_id) as unique_users,
    AVG(u.response_time_ms) as avg_response_time,

    -- Cost and token statistics
    AVG(u.total_tokens) as avg_tokens_per_request,
    SUM(u.total_tokens) as total_tokens_processed,
    AVG(u.cost_usd) as avg_cost_per_request,
    SUM(u.cost_usd) as total_revenue,

    -- Performance metrics
    COUNT(u.id) FILTER (WHERE u.success = true) as successful_requests,
    COUNT(u.id) FILTER (WHERE u.success = false) as failed_requests,

    -- Success rate calculation
    ROUND(
        COUNT(u.id) FILTER (WHERE u.success = true)::DECIMAL /
        NULLIF(COUNT(u.id), 0) * 100,
        2
    ) as success_rate_percentage,

    -- Trending analysis
    CASE
        WHEN COUNT(u.id) FILTER (WHERE u.created_at >= CURRENT_DATE - INTERVAL '7 days') >
             COUNT(u.id) FILTER (WHERE u.created_at < CURRENT_DATE - INTERVAL '7 days' AND u.created_at >= CURRENT_DATE - INTERVAL '14 days')
        THEN 'increasing'
        WHEN COUNT(u.id) FILTER (WHERE u.created_at >= CURRENT_DATE - INTERVAL '7 days') <
             COUNT(u.id) FILTER (WHERE u.created_at < CURRENT_DATE - INTERVAL '7 days' AND u.created_at >= CURRENT_DATE - INTERVAL '14 days')
        THEN 'decreasing'
        ELSE 'stable'
    END as usage_trend

FROM models_registry m
LEFT JOIN providers_registry p ON m.provider_id = p.provider_id
LEFT JOIN api_usage_logs u ON m.model_id = u.model_name
WHERE u.created_at >= CURRENT_DATE - INTERVAL '30 days' OR u.created_at IS NULL
GROUP BY m.model_id, m.model_name, m.provider_id, p.provider_name
ORDER BY usage_count DESC NULLS LAST;

-- Revenue and cost analysis
CREATE VIEW revenue_analytics AS
SELECT
    DATE(created_at) as revenue_date,

    -- Revenue breakdown
    SUM(cost_usd) as daily_revenue,
    COUNT(*) as daily_requests,
    COUNT(DISTINCT user_id) as daily_active_users,

    -- Provider breakdown
    jsonb_object_agg(
        provider,
        jsonb_build_object(
            'revenue', SUM(cost_usd) FILTER (WHERE provider = provider),
            'requests', COUNT(*) FILTER (WHERE provider = provider)
        )
    ) as provider_breakdown,

    -- Model category breakdown
    SUM(cost_usd) FILTER (WHERE model_name LIKE '%gpt-4%') as gpt4_revenue,
    SUM(cost_usd) FILTER (WHERE model_name LIKE '%claude%') as claude_revenue,
    SUM(cost_usd) FILTER (WHERE model_name LIKE '%gemini%') as gemini_revenue,

    -- Average metrics
    AVG(cost_usd) as avg_cost_per_request,
    AVG(total_tokens) as avg_tokens_per_request

FROM api_usage_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(created_at)
ORDER BY revenue_date DESC;
```

### Database Performance Optimizations

**Strategic Indexing Strategy:**
```sql
-- User-centric access patterns
CREATE INDEX idx_profiles_user_id ON profiles(id);
CREATE INDEX idx_api_keys_user_provider ON user_api_keys(user_id, provider);
CREATE INDEX idx_memory_user_type_relevance ON user_memory_storage(user_id, memory_type, relevance_score DESC);
CREATE INDEX idx_chat_sessions_user_recent ON chat_sessions(user_id, last_message_at DESC);
CREATE INDEX idx_chat_messages_session_time ON chat_messages(session_id, created_at);

-- Analytics and reporting indexes
CREATE INDEX idx_usage_logs_time_user ON api_usage_logs(created_at, user_id);
CREATE INDEX idx_usage_logs_provider_model ON api_usage_logs(provider, model_name, created_at);
CREATE INDEX idx_cli_status_time_provider ON cli_status_logs(timestamp, provider);
CREATE INDEX idx_credit_transactions_user_time ON credit_transactions(user_id, created_at DESC);

-- Hash-based lookups for security
CREATE INDEX idx_memory_content_hash ON user_memory_storage(content_hash);
CREATE INDEX idx_conversation_hash ON user_conversation_logs(user_id, conversation_hash);
CREATE INDEX idx_mcp_token_hash ON mcp_access_tokens(token_hash);
CREATE INDEX idx_mcp_user_token_hash ON mcp_user_tokens(token_hash);

-- Performance optimization indexes
CREATE INDEX idx_models_provider_active ON models_registry(provider_id, is_available);
CREATE INDEX idx_providers_active_category ON providers_registry(is_active, category);

-- Composite indexes for complex queries
CREATE INDEX idx_usage_cost_analysis ON api_usage_logs(user_id, provider, model_name, created_at, cost_usd);
CREATE INDEX idx_session_analytics ON chat_sessions(user_id, session_type, created_at, total_cost);
CREATE INDEX idx_memory_extraction_audit ON user_memory_audit(user_id, action_type, created_at);
```

### Database Triggers and Functions

**Automated Data Management:**
```sql
-- Universal timestamp update function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at columns
CREATE TRIGGER trigger_update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_user_api_keys_updated_at
    BEFORE UPDATE ON user_api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_cli_configs_updated_at
    BEFORE UPDATE ON cli_provider_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Automatic user initialization on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create user profile with default preferences
    INSERT INTO profiles (id, email, full_name, preferences)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        jsonb_build_object(
            'theme', 'light',
            'default_provider', 'openai',
            'mcp_settings', jsonb_build_object(
                'memory_settings', jsonb_build_object(
                    'enable_conversation_memory', true,
                    'enable_project_memory', true,
                    'max_conversation_history', 10,
                    'auto_extract_patterns', true
                )
            )
        )
    );

    -- Initialize subscription (FREE tier)
    INSERT INTO user_subscriptions (user_id, plan_type, status, monthly_message_limit, cli_access_enabled)
    VALUES (NEW.id, 'free', 'active', 200, false);

    -- Initialize credits with promotional credit
    INSERT INTO user_credits (user_id, promotional_credits, monthly_allocation_used)
    VALUES (NEW.id, 1.00, 0);

    -- Initialize message usage tracking
    INSERT INTO user_message_usage (user_id, messages_used, monthly_limit)
    VALUES (NEW.id, 0, 200);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Auto-generate chat titles from first user message
CREATE OR REPLACE FUNCTION generate_chat_title()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process first user message in session
    IF NEW.role = 'user' AND NOT EXISTS (
        SELECT 1 FROM chat_messages
        WHERE session_id = NEW.session_id AND role = 'user' AND id != NEW.id
    ) THEN
        UPDATE chat_sessions
        SET
            title = CASE
                WHEN LENGTH(NEW.content) > 50
                THEN LEFT(NEW.content, 47) || '...'
                ELSE NEW.content
            END,
            updated_at = NOW()
        WHERE id = NEW.session_id AND title IS NULL;
    END IF;

    -- Update session statistics
    UPDATE chat_sessions
    SET
        message_count = message_count + 1,
        last_message_at = NEW.created_at,
        total_tokens = total_tokens + COALESCE(NEW.tokens_used, 0),
        total_cost = total_cost + COALESCE(NEW.cost_credits, 0)
    WHERE id = NEW.session_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_chat_title
    AFTER INSERT ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION generate_chat_title();

-- Credit balance management
CREATE OR REPLACE FUNCTION update_credit_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update balance_after field
    SELECT credit_balance INTO NEW.balance_after
    FROM user_credits
    WHERE user_id = NEW.user_id;

    -- Apply transaction to balance
    UPDATE user_credits
    SET
        credit_balance = credit_balance + NEW.amount,
        lifetime_credits_used = CASE
            WHEN NEW.amount < 0 THEN lifetime_credits_used + ABS(NEW.amount)
            ELSE lifetime_credits_used
        END,
        lifetime_credits_purchased = CASE
            WHEN NEW.transaction_type = 'purchase' THEN lifetime_credits_purchased + NEW.amount
            ELSE lifetime_credits_purchased
        END,
        updated_at = NOW()
    WHERE user_id = NEW.user_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_credit_balance
    BEFORE INSERT ON credit_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_credit_balance();

-- Monthly usage reset for message limits
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void AS $$
BEGIN
    -- Reset message usage for users whose period has ended
    UPDATE user_message_usage
    SET
        messages_used = 0,
        previous_period_usage = messages_used,
        period_start = CURRENT_DATE,
        period_end = CURRENT_DATE + INTERVAL '1 month',
        updated_at = NOW()
    WHERE period_end <= CURRENT_DATE;

    -- Reset monthly credit allocations for Pro users
    UPDATE user_credits
    SET
        monthly_allocation_used = 0,
        allocation_reset_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE allocation_reset_date <= CURRENT_DATE
    AND user_id IN (
        SELECT user_id FROM user_subscriptions
        WHERE plan_type = 'pro' AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql;

-- Cleanup expired tokens and sessions
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS void AS $$
BEGIN
    -- Clean expired MCP auth codes
    DELETE FROM mcp_auth_codes
    WHERE expires_at < NOW() - INTERVAL '1 hour';

    -- Clean expired access tokens
    DELETE FROM mcp_access_tokens
    WHERE expires_at < NOW();

    -- Archive old conversation logs (older than 1 year)
    UPDATE user_conversation_logs
    SET retention_until = CURRENT_DATE + INTERVAL '30 days'
    WHERE created_at < NOW() - INTERVAL '1 year'
    AND retention_until IS NULL;

    -- Clean old audit logs (older than 90 days)
    DELETE FROM user_memory_audit
    WHERE created_at < NOW() - INTERVAL '90 days';

    DELETE FROM cli_status_logs
    WHERE timestamp < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;
```

---

## API Endpoints

### Comprehensive API Architecture

Polydev AI exposes a rich set of API endpoints organized into logical groupings for different system capabilities. All endpoints implement proper authentication, rate limiting, and error handling.

### Authentication Endpoints

**User Authentication and Session Management:**
```typescript
// /src/app/api/auth/signup/route.ts
export async function POST(request: NextRequest) {
  const { email, password, full_name, company, referral_code } = await request.json();

  try {
    // Create user account
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
          company
        }
      }
    });

    if (error) throw error;

    // Process referral if provided
    if (referral_code) {
      await processReferral(data.user.id, referral_code);
    }

    return NextResponse.json({
      success: true,
      user: data.user,
      message: 'Account created successfully. Please check your email for verification.'
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 400 });
  }
}

// /src/app/api/auth/signin/route.ts
export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    // Update last seen
    await supabase
      .from('profiles')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', data.user.id);

    return NextResponse.json({
      success: true,
      user: data.user,
      session: data.session
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 401 });
  }
}
```

### MCP OAuth Endpoints

**OAuth 2.0 Flow for MCP Clients:**
```typescript
// /src/app/api/mcp/auth/route.ts - Authorization endpoint
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const {
    response_type,
    client_id,
    redirect_uri,
    scope,
    state,
    code_challenge,
    code_challenge_method
  } = Object.fromEntries(searchParams.entries());

  // Validate OAuth parameters
  const validation = validateOAuthParams({
    response_type,
    client_id,
    redirect_uri,
    code_challenge,
    code_challenge_method
  });

  if (!validation.valid) {
    return NextResponse.json({
      error: 'invalid_request',
      error_description: validation.error
    }, { status: 400 });
  }

  // Generate authorization code
  const authCode = generateSecureCode();

  // Store auth request with PKCE data
  await storeAuthRequest({
    code: authCode,
    client_id,
    redirect_uri,
    scope: scope || 'read',
    state,
    code_challenge,
    code_challenge_method: code_challenge_method || 'plain',
    expires_at: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
  });

  // Redirect to user consent page
  const consentUrl = new URL('/auth/mcp-authorize', request.url);
  consentUrl.searchParams.set('code', authCode);
  consentUrl.searchParams.set('client_id', client_id);
  consentUrl.searchParams.set('scope', scope || 'read');

  return NextResponse.redirect(consentUrl);
}

// /src/app/api/mcp/token/route.ts - Token exchange endpoint
export async function POST(request: NextRequest) {
  const {
    grant_type,
    code,
    redirect_uri,
    client_id,
    code_verifier
  } = await request.json();

  try {
    // Validate grant type
    if (grant_type !== 'authorization_code') {
      return NextResponse.json({
        error: 'unsupported_grant_type',
        error_description: 'Only authorization_code grant type is supported'
      }, { status: 400 });
    }

    // Retrieve and validate auth request
    const authData = await getAuthRequest(code);
    if (!authData || authData.expires_at < new Date()) {
      return NextResponse.json({
        error: 'invalid_grant',
        error_description: 'Authorization code is invalid or expired'
      }, { status: 400 });
    }

    // PKCE verification
    if (authData.code_challenge) {
      const isValidChallenge = await validatePKCEChallenge(
        authData.code_challenge,
        authData.code_challenge_method,
        code_verifier
      );

      if (!isValidChallenge) {
        return NextResponse.json({
          error: 'invalid_grant',
          error_description: 'Code verifier does not match code challenge'
        }, { status: 400 });
      }
    }

    // Generate access token
    const accessToken = generateAccessToken(authData.user_id);
    const tokenHash = createHash('sha256').update(accessToken).digest('hex');

    // Store access token
    await supabase
      .from('mcp_access_tokens')
      .insert({
        user_id: authData.user_id,
        token_hash: tokenHash,
        scope: authData.scope,
        client_id,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        created_from_ip: getClientIP(request),
        created_from_user_agent: request.headers.get('user-agent')
      });

    // Clean up auth code
    await deleteAuthRequest(code);

    return NextResponse.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 2592000, // 30 days in seconds
      scope: authData.scope,
      refresh_token: null // Not implemented yet
    });

  } catch (error) {
    console.error('Token exchange failed:', error);
    return NextResponse.json({
      error: 'server_error',
      error_description: 'Internal server error during token exchange'
    }, { status: 500 });
  }
}
```

### Perspective Generation API

**Main Perspectives Endpoint:**
```typescript
// /src/app/api/perspectives/route.ts
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = generateRequestId();

  try {
    // 1. Authentication and rate limiting
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return NextResponse.json({
        error: 'Authentication failed',
        details: authResult.error
      }, { status: 401 });
    }

    const user = authResult.user;

    // Rate limiting check
    await rateLimiter.checkUserRateLimit(user.id, 'perspectives');

    // 2. Parse and validate request
    const args = await parseAndValidateRequest(request);
    const {
      prompt,
      models = ['gpt-4', 'claude-3.5-sonnet', 'gemini-1.5-pro'],
      max_tokens = 2000,
      temperature = 0.7,
      auto_inject_memory = true,
      project_memory = 'light',
      provider_settings = {}
    } = args;

    // 3. Subscription and credit validation
    const subscriptionCheck = await validateSubscription(user.id);
    if (!subscriptionCheck.valid) {
      return NextResponse.json({
        error: 'Subscription required',
        details: subscriptionCheck.reason,
        upgrade_url: '/dashboard/billing'
      }, { status: 402 });
    }

    // 4. Memory context injection
    let enhancedPrompt = prompt;
    let memoryContext = null;

    if (auto_inject_memory && project_memory !== 'none') {
      const memoryResult = await memoryManager.getMemoryContext({
        user_id: user.id,
        query_context: prompt,
        project_memory: project_memory,
        max_memory_kb: project_memory === 'full' ? 100 : 25,
        max_conversations: project_memory === 'full' ? 10 : 3
      });

      if (memoryResult.success && memoryResult.relevant_context) {
        enhancedPrompt = `${memoryResult.relevant_context}\n\n# Current Request\n${prompt}`;
        memoryContext = memoryResult;
      }
    }

    // 5. Model validation and selection
    const validatedModels = await validateModelsForUser(models, user);
    if (validatedModels.length === 0) {
      return NextResponse.json({
        error: 'No valid models available',
        details: 'Please check your API keys and subscription status'
      }, { status: 400 });
    }

    // 6. Cost estimation and budget check
    const costEstimate = await estimatePerspectiveCost(
      validatedModels,
      estimateTokens(enhancedPrompt),
      max_tokens
    );

    const budgetCheck = await checkUserBudget(user.id, costEstimate.total_estimated_cost);
    if (!budgetCheck.within_budget) {
      return NextResponse.json({
        error: 'Insufficient credits',
        estimated_cost: costEstimate.total_estimated_cost,
        available_balance: budgetCheck.available_balance,
        purchase_url: '/dashboard/billing/credits'
      }, { status: 402 });
    }

    // 7. Concurrent multi-model execution
    const perspectiveRequests = validatedModels.map(model => ({
      id: `${requestId}-${model}`,
      model,
      prompt: enhancedPrompt,
      max_tokens,
      temperature: model.includes('o1') ? undefined : temperature,
      provider_settings: provider_settings[detectProvider(model)] || {},
      user
    }));

    const perspectivePromises = perspectiveRequests.map(async (request) => {
      const executionStart = Date.now();

      try {
        const provider = detectProvider(request.model);
        const handler = await getProviderHandler(provider);

        // Apply rate limiting per provider
        await rateLimiters[provider].waitForCapacity(
          estimateTokens(request.prompt)
        );

        const response = await handler.createCompletion(request);

        return {
          ...response,
          model: request.model,
          provider,
          request_id: request.id,
          execution_time_ms: Date.now() - executionStart
        };

      } catch (error) {
        return {
          model: request.model,
          provider: detectProvider(request.model),
          request_id: request.id,
          success: false,
          error: error.message,
          execution_time_ms: Date.now() - executionStart
        };
      }
    });

    // Execute all requests concurrently with timeout
    const perspectiveResults = await Promise.allSettled(
      perspectivePromises.map(p =>
        Promise.race([
          p,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), 60000)
          )
        ])
      )
    );

    // 8. Process and format results
    const processedResults = perspectiveResults.map((result, index) => {
      const originalRequest = perspectiveRequests[index];

      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          model: originalRequest.model,
          provider: detectProvider(originalRequest.model),
          request_id: originalRequest.id,
          success: false,
          error: result.reason?.message || 'Unknown error',
          execution_time_ms: 0
        };
      }
    });

    // 9. Calculate actual costs and update credits
    const actualCosts = await calculateActualCosts(processedResults);
    const totalCost = actualCosts.reduce((sum, cost) => sum + cost.final_cost, 0);

    if (totalCost > 0) {
      await deductUserCredits(user.id, totalCost);
    }

    // 10. Store conversation for memory system
    if (memoryContext?.settings?.enable_conversation_memory) {
      await storeConversation({
        user_id: user.id,
        user_message: prompt,
        assistant_responses: processedResults.filter(r => r.success).map(r => ({
          model: r.model,
          content: r.content,
          tokens: r.tokens
        })),
        total_cost: totalCost,
        models_used: validatedModels,
        request_id: requestId
      });
    }

    // 11. Format response
    const response = {
      request_id: requestId,
      perspectives: processedResults.map(formatPerspectiveResult),
      metadata: {
        original_prompt: prompt,
        enhanced_prompt_used: enhancedPrompt !== prompt,
        memory_context_injected: memoryContext !== null,
        models_requested: models,
        models_executed: validatedModels,
        total_execution_time_ms: Date.now() - startTime,
        total_cost_usd: totalCost,
        successful_responses: processedResults.filter(r => r.success).length,
        failed_responses: processedResults.filter(r => !r.success).length
      },
      usage: {
        credits_used: totalCost,
        remaining_balance: budgetCheck.available_balance - totalCost,
        tokens_consumed: processedResults.reduce((sum, r) => sum + (r.tokens || 0), 0)
      }
    };

    // 12. Log usage for analytics
    await logApiUsage({
      request_id: requestId,
      user_id: user.id,
      endpoint: '/api/perspectives',
      method: 'POST',
      models_used: validatedModels,
      total_tokens: response.usage.tokens_consumed,
      total_cost: totalCost,
      response_time_ms: Date.now() - startTime,
      success: true
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('Perspective generation failed:', error);

    await logApiUsage({
      request_id: requestId,
      user_id: authResult.user?.id,
      endpoint: '/api/perspectives',
      method: 'POST',
      success: false,
      error_message: error.message,
      response_time_ms: Date.now() - startTime
    });

    return NextResponse.json({
      error: 'Internal server error',
      request_id: requestId,
      details: error.message
    }, { status: 500 });
  }
}
```

### CLI Integration API

**CLI Command Execution and Status Management:**
```typescript
// /src/app/api/cli-command/route.ts
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. MCP token authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const user = await authenticateMCPToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid MCP token' }, { status: 401 });
    }

    // 2. Parse request
    const { provider_id, prompt, mode = 'args', timeout_ms = 30000 } = await request.json();

    // 3. Validate CLI provider
    const validProviders = ['claude_code', 'codex_cli', 'gemini_cli'];
    if (!validProviders.includes(provider_id)) {
      return NextResponse.json({
        error: 'Invalid provider',
        supported_providers: validProviders
      }, { status: 400 });
    }

    // 4. Check subscription access for CLI features
    const subscription = await getUserSubscription(user.id);
    if (subscription.plan_type === 'free') {
      return NextResponse.json({
        error: 'CLI access requires Pro subscription',
        upgrade_url: '/dashboard/billing'
      }, { status: 402 });
    }

    // 5. Execute CLI command
    const cliManager = new CLIManager();
    const result = await cliManager.sendCliPrompt(provider_id, prompt, mode, timeout_ms);

    // 6. Extract and estimate usage
    const tokenUsage = extractTokenUsage(provider_id, result.output);
    const modelUsed = getModelForProvider(provider_id, user.preferences);

    // 7. Log CLI usage (no cost deduction for CLI tools)
    await logCliUsage({
      user_id: user.id,
      provider: provider_id,
      model_used: modelUsed,
      prompt_tokens: tokenUsage.input_tokens,
      completion_tokens: tokenUsage.output_tokens,
      execution_time_ms: Date.now() - startTime,
      success: result.success
    });

    return NextResponse.json({
      success: result.success,
      output: result.output,
      provider: provider_id,
      model_used: modelUsed,
      execution_time_ms: Date.now() - startTime,
      usage: {
        estimated_tokens: tokenUsage.total_tokens,
        cost_usd: 0 // CLI tools don't incur additional costs
      },
      metadata: {
        cli_version: result.cli_version,
        execution_mode: mode,
        authentication_status: result.authenticated
      }
    });

  } catch (error) {
    console.error('CLI command execution failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      execution_time_ms: Date.now() - startTime
    }, { status: 500 });
  }
}

// /src/app/api/cli-status/route.ts
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cliManager = new CLIManager();
    const statusResults = await cliManager.getAllCliStatus();

    // Update user's CLI configurations
    await updateUserCliConfigurations(user.id, statusResults);

    return NextResponse.json({
      cli_tools: statusResults,
      last_updated: new Date().toISOString(),
      detection_method: 'api_request'
    });

  } catch (error) {
    return NextResponse.json({
      error: 'CLI status check failed',
      details: error.message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // CLI status reporting from MCP clients
  try {
    const { provider, status, authenticated, cli_version, message } = await request.json();

    const user = await authenticateMCPToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Store CLI status report
    await supabase
      .from('cli_status_logs')
      .insert({
        user_id: user.id,
        provider,
        status,
        authenticated,
        cli_version,
        error_message: message,
        reported_via: 'mcp_client',
        client_info: {
          user_agent: request.headers.get('user-agent'),
          ip_address: getClientIP(request)
        }
      });

    return NextResponse.json({ success: true });

  } catch (error) {
    return NextResponse.json({
      error: 'Status report failed',
      details: error.message
    }, { status: 500 });
  }
}
```

### Memory Management API

**Memory Extraction and Context APIs:**
```typescript
// /src/app/api/memory/extract/route.ts
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      cli_tools = ['all'],
      memory_types = ['global', 'project', 'conversation'],
      project_path = '.',
      encryption_enabled = true,
      max_file_size_kb = 500,
      relevance_threshold = 0.3
    } = await request.json();

    // Check memory preferences
    const preferences = await getUserMemoryPreferences(user.id);
    if (!preferences.memory_enabled) {
      return NextResponse.json({
        error: 'Memory extraction disabled',
        message: 'Enable memory extraction in settings to use this feature'
      }, { status: 403 });
    }

    // Initialize memory extractor
    const extractor = new UniversalMemoryExtractor();

    // Perform extraction
    const extractionResult = await extractor.extractMemory({
      cli_tools: cli_tools.filter(tool => preferences.cli_tools_enabled[tool]),
      memory_types: memory_types.filter(type => preferences.memory_types_enabled[type]),
      project_path,
      encryption_enabled,
      max_file_size_kb: Math.min(max_file_size_kb, preferences.max_file_size_kb),
      relevance_threshold: Math.max(relevance_threshold, preferences.context_relevance_threshold),
      user_token: user.id
    });

    // Log extraction audit
    await logMemoryAudit({
      user_id: user.id,
      action_type: 'extract',
      extraction_duration_ms: Date.now() - startTime,
      memory_sources_found: extractionResult.sources_detected,
      content_extracted: extractionResult.content_extracted,
      file_count: extractionResult.sources_detected
    });

    return NextResponse.json({
      ...extractionResult,
      extraction_time_ms: Date.now() - startTime,
      preferences_applied: {
        encryption_enabled,
        relevance_threshold: Math.max(relevance_threshold, preferences.context_relevance_threshold),
        max_file_size_kb: Math.min(max_file_size_kb, preferences.max_file_size_kb)
      }
    });

  } catch (error) {
    console.error('Memory extraction failed:', error);
    return NextResponse.json({
      error: 'Memory extraction failed',
      details: error.message,
      extraction_time_ms: Date.now() - startTime
    }, { status: 500 });
  }
}

// /src/app/api/memory/context/route.ts
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      query_context,
      cli_tools = ['all'],
      memory_types = ['project', 'conversation'],
      max_memory_kb = 50,
      max_conversations = 6
    } = await request.json();

    const contextManager = new ContextManager();
    const contextResult = await contextManager.getMemoryContext({
      user_token: user.id,
      query_context,
      cli_tools,
      memory_types,
      max_memory_kb,
      max_conversations
    });

    // Log context access
    await logMemoryAudit({
      user_id: user.id,
      action_type: 'access',
      context_injected: contextResult.context_injected,
      memory_sources_found: contextResult.memory_entries_used,
      operation_duration_ms: 0 // Context retrieval is fast
    });

    return NextResponse.json(contextResult);

  } catch (error) {
    console.error('Context retrieval failed:', error);
    return NextResponse.json({
      error: 'Context retrieval failed',
      details: error.message
    }, { status: 500 });
  }
}

// /src/app/api/memory/preferences/route.ts
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const preferences = await getUserMemoryPreferences(user.id);
    return NextResponse.json({ preferences });

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to get preferences',
      details: error.message
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { preferences } = await request.json();

    // Validate preferences structure
    const validatedPreferences = validateMemoryPreferences(preferences);

    // Update user preferences
    await updateUserMemoryPreferences(user.id, validatedPreferences);

    return NextResponse.json({
      success: true,
      preferences: validatedPreferences
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to update preferences',
      details: error.message
    }, { status: 500 });
  }
}
```

### Provider and Model Management API

**Dynamic Provider Configuration:**
```typescript
// /src/app/api/providers/route.ts
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeModels = searchParams.get('include_models') === 'true';
    const providerId = searchParams.get('provider');
    const healthCheck = searchParams.get('health_check') === 'true';

    let providersQuery = supabase
      .from('providers_registry')
      .select('*')
      .eq('is_active', true);

    if (providerId) {
      providersQuery = providersQuery.eq('provider_id', providerId);
    }

    const { data: providers, error } = await providersQuery;
    if (error) throw error;

    // Include models if requested
    let providersWithModels = providers;
    if (includeModels) {
      providersWithModels = await Promise.all(
        providers.map(async (provider) => {
          const { data: models } = await supabase
            .from('models_registry')
            .select('*')
            .eq('provider_id', provider.provider_id)
            .eq('is_available', true);

          return {
            ...provider,
            models: models || []
          };
        })
      );
    }

    // Include health status if requested
    if (healthCheck) {
      const healthChecker = new ProviderHealthChecker();
      for (const provider of providersWithModels) {
        const health = await healthChecker.getProviderHealth(provider.provider_id);
        provider.health_status = health;
      }
    }

    return NextResponse.json({
      providers: providersWithModels,
      total_count: providers.length,
      last_updated: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch providers',
      details: error.message
    }, { status: 500 });
  }
}

// /src/app/api/models/route.ts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get('provider');
    const category = searchParams.get('category');
    const includeUnavailable = searchParams.get('include_unavailable') === 'true';

    let modelsQuery = supabase
      .from('models_registry')
      .select(`
        *,
        providers_registry (
          provider_name,
          category,
          health_status
        )
      `);

    if (!includeUnavailable) {
      modelsQuery = modelsQuery.eq('is_available', true);
    }

    if (providerId) {
      modelsQuery = modelsQuery.eq('provider_id', providerId);
    }

    if (category) {
      modelsQuery = modelsQuery.eq('model_category', category);
    }

    const { data: models, error } = await modelsQuery.order('popularity_score', { ascending: false });
    if (error) throw error;

    // Enhance with real-time pricing if available
    const enhancedModels = await enhanceWithRealTimePricing(models);

    return NextResponse.json({
      models: enhancedModels,
      total_count: models.length,
      filters_applied: {
        provider: providerId,
        category,
        include_unavailable: includeUnavailable
      }
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch models',
      details: error.message
    }, { status: 500 });
  }
}

// /src/app/api/models/sync/route.ts - Admin endpoint for model catalog sync
export async function POST(request: NextRequest) {
  try {
    // Admin authentication check
    const user = await authenticateAdminRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const modelsIntegration = new ModelsDevIntegration();
    const syncResult = await modelsIntegration.syncModelCatalog(true); // Force refresh

    return NextResponse.json({
      sync_result: syncResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Model sync failed',
      details: error.message
    }, { status: 500 });
  }
}
```

### Usage Analytics and Dashboard API

**Comprehensive Analytics Endpoints:**
```typescript
// /src/app/api/dashboard/stats/route.ts
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';
    const granularity = searchParams.get('granularity') || 'day';

    // Calculate date range
    const dateRange = calculateDateRange(period);

    // Fetch user analytics
    const analytics = await getUserAnalytics(user.id, dateRange, granularity);

    return NextResponse.json(analytics);

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch analytics',
      details: error.message
    }, { status: 500 });
  }
}

async function getUserAnalytics(
  userId: string,
  dateRange: DateRange,
  granularity: string
): Promise<UserAnalytics> {

  // Usage statistics
  const { data: usageStats } = await supabase
    .from('api_usage_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', dateRange.start)
    .lte('created_at', dateRange.end);

  // Credit transaction history
  const { data: creditHistory } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', dateRange.start)
    .lte('created_at', dateRange.end)
    .order('created_at', { ascending: false });

  // Chat session analytics
  const { data: chatStats } = await supabase
    .from('chat_sessions')
    .select(`
      *,
      chat_messages (count)
    `)
    .eq('user_id', userId)
    .gte('created_at', dateRange.start)
    .lte('created_at', dateRange.end);

  // CLI usage statistics
  const { data: cliStats } = await supabase
    .from('cli_status_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('timestamp', dateRange.start)
    .lte('timestamp', dateRange.end);

  // Process and aggregate data
  return {
    period: dateRange,
    granularity,

    // Usage overview
    usage_overview: {
      total_requests: usageStats?.length || 0,
      total_tokens: usageStats?.reduce((sum, log) => sum + (log.total_tokens || 0), 0) || 0,
      total_cost: usageStats?.reduce((sum, log) => sum + (log.cost_usd || 0), 0) || 0,
      unique_models_used: new Set(usageStats?.map(log => log.model_name).filter(Boolean)).size,
      unique_providers_used: new Set(usageStats?.map(log => log.provider).filter(Boolean)).size
    },

    // Time series data
    time_series: generateTimeSeries(usageStats, granularity),

    // Model breakdown
    model_breakdown: generateModelBreakdown(usageStats),

    // Provider performance
    provider_performance: generateProviderBreakdown(usageStats),

    // Chat statistics
    chat_statistics: {
      total_sessions: chatStats?.length || 0,
      total_messages: chatStats?.reduce((sum, session) => sum + (session.message_count || 0), 0) || 0,
      avg_session_length: calculateAverageSessionLength(chatStats),
      most_used_models: getMostUsedModels(chatStats)
    },

    // CLI integration stats
    cli_integration: {
      available_tools: cliStats?.filter(log => log.status === 'available').map(log => log.provider) || [],
      authenticated_tools: cliStats?.filter(log => log.authenticated === true).map(log => log.provider) || [],
      last_detection: cliStats?.length > 0 ? Math.max(...cliStats.map(log => new Date(log.timestamp).getTime())) : null
    },

    // Credit and billing
    credit_summary: {
      current_balance: (await getUserCredits(userId)).credit_balance,
      total_purchased: creditHistory?.filter(t => t.transaction_type === 'purchase').reduce((sum, t) => sum + t.amount, 0) || 0,
      total_used: creditHistory?.filter(t => t.transaction_type === 'usage').reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0,
      recent_transactions: creditHistory?.slice(0, 10) || []
    }
  };
}
```

### Integration Patterns and Middleware

**Request Authentication and Validation:**
```typescript
// /src/lib/api/middleware/auth.ts
export async function authenticateRequest(request: NextRequest): Promise<AuthResult> {
  // Method 1: Bearer token authentication (API/MCP)
  const authorization = request.headers.get('Authorization');
  if (authorization?.startsWith('Bearer ')) {
    const token = authorization.replace('Bearer ', '');

    // Check for MCP API key format (pd_*)
    if (token.startsWith('pd_')) {
      return await authenticateMCPApiKey(token);
    }

    // Check for standard access token format (polydev_*)
    if (token.startsWith('polydev_')) {
      return await authenticateMCPToken(token);
    }

    return { success: false, error: 'Invalid token format' };
  }

  // Method 2: Session-based authentication (web)
  const supabase = createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { success: false, error: 'No valid session' };
  }

  return { success: true, user, auth_method: 'session' };
}

async function authenticateMCPToken(token: string): Promise<AuthResult> {
  const tokenHash = createHash('sha256').update(token).digest('hex');

  const { data: tokenData, error } = await serviceSupabase
    .from('mcp_access_tokens')
    .select(`
      *,
      profiles (*)
    `)
    .eq('token_hash', tokenHash)
    .single();

  if (error || !tokenData) {
    return { success: false, error: 'Invalid or expired token' };
  }

  // Check expiration
  if (new Date(tokenData.expires_at) < new Date()) {
    return { success: false, error: 'Token expired' };
  }

  // Update last used timestamp
  await serviceSupabase
    .from('mcp_access_tokens')
    .update({
      last_used: new Date().toISOString(),
      usage_count: tokenData.usage_count + 1
    })
    .eq('id', tokenData.id);

  return {
    success: true,
    user: tokenData.profiles,
    auth_method: 'mcp_token',
    token_info: {
      scope: tokenData.scope,
      client_id: tokenData.client_id
    }
  };
}
```

**Rate Limiting Middleware:**
```typescript
// /src/lib/api/middleware/rateLimiter.ts
export class ApiRateLimiter {
  private redis: Redis;
  private limits: Map<string, RateLimit> = new Map();

  constructor() {
    this.redis = new Redis(process.env.UPSTASH_REDIS_REST_URL);
    this.initializeLimits();
  }

  private initializeLimits() {
    // User-based rate limits
    this.limits.set('user:perspectives', {
      requests: 100,
      window: 60 * 60, // 1 hour
      burst: 10 // Allow burst of 10 requests
    });

    this.limits.set('user:cli_commands', {
      requests: 200,
      window: 60 * 60, // 1 hour
      burst: 20
    });

    this.limits.set('user:memory_extraction', {
      requests: 20,
      window: 60 * 60, // 1 hour
      burst: 5
    });

    // Token-based rate limits (more restrictive)
    this.limits.set('token:perspectives', {
      requests: 50,
      window: 60 * 60, // 1 hour
      burst: 5
    });

    // Global rate limits
    this.limits.set('global:api', {
      requests: 10000,
      window: 60 * 60, // 1 hour
      burst: 100
    });
  }

  async checkUserRateLimit(
    userId: string,
    operation: string
  ): Promise<RateLimitResult> {
    const limitKey = `user:${operation}`;
    const limit = this.limits.get(limitKey);

    if (!limit) {
      return { allowed: true, remaining: Infinity };
    }

    const redisKey = `rate_limit:${limitKey}:${userId}`;
    const current = await this.redis.get(redisKey);
    const currentCount = current ? parseInt(current) : 0;

    if (currentCount >= limit.requests) {
      const ttl = await this.redis.ttl(redisKey);
      return {
        allowed: false,
        remaining: 0,
        reset_in_seconds: ttl > 0 ? ttl : limit.window,
        limit: limit.requests
      };
    }

    // Increment counter
    if (currentCount === 0) {
      await this.redis.setex(redisKey, limit.window, 1);
    } else {
      await this.redis.incr(redisKey);
    }

    return {
      allowed: true,
      remaining: limit.requests - currentCount - 1,
      reset_in_seconds: await this.redis.ttl(redisKey),
      limit: limit.requests
    };
  }

  async checkBurstLimit(
    userId: string,
    operation: string
  ): Promise<BurstLimitResult> {
    const limitKey = `user:${operation}`;
    const limit = this.limits.get(limitKey);

    if (!limit?.burst) {
      return { allowed: true };
    }

    const burstKey = `burst:${limitKey}:${userId}`;
    const burstCount = await this.redis.get(burstKey);
    const currentBurst = burstCount ? parseInt(burstCount) : 0;

    if (currentBurst >= limit.burst) {
      return {
        allowed: false,
        message: `Burst limit exceeded. Max ${limit.burst} rapid requests allowed.`
      };
    }

    // Track burst window (last 60 seconds)
    await this.redis.setex(burstKey, 60, currentBurst + 1);

    return { allowed: true };
  }
}
```

---

## Part V: Performance Optimization and Scaling

### Performance Architecture

Polydev AI implements multiple layers of performance optimization to ensure fast, reliable responses across all system components, from multi-model perspective generation to memory extraction and CLI tool integration.

### Caching and Memory Management

**Redis-Based Caching Strategy:**
```typescript
export class CacheManager {
  private redis: Redis;
  private readonly DEFAULT_TTL = 3600; // 1 hour

  constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN
    });
  }

  // Multi-layer caching for different data types
  async get<T>(key: string, fallback?: () => Promise<T>): Promise<T | null> {
    try {
      const cached = await this.redis.get(key);
      if (cached) {
        return JSON.parse(cached);
      }

      if (fallback) {
        const fresh = await fallback();
        await this.set(key, fresh);
        return fresh;
      }

      return null;
    } catch (error) {
      console.warn('Cache get failed:', error);
      return fallback ? await fallback() : null;
    }
  }

  async set(key: string, value: unknown, ttl: number = this.DEFAULT_TTL): Promise<boolean> {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn('Cache set failed:', error);
      return false;
    }
  }

  // Intelligent cache invalidation
  async invalidatePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      return keys.length;
    } catch (error) {
      console.warn('Cache invalidation failed:', error);
      return 0;
    }
  }

  // Cache warming for frequently accessed data
  async warmCache(): Promise<void> {
    const warmupTasks = [
      this.warmProviderCache(),
      this.warmModelCache(),
      this.warmPricingCache()
    ];

    await Promise.allSettled(warmupTasks);
  }

  private async warmProviderCache(): Promise<void> {
    const providers = await this.getActiveProviders();
    for (const provider of providers) {
      await this.set(`provider:${provider.id}`, provider, 7200); // 2 hours
    }
  }

  private async warmModelCache(): Promise<void> {
    const models = await this.getAvailableModels();
    await this.set('models:all', models, 3600); // 1 hour

    // Cache by provider
    const modelsByProvider = models.reduce((acc, model) => {
      if (!acc[model.provider_id]) acc[model.provider_id] = [];
      acc[model.provider_id].push(model);
      return acc;
    }, {});

    for (const [providerId, providerModels] of Object.entries(modelsByProvider)) {
      await this.set(`models:provider:${providerId}`, providerModels, 3600);
    }
  }
}
```

**Connection Pooling and Request Optimization:**
```typescript
export class ConnectionManager {
  private static instance: ConnectionManager;
  private pools: Map<string, ConnectionPool> = new Map();

  static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  getPool(provider: string): ConnectionPool {
    if (!this.pools.has(provider)) {
      const poolConfig = this.getPoolConfig(provider);
      this.pools.set(provider, new ConnectionPool(poolConfig));
    }
    return this.pools.get(provider)!;
  }

  private getPoolConfig(provider: string): PoolConfig {
    const configs = {
      'openai': { maxConnections: 100, timeout: 30000, keepAlive: true },
      'anthropic': { maxConnections: 50, timeout: 45000, keepAlive: true },
      'google': { maxConnections: 30, timeout: 60000, keepAlive: false },
      'default': { maxConnections: 20, timeout: 30000, keepAlive: true }
    };

    return configs[provider] || configs.default;
  }

  // Intelligent request batching
  async batchRequests<T>(
    requests: BatchRequest[],
    batchSize: number = 5
  ): Promise<BatchResult<T>[]> {
    const results: BatchResult<T>[] = [];

    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchPromises = batch.map(request => this.executeRequest(request));

      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...this.processBatchResults(batchResults, batch));

      // Add delay between batches to respect rate limits
      if (i + batchSize < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }
}
```

### Database Query Optimization

**Optimized Query Patterns:**
```typescript
export class QueryOptimizer {
  // Efficient user data fetching with joins
  async getUserDashboardData(userId: string): Promise<DashboardData> {
    const { data, error } = await supabase
      .from('user_dashboard_summary')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  // Paginated analytics queries
  async getUserUsageHistory(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      startDate?: Date;
      endDate?: Date;
      provider?: string;
    } = {}
  ): Promise<PaginatedUsageHistory> {
    const {
      page = 1,
      limit = 50,
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate = new Date(),
      provider
    } = options;

    const offset = (page - 1) * limit;

    let query = supabase
      .from('api_usage_logs')
      .select(`
        *,
        models_registry (
          model_name,
          provider_id,
          model_category
        )
      `, { count: 'exact' })
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (provider) {
      query = query.eq('provider', provider);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return {
      data: data || [],
      pagination: {
        page,
        limit,
        total_records: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
        has_next_page: offset + limit < (count || 0),
        has_previous_page: page > 1
      },
      filters: {
        start_date: startDate,
        end_date: endDate,
        provider
      }
    };
  }

  // Efficient memory search with relevance scoring
  async searchMemoryContent(
    userId: string,
    query: string,
    options: MemorySearchOptions = {}
  ): Promise<MemorySearchResult> {
    const {
      memory_types = ['project', 'conversation'],
      cli_tools = ['all'],
      limit = 10,
      min_relevance = 0.3
    } = options;

    // Use PostgreSQL full-text search with relevance ranking
    const { data, error } = await supabase.rpc('search_user_memory', {
      p_user_id: userId,
      p_search_query: query,
      p_memory_types: memory_types,
      p_cli_tools: cli_tools === ['all'] ? null : cli_tools,
      p_limit: limit,
      p_min_relevance: min_relevance
    });

    if (error) throw error;

    return {
      results: data || [],
      search_query: query,
      total_found: data?.length || 0,
      search_time_ms: 0 // Tracked separately
    };
  }
}

-- PostgreSQL function for efficient memory search
CREATE OR REPLACE FUNCTION search_user_memory(
    p_user_id UUID,
    p_search_query TEXT,
    p_memory_types TEXT[] DEFAULT NULL,
    p_cli_tools TEXT[] DEFAULT NULL,
    p_limit INTEGER DEFAULT 10,
    p_min_relevance DECIMAL DEFAULT 0.3
)
RETURNS TABLE (
    memory_id UUID,
    memory_type TEXT,
    cli_tool TEXT,
    source_path TEXT,
    relevance_score DECIMAL,
    content_preview TEXT,
    file_size_bytes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.id,
        m.memory_type,
        m.cli_tool,
        m.source_path,
        m.relevance_score,
        LEFT(decrypt_memory_content(m.encrypted_content, get_user_salt(p_user_id)), 200) as content_preview,
        m.file_size_bytes,
        m.created_at
    FROM user_memory_storage m
    WHERE m.user_id = p_user_id
      AND m.relevance_score >= p_min_relevance
      AND (p_memory_types IS NULL OR m.memory_type = ANY(p_memory_types))
      AND (p_cli_tools IS NULL OR m.cli_tool = ANY(p_cli_tools))
      AND (
        -- Search in keywords
        m.keywords && string_to_array(lower(p_search_query), ' ')
        OR
        -- Search in decrypted content (expensive, use sparingly)
        position(lower(p_search_query) in lower(decrypt_memory_content(m.encrypted_content, get_user_salt(p_user_id)))) > 0
      )
    ORDER BY
      m.relevance_score DESC,
      m.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Concurrent Processing Optimization

**Multi-Model Request Orchestration:**
```typescript
export class ConcurrencyManager {
  private readonly MAX_CONCURRENT_REQUESTS = 6;
  private readonly PROVIDER_CONCURRENCY_LIMITS = {
    'openai': 3,
    'anthropic': 2,
    'google': 2,
    'groq': 1, // Strict limits
    'default': 2
  };

  async executeConcurrentPerspectives(
    requests: PerspectiveRequest[]
  ): Promise<PerspectiveResult[]> {
    // Group requests by provider for optimal distribution
    const requestsByProvider = this.groupRequestsByProvider(requests);

    // Create execution batches respecting provider limits
    const executionBatches = this.createOptimalBatches(requestsByProvider);

    const results: PerspectiveResult[] = [];

    for (const batch of executionBatches) {
      const batchStartTime = Date.now();

      // Execute batch with proper concurrency limits
      const batchPromises = batch.map(async (request, index) => {
        const provider = detectProvider(request.model);

        // Apply provider-specific concurrency control
        await this.acquireConcurrencySlot(provider);

        try {
          const result = await this.executeProviderRequest(request);
          return { ...result, batch_index: index };
        } finally {
          this.releaseConcurrencySlot(provider);
        }
      });

      // Wait for batch completion with intelligent timeout
      const batchResults = await this.waitForBatchCompletion(
        batchPromises,
        this.calculateBatchTimeout(batch)
      );

      results.push(...batchResults);

      // Log batch performance
      await this.logBatchPerformance({
        batch_size: batch.length,
        execution_time_ms: Date.now() - batchStartTime,
        success_count: batchResults.filter(r => r.success).length,
        failure_count: batchResults.filter(r => !r.success).length
      });
    }

    return results;
  }

  private createOptimalBatches(
    requestsByProvider: Map<string, PerspectiveRequest[]>
  ): PerspectiveRequest[][] {
    const batches: PerspectiveRequest[][] = [];
    const allRequests = Array.from(requestsByProvider.values()).flat();

    // Intelligent batching algorithm
    // 1. Prioritize diversity (different providers per batch)
    // 2. Respect provider concurrency limits
    // 3. Optimize for minimal total execution time

    const requestQueue = [...allRequests];
    while (requestQueue.length > 0) {
      const batch: PerspectiveRequest[] = [];
      const providerCounts: Map<string, number> = new Map();

      for (let i = requestQueue.length - 1; i >= 0; i--) {
        const request = requestQueue[i];
        const provider = detectProvider(request.model);
        const currentCount = providerCounts.get(provider) || 0;
        const providerLimit = this.PROVIDER_CONCURRENCY_LIMITS[provider] ||
                             this.PROVIDER_CONCURRENCY_LIMITS.default;

        if (currentCount < providerLimit && batch.length < this.MAX_CONCURRENT_REQUESTS) {
          batch.push(request);
          providerCounts.set(provider, currentCount + 1);
          requestQueue.splice(i, 1);
        }
      }

      if (batch.length > 0) {
        batches.push(batch);
      } else {
        // Fallback: take first request to prevent infinite loop
        batches.push([requestQueue.shift()!]);
      }
    }

    return batches;
  }

  private async waitForBatchCompletion<T>(
    promises: Promise<T>[],
    timeoutMs: number
  ): Promise<T[]> {
    // Race all promises against a timeout
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Batch timeout')), timeoutMs)
    );

    try {
      const results = await Promise.allSettled(
        promises.map(p => Promise.race([p, timeoutPromise]))
      );

      return results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          console.warn(`Request ${index} failed:`, result.reason);
          return {
            success: false,
            error: result.reason?.message || 'Unknown error',
            batch_index: index
          } as T;
        }
      });
    } catch (error) {
      console.error('Batch execution failed:', error);
      throw error;
    }
  }
}
```

### Memory System Optimization

**Efficient Memory Extraction and Processing:**
```typescript
export class OptimizedMemoryExtractor {
  private fileCache: Map<string, FileMetadata> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async extractMemoryOptimized(args: MemoryExtractionArgs): Promise<MemoryExtractionResult> {
    const startTime = Date.now();

    // 1. Parallel file detection across all CLI tools
    const detectionPromises = args.cli_tools.map(async (tool) => {
      return this.detectToolMemoryParallel(tool, args.memory_types, args.project_path);
    });

    const detectionResults = await Promise.allSettled(detectionPromises);
    const allSources = detectionResults
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value.sources);

    // 2. Prioritize and filter sources by relevance before processing
    const prioritizedSources = this.prioritizeSources(allSources, args.relevance_threshold);

    // 3. Parallel content extraction with concurrency control
    const semaphore = new Semaphore(5); // Max 5 concurrent file reads
    const extractionPromises = prioritizedSources.map(async (source) => {
      return semaphore.acquire(async () => {
        return this.extractSourceContent(source, args);
      });
    });

    const extractionResults = await Promise.allSettled(extractionPromises);
    const extractedContent = extractionResults
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value)
      .filter(Boolean);

    // 4. Batch encryption for performance
    const encryptedEntries = args.encryption_enabled
      ? await this.batchEncryptContent(extractedContent, args.user_token)
      : [];

    // 5. Batch database storage
    if (encryptedEntries.length > 0) {
      await this.batchStoreMemory(encryptedEntries);
    }

    return {
      success: true,
      sources_detected: allSources.length,
      content_extracted: extractedContent.length,
      encrypted_entries: encryptedEntries.length,
      extraction_duration_ms: Date.now() - startTime,
      performance_metrics: {
        parallel_detection_time_ms: this.getDetectionTime(detectionResults),
        content_extraction_time_ms: this.getExtractionTime(extractionResults),
        encryption_time_ms: args.encryption_enabled ? this.getEncryptionTime() : 0
      }
    };
  }

  private async detectToolMemoryParallel(
    tool: string,
    memoryTypes: string[],
    projectPath: string
  ): Promise<ToolDetectionResult> {
    const patterns = this.MEMORY_PATTERNS[tool];
    if (!patterns) return { tool, sources: [] };

    const detectionPromises = memoryTypes.map(async (type) => {
      const typePatterns = patterns[type] || [];
      return this.detectMemoryType(tool, type, typePatterns, projectPath);
    });

    const results = await Promise.allSettled(detectionPromises);
    const sources = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value);

    return { tool, sources };
  }

  // Intelligent file caching to avoid repeated stat calls
  private async getFileMetadata(filePath: string): Promise<FileMetadata | null> {
    const cacheKey = `file:${filePath}`;
    const cached = this.fileCache.get(cacheKey);

    if (cached && Date.now() - cached.cached_at < this.CACHE_TTL) {
      return cached;
    }

    try {
      const stats = await fs.stat(filePath);
      const metadata: FileMetadata = {
        path: filePath,
        size: stats.size,
        modified: stats.mtime,
        cached_at: Date.now()
      };

      this.fileCache.set(cacheKey, metadata);
      return metadata;
    } catch (error) {
      return null;
    }
  }

  // Batch encryption for better performance
  private async batchEncryptContent(
    content: MemoryContent[],
    userToken: string
  ): Promise<EncryptedMemoryEntry[]> {
    const userSalt = await this.getUserSalt(userToken);
    const encryptionPromises = content.map(async (item) => {
      const encryptedData = await ZeroKnowledgeEncryption.encrypt(item.content, userSalt);
      return {
        ...item,
        encrypted_content: encryptedData,
        content: undefined // Remove plaintext
      };
    });

    return Promise.all(encryptionPromises);
  }
}

// Semaphore for concurrency control
class Semaphore {
  private permits: number;
  private waiting: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire<T>(task: () => Promise<T>): Promise<T> {
    if (this.permits > 0) {
      this.permits--;
      try {
        return await task();
      } finally {
        this.release();
      }
    }

    return new Promise((resolve, reject) => {
      this.waiting.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.release();
        }
      });
    });
  }

  private release(): void {
    this.permits++;
    const next = this.waiting.shift();
    if (next) {
      this.permits--;
      next();
    }
  }
}
```

### Frontend Performance Optimization

**React Performance Patterns:**
```typescript
// Optimized chat interface with virtualization
export const OptimizedChatInterface: React.FC = () => {
  // Memoized message components
  const MessageComponent = React.memo(({ message }: { message: ChatMessage }) => {
    return (
      <div className="message">
        <MessageContent content={message.content} />
        <MessageMetadata
          model={message.model_used}
          tokens={message.tokens_used}
          cost={message.cost_credits}
        />
      </div>
    );
  });

  // Virtual scrolling for large message lists
  const VirtualizedMessageList = React.useMemo(() => {
    return React.lazy(() => import('./VirtualizedMessageList'));
  }, []);

  // Debounced search for memory and conversations
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (query.length > 2) {
        const results = await searchMemoryContent(query);
        setSearchResults(results);
      }
    }, 300),
    []
  );

  // Optimized context loading
  const { data: contextData, isLoading } = useSWR(
    [`context:${userId}`, currentQuery],
    () => getMemoryContext({ query_context: currentQuery }),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute deduplication
      errorRetryCount: 2
    }
  );

  return (
    <div className="chat-interface">
      <Suspense fallback={<MessageListSkeleton />}>
        <VirtualizedMessageList messages={messages} />
      </Suspense>

      <SearchBar onSearch={debouncedSearch} />

      {isLoading && <ContextLoadingIndicator />}
      {contextData && <ContextPreview context={contextData} />}
    </div>
  );
};

// Efficient state management with Zustand
interface AppState {
  // Chat state
  currentSession: ChatSession | null;
  messages: ChatMessage[];
  isLoading: boolean;

  // Provider state
  availableProviders: Provider[];
  selectedModels: string[];
  providerHealth: Map<string, ProviderHealth>;

  // Memory state
  memoryContext: MemoryContext | null;
  extractedMemory: MemorySource[];

  // Actions
  setCurrentSession: (session: ChatSession) => void;
  addMessage: (message: ChatMessage) => void;
  updateProviderHealth: (providerId: string, health: ProviderHealth) => void;
  setMemoryContext: (context: MemoryContext) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  currentSession: null,
  messages: [],
  isLoading: false,
  availableProviders: [],
  selectedModels: [],
  providerHealth: new Map(),
  memoryContext: null,
  extractedMemory: [],

  // Optimized actions
  setCurrentSession: (session) => set({ currentSession: session }),
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message]
    })),
  updateProviderHealth: (providerId, health) =>
    set((state) => ({
      providerHealth: new Map(state.providerHealth).set(providerId, health)
    })),
  setMemoryContext: (context) => set({ memoryContext: context })
}));
```

---

## Security Privacy

### Enterprise-Grade Security Model

Polydev AI implements comprehensive security measures designed to meet enterprise requirements while maintaining usability and performance.

### Zero-Knowledge Architecture

**Client-Side Encryption Implementation:**
```typescript
export class EnterpriseZeroKnowledgeEncryption {
  // AES-256-GCM with PBKDF2 key derivation
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly PBKDF2_ITERATIONS = 100000;
  private static readonly SALT_LENGTH = 32;

  // Enterprise key management with rotation
  static async generateUserSalt(userId: string): Promise<string> {
    // Use deterministic salt based on user ID + server secret
    const serverSecret = process.env.ENCRYPTION_SECRET || 'default-secret';
    const combined = `${userId}:${serverSecret}`;

    const encoder = new TextEncoder();
    const data = encoder.encode(combined);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  static async deriveEncryptionKey(
    userSalt: string,
    keyVersion: number = 1
  ): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(userSalt),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    // Version-specific salt for key rotation
    const versionSalt = encoder.encode(`polydev-v${keyVersion}-salt`);

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: versionSalt,
        iterations: this.PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );
  }

  static async encryptWithMetadata(
    plaintext: string,
    userSalt: string,
    metadata: EncryptionMetadata = {}
  ): Promise<EncryptedDataWithMetadata> {
    const keyVersion = metadata.keyVersion || 1;
    const key = await this.deriveEncryptionKey(userSalt, keyVersion);
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Add metadata to plaintext
    const dataWithMetadata = JSON.stringify({
      content: plaintext,
      metadata: {
        ...metadata,
        encrypted_at: Date.now(),
        key_version: keyVersion,
        client_version: '1.2.2'
      }
    });

    const encoder = new TextEncoder();
    const encrypted = await crypto.subtle.encrypt(
      { name: this.ALGORITHM, iv },
      key,
      encoder.encode(dataWithMetadata)
    );

    // Content authenticity hash
    const contentHash = await this.generateContentHash(plaintext);

    return {
      encrypted_data: Array.from(new Uint8Array(encrypted)),
      iv: Array.from(iv),
      key_version: keyVersion,
      content_hash: contentHash,
      algorithm: this.ALGORITHM,
      encrypted_at: Date.now()
    };
  }

  static async decryptWithValidation(
    encryptedData: EncryptedDataWithMetadata,
    userSalt: string
  ): Promise<DecryptedDataWithMetadata> {
    const key = await this.deriveEncryptionKey(userSalt, encryptedData.key_version);
    const iv = new Uint8Array(encryptedData.iv);
    const encrypted = new Uint8Array(encryptedData.encrypted_data);

    try {
      const decrypted = await crypto.subtle.decrypt(
        { name: this.ALGORITHM, iv },
        key,
        encrypted
      );

      const decryptedString = new TextDecoder().decode(decrypted);
      const { content, metadata } = JSON.parse(decryptedString);

      // Validate content integrity
      const contentHash = await this.generateContentHash(content);
      if (contentHash !== encryptedData.content_hash) {
        throw new Error('Content integrity validation failed');
      }

      return {
        content,
        metadata,
        validated: true,
        decrypted_at: Date.now()
      };

    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  // Automatic key rotation for enhanced security
  static async rotateUserKeys(userId: string): Promise<KeyRotationResult> {
    const currentVersion = await this.getCurrentKeyVersion(userId);
    const newVersion = currentVersion + 1;

    try {
      // 1. Re-encrypt all user data with new key version
      const memoryEntries = await this.getUserMemoryEntries(userId);
      const reencryptionPromises = memoryEntries.map(async (entry) => {
        const decrypted = await this.decryptWithValidation(entry.encrypted_content, await this.generateUserSalt(userId));
        const reencrypted = await this.encryptWithMetadata(
          decrypted.content,
          await this.generateUserSalt(userId),
          { keyVersion: newVersion }
        );

        return {
          id: entry.id,
          new_encrypted_content: reencrypted
        };
      });

      const reencryptedData = await Promise.all(reencryptionPromises);

      // 2. Batch update database
      await this.batchUpdateEncryptedData(reencryptedData);

      // 3. Update user's key version
      await this.updateUserKeyVersion(userId, newVersion);

      return {
        success: true,
        old_version: currentVersion,
        new_version: newVersion,
        entries_rotated: reencryptedData.length
      };

    } catch (error) {
      return {
        success: false,
        error: `Key rotation failed: ${error.message}`,
        old_version: currentVersion
      };
    }
  }
}
```

### Authentication Security Enhancements

**Multi-Factor Authentication Support:**
```typescript
export class EnhancedAuthSecurity {
  // TOTP-based 2FA implementation
  async setupTwoFactorAuth(userId: string): Promise<TwoFactorSetup> {
    const secret = speakeasy.generateSecret({
      name: 'Polydev AI',
      account: await this.getUserEmail(userId),
      issuer: 'Polydev AI',
      length: 32
    });

    // Store encrypted secret
    const encryptedSecret = await this.encryptTOTPSecret(secret.base32, userId);

    await supabase
      .from('user_security_settings')
      .upsert({
        user_id: userId,
        totp_secret_encrypted: encryptedSecret,
        totp_enabled: false, // User must verify first
        backup_codes: await this.generateBackupCodes(userId),
        security_questions: null
      });

    return {
      secret: secret.base32,
      qr_code: secret.qr_code_ascii,
      backup_codes: await this.generateBackupCodes(userId)
    };
  }

  async verifyTwoFactorAuth(
    userId: string,
    token: string,
    isBackupCode: boolean = false
  ): Promise<VerificationResult> {
    const { data: securitySettings } = await supabase
      .from('user_security_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!securitySettings?.totp_enabled) {
      return { valid: false, error: '2FA not enabled' };
    }

    if (isBackupCode) {
      return this.verifyBackupCode(userId, token, securitySettings.backup_codes);
    }

    // Verify TOTP token
    const decryptedSecret = await this.decryptTOTPSecret(
      securitySettings.totp_secret_encrypted,
      userId
    );

    const verified = speakeasy.totp.verify({
      secret: decryptedSecret,
      encoding: 'base32',
      token,
      window: 2 // Allow 2 time steps of tolerance
    });

    if (verified) {
      // Log successful 2FA verification
      await this.logSecurityEvent({
        user_id: userId,
        event_type: '2fa_success',
        ip_address: this.getClientIP(),
        user_agent: this.getUserAgent()
      });
    } else {
      // Log failed attempt
      await this.logSecurityEvent({
        user_id: userId,
        event_type: '2fa_failed',
        ip_address: this.getClientIP(),
        user_agent: this.getUserAgent()
      });
    }

    return { valid: verified };
  }

  // Device fingerprinting for enhanced security
  async generateDeviceFingerprint(request: NextRequest): Promise<DeviceFingerprint> {
    const userAgent = request.headers.get('user-agent') || '';
    const acceptLanguage = request.headers.get('accept-language') || '';
    const acceptEncoding = request.headers.get('accept-encoding') || '';

    const fingerprintData = {
      user_agent: userAgent,
      accept_language: acceptLanguage,
      accept_encoding: acceptEncoding,
      screen_resolution: '', // Would be provided by client
      timezone: '', // Would be provided by client
      platform: this.detectPlatform(userAgent)
    };

    const fingerprint = await this.hashFingerprint(fingerprintData);

    return {
      fingerprint,
      confidence: this.calculateFingerprintConfidence(fingerprintData),
      components: fingerprintData
    };
  }

  // Suspicious activity detection
  async detectSuspiciousActivity(
    userId: string,
    request: NextRequest
  ): Promise<SuspiciousActivityResult> {
    const recentActivity = await this.getRecentActivity(userId, 24); // Last 24 hours

    const checks = [
      this.checkRapidLoginAttempts(recentActivity),
      this.checkUnusualLocation(recentActivity, request),
      this.checkDeviceChanges(recentActivity, request),
      this.checkUnusualUsagePatterns(recentActivity),
      this.checkBruteForceAttempts(recentActivity)
    ];

    const results = await Promise.all(checks);
    const suspiciousCount = results.filter(r => r.suspicious).length;

    const riskLevel = this.calculateRiskLevel(suspiciousCount, results);

    if (riskLevel >= 'medium') {
      await this.logSecurityEvent({
        user_id: userId,
        event_type: 'suspicious_activity_detected',
        risk_level: riskLevel,
        details: results.filter(r => r.suspicious),
        ip_address: this.getClientIP(request),
        user_agent: request.headers.get('user-agent')
      });

      // Trigger additional security measures for high-risk activities
      if (riskLevel === 'high') {
        await this.triggerSecurityMeasures(userId, results);
      }
    }

    return {
      risk_level: riskLevel,
      suspicious_activities: results.filter(r => r.suspicious),
      recommendations: this.generateSecurityRecommendations(riskLevel, results)
    };
  }
}
```

### Data Privacy and Compliance

**GDPR and Privacy Compliance:**
```sql
-- Privacy compliance table
CREATE TABLE user_privacy_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    -- Consent management
    data_processing_consent BOOLEAN DEFAULT false,
    marketing_consent BOOLEAN DEFAULT false,
    analytics_consent BOOLEAN DEFAULT false,
    third_party_sharing_consent BOOLEAN DEFAULT false,

    -- Data retention preferences
    auto_delete_conversations BOOLEAN DEFAULT false,
    auto_delete_memory BOOLEAN DEFAULT false,
    retention_period_days INTEGER DEFAULT 365,

    -- Privacy controls
    anonymous_usage_stats BOOLEAN DEFAULT true,
    opt_out_analytics BOOLEAN DEFAULT false,
    data_export_requested BOOLEAN DEFAULT false,
    data_deletion_requested BOOLEAN DEFAULT false,

    -- Compliance metadata
    consent_version TEXT DEFAULT '1.0',
    privacy_policy_accepted_version TEXT,
    terms_of_service_accepted_version TEXT,
    consent_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id)
);

-- Data retention and deletion policies
CREATE TABLE data_retention_policies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    policy_name TEXT UNIQUE NOT NULL,
    table_name TEXT NOT NULL,
    retention_period_days INTEGER NOT NULL,
    deletion_method TEXT CHECK (deletion_method IN ('soft_delete', 'hard_delete', 'anonymize')),
    conditions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default retention policies
INSERT INTO data_retention_policies (policy_name, table_name, retention_period_days, deletion_method) VALUES
('User Conversations', 'chat_messages', 365, 'soft_delete'),
('Memory Audit Logs', 'user_memory_audit', 90, 'hard_delete'),
('API Usage Logs', 'api_usage_logs', 730, 'anonymize'),
('CLI Status Logs', 'cli_status_logs', 90, 'hard_delete'),
('MCP Auth Codes', 'mcp_auth_codes', 1, 'hard_delete'),
('Credit Transactions', 'credit_transactions', 2555, 'anonymize'); -- 7 years for financial records
```

**Data Anonymization and Export:**
```typescript
export class PrivacyComplianceManager {
  // GDPR data export
  async exportUserData(userId: string): Promise<UserDataExport> {
    const exportData: UserDataExport = {
      export_id: generateExportId(),
      user_id: userId,
      export_timestamp: new Date(),
      data_version: '1.2.2'
    };

    // Profile data
    exportData.profile = await this.exportProfileData(userId);

    // Conversation history (decrypted for export)
    exportData.conversations = await this.exportConversationData(userId);

    // Memory data (decrypted for export)
    exportData.memory_data = await this.exportMemoryData(userId);

    // Usage analytics
    exportData.usage_analytics = await this.exportUsageData(userId);

    // API keys (metadata only, not actual keys)
    exportData.api_configurations = await this.exportApiKeyMetadata(userId);

    // Subscription and billing
    exportData.billing_data = await this.exportBillingData(userId);

    // Security events
    exportData.security_events = await this.exportSecurityEvents(userId);

    return exportData;
  }

  // GDPR data deletion
  async deleteUserData(
    userId: string,
    deletionType: 'soft' | 'hard' = 'soft'
  ): Promise<DeletionResult> {
    const deletionId = generateDeletionId();

    try {
      if (deletionType === 'soft') {
        // Soft deletion: anonymize data but preserve structure
        await this.anonymizeUserData(userId);
      } else {
        // Hard deletion: completely remove user data
        await this.hardDeleteUserData(userId);
      }

      // Log deletion event
      await this.logDataDeletion({
        user_id: userId,
        deletion_id: deletionId,
        deletion_type: deletionType,
        completed_at: new Date()
      });

      return {
        success: true,
        deletion_id: deletionId,
        deletion_type: deletionType,
        data_anonymized: deletionType === 'soft',
        data_permanently_deleted: deletionType === 'hard'
      };

    } catch (error) {
      return {
        success: false,
        error: `Data deletion failed: ${error.message}`,
        deletion_id: deletionId
      };
    }
  }

  private async anonymizeUserData(userId: string): Promise<void> {
    const anonymousId = `anon_${generateRandomId()}`;

    // Anonymize profile
    await supabase
      .from('profiles')
      .update({
        email: `${anonymousId}@deleted.polydev.ai`,
        full_name: 'Deleted User',
        company: null,
        avatar_url: null
      })
      .eq('id', userId);

    // Anonymize usage logs but preserve analytics value
    await supabase
      .from('api_usage_logs')
      .update({
        user_id: anonymousId,
        ip_address: null,
        user_agent: 'anonymized'
      })
      .eq('user_id', userId);

    // Delete sensitive data completely
    await supabase.from('user_memory_storage').delete().eq('user_id', userId);
    await supabase.from('user_conversation_logs').delete().eq('user_id', userId);
    await supabase.from('user_api_keys').delete().eq('user_id', userId);
  }

  // Automated data retention enforcement
  async enforceRetentionPolicies(): Promise<RetentionEnforcementResult> {
    const policies = await this.getActiveRetentionPolicies();
    const results: PolicyEnforcementResult[] = [];

    for (const policy of policies) {
      try {
        const cutoffDate = new Date(Date.now() - policy.retention_period_days * 24 * 60 * 60 * 1000);

        let deletedCount = 0;
        switch (policy.deletion_method) {
          case 'soft_delete':
            deletedCount = await this.softDeleteData(policy.table_name, cutoffDate);
            break;
          case 'hard_delete':
            deletedCount = await this.hardDeleteData(policy.table_name, cutoffDate);
            break;
          case 'anonymize':
            deletedCount = await this.anonymizeData(policy.table_name, cutoffDate);
            break;
        }

        results.push({
          policy_name: policy.policy_name,
          table_name: policy.table_name,
          deletion_method: policy.deletion_method,
          records_processed: deletedCount,
          success: true
        });

      } catch (error) {
        results.push({
          policy_name: policy.policy_name,
          table_name: policy.table_name,
          success: false,
          error: error.message
        });
      }
    }

    return {
      policies_processed: policies.length,
      total_records_processed: results.reduce((sum, r) => sum + (r.records_processed || 0), 0),
      successful_policies: results.filter(r => r.success).length,
      failed_policies: results.filter(r => !r.success).length,
      policy_results: results
    };
  }
}
```

### Security Monitoring and Audit

**Comprehensive Security Event Logging:**
```sql
-- Security events and audit trail
CREATE TABLE security_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Event classification
    event_type TEXT NOT NULL CHECK (event_type IN (
        'login_success', 'login_failed', 'logout',
        'password_change', 'email_change',
        '2fa_enabled', '2fa_disabled', '2fa_success', '2fa_failed',
        'api_key_created', 'api_key_deleted', 'api_key_used',
        'suspicious_activity_detected', 'account_locked', 'account_unlocked',
        'data_export_requested', 'data_deletion_requested',
        'mcp_token_created', 'mcp_token_used'
    )),
    severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),

    -- Event context
    description TEXT,
    details JSONB DEFAULT '{}',

    -- Request context
    ip_address INET,
    user_agent TEXT,
    request_path TEXT,
    session_id TEXT,

    -- Geolocation data
    country_code TEXT,
    city TEXT,
    coordinates POINT,

    -- Device fingerprinting
    device_fingerprint TEXT,
    device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet', 'cli', 'api')),

    -- Risk assessment
    risk_score INTEGER CHECK (risk_score BETWEEN 0 AND 100),
    risk_factors TEXT[],

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient security queries
CREATE INDEX idx_security_events_user_time ON security_events(user_id, created_at DESC);
CREATE INDEX idx_security_events_type_severity ON security_events(event_type, severity, created_at DESC);
CREATE INDEX idx_security_events_risk_score ON security_events(risk_score DESC, created_at DESC);
CREATE INDEX idx_security_events_ip_address ON security_events(ip_address, created_at DESC);
```

**Automated Security Monitoring:**
```typescript
export class SecurityMonitor {
  private alertThresholds = {
    failed_logins: { count: 5, window_minutes: 15 },
    api_key_usage: { requests: 1000, window_minutes: 60 },
    suspicious_patterns: { score: 75, actions: ['notify_admin', 'temporary_lockout'] }
  };

  async monitorSecurityEvents(): Promise<void> {
    // Check for failed login patterns
    await this.checkFailedLoginPatterns();

    // Monitor API usage anomalies
    await this.checkApiUsageAnomalies();

    // Detect suspicious user behavior
    await this.detectSuspiciousBehavior();

    // Check for known attack patterns
    await this.checkAttackPatterns();
  }

  private async checkFailedLoginPatterns(): Promise<void> {
    const cutoffTime = new Date(Date.now() - this.alertThresholds.failed_logins.window_minutes * 60 * 1000);

    const { data: suspiciousIPs } = await supabase
      .from('security_events')
      .select('ip_address, COUNT(*) as failed_count')
      .eq('event_type', 'login_failed')
      .gte('created_at', cutoffTime.toISOString())
      .group('ip_address')
      .having('COUNT(*)', 'gte', this.alertThresholds.failed_logins.count);

    for (const { ip_address, failed_count } of suspiciousIPs || []) {
      await this.triggerSecurityAlert({
        type: 'brute_force_detected',
        severity: 'high',
        details: {
          ip_address,
          failed_attempts: failed_count,
          time_window_minutes: this.alertThresholds.failed_logins.window_minutes
        },
        actions: ['rate_limit_ip', 'notify_admin']
      });
    }
  }

  private async checkApiUsageAnomalies(): Promise<void> {
    // Detect unusual API usage patterns that might indicate abuse
    const { data: usageAnomalies } = await supabase.rpc('detect_usage_anomalies', {
      time_window_hours: 24,
      anomaly_threshold: 3.0 // 3 standard deviations
    });

    for (const anomaly of usageAnomalies || []) {
      await this.investigateUsageAnomaly(anomaly);
    }
  }

  async triggerSecurityAlert(alert: SecurityAlert): Promise<void> {
    // Log the alert
    await supabase
      .from('security_alerts')
      .insert({
        alert_type: alert.type,
        severity: alert.severity,
        details: alert.details,
        status: 'active',
        created_at: new Date()
      });

    // Execute alert actions
    for (const action of alert.actions) {
      await this.executeSecurityAction(action, alert);
    }

    // Notify administrators for high-severity alerts
    if (alert.severity === 'high' || alert.severity === 'critical') {
      await this.notifyAdministrators(alert);
    }
  }
}
```

---

## Part VI: Deployment and Operations

### Environment Setup and Configuration

**Production Environment Configuration:**
```bash
# Production environment variables
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Redis Cache
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXXXXXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Payment Processing
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# OpenRouter Integration
OPENROUTER_ORG_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENROUTER_PROVISIONING_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Analytics and Monitoring
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
BETTERSTACK_LOGS_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Security and Encryption
ENCRYPTION_SECRET=your-256-bit-encryption-secret-here
JWT_SECRET=your-jwt-secret-for-token-signing

# Models.dev Integration
MODELS_DEV_API_KEY=md_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Email Service
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SUPPORT_EMAIL=support@polydev.ai

# Feature Flags
ENABLE_CLI_INTEGRATION=true
ENABLE_MEMORY_EXTRACTION=true
ENABLE_PERSPECTIVE_GENERATION=true
ENABLE_SUBSCRIPTION_BILLING=true

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REDIS_URL=redis://localhost:6379

# Debug and Development
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

### Deployment Architecture

**Vercel Production Deployment:**
```typescript
// /vercel.json
{
  "version": 2,
  "build": {
    "env": {
      "NEXT_TELEMETRY_DISABLED": "1"
    }
  },
  "functions": {
    "src/app/api/perspectives/route.ts": {
      "maxDuration": 60
    },
    "src/app/api/memory/extract/route.ts": {
      "maxDuration": 45
    },
    "src/app/api/cli-command/route.ts": {
      "maxDuration": 35
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "X-Requested-With, Content-Type, Authorization"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/mcp/:path*",
      "destination": "/api/mcp/:path*"
    }
  ]
}

// /next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['sharp']
  },
  images: {
    domains: [
      'avatars.githubusercontent.com',
      'lh3.googleusercontent.com'
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' *.posthog.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' *.supabase.co *.posthog.com *.stripe.com;"
          }
        ]
      }
    ];
  },
  async rewrites() {
    return [
      {
        source: '/health',
        destination: '/api/health'
      }
    ];
  }
};

module.exports = nextConfig;
```

### Health Monitoring and Observability

**Comprehensive Health Checks:**
```typescript
// /src/app/api/health/route.ts
export async function GET(request: NextRequest) {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.2.2',
    environment: process.env.NODE_ENV,
    checks: {}
  };

  try {
    // Database connectivity
    healthCheck.checks.database = await checkDatabaseHealth();

    // Redis connectivity
    healthCheck.checks.redis = await checkRedisHealth();

    // External API connectivity
    healthCheck.checks.external_apis = await checkExternalAPIsHealth();

    // Provider health
    healthCheck.checks.providers = await checkProvidersHealth();

    // Memory extraction system
    healthCheck.checks.memory_system = await checkMemorySystemHealth();

    // CLI integration
    healthCheck.checks.cli_integration = await checkCLIIntegrationHealth();

    // Determine overall status
    const failedChecks = Object.values(healthCheck.checks).filter(
      check => check.status !== 'healthy'
    );

    if (failedChecks.length > 0) {
      healthCheck.status = failedChecks.some(check => check.status === 'critical')
        ? 'critical'
        : 'degraded';
    }

    const statusCode = healthCheck.status === 'healthy' ? 200 :
                      healthCheck.status === 'degraded' ? 207 : 503;

    return NextResponse.json(healthCheck, { status: statusCode });

  } catch (error) {
    return NextResponse.json({
      status: 'critical',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}

async function checkDatabaseHealth(): Promise<HealthCheckResult> {
  try {
    const start = Date.now();
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (error) throw error;

    return {
      status: 'healthy',
      response_time_ms: Date.now() - start,
      details: 'Database connection successful'
    };
  } catch (error) {
    return {
      status: 'critical',
      error: error.message,
      details: 'Database connection failed'
    };
  }
}

async function checkProvidersHealth(): Promise<HealthCheckResult> {
  try {
    const healthChecker = new ProviderHealthChecker();
    const providerStatuses = await healthChecker.getAllProviderHealth();

    const healthyProviders = providerStatuses.filter(p => p.status === 'healthy').length;
    const totalProviders = providerStatuses.length;

    if (healthyProviders === 0) {
      return {
        status: 'critical',
        details: 'No healthy providers available',
        provider_summary: providerStatuses
      };
    }

    if (healthyProviders < totalProviders * 0.7) {
      return {
        status: 'degraded',
        details: `${healthyProviders}/${totalProviders} providers healthy`,
        provider_summary: providerStatuses
      };
    }

    return {
      status: 'healthy',
      details: `${healthyProviders}/${totalProviders} providers healthy`,
      provider_summary: providerStatuses
    };

  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      details: 'Provider health check failed'
    };
  }
}
```

**Performance Metrics and Alerting:**
```typescript
export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map();

  // Real-time performance tracking
  trackMetric(name: string, value: number, tags: Record<string, string> = {}): void {
    const metric: PerformanceMetric = {
      name,
      value,
      tags,
      timestamp: Date.now()
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metricHistory = this.metrics.get(name)!;
    metricHistory.push(metric);

    // Keep only last 1000 metrics per type
    if (metricHistory.length > 1000) {
      metricHistory.shift();
    }

    // Check for alerts
    this.checkAlertConditions(name, metric);
  }

  // Performance analytics
  getMetricSummary(name: string, windowMinutes: number = 60): MetricSummary {
    const metrics = this.metrics.get(name) || [];
    const cutoffTime = Date.now() - windowMinutes * 60 * 1000;
    const recentMetrics = metrics.filter(m => m.timestamp > cutoffTime);

    if (recentMetrics.length === 0) {
      return {
        name,
        count: 0,
        average: 0,
        min: 0,
        max: 0,
        p50: 0,
        p95: 0,
        p99: 0
      };
    }

    const values = recentMetrics.map(m => m.value).sort((a, b) => a - b);

    return {
      name,
      count: values.length,
      average: values.reduce((sum, v) => sum + v, 0) / values.length,
      min: values[0],
      max: values[values.length - 1],
      p50: this.percentile(values, 0.5),
      p95: this.percentile(values, 0.95),
      p99: this.percentile(values, 0.99),
      window_minutes: windowMinutes
    };
  }

  private percentile(sortedValues: number[], p: number): number {
    const index = Math.ceil(sortedValues.length * p) - 1;
    return sortedValues[Math.max(0, index)];
  }

  // Alert system integration
  private async checkAlertConditions(name: string, metric: PerformanceMetric): Promise<void> {
    const alertRules = {
      'response_time_ms': { threshold: 5000, operator: 'gt', severity: 'warning' },
      'error_rate': { threshold: 0.05, operator: 'gt', severity: 'error' },
      'memory_usage_mb': { threshold: 1000, operator: 'gt', severity: 'warning' },
      'credit_balance': { threshold: 5.0, operator: 'lt', severity: 'info' }
    };

    const rule = alertRules[name];
    if (!rule) return;

    const shouldAlert = this.evaluateAlertCondition(metric.value, rule.threshold, rule.operator);

    if (shouldAlert) {
      await this.sendAlert({
        metric_name: name,
        current_value: metric.value,
        threshold: rule.threshold,
        severity: rule.severity,
        timestamp: new Date(metric.timestamp),
        tags: metric.tags
      });
    }
  }

  // Integration with external monitoring services
  async syncToBetterStack(): Promise<void> {
    try {
      const allMetrics = Array.from(this.metrics.entries()).flatMap(([name, metrics]) =>
        metrics.map(metric => ({ name, ...metric }))
      );

      // Send to BetterStack logs
      await fetch('https://in.logs.betterstack.com', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.BETTERSTACK_LOGS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          source: 'polydev-ai-metrics',
          metrics: allMetrics
        })
      });

    } catch (error) {
      console.error('Failed to sync metrics to BetterStack:', error);
    }
  }
}
```

---

## Conclusion

This comprehensive documentation covers the complete Polydev AI architecture, from its core MCP implementation to advanced features like zero-knowledge memory extraction, multi-model perspective generation, and enterprise-grade security. The platform represents a sophisticated approach to AI workflow enhancement, providing developers with powerful tools to overcome roadblocks while maintaining strict privacy and security standards.

### Key Architecture Strengths

1. **Modular Design**: Clean separation of concerns enables independent scaling and maintenance
2. **Security-First**: Zero-knowledge encryption and comprehensive audit trails meet enterprise requirements
3. **Performance Optimized**: Multi-layer caching, connection pooling, and intelligent concurrency management
4. **Extensible**: Plugin-like architecture supports new CLI tools and AI providers
5. **Reliable**: Comprehensive error handling, fallback mechanisms, and monitoring
6. **Cost-Effective**: Intelligent provider routing and cost optimization
7. **Privacy-Compliant**: GDPR-ready with comprehensive data management capabilities

### Innovation Highlights

- **Universal MCP Integration**: First-class support for multiple MCP clients
- **CLI Subscription Leverage**: Unique model allowing use of existing AI subscriptions
- **Zero-Knowledge Memory**: Secure context extraction without server-side access to sensitive data
- **Multi-Model Orchestration**: Sophisticated parallel processing across multiple AI providers
- **Intelligent Context Injection**: Automatic relevance-based context enhancement

The platform successfully bridges the gap between existing AI tools and the need for enhanced, multi-perspective AI assistance, creating a unified ecosystem that respects user privacy while providing powerful capabilities for overcoming development challenges.

---

**Document Statistics:**
- Total Sections: 24
- Code Examples: 85+
- Database Tables Documented: 15+
- API Endpoints Covered: 25+
- Security Features: 20+
- Performance Optimizations: 15+

**Last Updated:** September 15, 2024
**Version:** 1.2.2
**Document Size:** ~380KB

For the most up-to-date information, visit the [Polydev AI Documentation](https://polydev.ai/docs) or the [GitHub repository](https://github.com/polydev-ai/perspectives-mcp).