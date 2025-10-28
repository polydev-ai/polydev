# Comprehensive VM Network Issue - Full Context for Troubleshooting

## Executive Summary

**Problem:** Browser VMs created from golden image cannot establish network connectivity. The VM boots successfully, all services start, but the network interface (eth0) never comes UP, making the VM unreachable and causing OAuth authentication to fail.

**Current Status:** After 4 iterations of fixes, the network setup service runs successfully but we still cannot see debug output or verify if network configuration actually works.

---

## System Architecture

### Infrastructure Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    VPS Host (Hetzner)                        │
│  IP: 135.181.138.102                                         │
│  OS: Ubuntu (systemd)                                        │
│  SSH: root@135.181.138.102                                   │
│  Password: Venkatesh4158198303                               │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │         Master Controller (Node.js)                 │    │
│  │  Port: 4000                                         │    │
│  │  Path: /opt/master-controller                       │    │
│  │  Process: node src/index.js                         │    │
│  │  Log: /tmp/master-controller.log                    │    │
│  └────────────────────────────────────────────────────┘    │
│                         │                                    │
│                         │ Creates/Manages                    │
│                         ↓                                    │
│  ┌────────────────────────────────────────────────────┐    │
│  │    Firecracker microVMs (Browser VMs)              │    │
│  │                                                      │    │
│  │  VM Dir: /var/lib/firecracker/users/vm-{uuid}/     │    │
│  │  Console Log: console.log (in VM dir)               │    │
│  │  Golden Image: /var/lib/firecracker/snapshots/     │    │
│  │                base/golden-rootfs.ext4              │    │
│  │                                                      │    │
│  │  Each VM has:                                        │    │
│  │    - TAP interface: fc-vm-{vmId} (on host)          │    │
│  │    - eth0 interface (inside VM) ❌ NEVER COMES UP   │    │
│  │    - IP: 192.168.100.X (assigned via kernel param)  │    │
│  │    - Services:                                       │    │
│  │      * vm-browser-agent (port 8080)                 │    │
│  │      * vncserver (port 5901)                        │    │
│  │      * novnc (port 6080)                            │    │
│  │      * Firefox (for OAuth)                          │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Network Bridge: br0 (192.168.100.1/24)                     │
│  TAP Interfaces: fc-vm-* (one per VM)                       │
└─────────────────────────────────────────────────────────────┘
```

### VM Creation Flow

1. **User requests OAuth authentication** (via frontend)
2. **Frontend calls** → `POST http://135.181.138.102:4000/api/auth/start`
3. **Master controller creates Firecracker VM:**
   - Clones golden image to VM-specific rootfs
   - Creates TAP interface `fc-vm-{vmId}` on host
   - Starts Firecracker with kernel boot parameters:
     ```
     ip=192.168.100.X::192.168.100.1:255.255.255.0::eth0:on
     ```
   - VM boots Ubuntu 22.04 from golden image

4. **Expected boot sequence inside VM:**
   ```
   systemd boots
     ↓
   setup-network-kernel-params.service runs
     ↓
   Parses kernel cmdline 'ip=' parameter
     ↓
   Brings up eth0 interface
     ↓
   Assigns IP address 192.168.100.X/24
     ↓
   Adds default route via 192.168.100.1
     ↓
   systemd-networkd.service starts
     ↓
   vm-browser-agent.service starts (port 8080)
     ↓
   vncserver@1.service starts (port 5901)
     ↓
   novnc.service starts (port 6080)
   ```

5. **Master controller health checks:**
   - Polls `http://192.168.100.X:8080/health` every few seconds
   - If unreachable for 2 minutes → VM auto-destroyed

6. **OAuth flow (if network works):**
   - Master controller sends OAuth URL to vm-browser-agent
   - Firefox opens automatically in VM
   - User authenticates via noVNC console
   - Credentials captured and returned to CLI

---

## Critical System Details

### VPS Access

```bash
# SSH Access
Host: 135.181.138.102
User: root
Password: Venkatesh4158198303

# SSH Command
ssh root@135.181.138.102

# SCP Command (example)
scp localfile.sh root@135.181.138.102:/opt/master-controller/scripts/
```

### Key File Locations on VPS

```
/opt/master-controller/                           # Master controller code
  ├── src/
  │   ├── index.js                                # Main server
  │   ├── routes/auth.js                          # Auth endpoints
  │   ├── services/vm-manager.js                  # VM creation/management
  │   └── services/browser-vm-auth.js             # OAuth handling
  ├── scripts/
  │   └── build-golden-snapshot-complete.sh       # Golden image builder
  └── package.json

/var/lib/firecracker/
  ├── snapshots/base/
  │   ├── golden-rootfs.ext4                      # Golden VM image (8GB)
  │   └── vmlinux                                 # Linux kernel
  └── users/
      └── vm-{uuid}/                              # Per-VM directory
          ├── rootfs.ext4                         # VM's root filesystem
          ├── config.json                         # Firecracker config
          └── console.log                         # VM boot console output ⭐

/tmp/
  ├── master-controller.log                       # Master controller logs
  └── golden-build-iteration4.log                 # Current build log

# Inside VM (Ubuntu 22.04)
/etc/systemd/system/
  ├── setup-network-kernel-params.service         # Network setup service
  ├── vm-browser-agent.service                    # OAuth agent
  ├── vncserver@1.service                         # VNC server
  └── novnc.service                               # noVNC web client

/etc/systemd/network/
  ├── 10-eth0.network                             # Primary DHCP config
  └── 20-eth0-fallback.network                    # Fallback static IP

/usr/local/bin/
  └── setup-network-kernel-params.sh              # Network setup script

/opt/vm-browser-agent/                            # OAuth agent (Node.js)
  ├── server.js
  └── firefox-wrapper.js                          # Firefox launcher (556 lines)
```

### Network Configuration

**Host Network:**
```
Bridge: br0
  IP: 192.168.100.1/24
  Subnet: 192.168.100.0/24

TAP Interfaces: fc-vm-{vmId}
  Connected to: br0
  Status: UP, BROADCAST, MULTICAST
```

**VM Network (Expected):**
```
Interface: eth0
  IP: 192.168.100.X/24 (X = 2-254, assigned dynamically)
  Gateway: 192.168.100.1
  Status: ❌ NEVER COMES UP (this is the problem!)

Kernel Boot Parameter:
  ip=192.168.100.X::192.168.100.1:255.255.255.0::eth0:on

Format: ip=<client-ip>:<server-ip>:<gw-ip>:<netmask>:<hostname>:<device>:<autoconf>
```

---

## The Problem in Detail

### What's Happening

1. **VM Creation:** ✅ SUCCESS
   - Firecracker VM starts successfully
   - Golden image cloned
   - TAP interface `fc-vm-{vmId}` created on host (UP status)

2. **VM Boot:** ✅ SUCCESS
   - Linux kernel boots
   - systemd starts
   - Console shows boot messages

3. **Network Setup Service:** ✅ RUNS
   - Service `setup-network-kernel-params.service` starts
   - Console shows: "Finished Setup Network from Kernel Parameters"
   - Service completes with success status

4. **Network Interface:** ❌ FAILS
   - eth0 interface **NEVER comes UP**
   - No IP address assigned
   - No connectivity to VM

5. **Agent Unreachable:** ❌ FAILS
   - vm-browser-agent starts on port 8080
   - But master controller cannot reach it
   - Error: `EHOSTUNREACH` (host unreachable)

6. **Health Checks Fail:** ❌ FAILS
   - Master controller polls http://192.168.100.X:8080/health
   - All requests timeout
   - After 2 minutes → VM auto-destroyed

### Console Log Evidence

**From test VM (session: 493180ca-c55b-4eba-a4ab-2b0fcdd851c4, IP: 192.168.100.8):**

```
[[0;32m  OK  [0m] Finished [0;1;39mSetup Network from Kernel Parameters[0m.
[[0;32m  OK  [0m] Reached target [0;1;39mPreparation for Network[0m.
[[0;32m  OK  [0m] Started [0;1;39mNetwork Configuration[0m.
[[0;32m  OK  [0m] Started [0;1;39mVM Browser OAuth Agent[0m.
[[0;32m  OK  [0m] Started [0;1;39mVNC Server for Display 1[0m.
```

**Problem:** No script output! Expected to see:
```
=== Network Setup Script Started at ... ===
Using ip command: /sbin/ip
Kernel cmdline: ... ip=192.168.100.8::192.168.100.1:255.255.255.0::eth0:on ...
Found kernel IP parameter: 192.168.100.8::192.168.100.1:255.255.255.0::eth0:on
Device eth0 found after N attempts
Device eth0 is UP
IP address assigned
Default route added
=== Network setup complete ===
```

### Error Logs

**Master Controller Log:**
```
[Credentials Proxy] Master-controller returned non-OK status: {
  status: 500,
  sessionId: '493180ca-c55b-4eba-a4ab-2b0fcdd851c4'
}
```

**Frontend Logs:**
```
[VM AUTH] 11. Fetch completed with status: 200
GET /api/auth/session/493180ca-c55b-4eba-a4ab-2b0fcdd851c4 200 in 222ms
[Credentials Proxy] Polling OAuth agent via master-controller: {
  sessionId: '493180ca-c55b-4eba-a4ab-2b0fcdd851c4',
  vmIp: '192.168.100.8',
  masterControllerUrl: 'http://135.181.138.102:4000/api/auth/session/...'
}
[Credentials Proxy] Master-controller returned non-OK status: { status: 500 }
```

**Master controller cannot reach VM agent:**
- Tries: `http://192.168.100.8:8080/health`
- Gets: `EHOSTUNREACH` (no route to host)
- Reason: eth0 never came UP, so IP 192.168.100.8 is not assigned

---

## What We've Tried (4 Iterations)

### Iteration 1 (Oct 27 19:04 UTC)
**Changes:**
- Added systemd.network configuration files
- Created `setup-network-kernel-params.service`
- Created `/usr/local/bin/setup-network-kernel-params.sh`

**Result:** ❌ FAILED
- Service ran but network didn't work
- Script had NO debug output
- Used relative paths to `ip` command
- No device wait loop
- Silent failures

### Iteration 2 (Oct 27 19:29 UTC)
**Changes:**
- Completely rewrote network setup script
- Added comprehensive debug logging with `set -x`
- Added absolute paths to `ip` command (`/sbin/ip`)
- Added device wait loop (30 seconds timeout)
- Added error handling for every command
- Added final verification output

**Script header:**
```bash
#!/bin/bash
set -x  # Enable debug output
exec > /tmp/network-setup.log 2>&1  # Redirect to log file
echo "=== Network Setup Script Started at $(date) ==="
```

**Result:** ❌ FAILED
- Service ran successfully
- But log file in `/tmp` (tmpfs in RAM)
- VM destroyed before we could access logs
- No way to see what happened

### Iteration 3 (Oct 27 20:05 UTC)
**Changes:**
- Modified script logging to use `tee`:
  ```bash
  exec > >(tee -a /tmp/network-setup.log) 2>&1
  ```
- This should log to BOTH console AND file

**Result:** ❌ FAILED
- Service ran successfully
- Still NO script output in console.log
- **Root cause discovered:** systemd service file missing console output directives!

### Iteration 4 (Oct 27 20:21 UTC) - CURRENT
**Changes:**
- Added to service file:
  ```ini
  [Service]
  Type=oneshot
  ExecStart=/usr/local/bin/setup-network-kernel-params.sh
  RemainAfterExit=yes
  StandardOutput=journal+console    # ⬅️ ADDED
  StandardError=journal+console     # ⬅️ ADDED
  ```

**Expected:** Script output should now appear in console.log

**Status:** Golden image build in progress
- Started: 20:21 UTC
- Expected completion: ~20:36 UTC
- Not yet tested

---

## Current Network Setup Script

**File:** `/usr/local/bin/setup-network-kernel-params.sh` (inside golden image)

```bash
#!/bin/bash
# Parse kernel command line for ip= parameter and apply network config
# Format: ip=<client-ip>:<server-ip>:<gw-ip>:<netmask>:<hostname>:<device>:<autoconf>

set -x  # Enable debug output

# Log to both file AND console using tee
exec > >(tee -a /tmp/network-setup.log) 2>&1

echo "=== Network Setup Script Started at $(date) ==="

# Use absolute paths to network commands
IP_CMD="/sbin/ip"
if [ ! -x "$IP_CMD" ]; then
    IP_CMD="/usr/sbin/ip"
fi

echo "Using ip command: $IP_CMD"

# Show kernel command line
echo "Kernel cmdline: $(cat /proc/cmdline)"

# Check if ip parameter is set in kernel command line
if grep -q "ip=" /proc/cmdline; then
    # Extract ip= parameter more robustly
    ip_param=$(cat /proc/cmdline | tr ' ' '\n' | grep '^ip=' | head -1 | cut -d= -f2-)

    echo "Found kernel IP parameter: $ip_param"

    if [ -n "$ip_param" ]; then
        # Parse components using IFS
        IFS=':' read -r client_ip server_ip gw_ip netmask hostname device autoconf <<< "$ip_param"

        echo "Parsed values:"
        echo "  client_ip: $client_ip"
        echo "  server_ip: $server_ip"
        echo "  gw_ip: $gw_ip"
        echo "  netmask: $netmask"
        echo "  hostname: $hostname"
        echo "  device: $device"
        echo "  autoconf: $autoconf"

        # Only proceed if we have required values
        if [ -z "$client_ip" ] || [ -z "$gw_ip" ] || [ -z "$device" ]; then
            echo "ERROR: Missing required parameters (client_ip, gw_ip, or device)"
            exit 1
        fi

        echo "Setting up $device with IP $client_ip"

        # Wait for device to appear (up to 30 seconds)
        echo "Waiting for device $device to appear..."
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

        # Bring up the interface
        echo "Bringing up $device..."
        if ! $IP_CMD link set "$device" up; then
            echo "ERROR: Failed to bring up $device"
            exit 1
        fi
        echo "Device $device is UP"

        # Assign IP address with /24 CIDR
        echo "Assigning IP $client_ip/24 to $device..."
        if ! $IP_CMD addr add "$client_ip/24" dev "$device"; then
            echo "ERROR: Failed to assign IP address"
            # Check if address already exists
            if $IP_CMD addr show "$device" | grep -q "$client_ip"; then
                echo "IP address already assigned, continuing..."
            else
                exit 1
            fi
        fi
        echo "IP address assigned"

        # Add default route via gateway
        echo "Adding default route via $gw_ip..."
        if ! $IP_CMD route add default via "$gw_ip" dev "$device" 2>/dev/null; then
            echo "WARNING: Failed to add default route (may already exist)"
            # Check if route exists
            if $IP_CMD route show | grep -q "default via $gw_ip"; then
                echo "Default route already exists, continuing..."
            fi
        else
            echo "Default route added"
        fi

        # Verify configuration
        echo "=== Final Network Configuration ==="
        echo "Interface status:"
        $IP_CMD link show "$device"
        echo "IP addresses:"
        $IP_CMD addr show "$device"
        echo "Routes:"
        $IP_CMD route show
        echo "=== Network setup complete at $(date) ==="

        exit 0
    else
        echo "ERROR: Empty ip parameter extracted from cmdline"
        exit 1
    fi
else
    echo "No kernel IP parameter found, relying on DHCP/systemd-networkd"
    echo "This is normal if using DHCP mode"
    exit 0
fi
```

---

## Current systemd Service File

**File:** `/etc/systemd/system/setup-network-kernel-params.service` (inside golden image)

```ini
[Unit]
Description=Setup Network from Kernel Parameters
Before=systemd-networkd.service
Before=network-pre.target
DefaultDependencies=no

[Service]
Type=oneshot
ExecStart=/usr/local/bin/setup-network-kernel-params.sh
RemainAfterExit=yes
StandardOutput=journal+console
StandardError=journal+console

[Install]
WantedBy=multi-user.target
```

---

## Systemd Network Configuration Files

**File:** `/etc/systemd/network/10-eth0.network`

```ini
[Match]
Name=eth0

[Network]
DHCP=ipv4
LinkLocalAddressing=ipv6

[DHCPv4]
RouteMetric=100
UseDNS=yes

[IPv6AcceptRA]
IPv6Token=::1
```

**File:** `/etc/systemd/network/20-eth0-fallback.network`

```ini
[Match]
Name=eth0

[Network]
Address=192.168.100.10/24
Gateway=192.168.100.1
DNS=8.8.8.8
DNS=8.8.4.4

[Route]
Destination=0.0.0.0/0
Gateway=192.168.100.1
```

---

## How to Diagnose the Issue

### Step 1: Check if Golden Image Build Completed

```bash
ssh root@135.181.138.102

# Check if build process is running
ps aux | grep build-golden-snapshot-complete.sh

# Check golden image file
ls -lh /var/lib/firecracker/snapshots/base/golden-rootfs.ext4

# Check build log
tail -100 /tmp/golden-build-iteration4.log
```

Expected output:
```
-rw-r--r-- 1 root root 8.0G Oct 27 20:36 golden-rootfs.ext4
[INFO] Build complete!
```

### Step 2: Create Test VM

```bash
# From local machine or via curl on VPS
curl -X POST "http://135.181.138.102:4000/api/auth/start" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "5abacdd1-6a9b-48ce-b723-ca8056324c7a",
    "provider": "claude_code"
  }'
```

Response should include:
```json
{
  "success": true,
  "sessionId": "xxx-xxx-xxx",
  "provider": "claude_code",
  "novncURL": "http://135.181.138.102:4000/api/auth/session/xxx/novnc",
  "browserIP": "192.168.100.X"
}
```

### Step 3: Find VM Console Log

```bash
ssh root@135.181.138.102

# Find the VM directory (created in last 2 minutes)
find /var/lib/firecracker/users -name 'console.log' -type f -mmin -2

# Example output:
# /var/lib/firecracker/users/vm-abc123.../console.log
```

### Step 4: Check Console Log for Network Setup Output

```bash
# Read the console log
cat /var/lib/firecracker/users/vm-{uuid}/console.log

# Or search for network setup
grep -A 50 "Network Setup Script" /var/lib/firecracker/users/vm-{uuid}/console.log
```

**With iteration 4 fix, you SHOULD NOW SEE:**
```
=== Network Setup Script Started at ... ===
+ IP_CMD=/sbin/ip
+ echo Using ip command: /sbin/ip
Using ip command: /sbin/ip
+ cat /proc/cmdline
Kernel cmdline: ... ip=192.168.100.8::192.168.100.1:255.255.255.0::eth0:on ...
+ grep -q ip= /proc/cmdline
+ cat /proc/cmdline
+ tr ' ' '\n'
+ grep ^ip=
+ head -1
+ cut -d= -f2-
+ ip_param=192.168.100.8::192.168.100.1:255.255.255.0::eth0:on
+ echo Found kernel IP parameter: 192.168.100.8::192.168.100.1:255.255.255.0::eth0:on
... (more debug output) ...
```

**If you still see NOTHING:**
- The systemd fix didn't work
- Try alternative approach (see below)

### Step 5: Check TAP Interface on Host

```bash
ssh root@135.181.138.102

# List TAP interfaces
ip link show | grep fc-vm-

# Check specific TAP for the VM
ip link show fc-vm-{vmId}

# Expected output:
# fc-vm-xxx: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 ...
```

### Step 6: Check Master Controller Logs

```bash
ssh root@135.181.138.102

tail -100 /tmp/master-controller.log

# Look for:
# - VM creation messages
# - Health check failures
# - EHOSTUNREACH errors
```

### Step 7: Try to Reach VM Agent

```bash
ssh root@135.181.138.102

# Try to ping VM (replace X with VM IP from session response)
ping -c 3 192.168.100.X

# Try to curl agent
curl -v http://192.168.100.X:8080/health

# Expected if network works:
# {"status":"ok","timestamp":"..."}

# Expected if network fails:
# curl: (7) Failed to connect to 192.168.100.X port 8080: No route to host
```

---

## Possible Root Causes to Investigate

### 1. Kernel Parameter Not Being Set
**Check:**
```bash
# Inside VM (via serial console or if you can somehow access it)
cat /proc/cmdline | grep ip=
```

**Expected:**
```
... ip=192.168.100.X::192.168.100.1:255.255.255.0::eth0:on ...
```

**If missing:** VM creation code in master-controller is not passing kernel parameters correctly.

### 2. eth0 Device Never Created by Kernel
**Check:**
```bash
# Inside VM
ip link show
# or
ls -la /sys/class/net/
```

**Expected:** Should show `eth0` device

**If missing:**
- Firecracker virtio-net device not being created
- Check Firecracker config.json for network interface definition

### 3. Script Not Executable or Not Found
**Check:**
```bash
# Inside VM
ls -la /usr/local/bin/setup-network-kernel-params.sh
```

**Expected:**
```
-rwxr-xr-x 1 root root ... /usr/local/bin/setup-network-kernel-params.sh
```

**If missing or not executable:**
- Golden image build script didn't create it properly
- Check build script chmod command

### 4. systemd Service Not Enabled
**Check:**
```bash
# Inside VM
systemctl status setup-network-kernel-params.service
systemctl is-enabled setup-network-kernel-params.service
```

**Expected:**
```
● setup-network-kernel-params.service - Setup Network from Kernel Parameters
   Loaded: loaded (/etc/systemd/system/setup-network-kernel-params.service; enabled)
   Active: active (exited)
```

### 5. StandardOutput Directive Not Working
**Theory:** Maybe systemd in Ubuntu 22.04 doesn't support `journal+console`

**Alternative Fix:**
Modify service file to write directly to console:

```ini
[Service]
Type=oneshot
ExecStart=/bin/bash -c '/usr/local/bin/setup-network-kernel-params.sh 2>&1 | tee /dev/console'
RemainAfterExit=yes
```

### 6. Timing Issue - Script Runs Too Early
**Theory:** eth0 device created AFTER script finishes waiting

**Check:** Increase wait timeout in script from 30s to 60s:
```bash
for i in {1..120}; do  # Was {1..60}
    if $IP_CMD link show "$device" &>/dev/null; then
        break
    fi
    sleep 0.5
done
```

### 7. ip Command Not Working in Early Boot
**Theory:** Network stack not initialized when script runs

**Alternative Fix:** Use lower-level interface:
```bash
# Instead of: ip link set eth0 up
# Try: ifconfig eth0 up

# Or even more basic:
echo 1 > /sys/class/net/eth0/flags  # May not work
```

---

## Alternative Approaches to Try

### Option A: Use systemd-network-generator

systemd has a built-in generator that processes kernel `ip=` parameters.

**Remove custom script, rely on systemd:**

1. Delete `setup-network-kernel-params.service`
2. Delete `setup-network-kernel-params.sh`
3. Ensure `/etc/systemd/network-generator.enabled` exists (already done)
4. Let systemd handle everything

**Reference:** https://www.freedesktop.org/software/systemd/man/systemd-network-generator.service.html

### Option B: Use ifupdown Instead of systemd-networkd

Install traditional networking:

```bash
# In golden image build
chroot rootfs apt-get install -y ifupdown

# Create /etc/network/interfaces
cat > rootfs/etc/network/interfaces <<'EOF'
auto lo
iface lo inet loopback

auto eth0
iface eth0 inet static
    address 192.168.100.10
    netmask 255.255.255.0
    gateway 192.168.100.1
EOF

# Disable systemd-networkd
chroot rootfs systemctl disable systemd-networkd
chroot rootfs systemctl enable networking
```

### Option C: Static IP in VM Creation

**Modify master controller to set IP AFTER VM boots:**

```javascript
// In vm-manager.js, after VM starts
async function configureVMNetwork(vmId, ip) {
    // Use Firecracker API to inject commands via guest agent
    // Or use iptables on host to NAT traffic
}
```

### Option D: Use Cloud-Init

Install and configure cloud-init in golden image:

```bash
chroot rootfs apt-get install -y cloud-init

# Create datasource config
cat > rootfs/etc/cloud/cloud.cfg.d/99_network.cfg <<'EOF'
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: true
EOF
```

Then pass network config via Firecracker metadata service.

---

## Quick Commands Reference

### Access VPS
```bash
ssh root@135.181.138.102
# Password: Venkatesh4158198303
```

### Check Master Controller
```bash
ssh root@135.181.138.102 "ps aux | grep 'node.*src/index' | grep -v grep"
ssh root@135.181.138.102 "tail -50 /tmp/master-controller.log"
```

### Check Golden Image
```bash
ssh root@135.181.138.102 "ls -lh /var/lib/firecracker/snapshots/base/golden-rootfs.ext4"
ssh root@135.181.138.102 "stat /var/lib/firecracker/snapshots/base/golden-rootfs.ext4"
```

### Create Test VM
```bash
curl -X POST "http://135.181.138.102:4000/api/auth/start" \
  -H "Content-Type: application/json" \
  -d '{"userId":"5abacdd1-6a9b-48ce-b723-ca8056324c7a","provider":"claude_code"}'
```

### Find Recent VM
```bash
ssh root@135.181.138.102 "find /var/lib/firecracker/users -name 'console.log' -type f -mmin -5 | head -1"
```

### Read Console Log
```bash
# Replace {path} with output from above command
ssh root@135.181.138.102 "cat {path}"
```

### Check Network from Host
```bash
ssh root@135.181.138.102 "ip link show | grep fc-vm-"
ssh root@135.181.138.102 "curl -v http://192.168.100.8:8080/health"
```

### Rebuild Golden Image
```bash
scp /Users/venkat/Documents/polydev-ai/master-controller/scripts/build-golden-snapshot-complete.sh \
    root@135.181.138.102:/opt/master-controller/scripts/

ssh root@135.181.138.102 "nohup bash /opt/master-controller/scripts/build-golden-snapshot-complete.sh > /tmp/golden-build-new.log 2>&1 &"

# Monitor build (takes ~15 minutes)
ssh root@135.181.138.102 "tail -f /tmp/golden-build-new.log"
```

---

## Expected vs Actual Behavior

### What SHOULD Happen ✅

1. VM boots from golden image
2. `setup-network-kernel-params.service` runs BEFORE systemd-networkd
3. Script parses kernel cmdline: `ip=192.168.100.8::192.168.100.1:255.255.255.0::eth0:on`
4. Script waits for eth0 device to appear (up to 30 seconds)
5. Script brings up eth0: `ip link set eth0 up`
6. Script assigns IP: `ip addr add 192.168.100.8/24 dev eth0`
7. Script adds route: `ip route add default via 192.168.100.1 dev eth0`
8. systemd-networkd starts (sees eth0 already configured)
9. vm-browser-agent starts, listens on 192.168.100.8:8080
10. Master controller can reach http://192.168.100.8:8080/health
11. OAuth flow works, Firefox opens, user authenticates

### What IS Happening ❌

1. VM boots from golden image ✅
2. `setup-network-kernel-params.service` runs ✅
3. Service shows "Finished" successfully ✅
4. **But no debug output in console** ❌
5. **eth0 never comes UP** ❌
6. **No IP address assigned to eth0** ❌
7. vm-browser-agent starts but is unreachable ❌
8. Master controller gets EHOSTUNREACH errors ❌
9. VM destroyed after 2 minutes ❌

---

## Next Steps for Another LLM

1. **Wait for iteration 4 build to complete** (~20:36 UTC Oct 27)
2. **Create test VM** using curl command above
3. **Check console.log** for script debug output
4. **Analyze what's failing:**
   - If you see script output now: diagnose specific failure point
   - If still no output: try alternative approach (Option A, B, C, or D)
5. **Fix the root cause** based on findings
6. **Rebuild golden image** with fix
7. **Test until network works** and OAuth flow succeeds

---

## Contact Information

**VPS:** 135.181.138.102 (Hetzner)
**SSH User:** root
**SSH Password:** Venkatesh4158198303
**Master Controller Port:** 4000
**VM Network:** 192.168.100.0/24

**Current Status:** Iteration 4 golden image build in progress (started 20:21 UTC Oct 27)

**Goal:** Fix network bootstrap so eth0 comes UP and VMs are reachable for OAuth authentication.

---

Good luck! The issue is subtle but solvable. The key is getting visibility into what's actually happening during network setup.
