# **Authentication**

Polydev authentication and user management.

## **User Authentication**

### **Dashboard Login**

Sign in at https://polydev.ai/dashboard with:
- **Google** - OAuth with Google account
- **GitHub** - OAuth with GitHub account

### **API Authentication**

All API requests require API key authentication:

```bash
curl -H "Authorization: Bearer poly_your_api_key" \
     https://api.polydev.ai/v1/perspectives
```

## **API Keys**

### **Getting Your API Key**

1. **Sign in** → https://polydev.ai/dashboard
2. **Go to Settings** → API Keys
3. **Generate new key** → Copy and save securely

### **API Key Format**

```
poly_1234567890abcdef1234567890abcdef
```

- Prefix: `poly_`
- Length: 36 characters total
- Scope: Full access to your account

### **Using API Keys**

#### **Headers**
```bash
# Authorization header (recommended)
Authorization: Bearer poly_your_api_key
```

#### **Environment Variable**
```bash
# Store in environment
export POLYDEV_API_KEY="poly_your_api_key"
```

#### **SDK Configuration**
```javascript
const client = new PolydevClient({
  apiKey: 'poly_your_api_key'
});
```

## **MCP Authentication**

### **Token-Based Auth**

For MCP server integration, configure your user token:

```bash
# Environment variable
POLYDEV_USER_TOKEN=poly_your_api_key

# Or pass in MCP calls
{
  "user_token": "poly_your_api_key"
}
```

### **Automatic Detection**

MCP server automatically detects CLI tools and uses them without authentication when available.

## **Security**

### **Key Management**

**✅ Best Practices:**
- Store keys in environment variables
- Use different keys for development/production
- Rotate keys regularly
- Never commit keys to code repositories

**❌ Avoid:**
- Hardcoding keys in source code
- Sharing keys in chat/email
- Using production keys in development

### **Permissions**

API keys have full account access including:
- Generate perspectives
- Access project memory
- Use CLI providers
- Manage preferences

### **Rate Limits**

Keys are rate limited by plan:
- **Free**: 100 requests/month
- **Pro**: Unlimited requests

## **Token Expiration**

- **API Keys**: Never expire (until revoked)
- **Session Tokens**: 30 days
- **JWT Tokens**: 24 hours

## **Revocation**

### **Revoke API Key**

1. **Go to** → https://polydev.ai/dashboard → Settings → API Keys
2. **Click "Revoke"** next to the key
3. **Confirm deletion**

Revoked keys stop working immediately.

### **Emergency Revocation**

Contact support for immediate key revocation:
- **Email**: support@polydev.ai
- **Discord**: #support channel

## **Troubleshooting**

### **Invalid API Key**

```json
{
  "error": {
    "type": "authentication_error",
    "message": "Invalid API key",
    "code": "INVALID_API_KEY"
  }
}
```

**Solutions:**
- Check key is correct and complete
- Verify key hasn't been revoked
- Ensure proper `Bearer` prefix in header

### **Rate Limited**

```json
{
  "error": {
    "type": "rate_limit_error",
    "message": "Rate limit exceeded",
    "retry_after": 3600
  }
}
```

**Solutions:**
- Wait for rate limit reset
- Upgrade to Pro plan for unlimited usage
- Check usage at dashboard

### **CLI Authentication Issues**

**MCP tools not working:**
- Ensure CLI tools are installed and accessible
- Check `POLYDEV_CLI_DEBUG=1` for debug output
- Verify tools are in system PATH

## **Multi-User Setup**

### **Team Accounts**

Each team member needs their own:
- Dashboard account (Google/GitHub)
- Personal API key
- Individual rate limits and usage tracking

### **Shared Resources**

Teams can share:
- Project configurations
- Provider settings (configured per user)
- CLI tool installations

## **Development vs Production**

### **Development Keys**

Use separate API keys for development:
```bash
# .env.local
POLYDEV_API_KEY=poly_dev_key_here
```

### **Production Keys**

Use dedicated production keys:
```bash
# .env.production
POLYDEV_API_KEY=poly_prod_key_here
```

## **Compliance**

### **Data Protection**

- API keys are encrypted in transit and at rest
- No sensitive data stored in logs
- GDPR-compliant data handling
- User data deletion available on request

### **Enterprise Security**

For enterprise deployments:
- Single Sign-On (SSO) integration available
- Custom authentication providers
- Enhanced audit logging
- Dedicated support

---

**Next Steps:**
- **[Environment Setup](environment.md)** - Configure your environment
- **[API Reference](../api-reference/)** - Start using APIs
- **[Troubleshooting](troubleshooting.md)** - Common issues