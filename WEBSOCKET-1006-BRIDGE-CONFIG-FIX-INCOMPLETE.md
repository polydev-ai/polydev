# WebSocket 1006 - Bridge Configuration Fix Incomplete

## Date: October 24, 2025 - 21:14 CEST

## Status: ⚠️ **PARTIAL FIX - NETWORK CONNECTIVITY STILL BROKEN**

## Summary

Fixed the bridge/IP subnet configuration mismatch between code expectations and actual server configuration. However, **VMs still cannot be reached from the host** despite correct configuration, indicating a deeper network stack issue.

## What Was Fixed

### 1. ✅ Bridge IP Configuration
**Before**: Bridge was configured as `192.168.0.1/16`
**After**: Bridge reconfigured to `192.168.100.1/24`

```bash
# Removed old IP
ip addr del 192.168.0.1/16 dev br0

# Added correct IP
ip addr add 192.168.100.1/24 dev br0
```

### 2. ✅ Environment Variables
**Before**: `.env` had incorrect variable names:
```bash
VM_IP_POOL_START=192.168.100.2
VM_IP_POOL_END=192.168.100.254
BRIDGE_DEVICE=br0
```

**After**: Fixed to match code expectations:
```bash
IP_POOL_START=192.168.100.2
IP_POOL_END=192.168.100.254
BRIDGE_DEVICE=br0
BRIDGE_IP=192.168.100.1
INTERNAL_NETWORK=192.168.100.0/24
```

### 3. ✅ Master-Controller Restarted
Service restarted successfully with new configuration (PID: 811836)

### 4. ✅ VMs Now Created with Correct IPs
Test VM created successfully returned:
```json
{
  "success": true,
  "sessionId": "68cedf20-c92c-4708-b50a-f36e14c26024",
  "provider": "claude_code",
  "novncURL": "http://135.181.138.102:4000/api/auth/session/68cedf20-c92c-4708-b50a-f36e14c26024/novnc",
  "browserIP": "192.168.100.2"
}
```

## What's STILL BROKEN

### ❌ VMs Are Not Reachable from Host

Despite correct configuration, VMs cannot be reached:

```bash
# Ping test
ping -c 3 192.168.100.2
# Result: Destination Host Unreachable

# ARP test
arp -n | grep 192.168.100.2
# Result: 192.168.100.2    (incomplete)    br0

# Port 6080 test
curl http://192.168.100.2:6080/
# Result: No route to host
```

### Evidence from Running VM (vm-1abf1388)

**VM IS running** (PID: 811953) and **console shows successful boot**:
```
[    0.340273]      device=eth0, hwaddr=02:fc:40:99:97:1f, ipaddr=192.168.100.2, mask=255.255.255.0, gw=192.168.100.1
[[OK]] Started Network Configuration.
[[OK]] Started VM Browser OAuth Agent.
[[OK]] Started X Virtual Frame Buffer.
[[OK]] Started Openbox Window Manager.
[[OK]] Started x11vnc VNC Server.
[[OK]] Started Websockify VNC Proxy.
```

**TAP interface IS up**:
```
318: fc-vm-1abf1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel master br0 state UP mode DEFAULT group default qlen 1000
```

**But connectivity fails**!

## Root Cause Analysis

### Configuration is Correct

1. ✅ **Code configuration**: `master-controller/src/config/index.js` expects 192.168.100.x
2. ✅ **Environment variables**: `.env` now provides correct values
3. ✅ **Bridge IP**: `br0` is now 192.168.100.1/24
4. ✅ **VM IP allocation**: VMs get IPs in 192.168.100.x range
5. ✅ **Kernel boot args**: `ip=192.168.100.2::192.168.100.1:255.255.255.0::eth0:off`
6. ✅ **TAP interface**: Created, UP, attached to br0
7. ✅ **VM boots**: Console logs show successful startup

### The Problem

**VMs do not respond to network traffic from the host**, even though:
- Kernel configures IP correctly
- TAP interface shows UP
- All services start

This is **exactly the same issue** documented in:
- `VM-NETWORK-CONNECTIVITY-FAILURE-INVESTIGATION.md` (Oct 24, 20:10 CEST)
- `WEBSOCKET-1006-STILL-BLOCKED-BY-NETWORK.md` (Oct 24, 21:01 CEST)

### Suspected Root Causes

1. **systemd-networkd interfering with kernel IP config**: Console shows "Started Network Configuration" AFTER the kernel already configured the IP. This service might be reconfiguring or resetting the interface.

2. **Firecracker virtio-net driver issue**: TAP shows UP but VM's virtio-net driver may not be properly linked.

3. **Missing network stack initialization in VM**: The VM may need additional network configuration beyond just the kernel `ip=` parameter.

4. **Timing issue**: Network may be configured, then reset, then services try to bind before it's up again.

## Kernel Boot Args Investigation

Boot args from `master-controller/src/services/vm-manager.js:193`:
```javascript
boot_args: `console=ttyS0 reboot=k panic=1 root=/dev/vda rw rootfstype=ext4 net.ifnames=0 biosdevname=0 random.trust_cpu=on ip=${ipAddress}::${config.network.bridgeIP}:255.255.255.0::eth0:off`
```

The `:off` at the end means **"autoconf off"** (no DHCP), which is correct for static IP.

Format: `ip=<client-ip>:<server-ip>:<gw-ip>:<netmask>:<hostname>:<device>:<autoconf>`

## Evidence of Previous Success

Background process #243343 (from **Oct 19, 12:31 CEST** - 5 days ago) successfully connected to VM 192.168.100.5:6080 with:
```
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=

�RFB 003.008
```

This proves the system **has worked in the past** on the 192.168.100.x subnet, but that was with a different bridge configuration (before we changed it today).

## Files Modified

### Server Files
1. `/opt/master-controller/.env` - Fixed variable names
2. Bridge br0 - Reconfigured IP from 192.168.0.1/16 to 192.168.100.1/24
3. master-controller service - Restarted to load new config

### Local Files (For Reference)
1. `master-controller/src/config/index.js:52-59` - Network config expectations
2. `master-controller/src/services/vm-manager.js:193` - Boot args construction

## Next Steps to Debug

### 1. Check if systemd-networkd is Interfering

The golden snapshot may have systemd-networkd configured. This could be resetting the network after the kernel configures it.

**Action**: Mount golden snapshot and check for:
```bash
/etc/systemd/network/*.network
/etc/netplan/*.yaml
/etc/network/interfaces
```

### 2. Test Without systemd-networkd

If found, disable network configuration services in the golden snapshot:
```bash
systemctl disable systemd-networkd
systemctl disable networking
```

### 3. Add Diagnostic Logging to VM

Add to kernel boot args: `debug systemd.log_level=debug`

This will show what's happening with network configuration during boot.

### 4. Check Firecracker VM Network Config

Verify the Firecracker configuration:
```bash
cat /var/lib/firecracker/users/vm-*/vm-config.json | jq '.["network-interfaces"]'
```

### 5. Manual Network Test Inside VM

If possible, access the VM via serial console and manually run:
```bash
ip addr show
ip route show
ping 192.168.100.1
```

## Related Documentation

1. `VM-NETWORK-CONNECTIVITY-FAILURE-INVESTIGATION.md` - Original investigation (Oct 24, 20:10)
2. `WEBSOCKET-1006-STILL-BLOCKED-BY-NETWORK.md` - Confirmed same issue (Oct 24, 21:01)
3. `WEBSOCKET-1006-TESTING-UPDATE.md` - Testing after golden snapshot rebuild
4. `WEBSOCKET-1006-FIX-IN-PROGRESS.md` - Golden snapshot rebuild process
5. `PROXYCONFIG-UNDEFINED-FIX-COMPLETE.md` - Previous VM creation bug fix

## Current VM State

**Running VM**: vm-1abf1388-6f37-497f-a377-8e8811eeea07
- **PID**: 811953
- **IP**: 192.168.100.2
- **TAP**: fc-vm-1abf1 (UP, LOWER_UP, attached to br0)
- **Console**: Shows all services started successfully
- **Connectivity**: ❌ NONE - Destination Host Unreachable

---

**Status**: ⚠️ **BLOCKED - NETWORK CONNECTIVITY ISSUE PERSISTS**

**Next Action**: Investigate systemd-networkd or other network configuration services in golden snapshot that may be interfering with kernel `ip=` parameter

**Impact**: CRITICAL - All VM OAuth flows broken, no WebSocket connectivity possible

**Root Issue**: VMs boot and configure IP via kernel, but do not respond to network traffic from host
