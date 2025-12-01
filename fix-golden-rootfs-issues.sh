#!/bin/bash
#
# Fix Golden Rootfs Issues
#
# Fixes:
# 1. x11vnc not listening (add -create flag and verbose logging)
# 2. Chrome not found (create chromium-browser symlink)
# 3. GStreamer WebRTC binding missing (install gir1.2-gst-plugins-bad-1.0)
#

set -euo pipefail

echo "=== Fixing Golden Rootfs Issues ==="
echo ""

# Mount golden rootfs
MOUNT_POINT="/tmp/fix-golden-rootfs"
mkdir -p "$MOUNT_POINT"
mount -o loop /var/lib/firecracker/snapshots/base/golden-rootfs-production.ext4 "$MOUNT_POINT"

echo "1. Fixing x11vnc service (add -create flag and verbose output)..."
cat > "$MOUNT_POINT/etc/systemd/system/x11vnc.service" <<'EOF'
[Unit]
Description=x11vnc VNC Server
After=xvfb.service
Requires=xvfb.service

[Service]
Type=simple
User=root
Environment="DISPLAY=:1"
ExecStartPre=/bin/sleep 2
ExecStart=/usr/bin/x11vnc -display :1 -forever -shared -wait 50 -listen 0.0.0.0 -rfbport 5901 -passwd polydev123 -noxdamage -repeat -noxrecord -noxfixes -ncache 10 -create -gone 'killall Xvfb' -v -o /var/log/x11vnc.log
Restart=on-failure
RestartSec=5
StandardOutput=journal+console
StandardError=journal+console

[Install]
WantedBy=multi-user.target
EOF
echo "  ✓ x11vnc service updated"

echo ""
echo "2. Creating chromium-browser symlink..."
if [ -f "$MOUNT_POINT/usr/bin/google-chrome" ]; then
    ln -sf /usr/bin/google-chrome "$MOUNT_POINT/usr/bin/chromium-browser"
    echo "  ✓ Symlink created: /usr/bin/chromium-browser -> /usr/bin/google-chrome"
else
    echo "  ✗ google-chrome not found!"
fi

echo ""
echo "3. Installing GStreamer WebRTC bindings..."
# Copy resolv.conf for network access
cp /etc/resolv.conf "$MOUNT_POINT/etc/resolv.conf"

# Install gir1.2-gst-plugins-bad-1.0 (contains GstWebRTC)
chroot "$MOUNT_POINT" apt-get update
chroot "$MOUNT_POINT" apt-get install -y gir1.2-gst-plugins-bad-1.0
echo "  ✓ GStreamer WebRTC bindings installed"

echo ""
echo "4. Verifying fixes..."
chroot "$MOUNT_POINT" which chromium-browser && echo "  ✓ chromium-browser found" || echo "  ✗ chromium-browser not found"
[ -f "$MOUNT_POINT/etc/systemd/system/x11vnc.service" ] && echo "  ✓ x11vnc.service exists" || echo "  ✗ x11vnc.service missing"

echo ""
echo "5. Cleaning up..."
chroot "$MOUNT_POINT" apt-get clean
rm -rf "$MOUNT_POINT/tmp/*"

# Sync and unmount
sync
sync
umount "$MOUNT_POINT"

echo ""
echo "✓ Golden rootfs fixed successfully!"
echo ""
echo "Next: Create a new test VM to verify fixes"
