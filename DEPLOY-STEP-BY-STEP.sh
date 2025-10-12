#!/bin/bash

echo "=========================================="
echo "STEP-BY-STEP DEPLOYMENT HELPER"
echo "=========================================="
echo ""
echo "This script will guide you through manual deployment."
echo ""

# Check if files exist locally
if [ ! -f "master-controller/src/index.js" ]; then
  echo "❌ ERROR: master-controller/src/index.js not found!"
  echo "Are you in the /Users/venkat/Documents/polydev-ai directory?"
  exit 1
fi

if [ ! -f "master-controller/src/services/vm-manager.js" ]; then
  echo "❌ ERROR: master-controller/src/services/vm-manager.js not found!"
  exit 1
fi

echo "✅ Local files found"
echo ""

# Try to ping the server
echo "Checking if server is reachable..."
if ! curl -s -m 5 http://192.168.5.82:4000/health > /dev/null; then
  echo "❌ WARNING: Server at 192.168.5.82:4000 is not responding"
  echo "Continue anyway? (y/n)"
  read -r response
  if [ "$response" != "y" ]; then
    exit 1
  fi
else
  echo "✅ Server is reachable"
fi
echo ""

echo "=========================================="
echo "STEP 1: Copy files to server"
echo "=========================================="
echo ""
echo "Run these commands (you'll be prompted for password 'backspace'):"
echo ""
echo "scp master-controller/src/index.js backspace@192.168.5.82:/tmp/index.js"
echo "scp master-controller/src/services/vm-manager.js backspace@192.168.5.82:/tmp/vm-manager.js"
echo ""
echo "Press ENTER when ready to copy files..."
read -r

scp master-controller/src/index.js backspace@192.168.5.82:/tmp/index.js
if [ $? -ne 0 ]; then
  echo ""
  echo "❌ SCP failed for index.js"
  echo ""
  echo "Alternative: You can use the active SSH session (PID 1085)"
  echo "1. In your active SSH session, run: cat > /tmp/index.js"
  echo "2. Copy the entire contents of master-controller/src/index.js"
  echo "3. Paste into the SSH session"
  echo "4. Press Ctrl+D to finish"
  echo ""
  exit 1
fi

scp master-controller/src/services/vm-manager.js backspace@192.168.5.82:/tmp/vm-manager.js
if [ $? -ne 0 ]; then
  echo ""
  echo "❌ SCP failed for vm-manager.js"
  echo ""
  echo "Alternative: Use the SSH copy-paste method described above"
  echo ""
  exit 1
fi

echo ""
echo "✅ Files copied to /tmp on server"
echo ""

echo "=========================================="
echo "STEP 2: Move files and restart service"
echo "=========================================="
echo ""
echo "Now SSH into the server and run these commands:"
echo ""
echo "ssh backspace@192.168.5.82"
echo ""
echo "sudo cp /tmp/index.js /opt/master-controller/src/index.js"
echo "sudo cp /tmp/vm-manager.js /opt/master-controller/src/services/vm-manager.js"
echo "sudo systemctl restart master-controller"
echo "sleep 5"
echo "sudo systemctl status master-controller --no-pager | head -20"
echo ""
echo "Press ENTER when you've completed these steps..."
read -r

echo ""
echo "=========================================="
echo "STEP 3: Test deployment"
echo "=========================================="
echo ""
echo "Testing canary endpoint..."

response=$(curl -s -m 5 http://192.168.5.82:4000/api/debug/ping)
if echo "$response" | grep -q '"success":true'; then
  echo "✅ Canary endpoint works!"
  echo "Response: $response"
  echo ""
  echo "=========================================="
  echo "DEPLOYMENT SUCCESSFUL!"
  echo "=========================================="
  echo ""
  echo "Next steps:"
  echo ""
  echo "1. Monitor logs in one terminal:"
  echo "   ssh backspace@192.168.5.82 'sudo journalctl -u master-controller -f'"
  echo ""
  echo "2. Test auth endpoint in another terminal:"
  echo "   curl -X POST http://192.168.5.82:4000/api/auth/start \\"
  echo "     -H 'Content-Type: application/json' \\"
  echo "     -d '{\"userId\":\"5abacdd1-6a9b-48ce-b723-ca8056324c7a\",\"provider\":\"claude_code\"}'"
  echo ""
  echo "3. Watch for these logs:"
  echo "   - [REQUEST-ENTRY] - Proves request reached Node.js"
  echo "   - [VM-CREATE] Step 1/2/3/4/5/6 - Shows which step is timing out"
  echo ""
else
  echo "❌ Canary endpoint not responding correctly"
  echo "Response: $response"
  echo ""
  echo "Troubleshooting:"
  echo "1. Check if service is running: ssh backspace@192.168.5.82 'sudo systemctl status master-controller'"
  echo "2. Check recent logs: ssh backspace@192.168.5.82 'sudo journalctl -u master-controller -n 50'"
  echo "3. Verify files were copied correctly"
  echo ""
fi
