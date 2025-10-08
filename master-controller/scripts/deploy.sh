#!/bin/bash
#
# Deploy Master Controller to mini PC
# Copies files, installs dependencies, sets up systemd service
#

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
DEPLOY_USER="${DEPLOY_USER:-root}"
DEPLOY_HOST="${DEPLOY_HOST:-192.168.5.82}"
DEPLOY_DIR="/opt/master-controller"
SERVICE_NAME="master-controller"

# Check if running as correct user for deployment
if [ "$EUID" -ne 0 ] && [ "$(whoami)" != "$DEPLOY_USER" ]; then
    log_warn "This script should be run as $DEPLOY_USER"
fi

log_info "Deploying Master Controller to $DEPLOY_HOST..."

# Create deployment directory
log_info "Creating deployment directory..."
ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "mkdir -p $DEPLOY_DIR"

# Copy files
log_info "Copying files..."
rsync -avz --exclude 'node_modules' \
    --exclude '.git' \
    --exclude '.env' \
    --exclude 'logs' \
    --exclude '*.log' \
    ./ "${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_DIR}/"

# Install dependencies
log_info "Installing dependencies..."
ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "cd $DEPLOY_DIR && npm install --production"

# Setup environment
log_info "Setting up environment..."
ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "bash -s" <<'EOF'
if [ ! -f /opt/master-controller/.env ]; then
    cp /opt/master-controller/.env.example /opt/master-controller/.env
    echo ""
    echo "==================================="
    echo "IMPORTANT: Edit .env file with your configuration:"
    echo "  vim /opt/master-controller/.env"
    echo "==================================="
    echo ""
fi
EOF

# Setup systemd service
log_info "Setting up systemd service..."
ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "bash -s" <<EOF
# Copy service file
cp $DEPLOY_DIR/systemd/$SERVICE_NAME.service /etc/systemd/system/

# Reload systemd
systemctl daemon-reload

# Enable service
systemctl enable $SERVICE_NAME

echo "Service $SERVICE_NAME installed and enabled"
EOF

# Setup log directory
log_info "Setting up log directory..."
ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "mkdir -p /var/log/polydev && chmod 755 /var/log/polydev"

# Setup Firecracker directories
log_info "Setting up Firecracker directories..."
ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "bash -s" <<'EOF'
FIRECRACKER_BASE=${FIRECRACKER_BASE:-/var/lib/firecracker}

mkdir -p "$FIRECRACKER_BASE/sockets"
mkdir -p "$FIRECRACKER_BASE/users"
mkdir -p "$FIRECRACKER_BASE/jail"
mkdir -p "$FIRECRACKER_BASE/snapshots/base"

chmod 755 "$FIRECRACKER_BASE"
chmod 755 "$FIRECRACKER_BASE/sockets"
chmod 755 "$FIRECRACKER_BASE/users"
chmod 755 "$FIRECRACKER_BASE/jail"
chmod 755 "$FIRECRACKER_BASE/snapshots"

echo "Firecracker directories created"
EOF

# Check if golden snapshot exists
log_info "Checking golden snapshot..."
ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "bash -s" <<'EOF'
FIRECRACKER_BASE=${FIRECRACKER_BASE:-/var/lib/firecracker}
SNAPSHOT_DIR="$FIRECRACKER_BASE/snapshots/base"

if [ ! -f "$SNAPSHOT_DIR/golden-rootfs.ext4" ]; then
    echo ""
    echo "==================================="
    echo "WARNING: Golden snapshot not found!"
    echo "Run: /opt/master-controller/scripts/build-golden-snapshot.sh"
    echo "==================================="
    echo ""
fi
EOF

# Setup network
log_info "Checking network setup..."
ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "bash -s" <<'EOF'
if ! ip link show fcbr0 &>/dev/null; then
    echo ""
    echo "==================================="
    echo "WARNING: Network bridge not configured!"
    echo "Run: /opt/master-controller/scripts/setup-network.sh"
    echo "==================================="
    echo ""
else
    echo "Network bridge fcbr0 is configured"
fi
EOF

# Ask if user wants to start the service
echo ""
read -p "Do you want to start the Master Controller service now? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "Starting service..."
    ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "systemctl start $SERVICE_NAME"

    # Check status
    log_info "Service status:"
    ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "systemctl status $SERVICE_NAME --no-pager"
fi

log_info "Deployment complete!"
echo ""
log_info "Next steps:"
echo "  1. Edit configuration: ssh ${DEPLOY_USER}@${DEPLOY_HOST} 'vim /opt/master-controller/.env'"
echo "  2. Build golden snapshot: ssh ${DEPLOY_USER}@${DEPLOY_HOST} '/opt/master-controller/scripts/build-golden-snapshot.sh'"
echo "  3. Setup network: ssh ${DEPLOY_USER}@${DEPLOY_HOST} '/opt/master-controller/scripts/setup-network.sh'"
echo "  4. Start service: ssh ${DEPLOY_USER}@${DEPLOY_HOST} 'systemctl start $SERVICE_NAME'"
echo "  5. Check logs: ssh ${DEPLOY_USER}@${DEPLOY_HOST} 'journalctl -u $SERVICE_NAME -f'"
echo "  6. Check metrics: http://${DEPLOY_HOST}:4000/metrics"
echo ""
