# Remote CLI Container Service Implementation Plan

## Overview
Container-per-user service that provides authenticated CLI access to Claude Code, Codex CLI, and Gemini CLI through isolated containers with static IP routing via Decodo.

## Architecture

```
User Request → Polydev API → Container Orchestrator → User Container → CLI → Response
                                                           ↓
                                                    Decodo Proxy (Static IP)
```

## Hardware Specs (Contabo)
- **Server**: 8 vCPU, 24GB RAM, 400GB NVMe
- **Capacity**: 20-30 concurrent users (conservative), 40+ optimized
- **Network**: Static IP via Decodo proxy

## Container Architecture

### Base Container (Multi-CLI)
```dockerfile
FROM node:20-alpine
RUN apk add --no-cache git curl bash tini python3 pip

# Install CLIs
RUN npm install -g @anthropic/claude-code @openai/codex
RUN pip install google-generativeai-cli

# Create app user
RUN adduser -D -s /bin/bash app
USER app
WORKDIR /workspace

# Runtime API server
COPY runtime-api.js /app/
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--", "node", "/app/runtime-api.js"]
```

### Per-User Container Specs
- **CPU Limit**: 0.5 vCPU (burst to 1.0)
- **Memory Limit**: 512MB (burst to 1GB)
- **Storage**: 100MB ephemeral
- **Lifecycle**: 30min idle timeout
- **Networking**: Outbound via Decodo proxy

## Service Components

### 1. Container Orchestrator
```typescript
interface ContainerService {
  // Get or create user container
  getUserContainer(userId: string): Promise<ContainerInfo>

  // Send prompt to user's container
  executePrompt(userId: string, provider: string, prompt: string): Promise<Response>

  // Container lifecycle management
  hibernateContainer(containerId: string): Promise<void>
  destroyContainer(containerId: string): Promise<void>

  // Health & scaling
  getContainerHealth(): Promise<HealthStats>
  scalePool(targetCount: number): Promise<void>
}
```

### 2. Runtime API (Inside Container)
```javascript
// /app/runtime-api.js - runs inside each container
const express = require('express')
const { exec } = require('child_process')

app.post('/claude', async (req, res) => {
  const { prompt, model } = req.body
  const result = await exec(`claude --model ${model} "${prompt}"`)
  res.json({ result: result.stdout })
})

app.post('/codex', async (req, res) => {
  const { prompt } = req.body
  const result = await exec(`codex "${prompt}"`)
  res.json({ result: result.stdout })
})

app.post('/gemini', async (req, res) => {
  const { prompt, model } = req.body
  const result = await exec(`gemini-cli --model ${model} "${prompt}"`)
  res.json({ result: result.stdout })
})
```

### 3. Authentication Flow
```typescript
interface UserAuth {
  // User provides their CLI credentials once
  setupAuthentication(userId: string, provider: string, credentials: AuthData): Promise<void>

  // Credentials stored encrypted per-user
  getAuthConfig(userId: string, provider: string): Promise<AuthConfig>

  // Initialize container with user's auth
  provisionContainer(userId: string): Promise<ContainerInfo>
}

interface AuthData {
  claude?: { sessionToken: string }
  codex?: { apiKey: string } | { chatgptSession: string }
  gemini?: { apiKey: string }
}
```

## Container Management

### Warm Pool Strategy
```typescript
interface PoolManager {
  // Keep 5-10 warm containers ready
  maintainWarmPool(size: number): Promise<void>

  // Assign warm container to user
  assignContainer(userId: string): Promise<ContainerInfo>

  // Return container to pool or destroy
  releaseContainer(containerId: string, reusable: boolean): Promise<void>
}
```

### Auto-scaling Rules
- **Scale Up**: Queue depth > 3 requests
- **Scale Down**: Idle containers > 5 for 10+ minutes
- **Hard Limits**: Max 50 containers, Min 5 warm containers
- **Resource Alerts**: CPU > 80%, Memory > 85%

## Network & Security

### Decodo Proxy Integration
```typescript
interface DecodProxy {
  // Route container traffic through static IP
  routeTraffic(containerId: string, targetUrl: string): Promise<ProxyResponse>

  // Manage IP allocations
  allocateStaticIP(userId: string): Promise<string>
  releaseStaticIP(userId: string): Promise<void>
}
```

### Security Boundaries
- **Container Isolation**: gVisor runtime for kernel-level isolation
- **Network Policy**: Block inter-container communication
- **Resource Limits**: CPU/Memory/Storage quotas per container
- **Auth Encryption**: User credentials encrypted at rest with per-user keys

## Storage & State

### User Data Management
```sql
-- Container registry
CREATE TABLE user_containers (
  user_id VARCHAR PRIMARY KEY,
  container_id VARCHAR NOT NULL,
  status VARCHAR NOT NULL, -- 'running', 'hibernated', 'provisioning'
  allocated_ip VARCHAR,
  created_at TIMESTAMP,
  last_used TIMESTAMP
);

-- Authentication data (encrypted)
CREATE TABLE user_cli_auth (
  user_id VARCHAR,
  provider VARCHAR, -- 'claude', 'codex', 'gemini'
  encrypted_credentials TEXT,
  created_at TIMESTAMP,
  PRIMARY KEY (user_id, provider)
);

-- Usage tracking
CREATE TABLE container_usage (
  user_id VARCHAR,
  provider VARCHAR,
  requests_count INT DEFAULT 0,
  total_runtime_minutes INT DEFAULT 0,
  last_request TIMESTAMP
);
```

## API Integration

### Provider System Updates
```typescript
// Update complete-provider-system.ts
async function executeWithContainer(
  userId: string,
  provider: string,
  prompt: string
): Promise<Response> {
  // Get user's container
  const container = await containerService.getUserContainer(userId)

  // Execute via container API
  const response = await fetch(`http://${container.ip}:3000/${provider}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${container.apiKey}` },
    body: JSON.stringify({ prompt, model: options.model })
  })

  return response.json()
}
```

## Deployment Architecture

### Docker Compose (Development)
```yaml
version: '3.8'
services:
  orchestrator:
    build: ./orchestrator
    ports: ['8080:8080']
    volumes: ['/var/run/docker.sock:/var/run/docker.sock']
    environment:
      - CONTAINER_NETWORK=cli-network
      - DECODO_API_KEY=${DECODO_API_KEY}

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: polydev_containers
    volumes: ['postgres_data:/var/lib/postgresql/data']

networks:
  cli-network:
    driver: bridge
    ipam:
      config: [subnet: "172.20.0.0/16"]
```

### Production (Contabo Server)
```bash
# System setup
sudo apt update && sudo apt install docker.io docker-compose
sudo usermod -aG docker $USER

# Install container runtime
sudo apt install runc
curl -L https://github.com/google/gvisor/releases/download/release-20240304/runsc-linux-x86_64 -o runsc
sudo mv runsc /usr/local/bin && sudo chmod +x /usr/local/bin/runsc

# Configure Docker for gVisor
echo '{"runtimes":{"runsc":{"path":"/usr/local/bin/runsc"}}}' | sudo tee /etc/docker/daemon.json
sudo systemctl restart docker

# Deploy service
git clone repo && cd polydev-ai
docker-compose -f docker-compose.prod.yml up -d
```

## Monitoring & Observability

### Metrics to Track
- **Container Metrics**: CPU/Memory/Network per container
- **User Metrics**: Requests/minute, Response time, Error rate
- **System Metrics**: Total containers, Pool size, Queue depth
- **Cost Metrics**: Container-hours, Resource utilization

### Alerting Rules
- Container CPU > 90% for 5min
- Queue depth > 10 requests
- Failed container starts > 3/min
- Decodo proxy errors > 5%

## Cost Analysis

### Resource Costs (Monthly)
- **Contabo Server**: $15.99/month (8 vCPU, 24GB RAM)
- **Decodo Proxy**: ~$10-20/month (depending on traffic)
- **Storage**: Included in server cost
- **Total**: ~$30-40/month

### Revenue Model
- **Free Tier**: 100 requests/month
- **Pro Tier**: $9/month (1000 requests)
- **Team Tier**: $29/month (5000 requests)
- **Break-even**: ~5-10 Pro users

## Implementation Timeline

### Phase 1 (2 weeks): Core Infrastructure
- [x] Container orchestrator service
- [x] Base container with multi-CLI support
- [x] Basic authentication flow
- [x] Local development setup

### Phase 2 (1 week): Integration
- [x] Polydev provider system integration
- [x] User authentication & container provisioning
- [x] Basic monitoring & logging

### Phase 3 (1 week): Production
- [x] Decodo proxy integration
- [x] Auto-scaling & warm pools
- [x] Production deployment on Contabo
- [x] Performance optimization

### Phase 4 (1 week): Polish
- [x] Advanced monitoring & alerting
- [x] User dashboard for container management
- [x] Billing integration
- [x] Documentation & support

## Risk Mitigation

### Technical Risks
- **Container Sprawl**: Strict lifecycle management + monitoring
- **Resource Exhaustion**: Auto-scaling limits + resource quotas
- **Security**: gVisor isolation + encrypted credentials
- **Network Issues**: Decodo redundancy + fallback routes

### Business Risks
- **CLI Changes**: Version pinning + automated testing
- **Cost Overrun**: Usage limits + auto-scaling caps
- **User Abuse**: Rate limiting + resource quotas
- **Legal/ToS**: Clear user agreement + audit logging

## Next Steps

1. **Validate CLIs**: Test Claude Code, Codex, Gemini CLI installations
2. **Build MVP**: Create basic container + orchestrator
3. **Decodo Setup**: Configure proxy for static IP routing
4. **Deploy Test**: Single-user proof of concept
5. **Scale Testing**: Load test with simulated users
6. **Production Deploy**: Full service on Contabo

---

**Implementation Status**: Ready to build
**Estimated Cost**: $30-40/month
**Estimated Users**: 20-30 concurrent, 100+ total
**Timeline**: 4-6 weeks for full implementation