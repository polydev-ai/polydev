# What is Polydev?

**Polydev is the most advanced Model Context Protocol platform that bridges the gap between AI agents and multiple LLM providers through intelligent fallback systems.**

When your AI agent gets stuck on a complex problem, needs diverse perspectives, or requires access to specialized models, Polydev provides the bridge to overcome these limitations.

## Core Concepts

### Multi-LLM Intelligence
Instead of relying on a single AI model's perspective, Polydev allows your agents to consult multiple frontier models simultaneously:

- **GPT-4** for reasoning and code generation
- **Claude 3.5 Sonnet** for analysis and explanations  
- **Gemini Pro** for creative solutions and large context
- **Groq models** for ultra-fast inference
- **Perplexity** for research and real-time information
- **37+ models** across **20+ providers**

### Intelligent Fallback System

Polydev implements a sophisticated priority-based routing system that ensures your requests always succeed:

```mermaid
flowchart TD
    A[Agent Request] --> B{CLI Tools Available?}
    B -->|Yes| C[Claude Code / Codex CLI / Gemini CLI]
    B -->|No| D{Personal API Keys?}
    D -->|Yes| E[Direct Provider APIs]
    D -->|No| F{Provisioned Keys?}
    F -->|Yes| G[User-specific Keys]
    F -->|No| H[Credits via OpenRouter]
    
    C --> I[Success Response]
    E --> I
    G --> I
    H --> I
```

**Priority Order:**
1. **CLI Tools** (Highest) - Use authenticated developer CLIs
2. **Personal API Keys** - Your configured provider keys  
3. **Provisioned Keys** - User-specific managed keys
4. **Credits System** (Fallback) - Pay-per-use via OpenRouter

### Model Context Protocol Native

Built specifically for MCP (Model Context Protocol) integration:

- **Agent-First Design**: Designed for AI agents, not humans
- **Standardized Interface**: Consistent tool interface across all providers
- **Context Awareness**: Intelligent project memory and context selection
- **Streaming Support**: Real-time response streaming
- **Error Recovery**: Automatic retry and fallback mechanisms

## Key Features

### 🛠️ CLI Provider Integration
Direct integration with popular developer CLI tools:
- **Claude Code** - Official Anthropic CLI
- **Codex CLI** - OpenAI's developer interface  
- **Gemini CLI** - Google's AI development tool

### 🔑 Comprehensive API Key Management
Support for 20+ AI providers with advanced configuration:
- **Encrypted Storage**: Browser-based key encryption
- **Budget Controls**: Monthly spending limits per key
- **Rate Limiting**: Prevent API quota exhaustion
- **Custom Endpoints**: Support for custom deployments
- **Usage Analytics**: Track costs and performance

### 🧠 Smart Project Memory
TF-IDF-based context selection for better assistance:
- **Light Memory**: Recently modified files
- **Full Memory**: Similarity-based snippet selection
- **Context Budget**: Intelligent token management
- **File Filtering**: Include/exclude patterns

### ⚡ Performance Optimized
- **Parallel Queries**: Multiple models queried simultaneously
- **Response Caching**: Intelligent caching of similar requests
- **Connection Pooling**: Efficient API connection management
- **Streaming Responses**: Real-time response delivery

## Use Cases

### 🐛 Debugging Roadblocks
When your agent encounters difficult bugs:

```javascript
const solution = await callTool({
  name: "get_perspectives",
  arguments: {
    prompt: "My React component re-renders excessively despite useMemo. Multiple models help me identify the root cause.",
    models: ["gpt-4", "claude-3-sonnet", "gemini-pro"],
    project_memory: "full"
  }
});
```

### 🏗️ Architecture Decisions
For complex technical decisions requiring multiple viewpoints:

```javascript
const perspectives = await callTool({
  name: "get_perspectives", 
  arguments: {
    prompt: "Should I use microservices or monolith for this fintech app? I need expert perspectives on trade-offs.",
    models: ["gpt-4", "claude-3-opus", "llama-3.1-405b"]
  }
});
```

### 📝 Code Review & Security
Getting comprehensive code analysis:

```javascript
const review = await callTool({
  name: "polydev.send_cli_prompt",
  arguments: {
    provider_id: "claude_code",
    prompt: "Review this authentication module for security vulnerabilities and suggest improvements.",
    mode: "args"
  }
});
```

## Why Polydev?

### For AI Agents
- **Break Decision Paralysis**: When stuck, get multiple expert perspectives
- **Access Specialized Models**: Use the right model for each task
- **Reliable Fallback**: Never fail due to API issues or rate limits
- **Context Awareness**: Include relevant project context automatically

### For Developers  
- **No Vendor Lock-in**: Use any combination of AI providers
- **Cost Optimization**: Intelligent routing to minimize costs
- **Subscription Leverage**: Use existing CLI subscriptions
- **Advanced Analytics**: Detailed usage and performance metrics

### For Organizations
- **Centralized Management**: Single platform for all AI providers
- **Budget Control**: Granular spending limits and monitoring
- **Security**: Encrypted key storage and secure API handling
- **Scalability**: Handle team and enterprise usage patterns

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                MCP Client (Agent/IDE)                   │
│              (Claude, Cline, etc.)                      │
└──────────────────────┬──────────────────────────────────┘
                       │ JSON-RPC over stdio
                       ▼
┌─────────────────────────────────────────────────────────┐
│              Polydev MCP Server                         │
│                                                         │
│  ┌─────────────────┐  ┌─────────────────┐             │
│  │ CLI Integration │  │ Perspectives    │             │
│  │                 │  │ Multi-LLM       │             │
│  │ • Claude Code   │  │                 │             │
│  │ • Codex CLI     │  │ • 37+ Models    │             │
│  │ • Gemini CLI    │  │ • 20+ Providers │             │
│  └─────────────────┘  └─────────────────┘             │
│                                                         │
│  ┌─────────────────┐  ┌─────────────────┐             │
│  │ Fallback System │  │ Project Memory  │             │
│  │                 │  │                 │             │
│  │ CLI → API Keys  │  │ • TF-IDF        │             │
│  │ → Provisioned   │  │ • Context       │             │
│  │ → Credits       │  │ • Smart Cache   │             │
│  └─────────────────┘  └─────────────────┘             │
└─────────────────────────────────────────────────────────┘
```

## Next Steps

Ready to get started? Follow our [Quick Start Guide](quick-start.md) to have Polydev running in under 5 minutes.

Or dive deeper into specific areas:
- [Configuration](../config/) - Set up your environment  
- [Providers](../providers/) - Configure AI providers
- [MCP Integration](../mcp/) - Integrate with your agent
- [Features](../features/) - Explore advanced capabilities

---

**Questions?** Check our [troubleshooting guide](../config/troubleshooting.md) or join our [Discord community](https://discord.gg/polydev).