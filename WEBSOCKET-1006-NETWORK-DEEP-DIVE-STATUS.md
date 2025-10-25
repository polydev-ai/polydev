# WebSocket 1006 - Network Configuration Deep Dive Status

## Date: October 24, 2025 - 21:54 CEST

## Status: ⚠️ **CRITICAL - VM NETWORK STACK ISSUE**

## Executive Summary

Fixed bridge/IP subnet configuration mismatch and added NAT rule, but VMs still cannot be reached from host despite:
- ✅ Correct IP configuration (192.168.100.x/24)
- ✅ All VNC services running inside VM
- ✅ TAP interface UP and forwarding
- ✅ Bridge properly configured
- ✅ NAT MASQUERADE rule for 192.168.100.0/24

**Proof this worked in the past**: Background process #243343 from Oct 19 successfully connected to VM 192.168.100.5:6080 with HTTP 101 Switching Protocols.

## What Was Fixed

### 1. ✅ Bridge IP Configuration

**Before**: Bridge `br0` was configured as `192.168.0.1/16`

**After**: Reconfigured to `192.168.100.1/24`

```bash
ip addr del 192.168.0.1/16 dev br0
ip addr add 192.168.100.1/24 dev br0
```

### 2. ✅ Environment Variables

**Before**: `/opt/master-controller/.env` had incorrect variable names:
```bash
VM_IP_POOL_START=192.168.100.2
VM_IP_POOL_END=192.168.100.254
```

**After**: Fixed to match code expectations in `master-controller/src/config/index.js`:
```bash
IP_POOL_START=192.168.100.2
IP_POOL_END=192.168.100.254
BRIDGE_DEVICE=br0
BRIDGE_IP=192.168.100.1
INTERNAL_NETWORK=192.168.100.0/24
```

### 3. ✅ NAT MASQUERADE Rule

**Added** (was missing for new subnet):
```bash
iptables -t nat -A POSTROUTING -s 192.168.100.0/24 -o enp5s0 -j MASQUERADE
iptables-save > /etc/iptables/rules.v4
```

**Verification**:
```bash
$ iptables -t nat -L POSTROUTING -n -v | grep 192.168.100
    0     0 MASQUERADE  all  --  *      enp5s0  192.168.100.0/24     0.0.0.0/0
```

### 4. ✅ Master-Controller Restarted

Service restarted successfully to load new configuration (PID: 811836).

### 5. ✅ Test VM Created Successfully

Session ID: `d64cd143-7a2e-46e7-b3e4-98ce6ca80290`
VM IP: `192.168.100.5`
Firecracker PID: 813673

**Console log shows all services started:**
```
[[OK]] Started VM Browser OAuth Agent.
[[OK]] Started X Virtual Frame Buffer.
[[OK]] Started Openbox Window Manager.
[[OK]] Started x11vnc VNC Server.
[[OK]] Started Websockify VNC Proxy.
```

## What's STILL BROKEN

### ❌ VMs Are Not Reachable from Host

**Test Results**:
```bash
# Ping test
$ ping -c 3 192.168.100.5
From 192.168.100.1 icmp_seq=1 Destination Host Unreachable

# ARP test
$ arp -n | grep 192.168.100.5
192.168.100.5    (incomplete)    br0

# Port 6080 test
$ curl http://192.168.100.5:6080/
curl: (7) Failed to connect - timeout after 3 seconds
```

**TAP Interface Status**:
```bash
$ ip -d link show fc-vm-77c11
322: fc-vm-77c11: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel master br0 state UP mode DEFAULT group default qlen 1000
    bridge_slave state forwarding priority 32 cost 100
```

**Evidence**:
- TAP interface is UP
- TAP is in forwarding state
- TAP is attached to br0
- VM console shows network configured correctly
- All services are running
- BUT host cannot reach VM

## Root Cause Analysis

### Hypothesis: VM Network Stack Not Responding

Despite correct configuration at ALL levels (kernel boot params, TAP interface, bridge, NAT), the VM's network stack is not responding to traffic from the host.

**Possible Causes**:

1. **systemd-networkd interfering**: Console log shows "Started Network Configuration" AFTER kernel already configured IP. This service may be reconfiguring or resetting the interface.

2. **Firecracker virtio-net driver issue**: VM guest may not be properly handling traffic despite TAP showing UP.

3. **VM kernel network stack not initialized**: Additional network configuration may be needed beyond the kernel `ip=` parameter.

4. **Timing issue**: Network may be configured, then reset, then services bind before it's up again.

### Evidence This Worked in the Past

Background process #243343 from **Oct 19, 2025 00:31 CEST** (5 days ago) successfully connected to VM 192.168.100.5:6080:

```
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=

�RFB 003.008
```

This proves:
- ✅ VMs CAN work on 192.168.100.x subnet
- ✅ WebSocket connections CAN succeed
- ✅ websockify CAN respond correctly
- ✅ System WAS working 5 days ago

**What changed?**: Unknown. Possibly:
- Bridge was reconfigured
- Golden snapshot was rebuilt
- System updates
- iptables rules were modified

## Technical Details

### Configuration Alignment

| Component | Code Expects | .env Before | .env After | Server Config |
|-----------|-------------|-------------|------------|---------------|
| Subnet | 192.168.100.0/24 | (not set) | 192.168.100.0/24 | ✅ 192.168.100.0/24 |
| Bridge IP | 192.168.100.1 | (not set) | 192.168.100.1 | ✅ 192.168.100.1 |
| IP Pool Start | 192.168.100.2 | VM_IP_POOL_START | IP_POOL_START | ✅ 192.168.100.2 |
| IP Pool End | 192.168.100.254 | VM_IP_POOL_END | IP_POOL_END | ✅ 192.168.100.254 |
| Bridge Device | fcbr0 or br0 | br0 | br0 | ✅ br0 |

### Kernel Boot Args

From `master-controller/src/services/vm-manager.js:193`:
```javascript
boot_args: `console=ttyS0 reboot=k panic=1 root=/dev/vda rw rootfstype=ext4 net.ifnames=0 biosdevname=0 random.trust_cpu=on ip=${ipAddress}::${config.network.bridgeIP}:255.255.255.0::eth0:off`
```

**Actual boot args for test VM**:
```
ip=192.168.100.5::192.168.100.1:255.255.255.0::eth0:off
```

**Format**: `ip=<client-ip>:<server-ip>:<gw-ip>:<netmask>:<hostname>:<device>:<autoconf>`

The `:off` means "autoconf off" (no DHCP), which is correct for static IP.

### VM Console Log Extract

```
[    0.340273]      device=eth0, ipaddr=192.168.100.5, mask=255.255.255.0, gw=192.168.100.1
[[OK]] Started Network Configuration.
[[OK]] Started VM Browser OAuth Agent.
[[OK]] Started X Virtual Frame Buffer.
[[OK]] Started Openbox Window Manager.
[[OK]] Started x11vnc VNC Server.
[[OK]] Started Websockify VNC Proxy.
[[OK]] Reached target Multi-User System.
[[OK]] Reached target Graphical Interface.
```

**Analysis**:
- Kernel configures IP at 0.340 seconds
- systemd starts "Network Configuration" service AFTER kernel configured IP
- All services start successfully
- VM reaches graphical interface target
- BUT VM still not reachable from host!

### Network Topology

```
User Browser
  ↓ wss://
master.polydev.ai:443 (Cloudflare)
  ↓
Hetzner VPS (135.181.138.102)
  ↓ port 4000
master-controller (Node.js)
  ↓ ws://
192.168.100.5:6080 (VM - websockify)
  ↓ tcp://
localhost:5900 (VM - x11vnc)
  ↓
Display :1 (Xvfb)
```

**Breaking Point**: Host → VM (192.168.100.1 → 192.168.100.5)

## Next Steps to Debug

### 1. Investigate systemd-networkd

Check golden snapshot for network configuration services:
```bash
mount -o loop /var/lib/firecracker/snapshots/base/golden-rootfs.ext4 /mnt
ls /mnt/etc/systemd/network/
ls /mnt/etc/netplan/
cat /mnt/etc/network/interfaces
```

If found, disable or reconfigure to not interfere with kernel `ip=` parameter.

### 2. Test Manual TAP Configuration

Create a manual TAP interface without Firecracker to isolate the issue:
```bash
ip tuntap add dev test-tap mode tap
ip link set test-tap up
brctl addif br0 test-tap
ip addr add 192.168.100.10/24 dev test-tap

# Test from another terminal
ping 192.168.100.10
```

### 3. Add Network Debugging to VM

Modify kernel boot args to add debugging:
```javascript
boot_args: `... debug systemd.log_level=debug`
```

### 4. Check VM Network State via Serial Console

Access VM serial console and verify:
```bash
# Inside VM
ip addr show
ip route show
ping 192.168.100.1
cat /proc/sys/net/ipv4/ip_forward
```

### 5. Compare with Working Configuration from Oct 19

Determine what was different 5 days ago when background process #243343 successfully connected to 192.168.100.5:6080.

## Files Modified

### Server Files
1. `/opt/master-controller/.env` - Fixed variable names
2. `/etc/iptables/rules.v4` - Added NAT rule for 192.168.100.0/24
3. Bridge br0 - Reconfigured IP from 192.168.0.1/16 to 192.168.100.1/24
4. master-controller service - Restarted to load new config

### Local Files (For Reference)
1. `master-controller/src/config/index.js:52-59` - Network config expectations
2. `master-controller/src/services/vm-manager.js:193` - Boot args construction
3. `master-controller/src/routes/auth.js:512-547` - WebSocket handler code

## Related Documentation

1. `WEBSOCKET-1006-BRIDGE-CONFIG-FIX-INCOMPLETE.md` - Bridge configuration fix (incomplete)
2. `WEBSOCKET-1006-STILL-BLOCKED-BY-NETWORK.md` - Confirmed network issue (Oct 24, 21:01)
3. `VM-NETWORK-CONNECTIVITY-FAILURE-INVESTIGATION.md` - Original investigation (Oct 24, 20:10)
4. `WEBSOCKET-1006-TESTING-UPDATE.md` - Testing after golden snapshot rebuild
5. `WEBSOCKET-1006-FIX-IN-PROGRESS.md` - Golden snapshot rebuild process

## Current VM State

**Running VMs**:
1. VM ID: vm-6d4fd50f-5efd-40bc-ba78-69a44a6f18ce
   - PID: 813594
   - TAP: fc-vm-6d4fd

2. VM ID: vm-77c119a1-b774-4e1c-8a59-3ec02e1b46b0 (test VM)
   - PID: 813673
   - IP: 192.168.100.5
   - TAP: fc-vm-77c11 (UP, LOWER_UP, forwarding)
   - Session: d64cd143-7a2e-46e7-b3e4-98ce6ca80290
   - All VNC services: ✅ RUNNING
   - Connectivity: ❌ UNREACHABLE

---

## Status: ⚠️ **BLOCKED - VM NETWORK STACK NOT RESPONDING**

**Next Action**: Investigate systemd-networkd or other network configuration services in golden snapshot that may be interfering with kernel `ip=` parameter

**Impact**: CRITICAL - All VM OAuth flows broken, no WebSocket connectivity possible

**Root Issue**: VMs boot and configure IP via kernel, start all services, but do not respond to network traffic from host

**Evidence of Past Success**: Background process #243343 from Oct 19 proves system worked on 192.168.100.x subnet with successful WebSocket connection to VM

**Key Question**: What changed between Oct 19 (when it worked) and now?
