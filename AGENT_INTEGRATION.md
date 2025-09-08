# Polydev Perspectives - Agent Integration Guide

**When your AI agent gets stuck, Polydev bridges the gap with multiple AI perspectives.**

## What is Polydev Perspectives?

Polydev Perspectives is an MCP (Model Context Protocol) tool designed specifically for agentic workflows. When your agent encounters a roadblock, difficult decision, or complex problem, it can call our tool to get diverse perspectives from multiple leading LLMs simultaneously.

**Core Concept**: Instead of being limited to one AI model's viewpoint, your agent can consult GPT-4, Claude 3 Sonnet, Gemini Pro, and other models in parallel, then use their combined insights to overcome challenges.

## Why Use Multiple AI Perspectives?

Different AI models have different strengths:
- **GPT-4**: Strong at reasoning and code generation
- **Claude 3 Sonnet**: Excellent at analysis and explanations  
- **Gemini Pro**: Good at creative solutions and alternative approaches

By consulting multiple models, your agent can:
- ✅ Break through decision paralysis
- ✅ Get diverse approaches to complex problems
- ✅ Validate solutions across different AI perspectives
- ✅ Discover blind spots in its reasoning
- ✅ Access the collective intelligence of multiple frontier models

## Quick Integration

### 1. Set Up Your API Keys

**Recommended: Use Your Own API Keys**
1. Visit [https://polydev.ai/dashboard/api-keys](https://polydev.ai/dashboard/api-keys)
2. Add API keys for providers you want to use:
   - OpenAI (GPT-4, GPT-3.5)
   - Anthropic (Claude 3 Sonnet, Opus, Haiku) 
   - Google (Gemini Pro, Gemini Flash)
   - Groq (Llama 3.1, Mixtral, Gemma)
   - Perplexity (Sonar models)
   - Together AI (Open source models)
   - And 16+ more providers
3. Configure custom endpoints, budgets, rate limits
4. Sign in to authenticate API calls

**Alternative: Use MCP Tokens (Limited)**
- Visit [https://polydev.ai/dashboard/mcp-tools](https://polydev.ai/dashboard/mcp-tools)
- Generate MCP token for basic managed key access

### 2. Add to Your MCP Server Configuration

```json
{
  "mcpServers": {
    "polydev-perspectives": {
      "command": "node",
      "args": ["/path/to/polydev/mcp/server.js"],
      "env": {
        "POLYDEV_API_URL": "https://polydev.ai/api/perspectives"
      }
    }
  }
}
```

### 3. Use in Your Agent

**With CLI Providers (Highest Priority):**
```typescript
// When your agent gets stuck and you have CLI tools authenticated:
const cliResponse = await callTool({
  name: "polydev.send_cli_prompt",
  arguments: {
    provider_id: "claude_code",  // or "codex_cli", "gemini_cli"
    prompt: "I'm debugging a React performance issue. The component re-renders excessively but I can't pinpoint why. Help me identify potential causes and solutions.",
    mode: "args",  // or "stdin" for different input modes
    timeout_ms: 30000,
    user_id: "user_123"  // for usage tracking
  }
});
```

**With Your Own API Keys (Second Priority):**
```typescript
// When your agent gets stuck (user must be signed in):
const perspectives = await callTool({
  name: "get_perspectives",
  arguments: {
    prompt: "I'm debugging a React performance issue. The component re-renders excessively but I can't pinpoint why. Help me identify potential causes and solutions.",
    mode: "user_keys",  // Use your configured API keys
    models: ["gpt-4", "claude-3-sonnet", "gemini-pro", "llama-3.1-70b-versatile", "llama-3.1-sonar-large-128k-online"],
    project_memory: "light"
  }
});
```

**With MCP Token (Third Priority):**
```typescript
const perspectives = await callTool({
  name: "get_perspectives", 
  arguments: {
    prompt: "I'm debugging a React performance issue...",
    user_token: "poly_your_token_here",
    mode: "managed",
    models: ["gpt-4", "claude-3-sonnet", "gemini-pro"]  // Limited selection
  }
});
```

## CLI Provider Integration

Polydev now provides seamless integration with popular developer CLI tools as the highest priority in the fallback system:

### Supported CLI Providers

- **Claude Code** (`claude_code`): Official Anthropic CLI - `claude chat`
- **Codex CLI** (`codex_cli`): OpenAI's developer-focused CLI interface
- **Gemini CLI** (`gemini_cli`): Google's AI CLI tool for developers

### CLI Integration Benefits

✅ **No API Key Management**: Uses your existing CLI authentication  
✅ **Subscription-Based**: Uses your existing CLI subscriptions  
✅ **Full Model Access**: Access to latest models through CLI providers  
✅ **Seamless Authentication**: Works with your existing login sessions  
✅ **Cross-Platform**: Works on Windows, macOS, and Linux  

### CLI Provider Tools

#### Detect Available CLIs
```javascript
const detection = await callTool({
  name: "polydev.force_cli_detection",
  arguments: {
    user_id: "user_123",  // optional for stdio wrapper
    provider_id: "claude_code"  // optional, detects all if not provided
  }
});

// Returns status for each CLI provider
console.log(detection.results);
// {
//   "claude_code": {
//     "available": true,
//     "authenticated": true,
//     "version": "claude-code v1.2.3",
//     "path": "/usr/local/bin/claude"
//   },
//   "codex_cli": {
//     "available": false,
//     "authenticated": false,
//     "error": "Codex CLI not found in PATH"
//   }
// }
```

#### Check CLI Status (Cached)
```javascript
const status = await callTool({
  name: "polydev.get_cli_status", 
  arguments: {
    provider_id: "claude_code"  // optional, gets all if not provided
  }
});
```

#### Send Prompt to CLI
```javascript
const response = await callTool({
  name: "polydev.send_cli_prompt",
  arguments: {
    provider_id: "claude_code",
    prompt: "Help me debug this authentication error in my Node.js app",
    mode: "args",  // "args" or "stdin"
    timeout_ms: 30000,
    user_id: "user_123"  // optional for usage tracking
  }
});

// Returns CLI response with metadata
console.log(response);
// {
//   "success": true,
//   "content": "Looking at your authentication error...",
//   "tokens_used": 150,
//   "latency_ms": 1200,
//   "provider": "claude_code",
//   "mode": "args"
// }
```

## Agent Use Cases

### 1. **Debugging Roadblocks (CLI First)**
```javascript
// Try CLI provider first
const cliHelp = await callTool({
  name: "polydev.send_cli_prompt",
  arguments: {
    provider_id: "claude_code",
    prompt: "My SQL query is slow despite having indexes. I've tried standard optimizations but performance is still poor. What am I missing?",
    mode: "args"
  }
});

// Fallback to multiple perspectives if needed
if (!cliHelp.success) {
  const perspectives = await callTool({
    name: "get_perspectives", 
    arguments: {
      prompt: "My SQL query is slow despite having indexes. I've tried standard optimizations but performance is still poor. What am I missing?",
      mode: "user_keys",
      models: ["gpt-4", "claude-3-sonnet", "gemini-pro"],
      project_memory: "full"
    }
  });
}
```

### 2. **Architecture Decisions (Multiple Perspectives)**
```javascript
{
  "prompt": "I'm choosing between microservices and monolith for a fintech app. I need multiple expert perspectives on trade-offs, security, and scalability.",
  "mode": "user_keys",
  "models": ["gpt-4", "claude-3-opus", "llama-3.1-405b-reasoning"]  // High-reasoning models
}
```

### 3. **Code Review & Improvements (CLI + Context)**
```javascript
// Use CLI with project context
const review = await callTool({
  name: "polydev.send_cli_prompt",
  arguments: {
    provider_id: "claude_code",
    prompt: "Review this authentication module for security vulnerabilities: [paste code here]. Focus on authentication bypass risks, token handling, and session management.",
    mode: "args"
  }
});

// Or use traditional perspectives with project memory
const perspectives = await callTool({
  name: "get_perspectives",
  arguments: {
    prompt: "Review this authentication module for security vulnerabilities and suggest improvements. I want multiple security-focused perspectives.",
    user_token: "poly_...",
    project_memory: "full",
    project_context: {
      root_path: "/workspace/myapp",
      includes: ["**/*.js", "**/*.ts"],
      excludes: ["node_modules/**", "tests/**"]
    }
  }
});
```

### 4. **Problem-Solving Stuck Points (CLI Priority)**
```javascript
// Try Claude Code first for technical debugging
const solution = await callTool({
  name: "polydev.send_cli_prompt",
  arguments: {
    provider_id: "claude_code",
    prompt: "I'm implementing OAuth2 PKCE flow but getting 'invalid_request' errors. The documentation is unclear about parameter encoding. Help me troubleshoot with specific code examples.",
    mode: "args",
    timeout_ms: 45000  // Longer timeout for complex problems
  }
});

// Fallback to managed tokens if CLI unavailable
if (!solution.success) {
  const perspectives = await callTool({
    name: "get_perspectives",
    arguments: {
      prompt: "I'm implementing OAuth2 PKCE flow but getting 'invalid_request' errors. The documentation is unclear about parameter encoding. Help me troubleshoot.",
      user_token: "poly_...",
      temperature: 0.3  // Lower temperature for technical accuracy
    }
  });
}
```

## Project Memory Integration

Polydev can include your project context when generating perspectives:

- **`none`**: No project context (fastest)
- **`light`**: Include recently modified files
- **`full`**: TF-IDF similarity matching to find most relevant code snippets

```javascript
{
  "prompt": "How can I optimize this database query?",
  "user_token": "poly_...",
  "project_memory": "full",
  "project_context": {
    "root_path": "/workspace/myapp",
    "includes": ["**/*.sql", "**/*.js"],
    "excludes": ["migrations/**", "node_modules/**"]
  }
}
```

## Response Format

Polydev returns formatted perspectives that your agent can directly process:

```markdown
# Multiple AI Perspectives

Got 3 perspectives in 1247ms using 892 tokens.

## GPT-4 Perspective
The performance issue likely stems from unnecessary re-renders caused by...

*Tokens: 234, Latency: 1100ms*

---

## CLAUDE-3-SONNET Perspective
Looking at React performance optimization, I'd focus on these areas...

*Tokens: 198, Latency: 987ms*

---

## GEMINI-PRO Perspective
From a different angle, consider these React optimization strategies...

*Tokens: 156, Latency: 892ms*
```

## Best Practices for Agents

### 1. **Be Specific in Prompts**
❌ "Help me with this code"
✅ "This React component re-renders on every state change even with useMemo. Help me identify why the memoization isn't working."

### 2. **Use Project Memory for Context**
- Include relevant file patterns
- Exclude build artifacts and dependencies
- Use `full` memory for complex debugging

### 3. **Select Appropriate Models**
- All models for diverse perspectives
- Specific models for specialized tasks
- Adjust temperature (0.1-0.3 for technical, 0.7+ for creative)

### 4. **Handle Responses Intelligently**
```javascript
const perspectives = await getPerspectives(prompt);

// Extract common themes across responses
const commonSolutions = findCommonAdvice(perspectives.responses);

// Try most frequently suggested solution first
if (commonSolutions.length > 0) {
  return implementSolution(commonSolutions[0]);
}
```

## Rate Limits & Pricing

- **Standard Tier**: 100 requests/minute, 2000/hour
- **All API keys managed by Polydev** - no setup required
- **Transparent pricing** - see usage in dashboard
- **Project memory** - cached locally for performance

## Integration Examples

### Claude Desktop MCP

```json
{
  "name": "get_perspectives", 
  "arguments": {
    "prompt": "I'm stuck implementing WebRTC peer connections. The ICE candidates aren't exchanging properly.",
    "user_token": "poly_abc123...",
    "models": ["gpt-4", "claude-3-sonnet"]
  }
}
```

### Python Agent Framework

```python
import requests

def get_perspectives_when_stuck(problem_description, context_path=None):
    payload = {
        "prompt": f"Agent stuck: {problem_description}",
        "user_token": os.environ["POLYDEV_TOKEN"],
        "project_memory": "light" if context_path else "none"
    }
    
    if context_path:
        payload["project_context"] = {"root_path": context_path}
    
    response = requests.post(
        "https://polydev.ai/api/perspectives",
        json=payload
    )
    
    return response.json()
```

### Node.js Agent

```javascript
class AgentWithPerspectives {
  async solveWithPerspectives(problem, options = {}) {
    const response = await fetch('https://polydev.ai/api/perspectives', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Agent needs help: ${problem}`,
        user_token: process.env.POLYDEV_TOKEN,
        models: options.models || ['gpt-4', 'claude-3-sonnet'],
        project_memory: options.includeContext ? 'full' : 'none'
      })
    });
    
    return await response.json();
  }
}
```

## Troubleshooting

### Common Issues

**"Authentication failed"**
- Generate new token at dashboard
- Check token isn't expired
- Ensure proper token format (`poly_...`)

**"No perspectives received"** 
- Check internet connectivity
- Verify prompt isn't empty
- Try with default models first

**"Project memory not working"**
- Ensure root_path exists and is accessible
- Check file patterns include target files
- Verify sufficient disk space for caching

### Debug Mode

```bash
# Enable debug logging in MCP server
export POLYDEV_DEBUG=1
node mcp/server.js
```

---

**Ready to eliminate agent roadblocks?**  
Get started at [https://polydev.ai/dashboard/mcp-tools](https://polydev.ai/dashboard/mcp-tools)

*Polydev Perspectives - The bridge between your agent and multiple AI minds.*