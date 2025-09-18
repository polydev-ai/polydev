# Perspectives API

Get diverse AI perspectives from multiple models simultaneously with intelligent fallback routing and response aggregation.

## Endpoint

```
POST /v1/perspectives
```

The Perspectives API is Polydev's flagship endpoint that enables you to query multiple AI models concurrently, automatically handle provider fallbacks, and receive aggregated insights for better decision-making.

## Authentication

All requests require authentication via API key in the Authorization header:

```bash
Authorization: Bearer poly_your_api_key_here
```

## Request Format

### Basic Request

```javascript
{
  "prompt": "Explain React hooks and their benefits",
  "models": ["gpt-5", "claude-opus-4", "gemini-2.5-pro", "grok-4-high"]
}
```

### Complete Request Schema

```javascript
{
  // Required fields
  "prompt": "Your question or task description",
  
  // Optional model configuration
  "models": ["gpt-5", "claude-opus-4"],                // Specific models to query
  "model_count": 3,                                 // Auto-select N best models
  "preferred_providers": ["cli", "api_keys"],       // Provider preference order
  
  // Context and memory
  "project_memory": "smart",                        // "none", "smart", "full"
  "project_context": {
    "root_path": "/path/to/project",
    "include_patterns": ["**/*.js", "**/*.ts"],
    "exclude_patterns": ["node_modules/**"],
    "similarity_threshold": 0.7,
    "max_context_size": 50000
  },
  "additional_context": "Custom context information",
  
  // Response configuration
  "analysis_depth": "standard",                     // "quick", "standard", "comprehensive"
  "response_format": "structured",                  // "text", "structured", "markdown"
  "consensus_analysis": true,                       // Enable consensus detection
  "include_reasoning": true,                        // Include model reasoning
  
  // Provider settings
  "provider_settings": {
    "temperature": 0.7,
    "max_tokens": 2000,
    "timeout": 30000
  },
  
  // Fallback configuration
  "fallback_options": {
    "enabled": true,
    "min_successful_models": 1,
    "allow_simpler_models": true,
    "cost_limit": 1.00
  },
  
  // Advanced options
  "streaming": false,                               // Enable streaming responses
  "cache_ttl": 3600,                               // Cache responses for 1 hour
  "metadata": {                                     // Custom metadata
    "user_id": "user_123",
    "session_id": "session_456"
  }
}
```

## Response Format

### Standard Response

```javascript
{
  "request_id": "req_abc123def456",
  "timestamp": "2024-01-15T10:30:00Z",
  "processing_time": 3240,
  "status": "completed",
  
  "perspectives": [
    {
      "model": "claude-opus-4",
      "provider": "claude_code_cli",
      "provider_type": "cli",
      "response_time": 1890,
      "tokens_used": 523,
      "cost": 0.00,
      "confidence_score": 0.92,
      "content": "React hooks are functions that let you use state and lifecycle features...",
      "reasoning": "I analyzed this from the perspective of practical React development...",
      "metadata": {
      "model_version": "claude-opus-4-2025-preview",
        "finish_reason": "stop",
        "safety_rating": "safe"
      }
    },
    {
      "model": "gpt-5",
      "provider": "openai_api",
      "provider_type": "api_key",
      "response_time": 2100,
      "tokens_used": 456,
      "cost": 0.0234,
      "confidence_score": 0.89,
      "content": "React hooks revolutionized functional components by providing...",
      "reasoning": "From a software architecture perspective, hooks solve...",
      "metadata": {
        "model_version": "gpt-5-2025-preview",
        "finish_reason": "stop",
        "safety_rating": "safe"
      }
    }
  ],
  
  "summary": {
    "total_models_requested": 2,
    "total_models_succeeded": 2,
    "total_models_failed": 0,
    "consensus_points": [
      "Hooks enable state in functional components",
      "useState and useEffect are fundamental hooks",
      "Hooks improve code reusability and testing"
    ],
    "divergent_opinions": [
      "Claude emphasized practical usage patterns, GPT-4 focused on architectural benefits"
    ],
    "confidence_average": 0.905,
    "total_tokens_used": 979,
    "total_cost": 0.0234,
    "cost_breakdown": {
      "cli_cost": 0.00,
      "api_cost": 0.0234,
      "credit_cost": 0.00
    }
  },
  
  "routing_info": {
    "fallback_triggered": false,
    "providers_attempted": ["claude_code_cli", "openai_api"],
    "providers_failed": [],
    "total_fallback_attempts": 0,
    "routing_strategy": "parallel_optimal"
  },
  
  "project_context": {
    "files_analyzed": 0,
    "context_method": "none",
    "similarity_matches": []
  }
}
```

### Error Response

```javascript
{
  "error": {
    "type": "provider_error",
    "message": "No providers available for requested models",
    "code": "NO_PROVIDERS_AVAILABLE",
    "details": {
      "requested_models": ["claude-opus-4", "gpt-5"],
      "available_providers": [],
      "fallback_attempts": [
        {
          "provider": "claude_code_cli",
          "model": "claude-3-sonnet", 
          "error": "Authentication required",
          "timestamp": "2024-01-15T10:29:45Z"
        }
      ]
    },
    "request_id": "req_abc123def456",
    "timestamp": "2024-01-15T10:30:00Z",
    "retry_after": 60
  }
}
```

## Usage Examples

### Basic Multi-Model Query

<div class="code-tabs" data-group="perspectives-basic">
  <div class="flex gap-2 mb-3">
    <button class="tab-button px-3 py-1.5 rounded-md border text-sm" data-lang="curl">cURL</button>
    <button class="tab-button px-3 py-1.5 rounded-md border text-sm" data-lang="node">Node</button>
    <button class="tab-button px-3 py-1.5 rounded-md border text-sm" data-lang="ts">TypeScript</button>
  </div>
  <pre data-lang="curl"><code class="language-bash">curl -s https://api.polydev.ai/v1/perspectives \
  -H "Authorization: Bearer poly_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What are the pros and cons of microservices architecture?",
    "models": ["gpt-5", "claude-opus-4", "gemini-2.5-pro"]
  }'</code></pre>
  <pre data-lang="node"><code class="language-javascript">const response = await fetch('https://api.polydev.ai/v1/perspectives', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + process.env.POLYDEV_API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: 'What are the pros and cons of microservices architecture?',
    models: ['gpt-5','claude-opus-4','gemini-2.5-pro']
  })
})
const data = await response.json()</code></pre>
  <pre data-lang="ts"><code class="language-typescript">interface PerspectivesRequest { prompt: string; models: string[] }
const req: PerspectivesRequest = {
  prompt: 'What are the pros and cons of microservices architecture?',
  models: ['gpt-5','claude-opus-4','gemini-2.5-pro']
}
const res = await fetch('https://api.polydev.ai/v1/perspectives', {
  method: 'POST',
  headers: { Authorization: `Bearer ${process.env.POLYDEV_API_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(req)
})
const data: any = await res.json()</code></pre>
</div>

### Code Review with Project Context

```javascript
const codeReviewResponse = await fetch('https://api.polydev.ai/v1/perspectives', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer poly_your_api_key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: `
      Please review this React component for:
      1. Performance issues
      2. Security vulnerabilities  
      3. Best practices compliance
      4. Accessibility concerns
    `,
    models: ["claude-3-sonnet", "gpt-4", "codex"],
    project_memory: "smart",
    project_context: {
      root_path: "/path/to/react/project",
      include_patterns: ["src/**/*.{js,jsx,ts,tsx}", "**/*.md"],
      exclude_patterns: ["node_modules/**", "dist/**"],
      max_context_size: 75000
    },
    additional_context: `
      Component code:
      \`\`\`jsx
      const UserProfile = ({ userId }) => {
        const [user, setUser] = useState(null);
        const [loading, setLoading] = useState(true);
        
        useEffect(() => {
          fetch(\`/api/users/\${userId}\`)
            .then(res => res.json())
            .then(setUser)
            .finally(() => setLoading(false));
        }, [userId]);
        
        if (loading) return <div>Loading...</div>;
        
        return (
          <div>
            <h1>{user.name}</h1>
            <img src={user.avatar} alt="User avatar" />
            <p>{user.email}</p>
          </div>
        );
      };
      \`\`\`
    `,
    analysis_depth: "comprehensive",
    consensus_analysis: true
  })
});

const review = await codeReviewResponse.json();

// Display structured review
console.log("=== CODE REVIEW RESULTS ===");
review.perspectives.forEach((perspective, index) => {
  console.log(`\n--- ${perspective.model.toUpperCase()} (${perspective.confidence_score}) ---`);
  console.log(perspective.content);
});

console.log("\n=== CONSENSUS ISSUES ===");
review.summary.consensus_points.forEach(point => {
  console.log(`• ${point}`);
});
```

### Architecture Decision Support

```javascript
const architectureDecision = await fetch('https://api.polydev.ai/v1/perspectives', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer poly_your_api_key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: `
      We're building a real-time chat application expecting 100K+ concurrent users.
      
      Please analyze these architecture options:
      
      A) WebSockets with Redis pub/sub + Node.js cluster
      B) Server-Sent Events with PostgreSQL LISTEN/NOTIFY
      C) GraphQL subscriptions with in-memory pub/sub
      D) Socket.IO with Redis adapter + horizontal scaling
      
      Consider:
      - Scalability to 100K+ concurrent connections
      - Infrastructure complexity and costs
      - Development team expertise (React/Node.js)
      - Real-time performance requirements
      - Fault tolerance and recovery
    `,
    models: ["claude-opus-4", "gpt-5", "gemini-2.5-pro"],
    analysis_depth: "comprehensive",
    provider_settings: {
      temperature: 0.2,  // More focused analysis
      max_tokens: 3000
    },
    fallback_options: {
      cost_limit: 2.00  // Allow higher cost for important decision
    }
  })
});

const decision = await architectureDecision.json();

// Analyze expert opinions
console.log("=== ARCHITECTURE ANALYSIS ===");

decision.perspectives.forEach(perspective => {
  console.log(`\n${perspective.model.toUpperCase()} Recommendation:`);
  console.log(perspective.content);
  console.log(`Confidence: ${(perspective.confidence_score * 100).toFixed(1)}%`);
  console.log(`Cost: $${perspective.cost.toFixed(4)}`);
});

console.log("\n=== EXPERT CONSENSUS ===");
if (decision.summary.consensus_points.length > 0) {
  console.log("All experts agree on:");
  decision.summary.consensus_points.forEach(point => {
    console.log(`✅ ${point}`);
  });
}

if (decision.summary.divergent_opinions.length > 0) {
  console.log("\nExperts differ on:");
  decision.summary.divergent_opinions.forEach(opinion => {
    console.log(`🤔 ${opinion}`);
  });
}

console.log(`\nTotal analysis cost: $${decision.summary.total_cost.toFixed(4)}`);
```

### Auto-Select Best Models

```javascript
// Let Polydev choose the best models for your task
const smartSelection = await fetch('https://api.polydev.ai/v1/perspectives', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer poly_your_api_key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: "Debug this Python async/await performance issue",
    model_count: 3,  // Auto-select 3 best models
    task_context: {
      domain: "programming",
      language: "python", 
      complexity: "high",
      urgency: "medium"
    },
    preferred_providers: ["cli", "api_keys"]  // Prefer CLI tools first
  })
});

const result = await smartSelection.json();

console.log("Models selected by Polydev:");
result.perspectives.forEach(p => {
  console.log(`• ${p.model} via ${p.provider_type}`);
});
```

### Streaming Responses

```javascript
// Enable streaming for real-time responses
const streamingResponse = await fetch('https://api.polydev.ai/v1/perspectives', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer poly_your_api_key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: "Explain machine learning fundamentals step by step",
    models: ["claude-opus-4", "gpt-5"],
    streaming: true
  })
});

// Handle streaming response
const reader = streamingResponse.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      
      if (data.type === 'perspective_chunk') {
        console.log(`${data.model}: ${data.content}`);
      } else if (data.type === 'perspective_complete') {
        console.log(`✓ ${data.model} finished`);
      } else if (data.type === 'all_complete') {
        console.log('All models completed');
        console.log('Summary:', data.summary);
        break;
      }
    }
  }
}
```

## Advanced Configuration

### Custom Provider Settings

```javascript
// Configure different settings per model
{
  "prompt": "Creative writing task requiring varied approaches",
  "models": [
    {
      "model": "claude-opus-4",
      "provider_settings": {
        "temperature": 0.9,    // More creative
        "max_tokens": 2000
      }
    },
    {
      "model": "gpt-5",
      "provider_settings": {
        "temperature": 0.3,    // More focused
        "max_tokens": 1500
      }
    }
  ]
}
```

### Intelligent Context Selection

```javascript
// Use TF-IDF for smart context selection
{
  "prompt": "How should we optimize the user authentication system?",
  "models": ["claude-opus-4", "gpt-5"],
  "project_memory": "smart",
  "project_context": {
    "root_path": "/path/to/project",
    "similarity_threshold": 0.8,      // Higher similarity required
    "max_files": 20,                  // Limit context files
    "boost_keywords": ["auth", "login", "security", "jwt"],
    "context_window": 100000,         // Max tokens for context
    "file_type_weights": {            // Weight different file types
      ".js": 1.0,
      ".ts": 1.2,                     // TypeScript files more relevant
      ".md": 0.8,                     // Documentation less relevant
      ".test.js": 0.6                 // Test files less relevant
    }
  }
}
```

### Consensus Analysis Configuration

```javascript
// Fine-tune consensus detection
{
  "prompt": "Evaluate these database design approaches",
  "models": ["claude-opus-4", "gpt-5", "gemini-2.5-pro"],
  "consensus_analysis": {
    "enabled": true,
    "agreement_threshold": 0.7,       // 70% agreement for consensus
    "semantic_similarity": true,      // Use semantic matching
    "extract_key_points": true,       // Extract bullet points
    "weight_by_confidence": true,     // Weight by model confidence
    "min_consensus_models": 2         // Need 2+ models to agree
  }
}
```

## Error Handling

### Common Error Types

#### Authentication Errors

```javascript
// 401 Unauthorized
{
  "error": {
    "type": "authentication_error",
    "message": "Invalid API key",
    "code": "INVALID_API_KEY"
  }
}
```

#### Rate Limiting Errors

```javascript
// 429 Too Many Requests  
{
  "error": {
    "type": "rate_limit_error",
    "message": "Rate limit exceeded",
    "code": "RATE_LIMIT_EXCEEDED",
    "details": {
      "limit": 100,
      "window": "1m",
      "retry_after": 45
    }
  }
}
```

#### Provider Errors

```javascript
// 502 Bad Gateway
{
  "error": {
    "type": "provider_error", 
    "message": "All requested providers are currently unavailable",
    "code": "NO_PROVIDERS_AVAILABLE",
    "details": {
      "requested_models": ["claude-3-sonnet", "gpt-4"],
      "provider_attempts": [
        {
          "provider": "claude_code_cli",
          "error": "Authentication required",
          "timestamp": "2024-01-15T10:29:45Z"
        },
        {
          "provider": "openai_api",
          "error": "Rate limit exceeded", 
          "retry_after": 60
        }
      ],
      "suggested_actions": [
        "Verify CLI authentication with: claude auth status",
        "Check API key quotas in provider dashboard",
        "Try again in 60 seconds",
        "Consider using Polydev credits as fallback"
      ]
    }
  }
}
```

### Error Recovery Strategies

```javascript
const makeRequestWithRetry = async (requestData, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('https://api.polydev.ai/v1/perspectives', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer poly_your_api_key',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const error = await response.json();
        
        if (error.error.type === 'rate_limit_error') {
          // Wait for rate limit reset
          const delay = error.error.details.retry_after * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        if (error.error.type === 'provider_error' && attempt < maxRetries) {
          // Try with fallback enabled
          requestData.fallback_options = {
            enabled: true,
            allow_simpler_models: true,
            cost_limit: 1.00
          };
          continue;
        }
        
        throw new Error(error.error.message);
      }
      
      return await response.json();
      
    } catch (networkError) {
      if (attempt === maxRetries) throw networkError;
      
      // Exponential backoff for network errors
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Usage
try {
  const result = await makeRequestWithRetry({
    prompt: "Analyze this code",
    models: ["claude-opus-4", "gpt-5"]
  });
  
  console.log(result.perspectives);
  
} catch (error) {
  console.error('All retry attempts failed:', error.message);
  
  // Fallback to simpler request
  const fallbackResult = await makeRequestWithRetry({
    prompt: "Analyze this code", 
    models: ["gemini-2.5-pro"],  // Simpler, widely available
    analysis_depth: "quick"
  }, 1);
}
```

## Performance Optimization

### Request Optimization

```javascript
// Optimize for speed
const fastRequest = {
  prompt: "Quick code review",
  models: ["gemini-2.5-pro"],  // Faster models
  analysis_depth: "quick",
  provider_settings: {
    temperature: 0.3,
    max_tokens: 1000
  },
  cache_ttl: 1800  // Cache for 30 minutes
};

// Optimize for quality
const qualityRequest = {
  prompt: "Comprehensive architecture analysis",
  models: ["claude-opus-4", "gpt-5"],  // Premium models
  analysis_depth: "comprehensive",
  provider_settings: {
    temperature: 0.1,
    max_tokens: 4000
  },
  consensus_analysis: true
};
```

### Caching Strategies

```javascript
// Enable aggressive caching for repeated queries
{
  "prompt": "Explain React best practices",
  "models": ["claude-opus-4", "gpt-5"],
  "cache_ttl": 7200,          // 2 hours
  "cache_key_strategy": "semantic",  // Semantic similarity matching
  "cache_similarity_threshold": 0.9  // 90% similarity for cache hit
}
```

### Batch Processing

```javascript
// Process multiple related queries efficiently
const batchQueries = [
  {
    id: "component_1",
    prompt: "Review UserProfile component",
    context: userProfileCode
  },
  {
    id: "component_2", 
    prompt: "Review UserSettings component",
    context: userSettingsCode
  },
  {
    id: "component_3",
    prompt: "Review UserDashboard component", 
    context: userDashboardCode
  }
];

// Process with shared configuration
const batchResults = await Promise.all(
  batchQueries.map(query => 
    fetch('https://api.polydev.ai/v1/perspectives', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer poly_your_api_key',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...query,
        models: ["claude-opus-4", "gpt-5"],
        project_memory: "smart",
        analysis_depth: "standard",
        metadata: { batch_id: "component_reviews" }
      })
    }).then(r => r.json())
  )
);

// Process results
batchResults.forEach(result => {
  console.log(`Review for ${result.metadata?.batch_id}:`);
  result.perspectives.forEach(p => {
    console.log(`${p.model}: ${p.content.substring(0, 200)}...`);
  });
});
```

## SDK Integration

### JavaScript/Node.js

```javascript
import { PolydevClient } from '@polydev/node';

const client = new PolydevClient({
  apiKey: 'poly_your_api_key',
  baseURL: 'https://api.polydev.ai',
  defaultModels: ['claude-opus-4', 'gpt-5'],
  timeout: 60000
});

// Simple usage
const result = await client.perspectives({
  prompt: "Explain async/await patterns",
  models: ["claude-opus-4", "gpt-5"]
});

// Advanced usage with all options
const advancedResult = await client.perspectives({
  prompt: "Comprehensive code review",
  models: ["claude-opus-4", "gpt-5", "codex"],
  projectMemory: "smart",
  projectContext: {
    rootPath: "/path/to/project",
    includePatterns: ["**/*.js", "**/*.ts"],
    maxContextSize: 75000
  },
  analysisDepth: "comprehensive",
  consensusAnalysis: true,
  providerSettings: {
    temperature: 0.2,
    maxTokens: 3000
  }
});

console.log(advancedResult.summary.consensusPoints);
```

### Python

```python
import polydev

client = polydev.Client(api_key="poly_your_api_key")

# Basic usage
result = client.perspectives(
    prompt="Explain Python decorators",
    models=["claude-opus-4", "gpt-5"]
)

for perspective in result.perspectives:
    print(f"{perspective.model}: {perspective.content}")

# Advanced usage
advanced_result = client.perspectives(
    prompt="Review this Django application architecture",
    models=["claude-opus-4", "gpt-5"],
    project_memory="smart",
    project_context=polydev.ProjectContext(
        root_path="/path/to/django/project",
        include_patterns=["**/*.py", "**/*.md"],
        max_context_size=100000
    ),
    analysis_depth="comprehensive",
    consensus_analysis=True
)

print("Consensus points:", advanced_result.summary.consensus_points)
print("Total cost:", f"${advanced_result.summary.total_cost:.4f}")
```

## Webhooks Integration

### Setting Up Webhooks

```javascript
// Configure webhook for perspective completions
const webhook = await fetch('https://api.polydev.ai/v1/webhooks', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer poly_your_api_key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: "https://your-app.com/webhooks/polydev",
    events: [
      "perspective.completed",
      "perspective.failed", 
      "fallback.triggered"
    ],
    active: true
  })
});
```

### Webhook Payload Example

```javascript
// Received at your webhook endpoint
{
  "event": "perspective.completed",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "request_id": "req_abc123def456",
    "status": "completed",
    "perspectives": [
      {
        "model": "claude-opus-4",
        "content": "Detailed analysis result...",
        "confidence_score": 0.92
      }
    ],
    "summary": {
      "total_cost": 0.0234,
      "processing_time": 2340
    }
  }
}
```

## Best Practices

### Prompt Engineering

**✅ Clear, specific prompts work best across models:**

```javascript
{
  "prompt": `
    Please review this React component and provide:
    
    1. Performance optimization suggestions
    2. Potential security vulnerabilities
    3. Code maintainability improvements
    4. Accessibility recommendations
    
    Focus on actionable, specific suggestions with code examples where applicable.
    
    Component code:
    ${componentCode}
  `
}
```

**❌ Avoid vague or model-specific prompts:**

```javascript
{
  "prompt": "Fix this code"  // Too vague
}
```

### Cost Optimization

```javascript
// Use appropriate model tiers for different tasks
const taskModels = {
  quickQuestions: ["gemini-2.5-pro"],
  codeReview: ["claude-opus-4", "gpt-5", "codex"],
  complexAnalysis: ["claude-opus-4", "gpt-5"]
};

// Set cost limits
const costControlledRequest = {
  prompt: "Analyze system architecture",
  models: ["claude-opus-4", "gpt-5"],
  fallback_options: {
    cost_limit: 0.50,           // Max $0.50 per request
    allow_simpler_models: true   // Fallback to cheaper models if needed
  }
};
```

### Model Selection

```javascript
// Task-specific model selection
const getOptimalModels = (taskType) => {
  switch (taskType) {
    case 'code_review':
      return ["claude-opus-4", "gpt-5", "codex"];
    case 'creative_writing':
      return ["gpt-5", "claude-opus-4"];
    case 'data_analysis':
      return ["gpt-5", "claude-opus-4", "gemini-2.5-pro"];
    case 'quick_questions':
      return ["gemini-2.5-pro"];
    default:
      return ["claude-opus-4", "gpt-5"];
  }
};
```

## Rate Limits

| Plan | Requests/Minute | Requests/Day | Models/Request |
|------|-----------------|--------------|----------------|
| Free | 20 | 1,000 | 2 |
| Pro | 100 | 10,000 | 5 |
| Team | 500 | 50,000 | 10 |
| Enterprise | Custom | Custom | Unlimited |

Rate limit headers are included in all responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 85  
X-RateLimit-Reset: 1642262400
X-RateLimit-Type: requests
```

## Next Steps

- **[Chat Completions API](../chat/)** - OpenAI-compatible endpoint
- **[Models API](../models/)** - Available models and capabilities
- **[Webhooks](../webhooks/)** - Event notifications  
- **[Authentication](../authentication/)** - API key management

---

**Need help with the Perspectives API?** Check our [troubleshooting guide](../../config/troubleshooting.md) or join our [Discord](https://discord.gg/polydev).
