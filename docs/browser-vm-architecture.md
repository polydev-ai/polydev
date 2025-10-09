# Browser VM Architecture

## Overview

The Remote CLI Tools feature uses **browser-in-browser** technology to allow users to manually authenticate to their CLI tool subscriptions (Claude Code, Codex, Gemini CLI) in an isolated Firecracker VM environment.

**Key Point**: We are **NOT** automating OAuth. Users manually enter credentials in a real browser running in a VM, which they control via a web-based VNC interface (like Replit's browser experience).

## Architecture Flow

```
┌──────────────┐         ┌──────────────────┐         ┌──────────────┐
│              │         │  Browser VM      │         │              │
│  User's      │ WebRTC/ │                  │   VM    │  CLI VM      │
│  Browser     │ noVNC   │  ┌────────────┐  │ Network │              │
│              ├────────>│  │  Chromium  │  │<───────>│  ┌────────┐  │
│  (Chrome/    │         │  │  Browser   │  │         │  │ Claude │  │
│   Firefox)   │         │  └────────────┘  │         │  │  Code  │  │
│              │         │         ↑         │         │  └────────┘  │
│              │         │         │         │         │              │
│              │         │  ┌──────┴──────┐ │         │              │
│              │         │  │ VNC Server  │ │         │              │
│              │         │  │ (TigerVNC)  │ │         │              │
│              │         │  └─────────────┘ │         │              │
│              │         │         ↑         │         │              │
│              │         │  ┌──────┴──────┐ │         │              │
│              │         │  │   noVNC     │ │         │              │
│              │         │  │ Web Client  │ │         │              │
│              │         │  └─────────────┘ │         │              │
│              │         │         ↑         │         │              │
│              │         │  ┌──────┴──────┐ │         │              │
│              │         │  │   Browser   │ │         │              │
│              │         │  │    Agent    │ │         │              │
│              │         │  │  (Port 8080)│ │         │              │
│              │         │  └─────────────┘ │         │              │
└──────────────┘         └──────────────────┘         └──────────────┘
                                   ↑
                                   │
                         ┌─────────┴─────────┐
                         │                   │
                         │ Master Controller │
                         │  (Host Machine)   │
                         │                   │
                         └───────────────────┘
```

## Components

### 1. Browser VM (Firecracker)

**Purpose**: Provides isolated browser environment for manual OAuth authentication

**Components**:
- **Ubuntu 22.04** - Base OS
- **LXDE** - Lightweight desktop environment
- **TigerVNC Server** - VNC server on port 5901
- **noVNC** - Web-based VNC client on port 6080
- **Chromium Browser** - Web browser for authentication
- **Browser Agent** - Node.js HTTP server on port 8080

**VM Specs**:
- vCPUs: 2
- RAM: 2048 MB
- Disk: 8 GB (golden snapshot)
- Network: Bridged to fcbr0

### 2. Browser Agent (Node.js)

**Purpose**: HTTP API for managing authentication sessions

**Endpoints**:

- `GET /health` - Health check
  ```json
  {
    "status": "ok",
    "vncRunning": true,
    "browserRunning": false
  }
  ```

- `POST /auth/:provider` - Start auth session
  ```json
  Request: { "sessionId": "session-123" }
  Response: {
    "success": true,
    "message": "Browser opened. Complete authentication in VNC session.",
    "vncUrl": "http://VM_IP:6080/vnc.html",
    "provider": "claude_code"
  }
  ```

- `GET /credentials/status?provider=claude_code` - Check if authenticated
  ```json
  {
    "authenticated": true,
    "path": "/root/.claude/credentials.json",
    "modifiedAt": "2025-10-09T..."
  }
  ```

- `POST /credentials/extract` - Extract credentials after manual auth
  ```json
  Request: { "provider": "claude_code", "sessionId": "session-123" }
  Response: {
    "success": true,
    "credentials": {
      "sessionToken": "...",
      "cookies": {...}
    }
  }
  ```

### 3. Master Controller

**Purpose**: Orchestrates VM lifecycle and authentication flow

**Updated Flow** (browser-vm-auth.js):

```javascript
async authenticateClaudeCode(sessionId, vmIP) {
  // 1. Call agent to open browser
  const response = await fetch(`http://${vmIP}:8080/auth/claude_code`, {
    method: 'POST',
    body: JSON.stringify({ sessionId })
  });

  const { vncUrl } = await response.json();

  // 2. Store VNC URL in session for user to access
  await db.authSessions.update(sessionId, {
    vnc_url: vncUrl,
    status: 'awaiting_user_auth'
  });

  // 3. Poll for authentication completion
  // User will click "I've completed auth" button in UI
  // Or we can poll credential status endpoint

  // 4. Extract credentials after user completes auth
  const credResponse = await fetch(`http://${vmIP}:8080/credentials/extract`, {
    method: 'POST',
    body: JSON.stringify({ provider: 'claude_code', sessionId })
  });

  const { credentials } = await credResponse.json();

  return credentials;
}
```

### 4. Frontend (Next.js)

**New Component**: VNC Viewer Page

```typescript
// app/auth/[sessionId]/page.tsx
export default function AuthSessionPage({ params }: { params: { sessionId: string } }) {
  const [session, setSession] = useState(null);

  useEffect(() => {
    // Poll for session status
    const interval = setInterval(async () => {
      const res = await fetch(`/api/auth/session/${params.sessionId}`);
      const data = await res.json();
      setSession(data.session);
    }, 2000);

    return () => clearInterval(interval);
  }, [params.sessionId]);

  if (session?.status === 'awaiting_user_auth') {
    return (
      <div>
        <h1>Authenticate to {session.provider}</h1>
        <p>Complete authentication in the browser below:</p>

        {/* Embed noVNC iframe */}
        <iframe
          src={session.vnc_url}
          width="1280"
          height="720"
          frameBorder="0"
        />

        <button onClick={handleCompleted}>
          I've Completed Authentication
        </button>
      </div>
    );
  }

  return <div>Loading...</div>;
}
```

## User Flow

### Step-by-Step

1. **User Initiates Auth**
   - User clicks "Connect Claude Code" in dashboard
   - Frontend calls `POST /api/auth/start`
   - Master Controller creates Browser VM

2. **VM Boots**
   - Firecracker starts VM from golden snapshot
   - VNC server starts (port 5901)
   - noVNC web client starts (port 6080)
   - Browser Agent starts (port 8080)
   - LXDE desktop environment loads

3. **Browser Opens**
   - Master Controller calls `POST /auth/claude_code` on agent
   - Agent launches Chromium in DISPLAY=:1 (VNC display)
   - Chromium navigates to provider's OAuth page

4. **User Sees Browser**
   - Frontend shows page with embedded noVNC iframe
   - User sees Chromium browser running in VM
   - User manually enters email/password
   - User completes 2FA if required
   - User completes OAuth flow

5. **Credentials Captured**
   - User clicks "I've Completed Authentication"
   - Frontend calls agent to extract credentials
   - Agent reads Chromium's cookie database
   - Agent extracts session tokens/cookies
   - Agent returns credentials to Master Controller

6. **Credentials Transferred**
   - Master Controller encrypts credentials
   - Credentials written to user's CLI VM
   - CLI tool (claude-code) can now authenticate

7. **Cleanup**
   - Browser VM destroyed
   - Session marked as complete
   - User can now use CLI tool

## Golden Snapshot Contents

### Installed Software

- **Base System**
  - Ubuntu 22.04 LTS
  - systemd, networkd, resolved
  - Python 3, sqlite3

- **Desktop Environment**
  - Xorg
  - LXDE (Lightweight X11 Desktop Environment)
  - LXTerminal

- **VNC Stack**
  - TigerVNC Server (Xvnc)
  - noVNC (web VNC client)
  - websockify (WebSocket proxy)

- **Browser**
  - Chromium Browser
  - Chrome codecs (H.264, etc.)
  - Fonts (Liberation, Noto Emoji)
  - All required libraries

- **Runtime**
  - Node.js 20 LTS
  - npm

- **Browser Agent**
  - Node.js HTTP server
  - Credential extraction logic

### Services (systemd)

1. `vncserver@1.service` - VNC server on display :1
2. `novnc.service` - noVNC web client
3. `vm-browser-agent.service` - HTTP API server

### Ports

| Port | Service | Purpose |
|------|---------|---------|
| 5901 | TigerVNC | VNC protocol |
| 6080 | noVNC | WebSocket VNC client |
| 8080 | Browser Agent | HTTP API |

### File Structure

```
/opt/vm-browser-agent/
├── server.js          # Main HTTP server
├── package.json       # Dependencies
└── node_modules/      # (none currently)

/root/.vnc/
├── config             # VNC configuration
├── passwd             # VNC password (encrypted)
└── xstartup           # VNC startup script (launches LXDE)

/usr/share/novnc/      # noVNC web client files
```

## Building the Golden Snapshot

### Prerequisites

On the host (Mini PC):
```bash
sudo apt-get install debootstrap
```

### Build Command

```bash
sudo /opt/master-controller/scripts/build-golden-snapshot-complete.sh
```

This will:
1. Create 8GB ext4 rootfs
2. Bootstrap Ubuntu 22.04
3. Configure networking (static IP)
4. Install desktop environment (LXDE)
5. Install VNC server (TigerVNC)
6. Install noVNC web client
7. Install Chromium browser
8. Install Node.js and browser agent
9. Configure systemd services
10. Create golden snapshot at `/var/lib/firecracker/snapshots/base/golden-rootfs.ext4`

**Build Time**: ~30-45 minutes
**Snapshot Size**: ~4-5 GB
**Download**: ~2 GB (packages)

### Testing the Snapshot

After building, test locally:

```bash
# Create test VM directory
sudo mkdir -p /var/lib/firecracker/users/test-vm
sudo cp --reflink=auto /var/lib/firecracker/snapshots/base/golden-rootfs.ext4 \
  /var/lib/firecracker/users/test-vm/rootfs.ext4

# Create TAP device
sudo ip tuntap add fc-test mode tap
sudo ip link set fc-test master fcbr0
sudo ip link set fc-test up

# Start Firecracker
sudo firecracker \
  --api-sock /tmp/test-vm.sock \
  --config-file /var/lib/firecracker/users/test-vm/vm-config.json

# In another terminal, access VNC
# Open browser to: http://192.168.100.2:6080/vnc.html
# Password: polydev123

# Check agent
curl http://192.168.100.2:8080/health

# Cleanup
sudo ip link delete fc-test
sudo rm -rf /var/lib/firecracker/users/test-vm
```

## Security Considerations

### VM Isolation

- Each Browser VM is ephemeral (destroyed after auth)
- VMs run in isolated Firecracker microVMs
- Network isolated via bridge (fcbr0)
- Only host can access VM ports

### Credential Handling

- Credentials extracted from browser cookies
- Encrypted before transfer to CLI VM
- Browser VM destroyed immediately after extraction
- No credentials stored in Browser VM snapshot

### VNC Security

- VNC only accessible from host (localhost binding)
- VNC password required
- noVNC served over HTTP (host-only network)
- Consider HTTPS for production

### Browser Security

- Chromium runs with standard security
- No --no-sandbox needed (VM is already sandboxed)
- User sees real browser UI
- User completes real OAuth flows

## Troubleshooting

### VNC Not Accessible

```bash
# SSH into host
ssh backspace@192.168.5.82

# Check if VM is running
ps aux | grep firecracker

# Get VM IP
# VMs use 192.168.100.2, 192.168.100.3, etc.

# Try VNC from host
vncviewer 192.168.100.2:5901

# Check noVNC
curl http://192.168.100.2:6080

# Check agent
curl http://192.168.100.2:8080/health
```

### Browser Not Starting

```bash
# The agent should start Chromium automatically
# Check agent logs in VM (if you can SSH/console in)

# Alternatively, check agent response:
curl -X POST http://192.168.100.2:8080/auth/claude_code \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test-123"}'
```

### Credential Extraction Fails

```bash
# Check if browser profile exists
# (requires console access to VM)
ls -la /root/.config/chromium/Default/Cookies

# Test extraction endpoint
curl -X POST http://192.168.100.2:8080/credentials/extract \
  -H "Content-Type: application/json" \
  -d '{"provider":"claude_code","sessionId":"test-123"}'
```

## Next Steps

1. **Build Golden Snapshot**
   ```bash
   sudo /opt/master-controller/scripts/build-golden-snapshot-complete.sh
   ```

2. **Update Master Controller**
   - Modify `browser-vm-auth.js` to use new flow
   - Add VNC URL to session data
   - Implement credential extraction

3. **Update Frontend**
   - Create VNC viewer page
   - Add "I've completed auth" button
   - Show authentication status

4. **Test End-to-End**
   - Create Browser VM
   - Access via noVNC
   - Manually authenticate
   - Extract credentials
   - Verify CLI tool works

## Reference

- [TigerVNC Documentation](https://tigervnc.org/)
- [noVNC Project](https://github.com/novnc/noVNC)
- [Firecracker Getting Started](https://github.com/firecracker-microvm/firecracker/blob/main/docs/getting-started.md)
- [LXDE Desktop](https://www.lxde.org/)
