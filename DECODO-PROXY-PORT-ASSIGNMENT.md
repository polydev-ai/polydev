# Decodo Proxy Port Assignment System

## Date: October 24, 2025 - 09:15 CEST

## Summary

Implemented a dedicated proxy port assignment system where each user gets a **fixed Decodo proxy port** that provides them with a **consistent external IP address** across all their VMs (Browser VMs and CLI VMs).

✅ **Database Table Created**: `user_proxy_ports`
✅ **Proxy Manager Service**: `proxy-port-manager.js`
✅ **Port Range**: 10001-19999 (9,999 unique IPs available)
✅ **NPM Package Installed**: `https-proxy-agent`

---

## Why This Is Important

### Problem Solved

Previously, each VM would get a random IP address. This caused issues when users tried to authenticate with AI services (Claude Code, ChatGPT, Gemini, etc.) because:

- The AI service would see different IPs from the same user
- Rate limiting / security systems would flag this as suspicious
- OAuth flows could fail due to IP mismatches
- User sessions would be reset between VMs

### Solution

Now each user gets **ONE dedicated proxy port** which gives them **ONE consistent external IP address**:

```
User A → Port 10001 → IP: 45.73.167.40 (always)
User B → Port 10002 → IP: 184.174.11.30 (always)
User C → Port 10003 → IP: 23.95.167.12 (always)
...
```

All of User A's VMs (Browser VM for OAuth, CLI VM for coding) will appear to Claude Code/ChatGPT as coming from `45.73.167.40`.

---

## Implementation Details

### Database Schema

**Table**: `public.user_proxy_ports`

```sql
CREATE TABLE public.user_proxy_ports (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  proxy_port INTEGER NOT NULL UNIQUE,
  proxy_ip TEXT,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_verified_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT proxy_port_range CHECK (proxy_port >= 10001 AND proxy_port <= 19999)
);
```

**Key Features**:
- `user_id`: Links to Supabase auth.users table
- `proxy_port`: Auto-increments starting from 10001
- `proxy_ip`: The external IP address verified for this port
- `assigned_at`: When the port was first assigned
- `last_verified_at`: Last time the IP was verified as working

**RLS Policies**:
- Users can read their own proxy port
- Service role can manage all ports

---

### Proxy Port Manager Service

**File**: `/opt/master-controller/src/services/proxy-port-manager.js`

**Key Methods**:

#### `getOrAssignPort(userId)`
Returns user's existing port or assigns a new one:
```javascript
const config = await proxyPortManager.getOrAssignPort(userId);
// Returns: { port: 10001, ip: '45.73.167.40', username, password, host }
```

#### `getProxyEnvVars(userId)`
Returns proxy environment variables for VM:
```javascript
const envVars = await proxyPortManager.getProxyEnvVars(userId);
// Returns: {
//   HTTP_PROXY: 'http://sp9dso1iga:GjHd8bKd3hizw05qZ=@dc.decodo.com:10001',
//   HTTPS_PROXY: 'http://sp9dso1iga:GjHd8bKd3hizw05qZ=@dc.decodo.com:10001',
//   http_proxy: 'http://sp9dso1iga:GjHd8bKd3hizw05qZ=@dc.decodo.com:10001',
//   https_proxy: 'http://sp9dso1iga:GjHd8bKd3hizw05qZ=@dc.decodo.com:10001',
//   NO_PROXY: 'localhost,127.0.0.1,192.168.0.0/16',
//   no_proxy: 'localhost,127.0.0.1,192.168.0.0/16'
// }
```

#### `getUserProxyInfo(userId)`
Returns user-friendly proxy info for display:
```javascript
const info = await proxyPortManager.getUserProxyInfo(userId);
// Returns: {
//   port: 10001,
//   ip: '45.73.167.40',
//   host: 'dc.decodo.com',
//   curlExample: 'curl -U "sp9dso1iga:GjHd8bKd3hizw05qZ=" -x "dc.decodo.com:10001" "https://ip.decodo.com/json"'
// }
```

**Port Assignment Algorithm**:
1. Check if user already has a port → return it
2. If not, get highest assigned port from database
3. Assign next port (previous + 1, starting from 10001)
4. Verify the port by fetching IP via Decodo proxy
5. Store verified IP in database
6. Return port configuration

**Race Condition Handling**:
- Uses PostgreSQL UNIQUE constraint on `proxy_port`
- If two requests try to assign same port, one fails with constraint violation
- Failed request retries with next port

---

## Decodo Proxy Configuration

**Credentials** (from user's requirement):
```
Username: sp9dso1iga
Password: GjHd8bKd3hizw05qZ=
Host: dc.decodo.com
Port Range: 10001-19999
```

**How It Works**:
```bash
# Test port 10001
curl -U "sp9dso1iga:GjHd8bKd3hizw05qZ=" -x "dc.decodo.com:10001" "https://ip.decodo.com/json"
# Returns: { "proxy": { "ip": "45.73.167.40" } }

# Test port 10002
curl -U "sp9dso1iga:GjHd8bKd3hizw05qZ=" -x "dc.decodo.com:10002" "https://ip.decodo.com/json"
# Returns: { "proxy": { "ip": "184.174.11.30" } }
```

Each port number provides a **different stable IP address**.

---

## Integration Points

### Where This Needs to Be Used

#### 1. Browser VM Creation (OAuth Flows)

**File**: `/opt/master-controller/src/services/browser-vm-auth.js`

**Current**: VMs created without proxy configuration

**Required Change**:
```javascript
const proxyPortManager = require('./proxy-port-manager');

async createBrowserVM(userId, provider) {
  // Get user's dedicated proxy configuration
  const proxyEnv = await proxyPortManager.getProxyEnvVars(userId);

  // Pass proxy environment variables to VM
  const vmConfig = {
    userId,
    provider,
    environment: {
      ...proxyEnv,  // Add proxy env vars
      PROVIDER: provider,
      SESSION_ID: sessionId
    }
  };

  await vmManager.createVM(vmConfig);
}
```

#### 2. CLI VM Creation (Codex, Claude Code, etc.)

**File**: `/opt/master-controller/src/services/vm-manager.js`

**Current**: VMs created without proxy configuration

**Required Change**:
```javascript
const proxyPortManager = require('./proxy-port-manager');

async createCLIVM(userId, provider) {
  // Get user's dedicated proxy configuration
  const proxyEnv = await proxyPortManager.getProxyEnvVars(userId);

  // Create VM with proxy env vars
  const vmConfig = {
    userId,
    provider,
    environment: {
      ...proxyEnv,  // Add proxy env vars
      PROVIDER: provider
    }
  };

  await vmManager.createVM(vmConfig);
}
```

#### 3. Golden Snapshot Configuration

**File**: `/var/lib/firecracker/snapshots/base/golden-rootfs.ext4`

**Location**: `/etc/environment` or `/etc/profile.d/proxy.sh`

**Note**: Since each user has their own port, we **cannot** hardcode proxy in the golden snapshot. Instead, proxy environment variables must be passed **dynamically** when creating each VM.

**Approach**: Use Firecracker's boot args or init script to set env vars from metadata.

---

## VM Creation Flow with Proxy

### Old Flow (No Proxy)
```
1. User requests VM creation
2. Master-controller creates Firecracker VM
3. VM boots with no proxy configuration
4. CLI/Browser makes HTTP requests with VM's default IP
5. Different IP for each VM ❌
```

### New Flow (With Proxy)
```
1. User requests VM creation
2. Master-controller calls proxyPortManager.getOrAssignPort(userId)
   → Returns: port 10001, IP 45.73.167.40
3. Master-controller creates Firecracker VM with proxy env vars:
   HTTP_PROXY=http://sp9dso1iga:GjHd8bKd3hizw05qZ=@dc.decodo.com:10001
   HTTPS_PROXY=http://sp9dso1iga:GjHd8bKd3hizw05qZ=@dc.decodo.com:10001
4. VM boots and reads proxy env vars
5. All HTTP/HTTPS requests from VM go through proxy
6. Claude Code/ChatGPT/Gemini see requests from 45.73.167.40 ✅
7. User's next VM (Browser VM or CLI VM) also uses port 10001
8. Claude Code sees SAME IP: 45.73.167.40 ✅
```

---

## Testing

### Test 1: Verify Proxy Port Assignment

```bash
# Run this on server
cd /opt/master-controller
node -e "
const manager = require('./src/services/proxy-port-manager');
manager.getOrAssignPort('00000000-0000-0000-0000-000000000001').then(console.log);
"
```

**Expected Output**:
```json
{
  "port": 10001,
  "ip": "45.73.167.40",
  "username": "sp9dso1iga",
  "password": "GjHd8bKd3hizw05qZ=",
  "host": "dc.decodo.com"
}
```

### Test 2: Verify Port Incrementing

```bash
# Assign port to second user
node -e "
const manager = require('./src/services/proxy-port-manager');
manager.getOrAssignPort('00000000-0000-0000-0000-000000000002').then(console.log);
"
```

**Expected Output**:
```json
{
  "port": 10002,
  "ip": "184.174.11.30",
  "username": "sp9dso1iga",
  "password": "GjHd8bKd3hizw05qZ=",
  "host": "dc.decodo.com"
}
```

### Test 3: Verify Proxy Env Vars

```bash
node -e "
const manager = require('./src/services/proxy-port-manager');
manager.getProxyEnvVars('00000000-0000-0000-0000-000000000001').then(console.log);
"
```

**Expected Output**:
```json
{
  "HTTP_PROXY": "http://sp9dso1iga:GjHd8bKd3hizw05qZ=@dc.decodo.com:10001",
  "HTTPS_PROXY": "http://sp9dso1iga:GjHd8bKd3hizw05qZ=@dc.decodo.com:10001",
  "http_proxy": "http://sp9dso1iga:GjHd8bKd3hizw05qZ=@dc.decodo.com:10001",
  "https_proxy": "http://sp9dso1iga:GjHd8bKd3hizw05qZ=@dc.decodo.com:10001",
  "NO_PROXY": "localhost,127.0.0.1,192.168.0.0/16",
  "no_proxy": "localhost,127.0.0.1,192.168.0.0/16"
}
```

### Test 4: Verify IP via Proxy

```bash
# Test that proxy works from VM
HTTP_PROXY="http://sp9dso1iga:GjHd8bKd3hizw05qZ=@dc.decodo.com:10001" \
curl https://ip.decodo.com/json
```

**Expected Output**:
```json
{
  "proxy": {
    "ip": "45.73.167.40"
  }
}
```

---

## Next Steps

### 1. Update VM Creation Code

Modify these files to use `proxyPortManager`:

**Browser VM**:
- File: `/opt/master-controller/src/services/browser-vm-auth.js`
- Function: `createBrowserVM()` or wherever Firecracker VMs are created
- Change: Add proxy env vars to VM configuration

**CLI VM**:
- File: `/opt/master-controller/src/services/vm-manager.js`
- Function: `createCLIVM()` or wherever CLI VMs are created
- Change: Add proxy env vars to VM configuration

### 2. Pass Env Vars to Firecracker

**Method 1: Boot Args** (Recommended)
```javascript
const bootArgs = `console=ttyS0 reboot=k panic=1 pci=off ` +
  `HTTP_PROXY=${envVars.HTTP_PROXY} ` +
  `HTTPS_PROXY=${envVars.HTTPS_PROXY} ` +
  `NO_PROXY=${envVars.NO_PROXY}`;
```

**Method 2: Cloud-Init / Metadata**
```javascript
// Create cloud-init config with proxy env vars
const cloudInit = {
  write_files: [{
    path: '/etc/environment',
    content: `HTTP_PROXY=${envVars.HTTP_PROXY}\nHTTPS_PROXY=${envVars.HTTPS_PROXY}`
  }]
};
```

**Method 3: Init Script**
```bash
# In /etc/rc.local or systemd service
export HTTP_PROXY="http://sp9dso1iga:GjHd8bKd3hizw05qZ=@dc.decodo.com:${USER_PROXY_PORT}"
export HTTPS_PROXY="http://sp9dso1iga:GjHd8bKd3hizw05qZ=@dc.decodo.com:${USER_PROXY_PORT}"
```

### 3. Frontend Display (Optional)

Show user their dedicated IP in dashboard:

**File**: `/src/app/dashboard/remote-cli/page.tsx`

```typescript
const { data: proxyInfo } = await fetch('/api/user/proxy-info');

<div>
  Your Dedicated IP: {proxyInfo.ip}
  Port: {proxyInfo.port}
</div>
```

---

## Benefits

✅ **Consistent Identity**: AI services see user as one entity across all VMs
✅ **No Rate Limiting**: Same IP = no suspicious activity flags
✅ **OAuth Stability**: IP doesn't change between auth steps
✅ **Scalable**: Supports up to 9,999 users (10001-19999)
✅ **Automatic**: Users don't need to configure anything
✅ **Persistent**: Same IP for user's entire lifecycle

---

## Monitoring

### Check Port Assignments

```sql
SELECT
  u.email,
  p.proxy_port,
  p.proxy_ip,
  p.assigned_at,
  p.last_verified_at
FROM user_proxy_ports p
JOIN auth.users u ON p.user_id = u.id
ORDER BY p.proxy_port;
```

### Check Highest Assigned Port

```sql
SELECT MAX(proxy_port) as highest_port
FROM user_proxy_ports;
```

### Check Available Ports

```sql
SELECT 19999 - COALESCE(MAX(proxy_port), 10000) as ports_remaining
FROM user_proxy_ports;
```

---

## Troubleshooting

### Issue: Port Assignment Fails

**Check database connection**:
```bash
psql -h oxhutuxkthdxvciytwmb.supabase.co -U postgres -d postgres
```

**Check table exists**:
```sql
\d user_proxy_ports
```

### Issue: Proxy Not Working

**Test manually**:
```bash
curl -v -U "sp9dso1iga:GjHd8bKd3hizw05qZ=" \
  -x "dc.decodo.com:10001" \
  "https://ip.decodo.com/json"
```

**Check VM has env vars**:
```bash
# Inside VM
echo $HTTP_PROXY
echo $HTTPS_PROXY
```

### Issue: Different IPs for Same User

**Verify same port assigned**:
```sql
SELECT proxy_port, proxy_ip
FROM user_proxy_ports
WHERE user_id = 'xxx-xxx-xxx';
```

**Check env vars in VM**:
```bash
# All user's VMs should have same port number in HTTP_PROXY
```

---

## Files Created/Modified

### Database
- ✅ Migration: `add_user_proxy_ports.sql`
- ✅ Table: `public.user_proxy_ports`

### Backend (Master-Controller)
- ✅ Service: `/opt/master-controller/src/services/proxy-port-manager.js`
- ✅ Package: `https-proxy-agent` installed

### Documentation
- ✅ This file: `DECODO-PROXY-PORT-ASSIGNMENT.md`

### Pending Changes
- ⚠️ VM Creation: Update browser-vm-auth.js
- ⚠️ VM Creation: Update vm-manager.js
- ⚠️ Golden Snapshot: Add proxy support (dynamic env vars)

---

## Security Considerations

### Credentials Storage

**Current**: Hardcoded in proxy-port-manager.js

**Recommendation**: Move to environment variables:
```javascript
this.DECODO_USERNAME = process.env.DECODO_USERNAME;
this.DECODO_PASSWORD = process.env.DECODO_PASSWORD;
```

### Rate Limiting

With 9,999 unique IPs:
- Each user gets their own IP
- AI services won't rate limit based on IP
- Should add application-level rate limiting per user

### IP Abuse Prevention

Monitor for:
- Users making excessive requests
- Automated bot behavior
- Proxy usage outside VMs

---

**Status**: ✅ Database + Service Ready | ⚠️ Integration Pending
**Created**: October 24, 2025 - 09:15 CEST
**Next**: Integrate with VM creation code
