# Network Bootstrap Fix - Current Status

## Latest Test Results (Oct 27 19:13)

Created test Browser VM (ID: vm-e54fb588, IP: 192.168.100.4, Session: ba9b5177) from rebuilt golden image.

### What Worked ✅

1. **Golden image successfully rebuilt** (Oct 27 19:04)
   - New network services included
   - Firefox wrapper code present
   - All systemd services configured

2. **VM boots correctly**
   - Firecracker VM starts
   - TAP interface `fc-vm-e54fb` created on host
   - systemd services start in VM

3. **Network setup service runs**
   - `setup-network-kernel-params.service` starts on boot
   - Log shows: "Finished Setup Network from Kernel Parameters"
   - Runs BEFORE systemd-networkd (correct dependency order)

4. **Kernel boot parameters correct**
   ```
   ip=192.168.100.4::192.168.100.1:255.255.255.0::eth0:on
   ```

### What Failed ❌

1. **eth0 interface never comes UP inside VM**
   - No "eth0 UP" messages in console log
   - Network connectivity fails
   - Agent unreachable on port 8080

2. **Master controller health checks fail**
   - Continuous EHOSTUNREACH errors
   - Health check timeout after 2 minutes
   - VM automatically destroyed at 19:15:23

3. **TAP interface lifecycle**
   ```
   19:13:13 - TAP device created: fc-vm-e54fb
   19:15:23 - TAP device removed: fc-vm-e54fb (VM destroyed due to failed health checks)
   ```

## Root Cause Analysis

The `setup-network-kernel-params.service` **runs** but **doesn't actually configure the network**. Possible reasons:

### 1. Script Logic Issue
The script `/usr/local/bin/setup-network-kernel-params.sh` may have a bug:
- Not parsing kernel parameters correctly
- `grep -oP` regex not matching the format
- `ip` commands failing silently
- Missing error handling

### 2. Timing Issue
The service may run too early:
- eth0 device not yet available when script runs
- udev not finished creating network interfaces
- Need to wait for device to appear before configuring

### 3. Permissions/Environment Issue
- Script runs in restricted systemd environment
- PATH may not include `/sbin` where `ip` command lives
- Need explicit `/sbin/ip` or `/usr/sbin/ip` paths

## Diagnosis Steps Needed

Since VMs are destroyed after 2 minutes of failed health checks, we need to:

1. **Disable health check auto-destroy temporarily**
   - Keep failed VMs alive for debugging
   - Access via serial console to check actual state

2. **Check script execution logs**
   - View `/tmp/network-setup.log` inside VM
   - Check systemd journal: `journalctl -u setup-network-kernel-params`
   - Verify script actually executed commands

3. **Manual network test**
   - SSH/console into VM
   - Run network commands manually:
     ```bash
     ip link show eth0
     ip addr show eth0
     cat /proc/cmdline | grep ip=
     ```

## Proposed Fix Options

### Option A: Fix the Script (Preferred)
Add better error handling and logging to the network setup script:

```bash
#!/bin/bash
set -x  # Enable debug output
exec > /tmp/network-setup.log 2>&1  # Redirect all output to log

# Use absolute paths
IP_CMD="/sbin/ip"

# Parse kernel cmdline
if grep -q "ip=" /proc/cmdline; then
    ip_param=$(grep -o 'ip=[^ ]*' /proc/cmdline | cut -d= -f2)
    echo "Found IP parameter: $ip_param"

    # Parse fields
    IFS=':' read -r client_ip server_ip gw_ip netmask hostname device autoconf <<< "$ip_param"

    echo "Parsed: client=$client_ip gw=$gw_ip device=$device"

    # Wait for device to appear
    for i in {1..30}; do
        if $IP_CMD link show "$device" &>/dev/null; then
            echo "Device $device found"
            break
        fi
        sleep 0.1
    done

    # Configure interface
    $IP_CMD link set "$device" up
    $IP_CMD addr add "$client_ip/24" dev "$device"
    $IP_CMD route add default via "$gw_ip"

    echo "Network configured successfully"
else
    echo "No IP parameter in kernel cmdline"
fi
```

### Option B: Use systemd-networkd Generator
Let systemd's built-in network generator handle kernel parameters:
- Ensure `systemd-network-generator` is enabled
- Remove custom script
- Rely on systemd.network files only

### Option C: Fallback to Static IP
Simplify by using static IP in systemd.network file:
- Remove kernel parameter parsing
- Hard-code IP assignment based on VM creation
- Less flexible but more reliable

## Recommended Next Steps

1. **Update the network setup script** with better logging and error handling (Option A)
2. **Rebuild golden image** with fixed script
3. **Create test VM** and access serial console immediately
4. **Check `/tmp/network-setup.log`** to see what actually happened
5. **If still failing**, try Option B (systemd-network-generator)

## Files Modified

- `/Users/venkat/Documents/polydev-ai/master-controller/scripts/build-golden-snapshot-complete.sh`
  - Lines 141-221: Network configuration section
  - Contains: systemd.network files, setup service, helper script

## Previous Work Status

✅ **Firefox wrapper code** - Deployed and ready (556 lines)
✅ **Golden image rebuild** - Complete with network services
✅ **VM creation flow** - Working correctly
❌ **Network bootstrap** - Service runs but doesn't configure eth0

---

## UPDATE: Iteration 2 In Progress (Oct 27 19:19)

**Network setup script has been completely rewritten with:**
- ✅ Comprehensive debug logging (`set -x` + redirect to `/tmp/network-setup.log`)
- ✅ Absolute paths to `ip` command (`/sbin/ip` or `/usr/sbin/ip`)
- ✅ Device wait loop (30 seconds timeout waiting for eth0 to appear)
- ✅ Better parameter parsing (more robust extraction from kernel cmdline)
- ✅ Error handling for every command with detailed messages
- ✅ Final verification output showing interface status, IP, and routes

**Golden Image Rebuild:** In Progress (PID 1048436)
- Started: 19:19 UTC
- Expected completion: ~19:34 UTC (15 minutes)
- Will test immediately after completion

See `NETWORK_FIX_ITERATION_2.md` for complete details of changes.

---

**Status**: Iteration 2 in progress with comprehensive improvements
**Next Action**: Wait for build completion and test with new VM
**Previous Blocking Issue**: Script had no logging, relative paths, no device wait, silent failures
