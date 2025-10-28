# Polydev AI - Auto-Deployment System Design

## Overview

Comprehensive, fool-proof, and future-proof continuous deployment system that automatically syncs code changes from local development and git to production servers and VM golden images.

## Architecture

```
┌─────────────────┐
│  Local Changes  │
└────────┬────────┘
         │
    ┌────▼─────────────────┐
    │  Git Push Trigger    │
    │  (GitHub Actions)    │
    └────┬─────────────────┘
         │
    ┌────▼──────────────────────┐
    │  Deployment Orchestrator  │
    │  - Version Control        │
    │  - Health Checks          │
    │  - Rollback Capability    │
    └────┬──────────────────────┘
         │
    ┌────▼────────────────────────┐
    │  Multi-Target Deployment    │
    ├─────────────────────────────┤
    │  1. Master Controller       │
    │  2. Frontend (Next.js)      │
    │  3. VM Agent Code           │
    │  4. Golden Image Rebuild    │
    └─────────────────────────────┘
```

## Components

### 1. GitHub Actions CI/CD Pipeline
- **Trigger**: Push to `main` branch
- **Jobs**:
  - Lint and Test
  - Build
  - Deploy to Production
  - Rebuild Golden Image (conditional)
  - Health Check & Smoke Tests
  - Rollback on Failure

### 2. Deployment Script (`deploy.sh`)
- Sync code to production server
- Backup current version
- Deploy with zero-downtime
- Run health checks
- Automatic rollback on failure

### 3. Golden Image Build Trigger
- Detects changes in `vm-agent/` directory
- Triggers golden image rebuild
- Validates new golden image
- Activates new golden image atomically

### 4. Local Development Sync (Optional)
- File watcher for local changes
- Auto-deploy to development environment
- Skip CI/CD for rapid iteration

## Deployment Targets

### Target 1: Master Controller (Node.js)
**Path**: `/opt/master-controller/`
**Process**:
1. Upload changed files
2. Run `npm install` if `package.json` changed
3. Graceful restart with health check
4. Rollback if health check fails

### Target 2: Frontend (Next.js)
**Path**: `/opt/polydev-frontend/`
**Process**:
1. Build locally or on server
2. Upload build artifacts
3. Restart Next.js service
4. Verify via HTTP health check

### Target 3: VM Agent
**Path**: `/opt/polydev-ai/vm-agent/`
**Process**:
1. Sync VM agent files
2. Trigger golden image rebuild
3. Validate new VMs boot correctly
4. Activate new golden image

### Target 4: Database Migrations
**Process**:
1. Detect new migration files
2. Apply via Supabase MCP
3. Validate schema changes
4. Record migration version

## Version Control & Rollback

### Git-Based Versioning
- Every deployment tagged with commit SHA
- Deployment metadata stored in:
  - `/opt/polydev-ai/deployments/<timestamp>-<sha>.json`

### Rollback Mechanism
```bash
./scripts/rollback.sh <commit-sha>
```
- Reverts code to specified version
- Restores previous golden image
- Restarts all services
- Validates rollback success

## Health Checks

### Master Controller
```bash
curl http://localhost:4000/api/auth/health
```
Expected: `{"status":"healthy"}`

### Frontend
```bash
curl http://localhost:3000/api/health
```
Expected: `{"status":"ok"}`

### VM Agent (in golden image)
```bash
# After VM boots from new golden image
curl http://192.168.100.X:3000/health
```
Expected: `{"status":"ready"}`

## Configuration

### Environment Variables
```bash
# Server credentials (stored in GitHub Secrets)
DEPLOY_SERVER=135.181.138.102
DEPLOY_USER=root
DEPLOY_PASSWORD=<encrypted>

# Deployment settings
DEPLOY_STRATEGY=rolling  # or blue-green
GOLDEN_IMAGE_REBUILD=auto  # or manual
HEALTH_CHECK_TIMEOUT=30
ROLLBACK_ON_FAILURE=true
```

### Deployment Manifest (`.deploy.yaml`)
```yaml
version: 1.0
targets:
  master-controller:
    path: /opt/master-controller
    restart: systemctl restart master-controller
    health_check: http://localhost:4000/api/auth/health

  vm-agent:
    path: /opt/polydev-ai/vm-agent
    post_deploy: bash /opt/master-controller/scripts/build-golden-snapshot-complete.sh

  frontend:
    path: /opt/polydev-frontend
    build_command: npm run build
    restart: systemctl restart polydev-frontend
```

## Failure Handling

### Pre-Deployment Validation
- [x] Git repo is clean (no uncommitted changes)
- [x] All tests pass
- [x] Build succeeds
- [x] SSH connectivity to server verified

### Deployment Safeguards
- [x] Create backup before deployment
- [x] Incremental file sync (rsync)
- [x] Atomic service restart
- [x] Health check with timeout
- [x] Auto-rollback on failure

### Post-Deployment Monitoring
- [x] Log aggregation
- [x] Error rate monitoring
- [x] Performance metrics
- [x] Alert on anomalies

## Security

### Credentials Management
- GitHub Secrets for server credentials
- SSH key-based auth (preferred over password)
- Encrypted environment variables
- Audit log of all deployments

### Access Control
- Deployment restricted to `main` branch
- Manual approval for production (optional)
- Rollback requires maintainer approval

## Usage

### Automatic Deployment (Git Push)
```bash
git add .
git commit -m "Fix OAuth flow timeout"
git push origin main
# GitHub Actions automatically deploys
```

### Manual Deployment
```bash
./scripts/deploy.sh --target master-controller
```

### Rollback
```bash
./scripts/rollback.sh abc123f
```

### Check Deployment Status
```bash
./scripts/deployment-status.sh
```

## Implementation Checklist

- [x] Design document (this file)
- [ ] GitHub Actions workflow (`.github/workflows/deploy.yml`)
- [ ] Deployment script (`scripts/deploy.sh`)
- [ ] Rollback script (`scripts/rollback.sh`)
- [ ] Health check endpoints
- [ ] Deployment manifest (`.deploy.yaml`)
- [ ] Local development sync (optional)
- [ ] Documentation and runbooks

## Future Enhancements

1. **Blue-Green Deployment**: Zero-downtime deployments with instant rollback
2. **Canary Releases**: Gradual rollout to subset of VMs
3. **A/B Testing**: Deploy multiple versions simultaneously
4. **Automated Performance Testing**: Benchmark before/after deployment
5. **Slack/Discord Notifications**: Real-time deployment status
6. **Deployment Dashboard**: Web UI for deployment history and controls
