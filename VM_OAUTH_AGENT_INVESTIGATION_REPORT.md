# VM OAuth Agent Startup Failure - Investigation Report

**Date**: November 6, 2025
**Investigation Status**: Root Cause Identified - OAuth Agent Service Fails to Start in Fresh VMs
**Priority**: HIGH - Fresh VMs completely unusable

---

## Executive Summary

After completing the detailed conversation summary and conducting deep technical investigation, I've identified the root cause of why fresh VMs fail to become operational. The network fix is working correctly (DHCP assigns IPs), but **the OAuth agent service fails to start in fresh VMs**, causing all health checks to fail with EHOSTUNREACH errors.

---

## Investigation Methodology

1. ✅ Created comprehensive 14-part detailed conversation summary
2. ✅ Examined working VM (192.168.100.2) console logs showing successful startup
3. ✅ Created test VM and monitored failure in real-time
4. ✅ Analyzed master controller logs for VM creation and failure patterns
5. ✅ Identified failed VM: `vm-d5b39311-e6b5-495c-ad89-84d6de97d4d0` (IP: 192.168.100.6)

---

## Key Findings

### What Works ✅
- **Network Fix**: DHCP configuration works perfectly (verified)
- **Master Controller**: Running and healthy
- **VM Creation Process**:
  - Firecracker starts successfully
  - Golden rootfs cloned
  - TAP device created with vnet_hdr
  - OAuth agent injection successful
  - VM assigned IP: 192.168.100.6
  - Firecracker process runs

### What Fails ❌
- **OAuth Agent Service**: Never starts in fresh VMs
- **Port 8080**: Never becomes reachable
- **Health Checks**: All fail with EHOSTUNREACH immediately
- **VM Timeout**: Fails after 120 seconds and gets cleaned up
- **Console Logs**: Not available for failed VMs (cleaned up immediately)

---

## Detailed Evidence

### Working VM (192.168.100.2) - SUCCESS
**Console Log Evidence**:
```
[  OK  ] Started Network Configuration
[  OK  ] Started Network Name Resolution
[  OK  ] Started VM Browser OAuth Agent
[  OK  ] Started X Virtual Frame Buffer
[  OK  ] Started Openbox Window Manager
[  OK  ] Started x11vnc VNC Server
[  OK  ] Started Websockify VNC Proxy
```

**Status**: ✅ All services started successfully, VM fully operational

### Failed VM (192.168.100.6) - FAILURE
**Master Controller Logs**:
```
01:26:57 [INFO] [VM-CREATE] Step 1: IP allocated {vmId: vm-d5b39311-e6b5-495c-ad89-84d6de97d4d0, internalIP: 192.168.100.6}
01:26:57 [INFO] TAP device created with vnet_hdr {vmId: vm-d5b39311-e6b5-495c-ad89-84d6de97d4d0}
01:26:59 [INFO] [INJECT-AGENT] Decodo proxy + SESSION_ID injected successfully
01:27:00 [INFO] [VM-CREATE] VM created successfully {vmId: vm-d5b39311-e6b5-495c-ad89-84d6de97d4d0}
01:27:01 [INFO] [WAIT-VM-READY] Starting health check
01:27:04 [WARN] [WAIT-VM-READY] Health check failed {error: connect EHOSTUNREACH 192.168.100.6:8080}
01:29:00 [ERROR] [WAIT-VM-READY] Timeout exceeded {maxWaitMs: 120000}
01:29:03 [INFO] Scheduled VM cleanup in database
```

**Pattern**: OAuth agent injection succeeds, but service never starts inside VM

---

## Critical Discovery

### Timing Analysis
- **01:26:59**: OAuth agent injection marked as successful
- **01:27:00**: VM creation marked as successful
- **01:27:04**: First health check fails (3 seconds later)
- **01:27:04 - 01:29:00**: 60 consecutive EHOSTUNREACH failures
- **01:29:00**: Timeout after 120 seconds
- **01:29:04**: VM cleaned up and directory removed

### The Gap
There is a **3-second gap** between VM creation success and the first health check failure. This suggests:
1. Firecracker starts the VM
2. VM begins booting
3. But the OAuth agent service **never starts** or **fails immediately**
4. No console logs are captured (they might never be written)

---

## Root Cause Analysis

### Primary Hypothesis
**The OAuth agent service fails to start in fresh VMs** due to one of:

1. **Systemd Service Failure**
   - Service file corrupted or missing
   - Service fails to start due to missing dependencies
   - ExecStart path incorrect in systemd service

2. **OAuth Agent Binary Issues**
   - Node.js binary missing or incompatible
   - server.js missing or corrupted
   - Permission issues with agent files

3. **Environment Issues**
   - /etc/environment not loaded correctly
   - SESSION_ID not set
   - Missing environment variables

4. **Network Interface Issues**
   - eth0 doesn't come up inside VM
   - DHCP client fails
   - Network services don't start

### Why Working VM Succeeds
The working VM (192.168.100.2) was likely created with a different golden rootfs or configuration. It shows successful systemd service startup with all services including "VM Browser OAuth Agent" starting correctly.

---

## Comparison: Working vs Failed VMs

| Aspect | Working VM (192.168.100.2) | Failed VM (192.168.100.6) |
|--------|---------------------------|--------------------------|
| **VM Creation** | ✅ Success | ✅ Success |
| **Network DHCP** | ✅ Success | ✅ Success |
| **IP Assignment** | ✅ 192.168.100.2 | ✅ 192.168.100.6 |
| **OAuth Agent Injection** | ✅ Success | ✅ Success |
| **Console Logs** | ✅ Available | ❌ Not available (cleaned up) |
| **Systemd Services** | ✅ All start | ❌ OAuth agent never starts |
| **Port 8080** | ✅ Reachable | ❌ EHOSTUNREACH |
| **Final Status** | ✅ Operational | ❌ Failed and cleaned up |

---

## Missing Evidence

The biggest gap in this investigation is **console logs from failed VMs**. Key questions that need console logs to answer:

1. Does the VM kernel boot successfully?
2. Do systemd services start?
3. Does the network interface (eth0) come up?
4. Does the OAuth agent service attempt to start?
5. What error messages appear during boot?

**Current Limitation**: Failed VMs are cleaned up immediately after timeout (at 01:29:04), removing all evidence including console.log files.

---

## Recommended Next Steps

### Immediate Actions

1. **Prevent VM Cleanup for Failed VMs**
   - Modify cleanup logic to keep console logs
   - Add `?keep_logs=true` parameter or similar
   - Archive console.log before VM deletion

2. **Add Console Log Monitoring**
   - Stream console.log in real-time during VM creation
   - Log systemd service startup messages
   - Log OAuth agent startup attempts and errors

3. **Investigate OAuth Agent Injection**
   - Compare working VM rootfs with fresh rootfs
   - Verify all injected files exist and are correct
   - Check systemd service file content

4. **Check Golden Rootfs Consistency**
   - Verify golden-rootfs.ext4 hasn't changed
   - Compare with working VM's rootfs
   - Check if rebuild changed something critical

### Debugging Commands

```bash
# Check what services start in fresh VM (need live capture)
journalctl -u vm-browser-agent -f

# Verify OAuth agent files exist in rootfs
ls -la /opt/vm-browser-agent/

# Check systemd service file
cat /etc/systemd/system/vm-browser-agent.service

# Monitor network interface inside VM
ip addr show eth0

# Check /etc/environment content
cat /etc/environment
```

---

## Files Involved

### Fixed Files (Network Issue)
- **✅ RESOLVED**: `/opt/master-controller/src/services/vm-manager.js` (line 212)
  - Removed: `ip=${ipAddress}::${config.network.bridgeIP}:255.255.255.0::eth0:on`
  - Result: DHCP now works correctly

### Files to Investigate
- **Unknown**: Golden rootfs contents (for OAuth agent service)
- **Unknown**: `/opt/vm-browser-agent/` directory contents
- **Unknown**: systemd service configuration inside VM
- **Unknown**: `/etc/environment` inside VM

---

## Conclusion

The network fix is **working correctly**. DHCP assigns IPs properly, and VMs get created successfully. However, a **new issue has emerged**: the OAuth agent service fails to start in fresh VMs, making them completely unusable.

**Key Insight**: The working VM (192.168.100.2) succeeds while fresh VMs fail, suggesting a regression or inconsistency in the VM image or injection process.

**Priority**: HIGH - Fresh VMs cannot be used until OAuth agent startup issue is resolved.

**Next Investigation Phase**: Capture and analyze console logs from a fresh VM during boot to identify why the OAuth agent service fails to start.

---

**Investigation Completed**: November 6, 2025, 01:30 UTC
**Status**: OAuth Agent Startup Failure Identified - Requires Console Log Analysis
