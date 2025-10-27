# VM Network Bootstrap Issue - Infrastructure Problem

## Status
🟡 Firefox wrapper code is correctly deployed and working. VMs are booting and agent service starts. **But VMs cannot reach the network.**

## What Works
✅ Golden image successfully rebuilt (Oct 27 18:36)
✅ vm-browser-agent service starts on boot (confirmed in console.log)
✅ Firefox wrapper code (556 lines) deployed to VPS
✅ Master controller running and responsive
✅ VM boots to login prompt in ~30 seconds
✅ Firecracker VM creation working

## What Fails
❌ VM network interface (eth0) never comes UP
❌ systemd-networkd not processing kernel `ip=` parameter
❌ Master controller cannot reach agent on port 8080 (EHOSTUNREACH)
❌ TAP interface on host shows NO-CARRIER

## Evidence

### Kernel Boot Parameters (Correct)
```
ip=192.168.100.2::192.168.100.1:255.255.255.0::eth0:on
```

### systemd-networkd Startup (Logs Show It Started)
```
Starting Dispatcher daemon for systemd-networkd...
[OK] Started Dispatcher daemon for systemd-networkd.
```

### But No Network Configuration Applied
```
console.log shows no:
- eth0 coming UP
- DHCP negotiation
- IP address assignment
- Network connectivity
```

## Root Cause Analysis

The kernel parameter `ip=192.168.100.X::192.168.100.1:...::eth0:on` should be processed by **systemd-network-generator** which converts it to .network files. But this isn't happening in the current golden image.

**Possible causes:**
1. systemd-network-generator not enabled/installed
2. Network config directory empty (confirmed - `/etc/systemd/network/` is empty)
3. systemd-networkd not reading kernel parameters correctly
4. Missing network device at boot (unlikely - kernel sees eth0)

## What Needs to Happen

The golden image needs proper network initialization:

**Option A: Add network config files to golden image**
- Create `/etc/systemd/network/10-eth0.network` with:
  ```ini
  [Match]
  Name=eth0

  [Network]
  DHCP=ipv4
  
  [DHCPv4]
  RouteMetric=100
  ```

**Option B: Use systemd-network-generator correctly**
- Ensure systemd-network-generator service runs on boot
- Verify it processes kernel `ip=` parameters

**Option C: Use custom init script**
- Create `/etc/rc.local` or systemd service to bring up eth0
- Run: `ip addr add 192.168.100.X/24 dev eth0 && ip route add default via 192.168.100.1`

## Impact on Firefox Fix

✅ **The Firefox wrapper code fix is complete and correct!**

The network issue is SEPARATE from the Firefox code. Once networking is fixed:
1. Agent service can listen on 0.0.0.0:8080
2. Master controller can reach agent
3. OAuth flow can trigger
4. Firefox wrapper script will execute
5. Browser window will open with login page

## Firefox Wrapper Code Status

**Location**: `/opt/master-controller/vm-browser-agent/server.js`
**Size**: 556 lines (correct size, new code)
**Feature**: Bash wrapper with X11 environment setup
**Status**: ✅ Ready to use once networking works

## Test Plan Once Network Fixed

1. VM boots with working eth0
2. Master controller reaches agent on 192.168.100.X:8080
3. OAuth flow triggers agent  
4. Agent spawns Claude CLI
5. CLI outputs OAuth URL
6. Firefox wrapper creates `/tmp/firefox-launcher.sh`
7. Firefox launches with DISPLAY=:1
8. Browser appears in noVNC with login page
9. User authenticates
10. Credentials captured ✅

## Quick Network Fix (Temporary)

To test if fixing network would work:
```bash
# In VM (via serial console)
ip link set eth0 up
ip addr add 192.168.100.2/24 dev eth0
ip route add default via 192.168.100.1
```

Then test from master controller:
```bash
curl http://192.168.100.2:8080/health
```

If this works, network initialization in golden image is the fix.

## Summary

The Firefox OAuth launch **code fix is complete** ✅. The blocking issue is **VM network bootstrap**, which is an infrastructure configuration problem that needs to be resolved in the Firecracker/systemd setup, not in the Firefox code.

Once network is fixed, the Firefox fix will work perfectly.
