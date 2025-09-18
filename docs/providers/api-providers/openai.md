# OpenAI Provider

Access GPT‑5, GPT‑4.1 and other OpenAI models through direct API integration with advanced configuration options.

## Overview

The OpenAI provider gives you direct access to OpenAI's latest models including GPT‑5 and the GPT‑4.1 family through your personal API keys with full control over usage and billing.

### Key Features

- **Latest Models**: GPT‑5, GPT‑4.1 family, and specialized models
- **Function Calling**: Native support for structured tool use
- **Vision Capabilities**: Image analysis with GPT-4 Vision
- **High Performance**: Optimized API endpoints with low latency
- **Flexible Pricing**: Pay-per-use with detailed billing control

### Model Capabilities

| Model | Context Window | Notes |
|-------|----------------|-------|
| GPT‑5 | 128K | Frontier reasoning & code |
| GPT‑4.1 | 128K | Strong general‑purpose, tool use |
| GPT‑4.1‑mini | 128K | Lower cost, fast iterations |
| GPT‑4 Vision | 128K | Image analysis & multimodal |

## Getting API Keys

### 1. Create OpenAI Account

1. Visit [platform.openai.com](https://platform.openai.com)
2. Sign up or log in to your account
3. Verify your email address
4. Set up billing (required for API access)

### 2. Generate API Key

1. Go to [API Keys](https://platform.openai.com/api-keys)
2. Click **"Create new secret key"**
3. Name your key (e.g., "Polydev Integration")
4. Copy the key (starts with `sk-`)
5. **Store it securely** - you won't see it again!

> **⚠️ Important**: Keep your API key secure and never commit it to version control. Use environment variables or encrypted storage.

### 3. Set Usage Limits (Recommended)

1. Go to [Usage Limits](https://platform.openai.com/usage-limits)
2. Set monthly budget limit
3. Configure email alerts
4. Set hard limits to prevent overages

## Configuration

### Environment Variables

```bash
# .env.local
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_ORG_ID=org-your-organization-id  # Optional
OPENAI_BASE_URL=https://api.openai.com/v1  # Optional, for custom deployments
```

### Dashboard Configuration

1. Navigate to **Settings → API Keys**
2. Click **"Add API Key"**
3. Select **"OpenAI"** as provider
4. Enter your API key
5. Configure optional settings:

```json
{
  "provider": "openai",
  "api_key": "sk-your-key",
  "organization": "org-your-org-id",
  "base_url": "https://api.openai.com/v1",
  "budget_limit": 100,
  "rate_limit": 60,
  "models": {
    "gpt-5": { "enabled": true, "temperature": 0.7 },
    "gpt-4.1-mini": { "enabled": true, "temperature": 0.7 },
    "gpt-4-vision-preview": { "enabled": true }
  }
}
```

### Advanced Configuration

```bash
# Rate limiting (requests per minute)
OPENAI_RATE_LIMIT=60

# Timeout settings
OPENAI_TIMEOUT=30000       # 30 seconds
OPENAI_MAX_RETRIES=3

# Budget controls
OPENAI_MONTHLY_LIMIT=100   # USD per month
OPENAI_DAILY_LIMIT=10      # USD per day

# Default model settings
OPENAI_DEFAULT_MODEL=gpt-5
OPENAI_DEFAULT_TEMPERATURE=0.7
OPENAI_DEFAULT_MAX_TOKENS=4096
```

## Available Models

### GPT‑5 and GPT‑4.1

**GPT‑5 (Recommended)**
```bash
Model ID: gpt-5
Context: 128,000 tokens
Capabilities: Text, function calling, JSON mode
Best for: Complex analysis, long documents, coding
```

**GPT‑4.1**
```bash
Model ID: gpt-4.1
Context: 128,000 tokens  
Capabilities: Text, function calling
Best for: Highest quality reasoning
```

**GPT-4 Vision**
```bash
Model ID: gpt-4-vision-preview
Context: 128,000 tokens
Capabilities: Text, images, function calling
Best for: Image analysis, multimodal tasks
```

### GPT-3.5 Family

**GPT‑4.1‑mini**
```bash
Model ID: gpt-4.1-mini
Context: 128,000 tokens
Capabilities: Text, function calling
Best for: Fast, cost‑effective responses
```

### Specialized Models

**DALL-E 3** (Image Generation)
```bash
Model ID: dall-e-3
Capabilities: Text-to-image generation
Resolutions: 1024×1024, 1024×1792, 1792×1024
```

**Whisper** (Speech-to-Text)
```bash
Model ID: whisper-1
Capabilities: Audio transcription and translation
Supported formats: MP3, MP4, WAV, M4A
```

**Text-to-Speech**
```bash
Models: tts-1, tts-1-hd
Voices: alloy, echo, fable, onyx, nova, shimmer
Output: MP3, Opus, AAC, FLAC
```

## Usage with Polydev

### Basic Usage

```javascript
// Single model request
const response = await callTool({
  name: "get_perspectives",
  arguments: {
    prompt: "Explain quantum computing in simple terms",
    models: ["gpt-5"],
    provider_settings: {
      openai: {
        temperature: 0.3,
        max_tokens: 2000
      }
    }
  }
});
```

### Multi-Model Perspectives

<div class="code-tabs" data-group="openai-perspectives">
  <div class="flex gap-2 mb-3">
    <button class="tab-button px-3 py-1.5 rounded-md border text-sm" data-lang="curl">cURL</button>
    <button class="tab-button px-3 py-1.5 rounded-md border text-sm" data-lang="node">Node</button>
    <button class="tab-button px-3 py-1.5 rounded-md border text-sm" data-lang="ts">TypeScript</button>
  </div>
  <pre data-lang="curl"><code class="language-bash">curl -s https://api.polydev.ai/v1/perspectives \
  -H "Authorization: Bearer poly_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Analyze the pros and cons of microservices architecture",
    "models": ["openai/gpt-5", "openai/gpt-4.1", "openai/gpt-4.1-mini"],
    "provider_settings": { "openai": { "temperature": 0.7 } }
  }'</code></pre>
  <pre data-lang="node"><code class="language-javascript">const res = await fetch('https://api.polydev.ai/v1/perspectives', {
  method: 'POST', headers: { 'Authorization': 'Bearer ' + process.env.POLYDEV_API_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: 'Analyze the pros and cons of microservices architecture', models: ['openai/gpt-5','openai/gpt-4.1','openai/gpt-4.1-mini'], provider_settings: { openai: { temperature: 0.7 } } })
})
const data = await res.json()</code></pre>
  <pre data-lang="ts"><code class="language-typescript">const req = {
  prompt: 'Analyze the pros and cons of microservices architecture',
  models: ['openai/gpt-5','openai/gpt-4.1','openai/gpt-4.1-mini'],
  provider_settings: { openai: { temperature: 0.7 } }
}
const res = await fetch('https://api.polydev.ai/v1/perspectives', { method: 'POST', headers: { Authorization: `Bearer ${process.env.POLYDEV_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(req) })
const data: any = await res.json()</code></pre>
</div>

### Function Calling

```javascript
// Use OpenAI's function calling capability
const result = await callTool({
  name: "get_perspectives",
  arguments: {
    prompt: "Get the current weather in San Francisco and New York",
    models: ["gpt-5"],
    functions: [
      {
        name: "get_weather",
        description: "Get current weather for a location",
        parameters: {
          type: "object",
          properties: {
            location: { type: "string", description: "City name" },
            unit: { type: "string", enum: ["celsius", "fahrenheit"] }
          },
          required: ["location"]
        }
      }
    ]
  }
});
```

### Vision Capabilities

```javascript
// Image analysis with GPT-4 Vision
const analysis = await callTool({
  name: "get_perspectives",
  arguments: {
    prompt: "Analyze this architectural diagram and suggest improvements",
    models: ["gpt-4-vision-preview"],
    images: [
      {
        url: "https://example.com/diagram.png"
      },
      {
        base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
      }
    ]
  }
});
```

## Cost Optimization

### Model Selection Strategy

```javascript
// Cost-optimized model routing
const getOptimalModel = (taskComplexity) => {
  switch(taskComplexity) {
    case 'simple':
      return 'gpt-4.1-mini';     // lower-cost option
    case 'medium':
      return 'gpt-5';
    case 'complex':
      return 'gpt-5';
    default:
      return 'gpt-4.1-mini';
  }
};
```

### Budget Controls

```bash
# Set up budget monitoring
OPENAI_MONTHLY_BUDGET=100
OPENAI_BUDGET_ALERT_THRESHOLD=0.8  # Alert at 80%
OPENAI_HARD_LIMIT=120              # Stop at 120%
```

### Token Usage Optimization

```javascript
// Optimize token usage
const optimizedRequest = {
  model: "gpt-4.1-mini",
  max_tokens: 500,           // Limit response length
  temperature: 0.3,          // Lower temperature for focused responses
  top_p: 0.9,               // Nucleus sampling
  frequency_penalty: 0.1,    // Reduce repetition
  presence_penalty: 0.1      // Encourage diverse topics
};
```

## Performance Tuning

### Connection Pooling

```javascript
// Configure connection pool for OpenAI
const openaiConfig = {
  poolSize: 10,              // Max concurrent connections
  keepAlive: true,           // Reuse connections
  timeout: 30000,            // 30 second timeout
  retries: 3,                // Retry failed requests
  retryDelay: 1000           // 1 second between retries
};
```

### Caching Strategy

```javascript
// Intelligent response caching
const cacheConfig = {
  provider: 'openai',
  enabled: true,
  ttl: 3600,                 // 1 hour cache
  keyFactors: [
    'model',
    'prompt',
    'temperature',
    'max_tokens'
  ],
  excludeModels: ['gpt-4-vision-preview'] // Don't cache vision responses
};
```

### Rate Limit Management

```bash
# Adaptive rate limiting
OPENAI_RATE_LIMIT=60           # Base rate limit (RPM)
OPENAI_BURST_LIMIT=120         # Temporary burst limit
OPENAI_BACKOFF_STRATEGY=exponential
OPENAI_MAX_BACKOFF=60000       # Max backoff: 60 seconds
```

## Monitoring and Analytics

### Usage Tracking

```javascript
// Track OpenAI usage
const trackUsage = (response) => {
  const usage = {
    model: response.model,
    prompt_tokens: response.usage.prompt_tokens,
    completion_tokens: response.usage.completion_tokens,
    total_tokens: response.usage.total_tokens,
    cost: calculateCost(response.model, response.usage),
    timestamp: new Date().toISOString()
  };
  
  // Store in analytics
  analytics.track('openai_request', usage);
};
```

### Cost Monitoring

```javascript
// Real-time cost calculation
const calculateCost = (model, usage) => {
  const pricing = {
    'gpt-5': { input: 0.03, output: 0.06 },
    'gpt-4.1-mini': { input: 0.002, output: 0.004 }
  };
  
  const modelPricing = pricing[model];
  const inputCost = (usage.prompt_tokens / 1000) * modelPricing.input;
  const outputCost = (usage.completion_tokens / 1000) * modelPricing.output;
  
  return inputCost + outputCost;
};
```

### Performance Metrics

```javascript
// Monitor performance metrics
const metrics = {
  averageLatency: calculateAverageLatency('openai'),
  successRate: calculateSuccessRate('openai'),
  errorRate: calculateErrorRate('openai'),
  tokensPerSecond: calculateThroughput('openai'),
  costPerRequest: calculateAverageCost('openai')
};
```

## Error Handling

### Common Error Codes

| Error Code | Meaning | Solution |
|------------|---------|----------|
| 401 | Invalid API key | Verify API key in dashboard |
| 429 | Rate limit exceeded | Implement backoff, reduce rate |
| 400 | Invalid request | Check request format and parameters |
| 500 | Server error | Retry with exponential backoff |
| 503 | Service unavailable | Temporary issue, retry later |

### Retry Logic

```javascript
const retryConfig = {
  retries: 3,
  factor: 2,                 // Exponential backoff factor
  minTimeout: 1000,          // 1 second minimum
  maxTimeout: 60000,         // 60 second maximum
  randomize: true,           // Add jitter to prevent thundering herd
  
  retryCondition: (error) => {
    // Retry on rate limits and server errors
    return [429, 500, 502, 503, 504].includes(error.status);
  }
};
```

### Error Monitoring

```javascript
// Track and alert on errors
const errorHandler = (error, context) => {
  const errorInfo = {
    provider: 'openai',
    error_code: error.status,
    error_message: error.message,
    model: context.model,
    timestamp: new Date().toISOString(),
    request_id: context.requestId
  };
  
  // Log error
  logger.error('OpenAI API Error', errorInfo);
  
  // Alert on critical errors
  if (error.status === 401) {
    alerts.send('Critical: OpenAI API key invalid');
  }
};
```

## Security Best Practices

### API Key Management

```bash
# ✅ Good: Use environment variables
OPENAI_API_KEY=sk-your-key

# ❌ Bad: Hardcoded in source
const apiKey = "sk-your-key"; // Never do this!
```

### Key Rotation

```javascript
// Implement key rotation
const rotateApiKey = async () => {
  const newKey = await generateNewApiKey();
  const oldKey = process.env.OPENAI_API_KEY;
  
  // Test new key
  const isValid = await validateApiKey(newKey);
  
  if (isValid) {
    // Update configuration
    updateEnvironment('OPENAI_API_KEY', newKey);
    
    // Revoke old key after transition period
    setTimeout(() => revokeApiKey(oldKey), 24 * 60 * 60 * 1000);
  }
};
```

### Request Sanitization

```javascript
// Sanitize requests before sending to OpenAI
const sanitizeRequest = (request) => {
  return {
    ...request,
    messages: request.messages.map(msg => ({
      ...msg,
      content: sanitizeContent(msg.content) // Remove sensitive data
    }))
  };
};

const sanitizeContent = (content) => {
  // Remove potential sensitive patterns
  return content
    .replace(/\b[\w\.-]+@[\w\.-]+\.\w+\b/g, '[EMAIL]')    // Email addresses
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]')          // SSN patterns  
    .replace(/\b4[0-9]{12}(?:[0-9]{3})?\b/g, '[CC]');     // Credit card patterns
};
```

## Advanced Features

### Streaming Responses

```javascript
// Enable streaming for real-time responses
const streamingRequest = await callTool({
  name: "get_perspectives",
  arguments: {
    prompt: "Write a detailed analysis of market trends",
    models: ["gpt-5"],
    stream: true,
    provider_settings: {
      openai: {
        temperature: 0.7
      }
    }
  }
});

// Handle streaming chunks
streamingRequest.on('data', (chunk) => {
  console.log('Received:', chunk.choices[0]?.delta?.content);
});
```

### Custom Fine-Tuned Models

```javascript
// Use fine-tuned models
const customModelRequest = {
  model: "ft:gpt-4.1-mini:your-org:custom-model:abc123",
  messages: [{
    role: "user",
    content: "Custom task specific to your fine-tuned model"
  }]
};
```

### Batch Processing

```javascript
// Process multiple prompts efficiently
const batchRequests = prompts.map(prompt => ({
  model: "gpt-4.1-mini",
  messages: [{ role: "user", content: prompt }],
  max_tokens: 500
}));

const batchResults = await Promise.allSettled(
  batchRequests.map(req => callOpenAI(req))
);
```

## Integration Examples

### With Project Context

```javascript
// OpenAI with project memory
const codeAnalysis = await callTool({
  name: "get_perspectives",
  arguments: {
    prompt: "Analyze this codebase for performance bottlenecks and suggest optimizations",
    models: ["gpt-5"],
    project_memory: "full",
    project_context: {
      root_path: "/path/to/project",
      includes: ["src/**/*.{js,ts}", "**/*.json"],
      excludes: ["node_modules/**", "dist/**"]
    }
  }
});
```

### Multi-Provider Comparison

```javascript
// Compare OpenAI with other providers
const comparison = await callTool({
  name: "get_perspectives",
  arguments: {
    prompt: "Design a scalable microservices architecture for an e-commerce platform",
    models: ["gpt-5", "claude-opus-4", "gemini-2.5-pro"],
    provider_settings: {
      openai: { temperature: 0.7 },
      anthropic: { temperature: 0.7 },
      google: { temperature: 0.7 }
    }
  }
});
```

## Troubleshooting

### Common Issues

**API Key Not Working:**
```bash
# Test API key directly
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model":"gpt-4.1-mini","messages":[{"role":"user","content":"Hello"}],"max_tokens":5}' \
     https://api.openai.com/v1/chat/completions
```

**Rate Limits Exceeded:**
```bash
# Check current usage
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/usage

# Reduce rate limit
OPENAI_RATE_LIMIT=30  # Reduce from default 60
```

**High Costs:**
```bash
# Monitor spending
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/usage?date=2024-01-01

# Set hard limits
OPENAI_DAILY_LIMIT=5
OPENAI_MONTHLY_LIMIT=50
```

### Debug Mode

```bash
# Enable OpenAI debugging
DEBUG=openai* npm run dev

# Show detailed request/response
OPENAI_DEBUG=1 POLYDEV_DEBUG=1 npm run test:providers
```

## Migration Guide

### From OpenAI Python SDK

```python
# Old Python SDK usage
import openai

response = openai.ChatCompletion.create(
    model="gpt-5",
    messages=[{"role": "user", "content": "Hello"}]
)
```

```javascript
// New Polydev usage
const response = await callTool({
  name: "get_perspectives",
  arguments: {
    prompt: "Hello",
    models: ["gpt-5"]
  }
});
```

### From Direct API Calls

```bash
# Old direct curl
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     -d '{"model":"gpt-5","messages":[...]}' \
     https://api.openai.com/v1/chat/completions
```

```javascript
// New Polydev integration
const response = await callTool({
  name: "get_perspectives",
  arguments: {
    prompt: "Your prompt here",
    models: ["gpt-5"]
  }
});
```

## Next Steps

Once OpenAI is configured:

1. **[Add Additional Providers](../index.md)** - Set up backup providers
2. **[Configure Fallback System](../../features/fallback-system.md)** - Optimize routing
3. **[Monitor Usage](../../features/analytics.md)** - Track costs and performance  
4. **[Troubleshooting](../../config/troubleshooting.md)** - Resolve common issues

---

**Questions about OpenAI integration?** Check our [troubleshooting guide](../../config/troubleshooting.md) or join our [Discord](https://discord.gg/polydev).
