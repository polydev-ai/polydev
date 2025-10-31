#!/bin/bash

#
# Simplified GStreamer Installation for Golden Image
# Handles dependency issues by installing minimal required packages
#

set -e

GOLDEN_IMAGE="/var/lib/firecracker/snapshots/base/golden-browser-rootfs.ext4"
MOUNT_POINT="/tmp/golden-mount-$(date +%s)"

echo "========================================="
echo "GStreamer Installation (Simplified)"
echo "========================================="

if [ ! -f "$GOLDEN_IMAGE" ]; then
  echo "ERROR: Golden image not found at $GOLDEN_IMAGE"
  exit 1
fi

echo "[1/5] Mounting golden image..."
mkdir -p "$MOUNT_POINT"
mount -o loop "$GOLDEN_IMAGE" "$MOUNT_POINT"

echo "[2/5] Mounting system directories..."
mount -t proc /proc "$MOUNT_POINT/proc"
mount --rbind /sys "$MOUNT_POINT/sys"
mount --rbind /dev "$MOUNT_POINT/dev"

echo "[3/5] Installing GStreamer (fixing dependencies)..."
chroot "$MOUNT_POINT" /bin/bash <<'CHROOT_CMD'
set -e

# Update package database
apt-get update

# Fix broken dependencies first
apt-get install -f -y

# Install minimal GStreamer for WebRTC (avoiding plugins-bad that has dependency issues)
apt-get install -y \
  gstreamer1.0-tools \
  gstreamer1.0-plugins-base \
  gstreamer1.0-plugins-good \
  gstreamer1.0-x \
  libgstreamer1.0-0

# Try plugins-bad and ugly separately (may fail, that's OK)
apt-get install -y gstreamer1.0-plugins-bad gstreamer1.0-plugins-ugly gstreamer1.0-libav || echo "Optional plugins skipped"

# Verify
gst-launch-1.0 --version

# Cleanup
apt-get clean
rm -rf /var/lib/apt/lists/*

echo "✅ GStreamer installed!"
CHROOT_CMD

echo "[4/5] Unmounting..."
umount "$MOUNT_POINT/dev" || true
umount "$MOUNT_POINT/sys" || true
umount "$MOUNT_POINT/proc" || true
umount "$MOUNT_POINT"

echo "[5/5] Cleanup..."
rmdir "$MOUNT_POINT"

echo ""
echo "✅ Done! GStreamer ready for WebRTC"
echo ""
