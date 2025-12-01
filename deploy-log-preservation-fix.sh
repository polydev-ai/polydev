#!/bin/bash
# VM Debug Log Preservation Fix - Deployment Script
# This script deploys the log preservation fix to enable debugging of OAuth agent failures

set -e

echo "======================================"
echo "VM Debug Log Preservation Fix Deployment"
echo "======================================"
echo ""

# Check if we're on the right machine
if [ "$(hostname)" != "polydev-vps" ]; then
    echo "⚠️  WARNING: This script should be run on the polydev-vps server (135.181.138.102)"
    echo "   Current hostname: $(hostname)"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled."
        exit 1
    fi
fi

echo "Step 1: Stopping master controller..."
pkill -9 node || true
sleep 2
echo "✓ Master controller stopped"
echo ""

echo "Step 2: Copying fixed vm-manager.js..."
if [ -f "/Users/venkat/Documents/polydev-ai/master-controller/src/services/vm-manager.js" ]; then
    cp /Users/venkat/Documents/polydev-ai/master-controller/src/services/vm-manager.js /opt/master-controller/src/services/vm-manager.js
    echo "✓ File copied from /Users/venkat/Documents/polydev-ai/master-controller/src/services/vm-manager.js"
elif [ -f "$(pwd)/src/services/vm-manager.js" ]; then
    cp "$(pwd)/src/services/vm-manager.js" /opt/master-controller/src/services/vm-manager.js
    echo "✓ File copied from $(pwd)/src/services/vm-manager.js"
else
    echo "❌ ERROR: Could not find vm-manager.js"
    echo "   Looking in:"
    echo "   - /Users/venkat/Documents/polydev-ai/master-controller/src/services/vm-manager.js"
    echo "   - $(pwd)/src/services/vm-manager.js"
    exit 1
fi
echo ""

echo "Step 3: Starting master controller..."
cd /opt/master-controller
nohup node src/index.js > logs/master-controller.log 2>&1 &
sleep 5
echo "✓ Master controller started"
echo ""

echo "Step 4: Verifying deployment..."
sleep 2
HEALTH=$(curl -s http://localhost:4000/health)
if echo "$HEALTH" | grep -q "healthy"; then
    echo "✓ Master controller is healthy"
    echo "   Response: $HEALTH"
else
    echo "❌ WARNING: Master controller health check failed"
    echo "   Response: $HEALTH"
    echo ""
    echo "Check logs: tail -50 /opt/master-controller/logs/master-controller.log"
fi
echo ""

echo "======================================"
echo "✓ Deployment Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Create a test VM that will fail:"
echo "   curl -X POST http://localhost:4000/api/auth/start \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"userId\": \"test-debug-logs\", \"provider\": \"claude_code\"}'"
echo ""
echo "2. Wait 3 minutes for VM to timeout and be cleaned up"
echo ""
echo "3. Check for preserved logs:"
echo "   ls -lth /var/log/vm-debug-logs/"
echo ""
echo "4. View the console log:"
echo "   cat /var/log/vm-debug-logs/vm-*-console-*.log | tail -100"
echo ""
echo "The fix will preserve console logs for all failed VMs,"
echo "allowing us to debug why the OAuth agent fails to start."
echo ""
