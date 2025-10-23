#!/bin/bash
# Remote deployment script - to be executed on 192.168.5.82

echo "=== Deploying master-controller updates ==="
echo ""

cd /opt/master-controller || exit 1

echo "[1/3] Pulling latest changes..."
git pull origin main

echo ""
echo "[2/3] Restarting master-controller service..."
pm2 restart master-controller

echo ""
echo "[3/3] Checking service status..."
pm2 info master-controller

echo ""
echo "=== Deployment Complete ==="
echo "New IP pool initialization active - prevents IP collisions"
