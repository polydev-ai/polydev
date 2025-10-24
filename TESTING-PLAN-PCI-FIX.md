# Testing Plan: Firecracker v1.13.1 PCI Block Device Fix

## Date: October 24, 2025 - 22:52 CEST

## Current Status
- ✅ Code fix implemented: `root=/dev/vda` → `root=/dev/sda rootwait` in vm-manager.js:193
- ✅ Documentation complete: FIRECRACKER-PCI-BLOCK-DEVICE-FIX.md
- ✅ Expert consensus verified: Three AI models (GPT-5, Gemini-2.5-Pro, Grok) confirm fix is correct
- ✅ Git commits created: Changes tracked (34e9e46, c228273)
- ⏳ Awaiting server access for deployment and testing

## Pre-Testing Verification Checklist

### Code Changes Verification
```bash
# Check vm-manager.js line 193 has the fix
grep "root=/dev/sda" /opt/master-controller/src/services/vm-manager.js
# Should output: boot_args: `console=ttyS0 reboot=k panic=1 root=/dev/sda rw rootfstype=ext4 rootwait ...`
```

### Server Environment Verification
```bash
# Check Firecracker version
/usr/local/bin/firecracker --version
# Should output: Firecracker v1.13.1 (or later)

# Check that master-controller is running
systemctl status master-controller
# Should show: active (running)

# Check that golden kernel is 5.15.0-157
ls -lh /var/lib/firecracker/snapshots/base/vmlinux
# Should be ~68MB (5.15 kernel), not 21MB (4.14 kernel)
```

## Testing Phase 1: VM Boot Test

### Step 1: Deploy Updated Code
```bash
scp /path/to/vm-manager.js root@polydev.ai:/opt/master-controller/src/services/vm-manager.js
systemctl restart master-controller
```

### Step 2: Create Test VM via API
```bash
curl -X POST http://localhost:3000/api/vms/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <test-token>" \
  -d '{
    "userId": "5abacdd1-6a9b-48ce-b723-ca8056324c7a",
    "vmType": "cli"
  }'
```

**Expected Response**:
```json
{
  "vmId": "vm-<uuid>",
  "ipAddress": "192.168.100.X",
  "status": "booting"
}
```

### Step 3: Monitor Console Output
```bash
# Find the test VM directory
VM_DIR=$(ls -td /var/lib/firecracker/users/vm-* | head -1)
tail -f $VM_DIR/console.log
```

**Expected Boot Sequence**:
1. Kernel boot messages (device tree, early printk)
2. PCI bus enumeration: `[0.071146] PCI: MMCONFIG for domain 0000`
3. PCI device discovery: `[0.088270] pci 0000:00:01.0: [1af4:1042]` (virtio-blk)
4. PCI device enabling: `[0.128055] virtio-pci 0000:00:01.0: enabling device`
5. **Block device registration**: `virtio_blk virtio0: ...` (KEY - this was missing before)
6. **Root filesystem mount**: `EXT4-fs ... mount successful` (KEY - should NOT fail with error -6)
7. Network configuration: `[    X.XXXXXX]      device=eth0, ipaddr=192.168.100.X` (from `ip=` parameter)
8. System initialization: systemd services starting (Xvfb, Openbox, x11vnc, websockify)
9. **BOOT SUCCESS**: `[[OK]] Reached target Graphical Interface`

**FAILURE INDICATORS** (if any of these appear, fix is not complete):
- `Cannot open root device "sda"` → Device naming still wrong
- `Cannot open root device` (any device) → virtio_blk driver not built-in or MSI support missing
- No `virtio_blk` message → PCI enumeration failed
- `Cannot claim memory region` → MMIO memory conflict (shouldn't happen with v1.13.1 PCI)

### Step 4: Verify Network Interface Configuration
Once VM successfully boots:

```bash
# From host machine, ping the test VM
ping -c 2 192.168.100.X
# Expected: 2 packets transmitted, 2 received, 0% packet loss

# Check TAP interface on host
ip link show | grep -A5 "fc-"
# Should show TAP interface UP, LOWER_UP, attached to br0

# Check tcpdump on TAP interface
tcpdump -i fc-vm-<8chars> -c 5
# Should show ARP replies from VM indicating network is configured
```

### Step 5: Verify System Services
```bash
# From another SSH session, connect to VM serial console via socat
socat - UNIX-CONNECT:/var/lib/firecracker/users/vm-<uuid>/console.sock

# Inside VM, run:
ip link show eth0
# Should output: eth0: ... state UP with IP from ip= parameter

ip addr show eth0
# Should output: inet 192.168.100.X/24

ip route show
# Should output: default via 192.168.100.1

systemctl status x11vnc
# Should output: active (running)

systemctl status websockify
# Should output: active (running)
```

## Testing Phase 2: Network Connectivity Test

### Step 1: WebSocket Connection Test
```bash
# Test WebSocket to noVNC proxy on VM
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  -H "Sec-WebSocket-Version: 13" \
  http://192.168.100.X:6080/
```

**Expected Response**:
```
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

**Success Indicator**: 101 Switching Protocols means WebSocket handshake succeeded

### Step 2: VNC Protocol Test
```bash
# If WebSocket succeeded, VNC server should respond with:
telnet 192.168.100.X 5900
# Expected: RFB 003.008 (VNC protocol version)
```

## Testing Phase 3: OAuth Flow Test

### Step 1: Redirect User to Remote CLI
```bash
curl -X POST http://localhost:3000/api/oauth/redirect \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "5abacdd1-6a9b-48ce-b723-ca8056324c7a",
    "provider": "github"
  }'
```

**Expected Response**:
```json
{
  "redirectUrl": "https://github.com/login/oauth/authorize?...",
  "sessionId": "session-<uuid>"
}
```

### Step 2: Simulate OAuth Callback
```bash
# After user authorizes in OAuth provider, callback includes:
# code=<authorization-code>&state=<state>

curl -X POST http://localhost:3000/api/oauth/callback \
  -H "Content-Type: application/json" \
  -d '{
    "code": "<authorization-code>",
    "state": "<state>"
  }'
```

**Expected Response**:
```json
{
  "status": "success",
  "credentials": {
    "access_token": "<token>",
    "refresh_token": "<token>"
  }
}
```

### Step 3: Verify OAuth Agent in VM
```bash
# Check if OAuth agent is running in VM
systemctl status vm-browser-oauth-agent

# Check logs for successful OAuth code exchange
journalctl -u vm-browser-oauth-agent -n 20
# Should show: "OAuth code exchange successful" or similar message
```

## Expected Results

### Success Criteria
- ✅ VM boots to graphical target without "Cannot open root device" error
- ✅ Network interface eth0 comes up with IP from `ip=` parameter
- ✅ TAP interface on host receives ARP replies from VM
- ✅ WebSocket upgrade handshake succeeds (HTTP 101)
- ✅ VNC protocol responds (RFB version string)
- ✅ OAuth agent in VM successfully exchanges authorization code
- ✅ Web browser can connect to VM via noVNC at `http://host:6080`

### Failure Indicators
- ❌ "Cannot open root device" error → Block device naming still wrong
- ❌ No PCI device enumeration messages → Firecracker v1.13.1 not installed
- ❌ Network not coming up → `ip=` parameter not processed correctly
- ❌ WebSocket returns 404 → noVNC not running or port not open
- ❌ OAuth code exchange fails → OAuth agent not injected or network issue

## Rollback Plan (If Fix Doesn't Work)

If testing shows the fix is incomplete:

1. **Check kernel CONFIG**: Verify `CONFIG_VIRTIO_BLK=y`, `CONFIG_VIRTIO_PCI=y`, `CONFIG_VIRTIO_PCI_MODERN=y` are built-in
   ```bash
   zcat /proc/config.gz | grep -i virtio
   ```

2. **Check PCI enumeration**: Verify PCI subsystem is discovering devices
   ```bash
   dmesg | grep -i "pci.*virtio"
   ```

3. **Try alternative**: Use PARTUUID instead of `/dev/sda`
   - Extract PARTUUID from golden snapshot
   - Update boot args to `root=PARTUUID=<uuid> rootwait`

4. **If all else fails**: Revert to Firecracker v1.9.1 with kernel parameter workarounds
   ```bash
   ln -sf firecracker-v1.9.1.backup /usr/local/bin/firecracker
   systemctl restart master-controller
   ```

## Test Execution Log Template

```markdown
## Test Execution: [Date/Time]

### Pre-Test Verification
- [ ] Code deployed
- [ ] Firecracker version confirmed (v1.13.1)
- [ ] Golden kernel confirmed (5.15.0-157)
- [ ] master-controller running

### Test VM Creation
- [ ] VM created successfully
- [ ] IP assigned: 192.168.100.X
- [ ] Console output readable

### Boot Test Results
- [ ] PCI enumeration successful
- [ ] virtio-blk device registered
- [ ] Root filesystem mounted successfully
- [ ] Boot completed without errors

### Network Test Results
- [ ] eth0 interface UP
- [ ] IP configuration applied from `ip=` parameter
- [ ] ping to VM successful
- [ ] WebSocket upgrade succeeded
- [ ] VNC protocol responded

### OAuth Test Results
- [ ] OAuth agent running in VM
- [ ] Code exchange successful
- [ ] Credentials stored correctly

### Overall Result
- [ ] **PASS** - Fix is working, ready for production
- [ ] **FAIL** - Additional debugging needed (see section below)

### Additional Notes
[Add any observations, error messages, or additional findings]
```

## Summary

This fix addresses the final blocker for Firecracker v1.13.1 PCI support. The change from `/dev/vda` to `/dev/sda` with `rootwait` is validated by expert consensus and should enable complete VM boot and network functionality.

**Expected Outcome**: VMs boot successfully with full network connectivity, allowing OAuth flows and noVNC connections to function correctly.
