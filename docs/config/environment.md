# Environment Configuration

Complete guide to configuring your Polydev environment for development and production.

## Environment Files

Polydev uses environment files to manage configuration. Create the appropriate file for your environment:

### Development
```bash
# .env.local (for local development)
cp .env.example .env.local
```

### Production
```bash
# .env.production (for production builds)
cp .env.example .env.production
```

## Required Variables

### Core Configuration

```bash
# Supabase Database (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

> **🔧 How to get Supabase credentials:**
> 1. Create a project at [supabase.com](https://supabase.com)
> 2. Go to Settings → API
> 3. Copy the Project URL and anon key
> 4. Copy the service_role key (keep this secret!)

### Site Configuration

```bash
# Site URL (Required for auth callbacks)
NEXT_PUBLIC_SITE_URL=https://your-domain.com  # Production
NEXT_PUBLIC_SITE_URL=http://localhost:3000    # Development

# App Environment
NODE_ENV=development  # or 'production'
```

## Optional Services

### Analytics & Monitoring

```bash
# PostHog Analytics (Optional)
NEXT_PUBLIC_POSTHOG_KEY=phc_your_posthog_key
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# BetterStack Monitoring (Optional)
BETTERSTACK_LOGS_TOKEN=your_betterstack_token

# Upstash Redis Caching (Optional)
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token
```

### AI Provider Keys (For Managed Mode)

```bash
# OpenAI
OPENAI_API_KEY=sk-your-openai-key

# Anthropic
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key

# Google AI
GOOGLE_API_KEY=your-google-ai-key

# OpenRouter (for fallback credits system)
OPENROUTER_API_KEY=sk-or-your-openrouter-key
```

## CLI Provider Configuration

### Custom CLI Paths

If your CLI tools are installed in non-standard locations:

```bash
# Custom CLI paths (Optional)
CLAUDE_CODE_PATH=/custom/path/to/claude
CODEX_CLI_PATH=/custom/path/to/codex
GEMINI_CLI_PATH=/custom/path/to/gemini
```

### CLI Debug Mode

```bash
# Enable CLI debug logging
POLYDEV_CLI_DEBUG=1           # Enable debug output
POLYDEV_CLI_TIMEOUT=30000     # CLI command timeout (ms)
```

## MCP Configuration

### MCP Server Settings

```bash
# MCP API Configuration
POLYDEV_API_URL=https://polydev.ai/api/perspectives  # Production
POLYDEV_API_URL=http://localhost:3000/api/perspectives  # Development

# MCP Server Debug
POLYDEV_DEBUG=1               # Enable MCP debug logging
```

### User Token Configuration

```bash
# For MCP token-based authentication
POLYDEV_USER_TOKEN=poly_your_token_here
```

## Advanced Configuration

### Security Settings

```bash
# JWT Secret (auto-generated if not provided)
NEXTAUTH_SECRET=your-secret-key

# CORS Origins (comma-separated)
CORS_ORIGINS=https://your-domain.com,https://app.your-domain.com
```

### Performance Tuning

```bash
# Connection Pool Settings
API_POOL_MAX_SIZE=10          # Max connections per provider
API_TIMEOUT_MS=30000          # API request timeout

# Cache Settings
RESPONSE_CACHE_TTL=900        # Response cache TTL (seconds)
PROJECT_MEMORY_CACHE_SIZE=100 # Max cached projects
```

### Rate Limiting

```bash
# Rate limiting (requests per minute)
RATE_LIMIT_RPM_FREE=30        # Free tier
RATE_LIMIT_RPM_PRO=100        # Pro tier
RATE_LIMIT_RPM_ENTERPRISE=500 # Enterprise tier
```

## Environment-Specific Examples

### Development Environment

```bash
# .env.local
NODE_ENV=development
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://dev-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-dev-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-dev-service-key

# Analytics (Optional for dev)
# NEXT_PUBLIC_POSTHOG_KEY=phc_dev_key

# Debug modes
POLYDEV_CLI_DEBUG=1
POLYDEV_DEBUG=1

# Local AI provider keys
OPENAI_API_KEY=sk-your-dev-openai-key
ANTHROPIC_API_KEY=sk-ant-your-dev-anthropic-key
```

### Production Environment

```bash
# .env.production
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://polydev.ai

# Supabase Production
NEXT_PUBLIC_SUPABASE_URL=https://prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-prod-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-prod-service-key

# Analytics & Monitoring
NEXT_PUBLIC_POSTHOG_KEY=phc_prod_key
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
BETTERSTACK_LOGS_TOKEN=your_prod_betterstack_token

# Caching
UPSTASH_REDIS_REST_URL=https://prod-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_prod_redis_token

# Production AI keys
OPENAI_API_KEY=sk-your-prod-openai-key
ANTHROPIC_API_KEY=sk-ant-your-prod-anthropic-key
GOOGLE_API_KEY=your-prod-google-key
OPENROUTER_API_KEY=sk-or-your-prod-openrouter-key

# Security
NEXTAUTH_SECRET=your-secure-production-secret
CORS_ORIGINS=https://polydev.ai,https://app.polydev.ai

# Performance
API_POOL_MAX_SIZE=20
RATE_LIMIT_RPM_ENTERPRISE=1000
```

## Environment Variable Loading

Polydev loads environment variables in this order:

1. **System environment variables**
2. **`.env.local`** (local development, ignored by git)
3. **`.env.production`** (production builds)
4. **`.env`** (default values, committed to git)

## Validation

Polydev automatically validates required environment variables on startup:

```typescript
// Environment validation schema
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  OPENAI_API_KEY: z.string().startsWith('sk-').optional(),
  ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-').optional()
});
```

## Docker Configuration

### Using Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  polydev:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
    env_file:
      - .env.production
    volumes:
      - ~/.polydev:/app/.polydev  # CLI cache directory
```

### Environment File for Docker

```bash
# .env.docker
# All environment variables for Docker deployment
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
# ... other variables
```

## Vercel Deployment

### Vercel Environment Variables

Configure in your Vercel dashboard or using the CLI:

```bash
# Set production environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add OPENAI_API_KEY production

# Set for all environments
vercel env add NEXT_PUBLIC_POSTHOG_KEY production preview development
```

### Vercel CLI Configuration

```bash
# .vercel/project.json
{
  "projectId": "your-project-id",
  "orgId": "your-org-id",
  "settings": {
    "buildCommand": "npm run build",
    "devCommand": "npm run dev",
    "installCommand": "npm install"
  }
}
```

## Security Best Practices

### 🔒 Secrets Management

**✅ DO:**
- Use different API keys for development and production
- Store sensitive keys in environment variables, never in code
- Use services like Vercel's encrypted environment variables
- Regularly rotate API keys

**❌ DON'T:**
- Commit `.env.local` or `.env.production` files to git
- Share API keys in chat, email, or documentation
- Use production keys in development environments
- Store keys in frontend code (use `NEXT_PUBLIC_` only for non-sensitive data)

### 🔐 Environment Separation

```bash
# Development - Limited access
OPENAI_API_KEY=sk-dev-limited-key

# Staging - Production-like with test data
OPENAI_API_KEY=sk-staging-key

# Production - Full access, monitored
OPENAI_API_KEY=sk-prod-monitored-key
```

## Troubleshooting

### Common Environment Issues

**"Missing required environment variables"**
```bash
# Check what's loaded
npm run env:check

# Verify file exists and has correct format
cat .env.local
```

**"Invalid Supabase credentials"**
```bash
# Test connection
curl -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
     "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/"
```

**"CLI not found"**
```bash
# Check custom paths
echo $CLAUDE_CODE_PATH
which claude  # Should match the path
```

### Environment Debug Commands

```bash
# Show loaded environment (safe values only)
npm run debug:env

# Test API connections
npm run test:connections

# Validate MCP configuration
npm run test:mcp
```

## Migration Guide

### From v1.x to v2.x

```bash
# Old variables (deprecated)
SUPABASE_URL → NEXT_PUBLIC_SUPABASE_URL
SUPABASE_ANON_KEY → NEXT_PUBLIC_SUPABASE_ANON_KEY
POLYDEV_TOKEN → POLYDEV_USER_TOKEN

# New required variables
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

### Environment Migration Script

```bash
#!/bin/bash
# migrate-env.sh

# Backup existing file
cp .env.local .env.local.backup

# Update variable names
sed -i.bak 's/SUPABASE_URL=/NEXT_PUBLIC_SUPABASE_URL=/' .env.local
sed -i.bak 's/SUPABASE_ANON_KEY=/NEXT_PUBLIC_SUPABASE_ANON_KEY=/' .env.local
sed -i.bak 's/POLYDEV_TOKEN=/POLYDEV_USER_TOKEN=/' .env.local

echo "Environment migrated! Please review .env.local"
```

## Next Steps

Once your environment is configured:

1. **[User Preferences](preferences.md)** - Configure user-specific settings
2. **[Authentication](authentication.md)** - Set up user authentication  
3. **[Provider Setup](../providers/)** - Configure AI providers
4. **[Troubleshooting](troubleshooting.md)** - Resolve common issues

---

**Need help with environment setup?** Check our [troubleshooting guide](troubleshooting.md) or join our [Discord](https://discord.gg/polydev).