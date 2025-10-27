# Firefox OAuth Launch Debug - Complete Handoff Package

## 📄 Available Documents

### 1. **HANDOFF_SUMMARY.md** ⭐ START HERE
   - Quick overview of the issue
   - What was done and current state
   - VPS credentials and key paths
   - Next steps for debugging
   - **Read this first** (3-4 minutes)

### 2. **FIREFOX_LAUNCH_DEBUG_HANDOFF.md** 📋 COMPREHENSIVE GUIDE
   - Detailed system architecture
   - Complete code locations
   - Step-by-step debugging procedure
   - Possible root causes
   - Git commit history
   - **Read this for context** (10 minutes)

### 3. **QUICK_DEBUG_COMMANDS.sh** ⚡ CHEAT SHEET
   - Ready-to-use commands
   - Common issues and fixes
   - Key file locations
   - **Copy/paste commands from here** (5 minutes)

## 🎯 Quick Start (5 minutes)

```bash
# 1. Read the summary
cat HANDOFF_SUMMARY.md

# 2. SSH to VPS
ssh -o StrictHostKeyChecking=no root@135.181.138.102
# Password: Venkatesh4158198303

# 3. Create new Browser VM
# Visit: http://localhost:3000/dashboard/remote-cli
# Click: Claude Code button
# Get VM IP from noVNC URL

# 4. Check if agent is running
ssh -o StrictHostKeyChecking=no root@192.168.100.13  # Replace with actual IP
systemctl status vm-browser-agent
tail -50 /tmp/firefox-launch.log

# 5. Check X11 display
ps aux | grep Xvfb
DISPLAY=:1 xset q
```

## 🔍 What to Look For

### When Agent Service Starts
- **Should see in logs**: "VM Browser Agent started"
- **Should see in ps**: `node /opt/vm-browser-agent/server.js`
- **If not**: `journalctl -u vm-browser-agent -n 50`

### When OAuth Flow Triggered
- **Agent receives POST** `/auth/claude_code`
- **Spawns Claude CLI** - should see in ps
- **Captures OAuth URL** - check logs
- **Launches Firefox wrapper** - check `/tmp/firefox-launcher.sh` exists
- **Firefox starts** - check `ps aux | grep firefox`

### Firefox Launch Issues
- **Wrapper script log**: `/tmp/firefox-launch.log`
- **Agent log**: `/tmp/vm-browser-agent.log`
- **Systemd log**: `journalctl -u vm-browser-agent`
- **X11 check**: `DISPLAY=:1 xset q`

## 📊 System Architecture

```
┌─────────────────────────────────────────────────┐
│ Master Controller (VPS:4000)                    │
│ - Creates VMs                                   │
│ - Proxies OAuth requests                        │
│ - Receives OAuth URLs                           │
└────────────────┬────────────────────────────────┘
                 │
         ┌───────▼──────────────┐
         │ Browser VM (Network) │
         │ IP: 192.168.100.13   │
         └───────┬──────────────┘
                 │
    ┌────────────▼──────────────────┐
    │ Inside VM                      │
    ├────────────────────────────────┤
    │ - Xvfb (DISPLAY=:1)            │
    │ - openbox (window manager)     │
    │ - vncserver (port 5901)        │
    │ - Firefox (/usr/bin/firefox)   │
    │ - vm-browser-agent (port 8080) │
    └────────────────────────────────┘
```

## 🚀 What Needs to Happen

1. **New VM created** ← Uses rebuilt golden image (Oct 27 18:00)
2. **Agent starts on boot** ← systemd service should auto-start
3. **Master calls agent** ← POST /auth/claude_code
4. **Agent spawns Claude CLI** ← Should output OAuth URL
5. **Firefox wrapper runs** ← Should launch with DISPLAY=:1
6. **Firefox appears** ← User sees browser window in noVNC
7. **User logs in** ← Credentials captured, auth completes

**Currently fails at step 6** - Firefox isn't appearing.

## 🔧 Most Likely Causes

1. **Agent service not running** (highest probability)
   - Check: `systemctl status vm-browser-agent`
   - Fix: `systemctl start vm-browser-agent`

2. **X11 display not working** (medium probability)
   - Check: `DISPLAY=:1 xset q`
   - Fix: `systemctl restart vncserver@1`

3. **Firefox process hanging** (medium probability)
   - Check: `/tmp/firefox-launch.log` for errors
   - Fix: `rm -rf /root/.mozilla/firefox` then retry

4. **Claude CLI not outputting** (lower probability)
   - Check: `/tmp/vm-browser-agent.log` for CLI output
   - Fix: May be CLI issue, not Firefox issue

## 📚 Code References

- **Agent main code**: `/Users/venkat/Documents/polydev-ai/vm-agent/vm-browser-agent.js` (lines 207-303)
- **Firefox launch**: Uses bash wrapper script at `/tmp/firefox-launcher.sh`
- **Service file**: `/etc/systemd/system/vm-browser-agent.service` (inside VMs)
- **Golden image**: `/var/lib/firecracker/snapshots/base/golden-rootfs.ext4` (rebuilt Oct 27)

## 💾 Key Credentials & Paths

| Item | Value |
|------|-------|
| VPS Host | 135.181.138.102 |
| VPS Password | Venkatesh4158198303 |
| Master Port | 4000 |
| Agent Port (in VM) | 8080 |
| VM Network | 192.168.100.0/24 |
| VNC Password | polydev123 |
| DISPLAY | :1 |

## 📝 Git Commits Related to Fix

- `4d33a57`: Firefox wrapper script with diagnostics (Oct 27)
- `1405692`: Direct Firefox launch attempt (Oct 27)
- `c94be41`: sensible-browser vs xdg-open (Oct 27)
- Earlier commits: Network and display setup

## ✅ Verification Checklist

When debugging, verify:
- [ ] Golden image rebuilt (after Oct 27 18:00)
- [ ] NEW VM created (not old one)
- [ ] vm-browser-agent service is enabled
- [ ] Xvfb is running on DISPLAY=:1
- [ ] Firefox binary exists at /usr/bin/firefox
- [ ] /tmp/firefox-launcher.sh exists (created when OAuth triggered)
- [ ] /tmp/firefox-launch.log has actual error messages
- [ ] /root/.Xauthority has correct permissions
- [ ] Claude CLI actually runs and outputs URL

---

**Handoff Created**: October 27, 2025 10:23 AM
**Golden Image Rebuilt**: October 27, 2025 6:00 PM UTC
**Status**: Ready for next model to debug
**Recommendation**: Start with Step 1-4 from HANDOFF_SUMMARY.md
