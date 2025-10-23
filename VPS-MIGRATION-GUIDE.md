# VPS Migration Guide - From Mini PC to Cloud

**Date**: October 16, 2025
**Status**: Ready for deployment

---

## Quick Decision Guide

### 🏆 Recommended: Hetzner Cloud CPX41
- **Price**: €29/month (~$31 USD)
- **Specs**: 8 vCPUs, 16GB RAM, 240GB NVMe
- **Firecracker**: ✅ Works out of the box
- **Setup Time**: ~30 minutes
- **Link**: https://www.hetzner.com/cloud

### 💰 Budget Option: Contabo Cloud VPS L
- **Price**: ~$19/month
- **Specs**: 8 vCPUs, 16GB RAM, 400GB SSD
- **Firecracker**: ⚠️ Must verify KVM support
- **Setup Time**: ~45 minutes (includes verification)
- **Link**: https://contabo.com (you already have account)

---

## Step-by-Step Migration

### Phase 1: VPS Selection & Provisioning (15 min)

#### Option A: Hetzner (Recommended)

1. **Sign up**: https://console.hetzner.cloud/
   - May require ID verification (be patient)
   - Choose a project name (e.g., "polydev-production")

2. **Create Server**:
   - **Location**: Choose closest to you (US East/West or EU)
   - **Image**: Ubuntu 22.04
   - **Type**: CPX41 (8 vCPU, 16GB RAM, 240GB NVMe)
   - **SSH Key**: Add your public key (`~/.ssh/id_rsa.pub`)
   - **Networking**: Enable IPv4 & IPv6
   - Click "Create & Buy"

3. **Wait for provisioning** (~2 minutes)

4. **Note your server IP**: e.g., `1.2.3.4`

#### Option B: Contabo (Budget)

1. **Login**: https://my.contabo.com/
2. **Order**: Cloud VPS L
   - **Location**: Choose US or EU
   - **OS**: Ubuntu 22.04
   - **SSH Key**: Add your key
3. **Wait for provisioning** (~10-15 minutes, slower than Hetzner)
4. **Note your server IP**

---

### Phase 2: Verify KVM Support (5 min)

**CRITICAL**: Before proceeding, verify Firecracker will work:

```bash
# SSH into your new VPS
ssh root@YOUR_VPS_IP

# Check for virtualization support
egrep -c '(vmx|svm)' /proc/cpuinfo
# Expected: Number > 0 (should equal your vCPU count)

# Check for KVM device
ls -la /dev/kvm
# Expected: crw-rw-rw- 1 root kvm ... /dev/kvm

# Install KVM checker
apt update && apt install -y cpu-checker
kvm-ok
# Expected: "KVM acceleration can be used"
```

**If any of these fail**:
- **Hetzner**: This is very unlikely. Contact support if it happens.
- **Contabo**: This is possible. Contact support or switch to Hetzner.

---

### Phase 3: Install Dependencies (10 min)

```bash
# Update system
apt update && apt upgrade -y

# Install essential packages
apt install -y \
  curl \
  git \
  build-essential \
  jq \
  iptables \
  net-tools \
  bridge-utils

# Install Node.js 20.x (for master-controller)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify Node.js
node --version  # Should show v20.x
npm --version   # Should show v10.x

# Install Firecracker
FIRECRACKER_VERSION="v1.9.1"
curl -Lo firecracker.tgz \
  https://github.com/firecracker-microvm/firecracker/releases/download/${FIRECRACKER_VERSION}/firecracker-${FIRECRACKER_VERSION}-x86_64.tgz

tar -xzf firecracker.tgz
mv release-${FIRECRACKER_VERSION}-x86_64/firecracker-${FIRECRACKER_VERSION}-x86_64 /usr/local/bin/firecracker
chmod +x /usr/local/bin/firecracker

# Verify Firecracker
firecracker --version
# Expected: Firecracker v1.9.1

# Clean up
rm -rf release-* firecracker.tgz
```

---

### Phase 4: Setup Networking (10 min)

Firecracker needs TAP interfaces for VM networking.

```bash
# Enable IP forwarding
echo 'net.ipv4.ip_forward=1' >> /etc/sysctl.conf
sysctl -p

# Create network setup script
cat > /opt/setup-firecracker-network.sh << 'EOF'
#!/bin/bash
# Setup TAP interfaces for Firecracker VMs

# IP pool for Browser VMs: 192.168.100.0/24
BRIDGE_IP="192.168.100.1"
BRIDGE_NAME="br0"

# Create bridge if not exists
if ! ip link show $BRIDGE_NAME &> /dev/null; then
  ip link add name $BRIDGE_NAME type bridge
  ip addr add ${BRIDGE_IP}/24 dev $BRIDGE_NAME
  ip link set dev $BRIDGE_NAME up
  echo "Created bridge $BRIDGE_NAME with IP $BRIDGE_IP"
fi

# Setup iptables for NAT
iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
iptables -A FORWARD -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
iptables -A FORWARD -i $BRIDGE_NAME -o eth0 -j ACCEPT

echo "Firecracker network setup complete"
EOF

chmod +x /opt/setup-firecracker-network.sh

# Run network setup
/opt/setup-firecracker-network.sh

# Make it persistent on reboot
cat > /etc/systemd/system/firecracker-network.service << 'EOF'
[Unit]
Description=Firecracker Network Setup
After=network.target

[Service]
Type=oneshot
ExecStart=/opt/setup-firecracker-network.sh
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable firecracker-network
systemctl start firecracker-network
```

---

### Phase 5: Deploy Master-Controller (15 min)

```bash
# Create directory structure
mkdir -p /opt/master-controller
mkdir -p /var/lib/firecracker/snapshots/base
mkdir -p /var/lib/firecracker/users

# Clone your polydev-ai repo (from your local machine)
# On your LOCAL machine, compress and upload master-controller:
# tar -czf master-controller.tar.gz master-controller/
# scp master-controller.tar.gz root@YOUR_VPS_IP:/opt/

# On VPS: Extract
cd /opt
tar -xzf master-controller.tar.gz
cd master-controller

# Install dependencies
npm install

# Create .env file
cat > .env << 'EOF'
NODE_ENV=production
PORT=4000
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
FIRECRACKER_BINARY=/usr/local/bin/firecracker
GOLDEN_ROOTFS=/var/lib/firecracker/snapshots/base/golden-rootfs.ext4
GOLDEN_BROWSER_ROOTFS=/var/lib/firecracker/snapshots/base/golden-browser-rootfs.ext4
KERNEL_IMAGE=/var/lib/firecracker/vmlinux.bin
VM_IP_POOL_START=192.168.100.2
VM_IP_POOL_END=192.168.100.254
EOF

# Edit .env with your actual Supabase credentials
nano .env

# Create systemd service
cat > /etc/systemd/system/master-controller.service << 'EOF'
[Unit]
Description=Polydev Master Controller
After=network.target firecracker-network.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/master-controller
ExecStart=/usr/bin/node /opt/master-controller/src/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable master-controller
# Don't start yet - need kernel and golden snapshot first
```

---

### Phase 6: Transfer Golden Snapshot & Kernel (20 min)

You need to recover the golden snapshot from your dead mini PC's hard drive.

#### Option 1: If Mini PC Hard Drive is Accessible

1. **Remove hard drive** from mini PC
2. **Connect to another computer** (USB adapter or direct SATA)
3. **Mount the drive**:
   ```bash
   # On recovery machine
   sudo mkdir /mnt/mini-pc
   sudo mount /dev/sdX1 /mnt/mini-pc  # Replace sdX1 with actual device
   ```

4. **Copy golden snapshot**:
   ```bash
   # Find the snapshot
   sudo find /mnt/mini-pc -name "golden-browser-rootfs.ext4"
   # Should be: /mnt/mini-pc/var/lib/firecracker/snapshots/base/golden-browser-rootfs.ext4

   # Compress it (8GB → ~2GB)
   sudo tar -czf golden-browser-snapshot.tar.gz \
     -C /mnt/mini-pc/var/lib/firecracker/snapshots/base \
     golden-browser-rootfs.ext4

   # Copy to your local machine
   cp golden-browser-snapshot.tar.gz ~/Downloads/
   ```

5. **Copy kernel image**:
   ```bash
   sudo find /mnt/mini-pc -name "vmlinux.bin"
   # Should be: /mnt/mini-pc/var/lib/firecracker/vmlinux.bin

   sudo cp /mnt/mini-pc/var/lib/firecracker/vmlinux.bin ~/Downloads/
   ```

6. **Upload to VPS**:
   ```bash
   # From your local machine
   scp ~/Downloads/golden-browser-snapshot.tar.gz root@YOUR_VPS_IP:/tmp/
   scp ~/Downloads/vmlinux.bin root@YOUR_VPS_IP:/var/lib/firecracker/

   # On VPS
   cd /var/lib/firecracker/snapshots/base
   tar -xzf /tmp/golden-browser-snapshot.tar.gz
   chmod 644 golden-browser-rootfs.ext4
   ```

#### Option 2: If Mini PC Hard Drive is Dead (Rebuild from Scratch)

If the hard drive is also dead, we need to rebuild the golden snapshot:

```bash
# On VPS
cd /opt/master-controller/scripts

# Run golden snapshot build
./build-golden-snapshot.sh

# This will:
# 1. Download Ubuntu 22.04 cloud image
# 2. Install Chromium, VNC services, OAuth agent
# 3. Create golden-browser-rootfs.ext4
# 4. Takes ~15-20 minutes
```

**Download kernel separately**:
```bash
cd /var/lib/firecracker
curl -Lo vmlinux.bin \
  https://s3.amazonaws.com/spec.ccfc.min/firecracker-ci/v1.9/x86_64/vmlinux-5.10.225
chmod 644 vmlinux.bin
```

---

### Phase 7: Start Master-Controller (5 min)

```bash
# Verify everything is in place
ls -lh /var/lib/firecracker/vmlinux.bin
# Should show: ~10-15MB

ls -lh /var/lib/firecracker/snapshots/base/golden-browser-rootfs.ext4
# Should show: ~8GB

# Start master-controller
systemctl start master-controller

# Check status
systemctl status master-controller
# Should show: "Active: active (running)"

# Check logs
journalctl -u master-controller -f
# Should show: Server started on port 4000

# Test API
curl http://localhost:4000/api/health
# Should return: {"status":"ok"}
```

---

### Phase 8: Update Frontend Configuration (5 min)

Update your Next.js frontend to point to the new VPS:

```bash
# On your local machine
cd /Users/venkat/Documents/polydev-ai

# Edit .env.local
nano .env.local
```

Change:
```env
MASTER_CONTROLLER_URL=http://YOUR_VPS_IP:4000
```

**If you want to use a domain name** (recommended):

1. **Add A record** in your DNS:
   - `api.polydev.ai` → `YOUR_VPS_IP`

2. **Setup Nginx reverse proxy** on VPS:
   ```bash
   apt install -y nginx certbot python3-certbot-nginx

   cat > /etc/nginx/sites-available/master-controller << 'EOF'
   server {
       listen 80;
       server_name api.polydev.ai;

       location / {
           proxy_pass http://localhost:4000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   EOF

   ln -s /etc/nginx/sites-available/master-controller /etc/nginx/sites-enabled/
   nginx -t && systemctl reload nginx

   # Get SSL certificate
   certbot --nginx -d api.polydev.ai
   ```

3. **Update frontend**:
   ```env
   MASTER_CONTROLLER_URL=https://api.polydev.ai
   ```

---

### Phase 9: Test OAuth Flow (10 min)

```bash
# On your local machine
npm run dev

# Open browser
# Navigate to http://localhost:3001/dashboard
# Click "Connect Claude CLI"

# Expected:
# 1. VM creates successfully (check VPS: journalctl -u master-controller -f)
# 2. Browser modal opens
# 3. Chromium displays Claude OAuth page (NOT black screen)
# 4. Complete authentication
# 5. Session becomes "ready"
```

---

## Troubleshooting

### Issue: KVM not available

```bash
# Check CPU virtualization flags
cat /proc/cpuinfo | grep -E '(vmx|svm)'

# If empty, your VPS doesn't support nested virtualization
# → Switch to Hetzner or contact provider
```

### Issue: Firecracker fails to start VM

```bash
# Check logs
journalctl -u master-controller -n 100

# Common issues:
# 1. /dev/kvm permissions
sudo chmod 666 /dev/kvm

# 2. Missing kernel
ls -la /var/lib/firecracker/vmlinux.bin

# 3. Missing snapshot
ls -la /var/lib/firecracker/snapshots/base/
```

### Issue: VMs can't reach internet

```bash
# Check bridge
ip addr show br0
# Should show: 192.168.100.1/24

# Check iptables
iptables -t nat -L -n -v | grep MASQUERADE
# Should show: MASQUERADE rule for eth0

# Rerun network setup
/opt/setup-firecracker-network.sh
```

### Issue: OAuth agent shows errors in console

```bash
# Get most recent Browser VM
VM_DIR=$(ls -t /var/lib/firecracker/users/ | head -1)

# Check console logs
tail -100 /var/lib/firecracker/users/$VM_DIR/console.log

# Look for Node.js errors, missing modules, etc.
# With our console logging fix, errors will be visible here
```

---

## Cost Comparison

| Provider | Plan | Monthly Cost | Setup Fee | Annual Cost |
|----------|------|--------------|-----------|-------------|
| **Hetzner CPX41** | 8 vCPU, 16GB, 240GB | $31 | $0 | $372 |
| **Contabo VPS L** | 8 vCPU, 16GB, 400GB | $19 | $5 | $233 |
| **DigitalOcean** | 8 vCPU, 16GB, 160GB | $168 | $0 | $2,016 |
| **Vultr** | 8 vCPU, 16GB, 250GB | $120 | $0 | $1,440 |

**Savings with Hetzner**: $1,644/year vs DigitalOcean, $1,068/year vs Vultr

---

## Next Steps

1. ✅ Choose VPS provider (Hetzner recommended)
2. ✅ Provision server
3. ✅ Verify KVM support
4. ✅ Install dependencies
5. ✅ Setup networking
6. ✅ Deploy master-controller
7. ✅ Transfer or rebuild golden snapshot
8. ✅ Update frontend configuration
9. ✅ Test OAuth flow

**Estimated total time**: 2-3 hours (including waiting for provisioning)

---

## Support

- **Hetzner Docs**: https://docs.hetzner.com/
- **Firecracker Docs**: https://github.com/firecracker-microvm/firecracker/tree/main/docs
- **Polydev Issues**: Create issue in your repo if you encounter problems

---

**Status**: Ready to deploy! Let me know which provider you choose and I'll help with the migration.
