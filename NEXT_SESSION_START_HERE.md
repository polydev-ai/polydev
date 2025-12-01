# Next Session - Start Here

## What Was Fixed This Session

✅ **WebRTC Signaling** - Backend returns correct nested structure
- Offer: `{ offer: { sdp, type }, candidates }`
- Answer: `{ answer: { sdp, type }, candidates }`
- Verified by direct curl to master controller

## Critical Discoveries

### Discovery 1: Golden Rootfs HAS Everything
Verified that `/var/lib/firecracker/snapshots/base/golden-rootfs.ext4` contains:
- ✅ VNC services (x11vnc, websockify, xvfb)
- ✅ Terminal autostart (`/root/.config/autostart/terminal.desktop`)
- ✅ Proxy placeholder (`/etc/environment`)

### Discovery 2: `dd` Copy is Being Used
Latest VMs (created after 20:35) ARE using `dd` for full copy instead of CoW.

Log evidence:
```
[CLONE-SNAPSHOT] Using dd for full copy (not CoW) to preserve golden rootfs modifications
```

### Discovery 3: But VMs Still Missing VNC Services
Even with `dd` copy, VMs don't have:
- ❌ VNC services
- ❌ Terminal autostart
- ❌ Proxy configuration

**Root Cause**: Unknown filesystem issue preventing `dd` copy from preserving files

### Discovery 4: VM Rootfs Cannot Be Mounted
When trying to verify VM rootfs after `dd` copy:
```
mount: failed to setup loop device for rootfs.ext4
```

This suggests:
- Filesystem corruption
- Or rootfs still in use by Firecracker
- Or kernel loop device limit reached

## What Needs Investigation Next Session

### Priority 1: Why `dd` Copy Fails to Preserve Files

**Test**:
1. Manually `dd` copy golden rootfs to a test file
2. Mount and verify VNC services exist
3. If they exist → problem is elsewhere
4. If they don't → `dd` itself is broken

### Priority 2: VM Boot Failures

Many test VMs show:
- Firecracker process starts
- VM boots and runs for a while
- Then Firecracker process terminates
- VM becomes unreachable

**Need to investigate**: Why VMs are crashing/terminating

### Priority 3: Alternative to Filesystem Modifications

If filesystem persistence continues to fail, consider:
- Running init script inside VM at boot (via systemd)
- Script reads from runtime API and configures terminal/proxy
- Avoids filesystem modification entirely

## Immediate Next Steps

1. **Kill all background bash processes** (many are hung)
2. **Test manual `dd` copy** to verify it works
3. **If `dd` works**: Find why VM rootfs doesn't have the files
4. **If `dd` fails**: Use different copy method
5. **Fix VNC/terminal/proxy** once copy method works
6. **Then** address WebRTC stability

## What's Currently Deployed and Working

✅ Master controller at VPS with `dd` copy method
✅ Golden rootfs with VNC, terminal, proxy
✅ WebRTC answer/offer structure fixes

## Session Duration

~5 hours spent primarily on:
- WebRTC signaling structure (FIXED)
- Filesystem persistence debugging (NOT FIXED)
- Multiple restart/redeploy cycles

**Recommendation**: Fresh session with systematic approach to filesystem issue.
