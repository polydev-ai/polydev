#!/bin/bash

#
# Install GStreamer in Golden Browser VM Image
# This script mounts the golden rootfs, chroots in, installs GStreamer packages, then unmounts
#
# Requirements:
# - Run on VPS as root
# - Golden image at /opt/firecracker/golden-browser-rootfs.ext4
#
# Usage:
#   sudo bash scripts/install-gstreamer-golden-image.sh
#

set -e

GOLDEN_IMAGE="/opt/firecracker/golden-browser-rootfs.ext4"
MOUNT_POINT="/tmp/golden-mount-$(date +%s)"

echo "========================================="
echo "GStreamer Golden Image Installation"
echo "========================================="
echo ""

# Verify golden image exists
if [ ! -f "$GOLDEN_IMAGE" ]; then
  echo "ERROR: Golden image not found at $GOLDEN_IMAGE"
  exit 1
fi

echo "[1/6] Creating mount point: $MOUNT_POINT"
mkdir -p "$MOUNT_POINT"

echo "[2/6] Mounting golden rootfs..."
mount -o loop "$GOLDEN_IMAGE" "$MOUNT_POINT"

echo "[3/6] Mounting essential filesystems for chroot..."
mount -t proc /proc "$MOUNT_POINT/proc"
mount --rbind /sys "$MOUNT_POINT/sys"
mount --rbind /dev "$MOUNT_POINT/dev"

echo "[4/6] Installing GStreamer packages in chroot..."
chroot "$MOUNT_POINT" /bin/bash <<'CHROOT_COMMANDS'
set -e

echo "  - Updating package lists..."
apt-get update -qq

echo "  - Installing GStreamer core and plugins..."
apt-get install -y \
  gstreamer1.0-tools \
  gstreamer1.0-plugins-base \
  gstreamer1.0-plugins-good \
  gstreamer1.0-plugins-bad \
  gstreamer1.0-plugins-ugly \
  gstreamer1.0-libav \
  gstreamer1.0-x

echo "  - Verifying installation..."
gst-launch-1.0 --version

echo "  - Cleaning up package cache..."
apt-get clean
rm -rf /var/lib/apt/lists/*

echo "  - GStreamer installation complete!"
CHROOT_COMMANDS

echo "[5/6] Unmounting filesystems..."
umount "$MOUNT_POINT/dev" || true
umount "$MOUNT_POINT/sys" || true
umount "$MOUNT_POINT/proc" || true
umount "$MOUNT_POINT"

echo "[6/6] Cleaning up mount point..."
rmdir "$MOUNT_POINT"

echo ""
echo "========================================="
echo "✅ GStreamer installed successfully!"
echo "========================================="
echo ""
echo "Golden image updated: $GOLDEN_IMAGE"
echo ""
echo "Next steps:"
echo "1. Restart master-controller: pm2 restart master-controller"
echo "2. Create a new Browser VM to test WebRTC"
echo "3. Check logs: journalctl -u vm-browser-agent -f (inside VM)"
echo ""
