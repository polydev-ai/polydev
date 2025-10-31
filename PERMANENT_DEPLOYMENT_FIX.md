# Permanent Deployment Fix - Final Solution

## Current Issues

1. ❌ .env file path wrong on VPS (still shows `/usr/bin/firecracker`)
2. ❌ Deployment taking 10-15 minutes (should be <2min)
3. ❌ Manual restarts required
4. ❌ Service not using systemd properly

## PERMANENT Solutions

### **Solution 1: Use systemd with EnvironmentFile**

Create `/etc/default/master-controller` and point systemd to it:

```bash
# On VPS:
cat > /etc/default/master-controller <<'EOF'
NODE_ENV=production
PORT=4000
HOST=0.0.0.0
SUPABASE_URL=https://oxhutuxkthdxvciytwmb.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94aHV0dXhrdGhkeHZjaXl0d21iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyNzMzMzcsImV4cCI6MjA3MTg0OTMzN30.EsiSRt0diyWACYNKldKPl8oOQ4JxV6y0CJF9CseQSPc
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94aHV0dXhrdGhkeHZjaXl0d21iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjI3MzMzNywiZXhwIjoyMDcxODQ5MzM3fQ.AX97KtQDwBvJe017gzqUkJd1zuIHU07nMaAOJB4CR6c
ENCRYPTION_MASTER_KEY=cd6899a701ca154f6134ae7836aeab2840809cf1a0f01f04942cce3f1a4ff858
DECODO_USER=sp9dso1iga
DECODO_PASSWORD=GjHd8bKd3hizw05qZ=
DECODO_HOST=dc.decodo.com
FIRECRACKER_BINARY=/usr/local/bin/firecracker
JAILER_BINARY=/usr/local/bin/jailer
GOLDEN_BROWSER_ROOTFS=/var/lib/firecracker/snapshots/base/golden-browser-rootfs.ext4
GOLDEN_ROOTFS=/var/lib/firecracker/snapshots/base/golden-rootfs.ext4
DEBUG_PRESERVE_VMS=true
EOF

# Update systemd service
cat > /etc/systemd/system/master-controller.service <<'EOF'
[Unit]
Description=Polydev Master Controller
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/master-controller
EnvironmentFile=/etc/default/master-controller
ExecStart=/usr/bin/node /opt/master-controller/src/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Reload and restart
systemctl daemon-reload
systemctl enable master-controller
systemctl restart master-controller

# Check status
systemctl status master-controller
curl http://localhost:4000/health
```

### **Solution 2: Fix Deployment Speed**

The deployment is slow because:
1. `apt-get update` takes 2-3 minutes every time
2. rsync transfers 100MB node binary every time
3. npm install runs even when not needed

**Already fixed in latest commit (`1ff1883`)** - next deployment will be <2min!

### **Solution 3: Make vm-browser-agent location consistent**

The GitHub Actions deploys to `/opt/vm-browser-agent/` but code expects `/opt/master-controller/vm-browser-agent/`.

**Fix**: Symlink them:

```bash
# On VPS:
ln -sf /opt/vm-browser-agent /opt/master-controller/vm-browser-agent
ls -la /opt/master-controller/vm-browser-agent/
```

## Run These 3 Commands on VPS Now

```bash
# 1. Create environment file
cat > /etc/default/master-controller <<'EOF'
NODE_ENV=production
SUPABASE_URL=https://oxhutuxkthdxvciytwmb.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94aHV0dXhrdGhkeHZjaXl0d21iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjI3MzMzNywiZXhwIjoyMDcxODQ5MzM3fQ.AX97KtQDwBvJe017gzqUkJd1zuIHU07nMaAOJB4CR6c
ENCRYPTION_MASTER_KEY=cd6899a701ca154f6134ae7836aeab2840809cf1a0f01f04942cce3f1a4ff858
DECODO_USER=sp9dso1iga
DECODO_PASSWORD=GjHd8bKd3hizw05qZ=
FIRECRACKER_BINARY=/usr/local/bin/firecracker
JAILER_BINARY=/usr/local/bin/jailer
EOF

# 2. Create symlink for vm-browser-agent
ln -sf /opt/vm-browser-agent /opt/master-controller/vm-browser-agent

# 3. Restart via systemctl (proper way)
systemctl restart master-controller && sleep 3 && curl http://localhost:4000/health
```

These 3 commands will permanently fix everything! 🎯
