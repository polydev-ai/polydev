#!/bin/bash

# This script should be run FROM the production server (192.168.5.82)
# after copying the files manually

echo "=========================================="
echo "DEPLOYING FROM PRODUCTION SERVER"
echo "=========================================="
echo ""
echo "This script assumes you're running it FROM 192.168.5.82"
echo "and have already copied the files to /tmp/"
echo ""

# Copy files to correct location
echo "Copying files to /opt/master-controller/..."
sudo cp /tmp/index.js /opt/master-controller/src/index.js
sudo cp /tmp/vm-manager.js /opt/master-controller/src/services/vm-manager.js

echo "Files copied. Restarting service..."
sudo systemctl restart master-controller

echo ""
echo "Waiting 5 seconds for service to start..."
sleep 5

echo ""
echo "Service status:"
sudo systemctl status master-controller --no-pager | head -20

echo ""
echo "=========================================="
echo "DEPLOYMENT COMPLETE"
echo "=========================================="
echo ""
echo "Now test:"
echo "1. curl http://192.168.5.82:4000/api/debug/ping"
echo "2. Monitor logs: sudo journalctl -u master-controller -f"
