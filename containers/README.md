# Runtime Containers (Phase 5)

Docker container images for executing LLM provider CLI tools in isolated environments.

## Container Images

### 1. OpenAI Codex Runtime (`openai-runtime/`)
- **Base**: node:20-slim
- **CLI**: `@openai/codex` (npm global)
- **Credentials**: `OPENAI_API_KEY` (env var)
- **User**: runtime (uid 1000, non-root)

### 2. Anthropic Claude Code Runtime (`anthropic-runtime/`)
- **Base**: node:20-slim
- **CLI**: `@anthropic-ai/claude-code` (npm global)
- **Credentials**: `ANTHROPIC_API_KEY` (env var)
- **User**: runtime (uid 1000, non-root)

### 3. Google Gemini Runtime (`google-runtime/`)
- **Base**: node:20-slim
- **CLI**: `@google/gemini-cli` (npm global)
- **Credentials**: `GOOGLE_API_KEY`, `GOOGLE_PROJECT_ID` (env vars)
- **User**: runtime (uid 1000, non-root)

## Building Containers

### On VPS (135.181.138.102)

```bash
# Copy container definitions
scp -r containers/ root@135.181.138.102:/tmp/

# SSH into VPS
ssh root@135.181.138.102

# Build all images
cd /tmp/containers

# Build OpenAI runtime
cd openai-runtime
chmod +x entrypoint.sh
docker build -t polydev-openai-runtime:latest .

# Build Anthropic runtime
cd ../anthropic-runtime
chmod +x entrypoint.sh
docker build -t polydev-anthropic-runtime:latest .

# Build Google runtime
cd ../google-runtime
chmod +x entrypoint.sh
docker build -t polydev-google-runtime:latest .

# Verify images
docker images | grep polydev
```

### Expected Output
```
polydev-google-runtime     latest    abc123    2 minutes ago   200MB
polydev-anthropic-runtime  latest    def456    3 minutes ago   195MB
polydev-openai-runtime     latest    ghi789    4 minutes ago   195MB
```

## Testing Containers

### Test OpenAI Runtime
```bash
docker run --rm \
  -e OPENAI_API_KEY=sk-test123 \
  -e PROVIDER=openai \
  -e USER_ID=test_user \
  polydev-openai-runtime:latest \
  /bin/sh -c "echo 'OpenAI container works' && codex --version"
```

### Test Anthropic Runtime
```bash
docker run --rm \
  -e ANTHROPIC_API_KEY=sk-ant-test123 \
  -e PROVIDER=anthropic \
  -e USER_ID=test_user \
  polydev-anthropic-runtime:latest \
  /bin/sh -c "echo 'Anthropic container works' && claude --version"
```

### Test Google Runtime
```bash
docker run --rm \
  -e GOOGLE_API_KEY=AIza-test123 \
  -e PROVIDER=google \
  -e USER_ID=test_user \
  polydev-google-runtime:latest \
  /bin/sh -c "echo 'Google container works' && gemini --version"
```

### Test Warm Pool Mode
```bash
docker run --rm \
  -e WARM_POOL=true \
  -e PROVIDER=openai \
  polydev-openai-runtime:latest \
  /runtime/entrypoint.sh &

# Container should stay running in idle state
docker ps | grep polydev
```

## Container Specifications

### Resource Limits (Nomad)
```
CPU:    500 MHz (0.5 cores)
Memory: 512 MB
Network: 10 Mbits
Timeout: 30s kill timeout
```

### Warm Pool Limits (Nomad)
```
CPU:    100 MHz (0.1 cores)
Memory: 256 MB
Network: 5 Mbits
Keep-alive: indefinite
```

## Security Features

1. **Non-root execution**: All containers run as `runtime` user (uid 1000)
2. **Minimal base**: node:20-slim (smallest Node.js image)
3. **No privileged mode**: Standard container security
4. **Credential injection**: API keys passed via environment variables only
5. **Ephemeral**: Containers are destroyed after execution

## Entrypoint Scripts

Each container has an `entrypoint.sh` script that:

1. Displays container info
2. Validates required credentials are present
3. Checks for warm pool mode (`WARM_POOL=true`)
4. Executes the command or enters idle state

**Warm Pool Behavior**:
```bash
if [ "$WARM_POOL" = "true" ]; then
    exec tail -f /dev/null  # Idle state
fi
```

## Integration with Nomad

### Job Submission Flow
```javascript
// 1. User sends request to master-controller
// 2. Master-controller allocates from warm pool
const container = await warmPoolManager.allocateContainer('openai', userId);

// 3. OR submits new job if pool empty
const result = await nomadManager.submitRuntimeJob({
  userId: 'user_123',
  provider: 'openai',
  credentials: { apiKey: decryptedKey },
  command: 'codex "Write a hello world function"',
  env: {}
});

// 4. Nomad starts container with credentials injected
// 5. CLI executes and streams output
// 6. Container auto-destroys after completion
```

### Environment Variables (Injected by Nomad)
```bash
# Required
PROVIDER=openai|anthropic|google
USER_ID=user_xyz

# Provider-specific credentials
OPENAI_API_KEY=sk-...        # OpenAI
ANTHROPIC_API_KEY=sk-ant-... # Anthropic
GOOGLE_API_KEY=AIza...       # Google
GOOGLE_PROJECT_ID=project-123 # Google (optional)

# Optional
WARM_POOL=true  # For warm pool containers
DEBUG=true      # Enable debug logging
```

## CLI Tool Verification

After building, verify each CLI tool is installed:

```bash
# OpenAI Codex
docker run --rm polydev-openai-runtime:latest codex --version

# Anthropic Claude Code
docker run --rm polydev-anthropic-runtime:latest claude --version

# Google Gemini
docker run --rm polydev-google-runtime:latest gemini --version
```

## Troubleshooting

### Build fails with npm install error
```bash
# Check network connectivity
docker run --rm node:20-slim ping -c 3 registry.npmjs.org

# Try with --no-cache
docker build --no-cache -t polydev-openai-runtime:latest .
```

### Container exits immediately
```bash
# Check logs
docker logs <container_id>

# Run interactively
docker run -it --rm polydev-openai-runtime:latest /bin/bash
```

### CLI tool not found
```bash
# Verify installation inside container
docker run --rm polydev-openai-runtime:latest which codex
docker run --rm polydev-openai-runtime:latest npm list -g
```

## Next Steps

1. Build images on VPS
2. Test job submission via Nomad
3. Activate Warm Pool Manager
4. Integrate with CLI Streaming Service
5. Deploy to production

## References

- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Node.js Docker Images](https://hub.docker.com/_/node)
- [Nomad Docker Driver](https://www.nomadproject.io/docs/drivers/docker)
