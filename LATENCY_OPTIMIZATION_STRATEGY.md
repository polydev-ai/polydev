# Latency Optimization Strategy

**Goal**: Minimize latency for 100+ concurrent users using subscription-based CLI tools
**Target**: <500ms total time-to-first-token

---

## Current Flow & Latency Breakdown

### Without Warm Pool (Cold Start):
```
1. User sends prompt                    →  0ms
2. Master-controller receives           →  +50ms (network)
3. Decrypt OAuth tokens from DB         →  +20ms (AES-256-GCM)
4. Submit Nomad job                     →  +50ms (API call)
5. Nomad schedules container            →  +100ms (scheduling)
6. Docker pull image (if not cached)    →  +0ms (cached)
7. Docker container start               →  +500ms (container boot)
8. Mount OAuth credential files         →  +50ms (file copy)
9. CLI tool startup                     →  +200ms (Node.js init)
10. CLI reads credentials               →  +50ms (file read)
11. CLI makes API call                  →  +100ms (network to OpenAI/Anthropic/Google)
12. First token received                →  +200ms (model processing)
13. Stream back to user                 →  +50ms (network)

TOTAL: ~1,370ms ❌ Too slow!
```

### With Warm Pool (Optimized):
```
1. User sends prompt                    →  0ms
2. Master-controller receives           →  +50ms (network)
3. Allocate warm container from pool    →  +10ms (memory lookup)
4. Inject OAuth credentials via exec    →  +50ms (docker exec)
5. Execute: codex exec "$PROMPT"        →  +100ms (already running!)
6. CLI makes API call                   →  +100ms (network)
7. First token received                 →  +200ms (model processing)
8. Stream back to user                  →  +50ms (network)

TOTAL: ~560ms ✅ Much better!
```

---

## 🚀 Optimization Techniques

### 1. Warm Pool Pre-Loading ⭐ CRITICAL

**Strategy**: Keep containers running with credentials already mounted

```javascript
// Warm Pool Configuration
{
  openai: {
    poolSize: 30,  // 30 idle containers ready
    strategy: 'credential-preloaded',  // Creds already mounted!
    users: ['user1', 'user2', ...],  // Pre-load for active users
  },
  anthropic: {
    poolSize: 30,
    strategy: 'credential-preloaded'
  },
  google: {
    poolSize: 40,  // More Google users (free tier!)
    strategy: 'credential-preloaded'
  }
}
```

**Benefit**: Eliminates 500ms container boot + 50ms credential mount = **550ms saved!**

### 2. Credential Pre-Injection

**Instead of**:
```
Container starts → Wait for ready → Copy creds via docker cp → Execute
```

**Do**:
```
Container starts WITH creds already mounted as volume
```

**Implementation**:
```javascript
// Nomad job config
volumes = [
  "user123-openai-creds:/root/.codex:ro"  // Read-only mount
]

// Pre-create credential volumes for active users
docker volume create user123-openai-creds
docker cp user123-auth.json user123-openai-creds:/auth.json
```

**Benefit**: 50ms saved, more reliable

### 3. Container Keep-Alive Strategy

**Problem**: Starting containers takes 500ms

**Solution**: Keep containers alive after first use

```javascript
// After execution completes
if (user.requestsInLast5Min > 3) {
  // Keep container alive for 5 minutes
  containerPool.keepAlive(containerId, 300000);
} else {
  // Return to warm pool or destroy
  containerPool.release(containerId);
}
```

**Benefit**: Subsequent requests from same user = **<100ms!**

### 4. Streaming Optimizations

**Use Server-Sent Events (SSE)** for immediate streaming:

```javascript
// Start streaming BEFORE full response ready
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');

// Stream as soon as first token arrives
docker.attach(containerId, { stream: true })
  .on('data', chunk => {
    res.write(`data: ${chunk}\n\n`);  // Immediate flush!
  });
```

**Benefit**: User sees response **immediately** instead of waiting for full completion

### 5. Model Selection by Speed

**Fastest models** (confirmed from your tests):

| Provider | Model | Speed | Cost with Subscription |
|----------|-------|-------|------------------------|
| OpenAI | `gpt-5-codex` | FASTEST | FREE (ChatGPT Pro unlimited) |
| Anthropic | `claude-sonnet-4-5` | FAST | FREE (Claude Max unlimited) |
| Google | `gemini-2.5-flash` | VERY FAST | FREE (Personal Google account!) |

**Default to FASTEST**:
```javascript
const modelDefaults = {
  openai: 'gpt-5-codex',      // Fast + unlimited
  anthropic: 'claude-sonnet-4-5',  // Fast + unlimited
  google: 'gemini-2.5-flash'  // Fastest + FREE
};
```

### 6. Connection Pooling

**Problem**: Each container makes new HTTPS connection to API

**Solution**: HTTP/2 connection reuse

```javascript
// In container, reuse connections
const agent = new https.Agent({
  keepAlive: true,
  maxSockets: 1,
  keepAliveMsecs: 60000
});

// CLI tools should reuse this automatically
```

**Benefit**: 50-100ms saved on subsequent requests

### 7. DNS Caching

**Pre-resolve API endpoints**:
```
api.openai.com → 13.107.213.64 (cached)
api.anthropic.com → 54.230.87.123 (cached)
generativelanguage.googleapis.com → 142.250.80.10 (cached)
```

**Benefit**: 20-50ms saved on DNS lookup

### 8. Credential Volume Pre-Creation

**For top 100 users, pre-create volumes**:

```bash
# During off-peak hours, create volumes for active users
for userId in $(get_top_100_active_users); do
  docker volume create ${userId}-openai-creds
  docker volume create ${userId}-anthropic-creds
  docker volume create ${userId}-google-creds

  # Copy latest credentials
  copy_credentials_to_volume $userId openai
  copy_credentials_to_volume $userId anthropic
  copy_credentials_to_volume $userId google
done
```

**Benefit**: 0ms credential lookup for frequent users!

---

## 🎯 Optimized Warm Pool Architecture

### Design for 100 Concurrent Users:

```
Warm Pool Distribution:
├─ OpenAI (30 containers)
│  ├─ Generic pool: 10 (no creds)
│  └─ User-specific: 20 (top 20 users with creds pre-loaded)
│
├─ Anthropic (30 containers)
│  ├─ Generic pool: 10
│  └─ User-specific: 20
│
└─ Google (40 containers)
   ├─ Generic pool: 20 (most users use Gemini - FREE!)
   └─ User-specific: 20

Total: 100 warm containers
RAM: 100 × 256MB = 25.6GB
CPU: 100 × 0.1 = 10 cores
Remaining: 26.4GB RAM, 10 cores for burst capacity
```

### Allocation Strategy:

```javascript
async function allocateContainer(userId, provider) {
  // Try user-specific pool first (fastest - creds already loaded!)
  let container = warmPool.getUserContainer(userId, provider);
  if (container) {
    return { container, latency: 50ms };  // ⚡ Instant!
  }

  // Try generic pool (need to inject creds)
  container = warmPool.getGenericContainer(provider);
  if (container) {
    await injectCredentials(container, userId, provider);
    return { container, latency: 150ms };  // Still fast
  }

  // Cold start (slowest)
  container = await createNewContainer(provider);
  await injectCredentials(container, userId, provider);
  return { container, latency: 800ms };  // Slow but rare
}
```

---

## 📊 Expected Performance

### Time to First Token:

| Scenario | Latency | How Often |
|----------|---------|-----------|
| **User-specific warm container** | **150ms** ⚡ | 60% of requests |
| **Generic warm container** | **300ms** ✅ | 30% of requests |
| **Cold start** | **800ms** ⚠️ | 10% of requests |

**Average**: ~250ms time-to-first-token ✅

### Throughput:

```
100 concurrent containers
× 60 requests/min per container (rate limit)
= 6,000 requests/min
= 100 requests/sec
= 8.6 million requests/day
```

**Using 3 subscriptions** (~$80/month):
- ChatGPT Pro: $20/month
- Claude Max: $60/month
- Gemini: FREE

**Cost per million tokens**: Effectively $0! ✅

---

## 🔧 Implementation Checklist

### Phase 5 Optimizations:

- [ ] Warm pool with credential pre-loading
- [ ] User-specific container pools for top users
- [ ] Docker volume management for credentials
- [ ] Container keep-alive for active users
- [ ] SSE streaming for immediate response
- [ ] Connection pooling
- [ ] DNS caching
- [ ] Nomad job affinity (keep user on same node)

### Monitoring (Phase 6):

- [ ] Track allocation latency (user-specific vs generic vs cold)
- [ ] Monitor pool utilization
- [ ] Alert on pool exhaustion
- [ ] Track time-to-first-token per provider

---

## 🎯 Final Recommendations

**For Minimal Latency**:

1. **Prioritize warm pool** - Pre-load credentials for active users
2. **Use fastest models** - gpt-5-codex, claude-sonnet-4-5, gemini-2.5-flash
3. **Keep containers alive** - Reuse for same user
4. **Stream immediately** - SSE for real-time output
5. **Pre-create volumes** - Credential injection = 0ms

**Expected Result**:
- 60% of requests: **<200ms** ⚡
- 30% of requests: **<400ms** ✅
- 10% of requests: **<1000ms** (cold start)
- **Average: ~300ms time-to-first-token**

**Capacity**: 100 concurrent users with 3 subscriptions!

---

## Model Names (Confirmed Working):

- **OpenAI**: `gpt-5-codex` (fastest, unlimited with Pro)
- **Anthropic**: `claude-sonnet-4-5-20250929` or `claude-sonnet-4-5`
- **Google**: `gemini-2.5-flash` or `gemini-2.0-flash-exp` (FREE!)

All tested and working with OAuth tokens! ✅
