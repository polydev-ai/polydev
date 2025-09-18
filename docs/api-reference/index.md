# API Reference

Complete reference for Polydev's APIs, SDKs, and integration interfaces.

## Overview

Polydev provides multiple APIs and interfaces for different integration needs:

- **[REST API](#rest-api)** - HTTP endpoints for web applications
- **[WebSocket API](#websocket-api)** - Real-time streaming connections  
- **[Model Context Protocol](#model-context-protocol)** - Agent integration standard
- **[SDKs & Libraries](#sdks--libraries)** - Official client libraries
- **[Webhooks](#webhooks)** - Event notifications and callbacks

## Base URLs

```bash
# Production API
https://api.polydev.ai

# Development API (if applicable)
https://dev-api.polydev.ai

# WebSocket API
wss://ws.polydev.ai

# MCP Server (local)
http://localhost:3001
```

## Authentication

All API endpoints require authentication via API keys or JWT tokens.

### API Key Authentication

```bash
# Include API key in Authorization header
curl -H "Authorization: Bearer poly_your_api_key_here" \
     https://api.polydev.ai/v1/perspectives
```

### JWT Token Authentication

```bash
# Include JWT token in Authorization header
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
     https://api.polydev.ai/v1/perspectives
```

**[→ See Authentication Documentation](authentication/)**

---

## Core APIs

### 🧠 [Perspectives API](perspectives/)

Get diverse AI perspectives from multiple models simultaneously.

**Endpoint:** `POST /v1/perspectives`

**Quick Example:**

```javascript
const response = await fetch('https://api.polydev.ai/v1/perspectives', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer poly_your_api_key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: "Explain React hooks",
    models: ["gpt-5", "claude-opus-4", "gemini-2.5-pro", "grok-4-high"],
    project_memory: "smart"
  })
});

const data = await response.json();
console.log(data.perspectives);
```

**Features:**
- Multi-model parallel processing
- Intelligent fallback routing
- Project context integration
- Response aggregation and consensus analysis

---

### 💬 [Chat Completions API](chat/)

OpenAI-compatible chat completions with Polydev's intelligent routing.

**Endpoint:** `POST /v1/chat/completions`

**Quick Example:**

```javascript
const response = await fetch('https://api.polydev.ai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer poly_your_api_key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: "gpt-5",
    messages: [
      { role: "user", content: "Explain async/await in JavaScript" }
    ],
    stream: false
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);
```

**Features:**
- OpenAI API compatibility
- Automatic provider fallback  
- Streaming responses
- Function calling support

---

### 🤖 [Models API](models/)

List available models and their capabilities across all providers.

**Endpoint:** `GET /v1/models`

**Quick Example:**

```javascript
const response = await fetch('https://api.polydev.ai/v1/models', {
  headers: {
    'Authorization': 'Bearer poly_your_api_key'
  }
});

const models = await response.json();
console.log(models.data);
```

**Features:**
- Real-time model availability
- Provider routing information
- Model capability metadata
- Pricing and rate limit information

---

### 🔗 [Webhooks API](webhooks/)

Configure event notifications and callbacks for your applications.

**Endpoint:** `POST /v1/webhooks`

**Quick Example:**

```javascript
const webhook = await fetch('https://api.polydev.ai/v1/webhooks', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer poly_your_api_key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: "https://your-app.com/webhooks/polydev",
    events: ["perspective.completed", "fallback.triggered"],
    active: true
  })
});
```

**Features:**
- Real-time event notifications
- Configurable event types
- Secure webhook signatures
- Retry and failure handling

---

## WebSocket API

### Real-time Streaming

Connect to Polydev's WebSocket API for real-time AI interactions:

```javascript
const ws = new WebSocket('wss://ws.polydev.ai/v1/stream');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'authenticate',
    token: 'poly_your_api_key'
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'perspective_chunk') {
    console.log(`${data.model}: ${data.content}`);
  }
};

// Start streaming perspective
ws.send(JSON.stringify({
  type: 'start_perspective',
  prompt: 'Explain machine learning',
  models: ['gpt-5', 'claude-opus-4'],
  stream: true
}));
```

### Supported Events

| Event Type | Description |
|------------|-------------|
| `perspective_start` | Perspective request started |
| `perspective_chunk` | Streaming content chunk |
| `perspective_complete` | Single model response complete |
| `perspective_error` | Error in model response |
| `all_perspectives_complete` | All models finished |
| `fallback_triggered` | Provider fallback occurred |

---

## Model Context Protocol (MCP)

### MCP Server Integration

Polydev implements the Model Context Protocol for seamless AI agent integration:

```typescript
// MCP Tool Call Example
const toolCall = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: {
    name: "get_perspectives",
    arguments: {
      prompt: "Review this code for issues",
      models: ["gpt-5", "claude-opus-4"],
      project_context: {
        root_path: "/path/to/project"
      }
    }
  }
};

// Send to MCP server
const response = await mcpClient.request(toolCall);
console.log(response.result.content);
```

### Available MCP Tools

| Tool Name | Description |
|-----------|-------------|
| `get_perspectives` | Multi-model perspectives |
| `send_cli_prompt` | Direct CLI provider access |
| `search_documentation` | Project documentation search |
| `report_cli_status` | CLI tool status monitoring |
| `setup_cli_monitoring` | Configure CLI monitoring |

**[→ Complete MCP Documentation](../mcp/)**

---

## SDKs & Libraries

### Official SDKs

#### JavaScript/TypeScript

```bash
npm install @polydev/node
```

```javascript
import { PolydevClient } from '@polydev/node';

const client = new PolydevClient({
  apiKey: 'poly_your_api_key',
  baseURL: 'https://api.polydev.ai'
});

const result = await client.perspectives({
  prompt: 'Explain React patterns',
  models: ['gpt-5', 'claude-opus-4']
});
```

#### Python

```bash
pip install polydev
```

```python
import polydev

client = polydev.Client(api_key="poly_your_api_key")

result = client.perspectives(
    prompt="Explain Django best practices",
    models=["gpt-5", "claude-opus-4"]
)

for perspective in result.perspectives:
    print(f"{perspective.model}: {perspective.content}")
```

#### Go

```bash
go get github.com/polydev-ai/polydev-go
```

```go
package main

import (
    "github.com/polydev-ai/polydev-go"
)

func main() {
    client := polydev.NewClient("poly_your_api_key")
    
    result, err := client.Perspectives(&polydev.PerspectivesRequest{
        Prompt: "Explain Go concurrency patterns",
        Models: []string{"gpt-5", "claude-opus-4"},
    })
    
    if err != nil {
        panic(err)
    }
    
    for _, perspective := range result.Perspectives {
        fmt.Printf("%s: %s\n", perspective.Model, perspective.Content)
    }
}
```

### Framework Integrations

#### React Hooks

```bash
npm install @polydev/react
```

```typescript
import { usePerspectives } from '@polydev/react';

function MyComponent() {
  const { perspectives, loading, error } = usePerspectives({
    prompt: 'Analyze this component',
    models: ['gpt-5', 'claude-opus-4'],
    dependencies: [componentCode]
  });

  if (loading) return <div>Getting perspectives...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {perspectives.map((p, i) => (
        <div key={i}>
          <h3>{p.model}</h3>
          <p>{p.content}</p>
        </div>
      ))}
    </div>
  );
}
```

#### Vue Composition API

```bash
npm install @polydev/vue
```

```vue
<template>
  <div>
    <div v-if="loading">Getting perspectives...</div>
    <div v-else-if="error">Error: {{ error.message }}</div>
    <div v-else>
      <div v-for="perspective in perspectives" :key="perspective.model">
        <h3>{{ perspective.model }}</h3>
        <p>{{ perspective.content }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { usePerspectives } from '@polydev/vue';

const { perspectives, loading, error } = usePerspectives({
  prompt: 'Analyze this Vue component',
  models: ['claude-opus-4', 'gpt-5']
});
</script>
```

---

## Error Handling

### HTTP Status Codes

| Status | Meaning | Description |
|--------|---------|-------------|
| 200 | Success | Request completed successfully |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Invalid or missing API key |
| 402 | Payment Required | Insufficient credits or quota exceeded |
| 429 | Rate Limited | Too many requests |
| 500 | Server Error | Internal server error |
| 502 | Bad Gateway | Provider unavailable |
| 503 | Service Unavailable | Temporary service outage |

### Error Response Format

```json
{
  "error": {
    "type": "invalid_request",
    "message": "The 'prompt' field is required",
    "code": "MISSING_REQUIRED_FIELD",
    "details": {
      "field": "prompt",
      "expected_type": "string"
    },
    "request_id": "req_abc123",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Error Types

| Error Type | Description | Typical Causes |
|------------|-------------|----------------|
| `authentication_error` | Invalid credentials | Wrong API key, expired token |
| `authorization_error` | Insufficient permissions | API key lacks required scope |
| `rate_limit_error` | Too many requests | Exceeded rate limits |
| `quota_exceeded_error` | Usage limits reached | Monthly quota exceeded |
| `invalid_request` | Malformed request | Missing fields, wrong types |
| `provider_error` | External provider issue | Upstream API failure |
| `server_error` | Internal error | Temporary server issue |

### SDK Error Handling

```javascript
// JavaScript SDK
try {
  const result = await client.perspectives({
    prompt: 'Analyze code',
    models: ['claude-opus-4']
  });
} catch (error) {
  if (error.type === 'rate_limit_error') {
    console.log(`Rate limited. Retry after: ${error.retry_after}`);
  } else if (error.type === 'provider_error') {
    console.log(`Provider ${error.provider} is unavailable`);
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

```python
# Python SDK
try:
    result = client.perspectives(
        prompt="Analyze code",
        models=["claude-opus-4"]
    )
except polydev.RateLimitError as e:
    print(f"Rate limited. Retry after: {e.retry_after}")
except polydev.ProviderError as e:
    print(f"Provider {e.provider} is unavailable")
except polydev.PolydevError as e:
    print(f"Unexpected error: {e.message}")
```

---

## Rate Limits & Quotas

### API Rate Limits

| Tier | Requests/Min | Requests/Day | Tokens/Min |
|------|--------------|--------------|------------|
| Free | 20 | 1,000 | 50,000 |
| Pro | 100 | 10,000 | 500,000 |
| Team | 500 | 50,000 | 2,000,000 |
| Enterprise | Custom | Custom | Custom |

### Rate Limit Headers

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 85
X-RateLimit-Reset: 1642262400
X-RateLimit-Type: requests
```

### Handling Rate Limits

```javascript
// Automatic retry with exponential backoff
const client = new PolydevClient({
  apiKey: 'poly_your_api_key',
  retryPolicy: {
    maxRetries: 3,
    backoffMultiplier: 2,
    initialDelay: 1000
  }
});

// Manual rate limit handling
const makeRequestWithRetry = async (requestFn, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      if (error.type === 'rate_limit_error' && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
};
```

---

## Testing & Development

### Testing Endpoints

```bash
# Health check
curl https://api.polydev.ai/v1/health

# Test authentication
curl -H "Authorization: Bearer poly_your_api_key" \
     https://api.polydev.ai/v1/models

# Test perspectives (minimal)
curl -X POST https://api.polydev.ai/v1/perspectives \
  -H "Authorization: Bearer poly_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Hello","models":["gemini-2.5-pro"]}'
```

### Development Environment

```bash
# Set up development environment
export POLYDEV_API_KEY="poly_test_key"
export POLYDEV_BASE_URL="https://dev-api.polydev.ai"
export POLYDEV_DEBUG=1

# Test CLI integration
npm run test:cli

# Test API endpoints
npm run test:api

# Test MCP server
npm run test:mcp
```

### Postman Collection

Import the official Polydev API collection:

```bash
# Download collection
curl -O https://api.polydev.ai/postman/collection.json

# Import in Postman or use newman
newman run collection.json --env-var apiKey=poly_your_api_key
```

---

## API Changelog

### v1.2.0 (Latest)
- Added WebSocket streaming API
- Enhanced MCP tool capabilities
- Improved error response format
- Added batch perspectives endpoint

### v1.1.0
- Added project memory integration
- Enhanced fallback routing
- Added webhook support
- Improved rate limiting

### v1.0.0
- Initial API release
- Basic perspectives endpoint
- CLI provider integration
- Authentication system

**[→ View Full Changelog](changelog.md)**

---

## Support & Resources

### Getting Help

- **[Discord Community](https://discord.gg/polydev)** - Community support and discussions
- **[GitHub Issues](https://github.com/polydev-ai/polydev/issues)** - Bug reports and feature requests  
- **[Support Email](mailto:support@polydev.ai)** - Direct support for paid plans
- **[Status Page](https://status.polydev.ai)** - Service status and incidents

### Resources

- **[OpenAPI Specification](openapi.yaml)** - Complete API specification
- **[Postman Collection](postman/)** - Ready-to-use API collection
- **[Code Examples](examples/)** - Implementation examples
- **[Video Tutorials](tutorials/)** - Step-by-step guides

### Contributing

- **[API Feedback](https://github.com/polydev-ai/polydev/discussions)** - Share API feedback
- **[SDK Contributions](https://github.com/polydev-ai/polydev-sdks)** - Contribute to SDKs
- **[Documentation](https://github.com/polydev-ai/polydev-docs)** - Improve documentation

---

**Ready to start building?** Choose your integration method:

- **[REST API](perspectives/)** - For web applications
- **[WebSocket API](websocket/)** - For real-time applications  
- **[MCP Integration](../mcp/)** - For AI agents
- **[SDK Quickstart](sdks/)** - For specific languages
