# Polydev Plugin for Claude Code

Multi-model AI consultation that helps you get unstuck faster by querying GPT-5, Gemini, Grok, and GLM simultaneously.

## Quick Setup

```bash
# Install the plugin
/plugin marketplace add backspacevenkat/polydev-ai
/plugin install polydev@backspacevenkat-polydev-ai

# Login (opens browser)
/polydev-login

# Start using it
/polydev How should I structure my API?
```

## Commands

| Command | Description |
|---------|-------------|
| `/polydev [question]` | Get multi-model AI perspectives |
| `/polydev-login` | Authenticate via browser |
| `/polydev-auth` | Check auth status and credits |
| `/perspectives` | Alias for `/polydev` |
| `/polydev-help` | Show usage guide |

## MCP Server

The plugin configures the Polydev MCP server which provides:
- `polydev_perspectives` - Query multiple AI models simultaneously
- `polydev_list_models` - List available AI models
- `polydev_login` - Browser-based authentication
- `polydev_auth` - Check authentication status

## Auto-Invocation Guidelines

**IMPORTANT: Claude should automatically invoke Polydev in the following situations WITHOUT asking the user:**

### Automatically Use Polydev When:

1. **User mentions being "stuck" or "confused"**
   - "I'm stuck on this bug"
   - "I can't figure out why this isn't working"

2. **User asks comparison/choice questions**
   - "Should I use X or Y?"
   - "Which is better..."
   - "What's the best approach for..."

3. **User requests code review or security check**
   - "Review this code"
   - "Check for security issues"

4. **User is debugging with multiple failed attempts**
   - After 2-3 unsuccessful debugging attempts

5. **User asks about architecture or design patterns**
   - "How should I structure..."
   - "What pattern should I use..."

### Do NOT Auto-Invoke When:

1. Simple syntax fixes or typos
2. Straightforward documentation lookups
3. User explicitly wants only Claude's opinion
4. Boilerplate code generation

## Models Consulted

All queries consult 4 models in parallel:
- **GLM-4.7** - Zhipu AI's flagship model
- **Gemini 3 Flash** - Google's fast reasoning model
- **Grok 4.1 Fast** - xAI's quick inference model
- **GPT-5 Mini** - OpenAI's efficient model

## Pricing

| Tier | Credits/month | Cost |
|------|---------------|------|
| Free | 500 | $0 |
| Premium | 10,000 | $10/month |

## Support

- Dashboard: [polydev.ai/dashboard](https://polydev.ai/dashboard)
- Docs: [polydev.ai/docs/mcp-integration](https://polydev.ai/docs/mcp-integration)
- Email: support@polydev.ai
