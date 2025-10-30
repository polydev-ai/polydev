# Nomad Job Templates

This directory contains Nomad job specification templates for Polydev AI V2 container orchestration.

## Job Templates

### 1. Runtime Container (`runtime-container.nomad`)

**Purpose**: Execute CLI commands in isolated Docker containers for OpenAI, Anthropic, or Google.

**Type**: Batch (one-off execution)

**Resources**:
- CPU: 0.5 cores
- Memory: 512MB
- Network: 10 Mbits
- Duration: 1-5 minutes

**Template Variables**:
- `{{ PROVIDER }}` - Provider name (openai, anthropic, google)
- `{{ USER_ID }}` - User ID
- `{{ TIMESTAMP }}` - Unix timestamp
- `{{ COMMAND }}` - Shell command to execute
- `{{ OPENAI_API_KEY }}` - OpenAI API key (if provider=openai)
- `{{ ANTHROPIC_API_KEY }}` - Anthropic API key (if provider=anthropic)
- `{{ GOOGLE_API_KEY }}` - Google API key (if provider=google)
- `{{ ADDITIONAL_ENV }}` - Additional environment variables

**Usage**:
```javascript
// Via Nomad Manager
const result = await nomadManager.submitRuntimeJob({
  userId: 'user_123',
  provider: 'openai',
  credentials: { apiKey: 'sk-...' },
  command: 'echo "Hello World"',
  env: { DEBUG: 'true' }
});
```

**Lifecycle**:
1. Container starts
2. Command executes
3. Output captured
4. Container stops (auto-cleanup)
5. Job marked as complete

---

### 2. Browser VM (`browser-vm.nomad`)

**Purpose**: Run Firecracker microVMs for browser-based OAuth flows.

**Type**: Service (long-running, persistent)

**Resources**:
- CPU: 1 core
- Memory: 2GB
- Network: 100 Mbits
- Duration: 5-30 minutes

**Template Variables**:
- `{{ SESSION_ID }}` - Auth session ID
- `{{ USER_ID }}` - User ID
- `{{ PROVIDER }}` - OAuth provider (google, github, etc.)
- `{{ VM_IP }}` - Internal VM IP (192.168.100.x)
- `{{ VNC_PORT }}` - VNC port (5900+)
- `{{ WEBSOCKET_PORT }}` - noVNC WebSocket port
- `{{ TIMESTAMP }}` - Unix timestamp

**Usage**:
```javascript
// Via Nomad Manager
const result = await nomadManager.submitBrowserVMJob({
  userId: 'user_123',
  sessionId: 'session_abc',
  provider: 'google',
  vmIp: '192.168.100.5',
  vncPort: 5905
});
```

**Lifecycle**:
1. Firecracker VM starts from golden snapshot
2. noVNC proxy connects
3. User completes OAuth flow in browser
4. Credentials captured
5. VM shuts down gracefully
6. Job cleaned up

**Networking**:
- Host mode for TAP interface access
- Static VNC port allocation
- WebSocket proxy for noVNC

**Volumes**:
- `/var/lib/firecracker/snapshots` (read-only) - Golden snapshots
- `/var/lib/firecracker/vms` (read-write) - VM runtime data

---

### 3. Warm Pool (`warm-pool.nomad`)

**Purpose**: Pre-warmed idle containers for fast allocation (<500ms).

**Type**: Service (long-running, idle state)

**Resources**:
- CPU: 0.1 cores (minimal for idle state)
- Memory: 256MB
- Network: 5 Mbits
- Duration: Indefinite (until allocated)

**Template Variables**:
- `{{ PROVIDER }}` - Provider name (openai, anthropic, google)
- `{{ CONTAINER_ID }}` - Unique container ID
- `{{ TIMESTAMP }}` - Creation timestamp

**Usage**:
```javascript
// Via Warm Pool Manager
await warmPoolManager.start();  // Auto-creates warm pools

// Allocate from pool
const container = await warmPoolManager.allocateContainer('openai', 'user_123');

// Release back to pool after use
await warmPoolManager.releaseContainer(container.id);
```

**Pool Configuration**:
```bash
# Environment variables
WARM_POOL_OPENAI_SIZE=10      # 10 containers
WARM_POOL_ANTHROPIC_SIZE=10   # 10 containers
WARM_POOL_GOOGLE_SIZE=10      # 10 containers
```

**Lifecycle**:
1. Container starts in idle state (`tail -f /dev/null`)
2. Waits in warm pool
3. Allocated to user when needed
4. Credentials injected, command executed
5. Released back to pool (or replaced with new one)

**Health Checks**:
- Script-based check every 30s
- Automatic replacement if unhealthy
- Pool auto-replenishes to target size

---

## Template Variable Substitution

Templates use `{{ VARIABLE }}` syntax for substitution. The Nomad Manager and Warm Pool Manager handle substitution automatically when submitting jobs.

Example:
```javascript
// Original template
job "runtime-{{ PROVIDER }}-{{ USER_ID }}" {
  meta {
    user_id = "{{ USER_ID }}"
  }
}

// After substitution
job "runtime-openai-user_123" {
  meta {
    user_id = "user_123"
  }
}
```

## Job Submission

### Manual Submission (Testing)

```bash
# 1. Replace template variables
sed -e 's/{{ PROVIDER }}/openai/g' \
    -e 's/{{ USER_ID }}/user_123/g' \
    -e 's/{{ TIMESTAMP }}/1234567890/g' \
    -e 's/{{ COMMAND }}/echo Hello/g' \
    runtime-container.nomad > /tmp/job.nomad

# 2. Validate job
nomad job validate /tmp/job.nomad

# 3. Submit job
nomad job run /tmp/job.nomad

# 4. Check job status
nomad job status runtime-openai-user_123
```

### Programmatic Submission (Production)

```javascript
const { getNomadManager } = require('./services/nomad-manager');
const nomadManager = getNomadManager();

// Submit runtime job
const result = await nomadManager.submitRuntimeJob({
  userId: 'user_123',
  provider: 'openai',
  credentials: { apiKey: 'sk-...' },
  command: 'openai chat "Hello, world!"',
  env: {}
});

console.log(`Job submitted: ${result.jobId}`);
```

## Job Monitoring

### View all jobs
```bash
nomad job status
```

### View specific job
```bash
nomad job status runtime-openai-user_123
```

### View job allocations (running containers)
```bash
nomad alloc status
```

### View job logs
```bash
# Get allocation ID
ALLOC_ID=$(nomad job status runtime-openai-user_123 | grep running | awk '{print $1}')

# View logs
nomad alloc logs $ALLOC_ID
```

### Stop a job
```bash
nomad job stop runtime-openai-user_123
```

## Resource Limits

### Per Job Type

| Job Type | CPU | Memory | Network | Priority |
|----------|-----|--------|---------|----------|
| Runtime  | 0.5 | 512MB  | 10 Mbits | 50 |
| Browser VM | 1.0 | 2GB | 100 Mbits | 75 |
| Warm Pool | 0.1 | 256MB | 5 Mbits | 40 |

### Cluster Capacity

With a 4-core, 8GB RAM VPS (after 1 core, 1GB reserved for system):
- **Runtime Containers**: ~6 concurrent (0.5 CPU × 6 = 3 cores)
- **Browser VMs**: ~3 concurrent (1 CPU × 3 = 3 cores)
- **Warm Pool**: ~30 containers (0.1 CPU × 30 = 3 cores)

## Best Practices

1. **Resource Requests**: Always specify CPU and memory limits
2. **Logging**: Use JSON file driver with rotation
3. **Health Checks**: Implement for service-type jobs
4. **Timeouts**: Set appropriate kill timeouts (batch: 30s, service: 60s)
5. **Priorities**: Runtime (50) < Warm Pool (40) < Browser VM (75)
6. **Restart Policies**: Batch (0 attempts), Service (2-3 attempts)
7. **Image Pulling**: Set `force_pull = false` for local images

## Troubleshooting

### Job fails to start

```bash
# Check job status
nomad job status JOB_ID

# Check evaluation (scheduling decisions)
nomad eval status EVAL_ID

# Check allocation logs
nomad alloc logs ALLOC_ID
```

### Container image not found

```bash
# Verify Docker image exists
docker images | grep polydev

# Build image if missing (Phase 5)
cd containers/openai-runtime
docker build -t polydev-openai-runtime:latest .
```

### Resource exhaustion

```bash
# Check node resources
nomad node status -self

# View cluster status
nomad status

# Stop idle jobs to free resources
nomad job stop warm-pool-openai-xyz
```

### Job stuck in pending

```bash
# View evaluation
nomad eval status EVAL_ID

# Common causes:
# - Insufficient resources (CPU/memory)
# - Constraint violations
# - Node unavailable
```

## Integration with Master Controller

The Nomad Manager and Warm Pool Manager services integrate these templates automatically:

```javascript
// In master-controller/src/index.js
const { getNomadManager } = require('./services/nomad-manager');
const { getWarmPoolManager } = require('./services/warm-pool-manager');

const nomadManager = getNomadManager();
const warmPoolManager = getWarmPoolManager();

// Start warm pools on startup
await warmPoolManager.start();

// Submit jobs via HTTP API
app.post('/api/execute', async (req, res) => {
  const { userId, provider, command, credentials } = req.body;

  // Allocate from warm pool first
  let container = await warmPoolManager.allocateContainer(provider, userId);

  if (!container) {
    // Fallback: Submit new job
    container = await nomadManager.submitRuntimeJob({
      userId,
      provider,
      credentials,
      command,
      env: {}
    });
  }

  res.json({ success: true, containerId: container.id });
});
```

## Next Steps

1. **Phase 5**: Build Docker images for runtime containers
2. **Test Locally**: Validate job templates with Nomad dev mode
3. **Deploy**: Submit jobs via Nomad Manager
4. **Monitor**: Track metrics via Prometheus (Phase 6)
5. **Scale**: Adjust warm pool sizes based on usage

## References

- [Nomad Job Specification](https://www.nomadproject.io/docs/job-specification)
- [Docker Driver](https://www.nomadproject.io/docs/drivers/docker)
- [Exec Driver](https://www.nomadproject.io/docs/drivers/exec)
- [Nomad CLI](https://www.nomadproject.io/docs/commands)
