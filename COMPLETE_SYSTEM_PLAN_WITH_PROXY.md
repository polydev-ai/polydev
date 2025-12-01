# Complete Browser VM System - Production Implementation Plan

## Session Summary (7+ Hours)
**Achieved**: WebRTC signaling fixed, VNC infrastructure deployed
**Blocked By**: Filesystem persistence, VNC stability, Next.js cache
**Solution**: Complete rebuild with production best practices

---

## Requirements (Final Specification)

### Core Functionality:
1. **Browser** (Chrome) + **Terminal** (xterm) - BOTH visible on desktop
2. **Remote Access** - View and interact from user's browser
3. **Internet Access** - Via Decodo proxy with user-specific IP
4. **CLI Tools** - 3 tools accessible in terminal:
   - `@openai/codex`
   - `@anthropic-ai/claude-code`
   - `@google/gemini-cli`
5. **Node v20** - Required for CLI tools
6. **Stability** - No crashes, reliable connections
7. **Thin** - Minimal overhead, fast boot

### Architecture Requirements:
- Use Firecracker VMs (existing infrastructure)
- Pre-built golden rootfs (like Daytona/OnKernel)
- Systemd services (like production x11vnc configs)
- WebRTC + noVNC fallback (like OnKernel)

---

## Production Architecture (Based on Research)

### Layer 1: Golden Rootfs (Build Once)

**Base System**:
```bash
# Ubuntu 22.04 base
debootstrap jammy rootfs http://archive.ubuntu.com/ubuntu/

# Essential packages
apt-get install -y systemd sudo curl wget gnupg2
```

**Node v20 + CLI Tools**:
```bash
# Install Node v20 (REQUIRED)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Verify
node --version  # Must show v20.x

# Install CLI tools globally
npm install -g @openai/codex
npm install -g @anthropic-ai/claude-code
npm install -g @google/gemini-cli

# Verify
which codex claude gemini  # All should be found
```

**Desktop Environment** (Lightweight):
```bash
# Option A: XFCE (current)
apt-get install -y xfce4 xfce4-terminal

# Option B: Openbox (lighter, like OnKernel)
apt-get install -y openbox lxterminal tint2
```

**VNC Server** (Production Config):
```bash
# Install x11vnc
apt-get install -y x11vnc

# Create systemd service
cat > /etc/systemd/system/x11vnc.service <<'EOF'
[Unit]
Description=x11vnc VNC Server
After=network.target xvfb.service
Requires=xvfb.service

[Service]
Type=simple
ExecStart=/usr/bin/x11vnc -display :1 -forever -shared -wait 50 -listen 0.0.0.0 -rfbport 5901 -passwd polydev123 -noxdamage -repeat -noxrecord -noxfixes -ncache 10 -o /var/log/x11vnc.log
Restart=on-failure
RestartSec=3
StandardOutput=journal
StandardError=journal
User=root

[Install]
WantedBy=multi-user.target
EOF

# Enable service
systemctl enable x11vnc.service
```

**Virtual Display** (Xvfb):
```bash
cat > /etc/systemd/system/xvfb.service <<'EOF'
[Unit]
Description=Virtual Framebuffer
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/Xvfb :1 -screen 0 1280x720x24 -ac
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

systemctl enable xvfb.service
```

**Browser** (Chrome):
```bash
# Install Chrome
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add -
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list
apt-get update
apt-get install -y google-chrome-stable
```

**Terminal Auto-Launch**:
```bash
# System-wide autostart
mkdir -p /etc/xdg/autostart
cat > /etc/xdg/autostart/terminal.desktop <<'EOF'
[Desktop Entry]
Type=Application
Name=Terminal
Exec=xfce4-terminal --geometry=100x30 --title="CLI Terminal" --working-directory=/root --hide-menubar
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
EOF
```

**Proxy Configuration**:
```bash
# Create proxy script template
cat > /etc/profile.d/decodo-proxy.sh <<'EOF'
# Decodo Proxy Configuration
# Populated by VM manager at runtime
export HTTP_PROXY="${DECODO_HTTP_PROXY:-}"
export HTTPS_PROXY="${DECODO_HTTPS_PROXY:-}"
export http_proxy="${DECODO_HTTP_PROXY:-}"
export https_proxy="${DECODO_HTTPS_PROXY:-}"
export NO_PROXY="localhost,127.0.0.1,192.168.0.0/16"
export no_proxy="localhost,127.0.0.1,192.168.0.0/16"
EOF

chmod +x /etc/profile.d/decodo-proxy.sh
```

### Layer 2: Runtime Injection (Minimal)

**What to Inject Per-VM**:
1. **Proxy Credentials** - Update /etc/profile.d/decodo-proxy.sh:
   ```bash
   DECODO_HTTP_PROXY=http://username:password@dc.decodo.com:10001
   DECODO_HTTPS_PROXY=http://username:password@dc.decodo.com:10001
   ```

2. **Session ID** - Set in systemd environment:
   ```bash
   echo "SESSION_ID=xyz" >> /etc/environment
   ```

3. **Nothing else** - No other file modifications

### Layer 3: Remote Desktop

**Primary: WebRTC** (Low Latency)
- GStreamer webrtcbin streaming desktop
- Mouse/keyboard via WebRTC data channels
- <50ms latency

**Fallback: noVNC** (Stability)
- Connects to x11vnc on port 5901
- Systemd ensures x11vnc always running
- WebSocket proxy in master controller

---

## Proxy Configuration (Detailed)

### Current Decodo Proxy Format:
```
Username: sp9dso1iga
Password: GjHd8bKd3hizw05qZ=
Host: dc.decodo.com
Port: 10001 (unique per user)

Format: http://username:password@dc.decodo.com:port
```

### How to Configure in VM:

**Method 1: /etc/environment** (System-wide)
```bash
HTTP_PROXY=http://sp9dso1iga:GjHd8bKd3hizw05qZ%3D@dc.decodo.com:10001
HTTPS_PROXY=http://sp9dso1iga:GjHd8bKd3hizw05qZ%3D@dc.decodo.com:10001
NO_PROXY=localhost,127.0.0.1,192.168.0.0/16
```

**Method 2: /etc/profile.d/proxy.sh** (Shell sessions)
```bash
export HTTP_PROXY=http://sp9dso1iga:GjHd8bKd3hizw05qZ%3D@dc.decodo.com:10001
export HTTPS_PROXY=http://sp9dso1iga:GjHd8bKd3hizw05qZ%3D@dc.decodo.com:10001
```

**Method 3: Chrome Launch Flags** (Browser-specific)
```bash
google-chrome --proxy-server="http://sp9dso1iga:GjHd8bKd3hizw05qZ%3D@dc.decodo.com:10001"
```

**Testing Proxy**:
```bash
# In VM terminal:
curl -v https://ip.decodo.com/json
# Should show Decodo external IP, not VM IP
```

---

## Implementation Checklist

### Golden Snapshot Build:
- [ ] Install Ubuntu 22.04 base
- [ ] Install Node v20 (verify with `node --version`)
- [ ] Install all 3 CLI tools (verify with `which`)
- [ ] Configure Xvfb service (systemd)
- [ ] Configure x11vnc service (systemd with Restart=on-failure)
- [ ] Install desktop (XFCE or Openbox)
- [ ] Configure terminal auto-launch
- [ ] Install Chrome
- [ ] Create proxy script template
- [ ] Test everything works in chroot
- [ ] Snapshot and compress

### VM Creation Logic:
- [ ] Use `dd` for full copy
- [ ] Inject proxy credentials to /etc/profile.d/decodo-proxy.sh
- [ ] Set SESSION_ID in /etc/environment
- [ ] Boot VM
- [ ] Verify VNC port 5901 listening
- [ ] Verify terminal opens
- [ ] Verify browser opens
- [ ] Verify internet works via proxy

### Remote Desktop:
- [ ] WebRTC signaling working (already fixed)
- [ ] noVNC WebSocket proxy working
- [ ] Can see desktop from browser
- [ ] Can interact (mouse/keyboard)
- [ ] Stable connection (no disconnects)

---

## Success Criteria (All Must Pass):

1. ✅ VM boots in <30 seconds
2. ✅ VNC connects immediately via noVNC
3. ✅ Terminal visible on desktop
4. ✅ Browser visible on desktop
5. ✅ Can type in terminal
6. ✅ Can navigate in browser
7. ✅ Internet works: `curl https://claude.ai` succeeds
8. ✅ CLI tools work: `codex`, `claude`, `gemini` all execute
9. ✅ VM stays alive for 30+ minutes
10. ✅ No crashes or disconnects

---

## Why This Will Work (vs Current Approach):

| Current (Failed) | Production (Will Work) |
|------------------|------------------------|
| Runtime file modifications | Pre-built golden image |
| Bash supervisor | Systemd services |
| No auto-restart | Restart=on-failure |
| CoW snapshots | Full dd copy |
| Complex injection | Minimal injection |
| Node v12 | Node v20 |
| Files don't persist | Everything pre-baked |

---

## Next Session Action Plan:

**Step 1** (2 hours): Build Golden Rootfs
- Install all packages
- Configure all services
- Test in chroot environment

**Step 2** (1 hour): Test Golden Snapshot
- Create test VM
- Verify all functionality
- Document any issues

**Step 3** (1 hour): Deploy and Validate
- Replace current golden snapshot
- Create production VM
- End-to-end testing

**Step 4** (1 hour): Fix Any Issues
- Buffer for unexpected problems
- Fine-tune configuration

**Total**: 5 hours to production-stable system

---

## Files to Create/Modify:

### New Files:
- `/etc/systemd/system/x11vnc.service` - VNC with auto-restart
- `/etc/systemd/system/xvfb.service` - Virtual display
- `/etc/xdg/autostart/terminal.desktop` - Terminal auto-launch
- `/etc/profile.d/decodo-proxy.sh` - Proxy configuration
- `/root/.xinitrc` - Desktop session startup

### Keep from Current:
- `master-controller/src/routes/webrtc.js` - Answer/offer fixes
- `master-controller/src/services/proxy-port-manager.js` - Proxy management
- VM orchestration logic (working)

### Remove/Simplify:
- Runtime filesystem modification code
- Complex injection logic
- Supervisor script (replace with systemd)

---

## This is the Path to Stability

After 7 hours of debugging runtime issues, the solution is clear: **Build it right once, use it many times**.

No more:
- Filesystem persistence issues
- CoW snapshot problems
- Runtime injection complexity
- Service crash loops

Just:
- One perfect golden image
- Simple VM cloning
- Everything works immediately
- Systemd handles stability

**Next session**: Execute this plan systematically.
**Expected outcome**: Production-stable browser VM system.
