# **Environment Configuration**

Configure Polydev for development and production environments.

## **Quick Setup**

### **Development**
```bash
# .env.local
NODE_ENV=development
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### **Production**
```bash
# .env.production
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://polydev.ai
```

## **Required Variables**

### **Site Configuration**
```bash
# Site URL (required for auth)
NEXT_PUBLIC_SITE_URL=https://your-domain.com
NODE_ENV=development  # or 'production'
```

## **Optional Services**

### **Analytics**
```bash
# PostHog (optional)
NEXT_PUBLIC_POSTHOG_KEY=phc_your_key
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

### **AI Provider Keys**
Configure at https://polydev.ai/dashboard → Settings → API Keys instead of environment variables.

## **MCP Configuration**

### **API URL**
```bash
# MCP API endpoint
POLYDEV_API_URL=https://polydev.ai/api/perspectives  # Production
POLYDEV_API_URL=http://localhost:3000/api/perspectives  # Development
```

### **Debug Mode**
```bash
# Enable debug logging
POLYDEV_DEBUG=1
POLYDEV_CLI_DEBUG=1
```

## **Security**

### **JWT Secret**
```bash
# Auto-generated if not provided
NEXTAUTH_SECRET=your-secret-key
```

### **CORS Origins**
```bash
# Comma-separated allowed origins
CORS_ORIGINS=https://your-domain.com,https://app.your-domain.com
```

## **Performance**

### **Rate Limiting**
```bash
# Requests per minute by plan
RATE_LIMIT_RPM_FREE=100        # Free plan
RATE_LIMIT_RPM_PRO=1000        # Pro plan
```

### **Timeouts**
```bash
# API timeouts
API_TIMEOUT_MS=30000           # 30 seconds
CLI_TIMEOUT_MS=30000           # CLI command timeout
```

## **Deployment Examples**

### **Vercel**
```bash
# Set via Vercel dashboard or CLI
vercel env add NEXT_PUBLIC_SITE_URL production
vercel env add NEXTAUTH_SECRET production
```

### **Docker**
```yaml
# docker-compose.yml
services:
  polydev:
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
    env_file:
      - .env.production
```

## **Validation**

Polydev validates required variables on startup:

```bash
# Test configuration
npm run env:check

# Test connections
npm run test:connections
```

## **Troubleshooting**

### **Missing Variables Error**
Check your `.env.local` file exists and contains required variables.

### **API Connection Issues**
Verify `POLYDEV_API_URL` points to correct endpoint.

### **CLI Not Found**
Enable debug mode: `POLYDEV_CLI_DEBUG=1`

## **Security Best Practices**

- Never commit `.env.local` or `.env.production` to git
- Use different keys for development and production
- Store sensitive keys in environment variables only
- Configure API keys at https://polydev.ai/dashboard

## **Migration**

### **From v1.x**
```bash
# Update variable names
SUPABASE_URL → NEXT_PUBLIC_SITE_URL
POLYDEV_TOKEN → Configure at dashboard
```

---

**Next Steps:**
- **[User Preferences](preferences.md)** - Configure user settings
- **[Authentication](authentication.md)** - Set up auth
- **[Troubleshooting](troubleshooting.md)** - Common issues