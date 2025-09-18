# Chat Completions API

OpenAI-compatible chat with Polydev’s routing (CLIs -> your API keys -> credits) and optional streaming.

## Endpoint

```
POST /v1/chat/completions
```

## Quick example

<div class="code-tabs" data-group="chat-create">
  <div class="flex gap-2 mb-3">
    <button class="tab-button px-3 py-1.5 rounded-md border text-sm" data-lang="curl">cURL</button>
    <button class="tab-button px-3 py-1.5 rounded-md border text-sm" data-lang="node">Node</button>
    <button class="tab-button px-3 py-1.5 rounded-md border text-sm" data-lang="ts">TypeScript</button>
  </div>
  <pre data-lang="curl"><code class="language-bash">curl -s https://api.polydev.ai/v1/chat/completions \
  -H "Authorization: Bearer poly_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5",
    "messages": [
      {"role":"user","content":"Write a tiny HTTP server in Node.js"}
    ],
    "stream": false
  }'</code></pre>
  <pre data-lang="node"><code class="language-javascript">const res = await fetch('https://api.polydev.ai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + process.env.POLYDEV_API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gpt-5',
    messages: [{ role: 'user', content: 'Write a tiny HTTP server in Node.js' }],
    stream: false
  })
})
const data = await res.json()</code></pre>
  <pre data-lang="ts"><code class="language-typescript">type Message = { role: 'user'|'assistant'|'system'; content: string }
const res = await fetch('https://api.polydev.ai/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.POLYDEV_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gpt-5',
    messages: [{ role: 'user', content: 'Write a tiny HTTP server in Node.js' } as Message],
    stream: false
  })
})
const data: any = await res.json()</code></pre>
</div>

## Request fields

- `model` – any friendly model id (e.g. `gpt-5`, `claude-opus-4`, `gemini-2.5-pro`).
- `messages` – array of `{ role, content }`.
- `stream` – boolean (default `false`). If `true`, server streams SSE chunks.
- `provider_options` – optional per-provider overrides (temperature, max tokens, timeout).

## Streaming (SSE)

<div class="code-tabs" data-group="chat-stream">
  <div class="flex gap-2 mb-3">
    <button class="tab-button px-3 py-1.5 rounded-md border text-sm" data-lang="curl">cURL</button>
    <button class="tab-button px-3 py-1.5 rounded-md border text-sm" data-lang="node">Node</button>
    <button class="tab-button px-3 py-1.5 rounded-md border text-sm" data-lang="ts">TypeScript</button>
  </div>
  <pre data-lang="curl"><code class="language-bash">curl -N https://api.polydev.ai/v1/chat/completions \
  -H "Authorization: Bearer poly_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "model":"claude-opus-4",
    "messages":[{"role":"user","content":"Summarize the SOLID principles"}],
    "stream":true
  }'</code></pre>
  <pre data-lang="node"><code class="language-javascript">// Node 18+ streaming
const res = await fetch('https://api.polydev.ai/v1/chat/completions', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + process.env.POLYDEV_API_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ model: 'claude-opus-4', messages: [{ role: 'user', content: 'Summarize the SOLID principles' }], stream: true })
})
if (!res.body) throw new Error('No stream')
const reader = res.body.getReader()
const decoder = new TextDecoder()
while (true) {
  const { value, done } = await reader.read()
  if (done) break
  const chunk = decoder.decode(value)
  process.stdout.write(chunk)
}</code></pre>
  <pre data-lang="ts"><code class="language-typescript">const res = await fetch('https://api.polydev.ai/v1/chat/completions', {
  method: 'POST',
  headers: { Authorization: `Bearer ${process.env.POLYDEV_API_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ model: 'claude-opus-4', messages: [{ role: 'user', content: 'Summarize the SOLID principles' }], stream: true })
})
const reader = res.body!.getReader()
const decoder = new TextDecoder()
for (;;) {
  const { value, done } = await reader.read()
  if (done) break
  console.log(decoder.decode(value))
}</code></pre>
</div>

## Response (non-streaming)

```json
{
  "id": "chatcmpl_abc123",
  "object": "chat.completion",
  "created": 1736640000,
  "model": "gpt-5",
  "choices": [
    {
      "index": 0,
      "message": { "role": "assistant", "content": "..." },
      "finish_reason": "stop"
    }
  ],
  "usage": { "prompt_tokens": 125, "completion_tokens": 324, "total_tokens": 449 },
  "routing": { "path": "api_key", "provider": "openai" }
}
```

## Notes
- Polydev may switch providers if a model becomes temporarily unavailable (respecting your preferences).
- You can pin a provider by using provider-prefixed IDs (e.g. `openai/gpt-5`).
