#!/bin/bash
#
# Build Golden Snapshot for Firecracker VMs
# Creates base Ubuntu VM image with Node.js, CLI tools, and streaming proxy
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Configuration
SNAPSHOT_DIR="${FIRECRACKER_BASE:-/var/lib/firecracker}/snapshots/base"
BUILD_DIR="/tmp/fc-golden-build"
ROOTFS_SIZE="8G"
VM_IP="192.168.100.10"
BRIDGE_IP="192.168.100.1"

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    if [ "$EUID" -ne 0 ]; then
        log_error "This script must be run as root"
        exit 1
    fi

    command -v firecracker >/dev/null 2>&1 || {
        log_error "firecracker not found in PATH"
        exit 1
    }

    command -v debootstrap >/dev/null 2>&1 || {
        log_error "debootstrap not found. Install with: apt-get install debootstrap"
        exit 1
    }

    log_info "Prerequisites OK"
}

# Create rootfs image
create_rootfs() {
    log_info "Creating rootfs image (${ROOTFS_SIZE})..."

    mkdir -p "$BUILD_DIR"
    cd "$BUILD_DIR"

    # Create empty ext4 filesystem (8GB for all packages + CLI tools)
    dd if=/dev/zero of=rootfs.ext4 bs=1M count=8192
    mkfs.ext4 -F rootfs.ext4

    # Mount rootfs
    mkdir -p rootfs
    mount -o loop rootfs.ext4 rootfs

    log_info "Rootfs created and mounted"
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

    # Set hostname
    echo "polydev-cli" > rootfs/etc/hostname

    # Configure network with DHCP (IP is assigned dynamically by VM manager)
    cat > rootfs/etc/netplan/01-netcfg.yaml <<EOF
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: yes
      dhcp4-overrides:
        use-dns: false
      nameservers:
        addresses: [8.8.8.8, 8.8.4.4]
EOF

    # Configure DNS
    echo "nameserver 8.8.8.8" > rootfs/etc/resolv.conf
    echo "nameserver 8.8.4.4" >> rootfs/etc/resolv.conf

    # Create network configuration template for VM cloning (with IP placeholder)
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

    # Set root password (change this!)
    chroot rootfs /bin/bash -c "echo 'root:polydev' | chpasswd"

    # Enable systemd services
    chroot rootfs systemctl enable systemd-networkd
    chroot rootfs systemctl enable systemd-resolved

    log_info "System configured"
}

# Install packages
install_packages() {
    log_info "Installing packages..."

    # Copy resolv.conf for package installation
    cp /etc/resolv.conf rootfs/etc/resolv.conf

    # Configure complete apt sources (main, universe, updates, security)
    cat > rootfs/etc/apt/sources.list <<EOF
deb http://archive.ubuntu.com/ubuntu jammy main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu jammy-updates main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu jammy-security main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu jammy-backports main restricted universe multiverse
EOF

    # Update package lists
    chroot rootfs apt-get update

    # Install essential packages
    chroot rootfs apt-get install -y \
        curl \
        wget \
        git \
        vim \
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
        expect

    # Install Linux kernel and modules (CRITICAL for virtio drivers!)
    log_info "Installing Linux kernel with virtio modules..."

    # First install the kernel image
    chroot rootfs apt-get install -y linux-image-generic

    # Detect the installed kernel version
    if [ -d rootfs/lib/modules ]; then
        KERNEL_VERSION=$(ls rootfs/lib/modules/ | head -1)
        log_info "Kernel installed: $KERNEL_VERSION"

        # Install linux-modules-extra for this specific kernel version
        log_info "Installing linux-modules-extra-$KERNEL_VERSION..."
        chroot rootfs apt-get install -y linux-modules-extra-$KERNEL_VERSION

        # Verify virtio_net module exists
        VIRTIO_NET_PATH="rootfs/lib/modules/$KERNEL_VERSION/kernel/drivers/net/virtio_net.ko"
        if [ -f "$VIRTIO_NET_PATH" ]; then
            log_info "✓ virtio_net.ko module found at $VIRTIO_NET_PATH"
        else
            log_error "⚠ virtio_net.ko NOT FOUND - network will not work!"
            log_error "Expected location: $VIRTIO_NET_PATH"
            exit 1
        fi
    else
        log_error "Kernel modules directory not created!"
        exit 1
    fi

    # Remove any existing Node.js to prevent version conflicts
    log_info "Removing any existing Node.js installations..."
    chroot rootfs apt-get remove -y nodejs npm node 2>/dev/null || true
    chroot rootfs rm -rf /usr/lib/node_modules 2>/dev/null || true
    chroot rootfs rm -f /usr/bin/node /usr/bin/npm /usr/bin/npx 2>/dev/null || true

    # Install Node.js v20 from NodeSource (required for all AI CLI tools including Gemini CLI)
    log_info "Installing Node.js v20 from NodeSource..."
    chroot rootfs bash -c "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -"
    chroot rootfs apt-get install -y nodejs

    # Verify Node.js installation
    NODE_VERSION=$(chroot rootfs node --version)
    NPM_VERSION=$(chroot rootfs npm --version)
    log_info "Node.js ${NODE_VERSION}, npm ${NPM_VERSION} installed (NodeSource - compatible with all AI CLI tools)"

    # Install GStreamer for WebRTC screen capture
    log_info "Installing GStreamer for WebRTC..."
    chroot rootfs apt-get install -y \
        gstreamer1.0-tools \
        gstreamer1.0-plugins-base \
        gstreamer1.0-plugins-good \
        gstreamer1.0-plugins-bad \
        gstreamer1.0-plugins-ugly \
        gstreamer1.0-x \
        gstreamer1.0-gl \
        gstreamer1.0-libav \
        libgstreamer1.0-0 \
        python3-gi \
        gir1.2-gst-plugins-bad-1.0 \
        libnice10 \
        libsrtp2-1

    log_info "GStreamer with WebRTC runtime dependencies installed (libnice10, libsrtp2-1)"

    log_info "Packages installed"
}

# Install CLI tools
install_cli_tools() {
    log_info "Installing CLI tools..."

    # Install Gemini CLI (VERIFIED: @google/gemini-cli v0.13.0)
    log_info "Installing Google Gemini CLI (@google/gemini-cli)..."
    chroot rootfs npm install -g @google/gemini-cli || \
        log_warn "Gemini CLI installation failed, skipping..."

    # Install Claude Code CLI (VERIFIED: @anthropic-ai/claude-code v2.0.37)
    log_info "Installing Claude Code CLI (@anthropic-ai/claude-code)..."
    chroot rootfs npm install -g @anthropic-ai/claude-code || \
        log_warn "Claude Code CLI installation failed, skipping..."

    # Install OpenAI Codex CLI (VERIFIED: @openai/codex v0.57.0)
    log_info "Installing OpenAI Codex CLI (@openai/codex)..."
    chroot rootfs npm install -g @openai/codex || \
        log_warn "Codex CLI installation failed, skipping..."

    # Install tmux terminal multiplexer
    log_info "Installing tmux terminal multiplexer..."
    chroot rootfs apt-get install -y tmux

    # Create tmux configuration
    cat > rootfs/etc/tmux.conf <<'EOF'
# Enable mouse support
set -g mouse on

# Set scrollback history
set -g history-limit 10000

# Set default terminal
set -g default-terminal "screen-256color"

# Start window numbering at 1
set -g base-index 1
EOF

    # Install Puppeteer (for browser VMs)
    log_info "Installing puppeteer..."
    chroot rootfs npm install -g puppeteer

    # Install Google Chrome (required for OAuth automation)
    # Note: Chromium in Ubuntu 22.04 is snap-only, which doesn't work in our environment
    log_info "Installing Google Chrome..."
    chroot rootfs bash -c 'wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add -'
    chroot rootfs bash -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list'
    chroot rootfs apt-get update
    chroot rootfs apt-get install -y google-chrome-stable
    # Create chromium-browser symlink for compatibility
    chroot rootfs bash -c 'ln -sf /usr/bin/google-chrome /usr/bin/chromium-browser'
    log_info "Google Chrome installed successfully"

    # Install Chrome dependencies for Puppeteer
    chroot rootfs apt-get install -y \
        fonts-liberation \
        libasound2 \
        libatk-bridge2.0-0 \
        libatk1.0-0 \
        libatspi2.0-0 \
        libcups2 \
        libdbus-1-3 \
        libdrm2 \
        libgbm1 \
        libgtk-3-0 \
        libnspr4 \
        libnss3 \
        libwayland-client0 \
        libxcomposite1 \
        libxdamage1 \
        libxfixes3 \
        libxkbcommon0 \
        libxrandr2 \
        xdg-utils

    log_info "CLI tools installed"
}

# Setup TigerVNC and XFCE desktop (for Browser VMs)
# AI-validated configuration: TigerVNC's Xtigervnc is both X server AND VNC server
# This replaces the old Xvfb + x11vnc + websockify stack
setup_vnc() {
    log_info "Setting up TigerVNC and XFCE desktop (1920x1080)..."

    # Install TigerVNC (includes vncserver wrapper) and XFCE desktop
    chroot rootfs apt-get install -y \
        tigervnc-standalone-server \
        tigervnc-common \
        xfce4 \
        xfce4-terminal \
        xfce4-goodies \
        firefox \
        dbus-x11 \
        xdotool \
        fonts-liberation \
        fonts-dejavu-core

    # Create VNC password (for security, even though we allow no-auth for internal use)
    mkdir -p rootfs/root/.vnc
    # Empty password file for passwordless VNC (internal use only)
    echo "" | chroot rootfs vncpasswd -f > rootfs/root/.vnc/passwd 2>/dev/null || true
    chmod 600 rootfs/root/.vnc/passwd 2>/dev/null || true

    # Create xstartup script (CRITICAL: This is executed by vncserver wrapper)
    cat > rootfs/root/.vnc/xstartup <<'EOF'
#!/bin/sh
# TigerVNC xstartup - Launches XFCE desktop
# This script is executed by vncserver when it starts

# Set display for applications
export DISPLAY=:1

# Disable XKB extensions to prevent errors
export XKL_XMODMAP_DISABLE=1

# Clear any existing session managers
unset SESSION_MANAGER
unset DBUS_SESSION_BUS_ADDRESS

# Start DBus session (required for XFCE)
if [ -z "$DBUS_SESSION_BUS_ADDRESS" ]; then
    eval "$(dbus-launch --sh-syntax --exit-with-session)"
fi

# Start XFCE desktop (exec replaces shell, keeps process alive)
exec startxfce4
EOF
    chmod +x rootfs/root/.vnc/xstartup

    # Create TigerVNC systemd service (uses direct Xtigervnc - more reliable than vncserver wrapper)
    # STRUCTURAL FIX: vncserver wrapper has locale issues; direct Xtigervnc is more reliable
    cat > rootfs/etc/systemd/system/tigervnc.service <<'EOF'
[Unit]
Description=TigerVNC server on display :1 (Full XFCE Desktop)
After=network.target
Wants=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root
Environment=HOME=/root
Environment=DISPLAY=:1
Environment=XAUTHORITY=/root/.Xauthority
# Clean up any stale X11 locks before starting
ExecStartPre=-/bin/rm -f /tmp/.X1-lock /tmp/.X11-unix/X1
# Direct Xtigervnc is both X server AND VNC server in one
ExecStart=/usr/bin/Xtigervnc :1 -geometry 1920x1080 -depth 24 -rfbport 5901 -localhost no -SecurityTypes None -pn
# Start XFCE desktop after Xtigervnc is up (runs in background)
ExecStartPost=/bin/bash -c 'sleep 3 && DISPLAY=:1 HOME=/root XAUTHORITY=/root/.Xauthority dbus-launch startxfce4 &'
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

    # Create XFCE autostart directory
    mkdir -p rootfs/root/.config/autostart

    # Create autostart for terminal (opens immediately, maximized)
    cat > rootfs/root/.config/autostart/terminal.desktop <<'EOF'
[Desktop Entry]
Type=Application
Name=Terminal
Comment=CLI Terminal for Polydev Authentication
Exec=xfce4-terminal --maximize --title="Polydev CLI - Type: claude, codex, or gemini"
Terminal=false
StartupNotify=false
X-XFCE-Autostart-Override=true
EOF

    # Create autostart for Firefox (opens after terminal, behind it)
    cat > rootfs/root/.config/autostart/firefox.desktop <<'EOF'
[Desktop Entry]
Type=Application
Name=Firefox
Comment=Browser for OAuth Authentication
Exec=sh -c "sleep 3 && firefox --new-instance"
Terminal=false
StartupNotify=false
EOF

    # Set Firefox as default browser (fixes "Failed to execute default Web Browser" error)
    log_info "Setting Firefox as default browser..."

    # Create XFCE helpers.rc to set Firefox as default
    mkdir -p rootfs/root/.config/xfce4
    cat > rootfs/root/.config/xfce4/helpers.rc <<'EOF'
WebBrowser=firefox
EOF

    # Create xdg-settings default (in case xdg-open is used)
    mkdir -p rootfs/root/.config
    cat > rootfs/root/.config/mimeapps.list <<'EOF'
[Default Applications]
x-scheme-handler/http=firefox.desktop
x-scheme-handler/https=firefox.desktop
text/html=firefox.desktop
application/xhtml+xml=firefox.desktop
EOF

    # Create symbolic link for default browser
    mkdir -p rootfs/usr/share/applications

    # Create Firefox desktop entry if not exists
    cat > rootfs/usr/share/applications/firefox.desktop <<'EOF'
[Desktop Entry]
Version=1.0
Name=Firefox Web Browser
Comment=Browse the World Wide Web
GenericName=Web Browser
Keywords=Internet;WWW;Browser;Web;Explorer
Exec=firefox %u
Terminal=false
X-MultipleArgs=false
Type=Application
Icon=firefox
Categories=GNOME;GTK;Network;WebBrowser;
MimeType=text/html;text/xml;application/xhtml+xml;application/xml;application/rss+xml;application/rdf+xml;image/gif;image/jpeg;image/png;x-scheme-handler/http;x-scheme-handler/https;x-scheme-handler/ftp;x-scheme-handler/chrome;video/webm;application/x-xpinstall;
StartupNotify=true
EOF

    # Set Firefox as default using update-alternatives (if available)
    chroot rootfs update-alternatives --set x-www-browser /usr/bin/firefox 2>/dev/null || true
    chroot rootfs update-alternatives --set gnome-www-browser /usr/bin/firefox 2>/dev/null || true

    log_info "Firefox set as default browser"

    # Disable old VNC services (in case they exist from previous builds)
    chroot rootfs systemctl disable xvfb.service 2>/dev/null || true
    chroot rootfs systemctl disable x11vnc.service 2>/dev/null || true
    chroot rootfs systemctl disable websockify.service 2>/dev/null || true
    chroot rootfs systemctl disable openbox.service 2>/dev/null || true

    # Enable TigerVNC service
    chroot rootfs systemctl enable tigervnc.service

    log_info "TigerVNC and XFCE desktop configured (1920x1080, port 5901)"
}

# Setup VM Browser Agent (OAuth proxy for Browser VMs)
setup_vm_api() {
    log_info "Setting up VM Browser Agent..."

    # Create OAuth agent directory (will be replaced by injection during Browser VM creation)
    mkdir -p rootfs/opt/vm-browser-agent

    # Create placeholder server.js (will be replaced by injection during Browser VM creation)
    cat > rootfs/opt/vm-browser-agent/server.js <<'EOF'
/**
 * VM API Server
 * Runs inside each VM to handle authentication, credential management, and prompt execution
 */

const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const PORT = 8080;

// Simple HTTP server
const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Health check
    if (url.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
        return;
    }

    // Execute prompt
    if (url.pathname === '/execute' && req.method === 'POST') {
        handleExecutePrompt(req, res);
        return;
    }

    // Write credentials
    if (url.pathname === '/credentials/write' && req.method === 'POST') {
        handleWriteCredentials(req, res);
        return;
    }

    // Test auth
    if (url.pathname.startsWith('/test-auth/')) {
        const provider = url.pathname.split('/')[2];
        handleTestAuth(provider, res);
        return;
    }

    // 404
    res.writeHead(404);
    res.end('Not Found');
});

// Handle prompt execution with streaming
async function handleExecutePrompt(req, res) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
        try {
            const { provider, prompt, promptId } = JSON.parse(body);

            // Set SSE headers
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            });

            // Determine CLI command
            let command, args;
            switch (provider) {
                case 'codex':
                    command = 'codex';
                    args = [prompt];
                    break;
                case 'claude_code':
                    command = 'claude-code';
                    args = [prompt];
                    break;
                case 'gemini_cli':
                    command = 'gemini';
                    args = ['chat', prompt];
                    break;
                default:
                    sendSSE(res, { type: 'error', message: `Unknown provider: ${provider}` });
                    res.end();
                    return;
            }

            // Execute CLI command
            const proc = spawn(command, args, {
                env: { ...process.env, FORCE_COLOR: '0' }
            });

            proc.stdout.on('data', (chunk) => {
                sendSSE(res, {
                    type: 'content',
                    content: chunk.toString()
                });
            });

            proc.stderr.on('data', (chunk) => {
                sendSSE(res, {
                    type: 'metadata',
                    data: { stderr: chunk.toString() }
                });
            });

            proc.on('close', (code) => {
                sendSSE(res, {
                    type: 'done',
                    exitCode: code
                });
                res.end();
            });

            proc.on('error', (error) => {
                sendSSE(res, {
                    type: 'error',
                    message: error.message
                });
                res.end();
            });
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
        }
    });
}

// Handle credential writing
async function handleWriteCredentials(req, res) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
        try {
            const { path: filePath, content, mode } = JSON.parse(body);

            // Create directory if needed
            const dir = path.dirname(filePath);
            await fs.mkdir(dir, { recursive: true });

            // Write file
            await fs.writeFile(filePath, content, { mode: parseInt(mode, 8) });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
        }
    });
}

// Test authentication
async function handleTestAuth(provider, res) {
    // Simple test: check if credential file exists
    let credPath;
    switch (provider) {
        case 'codex':
            credPath = '/root/.codex/credentials.json';
            break;
        case 'claude_code':
            credPath = '/root/.claude/credentials.json';
            break;
        case 'gemini_cli':
            credPath = '/root/.gemini/credentials.json';
            break;
        default:
            res.writeHead(404);
            res.end();
            return;
    }

    try {
        await fs.access(credPath);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ authenticated: true }));
    } catch {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ authenticated: false }));
    }
}

// Send SSE event
function sendSSE(res, data) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
}

server.listen(PORT, () => {
    console.log(`VM API server listening on port ${PORT}`);
});
EOF

    # Create supervisor script to start both OAuth agent and WebRTC server
    cat > rootfs/opt/vm-browser-agent/supervisor.sh <<'EOF'
#!/bin/bash
# Supervisor script to start both OAuth agent and WebRTC server

set -e

LOG_FILE="/var/log/vm-browser-agent-supervisor.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [SUPERVISOR] $1" | tee -a "$LOG_FILE"
}

log "Starting VM Browser Agent Supervisor"

# Start OAuth agent in background
log "Starting OAuth agent..."
/usr/bin/node /opt/vm-browser-agent/server.js > /var/log/oauth-agent.log 2>&1 &
OAUTH_PID=$!
log "OAuth agent started with PID: $OAUTH_PID"

# Start WebRTC server in background
log "Starting WebRTC server..."
/usr/bin/node /opt/vm-browser-agent/webrtc-server.js > /var/log/webrtc-server.log 2>&1 &
WEBRTC_PID=$!
log "WebRTC server started with PID: $WEBRTC_PID"

# Function to handle shutdown
shutdown() {
    log "Shutting down services..."
    if [ ! -z "$OAUTH_PID" ]; then
        log "Stopping OAuth agent (PID: $OAUTH_PID)"
        kill $OAUTH_PID 2>/dev/null || true
    fi
    if [ ! -z "$WEBRTC_PID" ]; then
        log "Stopping WebRTC server (PID: $WEBRTC_PID)"
        kill $WEBRTC_PID 2>/dev/null || true
    fi
    log "Supervisor shutdown complete"
    exit 0
}

# Trap signals
trap shutdown SIGTERM SIGINT

log "Both services started successfully"
log "OAuth agent PID: $OAUTH_PID"
log "WebRTC server PID: $WEBRTC_PID"

# Keep the script running and monitor the processes
while true; do
    # Check if processes are still running
    if ! kill -0 $OAUTH_PID 2>/dev/null; then
        log "ERROR: OAuth agent died, restarting..."
        /usr/bin/node /opt/vm-browser-agent/server.js > /var/log/oauth-agent.log 2>&1 &
        OAUTH_PID=$!
        log "OAuth agent restarted with PID: $OAUTH_PID"
    fi

    if ! kill -0 $WEBRTC_PID 2>/dev/null; then
        log "ERROR: WebRTC server died, restarting..."
        /usr/bin/node /opt/vm-browser-agent/webrtc-server.js > /var/log/webrtc-server.log 2>&1 &
        WEBRTC_PID=$!
        log "WebRTC server restarted with PID: $WEBRTC_PID"
    fi

    sleep 10
done
EOF

    chmod +x rootfs/opt/vm-browser-agent/supervisor.sh

    # Deploy webrtcbin implementation files
    log_info "Deploying webrtcbin implementation files..."

    # Source directory for vm-browser-agent files
    VM_AGENT_SRC="/opt/master-controller/vm-browser-agent"

    # Copy OAuth agent (server.js)
    cp $VM_AGENT_SRC/server.js rootfs/opt/vm-browser-agent/server.js || { log_error "Failed to copy server.js"; return 1; }

    # Copy webrtc-server.js (Node.js main server with GStreamer integration)
    cp $VM_AGENT_SRC/webrtc-server.js rootfs/opt/vm-browser-agent/webrtc-server.js || { log_error "Failed to copy webrtc-server.js"; return 1; }

    # Copy Python GStreamer helper
    cp $VM_AGENT_SRC/gstreamer-webrtc-helper.py rootfs/opt/vm-browser-agent/gstreamer-webrtc-helper.py || { log_error "Failed to copy gstreamer-webrtc-helper.py"; return 1; }

    # Copy Node.js GStreamer controller
    cp $VM_AGENT_SRC/gstreamer-webrtc-controller.js rootfs/opt/vm-browser-agent/gstreamer-webrtc-controller.js || { log_error "Failed to copy gstreamer-webrtc-controller.js"; return 1; }

    # Copy package.json
    cp $VM_AGENT_SRC/package.json rootfs/opt/vm-browser-agent/package.json || { log_error "Failed to copy package.json"; return 1; }

    # Set execute permissions
    chmod +x rootfs/opt/vm-browser-agent/webrtc-server.js
    chmod +x rootfs/opt/vm-browser-agent/gstreamer-webrtc-helper.py

    log_info "Webrtcbin files deployed successfully"

    # Verify files were copied
    if [ ! -f "rootfs/opt/vm-browser-agent/webrtc-server.js" ]; then
        log_error "webrtc-server.js not found after copy"
        return 1
    fi

    log_info "WebRTC server files verified (webrtcbin implementation)"

    # Create systemd service for Browser VM supervisor (starts both OAuth agent + WebRTC server)
    cat > rootfs/etc/systemd/system/vm-browser-agent.service <<EOF
[Unit]
Description=VM Browser Supervisor (OAuth Agent + WebRTC Server)
# Ensure network is fully online and VNC is started before OAuth agent
After=network-online.target tigervnc.service
Wants=network-online.target
Requires=tigervnc.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/vm-browser-agent
# Wait 5 seconds for VNC to fully initialize before starting OAuth agent
ExecStartPre=/bin/sleep 5
ExecStart=/bin/bash /opt/vm-browser-agent/supervisor.sh
Restart=always
RestartSec=5
# Output to both journal and console for debugging
StandardOutput=journal+console
StandardError=journal+console

[Install]
WantedBy=multi-user.target
EOF

    # Enable network-online.target for reliable network startup
    chroot rootfs systemctl enable systemd-networkd-wait-online.service 2>/dev/null || true

    # Enable service
    chroot rootfs systemctl enable vm-browser-agent

    log_info "VM Browser Agent configured"
}

# Cleanup
cleanup_rootfs() {
    log_info "Cleaning up rootfs..."

    # Clean package cache
    chroot rootfs apt-get clean
    chroot rootfs apt-get autoremove -y

    # Remove temporary files
    rm -rf rootfs/tmp/*
    rm -rf rootfs/var/tmp/*
    rm -rf rootfs/var/cache/apt/archives/*.deb

    log_info "Rootfs cleaned"
}

# Create kernel
get_kernel() {
    log_info "Getting Linux kernel..."

    if [ ! -f "$SNAPSHOT_DIR/vmlinux" ]; then
        # Download pre-built kernel
        wget -O "$SNAPSHOT_DIR/vmlinux" \
            https://s3.amazonaws.com/spec.ccfc.min/img/quickstart_guide/x86_64/kernels/vmlinux.bin
        chmod +x "$SNAPSHOT_DIR/vmlinux"
    fi

    log_info "Kernel ready"
}

# Create snapshot
create_snapshot() {
    log_info "Creating Firecracker snapshot..."

    # Sync and unmount rootfs properly
    log_info "Syncing filesystem..."
    sync
    sleep 2
    log_info "Unmounting rootfs..."
    umount rootfs
    sleep 2
    log_info "Ensuring filesystem is fully released..."

    # Create snapshot directory
    mkdir -p "$SNAPSHOT_DIR"

    # Move rootfs
    log_info "Moving rootfs to final location..."
    mv rootfs.ext4 "$SNAPSHOT_DIR/golden-rootfs.ext4"
    sync

    log_info "Golden snapshot created at $SNAPSHOT_DIR/golden-rootfs.ext4"
}

# Main execution
main() {
    log_info "Starting golden snapshot build..."

    check_prerequisites
    create_rootfs
    bootstrap_ubuntu
    configure_system
    install_packages
    install_cli_tools
    setup_vnc
    setup_vm_api
    cleanup_rootfs
    get_kernel
    create_snapshot

    log_info "Golden snapshot build complete!"
    log_info "Rootfs: $SNAPSHOT_DIR/golden-rootfs.ext4"
    log_info "Kernel: $SNAPSHOT_DIR/vmlinux"
}

# Cleanup on error
trap 'log_error "Build failed! Cleaning up..."; umount rootfs 2>/dev/null || true; exit 1' ERR

main
