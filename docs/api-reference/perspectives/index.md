# Perspectives API

Query multiple AI models simultaneously.

## Endpoint

```
POST /v1/perspectives
```

## Basic Usage

```javascript
{
  "prompt": "Explain React hooks",
  "project_memory": "full"
}
```

Uses default models (Claude, GPT, Gemini) and includes project context automatically.

## Authentication

```bash
Authorization: Bearer poly_your_api_key
```

## Response Format

```javascript
{
  "perspectives": [
    {
      "model": "claude-3-sonnet",
      "content": "React hooks are functions that let you use state and lifecycle features...",
      "provider": "claude_code_cli"
    },
    {
      "model": "gpt-4",
      "content": "React hooks revolutionized functional components by providing...",
      "provider": "openai_api"
    }
  ],
  "summary": {
    "consensus_points": [
      "Hooks enable state in functional components",
      "useState and useEffect are fundamental"
    ],
    "total_cost": 0.0234
  }
}
```

## Examples

### cURL

```bash
curl -X POST https://api.polydev.ai/v1/perspectives \
  -H "Authorization: Bearer poly_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Pros and cons of microservices?"}'
```

### JavaScript

```javascript
const response = await fetch('https://api.polydev.ai/v1/perspectives', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer poly_your_api_key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: 'Pros and cons of microservices?'
  })
})
const data = await response.json()
```

### With Project Context

```javascript
{
  "prompt": "Review this React component for performance issues",
  "project_memory": "full"
}
```

Uses relevant files from your codebase automatically.

## Options

| Parameter | Description | Default |
|-----------|-------------|---------|
| `prompt` | Your question or request | Required |
| `project_memory` | Include project context: `"none"`, `"light"`, `"full"` | `"none"` |

## Rate Limits

- **Free**: 100 requests/month
- **Pro**: Unlimited

That's it. Simple as designed.
