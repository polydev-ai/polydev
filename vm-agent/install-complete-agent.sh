#!/bin/bash
#
# Install Complete VM Browser Agent to Golden Snapshot
# This replaces the minimal Python health-server.py with the full Node.js agent
#

set -e

echo "=========================================="
echo "Complete VM Agent Installation"
echo "=========================================="
echo ""

# Configuration
GOLDEN_ROOTFS="/var/lib/firecracker/snapshots/base/golden-rootfs.ext4"
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
mkdir -p "$MOUNT_POINT"

# Mount the rootfs
echo "📦 Mounting golden rootfs..."
mount -o loop "$GOLDEN_ROOTFS" "$MOUNT_POINT"

if [ $? -ne 0 ]; then
    echo "❌ Failed to mount golden rootfs"
    exit 1
fi

echo "✅ Golden rootfs mounted at: $MOUNT_POINT"
echo ""

# Check for Node.js
echo "🔍 Checking for Node.js..."
if [ ! -f "$MOUNT_POINT/usr/bin/node" ]; then
    echo "⚠️  WARNING: Node.js not found in golden snapshot!"
    echo ""
    echo "   You need to install Node.js first. Options:"
    echo "   1. Boot a VM from this snapshot and install Node.js manually:"
    echo "      curl -fsSL https://deb.nodesource.com/setup_20.x | bash -"
    echo "      apt-get install -y nodejs"
    echo "      Then recreate the golden snapshot from that VM"
    echo ""
    echo "   2. Use chroot to install in the mounted snapshot (advanced)"
    echo ""
    echo "❌ Cannot continue without Node.js"
    umount "$MOUNT_POINT"
    exit 1
fi

NODE_VERSION=$("$MOUNT_POINT/usr/bin/node" --version 2>/dev/null || echo "unknown")
echo "✅ Found Node.js: $NODE_VERSION"
echo ""

# Check for CLI tools
echo "🔍 Checking for CLI tools..."
MISSING_TOOLS=()

if [ ! -f "$MOUNT_POINT/usr/local/bin/claude" ] && [ ! -f "$MOUNT_POINT/usr/bin/claude" ]; then
    MISSING_TOOLS+=("claude")
fi

if [ ! -f "$MOUNT_POINT/usr/local/bin/codex" ] && [ ! -f "$MOUNT_POINT/usr/bin/codex" ]; then
    MISSING_TOOLS+=("codex")
fi

if [ ! -f "$MOUNT_POINT/usr/local/bin/gemini-cli" ] && [ ! -f "$MOUNT_POINT/usr/bin/gemini-cli" ]; then
    MISSING_TOOLS+=("gemini-cli")
fi

if [ ${#MISSING_TOOLS[@]} -gt 0 ]; then
    echo "⚠️  WARNING: Some CLI tools not found: ${MISSING_TOOLS[*]}"
    echo "   OAuth flow will fail for these providers"
    echo ""
fi

# Remove old Python health-server if it exists
if [ -f "$MOUNT_POINT/opt/vm-agent/health-server.py" ]; then
    echo "🗑️  Removing old Python health-server..."
    rm -f "$MOUNT_POINT/opt/vm-agent/health-server.py"
fi

# Install VM browser agent
echo "📥 Installing VM Browser Agent..."

# Create /opt/vm-agent directory
mkdir -p "$MOUNT_POINT/opt/vm-agent"

# Copy Node.js agent
if [ ! -f "$SCRIPT_DIR/vm-browser-agent.js" ]; then
    echo "❌ vm-browser-agent.js not found in $SCRIPT_DIR"
    umount "$MOUNT_POINT"
    exit 1
fi

cp "$SCRIPT_DIR/vm-browser-agent.js" "$MOUNT_POINT/opt/vm-agent/vm-browser-agent.js"
chmod 0755 "$MOUNT_POINT/opt/vm-agent/vm-browser-agent.js"

echo "✅ VM Browser Agent installed"
echo ""

# Install systemd service
echo "⚙️  Installing systemd service..."

# Remove old service if it exists
if [ -f "$MOUNT_POINT/etc/systemd/system/vm-agent.service" ]; then
    rm -f "$MOUNT_POINT/etc/systemd/system/multi-user.target.wants/vm-agent.service"
    rm -f "$MOUNT_POINT/etc/systemd/system/vm-agent.service"
fi

# Copy new service file
cp "$SCRIPT_DIR/vm-browser-agent.service" "$MOUNT_POINT/etc/systemd/system/vm-browser-agent.service"
chmod 0644 "$MOUNT_POINT/etc/systemd/system/vm-browser-agent.service"

# Enable service (create symlink)
mkdir -p "$MOUNT_POINT/etc/systemd/system/multi-user.target.wants"
ln -sf ../vm-browser-agent.service "$MOUNT_POINT/etc/systemd/system/multi-user.target.wants/vm-browser-agent.service"

echo "✅ Systemd service installed and enabled"
echo ""

# Unmount
echo "💾 Unmounting golden rootfs..."
umount "$MOUNT_POINT"

echo ""
echo "=========================================="
echo "✅ INSTALLATION COMPLETE"
echo "=========================================="
echo ""

if [ ${#MISSING_TOOLS[@]} -gt 0 ]; then
    echo "⚠️  NEXT STEPS - Install missing CLI tools:"
    echo ""
    for tool in "${MISSING_TOOLS[@]}"; do
        echo "   ${tool}:"
        case $tool in
            claude)
                echo "   npm install -g @anthropic-ai/claude-cli"
                ;;
            codex)
                echo "   pip install codex-cli"
                ;;
            gemini-cli)
                echo "   pip install gemini-cli"
                ;;
        esac
        echo ""
    done
    echo "   After installing, you'll need to recreate the golden snapshot"
    echo ""
fi

echo "🧪 Testing instructions:"
echo ""
echo "1. Create a test VM:"
echo "   curl -X POST http://192.168.5.82:4000/api/vm/create \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"userId\":\"test-user\",\"vmType\":\"cli\"}' | jq ."
echo ""
echo "2. Wait 5 seconds for VM to boot, then check service status:"
echo "   ssh root@<vm-ip> systemctl status vm-browser-agent"
echo ""
echo "3. Test health endpoint:"
echo "   curl http://<vm-ip>:8080/health"
echo ""
echo "4. Test full OAuth flow:"
echo "   curl -X POST http://192.168.5.82:4000/api/auth/start \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"userId\":\"YOUR_USER_ID\",\"provider\":\"claude_code\"}'"
echo ""
