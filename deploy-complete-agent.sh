#!/bin/bash
#
# Deploy Complete VM Browser Agent to Production Server
# Replaces the minimal Python health-server.py with full Node.js agent
#

set -e

echo "=========================================="
echo "Complete VM Agent Deployment"
echo "=========================================="
echo ""

SERVER="backspace@192.168.5.82"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "📁 Source directory: $SCRIPT_DIR/vm-agent"
echo "🖥️  Target server: $SERVER"
echo ""

# Step 1: Copy files to server
echo "📤 Copying files to server..."
scp "$SCRIPT_DIR/vm-agent/vm-browser-agent.js" \
    "$SCRIPT_DIR/vm-agent/vm-browser-agent.service" \
    "$SCRIPT_DIR/vm-agent/install-complete-agent.sh" \
    "$SERVER:/tmp/"

if [ $? -ne 0 ]; then
    echo "❌ Failed to copy files"
    exit 1
fi

echo "✅ Files copied to /tmp/"
echo ""

# Step 2: Make install script executable
echo "🔧 Making install script executable..."
ssh "$SERVER" "chmod +x /tmp/install-complete-agent.sh"

echo "✅ Install script ready"
echo ""

# Step 3: Run installation
echo "🚀 Running installation (requires sudo)..."
echo ""
ssh "$SERVER" "sudo /tmp/install-complete-agent.sh"

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
echo "⚠️  IMPORTANT NOTES:"
echo ""
echo "1. The installation script checked for Node.js and CLI tools"
echo "   If any are missing, you'll need to install them first"
echo ""
echo "2. To install Node.js in golden snapshot (if missing):"
echo "   - Boot a test VM from the snapshot"
echo "   - Install Node.js: curl -fsSL https://deb.nodesource.com/setup_20.x | bash -"
echo "   - apt-get install -y nodejs"
echo "   - Recreate golden snapshot from that VM"
echo ""
echo "3. To install CLI tools (if missing):"
echo "   - Claude: npm install -g @anthropic-ai/claude-cli"
echo "   - Codex: pip install codex-cli"
echo "   - Gemini: pip install gemini-cli"
echo ""
echo "🧪 Testing instructions:"
echo ""
echo "1. Test authentication flow:"
echo "   curl -X POST http://192.168.5.82:4000/api/auth/start \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"userId\":\"5abacdd1-6a9b-48ce-b723-ca8056324c7a\",\"provider\":\"claude_code\"}'"
echo ""
echo "2. Monitor logs:"
echo "   ssh $SERVER 'sudo journalctl -u master-controller -f'"
echo ""
echo "3. Open web interface:"
echo "   http://localhost:3002/dashboard/remote-cli/auth"
echo ""
