#!/bin/bash
#
# Install VM Agent to Golden Snapshot
# This script mounts the golden rootfs, installs the HTTP agent, and enables the systemd service
#

set -e

echo "=========================================="
echo "VM Agent Installation for Golden Snapshot"
echo "=========================================="
echo ""

# Configuration
GOLDEN_ROOTFS="/opt/firecracker/golden/rootfs.ext4"
MOUNT_POINT="/mnt/vmroot"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "❌ This script must be run as root (use sudo)"
   exit 1
fi

# Check if golden rootfs exists
if [ ! -f "$GOLDEN_ROOTFS" ]; then
    echo "❌ Golden rootfs not found at: $GOLDEN_ROOTFS"
    echo ""
    echo "Please update GOLDEN_ROOTFS path in this script."
    exit 1
fi

echo "✅ Found golden rootfs: $GOLDEN_ROOTFS"
echo ""

# Create mount point
echo "Creating mount point..."
mkdir -p "$MOUNT_POINT"

# Mount the rootfs
echo "Mounting golden rootfs..."
mount -o loop "$GOLDEN_ROOTFS" "$MOUNT_POINT"

if [ $? -ne 0 ]; then
    echo "❌ Failed to mount golden rootfs"
    exit 1
fi

echo "✅ Golden rootfs mounted at: $MOUNT_POINT"
echo ""

# Install VM agent
echo "Installing VM agent..."

# Create /opt/vm-agent directory
mkdir -p "$MOUNT_POINT/opt/vm-agent"

# Copy Python script
cp "$SCRIPT_DIR/health-server.py" "$MOUNT_POINT/opt/vm-agent/health-server.py"
chmod 0755 "$MOUNT_POINT/opt/vm-agent/health-server.py"

echo "✅ VM agent script installed"

# Install systemd service
echo "Installing systemd service..."

# Copy service file
cp "$SCRIPT_DIR/vm-agent.service" "$MOUNT_POINT/etc/systemd/system/vm-agent.service"
chmod 0644 "$MOUNT_POINT/etc/systemd/system/vm-agent.service"

# Enable service (create symlink)
mkdir -p "$MOUNT_POINT/etc/systemd/system/multi-user.target.wants"
ln -sf ../vm-agent.service "$MOUNT_POINT/etc/systemd/system/multi-user.target.wants/vm-agent.service"

echo "✅ Systemd service installed and enabled"
echo ""

# Verify Python3 is available
if [ ! -f "$MOUNT_POINT/usr/bin/python3" ]; then
    echo "⚠️  WARNING: Python3 not found in golden snapshot!"
    echo "   The VM agent requires Python3 to run."
    echo "   You may need to install it in the golden snapshot first."
fi

# Unmount
echo "Unmounting golden rootfs..."
umount "$MOUNT_POINT"

echo ""
echo "=========================================="
echo "✅ INSTALLATION COMPLETE"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Test the modified golden rootfs by booting a new VM"
echo "2. Verify health check responds: curl http://<vm-ip>:8080/health"
echo "3. If successful, this will become your new golden snapshot"
echo ""
echo "To check if the service is running in a booted VM:"
echo "  - systemctl status vm-agent"
echo "  - journalctl -u vm-agent"
echo "  - ss -tlnp | grep 8080"
echo ""
