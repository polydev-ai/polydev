# Troubleshooting

Common issues and solutions for configuring and running Polydev.

## Quick Diagnostics

### Health Check Commands

Run these commands to quickly identify issues:

```bash
# Check overall system health
npm run health:check

# Test environment configuration
npm run test:config

# Verify MCP server connectivity
npm run test:mcp

# Test CLI tool detection
npm run test:cli
```

### Environment Validation

```bash
# Show current environment configuration
npm run env:show

# Validate required environment variables
npm run env:validate

# Check for common configuration issues
npm run env:doctor
```

## Common Issues

### 1. MCP Server Not Starting

**Symptom:** MCP server fails to start or client can't connect

**Possible Causes:**
- Missing environment variables
- Port conflicts
- Permission issues
- Node.js version compatibility

**Solutions:**

```bash
# Check Node.js version (requires 18+)
node --version

# Verify environment variables
cat .env.local | grep -E "(SUPABASE|POLYDEV)"

# Check for port conflicts
lsof -i :3000
netstat -tulpn | grep :3000

# Test MCP server manually
node mcp/server.js
```

**Fix Permission Issues:**
```bash
# macOS/Linux
chmod +x mcp/server.js
chown $USER:$USER mcp/server.js

# Windows
icacls mcp\server.js /grant %USERNAME%:F
```

### 2. CLI Tools Not Detected

**Symptom:** CLI providers showing as unavailable

**Debug Steps:**

```bash
# Check if CLIs are in PATH
which claude
which codex
which gemini

# Test CLI authentication
claude auth status
codex --help
gcloud auth list

# Enable CLI debug mode
POLYDEV_CLI_DEBUG=1 npm run test:cli
```

**Common Solutions:**

**Claude Code:**
```bash
# Install or reinstall
npm install -g @anthropic-ai/claude-code

# Re-authenticate
claude auth login

# Check installation path
which claude
```

**Codex CLI:**
```bash
# Verify ChatGPT Plus subscription
# Download from https://openai.com/chatgpt/desktop

# Test authentication
codex auth

# Check custom path
echo $CODEX_CLI_PATH
```

**Gemini CLI:**
```bash
# Install Google Cloud SDK
brew install google-cloud-sdk  # macOS
# or follow: https://cloud.google.com/sdk/docs/install

# Authenticate
gcloud auth login
gcloud auth application-default login

# Enable Gemini API
gcloud services enable aiplatform.googleapis.com
```

### 3. Environment Variables Not Loading

**Symptom:** Configuration not being applied

**Check Loading Order:**
Polydev loads environment variables in this order:
1. System environment variables
2. `.env.local` (highest priority)
3. `.env.production` (production builds)
4. `.env` (default values)

**Solutions:**

```bash
# Verify file exists and has correct format
ls -la .env*
cat .env.local

# Check for syntax errors
npm run validate:env

# Test environment loading
node -e "require('dotenv').config({path: '.env.local'}); console.log(process.env.NEXT_PUBLIC_SUPABASE_URL);"
```

**Common Env File Issues:**
```bash
# ❌ WRONG: Extra spaces
NEXT_PUBLIC_SUPABASE_URL = https://project.supabase.co

# ✅ CORRECT: No spaces around =
NEXT_PUBLIC_SUPABASE_URL=https://project.supabase.co

# ❌ WRONG: Missing quotes for values with spaces
OPENAI_API_KEY=sk-proj abc def

# ✅ CORRECT: Quoted values
OPENAI_API_KEY="sk-proj abc def"
```

### 4. Supabase Connection Issues

**Symptoms:**
- "Invalid API key" errors
- Database connection timeouts
- Authentication failures

**Diagnostic Commands:**
```bash
# Test Supabase connection
curl -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
     "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/"

# Test authentication
curl -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
     "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/settings"

# Verify service role key
curl -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
     "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/users"
```

**Solutions:**

**Invalid API Key:**
1. Verify keys in Supabase Dashboard → Settings → API
2. Check for extra spaces or newlines
3. Ensure using correct project keys

**Connection Timeout:**
```bash
# Check DNS resolution
nslookup your-project.supabase.co

# Test network connectivity
ping your-project.supabase.co

# Check firewall/proxy settings
curl -v https://your-project.supabase.co
```

### 5. API Provider Authentication Issues

**Symptom:** API calls failing with authentication errors

**OpenAI Issues:**
```bash
# Test API key
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/models

# Check quota and billing
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/usage
```

**Anthropic Issues:**
```bash
# Test API key
curl -H "x-api-key: $ANTHROPIC_API_KEY" \
     -H "anthropic-version: 2023-06-01" \
     https://api.anthropic.com/v1/messages \
     -d '{"model":"claude-3-haiku-20240307","max_tokens":10,"messages":[{"role":"user","content":"hi"}]}'
```

**Google AI Issues:**
```bash
# Test API key
curl -H "x-goog-api-key: $GOOGLE_API_KEY" \
     "https://generativelanguage.googleapis.com/v1beta/models"
```

### 6. Rate Limiting and Quota Issues

**Symptoms:**
- "Rate limit exceeded" errors
- Unexpected API failures
- Slow response times

**Check Current Limits:**
```bash
# Show current rate limits
npm run debug:rate-limits

# Check API usage
npm run debug:usage

# Monitor quota consumption
npm run monitor:quotas
```

**Solutions:**

**Adjust Rate Limits:**
```bash
# In .env.local
RATE_LIMIT_RPM_OPENAI=50    # Reduce from default
RATE_LIMIT_RPM_ANTHROPIC=30
REQUEST_TIMEOUT_MS=60000    # Increase timeout
```

**Implement Backoff:**
```typescript
// Automatic retry with exponential backoff
const retryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  exponentialBase: 2
};
```

### 7. Memory and Performance Issues

**Symptoms:**
- High memory usage
- Slow response times
- Process crashes

**Diagnostic Commands:**
```bash
# Check memory usage
ps aux | grep node
top -p $(pgrep -f "node.*polydev")

# Monitor performance
npm run monitor:performance

# Check for memory leaks
node --inspect mcp/server.js
```

**Solutions:**

**Reduce Memory Usage:**
```bash
# Limit context budget
POLYDEV_CONTEXT_BUDGET=4000    # Reduce from default 8000

# Reduce cache size
RESPONSE_CACHE_TTL=300         # 5 minutes instead of 15
PROJECT_MEMORY_CACHE_SIZE=50   # Reduce from default 100

# Limit concurrent requests
API_POOL_MAX_SIZE=5            # Reduce from default 10
```

**Node.js Memory Limits:**
```bash
# Increase Node.js heap size
export NODE_OPTIONS="--max-old-space-size=4096"
npm run dev

# Or in package.json
{
  "scripts": {
    "dev": "NODE_OPTIONS='--max-old-space-size=4096' next dev"
  }
}
```

## Platform-Specific Issues

### macOS Issues

**CLI Detection Problems:**
```bash
# Check Gatekeeper restrictions
xattr -rd com.apple.quarantine /usr/local/bin/claude

# Verify code signing
codesign -dv /usr/local/bin/claude

# Check security preferences
System Preferences → Security & Privacy → Privacy → Full Disk Access
```

**Permission Issues:**
```bash
# Fix npm permissions
sudo chown -R $USER /usr/local/lib/node_modules

# Fix CLI permissions
chmod +x ~/.local/bin/claude
```

### Windows Issues

**Path Issues:**
```powershell
# Check PATH environment variable
echo $env:PATH

# Add to PATH permanently
[Environment]::SetEnvironmentVariable("PATH", $env:PATH + ";C:\path\to\cli", "User")

# Use PowerShell execution policy
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**WSL2 Issues:**
```bash
# Windows paths in WSL2
export PATH=$PATH:/mnt/c/Users/$USER/AppData/Local/Programs/claude/bin
```

### Linux Issues

**Package Manager Conflicts:**
```bash
# Remove conflicting packages
sudo apt remove nodejs npm
sudo apt autoremove

# Install Node.js via NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**SystemD Service Issues:**
```bash
# Check service status
systemctl status polydev-mcp

# View service logs
journalctl -u polydev-mcp -f

# Restart service
sudo systemctl restart polydev-mcp
```

## Docker and Containerization Issues

### Docker Build Failures

**Common Issues:**
```dockerfile
# ❌ WRONG: Missing dependencies
FROM node:18-alpine
COPY package.json ./
RUN npm install

# ✅ CORRECT: Include build dependencies
FROM node:18-alpine
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci --only=production
```

**Multi-stage Build Issues:**
```dockerfile
# Build stage
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine as runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["npm", "start"]
```

### Container Runtime Issues

**Permission Problems:**
```bash
# Check container permissions
docker run -it polydev:latest ls -la

# Fix user permissions
USER node
WORKDIR /home/node/app
```

**Network Connectivity:**
```bash
# Test container networking
docker run --rm polydev:latest curl -v https://api.openai.com/v1/models

# Check DNS resolution
docker run --rm polydev:latest nslookup api.openai.com
```

## Development Environment Issues

### Hot Reload Not Working

**Next.js Hot Reload Issues:**
```bash
# Check file watching limits (Linux)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Restart Next.js dev server
npm run dev -- --turbo

# Clear Next.js cache
rm -rf .next
npm run dev
```

### TypeScript Compilation Issues

```bash
# Check TypeScript version compatibility
npm list typescript

# Clear TypeScript cache
rm -rf node_modules/.cache/typescript
npx tsc --build --clean

# Check for type conflicts
npm run type-check
```

### Database Migration Issues

```bash
# Check migration status
npm run db:status

# Reset database (development only)
npm run db:reset

# Apply migrations manually
npm run db:migrate
```

## Debugging Tools

### Enable Debug Modes

```bash
# Comprehensive debugging
export DEBUG=*
export POLYDEV_CLI_DEBUG=1
export POLYDEV_DEBUG=1
export NEXT_DEBUG=1

npm run dev
```

### Logging Configuration

```bash
# .env.local
LOG_LEVEL=debug              # error, warn, info, debug
LOG_FORMAT=json              # json, pretty
LOG_TO_FILE=true
LOG_FILE_PATH=./logs/polydev.log
```

### Performance Monitoring

```bash
# Enable performance monitoring
npm run monitor:start

# Check performance metrics
npm run monitor:stats

# Generate performance report
npm run monitor:report
```

### Health Endpoints

Test system health via HTTP endpoints:

```bash
# Overall system health
curl http://localhost:3000/api/health

# Database connectivity
curl http://localhost:3000/api/health/db

# External service connectivity
curl http://localhost:3000/api/health/services

# CLI tool status
curl http://localhost:3000/api/health/cli
```

## Getting Help

### Information to Gather

When seeking help, please provide:

```bash
# System information
npm run info:system

# Environment information (safe)
npm run info:env

# Error logs
npm run logs:export

# Configuration validation
npm run config:validate
```

### Safe Information Collection

```bash
#!/bin/bash
# collect-debug-info.sh

echo "=== System Information ==="
node --version
npm --version
uname -a

echo "=== Environment Validation ==="
npm run env:validate 2>&1

echo "=== Recent Logs (last 100 lines) ==="
tail -n 100 logs/polydev.log 2>/dev/null || echo "No log file found"

echo "=== CLI Detection ==="
npm run test:cli 2>&1

echo "=== Package Information ==="
npm list --depth=0 2>/dev/null
```

### Community Resources

- **GitHub Issues**: [https://github.com/polydev-ai/polydev/issues](https://github.com/polydev-ai/polydev/issues)
- **Discord Community**: [https://discord.gg/polydev](https://discord.gg/polydev)
- **Documentation**: [https://docs.polydev.ai](https://docs.polydev.ai)

### Professional Support

For enterprise customers:
- **Priority Support**: support@polydev.ai
- **Status Page**: [https://status.polydev.ai](https://status.polydev.ai)
- **SLA Documentation**: Available in enterprise dashboard

---

**Still having issues?** Join our [Discord](https://discord.gg/polydev) for community help or contact [support@polydev.ai](mailto:support@polydev.ai) for technical assistance.