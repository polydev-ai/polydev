# Quick Start Guide

Get Polydev running in under 5 minutes and make your first multi-LLM perspective request.

## Prerequisites

Before starting, ensure you have:
- **Node.js 18+** installed on your system
- **npm** or **yarn** package manager
- An AI agent or MCP-compatible client (Claude Desktop, Cline, etc.)

## Step 1: Choose Your Setup Method

Polydev offers three ways to get started, in order of recommendation:

### 🥇 **Option A: CLI Providers (Recommended)**
Use your existing CLI subscriptions - no API key management needed.

### 🥈 **Option B: Your Own API Keys** 
Configure your provider API keys for maximum control.

### 🥉 **Option C: MCP Tokens**
Use Polydev-managed keys for quick testing.

---

## Option A: CLI Providers Setup

### 1. Install and Authenticate CLI Tools

Choose one or more CLI providers to install:

#### Claude Code (Anthropic)
```bash
# Install Claude Code CLI
npm install -g @anthropic-ai/claude-code

# Authenticate with your Claude Pro subscription
claude auth login

# Verify installation
claude --version
```

#### Codex CLI (OpenAI)
```bash
# Install from OpenAI (requires ChatGPT Plus)
# Follow instructions at: https://openai.com/chatgpt/desktop

# Authenticate
codex auth

# Verify installation  
codex --version
```

#### Gemini CLI
```bash
# Install Google Cloud SDK
# macOS
brew install google-cloud-sdk

# Authenticate
gcloud auth login
gcloud auth application-default login

# Verify installation
gcloud --version
```

### 2. Install Polydev MCP Server

```bash
# Clone the repository
git clone https://github.com/polydev-ai/polydev.git
cd polydev

# Install dependencies
npm install

# Start the MCP server
npm run mcp:server
```

### 3. Configure Your MCP Client

Add Polydev to your MCP client configuration:

**For Claude Desktop (`~/Library/Application\ Support/Claude/claude_desktop_config.json`):**
```json
{
  "mcpServers": {
    "polydev": {
      "command": "node",
      "args": ["/path/to/polydev/mcp/server.js"],
      "env": {
        "POLYDEV_CLI_DEBUG": "1"
      }
    }
  }
}
```

**For Cline (VS Code extension settings):**
```json
{
  "cline.mcpServers": {
    "polydev": {
      "command": "node",
      "args": ["/path/to/polydev/mcp/server.js"]
    }
  }
}
```

### 4. Test CLI Integration

Test that your CLI tools are detected:

```javascript
// In your MCP client
const detection = await callTool({
  name: "polydev.force_cli_detection",
  arguments: {}
});

console.log(detection);
// Should show available CLI providers
```

### 5. Make Your First Request

```javascript
// Send a prompt to Claude Code CLI
const response = await callTool({
  name: "polydev.send_cli_prompt",
  arguments: {
    provider_id: "claude_code",
    prompt: "Explain the difference between React hooks and class components",
    mode: "args"
  }
});

console.log(response.content);
```

---

## Option B: Your Own API Keys Setup

### 1. Get API Keys

Obtain API keys from one or more providers:

- **OpenAI**: Get API key from [OpenAI Platform](https://platform.openai.com/api-keys)
- **Anthropic**: Get API key from [Anthropic Console](https://console.anthropic.com/)
- **Google**: Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Groq**: Get API key from [Groq Console](https://console.groq.com/keys)

### 2. Install and Configure Polydev

```bash
# Clone and install
git clone https://github.com/polydev-ai/polydev.git
cd polydev
npm install

# Set up environment variables
cp .env.example .env.local
```

Edit `.env.local`:
```env
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# PostHog Analytics (optional)
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

### 3. Start Polydev Dashboard

```bash
# Start the development server
npm run dev

# Open dashboard
open http://localhost:3000
```

### 4. Configure API Keys in Dashboard

1. Navigate to **Settings → API Keys**
2. Click **"Add API Key"**
3. Select your provider (OpenAI, Anthropic, etc.)
4. Enter your API key
5. Configure optional settings (budget, rate limits)
6. Click **"Save"**

### 5. Configure MCP Server

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "polydev": {
      "command": "node", 
      "args": ["/path/to/polydev/mcp/server.js"],
      "env": {
        "POLYDEV_API_URL": "http://localhost:3000/api/perspectives"
      }
    }
  }
}
```

### 6. Test Multi-LLM Perspectives (latest models)

```javascript
// Get perspectives from multiple models
const perspectives = await callTool({
  name: "get_perspectives",
  arguments: {
    prompt: "What are the tradeoffs of using TypeScript vs JavaScript for a large Next.js application?",
    mode: "user_keys",
    models: ["gpt-5", "claude-opus-4", "gemini-2.5-pro", "grok-4-high"]
  }
});

console.log(perspectives);
```

---

## Option C: MCP Tokens Setup

### 1. Generate MCP Token

1. Visit [https://polydev.ai/dashboard/mcp-tools](https://polydev.ai/dashboard/mcp-tools)
2. Sign up or log in
3. Click **"Generate MCP Token"**
4. Copy the token (starts with `poly_`)

### 2. Install MCP Server

```bash
# Download the standalone MCP server
curl -o polydev-mcp-server.js https://cdn.polydev.ai/mcp/server.js

# Or clone the full repository
git clone https://github.com/polydev-ai/polydev.git
```

### 3. Configure MCP Client

```json
{
  "mcpServers": {
    "polydev": {
      "command": "node",
      "args": ["./polydev-mcp-server.js"],
      "env": {
        "POLYDEV_USER_TOKEN": "poly_your_token_here",
        "POLYDEV_API_URL": "https://polydev.ai/api/perspectives"
      }
    }
  }
}
```

### 4. Test Managed Mode

```javascript
// Use managed Polydev keys
const perspectives = await callTool({
  name: "get_perspectives",
  arguments: {
    prompt: "Help me understand the tradeoffs between REST and GraphQL for our public API",
    user_token: "poly_your_token_here",
    mode: "managed",
    models: ["gpt-5", "claude-opus-4"]
  }
});
```

---

## Verification & Testing

### Test All Integration Methods

Once configured, test the priority fallback system:

```javascript
// This will try CLI → API Keys → Credits in order
const result = await callTool({
  name: "get_perspectives",
  arguments: {
    prompt: "Explain how React's useEffect hook works with cleanup functions",
    mode: "user_keys"  // Will fallback through priorities
  }
});

// Check which method was used
console.log(result.fallback_method);  // "cli", "api", or "credits"
```

### Verify CLI Detection

```javascript
const cliStatus = await callTool({
  name: "polydev.get_cli_status",
  arguments: {}
});

console.log(cliStatus);
// Shows which CLI tools are available and authenticated
```

### Test Project Memory

```javascript
const contextualHelp = await callTool({
  name: "get_perspectives",
  arguments: {
    prompt: "Review my authentication code for security issues",
    project_memory: "full",
    project_context: {
      root_path: "/path/to/your/project",
      includes: ["**/*.js", "**/*.ts"],
      excludes: ["node_modules/**"]
    }
  }
});
```

## Next Steps

🎉 **Congratulations!** Polydev is now configured. Here's what to explore next:

### Immediate Next Steps
1. **[Configure More Providers](../providers/)** - Add additional AI providers
2. **[Explore Features](../features/)** - Learn about project memory and analytics
3. **[Agent Integration](../mcp/agents/)** - Integrate with your specific agent

### Advanced Configuration
1. **[Environment Setup](../config/environment.md)** - Advanced environment configuration
2. **[Custom Providers](../providers/custom-providers.md)** - Add custom OpenAI-compatible APIs
3. **[Troubleshooting](../config/troubleshooting.md)** - Solve common issues

### Learn More
1. **[Architecture Overview](architecture.md)** - Understand how Polydev works
2. **[API Reference](../api/)** - Complete API documentation
3. **[Best Practices](../features/best-practices.md)** - Optimization tips

---

## Quick Troubleshooting

**CLI not detected?**
```bash
# Check if CLI is in PATH
which claude  # or codex, gemini
```

**API keys not working?**
- Verify keys are correctly entered (no extra spaces)
- Check rate limits and quotas in provider dashboards
- Test keys directly with provider APIs

**MCP server not connecting?**
- Verify file paths in configuration
- Check environment variables are set
- Enable debug mode with `POLYDEV_CLI_DEBUG=1`

**Need more help?** Check our [troubleshooting guide](../config/troubleshooting.md) or join our [Discord](https://discord.gg/polydev).

---

**🚀 Ready to explore?** Try asking your agent a complex question and watch as Polydev provides multiple expert perspectives to help solve it!
