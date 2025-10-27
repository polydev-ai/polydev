# Firefox OAuth Launch - ROOT CAUSE ANALYSIS & FIX

## Issue
Browser window NOT opening automatically during OAuth authentication in Firecracker VMs, despite:
- Claude CLI successfully spawning and outputting OAuth URL
- Master controller successfully connecting to Browser VM and receiving the URL
- X11 display (Xvfb, VNC) properly configured
- Firefox binary installed at `/usr/bin/firefox`

## Root Cause Identified

**The golden VM image was built with the WRONG (old) vm-browser-agent code.**

### Evidence

**Deployed VPS Code (OLD - 1182 lines):**
- Located at: `/opt/master-controller/vm-browser-agent/server.js` on VPS
- Modification date: October 27 07:27
- Uses old xdotool-based browser automation approach
- Complex browser window management code
- NO Firefox wrapper script approach

**Expected Local Code (NEW - 556 lines):**
- Located at: `/Users/venkat/Documents/polydev-ai/vm-agent/vm-browser-agent.js`
- Uses simple bash wrapper script approach for Firefox launch
- Proper DISPLAY=:1 environment setup
- Comprehensive logging to `/tmp/firefox-launch.log`
- Direct `/usr/bin/firefox` execution

**VM Image Code (MATCHED OLD):**
- Deployed inside golden image: `/opt/vm-browser-agent/server.js`
- Size: 1182 lines (confirms it's the OLD code)
- This is what Browser VMs were running

### Why the Wrong Code Was Used

The golden image build script (`/opt/master-controller/scripts/build-golden-snapshot-complete.sh`) has this logic:

```bash
if [ -d "/opt/master-controller/vm-browser-agent" ]; then
    cp /opt/master-controller/vm-browser-agent/server.js rootfs/opt/vm-browser-agent/
    # ... uses the code from VPS
else
    # ... falls back to embedded default code
fi
```

This script runs on the VPS and looks for code AT `/opt/master-controller/vm-browser-agent/`, which existed but had the OLD code. So the OLD code was copied into the golden image.

The updated code at `/Users/venkat/Documents/polydev-ai/vm-agent/vm-browser-agent.js` was never deployed to the VPS, so it was never used.

## Fix Applied

### Step 1: Deploy Updated Code to VPS
```bash
scp /Users/venkat/Documents/polydev-ai/vm-agent/vm-browser-agent.js \
    root@135.181.138.102:/opt/master-controller/vm-browser-agent/server.js
```

**Result:** ✅ Updated 556-line code now at `/opt/master-controller/vm-browser-agent/server.js`

### Step 2: Rebuild Golden VM Image
```bash
ssh root@135.181.138.102 "bash /opt/master-controller/scripts/build-golden-snapshot-complete.sh"
```

**Result:** ✅ Golden image rebuilt successfully at `/var/lib/firecracker/snapshots/base/golden-rootfs.ext4`

## What the New Code Does

The new vm-browser-agent.js (556 lines) implements a cleaner Firefox launch mechanism:

1. **Spawns Claude CLI** with proper environment setup
2. **Captures OAuth URL** from CLI stdout with regex pattern matching
3. **Creates bash wrapper script** at `/tmp/firefox-launcher.sh` with:
   - Proper X11 environment variables (DISPLAY=:1, HOME=/root, XAUTHORITY)
   - Comprehensive logging to `/tmp/firefox-launch.log`
   - X11 display validation
   - Firefox profile lock cleanup
4. **Launches Firefox** directly: `/usr/bin/firefox "${oauthUrl}"`
5. **Logs all errors** for debugging

## Next Steps

1. **Create a NEW Browser VM** - this will use the updated golden image
2. **Trigger OAuth flow** - master controller will call the agent
3. **Monitor logs**:
   - `/tmp/firefox-launch.log` - wrapper script output
   - `/tmp/vm-browser-agent.log` - agent HTTP logs
   - systemd journal - service startup logs
4. **Expected behavior**: Firefox window should appear in noVNC display with OAuth login page

## Files Modified

- `/opt/master-controller/vm-browser-agent/server.js` - updated from old (1182 lines) to new (556 lines)
- `/var/lib/firecracker/snapshots/base/golden-rootfs.ext4` - rebuilt with updated code

## Testing the Fix

To test, create a new Browser VM and monitor:

```bash
# Get new VM's IP from master controller response
VM_IP="192.168.100.X"

# SSH into VM (if reachable)
ssh root@$VM_IP

# Check service status
systemctl status vm-browser-agent

# Monitor Firefox launch log
tail -f /tmp/firefox-launch.log

# Check agent logs
tail -f /tmp/vm-browser-agent.log

# Check X11 display
DISPLAY=:1 xset q

# If Firefox still doesn't open, test directly
DISPLAY=:1 HOME=/root /usr/bin/firefox https://accounts.anthropic.com &
ps aux | grep firefox
```

## Key Insight

The issue was NOT with the code logic or approach - it was a **deployment/synchronization problem**. The correct Firefox wrapper code existed but was never deployed to the VPS where the golden image builder looks for it.

Once deployed, the golden image now contains the proper code, and all new Browser VMs created from this image will have the Firefox wrapper functionality.
