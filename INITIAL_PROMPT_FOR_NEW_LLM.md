# Initial Prompt for New LLM - VM Network Bootstrap Fix

## Quick Start

You are taking over a critical VM networking issue that has been debugged through 4 iterations. Read the comprehensive handoff document first, then follow the action plan below.

---

## 📄 Read This First

**Primary Document:** `/Users/venkat/Documents/polydev-ai/COMPREHENSIVE_HANDOFF_DOCUMENT.md`

This 27-page document contains:
- Complete system architecture
- All SSH credentials and access details
- Full problem description with evidence
- All code (scripts, services, configs)
- 4 previous iteration attempts and why they failed
- Diagnostic procedures
- Alternative approaches to try

**READ IT COMPLETELY** before taking any action. It has everything you need.

---

## 🎯 The Problem (TL;DR)

**Symptom:** Firecracker microVMs boot successfully but cannot establish network connectivity. The VM's eth0 interface never comes UP, making the VM unreachable.

**Impact:** OAuth authentication flow fails because master controller cannot reach the VM's agent on port 8080.

**Root Cause:** Unknown - we've fixed the diagnostics (logging) but haven't seen the actual network setup output yet.

**Current Status:** Golden image iteration 4 is building with systemd console output enabled. Once complete, we should finally see debug output.

---

## 🔑 Critical Access Information

**VPS Host:**
```
IP: 135.181.138.102
User: root
Password: Venkatesh4158198303

SSH Command:
ssh root@135.181.138.102
```

**Local Development:**
```
Project Path: /Users/venkat/Documents/polydev-ai
Build Script: master-controller/scripts/build-golden-snapshot-complete.sh
```

**Key Files on VPS:**
```
/opt/master-controller/                    # Master controller (Node.js)
/var/lib/firecracker/snapshots/base/       # Golden VM image
/var/lib/firecracker/users/vm-{uuid}/      # Per-VM directories
/tmp/master-controller.log                 # Controller logs
/tmp/golden-build-iteration4.log           # Latest build log
```

---

## 📋 Immediate Action Plan

### Step 1: Verify Iteration 4 Build Status (5 minutes)

```bash
# SSH to VPS
ssh root@135.181.138.102

# Check if build is still running
ps aux | grep build-golden-snapshot-complete.sh | grep -v grep

# Check golden image timestamp
ls -lh /var/lib/firecracker/snapshots/base/golden-rootfs.ext4

# If timestamp is recent (Oct 27 20:36 or later), build is complete
# If process is still running, wait for completion (~15 minutes total)
```

**Expected Output:**
```
-rw-r--r-- 1 root root 8.0G Oct 27 20:36 golden-rootfs.ext4
```

### Step 2: Create Test VM (2 minutes)

```bash
# From your local machine or VPS
curl -X POST "http://135.181.138.102:4000/api/auth/start" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "5abacdd1-6a9b-48ce-b723-ca8056324c7a",
    "provider": "claude_code"
  }'
```

**Save the response** - you'll need the `sessionId` and `browserIP`.

Example response:
```json
{
  "success": true,
  "sessionId": "abc-123-def",
  "browserIP": "192.168.100.8",
  "novncURL": "http://135.181.138.102:4000/api/auth/session/abc-123-def/novnc"
}
```

### Step 3: Find and Read VM Console Log (3 minutes)

```bash
# SSH to VPS
ssh root@135.181.138.102

# Find the most recent console.log (created in last 2 minutes)
find /var/lib/firecracker/users -name 'console.log' -type f -mmin -2

# Read the entire log
cat /var/lib/firecracker/users/vm-{uuid}/console.log

# Or search specifically for network setup output
grep -A 100 "Network Setup Script" /var/lib/firecracker/users/vm-{uuid}/console.log
```

### Step 4: Analyze Console Output

**SCENARIO A: You See Script Debug Output ✅**

If you see lines like:
```
=== Network Setup Script Started at ... ===
Using ip command: /sbin/ip
Kernel cmdline: ... ip=192.168.100.8::192.168.100.1:255.255.255.0::eth0:on ...
Found kernel IP parameter: ...
Waiting for device eth0 to appear...
```

**→ GREAT! The systemd console output fix worked.**

Now analyze where it fails:
- Does it find the kernel parameter? (should see "Found kernel IP parameter")
- Does eth0 device appear? (should see "Device eth0 found after N attempts")
- Does bringing up eth0 work? (should see "Device eth0 is UP")
- Does IP assignment work? (should see "IP address assigned")
- Does route addition work? (should see "Default route added")

**Find the first error** and fix that specific issue.

**SCENARIO B: Still No Script Output ❌**

If console.log shows:
```
[OK] Finished Setup Network from Kernel Parameters
```

But NO script output before/after it:

**→ The systemd console output fix didn't work.**

Try **Alternative Approach** (see Step 5 below).

### Step 5: If Still No Debug Output - Alternative Fix

The `StandardOutput=journal+console` directive might not work in this systemd version.

**Try this instead:**

```bash
# On local machine
cd /Users/venkat/Documents/polydev-ai

# Edit the build script
# Change the service file [Service] section to:
```

Replace lines 155-160 in `master-controller/scripts/build-golden-snapshot-complete.sh`:

```bash
# OLD:
[Service]
Type=oneshot
ExecStart=/usr/local/bin/setup-network-kernel-params.sh
RemainAfterExit=yes
StandardOutput=journal+console
StandardError=journal+console

# NEW:
[Service]
Type=oneshot
ExecStart=/bin/bash -c '/usr/local/bin/setup-network-kernel-params.sh 2>&1 | tee /dev/console'
RemainAfterExit=yes
```

Then:
```bash
# Deploy updated script
scp master-controller/scripts/build-golden-snapshot-complete.sh \
    root@135.181.138.102:/opt/master-controller/scripts/

# Rebuild golden image (iteration 5)
ssh root@135.181.138.102 "nohup bash /opt/master-controller/scripts/build-golden-snapshot-complete.sh > /tmp/golden-build-iteration5.log 2>&1 &"

# Wait ~15 minutes, then repeat Steps 2-4
```

---

## 🔍 Diagnostic Commands Reference

### Check Master Controller Status
```bash
ssh root@135.181.138.102 "ps aux | grep 'node.*src/index' | grep -v grep"
ssh root@135.181.138.102 "tail -100 /tmp/master-controller.log"
```

### Check Network on Host
```bash
ssh root@135.181.138.102 "ip link show | grep fc-vm-"
ssh root@135.181.138.102 "ip addr show br0"
```

### Try to Reach VM (replace 192.168.100.8 with your browserIP)
```bash
ssh root@135.181.138.102 "ping -c 3 192.168.100.8"
ssh root@135.181.138.102 "curl -v http://192.168.100.8:8080/health"
```

### Check Build Progress
```bash
ssh root@135.181.138.102 "tail -f /tmp/golden-build-iteration4.log"
```

---

## 🛠️ Common Fixes Based on Console Output

### If Device eth0 Never Appears

**Problem:** Script waits 30 seconds but eth0 never shows up.

**Possible causes:**
1. Firecracker not creating virtio-net device
2. Kernel driver not loading
3. Device name is different (not eth0)

**Fix:**
```bash
# Check what the device is actually called
# Look in console.log for kernel messages about network devices
# Search for: "virtio" or "net" or "eth"

# If device is called something else (like ens3), you have two options:

# Option A: Force eth0 name via kernel parameter
# Add to kernel boot args: net.ifnames=0 biosdevname=0

# Option B: Update script to detect device name dynamically
# Modify script to use: ip link show | grep -v lo | head -1
```

### If IP Assignment Fails

**Error in log:** "ERROR: Failed to assign IP address"

**Possible causes:**
1. Device not UP yet
2. IP already assigned (shouldn't happen but check)
3. Permission issue

**Fix:**
```bash
# Add debug before IP assignment in script:
echo "Current device status before IP assignment:"
$IP_CMD link show "$device"
echo "Current addresses:"
$IP_CMD addr show "$device"

# Try manual assignment to test:
ssh root@135.181.138.102
# Access VM somehow (serial console?) and run:
ip link set eth0 up
ip addr add 192.168.100.8/24 dev eth0
ip route add default via 192.168.100.1 dev eth0
```

### If Route Addition Fails

**Warning in log:** "WARNING: Failed to add default route"

**Possible causes:**
1. Gateway unreachable
2. Route already exists
3. Device not fully UP

**Fix:**
```bash
# Verify gateway is reachable first:
ping -c 1 192.168.100.1

# Check routing table:
ip route show

# Try adding route with explicit device:
ip route add default via 192.168.100.1 dev eth0 metric 100
```

---

## 🔄 Alternative Approaches (If Script Approach Fails)

### Option A: Use systemd-network-generator (Simplest)

**Theory:** Let systemd's built-in generator handle kernel parameters instead of custom script.

**Implementation:**
1. Remove `setup-network-kernel-params.service`
2. Remove `setup-network-kernel-params.sh`
3. Keep only systemd.network files
4. systemd-network-generator automatically processes `ip=` kernel parameter

**Edit build script:**
```bash
# Comment out or remove the service and script creation (lines 148-283)
# Keep only the .network files (lines 119-137)

# File already has this:
mkdir -p rootfs/etc/systemd
cat > rootfs/etc/systemd/network-generator.enabled <<EOF
# This enables systemd-network-generator
EOF
```

**Rebuild and test.**

### Option B: Use dhcpcd Instead of systemd-networkd

**Install dhcpcd:**
```bash
# In build script, install dhcpcd
chroot rootfs apt-get install -y dhcpcd5

# Disable systemd-networkd
chroot rootfs systemctl disable systemd-networkd

# Enable dhcpcd
chroot rootfs systemctl enable dhcpcd
```

### Option C: Static Network via /etc/network/interfaces

**Use traditional networking:**
```bash
# Install ifupdown
chroot rootfs apt-get install -y ifupdown

# Create interfaces file
cat > rootfs/etc/network/interfaces <<'EOF'
auto lo
iface lo inet loopback

auto eth0
iface eth0 inet dhcp
EOF

# Disable systemd-networkd
chroot rootfs systemctl disable systemd-networkd
chroot rootfs systemctl enable networking
```

### Option D: Kernel-Level Network Configuration

**Use kernel's built-in IP configuration:**
```bash
# Ensure kernel parameter format is correct:
ip=192.168.100.8::192.168.100.1:255.255.255.0::eth0:off

# Note: Last parameter is 'off' not 'on'
# This tells kernel to configure IP but not bring interface UP yet
# Then systemd-networkd takes over

# Or use 'on' to have kernel fully configure network:
ip=192.168.100.8::192.168.100.1:255.255.255.0::eth0:on
```

**Check kernel parameter format in vm-manager.js:**
```javascript
// File: /opt/master-controller/src/services/vm-manager.js
// Look for where kernel boot args are set
// Verify format matches: ip=<client>:<server>:<gw>:<mask>:<hostname>:<device>:<autoconf>
```

---

## 📊 Success Criteria

You'll know it works when:

1. ✅ **Console log shows script debug output** (all echo statements visible)
2. ✅ **Script finds eth0 device** ("Device eth0 found after N attempts")
3. ✅ **eth0 comes UP** ("Device eth0 is UP")
4. ✅ **IP assigned** ("IP address assigned")
5. ✅ **Route added** ("Default route added")
6. ✅ **Agent reachable** - `curl http://192.168.100.X:8080/health` returns 200 OK
7. ✅ **No EHOSTUNREACH errors** in master controller log
8. ✅ **OAuth flow works** - Firefox opens in noVNC
9. ✅ **Credentials captured** - User can authenticate

---

## 🚨 Important Notes

1. **VMs are auto-destroyed after 2 minutes** if health checks fail
   - Act quickly when testing
   - Read console.log immediately after creating VM

2. **Golden image builds take ~15 minutes**
   - Don't interrupt the build
   - Monitor with: `tail -f /tmp/golden-build-iterationX.log`

3. **Each iteration is documented**
   - Check `NETWORK_FIX_ITERATION_*.md` files for previous attempts
   - Don't repeat the same mistakes

4. **Master controller must be running**
   - Check with: `ps aux | grep 'node.*src/index'`
   - Restart if needed:
     ```bash
     cd /opt/master-controller && \
     killall node && \
     nohup node src/index.js > /tmp/master-controller.log 2>&1 &
     ```

5. **Console.log is read-only from host**
   - You cannot modify it
   - It's written by the VM kernel/systemd
   - Only way to see output is to configure systemd/scripts correctly

---

## 📞 What to Do If Stuck

1. **Re-read the comprehensive handoff document** - the answer is likely there
2. **Check all 4 previous iterations** - we may have already tried your idea
3. **Look at console.log carefully** - the error is usually visible
4. **Try alternative approaches** - don't keep doing the same thing
5. **Add more debug output** - when in doubt, log everything
6. **Test incrementally** - change one thing at a time

---

## 🎬 Quick Start Commands

```bash
# 1. SSH to VPS
ssh root@135.181.138.102

# 2. Check build status
ls -lh /var/lib/firecracker/snapshots/base/golden-rootfs.ext4

# 3. Create test VM (from local machine)
curl -X POST "http://135.181.138.102:4000/api/auth/start" \
  -H "Content-Type: application/json" \
  -d '{"userId":"5abacdd1-6a9b-48ce-b723-ca8056324c7a","provider":"claude_code"}'

# 4. Find console.log
ssh root@135.181.138.102 \
  "find /var/lib/firecracker/users -name 'console.log' -type f -mmin -2"

# 5. Read it
ssh root@135.181.138.102 "cat /path/from/step4"

# 6. Diagnose and fix!
```

---

## 📁 File Structure Reference

```
Local Machine:
/Users/venkat/Documents/polydev-ai/
├── COMPREHENSIVE_HANDOFF_DOCUMENT.md     ⭐ READ THIS FIRST
├── INITIAL_PROMPT_FOR_NEW_LLM.md         ⭐ YOU ARE HERE
├── NETWORK_FIX_STATUS.md                 (Iteration 1 results)
├── NETWORK_FIX_ITERATION_2.md            (Iteration 2 results)
├── NETWORK_FIX_ITERATION_4.md            (Iteration 4 details)
├── master-controller/
│   ├── src/
│   │   ├── index.js
│   │   ├── routes/auth.js
│   │   ├── services/vm-manager.js        (VM creation logic)
│   │   └── services/browser-vm-auth.js
│   └── scripts/
│       └── build-golden-snapshot-complete.sh ⭐ THE BUILD SCRIPT

VPS (135.181.138.102):
/opt/master-controller/
├── src/                                  (Same as local)
└── scripts/
    └── build-golden-snapshot-complete.sh ⭐ DEPLOYED VERSION

/var/lib/firecracker/
├── snapshots/base/
│   └── golden-rootfs.ext4               ⭐ THE GOLDEN IMAGE
└── users/
    └── vm-{uuid}/
        ├── rootfs.ext4                   (VM's filesystem)
        └── console.log                   ⭐ DEBUG OUTPUT HERE

Inside Golden Image (VM filesystem):
/etc/systemd/system/
└── setup-network-kernel-params.service   ⭐ THE SERVICE

/usr/local/bin/
└── setup-network-kernel-params.sh        ⭐ THE SCRIPT

/etc/systemd/network/
├── 10-eth0.network
└── 20-eth0-fallback.network
```

---

## 🎯 Your Mission

1. Read `COMPREHENSIVE_HANDOFF_DOCUMENT.md` completely
2. Check if iteration 4 build is complete
3. Create test VM and read console.log
4. Analyze the output to find where network setup fails
5. Fix the specific issue identified
6. Rebuild golden image with fix
7. Test until network works and OAuth succeeds

**Goal:** Make eth0 come UP so VMs are reachable and OAuth authentication works.

**Timeline:** This has been attempted 4 times over ~2 hours. Time to solve it!

---

Good luck! You have all the information you need. The issue is solvable - we just need to see what's actually happening during network setup, then fix the specific failure point.
