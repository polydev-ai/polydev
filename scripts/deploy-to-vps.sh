#!/bin/bash

#
# Deploy Polydev AI to VPS
# Syncs master-controller, vm-browser-agent, and scripts to production
#
# Usage:
#   bash scripts/deploy-to-vps.sh
#

set -e

VPS_HOST="135.181.138.102"
VPS_USER="root"
VPS_PASSWORD="Venkatesh4158198303"

echo "========================================="
echo "🚀 Deploying Polydev AI to VPS"
echo "========================================="
echo ""

# Check if sshpass is available
if ! command -v sshpass &> /dev/null; then
    echo "⚠️  sshpass not found. Install it first:"
    echo "   macOS: brew install sshpass"
    echo "   Ubuntu: sudo apt-get install sshpass"
    exit 1
fi

echo "[1/5] Syncing master-controller..."
sshpass -p "$VPS_PASSWORD" rsync -avz --delete --exclude 'node_modules' --exclude '.git' \
  -e "ssh -o StrictHostKeyChecking=no" \
  ./master-controller/ \
  $VPS_USER@$VPS_HOST:/opt/master-controller/

echo "[2/5] Syncing vm-browser-agent..."
sshpass -p "$VPS_PASSWORD" rsync -avz --delete --exclude 'node_modules' --exclude '.git' \
  -e "ssh -o StrictHostKeyChecking=no" \
  ./vm-browser-agent/ \
  $VPS_USER@$VPS_HOST:/opt/vm-browser-agent/

echo "[3/5] Syncing scripts..."
sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no \
  $VPS_USER@$VPS_HOST "mkdir -p /opt/scripts"

sshpass -p "$VPS_PASSWORD" rsync -avz \
  -e "ssh -o StrictHostKeyChecking=no" \
  ./scripts/ \
  $VPS_USER@$VPS_HOST:/opt/scripts/

echo "[4/5] Restarting master-controller..."
sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no \
  $VPS_USER@$VPS_HOST "pkill -HUP -f 'node.*index.js' || echo 'Process restart triggered'"

echo "[5/5] Waiting for service to restart..."
sleep 3

echo ""
echo "========================================="
echo "✅ Deployment Complete!"
echo "========================================="
echo ""
echo "🏥 Health check:"
sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no \
  $VPS_USER@$VPS_HOST "curl -s http://localhost:4000/health | jq . || curl -s http://localhost:4000/health"

echo ""
echo "📊 Service status:"
sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no \
  $VPS_USER@$VPS_HOST "ps aux | grep -E 'node.*index.js' | grep -v grep"

echo ""
echo "Next steps:"
echo "1. Test from: http://localhost:3000/dashboard/remote-cli"
echo "2. Check logs: ssh root@$VPS_HOST 'tail -f /opt/master-controller/logs/master-controller.log'"
echo ""
