# Polydev - Multi-Model AI Perspectives

> Query 4 AI models simultaneously. Get unstuck faster with diverse perspectives from GPT-5, Claude, Gemini, and Grok.

## Quick Start

```bash
# 1. Login (opens browser, auto-configures token)
/polydev-login

# 2. Use it
/polydev How should I structure my React state?
```

## Commands

### `/polydev [question]`
Get multi-model AI perspectives on any coding problem.

**Examples:**
```
/polydev How should I structure my React state management?
/polydev Debug this TypeScript error: Property 'map' does not exist on type 'string'
/polydev What's the best approach for caching API responses?
/polydev Compare REST vs GraphQL for my mobile app backend
```

**What you get:**
- 4 expert perspectives from different AI models
- Diverse approaches to solve your problem
- Consensus where models agree
- Alternative solutions you might not have considered

---

### `/polydev-login`
Authenticate with Polydev - opens browser automatically.

```
/polydev-login
```

**What happens:**
1. Browser opens to Polydev authentication
2. Sign in with Google or GitHub
3. Token is automatically configured
4. Start using `/polydev` immediately

No manual token copying needed.

---

### `/polydev-auth`
Check your authentication status and account info.

```
/polydev-auth
```

**Shows:**
- Account email and subscription tier
- Credits remaining
- Enabled models
- Setup instructions (if not authenticated)

---

## Pricing

| Tier | Credits | Cost |
|------|---------|------|
| **Free** | 500/month | $0 (no card required) |
| **Premium** | 10,000/month | $10/month |

**1 credit = 1 request** (queries all 4 models)

---

## Available Models

All models are queried simultaneously:

- **GLM-4.7** - Zhipu AI's flagship model
- **Gemini 3 Flash** - Google's fast reasoning model
- **Grok 4.1 Fast Reasoning** - xAI's quick inference model
- **GPT-5 Mini** - OpenAI's efficient model

---

## IDE Support

Works universally in any MCP-compatible IDE:

| IDE | Status | Notes |
|-----|--------|-------|
| **Claude Code** | ✅ Full support | Skills + MCP |
| **Cursor** | ✅ Full support | SKILL.md + MCP |
| **Continue** | ✅ Full support | MCP tools |
| **Windsurf** | ✅ Full support | MCP tools |
| **VSCode** | ✅ Full support | With MCP extension |
| **Claude Desktop** | ✅ Full support | MCP tools |

---

## MCP Configuration

If your IDE doesn't auto-detect Polydev, add this to your MCP config:

```json
{
  "mcpServers": {
    "polydev": {
      "command": "npx",
      "args": ["-y", "polydev-mcp"],
      "env": {
        "POLYDEV_USER_TOKEN": "your_token_here"
      }
    }
  }
}
```

**Note:** Running `/polydev-login` automatically configures your token.

---

## When to Use Polydev

✅ **Perfect for:**
- Stuck on a complex problem
- Architecture decisions
- Debugging difficult issues
- Comparing different approaches
- Getting validation on your solution
- Learning new patterns

❌ **Not needed for:**
- Simple, straightforward tasks
- Tasks with obvious solutions
- When you just need execution, not advice

---

## Tips for Best Results

1. **Be specific** - Include error messages, code snippets, constraints
2. **Provide context** - What have you tried? What's the goal?
3. **Ask focused questions** - One problem at a time works best

**Good prompt:**
```
/polydev I'm getting "Cannot read property 'map' of undefined" in my React component.
The data comes from an async API call. Here's the code: [paste code]
What's causing this and how should I fix it?
```

**Less effective:**
```
/polydev My code doesn't work
```

---

## Links

- **Dashboard**: https://polydev.ai/dashboard
- **Documentation**: https://polydev.ai/docs/mcp-integration
- **Support**: support@polydev.ai
