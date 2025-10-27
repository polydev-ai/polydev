# Firefox Browser Auto-Launch Debug Handoff

## ISSUE SUMMARY
Browser window is NOT opening automatically during OAuth authentication in Firecracker VMs.
- Claude CLI starts and outputs OAuth URL correctly
- Master controller receives the URL
- But NO browser window appears in the VM's noVNC display
- User sees terminal only, no Firefox window

## VPS CREDENTIALS & ACCESS
- **VPS Host**: `root@135.181.138.102`
- **VPS Password**: `Venkatesh4158198303`
- **SSH Command**: `sshpass -p "Venkatesh4158198303" ssh -o StrictHostKeyChecking=no root@135.181.138.102`

## SYSTEM ARCHITECTURE

### 1. Master Controller (on VPS)
- **Location**: `/opt/master-controller/` on VPS
- **Port**: 4000
- **Main Service**: `node /opt/master-controller/src/index.js`
- **Git Repo**: `/Users/venkat/Documents/polydev-ai/master-controller/`
- **Responsibilities**:
  - Creates Firecracker VMs from golden image
  - Proxies OAuth requests to Browser VMs
  - Manages VM lifecycle

### 2. Browser VMs (Firecracker)
- **Type**: Firecracker microVMs (lightweight Linux VMs)
- **Golden Image Location**: `/var/lib/firecracker/snapshots/base/golden-rootfs.ext4`
- **Kernel**: `/var/lib/firecracker/snapshots/base/vmlinux`
- **Network**: TAP bridge 192.168.100.0/24
- **Display**: Xvfb on DISPLAY=:1 (1280x800x24)
- **Window Manager**: openbox
- **VNC**: vncserver on port 5901 (proxied via noVNC)
- **HTTP Agent Port**: 8080 (internal to VM)

### 3. VM Browser Agent (inside each Browser VM)
- **Location in VM**: `/opt/vm-browser-agent/server.js`
- **Source Repository**: `/Users/venkat/Documents/polydev-ai/vm-agent/vm-browser-agent.js`
- **Systemd Service**: `/etc/systemd/system/vm-browser-agent.service`
- **Port**: 8080 (HTTP server)
- **Responsibilities**:
  - Spawns CLI tool (claude, codex, gemini-cli)
  - Captures OAuth URL from CLI output
  - Launches Firefox with OAuth URL
  - Proxies OAuth callback responses
  - Monitors credential files for auth completion

### 4. Golden Image Build Script
- **Location**: `/opt/master-controller/scripts/build-golden-snapshot-complete.sh`
- **Rebuilt**: October 27, 2025 18:00 UTC
- **Includes**:
  - Ubuntu 22.04 base
  - GUI stack (Xvfb, openbox, VNC, noVNC)
  - Firefox browser
  - Claude CLI, Codex CLI, Gemini CLI
  - vm-browser-agent service (enabled on boot)

## CURRENT TEST SESSION DATA

### Latest Browser VM Created
- **Session ID**: `b52143e8-b170-4e95-a746-99ecddb40b4f`
- **Provider**: `claude_code`
- **VM IP**: `192.168.100.13`
- **Master Controller URL**: `http://135.181.138.102:4000/api/auth/session/b52143e8-b170-4e95-a746-99ecddb40b4f/credentials/status`

### What Happens
1. User visits: `http://localhost:3000/dashboard/remote-cli/auth?session=b52143e8-b170-4e95-a746-99ecddb40b4f&provider=claude_code`
2. Master controller calls: `POST http://192.168.100.13:8080/auth/claude_code`
3. Browser VM's vm-browser-agent receives request
4. Agent spawns Claude CLI which outputs OAuth URL
5. Agent should capture URL and launch Firefox
6. **FAILS HERE** - Firefox doesn't open

## CODE LOCATIONS & RECENT CHANGES

### vm-browser-agent.js (Main OAuth Agent)
- **File**: `/Users/venkat/Documents/polydev-ai/vm-agent/vm-browser-agent.js`
- **Lines 207-303**: Firefox launch logic with wrapper script
- **Recent Commit**: `4d33a57` "Fix: Improve Firefox browser auto-launch with wrapper script and enhanced diagnostics"
- **Key Change**: Uses bash wrapper script to launch Firefox instead of direct spawn
- **Wrapper Script Location in VM**: `/tmp/firefox-launcher.sh` (created at runtime)
- **Firefox Log Location in VM**: `/tmp/firefox-launch.log` (written by wrapper)
- **Service Log Location in VM**: Systemd journal (StandardOutput=journal)

### vm-browser-agent.service (Systemd Service)
- **File**: `/Users/venkat/Documents/polydev-ai/vm-agent/vm-browser-agent.service`
- **Deployed To**: `/etc/systemd/system/vm-browser-agent.service` (inside golden image)
- **Environment Variables**:
  - DISPLAY=:1
  - HOME=/root
  - NODE_ENV=production
  - XAUTHORITY=/root/.Xauthority
- **Logs**: StandardOutput=append:/tmp/vm-browser-agent.log, StandardError=append:/tmp/vm-browser-agent-error.log

### Golden Image Build Script
- **File**: `/opt/master-controller/scripts/build-golden-snapshot-complete.sh`
- **Lines 282-352**: vm-browser-agent installation section
- **Copies from**: `/opt/master-controller/vm-browser-agent/server.js` → golden image `/opt/vm-browser-agent/server.js`
- **Enables service**: `chroot rootfs systemctl enable vm-browser-agent.service`

### Master Controller OAuth Routes
- **File**: `/Users/venkat/Documents/polydev-ai/master-controller/src/routes/auth.js`
- **POST /api/auth/start** (line 21): Initiates OAuth flow
- **POST /auth/{provider}** (line 444 in browser-vm-auth.js): Calls Browser VM agent

## DEBUGGING STEPS TO PERFORM

### Step 1: Access Running Browser VM
```bash
# SSH to VPS
sshpass -p "Venkatesh4158198303" ssh -o StrictHostKeyChecking=no root@135.181.138.102

# Find running Firecracker VMs
ps aux | grep firecracker

# Get VM socket info and connect via bash
# The VM runs in a container or with specific PID
# Use noVNC to connect: http://135.181.138.102:6080
```

### Step 2: Check VM-Browser-Agent Logs Inside VM
```bash
# These logs are written inside the running VM
# Access via: SSH to VM IP (192.168.100.13) or mount rootfs

# Option A: If you can SSH to VM IP
ssh -o StrictHostKeyChecking=no root@192.168.100.13

# Option B: Mount the VM's rootfs from host
# Find the running VM's rootfs file
find /var/lib/firecracker -name "rootfs.ext4" -newer /var/lib/firecracker/snapshots/base/golden-rootfs.ext4

# Mount it
mkdir -p /mnt/vm-debug
mount -o loop /path/to/vm/rootfs.ext4 /mnt/vm-debug

# Check logs
tail -200 /mnt/vm-debug/tmp/vm-browser-agent.log
tail -200 /mnt/vm-debug/tmp/vm-browser-agent-error.log
tail -200 /mnt/vm-debug/tmp/firefox-launch.log
```

### Step 3: Check Systemd Service Status Inside VM
```bash
# Inside VM or mounted rootfs
journalctl -u vm-browser-agent.service -n 100
systemctl status vm-browser-agent.service
ps aux | grep vm-browser-agent
ps aux | grep firefox
```

### Step 4: Verify X11 Display Server
```bash
# Inside VM or mounted rootfs
ps aux | grep -E "Xvfb|vncserver|openbox"
DISPLAY=:1 xset q  # Test X11 connectivity
ls -la /root/.Xauthority
```

### Step 5: Test Firefox Directly
```bash
# Inside VM
DISPLAY=:1 HOME=/root XAUTHORITY=/root/.Xauthority /usr/bin/firefox https://accounts.anthropic.com/oauth/authorize &
# Check for errors and window appearance
```

## KEY FILES TO EXAMINE

### On Host VPS
```
/tmp/master-controller.log              # Master controller logs
/tmp/vm-browser-agent.log               # Agent logs (if running on host)
/var/lib/firecracker/snapshots/base/    # Golden image location
/opt/master-controller/src/             # Master controller source
```

### Inside Browser VM (via mount or SSH)
```
/tmp/vm-browser-agent.log               # Agent startup/request logs
/tmp/vm-browser-agent-error.log         # Agent error logs
/tmp/firefox-launcher.sh                # Firefox wrapper script
/tmp/firefox-launch.log                 # Firefox startup logs
/opt/vm-browser-agent/server.js         # Agent code
/etc/systemd/system/vm-browser-agent.service
/root/.mozilla/firefox/                 # Firefox profiles
```

## POSSIBLE ROOT CAUSES TO INVESTIGATE

1. **vm-browser-agent service not starting** 
   - Check systemd journal in VM
   - May have dependency issues with vncserver/xvfb

2. **Firefox can't connect to X11 display**
   - DISPLAY=:1 not set correctly
   - XAUTHORITY permissions issue
   - Xvfb not actually running

3. **Firefox hanging/crashing silently**
   - Check /tmp/firefox-launch.log
   - May need to clear stale profiles

4. **Network issues between master and VM**
   - Test: `curl -v http://192.168.100.13:8080/health` from master

5. **Claude CLI not producing output**
   - Agent not capturing stdout/stderr
   - CLI crashes before outputting URL

6. **Agent code path not being reached**
   - OAuth URL extraction regex failing
   - Browser launch code not executing

## LATEST DEPLOYED CODE (as of Oct 27 18:00 UTC)

### vm-browser-agent.js Lines 207-303
```javascript
// Automatically open browser with OAuth URL
const { spawn: spawnBrowser, exec } = require('child_process');
logger.info('Auto-opening browser with OAuth URL', { oauthUrl, display: cliEnv.DISPLAY, home: cliEnv.HOME });

// Launch Firefox with robust error handling and improved diagnostics
const browserCommand = '/usr/bin/firefox';
logger.info('Attempting to spawn browser', {
  browserCommand,
  url: oauthUrl,
  display: cliEnv.DISPLAY,
  home: cliEnv.HOME,
  xauthority: cliEnv.XAUTHORITY
});

// Create a wrapper script to ensure Firefox launches properly
const wrapperScript = `
#!/bin/bash
export DISPLAY=${cliEnv.DISPLAY}
export HOME=${cliEnv.HOME}
export XAUTHORITY=${cliEnv.XAUTHORITY}
export LOGFILE="/tmp/firefox-launch.log"

echo "Firefox launch starting at \$(date)" >> \$LOGFILE
echo "DISPLAY=\$DISPLAY" >> \$LOGFILE
echo "HOME=\$HOME" >> \$LOGFILE
echo "XAUTHORITY=\$XAUTHORITY" >> \$LOGFILE

# Check if display exists
if ! DISPLAY=\$DISPLAY xset q &>/dev/null; then
  echo "X11 display check failed" >> \$LOGFILE
fi

# Ensure Firefox doesn't have stale profile lock
rm -rf "\$HOME/.mozilla/firefox"/*.default*/lock 2>/dev/null

# Launch Firefox
exec /usr/bin/firefox "${oauthUrl}" >> \$LOGFILE 2>&1
`;

// Write and execute wrapper script
const fs = require('fs');
const wrapperPath = '/tmp/firefox-launcher.sh';

try {
  fs.writeFileSync(wrapperPath, wrapperScript, { mode: 0o755 });
  // ... spawn browser process ...
} catch (err) {
  logger.error('Failed to launch browser via wrapper', { error: err.message });
}
```

## TEST PROCEDURE FOR NEXT MODEL

1. **Trigger new Browser VM creation**
   - Access http://localhost:3000/dashboard/remote-cli
   - Click "Claude Code" button
   - Note the session ID from URL

2. **Monitor master controller logs**
   - `tail -f /tmp/master-controller.log` on VPS
   - Watch for "Starting authentication" and "CLI OAuth flow started"

3. **Access VM via noVNC**
   - URL will be shown in master controller response
   - VNC Password: `polydev123`

4. **Check VM-Browser-Agent is running**
   - Inside VM: `systemctl status vm-browser-agent`
   - Inside VM: `ps aux | grep node`

5. **Check Firefox logs**
   - Inside VM: `tail -f /tmp/firefox-launch.log`
   - Inside VM: `tail -f /tmp/vm-browser-agent.log`

6. **Trigger OAuth flow**
   - Master controller will call: `POST http://192.168.100.13:8080/auth/claude_code`
   - Watch logs in step 5 for what happens

7. **If Firefox still doesn't open**
   - Check: `ps aux | grep firefox` in VM
   - Check: `DISPLAY=:1 xset q` in VM
   - Check: `journalctl -u vm-browser-agent.service` in VM
   - Check: `/tmp/firefox-launch.log` contents

## GIT COMMIT HISTORY
- `4d33a57`: Fix Firefox with wrapper script (Oct 27)
- `1405692`: Use Firefox directly (Oct 27)  
- `c94be41`: Replace xdg-open with sensible-browser (Oct 27)
- Earlier: Network and xdg-open DISPLAY fixes

## IMPORTANT NOTES
- Golden image was rebuilt Oct 27 18:00 UTC with latest code
- All NEW VMs created after that rebuild will have the Firefox wrapper fix
- Previous VMs won't have the fix (they use older golden snapshot)
- The master-controller IS working - it connects to VMs and gets responses
- The issue is specifically that Firefox window doesn't appear
