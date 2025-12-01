# OAuth Agent Debugging - Expert Insights

**Generated**: 2025-11-14
**Source**: Automatic consultation with Polydev (Gemini-2.5-Pro, Codex) + Exa research

## Problem Summary

OAuth agent service on port 8080 never starts inside Firecracker VMs, even though:
- VM boots successfully (process starts, gets PID)
- VM can make HTTP requests to host (WebRTC answer POSTed successfully)
- VM→Host network connectivity works (proven by HTTP requests)
- Console log is **completely empty (0 bytes)** - no boot messages captured
- VM gets cleaned up/terminated quickly after creation

## Root Cause #1: Missing Console Output Configuration (CRITICAL)

**Why console log is empty:**
The Linux kernel needs to be explicitly told where to send console output. Without the `console=ttyS0` kernel boot argument, kernel messages (including panics, init system startup, and service failures) will not be sent to the serial device that Firecracker exposes.

### Fix:
Add `console=ttyS0` to kernel boot arguments in Firecracker configuration:

```json
"boot-source": {
    "kernel_image_path": "path/to/vmlinux",
    "boot_args": "console=ttyS0 reboot=k panic=1 pci=off ip=192.168.100.X::192.168.100.1:255.255.255.0::eth0:off"
}
```

**Additional recommendations:**
- Add `earlyprintk=serial,ttyS0` to see early boot messages
- Ensure Firecracker MachineConfig has serial/console devices enabled

## Root Cause #2: Systemd Service Ordering Issue

**Why OAuth agent doesn't start despite working network:**
The `vm-browser-agent.service` might be starting BEFORE the network is fully configured and ready for applications to bind to ports.

### Fix:
Update systemd service file to wait for network-online.target:

```ini
[Unit]
Description=VM Browser OAuth Agent
Wants=network-online.target
After=network-online.target

[Service]
Type=simple
ExecStart=/opt/vm-browser-agent/start-all.sh
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

## Root Cause #3: Supervisor Script Failing Silently

**Why supervisor script may fail without logging:**
Standard shell scripts don't exit on errors unless explicitly configured. The script could fail at an early step but continue executing (or exit silently).

### Fix:
Add robust error handling and logging to supervisor script:

```bash
#!/bin/bash
set -ex # Exit immediately if a command exits with a non-zero status.
        # Print each command to stderr before executing.

# Redirect all output from this script to a log file for debugging
exec > /tmp/start-all.log 2>&1

echo "Starting vm-browser-agent supervisor script..."

# Your actual commands here
/opt/vm-browser-agent/agent-binary --config /etc/agent.conf

echo "Agent started successfully."
```

Alternative: Use systemd's `ExecStart` with explicit logging:

```ini
ExecStart=/bin/bash -c 'exec /opt/vm-browser-agent/start-all.sh >>/var/log/vm-browser-agent.log 2>&1'
```

## Debugging Strategy

### Step 1: Fix Console Output (HIGHEST PRIORITY)
1. Add `console=ttyS0` to kernel boot args
2. Restart VM and check console.log
3. You should now see kernel boot messages

### Step 2: Check Systemd Service Status
Once console is working, check:
```bash
systemctl status vm-browser-agent
journalctl -u vm-browser-agent -b
systemctl list-units --failed
```

### Step 3: Add Debug Logging
Modify `/opt/vm-browser-agent/start-all.sh` to:
- Use `set -euxo pipefail` at the top
- Redirect stdout/stderr to `/var/log/vm-browser-agent/start-all.log`
- Add echo statements before each major step

### Step 4: Preserve VM State for Debugging
Instead of cleaning up VMs immediately, keep failed VMs alive long enough to:
- SSH in and check logs
- Run `systemctl status vm-browser-agent`
- Check `/var/log/vm-browser-agent/start-all.log`
- Run `journalctl -xe`

## Research Findings

### Modal.com Architecture
Modal uses networking and security isolation for their sandboxes. Key insights:
- Sandboxes have controlled network access
- File access is managed through specific mount points
- Services are containerized with clear lifecycle management

### OnKernel.com Implementation
OnKernel provides browser automation in isolated VMs with:
- Headless and stealth modes
- File I/O capabilities
- Live view functionality
- Persistent profiles across sessions

### Firecracker Console Logging Best Practices
Common issue: Processes getting stuck after resuming from snapshot. Key findings:
- Console output must be explicitly configured
- Serial devices need proper setup in Firecracker API
- Boot arguments are critical for capturing output

## Implementation Status

✅ **VERIFIED**: `console=ttyS0` is already present in vm-manager.js:212
- Boot args include: `console=ttyS0 reboot=k panic=1 root=/dev/vda rw rootfstype=ext4...`
- This means the critical console fix is already deployed

## Next Steps

1. ✅ **COMPLETE**: `console=ttyS0` already in kernel boot args (vm-manager.js:212)
2. **Now Testing**: Create new VM and verify console.log has boot messages
3. **If messages appear**: Diagnose systemd service issues from console logs
4. **If still fails**: Check systemd service file and supervisor script
5. **Update**: Fix systemd service file and supervisor script based on console output

## Files to Modify

1. `/Users/venkat/Documents/polydev-ai/master-controller/src/services/vm-manager.js:155`
   - Add `console=ttyS0` to boot args

2. Golden rootfs `/etc/systemd/system/vm-browser-agent.service`
   - Add `After=network-online.target` and `Wants=network-online.target`

3. Golden rootfs `/opt/vm-browser-agent/start-all.sh`
   - Add `set -euxo pipefail`
   - Add logging redirection

---

**Status**: Research ongoing - additional insights being gathered from Exa and debugging recommendations from Polydev will be added as they complete.
