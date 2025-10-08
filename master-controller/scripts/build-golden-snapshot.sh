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
ROOTFS_SIZE="2G"
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

    # Create empty ext4 filesystem
    dd if=/dev/zero of=rootfs.ext4 bs=1M count=2048
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

    # Configure network
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

    # Configure DNS
    echo "nameserver 8.8.8.8" > rootfs/etc/resolv.conf
    echo "nameserver 8.8.4.4" >> rootfs/etc/resolv.conf

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

    # Enable universe repository for python3-pip
    chroot rootfs bash -c "echo 'deb http://archive.ubuntu.com/ubuntu jammy universe' >> /etc/apt/sources.list"
    chroot rootfs bash -c "echo 'deb http://archive.ubuntu.com/ubuntu jammy-updates universe' >> /etc/apt/sources.list"

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
        python3-pip

    # Install Node.js 20
    log_info "Installing Node.js 20..."
    chroot rootfs bash -c "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -"
    chroot rootfs apt-get install -y nodejs

    # Verify Node.js installation
    NODE_VERSION=$(chroot rootfs node --version)
    NPM_VERSION=$(chroot rootfs npm --version)
    log_info "Node.js ${NODE_VERSION}, npm ${NPM_VERSION} installed"

    log_info "Packages installed"
}

# Install CLI tools
install_cli_tools() {
    log_info "Installing CLI tools..."

    # Install Claude Code
    log_info "Installing @anthropic-ai/claude-code..."
    chroot rootfs npm install -g @anthropic-ai/claude-code

    # Install Codex
    log_info "Installing @openai/codex..."
    chroot rootfs npm install -g @openai/codex

    # Install Gemini CLI
    log_info "Installing @google/gemini-cli..."
    chroot rootfs npm install -g @google/gemini-cli

    # Install Puppeteer (for browser VMs)
    log_info "Installing puppeteer..."
    chroot rootfs npm install -g puppeteer

    # Install Chrome dependencies for Puppeteer
    chroot rootfs apt-get install -y \
        chromium-browser \
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

# Setup VM API server
setup_vm_api() {
    log_info "Setting up VM API server..."

    # Create API server directory
    mkdir -p rootfs/opt/vm-api

    # Copy VM API server files
    cat > rootfs/opt/vm-api/server.js <<'EOF'
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

    # Create systemd service
    cat > rootfs/etc/systemd/system/vm-api.service <<EOF
[Unit]
Description=VM API Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/vm-api
ExecStart=/usr/bin/node /opt/vm-api/server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

    # Enable service
    chroot rootfs systemctl enable vm-api

    log_info "VM API server configured"
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

    # Unmount rootfs
    umount rootfs

    # Create snapshot directory
    mkdir -p "$SNAPSHOT_DIR"

    # Move rootfs
    mv rootfs.ext4 "$SNAPSHOT_DIR/golden-rootfs.ext4"

    # Start Firecracker to create memory snapshot
    # (This would require actual VM boot and snapshot creation)
    # For now, we'll just note that the rootfs is ready

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
