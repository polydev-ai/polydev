# User Preferences

Configure your personal Polydev settings for optimal performance and user experience.

## Overview

User preferences control how Polydev behaves for your specific use cases, including default models, context settings, and UI preferences.

## Accessing Preferences

### Dashboard Interface

1. Navigate to [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
2. Click **"Settings"** in the sidebar
3. Select **"Preferences"** tab

### MCP Configuration

Preferences can also be configured via environment variables for MCP-only setups:

```bash
# .env.local
POLYDEV_DEFAULT_MODELS=gpt-5,claude-opus-4
POLYDEV_PROJECT_MEMORY=full
POLYDEV_MAX_TOKENS=4000
```

## Model Preferences

### Default Models

Configure which models to use when no specific models are requested:

**Dashboard Configuration:**
1. Go to **Settings → Preferences → Default Models**
2. Select primary and fallback models
3. Set model preferences per use case

**Environment Configuration:**
```bash
# Primary models (comma-separated)
POLYDEV_DEFAULT_MODELS=gpt-5,claude-opus-4,gemini-2.5-pro

# Fallback models (if primary unavailable)
POLYDEV_FALLBACK_MODELS=gpt-4.1-mini,claude-haiku-2
```

### Model Selection Strategy

```typescript
interface ModelPreferences {
  primary: string[];           // First choice models
  fallback: string[];          // Backup models
  fastModels: string[];        // For quick responses
  creativeModels: string[];    // For creative tasks
  codingModels: string[];      // For programming tasks
  researchModels: string[];    // For analysis/research
}
```

**Example Configuration:**
```json
{
  "primary": ["gpt-5", "claude-opus-4"],
  "fallback": ["gpt-4.1-mini", "claude-haiku-2"],
  "fastModels": ["groq/llama-3.1-70b", "groq/mixtral-8x7b"],
  "creativeModels": ["claude-opus-4", "gpt-5"],
  "codingModels": ["claude-sonnet-4", "gpt-5", "codestral"],
  "researchModels": ["perplexity/llama-3.1-sonar-large", "claude-opus-4"]
}
```

## Context Preferences

### Project Memory Settings

Configure how Polydev handles project context:

```bash
# Project memory level
POLYDEV_PROJECT_MEMORY=full  # none, light, full

# Context budget (tokens)
POLYDEV_CONTEXT_BUDGET=8000

# File inclusion patterns
POLYDEV_INCLUDE_PATTERNS="**/*.{js,ts,tsx,jsx,py,md}"

# File exclusion patterns  
POLYDEV_EXCLUDE_PATTERNS="node_modules/**,*.log,dist/**"
```

**Memory Levels:**
- **None**: No project context included
- **Light**: Recently modified files (last 7 days)
- **Full**: TF-IDF similarity-based selection

### Context Budget Management

Control token usage for project context:

```typescript
interface ContextSettings {
  maxTokens: number;           // Maximum tokens for context
  reservedTokens: number;      // Tokens reserved for response
  priorityFiles: string[];     // Always include these files
  maxFiles: number;            // Maximum files to include
  minSimilarity: number;       // Minimum similarity score (0-1)
}
```

**Dashboard Settings:**
1. **Context Budget**: Set maximum tokens (default: 8000)
2. **Priority Files**: Always include specific files
3. **Similarity Threshold**: Minimum relevance score (0.1-1.0)
4. **Max Files**: Limit number of files (default: 20)

## Response Preferences

### Output Formatting

Control how responses are formatted and delivered:

```bash
# Response formatting
POLYDEV_RESPONSE_FORMAT=markdown  # markdown, plain, html
POLYDEV_INCLUDE_METADATA=true     # Include model/token metadata
POLYDEV_STREAMING=true            # Enable streaming responses

# Code formatting
POLYDEV_SYNTAX_HIGHLIGHTING=true
POLYDEV_CODE_THEME=github-dark
```

### Temperature and Creativity

Set default creativity levels for different use cases:

```json
{
  "defaultTemperature": 0.7,
  "temperatureByTask": {
    "coding": 0.2,
    "creative": 0.9,
    "analysis": 0.3,
    "research": 0.5
  }
}
```

**Dashboard Configuration:**
1. Go to **Settings → Preferences → Response Settings**
2. Set default temperature (0.0-2.0)
3. Configure task-specific temperatures
4. Set max tokens per response

## Provider Preferences

### Fallback Priority

Customize the fallback system priority order:

```typescript
interface FallbackPreferences {
  preferredProviders: string[];    // Preferred provider order
  avoidProviders: string[];        // Providers to avoid
  maxRetries: number;              // Retry attempts per provider
  retryDelay: number;              // Delay between retries (ms)
}
```

**Example Configuration:**
```json
{
  "preferredProviders": ["claude_code", "openai", "anthropic", "google"],
  "avoidProviders": ["provider-with-issues"],
  "maxRetries": 3,
  "retryDelay": 1000
}
```

### Rate Limiting Preferences

Configure personal rate limits to avoid hitting API quotas:

```bash
# Rate limiting (requests per minute)
POLYDEV_PERSONAL_RPM_OPENAI=50
POLYDEV_PERSONAL_RPM_ANTHROPIC=30
POLYDEV_PERSONAL_RPM_GOOGLE=100

# Budget limits (USD per month)
POLYDEV_BUDGET_OPENAI=100
POLYDEV_BUDGET_ANTHROPIC=75
POLYDEV_BUDGET_GOOGLE=50
```

## Performance Preferences

### Caching Settings

Configure response caching behavior:

```bash
# Response caching
POLYDEV_CACHE_ENABLED=true
POLYDEV_CACHE_TTL=900          # Cache TTL in seconds (15 minutes)
POLYDEV_CACHE_MAX_SIZE=1000    # Maximum cached responses

# Cache invalidation
POLYDEV_CACHE_INVALIDATE_ON_CONTEXT_CHANGE=true
```

### Parallel Processing

Configure concurrent request handling:

```bash
# Concurrency settings
POLYDEV_MAX_PARALLEL_REQUESTS=5    # Max simultaneous requests
POLYDEV_REQUEST_TIMEOUT=30000      # Request timeout (ms)
POLYDEV_CONNECTION_POOL_SIZE=10    # Connection pool size per provider
```

## UI/UX Preferences

### Theme and Display

Customize the dashboard appearance:

```json
{
  "theme": "dark",              // "light", "dark", "auto"
  "compactMode": false,         // Compact UI layout
  "showTokenCounts": true,      // Display token usage
  "showLatency": true,          // Display response times
  "animationsEnabled": true     // Enable UI animations
}
```

### Notification Settings

Control when and how you receive notifications:

```json
{
  "emailNotifications": {
    "budgetAlerts": true,       // Budget threshold alerts
    "errorAlerts": true,        // System error notifications
    "weeklyReports": false      // Usage summary emails
  },
  "browserNotifications": {
    "longRunningRequests": true, // Notify for slow requests
    "quotaWarnings": true        // API quota warnings
  }
}
```

## Advanced Preferences

### Custom Model Mappings

Map model IDs for specific use cases:

```json
{
  "modelAliases": {
    "fastest": "groq/llama-3.1-70b",
    "best": "gpt-5",
    "cheapest": "gpt-4.1-mini",
    "creative": "claude-opus-4"
  }
}
```

Usage:
```javascript
const response = await callTool({
  name: "get_perspectives",
  arguments: {
    prompt: "Help me debug this issue",
    models: ["fastest", "best"]  // Uses aliases
  }
});
```

### Prompt Templates

Create reusable prompt templates:

```json
{
  "promptTemplates": {
    "codeReview": "Please review this code for: 1) Security issues, 2) Performance problems, 3) Best practices violations, 4) Maintainability concerns.\n\nCode:\n{code}",
    "debugging": "I'm encountering this error: {error}\n\nIn this context: {context}\n\nPlease help me: 1) Understand the root cause, 2) Provide a solution, 3) Suggest prevention strategies.",
    "architecture": "I need to design a system that: {requirements}\n\nPlease provide: 1) Architectural options, 2) Trade-offs analysis, 3) Implementation recommendations."
  }
}
```

### Context Filtering Rules

Advanced file filtering for project memory:

```json
{
  "contextRules": [
    {
      "pattern": "**/*.test.js",
      "exclude": true,
      "reason": "Test files not needed for general assistance"
    },
    {
      "pattern": "src/components/**/*.tsx",
      "priority": "high",
      "reason": "UI components are frequently referenced"
    },
    {
      "pattern": "docs/**/*.md",
      "includeForQuery": ["documentation", "setup", "guide"],
      "reason": "Include docs only for documentation queries"
    }
  ]
}
```

## Preference Profiles

### Creating Profiles

Save different preference configurations for different projects or use cases:

```bash
# Development profile
POLYDEV_PROFILE=development
POLYDEV_PROJECT_MEMORY=full
POLYDEV_DEFAULT_MODELS=claude-opus-4,gpt-5

# Production profile  
POLYDEV_PROFILE=production
POLYDEV_PROJECT_MEMORY=light
POLYDEV_DEFAULT_MODELS=gpt-4.1-mini,claude-opus-4
```

### Profile Management

**Dashboard Interface:**
1. Go to **Settings → Preferences → Profiles**
2. Click **"Create New Profile"**
3. Configure settings for the profile
4. Save with a descriptive name

**CLI Management:**
```bash
# List profiles
polydev profiles list

# Switch profile
polydev profiles use development

# Create profile from current settings
polydev profiles create --name "my-project" --from-current
```

## Import/Export Settings

### Backup Preferences

Export your preferences for backup or sharing:

```bash
# Export all preferences
polydev preferences export --file my-preferences.json

# Export specific sections
polydev preferences export --models --context --file models-context.json
```

### Import Configuration

```bash
# Import preferences
polydev preferences import --file my-preferences.json

# Import with confirmation prompts
polydev preferences import --file shared-config.json --interactive
```

### Team Sharing

Share standardized preferences across team members:

```json
{
  "teamDefaults": {
    "models": ["claude-opus-4", "gpt-5"],
    "context": {
      "memory": "full",
      "budget": 8000
    },
    "formatting": {
      "codeTheme": "github-dark",
      "temperature": 0.3
    }
  }
}
```

## Validation and Testing

### Preference Validation

Polydev validates preferences on startup:

```typescript
const preferencesSchema = z.object({
  defaultModels: z.array(z.string()).min(1),
  projectMemory: z.enum(['none', 'light', 'full']),
  contextBudget: z.number().min(1000).max(32000),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().min(100).max(32000)
});
```

### Testing Preferences

Test your configuration before applying:

```bash
# Test current preferences
polydev preferences test

# Test specific configuration file
polydev preferences test --file new-config.json

# Dry run with sample prompts
polydev preferences test --dry-run --samples
```

## Migration Guide

### From Previous Versions

```bash
# Migrate preferences from v1.x to v2.x
polydev preferences migrate --from v1.5 --to v2.0

# Backup before migration
polydev preferences backup --version v1.5
```

### Environment to Dashboard Migration

Convert environment variables to dashboard settings:

```bash
# Scan environment and suggest dashboard settings
polydev preferences scan-env

# Auto-migrate environment to dashboard
polydev preferences migrate-env --auto-apply
```

## Troubleshooting Preferences

### Common Issues

**Preferences not taking effect:**
```bash
# Clear preference cache
polydev preferences clear-cache

# Restart MCP server
polydev mcp restart

# Verify current settings
polydev preferences show --verbose
```

**Model not found errors:**
```bash
# Check available models
polydev models list

# Validate model IDs
polydev preferences validate --models
```

**Context budget exceeded:**
```bash
# Analyze current context usage
polydev context analyze

# Optimize context settings
polydev context optimize --budget 6000
```

### Debug Mode

Enable detailed preference debugging:

```bash
# Enable preference debugging
POLYDEV_PREFERENCES_DEBUG=1 npm run dev

# Check preference resolution order
POLYDEV_PREFERENCES_VERBOSE=1 polydev preferences show
```

## Next Steps

Once preferences are configured:

1. **[Authentication](authentication.md)** - Set up user authentication
2. **[Provider Setup](../providers/)** - Configure AI providers
3. **[Troubleshooting](troubleshooting.md)** - Resolve common issues
4. **[Project Memory](../features/project-memory.md)** - Optimize context selection

---

**Questions about preferences?** Check our [troubleshooting guide](troubleshooting.md) or join our [Discord](https://discord.gg/polydev).
