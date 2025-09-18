# Choosing Models

Pick sensible defaults by task and adjust as you learn what works best in your stack.

## Quick picks
- Code & reviews: **Claude Sonnet 4**, **GPT-5**
- Long context: **Gemini 2.5 Pro**
- Fast iterations / CI: **Groq Llama 3.1 70B**
- Hard problems: **Claude Opus 4**, **GPT-5**

## Templates
```jsonc
// Dashboard → Preferences → Default models
{
  "primary": ["gpt-5", "claude-opus-4"],
  "fallback": ["gpt-4.1-mini", "claude-haiku-2"],
  "coding": ["claude-sonnet-4", "gpt-5"],
  "creative": ["gpt-5", "claude-opus-4"],
  "analysis": ["claude-opus-4", "gpt-5", "perplexity/sonar-large"]
}
```

## Tips
- Start with two strong defaults; add a fast/cheap fallback.
- Prefer CLIs first to reduce spend; API keys for consistency; credits as safety.
- Watch latency/quality in Analytics and iterate monthly.
