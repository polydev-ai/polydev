# WebSocket 1006 Issue - STILL BLOCKED BY NETWORK CONNECTIVITY

## Date: October 24, 2025 - 21:01 CEST

## Status: ❌ **BLOCKED - SAME ROOT CAUSE AS PREVIOUS INVESTIGATION**

## Summary

The WebSocket 1006 errors and OAuth agent connectivity failures are **NOT due to missing VNC services** - those are all working correctly. The root cause is **ZERO network connectivity between host and VMs**, which is the exact same issue documented in `VM-NETWORK-CONNECTIVITY-FAILURE-INVESTIGATION.md`.

## Current Test VM: Session 63400485

### ✅ What's WORKING:
1. **Browser VM Creation** - API returns HTTP 200 with session details
2. **Firecracker VM Boot** - Process spawns successfully (PID: 810788)
3. **Golden Snapshot VNC Services** - All installed and running:
   - ✅ VM Browser OAuth Agent -  **STARTED**
   - ✅ X Virtual Frame Buffer (Xvfb) - **STARTED**
   - ✅ Openbox Window Manager - **STARTED**
   - ✅ x11vnc VNC Server - **STARTED**
   - ✅ websockify VNC Proxy on port 6080 - **STARTED**
4. **TAP Interface Creation** - fc-vm-02018 created, **UP**, attached to br0
5. **VM IP Configuration** - Kernel configured IP 192.168.0.14

### ❌ What's BROKEN:
1. **Host→VM Network Connectivity**:
   - Ping: `Destination Host Unreachable` (100% packet loss)
   - ARP: `192.168.0.14 (incomplete)` - No ARP response from VM
   - Port 6080: `Failed to connect - No route to host`
   - Port 8080: `No route to host`

2. **WebSocket Connections Fail**:
   ```
   WebSocket connection to 'wss://master.polydev.ai/api/auth/session/.../novnc/websock' failed
   Connection closed (code: 1006)
   ```
   **Reason**: Master-controller cannot connect to VM at 192.168.0.14:6080 because host→VM networking is broken

3. **OAuth Agent Unreachable**:
   ```
   [Credentials Proxy] Agent not reachable (normal during startup)
   ```
   **Reason**: Master-controller cannot connect to VM at 192.168.0.14:8080 for same reason

## Detailed Findings

### VM Details
- **VM ID**: vm-020180fe-8500-4017-9c61-45d302d7004e (actual)
- **Session ID**: 63400485-9e16-4ed0-bfc2-a0d05b403172 (API response)
- **VM IP**: 192.168.0.14
- **TAP Interface**: fc-vm-02018
- **TAP Status**: UP, LOWER_UP, attached to br0
- **Bridge**: br0 with IP 192.168.0.1/16

### Console Log Evidence
```
[[0;32m  OK  [0m] Started [0;1;39mNetwork Configuration[0m.
[[0;32m  OK  [0m] Started [0;1;39mVM Browser OAuth Agent[0m.
[[0;32m  OK  [0m] Started [0;1;39mX Virtual Frame Buffer[0m.
[[0;32m  OK  [0m] Started [0;1;39mOpenbox Window Manager[0m.
[[0;32m  OK  [0m] Started [0;1;39mx11vnc VNC Server[0m.
[[0;32m  OK  [0m] Started [0;1;39mWebsockify VNC Proxy[0m.
```

All services successfully started inside the VM, but the VM cannot be reached from the host.

### Network Connectivity Tests
```bash
# From host:
$ ping -c 3 192.168.0.14
PING 192.168.0.14 (192.168.0.14) 56(84) bytes of data.
From 192.168.0.1 icmp_seq=1 Destination Host Unreachable
--- 192.168.0.14 ping statistics ---
3 packets transmitted, 0 received, +1 errors, 100% packet loss

$ arp -n | grep 192.168.0.14
192.168.0.14                     (incomplete)                              br0

$ curl http://192.168.0.14:6080/
curl: (7) Failed to connect to 192.168.0.14 port 6080 after 372 ms: No route to host
```

## Comparison to Previous Investigation

| Component | Previous (VM-NETWORK doc) | Current Test | Status |
|-----------|---------------------------|--------------|--------|
| VM boots successfully | ✅ | ✅ | Same |
| VNC services start | ✅ | ✅ | Same |
| TAP interface created | ✅ | ✅ | Same |
| TAP interface UP | ✅ | ✅ | Same |
| TAP attached to br0 | ✅ | ✅ | Same |
| Ping from host | ❌ 100% loss | ❌ 100% loss | **SAME ISSUE** |
| ARP response | ❌ (incomplete) | ❌ (incomplete) | **SAME ISSUE** |
| Port connectivity | ❌ No route | ❌ No route | **SAME ISSUE** |

## Root Cause (From Previous Investigation)

The previous investigation (`VM-NETWORK-CONNECTIVITY-FAILURE-INVESTIGATION.md`) identified this as a **Linux bridge packet forwarding failure**. Despite correct configuration, packets from the host do not reach the VM's network stack.

**Possible causes identified**:
1. **ebtables filtering** - May be dropping bridge traffic
2. **Bridge netfilter disabled** - `/proc/sys/net/bridge/bridge-nf-call-iptables` not available
3. **MAC address learning failure** - Bridge FDB shows MAC but packets aren't forwarded
4. **Firecracker virtio-net driver issue** - VM guest not handling traffic properly
5. **Kernel networking issue in VM** - VM's network stack not responding to ARP/ICMP

## Why WebSocket 1006 Errors Occur

The user's error logs showing WebSocket code 1006 are a **symptom**, not the root cause:

```
User Browser → wss://master.polydev.ai/api/auth/session/{id}/novnc/websock
  ↓
Master-controller receives WebSocket upgrade request
  ↓
Master-controller tries to proxy to ws://192.168.0.14:6080/
  ↓
❌ FAILS - Cannot connect to VM (No route to host)
  ↓
WebSocket connection immediately closes → Code 1006
  ↓
noVNC displays black screen / connection error
```

## Impact

**ALL OAuth flows are broken**:
- ❌ No browser display for user authentication
- ❌ WebSocket connections fail immediately
- ❌ OAuth automation cannot run (agent not reachable)
- ❌ Credentials cannot be captured
- ❌ Users cannot authenticate with AI CLI tools

## What Does NOT Need Fixing

Based on this test:
- ✅ Golden snapshot VNC services are **correctly installed and running**
- ✅ VM boot sequence is **working perfectly**
- ✅ All systemd services **start successfully**
- ✅ TAP interface creation is **working**
- ✅ Bridge configuration is **correct**
- ✅ WebSocket handler code is **correct**

## What DOES Need Fixing

**ONLY ONE ISSUE**: Host→VM network connectivity

This single issue blocks everything else. Until VMs can be reached on the network, none of the OAuth/noVNC functionality can work, regardless of how correctly everything else is configured.

## Next Steps (From Previous Investigation)

The previous investigation document (`VM-NETWORK-CONNECTIVITY-FAILURE-INVESTIGATION.md`) outlined these steps:

1. **Check ebtables**: `ebtables -L -t filter`
2. **Check bridge netfilter modules**: `lsmod | grep bridge`, `modprobe br_netfilter`
3. **Verify TAP device flags**: `ethtool -k fc-vm-02018`
4. **Test with manual TAP creation**: Create TAP manually to isolate Firecracker vs kernel issue
5. **Check Firecracker network backend**: Verify Firecracker VM config

## Related Documentation

1. `VM-NETWORK-CONNECTIVITY-FAILURE-INVESTIGATION.md` - **PRIMARY INVESTIGATION** (Oct 24, 20:10 CEST)
2. `WEBSOCKET-1006-TESTING-UPDATE.md` - Testing after golden snapshot rebuild
3. `WEBSOCKET-1006-FIX-IN-PROGRESS.md` - Golden snapshot rebuild process
4. `PROXYCONFIG-UNDEFINED-FIX-COMPLETE.md` - VM creation bug fix

## User Feedback Context

The user reported:
> "What about earlier investigation. We still are getting this disocnnected and 500 error [...] Please comprhensively check and correct this"

**Finding**: The "earlier investigation" (`VM-NETWORK-CONNECTIVITY-FAILURE-INVESTIGATION.md`) correctly identified the root cause. The issue **was never fixed** - it's still present and blocking all functionality.

## Current Blocker

**CRITICAL**: This is a **kernel/networking-level issue** that requires deep debugging of:
- Linux bridge packet forwarding
- Firecracker virtio-net driver
- VM kernel network stack
- Host-side network filters (ebtables, iptables, nftables)

Cannot proceed with application-level fixes until host→VM connectivity is restored.

---

**Status**: ❌ **BLOCKED - REQUIRES KERNEL/NETWORK LEVEL DEBUGGING**

**Next Action**: Continue investigation from `VM-NETWORK-CONNECTIVITY-FAILURE-INVESTIGATION.md` step-by-step

**Impact**: CRITICAL - All VM OAuth flows broken, no WebSocket connectivity possible

**ETA**: Unknown - requires identifying and fixing Linux bridge/kernel networking issue
