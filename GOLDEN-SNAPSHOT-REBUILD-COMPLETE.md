# Golden Snapshot Rebuild - COMPLETE

**Date**: October 16, 2025 07:53 UTC
**Status**: ✅ **READY FOR TESTING**

---

## Executive Summary

The golden snapshot has been **successfully rebuilt** with all fixes for the Codex OAuth path mismatch issue. The new snapshot is deployed and ready for end-to-end testing.

### What Was Fixed

- ✅ **Service path mismatch resolved** - Service now points to `/opt/vm-browser-agent/` (same as injection)
- ✅ **Expect package installed** - Required for Codex CLI cursor query interception
- ✅ **Service configuration correct** - `vm-browser-agent.service` with proper paths
- ✅ **Golden snapshot deployed** - Copied to `golden-browser-rootfs.ext4` for Browser VM use

---

## Build Timeline

| Time | Event | Details |
|------|-------|---------|
| **07:47 UTC** | Build started | Fresh build with updated script |
| **07:47-07:51 UTC** | Package installation | Base packages, expect, Node.js setup |
| **07:51-07:52 UTC** | Node.js installation | Node.js 20 from NodeSource |
| **07:52 UTC** | Build completed | 8.0GB golden snapshot created |
| **07:52 UTC** | Verification passed | Expect package and service paths confirmed |
| **07:53 UTC** | Deployment complete | Copied to Browser filename |

---

## Verification Results

### 1. Golden Snapshot File

```bash
$ ssh root@192.168.5.82 "ls -lh /var/lib/firecracker/snapshots/base/golden-*.ext4"

-rw-r--r-- 1 root root 8.0G Oct 16 07:52 golden-rootfs.ext4
-rw-r--r-- 1 root root 8.0G Oct 16 07:53 golden-browser-rootfs.ext4
```

**Status**: ✅ Both files present, correct size (8.0GB), fresh timestamps

### 2. Expect Package Installation

```bash
$ mount -o loop golden-rootfs.ext4 /mnt/debug-vm
$ ls -lh /mnt/debug-vm/usr/bin/expect
-rwxr-xr-x 1 root root 15K Sep  5  2019 /usr/bin/expect
```

**Status**: ✅ Expect package installed (15KB binary)

### 3. Service Configuration

```bash
$ cat /mnt/debug-vm/etc/systemd/system/vm-browser-agent.service

[Unit]
Description=VM Browser OAuth Agent
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/vm-browser-agent          ← CORRECT PATH
ExecStart=/usr/bin/node /opt/vm-browser-agent/server.js  ← CORRECT PATH
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

**Status**: ✅ Service name correct (`vm-browser-agent.service`)
**Status**: ✅ Paths match injection target (`/opt/vm-browser-agent/`)

### 4. OAuth Agent Directory

```bash
$ ls -la /mnt/debug-vm/opt/vm-browser-agent/
drwxr-xr-x  2 root root 4096 Oct 16 07:51 .
-rw-r--r--  1 root root  387 Oct 16 07:51 package.json
-rw-r--r--  1 root root 9876 Oct 16 07:51 server.js
```

**Status**: ✅ Placeholder server.js present (will be replaced by injection)

---

## What Changed from Previous Snapshot

### Before (Path Mismatch)

- ❌ Service: `/opt/vm-api/server.js`
- ❌ Injection: `/opt/vm-browser-agent/server.js`
- ❌ Result: Service ran OLD code without `/auth/` endpoint → 404 error

### After (Paths Aligned)

- ✅ Service: `/opt/vm-browser-agent/server.js`
- ✅ Injection: `/opt/vm-browser-agent/server.js`
- ✅ Result: Service runs INJECTED code with expect wrapper → OAuth works

---

## Testing Instructions

### 1. Create Browser VM for Codex OAuth

User should:
1. Navigate to dashboard
2. Click "Connect Codex CLI"
3. Frontend will create Browser VM from new golden snapshot

### 2. Expected Behavior

**Browser VM creation**:
```json
{"level":"info","msg":"Creating Browser VM","userId":"...","vmType":"browser"}
{"level":"info","msg":"Cloning golden snapshot","src":"golden-browser-rootfs.ext4"}
{"level":"info","msg":"Browser VM - injecting OAuth agent","vmId":"..."}
{"level":"info","msg":"OAuth agent injection complete","vmId":"..."}
```

**VM boot and service start**:
```bash
# Service starts from correct path
systemctl status vm-browser-agent
# Active: active (running)
# Main PID: ... /usr/bin/node /opt/vm-browser-agent/server.js
```

**OAuth flow**:
```json
{"level":"info","msg":"Starting CLI auth","provider":"codex","sessionId":"..."}
{"level":"info","msg":"Created expect wrapper for Codex CLI","expectScriptPath":"/tmp/codex-expect-..."}
{"level":"info","msg":"CLI output","text":"Finish signing in via your browser"}
{"level":"info","msg":"CLI output","text":"https://auth.openai.com/oauth/authorize?..."}
{"level":"info","msg":"Captured OAuth URL from CLI output","oauthUrl":"https://auth.openai.com/..."}
```

### 3. Success Criteria

- ✅ **No 404 errors** when starting Codex CLI
- ✅ **No "expect: command not found"** errors
- ✅ **No cursor position timeout** errors
- ✅ **OAuth URL captured** and displayed in frontend
- ✅ **User completes OAuth** in browser interface
- ✅ **Session becomes ready** with credentials saved

---

## Debugging if Testing Fails

### If 404 Error Occurs

Check service is running injected code:

```bash
# SSH into mini PC
ssh root@192.168.5.82

# Find newest Browser VM
ls -lt /var/lib/firecracker/users/ | grep vm- | head -1

# Mount and check service
mount -o loop /var/lib/firecracker/users/{VM_ID}/rootfs.ext4 /mnt/debug-vm
cat /mnt/debug-vm/etc/systemd/system/*.service | grep ExecStart

# Should show:
# ExecStart=/usr/bin/node /opt/vm-browser-agent/server.js  ✅

# Check if injected code has /auth/ endpoint
grep '/auth/' /mnt/debug-vm/opt/vm-browser-agent/server.js

# Should find line ~317:
# if (url.pathname.startsWith('/auth/') && req.method === 'POST')  ✅

umount /mnt/debug-vm
```

### If Expect Not Found

Check expect is in Browser VM:

```bash
mount -o loop /var/lib/firecracker/users/{VM_ID}/rootfs.ext4 /mnt/debug-vm
ls -lh /mnt/debug-vm/usr/bin/expect

# Should show:
# -rwxr-xr-x 1 root root 15K Sep  5  2019 /usr/bin/expect  ✅

umount /mnt/debug-vm
```

### If Still Having Issues

Check master-controller logs:

```bash
ssh root@192.168.5.82 "journalctl -u master-controller -f"
```

Check Browser VM OAuth agent logs (if accessible via journald or file):

```bash
mount -o loop /var/lib/firecracker/users/{VM_ID}/rootfs.ext4 /mnt/debug-vm
tail -100 /mnt/debug-vm/var/log/vm-browser-agent.log
umount /mnt/debug-vm
```

---

## Related Documentation

1. **`OAUTH-AGENT-PATH-MISMATCH-FIX.md`** - Root cause analysis and fix
2. **`CODEX-CURSOR-QUERY-EXPECT-FIX.md`** - Expect wrapper implementation
3. **`build-golden-snapshot.sh`** - Build script with fixes (commit `1b31dc2`)
4. **`vm-browser-agent/server.js`** - OAuth agent with expect wrapper (commit `89429c8`)

---

## Current Status

| Component | Status | Notes |
|-----------|--------|-------|
| **Build Script** | ✅ Updated | Commit `1b31dc2` with path fixes |
| **Golden Snapshot** | ✅ Built | 8.0GB, Oct 16 07:52 UTC |
| **Expect Package** | ✅ Installed | `/usr/bin/expect` (15KB) |
| **Service Config** | ✅ Correct | `vm-browser-agent.service` pointing to `/opt/vm-browser-agent/` |
| **Browser Snapshot** | ✅ Deployed | `golden-browser-rootfs.ext4` copied |
| **OAuth Agent Code** | ✅ Deployed | Expect wrapper in `/opt/master-controller/vm-browser-agent/server.js` |
| **Master-Controller** | ✅ Running | PID 1038344, latest code |

---

## Next Action

**User should test Codex OAuth flow**:
1. Click "Connect Codex CLI" in dashboard
2. Wait for Browser VM creation (~10 seconds)
3. Complete OAuth in browser interface
4. Verify session becomes ready

If successful, the OAuth agent path mismatch issue is **FULLY RESOLVED**. 🎯

---

**Confidence Level**: **VERY HIGH** - All components verified, paths aligned, expect installed.
