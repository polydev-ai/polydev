# VM Manager Proxy Integration - Complete

## Date: October 24, 2025

## Summary

Successfully integrated the proxy-port-manager into vm-manager.js to provide each user with a dedicated Decodo proxy port for consistent IP addressing across all their VMs.

## Changes Made to `/opt/master-controller/src/services/vm-manager.js`

### 1. Added Proxy Port Manager Import (Line 14)

```javascript
const proxyPortManager = require('./proxy-port-manager');
```

### 2. Updated `createVM` Function (Lines 405-422)

**Added proxy configuration retrieval as Step 0:**

```javascript
async createVM(userId, vmType, decodoPort = null, decodoIP = null) {
  const vmId = `vm-${crypto.randomUUID()}`;
  const startTime = Date.now();

  try {
    logger.info('[VM-CREATE] Starting VM creation', { vmId, userId, vmType, startTime: new Date().toISOString() });

    // Get user's dedicated proxy configuration
    logger.info('[VM-CREATE] Step 0: Getting user proxy configuration', { vmId, userId });
    const proxyEnv = await this.withTimeout(
      proxyPortManager.getProxyEnvVars(userId),
      5000,
      `[${vmId}] getProxyEnvVars`
    );
    logger.info('[VM-CREATE] Step 0: Proxy config retrieved', {
      vmId,
      proxyPort: proxyEnv.HTTP_PROXY.match(/:(\d+)$/)?.[1]
    });

    // ... rest of VM creation steps
  }
}
```

### 3. Updated Call to `startFirecracker` (Line 486)

**Changed from**:
```javascript
await this.startFirecracker(vmId, configPath, socketPath, decodoPort, decodoIP)
```

**To**:
```javascript
await this.startFirecracker(vmId, configPath, socketPath, proxyEnv)
```

### 4. Updated `startFirecracker` Function Signature (Line 527)

**Changed from**:
```javascript
async startFirecracker(vmId, configPath, socketPath, decodoPort, decodoIP)
```

**To**:
```javascript
async startFirecracker(vmId, configPath, socketPath, proxyEnv = null)
```

### 5. Replaced Proxy Environment Building Logic (Lines 556-565)

**Old code (lines 556-563)**:
```javascript
// Build environment with Decodo proxy if provided
const env = { ...process.env };
if (decodoPort && decodoIP) {
  const proxyURL = `http://${config.decodo.user}:${config.decodo.password}@${config.decodo.host}:${decodoPort}`;
  env.HTTP_PROXY = proxyURL;
  env.HTTPS_PROXY = proxyURL;
  env.DECODO_FIXED_IP = decodoIP;
}
```

**New code**:
```javascript
// Build environment with user's dedicated Decodo proxy
const env = { ...process.env };
if (proxyEnv) {
  // Add all proxy environment variables from proxy-port-manager
  Object.assign(env, proxyEnv);
  logger.info('[FIRECRACKER-PROXY] User proxy configured', {
    vmId,
    proxyPort: proxyEnv.HTTP_PROXY?.match(/:(\d+)$/)?.[1] || 'unknown'
  });
}
```

### 6. Updated Debug Logging (Line 585)

**Changed from**:
```javascript
hasProxy: !!(decodoPort && decodoIP)
```

**To**:
```javascript
hasProxy: !!proxyEnv
```

## How It Works

### New Flow with Proxy Integration

```
1. User initiates VM creation (Browser VM or CLI VM)
2. createVM() called with userId
3. Step 0: Get user's dedicated proxy configuration
   - Calls proxyPortManager.getProxyEnvVars(userId)
   - Returns: {
       HTTP_PROXY: "http://sp9dso1iga:GjHd8bKd3hizw05qZ%3D@dc.decodo.com:10001",
       HTTPS_PROXY: "http://sp9dso1iga:GjHd8bKd3hizw05qZ%3D@dc.decodo.com:10001",
       http_proxy: "http://sp9dso1iga:GjHd8bKd3hizw05qZ%3D@dc.decodo.com:10001",
       https_proxy: "http://sp9dso1iga:GjHd8bKd3hizw05qZ%3D@dc.decodo.com:10001",
       NO_PROXY: "localhost,127.0.0.1,192.168.0.0/16",
       no_proxy: "localhost,127.0.0.1,192.168.0.0/16"
     }
4. Log: "Proxy config retrieved" with port number
5. Continue with IP allocation, TAP device creation, etc.
6. Step 6: Start Firecracker with proxyEnv
7. startFirecracker() receives proxyEnv object
8. Proxy env vars added to Firecracker process environment
9. Log: "[FIRECRACKER-PROXY] User proxy configured" with port
10. Firecracker spawns with proxy environment variables
11. All HTTP/HTTPS requests from VM go through user's dedicated proxy
12. AI services see consistent IP for this user
```

## Benefits

✅ **Automatic proxy assignment** - No manual configuration needed
✅ **Consistent IP per user** - Same port/IP for all user's VMs
✅ **Port persistence** - Port assigned once, reused forever
✅ **Centralized management** - All proxy logic in proxy-port-manager
✅ **Logging** - Clear visibility into proxy configuration
✅ **Backwards compatible** - Old decodoPort/decodoIP params ignored

## Environment Variables Passed to VMs

Each VM now automatically receives these environment variables:

```bash
HTTP_PROXY=http://sp9dso1iga:GjHd8bKd3hizw05qZ=@dc.decodo.com:10001
HTTPS_PROXY=http://sp9dso1iga:GjHd8bKd3hizw05qZ=@dc.decodo.com:10001
http_proxy=http://sp9dso1iga:GjHd8bKd3hizw05qZ=@dc.decodo.com:10001
https_proxy=http://sp9dso1iga:GjHd8bKd3hizw05qZ=@dc.decodo.com:10001
NO_PROXY=localhost,127.0.0.1,192.168.0.0/16
no_proxy=localhost,127.0.0.1,192.168.0.0/16
```

Port number varies per user (10001, 10002, 10003, etc.)

## Example Logs

### VM Creation with Proxy

```
[INFO] [VM-CREATE] Starting VM creation
  vmId: 'vm-abc123'
  userId: '5abacdd1-6a9b-48ce-b723-ca8056324c7a'
  vmType: 'browser'

[INFO] [VM-CREATE] Step 0: Getting user proxy configuration
  vmId: 'vm-abc123'
  userId: '5abacdd1-6a9b-48ce-b723-ca8056324c7a'

[INFO] [VM-CREATE] Step 0: Proxy config retrieved
  vmId: 'vm-abc123'
  proxyPort: '10001'

[INFO] [VM-CREATE] Step 1: Allocating IP
  ...

[INFO] [VM-CREATE] Step 6: Starting Firecracker
  vmId: 'vm-abc123'

[INFO] [FIRECRACKER-PROXY] User proxy configured
  vmId: 'vm-abc123'
  proxyPort: '10001'

[INFO] [SPAWN-DEBUG] About to spawn Firecracker
  vmId: 'vm-abc123'
  hasProxy: true
```

## Testing

### Verify Proxy Integration

After deploying and restarting master-controller:

```bash
# Watch logs during VM creation
ssh root@135.181.138.102
journalctl -u master-controller -f

# Create a test VM
curl -X POST http://135.181.138.102:4000/api/auth/start \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-id", "provider": "claude_code"}'

# Expected logs:
# [VM-CREATE] Step 0: Getting user proxy configuration
# [VM-CREATE] Step 0: Proxy config retrieved { proxyPort: '10001' }
# [FIRECRACKER-PROXY] User proxy configured { proxyPort: '10001' }
```

### Verify Inside VM

```bash
# SSH into VM (via serial console or network)
echo $HTTP_PROXY
# Expected: http://sp9dso1iga:GjHd8bKd3hizw05qZ=@dc.decodo.com:10001

# Test proxy works
curl https://ip.decodo.com/json
# Expected: {"proxy": {"ip": "45.73.167.40"}}  # IP varies by port
```

## Next Steps

1. ✅ **VM Manager integration** - Complete
2. ⏳ **Browser VM Auth integration** - Update browser-vm-auth.js to remove old proxy code
3. ⏳ **Restart master-controller** - Deploy new code
4. ⏳ **End-to-end testing** - Verify VMs get consistent IPs

## Files Deployed

- `/opt/master-controller/src/services/vm-manager.js` - Updated with proxy integration

## Related Documentation

- `DECODO-PROXY-PORT-ASSIGNMENT.md` - Overall proxy system documentation
- `PROXY-PORT-MANAGER-FIXES.md` - Bug fixes and testing
- `VM-MANAGER-PROXY-INTEGRATION-COMPLETE.md` - This file

---

**Status**: ✅ VM Manager Integration Complete
**Next**: Update browser-vm-auth.js
**Created**: October 24, 2025
