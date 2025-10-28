# Network Bootstrap Fix - Iteration 2

## Date: Oct 27, 2025 - 19:19 UTC

## Previous Iteration Results (19:04 build)

**What Worked:**
- Golden image successfully rebuilt with network services
- VM boots correctly from new golden image
- `setup-network-kernel-params.service` starts on boot
- Service completes successfully ("Finished Setup Network from Kernel Parameters")
- Kernel boot parameters correct: `ip=192.168.100.4::192.168.100.1:255.255.255.0::eth0:on`

**What Failed:**
- eth0 interface never came UP inside VM
- No network connectivity
- Agent unreachable on port 8080 (EHOSTUNREACH)
- VM auto-destroyed after 2 minutes of failed health checks

**Root Cause:**
The network setup script (`/usr/local/bin/setup-network-kernel-params.sh`) had critical bugs:
1. **No debug output** - Script ran silently, making it impossible to diagnose issues
2. **Bare `ip` command** - May not be in PATH in systemd environment
3. **No device wait** - Script may run before eth0 device is created by kernel
4. **No error handling** - Commands failed silently without reporting
5. **grep -oP regex** - May not match kernel parameter format correctly

## Current Iteration Changes (19:19 build)

### Improved Network Setup Script

**File:** `/Users/venkat/Documents/polydev-ai/master-controller/scripts/build-golden-snapshot-complete.sh`
**Lines:** 165-283 (updated helper script)

### Key Improvements:

1. **Comprehensive Debug Logging**
   ```bash
   set -x  # Enable bash debug mode
   exec > /tmp/network-setup.log 2>&1  # Redirect ALL output to log
   ```

2. **Absolute Path to `ip` Command**
   ```bash
   IP_CMD="/sbin/ip"
   if [ ! -x "$IP_CMD" ]; then
       IP_CMD="/usr/sbin/ip"
   fi
   ```

3. **Device Wait Loop (30 seconds)**
   ```bash
   for i in {1..60}; do
       if $IP_CMD link show "$device" &>/dev/null; then
           echo "Device $device found after $i attempts"
           break
       fi
       if [ $i -eq 60 ]; then
           echo "ERROR: Device $device not found after 30 seconds"
           echo "Available devices:"
           $IP_CMD link show
           exit 1
       fi
       sleep 0.5
   done
   ```

4. **Better Parameter Parsing**
   ```bash
   # More robust extraction
   ip_param=$(cat /proc/cmdline | tr ' ' '\n' | grep '^ip=' | head -1 | cut -d= -f2-)
   ```

5. **Error Handling with Detailed Logging**
   ```bash
   if ! $IP_CMD link set "$device" up; then
       echo "ERROR: Failed to bring up $device"
       exit 1
   fi
   echo "Device $device is UP"
   ```

6. **Final Verification Output**
   ```bash
   echo "=== Final Network Configuration ==="
   echo "Interface status:"
   $IP_CMD link show "$device"
   echo "IP addresses:"
   $IP_CMD addr show "$device"
   echo "Routes:"
   $IP_CMD route show
   echo "=== Network setup complete at $(date) ==="
   ```

### Script Execution Flow

```
1. Script starts → Logs to /tmp/network-setup.log
2. Finds ip command → /sbin/ip or /usr/sbin/ip
3. Shows kernel cmdline → Confirms ip= parameter present
4. Parses kernel parameter → Extracts all 7 fields
5. Logs parsed values → client_ip, gw_ip, device, etc.
6. Waits for device → Up to 30 seconds for eth0 to appear
7. Brings device UP → ip link set eth0 up
8. Assigns IP address → ip addr add 192.168.100.X/24 dev eth0
9. Adds default route → ip route add default via 192.168.100.1 dev eth0
10. Verifies configuration → Shows interface status, IP, routes
11. Exits successfully → Network ready for systemd-networkd
```

## Testing Plan for This Build

### 1. Wait for Golden Image Build to Complete
- Monitor build process (PID 1048436)
- Expected completion: ~19:34 UTC (15 minutes)
- Check for "Build complete!" message

### 2. Create Test Browser VM
```bash
curl -X POST "http://135.181.138.102:4000/api/auth/start" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "5abacdd1-6a9b-48ce-b723-ca8056324c7a",
    "provider": "claude_code"
  }'
```

### 3. Immediately Check Network Setup Log
```bash
# Access serial console or SSH to VM
cat /tmp/network-setup.log

# Expected log output:
# === Network Setup Script Started at ... ===
# Using ip command: /sbin/ip
# Kernel cmdline: ... ip=192.168.100.X::192.168.100.1:255.255.255.0::eth0:on ...
# Found kernel IP parameter: 192.168.100.X::192.168.100.1:255.255.255.0::eth0:on
# Parsed values:
#   client_ip: 192.168.100.X
#   gw_ip: 192.168.100.1
#   device: eth0
# Waiting for device eth0 to appear...
# Device eth0 found after N attempts
# Bringing up eth0...
# Device eth0 is UP
# Assigning IP 192.168.100.X/24 to eth0...
# IP address assigned
# Adding default route via 192.168.100.1...
# Default route added
# === Final Network Configuration ===
# [Interface details]
# === Network setup complete at ... ===
```

### 4. Verify Network Works
```bash
# From host
curl http://192.168.100.X:8080/health
# Expected: {"status":"ok","timestamp":"..."}

# Check TAP interface
ip link show | grep fc-vm-
# Should show UP status

# Check master controller logs
tail -f /tmp/master-controller.log
# Should see NO EHOSTUNREACH errors
```

## Success Criteria

✅ **Script runs with full debug output**
- `/tmp/network-setup.log` shows detailed execution trace
- All commands logged with `set -x` output
- Can diagnose any failures from log

✅ **Device wait loop succeeds**
- eth0 appears within 30 seconds
- Log shows "Device eth0 found after N attempts"

✅ **Network configuration succeeds**
- eth0 brought UP successfully
- IP address assigned: 192.168.100.X/24
- Default route added via 192.168.100.1
- Final verification shows correct configuration

✅ **Agent becomes reachable**
- curl to port 8080 succeeds
- No EHOSTUNREACH errors
- Health checks pass

✅ **OAuth flow works**
- Can trigger OAuth flow
- Firefox opens in noVNC
- Full authentication succeeds

## Rollback Plan

If this iteration also fails:

1. **Access the log file** `/tmp/network-setup.log` immediately (before VM is destroyed)
2. **Analyze what failed** - parsing, device wait, ip commands, or permissions
3. **Try Alternative Approach:**
   - Option B: Use systemd-network-generator (built-in kernel param processor)
   - Option C: Static IP in systemd.network file without kernel parameters

## Files Changed

- `/Users/venkat/Documents/polydev-ai/master-controller/scripts/build-golden-snapshot-complete.sh`
  - Lines 165-283: Completely rewritten network setup script
  - Added comprehensive logging, error handling, device wait, absolute paths

## Build Status

- **Started:** Oct 27 19:19 UTC (PID 1048436)
- **Status:** In Progress
- **Expected Completion:** ~19:34 UTC (15 minutes total)
- **Log File:** `/tmp/golden-build-<timestamp>.log`

---

**This iteration addresses all known issues from the first attempt and provides comprehensive diagnostics for any remaining failures.**
