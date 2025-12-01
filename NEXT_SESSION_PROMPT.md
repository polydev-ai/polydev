# Next Session Starting Prompt

Copy this entire prompt to start the next session:

---

## Context

I need to build a stable browser-in-browser system for OAuth authentication using Firecracker VMs. The current implementation has issues with VNC stability, filesystem persistence, and remote desktop interaction. I want to rebuild it following production best practices from Daytona and OnKernel.

## VPS Access

**Host**: 135.181.138.102
**User**: root
**Password**: Venkatesh4158198303
**SSH Command**: `sshpass -p "Venkatesh4158198303" ssh -o StrictHostKeyChecking=no root@135.181.138.102`

**Deployed Services**:
- Master Controller: Port 4000 (Node.js/Express)
- VMs: 192.168.100.x network (TAP interface)
- Location: `/opt/master-controller`
- Logs: `/opt/master-controller/logs/master-controller.log`

## Database (Supabase)

**Connection**: Already configured in `/opt/master-controller/src/db/supabase.js`
**Connection String**: Check `.env` file on VPS at `/opt/master-controller/.env`
**Tables**:
- `auth_sessions` - OAuth session tracking
- `webrtc_signaling` - WebRTC offer/answer storage
- `users` - User management

**Note**: Database credentials are in environment variables on VPS. Check with:
```bash
sshpass -p "Venkatesh4158198303" ssh root@135.181.138.102 "cat /opt/master-controller/.env"
```

## Current System State

**What Works**:
- ✅ WebRTC signaling (offer/answer structure fixed in `master-controller/src/routes/webrtc.js`)
- ✅ VM creation and orchestration
- ✅ Proxy port management (Decodo)

**What Doesn't Work**:
- ❌ VNC server crashes after starting
- ❌ Terminal doesn't open
- ❌ Filesystem modifications don't persist in VM clones
- ❌ Cannot interact with VM desktop from browser

## Requirements

**Must Have**:
1. **Browser** (Chrome) + **Terminal** (xterm) - both visible on desktop
2. **Remote Desktop Access** - via VNC/noVNC from user's browser
3. **Full Interaction** - mouse/keyboard input works in both browser and terminal
4. **Internet Access** - via Decodo proxy:
   - Format: `http://sp9dso1iga:GjHd8bKd3hizw05qZ%3D@dc.decodo.com:PORT`
   - Port: 10001+ (unique per user)
5. **Node v20** - Required for CLI tools
6. **CLI Tools** - Must be accessible:
   - `npm install -g @openai/codex`
   - `npm install -g @anthropic-ai/claude-code`
   - `npm install -g @google/gemini-cli`
7. **Stability** - No crashes, VMs stay alive 30+ minutes
8. **Thin Architecture** - Simple, debuggable

## Previous Session Issues

After 7+ hours:
- Runtime filesystem modifications failed (CoW snapshot issues)
- x11vnc started but crashed immediately
- VNC port 5901 opened then closed
- Terminal command not found (wrong executable)
- Proxy configured but files didn't persist

## Solution Approach

Based on research of Daytona and OnKernel:

**Build comprehensive golden rootfs with**:
- Node v20
- All CLI tools pre-installed
- x11vnc as **systemd service** with `Restart=on-failure`
- Terminal auto-launch via `/etc/xdg/autostart`
- Proxy configuration template

**At runtime**: Only inject proxy credentials and SESSION_ID (no other modifications)

## Key Files to Review

**Local** (on Mac):
1. **`/Users/venkat/Documents/polydev-ai/COMPLETE_SYSTEM_PLAN_WITH_PROXY.md`** - Full implementation plan
2. **`/Users/venkat/Documents/polydev-ai/PRODUCTION_IMPLEMENTATION_PLAN.md`** - Production architecture
3. **`/Users/venkat/Documents/polydev-ai/CLEAN_RESTART_PLAN.md`** - Why fresh start needed

**On VPS**:
1. **`/opt/master-controller/scripts/build-golden-snapshot.sh`** - Current build script to enhance
2. **`/opt/master-controller/src/services/vm-manager.js`** - VM creation logic
3. **`/opt/master-controller/logs/master-controller.log`** - Recent logs

## Current Golden Snapshot Location

**VPS Path**: `/var/lib/firecracker/snapshots/base/golden-rootfs.ext4`
**Last Modified**: Nov 17 20:30 UTC
**Has**: VNC services, but they don't work reliably
**Missing**: Node v20, CLI tools, systemd x11vnc service

## Critical System Logic to Understand

### OAuth Credential Flow (28 Steps - Documented):

**Read**: `MASTER_DOCUMENTATION_COMPLETE_SYSTEM.md` section 6 for complete 28-step flow

**Key Points**:
1. **Browser VM** is ephemeral (30 min lifetime)
2. **CLI VM** is persistent (holds credentials forever)
3. **Credentials detected** by monitoring browser OAuth redirects
4. **Credentials saved** to database (encrypted)
5. **Credentials transferred** to CLI VM via rootfs mount
6. **Browser VM destroyed** 30 minutes after completion

### Timing (Critical):
- **VM Boot**: ~15 seconds
- **Service Startup**: 45 seconds (OAuth agent on port 8080)
- **Credential Polling**: Every 2 seconds
- **OAuth Timeout**: 5 minutes for user to complete
- **Browser VM Cleanup**: 30 minutes after completion

### Integration (NO CODE CHANGES):
- Frontend (`/dashboard/remote-cli`) works as-is
- Backend (`browser-vm-auth.js`) works as-is
- Only golden snapshot changes

## What I Need You To Do

**CRITICAL FIRST STEP**: Read `MASTER_DOCUMENTATION_COMPLETE_SYSTEM.md` to understand:
- Complete OAuth flow (28 steps)
- Credential detection mechanism
- CLI VM vs Browser VM distinction
- Database schema and session states
- Timing requirements

**Phase 1**: Build comprehensive golden rootfs with:
- **Node v20** (REQUIRED - verify: `node --version`)
- **CLI Tools** (REQUIRED - verify: `which codex claude gemini`):
  - `npm install -g @openai/codex`
  - `npm install -g @anthropic-ai/claude-code`
  - `npm install -g @google/gemini-cli`
- **x11vnc systemd service** with `Restart=on-failure` (NOT bash script)
- **Xvfb systemd service**
- **Terminal auto-launch** via `/etc/xdg/autostart/terminal.desktop`
- **Proxy template** in `/etc/profile.d/decodo-proxy.sh`
- **Chrome browser**

**Phase 2**: Test in chroot before deploying:
- Verify Node v20: `chroot rootfs node --version`
- Verify CLI tools: `chroot rootfs which codex claude gemini`
- Verify systemd services exist and enabled
- Verify x11vnc executable: `chroot rootfs which x11vnc`

**Phase 3**: Deploy and create test Browser VM:
- Replace golden snapshot
- Create Browser VM via `/api/vm/auth`
- Wait 45 seconds for services
- Test VNC: `nc -zv 192.168.100.X 5901`
- Test noVNC connection from browser

**Phase 4**: Validate end-to-end OAuth flow:
- Visit `/dashboard/remote-cli`
- Click "Connect" on Codex
- See desktop (browser + terminal visible)
- Complete OAuth
- Verify credentials saved
- Verify CLI VM received credentials

**Phase 5**: Validate all 10 success criteria

**Key Understanding**:
- OAuth agent (server.js) REQUIRES Node v20 and CLI tools to work
- VNC MUST be systemd service (not supervisor script) for stability
- Proxy configured via /etc/profile.d (loaded by shells)
- ALL existing logic preserved - only golden snapshot changes

## Success Criteria (All Must Pass)

1. ✅ VM boots in <30 seconds
2. ✅ VNC connects via noVNC
3. ✅ Terminal visible on desktop
4. ✅ Browser visible on desktop
5. ✅ Can type in terminal
6. ✅ Can navigate in browser
7. ✅ Internet works: `curl https://claude.ai` succeeds
8. ✅ CLI tools work: `codex`, `claude`, `gemini` execute
9. ✅ VM stays alive 30+ minutes
10. ✅ No crashes or disconnects

## Important Notes

- **Don't** try to modify VMs at runtime (causes all the issues)
- **Do** use systemd services (production best practice)
- **Do** build everything into golden rootfs
- **Do** use `dd` for full copy (not CoW)
- **Do** test in chroot before deploying

## Reference Systems

- **OnKernel/Kernel**: https://github.com/onkernel/kernel-images (Unikraft-based, WebRTC, <325ms boot)
- **Daytona**: https://github.com/daytonaio/daytona (Container-based, pre-built envs)

Follow their approach: pre-built images, minimal runtime config, systemd services.

---

**Expected Time**: 4-5 hours for complete stable implementation
**Goal**: Production-grade browser VM system that actually works
