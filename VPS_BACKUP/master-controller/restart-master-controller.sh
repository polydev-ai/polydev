#!/bin/bash

# Restart master-controller to apply CSP fix
echo "Restarting master-controller service..."
sudo systemctl restart master-controller

echo ""
echo "Waiting for service to stabilize..."
sleep 3

echo ""
echo "Service status:"
sudo systemctl status master-controller --no-pager -l

echo ""
echo "Recent logs:"
sudo journalctl -u master-controller -n 20 --no-pager
