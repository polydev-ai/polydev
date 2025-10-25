# VM Network Connectivity Failure - Investigation Summary

## Date: October 24, 2025 - 20:10 CEST

## Status: ⚠️ CRITICAL - SYSTEMIC NETWORK FAILURE

## Executive Summary

All Firecracker VMs (both CLI and Browser types) have **ZERO network connectivity** from the host. VMs boot successfully with correct network configuration inside the guest, but the host cannot reach them via ICMP, TCP, or any protocol.

## Critical Findings

### 1. VMs Boot Correctly ✅
- Firecracker processes spawn successfully
- TAP interfaces are created and attached to bridge br0
- VMs configure their network interfaces internally
- Boot logs show: `device=eth0, ipaddr=192.168.0.X, mask=255.255.255.0, gw=192.168.0.1`

### 2. Host Bridge Is Configured ✅
- Bridge br0: 192.168.0.1/16
- 26 TAP interfaces attached
- Routing table correct: `192.168.0.0/16 dev br0 proto kernel scope link src 192.168.0.1`
- IP forwarding enabled: `/proc/sys/net/ipv4/ip_forward = 1`
- iptables FORWARD chain policy: ACCEPT

### 3. NO Network Traffic Between Host and VMs ❌

**Test 1: Running CLI VM (vm-69fac673, IP 192.168.0.2)**
- Firecracker PID: 763877 (running for 10+ hours)
- TAP interface: fc-vm-69fac (UP, LOWER_UP, state: forwarding)
- Ping result: Destination Host Unreachable
- ARP result: `(incomplete)` - No response to ARP requests
- tcpdump on TAP interface: **0 packets captured** despite host sending 5 pings

**Test 2: Fresh Browser VM (vm-84067642, IP 192.168.0.10)**
- Created successfully via API (HTTP 200)
- **VM immediately destroyed** - No Firecracker process, no TAP interface, no files after 15 seconds
- Likely cleaned up by OAuth timeout or automated hibernation

### 4. Bridge-Level Traffic Analysis

```bash
# tcpdump on bridge br0 shows ARP requests FROM host:
20:06:14.175524 ARP, Request who-has 192.168.0.2 tell 192.168.0.1, length 28
20:06:15.199021 ARP, Request who-has 192.168.0.2 tell 192.168.0.1, length 28
20:06:16.223120 ARP, Request who-has 192.168.0.2 tell 192.168.0.1, length 28

# But tcpdump on TAP interface shows ZERO packets:
tcpdump: listening on fc-vm-69fac, link-type EN10MB (Ethernet), snapshot length 262144 bytes
0 packets captured
0 packets received by filter
0 packets dropped by kernel
```

**KEY INSIGHT**: Packets arrive at the bridge but are NOT forwarded to TAP interfaces.

### 5. VNC Services Are Correct ✅

Golden snapshot verified to contain:
- `xvfb.service` - enabled
- `openbox.service` - enabled
- `x11vnc.service` - enabled
- `websockify.service` - enabled

All VNC packages installed:
- xvfb 2:21.1.4-2ubuntu1.7~22.04.15
- x11vnc 0.9.16-8
- websockify 0.10.0+dfsg1-2build1
- novnc 1:1.0.0-5
- openbox 3.6.1-10

**Console log from vm-69fac673 shows VNC services started successfully.**

## Root Cause Analysis

### Primary Issue: Bridge Not Forwarding Packets to TAP Interfaces

Despite correct configuration, the Linux bridge is not forwarding packets from the host (192.168.0.1) to the VM TAP interfaces. This indicates one of:

1. **ebtables filtering** - May be dropping bridge traffic
2. **Bridge netfilter disabled** - `/proc/sys/net/bridge/bridge-nf-call-iptables` was "not available" (module not loaded)
3. **MAC address learning failure** - Bridge FDB shows MAC addresses but packets aren't forwarded
4. **Firecracker virtio-net driver issue** - VM guest may not be properly handling traffic
5. **TAP device misconfiguration** - TAP interface may be in wrong mode or missing required flags

### Secondary Issue: Browser VMs Immediately Destroyed

Browser VMs are created successfully but destroyed within 15 seconds, likely due to:
- OAuth timeout (300 seconds configured, but may be failing immediately)
- VM hibernation checks detecting "crashed" VMs
- WebSocket handshake failures causing cleanup

This is a SYMPTOM of the network connectivity issue - if websockify can't be reached, OAuth fails.

## Test VM vm-ff06df3a Console Log Analysis

Created test VM which showed in console.log:

```
[    0.340273]      device=eth0, hwaddr=02:fc:f9:aa:5d:c1, ipaddr=192.168.0.9, mask=255.255.255.0, gw=192.168.0.1

[[0;32m  OK  [0m] Started [0;1;39mX Virtual Frame Buffer[0m.
[[0;32m  OK  [0m] Started [0;1;39mOpenbox Window Manager[0m.
[[0;32m  OK  [0m] Started [0;1;39mx11vnc VNC Server[0m.
[[0;32m  OK  [0m] Started [0;1;39mWebsockify VNC Proxy[0m.
```

This confirms:
- ✅ VM boots successfully
- ✅ Network configured correctly inside VM
- ✅ All VNC services start successfully
- ❌ Host cannot reach VM (network issue prevents actual testing)
- ❌ VM destroyed before we could test (likely due to network-induced OAuth timeout)

## Evidence Summary

| Component | Status | Evidence |
|-----------|--------|----------|
| Golden Snapshot VNC Services | ✅ Working | Mounted and verified all packages/services present |
| VM Boot | ✅ Working | Console logs show successful boot |
| VM Network Configuration | ✅ Working | Kernel configures eth0 with correct IP |
| VNC Services in VM | ✅ Working | systemd shows all services started |
| Firecracker Process | ✅ Working | vm-69fac673 running for 10+ hours |
| TAP Interface Creation | ✅ Working | fc-vm-69fac created, UP, attached to br0 |
| Bridge Configuration | ✅ Working | br0 has 192.168.0.1/16, correct routing |
| IP Forwarding | ✅ Working | /proc/sys/net/ipv4/ip_forward = 1 |
| iptables | ✅ Working | FORWARD chain policy ACCEPT |
| **Bridge→TAP Forwarding** | ❌ **BROKEN** | tcpdump shows 0 packets on TAP despite bridge receiving ARP |
| **VM Network Connectivity** | ❌ **BROKEN** | Cannot ping any VM, cannot reach any port |
| **WebSocket Connections** | ❌ **BROKEN** | Cannot test - VMs not reachable on network |
| **noVNC Display** | ❌ **BROKEN** | Cannot test - VMs not reachable on network |

## Diagnostic Commands Used

```bash
# Bridge status
ip addr show br0
brctl show br0
ip route show

# TAP interface status
ip -d link show fc-vm-69fac
bridge fdb show dev fc-vm-69fac

# Packet capture (bridge level - packets present)
tcpdump -i br0 -n 'host 192.168.0.2'
# Result: ARP requests visible ✅

# Packet capture (TAP level - NO packets)
tcpdump -i fc-vm-69fac -n
# Result: 0 packets captured ❌

# ARP
arp -n | grep 192.168.0
# Result: All VMs show (incomplete) ❌

# VM console logs
cat /var/lib/firecracker/users/vm-ff06df3a-*/console.log
# Result: VM configured network correctly ✅
```

## Why WebSocket 1006 Errors Occur

The original user report of WebSocket code 1006 (connection closed abnormally) is a SYMPTOM:

```
User → Browser → wss://master.polydev.ai/api/auth/session/{id}/novnc/websock
  ↓
master-controller → Proxy to ws://<vm-ip>:6080/
  ↓
❌ FAILS - VM not reachable on network (host cannot connect to 192.168.0.X:6080)
  ↓
WebSocket connection immediately closes → Code 1006
  ↓
noVNC displays black screen
```

## Next Steps to Fix

### Immediate Priority: Fix Host→VM Network Connectivity

1. **Check ebtables**:
   ```bash
   ebtables -L -t filter
   ebtables -L -t nat
   ```

2. **Check bridge netfilter modules**:
   ```bash
   lsmod | grep bridge
   modprobe br_netfilter
   sysctl -w net.bridge.bridge-nf-call-iptables=0
   sysctl -w net.bridge.bridge-nf-call-ip6tables=0
   ```

3. **Verify TAP device flags**:
   ```bash
   ethtool -k fc-vm-69fac
   ```

4. **Test with tcpdump on both ends**:
   ```bash
   # On host (background)
   tcpdump -i fc-vm-69fac -w /tmp/tap.pcap &

   # Send ping
   ping -c 5 192.168.0.2

   # Analyze capture
   tcpdump -r /tmp/tap.pcap
   ```

5. **Recreate TAP interface manually**:
   ```bash
   ip tuntap del dev fc-vm-test mode tap
   ip tuntap add dev fc-vm-test mode tap
   ip link set fc-vm-test up
   brctl addif br0 fc-vm-test

   # Test if bridge can forward to manually-created TAP
   ```

6. **Check Firecracker network backend**:
   ```bash
   # Verify Firecracker VM config for network interface
   cat /var/lib/firecracker/users/vm-69fac673-*/vm-config.json | jq '.["network-interfaces"]'
   ```

### After Network Fixed

Once VMs are reachable on the network:

1. ✅ Test `curl http://192.168.0.X:6080/` - Should return HTTP 200 or websockify response
2. ✅ Test WebSocket handshake - Should return HTTP 101 Switching Protocols
3. ✅ Test frontend noVNC - Should display Openbox desktop with Chromium
4. ✅ Test end-to-end OAuth - Should complete authentication flow
5. ✅ Document fix and commit changes

## Files and Locations

### Golden Snapshot
- `/var/lib/firecracker/snapshots/base/golden-rootfs.ext4` (8.0G, modified 19:31 CEST Oct 24)
- Rebuild log: `/tmp/golden-snapshot-rebuild-vnc-20251024-102355.log`

### VM Directories
- Running VM: `/var/lib/firecracker/users/vm-69fac673-27a8-492f-8fe0-f9b604e6ab28/`
- Test VM: `/var/lib/firecracker/users/vm-ff06df3a-339e-4229-8240-7615e86855b5/`

### Logs
- master-controller: `/var/log/master-controller.log` (OUTDATED - last entry Oct 18)
- journalctl: `journalctl -u master-controller` (shows "[XXB blob data]" - not readable)

### Code
- WebSocket handler: `/opt/master-controller/src/routes/auth.js:512-547`
- VM manager: `/opt/master-controller/src/services/vm-manager.js`
- Browser VM auth: `/opt/master-controller/src/services/browser-vm-auth.js`

## Related Documentation

1. `WEBSOCKET-1006-FIX-IN-PROGRESS.md` - Original investigation (golden snapshot rebuild)
2. `WEBSOCKET-1006-TESTING-UPDATE.md` - Testing after rebuild (found VM boot issue)
3. `GOLDEN-SNAPSHOT-VNC-COMPLETE.md` - Oct 16 claim of VNC integration (OUTDATED)
4. `PROXYCONFIG-UNDEFINED-FIX-COMPLETE.md` - Recent VM creation bug fix
5. `PROXY-PORT-MANAGER-FIX-COMPLETE.md` - Supabase lazy-loading fix

## User Feedback

> "Most of the documentation is dated, don't rely too much on documenattion, actually explore and check lease."

**User was 100% correct** - Documentation claimed VNC was integrated on Oct 16, but actual snapshot was rebuilt Oct 24 without VNC. We verified this by mounting and checking, not trusting docs.

## Current Blocker

**CRITICAL**: Cannot proceed with WebSocket/noVNC testing until host→VM network connectivity is restored. This is a fundamental networking issue affecting ALL VMs, not just new ones.

---

**Status**: ⏳ **BLOCKED ON NETWORK CONNECTIVITY FIX**

**Next Action**: Investigate Linux bridge packet forwarding failure

**Impact**: CRITICAL - All VM functionality broken, OAuth flows impossible, WebSocket connections fail

**ETA**: Unknown until root cause of bridge forwarding failure is identified and fixed
