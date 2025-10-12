# ✅ Next Steps: Fix OAuth Flow

**Issue:** OAuth window never opens, authentication times out after 24-30 seconds
**Root Cause:** Wrong VM agent installed (minimal Python instead of complete Node.js)
**Status:** Fix prepared, ready to deploy

---

## Quick Summary

We installed `health-server.py` (minimal Python) but we need `vm-browser-agent.js` (complete Node.js).

**Missing endpoints:**
- `POST /auth/{provider}` - starts CLI tool and captures OAuth URL
- `GET /oauth-url?sessionId=XXX` - returns OAuth URL for frontend iframe
- `GET /credentials/status?sessionId=XXX` - checks authentication completion
- `GET /auth/callback` - proxies OAuth callbacks to CLI's localhost server

**Without these endpoints, the frontend can't display the OAuth window!**

---

## Deploy the Fix (Two Options)

### Option 1: Automated (Recommended)

```bash
cd /Users/venkat/Documents/polydev-ai
./deploy-complete-agent.sh
```

**What it does:**
1. Copies files to server via scp
2. Runs installation remotely
3. Checks for Node.js and CLI tools
4. Replaces Python agent with Node.js agent
5. Updates systemd service

### Option 2: Manual (If SSH Fails)

**Copy files to server:**
- `vm-agent/vm-browser-agent.js` → `/tmp/`
- `vm-agent/vm-browser-agent.service` → `/tmp/`
- `vm-agent/install-complete-agent.sh` → `/tmp/`

**In SSH session (PID 1085):**
```bash
chmod +x /tmp/install-complete-agent.sh
sudo /tmp/install-complete-agent.sh
```

---

## Prerequisites

The golden snapshot MUST have:

1. **Node.js (v18+ or v20+)**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
   apt-get install -y nodejs
   ```

2. **CLI Tools:**
   ```bash
   # Claude Code
   npm install -g @anthropic-ai/claude-cli

   # Codex (optional)
   pip install codex-cli

   # Gemini (optional)
   pip install gemini-cli
   ```

**If Node.js is missing,** the installation script will fail and provide instructions.

---

## How to Install Node.js (If Missing)

1. **Create test VM and install Node.js:**
   ```bash
   # Create VM
   curl -X POST http://192.168.5.82:4000/api/vm/create \
     -H 'Content-Type: application/json' \
     -d '{"userId":"install-nodejs","vmType":"cli"}' | jq .

   # SSH into VM
   ssh root@<vm-ip>

   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
   apt-get install -y nodejs
   node --version  # Should show v20.x.x

   # Install CLI tools
   npm install -g @anthropic-ai/claude-cli
   ```

2. **Create new golden snapshot from this VM:**
   ```bash
   # On host (192.168.5.82)
   # Find VM's rootfs
   VM_ROOTFS="/var/lib/firecracker/vms/vm-install-nodejs/rootfs.ext4"

   # Backup old golden
   sudo cp /var/lib/firecracker/snapshots/base/golden-rootfs.ext4 \
          /var/lib/firecracker/snapshots/base/golden-rootfs.ext4.backup

   # Copy VM rootfs as new golden
   sudo cp "$VM_ROOTFS" \
          /var/lib/firecracker/snapshots/base/golden-rootfs.ext4
   ```

3. **Run installation again:**
   ```bash
   sudo /tmp/install-complete-agent.sh
   ```

---

## Test After Deployment

### Test 1: Health Check

```bash
# Create test VM
curl -X POST http://192.168.5.82:4000/api/vm/create \
  -H 'Content-Type: application/json' \
  -d '{"userId":"test","vmType":"cli"}' | jq .

# Wait 5 seconds, test health (use IP from response)
curl http://192.168.100.X:8080/health

# Expected: {"status":"ok","timestamp":"...","activeSessions":0}
```

### Test 2: OAuth Flow (Critical!)

```bash
curl -X POST http://192.168.5.82:4000/api/auth/start \
  -H 'Content-Type: application/json' \
  -d '{"userId":"5abacdd1-6a9b-48ce-b723-ca8056324c7a","provider":"claude_code"}'
```

**Then open:** `http://localhost:3002/dashboard/remote-cli/auth`

**Expected behavior:**
1. ✅ OAuth window APPEARS in iframe (this is the key fix!)
2. ✅ You can complete OAuth flow
3. ✅ Shows "Successfully Connected!"
4. ✅ Chat interface shows provider (not null)

---

## Documentation

📄 **Complete documentation:** `OAUTH-FIX-COMPLETE.md`
- Detailed explanation of issue
- Complete OAuth flow diagram
- Step-by-step installation
- Troubleshooting guide
- Rollback instructions

📄 **Previous fix documentation:** `AUTHENTICATION-FIX-COMPLETE.md`
- Documents the 60s timeout fix (waitForVMReady)
- Documents the Python health-server installation
- Now superseded by Node.js agent

---

## Files Created

**VM Agent (complete implementation):**
```
vm-agent/vm-browser-agent.js (433 lines) - Complete Node.js OAuth proxy
vm-agent/vm-browser-agent.service - systemd service for Node.js agent
vm-agent/install-complete-agent.sh - Installation script
```

**Deployment:**
```
deploy-complete-agent.sh - Automated deployment to production
```

**Documentation:**
```
OAUTH-FIX-COMPLETE.md - Complete fix documentation
NEXT-STEPS.md - This file (quick reference)
```

**Backups (kept for rollback):**
```
vm-agent/health-server.py - Previous Python agent
vm-agent/vm-agent.service - Previous Python service
```

---

## Time Estimate

- **If Node.js already installed:** 5-10 minutes
- **If Node.js needs installation:** 20-30 minutes

---

## Questions?

1. **Why did the previous fix seem to work?**
   - The backend API returned "completed" status
   - But the OAuth window never appeared
   - Frontend couldn't fetch OAuth URL (endpoint missing)

2. **Why Node.js instead of Python?**
   - Complete VM agent already written in Node.js (433 lines)
   - Handles CLI tool spawning, OAuth URL capture, session management
   - Python version was minimal (2.9 KB) - only health checks

3. **What if I don't want to install Node.js?**
   - You'd need to rewrite the complete agent in Python
   - Would take several hours of development
   - Node.js is standard in most server environments

---

**Ready to deploy!** 🚀

Run: `./deploy-complete-agent.sh`

Or manually copy files and run: `sudo /tmp/install-complete-agent.sh`
