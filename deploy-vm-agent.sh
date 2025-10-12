#!/bin/bash
#
# Deploy VM Agent to Production Server
# This script copies files and runs the installation
#

set -e

echo "=========================================="
echo "VM Agent Deployment"
echo "=========================================="
echo ""

SERVER="backspace@192.168.5.82"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "📁 Source directory: $SCRIPT_DIR/vm-agent"
echo "🖥️  Target server: $SERVER"
echo ""

# Step 1: Copy files to server
echo "📤 Copying files to server..."
scp "$SCRIPT_DIR/vm-agent/health-server.py" \
    "$SCRIPT_DIR/vm-agent/vm-agent.service" \
    "$SCRIPT_DIR/vm-agent/install-to-snapshot.sh" \
    "$SERVER:/tmp/"

if [ $? -ne 0 ]; then
    echo "❌ Failed to copy files"
    exit 1
fi

echo "✅ Files copied to /tmp/"
echo ""

# Step 2: Make install script executable
echo "🔧 Making install script executable..."
ssh "$SERVER" "chmod +x /tmp/install-to-snapshot.sh"

echo "✅ Install script ready"
echo ""

# Step 3: Run installation
echo "🚀 Running installation (requires sudo)..."
echo ""
ssh "$SERVER" "sudo /tmp/install-to-snapshot.sh"

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Installation failed"
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ DEPLOYMENT COMPLETE"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Test with: curl -X POST http://192.168.5.82:4000/api/auth/start \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"userId\":\"5abacdd1-6a9b-48ce-b723-ca8056324c7a\",\"provider\":\"claude_code\"}'"
echo ""
echo "2. Monitor logs: ssh $SERVER 'sudo journalctl -u master-controller -f'"
echo ""
