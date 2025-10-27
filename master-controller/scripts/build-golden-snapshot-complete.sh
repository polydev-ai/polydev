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

    # Create systemd network directory
    mkdir -p rootfs/etc/systemd/network

    # Use systemd.network directly (more reliable than netplan for Firecracker)
    # This allows both DHCP and static IP via kernel parameters
    cat > rootfs/etc/systemd/network/10-eth0.network <<EOF
[Match]
Name=eth0

[Network]
# First try DHCP
DHCP=ipv4

# Also accept static IP from kernel parameters
LinkLocalAddressing=ipv6

[DHCPv4]
RouteMetric=100
UseDNS=yes

[IPv6AcceptRA]
IPv6Token=::1
EOF

    # Create a fallback network config for static IP if DHCP fails
    cat > rootfs/etc/systemd/network/20-eth0-fallback.network <<EOF
[Match]
Name=eth0

[Network]
# Fallback static IP (can be overridden by kernel ip= parameter)
Address=${VM_IP}/24
Gateway=${BRIDGE_IP}
DNS=8.8.8.8
DNS=8.8.4.4

[Route]
Destination=0.0.0.0/0
Gateway=${BRIDGE_IP}
EOF

    # Enable systemd-network-generator to process kernel parameters
    # This processes the 'ip=' kernel boot parameter
    mkdir -p rootfs/etc/systemd
    cat > rootfs/etc/systemd/network-generator.enabled <<EOF
# This file enables systemd-network-generator
# It will process kernel command-line parameters like:
# ip=192.168.100.2::192.168.100.1:255.255.255.0::eth0:on
EOF

    # Also create a systemd service that explicitly enables eth0 from kernel params
    cat > rootfs/etc/systemd/system/setup-network-kernel-params.service <<'EOF'
[Unit]
Description=Setup Network from Kernel Parameters
Before=systemd-networkd.service
Before=network-pre.target
DefaultDependencies=no

[Service]
Type=oneshot
ExecStart=/usr/local/bin/setup-network-kernel-params.sh
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

    # Create the helper script that processes kernel parameters
    cat > rootfs/usr/local/bin/setup-network-kernel-params.sh <<'EOF'
#!/bin/bash
# Parse kernel command line for ip= parameter and apply network config
# Format: ip=<client-ip>:<server-ip>:<gw-ip>:<netmask>:<hostname>:<device>:<autoconf>

# Check if ip parameter is set in kernel command line
if grep -q "ip=" /proc/cmdline; then
    ip_param=$(grep -oP 'ip=\S+' /proc/cmdline | head -1 | cut -d= -f2)

    if [ -n "$ip_param" ]; then
        echo "Found kernel IP parameter: $ip_param" >> /tmp/network-setup.log

        # Parse components
        IFS=':' read -r client_ip server_ip gw_ip netmask hostname device autoconf <<< "$ip_param"

        # Only proceed if we have at least client_ip and gateway
        if [ -n "$client_ip" ] && [ -n "$gw_ip" ] && [ -n "$device" ]; then
            echo "Setting up $device: $client_ip gw $gw_ip" >> /tmp/network-setup.log

            # Bring up the interface
            ip link set "$device" up

            # Assign IP address
            if [ -n "$netmask" ] && [ "$netmask" != "0.0.0.0" ]; then
                # Convert netmask to CIDR notation if possible
                ip addr add "$client_ip/$netmask" dev "$device" 2>/dev/null || \
                ip addr add "$client_ip/24" dev "$device" 2>/dev/null
            else
                ip addr add "$client_ip/24" dev "$device"
            fi

            # Add default route via gateway
            ip route add default via "$gw_ip" dev "$device" 2>/dev/null || true

            echo "Network setup complete for $device at $(date)" >> /tmp/network-setup.log
        fi
    fi
else
    echo "No kernel IP parameter found, relying on DHCP" >> /tmp/network-setup.log
fi
EOF
    chmod +x rootfs/usr/local/bin/setup-network-kernel-params.sh

    # DNS resolution - use systemd-resolved
    echo "nameserver 8.8.8.8" > rootfs/etc/resolv.conf
    echo "nameserver 8.8.4.4" >> rootfs/etc/resolv.conf

    # Root password
    chroot rootfs /bin/bash -c "echo 'root:polydev' | chpasswd"

    # Enable network services
    chroot rootfs systemctl enable systemd-networkd
    chroot rootfs systemctl enable systemd-resolved
    chroot rootfs systemctl enable setup-network-kernel-params.service 2>/dev/null || true

    log_info "System configured with network support"
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
Type=simple
User=root
ExecStartPre=/bin/sh -c '/usr/bin/vncserver -kill :%i > /dev/null 2>&1 || :'
ExecStart=/usr/bin/vncserver -fg -localhost no -geometry 1920x1080 -depth 24 :%i
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
ExecStart=/usr/bin/websockify --web=/usr/share/novnc 0.0.0.0:6080 localhost:5901
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

# Install browsers (Firefox + Chromium)
install_browsers() {
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

    log_info "Installing Chromium browser..."
    chroot rootfs apt-get update
    if ! chroot rootfs apt-get install -y chromium-browser; then
        log_warn "chromium-browser package install failed, attempting snap installation"
        chroot rootfs apt-get install -y snapd
        chroot rootfs snap install chromium
    fi
    chroot rootfs bash -c 'if [ -x /snap/bin/chromium ] && [ ! -e /usr/bin/chromium-browser ]; then ln -sf /snap/bin/chromium /usr/bin/chromium-browser; fi'

    log_info "Browsers installed"
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
After=setup-network-kernel-params.service systemd-networkd.service network-online.target network.target vncserver@1.service
Wants=network-online.target vncserver@1.service
RequiresMountsFor=/opt/vm-browser-agent

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
    install_browsers
    install_browser_agent
    cleanup_rootfs
    get_kernel
    create_snapshot

    log_info "Build complete!"
}

trap 'log_error "Build failed!"; umount rootfs 2>/dev/null || true; exit 1' ERR

main
