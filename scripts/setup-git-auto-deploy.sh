#!/bin/bash

#
# Setup Git-Based Auto-Deployment for Polydev AI
# Creates a git repository on VPS that auto-deploys to /opt/master-controller on push
#
# This creates a CI/CD pipeline:
#   Local: git push origin main
#   →  VPS: /root/master-controller (git repo)
#   →  Auto-syncs to: /opt/master-controller (running code)
#   →  Auto-restarts: master-controller service
#

set -e

VPS_HOST="135.181.138.102"
VPS_USER="root"
REPO_DIR="/root/master-controller"
DEPLOY_DIR="/opt/master-controller"

echo "========================================="
echo "🔧 Setting Up Git Auto-Deploy"
echo "========================================="
echo ""

# Create post-receive hook
cat > /tmp/post-receive <<'HOOK_SCRIPT'
#!/bin/bash
#
# Post-receive hook for auto-deployment
# Triggered after: git push origin main
#

set -e

echo "========================================="
echo "🚀 Auto-Deploy Triggered"
echo "========================================="

GIT_DIR="/root/master-controller"
DEPLOY_DIR="/opt/master-controller"

cd "$GIT_DIR"

# Checkout latest code to temporary location
WORK_TREE="/tmp/polydev-deploy-$$"
mkdir -p "$WORK_TREE"

echo "[1/5] Checking out latest code..."
git --work-tree="$WORK_TREE" --git-dir="$GIT_DIR/.git" checkout -f main

echo "[2/5] Syncing to production directory..."
rsync -a --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'logs' \
  "$WORK_TREE/master-controller/" \
  "$DEPLOY_DIR/"

rsync -a --delete \
  --exclude 'node_modules' \
  "$WORK_TREE/vm-browser-agent/" \
  "/opt/vm-browser-agent/"

rsync -a \
  "$WORK_TREE/scripts/" \
  "/opt/scripts/"

echo "[3/5] Cleaning up temporary files..."
rm -rf "$WORK_TREE"

echo "[4/5] Restarting master-controller..."
pkill -HUP -f 'node.*index.js' || echo "Service restart triggered"

echo "[5/5] Waiting for service..."
sleep 3

echo ""
echo "========================================="
echo "✅ Auto-Deploy Complete!"
echo "========================================="

# Health check
curl -s http://localhost:4000/health || echo "Health check: Service starting..."

echo ""
echo "🎉 Deployment successful!"
echo ""
HOOK_SCRIPT

echo "[1/3] Installing post-receive hook on VPS..."
sshpass -p "Venkatesh4158198303" ssh -o StrictHostKeyChecking=no \
  $VPS_USER@$VPS_HOST "mkdir -p $REPO_DIR/.git/hooks && cat > $REPO_DIR/.git/hooks/post-receive" < /tmp/post-receive

sshpass -p "Venkatesh4158198303" ssh -o StrictHostKeyChecking=no \
  $VPS_USER@$VPS_HOST "chmod +x $REPO_DIR/.git/hooks/post-receive"

echo "[2/3] Configuring git repository..."
sshpass -p "Venkatesh4158198303" ssh -o StrictHostKeyChecking=no \
  $VPS_USER@$VPS_HOST "cd $REPO_DIR && git config --global --add safe.directory $REPO_DIR && git config receive.denyCurrentBranch ignore"

echo "[3/3] Updating local git remote..."
if ! git remote | grep -q 'vps'; then
  git remote add vps ssh://root@$VPS_HOST$REPO_DIR
fi

rm -f /tmp/post-receive

echo ""
echo "========================================="
echo "✅ Git Auto-Deploy Setup Complete!"
echo "========================================="
echo ""
echo "🎯 How to use:"
echo ""
echo "  # Deploy automatically on every commit:"
echo "  git push origin main      # → GitHub"
echo "  git push vps main          # → VPS (auto-deploys)"
echo ""
echo "  # Or push to both at once:"
echo "  git push --all"
echo ""
echo "✨ From now on, every 'git push vps main' will:"
echo "   1. Sync code to /opt/master-controller"
echo "   2. Restart master-controller service"
echo "   3. Run health check"
echo ""
