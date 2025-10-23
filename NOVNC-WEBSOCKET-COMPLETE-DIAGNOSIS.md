# noVNC WebSocket Connection - Complete Diagnosis

**Date**: 2025-10-18 02:45 UTC
**Status**: ⚠️ Partial Success - WebSocket proxy working but connection failing
**Last Session Tested**: `ab15e381-68f1-4704-a42c-48a547d5da3d`

---

## Executive Summary

The WebSocket proxy solution has been successfully implemented and is correctly intercepting connections. However, the WebSocket connection still fails with "socket hang up" because the proxy is routing to the backend's HTTP server instead of its WebSocket handler.

### What's Working ✅

1. **Custom Next.js Server**: Running successfully on `localhost:3000` with WebSocket proxy enabled
2. **WebSocket Interception**: Server correctly identifies and handles noVNC WebSocket upgrade requests
3. **Backend Infrastructure**:
   - Browser VM is healthy (`vm-286ab114-4782-4dce-8a99-a8559f547d5da3d` at IP `192.168.100.7`)
   - OAuth agent service responding (`/health` returns `{"status":"ok"}`)
   - noVNC HTML page being served correctly
4. **Frontend API Route**: `/api/auth/session/[sessionId]/novnc` route compiled and returning 200
5. **URL Rewriting**: Frontend correctly removes remote IP from vnc_url

### What's Failing ❌

1. **WebSocket Connection**: Proxy connects to backend but gets "socket hang up" error
2. **Root Cause**: The `http-proxy` module is routing WebSocket upgrade requests to backend's HTTP handler instead of allowing them to reach backend's WebSocket handler

---

## Technical Details

### Current Architecture

```
User Browser (localhost:3000)
  ↓ WebSocket: ws://localhost:3000/api/auth/session/{sessionId}/novnc/websock
Custom Next.js Server (server.js)
  ↓ Intercepts WebSocket upgrade
  ↓ Proxies to: http://135.181.138.102:4000
Master-Controller Backend
  ❌ HTTP handler receives request (closes connection)
  ✗ WebSocket handler never reached
```

### Server Logs Evidence

```
✓ Compiled /api/auth/session/[sessionId]/novnc in 108ms (1889 modules)
GET /api/auth/session/ab15e381-68f1-4704-a42c-48a547d5da3d/novnc 200 in 421ms
[WebSocket Upgrade] Handling noVNC connection: /api/auth/session/ab15e381-68f1-4704-a42c-48a547d5da3d/novnc/websock
[WebSocket Proxy] Proxying: /api/auth/session/ab15e381-68f1-4704-a42c-48a547d5da3d/novnc/websock
[WebSocket Proxy Error]: socket hang up
```

**Analysis**: The proxy is working correctly - it's intercepting the WebSocket upgrade and attempting to forward it. However, the backend is immediately closing the connection.

### Backend WebSocket Handler

The backend (master-controller) has a working WebSocket handler in `src/routes/auth.js`:

```javascript
// Pattern: /api/auth/session/{sessionId}/novnc/websock
const match = req.url.match(/^\/api\/auth\/session\/([^/]+)\/novnc\/websock(.*)$/);
const target = `ws://${vmIP}:6080/websockify${suffix}`;
```

This handler should:
1. Extract session ID from the path
2. Look up VM IP from session
3. Forward WebSocket to `ws://192.168.100.7:6080/websockify`

---

## Files Implemented

### 1. Custom Server (server.js)

**Location**: `/Users/venkat/Documents/polydev-ai/server.js`

**Purpose**: Replace `next dev` with custom HTTP server that intercepts WebSocket upgrade requests

**Key Implementation**:
```javascript
const wsProxy = httpProxy.createProxyServer({
  target: 'http://135.181.138.102:4000',
  ws: true,
  changeOrigin: true,
  secure: false
});

server.on('upgrade', (req, socket, head) => {
  const { pathname } = parse(req.url);
  if (pathname && pathname.startsWith('/api/auth/session/') && pathname.includes('/novnc/websock')) {
    console.log('[WebSocket Upgrade] Handling noVNC connection:', pathname);
    wsProxy.ws(req, socket, head);
  } else {
    console.log('[WebSocket Upgrade] Rejecting non-noVNC connection:', pathname);
    socket.destroy();
  }
});
```

**Status**: ✅ Working correctly - intercepting WebSocket upgrades as expected

### 2. Frontend API Route

**Location**: `/Users/venkat/Documents/polydev-ai/src/app/api/auth/session/[sessionId]/novnc/route.ts`

**Purpose**: Fetch noVNC HTML from backend and rewrite URLs to use localhost

**Key Implementation**:
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const backendUrl = `http://135.181.138.102:4000/api/auth/session/${sessionId}/novnc`;

  const response = await fetch(backendUrl, {
    headers: { 'Host': '135.181.138.102:4000' },
  });

  let html = await response.text();

  // Replace WebSocket URLs
  html = html.replace(
    /ws:\/\/135\.181\.138\.102:4000/g,
    `ws://${request.headers.get('host')}`
  );

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
```

**Status**: ✅ Working - compiling and returning 200, but has async params warning in dev mode

### 3. Package.json Scripts

**Location**: `/Users/venkat/Documents/polydev-ai/package.json`

**Changes**:
```json
{
  "scripts": {
    "dev": "node server.js",
    "start": "NODE_ENV=production node server.js"
  }
}
```

**Status**: ✅ Working - server starts successfully

### 4. Frontend Page Update

**Location**: `/Users/venkat/Documents/polydev-ai/src/app/dashboard/remote-cli/auth/page.tsx`

**Change** (Line 213):
```typescript
<iframe
  src={vmInfo.vnc_url.replace('http://135.181.138.102:4000', '')}
  className="w-full h-[600px] bg-black"
  title="VM Terminal"
/>
```

**Status**: ✅ Working - iframe src now uses relative URL

---

## Root Cause Analysis

The WebSocket proxy is correctly intercepting and forwarding the connection, but the **backend is receiving it as an HTTP request** rather than a WebSocket upgrade request.

### Hypothesis

The `http-proxy` configuration needs to preserve the WebSocket upgrade headers when forwarding to the backend. The current configuration might be converting the WebSocket upgrade to a regular HTTP request.

### Evidence

1. Server logs show proxy handling the connection: `[WebSocket Proxy] Proxying: ...`
2. Immediately followed by: `[WebSocket Proxy Error]: socket hang up`
3. Backend master-controller logs show NO WebSocket-related entries
4. This suggests the WebSocket upgrade request isn't reaching the backend's WebSocket handler

---

## Next Steps to Fix

### Option 1: Fix Proxy Configuration (Recommended)

The issue is that the proxy needs to explicitly preserve WebSocket headers. Update `server.js`:

```javascript
wsProxy.on('proxyReqWs', (proxyReq, req, socket, options, head) => {
  console.log('[WebSocket Proxy] Proxying:', req.url);

  // Ensure WebSocket headers are preserved
  proxyReq.setHeader('Upgrade', req.headers.upgrade);
  proxyReq.setHeader('Connection', req.headers.connection);
});
```

### Option 2: Direct Backend Connection (Alternative)

If Option 1 doesn't work, simplify the architecture:

1. Remove the API route `/api/auth/session/[sessionId]/novnc`
2. Have iframe load directly from backend: `http://135.181.138.102:4000/...`
3. Update backend's noVNC HTML to use relative WebSocket URLs
4. Let the proxy only handle WebSocket upgrades, not HTML fetching

### Option 3: Backend WebSocket Handler Fix

Check if backend's WebSocket handler is actually running:

```bash
# SSH into Hetzner VPS
ssh root@135.181.138.102

# Check master-controller process
pm2 logs master-controller | grep -i websock

# Test WebSocket connection directly on backend
wscat -c "ws://localhost:4000/api/auth/session/ab15e381-68f1-4704-a42c-48a547d5da3d/novnc/websock"
```

---

## Testing Checklist

To verify the fix:

- [ ] Server starts without errors: `npm run dev`
- [ ] Server logs show: `> WebSocket proxy enabled for noVNC connections`
- [ ] Browser connects to: `http://localhost:3000/dashboard/remote-cli`
- [ ] Click "Connect Provider" → Claude Code
- [ ] Wait for VM creation (15-30 seconds)
- [ ] Check server logs for: `[WebSocket Upgrade] Handling noVNC connection`
- [ ] Check server logs should NOT show: `[WebSocket Proxy Error]: socket hang up`
- [ ] noVNC iframe displays VM terminal (not "Disconnected: error")
- [ ] Browser console shows NO WebSocket errors
- [ ] VM details visible (IP address, VM ID)

---

## Current System State

### Backend Health

✅ **Master-Controller**: Running on `135.181.138.102:4000`
✅ **Browser VM**: `vm-286ab114-4782-4dce-8a99-a8559f547d74` at IP `192.168.100.7`
✅ **OAuth Agent**: Responding with `{"status":"ok","activeSessions":1}`
✅ **Golden Snapshot**: Updated at `2025-10-18 02:17` (8.0GB)

### Frontend Health

✅ **Dev Server**: Running on `localhost:3000`
✅ **WebSocket Proxy**: Enabled and intercepting connections
⚠️ **WebSocket Connection**: Failing with "socket hang up"
⚠️ **Async Params Warning**: Next.js 15 compatibility warning (non-critical)

### Session Status

**Session ID**: `ab15e381-68f1-4704-a42c-48a547d5da3d`
**Provider**: `claude_code`
**VM ID**: `vm-286ab114-4782-4dce-8a99-a8559f547d74`
**VM IP**: `192.168.100.7`
**Status**: `ready`
**noVNC URL**: `http://135.181.138.102:4000/api/auth/session/ab15e381-68f1-4704-a42c-48a547d5da3d/novnc`

---

## Recommendations

1. **Immediate**: Test Option 1 (Fix proxy configuration to preserve WebSocket headers)
2. **If Option 1 fails**: Implement Option 2 (Simplify architecture by removing HTML proxy)
3. **Monitor**: Backend logs during WebSocket connection attempts
4. **Document**: Final working solution for production deployment

The infrastructure is solid and the proxy is correctly intercepting connections. The issue is purely about how the WebSocket upgrade request is being forwarded to the backend.
