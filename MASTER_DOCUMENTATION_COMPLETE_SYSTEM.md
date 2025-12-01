# MASTER DOCUMENTATION - Complete OAuth Browser VM System

**Created**: After 7+ hour debugging session
**Purpose**: Comprehensive documentation of entire system for next session
**Status**: System partially working, needs golden snapshot rebuild

---

## COMPLETE CODE ANALYSIS

### 1. Browser VM Auth Service (`browser-vm-auth.js`) - 1060 lines

**Purpose**: Orchestrates OAuth flow using ephemeral browser VMs

**Key Methods**:

**`startAuthentication(userId, provider, webrtcOffer)`** (lines 28-105):
- Creates auth_session in database
- Accepts optional WebRTC offer (for race condition fix)
- Stores offer BEFORE VM creation
- Returns sessionId immediately (<1 second)
- Starts VM creation in background

**`createVMAndStartOAuth(sessionId, userId, provider)`** (lines 111-284):
- STEP 1: Ensure CLI VM exists (persistent VM for running tools)
- STEP 2: Create Browser VM (ephemeral, for OAuth)
- Associates session with VM
- Waits for VM ready (45 second delay for services to start)
- Starts async OAuth flow
- On failure: Cleans up VMs

**`runAsyncOAuthFlow()`** (lines 289-398):
- Runs completely async (doesn't block HTTP response)
- Executes OAuth flow based on provider
- Stores credentials when captured
- Transfers to CLI VM
- Schedules Browser VM cleanup (30 minutes)

**`authenticateCLI(sessionId, vmIP, provider)`** (lines 537-731):
- POSTs to `http://VM_IP:8080/auth/{provider}`
- OAuth agent in VM starts CLI tool
- CLI tool opens OAuth URL in browser
- Polls `/credentials/status` every 2 seconds
- Max wait: 5 minutes for user completion
- When authenticated, retrieves credentials from `/credentials/get`

**`transferCredentialsToCLIVM(userId, provider, credentials)`** (lines 794-910):
- Mounts CLI VM rootfs.ext4
- Writes credentials to:
  - Codex: `/root/.codex/auth.json`
  - Claude Code: `/root/.config/claude/credentials.json`
  - Gemini: `/root/.gemini/oauth_creds.json`
- Unmounts filesystem
- These files persist in CLI VM for CLI tools to use

**Critical Timing**:
- `waitForVMReady()`: 45 second initial delay (OAuth agent startup time)
- Credential polling: Every 2 seconds for 5 minutes
- Browser VM cleanup: 30 minutes after completion

---

## 2. VM Manager Service (`vm-manager.js`) - 800+ lines

**Purpose**: Low-level VM creation, lifecycle management, Firecracker orchestration

**Key Methods**:

**`createVM(userId, vmType, ipAddress, reservedVMId, sessionId)`**:
- vmType: 'cli' or 'browser'
- Allocates IP from pool (192.168.100.2-254)
- Creates TAP network interface
- Clones golden snapshot
- Injects OAuth agent (for browser VMs)
- Launches Firecracker process
- Returns VM object with vmId, ipAddress

**`cloneGoldenSnapshot(vmId, vmType, userId, sessionId, ipAddress)`**:
- Uses `dd` for full copy (not CoW - recent fix)
- Runs e2fsck before and after modifications
- Configures network IP in systemd-networkd
- For browser VMs: calls `injectOAuthAgent()`

**`injectOAuthAgent(vmId, rootfsPath, userId, sessionId)`** (critical):
- Mounts rootfs.ext4
- Injects Decodo proxy to `/etc/environment`:
  ```
  HTTP_PROXY=http://username:password@dc.decodo.com:10001
  HTTPS_PROXY=...
  SESSION_ID=xyz
  ```
- Copies OAuth agent files to `/opt/vm-browser-agent/`:
  - server.js (OAuth detection)
  - webrtc-server.js (WebRTC streaming)
  - start-all.sh (supervisor script)
- Creates systemd service to run supervisor
- Unmounts rootfs

**Current Supervisor Script** (generated, lines 588-707):
- Starts OAuth agent (port 8080)
- Starts WebRTC server
- Monitors both, restarts if crash
- **Recently added**: VNC server and terminal launch

---

## 3. Frontend Flow

### `/dashboard/remote-cli/page.tsx` (Provider Selection)

**Shows**:
- 3 provider cards (Claude Code, Codex, Gemini)
- Connection status for each
- "Connect" buttons

**When User Clicks "Connect"**:
1. Calls `handleConnectProvider(providerId)` (current code: lines 124-214 creates WebRTC offer first)
2. POSTs to `/api/vm/auth` with provider
3. Receives sessionId
4. Redirects to `/dashboard/remote-cli/auth?session=X&provider=Y`

### `/dashboard/remote-cli/auth/page.tsx` (OAuth Flow View)

**Shows**:
- Loading states during VM creation
- WebRTC viewer when VM ready
- OAuth URL capture message
- Completion status

**Functionality**:
- Polls session status every 3 seconds
- Shows WebRTC desktop stream
- When OAuth completes: Shows success
- User can then use CLI tool

---

## 4. OAuth Agent (VM-Side)

**File**: `vm-browser-agent/server.js`

**Runs Inside Browser VM** on port 8080

**Endpoints**:
- `POST /auth/:provider` - Starts CLI tool OAuth flow
- `GET /credentials/status` - Returns if credentials captured
- `GET /credentials/get` - Returns actual credentials
- `GET /health` - Health check for VM readiness

**How It Captures Credentials**:
1. Launches browser with OAuth URL
2. Uses environment variable `BROWSER` to capture URL navigation
3. Monitors for OAuth callback (localhost:port/callback?code=...)
4. Extracts credentials from URL parameters
5. Stores in memory
6. Returns when backend polls

---

## 5. CLI VM vs Browser VM (Critical Distinction)

### CLI VM:
- **Purpose**: Run CLI tools with saved credentials
- **Lifetime**: Permanent (until manually deleted)
- **Golden Snapshot**: Basic CLI rootfs
- **Services**: SSH server (optional), credential files
- **Created**: Once per user
- **Destroyed**: Manually or never
- **Has Desktop**: No (headless)
- **Has VNC**: No
- **Proxy**: Yes (for CLI tool API calls)

### Browser VM:
- **Purpose**: Complete OAuth flow, capture credentials
- **Lifetime**: 30 minutes (ephemeral)
- **Golden Snapshot**: Enhanced with Node v20, VNC, desktop, CLI tools
- **Services**: OAuth agent, WebRTC server, VNC server, desktop
- **Created**: Per OAuth flow
- **Destroyed**: After credentials captured + 30 min grace
- **Has Desktop**: Yes (XFCE)
- **Has VNC**: Yes (port 5901)
- **Proxy**: Yes (for browser to reach OAuth providers)

---

## 6. Credential Flow (Step-by-Step)

1. **User clicks "Connect" on Codex** (frontend)
2. **POST /api/vm/auth** with provider='codex'
3. **Backend**: Creates auth_session in database
4. **Backend**: Creates/finds CLI VM (persistent)
5. **Backend**: Creates Browser VM (ephemeral)
6. **Backend**: Returns sessionId immediately
7. **Frontend**: Redirects to `/auth?session=X`
8. **Frontend**: Shows WebRTC viewer
9. **Backend**: Waits 45s for VM services to start
10. **Backend**: POSTs to Browser VM: `http://192.168.100.X:8080/auth/codex`
11. **OAuth Agent**: Starts Codex CLI tool
12. **CLI Tool**: Opens OAuth URL
13. **OAuth Agent**: Launches browser with URL
14. **Browser**: Shows Codex OAuth page
15. **User**: Completes OAuth in browser
16. **Browser**: Redirects to localhost callback
17. **OAuth Agent**: Captures credentials from callback URL
18. **Backend**: Polls `/credentials/status` every 2s
19. **Backend**: Gets "authenticated: true"
20. **Backend**: GETs `/credentials/get`
21. **Backend**: Saves credentials to database (encrypted)
22. **Backend**: Mounts CLI VM rootfs
23. **Backend**: Writes credentials to `/root/.codex/auth.json`
24. **Backend**: Unmounts CLI VM rootfs
25. **Backend**: Schedules Browser VM cleanup (30 min)
26. **Frontend**: Shows "Credentials captured! ✅"
27. **30 minutes later**: Browser VM destroyed
28. **CLI VM**: Still running, has credentials, ready for use

---

## 7. Database Schema

### auth_sessions Table:
```
session_id UUID PK
user_id UUID
provider TEXT ('codex', 'claude_code', 'gemini_cli')
status TEXT ('pending', 'vm_created', 'ready', 'awaiting_user_auth', 'authenticating', 'completed', 'failed', 'timeout', 'cancelled')
browser_vm_id TEXT
vm_ip TEXT
vnc_url TEXT
auth_url TEXT (OAuth URL to show user)
created_at TIMESTAMP
completed_at TIMESTAMP
timeout_at TIMESTAMP
error_message TEXT
webrtc_offer JSONB
webrtc_answer JSONB
```

### Session Lifecycle:
1. `pending` - Session created
2. `vm_created` - Browser VM created
3. `ready` - VM responding on port 8080
4. `awaiting_user_auth` - OAuth URL generated
5. `authenticating` - User completing OAuth
6. `completed` - Credentials captured and saved
7. (or `failed`, `timeout`, `cancelled`)

---

## 8. What the Golden Snapshot Rebuild Must Include

### Critical Requirements:

**Node v20** (NOT v12!):
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
node --version  # MUST show v20.x
```

**CLI Tools** (required for OAuth agent to work):
```bash
npm install -g @openai/codex
npm install -g @anthropic-ai/claude-code
npm install -g @google/gemini-cli
which codex claude gemini  # All MUST be found
```

**x11vnc Systemd Service** (NOT bash script):
```ini
[Service]
ExecStart=/usr/bin/x11vnc -display :1 -forever -shared -wait 50 -listen 0.0.0.0 -rfbport 5901 -passwd polydev123
Restart=on-failure
```

**Why Systemd**: Production x11vnc configs use systemd. Bash supervisor scripts don't auto-restart on crash.

**Proxy Template**:
```bash
# /etc/profile.d/decodo-proxy.sh
export HTTP_PROXY="${DECODO_HTTP_PROXY:-}"
export HTTPS_PROXY="${DECODO_HTTPS_PROXY:-}"
```

**At runtime**, vm-manager injects actual values.

---

## 9. Integration Points (NO CODE CHANGES NEEDED)

### Frontend:
- ✅ Works as-is
- ✅ `/dashboard/remote-cli` - provider selection
- ✅ `/dashboard/remote-cli/auth` - OAuth flow view
- ✅ WebRTC viewer component
- ✅ Credential status polling

### Backend:
- ✅ `/api/vm/auth` route - works as-is
- ✅ `browser-vm-auth.js` - works as-is
- ✅ OAuth detection - works as-is
- ✅ Credential encryption - works as-is
- ✅ WebRTC signaling - FIXED in this session

### What Changes:
- **ONLY**: Golden rootfs content
- **vm-manager.js**: Simplify injection (just proxy + SESSION_ID)
- **Remove**: Complex supervisor generation (use systemd)

---

## 10. Why Previous Attempts Failed

**Problem**: Runtime filesystem modifications
- Mounted rootfs.ext4
- Modified files
- Synced and unmounted
- Files didn't persist in VM clones

**Root Cause**: CoW snapshots, caching, or `dd` copy timing

**Solution**: Pre-build EVERYTHING in golden snapshot
- No runtime modifications needed
- systemd services pre-configured
- CLI tools pre-installed
- Just inject env vars at runtime

---

## 11. Success Validation

### After Golden Snapshot Rebuild:

**Test 1**: Create Browser VM, check services:
```bash
# On VPS:
sshpass -p "..." ssh root@VM_IP "systemctl status x11vnc"
# Should show: active (running)

sshpass -p "..." ssh root@VM_IP "which codex claude gemini"
# Should show: /usr/bin/codex, /usr/bin/claude, /usr/bin/gemini

sshpass -p "..." ssh root@VM_IP "node --version"
# Should show: v20.x
```

**Test 2**: VNC connectivity:
```bash
nc -zv 192.168.100.X 5901
# Should show: Connection succeeded
```

**Test 3**: OAuth flow end-to-end:
1. Visit `/dashboard/remote-cli`
2. Click "Connect" on Codex
3. See desktop in browser
4. See terminal + browser windows
5. Browser opens Codex OAuth
6. Complete OAuth
7. See "Credentials captured!"
8. Verify saved in database

---

## 12. Next Session Execution Plan

**Hour 1**: Build golden rootfs
- Install Node v20
- Install CLI tools
- Configure systemd services
- Test in chroot

**Hour 2**: Deploy and test
- Replace golden snapshot
- Create test Browser VM
- Verify all services running

**Hour 3**: End-to-end validation
- Complete full OAuth flow
- Verify credentials saved
- Verify CLI VM receives credentials

**Hour 4**: Fix any issues
- Buffer for problems
- Fine-tuning

**Hour 5**: Final validation
- Test all 3 providers
- Verify stability
- Document success

---

## FILES FOR NEXT SESSION

**Start Here**: `NEXT_SESSION_PROMPT.md` - Copy entire content as prompt
**Read Next**: This file (MASTER_DOCUMENTATION_COMPLETE_SYSTEM.md)
**Then Read**: `PRODUCTION_IMPLEMENTATION_PLAN.md` for build steps

**All the logic is preserved.** Only golden snapshot changes.

System is ready for production rebuild following Daytona/OnKernel best practices.
