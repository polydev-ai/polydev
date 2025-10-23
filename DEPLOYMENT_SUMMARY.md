# Browser VM OAuth Flow - Complete Fix Summary

## Problem
Frontend was getting 500 errors when polling OAuth URL and credentials status endpoints, with ECONNREFUSED errors indicating the OAuth agent wasn't reachable.

## Root Causes Identified

### 1. Node.js fetch() EHOSTUNREACH Bug
Node.js built-in `fetch()` has a known bug where it returns EHOSTUNREACH for private IP ranges (192.168.100.0/24), even when routing is correct and curl works.

### 2. Missing Session Status Update
After VM health check passed, the session status wasn't being updated from `'vm_created'` to `'ready'`, causing the frontend to poll before the OAuth agent was actually ready.

## Fixes Applied

### Backend Fix 1: Replace fetch() with http module
**Files Modified:**
- `master-controller/src/services/browser-vm-auth.js` (4 replacements)
- `master-controller/src/routes/auth.js` (2 replacements)

**Change Pattern:**
```javascript
// Before (broken)
const response = await fetch(`http://${vmIP}:8080/health`);

// After (working)
const http = require('http');
const response = await new Promise((resolve, reject) => {
  const req = http.get({
    hostname: vmIP,
    port: 8080,
    path: '/health',
    timeout: 5000
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => resolve({ ok: res.statusCode === 200, status: res.statusCode, body }));
  });
  req.on('error', reject);
  req.on('timeout', () => {
    req.destroy();
    reject(new Error('Request timeout'));
  });
});
```

**Locations in browser-vm-auth.js:**
1. Line ~228-300: `waitForVMReady()` health check polling
2. Line ~370-407: `authenticateCLI()` POST to start OAuth flow
3. Line ~434-485: `authenticateCLI()` polling /credentials/status
4. Line ~492-520: `authenticateCLI()` GET /credentials/get

**Locations in auth.js:**
1. Line ~106-135: GET /session/:sessionId/oauth-url proxy
2. Line ~165-194: GET /session/:sessionId/credentials/status proxy

### Backend Fix 2: Update session status to 'ready'
**File Modified:**
- `master-controller/src/services/browser-vm-auth.js`

**Change:**
Added session status update after `waitForVMReady()` completes:

```javascript
async runAsyncOAuthFlow({ sessionId, provider, userId, browserVM, cliVMInfo, proxyConfig }) {
  (async () => {
    let finalStatus = 'completed';
    try {
      await this.waitForVMReady(browserVM.ipAddress);

      // Update status to 'ready' so frontend knows it can start polling
      await db.authSessions.updateStatus(sessionId, 'ready');
      this.authSessions.set(sessionId, {
        ...this.authSessions.get(sessionId),
        status: 'ready'
      });

      const credentials = await this.executeOAuthFlow(sessionId, provider, browserVM.ipAddress, proxyConfig);
      ...
```

**Location:** Line ~162-174

### Frontend Fix: Handle 'ready' status
**File Modified:**
- `src/app/dashboard/remote-cli/auth/page.tsx`

**Change:**
Updated status mapping to treat `'vm_created'` as still creating (keeps showing "Creating VM" UI) and only show "VM Ready" when status is `'ready'` or `'awaiting_user_auth'`:

```javascript
switch (data.session.status) {
  case 'started':
    setStep('creating_vm');
    break;
  case 'vm_created':
    // VM created but not ready yet - keep showing "Creating VM"
    setStep('creating_vm');
    break;
  case 'ready':
  case 'awaiting_user_auth':
    // VM ready and agent is running - show auth UI
    setStep('vm_ready');
    if (data.vm) setVmInfo(data.vm);
    break;
  ...
```

**Location:** Line ~146-174

## Session Status Flow

1. **started** → Initial session creation
2. **vm_created** → Firecracker VM booted (agent starting, not ready yet)
3. **ready** → OAuth agent health check passed, ready for frontend polling ← **NEW**
4. **awaiting_user_auth** → OAuth URL captured, waiting for user to complete OAuth
5. **authenticating** → User completed OAuth, transferring credentials
6. **completed** → Success

## Deployment

All changes deployed to mini PC (192.168.5.82) at `/opt/master-controller/`:

```bash
# Deploy browser-vm-auth.js
scp src/services/browser-vm-auth.js backspace@192.168.5.82:/tmp/
ssh backspace@192.168.5.82 "sudo mv /tmp/browser-vm-auth.js /opt/master-controller/src/services/"

# Deploy auth.js
scp src/routes/auth.js backspace@192.168.5.82:/tmp/
ssh backspace@192.168.5.82 "sudo mv /tmp/auth.js /opt/master-controller/src/routes/"

# Restart service
ssh backspace@192.168.5.82 "sudo systemctl restart master-controller"
```

**Service Status:** ✅ Active (running) since 23:02:20 UTC

## Verification

Test OAuth agent connectivity:
```bash
curl -s http://192.168.100.2:8080/health
# {"status":"ok","timestamp":"2025-10-14T23:01:27.316Z","activeSessions":1}
```

Test HTTP module routing (vs broken fetch):
```bash
node -e "const http = require('http'); http.get({hostname: '192.168.100.1', port: 6080}, (res) => console.log('Status:', res.statusCode)).on('error', (err) => console.log('Error:', err.message))"
# Error: connect ECONNREFUSED (expected for non-existent service)
# Previously with fetch(): EHOSTUNREACH (broken routing)
```

## Expected Behavior

1. Frontend creates session → status: `'started'`
2. Master-controller creates Browser VM → status: `'vm_created'`
3. Frontend shows "Creating VM" spinner
4. Master-controller waits for health check (15-45 seconds)
5. Health check passes → status: `'ready'`
6. Frontend switches to "VM Ready" UI with authentication instructions
7. Frontend starts polling OAuth URL endpoint
8. OAuth URL returned → frontend shows browser iframe
9. User completes OAuth → credentials saved
10. Status: `'completed'` → frontend shows success

## Testing
Try the OAuth flow again from the frontend at:
https://master.polydev.ai/dashboard/remote-cli/auth?session=NEW_SESSION&provider=claude_code

Expected outcome:
- No more 500 errors during polling
- No more ECONNREFUSED errors in logs
- Smooth transition from "Creating VM" → "VM Ready" → OAuth flow

## Date
October 14, 2025
- 22:43 UTC: Initial fetch() → http fix deployed
- 23:02 UTC: Session status 'ready' fix deployed
- 23:05 UTC: Frontend fix for 'ready' status handling
