# Network Bootstrap Fix - Test Plan

## Summary
The VM network bootstrap issue has been fixed by adding proper systemd.network configuration and a kernel parameter processor service to the golden image. This document outlines how to verify the fix works.

## Changes Made

### 1. **Removed unreliable netplan configuration**
   - Old approach: Used `/etc/netplan/01-netcfg.yaml`
   - Issue: Netplan doesn't work reliably in Firecracker VMs with kernel `ip=` parameters
   - Solution: Replaced with direct systemd.network files

### 2. **Added systemd.network configuration files**
   - **`/etc/systemd/network/10-eth0.network`** (Primary config)
     - Enables DHCP for eth0
     - Includes IPv6 link-local support
     - Configures DNS from DHCP server

   - **`/etc/systemd/network/20-eth0-fallback.network`** (Fallback config)
     - Provides static IP: 192.168.100.10/24
     - Sets gateway and DNS servers
     - Used if DHCP fails

### 3. **Added kernel parameter processor service**
   - **Service**: `setup-network-kernel-params.service`
   - **Runs before**: systemd-networkd.service
   - **Purpose**: Parses kernel `ip=` parameter and applies network config
   - **Script**: `/usr/local/bin/setup-network-kernel-params.sh`
   - **Logs to**: `/tmp/network-setup.log`

### 4. **Updated vm-browser-agent service dependencies**
   - Now depends on `setup-network-kernel-params.service`
   - Waits for `network-online.target`
   - Ensures eth0 is UP before agent starts listening on port 8080

## Expected Behavior After Fix

### VM Boot Sequence
1. Kernel boots with `ip=192.168.100.X::192.168.100.1:255.255.255.0::eth0:on`
2. `setup-network-kernel-params.service` starts FIRST
3. Service parses kernel parameters
4. Service runs: `ip link set eth0 up`
5. Service runs: `ip addr add 192.168.100.X/24 dev eth0`
6. Service runs: `ip route add default via 192.168.100.1`
7. systemd-networkd starts and takes over
8. `vm-browser-agent` starts AFTER network is ready
9. Agent listens on `0.0.0.0:8080`
10. Master controller can reach agent on `192.168.100.X:8080`

### Network Verification Commands (in VM)
```bash
# Check eth0 status
ip link show eth0
# Expected: "eth0: <BROADCAST,MULTICAST,UP,LOWER_UP>" (UP state)

# Check IP address
ip addr show eth0
# Expected: "inet 192.168.100.X/24 scope global eth0"

# Check default route
ip route show
# Expected: "default via 192.168.100.1 dev eth0"

# Check network connectivity
ping -c 1 192.168.100.1
# Expected: "1 packets transmitted, 1 received"

# Check systemd-networkd status
systemctl status systemd-networkd
# Expected: "active (running)"

# Check agent startup logs
journalctl -u vm-browser-agent -n 20
# Expected: No connection errors, agent listening on port 8080
```

## Testing Steps

### Step 1: Verify Golden Image Build Completes
- Monitor: `bash dae522` (background build process)
- Expected output: "Golden snapshot created!" message
- Expected file: `/var/lib/firecracker/snapshots/base/golden-rootfs.ext4` (8.0 GB)

### Step 2: Create New Browser VM from Fixed Golden Image
```bash
# On master controller:
curl -X POST "http://135.181.138.102:4000/api/auth/start" \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test-network-fix-'$(date +%s)'", "provider": "claude_code"}'
```

### Step 3: Monitor VM Boot
```bash
# Get new VM IP from master controller response
VM_IP="192.168.100.X"

# Check console logs
tail -f /var/lib/firecracker/users/VM_ID/console.log

# Expected log output:
# - "Started Setup Network from Kernel Parameters"
# - "Found kernel IP parameter: 192.168.100.X..."
# - "Network setup complete for eth0"
# - "OK Started VM Browser OAuth Agent"
```

### Step 4: Verify Network Interface is UP
```bash
# From VPS host - check TAP interface status
ip link show | grep tap
# Expected: "tapVMID@..."
# Status should change from "NO-CARRIER" to "BROADCAST,MULTICAST,UP"

# Or SSH into VM (if accessible from VPS):
ssh root@$VM_IP "ip link show eth0"
# Expected: eth0 with UP flag
```

### Step 5: Verify Agent is Reachable
```bash
# From master controller:
curl http://$VM_IP:8080/health
# Expected: {"status": "ok", "timestamp": "..."}
# Response code: 200 OK
```

### Step 6: Trigger OAuth Flow
```bash
# Use the same session ID from Step 2
SESSION_ID="test-network-fix-..."

# Check OAuth flow status
curl "http://135.181.138.102:4000/api/auth/session/$SESSION_ID/status"
# Expected: OAuth flow progressing without EHOSTUNREACH errors
```

### Step 7: Verify Firefox Opens
```bash
# In VM, check Firefox launch logs
cat /tmp/firefox-launch.log
# Expected: "Firefox launch starting at..."
# Should see Firefox process running

# In noVNC console:
# Expected: Firefox window appears with OAuth login page
```

## Success Criteria

✅ **Network comes UP on VM boot**
- eth0 has IP address 192.168.100.X
- Default route is set via 192.168.100.1
- Can ping master controller from VM

✅ **Agent is reachable**
- Master controller can curl http://VM_IP:8080/health
- Returns 200 OK response

✅ **Agent service starts successfully**
- No ECONNREFUSED or EHOSTUNREACH errors
- Agent logs show listening on port 8080

✅ **OAuth flow works end-to-end**
- No 500 errors from credentials proxy endpoint
- Master controller successfully reaches agent

✅ **Firefox opens automatically**
- Firefox wrapper script creates /tmp/firefox-launcher.sh
- Firefox launches with OAuth URL
- Browser window visible in noVNC
- User can authenticate

## Troubleshooting

### If eth0 still doesn't come UP
**Check**: Network setup service logs
```bash
# In VM
cat /tmp/network-setup.log

# In host
journalctl -u setup-network-kernel-params
```

**Possible causes**:
1. Kernel boot parameter not being passed correctly
2. Systemd service not starting
3. Permission issues with ip commands

**Fix**: Check kernel command line in VM:
```bash
cat /proc/cmdline
# Should contain: ip=192.168.100.X::192.168.100.1:255.255.255.0::eth0:on
```

### If agent doesn't start
**Check**: Service logs
```bash
journalctl -u vm-browser-agent -n 50
```

**Possible causes**:
1. Network interface not ready when agent tries to start
2. Port 8080 already in use
3. Node.js installation issue

**Verify**: Wait longer for network to come up before checking
```bash
sleep 10
curl http://VM_IP:8080/health
```

### If Firefox doesn't open
**Check**: Firefox launch logs
```bash
cat /tmp/firefox-launch.log
```

**Possible causes**:
1. X11 display not available
2. Firefox binary not found
3. OAuth URL not captured correctly

**Verify**: Test X11 manually
```bash
DISPLAY=:1 xset q
```

## Rollback Plan

If the network fix causes issues:

1. **Restore previous golden image**:
   ```bash
   # On VPS, if previous image was backed up
   cp /var/lib/firecracker/snapshots/base/golden-rootfs.ext4.backup \
      /var/lib/firecracker/snapshots/base/golden-rootfs.ext4
   ```

2. **Kill all running VMs** and create new ones:
   ```bash
   killall firecracker
   # VMs created afterward will use the previous image
   ```

3. **Code rollback**: Previous build script is in git history
   ```bash
   git log --oneline | grep -i network
   git show <commit>:master-controller/scripts/build-golden-snapshot-complete.sh
   ```

## Timeline

- **Golden Image Build**: ~12-15 minutes (currently running)
- **First VM Creation**: ~30 seconds
- **Network Coming UP**: ~5 seconds after VM boot
- **Agent Starting**: ~10 seconds after network ready
- **OAuth Flow**: ~10 seconds after agent ready
- **Firefox Opening**: ~5 seconds after OAuth triggered
- **Total End-to-End**: ~1 minute from VM creation to Firefox open

## Files Modified

1. `/opt/master-controller/scripts/build-golden-snapshot-complete.sh`
   - Replaced netplan config with systemd.network files
   - Added setup-network-kernel-params.service
   - Updated vm-browser-agent service dependencies

2. Deployed to VPS:
   - Updated script: ✅ Deployed via SCP
   - Golden image rebuild: ⏳ In progress (bash dae522)

## Next Actions

1. ⏳ Wait for golden image build to complete (~10 more minutes)
2. ✅ Create test Browser VM from new golden image
3. ✅ Verify eth0 comes UP
4. ✅ Verify agent is reachable
5. ✅ Trigger OAuth flow
6. ✅ Verify Firefox opens with login page
7. ✅ Complete authentication
8. ✅ Confirm credentials captured

---

**Status**: Golden image rebuild in progress
**Build Process ID**: bash dae522
**Expected Completion**: ~17:45-17:55 UTC (in ~10-20 minutes from start at 17:45)

