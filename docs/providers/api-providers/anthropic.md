# Anthropic Provider

Access Claude Opus 4, Sonnet 4, and Haiku 2 with your Anthropic API key.

## Get an API key
1. Open https://console.anthropic.com/
2. Create a key under API Keys
3. Set usage limits (recommended)

## Configure in Polydev
```bash
# .env.local (optional for local dev)
ANTHROPIC_API_KEY=sk-ant-...
```

Dashboard → Settings → API Keys → Add → Anthropic → paste key.

## Quick examples
```bash
curl -s https://api.anthropic.com/v1/messages   -H "x-api-key: $ANTHROPIC_API_KEY"   -H "anthropic-version: 2023-06-01"   -H "Content-Type: application/json"   -d '{
    "model": "claude-opus-4",
    "max_tokens": 256,
    "messages": [{"role":"user","content":"Explain idempotency"}]
  }'
```

<div class="code-tabs" data-group="anthropic-perspectives">
  <div class="flex gap-2 mb-3">
    <button class="tab-button px-3 py-1.5 rounded-md border text-sm" data-lang="curl">cURL</button>
    <button class="tab-button px-3 py-1.5 rounded-md border text-sm" data-lang="node">Node</button>
    <button class="tab-button px-3 py-1.5 rounded-md border text-sm" data-lang="ts">TypeScript</button>
  </div>
  <pre data-lang="curl"><code class="language-bash">curl -s https://api.polydev.ai/v1/perspectives \
  -H "Authorization: Bearer poly_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Design a resilient webhook handler",
    "models": ["anthropic/claude-opus-4", "anthropic/claude-sonnet-4"]
  }'</code></pre>
  <pre data-lang="node"><code class="language-javascript">const res = await fetch('https://api.polydev.ai/v1/perspectives', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + process.env.POLYDEV_API_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: 'Design a resilient webhook handler', models: ['anthropic/claude-opus-4','anthropic/claude-sonnet-4'] })
})
const data = await res.json()</code></pre>
  <pre data-lang="ts"><code class="language-typescript">const req = { prompt: 'Design a resilient webhook handler', models: ['anthropic/claude-opus-4','anthropic/claude-sonnet-4'] }
const res = await fetch('https://api.polydev.ai/v1/perspectives', { method: 'POST', headers: { Authorization: `Bearer ${process.env.POLYDEV_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(req) })
const data: any = await res.json()</code></pre>
</div>

## Notes
- Use Sonnet 4 for most tasks; switch to Opus 4 for harder problems.
- Polydev can route via Claude Code CLI if it is installed and logged in.
