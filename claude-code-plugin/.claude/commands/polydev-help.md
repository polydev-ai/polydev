# /polydev-help - Polydev Setup and Usage Guide

Display help information about Polydev multi-model AI consultation.

## Response Template

When the user runs `/polydev-help`, respond with:

---

## Polydev - Multi-Model AI Consultation

Polydev lets you consult GPT, Gemini, and Grok alongside Claude when you're stuck or need diverse perspectives.

### Quick Start

1. **Get your API token**: Visit [polydev.ai/dashboard](https://polydev.ai/dashboard)
2. **Set environment variable**:
   ```bash
   export POLYDEV_USER_TOKEN="pd_your_token_here"
   ```
3. **Use `/perspectives`** when you need multi-model consultation

### Available Commands

| Command | Description |
|---------|-------------|
| `/perspectives` | Get AI perspectives on your current problem |
| `/polydev-help` | Show this help message |

### Usage Examples

**When debugging:**
> "I'm getting a TypeError in my React component. /perspectives"

**When choosing technologies:**
> "Should I use Redis or PostgreSQL for session storage? /perspectives"

**When reviewing code:**
> "Review this authentication flow for security issues. /perspectives"

### How It Works

1. You describe your problem or question
2. Polydev queries multiple AI models in parallel
3. You get synthesized insights showing:
   - Where models agree (high confidence)
   - Where models differ (needs more thought)
   - Actionable recommendations

### Pricing

- **Free tier**: 1,000 messages/month
- **Pro tier**: Unlimited messages
- See [polydev.ai/pricing](https://polydev.ai/pricing) for details

### Support

- Docs: [polydev.ai/docs](https://polydev.ai/docs)
- Email: support@polydev.ai
- GitHub: [github.com/backspacevenkat/polydev-ai](https://github.com/backspacevenkat/polydev-ai)

---
