# VM Debug Log Preservation Fix - Investigation & Solution

**Date**: November 6, 2025
**Status**: ✅ Code Complete - Awaiting Server Deployment
**Priority**: HIGH - Critical for debugging OAuth agent failures

---

## Executive Summary

This document describes a critical fix implemented to preserve console logs from failed VMs. The investigation identified that fresh VMs fail to start the OAuth agent service, but console logs were immediately deleted, preventing root cause analysis.

### What Was Fixed

**Problem**: Failed VMs had their entire directories (including console.log) deleted immediately after timeout, removing all evidence needed to debug why the OAuth agent service fails to start.

**Solution**: Modified the VM cleanup logic to preserve console logs and error logs before deleting VM directories. Logs are now archived to `/var/log/vm-debug-logs/` for debugging purposes.

---

## Changes Made

### File: `/opt/master-controller/src/services/vm-manager.js`

#### 1. Modified `cleanupVM` Method (Line 1143)

**Added parameter**: `preserveLogs = false`

**New functionality**:
- When `preserveLogs = true`, the method:
  - Creates `/var/log/vm-debug-logs/` directory
  - Copies `console.log` to archive with timestamp
  - Copies `firecracker-error.log` to archive with timestamp
  - Logs preservation actions for debugging
  - Then proceeds with normal cleanup

**Code**:
```javascript
async cleanupVM(vmId, removeFromDB = true, preserveLogs = false) {
  // Preserve console logs for debugging if requested
  const vmDir = path.join(config.firecracker.usersDir, vmId);
  if (preserveLogs) {
    try {
      const consoleLogPath = path.join(vmDir, 'console.log');
      const errorLogPath = path.join(vmDir, 'firecracker-error.log');

      // Create debug logs directory
      const debugLogsDir = '/var/log/vm-debug-logs';
      await fs.mkdir(debugLogsDir, { recursive: true });

      // Archive console log if it exists
      if (fsSync.existsSync(consoleLogPath)) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const archivedConsolePath = path.join(debugLogsDir, `${vmId}-console-${timestamp}.log`);
        await fs.copyFile(consoleLogPath, archivedConsolePath);
        logger.info('[CLEANUP] Console log preserved for debugging', {
          vmId,
          originalPath: consoleLogPath,
          archivedPath: archivedConsolePath
        });
      }

      // Archive error log if it exists
      if (fsSync.existsSync(errorLogPath)) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const archivedErrorPath = path.join(debugLogsDir, `${vmId}-error-${timestamp}.log`);
        await fs.copyFile(errorLogPath, archivedErrorPath);
        logger.info('[CLEANUP] Error log preserved for debugging', {
          vmId,
          originalPath: errorLogPath,
          archivedPath: archivedErrorPath
        });
      }
    } catch (preserveErr) {
      logger.warn('[CLEANUP] Failed to preserve logs', {
        vmId,
        error: preserveErr.message
      });
    }
  }

  // Remove VM directory
  try {
    await fs.rm(vmDir, { recursive: true, force: true });
    logger.info('[CLEANUP] VM directory removed', { vmId });
  } catch (err) {
    logger.warn('Failed to remove VM directory', { vmId, error: err.message });
  }
  // ... rest of cleanup
}
```

#### 2. Modified `destroyVM` Method (Line 1115)

**Added parameter**: `preserveLogs = false`

**Changes**:
- Accepts `preserveLogs` parameter
- Passes through to `cleanupVM`

**Code**:
```javascript
async destroyVM(vmId, removeFromDB = true, preserveLogs = false) {
  try {
    logger.info('Destroying VM', { vmId, preserveLogs });

    // Kill Firecracker if running
    const vm = this.activeVMs.get(vmId);
    if (vm) {
      try {
        vm.proc.kill();
        this.activeVMs.delete(vmId);
      } catch (err) {
        logger.warn('Failed to kill Firecracker process', { vmId, error: err.message });
      }
    }

    // Cleanup resources (with optional log preservation)
    await this.cleanupVM(vmId, removeFromDB, preserveLogs);

    logger.info('VM destroyed successfully', { vmId });
  } catch (error) {
    logger.error('VM destruction failed', { vmId, error: error.message });
    throw error;
  }
}
```

#### 3. Modified `processCleanupTasks` Method (Line 1593)

**Changes**:
- When processing cleanup tasks for failed VMs (timeout scenarios), now calls:
```javascript
await this.destroyVM(task.vm_id, true, true);  // preserveLogs = true
```

**Rationale**: Scheduled cleanup tasks are for VMs that failed health checks or timed out. These are exactly the VMs we need to debug, so we always preserve their logs.

---

## Deployment Instructions

### Manual Deployment Steps

1. **Copy the fixed file to server**:
   ```bash
   scp -o StrictHostKeyChecking=no \
     /Users/venkat/Documents/polydev-ai/master-controller/src/services/vm-manager.js \
     root@135.181.138.102:/opt/master-controller/src/services/vm-manager.js
   ```

2. **Restart the master controller**:
   ```bash
   sshpass -p "Venkatesh4158198303" ssh -o StrictHostKeyChecking=no root@135.181.138.102 "
     cd /opt/master-controller
     pkill -9 node
     sleep 3
     nohup node src/index.js > logs/master-controller.log 2>&1 &
     sleep 5
     curl -s http://localhost:4000/health
   "
   ```

3. **Verify deployment**:
   ```bash
   # Check that controller is healthy
   curl http://localhost:4000/health

   # Expected output:
   # {"status":"healthy","uptime":X.XX,"timestamp":"2025-11-06TXX:XX:XX.XXXZ"}
   ```

4. **Create a test VM to verify logs are preserved**:
   ```bash
   curl -X POST http://localhost:4000/api/auth/start \
     -H 'Content-Type: application/json' \
     -d '{"userId": "test-user-debug", "provider": "claude_code"}'

   # Wait 2-3 minutes for it to timeout and be cleaned up

   # Check if logs were preserved
   ls -lh /var/log/vm-debug-logs/
   ```

---

## How It Works

### Log Preservation Flow

1. **VM Creation**: VM is created normally, console.log captures boot output
2. **Health Check Fails**: VM fails health checks (EHOSTUNREACH on port 8080)
3. **Timeout**: After 120 seconds, cleanup task is scheduled
4. **Cleanup Triggered**: `processCleanupTasks` runs, calls `destroyVM(vmId, true, true)`
5. **Log Archive**: Before deleting VM directory:
   - `console.log` → `/var/log/vm-debug-logs/vm-<ID>-console-<timestamp>.log`
   - `firecracker-error.log` → `/var/log/vm-debug-logs/vm-<ID>-error-<timestamp>.log`
6. **Cleanup Complete**: VM directory deleted, but logs preserved for debugging

### What the Logs Will Show

With this fix in place, the preserved logs will reveal:

- **Boot sequence**: Did the VM kernel boot successfully?
- **Systemd startup**: Which services started and which failed?
- **Network interface**: Did eth0 come up? Was DHCP successful?
- **OAuth agent**: Did the systemd service start? What errors occurred?
- **Supervisor script**: Did start-all.sh execute? What happened to the OAuth agent process?

### Accessing Preserved Logs

```bash
# List all preserved VM logs
ls -lth /var/log/vm-debug-logs/

# View a specific console log
cat /var/log/vm-debug-logs/vm-<ID>-console-<timestamp>.log

# View errors
cat /var/log/vm-debug-logs/vm-<ID>-error-<timestamp>.log

# Search for OAuth agent startup
grep -i "oauth\|vm-browser-agent\|started" /var/log/vm-debug-logs/vm-*-console-*.log

# Search for network issues
grep -i "network\|dhcp\|eth0" /var/log/vm-debug-logs/vm-*-console-*.log
```

---

## Investigation Next Steps

Once this fix is deployed:

### 1. Create Fresh Test VM

```bash
# Create a VM that will fail
curl -X POST http://localhost:4000/api/auth/start \
  -H 'Content-Type: application/json' \
  -d '{"userId": "test-oauth-debug", "provider": "claude_code"}'
```

### 2. Wait for Timeout

Wait 2-3 minutes for the VM to timeout and be cleaned up.

### 3. Examine Preserved Logs

```bash
# Check for new log files
ls -lth /var/log/vm-debug-logs/ | head -10

# Read the console log
cat /var/log/vm-debug-logs/vm-*-console-*.log | tail -100
```

### 4. Compare with Working VM

```bash
# Get working VM ID (if any)
# Compare console outputs
diff \
  /var/log/vm-debug-logs/<failed-vm>-console-*.log \
  /var/lib/firecracker/users/vm-5206d631-13ae-4653-987c-009b4e20a231/console.log
```

### 5. Identify Root Cause

Look for differences in:
- Systemd service startup messages
- Network interface configuration
- OAuth agent initialization
- Error messages

---

## Key Investigation Questions

The preserved logs will answer:

1. **Does the VM kernel boot?**
   - Look for: Linux kernel messages, systemd initialization

2. **Do network interfaces come up?**
   - Look for: DHCP requests, eth0 interface UP

3. **Does systemd start services?**
   - Look for: `[  OK  ] Started ...` messages

4. **Does the OAuth agent service start?**
   - Look for: `[  OK  ] Started VM Browser OAuth Agent`
   - Look for: Supervisor script execution logs

5. **What errors occur?**
   - Look for: Failed services, error messages, crash logs

6. **Why is port 8080 not reachable?**
   - Look for: Service binding errors, network issues, process crashes

---

## Technical Details

### Archive Location
- **Directory**: `/var/log/vm-debug-logs/`
- **Naming**: `vm-<vmId>-console-<ISO-timestamp>.log`
- **Format**: ISO 8601 timestamp with colons replaced by hyphens

### Log Types Preserved
1. **console.log**: VM serial console output (ttyS0)
   - Kernel boot messages
   - Systemd service startup
   - Application logs

2. **firecracker-error.log**: Firecracker hypervisor errors
   - VM creation failures
   - API errors
   - Hypervisor crashes

### Retention
- Logs are preserved indefinitely (until manually deleted)
- No automatic cleanup (debugging feature)
- Can implement log rotation later if needed

---

## Files Modified

1. **vm-manager.js**
   - `cleanupVM` method (line 1143): Added log preservation logic
   - `destroyVM` method (line 1115): Added preserveLogs parameter
   - `processCleanupTasks` method (line 1593): Pass preserveLogs=true for failed VMs

---

## Testing Verification

### Before Deployment
```bash
# Create a test VM
curl -X POST http://localhost:4000/api/auth/start \
  -H 'Content-Type: application/json' \
  -d '{"userId": "test-before-fix", "provider": "claude_code"}'

# Wait 3 minutes for cleanup
sleep 180

# Check for preserved logs (should be empty or minimal)
ls -lth /var/log/vm-debug-logs/
```

### After Deployment
```bash
# Create a test VM
curl -X POST http://localhost:4000/api/auth/start \
  -H 'Content-Type: application/json' \
  -d '{"userId": "test-after-fix", "provider": "claude_code"}'

# Wait 3 minutes for cleanup
sleep 180

# Check for preserved logs (should have console.log archive)
ls -lth /var/log/vm-debug-logs/

# Expected: New files with vm-* naming and timestamps
```

---

## Benefits

1. **Root Cause Analysis**: Can finally see why OAuth agent fails to start
2. **Debugging Efficiency**: No need to catch VMs before cleanup
3. **Historical Evidence**: Failed VMs leave debugging trail
4. **Production Debugging**: Can investigate issues without reproduction
5. **Team Collaboration**: Logs available for team analysis

---

## Conclusion

This fix enables critical debugging capability that was missing. Once deployed and tested with a failed VM, the preserved console logs will reveal the root cause of the OAuth agent startup failure.

**Next Action**: Deploy to server and create a test VM to capture logs for analysis.

---

**Document Created**: November 6, 2025
**Author**: Claude Code Investigation
**Status**: Ready for Deployment
