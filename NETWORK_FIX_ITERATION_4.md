# Network Bootstrap Fix - Iteration 4

## Date: Oct 27, 2025 - 20:21 UTC

## Root Cause Discovered! 🎯

After creating a test VM from iteration 3 golden image (20:05 UTC build), I discovered the actual root cause:

**The systemd service file was MISSING console output directives!**

### The Problem

The service file had:
```ini
[Service]
Type=oneshot
ExecStart=/usr/local/bin/setup-network-kernel-params.sh
RemainAfterExit=yes
```

**Without `StandardOutput=journal+console` and `StandardError=journal+console`, systemd captures ALL script output and ONLY sends it to journald**, not to the console (/dev/console).

This explains everything:
- ✅ Service showed "Finished Setup Network from Kernel Parameters" (it ran successfully)
- ❌ No script debug output appeared in console.log (systemd blocked it)
- ❌ Network doesn't work (script probably failed but we can't see why)

### What We Learned from Iteration 3 Test

**Console log showed:**
- ✅ "Finished Setup Network from Kernel Parameters" - Service completed
- ✅ "Started VM Browser OAuth Agent" - Agent started
- ✅ "Started VNC Server for Display 1" - VNC started
- ❌ **NO script output** - No "=== Network Setup Script Started ===" messages

**Even though the script had:**
```bash
set -x  # Enable debug output
exec > >(tee -a /tmp/network-setup.log) 2>&1
echo "=== Network Setup Script Started at $(date) ==="
```

The script's `tee` redirection was **useless** because systemd intercepted ALL output before it could reach the console.

## The Fix

Added two critical lines to the systemd service file:

```ini
[Service]
Type=oneshot
ExecStart=/usr/local/bin/setup-network-kernel-params.sh
RemainAfterExit=yes
StandardOutput=journal+console    # ⬅️ ADDED
StandardError=journal+console     # ⬅️ ADDED
```

**What this does:**
- `journal+console` tells systemd to send output to BOTH journald AND /dev/console
- /dev/console output appears in console.log
- Now we'll finally see the script's debug output!

## Files Modified

**File:** `/Users/venkat/Documents/polydev-ai/master-controller/scripts/build-golden-snapshot-complete.sh`
**Lines:** 159-160 (added StandardOutput and StandardError directives)

```diff
[Service]
Type=oneshot
ExecStart=/usr/local/bin/setup-network-kernel-params.sh
RemainAfterExit=yes
+StandardOutput=journal+console
+StandardError=journal+console
```

## Deployment Timeline

- **20:19 UTC** - Modified build script locally
- **20:20 UTC** - Deployed to VPS at `/opt/master-controller/scripts/build-golden-snapshot-complete.sh`
- **20:21 UTC** - Started golden image rebuild iteration 4
- **Expected completion:** ~20:36 UTC (15 minutes)

## Testing Plan

Once iteration 4 golden image is complete:

### 1. Create Test Browser VM
```bash
curl -X POST "http://135.181.138.102:4000/api/auth/start" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "5abacdd1-6a9b-48ce-b723-ca8056324c7a",
    "provider": "claude_code"
  }'
```

### 2. Wait 15 Seconds for Boot

### 3. Check Console Log for Script Output
```bash
# Should now see:
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
# Check agent is reachable
curl http://192.168.100.X:8080/health
# Expected: {"status":"ok","timestamp":"..."}
```

### 5. Trigger OAuth Flow
```bash
curl -X POST "http://135.181.138.102:4000/api/auth/session/SESSION_ID/oauth" \
  -H "Content-Type: application/json" \
  -d '{"provider": "claude_code"}'
```

### 6. Verify Firefox Opens in noVNC

## Success Criteria

✅ **Script debug output visible in console.log**
- All echo statements appear
- All bash -x debug output appears
- Can diagnose what's happening

✅ **Network configuration succeeds**
- eth0 comes UP
- IP address assigned
- Default route added
- Agent reachable on port 8080

✅ **OAuth flow works**
- No EHOSTUNREACH errors
- Firefox opens automatically
- Full authentication succeeds

## Why This Iteration Will Succeed

**Iteration 1 (19:04):**
- ❌ Script had no logging, relative paths, no device wait

**Iteration 2 (19:29):**
- ✅ Script completely rewritten with comprehensive logging
- ❌ Logging redirected to tmpfs (inaccessible after VM destruction)

**Iteration 3 (20:05):**
- ✅ Script uses `tee` to log to console AND file
- ❌ **Systemd blocked console output** (missing StandardOutput=journal+console)

**Iteration 4 (20:21):**
- ✅ Script uses `tee` to log to console AND file
- ✅ **Systemd configured to send output to console** (StandardOutput=journal+console)
- ✅ **Will finally see what's actually happening!**

## Build Status

- **Started:** Oct 27 20:21 UTC
- **Status:** In Progress
- **Expected Completion:** ~20:36 UTC (15 minutes)
- **Log File:** `/tmp/golden-build-iteration4.log`

---

**This is the critical fix we needed!** The script was running all along, but systemd was hiding the output. Now we'll finally see what's happening and can diagnose any remaining network issues.
