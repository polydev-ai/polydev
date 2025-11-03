# Port 8080 Service Issue - Browser VM OAuth Agent Not Listening

**Date**: November 3, 2025, 4:40 PM CET
**Status**: Networking FIXED, Service startup issue remains

---

## ✅ **WHAT'S NOW WORKING (BREAKTHROUGH!)**

**Firecracker TAP/bridge networking is WORKING:**
- ✅ Ping: 0% packet loss (was 100% before)
- ✅ Network connectivity: "ECONNREFUSED" (not "EHOSTUNREACH")
- ✅ VMs boot successfully with 2GB RAM
- ✅ eth0 configured in guest
- ✅ All files injected correctly

**The vnet_hdr fix worked!** (ChatGPT Pro's solution)

---

## ❌ **CURRENT PROBLEM**

**OAuth agent (Node.js server) not listening on port 8080 inside Browser VM**

**Error from host trying to reach VM:**
```
connect ECONNREFUSED 192.168.100.2:8080
```

**NOT "EHOSTUNREACH"** - this proves network works, just nothing listening!

**Attempts:**
- curl http://192.168.100.2:8080/health → Connection refused
- ssh root@192.168.100.2 → Connection refused

---

## 🏗️ **Architecture & Injection Process**

### **Files Injected into Browser VM:**

**Location**: `/opt/vm-browser-agent/`

**Files** (verified present):
- `node` (98MB binary)
- `server.js` (OAuth agent - should listen on port 8080)
- `webrtc-server.js` (WebRTC server)
- `start-all.sh` (Supervisor script, executable)
- `package.json`

### **Systemd Service Created:**

**File**: `/etc/systemd/system/vm-browser-agent.service`

**Content** (what SHOULD be injected):
```ini
[Unit]
Description=VM Browser Services (OAuth Agent + WebRTC Server)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/vm-browser-agent
Environment=NODE_ENV=production
EnvironmentFile=/etc/environment
ExecStart=/opt/vm-browser-agent/start-all.sh
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

**Service is ENABLED** (symlink created in multi-user.target.wants)

### **Supervisor Script:**

**File**: `/opt/vm-browser-agent/start-all.sh` (executable, 1214 bytes)

**Content**:
```bash
#!/bin/bash
set -e

# Source environment variables (includes proxy + SESSION_ID)
if [ -f /etc/environment ]; then
  export $(cat /etc/environment | xargs)
fi

cd /opt/vm-browser-agent

echo "[SUPERVISOR] Starting OAuth agent and WebRTC server..."
echo "[SUPERVISOR] SESSION_ID: $SESSION_ID"
echo "[SUPERVISOR] DISPLAY: $DISPLAY"

# Start OAuth agent in background
/opt/vm-browser-agent/node /opt/vm-browser-agent/server.js &
OAUTH_PID=$!
echo "[SUPERVISOR] OAuth agent started (PID: $OAUTH_PID)"

# Start WebRTC server in background
/opt/vm-browser-agent/node /opt/vm-browser-agent/webrtc-server.js &
WEBRTC_PID=$!
echo "[SUPERVISOR] WebRTC server started (PID: $WEBRTC_PID)"

# Cleanup handler
cleanup() {
  echo "[SUPERVISOR] Shutting down services..."
  kill $OAUTH_PID $WEBRTC_PID 2>/dev/null || true
  wait $OAUTH_PID $WEBRTC_PID 2>/dev/null || true
  echo "[SUPERVISOR] Services stopped"
  exit 0
}

trap cleanup SIGTERM SIGINT

# Wait for either process to exit
wait -n

# If one exits, stop the other
echo "[SUPERVISOR] One service exited, stopping all..."
cleanup
```

### **/etc/environment (SHOULD contain):**
```
HTTP_PROXY=http://sp9dso1iga:...@dc.decodo.com:10001
HTTPS_PROXY=http://sp9dso1iga:...@dc.decodo.com:10001
NO_PROXY=localhost,127.0.0.1,192.168.0.0/16
SESSION_ID=<uuid>
MASTER_CONTROLLER_URL=http://192.168.100.1:4000
DISPLAY=:1
```

---

## 🔍 **What We SEE in VM Console:**

**During boot (from console.log):**
```
Started VM Browser Services (OAuth Agent + WebRTC Server)  ← systemd says it started!
Started VNC Server for Display 1
Started noVNC Web VNC Client
Started Serial Getty on ttyS0
polydev-browser login:  ← Reached login prompt
```

**Systemd shows service "Started"** but we get NO output from supervisor script!

**Expected (not seen)**:
```
[SUPERVISOR] Starting OAuth agent and WebRTC server...
[SUPERVISOR] OAuth agent started (PID: ...)
[SUPERVISOR] WebRTC server started (PID: ...)
```

The supervisor script echo statements don't appear in console!

---

## 🤔 **THE MYSTERY**

**Why does systemd say "Started" but:**
- No supervisor script output in console
- Port 8080 not listening (Connection refused)
- Port 22 SSH not listening (Connection refused)

**Possible Issues:**

### **1. Old Service from Golden Image:**
Golden image has a pre-existing vm-browser-agent service:
```ini
ExecStart=/usr/bin/node /opt/vm-browser-agent/server.js  ← Uses /usr/bin/node (doesn't exist!)
```

Our injection SHOULD replace this, but maybe:
- Symlink isn't being replaced
- Service is cached
- Both services conflict

### **2. /etc/environment Not Created:**
If our injection doesn't create /etc/environment, then:
- `EnvironmentFile=/etc/environment` fails
- systemd might still show "Started" but service has no env vars
- SESSION_ID missing → scripts fail

### **3. StandardOutput=journal:**
We can't see service output in console because it goes to systemd journal.

Can't SSH to check journalctl because SSH also refuses.

### **4. start-all.sh Script Issues:**
- Permissions (executable verified)
- Bash path (/bin/bash vs /usr/bin/bash)
- Node binary not found
- Working directory wrong

---

## 📊 **Diagnostic Data**

### **From Injection Logs** (master-controller):
```
[INJECT-AGENT] Supervisor script created
[INJECT-AGENT] Systemd service created
[INJECT-AGENT] Service enabled
[INJECT-AGENT] OAuth agent injection complete ✅
[INJECT-AGENT] Rootfs unmounted
Browser VM created successfully with WebRTC ✅
```

Injection reports success!

### **From VM Console:**
```
Started VM Browser Services (OAuth Agent + WebRTC Server)  ← systemd
```

But NO supervisor script output (no [SUPERVISOR] lines).

### **Network Tests:**
```
Ping: 64 bytes from 192.168.100.2, 0% loss ✅
Port 8080: Connection refused (after 2 min timeout, VM destroyed)
SSH: Connection refused
```

---

## 🎯 **Specific Questions:**

1. **Why would systemd say "Started" but nothing listens on port 8080?**
   - Service crashes immediately after start?
   - Wrong ExecStart path?
   - Environment variables missing?

2. **How to debug when SSH doesn't work?**
   - Console only shows systemd status, not service output
   - StandardOutput=journal but can't access journal remotely
   - Can mount rootfs but can't see runtime state

3. **Why no supervisor script output in console?**
   - Should we change StandardOutput to console temporarily?
   - Is systemd even running start-all.sh?

4. **Could the golden image's old service be conflicting?**
   - Old service uses `/usr/bin/node` (doesn't exist)
   - We added symlink: `ln -s /opt/vm-browser-agent/node /usr/bin/node`
   - Is old service running instead of new one?

---

## 🔧 **What We've Verified:**

**In Golden Image:**
- ✅ Old service removed from `/etc/systemd/system/`
- ✅ Symlink removed from `multi-user.target.wants`
- ✅ Symlink added: `/usr/bin/node` → `/opt/vm-browser-agent/node`
- ✅ Script added to disable offloads early in boot

**In Mounted Rootfs** (after injection):
- ✅ `/opt/vm-browser-agent/` contains all files
- ✅ `start-all.sh` is executable (verified)
- ⚠️ `/etc/environment` - NOT VERIFIED (couldn't mount recently)
- ⚠️ `/etc/systemd/system/vm-browser-agent.service` - NOT VERIFIED

---

## 💡 **Hypotheses:**

### **Hypothesis A: /etc/environment Not Created**
If injection isn't creating /etc/environment:
- EnvironmentFile line in systemd fails
- systemd might ignore it and still start
- But scripts have no env vars
- Could cause immediate crash

**Test**: Mount a Browser VM rootfs and check if /etc/environment exists

### **Hypothesis B: Old Service Still Running**
Despite our removal from golden image:
- Systemd cache might have old service
- Or injection happens AFTER systemd scans services
- Old service tries `/usr/bin/node` (now symlink), might fail differently

**Test**: Check which service is actually running (old vs new ExecStart)

### **Hypothesis C: Script Fails Immediately**
start-all.sh might fail on:
- Parsing /etc/environment (invalid format?)
- Node binary not found (path issue?)
- Missing dependencies

**Test**: Would need to run script manually or see stderr

---

## 🎯 **Next Debugging Steps:**

1. **Verify what's actually in a Browser VM:**
   ```bash
   # Mount rootfs of vm-b4f3536f or any 2GB VM
   mount -o loop /var/lib/firecracker/users/vm-XXX/rootfs.ext4 /tmp/check

   # Check EXACTLY what was injected:
   cat /tmp/check/etc/systemd/system/vm-browser-agent.service
   cat /tmp/check/etc/environment
   ls -la /tmp/check/opt/vm-browser-agent/

   umount /tmp/check
   ```

2. **Change service output to console temporarily:**
   Update injection to use:
   ```ini
   StandardOutput=tty
   StandardError=tty
   ```
   Then we'd see supervisor script output in console.log!

3. **Test script manually:**
   If we could SSH, we'd run:
   ```bash
   cd /opt/vm-browser-agent
   bash -x start-all.sh  # See exactly where it fails
   ```

---

## 📋 **Code References:**

**Injection code**: `master-controller/src/services/vm-manager.js`
- Lines 296-332: /etc/environment injection
- Lines 359-420: systemd service creation
- Lines 370-415: start-all.sh creation

**Environment injection** (lines 303-314):
```javascript
const envContent = `# Polydev Decodo Proxy Configuration
HTTP_PROXY=${proxyEnv.HTTP_PROXY}
HTTPS_PROXY=${proxyEnv.HTTPS_PROXY}
NO_PROXY=${proxyEnv.NO_PROXY}
${sessionId ? `SESSION_ID=${sessionId}` : ''}
MASTER_CONTROLLER_URL=http://192.168.100.1:4000
DISPLAY=:1
`;

const envPath = path.join(mountPoint, 'etc/environment');
await fs.writeFile(envPath, envContent);
```

---

## ❓ **QUESTIONS FOR CHATGPT:**

1. **Why would systemd report "Started" but nothing listen on the port?**

2. **How to debug a systemd service when:**
   - Can't SSH to VM
   - StandardOutput=journal (can't access remotely)
   - Console only shows systemd status messages

3. **Why don't supervisor script echo statements appear in console.log?**
   - Is systemd buffering them?
   - Does StandardOutput=journal suppress them entirely?

4. **Best way to debug start-all.sh issues?**
   - Change to StandardOutput=tty temporarily?
   - Add logging to a file we can check later?
   - Different approach?

5. **Could EnvironmentFile fail silently?**
   - If /etc/environment doesn't exist, does systemd:
     a) Fail to start service?
     b) Start service without env vars?
     c) Log an error somewhere?

---

## 🎯 **What We Need:**

**Help debugging why OAuth agent (server.js) doesn't serve on port 8080 when:**
- ✅ Network works (ping successful)
- ✅ VM boots (login prompt reached)
- ✅ systemd says service "Started"
- ✅ Files are injected correctly
- ❌ But port 8080 refuses connections

**For Ubuntu 22.04 guest in Firecracker microVM.**

---

## 📊 **System Info:**

**Host**:
- Ubuntu 22.04.5
- Bare metal Hetzner
- master-controller running at 135.181.138.102:4000

**Guest**:
- Ubuntu 22.04 in Firecracker
- 2GB RAM (kernel gets full 2048MB)
- Network: 192.168.100.X/24 via TAP device
- Boots successfully, reaches login

**Injection verified via**:
- master-controller logs show "OAuth agent injection complete"
- Mounting stopped VMs shows files in /opt/vm-browser-agent/
- systemd in console shows service "Started"

---

**THIS IS THE LAST PIECE!** Networking breakthrough means we're 95% there. Just need the service to actually listen on port 8080! 🚀
