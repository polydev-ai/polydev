# Google AI (Gemini) Provider

Access Gemini 2.5 Pro and Flash 2 with your Google API credentials.

## Get credentials
1. Visit https://aistudio.google.com/ and create an API key, or
2. Use Google Cloud with `gcloud auth application-default login` for CLI.

## Configure in Polydev
```bash
# .env.local (optional for local dev)
GOOGLE_API_KEY=AIza...
```

Dashboard → Settings → API Keys → Add → Google → paste key.

## Quick examples
```bash
curl -s "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=$GOOGLE_API_KEY"   -H "Content-Type: application/json"   -d '{
    "contents": [{"parts":[{"text":"Outline a data migration plan"}]}]
  }'
```

<div class="code-tabs" data-group="google-perspectives">
  <div class="flex gap-2 mb-3">
    <button class="tab-button px-3 py-1.5 rounded-md border text-sm" data-lang="curl">cURL</button>
    <button class="tab-button px-3 py-1.5 rounded-md border text-sm" data-lang="node">Node</button>
    <button class="tab-button px-3 py-1.5 rounded-md border text-sm" data-lang="ts">TypeScript</button>
  </div>
  <pre data-lang="curl"><code class="language-bash">curl -s https://api.polydev.ai/v1/perspectives \
  -H "Authorization: Bearer poly_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Help design a zero-downtime migration",
    "models": ["google_ai/gemini-2.5-pro"]
  }'</code></pre>
  <pre data-lang="node"><code class="language-javascript">const res = await fetch('https://api.polydev.ai/v1/perspectives', {
  method: 'POST', headers: { 'Authorization': 'Bearer ' + process.env.POLYDEV_API_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: 'Help design a zero-downtime migration', models: ['google_ai/gemini-2.5-pro'] })
})
const data = await res.json()</code></pre>
  <pre data-lang="ts"><code class="language-typescript">const req = { prompt: 'Help design a zero-downtime migration', models: ['google_ai/gemini-2.5-pro'] }
const res = await fetch('https://api.polydev.ai/v1/perspectives', { method: 'POST', headers: { Authorization: `Bearer ${process.env.POLYDEV_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(req) })
const data: any = await res.json()</code></pre>
</div>

## Notes
- Gemini CLI can be preferred automatically when authenticated.
- For very large contexts, Gemini 2.5 Pro is a strong default.
