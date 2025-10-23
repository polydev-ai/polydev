# Root Cause Analysis - noVNC "Disconnected: error"

## Problem Statement

When users click "Connect Provider", the auth page shows noVNC iframe with "Disconnected: error" badge and blank black screen. The WebSocket connection to the VNC server fails.

---

## Investigation Summary

### What We Found

1. **Session Created Successfully**: `/api/vm/auth` endpoint works and creates a session in the database
2. **VM Fields Are NULL**: Session record has `vm_ip: null`, `vm_id: null`, `vnc_url: null`
3. **noVNC Has Nothing to Connect To**: WebSocket fails because there's no VNC server running

### Key Discovery

The master-controller `/api/auth/start` endpoint is called by `/api/vm/auth` and it:
- ✅ Calls `browserVMAuth.startAuthentication(userId, provider)`
- ✅ Returns `{sessionId, novncURL, browserIP}` in the response
- ❌ **BUT**: These values are NOT being saved to the `auth_sessions` table in Supabase

---

## Root Cause

The `browser_vm_auth.js` service on the master-controller creates the auth session in the database, but **only saves the session ID and provider** - it doesn't update the session with the VM details (`vm_ip`, `vm_id`, `vnc_url`) after the browser VM boots.

### Code Flow (Master-Controller)

1. Frontend calls `/api/vm/auth`
2. Next.js proxies to master-controller `/api/auth/start`
3. Master-controller calls `browserVMAuth.startAuthentication()`
4. **Issue**: `startAuthentication()` function:
   - Creates session record in database (with NULL VM fields)
   - Starts browser VM (gets IP, VNC URL)
   - Returns VM details in API response
   - ❌ **Does NOT update the database session with VM details**

5. Frontend gets sessionId in response
6. Frontend redirects to auth page
7. Auth page polls `/api/auth/session/{sessionId}`
8. Session data still has NULL VM fields
9. noVNC tries to connect to NULL VNC URL → fails

---

## Why This Happens

Looking at the master-controller code architecture:

```javascript
// master-controller/src/routes/auth.js (line ~15)
router.post('/start', async (req, res) => {
  const { userId, provider } = req.body;

  const result = await browserVMAuth.startAuthentication(userId, provider);

  res.json({
    success: true,
    sessionId: result.sessionId,
    provider: result.provider,
    novncURL: result.novncURL,  // ✅ Returned in API response
    browserIP: result.browserIP // ✅ Returned in API response
  });
});
```

The `novncURL` and `browserIP` are returned to the API caller, but they're not persisted to the Supabase `auth_sessions` table.

The frontend receives this data in the `/api/vm/auth` response but doesn't use it - it just extracts the `sessionId` and redirects to the auth page, which then polls the database for session status (where VM fields are still NULL).

---

## The Fix (Backend Required)

**Location**: `master-controller/src/services/browser-vm-auth.js`

**Required Change**: After starting the browser VM in `startAuthentication()`, update the auth_sessions record:

```javascript
async startAuthentication(userId, provider) {
  // 1. Create session
  const sessionId = uuidv4();
  await supabase.from('auth_sessions').insert({
    session_id: sessionId,
    user_id: userId,
    provider,
    status: 'started',
    created_at: new Date().toISOString()
  });

  // 2. Start browser VM
  const browserVM = await this.createBrowserVM(userId, provider);

  // 3. ✅ UPDATE: Save VM details to session
  await supabase.from('auth_sessions').update({
    vm_ip: browserVM.ip,
    vm_id: browserVM.vmId,
    vnc_url: browserVM.novncURL,
    browser_vm_id: browserVM.vmId,
    status: 'vm_created'
  }).eq('session_id', sessionId);

  // 4. Return details
  return {
    sessionId,
    provider,
    novncURL: browserVM.novncURL,
    browserIP: browserVM.ip
  };
}
```

---

## Alternative Workaround (Frontend - Current Limitation)

Since we can't easily modify the deployed master-controller, we could have the frontend use the `novncURL` from the `/api/vm/auth` response directly instead of polling the database.

**However**, this has issues:
- The auth page is a separate route that doesn't have access to the initial response
- We'd need to pass the VNC URL via URL parameters (security concern)
- The polling logic is needed anyway to detect when credentials are saved

---

## Why My Initial Fix Was Wrong

I initially tried to call `/api/vm/auth/start` as a second step, thinking it would start the VM. But:

1. `/api/vm/auth` ALREADY calls master-controller `/api/auth/start` which starts the VM
2. `/api/vm/auth/start` is a DIFFERENT endpoint meant for starting browser VMs via a different flow (with userId in path)
3. Calling both would try to create two different VMs

The correct endpoint (`/api/vm/auth`) IS working - it's just not saving the VM details to the database.

---

## What Needs to Happen

### Short Term (Master-Controller Fix)
1. SSH into Hetzner VPS (135.181.138.102)
2. Edit `/opt/master-controller/src/services/browser-vm-auth.js`
3. Add database update after VM creation (see code example above)
4. Restart master-controller: `pm2 restart master-controller`

### Verification
1. Click "Connect Provider" in frontend
2. Check database: `SELECT vm_ip, vm_id, vnc_url FROM auth_sessions WHERE session_id = 'xxx'`
3. Expected: All three fields should have values (not NULL)
4. noVNC iframe should connect successfully

---

## Status

❌ **Not Fixed**: Backend change required in master-controller
📋 **Next Step**: Update `browser-vm-auth.js` to persist VM details to database
🔍 **Temporary Workaround**: None available without backend change

The frontend code is correct. The issue is purely in the master-controller not persisting the VM details to the database after starting the browser VM.
