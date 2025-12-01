# Starting Prompt for Next Debugger

## Copy This Exact Prompt to Start

```
You are continuing a WebRTC integration debugging session that has been ongoing for 2 weeks.

**CRITICAL - Memory Setup (DO THIS FIRST):**
1. Use mcp__memory__create_entities to store VPS credentials:
   - Entity: "VPS Server"
   - Type: "Infrastructure"
   - Observations:
     - IP: 135.181.138.102
     - User: root
     - Password: Venkatesh4158198303
     - SSH Command: sshpass -p "Venkatesh4158198303" ssh -o StrictHostKeyChecking=no root@135.181.138.102
     - Master Controller Path: /opt/master-controller
     - Firecracker VMs: /var/lib/firecracker/users/

2. Query Supabase MCP for database schema:
   - Use mcp__supabase__list_tables to see what's in the database
   - Use mcp__supabase__execute_sql to query session data
   - Look for: webrtc_sessions table schema and any session tracking

**THEN READ THIS:**
Read the complete status document: /Users/venkat/Documents/polydev-ai/WEBRTC_DEBUG_STATUS.md

**YOUR IMMEDIATE TASK:**
Fix webrtc-server.js crashing in supervisor restart loop. The process dies every 10 seconds with NO visible error output.

**Quick Summary:**
- Goal: Replace noVNC with WebRTC for Browser VM desktop streaming
- Status: 90% done - 3 major bugs fixed, 1 blocker remains
- Blocker: webrtc-server.js file successfully injected but crashes on startup
- Hypothesis: Missing SESSION_ID environment variable or broken start-all.sh script
- Next Step: SSH into running VM, find start-all.sh, examine how webrtc-server.js is launched

**Files to Know:**
- Local: /Users/venkat/Documents/polydev-ai/master-controller/vm-browser-agent/webrtc-server.js
- Remote: /opt/master-controller/vm-browser-agent/webrtc-server.js
- VM (injected): /opt/webrtc-server.js
- Golden snapshot: /opt/master-controller/resources/golden-rootfs.ext4 (recently rebuilt)

Begin by reading the status document, then SSH into the server and create a fresh Browser VM to diagnose.
```

---

## How to Use This

1. **Copy the prompt above** into a new Claude conversation
2. **Wait for the model to read the status document**
3. **Let it set up memory** with VPS credentials
4. **Let it query Supabase** for database schema
5. **Then it can start actual debugging** with proper context and credentials

---

## What the New Debugger Should Do First

After setting up memory and reading the status document, they should:

1. **SSH to the server**:
   ```bash
   sshpass -p "Venkatesh4158198303" ssh -o StrictHostKeyChecking=no root@135.181.138.102
   ```

2. **Create a fresh Browser VM and monitor it**:
   ```bash
   cp /opt/vm-browser-agent/webrtc-server.js /opt/master-controller/vm-browser-agent/
   curl -X POST http://localhost:4000/api/auth/start \
     -H 'Content-Type: application/json' \
     -d '{"userId":"5abacdd1-6a9b-48ce-b723-ca8056324c7a","provider":"claude_code"}'
   ```

3. **Wait 40 seconds for VM to boot**, then get VM details:
   ```bash
   NEWEST=$(ls -1t /var/lib/firecracker/users/ | head -1)
   VM_IP=$(grep -oP '192\.168\.100\.\d+' /var/lib/firecracker/users/$NEWEST/vm-config.json | head -1)
   echo "VM IP: $VM_IP"
   ```

4. **SSH into the VM**:
   ```bash
   ssh root@$VM_IP
   ```

5. **Find and examine start-all.sh**:
   ```bash
   find / -name 'start-all.sh' 2>/dev/null
   cat /path/to/start-all.sh
   ```

6. **Check supervisor logs**:
   ```bash
   journalctl -u supervisor
   # or
   tail -f /var/log/supervisor/*.log
   ```

7. **Try running webrtc-server.js manually**:
   ```bash
   cd /opt
   SESSION_ID=$(cat /etc/environment | grep SESSION_ID | cut -d= -f2)
   MASTER_CONTROLLER_URL=http://192.168.100.1:4000
   node webrtc-server.js
   ```

---

## Expected Outcome

The new debugger should uncover:
- Whether SESSION_ID is being set correctly
- Whether MASTER_CONTROLLER_URL is accessible from VM
- The exact error message when webrtc-server.js runs
- What start-all.sh is doing and why it's not setting environment variables

This should take 15-30 minutes to solve.
