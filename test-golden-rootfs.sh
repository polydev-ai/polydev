#!/bin/bash
#
# Test Golden Rootfs in Chroot
#
# This script verifies all required components are installed correctly
# before deploying the golden rootfs for production use.
#

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ROOTFS_PATH="/tmp/fc-golden-production-build/rootfs"
ERRORS=0

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    ((ERRORS++))
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

echo ""
echo "=========================================="
echo "Golden Rootfs Verification Tests"
echo "=========================================="
echo ""

# Test 1: Node.js v20
log_test "Checking Node.js version..."
NODE_VERSION=$(chroot "$ROOTFS_PATH" node --version 2>/dev/null || echo "NOT_FOUND")
if [[ "$NODE_VERSION" =~ ^v20\. ]]; then
    log_info "✓ Node.js $NODE_VERSION"
else
    log_error "✗ Node.js v20 not found (got: $NODE_VERSION)"
fi

# Test 2: npm
log_test "Checking npm version..."
NPM_VERSION=$(chroot "$ROOTFS_PATH" npm --version 2>/dev/null || echo "NOT_FOUND")
if [[ "$NPM_VERSION" != "NOT_FOUND" ]]; then
    log_info "✓ npm $NPM_VERSION"
else
    log_error "✗ npm not found"
fi

# Test 3: CLI Tools
log_test "Checking CLI tools..."
for tool in codex claude gemini; do
    TOOL_PATH=$(chroot "$ROOTFS_PATH" which $tool 2>/dev/null || echo "")
    if [ -n "$TOOL_PATH" ]; then
        log_info "✓ $tool found at $TOOL_PATH"
    else
        log_error "✗ $tool not found in PATH"
    fi
done

# Test 4: Systemd services
log_test "Checking systemd services..."
for service in xvfb.service xfce-session.service x11vnc.service; do
    if [ -f "$ROOTFS_PATH/etc/systemd/system/$service" ]; then
        log_info "✓ $service configured"
    else
        log_error "✗ $service not found"
    fi
done

# Test 5: Desktop environment
log_test "Checking desktop packages..."
if chroot "$ROOTFS_PATH" which startxfce4 >/dev/null 2>&1; then
    log_info "✓ XFCE desktop installed"
else
    log_error "✗ XFCE desktop not found"
fi

# Test 6: Terminal
log_test "Checking terminal..."
if chroot "$ROOTFS_PATH" which xfce4-terminal >/dev/null 2>&1; then
    log_info "✓ xfce4-terminal installed"
else
    log_error "✗ xfce4-terminal not found"
fi

# Test 7: VNC server
log_test "Checking VNC server..."
if chroot "$ROOTFS_PATH" which x11vnc >/dev/null 2>&1; then
    log_info "✓ x11vnc installed"
else
    log_error "✗ x11vnc not found"
fi

# Test 8: Virtual display
log_test "Checking Xvfb..."
if chroot "$ROOTFS_PATH" which Xvfb >/dev/null 2>&1; then
    log_info "✓ Xvfb installed"
else
    log_error "✗ Xvfb not found"
fi

# Test 9: Chrome browser
log_test "Checking Chrome..."
if chroot "$ROOTFS_PATH" which google-chrome >/dev/null 2>&1; then
    log_info "✓ Google Chrome installed"
else
    log_error "✗ Google Chrome not found"
fi

# Test 10: GStreamer
log_test "Checking GStreamer..."
if chroot "$ROOTFS_PATH" which gst-launch-1.0 >/dev/null 2>&1; then
    log_info "✓ GStreamer installed"
else
    log_error "✗ GStreamer not found"
fi

# Test 11: Autostart configurations
log_test "Checking autostart configs..."
if [ -f "$ROOTFS_PATH/etc/xdg/autostart/terminal.desktop" ]; then
    log_info "✓ Terminal autostart configured"
else
    log_error "✗ Terminal autostart not found"
fi

if [ -f "$ROOTFS_PATH/etc/xdg/autostart/chrome.desktop" ]; then
    log_info "✓ Chrome autostart configured"
else
    log_error "✗ Chrome autostart not found"
fi

# Test 12: Proxy configuration
log_test "Checking proxy template..."
if [ -f "$ROOTFS_PATH/etc/profile.d/decodo-proxy.sh" ]; then
    log_info "✓ Proxy template configured"
else
    log_error "✗ Proxy template not found"
fi

# Test 13: OAuth agent directory
log_test "Checking OAuth agent structure..."
if [ -d "$ROOTFS_PATH/opt/vm-browser-agent" ]; then
    log_info "✓ OAuth agent directory exists"
else
    log_error "✗ OAuth agent directory not found"
fi

# Test 14: Kernel modules
log_test "Checking kernel modules..."
if [ -d "$ROOTFS_PATH/lib/modules" ]; then
    KERNEL_VERSION=$(ls "$ROOTFS_PATH/lib/modules" | head -1)
    log_info "✓ Kernel modules directory exists: $KERNEL_VERSION"

    VIRTIO_NET_PATH="$ROOTFS_PATH/lib/modules/$KERNEL_VERSION/kernel/drivers/net/virtio_net.ko"
    if [ -f "$VIRTIO_NET_PATH" ]; then
        log_info "✓ virtio_net.ko module found"
    else
        log_error "✗ virtio_net.ko module not found"
    fi
else
    log_error "✗ Kernel modules directory not found"
fi

# Test 15: Network configuration
log_test "Checking network config template..."
if [ -f "$ROOTFS_PATH/etc/systemd/network/10-eth0.network" ]; then
    log_info "✓ Network configuration template exists"
    if grep -q "__VM_IP__" "$ROOTFS_PATH/etc/systemd/network/10-eth0.network"; then
        log_info "✓ IP placeholder found in template"
    else
        log_warn "⚠ IP placeholder not found in network template"
    fi
else
    log_error "✗ Network configuration template not found"
fi

echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo ""

if [ $ERRORS -eq 0 ]; then
    log_info "✓ All tests passed! Golden rootfs is ready for deployment."
    echo ""
    echo "Next steps:"
    echo "1. Deploy: cp /tmp/fc-golden-production-build/rootfs.ext4 /var/lib/firecracker/snapshots/base/golden-rootfs.ext4"
    echo "2. Test VM creation: Create a Browser VM and verify all services"
    echo "3. Verify VNC: Connect via noVNC to confirm desktop is accessible"
    exit 0
else
    log_error "✗ $ERRORS tests failed!"
    echo ""
    echo "Please fix the issues before deploying."
    exit 1
fi
