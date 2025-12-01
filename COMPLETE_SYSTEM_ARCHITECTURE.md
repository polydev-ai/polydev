# Complete System Architecture - OAuth Browser VM System

## System Overview

**Purpose**: Allow users to authenticate CLI tools (Codex, Claude Code, Gemini) through a browser VM that captures OAuth credentials automatically.

**Flow**: User clicks "Connect" → Browser VM created → User completes OAuth in VM browser → Credentials captured → Saved to database → CLI VM receives credentials → Browser VM destroyed

---

## Current System Components

### Frontend (`/dashboard/remote-cli`)

**File**: `src/app/dashboard/remote-cli/page.tsx`

**Providers** (lines 45-70):
- `claude_code` - Anthropic Claude
- `codex` - OpenAI
- `gemini_cli` - Google Gemini

**User Flow**:
1. User sees 3 provider cards
2. Clicks "Connect" on a provider
3. Frontend calls `/api/vm/auth` with provider ID
4. Redirects to `/dashboard/remote-cli/auth?session=X&provider=Y`
5. Shows WebRTC viewer with VM desktop
6. Polls for OAuth completion
7. When complete, shows success

**Key Logic**:
- `loadOAuthStatus()` - Checks which providers are already connected
- `handleConnectProvider()` - Initiates auth flow
- Polling every 10 seconds for status

### Backend Flow

**Entry Point**: `POST /api/vm/auth` → `master-controller/src/routes/auth.js`

**Service**: `browser-vm-auth.js` - `startAuthentication()`

**Steps**:
1. **Create auth session** in database
2. **Create CLI VM** (if doesn't exist) - persistent, for running CLI tools
3. **Create Browser VM** (ephemeral) - for OAuth flow
4. **Wait for Browser VM ready** - health check on port 8080
5. **Start OAuth flow** - Opens OAuth URL in browser
6. **Monitor for credentials** - Polls OAuth agent for captured creds
7. **Save credentials** when detected
8. **Transfer to CLI VM** - Sends creds to persistent CLI VM
9. **Destroy Browser VM** after grace period (1-30 minutes)

### OAuth Agent (In Browser VM)

**File**: `vm-browser-agent/server.js`

**What It Does**:
1. Runs on port 8080 inside browser VM
2. **Launches browser** with OAuth URL
3. **Monitors browser** for OAuth redirects
4. **Captures credentials** from OAuth callback
5. **Stores them** in session
6. **Notifies backend** credentials are ready

**Detection Logic**:
- Watches for OAuth redirect URLs
- Extracts `code` or `access_token` parameters
- Saves to memory
- Backend polls `/session/:id/credentials/status`

### CLI VM Logic

**Purpose**: Persistent VM where CLI tools actually run

**Lifecycle**:
1. Created once per user
2. Stays alive indefinitely
3. Receives OAuth credentials when user authenticates
4. Stores credentials in `~/.config/provider/credentials`
5. CLI tools use these credentials

**Key Difference**:
- **CLI VMs**: Long-lived, no VNC, headless
- **Browser VMs**: Short-lived (30 min), has VNC+browser, destroyed after OAuth

---

## How Golden Snapshot Fits In

### Current Golden Snapshot:
**Path**: `/var/lib/firecracker/snapshots/base/golden-rootfs.ext4`
**Used For**: Browser VMs (OAuth)
**Has**:
- Ubuntu 22.04
- x11vnc, Xvfb, websockify
- Node.js (v12 - OLD)
- Chromium browser
- XFCE desktop

**Missing** (causes all issues):
- Node v20
- CLI tools (@openai/codex, @anthropic-ai/claude-code, @google/gemini-cli)
- Stable x11vnc configuration
- Terminal auto-launch
- Proxy configuration

### New Golden Snapshot (What to Build):

**Must Have** (in golden rootfs):
1. **Node v20** - Required for CLI tools
2. **CLI Tools** - All 3 installed globally:
   ```bash
   npm install -g @openai/codex
   npm install -g @anthropic-ai/claude-code
   npm install -g @google/gemini-cli
   ```
3. **VNC Server** - x11vnc as systemd service:
   ```ini
   [Service]
   ExecStart=/usr/bin/x11vnc -display :1 -forever -shared -wait 50 -listen 0.0.0.0 -rfbport 5901
   Restart=on-failure
   ```
4. **Terminal** - Auto-launch on desktop
5. **Browser** - Chrome with proxy support
6. **Proxy Template** - `/etc/profile.d/decodo-proxy.sh`

**Runtime Injection** (per VM):
- Proxy credentials (username:password@host:port)
- SESSION_ID environment variable
- That's it!

---

## Integration Points

### 1. Frontend Integration

**No Changes Needed**:
- Frontend flow stays the same
- Still redirects to `/dashboard/remote-cli/auth`
- Still shows WebRTC viewer
- Still polls for credentials

**What Will Improve**:
- VNC will actually work (can interact)
- Terminal will be visible
- Browser will have internet access
- More stable connection

### 2. Backend Integration

**Keep Existing**:
- `/api/vm/auth` route
- `browser-vm-auth.js` service
- OAuth detection logic
- Credential saving logic
- Browser VM cleanup logic

**Only Change**:
- VM creation uses new golden snapshot
- Injection is simpler (just proxy + SESSION_ID)
- No complex filesystem modifications

### 3. VM Manager Integration

**File**: `master-controller/src/services/vm-manager.js`

**Keep**:
- `createVM()` - VM orchestration
- `destroyVM()` - Cleanup
- Network configuration
- Firecracker process management

**Change**:
- `cloneGoldenSnapshot()` - Use new golden rootfs
- `injectOAuthAgent()` - Simpler (no file mods, just env vars)
- Remove complex supervisor script generation (systemd handles it)

### 4. OAuth Agent Integration

**File**: `vm-browser-agent/server.js`

**Keep**:
- OAuth URL detection
- Credential capture
- Browser launch logic
- API endpoints

**Improve**:
- Will have Node v20 (more stable)
- Proxy will work (internet access)
- Browser will launch reliably

---

## Complete System Flow (End-to-End)

### User Perspective:

1. Visit `http://localhost:3000/dashboard/remote-cli`
2. See 3 provider cards (Claude Code, Codex, Gemini)
3. Click "Connect" on desired provider
4. See "Creating VM..." loading state
5. VM desktop appears in browser (WebRTC)
6. **SEE**: Browser window + Terminal window on desktop
7. **OAuth URL opens** automatically in browser
8. **Complete OAuth** flow in browser
9. System detects completion
10. **Credentials saved** automatically
11. Success message shown
12. Can now use CLI tool in persistent CLI VM

### Behind the Scenes:

**A. Browser VM Creation** (10-15 seconds):
1. POST `/api/vm/auth` with provider
2. Backend creates auth_session in database
3. Creates/finds persistent CLI VM for user
4. Creates ephemeral Browser VM with:
   - New golden rootfs (Node v20, CLI tools, VNC)
   - Decodo proxy configured
   - SESSION_ID set
   - x11vnc systemd service starts automatically
   - Terminal launches automatically
   - WebRTC server starts

**B. VM Ready** (5 seconds):
1. VM boots
2. Systemd starts services (Xvfb, x11vnc, OAuth agent, WebRTC)
3. OAuth agent responds on port 8080
4. Backend detects "ready"

**C. OAuth Flow** (user-dependent):
1. OAuth agent launches browser with OAuth URL
2. User completes OAuth in browser
3. OAuth redirects to localhost callback
4. OAuth agent captures credentials from URL
5. Stores in memory

**D. Credential Detection** (polling):
1. Backend polls `/session/:id/credentials/status` every 2 seconds
2. OAuth agent returns credentials when available
3. Backend saves to database
4. Sends to CLI VM

**E. Cleanup** (30 minutes later):
1. Browser VM grace period expires
2. VM destroyed automatically
3. CLI VM keeps running with credentials

---

## CLI VM vs Browser VM

### CLI VM:
- **Lifetime**: Persistent (stays alive indefinitely)
- **Purpose**: Run CLI tools with saved credentials
- **Desktop**: No (headless)
- **Created**: Once per user
- **Destroyed**: Manually or on user deletion
- **Golden Snapshot**: Standard CLI rootfs

### Browser VM:
- **Lifetime**: Ephemeral (30 minutes max)
- **Purpose**: Complete OAuth flow, capture credentials
- **Desktop**: Yes (XFCE + VNC + WebRTC)
- **Created**: Per OAuth flow
- **Destroyed**: After credentials saved + grace period
- **Golden Snapshot**: Enhanced with Node v20 + VNC + CLI tools

---

## Database Schema

### auth_sessions Table:
```sql
- session_id (UUID, PK)
- user_id (UUID)
- provider (text) -- 'claude_code', 'codex', 'gemini_cli'
- status (text) -- 'pending', 'vm_created', 'ready', 'authenticating', 'completed', 'failed'
- browser_vm_id (text)
- vm_ip (text) -- Browser VM IP
- vnc_url (text)
- auth_url (text) -- OAuth URL
- created_at, completed_at, timeout_at
- webrtc_offer, webrtc_answer -- WebRTC signaling data
```

### Credential Flow:
1. OAuth agent captures creds
2. Stored in browser VM memory
3. Backend polls and retrieves
4. Saved to database (encrypted)
5. Transferred to CLI VM
6. CLI VM stores in `~/.config/provider/`

---

## What Needs to Be Added to Next Session Prompt

### Additional Context:

**OAuth Flow Logic**:
- Browser VM is EPHEMERAL (destroyed after use)
- CLI VM is PERSISTENT (keeps credentials)
- Credentials auto-detected via browser redirect monitoring
- 30-minute grace period for OAuth completion

**Frontend Files**:
- `/dashboard/remote-cli` - Provider selection
- `/dashboard/remote-cli/auth` - VM desktop viewer
- WebRTCViewer component - Desktop streaming
- No changes needed (will work with new golden snapshot)

**Backend Services**:
- `browser-vm-auth.js` - OAuth orchestration (KEEP)
- `vm-manager.js` - VM creation (simplify injection)
- `proxy-port-manager.js` - Decodo proxy allocation (KEEP)

**Key Existing Logic to Preserve**:
- OAuth URL detection
- Credential capture
- Auto-cleanup after completion
- WebRTC signaling (already fixed)

---

## Integration Strategy for New Golden Snapshot

### What Changes:
1. **Golden rootfs** - Rebuilt with Node v20, CLI tools, systemd services
2. **VM injection** - Simplified (only proxy + SESSION_ID)
3. **VNC stability** - systemd handles restart

### What Stays the Same:
1. **Frontend** - No changes
2. **OAuth detection** - No changes
3. **Database schema** - No changes
4. **API routes** - No changes (except WebRTC fixes)
5. **CLI VM logic** - No changes

### How to Deploy:
1. Build new golden rootfs
2. Test with one browser VM
3. Verify OAuth flow works end-to-end
4. Replace old golden snapshot
5. All new browser VMs use new snapshot
6. CLI VMs unaffected

---

## Summary for Next Session

**Read These Files** (in order):
1. `NEXT_SESSION_PROMPT.md` - Starting point with credentials
2. `COMPLETE_SYSTEM_ARCHITECTURE.md` - This file (system overview)
3. `PRODUCTION_IMPLEMENTATION_PLAN.md` - How to build golden snapshot
4. `COMPLETE_SYSTEM_PLAN_WITH_PROXY.md` - Detailed steps

**Goal**: Build new golden rootfs that makes browser VMs stable and fully functional

**Keep**: All existing OAuth logic, credential detection, frontend, CLI VMs

**Change**: Golden snapshot only (everything else stays)

**Expected**: After rebuilding golden snapshot, entire OAuth flow works reliably with no modifications to application logic.
