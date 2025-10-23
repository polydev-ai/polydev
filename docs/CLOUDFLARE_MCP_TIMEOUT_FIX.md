# Fixing Cloudflare 524 Timeout for MCP Server

## Problem
The Polydev MCP server returns AI perspectives from multiple models (GPT-5, Gemini, Grok), which takes ~2 minutes to complete. Cloudflare's free/pro plans timeout after ~100 seconds, causing 524 errors.

## Solution: DNS-Only Subdomain

Create a subdomain that bypasses Cloudflare's proxy and routes directly to Vercel.

---

## Step-by-Step Setup (2 minutes)

### Step 1: Add DNS Record in Cloudflare

1. Log into Cloudflare dashboard
2. Select your domain: `polydev.ai`
3. Go to **DNS** → **Records**
4. Click **Add record**
5. Configure the record:
   ```
   Type:         CNAME
   Name:         mcp
   Target:       cname.vercel-dns.com
   Proxy status: DNS only (gray cloud ☁️) - IMPORTANT!
   TTL:          Auto
   ```
6. Click **Save**

**Critical:** Make sure the cloud icon is **GRAY**, not orange. Gray = DNS only (no Cloudflare proxy).

### Step 2: Add Domain to Vercel

1. Go to your Vercel project: https://vercel.com/your-project
2. Go to **Settings** → **Domains**
3. Add domain: `mcp.polydev.ai`
4. Vercel will automatically:
   - Verify the domain
   - Issue SSL certificate (takes 1-5 minutes)
   - Configure routing

### Step 3: Configure Vercel Function Timeout

Create or update `vercel.json` in your project root:

```json
{
  "functions": {
    "api/mcp/**/*.ts": {
      "maxDuration": 300
    }
  }
}
```

Or add to your API route file:

```typescript
// src/app/api/mcp/route.ts (or similar)
export const maxDuration = 300; // 5 minutes (requires Vercel Pro)

export async function POST(req: Request) {
  // Your MCP handler
}
```

### Step 4: Update MCP Client Configuration

Update your MCP configuration file (location varies by setup):

**For Claude Code / Desktop:**
Usually in `~/.config/claude-code/mcp.json` or similar.

**Before:**
```json
{
  "mcpServers": {
    "polydev": {
      "url": "https://www.polydev.ai/api/mcp"
    }
  }
}
```

**After:**
```json
{
  "mcpServers": {
    "polydev": {
      "url": "https://mcp.polydev.ai/api/mcp"
    }
  }
}
```

**For Browser Extension / Frontend:**
Update the environment variable or config:

```bash
# .env.local or similar
NEXT_PUBLIC_MCP_URL=https://mcp.polydev.ai/api/mcp
```

### Step 5: Test the Configuration

After DNS propagation (1-5 minutes), test:

```bash
# Test direct access (should work after DNS propagates)
curl -v https://mcp.polydev.ai/api/mcp/health

# Test with actual MCP request
curl -X POST https://mcp.polydev.ai/api/mcp/perspectives \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -d '{"prompt":"Test query"}' \
  --max-time 300
```

---

## How It Works

### Before (with timeout):
```
Client → Cloudflare Proxy (times out at 100s) → Vercel (300s limit)
         ❌ Request fails
```

### After (no timeout):
```
Client → Cloudflare DNS → Vercel directly (300s limit)
         ✅ Request succeeds
```

**Traffic Flow:**
- `www.polydev.ai` → Still proxied through Cloudflare (protected)
- `mcp.polydev.ai` → Direct to Vercel (no timeout limit)

---

## Benefits

✅ **Free** - No additional cost
✅ **Fast** - 2-minute setup
✅ **Secure** - SSL certificate auto-configured by Vercel
✅ **Maintains protection** - Main site still behind Cloudflare
✅ **No code changes** - Just update URL in config

---

## Troubleshooting

### DNS not resolving
Wait 5-10 minutes for DNS propagation. Check with:
```bash
dig mcp.polydev.ai
nslookup mcp.polydev.ai
```

Should show Vercel's IP addresses.

### SSL certificate error
Vercel takes 1-5 minutes to issue SSL certificate. Wait and retry.

### Still getting 524 errors
1. Verify cloud icon is **GRAY** in Cloudflare DNS (not orange)
2. Check Vercel domain is properly configured
3. Verify `maxDuration: 300` is set in your API route

### Vercel returns 504 timeout
If even the direct connection times out:
1. Check Vercel Pro plan is active (300s limit requires Pro)
2. Verify `maxDuration: 300` is in code
3. Consider optimizing AI model calls to complete faster

---

## Alternative Solutions

If you cannot use a subdomain:

### Option A: Upgrade Cloudflare (Expensive)
- **Business plan**: $200/month + support ticket for timeout increase
- **Enterprise plan**: $5000+/month with configurable timeouts

### Option B: Implement Async Pattern (Complex)
Convert to job queue with polling:
1. POST returns job ID immediately (< 10s)
2. Client polls status endpoint
3. Results returned when ready

See `docs/ASYNC_MCP_PATTERN.md` for implementation guide.

### Option C: Optimize Response Time (Limited)
- Call models in parallel (already doing this)
- Set per-model timeout of 30s
- Return partial results if some models timeout
- Use faster models or reduce `max_tokens`

---

## Verification Checklist

After setup, verify:

- [ ] Cloudflare DNS record created with GRAY cloud
- [ ] Vercel domain added and SSL certificate issued
- [ ] `maxDuration: 300` configured in code
- [ ] MCP client config updated to use new URL
- [ ] Test request completes successfully

---

## Rollback Plan

If you need to revert:

1. Update MCP client config back to `www.polydev.ai`
2. Delete `mcp.polydev.ai` from Vercel domains
3. Delete DNS record from Cloudflare (optional)

No downtime - old configuration continues working.

---

## Questions?

Common questions:

**Q: Will this affect my main site?**
A: No, only `/api/mcp/*` routes will use the new subdomain. Everything else stays the same.

**Q: Do I lose Cloudflare protection?**
A: Only for MCP endpoints. Main site (`www.polydev.ai`) remains fully protected.

**Q: What if I add more long-running endpoints?**
A: Route them through `mcp.polydev.ai` or create additional subdomains.

**Q: Can I use a different subdomain name?**
A: Yes! Use `api.polydev.ai`, `direct.polydev.ai`, or any name you prefer. Just update all references.

---

## Additional Resources

- [Vercel Pro Plan Limits](https://vercel.com/docs/functions/serverless-functions/runtimes#max-duration)
- [Cloudflare Timeout Limits](https://developers.cloudflare.com/support/troubleshooting/cloudflare-errors/troubleshooting-cloudflare-524-errors/)
- [DNS Only Mode Documentation](https://developers.cloudflare.com/dns/manage-dns-records/reference/proxied-dns-records/)

---

**Last Updated:** 2025-10-12
**Status:** Ready for implementation
**Estimated Setup Time:** 2 minutes
**Estimated Downtime:** None (zero-downtime migration)
