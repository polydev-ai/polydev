# POLYDEV MASTER SYSTEM DOCUMENTATION

## 🚨 CRITICAL: ARCH-1 FIX - Redis Session Storage with TTL

**Last Updated**: 2025-11-24
**Status**: Ready for Implementation in Next Session
**Priority**: CRITICAL - Fixes Session Lifecycle Chaos

---

## Problem Statement: ARCH-1 - Session Lifecycle Chaos

### Current Architecture Issues

1. **Sessions Persist Indefinitely in Supabase**
   - Sessions stored in PostgreSQL never expire automatically
   - Dead VMs leave orphaned session records
   - No automatic cleanup mechanism
   - Database grows unbounded with stale sessions

2. **Frontend Confusion**
   - Users see "Session Active" for dead VMs
   - No way to detect if VM is actually alive
   - Confusing UX when trying to reconnect

3. **Resource Waste**
   - Database storage wasted on dead sessions
   - Frontend polling dead sessions
   - No clear session expiration policy

### Solution: Redis with TTL

Replace Supabase session storage with Redis ephemeral storage:

- **Automatic Expiration**: Sessions auto-expire after TTL (default 10 minutes)
- **Source of Truth**: If session not in Redis → VM is dead
- **Clean Frontend UX**: Session not found → Show "Start New Session"
- **Zero Cleanup Required**: Redis handles expiration automatically
- **Fast Lookups**: In-memory performance

---

## Implementation Plan

### Phase 1: Redis Client Service ✅ COMPLETED

**File**: `src/services/redis-client.js`

**Status**: Already implemented with the following features:

- Connection retry with exponential backoff
- Automatic TTL expiration (default 600 seconds)
- Session CRUD operations
- TTL refresh capability
- Health check endpoint
- Graceful shutdown

**Key Methods**:
```javascript
await redisClient.connect()
await redisClient.setSession(sessionId, sessionData, ttl)
const session = await redisClient.getSession(sessionId)
await redisClient.deleteSession(sessionId)
await redisClient.refreshSession(sessionId, ttl)
const ttl = await redisClient.getSessionTTL(sessionId)
const allSessions = await redisClient.getAllSessions()
await redisClient.disconnect()
```

### Phase 2: Configuration ✅ COMPLETED

**File**: `src/config/index.js`

**Redis Configuration Already Added**:
```javascript
redis: {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  sessionTTL: parseInt(process.env.REDIS_SESSION_TTL, 10) || 600, // 10 minutes
  maxRetries: parseInt(process.env.REDIS_MAX_RETRIES, 10) || 10,
  retryDelay: parseInt(process.env.REDIS_RETRY_DELAY, 10) || 3000
}
```

**Environment Variables Needed** (add to `.env`):
```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_SESSION_TTL=600
REDIS_MAX_RETRIES=10
REDIS_RETRY_DELAY=3000
```

### Phase 3: Install Dependencies ✅ COMPLETED

**File**: `package.json`

**ioredis Already Added**:
```json
"dependencies": {
  "ioredis": "^5.3.2"
}
```

**Installation**:
```bash
cd /Users/venkat/Documents/polydev-ai/master-controller
npm install
```

### Phase 4: Integration with Browser VM Auth ⚠️ TODO

**File to Modify**: `src/services/browser-vm-auth.js`

**Current Code Pattern**:
```javascript
// OLD: Supabase session storage
const { data, error } = await supabase
  .from('browser_sessions')
  .insert({ sessionId, userId, provider, status: 'pending' })
  .select()
  .single();
```

**New Code Pattern**:
```javascript
// NEW: Redis session storage with TTL
const redisClient = require('./redis-client');

// Save session to Redis (auto-expires after TTL)
await redisClient.setSession(sessionId, {
  sessionId,
  userId,
  provider,
  status: 'pending',
  browserIP: null,
  createdAt: new Date().toISOString()
});

// Also save to Supabase for audit/historical purposes (optional)
// But Redis is the source of truth for active sessions
```

**Integration Points**:

1. **Session Creation** (in `startAuthentication` method):
   - Save to Redis with TTL
   - Optionally save to Supabase for audit trail

2. **Session Retrieval** (in `getSession` method):
   - Query Redis FIRST
   - If not found → return null (VM is dead)
   - Do NOT fallback to Supabase for active sessions

3. **Session Updates** (in `updateSessionStatus` method):
   - Update in Redis (refreshes TTL)
   - Optionally update in Supabase

4. **Session Deletion** (in `cleanupBrowserSession` method):
   - Delete from Redis
   - Mark as inactive in Supabase

### Phase 5: Update WebRTC Signaling ⚠️ TODO

**File to Modify**: `src/services/webrtc-signaling.js`

**Integration**:
```javascript
const redisClient = require('./redis-client');

// Get session from Redis (source of truth)
const session = await redisClient.getSession(sessionId);

if (!session) {
  throw new Error('Session not found or expired');
}

// Refresh TTL on activity
await redisClient.refreshSession(sessionId);
```

### Phase 6: Update Main Server ⚠️ TODO

**File to Modify**: `src/index.js`

**Add Redis Initialization**:
```javascript
const redisClient = require('./services/redis-client');

async function startServer() {
  try {
    // Initialize Redis connection
    await redisClient.connect();
    logger.info('[REDIS] Connected successfully');

    // Start Express server
    const server = app.listen(config.server.port, config.server.host, () => {
      logger.info(`Master Controller running on ${config.server.host}:${config.server.port}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('[SHUTDOWN] Received SIGTERM signal');
      await redisClient.disconnect();
      server.close();
    });
  } catch (error) {
    logger.error('[STARTUP] Failed to initialize', { error: error.message });
    process.exit(1);
  }
}
```

### Phase 7: Update Health Check Endpoint ⚠️ TODO

**File to Modify**: `src/routes/health.js` or equivalent

**Add Redis Health Check**:
```javascript
app.get('/health', async (req, res) => {
  const redisHealth = await redisClient.healthCheck();

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      redis: redisHealth,
      // ... other services
    }
  });
});
```

---

## Testing Strategy

### End-to-End Test File ✅ CREATED

**File**: `test-redis-session-lifecycle.js`

**Location**: `/Users/venkat/Documents/polydev-ai/master-controller/test-redis-session-lifecycle.js`

**Test Coverage**:
1. ✅ Redis connection
2. ✅ Session creation with TTL
3. ✅ Session retrieval
4. ✅ TTL tracking
5. ✅ Session updates (TTL refresh)
6. ✅ Manual deletion
7. ✅ Auto-expiration (TTL timeout)

**How to Run**:
```bash
cd /Users/venkat/Documents/polydev-ai/master-controller
node test-redis-session-lifecycle.js
```

**Expected Output**:
```
🧪 REDIS SESSION LIFECYCLE TEST
================================

[1/6] Testing Redis connection...
✅ Redis connected

[2/6] Creating session with TTL...
✅ Session created with 10s TTL

[3/6] Retrieving session from Redis...
✅ Session retrieved: { sessionId, status, userId }

[4/6] Checking session TTL...
✅ Session TTL: X seconds remaining

[5/6] Updating session and refreshing TTL...
✅ Session updated, new TTL: X seconds

[6/6] Manually deleting session...
✅ Session deleted from Redis

[BONUS] Testing auto-expiration with 5s TTL...
✅ Session created with 5s TTL
⏳ Waiting 6 seconds for auto-expiration...
✅ Session auto-expired after TTL

🎉 ALL TESTS PASSED!
```

### Integration Testing

After implementation, test the following flows:

1. **OAuth Flow**:
   - Start OAuth → creates session in Redis with TTL
   - Session expires after 10 minutes if not used
   - Frontend shows "Start New Session" for expired sessions

2. **WebRTC Flow**:
   - Create WebRTC session → stores in Redis
   - Session refreshed on activity
   - Auto-expires after idle timeout

3. **Session Cleanup**:
   - Manually destroy VM → deletes Redis session
   - Redis auto-expires after TTL
   - No orphaned sessions in Redis

---

## Deployment Checklist

### Prerequisites

- [ ] Redis server running (local or remote)
- [ ] `REDIS_URL` environment variable set
- [ ] `ioredis` package installed (`npm install`)

### Deployment Steps

1. **Install Redis** (if not already installed):
   ```bash
   # macOS
   brew install redis
   brew services start redis

   # Linux
   sudo apt-get install redis-server
   sudo systemctl start redis
   ```

2. **Update Environment Variables**:
   ```bash
   # Add to .env
   REDIS_URL=redis://localhost:6379
   REDIS_SESSION_TTL=600
   ```

3. **Run End-to-End Test**:
   ```bash
   cd /Users/venkat/Documents/polydev-ai/master-controller
   node test-redis-session-lifecycle.js
   ```

4. **Update Integration Code** (Phase 4-7 above):
   - [ ] Modify `src/services/browser-vm-auth.js`
   - [ ] Modify `src/services/webrtc-signaling.js`
   - [ ] Modify `src/index.js`
   - [ ] Update health check endpoint

5. **Deploy to Production**:
   - [ ] Update VPS Redis URL (if using remote Redis)
   - [ ] Restart master controller
   - [ ] Monitor Redis connection logs
   - [ ] Verify session expiration works

### Production Redis Setup (VPS)

If deploying to production VPS (135.181.138.102):

```bash
# SSH to VPS
ssh root@135.181.138.102

# Install Redis
apt-get update
apt-get install redis-server

# Configure Redis for production
vim /etc/redis/redis.conf
# Set: maxmemory 256mb
# Set: maxmemory-policy allkeys-lru

# Start Redis
systemctl start redis
systemctl enable redis

# Update master controller .env
cd /opt/master-controller
echo "REDIS_URL=redis://localhost:6379" >> .env
echo "REDIS_SESSION_TTL=600" >> .env

# Restart master controller
pkill -9 node
cd /opt/master-controller
nohup node src/index.js > logs/master-controller.log 2>&1 &
```

---

## Migration Strategy

### Option A: Hard Cutover (Recommended)

1. Deploy Redis integration
2. Restart master controller
3. All new sessions use Redis
4. Old Supabase sessions become orphaned (ignore them)
5. Manual cleanup of Supabase sessions later

**Pros**:
- Simple, fast deployment
- No dual-write complexity
- Clean separation

**Cons**:
- In-flight sessions may break (acceptable for early-stage)

### Option B: Gradual Migration

1. Dual-write to both Redis and Supabase
2. Read from Redis, fallback to Supabase
3. After 24 hours, remove Supabase fallback
4. Redis becomes sole source of truth

**Pros**:
- Zero downtime for existing sessions

**Cons**:
- More complex implementation
- Temporary dual-write overhead

**Recommendation**: Use Option A (Hard Cutover) since this is early-stage and session interruption is acceptable.

---

## Monitoring and Debugging

### Redis CLI Commands

```bash
# Connect to Redis CLI
redis-cli

# List all sessions
KEYS session:*

# Get session data
GET session:{sessionId}

# Check TTL
TTL session:{sessionId}

# Count active sessions
DBSIZE

# Monitor real-time commands
MONITOR

# Clear all sessions (DEV ONLY)
FLUSHDB
```

### Logging

Redis client already includes comprehensive logging:

```javascript
logger.info('[REDIS] Session saved with TTL', { sessionId, ttl });
logger.debug('[REDIS] Session retrieved', { sessionId, dataKeys });
logger.warn('[REDIS] Cannot refresh non-existent session', { sessionId });
logger.error('[REDIS] Failed to set session', { sessionId, error });
```

Filter logs:
```bash
tail -f /opt/master-controller/logs/master-controller.log | grep REDIS
```

### Common Issues

**Issue 1: Connection Refused**
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```
**Solution**: Ensure Redis server is running (`redis-server` or `systemctl start redis`)

**Issue 2: Session Not Expiring**
```
Session still exists after TTL
```
**Solution**: Check `SETEX` is used (not `SET`), verify TTL with `TTL` command

**Issue 3: Module Not Found**
```
Error: Cannot find module 'ioredis'
```
**Solution**: Run `npm install` in `/Users/venkat/Documents/polydev-ai/master-controller`

---

## Architecture Diagrams

### Before (ARCH-1 Problem)

```
User Request
     ↓
Master Controller
     ↓
Supabase (PostgreSQL)
     ↓
Sessions persist FOREVER ❌
No automatic cleanup ❌
Dead VMs leave orphaned sessions ❌
```

### After (Redis with TTL)

```
User Request
     ↓
Master Controller
     ↓
Redis (In-Memory)
     ↓
Sessions auto-expire after TTL ✅
Source of truth for active sessions ✅
Dead VMs = No session in Redis ✅
Frontend shows "Start New Session" ✅
```

### Session Lifecycle Flow

```
1. OAuth Start
   ├─→ Create session in Redis (TTL: 600s)
   ├─→ Return sessionId to frontend
   └─→ Frontend polls for "ready" status

2. VM Boots
   ├─→ OAuth agent starts inside VM
   ├─→ Updates session status to "ready"
   └─→ Refreshes TTL (another 600s)

3. User Activity
   ├─→ WebRTC signaling
   ├─→ Refreshes TTL on each activity
   └─→ Session stays alive while active

4. Session Expiration (Pick One)
   a) Manual Cleanup
      └─→ User closes tab → DELETE from Redis

   b) Auto-Expiration
      └─→ 10 minutes idle → Redis auto-deletes

   c) VM Destroyed
      └─→ cleanupBrowserSession() → DELETE from Redis

5. Frontend Detection
   ├─→ GET session from Redis
   ├─→ If null → Show "Start New Session"
   └─→ Clean UX, no confusion
```

---

## Files Reference

### Already Implemented ✅

| File | Status | Description |
|------|--------|-------------|
| `src/services/redis-client.js` | ✅ Complete | Production-grade Redis client with TTL |
| `src/config/index.js` | ✅ Updated | Redis configuration added |
| `package.json` | ✅ Updated | ioredis dependency added |
| `test-redis-session-lifecycle.js` | ✅ Created | End-to-end test (7 tests) |

### Need Integration ⚠️

| File | Status | Action Required |
|------|--------|-----------------|
| `src/services/browser-vm-auth.js` | ⚠️ TODO | Replace Supabase with Redis for session CRUD |
| `src/services/webrtc-signaling.js` | ⚠️ TODO | Query Redis for sessions, refresh TTL |
| `src/index.js` | ⚠️ TODO | Initialize Redis on startup, graceful shutdown |
| `src/routes/health.js` | ⚠️ TODO | Add Redis health check |
| `.env` | ⚠️ TODO | Add REDIS_URL, REDIS_SESSION_TTL |

---

## Next Session Action Plan

### Step-by-Step Implementation

1. **Verify Prerequisites**:
   ```bash
   cd /Users/venkat/Documents/polydev-ai/master-controller

   # Check Redis is running
   redis-cli ping
   # Expected: PONG

   # Check dependencies installed
   ls node_modules/ioredis
   # Expected: directory exists

   # Run end-to-end test
   node test-redis-session-lifecycle.js
   # Expected: 🎉 ALL TESTS PASSED!
   ```

2. **Update Environment Variables**:
   ```bash
   # Add to .env
   echo "REDIS_URL=redis://localhost:6379" >> .env
   echo "REDIS_SESSION_TTL=600" >> .env
   ```

3. **Integrate Redis into Browser VM Auth** (`src/services/browser-vm-auth.js`):
   - Add `const redisClient = require('./redis-client');`
   - Modify `startAuthentication()` to save session to Redis
   - Modify `getSession()` to query Redis FIRST
   - Modify `updateSessionStatus()` to update Redis + refresh TTL
   - Modify `cleanupBrowserSession()` to delete from Redis

4. **Integrate Redis into WebRTC Signaling** (`src/services/webrtc-signaling.js`):
   - Add session lookup via Redis
   - Refresh TTL on WebRTC activity
   - Handle expired sessions gracefully

5. **Update Main Server** (`src/index.js`):
   - Initialize Redis client on startup
   - Add graceful shutdown for Redis
   - Add error handling for Redis connection failures

6. **Update Health Check**:
   - Add Redis health status to `/health` endpoint
   - Include latency and connection status

7. **Test Locally**:
   ```bash
   # Start master controller
   cd /Users/venkat/Documents/polydev-ai/master-controller
   node src/index.js

   # In another terminal, test OAuth flow
   curl -X POST http://localhost:4000/api/auth/start \
     -H "Content-Type: application/json" \
     -d '{"userId":"test-user","provider":"claude_code"}'

   # Check Redis
   redis-cli
   > KEYS session:*
   > GET session:{sessionId}
   > TTL session:{sessionId}
   ```

8. **Deploy to Production VPS**:
   - Install Redis on VPS
   - Update VPS `.env` with Redis URL
   - Deploy updated code
   - Restart master controller
   - Monitor logs for Redis activity

9. **Monitor and Verify**:
   - Check session creation logs
   - Verify TTL expiration works
   - Test manual session deletion
   - Confirm no orphaned sessions

---

## Success Criteria

The implementation is successful when:

- ✅ Sessions automatically expire after 10 minutes (configurable)
- ✅ Redis is the sole source of truth for active sessions
- ✅ Frontend shows "Start New Session" when session expires
- ✅ No orphaned sessions in the system
- ✅ Health check includes Redis status
- ✅ End-to-end test passes (7/7 tests)
- ✅ Production VPS uses Redis for session storage
- ✅ Logs show Redis activity (session creation, retrieval, expiration)
- ✅ Zero database bloat from dead sessions

---

## Additional Notes

### Why Redis Instead of Supabase?

| Aspect | Supabase (PostgreSQL) | Redis |
|--------|----------------------|-------|
| **Persistence** | Permanent storage ❌ | Ephemeral with TTL ✅ |
| **Expiration** | Manual cleanup required ❌ | Auto-expires ✅ |
| **Performance** | Disk I/O (slower) | In-memory (fast) ✅ |
| **Use Case** | Long-term data | Temporary sessions ✅ |
| **Cleanup** | Requires cron jobs ❌ | Automatic ✅ |

**Recommendation**: Use Redis for active sessions, Supabase for audit logs/history (optional).

### Future Enhancements

1. **Redis Sentinel/Cluster** for high availability
2. **Redis Pub/Sub** for real-time session updates across multiple master controllers
3. **Session analytics** - track session duration, expiration reasons
4. **Rate limiting** using Redis (already have `ioredis` installed)
5. **Caching** for frequently accessed data

---

## Contact and Support

**Implementation Questions**: Refer to this document
**Redis Documentation**: https://redis.io/documentation
**ioredis Documentation**: https://github.com/redis/ioredis

**Test File Location**: `/Users/venkat/Documents/polydev-ai/master-controller/test-redis-session-lifecycle.js`
**Redis Client**: `/Users/venkat/Documents/polydev-ai/master-controller/src/services/redis-client.js`

---

**Document Version**: 1.0
**Created**: 2025-11-24
**Status**: Ready for Implementation

**NEXT SESSION**: Follow the "Next Session Action Plan" above to complete the integration.
