#!/bin/bash
#
# Production Golden Snapshot Build Script
# Based on Daytona and OnKernel best practices
#
# Creates a comprehensive Ubuntu 22.04 rootfs with:
# - Node v20 (REQUIRED for CLI tools)
# - All 3 CLI tools (@openai/codex, @anthropic-ai/claude-code, @google/gemini-cli)
# - Systemd services for VNC, Xvfb, and desktop (NOT bash supervisor)
# - Desktop environment with auto-launched terminal
# - Chrome browser
# - Proxy configuration template
#
# Philosophy: Pre-build EVERYTHING, inject minimal env vars at runtime
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Configuration
SNAPSHOT_DIR="${FIRECRACKER_BASE:-/var/lib/firecracker}/snapshots/base"
BUILD_DIR="/tmp/fc-golden-production-build"
ROOTFS_SIZE="10G"  # Increased for all packages and CLI tools
ROOTFS_NAME="golden-rootfs-production.ext4"

# Check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites..."

    if [ "$EUID" -ne 0 ]; then
        log_error "This script must be run as root"
        exit 1
    fi

    command -v debootstrap >/dev/null 2>&1 || {
        log_error "debootstrap not found. Install with: apt-get install debootstrap"
        exit 1
    }

    log_info "Prerequisites OK"
}

# Create rootfs image
create_rootfs() {
    log_step "Creating rootfs image (${ROOTFS_SIZE})..."

    # Clean up old build if exists
    if [ -d "$BUILD_DIR" ]; then
        log_warn "Cleaning up previous build directory..."
        umount -l "$BUILD_DIR/rootfs" 2>/dev/null || true
        rm -rf "$BUILD_DIR"
    fi

    mkdir -p "$BUILD_DIR"
    cd "$BUILD_DIR"

    # Create empty ext4 filesystem
    dd if=/dev/zero of=rootfs.ext4 bs=1M count=10240
    mkfs.ext4 -F rootfs.ext4

    # Mount rootfs
    mkdir -p rootfs
    mount -o loop rootfs.ext4 rootfs

    log_info "Rootfs created and mounted at $BUILD_DIR/rootfs"
}

# Bootstrap Ubuntu
bootstrap_ubuntu() {
    log_step "Bootstrapping Ubuntu 22.04..."

    debootstrap --arch=amd64 jammy rootfs http://archive.ubuntu.com/ubuntu/

    log_info "Ubuntu 22.04 bootstrapped"
}

# Configure system
configure_system() {
    log_step "Configuring base system..."

    # Set hostname
    echo "polydev-browser-vm" > rootfs/etc/hostname

    # Configure APT sources (full repos)
    cat > rootfs/etc/apt/sources.list <<EOF
deb http://archive.ubuntu.com/ubuntu jammy main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu jammy-updates main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu jammy-security main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu jammy-backports main restricted universe multiverse
EOF

    # Configure DNS
    echo "nameserver 8.8.8.8" > rootfs/etc/resolv.conf
    echo "nameserver 8.8.4.4" >> rootfs/etc/resolv.conf

    # Create systemd-networkd configuration template
    mkdir -p rootfs/etc/systemd/network
    cat > rootfs/etc/systemd/network/10-eth0.network <<'EOF'
[Match]
Name=eth0

[Network]
Address=__VM_IP__/24
Gateway=192.168.100.1
DNS=8.8.8.8
DNS=8.8.4.4
EOF

    # Set root password
    chroot rootfs /bin/bash -c "echo 'root:polydev123' | chpasswd"

    # Enable systemd services
    chroot rootfs systemctl enable systemd-networkd
    chroot rootfs systemctl enable systemd-resolved

    log_info "Base system configured"
}

# Install base packages
install_base_packages() {
    log_step "Installing base packages..."

    # Copy resolv.conf for network access during package installation
    cp /etc/resolv.conf rootfs/etc/resolv.conf

    # Update package lists
    chroot rootfs apt-get update

    # Install essential packages
    chroot rootfs apt-get install -y \
        curl \
        wget \
        git \
        vim \
        nano \
        htop \
        net-tools \
        iputils-ping \
        ca-certificates \
        gnupg \
        systemd \
        udev \
        dbus \
        python3 \
        python3-pip \
        python3-numpy \
        build-essential \
        software-properties-common

    log_info "Base packages installed"
}

# Install kernel and modules (CRITICAL for networking)
install_kernel() {
    log_step "Installing Linux kernel with virtio modules..."

    # Install kernel image
    chroot rootfs apt-get install -y linux-image-generic

    # Detect installed kernel version
    if [ -d rootfs/lib/modules ]; then
        KERNEL_VERSION=$(ls rootfs/lib/modules/ | head -1)
        log_info "Kernel installed: $KERNEL_VERSION"

        # Install modules-extra for virtio drivers
        chroot rootfs apt-get install -y linux-modules-extra-$KERNEL_VERSION

        # Verify virtio_net module exists
        VIRTIO_NET_PATH="rootfs/lib/modules/$KERNEL_VERSION/kernel/drivers/net/virtio_net.ko"
        if [ -f "$VIRTIO_NET_PATH" ]; then
            log_info "✓ virtio_net.ko module found"
        else
            log_error "✗ virtio_net.ko NOT FOUND - network will not work!"
            exit 1
        fi
    else
        log_error "Kernel modules directory not created!"
        exit 1
    fi

    log_info "Kernel and modules installed successfully"
}

# Install Node.js v20 (CRITICAL for CLI tools)
install_nodejs() {
    log_step "Installing Node.js v20 from NodeSource..."

    # Remove any existing Node.js to prevent conflicts
    chroot rootfs apt-get remove -y nodejs npm node 2>/dev/null || true
    chroot rootfs rm -rf /usr/lib/node_modules 2>/dev/null || true
    chroot rootfs rm -f /usr/bin/node /usr/bin/npm /usr/bin/npx 2>/dev/null || true

    # Install Node.js v20 from NodeSource
    chroot rootfs bash -c "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -"
    chroot rootfs apt-get install -y nodejs

    # Verify installation
    NODE_VERSION=$(chroot rootfs node --version)
    NPM_VERSION=$(chroot rootfs npm --version)

    log_info "Node.js ${NODE_VERSION} installed"
    log_info "npm ${NPM_VERSION} installed"

    # Verify it's v20.x
    if [[ ! "$NODE_VERSION" =~ ^v20\. ]]; then
        log_error "Node.js version is $NODE_VERSION, expected v20.x!"
        exit 1
    fi

    log_info "✓ Node.js v20 verified successfully"
}

# Install CLI tools (CRITICAL for OAuth agent)
install_cli_tools() {
    log_step "Installing CLI tools globally..."

    # Set npm to use IPv4 (prevents some network issues)
    chroot rootfs npm config set prefer-online false

    # Install CLI tools one by one with verification
    log_info "Installing @anthropic-ai/claude-code..."
    chroot rootfs npm install -g @anthropic-ai/claude-code || {
        log_warn "Failed to install claude-code, retrying..."
        chroot rootfs npm install -g @anthropic-ai/claude-code
    }

    log_info "Installing @openai/codex..."
    chroot rootfs npm install -g @openai/codex || {
        log_warn "Failed to install codex, retrying..."
        chroot rootfs npm install -g @openai/codex
    }

    log_info "Installing @google/gemini-cli..."
    chroot rootfs npm install -g @google/gemini-cli || {
        log_warn "Failed to install gemini-cli, retrying..."
        chroot rootfs npm install -g @google/gemini-cli
    }

    # Verify all tools are installed
    log_info "Verifying CLI tools installation..."

    CODEX_PATH=$(chroot rootfs which codex 2>/dev/null || echo "")
    CLAUDE_PATH=$(chroot rootfs which claude 2>/dev/null || echo "")
    GEMINI_PATH=$(chroot rootfs which gemini 2>/dev/null || echo "")

    if [ -z "$CODEX_PATH" ]; then
        log_error "✗ codex not found in PATH!"
        exit 1
    else
        log_info "✓ codex found at: $CODEX_PATH"
    fi

    if [ -z "$CLAUDE_PATH" ]; then
        log_error "✗ claude not found in PATH!"
        exit 1
    else
        log_info "✓ claude found at: $CLAUDE_PATH"
    fi

    if [ -z "$GEMINI_PATH" ]; then
        log_error "✗ gemini not found in PATH!"
        exit 1
    else
        log_info "✓ gemini found at: $GEMINI_PATH"
    fi

    log_info "✓ All CLI tools installed and verified successfully"
}

# Install desktop environment (XFCE - lightweight and stable)
install_desktop() {
    log_step "Installing XFCE desktop environment..."

    chroot rootfs apt-get install -y \
        xfce4 \
        xfce4-terminal \
        xfce4-goodies \
        dbus-x11 \
        xinit

    log_info "XFCE desktop installed"
}

# Install VNC and virtual display
install_vnc() {
    log_step "Installing VNC and virtual display..."

    # Install Xvfb and x11vnc
    chroot rootfs apt-get install -y \
        xvfb \
        x11vnc \
        xdotool \
        xauth

    log_info "VNC packages installed"
}

# Configure systemd services (PRODUCTION approach - NOT bash supervisor)
configure_systemd_services() {
    log_step "Configuring systemd services..."

    # 1. Xvfb service (virtual display)
    cat > rootfs/etc/systemd/system/xvfb.service <<'EOF'
[Unit]
Description=X Virtual Frame Buffer
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/bin/Xvfb :1 -screen 0 1280x720x24 -ac +extension GLX +render -noreset
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

    # 2. XFCE session service (desktop environment)
    cat > rootfs/etc/systemd/system/xfce-session.service <<'EOF'
[Unit]
Description=XFCE Desktop Session
After=xvfb.service
Requires=xvfb.service

[Service]
Type=simple
User=root
Environment="DISPLAY=:1"
ExecStart=/usr/bin/startxfce4
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

    # 3. x11vnc service (VNC server with auto-restart)
    cat > rootfs/etc/systemd/system/x11vnc.service <<'EOF'
[Unit]
Description=x11vnc VNC Server
After=xfce-session.service
Requires=xfce-session.service

[Service]
Type=simple
User=root
Environment="DISPLAY=:1"
ExecStart=/usr/bin/x11vnc -display :1 -forever -shared -wait 50 -listen 0.0.0.0 -rfbport 5901 -passwd polydev123 -noxdamage -repeat -noxrecord -noxfixes -ncache 10
Restart=on-failure
RestartSec=3
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    # 4. Enable all services
    chroot rootfs systemctl enable xvfb.service
    chroot rootfs systemctl enable xfce-session.service
    chroot rootfs systemctl enable x11vnc.service

    log_info "✓ Systemd services configured and enabled"
}

# Configure terminal auto-launch
configure_terminal_autostart() {
    log_step "Configuring terminal auto-launch..."

    # Create autostart directory
    mkdir -p rootfs/etc/xdg/autostart

    # Terminal auto-launch desktop entry
    cat > rootfs/etc/xdg/autostart/terminal.desktop <<'EOF'
[Desktop Entry]
Type=Application
Name=Terminal
Exec=xfce4-terminal --geometry=100x30 --title="Polydev CLI Terminal" --working-directory=/root --hide-menubar --hide-scrollbar --maximize
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
StartupNotify=false
EOF

    log_info "✓ Terminal auto-launch configured"
}

# Install Chrome browser
install_chrome() {
    log_step "Installing Google Chrome..."

    # Add Chrome repository
    chroot rootfs bash -c "wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add -"
    chroot rootfs bash -c "echo 'deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main' > /etc/apt/sources.list.d/google-chrome.list"

    chroot rootfs apt-get update
    chroot rootfs apt-get install -y google-chrome-stable

    # Verify Chrome is installed
    if chroot rootfs which google-chrome >/dev/null 2>&1; then
        log_info "✓ Google Chrome installed successfully"
    else
        log_error "✗ Google Chrome installation failed!"
        exit 1
    fi
}

# Configure Chrome auto-launch
configure_chrome_autostart() {
    log_step "Configuring Chrome auto-launch..."

    # Chrome auto-launch desktop entry
    cat > rootfs/etc/xdg/autostart/chrome.desktop <<'EOF'
[Desktop Entry]
Type=Application
Name=Chrome
Exec=/usr/bin/google-chrome --no-sandbox --disable-dev-shm-usage --disable-gpu --window-size=1280,720 --new-window https://claude.ai
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
StartupNotify=false
EOF

    log_info "✓ Chrome auto-launch configured"
}

# Configure proxy template
configure_proxy() {
    log_step "Configuring proxy template..."

    # Create proxy configuration script (will be populated at runtime)
    mkdir -p rootfs/etc/profile.d
    cat > rootfs/etc/profile.d/decodo-proxy.sh <<'EOF'
#!/bin/bash
# Decodo Proxy Configuration
# Populated by VM manager at runtime

# These will be set by vm-manager during VM creation
export HTTP_PROXY="${DECODO_HTTP_PROXY:-}"
export HTTPS_PROXY="${DECODO_HTTPS_PROXY:-}"
export http_proxy="${DECODO_HTTP_PROXY:-}"
export https_proxy="${DECODO_HTTPS_PROXY:-}"
export NO_PROXY="localhost,127.0.0.1,192.168.0.0/16,192.168.100.0/24"
export no_proxy="localhost,127.0.0.1,192.168.0.0/16,192.168.100.0/24"
EOF

    chmod +x rootfs/etc/profile.d/decodo-proxy.sh

    log_info "✓ Proxy template configured"
}

# Create OAuth agent directory structure
create_oauth_agent_structure() {
    log_step "Creating OAuth agent directory structure..."

    # Create directory for OAuth agent files (injected at runtime)
    mkdir -p rootfs/opt/vm-browser-agent

    # Create placeholder README
    cat > rootfs/opt/vm-browser-agent/README.txt <<'EOF'
OAuth Agent Files
-----------------
This directory will be populated by the VM manager during Browser VM creation.

Files injected at runtime:
- server.js (OAuth detection agent)
- webrtc-server.js (WebRTC streaming)
- start-all.sh (supervisor script)

These files are specific to each Browser VM session.
EOF

    log_info "✓ OAuth agent directory structure created"
}

# Install GStreamer for WebRTC
install_gstreamer() {
    log_step "Installing GStreamer for WebRTC streaming..."

    chroot rootfs apt-get install -y \
        gstreamer1.0-tools \
        gstreamer1.0-plugins-base \
        gstreamer1.0-plugins-good \
        gstreamer1.0-plugins-bad \
        gstreamer1.0-plugins-ugly \
        gstreamer1.0-libav \
        gstreamer1.0-x \
        libgstreamer1.0-0 \
        libgstreamer1.0-dev \
        python3-gst-1.0 \
        gir1.2-gst-plugins-bad-1.0 \
        gir1.2-gstreamer-1.0

    log_info "✓ GStreamer installed with Python bindings for WebRTC"
}

# Clean up and finalize
cleanup_and_finalize() {
    log_step "Cleaning up and finalizing rootfs..."

    # Clean APT cache
    chroot rootfs apt-get clean
    chroot rootfs apt-get autoremove -y

    # Remove temporary files
    rm -rf rootfs/tmp/*
    rm -rf rootfs/var/tmp/*

    # Clear logs
    find rootfs/var/log -type f -exec truncate -s 0 {} \;

    log_info "✓ Cleanup complete"
}

# Verify everything is installed correctly
verify_installation() {
    log_step "Verifying installation..."

    local errors=0

    # Verify Node.js v20
    NODE_VERSION=$(chroot rootfs node --version 2>/dev/null || echo "NOT_FOUND")
    if [[ "$NODE_VERSION" =~ ^v20\. ]]; then
        log_info "✓ Node.js: $NODE_VERSION"
    else
        log_error "✗ Node.js v20 not found (got: $NODE_VERSION)"
        ((errors++))
    fi

    # Verify CLI tools
    for tool in codex claude gemini; do
        if chroot rootfs which $tool >/dev/null 2>&1; then
            TOOL_PATH=$(chroot rootfs which $tool)
            log_info "✓ $tool: $TOOL_PATH"
        else
            log_error "✗ $tool not found in PATH"
            ((errors++))
        fi
    done

    # Verify systemd services
    for service in xvfb.service xfce-session.service x11vnc.service; do
        if [ -f "rootfs/etc/systemd/system/$service" ]; then
            log_info "✓ $service configured"
        else
            log_error "✗ $service not found"
            ((errors++))
        fi
    done

    # Verify Chrome
    if chroot rootfs which google-chrome >/dev/null 2>&1; then
        log_info "✓ Google Chrome installed"
    else
        log_error "✗ Google Chrome not found"
        ((errors++))
    fi

    # Verify GStreamer
    if chroot rootfs which gst-launch-1.0 >/dev/null 2>&1; then
        log_info "✓ GStreamer installed"
    else
        log_error "✗ GStreamer not found"
        ((errors++))
    fi

    if [ $errors -eq 0 ]; then
        log_info "✓ All verification checks passed!"
        return 0
    else
        log_error "✗ $errors verification checks failed!"
        return 1
    fi
}

# Unmount and save rootfs
save_rootfs() {
    log_step "Saving rootfs..."

    # Unmount rootfs
    umount rootfs

    # Create snapshot directory
    mkdir -p "$SNAPSHOT_DIR"

    # Copy rootfs to snapshot location
    log_info "Copying rootfs to $SNAPSHOT_DIR/$ROOTFS_NAME..."
    cp rootfs.ext4 "$SNAPSHOT_DIR/$ROOTFS_NAME"

    # Create symlink to 'golden-rootfs.ext4' for backwards compatibility
    ln -sf "$ROOTFS_NAME" "$SNAPSHOT_DIR/golden-rootfs.ext4"

    # Set permissions
    chmod 644 "$SNAPSHOT_DIR/$ROOTFS_NAME"

    log_info "✓ Rootfs saved to $SNAPSHOT_DIR/$ROOTFS_NAME"
    log_info "✓ Symlink created: $SNAPSHOT_DIR/golden-rootfs.ext4 -> $ROOTFS_NAME"
}

# Print summary
print_summary() {
    echo ""
    echo "=========================================="
    echo "Golden Rootfs Build Complete!"
    echo "=========================================="
    echo ""
    echo "Location: $SNAPSHOT_DIR/$ROOTFS_NAME"
    echo "Size: $(du -h $SNAPSHOT_DIR/$ROOTFS_NAME | cut -f1)"
    echo ""
    echo "Installed Components:"
    echo "  ✓ Ubuntu 22.04"
    echo "  ✓ Node.js v20"
    echo "  ✓ CLI Tools: codex, claude, gemini"
    echo "  ✓ XFCE Desktop"
    echo "  ✓ Google Chrome"
    echo "  ✓ VNC Server (x11vnc)"
    echo "  ✓ Systemd Services (auto-restart)"
    echo "  ✓ GStreamer (WebRTC)"
    echo ""
    echo "Next Steps:"
    echo "  1. Test in chroot: chroot $BUILD_DIR/rootfs /bin/bash"
    echo "  2. Deploy: Use this rootfs for Browser VM creation"
    echo "  3. Verify: Create test VM and check all services"
    echo ""
    echo "=========================================="
}

# Main execution
main() {
    echo ""
    echo "=========================================="
    echo "Production Golden Rootfs Build"
    echo "=========================================="
    echo ""

    check_prerequisites
    create_rootfs
    bootstrap_ubuntu
    configure_system
    install_base_packages
    install_kernel
    install_nodejs
    install_cli_tools
    install_desktop
    install_vnc
    configure_systemd_services
    configure_terminal_autostart
    install_chrome
    configure_chrome_autostart
    configure_proxy
    create_oauth_agent_structure
    install_gstreamer
    cleanup_and_finalize

    if verify_installation; then
        save_rootfs
        print_summary
        log_info "Build completed successfully!"
        exit 0
    else
        log_error "Build failed verification!"
        exit 1
    fi
}

# Run main
main
