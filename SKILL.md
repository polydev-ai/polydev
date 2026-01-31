# Polydev - Multi-Model AI Perspectives

## Description
Get perspectives from multiple AI models (GPT-5, Claude, Gemini, Grok) simultaneously when you're stuck. Query 4 models with one request for diverse solutions.

## Commands

### /polydev
Get multi-model AI perspectives on any coding problem.

**Usage:**
```
/polydev [your question or problem]
```

**Examples:**
- `/polydev How should I structure my React state management?`
- `/polydev Debug this TypeScript error: Property 'map' does not exist on type 'string'`
- `/polydev What's the best approach for caching API responses?`

### /polydev-auth
Check your Polydev authentication status or get setup instructions.

**Usage:**
```
/polydev-auth
```

Shows: Account status, credits remaining, enabled models, and setup instructions if not authenticated.

### /polydev-login
Authenticate with Polydev by opening the browser for signup/login.

**Usage:**
```
/polydev-login
```

Opens your browser to authenticate and automatically configures your token.

## Setup

### Quick Start (2 minutes)
1. Run `/polydev-login` to open browser and authenticate
2. Your token is automatically configured
3. Start using `/polydev` to get multi-model perspectives

### Manual Setup
1. Visit https://polydev.ai/signup to create your free account
2. Go to https://polydev.ai/dashboard/mcp-tools
3. Generate your MCP access token
4. Set `POLYDEV_USER_TOKEN` environment variable

## Pricing
- **Free Tier**: 500 credits/month (no credit card required)
- **Premium**: $10/month for 10,000 credits
- **Cost**: 1 credit per request (all models included)

## Available Models
- GLM-4.7
- Gemini 3 Flash
- Grok 4.1 Fast Reasoning
- GPT-5 Mini

## When to Use
- Stuck on a complex problem
- Need diverse perspectives on architecture decisions
- Want validation from multiple AI models
- Debugging difficult issues
- Comparing different approaches

## MCP Configuration
If your IDE supports MCP, add this to your config:
```json
{
  "mcpServers": {
    "polydev": {
      "command": "npx",
      "args": ["-y", "polydev-mcp"],
      "env": { "POLYDEV_USER_TOKEN": "polydev_your_token_here" }
    }
  }
}
```

## Links
- Dashboard: https://polydev.ai/dashboard
- Documentation: https://polydev.ai/docs/mcp-integration
- Support: support@polydev.ai
