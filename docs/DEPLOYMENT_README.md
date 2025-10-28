# Polydev AI - Auto-Deployment System

## Summary

The auto-deployment system provides:
- ✅ Automatic deployment on git push to `main` branch
- ✅ Version control with rollback capability
- ✅ Health checks and automatic rollback on failure
- ✅ Support for deploying master-controller, VM agent, and golden image rebuilds
- ✅ Deployment tracking and audit logs
- ✅ Zero-downtime deployments with graceful service restarts

## Files Created

### 1. Design Document
**Location**: `docs/AUTO_DEPLOYMENT_DESIGN.md`
- Architecture overview
- Component descriptions
- Deployment targets and processes
- Security and failure handling

### 2. Deployment Script
**Location**: `scripts/deploy.sh`
- Main deployment orchestration
- Pre-deployment validation
- Backup creation
- Service deployment with health checks
- Automatic rollback on failure

### 3. GitHub Actions Workflow
**Location**: `.github/workflows/deploy.yml`
- CI/CD pipeline for automatic deployments
- Triggered on push to `main` branch
- Deployment logs uploaded as artifacts
- Notifications on success/failure

## Setup Instructions

### Step 1: Configure GitHub Secrets

Add these secrets to your GitHub repository:

1. Go to repository Settings → Secrets and variables → Actions
2. Add the following secrets:
   - `DEPLOY_SERVER`: `135.181.138.102`
   - `DEPLOY_USER`: `root`
   - `DEPLOY_PASSWORD`: `Venkatesh4158198303`

### Step 2: Make Scripts Executable

```bash
chmod +x scripts/deploy.sh
```

### Step 3: Test Manual Deployment

Before relying on automatic deployments, test manually:

```bash
# Deploy everything
./scripts/deploy.sh

# Deploy only master-controller
./scripts/deploy.sh --target master-controller

# Deploy only VM agent
./scripts/deploy.sh --target vm-agent

# Dry run (preview changes without deploying)
./scripts/deploy.sh --dry-run
```

## Usage

### Automatic Deployment (Recommended)

Simply push to the `main` branch:

```bash
git add .
git commit -m "Add new feature"
git push origin main
```

GitHub Actions will automatically:
1. Run tests (if configured)
2. Deploy to production
3. Run health checks
4. Rollback if deployment fails
5. Upload deployment logs

### Manual Deployment

Use when you need immediate deployment control:

```bash
export DEPLOY_PASSWORD="Venkatesh4158198303"
./scripts/deploy.sh --target all
```

### Golden Image Rebuild

When `vm-agent/` changes are detected, the system will warn you:

```bash
# Manually trigger golden image rebuild
ssh root@135.181.138.102 "cd /opt/master-controller && bash scripts/build-golden-snapshot-complete.sh"
```

## Deployment Process

### Master Controller Deployment

1. **Backup**: Current version backed up to `/opt/polydev-ai/backups/`
2. **Sync**: Files rsync'd to server (excluding node_modules)
3. **Dependencies**: `npm install` if `package.json` changed
4. **Restart**: Service gracefully restarted
5. **Health Check**: HTTP request to `/api/auth/health`
6. **Rollback**: If health check fails, restore from backup

### VM Agent Deployment

1. **Backup**: Current version backed up
2. **Sync**: Files rsync'd to `/opt/polydev-ai/vm-agent/`
3. **Warning**: If `vm-agent/` changed, warns about golden image rebuild
4. **Manual Step**: Admin must rebuild golden image when ready

## Rollback

### Automatic Rollback

Happens automatically if:
- Health check fails after deployment
- Service doesn't start within timeout
- `ROLLBACK_ON_FAILURE=true` (default)

### Manual Rollback

To rollback to a previous deployment:

```bash
# List available backups
ssh root@135.181.138.102 "ls -la /opt/polydev-ai/backups/"

# Manually restore from backup
ssh root@135.181.138.102 "
  BACKUP_DIR='/opt/polydev-ai/backups/20250128_155432-abc123f'
  rm -rf /opt/master-controller
  cp -r \$BACKUP_DIR/master-controller /opt/master-controller
  cd /opt/master-controller
  killall -9 node
  nohup node src/index.js > /var/log/polydev/master-controller.log 2>&1 &
"
```

## Monitoring

### Deployment Logs

**Local**: `logs/deployment-<timestamp>-<sha>.log`
**GitHub Actions**: Check workflow run → Artifacts → deployment-logs

### Server Logs

```bash
# Master controller logs
ssh root@135.181.138.102 "tail -f /var/log/polydev/master-controller.log"

# Golden image build logs
ssh root@135.181.138.102 "tail -f /tmp/golden-build.log"
```

### Deployment History

```bash
# View deployment metadata
ssh root@135.181.138.102 "cat /opt/polydev-ai/deployments/*.json | jq ."
```

## Troubleshooting

### Deployment Failed - Health Check Timeout

**Cause**: Service didn't start in time or health endpoint not responding

**Solution**:
1. Check server logs: `ssh root@135.181.138.102 "tail -100 /var/log/polydev/master-controller.log"`
2. Verify service is running: `ssh root@135.181.138.102 "ps aux | grep node"`
3. Manual health check: `ssh root@135.181.138.102 "curl http://localhost:4000/api/auth/health"`

### Deployment Failed - SSH Connection Error

**Cause**: Cannot connect to server or credentials invalid

**Solution**:
1. Verify server is online: `ping 135.181.138.102`
2. Test SSH manually: `sshpass -p "Venkatesh4158198303" ssh root@135.181.138.102 "echo OK"`
3. Check GitHub Secrets are correctly set

### Golden Image Not Rebuilding

**Cause**: Golden image rebuild is a manual step after VM agent deployment

**Solution**:
```bash
ssh root@135.181.138.102 "cd /opt/master-controller && bash scripts/build-golden-snapshot-complete.sh"
```

## Security Best Practices

### Current Setup (Functional but Basic)
- ✅ Credentials in GitHub Secrets (encrypted at rest)
- ⚠️ Password authentication (works but not ideal)
- ✅ Audit logs in deployment metadata

### Recommended Improvements
1. **SSH Key-Based Auth** (instead of password)
   ```bash
   # Generate SSH key pair
   ssh-keygen -t ed25519 -f ~/.ssh/polydev-deploy

   # Add to server
   ssh-copy-id -i ~/.ssh/polydev-deploy.pub root@135.181.138.102

   # Update deploy.sh to use key instead of password
   ```

2. **Separate Deployment User** (instead of root)
   ```bash
   # Create deploy user on server
   useradd -m deploy
   usermod -aG sudo deploy
   ```

3. **Deployment Approval** (for production)
   - Enable GitHub Environment protection rules
   - Require manual approval for deployments

## Future Enhancements

See `docs/AUTO_DEPLOYMENT_DESIGN.md` for comprehensive list, including:

1. **Blue-Green Deployments**: Zero-downtime with instant rollback
2. **Canary Releases**: Gradual rollout to subset of VMs
3. **A/B Testing**: Deploy multiple versions simultaneously
4. **Performance Testing**: Automated benchmarks before/after
5. **Deployment Dashboard**: Web UI for deployment history

## Current Deployment Status (Updated: October 28, 2025)

✅ **GitHub Secrets Configured**: DEPLOY_SERVER, DEPLOY_USER, DEPLOY_PASSWORD
✅ **Health Endpoint Added**: `/api/auth/health` for deployment verification
✅ **Master Controller Deployed**: Running on production with health checks
✅ **Auto-Deployment System**: Fully operational and tested
✅ **VM Agent Deployed**: `/opt/polydev-ai/vm-agent/`
✅ **Database Migration**: `last_heartbeat` column added

### What Works Now

1. **Automatic Deployment**: Push to `main` branch triggers GitHub Actions
2. **Health Checks**: Deployment script verifies service health at `/api/auth/health`
3. **Rollback Mechanism**: Automatic rollback on health check failure (tested and working)
4. **Manual Deployment**: Use `./scripts/deploy.sh` for manual deployments
5. **Deployment Logs**: Available in GitHub Actions artifacts

### Known Issues & Solutions

**Issue**: Initial deployments failed with health check timeouts
**Root Cause**: The `/api/auth/health` endpoint was missing
**Solution**: Added health endpoint in `master-controller/src/index.js:88-96`
**Status**: ✅ Fixed and verified working

### Next Steps for Future Deployments

1. **Trigger Deployment**: Simply push to `main` branch
2. **Monitor Progress**: Check GitHub Actions workflow at https://github.com/backspacevenkat/polydev-ai/actions
3. **Verify Success**: Health endpoint should return `{"status":"healthy"}`
4. **Check Logs**: Deployment logs uploaded as artifacts in GitHub Actions

## Questions?

Refer to:
- Full design: `docs/AUTO_DEPLOYMENT_DESIGN.md`
- Deployment script: `scripts/deploy.sh`
- GitHub workflow: `.github/workflows/deploy.yml`
