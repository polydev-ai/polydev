# Models API

List models and capabilities across providers.

## Endpoint

```
GET /v1/models
```

## Quick example

<div class="code-tabs" data-group="models-list">
  <div class="flex gap-2 mb-3">
    <button class="tab-button px-3 py-1.5 rounded-md border text-sm" data-lang="curl">cURL</button>
    <button class="tab-button px-3 py-1.5 rounded-md border text-sm" data-lang="node">Node</button>
    <button class="tab-button px-3 py-1.5 rounded-md border text-sm" data-lang="ts">TypeScript</button>
  </div>
  <pre data-lang="curl"><code class="language-bash">curl -s https://api.polydev.ai/v1/models \
  -H "Authorization: Bearer poly_your_api_key"</code></pre>
  <pre data-lang="node"><code class="language-javascript">const res = await fetch('https://api.polydev.ai/v1/models', {
  headers: { 'Authorization': 'Bearer ' + process.env.POLYDEV_API_KEY }
})
const models = await res.json()</code></pre>
  <pre data-lang="ts"><code class="language-typescript">const res = await fetch('https://api.polydev.ai/v1/models', {
  headers: { Authorization: `Bearer ${process.env.POLYDEV_API_KEY}` }
})
const models: any = await res.json()</code></pre>
</div>

## Filter by provider

<div class="code-tabs" data-group="models-filter">
  <div class="flex gap-2 mb-3">
    <button class="tab-button px-3 py-1.5 rounded-md border text-sm" data-lang="curl">cURL</button>
    <button class="tab-button px-3 py-1.5 rounded-md border text-sm" data-lang="node">Node</button>
  </div>
  <pre data-lang="curl"><code class="language-bash">curl -s "https://api.polydev.ai/v1/models?provider=anthropic" \
  -H "Authorization: Bearer poly_your_api_key"</code></pre>
  <pre data-lang="node"><code class="language-javascript">const res = await fetch('https://api.polydev.ai/v1/models?provider=anthropic', {
  headers: { 'Authorization': 'Bearer ' + process.env.POLYDEV_API_KEY }
})
const models = await res.json()</code></pre>
</div>

## Response shape (excerpt)

```json
{
  "data": [
    {
      "id": "claude-opus-4",
      "provider": "anthropic",
      "display_name": "Claude Opus 4",
      "context_length": 2000000,
      "supports_tools": true,
      "supports_streaming": true,
      "pricing": { "input_per_million": 15.0, "output_per_million": 75.0 }
    }
  ]
}
```

Use this endpoint to build allowlists, choose defaults, or surface pricing data.
