# /polydev-help - Polydev Setup and Usage Guide

Display help information about Polydev multi-model AI consultation.

## Response Template

When the user runs `/polydev-help`, respond with:

---

## Polydev - Multi-Model AI Consultation

Query 4 AI models simultaneously. Get unstuck faster with diverse perspectives from GPT-5, Gemini, Grok, and GLM.

### Quick Start

```bash
# 1. Login (opens browser, auto-configures token)
/polydev-login

# 2. Use it
/polydev How should I structure my React state?
```

### Available Commands

| Command | Description |
|---------|-------------|
| `/polydev [question]` | Get multi-model AI perspectives on any problem |
| `/polydev-login` | Authenticate via browser (recommended) |
| `/polydev-auth` | Check authentication status and credits |
| `/perspectives` | Alias for `/polydev` |
| `/polydev-help` | Show this help message |

### Usage Examples

**When debugging:**
```
/polydev I'm getting a TypeError in my React component when mapping over an array
```

**When choosing technologies:**
```
/polydev Should I use Redis or PostgreSQL for session storage?
```

**When reviewing code:**
```
/polydev Review this authentication flow for security issues
```

### How It Works

1. You describe your problem or question
2. Polydev queries 4 AI models in parallel:
   - **GLM-4.7** (Zhipu AI)
   - **Gemini 3 Flash** (Google)
   - **Grok 4.1 Fast** (xAI)
   - **GPT-5 Mini** (OpenAI)
3. You get synthesized insights showing:
   - Where models **agree** (high confidence)
   - Where models **differ** (needs consideration)
   - Actionable **recommendations**

### Pricing

| Tier | Credits | Cost |
|------|---------|------|
| **Free** | 500/month | $0 (no card required) |
| **Premium** | 10,000/month | $10/month |

**1 credit = 1 request** (queries all 4 models)

### Support

- Dashboard: [polydev.ai/dashboard](https://polydev.ai/dashboard)
- Docs: [polydev.ai/docs](https://polydev.ai/docs)
- Email: support@polydev.ai

---
