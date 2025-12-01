# WebRTC Complete Fix Plan

## Current State (After 4+ Hours)

### ✅ What Actually Works:
- WebRTC signaling (offer/answer exchange)
- VM creation and network
- OAuth agent responding on port 8080
- WebRTC server streaming video

### ❌ What Doesn't Work:
1. **No mouse/keyboard input** - WebRTC viewer shows video but can't interact
2. **Terminal not visible** - Only browser showing
3. **No internet in VM** - Proxy not configured
4. **Connection unstable** - Disconnects after ~60 seconds
5. **VNC fallback fails** - Port 5901 not listening

## Root Causes Identified:

1. **Input Handling**: WebRTC server streams video but doesn't capture mouse/keyboard from browser
2. **VNC Services**: x11vnc and websockify services not starting (missing from VM)
3. **Filesystem Persistence**: Changes to golden rootfs don't persist in VM clones
4. **Connection Stability**: Unknown - needs investigation

## What Needs to Be Fixed (Priority Order):

### P0 - Enable Input Handling:
WebRTC server needs to:
- Accept mouse coordinates from browser
- Inject them into X11 using xdotool or similar
- Accept keyboard events
- Forward to X11

**Without this, the system is unusable.**

### P1 - Fix VNC Fallback:
Ensure VNC services (x11vnc, websockify) start in VMs so noVNC works as fallback.

### P2 - Terminal Visibility:
Get terminal to launch automatically (current filesystem persistence issue).

### P3 - Proxy Configuration:
Enable internet access in VMs (same filesystem issue).

### P4 - Connection Stability:
Fix WebRTC disconnections.

## Recommendation:

Focus on **P0 (Input Handling)** first. Without mouse/keyboard, nothing else matters.

The WebRTC server needs bidirectional communication:
- VM → Browser: Video stream (✅ WORKING)
- Browser → VM: Mouse/keyboard events (❌ NOT IMPLEMENTED)

This requires:
1. WebRTC data channel for input events
2. X11 input injection in VM (xdotool)
3. Browser-side input capture and sending

This is a significant architectural addition that wasn't in the original implementation.
