#!/bin/bash
# Fix vm-browser-agent service and reinstall in golden snapshot

set -e

GOLDEN_SNAPSHOT="/var/lib/firecracker/snapshots/base/golden-rootfs.ext4"
MOUNT_POINT="/mnt/vmroot"

echo "=========================================="
echo "Fixing VM Browser Agent Service"
echo "=========================================="
echo ""

# Create mount point
mkdir -p "$MOUNT_POINT"

# Mount golden snapshot
echo "📦 Mounting golden snapshot..."
mount -o loop "$GOLDEN_SNAPSHOT" "$MOUNT_POINT"
mount --bind /proc "$MOUNT_POINT/proc"
mount --bind /sys "$MOUNT_POINT/sys"
mount --bind /dev "$MOUNT_POINT/dev"

# Update service file with fixed network dependency
echo "🔧 Updating service file (fixing network-online.target issue)..."
cat > "$MOUNT_POINT/etc/systemd/system/vm-browser-agent.service" << 'SERVICE_EOF'
[Unit]
Description=VM Browser Agent - OAuth Proxy for CLI Tools
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/node /opt/vm-agent/vm-browser-agent.js
Restart=always
RestartSec=1
StandardOutput=journal
StandardError=journal
Environment=HOME=/root
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
SERVICE_EOF

echo "✅ Service file updated"

# Verify service is still enabled
if [ -L "$MOUNT_POINT/etc/systemd/system/multi-user.target.wants/vm-browser-agent.service" ]; then
    echo "✅ Service symlink exists"
else
    echo "⚠️  Creating service symlink..."
    ln -sf ../vm-browser-agent.service "$MOUNT_POINT/etc/systemd/system/multi-user.target.wants/vm-browser-agent.service"
fi

# Verify script exists
if [ -f "$MOUNT_POINT/opt/vm-agent/vm-browser-agent.js" ]; then
    echo "✅ vm-browser-agent.js exists ($(stat -c%s $MOUNT_POINT/opt/vm-agent/vm-browser-agent.js) bytes)"
else
    echo "❌ vm-browser-agent.js missing!"
    exit 1
fi

# Unmount
echo ""
echo "🔓 Unmounting..."
umount "$MOUNT_POINT/dev" || true
umount "$MOUNT_POINT/sys" || true
umount "$MOUNT_POINT/proc" || true
umount "$MOUNT_POINT"

echo ""
echo "=========================================="
echo "✅ SERVICE FIX COMPLETE"
echo "=========================================="
echo ""
echo "Changed: After=network-online.target → After=network.target"
echo ""
echo "Next: Restart master-controller"
echo "  sudo systemctl restart master-controller"
echo ""
