# OpenRouter (Aggregator)

Use OpenRouter to access many providers with one key — useful for credits fallback or quick prototyping.

## Configure in Polydev
Add your OpenRouter key in the dashboard (Settings → API Keys → OpenRouter).

## Example
```bash
curl -s https://openrouter.ai/api/v1/chat/completions   -H "Authorization: Bearer $OPENROUTER_API_KEY"   -H "HTTP-Referer: https://yourapp.example"   -H "X-Title: Your App"   -H "Content-Type: application/json"   -d '{
    "model": "anthropic/claude-opus-4",
    "messages": [{"role":"user","content":"Create a rollout plan"}]
  }'
```

```javascript
const res = await perspectives({
  prompt: 'Draft a safe feature-flag rollout plan',
  models: ['openrouter/anthropic/claude-opus-4']
});
```

## Notes
- Great as a safety net or when you want access to many providers via one billing account.
- In Polydev, credits fallback uses a managed OpenRouter pool.
