# Node.js fetch() EHOSTUNREACH Fix

## Problem

Browser VM health checks and OAuth proxy routes were failing with "fetch failed" errors. The root cause was Node.js built-in `fetch()` (using undici library) incorrectly returning `EHOSTUNREACH` when accessing private IP ranges (192.168.100.0/24), even though:
- System routing was correct
- `curl` worked perfectly
- Network configuration was valid

## Root Cause

Node.js `fetch()` has a known bug where it doesn't properly respect the system routing table for private IP ranges, causing it to fail with EHOSTUNREACH even when the connection should succeed.

## Solution

Replaced all `fetch()` calls in master-controller with native Node.js `http` module (`http.get()` and `http.request()`), which properly respects system routing.

## Files Changed

### 1. `/master-controller/src/services/browser-vm-auth.js` (4 replacements)

**Location 1: `waitForVMReady()` - Health check polling (lines ~228-300)**
- Replaced `fetch()` with `http.get()` to check `/health` endpoint
- Added proper timeout handling (5 seconds)
- Enhanced error logging

**Location 2: `authenticateCLI()` - Start CLI OAuth (lines ~370-407)**
- Replaced `fetch()` with `http.request()` for POST to `/auth/${provider}`
- Added Content-Length header
- Proper timeout configuration using `config.performance.cliOAuthStartTimeoutMs`

**Location 3: `authenticateCLI()` - Poll credentials status (lines ~434-485)**
- Replaced `fetch()` with `http.get()` for polling `/credentials/status`
- Added 5-second timeout
- Enhanced error handling for polling loop

**Location 4: `authenticateCLI()` - Retrieve credentials (lines ~492-520)**
- Replaced `fetch()` with `http.get()` for `/credentials/get`
- 10-second timeout for final credential retrieval

### 2. `/master-controller/src/routes/auth.js` (2 replacements)

**Location 1: `GET /session/:sessionId/oauth-url` proxy (lines ~106-135)**
- Replaced `fetch()` with `http.get()`
- Proxies OAuth URL requests from frontend to Browser VM
- Preserves Content-Type headers

**Location 2: `GET /session/:sessionId/credentials/status` proxy (lines ~165-194)**
- Replaced `fetch()` with `http.get()`
- Proxies credential status polling from frontend to Browser VM
- Preserves Content-Type headers

## Deployment

Files deployed to mini PC (192.168.5.82) at `/opt/master-controller/`:
```bash
scp src/services/browser-vm-auth.js backspace@192.168.5.82:/tmp/
scp src/routes/auth.js backspace@192.168.5.82:/tmp/
ssh backspace@192.168.5.82 "sudo mv /tmp/browser-vm-auth.js /opt/master-controller/src/services/"
ssh backspace@192.168.5.82 "sudo mv /tmp/auth.js /opt/master-controller/src/routes/"
ssh backspace@192.168.5.82 "sudo systemctl restart master-controller"
```

## Verification

Master-controller service status:
```
● master-controller.service - Polydev Master Controller
     Active: active (running) since Tue 2025-10-14 22:43:31 UTC
```

HTTP module connectivity test confirms routing works (ECONNREFUSED instead of EHOSTUNREACH):
```bash
node -e "const http = require('http'); http.get({hostname: '192.168.100.1', ...})"
# Returns: ECONNREFUSED (expected for non-existent service)
# Previously with fetch(): EHOSTUNREACH (incorrect routing failure)
```

## Next Steps

1. **Test end-to-end OAuth flow**: Create a new Browser VM authentication session from the frontend
2. **Monitor logs**: Verify health checks succeed and OAuth flow completes
3. **Verify fixes work**: Ensure "fetch failed" errors no longer occur

## Technical Details

### http.get() Pattern Used
```javascript
const http = require('http');
const result = await new Promise((resolve, reject) => {
  const req = http.get({
    hostname: vmIP,
    port: 8080,
    path: '/health',
    timeout: 5000
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => resolve({
      ok: res.statusCode === 200,
      status: res.statusCode,
      body
    }));
  });
  req.on('error', reject);
  req.on('timeout', () => {
    req.destroy();
    reject(new Error('Request timeout'));
  });
});
```

### http.request() Pattern Used (for POST)
```javascript
const http = require('http');
const result = await new Promise((resolve, reject) => {
  const payload = JSON.stringify(requestPayload);
  const req = http.request({
    hostname: vmIP,
    port: 8080,
    path: '/auth/provider',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    },
    timeout: 30000
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
      } else {
        resolve(JSON.parse(body));
      }
    });
  });
  req.on('error', reject);
  req.on('timeout', () => {
    req.destroy();
    reject(new Error('Request timeout'));
  });
  req.write(payload);
  req.end();
});
```

## Additional Fix: Session Status Update

After deploying the fetch() → http fix, discovered that the session status wasn't being updated to `'ready'` after the VM health check passed. This caused the frontend to poll OAuth URL endpoints before the agent was ready, resulting in ECONNREFUSED errors.

### Fix Applied

Added session status update in `runAsyncOAuthFlow()` after `waitForVMReady()` completes:

```javascript
await this.waitForVMReady(browserVM.ipAddress);

// Update status to 'ready' so frontend knows it can start polling
await db.authSessions.updateStatus(sessionId, 'ready');
this.authSessions.set(sessionId, {
  ...this.authSessions.get(sessionId),
  status: 'ready'
});
```

This ensures the frontend waits for the session status to change from `'vm_created'` → `'ready'` before polling for OAuth URLs.

## Date
October 14, 2025 - 22:43 UTC (initial fetch fix)
October 14, 2025 - 23:02 UTC (status update fix)
