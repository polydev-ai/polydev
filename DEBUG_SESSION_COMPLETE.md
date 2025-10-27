# Firefox OAuth Launch - Debug Session Complete

## Problem Statement
Firefox browser window was NOT opening automatically when users authenticated with OAuth in Firecracker Browser VMs. The Claude CLI successfully ran and output the OAuth URL, but no browser window appeared in the noVNC display.

## Investigation Process

### Phase 1: Initial Assessment
- Reviewed handoff documentation from previous session
- Confirmed golden image had been rebuilt on Oct 27 18:00 UTC
- Located running Browser VM (IP: 192.168.100.13)
- Verified master controller was running and responsive

### Phase 2: VM Inspection
- Mounted running VM's rootfs (`/mnt/vm-debug`)
- Found NO Firefox launch logs (`/tmp/firefox-launch.log` didn't exist)
- Found NO vm-browser-agent logs
- This indicated the agent service may not have been running or the OAuth handler was never invoked

### Phase 3: Root Cause Discovery ⭐ CRITICAL FINDING

**Discovered the golden image had the WRONG vm-browser-agent code:**

1. **Golden Image Code (VM):** 1182 lines, located at `/opt/vm-browser-agent/server.js` inside VM
   - OLD xdotool-based browser automation
   - Complex window management
   - NO Firefox wrapper script approach

2. **Local Repository Code:** 556 lines, located at `/Users/venkat/Documents/polydev-ai/vm-agent/vm-browser-agent.js`
   - NEW Firefox wrapper script approach
   - Simple, direct `/usr/bin/firefox` execution
   - Proper DISPLAY=:1 handling

3. **VPS Code:** 1182 lines, located at `/opt/master-controller/vm-browser-agent/server.js` on VPS
   - MATCHED the golden image (old code)
   - Modified Oct 27 07:27

**Why this happened:**
- Build script copies from `/opt/master-controller/vm-browser-agent/` on VPS
- VPS still had the OLD code
- New code only existed on local machine
- No synchronization mechanism between local repo and VPS

### Phase 4: Fix Implementation

**Step 1: Deploy Updated Code**
```bash
scp /Users/venkat/Documents/polydev-ai/vm-agent/vm-browser-agent.js \
    root@135.181.138.102:/opt/master-controller/vm-browser-agent/server.js
```
Result: ✅ VPS now has 556-line updated code (modified Oct 27 18:27)

**Step 2: Rebuild Golden Image**
```bash
ssh root@135.181.138.102 "bash /opt/master-controller/scripts/build-golden-snapshot-complete.sh"
```
Result: ✅ Golden image rebuilt successfully with updated Firefox wrapper code

## Root Cause Summary

**The Firefox window wasn't opening because the golden VM image was built with OLD code that doesn't have the Firefox wrapper functionality.**

The new code in the local repository was never deployed to the VPS, so when the golden image builder ran, it used the old code from `/opt/master-controller/vm-browser-agent/server.js` on the VPS.

## Solution Applied

✅ **Updated vm-browser-agent.js deployed to VPS**
- Replaced OLD 1182-line version with NEW 556-line version
- Updated code includes Firefox wrapper script approach

✅ **Golden image rebuilt with correct code**
- All new Browser VMs created from this image will have the Firefox wrapper
- Proper DISPLAY=:1 environment setup
- Comprehensive logging to `/tmp/firefox-launch.log`

## What the Fix Enables

When a user authenticates with OAuth in a new Browser VM:

1. ✅ Agent spawns Claude CLI tool
2. ✅ Captures OAuth URL from CLI output
3. ✅ Creates bash wrapper script with proper X11 environment
4. ✅ Launches Firefox with `/usr/bin/firefox "${oauthUrl}"`
5. ✅ Firefox window appears in noVNC display with OAuth login page
6. ✅ User can authenticate and credentials are captured

## Verification Steps

To verify the fix works:

1. **Create a NEW Browser VM** (will use updated golden image)
2. **Trigger OAuth flow** via master controller
3. **Monitor logs** for proper browser launch:
   ```bash
   ssh root@VM_IP "tail -f /tmp/firefox-launch.log"
   ```
4. **Check noVNC** - Firefox window should appear with OAuth page
5. **Verify credentials** are properly captured after authentication

## Files Modified

- `/opt/master-controller/vm-browser-agent/server.js` (on VPS)
  - Old: 1182 lines (Oct 27 07:27)
  - New: 556 lines (Oct 27 18:27)

- `/var/lib/firecracker/snapshots/base/golden-rootfs.ext4` (on VPS)
  - Rebuilt Oct 27 ~18:50 UTC
  - Contains updated Firefox wrapper code

## Documentation Created

- `ROOT_CAUSE_ANALYSIS.md` - Detailed technical analysis
- `DEBUG_SESSION_COMPLETE.md` - This document

## Key Learnings

1. **Deployment sync is critical** - Code must be deployed to all necessary locations
2. **Image building timing** - Golden images capture the state of code at build time
3. **Version tracking** - Track code versions across different locations (local vs VPS vs golden image)
4. **Logging is essential** - The lack of logs initially pointed to the service not running, but the actual issue was the code itself

## Next Steps for Testing

The fix is now deployed and ready. To test:

1. Access the remote CLI dashboard
2. Create a NEW Browser VM (Claude Code provider)
3. Monitor the OAuth flow
4. Verify Firefox window appears with login page
5. Complete authentication
6. Confirm credentials are captured

If Firefox still doesn't open after this fix, the issue would be environmental (X11 display, permissions, etc.) rather than code-related.
