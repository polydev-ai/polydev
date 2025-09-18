# Groq Provider

Ultra‑fast inference for open‑source models like Llama 3.1 and Mixtral.

## Get an API key
1. Open https://console.groq.com/keys
2. Create a key and set budgets (recommended)

## Configure in Polydev
```bash
GROQ_API_KEY=gsk_...
```

Dashboard → Settings → API Keys → Add → Groq → paste key.

## Quick examples
```bash
curl -s https://api.groq.com/openai/v1/chat/completions   -H "Authorization: Bearer $GROQ_API_KEY"   -H "Content-Type: application/json"   -d '{
    "model": "llama-3.1-70b-versatile",
    "messages": [{"role":"user","content":"Summarize Raft consensus"}]
  }'
```

<div class="code-tabs" data-group="groq-perspectives">
  <div class="flex gap-2 mb-3">
    <button class="tab-button px-3 py-1.5 rounded-md border text-sm" data-lang="curl">cURL</button>
    <button class="tab-button px-3 py-1.5 rounded-md border text-sm" data-lang="node">Node</button>
    <button class="tab-button px-3 py-1.5 rounded-md border text-sm" data-lang="ts">TypeScript</button>
  </div>
  <pre data-lang="curl"><code class="language-bash">curl -s https://api.polydev.ai/v1/perspectives \
  -H "Authorization: Bearer poly_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Draft a quick ADR for caching policy",
    "models": ["groq/llama-3.1-70b-versatile"]
  }'</code></pre>
  <pre data-lang="node"><code class="language-javascript">const res = await fetch('https://api.polydev.ai/v1/perspectives', {
  method: 'POST', headers: { 'Authorization': 'Bearer ' + process.env.POLYDEV_API_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: 'Draft a quick ADR for caching policy', models: ['groq/llama-3.1-70b-versatile'] })
})
const data = await res.json()</code></pre>
  <pre data-lang="ts"><code class="language-typescript">const req = { prompt: 'Draft a quick ADR for caching policy', models: ['groq/llama-3.1-70b-versatile'] }
const res = await fetch('https://api.polydev.ai/v1/perspectives', { method: 'POST', headers: { Authorization: `Bearer ${process.env.POLYDEV_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(req) })
const data: any = await res.json()</code></pre>
</div>

## Notes
- Use Groq for fast iterations or CI checks.
- Combine with higher‑accuracy models for final passes.
