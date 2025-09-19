# **API Reference**

Complete reference for Polydev's APIs and integration interfaces.

## **Base URL**

```
https://api.polydev.ai
```

## **Authentication**

All endpoints require API key authentication:

```bash
curl -H "Authorization: Bearer poly_your_api_key" \
     https://api.polydev.ai/v1/perspectives
```

Get your API key → https://polydev.ai/dashboard → Settings → API Keys

## **Core APIs**

### **🧠 [Perspectives API](perspectives/)**

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
    project_memory: "smart"
  })
});
```

### **💬 Chat API**

OpenAI-compatible chat completions with intelligent routing.

**Endpoint:** `POST /v1/chat/completions`

### **🤖 Models API**

List available models and capabilities.

**Endpoint:** `GET /v1/models`

## **Rate Limits**

| Plan | Requests/Month | Features |
|------|---------------|----------|
| **Free** | 100 | All features |
| **Pro** | Unlimited | Priority support |

## **Error Handling**

### **Status Codes**
- `200` - Success
- `401` - Invalid API key
- `429` - Rate limited
- `500` - Server error

### **Error Format**
```json
{
  "error": {
    "type": "rate_limit_error",
    "message": "Rate limit exceeded",
    "code": "RATE_LIMIT_EXCEEDED"
  }
}
```

## **SDKs**

### **JavaScript/TypeScript**
```bash
npm install @polydev/node
```

### **Python**
```bash
pip install polydev
```

## **Model Context Protocol**

Polydev implements MCP for seamless AI agent integration:

```json
{
  "name": "get_perspectives",
  "arguments": {
    "prompt": "Review this code",
    "project_memory": "smart"
  }
}
```

**[→ Complete MCP Documentation](../mcp/)**

## **Support**

- **[Discord Community](https://discord.gg/polydev)** - Community support
- **[GitHub Issues](https://github.com/polydev-ai/polydev/issues)** - Bug reports
- **[Email Support](mailto:support@polydev.ai)** - Direct support

---

**Ready to start?** Check the **[Perspectives API](perspectives/)** documentation or try our **[Quick Start Guide](../intro/quick-start.md)**.