# Webhooks

Get notified when important events happen.

## Create webhook

```
POST /v1/webhooks
```

<div class="code-tabs" data-group="webhooks-create">
  <div class="flex gap-2 mb-3">
    <button class="tab-button px-3 py-1.5 rounded-md border text-sm" data-lang="curl">cURL</button>
    <button class="tab-button px-3 py-1.5 rounded-md border text-sm" data-lang="node">Node</button>
  </div>
  <pre data-lang="curl"><code class="language-bash">curl -s https://api.polydev.ai/v1/webhooks \
  -H "Authorization: Bearer poly_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "url":"https://yourapp.com/webhooks/polydev",
    "events":["perspective.completed","routing.fallback"],
    "active":true
  }'</code></pre>
  <pre data-lang="node"><code class="language-javascript">const webhook = await fetch('https://api.polydev.ai/v1/webhooks', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + process.env.POLYDEV_API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://yourapp.com/webhooks/polydev',
    events: ['perspective.completed', 'routing.fallback'],
    active: true
  })
})
const data = await webhook.json()</code></pre>
</div>

## Verify signatures

Each delivery includes `Polydev-Signature`. Verify it with your signing secret.

## Common events
- `perspective.completed` — a multi-model request finished
- `routing.fallback` — a fallback path was used (e.g., API key → credits)
- `usage.report.ready` — a usage export is ready to fetch
