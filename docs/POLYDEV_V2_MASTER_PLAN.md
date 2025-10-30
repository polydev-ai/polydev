# Polydev AI V2 - Complete Implementation Master Plan

**Created**: 2025-10-28
**Target**: Complete greenfield rebuild with zero-knowledge encryption + ephemeral containers

---

## Executive Summary

This document is the **MASTER PLAN** for Polydev AI V2 implementation, covering all architectural components:

1. **Zero-Knowledge Encryption** - Client-side encryption, server cannot decrypt
2. **Ephemeral Containers** - Nomad orchestration replacing Firecracker VMs for runtime
3. **WebRTC Streaming** - STUN/TURN replacing noVNC for Login VMs
4. **Decodo Proxy** - Per-user egress proxy (port 10001+)
5. **Container Warm Pool** - Pre-warmed containers with user key injection
6. **Monitoring Stack** - Prometheus + Grafana (self-hosted on VPS)
7. **Auto-Deployment** - GitHub Actions → VPS deployment on every commit

---

## Architecture Overview

### Current (V1)
```
┌─────────────────────────────────────────────────────────┐
│  CLIENT (Frontend)                                       │
│    ↓ Plaintext messages                                 │
│  MASTER-CONTROLLER (Node.js)                            │
│    ↓ Server-side encryption (master key in config)      │
│  SUPABASE (PostgreSQL)                                   │
│    ↓ Server-encrypted data                              │
│  FIRECRACKER VMs (10-15 concurrent)                     │
│    - Login VMs (OAuth via Browser)                      │
│    - Runtime VMs (CLI tool execution)                   │
│    ↓ noVNC streaming (WebSocket proxy)                  │
│  CLIENT (Browser)                                        │
└─────────────────────────────────────────────────────────┘
```

**Problems**:
- ❌ Server can decrypt all user data (NOT zero-knowledge)
- ❌ Firecracker VMs slow (3-5s boot time)
- ❌ Low concurrency (10-15 VMs max)
- ❌ noVNC streaming adds latency
- ❌ No monitoring/observability
- ❌ Manual deployment

### Target (V2)
```
┌─────────────────────────────────────────────────────────┐
│  CLIENT (Frontend + Browser Web Crypto API)             │
│    ↓ Client-side encryption (AES-GCM 256-bit)           │
│    ↓ Encrypted blobs only                               │
│  MASTER-CONTROLLER (Node.js)                            │
│    ↓ Stores encrypted blobs (CANNOT decrypt)            │
│  SUPABASE (PostgreSQL)                                   │
│    ↓ Zero-knowledge encrypted data                      │
│                                                          │
│  RUNTIME EXECUTION (Nomad + Docker)                     │
│    - Container Warm Pool (96-128 concurrent)            │
│    - User key injection at runtime                      │
│    - Ephemeral lifecycle (auto-cleanup)                 │
│    ↓ Decodo Proxy (per-user port 10001+)                │
│                                                          │
│  LOGIN VMs (Firecracker - OAuth only)                   │
│    ↓ WebRTC streaming (STUN/TURN)                       │
│  CLIENT (Browser)                                        │
│                                                          │
│  MONITORING (Prometheus + Grafana)                      │
│    - Container metrics                                   │
│    - VM lifecycle tracking                               │
│    - API performance                                     │
└─────────────────────────────────────────────────────────┘
```

**Benefits**:
- ✅ True zero-knowledge (server cannot decrypt)
- ✅ 6-10x more concurrent executions (96-128 vs 10-15)
- ✅ Faster execution (containers vs VMs)
- ✅ Better streaming (WebRTC vs noVNC)
- ✅ Full observability (Prometheus + Grafana)
- ✅ Auto-deploy on every commit

---

## Phase Breakdown

### Phase 1: Zero-Knowledge Encryption ✅ 50% COMPLETE

**Status**: Database + library done, integration pending

**Completed**:
- ✅ Database migration (added encryption columns)
- ✅ Client-side encryption library (Web Crypto API)
- ✅ Comprehensive documentation
- ✅ Integration plan document

**Pending**:
- ⏳ Frontend authentication integration
- ⏳ Chat API routes in master-controller
- ⏳ Update frontend hooks to use encryption
- ⏳ Unlock screen UI
- ⏳ Idle timeout implementation
- ⏳ End-to-end testing

**Reference**: See `docs/ZERO_KNOWLEDGE_INTEGRATION_PLAN.md` for details

---

### Phase 2: Nomad Container Orchestration ⏳ NOT STARTED

**Goal**: Replace Firecracker VMs with Nomad-managed Docker containers for runtime execution

#### 2.1 Nomad Installation & Setup

**Install Nomad on Hetzner VPS**:

```bash
# SSH to VPS
ssh root@135.181.138.102

# Install Nomad
wget -O- https://apt.releases.hashicorp.com/gpg | gpg --dearmor > /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" > /etc/apt/sources.list.d/hashicorp.list
apt update && apt install nomad

# Start Nomad in dev mode (single-node cluster)
nomad agent -dev -bind=0.0.0.0 &

# Verify installation
nomad node status
```

**Production Nomad Config**:

Create `/etc/nomad.d/nomad.hcl`:

```hcl
# Nomad Server + Client Configuration
data_dir  = "/opt/nomad/data"
bind_addr = "0.0.0.0"

server {
  enabled          = true
  bootstrap_expect = 1
}

client {
  enabled = true

  # Resource limits
  reserved {
    cpu    = 1000  # Reserve 1 CPU core for system
    memory = 2048  # Reserve 2GB RAM for system
  }
}

# Plugin configuration for Docker
plugin "docker" {
  config {
    volumes {
      enabled = true
    }

    # Enable container cleanup
    gc {
      image       = true
      image_delay = "3m"
      container   = true
    }
  }
}

# Telemetry for Prometheus
telemetry {
  publish_allocation_metrics = true
  publish_node_metrics       = true
  prometheus_metrics         = true
}
```

**Start Nomad as systemd service**:

```bash
# Create systemd service
cat > /etc/systemd/system/nomad.service <<EOF
[Unit]
Description=Nomad
Documentation=https://www.nomadproject.io/docs/
Wants=network-online.target
After=network-online.target

[Service]
ExecStart=/usr/bin/nomad agent -config=/etc/nomad.d/nomad.hcl
ExecReload=/bin/kill -HUP $MAINPID
KillMode=process
Restart=on-failure
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

# Enable and start
systemctl enable nomad
systemctl start nomad
systemctl status nomad
```

#### 2.2 Runtime Container Images

**Create Dockerfile for each provider**:

**File**: `containers/openai-runtime/Dockerfile`

```dockerfile
FROM node:20-slim

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install OpenAI CLI (example)
RUN npm install -g openai

# Create workspace
WORKDIR /workspace

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# User for security
RUN useradd -m -u 1000 polydev
USER polydev

ENTRYPOINT ["/entrypoint.sh"]
```

**File**: `containers/openai-runtime/entrypoint.sh`

```bash
#!/bin/bash
set -e

# Inject user's API key at runtime (from Nomad env vars)
export OPENAI_API_KEY="${USER_OPENAI_KEY}"

# Execute user's command
exec "$@"
```

**Build and push to registry**:

```bash
# Build images
cd containers/openai-runtime
docker build -t polydev/openai-runtime:latest .

cd ../anthropic-runtime
docker build -t polydev/anthropic-runtime:latest .

cd ../google-runtime
docker build -t polydev/google-runtime:latest .

# Tag and push to Docker Hub (or private registry)
docker tag polydev/openai-runtime:latest <registry>/polydev/openai-runtime:latest
docker push <registry>/polydev/openai-runtime:latest
```

#### 2.3 Nomad Job Definitions

**File**: `nomad-jobs/runtime-container.nomad`

```hcl
job "runtime-container-${JOB_ID}" {
  datacenters = ["dc1"]
  type        = "batch"

  # Ephemeral lifecycle
  meta {
    user_id    = "${USER_ID}"
    session_id = "${SESSION_ID}"
    provider   = "${PROVIDER}"
  }

  group "runtime" {
    count = 1

    # Auto-cleanup after job completes
    ephemeral_disk {
      size = 1024  # 1GB scratch space
    }

    task "execute" {
      driver = "docker"

      config {
        image = "${CONTAINER_IMAGE}"

        # Decodo proxy integration
        network_mode = "host"

        # Command to execute
        command = "/bin/sh"
        args    = ["-c", "${USER_COMMAND}"]

        # Resource limits
        memory_hard_limit = 512  # 512MB max
      }

      # Inject user's encrypted credentials
      env {
        USER_OPENAI_KEY      = "${DECRYPTED_OPENAI_KEY}"
        USER_ANTHROPIC_KEY   = "${DECRYPTED_ANTHROPIC_KEY}"
        HTTP_PROXY           = "http://localhost:${DECODO_PORT}"
        HTTPS_PROXY          = "http://localhost:${DECODO_PORT}"
      }

      # Resource requirements
      resources {
        cpu    = 500   # 0.5 CPU cores
        memory = 256   # 256MB RAM
      }

      # Auto-cleanup on completion
      kill_timeout = "30s"
    }
  }

  # Cleanup policy
  reschedule {
    attempts  = 0
    unlimited = false
  }
}
```

**Submit job via master-controller**:

```javascript
// master-controller/src/services/nomad-manager.js
const Nomad = require('node-nomad');
const nomad = new Nomad({ address: 'http://localhost:4646' });

async function executeInContainer(userId, provider, command) {
  // 1. Get user's decrypted credentials from frontend (already decrypted with user's key)
  const credentials = await getDecryptedCredentials(userId, provider);

  // 2. Get user's Decodo proxy port
  const { data } = await supabase
    .from('user_proxy_ports')
    .select('proxy_port')
    .eq('user_id', userId)
    .single();

  // 3. Submit Nomad job
  const jobSpec = {
    Job: {
      ID: `runtime-${userId}-${Date.now()}`,
      Type: 'batch',
      Datacenters: ['dc1'],
      TaskGroups: [{
        Name: 'runtime',
        Tasks: [{
          Name: 'execute',
          Driver: 'docker',
          Config: {
            image: `polydev/${provider}-runtime:latest`,
            command: '/bin/sh',
            args: ['-c', command]
          },
          Env: {
            [`USER_${provider.toUpperCase()}_KEY`]: credentials.apiKey,
            HTTP_PROXY: `http://localhost:${data.proxy_port}`,
            HTTPS_PROXY: `http://localhost:${data.proxy_port}`
          },
          Resources: {
            CPU: 500,
            MemoryMB: 256
          }
        }]
      }]
    }
  };

  const result = await nomad.job.create(jobSpec);

  // 4. Store job in database
  await supabase.from('runtime_containers').insert({
    user_id: userId,
    nomad_job_id: result.EvalID,
    provider,
    status: 'running',
    decodo_port: data.proxy_port,
    created_at: new Date().toISOString()
  });

  return result;
}
```

#### 2.4 Container Warm Pool Manager

**Goal**: Pre-warm containers to reduce latency

**File**: `master-controller/src/services/warm-pool-manager.js`

```javascript
const Nomad = require('node-nomad');
const nomad = new Nomad({ address: 'http://localhost:4646' });

class WarmPoolManager {
  constructor() {
    this.poolSize = 10; // Keep 10 warm containers per provider
    this.providers = ['openai', 'anthropic', 'google'];
  }

  /**
   * Start warm pool on server boot
   */
  async initialize() {
    for (const provider of this.providers) {
      await this.maintainPool(provider);
    }

    // Refresh pool every 5 minutes
    setInterval(() => {
      for (const provider of this.providers) {
        this.maintainPool(provider);
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Maintain warm pool for a provider
   */
  async maintainPool(provider) {
    // Count active warm containers
    const activeCount = await this.getWarmContainerCount(provider);

    if (activeCount < this.poolSize) {
      const needed = this.poolSize - activeCount;
      console.log(`Warming ${needed} containers for ${provider}`);

      for (let i = 0; i < needed; i++) {
        await this.createWarmContainer(provider);
      }
    }
  }

  /**
   * Create a warm container
   */
  async createWarmContainer(provider) {
    const jobSpec = {
      Job: {
        ID: `warm-${provider}-${Date.now()}`,
        Type: 'service',
        Datacenters: ['dc1'],
        TaskGroups: [{
          Name: 'warm',
          Count: 1,
          Tasks: [{
            Name: 'idle',
            Driver: 'docker',
            Config: {
              image: `polydev/${provider}-runtime:latest`,
              command: '/bin/sleep',
              args: ['infinity']  // Keep container alive
            },
            Resources: {
              CPU: 100,   // Minimal resources while idle
              MemoryMB: 64
            }
          }]
        }]
      }
    };

    return await nomad.job.create(jobSpec);
  }

  /**
   * Allocate warm container to user
   */
  async allocateToUser(userId, provider, credentials, decodPort) {
    // Find warm container
    const warmJobs = await nomad.job.list({ prefix: `warm-${provider}` });

    if (warmJobs.length > 0) {
      const jobId = warmJobs[0].ID;

      // Inject user credentials into running container
      await this.injectCredentials(jobId, credentials, decodPort);

      // Update job type to batch (will auto-cleanup after execution)
      await nomad.job.update(jobId, { Type: 'batch' });

      return jobId;
    }

    // Fallback: create new container (slower path)
    return await executeInContainer(userId, provider, command);
  }

  /**
   * Inject credentials into running container
   */
  async injectCredentials(jobId, credentials, decodPort) {
    // Use Nomad exec to inject environment variables
    // This is a placeholder - actual implementation depends on Nomad version
    // May need to restart container with new env vars
  }
}

module.exports = { WarmPoolManager };
```

---

### Phase 3: WebRTC Streaming (Login VMs) ⏳ NOT STARTED

**Goal**: Replace noVNC with WebRTC for better performance and lower latency

#### 3.1 STUN/TURN Server Setup

**Install coturn on VPS**:

```bash
# Install coturn
apt-get install coturn

# Edit config
vim /etc/turnserver.conf
```

**File**: `/etc/turnserver.conf`

```conf
# TURN server for WebRTC
listening-port=3478
tls-listening-port=5349

# External IP (Hetzner VPS)
external-ip=135.181.138.102

# Realm
realm=polydev.ai

# Authentication
lt-cred-mech
user=polydev:YOUR_SECURE_PASSWORD

# Relay configuration
min-port=49152
max-port=65535

# Logging
log-file=/var/log/turnserver.log
verbose
```

**Start coturn**:

```bash
systemctl enable coturn
systemctl start coturn
systemctl status coturn
```

#### 3.2 WebRTC Signaling Server

**Update**: `master-controller/src/routes/auth.js`

```javascript
const express = require('express');
const router = express.Router();

/**
 * POST /api/auth/session/:sessionId/webrtc/offer
 * Submit WebRTC offer from client
 */
router.post('/session/:sessionId/webrtc/offer', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { offer, iceCandidates } = req.body;

    // Store offer in database
    await supabase
      .from('auth_sessions')
      .update({
        webrtc_offer: offer,
        ice_candidates: iceCandidates,
        updated_at: new Date().toISOString()
      })
      .eq('session_id', sessionId);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auth/session/:sessionId/webrtc/answer
 * Get WebRTC answer from Login VM
 */
router.get('/session/:sessionId/webrtc/answer', async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Poll for answer from Login VM
    const { data } = await supabase
      .from('auth_sessions')
      .select('webrtc_answer, ice_candidates')
      .eq('session_id', sessionId)
      .single();

    if (!data.webrtc_answer) {
      return res.status(404).json({ error: 'Answer not ready yet' });
    }

    res.json({
      answer: data.webrtc_answer,
      iceCandidates: data.ice_candidates
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

#### 3.3 Frontend WebRTC Client

**Create**: `src/lib/webrtc/webrtc-client.ts`

```typescript
export class WebRTCClient {
  private peerConnection: RTCPeerConnection | null = null;
  private videoElement: HTMLVideoElement;

  constructor(videoElement: HTMLVideoElement) {
    this.videoElement = videoElement;
  }

  async connect(sessionId: string) {
    // Create peer connection
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:135.181.138.102:3478' },
        {
          urls: 'turn:135.181.138.102:3478',
          username: 'polydev',
          credential: 'YOUR_SECURE_PASSWORD'
        }
      ]
    });

    // Handle incoming stream
    this.peerConnection.ontrack = (event) => {
      this.videoElement.srcObject = event.streams[0];
    };

    // Create offer
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    // Collect ICE candidates
    const iceCandidates: RTCIceCandidate[] = [];
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        iceCandidates.push(event.candidate);
      }
    };

    // Wait for ICE gathering to complete
    await new Promise(resolve => {
      this.peerConnection!.onicegatheringstatechange = () => {
        if (this.peerConnection!.iceGatheringState === 'complete') {
          resolve(null);
        }
      };
    });

    // Send offer to server
    await fetch(`/api/auth/session/${sessionId}/webrtc/offer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offer, iceCandidates })
    });

    // Poll for answer
    const answer = await this.pollForAnswer(sessionId);

    // Set remote description
    await this.peerConnection.setRemoteDescription(answer.answer);

    // Add remote ICE candidates
    for (const candidate of answer.iceCandidates) {
      await this.peerConnection.addIceCandidate(candidate);
    }
  }

  private async pollForAnswer(sessionId: string, maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
      const response = await fetch(`/api/auth/session/${sessionId}/webrtc/answer`);

      if (response.ok) {
        return await response.json();
      }

      // Wait 1 second before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error('Failed to get WebRTC answer');
  }

  disconnect() {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
  }
}
```

#### 3.4 Login VM WebRTC Agent

**Update**: `vm-agent/vm-browser-agent.js`

```javascript
const { exec } = require('child_process');
const { supabase } = require('./supabase-client');

/**
 * WebRTC streaming agent (replaces noVNC)
 */
class WebRTCAgent {
  constructor(sessionId) {
    this.sessionId = sessionId;
  }

  async start() {
    // Poll for WebRTC offer from client
    const offer = await this.pollForOffer();

    // Create GStreamer pipeline for screen capture
    const pipeline = `
      ximagesrc use-damage=0 !
      video/x-raw,framerate=30/1 !
      videoconvert !
      x264enc tune=zerolatency bitrate=2000 speed-preset=ultrafast !
      rtph264pay config-interval=1 pt=96 !
      webrtcbin name=sendrecv
    `;

    // Start WebRTC peer (using GStreamer or similar)
    exec(`gst-launch-1.0 ${pipeline}`, (error, stdout, stderr) => {
      if (error) {
        console.error('WebRTC agent failed:', error);
      }
    });

    // Generate answer and send to server
    const answer = await this.createAnswer(offer);

    await supabase
      .from('auth_sessions')
      .update({
        webrtc_answer: answer,
        ice_candidates: this.iceCandidates
      })
      .eq('session_id', this.sessionId);
  }

  async pollForOffer() {
    // Poll database for offer from client
    // Implementation similar to frontend polling
  }

  async createAnswer(offer) {
    // Create WebRTC answer
    // Implementation depends on WebRTC library used
  }
}

module.exports = { WebRTCAgent };
```

---

### Phase 4: Decodo Proxy Integration ⏳ NOT STARTED

**Goal**: Per-user egress proxy using existing `user_proxy_ports` table

**Status**: **ALREADY PARTIALLY IMPLEMENTED** ✅

**Existing Infrastructure**:
- ✅ `user_proxy_ports` table exists in Supabase
- ✅ Ports allocated: 10001, 10002, 10003, etc.
- ✅ Used by Polydev MCP Perspectives product

**Integration Needed**:
1. ⏳ Configure Decodo proxy to listen on user-allocated ports
2. ⏳ Inject `HTTP_PROXY` env var into containers
3. ⏳ Update master-controller to fetch user's proxy port

**Implementation**:

```javascript
// master-controller/src/services/decodo-proxy.js
async function getUserProxyPort(userId) {
  const { data, error } = await supabase
    .from('user_proxy_ports')
    .select('proxy_port')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    throw new Error('User proxy port not found');
  }

  return data.proxy_port;
}

// Use in container execution
const proxyPort = await getUserProxyPort(userId);
const env = {
  HTTP_PROXY: `http://localhost:${proxyPort}`,
  HTTPS_PROXY: `http://localhost:${proxyPort}`
};
```

---

### Phase 5: Monitoring (Prometheus + Grafana) ⏳ NOT STARTED

**Goal**: Self-hosted monitoring on VPS for containers, VMs, and API

#### 5.1 Prometheus Setup

**Install Prometheus**:

```bash
# Download Prometheus
wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz
tar xvfz prometheus-*.tar.gz
cd prometheus-*

# Move to /opt
sudo mv prometheus /usr/local/bin/
sudo mv promtool /usr/local/bin/
sudo mkdir /etc/prometheus
sudo mkdir /var/lib/prometheus

# Create config
sudo vim /etc/prometheus/prometheus.yml
```

**File**: `/etc/prometheus/prometheus.yml`

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  # Nomad metrics
  - job_name: 'nomad'
    static_configs:
      - targets: ['localhost:4646']

  # Master-controller metrics
  - job_name: 'master-controller'
    static_configs:
      - targets: ['localhost:4000']

  # Node exporter (system metrics)
  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']

  # Docker metrics
  - job_name: 'docker'
    static_configs:
      - targets: ['localhost:9323']
```

**Start Prometheus**:

```bash
# Create systemd service
cat > /etc/systemd/system/prometheus.service <<EOF
[Unit]
Description=Prometheus
Wants=network-online.target
After=network-online.target

[Service]
User=prometheus
Group=prometheus
ExecStart=/usr/local/bin/prometheus \\
  --config.file=/etc/prometheus/prometheus.yml \\
  --storage.tsdb.path=/var/lib/prometheus/

[Install]
WantedBy=multi-user.target
EOF

systemctl enable prometheus
systemctl start prometheus
```

#### 5.2 Grafana Setup

**Install Grafana**:

```bash
# Install Grafana
wget -q -O - https://packages.grafana.com/gpg.key | apt-key add -
add-apt-repository "deb https://packages.grafana.com/oss/deb stable main"
apt update && apt install grafana

# Start Grafana
systemctl enable grafana-server
systemctl start grafana-server
```

**Access Grafana**: http://135.181.138.102:3000

**Add Prometheus datasource**:
1. Login (admin/admin)
2. Configuration → Data Sources → Add Prometheus
3. URL: http://localhost:9090

**Import dashboards**:
- Nomad Dashboard (ID: 12049)
- Node Exporter Dashboard (ID: 1860)
- Custom dashboard for Polydev metrics

#### 5.3 Custom Metrics in Master-Controller

**Add Prometheus client**:

```bash
cd master-controller
npm install prom-client
```

**Update**: `master-controller/src/index.js`

```javascript
const promClient = require('prom-client');

// Create metrics registry
const register = new promClient.Registry();

// Default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

const containersActive = new promClient.Gauge({
  name: 'polydev_containers_active',
  help: 'Number of active runtime containers',
  registers: [register]
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Middleware to track request duration
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration.labels(req.method, req.route?.path || req.path, res.statusCode).observe(duration);
  });
  next();
});
```

---

### Phase 6: Auto-Deployment (GitHub Actions) ⏳ NOT STARTED

**Goal**: Deploy on every commit to `main` branch

**Create**: `.github/workflows/deploy.yml`

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          cd master-controller
          npm install

      - name: Build frontend
        run: |
          npm install
          npm run build

      - name: Deploy to VPS
        env:
          SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
          VPS_HOST: 135.181.138.102
        run: |
          # Setup SSH
          mkdir -p ~/.ssh
          echo "$SSH_PRIVATE_KEY" > ~/.ssh/id_rsa
          chmod 600 ~/.ssh/id_rsa
          ssh-keyscan -H $VPS_HOST >> ~/.ssh/known_hosts

          # Deploy master-controller
          rsync -avz --delete master-controller/ root@$VPS_HOST:/opt/master-controller/

          # Deploy frontend
          rsync -avz --delete .next/ root@$VPS_HOST:/opt/polydev-frontend/.next/

          # Restart services
          ssh root@$VPS_HOST 'systemctl restart master-controller'
          ssh root@$VPS_HOST 'systemctl restart polydev-frontend'

      - name: Verify deployment
        run: |
          sleep 10
          curl -f http://$VPS_HOST:4000/api/health || exit 1
```

**Setup GitHub secrets**:
1. Go to GitHub repo → Settings → Secrets
2. Add `SSH_PRIVATE_KEY` (VPS private key)

---

## Implementation Timeline

### Week 1: Encryption Foundation (Current)
- ✅ Database migration
- ✅ Client-side encryption library
- ✅ Documentation
- ⏳ Frontend integration
- ⏳ Backend chat API

### Week 2: Container Orchestration
- ⏳ Nomad installation
- ⏳ Container images (OpenAI, Anthropic, Google)
- ⏳ Nomad job definitions
- ⏳ Warm pool manager
- ⏳ Integration with master-controller

### Week 3: WebRTC & Proxy
- ⏳ STUN/TURN server setup
- ⏳ WebRTC signaling server
- ⏳ Frontend WebRTC client
- ⏳ Login VM WebRTC agent
- ⏳ Decodo proxy integration

### Week 4: Monitoring & Deployment
- ⏳ Prometheus setup
- ⏳ Grafana dashboards
- ⏳ Custom metrics in master-controller
- ⏳ GitHub Actions workflow
- ⏳ End-to-end testing

---

## Success Metrics

### Performance
- ✅ Container boot time < 1s (vs 3-5s for VMs)
- ✅ 96-128 concurrent containers (vs 10-15 VMs)
- ✅ WebRTC latency < 100ms (vs 200ms+ for noVNC)

### Security
- ✅ Server cannot decrypt user data (zero-knowledge)
- ✅ Encrypted blobs in database
- ✅ No plaintext credentials in server logs

### Reliability
- ✅ Auto-deploy on every commit
- ✅ 99.9% uptime (monitored via Prometheus)
- ✅ Complete container cleanup after execution

### Developer Experience
- ✅ Single command deployment
- ✅ Real-time monitoring dashboards
- ✅ Comprehensive logging

---

## Risk Mitigation

### Risk 1: Container orchestration complexity
**Mitigation**: Start with Nomad dev mode, gradually move to production config

### Risk 2: WebRTC browser compatibility
**Mitigation**: Fallback to noVNC if WebRTC fails

### Risk 3: Decodo proxy bottleneck
**Mitigation**: Monitor proxy performance, add rate limiting

### Risk 4: Encryption key loss
**Mitigation**: Clear documentation warning users about password reset = data loss

---

## References

- **Zero-Knowledge Encryption**: `docs/ZERO_KNOWLEDGE_INTEGRATION_PLAN.md`
- **Database Schema**: `supabase/migrations/002_add_zero_knowledge_encryption.sql`
- **Encryption Library**: `src/lib/crypto/README.md`
- **Implementation Log**: `logs/IMPLEMENTATION_LOG.md`
- **Architecture V2**: `docs/ENHANCED_ARCHITECTURE_V2.md`

---

*Last Updated: 2025-10-28*
