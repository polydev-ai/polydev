# Clean Restart Plan - Stable Browser VM System

## Current Problems (After 7 Hours):
1. Filesystem modifications don't persist
2. VNC server crashes after starting
3. Terminal doesn't launch reliably
4. Proxy configuration issues
5. Multiple layers of complexity

## New Approach - Learn from Daytona/OnKernel:

### Key Insight from Production Systems:
- **Daytona**: Uses pre-built container images with everything baked in
- **OnKernel**: Kernel images have all services pre-configured
- **Both**: Don't rely on runtime filesystem modifications

### Requirements (Confirmed):
1. **Node v20** - For CLI tools
2. **CLI Tools to Install**:
   - `npm i -g @openai/codex`
   - `npm install -g @anthropic-ai/claude-code`
   - `npm install -g @google/gemini-cli`
3. **Remote Desktop**: VNC/noVNC for interaction
4. **Proxy**: Decodo proxy per user (port 10001+)
5. **Stability**: System must be reliable, not fragile

## Proposed Clean Architecture:

### Option A: Pre-Built Golden Snapshot (Like Daytona)
**Build once, use many times**

1. **Create comprehensive golden rootfs** with EVERYTHING:
   - Node v20
   - All 3 CLI tools pre-installed globally
   - VNC server configured and enabled
   - Terminal auto-launch configured
   - XFCE desktop fully set up
   - All dependencies baked in

2. **Runtime injection** (minimal):
   - Only inject: SESSION_ID, proxy credentials
   - No file modifications, just env vars
   - Use systemd EnvironmentFile

3. **Benefits**:
   - No filesystem persistence issues
   - Everything works immediately
   - VMs are identical and stable
   - Easy to debug (one image)

### Option B: Docker-Based (Like Daytona's Approach)
**Use containers instead of VMs**

1. **Docker container** with:
   - Pre-built image with Node v20 + CLIs
   - VNC server in container
   - Proxy configured via env vars
   - Much simpler than Firecracker filesystem management

2. **Benefits**:
   - No filesystem mount/unmount issues
   - Standard Docker tooling
   - Proven stability
   - Easy updates

## Recommended Approach: **Option A** (Pre-Built Golden Snapshot)

### Implementation Steps:

**Phase 1: Build Comprehensive Golden Rootfs**
1. Install Node v20 (not v12)
2. Install all 3 CLI tools globally
3. Configure VNC to auto-start via systemd
4. Configure terminal auto-launch
5. Test everything works in golden image
6. Snapshot it

**Phase 2: Simplify VM Creation**
1. Use `dd` for full copy (already done)
2. Only inject SESSION_ID and proxy via env vars
3. No other filesystem modifications
4. VMs boot with everything working

**Phase 3: Verify Stability**
1. Create test VM
2. Verify VNC works
3. Verify terminal opens
4. Verify CLI tools accessible
5. Verify proxy works

## What to Keep from Current System:
- ✅ WebRTC signaling fixes (working)
- ✅ Firecracker VM orchestration (working)
- ✅ Proxy port management (working)
- ✅ Session management (working)

## What to Remove/Simplify:
- ❌ Runtime filesystem modifications (causes 90% of issues)
- ❌ CoW snapshots (persistence problems)
- ❌ Complex injection logic
- ❌ Per-VM service configuration

## Timeline for Clean Restart:
1. **Build golden snapshot**: 2-3 hours
2. **Test and verify**: 1 hour
3. **Deploy and validate**: 1 hour
4. **Total**: 4-5 hours (vs 7 hours debugging)

## Decision Point:
Do you want me to:
1. **Build comprehensive golden snapshot** (Option A)
2. **Investigate Docker approach** (Option B)
3. **Research Daytona/OnKernel more** before deciding

Given the time invested, I recommend **Option A** with a fresh session focused solely on building a stable golden rootfs with everything pre-configured.

What would you like to proceed with?
