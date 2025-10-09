#!/bin/bash
#
# Build Golden Snapshot for Firecracker VMs with Browser Access
# Creates Ubuntu VM with VNC server, noVNC, Chromium, and browser access agent
#
# User Flow:
# 1. Master Controller creates Browser VM
# 2. User accesses web interface with embedded noVNC
# 3. User sees Chromium browser running in VM
# 4. User manually authenticates to OAuth provider
# 5. Agent extracts credentials from browser
# 6. Credentials transferred to CLI VM
#

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
SNAPSHOT_DIR="${FIRECRACKER_BASE:-/var/lib/firecracker}/snapshots/base"
BUILD_DIR="/tmp/fc-golden-build"
ROOTFS_SIZE="8G"  # Increased for GUI + browser
VM_IP="192.168.100.10"
BRIDGE_IP="192.168.100.1"
VNC_PASSWORD="polydev123"  # Change this!

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    if [ "$EUID" -ne 0 ]; then
        log_error "This script must be run as root"
        exit 1
    fi

    command -v firecracker >/dev/null 2>&1 || {
        log_error "firecracker not found"
        exit 1
    }

    command -v debootstrap >/dev/null 2>&1 || {
        log_error "debootstrap not found. Install: apt-get install debootstrap"
        exit 1
    }

    log_info "Prerequisites OK"
}

# Create rootfs
create_rootfs() {
    log_info "Creating rootfs (${ROOTFS_SIZE})..."

    mkdir -p "$BUILD_DIR"
    cd "$BUILD_DIR"

    dd if=/dev/zero of=rootfs.ext4 bs=1M count=8192
    mkfs.ext4 -F rootfs.ext4

    mkdir -p rootfs
    mount -o loop rootfs.ext4 rootfs

    log_info "Rootfs created"
}

# Bootstrap Ubuntu
bootstrap_ubuntu() {
    log_info "Bootstrapping Ubuntu 22.04..."

    debootstrap --arch=amd64 jammy rootfs http://archive.ubuntu.com/ubuntu/

    log_info "Ubuntu bootstrapped"
}

# Configure system
configure_system() {
    log_info "Configuring system..."

    # Hostname
    echo "polydev-browser" > rootfs/etc/hostname

    # Network
    cat > rootfs/etc/netplan/01-netcfg.yaml <<EOF
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: no
      addresses: [${VM_IP}/24]
      gateway4: ${BRIDGE_IP}
      nameservers:
        addresses: [8.8.8.8, 8.8.4.4]
EOF

    # DNS
    echo "nameserver 8.8.8.8" > rootfs/etc/resolv.conf
    echo "nameserver 8.8.4.4" >> rootfs/etc/resolv.conf

    # Root password
    chroot rootfs /bin/bash -c "echo 'root:polydev' | chpasswd"

    # Enable services
    chroot rootfs systemctl enable systemd-networkd
    chroot rootfs systemctl enable systemd-resolved

    log_info "System configured"
}

# Install base packages
install_packages() {
    log_info "Installing base packages..."

    cp /etc/resolv.conf rootfs/etc/resolv.conf

    # Add universe
    chroot rootfs bash -c "echo 'deb http://archive.ubuntu.com/ubuntu jammy universe' >> /etc/apt/sources.list"
    chroot rootfs bash -c "echo 'deb http://archive.ubuntu.com/ubuntu jammy-updates universe' >> /etc/apt/sources.list"

    chroot rootfs apt-get update

    # Essential packages
    chroot rootfs apt-get install -y \
        curl wget git vim htop net-tools iputils-ping \
        ca-certificates gnupg systemd udev dbus \
        python3 python3-pip sqlite3

    # Install Node.js 20
    log_info "Installing Node.js..."
    chroot rootfs bash -c "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -"
    chroot rootfs apt-get install -y nodejs

    NODE_VERSION=$(chroot rootfs node --version)
    log_info "Node.js ${NODE_VERSION} installed"

    log_info "Base packages installed"
}

# Install GUI and VNC
install_vnc() {
    log_info "Installing VNC server and desktop environment..."

    # Install lightweight desktop (Openbox) and VNC
    chroot rootfs apt-get install -y \
        xorg \
        openbox \
        obconf \
        xterm \
        tigervnc-standalone-server \
        tigervnc-common \
        novnc \
        websockify \
        python3-websockify

    # Configure VNC
    mkdir -p rootfs/root/.vnc

    # Set VNC password
    chroot rootfs bash -c "echo '${VNC_PASSWORD}' | vncpasswd -f > /root/.vnc/passwd"
    chmod 600 rootfs/root/.vnc/passwd

    # VNC xstartup
    cat > rootfs/root/.vnc/xstartup <<'EOF'
#!/bin/bash
unset SESSION_MANAGER
unset DBUS_SESSION_BUS_ADDRESS

# Start Openbox window manager
exec openbox-session
EOF

    chmod +x rootfs/root/.vnc/xstartup

    # VNC config
    cat > rootfs/root/.vnc/config <<EOF
geometry=1280x720
depth=24
dpi=96
EOF

    # Create VNC systemd service
    cat > rootfs/etc/systemd/system/vncserver@.service <<'EOF'
[Unit]
Description=VNC Server for Display %i
After=syslog.target network.target

[Service]
Type=forking
User=root
PAMName=login
PIDFile=/root/.vnc/%H:%i.pid
ExecStartPre=/bin/sh -c '/usr/bin/vncserver -kill :%i > /dev/null 2>&1 || :'
ExecStart=/usr/bin/vncserver -localhost no :%i
ExecStop=/usr/bin/vncserver -kill :%i
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

    # Create noVNC systemd service
    cat > rootfs/etc/systemd/system/novnc.service <<EOF
[Unit]
Description=noVNC Web VNC Client
After=vncserver@1.service
Requires=vncserver@1.service

[Service]
Type=simple
User=root
ExecStart=/usr/share/novnc/utils/novnc_proxy --vnc localhost:5901 --listen 6080
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

    # Enable VNC services
    chroot rootfs systemctl enable vncserver@1.service
    chroot rootfs systemctl enable novnc.service

    log_info "VNC installed and configured"
}

# Install Firefox
install_firefox() {
    log_info "Installing Firefox browser from Mozilla PPA..."

    # Add Mozilla Team PPA for real Firefox (not snap wrapper)
    chroot rootfs apt-get install -y software-properties-common
    chroot rootfs add-apt-repository -y ppa:mozillateam/ppa

    # Configure apt to prioritize Mozilla Team PPA over snap
    cat > rootfs/etc/apt/preferences.d/mozilla-firefox <<'EOF'
Package: *
Pin: release o=LP-PPA-mozillateam
Pin-Priority: 1001

Package: firefox
Pin: version 1:1snap1-0ubuntu2
Pin-Priority: -1
EOF

    chroot rootfs apt-get update

    chroot rootfs apt-get install -y \
        firefox \
        fonts-liberation \
        fonts-noto-color-emoji

    log_info "Firefox installed from Mozilla PPA"
}

# Install Browser Agent
install_browser_agent() {
    log_info "Installing VM Browser Agent..."

    # Create agent directory
    mkdir -p rootfs/opt/vm-browser-agent

    # Copy agent files (these should be in the repo)
    if [ -d "/opt/master-controller/vm-browser-agent" ]; then
        cp /opt/master-controller/vm-browser-agent/server.js rootfs/opt/vm-browser-agent/
        cp /opt/master-controller/vm-browser-agent/package.json rootfs/opt/vm-browser-agent/
    else
        log_warn "Browser agent files not found at /opt/master-controller/vm-browser-agent"
        log_warn "Creating placeholder..."

        # Create minimal agent
        cat > rootfs/opt/vm-browser-agent/server.js <<'AGENT_EOF'
const http = require('http');
const PORT = 8080;

http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
}).listen(PORT, () => {
  console.log('VM Browser Agent listening on port', PORT);
});
AGENT_EOF

        cat > rootfs/opt/vm-browser-agent/package.json <<'PKG_EOF'
{
  "name": "vm-browser-agent",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  }
}
PKG_EOF
    fi

    # Install dependencies
    chroot rootfs bash -c "cd /opt/vm-browser-agent && npm install --production"

    # Create systemd service
    cat > rootfs/etc/systemd/system/vm-browser-agent.service <<EOF
[Unit]
Description=VM Browser Agent
After=network.target vncserver@1.service
Wants=vncserver@1.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/vm-browser-agent
Environment=NODE_ENV=production
Environment=DISPLAY=:1
ExecStart=/usr/bin/node /opt/vm-browser-agent/server.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    # Enable service
    chroot rootfs systemctl enable vm-browser-agent.service

    log_info "Browser agent installed"
}

# Cleanup
cleanup_rootfs() {
    log_info "Cleaning up..."

    chroot rootfs apt-get clean
    chroot rootfs apt-get autoremove -y

    rm -rf rootfs/tmp/*
    rm -rf rootfs/var/tmp/*
    rm -rf rootfs/var/cache/apt/archives/*.deb

    log_info "Cleanup complete"
}

# Get kernel
get_kernel() {
    log_info "Getting kernel..."

    mkdir -p "$SNAPSHOT_DIR"

    if [ ! -f "$SNAPSHOT_DIR/vmlinux" ]; then
        wget -O "$SNAPSHOT_DIR/vmlinux" \
            https://s3.amazonaws.com/spec.ccfc.min/img/quickstart_guide/x86_64/kernels/vmlinux.bin
        chmod +x "$SNAPSHOT_DIR/vmlinux"
    fi

    log_info "Kernel ready"
}

# Create snapshot
create_snapshot() {
    log_info "Creating snapshot..."

    umount rootfs

    mkdir -p "$SNAPSHOT_DIR"
    mv rootfs.ext4 "$SNAPSHOT_DIR/golden-rootfs.ext4"

    log_info "Golden snapshot created!"
    log_info "Rootfs: $SNAPSHOT_DIR/golden-rootfs.ext4"
    log_info "Kernel: $SNAPSHOT_DIR/vmlinux"
    log_info ""
    log_info "VNC Configuration:"
    log_info "  VNC Port: 5901"
    log_info "  noVNC Port: 6080"
    log_info "  VNC Password: ${VNC_PASSWORD}"
    log_info "  Agent Port: 8080"
}

# Main
main() {
    log_info "Building golden snapshot with browser access..."

    check_prerequisites
    create_rootfs
    bootstrap_ubuntu
    configure_system
    install_packages
    install_vnc
    install_firefox
    install_browser_agent
    cleanup_rootfs
    get_kernel
    create_snapshot

    log_info "Build complete!"
}

trap 'log_error "Build failed!"; umount rootfs 2>/dev/null || true; exit 1' ERR

main
