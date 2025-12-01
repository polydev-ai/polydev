#!/bin/bash
# Deploy OAuth fixes to production backend server
# This script copies all modified files and restarts the master-controller service

set -e

SERVER="root@135.181.138.102"
PASSWORD="Venkatesh4158198303"
BASE_DIR="/opt/master-controller"

echo "=========================================="
echo "OAuth Fixes Deployment Script"
echo "=========================================="
echo ""
echo "This will deploy the following fixes:"
echo "  1. Enhanced getSessionStatus() with VM validation"
echo "  2. Improved error messages for destroyed/stopped VMs"
echo "  3. Admin credentials endpoints"
echo "  4. VM process monitoring daemon"
echo ""
echo "Target server: $SERVER"
echo "Target directory: $BASE_DIR"
echo ""

# Function to copy a file to the server
copy_file() {
  local LOCAL_FILE=$1
  local REMOTE_FILE=$2

  echo "Copying: $LOCAL_FILE -> $REMOTE_FILE"
  sshpass -p "$PASSWORD" scp -o StrictHostKeyChecking=no "$LOCAL_FILE" "${SERVER}:${REMOTE_FILE}"
}

# Copy modified files
echo "=== Copying modified files ==="
echo ""

copy_file "src/services/browser-vm-auth.js" "$BASE_DIR/src/services/browser-vm-auth.js"
copy_file "src/routes/auth.js" "$BASE_DIR/src/routes/auth.js"
copy_file "src/routes/admin.js" "$BASE_DIR/src/routes/admin.js"
copy_file "src/index.js" "$BASE_DIR/src/index.js"

# Copy new VM process monitor service
echo ""
echo "Copying new VM process monitor service..."
copy_file "src/services/vm-process-monitor.js" "$BASE_DIR/src/services/vm-process-monitor.js"

echo ""
echo "=== Files deployed successfully ==="
echo ""

# Restart master-controller service
echo "=== Restarting master-controller service ==="
echo ""

sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER" << 'REMOTE_SCRIPT'
echo "Checking master-controller service status before restart..."
systemctl status master-controller --no-pager | head -10
echo ""

echo "Restarting master-controller..."
systemctl restart master-controller

echo "Waiting 3 seconds for service to start..."
sleep 3

echo ""
echo "Checking master-controller service status after restart..."
systemctl status master-controller --no-pager | head -10

echo ""
echo "Checking recent logs..."
journalctl -u master-controller -n 30 --no-pager

echo ""
echo "Testing health endpoint..."
curl -s http://localhost:4000/health | jq .

REMOTE_SCRIPT

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Test the OAuth flow by creating a new session"
echo "  2. Verify process monitor is running (check logs)"
echo "  3. Test admin credentials endpoints"
echo ""
echo "Monitor VM process checks:"
echo "  journalctl -u master-controller -f | grep 'vm-process-monitor'"
echo ""
