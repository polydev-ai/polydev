# Production Browser VM System - Based on OnKernel/Daytona Best Practices

## Research Findings - Production Systems

### OnKernel/Kernel Architecture:
- **Technology**: Unikraft unikernels (not Firecracker)
- **Speed**: 325ms cold start times
- **Remote Desktop**: WebRTC streaming (via Neko) + noVNC fallback
- **Key Insight**: Pre-built images with everything baked in

### Daytona Architecture:
- **Technology**: Docker containers + dev containers
- **Speed**: 90ms environment creation
- **Remote Desktop**: Issues show VNC support requested
- **Key Insight**: Standardized pre-built environments

### Production x11vnc Configuration:
- **Systemd Service**: NOT bash script
- **Auto-Restart**: `Restart=on-failure` in systemd
- **Flags**: `-forever -wait 50 -shared -listen 0.0.0.0`
- **Logging**: `-o /var/log/x11vnc.log`
- **Background**: `-bg` or run as service

## Our Requirements (Clarified):

### Core Functionality:
1. **Browser** (Chromium/Chrome) - visible and interactable
2. **Terminal** (xterm/gnome-terminal) - visible and interactable
3. **Both accessible** from user's browser via VNC/WebRTC
4. **Internet Access** via Decodo proxy with user-specific IP
5. **Node v20** with CLI tools:
   - `@openai/codex`
   - `@anthropic-ai/claude-code`
   - `@google/gemini-cli`

### Architecture Requirements:
- **Thin**: Minimal runtime overhead
- **Stable**: No crashes, reliable connections
- **Fast**: Quick VM boot times
- **Simple**: Easy to debug and maintain

## Recommended Implementation (Production-Grade):

### Phase 1: Golden Rootfs with Everything Pre-Configured

**Install in Golden Snapshot**:
```bash
# Node v20 (not v12/18)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# CLI Tools
npm install -g @openai/codex
npm install -g @anthropic-ai/claude-code
npm install -g @google/gemini-cli

# VNC Server
apt-get install -y x11vnc

# Desktop + Terminal
apt-get install -y xfce4 xfce4-terminal
# OR: apt-get install -y openbox lxterminal (lighter)

# Browser
apt-get install -y google-chrome-stable
```

**Configure x11vnc as Systemd Service**:
```ini
[Unit]
Description=x11vnc VNC Server
After=network.target display-manager.service

[Service]
Type=simple
ExecStart=/usr/bin/x11vnc -display :1 -forever -shared -wait 50 -listen 0.0.0.0 -rfbport 5901 -passwd polydev123 -o /var/log/x11vnc.log
Restart=on-failure
RestartSec=3
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

**Configure Terminal Auto-Launch**:
```ini
# /etc/xdg/autostart/terminal.desktop
[Desktop Entry]
Type=Application
Name=Terminal
Exec=xfce4-terminal --geometry=100x30
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
```

**Configure Proxy via /etc/profile.d/**:
```bash
# /etc/profile.d/decodo-proxy.sh
# Will be populated by VM manager at runtime
export HTTP_PROXY="${HTTP_PROXY:-}"
export HTTPS_PROXY="${HTTPS_PROXY:-}"
export NO_PROXY="${NO_PROXY:-}"
```

### Phase 2: Runtime Configuration (Minimal)

**Only inject at VM creation**:
1. Update `/etc/profile.d/decodo-proxy.sh` with user's proxy
2. Set SESSION_ID environment variable
3. Nothing else - no file modifications

**Use systemd EnvironmentFile**:
```ini
[Service]
EnvironmentFile=/etc/environment
```

### Phase 3: Remote Desktop Strategy

**Primary**: WebRTC (like OnKernel's Neko)
- Low latency (<50ms)
- Direct peer-to-peer
- Mouse/keyboard via data channels

**Fallback**: noVNC
- When WebRTC fails
- Connects to x11vnc on port 5901
- systemd ensures x11vnc is always running

### Phase 4: Verification Checklist

**Test VM Should Have**:
- ✅ Node v20: `node --version` shows v20.x
- ✅ CLI tools: `which codex claude gemini` all found
- ✅ VNC running: `systemctl status x11vnc` shows active
- ✅ Terminal opens: xfce4-terminal visible on desktop
- ✅ Browser works: chromium launches
- ✅ Internet: `curl https://claude.ai` works via proxy
- ✅ Can interact: Mouse/keyboard input works via noVNC

## Key Differences from Current Approach:

| Current (Failing) | Production (Stable) |
|-------------------|---------------------|
| Bash supervisor script | Systemd services |
| Runtime file modifications | Pre-built images |
| CoW snapshots | Full dd copy |
| No auto-restart | Restart=on-failure |
| Complex injection | Minimal injection |

## Implementation Timeline:

**Session 1** (4-5 hours):
- Build comprehensive golden rootfs
- Install Node v20 + CLI tools
- Configure x11vnc systemd service
- Configure terminal auto-launch
- Test everything works

**Session 2** (2-3 hours):
- Deploy golden snapshot
- Test VM creation
- Verify all functionality
- Fix any issues

**Total**: 6-8 hours for production-grade stable system

## Success Criteria:

1. ✅ Create VM in <30 seconds
2. ✅ VNC connects immediately
3. ✅ Terminal and browser both visible
4. ✅ Can type in both terminal and browser
5. ✅ Internet works via Decodo proxy
6. ✅ All 3 CLI tools accessible
7. ✅ VMs stay alive for 30 minutes minimum
8. ✅ No crashes or disconnects

## Next Steps:

Start fresh session with:
1. Review this plan
2. Build comprehensive golden rootfs
3. Follow production best practices (systemd, not bash)
4. Test thoroughly before deploying

This is the path to a stable, production-grade system like OnKernel and Daytona.
