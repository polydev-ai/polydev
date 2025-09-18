# Custom Providers

Integrate any OpenAI-compatible API or proprietary AI service with Polydev's provider system.

## Overview

Polydev's custom provider system allows you to integrate any AI service that follows the OpenAI API format or create custom adapters for proprietary APIs. This enables you to use local models, enterprise deployments, or specialized AI services alongside major providers.

### Supported Integration Types

- **OpenAI-Compatible APIs** - Direct integration with compatible endpoints
- **Custom Adapters** - Transform proprietary APIs to work with Polydev
- **Local Model Servers** - Ollama, LocalAI, OpenAI-compatible local setups
- **Enterprise Deployments** - Azure OpenAI, AWS Bedrock, Google Vertex AI
- **Specialized Services** - Domain-specific AI APIs with custom logic

## OpenAI-Compatible APIs

### Configuration Format

```json
{
  "id": "custom_provider_id",
  "name": "Custom Provider Name",
  "type": "openai-compatible",
  "baseUrl": "https://your-api.example.com/v1",
  "apiKey": "your-api-key",
  "models": [
    {
      "id": "custom-model-v1",
      "name": "Custom Model v1",
      "contextWindow": 8192,
      "pricing": {
        "input": 0.001,
        "output": 0.002
      }
    }
  ],
  "headers": {
    "Authorization": "Bearer {api_key}",
    "User-Agent": "Polydev/1.0"
  }
}
```

### Environment Configuration

```bash
# .env.local
CUSTOM_PROVIDER_BASE_URL=https://your-api.example.com/v1
CUSTOM_PROVIDER_API_KEY=your-api-key
CUSTOM_PROVIDER_MODEL=custom-model-v1
```

### Dashboard Integration

1. Go to **Settings → API Keys**
2. Click **"Add Custom Provider"**
3. Fill in provider details:
   - **Provider Name**: Display name
   - **Base URL**: API endpoint
   - **API Key**: Authentication key
   - **Models**: Available models list
4. Test connection
5. Save configuration

## Popular OpenAI-Compatible Services

### Ollama (Local Models)

Run large language models locally with Ollama:

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull models
ollama pull llama3.1
ollama pull codellama
ollama pull mistral

# Start server (runs on http://localhost:11434)
ollama serve
```

**Polydev Configuration:**
```json
{
  "id": "ollama",
  "name": "Ollama Local",
  "type": "openai-compatible", 
  "baseUrl": "http://localhost:11434/v1",
  "apiKey": "not-needed",
  "models": [
    {
      "id": "llama3.1",
      "name": "Llama 3.1 8B",
      "contextWindow": 32768,
      "pricing": { "input": 0, "output": 0 }
    },
    {
      "id": "codellama",
      "name": "Code Llama 7B", 
      "contextWindow": 16384,
      "pricing": { "input": 0, "output": 0 }
    }
  ]
}
```

### LocalAI

Self-hosted OpenAI API alternative:

```bash
# Using Docker
docker run -p 8080:8080 --name local-ai -ti localai/localai:latest

# Using Docker Compose
version: '3.6'
services:
  api:
    image: localai/localai:latest
    ports:
      - 8080:8080
    environment:
      - DEBUG=true
    volumes:
      - ./models:/models
```

**Polydev Configuration:**
```json
{
  "id": "localai", 
  "name": "LocalAI",
  "type": "openai-compatible",
  "baseUrl": "http://localhost:8080/v1",
  "apiKey": "not-needed",
  "models": [
    {
      "id": "gpt-4.1-mini",
      "name": "LocalAI GPT-3.5-Turbo",
      "contextWindow": 4096
    }
  ]
}
```

### Anyscale Endpoints

Hosted open-source models:

```json
{
  "id": "anyscale",
  "name": "Anyscale Endpoints",
  "type": "openai-compatible",
  "baseUrl": "https://api.endpoints.anyscale.com/v1",
  "apiKey": "esecret_your_anyscale_key",
  "models": [
    {
      "id": "meta-llama/Llama-2-70b-chat-hf",
      "name": "Llama 2 70B Chat",
      "contextWindow": 4096,
      "pricing": { "input": 0.001, "output": 0.001 }
    }
  ]
}
```

### Together AI

Fast inference for open models:

```json
{
  "id": "together", 
  "name": "Together AI",
  "type": "openai-compatible",
  "baseUrl": "https://api.together.xyz/v1",
  "apiKey": "your_together_api_key",
  "models": [
    {
      "id": "mistralai/Mixtral-8x7B-Instruct-v0.1",
      "name": "Mixtral 8x7B Instruct",
      "contextWindow": 32768,
      "pricing": { "input": 0.0006, "output": 0.0006 }
    }
  ]
}
```

## Enterprise Deployments

### Azure OpenAI Service

```json
{
  "id": "azure_openai",
  "name": "Azure OpenAI",
  "type": "azure-openai",
  "baseUrl": "https://your-resource.openai.azure.com",
  "apiKey": "your-azure-api-key",
  "apiVersion": "2024-02-15-preview",
  "models": [
    {
      "id": "gpt-5-deployment",
      "name": "GPT-4 (Azure)",
      "contextWindow": 128000,
      "deployment": "gpt-5-deployment-name"
    }
  ],
  "headers": {
    "api-key": "{api_key}"
  }
}
```

### AWS Bedrock

```json
{
  "id": "aws_bedrock",
  "name": "AWS Bedrock",
  "type": "aws-bedrock",
  "region": "us-east-1",
  "accessKeyId": "your-access-key",
  "secretAccessKey": "your-secret-key",
  "models": [
    {
      "id": "anthropic.claude-opus-4-2025-preview",
      "name": "Claude 3 Sonnet (Bedrock)",
      "contextWindow": 200000
    }
  ]
}
```

### Google Cloud Vertex AI

```json
{
  "id": "vertex_ai",
  "name": "Google Vertex AI", 
  "type": "vertex-ai",
  "projectId": "your-project-id",
  "region": "us-central1",
  "serviceAccountKey": "path/to/service-account.json",
  "models": [
    {
      "id": "gemini-1.5-pro-preview-0514",
      "name": "Gemini 1.5 Pro (Vertex)",
      "contextWindow": 2097152
    }
  ]
}
```

## Custom Adapter Development

### Adapter Interface

Create custom adapters for proprietary APIs:

```typescript
interface CustomAdapter {
  id: string;
  name: string;
  
  // Transform request from OpenAI format to custom format
  transformRequest(request: OpenAIRequest): CustomRequest;
  
  // Transform response from custom format to OpenAI format  
  transformResponse(response: CustomResponse): OpenAIResponse;
  
  // Handle authentication
  authenticate(apiKey: string): Promise<AuthResult>;
  
  // Get available models
  getModels(): Promise<Model[]>;
}
```

### Example Custom Adapter

```typescript
// adapters/custom-ai-adapter.ts
import { CustomAdapter } from '../types/adapter';

export class CustomAIAdapter implements CustomAdapter {
  id = 'custom_ai';
  name = 'Custom AI Service';
  
  async transformRequest(request: OpenAIRequest): Promise<CustomRequest> {
    return {
      // Transform OpenAI format to your API format
      query: request.messages.map(m => m.content).join('\n'),
      model: this.mapModelId(request.model),
      parameters: {
        temperature: request.temperature || 0.7,
        max_tokens: request.max_tokens || 1000
      }
    };
  }
  
  async transformResponse(response: CustomResponse): Promise<OpenAIResponse> {
    return {
      id: 'custom-' + Date.now(),
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: response.model_used,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: response.generated_text
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: response.input_token_count,
        completion_tokens: response.output_token_count,
        total_tokens: response.total_token_count
      }
    };
  }
  
  async authenticate(apiKey: string): Promise<AuthResult> {
    // Custom authentication logic
    const response = await fetch(`${this.baseUrl}/auth`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    
    return { 
      success: response.ok,
      token: response.ok ? await response.text() : null
    };
  }
  
  async getModels(): Promise<Model[]> {
    const response = await fetch(`${this.baseUrl}/models`);
    const models = await response.json();
    
    return models.map(m => ({
      id: m.model_id,
      name: m.display_name,
      contextWindow: m.max_context_length,
      pricing: {
        input: m.input_price_per_token,
        output: m.output_price_per_token
      }
    }));
  }
  
  private mapModelId(openaiModel: string): string {
    // Map OpenAI model IDs to your API's model IDs
    const modelMapping = {
      'gpt-5': 'custom-large-model',
      'gpt-4.1-mini': 'custom-fast-model'
    };
    
    return modelMapping[openaiModel] || openaiModel;
  }
}
```

### Register Custom Adapter

```typescript
// lib/providers/registry.ts
import { CustomAIAdapter } from '../adapters/custom-ai-adapter';

export const providerRegistry = {
  // ... existing providers
  custom_ai: new CustomAIAdapter()
};
```

## Configuration Management

### Provider Configuration Schema

```typescript
interface ProviderConfig {
  id: string;                    // Unique identifier
  name: string;                  // Display name
  type: ProviderType;            // Provider type
  enabled: boolean;              // Enable/disable provider
  priority: number;              // Fallback priority (1-100)
  
  // Connection settings
  baseUrl: string;
  apiKey: string;
  timeout: number;
  maxRetries: number;
  
  // Model configuration
  models: ModelConfig[];
  defaultModel: string;
  
  // Rate limiting
  rateLimit: {
    rpm: number;                 // Requests per minute
    rph: number;                 // Requests per hour 
    concurrent: number;          // Max concurrent requests
  };
  
  // Budget controls
  budget: {
    daily: number;               // Daily spending limit (USD)
    monthly: number;             // Monthly spending limit (USD)
    alertThreshold: number;      // Alert threshold (0-1)
  };
  
  // Custom headers and parameters
  headers: Record<string, string>;
  defaultParams: Record<string, any>;
}
```

### Dynamic Configuration Updates

```typescript
// Update provider configuration at runtime
const updateProviderConfig = async (providerId: string, updates: Partial<ProviderConfig>) => {
  const currentConfig = await getProviderConfig(providerId);
  const newConfig = { ...currentConfig, ...updates };
  
  // Validate configuration
  await validateProviderConfig(newConfig);
  
  // Update in database
  await saveProviderConfig(newConfig);
  
  // Refresh provider instance
  await reloadProvider(providerId);
  
  return newConfig;
};
```

## Testing Custom Providers

### Provider Testing Framework

```typescript
// Test custom provider integration
const testProvider = async (providerId: string) => {
  const tests = [
    {
      name: 'Authentication',
      test: async () => await testAuthentication(providerId)
    },
    {
      name: 'Model Listing',
      test: async () => await testModelListing(providerId) 
    },
    {
      name: 'Basic Chat',
      test: async () => await testBasicChat(providerId)
    },
    {
      name: 'Streaming',
      test: async () => await testStreaming(providerId)
    },
    {
      name: 'Error Handling',
      test: async () => await testErrorHandling(providerId)
    }
  ];
  
  const results = [];
  for (const test of tests) {
    try {
      const result = await test.test();
      results.push({ name: test.name, status: 'passed', result });
    } catch (error) {
      results.push({ name: test.name, status: 'failed', error: error.message });
    }
  }
  
  return results;
};
```

### Test Suite Example

```bash
# Run provider tests
npm run test:provider custom_ai

# Test specific functionality  
npm run test:provider custom_ai --test authentication
npm run test:provider custom_ai --test models
npm run test:provider custom_ai --test chat

# Test with debugging
DEBUG=provider:* npm run test:provider custom_ai
```

## Monitoring and Observability

### Custom Provider Metrics

```typescript
interface ProviderMetrics {
  providerId: string;
  requests: {
    total: number;
    successful: number;
    failed: number;
    rate: number;                // Requests per minute
  };
  
  latency: {
    average: number;
    p95: number;
    p99: number;
  };
  
  costs: {
    total: number;
    perRequest: number;
    perToken: number;
  };
  
  errors: {
    total: number;
    byType: Record<string, number>;
    rate: number;
  };
  
  availability: {
    uptime: number;              // Percentage
    lastCheck: Date;
    status: 'healthy' | 'degraded' | 'down';
  };
}
```

### Health Monitoring

```typescript
// Monitor custom provider health
const monitorProviderHealth = async (providerId: string) => {
  const healthCheck = {
    timestamp: new Date(),
    providerId,
    tests: {
      connectivity: await testConnectivity(providerId),
      authentication: await testAuthentication(providerId),
      modelAccess: await testModelAccess(providerId),
      responseTime: await measureResponseTime(providerId)
    }
  };
  
  // Store health metrics
  await storeHealthMetrics(healthCheck);
  
  // Alert on issues
  if (!healthCheck.tests.connectivity.success) {
    await sendAlert(`Provider ${providerId} connectivity failed`);
  }
  
  return healthCheck;
};
```

## Security Considerations

### API Key Security

```typescript
// Encrypt custom provider API keys
const encryptApiKey = async (apiKey: string, providerId: string): Promise<string> => {
  const cipher = crypto.createCipher('aes-256-gcm', getEncryptionKey(providerId));
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return encrypted;
};

const decryptApiKey = async (encryptedKey: string, providerId: string): Promise<string> => {
  const decipher = crypto.createDecipher('aes-256-gcm', getEncryptionKey(providerId));
  let decrypted = decipher.update(encryptedKey, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};
```

### Request Validation

```typescript
// Validate requests before sending to custom providers
const validateRequest = (request: any, provider: ProviderConfig): ValidationResult => {
  const errors = [];
  
  // Validate required fields
  if (!request.messages || request.messages.length === 0) {
    errors.push('Messages are required');
  }
  
  // Validate model availability
  if (!provider.models.find(m => m.id === request.model)) {
    errors.push(`Model ${request.model} not available for provider ${provider.id}`);
  }
  
  // Validate token limits
  if (request.max_tokens > provider.models.find(m => m.id === request.model)?.contextWindow) {
    errors.push('Token limit exceeds model context window');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};
```

## Examples and Templates

### Hugging Face Inference API

```json
{
  "id": "huggingface",
  "name": "Hugging Face Inference API",
  "type": "openai-compatible",
  "baseUrl": "https://api-inference.huggingface.co/models",
  "apiKey": "hf_your_token_here",
  "models": [
    {
      "id": "microsoft/DialoGPT-large",
      "name": "DialoGPT Large",
      "contextWindow": 1024
    },
    {
      "id": "facebook/blenderbot-400M-distill", 
      "name": "BlenderBot 400M",
      "contextWindow": 128
    }
  ],
  "headers": {
    "Authorization": "Bearer {api_key}",
    "Content-Type": "application/json"
  }
}
```

### Replicate API Integration

```json
{
  "id": "replicate",
  "name": "Replicate",
  "type": "custom-adapter",
  "baseUrl": "https://api.replicate.com/v1",
  "apiKey": "r8_your_token_here",
  "models": [
    {
      "id": "meta/llama-2-70b-chat",
      "name": "Llama 2 70B Chat",
      "contextWindow": 4096
    }
  ],
  "adapterConfig": {
    "requestFormat": "replicate",
    "responseFormat": "replicate",
    "streamingSupport": false
  }
}
```

### Private Model Server

```json
{
  "id": "private_server",
  "name": "Private Model Server",
  "type": "openai-compatible",
  "baseUrl": "https://your-private-server.com/v1",
  "apiKey": "your-private-api-key",
  "models": [
    {
      "id": "custom-model-v1",
      "name": "Custom Trained Model v1",
      "contextWindow": 8192,
      "pricing": { "input": 0.001, "output": 0.002 }
    }
  ],
  "security": {
    "tlsVersion": "1.3",
    "certificateValidation": true,
    "allowInsecure": false
  }
}
```

## Troubleshooting

### Common Issues

**Provider Not Detected:**
```bash
# Check provider configuration
npm run debug:provider custom_ai

# Validate configuration format
npm run validate:provider-config custom_ai

# Test connectivity
npm run test:provider-connection custom_ai
```

**Authentication Failures:**
```bash
# Test API key
curl -H "Authorization: Bearer $API_KEY" $BASE_URL/models

# Check headers and format
npm run debug:provider-auth custom_ai
```

**Model Not Found:**
```bash
# List available models
npm run list:provider-models custom_ai

# Check model mapping
npm run debug:model-mapping custom_ai
```

**Performance Issues:**
```bash
# Monitor provider performance
npm run monitor:provider custom_ai

# Check rate limits
npm run debug:rate-limits custom_ai
```

### Debug Mode

```bash
# Enable custom provider debugging
DEBUG=provider:custom* npm run dev

# Detailed request/response logging
CUSTOM_PROVIDER_DEBUG=1 npm run test:provider custom_ai
```

## Next Steps

Once custom providers are configured:

1. **[Test Integration](../index.md#provider-comparison)** - Verify provider works correctly
2. **[Configure Fallback](../../features/fallback-system.md)** - Set up priority routing
3. **[Monitor Performance](../../features/analytics.md)** - Track custom provider metrics
4. **[Optimize Configuration](../../config/preferences.md)** - Fine-tune provider settings

---

**Questions about custom providers?** Check our [troubleshooting guide](../../config/troubleshooting.md) or join our [Discord](https://discord.gg/polydev).
