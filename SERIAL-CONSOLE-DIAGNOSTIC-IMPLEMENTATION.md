# Serial Console Diagnostic Implementation

**Date**: 2025-10-18 03:10 UTC
**Status**: 🚧 Implementation Plan
**Purpose**: Enable Firecracker serial console logging to diagnose websockify service failures

---

## Executive Summary

Based on expert AI consultation, the recommended approach is to:
1. **Enable Firecracker serial console logging** to capture VM boot logs and systemd service status
2. **Add health reporting service** to golden snapshot that outputs diagnostic info to serial console
3. **Analyze logs** to determine why websockify isn't starting in new VMs

---

## Phase 1: Enable Serial Console Logging in vm-manager.js

### Current VM Configuration Location

File: `/opt/master-controller/src/services/vm-manager.js`

Current vmConfig structure:
```javascript
const vmConfig = {
  'boot-source': {
    kernel_image_path: config.firecracker.goldenKernel,
    boot_args: `console=ttyS0 reboot=k panic=1 root=/dev/vda rw rootfstype=ext4 ...`
  },
  'drives': [...],
  'network-interfaces': [...],
  'machine-config': {...}
};
```

### Required Changes

Add logger configuration to capture serial console output:

```javascript
const vmConfig = {
  'logger': {
    'log_path': path.join(vmDir, 'serial-console.log'),
    'level': 'Info',
    'show_level': false,
    'show_log_origin': false
  },
  'boot-source': {
    kernel_image_path: config.firecracker.goldenKernel,
    // CRITICAL: console=ttyS0 already present - this routes kernel/systemd output to serial
    boot_args: `console=ttyS0 reboot=k panic=1 root=/dev/vda rw rootfstype=ext4 net.ifnames=0 biosdevname=0 random.trust_cpu=on ip=${ipAddress}::${config.network.bridgeIP}:255.255.255.0::eth0:off`
  },
  // ... rest of config
};
```

**Key Points**:
- `console=ttyS0` is already in boot_args - this is correct and routes output to serial console
- Adding logger config will save serial output to `/run/firecracker/<vmId>/serial-console.log`
- This captures kernel boot messages, systemd service status, and anything written to `/dev/console`

---

## Phase 2: Add Health Reporting Service to Golden Snapshot

### Service 1: Health Report Script

File location in snapshot: `/usr/local/bin/vm-health-report.sh`

```bash
#!/bin/bash
# VM Health Reporting Script
# Outputs diagnostic information to serial console for troubleshooting

echo "=======================================" > /dev/console
echo "VM HEALTH REPORT - $(hostname) - $(date)" > /dev/console
echo "=======================================" > /dev/console
echo "" > /dev/console

echo "### SYSTEMD SERVICE STATUS ###" > /dev/console
systemctl status vncserver@1.service --no-pager -l 2>&1 | head -20 > /dev/console
echo "" > /dev/console
systemctl status novnc.service --no-pager -l 2>&1 | head -20 > /dev/console
echo "" > /dev/console

echo "### JOURNAL LOGS FOR VNC SERVER ###" > /dev/console
journalctl -u vncserver@1.service -b --no-pager -n 20 2>&1 > /dev/console
echo "" > /dev/console

echo "### JOURNAL LOGS FOR WEBSOCKIFY ###" > /dev/console
journalctl -u novnc.service -b --no-pager -n 20 2>&1 > /dev/console
echo "" > /dev/console

echo "### PORT LISTENERS (should show 6080 and 5901) ###" > /dev/console
ss -tlpn 2>&1 > /dev/console
echo "" > /dev/console

echo "### NETWORK INTERFACES ###" > /dev/console
ip addr 2>&1 > /dev/console
echo "" > /dev/console

echo "### PROCESSES (websockify and Xvnc) ###" > /dev/console
ps aux | grep -E '(websockify|Xvnc)' | grep -v grep 2>&1 > /dev/console
echo "" > /dev/console

echo "### FILE CHECK ###" > /dev/console
ls -l /usr/bin/websockify /usr/share/novnc 2>&1 > /dev/console
echo "" > /dev/console

echo "=============== END REPORT ===============" > /dev/console
```

### Service 2: systemd Unit for Health Report

File location in snapshot: `/etc/systemd/system/vm-health-report.service`

```ini
[Unit]
Description=VM Health Report to Serial Console
After=network-online.target novnc.service vncserver@1.service
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/vm-health-report.sh
RemainAfterExit=yes
StandardOutput=journal+console
StandardError=journal+console

[Install]
WantedBy=multi-user.target
```

**Key Points**:
- Runs AFTER websockify and VNC services attempt to start
- `StandardOutput=journal+console` ensures output goes to serial console
- `RemainAfterExit=yes` keeps service as "active" after completion

---

## Phase 3: Modify Golden Snapshot Build Script

### File: `/opt/master-controller/scripts/build-golden-snapshot-complete.sh`

Add the following sections after VNC/websockify configuration:

```bash
echo "[INFO] Adding health reporting service..."

# Create health report script
cat > rootfs/usr/local/bin/vm-health-report.sh << 'HEALTH_EOF'
#!/bin/bash
echo "=======================================" > /dev/console
echo "VM HEALTH REPORT - $(hostname) - $(date)" > /dev/console
echo "=======================================" > /dev/console
echo "" > /dev/console

echo "### SYSTEMD SERVICE STATUS ###" > /dev/console
systemctl status vncserver@1.service --no-pager -l 2>&1 | head -20 > /dev/console
echo "" > /dev/console
systemctl status novnc.service --no-pager -l 2>&1 | head -20 > /dev/console
echo "" > /dev/console

echo "### JOURNAL LOGS FOR VNC SERVER ###" > /dev/console
journalctl -u vncserver@1.service -b --no-pager -n 20 2>&1 > /dev/console
echo "" > /dev/console

echo "### JOURNAL LOGS FOR WEBSOCKIFY ###" > /dev/console
journalctl -u novnc.service -b --no-pager -n 20 2>&1 > /dev/console
echo "" > /dev/console

echo "### PORT LISTENERS ###" > /dev/console
ss -tlpn 2>&1 > /dev/console
echo "" > /dev/console

echo "### NETWORK INTERFACES ###" > /dev/console
ip addr 2>&1 > /dev/console
echo "" > /dev/console

echo "### PROCESSES ###" > /dev/console
ps aux | grep -E '(websockify|Xvnc)' | grep -v grep 2>&1 > /dev/console
echo "" > /dev/console

echo "### FILE CHECK ###" > /dev/console
ls -l /usr/bin/websockify /usr/share/novnc 2>&1 > /dev/console
echo "" > /dev/console

echo "=============== END REPORT ===============" > /dev/console
HEALTH_EOF

chmod +x rootfs/usr/local/bin/vm-health-report.sh

# Create systemd service
cat > rootfs/etc/systemd/system/vm-health-report.service << 'SERVICE_EOF'
[Unit]
Description=VM Health Report to Serial Console
After=network-online.target novnc.service vncserver@1.service
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/vm-health-report.sh
RemainAfterExit=yes
StandardOutput=journal+console
StandardError=journal+console

[Install]
WantedBy=multi-user.target
SERVICE_EOF

# Enable the service
chroot rootfs systemctl enable vm-health-report.service

echo "[INFO] Health reporting service installed and enabled"
```

---

## Phase 4: Update vm-manager.js Implementation

### Changes Required

Add logger configuration to vmConfig in `createBrowserVMConfig()` or wherever vmConfig is created:

```javascript
// In vm-manager.js, around line 200-250 where vmConfig is created

async createBrowserVMConfig(vmId, tapDevice, ipAddress, vmType = 'cli', vcpu = 1, memory = 512) {
  const vmDir = path.join(config.firecracker.usersDir, vmId);

  const vmConfig = {
    // ADD THIS: Logger configuration for serial console
    'logger': {
      'log_path': path.join(vmDir, 'serial-console.log'),
      'level': 'Info',
      'show_level': false,
      'show_log_origin': false
    },
    'boot-source': {
      kernel_image_path: config.firecracker.goldenKernel,
      boot_args: `console=ttyS0 reboot=k panic=1 root=/dev/vda rw rootfstype=ext4 net.ifnames=0 biosdevname=0 random.trust_cpu=on ip=${ipAddress}::${config.network.bridgeIP}:255.255.255.0::eth0:off`
    },
    'drives': [
      {
        drive_id: 'rootfs',
        path_on_host: path.join(vmDir, 'rootfs.ext4'),
        is_root_device: true,
        is_read_only: false
      }
    ],
    'network-interfaces': [
      {
        iface_id: 'eth0',
        guest_mac: this.generateMAC(vmId),
        host_dev_name: tapDevice
      }
    ],
    'machine-config': {
      vcpu_count: Math.floor(vcpu),
      mem_size_mib: memory,
      smt: false
    }
  };

  const configPath = path.join(vmDir, 'vm-config.json');
  await fs.writeFile(configPath, JSON.stringify(vmConfig, null, 2));

  return configPath;
}
```

---

## Phase 5: Create API Endpoint to Read Serial Logs

### New API Route: `/api/vm/console-log`

File: `/opt/master-controller/src/routes/vms.js` (or create new route file)

```javascript
// GET /api/vm/:vmId/console-log
// Returns serial console logs for a specific VM
router.get('/:vmId/console-log', async (req, res) => {
  try {
    const { vmId } = req.params;
    const lines = req.query.lines || 100; // Default: last 100 lines

    const logPath = path.join(config.firecracker.usersDir, vmId, 'serial-console.log');

    // Check if log file exists
    if (!fs.existsSync(logPath)) {
      return res.status(404).json({ error: 'Serial console log not found for this VM' });
    }

    // Read last N lines using tail
    const { stdout } = await execPromise(`tail -n ${lines} ${logPath}`);

    res.json({
      vmId,
      lines: stdout.split('\n'),
      totalLines: lines,
      logPath
    });
  } catch (error) {
    console.error('Error reading console log:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

## Implementation Steps

### Step 1: Update vm-manager.js (Immediate)
1. SSH into Hetzner VPS: `ssh root@135.181.138.102`
2. Edit `/opt/master-controller/src/services/vm-manager.js`
3. Add logger configuration to vmConfig
4. Restart master-controller: `pm2 restart master-controller`

### Step 2: Rebuild Golden Snapshot (30 minutes)
1. Update build script to include health reporting service
2. Run build script: `cd /opt/master-controller && ./scripts/build-golden-snapshot-complete.sh`
3. Wait for completion (~5-10 minutes)
4. Verify golden-rootfs.ext4 timestamp updated

### Step 3: Create New Test VM
1. Destroy any existing Browser VMs
2. Connect provider from frontend (creates new VM from updated snapshot)
3. Wait 30 seconds for VM boot

### Step 4: Analyze Serial Console Logs
1. Call API endpoint: `curl http://135.181.138.102:4000/api/vm/<vmId>/console-log?lines=200`
2. Or read directly: `tail -200 /run/firecracker/<vmId>/serial-console.log`

### Expected Serial Log Output

**If websockify is working**:
```
[  OK  ] Started VNC Server for Display :1
[  OK  ] Started noVNC WebSocket Proxy

VM HEALTH REPORT - browser-vm - Thu Oct 18 03:15:22 UTC 2025
### SYSTEMD SERVICE STATUS ###
● vncserver@1.service - Remote desktop service (VNC)
   Active: active (running) since ...

● novnc.service - noVNC WebSocket Proxy
   Active: active (running) since ...

### PORT LISTENERS ###
tcp   LISTEN 0  128  0.0.0.0:6080   0.0.0.0:*  users:(("websockify",pid=1234,fd=4))
tcp   LISTEN 0  5    127.0.0.1:5901 0.0.0.0:*  users:(("Xvnc",pid=1233,fd=8))
```

**If websockify is failing**:
```
[FAILED] Failed to start noVNC WebSocket Proxy
See 'systemctl status novnc.service' for details

VM HEALTH REPORT - browser-vm - Thu Oct 18 03:15:22 UTC 2025
### SYSTEMD SERVICE STATUS ###
● novnc.service - noVNC WebSocket Proxy
   Active: failed (Result: exit-code)
   ... (error details)

### JOURNAL LOGS FOR WEBSOCKIFY ###
Oct 18 03:15:20 browser-vm websockify[1234]: websockify: cannot connect to localhost:5901: Connection refused
Oct 18 03:15:20 browser-vm systemd[1]: novnc.service: Main process exited, code=exited, status=1/FAILURE
```

---

## Success Criteria

✅ **Phase 1 Complete** when:
- vm-manager.js updated with logger configuration
- master-controller restarted successfully
- New VMs create `serial-console.log` file

✅ **Phase 2 Complete** when:
- Golden snapshot build script includes health reporting service
- Snapshot rebuilt successfully
- Health report script and service present in golden-rootfs.ext4

✅ **Phase 3 Complete** when:
- New VM created from updated snapshot
- Serial console log captured
- Health report visible in serial log

✅ **Diagnostic Complete** when:
- Serial logs reveal exact cause of websockify failure
- Root cause identified (dependency failure, missing binary, network issue, etc.)
- Fix implemented based on findings

---

## Troubleshooting Serial Logs

### If no serial-console.log file created:
- Check Firecracker version supports logger config
- Verify vmConfig JSON syntax is correct
- Check Firecracker process logs: `pm2 logs master-controller`

### If serial log is empty:
- Verify `console=ttyS0` in kernel boot_args
- Check kernel boots successfully
- Try adding `debug` to boot_args for more verbose output

### If health report not appearing:
- Check service was enabled: `mount golden-rootfs.ext4 && ls /etc/systemd/system/multi-user.target.wants/vm-health-report.service`
- Verify script has execute permissions
- Check service dependencies are correct

---

## References

- **Expert Consultation**: `/Users/venkat/Documents/polydev-ai/POLYDEV-CONSULTATION-WEBSOCKIFY.md`
- **Firecracker Documentation**: https://github.com/firecracker-microvm/firecracker/blob/main/docs/logger-system.md
- **systemd Console Output**: https://www.freedesktop.org/software/systemd/man/systemd.exec.html#StandardOutput=
- **VM Manager Implementation**: `/opt/master-controller/src/services/vm-manager.js`
