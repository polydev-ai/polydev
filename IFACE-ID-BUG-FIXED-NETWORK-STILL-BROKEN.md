# iface_id Bug Fixed - But Network Connectivity Still Broken

## Date: October 24, 2025 - 22:31 CEST

## Status: ⚠️ **PARTIAL SUCCESS - ROOT CAUSE IDENTIFIED BUT NOT YET FIXED**

## Summary

Successfully fixed the `iface_id` bug in Firecracker VM configuration (was hardcoded to `'eth0'`, now correctly uses TAP device name). However, VMs still cannot be reached from the host due to a DIFFERENT issue: **the kernel `ip=` boot parameter is not configuring the network interface**.

## What Was Fixed

### ✅ iface_id Bug in vm-manager.js

**File**: `master-controller/src/services/vm-manager.js:205`

**Before**:
```javascript
'network-interfaces': [
  {
    iface_id: 'eth0',        // ❌ BUG: Hardcoded!
    guest_mac: this.generateMAC(vmId),
    host_dev_name: tapDevice
  }
]
```

**After**:
```javascript
'network-interfaces': [
  {
    iface_id: tapDevice,     // ✅ FIXED: Uses actual TAP device name
    guest_mac: this.generateMAC(vmId),
    host_dev_name: tapDevice
  }
]
```

**Verification**:
```json
// vm-6d83ddf4-8a5c-4185-b071-4b9c7ca4694b/vm-config.json
{
  "iface_id": "fc-vm-6d83d",  // ✅ CORRECT!
  "guest_mac": "02:fc:54:be:48:aa",
  "host_dev_name": "fc-vm-6d83d"
}
```

**Impact**: TAP interface now properly created and attached to Firecracker VM. Packets ARE reaching the TAP interface (tcpdump shows 2 packets captured).

## What's STILL BROKEN

### ❌ Kernel `ip=` Parameter Not Configuring Network

**Expected Boot Message** (from Oct 19 working VM):
```
[    0.340273]      device=eth0, ipaddr=192.168.100.5, mask=255.255.255.0, gw=192.168.100.1
```

**Actual Boot Log**: **NO network configuration message!**

The console log shows services starting but **does NOT show** the kernel configuring the network interface despite correct boot_args:
```
ip=192.168.100.3::192.168.100.1:255.255.255.0::eth0:off
```

### Test Results

**VM**: vm-6d83ddf4-8a5c-4185-b071-4b9c7ca4694b
**IP**: 192.168.100.3

```bash
# Ping
$ ping -c 2 192.168.100.3
From 192.168.100.1 icmp_seq=1 Destination Host Unreachable
--- 192.168.100.3 ping statistics ---
2 packets transmitted, 0 received, +2 errors, 100% packet loss

# tcpdump on TAP interface
$ tcpdump -i fc-vm-6d83d
2 packets captured       # ✅ Packets ARE reaching TAP!
22:30:25.631152 ARP, Request who-has 192.168.100.3 tell Ubuntu-2204-jammy-amd64-base
22:30:26.655021 ARP, Request who-has 192.168.100.3 tell Ubuntu-2204-jammy-amd64-base

# Port 6080 test
$ curl http://192.168.100.3:6080/
curl: (7) Failed to connect to 192.168.100.3 port 6080 after 707 ms: No route to host
```

**TAP Interface**: UP, LOWER_UP, forwarding, attached to br0 ✅
**VNC Services in VM**: ALL started successfully (Xvfb, Openbox, x11vnc, websockify) ✅
**ARP Responses from VM**: NONE ❌
**Network Configuration in Kernel Boot**: NOT VISIBLE in console log ❌

## Evidence This Issue Is New

### Oct 19, 2025 - IT WORKED

Background process #243343 from Oct 19, 2025 00:31 CEST successfully connected to VM 192.168.100.5:6080:

```
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=

�RFB 003.008
```

This proves:
- ✅ System worked on 192.168.100.x subnet
- ✅ WebSocket connections succeeded
- ✅ Kernel `ip=` parameter WAS working
- ✅ VMs were reachable from host

### Oct 24, 2025 - IT'S BROKEN

Despite fixing the `iface_id` bug, VMs are not reachable. The kernel `ip=` parameter is not configuring the network during boot.

## Root Cause Analysis

### Primary Hypothesis: Kernel Not Processing `ip=` Parameter

The kernel boot parameter format is:
```
ip=<client-ip>:<server-ip>:<gw-ip>:<netmask>:<hostname>:<device>:<autoconf>
```

Our parameter:
```
ip=192.168.100.3::192.168.100.1:255.255.255.0::eth0:off
```

**Breakdown**:
- `client-ip`: 192.168.100.3 ✅
- `server-ip`: (empty) ✅
- `gw-ip`: 192.168.100.1 ✅
- `netmask`: 255.255.255.0 ✅
- `hostname`: (empty) ✅
- `device`: eth0 ✅
- `autoconf`: off (no DHCP) ✅

**The parameter is CORRECT**, but the kernel is not acting on it.

### Possible Causes

1. **Kernel CONFIG_IP_PNP not enabled**: The Ubuntu 22.04 kernel in the golden snapshot may not have `CONFIG_IP_PNP` (IP kernel-level autoconfiguration) compiled in.

2. **Interface name mismatch**: The kernel expects `eth0` but Firecracker might be creating a different interface name despite `net.ifnames=0` boot parameter.

3. **initramfs missing network scripts**: The kernel may need initramfs support for early network configuration.

4. **Firecracker virtio-net initialization timing**: The virtio-net driver may not be ready when the kernel tries to configure the IP.

### Evidence Supporting Hypothesis #1

Golden snapshot investigation shows:
- ❌ No systemd-networkd config files
- ❌ No netplan config files
- ❌ No /etc/network/interfaces
- ❌ Kernel NOT showing network configuration message

The ONLY way to configure the network is via the `ip=` parameter, and it's not working.

## Technical Details

### VM Configuration

**Firecracker Boot Args**:
```
console=ttyS0 reboot=k panic=1 root=/dev/vda rw rootfstype=ext4 net.ifnames=0 biosdevname=0 random.trust_cpu=on ip=192.168.100.3::192.168.100.1:255.255.255.0::eth0:off
```

**Network Interface Config**:
```json
{
  "iface_id": "fc-vm-6d83d",
  "guest_mac": "02:fc:54:be:48:aa",
  "host_dev_name": "fc-vm-6d83d"
}
```

**Console Log** (relevant parts):
```
[    0.004000] console [ttyS0] enabled
... (NO IP configuration message!) ...
[[OK]] Started Network Configuration.
[[OK]] Started VM Browser OAuth Agent.
[[OK]] Started X Virtual Frame Buffer.
[[OK]] Started Openbox Window Manager.
[[OK]] Started x11vnc VNC Server.
[[OK]] Started Websockify VNC Proxy.
[[OK]] Reached target Multi-User System.
[[OK]] Reached target Graphical Interface.
```

### Host Configuration

**Bridge**: br0 at 192.168.100.1/24 ✅
**TAP**: fc-vm-6d83d UP, LOWER_UP, forwarding ✅
**NAT**: MASQUERADE rule for 192.168.100.0/24 ✅
**IP Forwarding**: Enabled ✅
**br_netfilter Module**: Loaded ✅

## Next Steps to Fix

### Option 1: Check Kernel CONFIG_IP_PNP (RECOMMENDED)

```bash
# Inside VM (via serial console)
zcat /proc/config.gz | grep CONFIG_IP_PNP

# Expected:
CONFIG_IP_PNP=y
CONFIG_IP_PNP_DHCP=y
CONFIG_IP_PNP_BOOTP=y
CONFIG_IP_PNP_RARP=y
```

If `CONFIG_IP_PNP=n` or not set, the kernel CANNOT configure network via `ip=` parameter. This would explain why it worked on Oct 19 (different kernel?) but not now.

### Option 2: Add Network Configuration to Golden Snapshot

If kernel IP configuration is not available, add systemd-networkd configuration:

```bash
# Create /etc/systemd/network/10-eth0.network in golden snapshot
[Match]
Name=eth0

[Network]
Address=192.168.100.X/24  # This would need to be templated
Gateway=192.168.100.1
```

**Problem**: This requires templating the IP address per VM, which is complex.

### Option 3: Use initramfs with Network Scripts

Add network configuration scripts to initramfs that run before systemd starts.

**Problem**: Requires rebuilding initramfs in golden snapshot.

### Option 4: Add init Script to Configure Network

Create `/etc/rc.local` or systemd service that configures network early in boot:

```bash
#!/bin/bash
# Extract IP from kernel cmdline
KERN_IP=$(cat /proc/cmdline | grep -oP 'ip=\K[0-9.]+')
if [ -n "$KERN_IP" ]; then
  ip addr add $KERN_IP/24 dev eth0
  ip link set eth0 up
  ip route add default via 192.168.100.1
fi
```

**Advantage**: Simple, works with existing kernel
**Disadvantage**: Runs late in boot, after systemd

## Files Modified

### Local Files
1. `master-controller/src/services/vm-manager.js:205` - Fixed `iface_id: tapDevice`

### Server Files
1. `/opt/master-controller/src/services/vm-manager.js:205` - Fixed `iface_id: tapDevice` (deployed)
2. master-controller service - Restarted (PID: 815347)

## Related Documentation

1. `WEBSOCKET-1006-NETWORK-DEEP-DIVE-STATUS.md` - Previous investigation (Oct 24, 21:54)
2. `WEBSOCKET-1006-BRIDGE-CONFIG-FIX-INCOMPLETE.md` - Bridge config fix (Oct 24, 21:14)
3. `WEBSOCKET-1006-STILL-BLOCKED-BY-NETWORK.md` - Network block confirmation (Oct 24, 21:01)
4. `VM-NETWORK-CONNECTIVITY-FAILURE-INVESTIGATION.md` - Original investigation (Oct 24, 20:10)

---

## Status: ⚠️ **BLOCKED - KERNEL IP CONFIGURATION NOT WORKING**

**Root Cause**: Kernel `ip=` boot parameter is not configuring the network interface during VM boot.

**Evidence**: Console log missing kernel network configuration message; VM boots successfully but has no network connectivity.

**Impact**: CRITICAL - All OAuth flows broken, WebSocket connections fail with code 1006.

**Recommended Next Action**: Access VM via serial console to check kernel config (`CONFIG_IP_PNP`) or implement init script workaround (Option 4).

**Progress**: `iface_id` bug fixed, packets reach TAP interface, all VNC services start, but VM cannot respond to network traffic due to unconfigured network interface.
