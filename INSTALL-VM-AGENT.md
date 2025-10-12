# Install VM Agent to Golden Snapshot

## Problem
CLI VMs boot without an HTTP server running on port 8080, causing health checks to fail and authentication to timeout after 60 seconds.

## Solution
Install a minimal Python HTTP server as a systemd service in the golden snapshot.

---

## Files Created

Three files are ready in `/Users/venkat/Documents/polydev-ai/vm-agent/`:

1. **health-server.py** - Python HTTP server with:
   - `GET /health` → returns 'ok'
   - `POST /credentials/write` → writes credentials to filesystem

2. **vm-agent.service** - systemd service file for auto-starting the server

3. **install-to-snapshot.sh** - Installation script

---

## Installation Steps

### Option 1: Automated Installation (Recommended)

**On your Mac:**
```bash
cd /Users/venkat/Documents/polydev-ai/vm-agent
```

**Copy files manually (since SSH fails):**
Open these files and copy their contents:
- health-server.py
- vm-agent.service
- install-to-snapshot.sh

**In your active SSH session (PID 1085) to 192.168.5.82:**

1. Create VM agent directory:
```bash
mkdir -p /tmp/vm-agent
cd /tmp/vm-agent
```

2. Create files (paste contents from Mac):
```bash
cat > health-server.py << 'EOF'
[paste health-server.py contents here]
EOF

cat > vm-agent.service << 'EOF'
[paste vm-agent.service contents here]
EOF

cat > install-to-snapshot.sh << 'EOF'
[paste install-to-snapshot.sh contents here]
EOF

chmod +x install-to-snapshot.sh
```

3. Run installation:
```bash
sudo /tmp/vm-agent/install-to-snapshot.sh
```

**Expected output:**
```
==========================================
VM Agent Installation for Golden Snapshot
==========================================

✅ Found golden rootfs: /opt/firecracker/golden/rootfs.ext4
Creating mount point...
Mounting golden rootfs...
✅ Golden rootfs mounted at: /mnt/vmroot

Installing VM agent...
✅ VM agent script installed
Installing systemd service...
✅ Systemd service installed and enabled

Unmounting golden rootfs...

==========================================
✅ INSTALLATION COMPLETE
==========================================
```

---

### Option 2: Manual Installation (If Script Fails)

**In SSH session:**

1. Mount golden rootfs:
```bash
sudo mkdir -p /mnt/vmroot
sudo mount -o loop /opt/firecracker/golden/rootfs.ext4 /mnt/vmroot
```

2. Create VM agent directory:
```bash
sudo mkdir -p /mnt/vmroot/opt/vm-agent
```

3. Create health-server.py:
```bash
sudo bash -c 'cat > /mnt/vmroot/opt/vm-agent/health-server.py' << 'EOF'
[paste health-server.py contents here]
EOF

sudo chmod 0755 /mnt/vmroot/opt/vm-agent/health-server.py
```

4. Create systemd service:
```bash
sudo bash -c 'cat > /mnt/vmroot/etc/systemd/system/vm-agent.service' << 'EOF'
[paste vm-agent.service contents here]
EOF

sudo chmod 0644 /mnt/vmroot/etc/systemd/system/vm-agent.service
```

5. Enable service:
```bash
sudo mkdir -p /mnt/vmroot/etc/systemd/system/multi-user.target.wants
sudo ln -sf ../vm-agent.service /mnt/vmroot/etc/systemd/system/multi-user.target.wants/vm-agent.service
```

6. Unmount:
```bash
sudo umount /mnt/vmroot
```

---

## Testing

### Test 1: Create Test VM

**In SSH session:**
```bash
# Check current VMs
curl -s http://192.168.5.82:4000/api/vms/list | jq .

# Create a test CLI VM
curl -X POST http://192.168.5.82:4000/api/vm/create \
  -H 'Content-Type: application/json' \
  -d '{"userId":"test-user-001","vmType":"cli"}' | jq .
```

**Expected response:**
```json
{
  "success": true,
  "vmId": "vm-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "ipAddress": "192.168.100.X"
}
```

### Test 2: Verify Health Check

**Wait 5 seconds, then:**
```bash
# Replace with actual IP from Test 1
curl http://192.168.100.X:8080/health
```

**Expected:** `ok`

### Test 3: Verify Service Status

**SSH into VM (if possible):**
```bash
# From host
ssh root@192.168.100.X

# Inside VM
systemctl status vm-agent
journalctl -u vm-agent -n 20
ss -tlnp | grep 8080
```

**Expected:**
- Service: `active (running)`
- Logs: `VM Agent listening on 0.0.0.0:8080`
- Port: `LISTEN 0.0.0.0:8080`

### Test 4: Full Authentication Flow

**From your Mac:**
```bash
curl -X POST http://192.168.5.82:4000/api/auth/start \
  -H 'Content-Type: application/json' \
  -d '{"userId":"5abacdd1-6a9b-48ce-b723-ca8056324c7a","provider":"claude_code"}'
```

**Expected:** Should NOT timeout after 60 seconds. CLI VM should be ready within 5-10 seconds.

**Monitor logs:**
```bash
ssh backspace@192.168.5.82 'sudo journalctl -u master-controller -f'
```

**Look for:**
```
[WAIT-VM-READY] VM ready! { vmIP: '192.168.100.X' }
```

---

## Troubleshooting

### If health check fails:

1. **Check if Python3 is installed in golden snapshot:**
```bash
sudo mount -o loop /opt/firecracker/golden/rootfs.ext4 /mnt/vmroot
ls -la /mnt/vmroot/usr/bin/python3
sudo umount /mnt/vmroot
```

2. **Check if service files exist:**
```bash
sudo mount -o loop /opt/firecracker/golden/rootfs.ext4 /mnt/vmroot
ls -la /mnt/vmroot/opt/vm-agent/health-server.py
ls -la /mnt/vmroot/etc/systemd/system/vm-agent.service
ls -la /mnt/vmroot/etc/systemd/system/multi-user.target.wants/vm-agent.service
sudo umount /mnt/vmroot
```

3. **Test service manually in VM:**
```bash
# SSH into VM
ssh root@192.168.100.X

# Try starting manually
/usr/bin/python3 /opt/vm-agent/health-server.py

# Should see: VM Agent listening on 0.0.0.0:8080
# Test from another terminal: curl http://192.168.100.X:8080/health
```

### If golden rootfs path is wrong:

Edit `/tmp/vm-agent/install-to-snapshot.sh` line 15:
```bash
GOLDEN_ROOTFS="/path/to/actual/rootfs.ext4"
```

Find actual path:
```bash
grep -r "goldenRootfs" /opt/master-controller/src/config/
```

---

## Rollback (If Needed)

If the modified golden snapshot causes issues:

1. **Restore from backup (if you created one):**
```bash
sudo cp /opt/firecracker/golden/rootfs.ext4.backup /opt/firecracker/golden/rootfs.ext4
```

2. **Remove VM agent manually:**
```bash
sudo mount -o loop /opt/firecracker/golden/rootfs.ext4 /mnt/vmroot
sudo rm -rf /mnt/vmroot/opt/vm-agent
sudo rm /mnt/vmroot/etc/systemd/system/vm-agent.service
sudo rm /mnt/vmroot/etc/systemd/system/multi-user.target.wants/vm-agent.service
sudo umount /mnt/vmroot
```

---

## Summary

**What this fixes:**
- ✅ CLI VMs will have HTTP server running on boot
- ✅ Health checks will succeed within seconds
- ✅ Credential transfer will work
- ✅ Authentication will complete successfully

**Impact:**
- ✅ Only affects new VMs created after modification
- ✅ Existing VMs continue to work as-is
- ✅ No changes to master-controller code needed
- ✅ No runtime performance impact

**Time estimate:**
- Installation: 5 minutes
- Testing: 5 minutes
- Total: 10 minutes

---

**Created:** 2025-10-12 00:40 UTC
**Issue:** CLI VM health checks timeout (no HTTP server running)
**Status:** Ready to install - All files created
