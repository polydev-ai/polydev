# OAuth Agent Path Mismatch - Root Cause and Fix

**Date**: October 16, 2025 08:00 UTC
**Status**: ✅ **ROOT CAUSE IDENTIFIED** - Golden snapshot rebuild required

---

## Executive Summary

User reported "HTTP 404 Not Found" when trying Codex OAuth after golden snapshot rebuild. Investigation revealed:

- ✅ **Injection IS working** - `/opt/vm-browser-agent/server.js` has expect wrapper and `/auth/` endpoint
- ❌ **Service running OLD code** - systemd service points to `/opt/vm-api/server.js` instead
- 🔧 **Fix applied** - Golden snapshot build script updated to use consistent paths
- 🔄 **Next step** - Rebuild golden snapshot with fixed paths

---

## Investigation Timeline

### 07:33 UTC: User Creates Browser VM for Codex OAuth

- Browser VM created: `vm-1e5e0978-2393-47a9-adaf-fd8b49d8bf77`
- IP assigned: `192.168.100.4`
- Health check passed ✅
- **POST `/auth/codex` returned HTTP 404** ❌

### 08:00 UTC: Investigation Started

**Checked injection worked:**
```bash
mount /var/lib/firecracker/users/vm-1e5e0978-.../rootfs.ext4 /mnt/debug-vm
ls -la /mnt/debug-vm/opt/vm-browser-agent/
# total 52
# -rwxr-xr-x 1 root root 37443 Oct 16 07:33 server.js  ← INJECTED!
# -rwxr-xr-x 1 root root   387 Oct 16 07:33 package.json
```

**Verified injected code has fixes:**
```bash
grep 'expect wrapper' /mnt/debug-vm/opt/vm-browser-agent/server.js
# 541:  // Codex CLI requires expect wrapper...  ✅

grep '/auth/' /mnt/debug-vm/opt/vm-browser-agent/server.js | head -3
# 317:    if (url.pathname.startsWith('/auth/') && req.method === 'POST') {  ✅
```

**Discovered systemd service mismatch:**
```bash
cat /mnt/debug-vm/etc/systemd/system/vm-api.service
# WorkingDirectory=/opt/vm-api  ← WRONG PATH!
# ExecStart=/usr/bin/node /opt/vm-api/server.js  ← WRONG PATH!
```

**Found OLD code being served:**
```bash
ls -la /mnt/debug-vm/opt/
# drwxr-xr-x  2 root root 4096 Oct 16 07:27 vm-api  ← FROM GOLDEN SNAPSHOT
# drwxr-xr-x  2 root root 4096 Oct 16 07:33 vm-browser-agent  ← FROM INJECTION

head -20 /mnt/debug-vm/opt/vm-api/server.js
# /**
#  * VM API Server  ← OLD COMMENT, NOT "OAuth Agent"
#  * Runs inside each VM to handle authentication...
```

---

## Root Cause Analysis

### The Mismatch

**Golden Snapshot Build** (`build-golden-snapshot.sh` lines 217-444):
```bash
# Creates directory
mkdir -p rootfs/opt/vm-api  # ← WRONG!

# Creates placeholder server.js
cat > rootfs/opt/vm-api/server.js <<'EOF'  # ← WRONG!

# Creates systemd service
cat > rootfs/etc/systemd/system/vm-api.service <<EOF
WorkingDirectory=/opt/vm-api  # ← WRONG!
ExecStart=/usr/bin/node /opt/vm-api/server.js  # ← WRONG!
```

**Injection Code** (`vm-manager.js:346`):
```javascript
const srcAgentDir = path.join(__dirname, '../../vm-browser-agent');
// Copies to: /opt/vm-browser-agent/server.js  ← CORRECT!
```

### What Happens

1. **Golden snapshot built** with placeholder server.js in `/opt/vm-api/`
2. **Systemd service** configured to run `/opt/vm-api/server.js`
3. **Browser VM cloned** from golden snapshot
4. **Injection runs** and updates `/opt/vm-browser-agent/server.js` ✅
5. **VM boots** and systemd starts `vm-api.service`
6. **Service runs OLD code** from `/opt/vm-api/server.js` (no `/auth/` endpoint)
7. **Master-controller sends** POST to `/auth/codex`
8. **Returns 404** because OLD code doesn't have that endpoint ❌

---

## The Fix

### Changes Made to `build-golden-snapshot.sh`

**Commit**: `1b31dc2`
**File**: `master-controller/scripts/build-golden-snapshot.sh`

```diff
-# Setup VM API server
 setup_vm_api() {
-    log_info "Setting up VM API server..."
+# Setup VM Browser Agent (OAuth proxy for Browser VMs)
+    log_info "Setting up VM Browser Agent..."

-    # Create API server directory
-    mkdir -p rootfs/opt/vm-api
+    # Create OAuth agent directory
+    mkdir -p rootfs/opt/vm-browser-agent

-    # Copy VM API server files
-    cat > rootfs/opt/vm-api/server.js <<'EOF'
+    # Create placeholder server.js (will be replaced by injection)
+    cat > rootfs/opt/vm-browser-agent/server.js <<'EOF'

... (placeholder server.js - will be replaced by injection) ...

-    # Create systemd service
-    cat > rootfs/etc/systemd/system/vm-api.service <<EOF
+    # Create systemd service for Browser VM OAuth agent
+    cat > rootfs/etc/systemd/system/vm-browser-agent.service <<EOF
 [Unit]
-Description=VM API Server
+Description=VM Browser OAuth Agent
 After=network.target

 [Service]
 Type=simple
 User=root
-WorkingDirectory=/opt/vm-api
-ExecStart=/usr/bin/node /opt/vm-api/server.js
+WorkingDirectory=/opt/vm-browser-agent
+ExecStart=/usr/bin/node /opt/vm-browser-agent/server.js
 Restart=always
 RestartSec=5

-    # Enable service
-    chroot rootfs systemctl enable vm-api
+    # Enable service
+    chroot rootfs systemctl enable vm-browser-agent

-    log_info "VM API server configured"
+    log_info "VM Browser Agent configured"
```

---

## Deployment Status

### Code Changes

| Component | Status | Details |
|-----------|--------|---------|
| **Build Script** | ✅ Updated | Uses `/opt/vm-browser-agent/` consistently |
| **Build Script** | ✅ Deployed | Copied to mini PC via SCP |
| **Commit** | ✅ Done | `1b31dc2` with detailed commit message |

### Golden Snapshot Rebuild

| Task | Status | Command |
|------|--------|---------|
| **Clean stale build dir** | ⏳ Required | `rm -rf /tmp/fc-golden-build` |
| **Start rebuild** | ⏳ Required | `cd /opt/master-controller && ./scripts/build-golden-snapshot.sh` |
| **Verify expect installed** | ⏳ After rebuild | `mount golden snapshot → check /usr/bin/expect` |
| **Verify service name** | ⏳ After rebuild | `check vm-browser-agent.service exists` |
| **Verify service paths** | ⏳ After rebuild | `grep '/opt/vm-browser-agent' service file` |
| **Copy to Browser filename** | ⏳ After rebuild | `cp golden-rootfs.ext4 golden-browser-rootfs.ext4` |

---

## Testing Plan (After Golden Snapshot Rebuild)

### 1. Verify Golden Snapshot Has Correct Paths

```bash
# Mount golden snapshot
ssh root@192.168.5.82 "mount -o loop /var/lib/firecracker/snapshots/base/golden-browser-rootfs.ext4 /mnt/debug-vm"

# Check service file
ssh root@192.168.5.82 "cat /mnt/debug-vm/etc/systemd/system/vm-browser-agent.service | grep ExecStart"
# Expected: ExecStart=/usr/bin/node /opt/vm-browser-agent/server.js

# Check directory exists
ssh root@192.168.5.82 "ls -la /mnt/debug-vm/opt/vm-browser-agent/"
# Expected: server.js and package.json exist

# Check expect is installed
ssh root@192.168.5.82 "ls -la /mnt/debug-vm/usr/bin/expect"
# Expected: -rwxr-xr-x ... expect

# Unmount
ssh root@192.168.5.82 "umount /mnt/debug-vm"
```

### 2. Test Codex OAuth Flow

1. **User clicks "Connect Codex"** → Browser VM created
2. **Injection runs** → Updates `/opt/vm-browser-agent/server.js` with expect wrapper
3. **VM boots** → systemd starts `vm-browser-agent.service`
4. **Service runs correct code** → NEW OAuth agent with `/auth/{provider}` endpoint ✅
5. **Master-controller sends** → POST `/auth/codex` with sessionId
6. **OAuth agent responds** → 200 OK, starts Codex CLI with expect wrapper
7. **Codex CLI runs** → expect intercepts cursor query, OAuth URL captured
8. **Frontend loads** → OAuth URL in browser interface
9. **User completes OAuth** → Codex credentials saved
10. **Session ready** → User can send prompts ✅

### Expected Success Logs

**Browser VM OAuth agent** (`/var/log/vm-browser-agent.log` or journald):
```json
{"level":"info","msg":"Starting CLI auth","provider":"codex","sessionId":"..."}
{"level":"info","msg":"Created expect wrapper for Codex CLI","expectScriptPath":"/tmp/codex-expect-..."}
{"level":"info","msg":"CLI output","text":"Finish signing in via your browser"}
{"level":"info","msg":"Captured OAuth URL","oauthUrl":"https://auth.openai.com/..."}
```

**Should NOT see**:
- ❌ `"HTTP 404 Not Found"` from master-controller
- ❌ `"expect: command not found"` in Browser VM logs
- ❌ `"The cursor position could not be read"` timeout errors

---

## How to Rebuild Golden Snapshot

```bash
# Clean stale build directory
ssh root@192.168.5.82 "rm -rf /tmp/fc-golden-build"

# Start fresh rebuild
ssh root@192.168.5.82 "cd /opt/master-controller && nohup ./scripts/build-golden-snapshot.sh > /tmp/snapshot-rebuild-$(date +%Y%m%d-%H%M%S).log 2>&1 &"

# Monitor progress (in separate terminal)
ssh root@192.168.5.82 "tail -f /tmp/snapshot-rebuild-*.log | grep -E 'INFO|ERROR|WARN'"

# Wait for completion (~15-20 minutes)
# Look for: "[INFO] Golden snapshot build complete!"

# Copy to Browser VM filename
ssh root@192.168.5.82 "cp /var/lib/firecracker/snapshots/base/golden-rootfs.ext4 /var/lib/firecracker/snapshots/base/golden-browser-rootfs.ext4"

# Verify service name and paths (see Testing Plan above)
```

---

## Key Learnings

### Lesson #1: Verify Service File Paths Match Injection

The systemd service **must** point to the same directory that injection updates:
- ✅ Service: `/opt/vm-browser-agent/server.js`
- ✅ Injection: `/opt/vm-browser-agent/server.js`

### Lesson #2: Check Injection Worked, Not Just Code Deployment

Previous debugging confirmed:
- ✅ Expect wrapper in `/opt/master-controller/vm-browser-agent/server.js` (source)
- ✅ Injection logic exists in `vm-manager.js`
- ✅ Injection DID run (timestamps match VM creation)

But didn't check if **service was running the injected code** vs OLD code from golden snapshot.

### Lesson #3: Golden Snapshot Acts as Fallback

If injection fails OR service points to wrong path:
- VM boots with OLD placeholder code from golden snapshot
- Service starts but serves outdated endpoints
- Manifests as 404 errors, not boot failures

**Always verify**:
1. Injection updates correct path
2. Systemd service points to that path
3. No duplicate directories with different code versions

---

## Related Documentation

### Created During Previous Sessions

1. **`CODEX-TTY-REQUIREMENT.md`** - PTY support for Codex CLI
2. **`CODEX-CURSOR-QUERY-FIX.md`** - TERM=dumb attempt (failed)
3. **`CODEX-CURSOR-QUERY-EXPECT-FIX.md`** - Expect wrapper solution (deployed)
4. **`OAUTH-AGENT-PATH-MISMATCH-FIX.md`** - **THIS DOCUMENT**

### Git Commits

```bash
# Expect wrapper implementation
git show 89429c8

# Golden snapshot expect package
git show 901aadb

# Path mismatch fix
git show 1b31dc2
```

---

## Current Status Summary

| Component | Status | Notes |
|-----------|--------|-------|
| **Root Cause** | ✅ Identified | Service path `/opt/vm-api/` vs injection `/opt/vm-browser-agent/` |
| **Fix Design** | ✅ Complete | Update golden snapshot build to use consistent paths |
| **Code Implementation** | ✅ Done | `build-golden-snapshot.sh` updated |
| **Code Deployment** | ✅ Deployed | Copied to mini PC via SCP |
| **Golden Snapshot Rebuild** | ⏳ **REQUIRED** | User must trigger rebuild |
| **End-to-End Test** | ⏳ Blocked | Waiting for golden snapshot rebuild |

---

**Next Action**: Rebuild golden snapshot with updated build script, then test Codex OAuth flow.

🎯 **Confidence Level**: **VERY HIGH** - Path mismatch definitively identified via direct filesystem inspection. Fix is straightforward path alignment.
