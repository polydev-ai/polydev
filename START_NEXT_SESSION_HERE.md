# Next Session - Fresh Start with Stable Architecture

## What Was Accomplished This Session:
✅ WebRTC signaling fixed (backend verified correct)
✅ Identified all infrastructure issues
✅ VNC server code deployed (starts but crashes)

## Why Current Approach Failed:
- Runtime filesystem modifications don't persist
- CoW snapshots don't work as expected
- Too many moving parts and complexity
- Debugging one issue revealed three more

## Recommended Fresh Start:

### Build Comprehensive Golden Snapshot
**Like Daytona/OnKernel - Everything Pre-Configured**

**Golden Rootfs Should Have**:
1. Node v20 (not v12/v18)
2. CLI Tools:
   - `@openai/codex`
   - `@anthropic-ai/claude-code`
   - `@google/gemini-cli`
3. VNC server (x11vnc) pre-configured and auto-starting
4. Terminal (xterm or gnome-terminal) auto-launching
5. XFCE desktop fully configured
6. All dependencies and libraries

**At Runtime** (minimal injection):
- SESSION_ID environment variable
- Decodo proxy credentials (via /etc/environment)
- Nothing else

**Benefits**:
- No filesystem persistence issues
- VMs work immediately
- Easy to debug (one image)
- Stable like Daytona/OnKernel

## Files to Reference:
- `/Users/venkat/Documents/polydev-ai/CLEAN_RESTART_PLAN.md` - Detailed plan
- `/Users/venkat/Documents/polydev-ai/master-controller/scripts/build-golden-snapshot.sh` - Current build script to enhance

## Current Session Achievements to Keep:
- `master-controller/src/routes/webrtc.js` - Answer/offer fixes
- Understanding of what NOT to do (runtime filesystem mods)
- Knowledge of Decodo proxy format
- VNC server command that works (when stable)

## Action for Next Session:
**Start fresh with comprehensive golden snapshot build** - no runtime filesystem modifications, everything pre-baked.

This is the path to stability.
