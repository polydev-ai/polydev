#!/bin/bash
set -e

# Polydev AI - Production Deployment Script
# Comprehensive, fool-proof deployment with health checks and rollback

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_SERVER="${DEPLOY_SERVER:-135.181.138.102}"
DEPLOY_USER="${DEPLOY_USER:-root}"
DEPLOY_PASSWORD="${DEPLOY_PASSWORD:-}"
HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-30}"
ROLLBACK_ON_FAILURE="${ROLLBACK_ON_FAILURE:-true}"

# Get current git commit
COMMIT_SHA=$(git rev-parse HEAD)
COMMIT_SHORT=$(git rev-parse --short HEAD)
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DEPLOYMENT_ID="${TIMESTAMP}-${COMMIT_SHORT}"

# Deployment targets
MASTER_CONTROLLER_PATH="/opt/master-controller"
VM_AGENT_PATH="/opt/polydev-ai/vm-agent"
FRONTEND_PATH="/opt/polydev-frontend"

# Logging
LOG_FILE="./logs/deployment-${DEPLOYMENT_ID}.log"
mkdir -p ./logs

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$LOG_FILE"
}

# Parse command line arguments
TARGET="all"
SKIP_TESTS=false
SKIP_BACKUP=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --target)
            TARGET="$2"
            shift 2
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-backup)
            SKIP_BACKUP=false
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            error "Unknown option: $1"
            exit 1
            ;;
    esac
done

log "Starting deployment: $DEPLOYMENT_ID"
log "Target: $TARGET"
log "Commit: $COMMIT_SHA"

# Pre-deployment validation
validate_prerequisites() {
    log "Validating prerequisites..."

    # Check git repo is clean (allow staged changes)
    if [[ -n $(git status --porcelain | grep '^.[^ ]') ]]; then
        error "Git working directory has uncommitted changes"
        exit 1
    fi

    # Check SSH connectivity
    if ! sshpass -p "$DEPLOY_PASSWORD" ssh -o StrictHostKeyChecking=no "$DEPLOY_USER@$DEPLOY_SERVER" "echo 'SSH OK'" &>/dev/null; then
        error "Cannot connect to deployment server"
        exit 1
    fi

    log "Prerequisites validated"
}

# Create backup before deployment
create_backup() {
    if [ "$SKIP_BACKUP" = true ]; then
        warn "Skipping backup (--skip-backup flag)"
        return
    fi

    log "Creating backup..."

    sshpass -p "$DEPLOY_PASSWORD" ssh -o StrictHostKeyChecking=no "$DEPLOY_USER@$DEPLOY_SERVER" "
        mkdir -p /opt/polydev-ai/backups
        BACKUP_DIR=\"/opt/polydev-ai/backups/${DEPLOYMENT_ID}\"
        mkdir -p \"\$BACKUP_DIR\"

        # Backup master-controller
        if [ -d \"$MASTER_CONTROLLER_PATH\" ]; then
            cp -r \"$MASTER_CONTROLLER_PATH\" \"\$BACKUP_DIR/master-controller\"
        fi

        # Backup vm-agent
        if [ -d \"$VM_AGENT_PATH\" ]; then
            cp -r \"$VM_AGENT_PATH\" \"\$BACKUP_DIR/vm-agent\"
        fi

        # Backup golden image metadata
        if [ -f \"/var/lib/firecracker/snapshots/base/golden-rootfs.ext4\" ]; then
            ls -lh \"/var/lib/firecracker/snapshots/base/golden-rootfs.ext4\" > \"\$BACKUP_DIR/golden-image-info.txt\"
        fi

        echo \"$COMMIT_SHA\" > \"\$BACKUP_DIR/commit-sha.txt\"
        date > \"\$BACKUP_DIR/backup-time.txt\"

        echo \"Backup created at \$BACKUP_DIR\"
    "

    log "Backup created"
}

# Deploy Master Controller
deploy_master_controller() {
    log "Deploying Master Controller..."

    if [ "$DRY_RUN" = true ]; then
        log "[DRY RUN] Would deploy master-controller"
        return
    fi

    # Sync files (excluding node_modules)
    rsync -avz --delete \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude 'logs' \
        -e "sshpass -p '$DEPLOY_PASSWORD' ssh -o StrictHostKeyChecking=no" \
        ./master-controller/ "$DEPLOY_USER@$DEPLOY_SERVER:$MASTER_CONTROLLER_PATH/" | tee -a "$LOG_FILE"

    # Install dependencies if package.json changed
    if git diff HEAD~1 --name-only | grep -q "master-controller/package.json"; then
        log "package.json changed, running npm install..."
        sshpass -p "$DEPLOY_PASSWORD" ssh -o StrictHostKeyChecking=no "$DEPLOY_USER@$DEPLOY_SERVER" \
            "cd $MASTER_CONTROLLER_PATH && npm install --production" | tee -a "$LOG_FILE"
    fi

    # Restart service
    log "Restarting master-controller..."
    sshpass -p "$DEPLOY_PASSWORD" ssh -o StrictHostKeyChecking=no "$DEPLOY_USER@$DEPLOY_SERVER" "
        cd $MASTER_CONTROLLER_PATH
        killall -9 node 2>/dev/null || true
        sleep 2
        nohup node src/index.js > /var/log/polydev/master-controller.log 2>&1 &
        sleep 3
    " | tee -a "$LOG_FILE"

    log "Master Controller deployed"
}

# Deploy VM Agent
deploy_vm_agent() {
    log "Deploying VM Agent..."

    if [ "$DRY_RUN" = true ]; then
        log "[DRY RUN] Would deploy vm-agent"
        return
    fi

    # Sync VM agent files
    rsync -avz --delete \
        -e "sshpass -p '$DEPLOY_PASSWORD' ssh -o StrictHostKeyChecking=no" \
        ./vm-agent/ "$DEPLOY_USER@$DEPLOY_SERVER:$VM_AGENT_PATH/" | tee -a "$LOG_FILE"

    # Check if we should rebuild golden image
    if git diff HEAD~1 --name-only | grep -q "vm-agent/"; then
        warn "VM Agent changed - Golden image rebuild required"
        log "To rebuild golden image, run: ./scripts/rebuild-golden-image.sh"
    fi

    log "VM Agent deployed"
}

# Health check
health_check() {
    local service=$1
    local url=$2
    local expected=$3

    log "Health check: $service"

    local start_time=$(date +%s)
    local timeout_time=$((start_time + HEALTH_CHECK_TIMEOUT))

    while [ $(date +%s) -lt $timeout_time ]; do
        local response=$(sshpass -p "$DEPLOY_PASSWORD" ssh -o StrictHostKeyChecking=no "$DEPLOY_USER@$DEPLOY_SERVER" \
            "curl -s $url" 2>/dev/null || echo "")

        if echo "$response" | grep -q "$expected"; then
            log "Health check passed: $service"
            return 0
        fi

        sleep 2
    done

    error "Health check failed: $service (timeout after ${HEALTH_CHECK_TIMEOUT}s)"
    return 1
}

# Rollback
rollback() {
    error "Deployment failed - initiating rollback"

    sshpass -p "$DEPLOY_PASSWORD" ssh -o StrictHostKeyChecking=no "$DEPLOY_USER@$DEPLOY_SERVER" "
        BACKUP_DIR=\"/opt/polydev-ai/backups/${DEPLOYMENT_ID}\"

        if [ -d \"\$BACKUP_DIR\" ]; then
            echo 'Restoring from backup...'

            # Restore master-controller
            if [ -d \"\$BACKUP_DIR/master-controller\" ]; then
                rm -rf \"$MASTER_CONTROLLER_PATH\"
                cp -r \"\$BACKUP_DIR/master-controller\" \"$MASTER_CONTROLLER_PATH\"
            fi

            # Restore vm-agent
            if [ -d \"\$BACKUP_DIR/vm-agent\" ]; then
                rm -rf \"$VM_AGENT_PATH\"
                cp -r \"\$BACKUP_DIR/vm-agent\" \"$VM_AGENT_PATH\"
            fi

            # Restart services
            cd $MASTER_CONTROLLER_PATH
            killall -9 node 2>/dev/null || true
            sleep 2
            nohup node src/index.js > /var/log/polydev/master-controller.log 2>&1 &

            echo 'Rollback complete'
        else
            echo 'Backup not found - cannot rollback'
            exit 1
        fi
    "

    log "Rollback complete"
}

# Record deployment metadata
record_deployment() {
    log "Recording deployment metadata..."

    sshpass -p "$DEPLOY_PASSWORD" ssh -o StrictHostKeyChecking=no "$DEPLOY_USER@$DEPLOY_SERVER" "
        mkdir -p /opt/polydev-ai/deployments

        cat > /opt/polydev-ai/deployments/${DEPLOYMENT_ID}.json <<EOF
{
  \"deployment_id\": \"${DEPLOYMENT_ID}\",
  \"commit_sha\": \"${COMMIT_SHA}\",
  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
  \"target\": \"${TARGET}\",
  \"status\": \"success\"
}
EOF
    "

    log "Deployment metadata recorded"
}

# Main deployment flow
main() {
    validate_prerequisites
    create_backup

    case "$TARGET" in
        master-controller)
            deploy_master_controller
            if ! health_check "Master Controller" "http://localhost:4000/api/auth/health" "healthy"; then
                if [ "$ROLLBACK_ON_FAILURE" = true ]; then
                    rollback
                    exit 1
                fi
            fi
            ;;
        vm-agent)
            deploy_vm_agent
            ;;
        all)
            deploy_master_controller
            deploy_vm_agent

            if ! health_check "Master Controller" "http://localhost:4000/api/auth/health" "healthy"; then
                if [ "$ROLLBACK_ON_FAILURE" = true ]; then
                    rollback
                    exit 1
                fi
            fi
            ;;
        *)
            error "Unknown target: $TARGET"
            exit 1
            ;;
    esac

    record_deployment

    log "Deployment completed successfully"
    log "Deployment ID: $DEPLOYMENT_ID"
    log "Commit: $COMMIT_SHA"
}

# Run main function
main
