# Golden Snapshot Rebuild - OAuth URL Fix

## Problem Identified

**Date**: October 15, 2025 00:26 UTC

The golden snapshot at `/var/lib/firecracker/snapshots/base/golden-rootfs.ext4` contains **OLD server.js** with localhost replacement code:

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

This causes OAuth URLs to show VM IP instead of localhost redirect, breaking the OAuth flow.

## Root Cause

1. Golden snapshot was built with old server.js containing localhost replacement
2. Even though injection code copies correct server.js, the VM boots with old code from snapshot
3. OAuth URLs generated show: `redirect_uri=http%3A%2F%2F192.168.100.X%3A8080` instead of `redirect_uri=http%3A%2F%2Flocalhost%3AXXXXX`

## Solution

Rebuild golden snapshot using the build script which will copy the **correct server.js** from `/opt/master-controller/vm-browser-agent/server.js`.

**Verified correct server.js** (MD5: 3ef47bb697269044f1e1c68561e68b69):
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

## Build Process

**Script**: `/opt/master-controller/scripts/build-golden-snapshot-complete.sh`

**Steps**:
1. Creates fresh Ubuntu 22.04 rootfs (8GB)
2. Installs Node.js 20, VNC, noVNC, Firefox, Chromium
3. **Copies server.js from `/opt/master-controller/vm-browser-agent/`** (lines 287-289)
4. Creates systemd services for VNC and OAuth agent
5. Saves golden snapshot to `/var/lib/firecracker/snapshots/base/golden-rootfs.ext4`

**Time**: ~5-10 minutes

**Impact**: All new Browser VMs will use updated server.js with correct OAuth URL handling

## Deployment

**Date**: October 15, 2025 00:28 UTC

```bash
# SSH to mini PC
ssh backspace@192.168.5.82

# Run build script
sudo /opt/master-controller/scripts/build-golden-snapshot-complete.sh
```

## Testing

After rebuild completes:

1. **Destroy all existing Browser VMs** (they use old snapshot)
   ```bash
   cd /var/lib/firecracker/users && for vm in vm-*; do
     echo "Destroying $vm...";
     pid=$(ps aux | grep firecracker | grep $vm | awk "{print \$2}");
     if [ -n "$pid" ]; then kill -9 $pid 2>/dev/null || true; fi;
     tap=$(echo $vm | cut -c1-16);
     ip link delete fc-$tap 2>/dev/null || true;
     rm -rf $vm;
   done
   ```

2. **Create new Browser VM** via frontend:
   ```
   http://localhost:3000/dashboard/remote-cli/auth
   ```

3. **Verify OAuth URL** has localhost redirect:
   - Should see: `redirect_uri=http%3A%2F%2Flocalhost%3AXXXXX%2Fcallback`
   - Should NOT see: `redirect_uri=http%3A%2F%2F192.168.100.X%3A8080`

4. **Test OAuth flow**:
   - User authenticates in browser
   - Redirect to `http://localhost:XXXXX/callback?code=...` works
   - Credentials extracted and stored

## Related Fixes

This builds on previous OAuth flow improvements:
- ✅ Service injection fix (Oct 15 00:05 UTC) - stopped injecting systemd service file
- ✅ Node.js fetch() → http module replacement (Oct 14 23:02 UTC)
- ✅ Session status 'ready' addition (Oct 14 23:02 UTC)

## Expected Outcome

- ✅ OAuth URLs will preserve localhost redirect URIs
- ✅ Browser and OAuth agent can communicate via localhost
- ✅ OAuth callback will work without registering public redirect URLs
- ✅ Complete OAuth flow will work end-to-end
