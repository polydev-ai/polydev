#!/bin/bash
#
# Deploy Golden Rootfs and Create Test Browser VM
#
# This script:
# 1. Backs up existing golden rootfs
# 2. Deploys new production rootfs
# 3. Creates a test Browser VM
# 4. Verifies all services are running
#

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SNAPSHOT_DIR="/var/lib/firecracker/snapshots/base"
BUILD_DIR="/tmp/fc-golden-production-build"
BACKUP_DIR="/var/lib/firecracker/snapshots/backups"

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

echo ""
echo "=========================================="
echo "Deploy Production Golden Rootfs"
echo "=========================================="
echo ""

# Check if build exists
if [ ! -f "$BUILD_DIR/rootfs.ext4" ]; then
    log_error "Build not found at $BUILD_DIR/rootfs.ext4"
    log_info "Please run build-golden-snapshot-production.sh first"
    exit 1
fi

# Create backup directory
log_step "Creating backup directory..."
mkdir -p "$BACKUP_DIR"

# Backup existing golden rootfs
if [ -f "$SNAPSHOT_DIR/golden-rootfs.ext4" ]; then
    log_step "Backing up existing golden rootfs..."
    BACKUP_NAME="golden-rootfs-backup-$(date +%Y%m%d-%H%M%S).ext4"
    cp "$SNAPSHOT_DIR/golden-rootfs.ext4" "$BACKUP_DIR/$BACKUP_NAME"
    log_info "Backup saved to: $BACKUP_DIR/$BACKUP_NAME"
fi

# Deploy new rootfs
log_step "Deploying new golden rootfs..."
cp "$BUILD_DIR/rootfs.ext4" "$SNAPSHOT_DIR/golden-rootfs-production.ext4"

# Create symlink
log_step "Creating symlink..."
ln -sf golden-rootfs-production.ext4 "$SNAPSHOT_DIR/golden-rootfs.ext4"

# Set permissions
chmod 644 "$SNAPSHOT_DIR/golden-rootfs-production.ext4"

log_info "✓ Golden rootfs deployed successfully"
log_info "  Location: $SNAPSHOT_DIR/golden-rootfs-production.ext4"
log_info "  Symlink: $SNAPSHOT_DIR/golden-rootfs.ext4 -> golden-rootfs-production.ext4"
log_info "  Size: $(du -h $SNAPSHOT_DIR/golden-rootfs-production.ext4 | cut -f1)"

echo ""
echo "=========================================="
echo "Creating Test Browser VM"
echo "=========================================="
echo ""

# Create test VM via API
log_step "Creating test Browser VM..."

RESPONSE=$(curl -X POST http://localhost:4000/api/auth/start \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "test-golden-rootfs-validation",
    "provider": "claude_code"
  }' \
  2>&1)

log_info "API Response:"
echo "$RESPONSE" | head -50

# Extract session ID from response
SESSION_ID=$(echo "$RESPONSE" | grep -oP '"sessionId"\s*:\s*"\K[^"]+' | head -1 || echo "")

if [ -z "$SESSION_ID" ]; then
    log_error "Failed to extract session ID from response"
    log_warn "VM creation may have failed - check master-controller logs"
    exit 1
fi

log_info "✓ Test VM created with session ID: $SESSION_ID"

echo ""
log_step "Waiting 60 seconds for VM to boot and services to start..."
sleep 60

echo ""
echo "=========================================="
echo "Verifying VM Services"
echo "=========================================="
echo ""

# Get VM IP from logs
log_step "Finding VM IP address..."
VM_IP=$(tail -200 /opt/master-controller/logs/master-controller.log | grep -oP '192\.168\.100\.\d+' | tail -1 || echo "")

if [ -z "$VM_IP" ]; then
    log_error "Failed to find VM IP address"
    log_warn "Check /opt/master-controller/logs/master-controller.log for VM creation details"
    exit 1
fi

log_info "VM IP: $VM_IP"

# Test VNC port
log_step "Testing VNC port 5901..."
if timeout 5 bash -c "</dev/tcp/$VM_IP/5901" 2>/dev/null; then
    log_info "✓ VNC port 5901 is accessible"
else
    log_error "✗ VNC port 5901 is NOT accessible"
fi

# Test OAuth agent port
log_step "Testing OAuth agent port 8080..."
if timeout 5 bash -c "</dev/tcp/$VM_IP/8080" 2>/dev/null; then
    log_info "✓ OAuth agent port 8080 is accessible"

    # Try health check
    HEALTH_RESPONSE=$(curl -s http://$VM_IP:8080/health 2>&1 || echo "FAILED")
    if [[ "$HEALTH_RESPONSE" == *"ok"* ]]; then
        log_info "✓ OAuth agent health check passed"
    else
        log_warn "⚠ OAuth agent port open but health check failed: $HEALTH_RESPONSE"
    fi
else
    log_error "✗ OAuth agent port 8080 is NOT accessible"
fi

# Check systemd services via SSH (if SSH is configured)
log_step "Checking systemd services in VM..."
log_info "Attempting to check services via VM logs..."

# Look for service startup in console logs
CONSOLE_LOG_PATH="/var/lib/firecracker/users/*/console.log"
CONSOLE_LOG=$(find /var/lib/firecracker/users -name "console.log" -type f -mmin -5 | head -1)

if [ -n "$CONSOLE_LOG" ]; then
    log_info "Console log found: $CONSOLE_LOG"

    if grep -q "x11vnc" "$CONSOLE_LOG"; then
        log_info "✓ VNC service appears in console log"
    fi

    if grep -q "xfce4" "$CONSOLE_LOG" || grep -q "startxfce4" "$CONSOLE_LOG"; then
        log_info "✓ XFCE desktop appears in console log"
    fi

    if grep -q "Xvfb" "$CONSOLE_LOG"; then
        log_info "✓ Xvfb appears in console log"
    fi

    log_info "Latest console log entries:"
    tail -20 "$CONSOLE_LOG"
else
    log_warn "No recent console log found"
fi

echo ""
echo "=========================================="
echo "Deployment Summary"
echo "=========================================="
echo ""

log_info "✓ Golden rootfs deployed"
log_info "✓ Test VM created (Session: $SESSION_ID)"
log_info "✓ VM IP: $VM_IP"
echo ""
echo "Next steps:"
echo "1. Connect via noVNC: http://135.181.138.102:6080/vnc.html?host=135.181.138.102&port=6080&path=websockify/?token=$VM_IP:5901"
echo "2. Verify desktop shows terminal and browser"
echo "3. Test OAuth flow by completing authentication"
echo "4. Verify credentials are captured"
echo ""
echo "To monitor VM:"
echo "  - Console log: find /var/lib/firecracker/users -name console.log -mmin -10"
echo "  - OAuth agent log: ssh root@$VM_IP 'tail -f /var/log/vm-browser-agent/oauth.log'"
echo "  - Master controller log: tail -f /opt/master-controller/logs/master-controller.log"
echo ""
