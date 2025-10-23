# Browser-in-Browser OAuth Architecture

## Overview

The Polydev OAuth flow uses a **browser-in-browser** architecture where authentication happens entirely inside a Firecracker VM, not in the user's actual browser.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER'S COMPUTER                          │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │              User's Web Browser                       │ │
│  │         (Chrome/Firefox/Safari/etc.)                  │ │
│  │                                                       │ │
│  │  ┌─────────────────────────────────────────────────┐ │ │
│  │  │        Frontend (Next.js)                       │ │ │
│  │  │    http://localhost:3000/dashboard/remote-cli   │ │ │
│  │  │                                                 │ │ │
│  │  │  ┌───────────────────────────────────────────┐ │ │ │
│  │  │  │           IFRAME                          │ │ │ │
│  │  │  │                                           │ │ │ │
│  │  │  │    src="https://master.polydev.ai/       │ │ │ │
│  │  │  │         api/auth/session/XXX/novnc"      │ │ │ │
│  │  │  │                                           │ │ │ │
│  │  │  │    ┌───────────────────────────────────┐ │ │ │ │
│  │  │  │    │      noVNC Client                 │ │ │ │ │
│  │  │  │    │  (WebSocket to mini PC)          │ │ │ │ │
│  │  │  │    │                                   │ │ │ │ │
│  │  │  │    │  Shows remote desktop from VM →  │ │ │ │ │
│  │  │  │    └───────────────────────────────────┘ │ │ │ │
│  │  │  └───────────────────────────────────────────┘ │ │ │
│  │  └─────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ WebSocket over HTTPS
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              MINI PC (192.168.5.82)                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         Master Controller (Node.js)                 │   │
│  │           Port 4000 (proxied via Cloudflare)       │   │
│  │                                                     │   │
│  │  Routes /api/auth/session/XXX/novnc                │   │
│  │      → noVNC server inside Browser VM               │   │
│  └─────────────────────────────────────────────────────┘   │
│                            │                                │
│                            │ TAP network bridge              │
│                            ↓                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │      Firecracker Browser VM (192.168.100.X)         │   │
│  │                                                     │   │
│  │  ┌───────────────────────────────────────────────┐ │   │
│  │  │         Firefox Browser                       │ │   │
│  │  │   User sees THIS inside the iframe           │ │   │
│  │  │                                               │ │   │
│  │  │   1. Browser loads OAuth URL:                │ │   │
│  │  │      https://claude.ai/oauth/authorize?      │ │   │
│  │  │      redirect_uri=http://localhost:XXXXX     │ │   │
│  │  │                                               │ │   │
│  │  │   2. User authenticates with Claude.ai       │ │   │
│  │  │                                               │ │   │
│  │  │   3. Claude.ai redirects to:                 │ │   │
│  │  │      http://localhost:XXXXX/callback?code=.. │ │   │
│  │  └───────────────────────────────────────────────┘ │   │
│  │                    │                                │   │
│  │                    │ localhost connection           │   │
│  │                    ↓                                │   │
│  │  ┌───────────────────────────────────────────────┐ │   │
│  │  │      OAuth Agent (Node.js)                    │ │   │
│  │  │        Port XXXXX (random)                    │ │   │
│  │  │                                               │ │   │
│  │  │   - Receives callback from browser           │ │   │
│  │  │   - Extracts authorization code              │ │   │
│  │  │   - Exchanges for access token               │ │   │
│  │  │   - Stores in database                       │ │   │
│  │  └───────────────────────────────────────────────┘ │   │
│  │                                                     │   │
│  │  ┌───────────────────────────────────────────────┐ │   │
│  │  │         VNC Server (Port 5901)                │ │   │
│  │  └───────────────────────────────────────────────┘ │   │
│  │                    │                                │   │
│  │  ┌───────────────────────────────────────────────┐ │   │
│  │  │        noVNC Server (Port 6080)               │ │   │
│  │  │    Proxies VNC over WebSocket                 │ │   │
│  │  └───────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Why Localhost Redirect is CORRECT

### The Key Insight

Both the **browser** and the **OAuth agent** run inside the **SAME Firecracker VM**. This means:

1. ✅ Browser can reach `localhost:XXXXX` (it's on the same machine)
2. ✅ OAuth agent listens on `localhost:XXXXX` (inside the VM)
3. ✅ When Claude.ai redirects to `localhost:XXXXX/callback`, the connection stays inside the VM
4. ✅ No public redirect URL needed
5. ✅ No firewall/NAT traversal needed

### Why VM IP Would Be WRONG

If we used `redirect_uri=http://192.168.100.X:8080`:

1. ❌ Claude.ai would redirect browser to `http://192.168.100.X:8080/callback`
2. ❌ Browser (running INSIDE the VM) cannot reach the VM's external IP from inside
3. ❌ Connection would fail with "connection refused" or "network unreachable"
4. ❌ OAuth flow would break

## Component Roles

### User's Browser
- Shows the Next.js frontend
- Displays an **iframe** containing noVNC
- User never interacts directly with OAuth - it happens in the iframe

### Frontend (Next.js)
- Creates iframe with noVNC URL
- Polls for credential status
- Detects when OAuth completes
- Advances UI to next step

### noVNC Client (in iframe)
- Runs WebSocket client in user's browser
- Connects to noVNC server inside Browser VM
- Displays remote desktop (Firefox inside VM)
- User sees and interacts with Firefox through this

### Browser VM (Firecracker)
- Isolated Ubuntu 22.04 VM
- Runs Firefox browser (via VNC)
- Runs OAuth agent (on random localhost port)
- Runs VNC server (port 5901)
- Runs noVNC server (port 6080)

### Firefox (inside VM)
- Loads OAuth URL from Claude.ai
- User authenticates (inside the iframe)
- Redirects to `localhost:XXXXX/callback`
- Connects to OAuth agent on same machine

### OAuth Agent (inside VM)
- Listens on `localhost:XXXXX` (random port)
- Generates OAuth URL with localhost redirect
- Receives callback from Firefox
- Extracts authorization code
- Exchanges code for access token
- Stores credentials in Supabase database

### Master Controller
- Creates Browser VMs
- Proxies noVNC WebSocket connections
- Provides API for session management
- Polls VM health checks

## OAuth Flow Step-by-Step

1. **User visits frontend**
   ```
   http://localhost:3000/dashboard/remote-cli/auth
   ```

2. **Frontend creates session**
   ```
   POST /api/auth/start
   → Creates Browser VM
   → Returns session ID and noVNC URL
   ```

3. **Frontend shows iframe**
   ```html
   <iframe src="https://master.polydev.ai/api/auth/session/XXX/novnc">
   ```

4. **noVNC connects to VM**
   ```
   WebSocket: wss://master.polydev.ai/api/auth/session/XXX/novnc
   → Proxied to Browser VM at 192.168.100.X:6080
   → Shows Firefox desktop
   ```

5. **OAuth agent generates URL**
   ```
   https://claude.ai/oauth/authorize?
     redirect_uri=http://localhost:44445/callback
   ```

6. **Frontend fetches OAuth URL**
   ```
   GET /api/vm/auth/session/XXX/oauth-url
   → Returns OAuth URL
   → Frontend shows it in UI (for reference)
   ```

7. **User navigates in embedded browser**
   - User clicks inside iframe (noVNC)
   - Types OAuth URL or clicks link
   - Firefox (inside VM) loads Claude.ai OAuth page

8. **User authenticates**
   - User logs in with Claude.ai credentials
   - Authorizes access
   - Claude.ai redirects to `http://localhost:44445/callback?code=ABC123`

9. **Browser connects to OAuth agent**
   - Firefox (inside VM) connects to `localhost:44445`
   - OAuth agent (inside VM) receives callback
   - Localhost connection works because both are in same VM

10. **OAuth agent processes callback**
    - Extracts authorization code
    - Exchanges code for access token (calls Claude.ai API)
    - Stores credentials in Supabase database

11. **Frontend detects completion**
    ```
    GET /api/vm/auth/session/XXX/credentials-status
    → Returns {authenticated: true}
    → Frontend advances to "Complete" step
    ```

## Security Benefits

### Browser-in-Browser Isolation
- OAuth happens in isolated VM, not user's browser
- No cookies/credentials leak to user's browser
- VM destroyed after use (ephemeral)
- Credentials encrypted in database

### No Public Redirect URLs
- No need to register `http://localhost:*` with OAuth provider
- No callback server exposed to internet
- No firewall rules needed
- Works behind corporate firewalls/proxies

### Zero-Knowledge Architecture
- User's credentials never touch our servers in plain text
- Encrypted immediately in database
- Only user can decrypt (user-specific encryption key)

## Why Previous Implementation Was Wrong

### OLD (Popup Window)
```javascript
// page.tsx line 233
window.open(oauthUrl, '_blank', 'width=800,height=800...');
```

**Problem**: OAuth happened in user's actual browser, not in the VM browser. The `redirect_uri=http://localhost:XXXXX` would try to connect to user's local machine, not the VM.

**Result**: Connection failed because OAuth agent wasn't running on user's machine.

### NEW (Embedded Browser)
```javascript
<iframe src={vncUrl} className="w-full h-[600px]" />
```

**Solution**: OAuth happens in Firefox inside the VM (shown via noVNC). The `redirect_uri=http://localhost:XXXXX` connects to OAuth agent inside the same VM.

**Result**: Connection succeeds because both browser and OAuth agent are in the same VM.

## Implementation Files

### Frontend
- **`src/app/dashboard/remote-cli/auth/page.tsx`** - Shows noVNC iframe
- **`src/app/api/vm/auth/session/[sessionId]/oauth-url/route.ts`** - Fetches OAuth URL
- **`src/app/api/vm/auth/session/[sessionId]/credentials-status/route.ts`** - Polls for completion

### Backend (Master Controller)
- **`master-controller/src/routes/auth.js`** - Session management APIs
- **`master-controller/src/services/browser-vm-auth.js`** - Browser VM creation and health checks
- **`master-controller/src/services/vm-manager.js`** - Firecracker VM management

### Browser VM
- **`master-controller/vm-browser-agent/server.js`** - OAuth agent (runs inside VM)
- **`/var/lib/firecracker/snapshots/base/golden-rootfs.ext4`** - Golden snapshot with correct server.js

## Troubleshooting

### "ECONNREFUSED" errors during VM boot
**Status**: ✅ NORMAL - VM takes ~90 seconds to boot
**Action**: None - health checks will succeed once services start

### Frontend shows popup instead of iframe
**Status**: ❌ WRONG - Frontend not updated
**Fix**: Update `page.tsx` to show iframe with noVNC URL

### OAuth URL has VM IP redirect
**Status**: ❌ WRONG - Golden snapshot has old server.js
**Fix**: Rebuild golden snapshot with correct server.js

### Health checks never succeed
**Status**: ❌ ERROR - Services not starting in VM
**Check**: Console logs at `/var/lib/firecracker/users/vm-XXX/console.log`

## Conclusion

The browser-in-browser architecture enables secure OAuth authentication without requiring public redirect URLs or exposing credentials to the user's browser. The `localhost` redirect is correct because both the browser and OAuth agent run inside the same Firecracker VM.
