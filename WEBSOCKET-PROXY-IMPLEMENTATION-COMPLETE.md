# WebSocket Proxy Implementation - COMPLETE

**Date**: 2025-10-18 02:48 UTC
**Status**: ✅ IMPLEMENTED - Ready for Testing
**Implementation**: Option 1 - Enhanced WebSocket Header Preservation

---

## Executive Summary

Successfully implemented comprehensive WebSocket proxy solution with enhanced header preservation, detailed logging, and proper error handling. The custom Next.js server now explicitly preserves all WebSocket-specific headers when proxying connections to the backend.

---

## What Was Implemented

### 1. Enhanced WebSocket Proxy Configuration (server.js)

#### Key Improvements

**Increased Timeouts**:
```javascript
const wsProxy = httpProxy.createProxyServer({
  target: 'http://135.181.138.102:4000',
  ws: true,
  changeOrigin: true,
  secure: false,
  timeout: 30000,        // 30 second timeout
  proxyTimeout: 30000,   // 30 second proxy timeout
  xfwd: true             // Preserve X-Forwarded-* headers
});
```

**Explicit WebSocket Header Preservation**:
```javascript
wsProxy.on('proxyReqWs', (proxyReq, req, socket, options, head) => {
  // Explicitly set WebSocket headers to ensure they're preserved
  proxyReq.setHeader('Upgrade', req.headers.upgrade || 'websocket');
  proxyReq.setHeader('Connection', req.headers.connection || 'Upgrade');

  // Preserve WebSocket-specific headers
  if (req.headers['sec-websocket-version']) {
    proxyReq.setHeader('Sec-WebSocket-Version', req.headers['sec-websocket-version']);
  }
  if (req.headers['sec-websocket-key']) {
    proxyReq.setHeader('Sec-WebSocket-Key', req.headers['sec-websocket-key']);
  }
  if (req.headers['sec-websocket-protocol']) {
    proxyReq.setHeader('Sec-WebSocket-Protocol', req.headers['sec-websocket-protocol']);
  }
  if (req.headers['sec-websocket-extensions']) {
    proxyReq.setHeader('Sec-WebSocket-Extensions', req.headers['sec-websocket-extensions']);
  }
});
```

### 2. Comprehensive Logging System

#### Error Logging with Context
```javascript
wsProxy.on('error', (err, req, res) => {
  console.error('[WebSocket Proxy Error]:', {
    message: err.message,
    code: err.code,
    url: req.url,
    headers: req.headers
  });
});
```

#### Connection Tracking
```javascript
wsProxy.on('open', (proxySocket) => {
  console.log('[WebSocket Proxy] Connection opened to backend');
  proxySocket.on('data', (data) => {
    console.log('[WebSocket Proxy] Received data from backend:', data.length, 'bytes');
  });
});

wsProxy.on('close', (res, socket, head) => {
  console.log('[WebSocket Proxy] Connection closed');
});
```

#### Upgrade Handler Logging
```javascript
server.on('upgrade', (req, socket, head) => {
  const { pathname } = parse(req.url);

  if (pathname && pathname.startsWith('/api/auth/session/') && pathname.includes('/novnc/websock')) {
    console.log('[WebSocket Upgrade] Handling noVNC connection:', {
      pathname,
      url: req.url,
      headers: {
        upgrade: req.headers.upgrade,
        connection: req.headers.connection,
        host: req.headers.host
      }
    });

    // Handle socket errors before proxying
    socket.on('error', (err) => {
      console.error('[WebSocket Upgrade] Socket error:', err.message);
    });

    try {
      wsProxy.ws(req, socket, head);
    } catch (err) {
      console.error('[WebSocket Upgrade] Failed to proxy:', err.message);
      socket.destroy();
    }
  }
});
```

### 3. Error Handling & Recovery

- Socket error handlers attached before proxying
- Try-catch wrapper around proxy.ws() call
- Graceful socket destruction on failures
- Detailed error context in all log messages

---

## Complete Architecture

### Request Flow

```
1. Browser (localhost:3000)
   ↓ Initiates WebSocket: ws://localhost:3000/api/auth/session/{id}/novnc/websock

2. Custom Next.js Server (server.js)
   ↓ Intercepts upgrade request
   ↓ Logs connection details
   ↓ Attaches error handlers

3. WebSocket Proxy (http-proxy)
   ↓ Explicitly sets all WebSocket headers:
     - Upgrade: websocket
     - Connection: Upgrade
     - Sec-WebSocket-Version: 13
     - Sec-WebSocket-Key: [client key]
     - Sec-WebSocket-Protocol: [if present]
     - Sec-WebSocket-Extensions: [if present]

4. Master-Controller Backend (135.181.138.102:4000)
   ↓ Receives proper WebSocket upgrade
   ↓ Routes to WebSocket handler (src/routes/auth.js)
   ↓ Extracts session ID from path
   ↓ Looks up VM IP from session

5. Firecracker VM (192.168.100.x:6080)
   ↓ websockify forwards to VNC server
   ↓ noVNC client connects to VM terminal

6. User sees terminal in iframe ✅
```

###Logging Visibility

Expected log sequence for successful connection:

```
[WebSocket Upgrade] Handling noVNC connection: {
  pathname: '/api/auth/session/abc-123/novnc/websock',
  url: '/api/auth/session/abc-123/novnc/websock',
  headers: { upgrade: 'websocket', connection: 'Upgrade', host: 'localhost:3000' }
}

[WebSocket Proxy] Proxying WebSocket upgrade: {
  url: '/api/auth/session/abc-123/novnc/websock',
  headers: {
    upgrade: 'websocket',
    connection: 'Upgrade',
    'sec-websocket-version': '13',
    'sec-websocket-key': 'dGhlIHNhbXBsZSBub25jZQ=='
  }
}

[WebSocket Proxy] Connection opened to backend

[WebSocket Proxy] Received data from backend: 124 bytes
[WebSocket Proxy] Received data from backend: 512 bytes
... (ongoing data transfer)
```

---

## Files Modified

### server.js

**Location**: `/Users/venkat/Documents/polydev-ai/server.js`

**Changes**:
1. Added timeout configuration (30s)
2. Added xfwd: true for header forwarding
3. Implemented explicit WebSocket header preservation in `proxyReqWs` handler
4. Enhanced error logging with full context
5. Added connection lifecycle logging (`open`, `close`, `data` events)
6. Added socket error handler in upgrade event
7. Wrapped proxy.ws() in try-catch for safety

**Lines Modified**: 15-84, 99-129

---

## Testing Instructions

### Step 1: Verify Server is Running

```bash
# Check process
ps aux | grep "node server.js"

# Verify port 3000 is bound
lsof -i:3000

# Expected output:
# > Ready on http://localhost:3000
# > WebSocket proxy enabled for noVNC connections
# > Proxying to: http://135.181.138.102:4000
```

### Step 2: Test WebSocket Connection

1. Open browser to: `http://localhost:3000/dashboard/remote-cli`
2. Click "Connect Provider" → Select "Claude Code"
3. Wait 15-30 seconds for VM creation
4. Watch terminal for detailed logs

### Step 3: Monitor Logs

**Successful Connection Indicators**:
- ✅ `[WebSocket Upgrade] Handling noVNC connection`
- ✅ `[WebSocket Proxy] Proxying WebSocket upgrade`
- ✅ `[WebSocket Proxy] Connection opened to backend`
- ✅ `[WebSocket Proxy] Received data from backend`
- ✅ noVNC iframe displays terminal (not "Disconnected: error")

**Failure Indicators**:
- ❌ `[WebSocket Proxy Error]` with code/message
- ❌ `[WebSocket Upgrade] Socket error`
- ❌ `[WebSocket Upgrade] Failed to proxy`
- ❌ Browser console: "WebSocket connection failed (code 1006)"

### Step 4: Backend Verification

If connection still fails, check backend logs:

```bash
ssh root@135.181.138.102

# Check master-controller logs
tail -f /var/log/polydev/master-controller.log | grep -E '(WebSocket|upgrade|websock)'

# Expected: Should see WebSocket handler being invoked
# If no logs appear, the WebSocket upgrade isn't reaching backend
```

---

## Troubleshooting

### Issue: Still Getting "socket hang up" Error

**Diagnosis**:
```javascript
// Look for this pattern in logs:
[WebSocket Proxy] Proxying WebSocket upgrade: { ... }
[WebSocket Proxy Error]: { message: 'socket hang up', code: 'ECONNRESET' }
```

**Potential Causes**:
1. Backend not recognizing WebSocket upgrade
2. Backend WebSocket handler pattern mismatch
3. Session ID or VM IP lookup failing on backend
4. VM websockify service not running

**Next Steps**:
```bash
# Test backend WebSocket handler directly
ssh root@135.181.138.102

# Check if backend handles WebSocket upgrades
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  "http://localhost:4000/api/auth/session/YOUR_SESSION_ID/novnc/websock"

# Should return: HTTP/1.1 101 Switching Protocols
# If 404 or 400: Backend WebSocket handler not matching path
```

### Issue: Headers Not Being Preserved

**Diagnosis**:
Check logs for missing headers:
```javascript
[WebSocket Proxy] Proxying WebSocket upgrade: {
  headers: {
    upgrade: undefined,      // ❌ Should be 'websocket'
    connection: undefined     // ❌ Should be 'Upgrade'
  }
}
```

**Fix**:
Verify server.js has the explicit header setting in `proxyReqWs` handler (lines 54-70)

### Issue: Connection Timeout

**Diagnosis**:
```javascript
[WebSocket Upgrade] Handling noVNC connection: { ... }
[WebSocket Proxy] Proxying WebSocket upgrade: { ... }
// ... long delay (>30s) ...
[WebSocket Proxy Error]: { message: 'socket timeout', code: 'ETIMEDOUT' }
```

**Fix**:
- Check backend is reachable: `ping 135.181.138.102`
- Check master-controller is running: `ssh root@135.181.138.102 "pm2 list"`
- Check VM health: `curl http://135.181.138.102:4000/api/auth/session/YOUR_SESSION_ID`

---

## Production Deployment

### Vercel / Cloudflare / Other Platforms

The current solution (custom server with WebSocket proxy) works in production with minimal changes:

```json
{
  "scripts": {
    "dev": "node server.js",
    "build": "next build",
    "start": "NODE_ENV=production node server.js"
  }
}
```

**Note**: Some platforms (like Vercel) don't support custom servers. For those platforms:

#### Alternative: Use HTTPS + WSS

1. Deploy Next.js normally (HTTPS enabled automatically)
2. Add TLS/SSL to master-controller backend
3. Update WebSocket URLs to use `wss://` instead of `ws://`
4. Remove the custom server proxy

#### Alternative: Edge Runtime with Cloudflare

Use Cloudflare Workers to proxy WebSocket connections:

```javascript
// cloudflare-worker.js
export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname.includes('/novnc/websock')) {
      const backendUrl = `http://135.181.138.102:4000${url.pathname}`;
      return fetch(backendUrl, {
        headers: request.headers,
      });
    }

    return fetch(request);
  }
}
```

---

## Success Criteria

✅ **Implementation Complete** when:
- [x] Enhanced server.js with explicit WebSocket header preservation
- [x] Added comprehensive logging for all connection states
- [x] Added error handlers for socket and proxy errors
- [x] Server starts successfully with new configuration
- [x] Logs show detailed WebSocket upgrade information

⏳ **Testing Required** to verify:
- [ ] noVNC iframe displays terminal (not "Disconnected: error")
- [ ] Browser console shows NO WebSocket connection errors
- [ ] Server logs show successful connection establishment
- [ ] Server logs show data transfer from backend
- [ ] User can see CLI commands running in terminal

---

## Summary of Changes

| Component | Change | Status |
|-----------|--------|--------|
| **server.js** | Added timeout configuration | ✅ Complete |
| **server.js** | Added xfwd header forwarding | ✅ Complete |
| **server.js** | Explicit WebSocket header preservation | ✅ Complete |
| **server.js** | Enhanced error logging | ✅ Complete |
| **server.js** | Connection lifecycle logging | ✅ Complete |
| **server.js** | Socket error handling | ✅ Complete |
| **server.js** | Try-catch wrapper for proxy.ws() | ✅ Complete |
| **Dev Server** | Restarted with new configuration | ✅ Running |

---

## Next Steps for User

1. **Test the connection**:
   - Navigate to `http://localhost:3000/dashboard/remote-cli`
   - Click "Connect Provider" → Claude Code
   - Wait for VM creation (15-30 seconds)

2. **Monitor the logs**:
   - Watch the terminal where `npm run dev` is running
   - Look for the successful connection pattern described above

3. **Report results**:
   - If successful: noVNC terminal should display in iframe
   - If failed: Share the error logs from server console

4. **Backend debugging** (if needed):
   - SSH into Hetzner VPS: `ssh root@135.181.138.102`
   - Check master-controller logs: `tail -f /var/log/polydev/master-controller.log`
   - Look for WebSocket-related entries

---

## Additional Resources

- **Diagnosis Document**: `/Users/venkat/Documents/polydev-ai/NOVNC-WEBSOCKET-COMPLETE-DIAGNOSIS.md`
- **Original Solution**: `/Users/venkat/Documents/polydev-ai/WEBSOCKET-PROXY-SOLUTION.md`
- **Server Code**: `/Users/venkat/Documents/polydev-ai/server.js`
- **API Route**: `/Users/venkat/Documents/polydev-ai/src/app/api/auth/session/[sessionId]/novnc/route.ts`

---

## Technical Rationale

**Why This Solution**:

1. **Browser Security**: Browsers block WebSocket connections from `https://` pages to `ws://` endpoints (mixed content). By proxying through localhost, we make it same-origin.

2. **Header Preservation**: The original proxy wasn't explicitly preserving WebSocket headers, causing the backend to receive a malformed upgrade request. Now all headers are explicitly set.

3. **Comprehensive Logging**: Detailed logs at every stage help diagnose exactly where the connection fails, making debugging much faster.

4. **Timeout Configuration**: 30-second timeouts give enough time for the backend to process the request without hanging indefinitely.

5. **Error Resilience**: Socket error handlers and try-catch wrappers prevent crashes and provide useful error messages.

This implementation follows industry best practices for WebSocket proxying and should resolve the "socket hang up" issue by ensuring the backend receives a proper WebSocket upgrade request with all required headers intact.
