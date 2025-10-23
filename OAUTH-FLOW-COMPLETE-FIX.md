# OAuth Flow Complete Fix - Golden Snapshot Rebuild

## Summary

**Date**: October 15, 2025 00:26 - 00:43 UTC

Successfully identified and fixed the root cause of OAuth URL localhost replacement issue by rebuilding the golden snapshot with the correct server.js file.

## Problem History

### Initial Symptoms
- OAuth URLs showing VM IP instead of localhost redirect
- Example: `redirect_uri=http%3A%2F%2F192.168.100.X%3A8080` (WRONG)
- Expected: `redirect_uri=http%3A%2F%2Flocalhost%3AXXXXX%2Fcallback` (CORRECT)

### Investigation
1. Verified `/opt/master-controller/vm-browser-agent/server.js` had correct code (MD5: 3ef47bb697269044f1e1c68561e68b69)
2. Confirmed injection was copying the correct file
3. Mounted golden snapshot and discovered it contained **OLD server.js** with localhost replacement code

### Root Cause
The golden snapshot at `/var/lib/firecracker/snapshots/base/golden-rootfs.ext4` was built with an outdated version of server.js that had this code:

```javascript
function normalizeOAuthUrl(url) {
  if (!url) return url;

  return url
    .trim()
    .replace(/[)\]]+$/, '')
    .replace(
      /redirect_uri=http(?:s)?%3A%2F%2Flocalhost(?:%3A\d+)?/g,
      `redirect_uri=http%3A%2F%2F${getVMIP()}%3A8080`
    )
    .replace(
      /redirect_uri=http(?:s)?:\/\/localhost(?::\d+)?/g,
      `redirect_uri=http://${getVMIP()}:8080`
    );
}
```

This code was replacing localhost redirects with the VM IP, breaking the OAuth flow because:
- Browser and OAuth agent run in the SAME VM
- Localhost redirects work perfectly within the VM
- Replacing with VM IP breaks the flow (can't access VM IP from browser)

## Solution

### Step 1: Rebuild Golden Snapshot
Executed `/opt/master-controller/scripts/build-golden-snapshot-complete.sh` which:
- Creates fresh Ubuntu 22.04 rootfs (8GB)
- Installs Node.js 20, VNC, noVNC, Firefox, Chromium
- **Copies correct server.js from `/opt/master-controller/vm-browser-agent/`**
- Creates systemd services
- Saves new golden snapshot

**Build completed**: October 15, 2025 00:43 UTC
**Build time**: ~7 minutes

### Step 2: Verification
Mounted new golden snapshot and confirmed it has the **correct server.js**:

```javascript
function normalizeOAuthUrl(url) {
  if (!url) return url;

  // Don't replace localhost - browser runs INSIDE the VM, so localhost is correct
  // The browser and OAuth agent are on the same machine (the VM)
  return url
    .trim()
    .replace(/[)\]]+$/, '');
}
```

✅ No localhost replacement
✅ Comments explain the reasoning

### Step 3: Clean Up Old VMs
Destroyed all existing Browser VMs that were created with the old golden snapshot.

## Technical Details

### Files Modified
- `/var/lib/firecracker/snapshots/base/golden-rootfs.ext4` - Rebuilt with correct server.js

### Files Verified
- `/opt/master-controller/vm-browser-agent/server.js` - Source file is correct
- `/mnt/verify/opt/vm-browser-agent/server.js` - New snapshot has correct code

### Build Script
- **Script**: `/opt/master-controller/scripts/build-golden-snapshot-complete.sh`
- **Execution**: Lines 287-289 copy server.js from master-controller repo
- **Service**: Lines 328-348 create systemd service using `/usr/bin/node`

## Testing Instructions

### Create New Browser VM
```bash
# Via Frontend (Recommended)
http://localhost:3000/dashboard/remote-cli/auth

# Via API
curl -X POST http://192.168.5.82:4000/api/auth/start \
  -H "Content-Type: application/json" \
  -d '{"userId":"d0d19137-0280-4857-a355-0a1404d5f9d3","provider":"claude_code"}'
```

### Verify OAuth URL
Check that the OAuth URL preserves localhost redirect:
```
✅ CORRECT: https://claude.ai/oauth/authorize?...redirect_uri=http%3A%2F%2Flocalhost%3AXXXXX%2Fcallback
❌ WRONG:   https://claude.ai/oauth/authorize?...redirect_uri=http%3A%2F%2F192.168.100.X%3A8080
```

### Test OAuth Flow
1. User authenticates in browser (inside VM)
2. OAuth provider redirects to `http://localhost:XXXXX/callback?code=...`
3. OAuth agent (running on localhost in VM) receives callback
4. Credentials extracted and stored
5. Frontend polls and retrieves credentials

## Related Fixes

This is the **final fix** in a series of OAuth flow improvements:

1. **Oct 14 22:43 UTC**: Removed localhost replacement from server.js source
2. **Oct 14 23:02 UTC**: Replaced Node.js fetch() with http module for health checks
3. **Oct 14 23:02 UTC**: Added session status 'ready'
4. **Oct 15 00:05 UTC**: Fixed service injection (stopped injecting systemd service file)
5. **Oct 15 00:43 UTC**: **Rebuilt golden snapshot with correct server.js** ✅

## Expected Outcome

All new Browser VMs will:
- ✅ Start with vm-browser-agent service running
- ✅ Generate OAuth URLs with localhost redirects
- ✅ Accept OAuth callbacks on localhost
- ✅ Extract credentials successfully
- ✅ Complete OAuth flow end-to-end

## Deployment Status

- ✅ Golden snapshot rebuilt
- ✅ New snapshot verified
- ✅ Old VMs destroyed
- ⏳ Ready for testing with fresh VM

## Next Steps

1. Create new Browser VM via frontend
2. Verify OAuth URL has localhost redirect
3. Test complete OAuth flow
4. Confirm credentials extraction works
5. Update database to clean up old destroyed VM records (optional)
