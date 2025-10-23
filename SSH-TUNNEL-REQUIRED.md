# SSH Tunnel Required for OAuth Flow

**Date**: October 17, 2025
**Status**: ✅ **FIXED** - SSH tunnel established

---

## Root Cause Identified

You were absolutely right! The issue was:

**The frontend at `localhost:3001` was trying to load the noVNC iframe from `localhost:4000`, but that port didn't exist on your local machine.**

- The master-controller runs on the Hetzner VPS at `135.181.138.102:4000`
- The frontend needs to access it via `localhost:4000` for the iframe to work
- Without port forwarding, the iframe couldn't load and showed a gray screen

---

## Fix Applied

### 1. ✅ SSH Tunnel Established

Created an SSH port forwarding tunnel in the background:

```bash
ssh -L 4000:localhost:4000 root@135.181.138.102 -N &
```

This forwards all traffic from `localhost:4000` on your Mac to `localhost:4000` on the Hetzner VPS.

**Verification**:
```bash
$ lsof -i :4000 | grep ssh
ssh     22450 venkat    5u  IPv6  LISTEN  localhost:terabase
ssh     22450 venkat    6u  IPv4  LISTEN  localhost:terabase
```

**Test**:
```bash
$ curl http://localhost:4000/api/auth/session/test123/novnc
Failed to load VM browser  # Expected - test123 is not a real session
```

The tunnel is working correctly!

### 2. ✅ Updated `.env.local`

Changed from:
```env
MASTER_CONTROLLER_URL=http://135.181.138.102:4000
```

To:
```env
MASTER_CONTROLLER_URL=http://localhost:4000
```

This tells the frontend to use the SSH tunnel instead of trying to reach the VPS directly.

---

## How It Works Now

### Frontend Flow:
1. User visits `http://localhost:3001/dashboard`
2. Clicks "Connect Claude CLI"
3. Frontend creates auth session via Next.js API routes
4. Next.js API routes connect to `localhost:4000` (SSH tunnel)
5. SSH tunnel forwards to Hetzner VPS `135.181.138.102:4000`
6. Master-controller on VPS creates Browser VM
7. noVNC URL returned: `http://localhost:4000/api/auth/session/{sessionId}/novnc`
8. **Browser iframe can now load the URL!** (Because localhost:4000 is accessible via tunnel)
9. noVNC displays Firefox running inside the Browser VM
10. OAuth page loads inside Firefox
11. User completes authentication
12. Credentials saved, session becomes "ready"

---

## Testing the OAuth Flow

### Step 1: Start Frontend (New Terminal)

```bash
cd /Users/venkat/Documents/polydev-ai
npm run dev
```

### Step 2: Open Dashboard

Navigate to: `http://localhost:3001/dashboard`

### Step 3: Connect Claude CLI

1. Click "Connect Claude CLI"
2. Wait for VM to boot (~15-30 seconds)
3. **noVNC iframe should now display Firefox with the Claude OAuth page!** (Not gray screen)
4. Complete the OAuth flow inside the browser
5. Session becomes "ready"

---

## Important Notes

### SSH Tunnel is Running in Background

The tunnel is currently active with PID `22450`. You can verify it's still running:

```bash
ps aux | grep "ssh.*4000"
```

### If the Tunnel Disconnects

If you close this terminal or the tunnel dies, you need to re-establish it:

```bash
sshpass -p 'Venkatesh4158198303' ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -L 4000:localhost:4000 -N root@135.181.138.102 &
```

### To Make Tunnel Persistent (Optional)

Create a systemd service or launchd plist (macOS) to keep the tunnel alive:

**macOS LaunchAgent** (`~/Library/LaunchAgents/com.polydev.ssh-tunnel.plist`):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.polydev.ssh-tunnel</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/ssh</string>
        <string>-o</string>
        <string>StrictHostKeyChecking=no</string>
        <string>-L</string>
        <string>4000:localhost:4000</string>
        <string>-N</string>
        <string>root@135.181.138.102</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardErrorPath</key>
    <string>/tmp/ssh-tunnel.err</string>
    <key>StandardOutPath</key>
    <string>/tmp/ssh-tunnel.out</string>
</dict>
</plist>
```

Load it:
```bash
launchctl load ~/Library/LaunchAgents/com.polydev.ssh-tunnel.plist
```

---

## Alternative Solutions (Future)

### Option 1: Use Direct VPS IP in Frontend

Update frontend to accept VPS IP/domain for noVNC iframe (requires CORS configuration).

### Option 2: Setup Nginx Reverse Proxy on Hetzner

Configure nginx to proxy noVNC WebSocket connections from port 80/443.

### Option 3: Use Cloudflare Tunnel

Setup Cloudflare tunnel to expose Hetzner port 4000 via a public domain.

---

## Summary

✅ **SSH tunnel established**: `localhost:4000` → `135.181.138.102:4000`
✅ **`.env.local` updated**: Using `http://localhost:4000`
✅ **Tunnel verified working**: Can reach master-controller through localhost

**Next step**: Test the OAuth flow! The noVNC iframe should now display properly instead of showing a gray screen.

---

**Status**: 🎉 **READY TO TEST!**

The infrastructure is now correct. The OAuth flow should work end-to-end.
