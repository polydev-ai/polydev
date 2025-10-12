#!/bin/bash

echo "=========================================="
echo "CRITICAL FIX DEPLOYMENT"
echo "=========================================="
echo ""
echo "This script deploys the diagnostic fixes to identify the 24-second timeout issue."
echo ""

# SSH into production server
echo "Deploying to production server at 192.168.5.82..."
echo ""

# Copy files
scp -o StrictHostKeyChecking=no master-controller/src/index.js backspace@192.168.5.82:/opt/master-controller/src/index.js
scp -o StrictHostKeyChecking=no master-controller/src/services/vm-manager.js backspace@192.168.5.82:/opt/master-controller/src/services/vm-manager.js

# Restart service
echo ""
echo "Restarting master-controller service..."
ssh -o StrictHostKeyChecking=no backspace@192.168.5.82 "sudo systemctl restart master-controller"

echo ""
echo "Waiting 5 seconds for service to start..."
sleep 5

# Check service status
echo ""
echo "Checking service status..."
ssh -o StrictHostKeyChecking=no backspace@192.168.5.82 "sudo systemctl status master-controller --no-pager | head -20"

echo ""
echo "=========================================="
echo "DEPLOYMENT COMPLETE"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Test the canary endpoint:"
echo "   curl http://192.168.5.82:4000/api/debug/ping"
echo ""
echo "2. Test auth endpoint and monitor logs in real-time:"
echo "   ssh backspace@192.168.5.82 'sudo journalctl -u master-controller -f'"
echo ""
echo "3. In another terminal, run:"
echo "   curl -X POST http://192.168.5.82:4000/api/auth/start \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"userId\":\"5abacdd1-6a9b-48ce-b723-ca8056324c7a\",\"provider\":\"claude_code\"}'"
echo ""
echo "You should now see:"
echo "  [REQUEST-ENTRY] logs - Proves request reached Node.js"
echo "  [VM-CREATE] logs - Shows which step is timing out"
echo ""
