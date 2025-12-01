#!/bin/bash
set -e

# Colors for logging
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
ROOTFS_SIZE="8G"

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

    rm -rf "$BUILD_DIR"
    mkdir -p "$BUILD_DIR"
    cd "$BUILD_DIR"

    # Create empty ext4 filesystem
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

    # Configure network with DHCP
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

    # Create network configuration template
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
    chroot rootfs /bin/bash -c "echo 'root:polydev' | chpasswd"

    # Enable systemd services
    chroot rootfs systemctl enable systemd-networkd
    chroot rootfs systemctl enable systemd-resolved

    # Proxy Configuration Template
    cat > rootfs/etc/profile.d/decodo-proxy.sh <<'EOF'
export HTTP_PROXY="${DECODO_HTTP_PROXY:-}"
export HTTPS_PROXY="${DECODO_HTTPS_PROXY:-}"
export http_proxy="${DECODO_HTTP_PROXY:-}"
export https_proxy="${DECODO_HTTPS_PROXY:-}"
export NO_PROXY="localhost,127.0.0.1,192.168.0.0/16"
export no_proxy="localhost,127.0.0.1,192.168.0.0/16"
EOF
    chmod +x rootfs/etc/profile.d/decodo-proxy.sh

    log_info "System configured"
}

# Install packages
install_packages() {
    log_info "Installing packages..."

    cp /etc/resolv.conf rootfs/etc/resolv.conf

    cat > rootfs/etc/apt/sources.list <<EOF
deb http://archive.ubuntu.com/ubuntu jammy main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu jammy-updates main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu jammy-security main restricted universe multiverse
EOF

    chroot rootfs apt-get update
    chroot rootfs apt-get install -y \
        curl wget git vim htop net-tools iputils-ping \
        ca-certificates gnupg systemd udev dbus \
        python3 python3-pip expect \
        xfce4 xfce4-terminal \
        gstreamer1.0-tools gstreamer1.0-plugins-base \
        gstreamer1.0-plugins-good gstreamer1.0-plugins-bad \
        gstreamer1.0-x libgstreamer1.0-0 \
        xvfb x11vnc websockify novnc xdotool

    # Install Linux kernel and modules
    chroot rootfs apt-get install -y linux-image-generic
    if [ -d rootfs/lib/modules ]; then
        KERNEL_VERSION=$(ls rootfs/lib/modules/ | head -1)
        chroot rootfs apt-get install -y linux-modules-extra-$KERNEL_VERSION
    fi

    # Install Node.js v20
    log_info "Installing Node.js v20..."
    chroot rootfs apt-get remove -y nodejs npm node 2>/dev/null || true
    chroot rootfs bash -c "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -"
    chroot rootfs apt-get install -y nodejs

    # Install Google Chrome
    log_info "Installing Google Chrome..."
    chroot rootfs bash -c "wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add -"
    chroot rootfs bash -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list'
    chroot rootfs apt-get update
    chroot rootfs apt-get install -y google-chrome-stable

    log_info "Packages installed"
}

# Install CLI tools
install_cli_tools() {
    log_info "Installing CLI tools..."
    chroot rootfs npm install -g @anthropic-ai/claude-code
    chroot rootfs npm install -g @openai/codex
    chroot rootfs npm install -g @google/gemini-cli
    chroot rootfs npm install -g puppeteer
    log_info "CLI tools installed"
}

# Setup VNC and Services
setup_services() {
    log_info "Setting up systemd services..."

    # Xvfb Service
    cat > rootfs/etc/systemd/system/xvfb.service <<'EOF'
[Unit]
Description=Virtual Framebuffer
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/Xvfb :1 -screen 0 1280x720x24 -ac
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

    # x11vnc Service
    cat > rootfs/etc/systemd/system/x11vnc.service <<'EOF'
[Unit]
Description=x11vnc VNC Server
After=network.target xvfb.service
Requires=xvfb.service

[Service]
Type=simple
ExecStart=/usr/bin/x11vnc -display :1 -forever -shared -wait 50 -listen 0.0.0.0 -rfbport 5901 -passwd polydev123 -noxdamage -repeat -noxrecord -noxfixes -ncache 10
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

    # Terminal Autostart
    mkdir -p rootfs/etc/xdg/autostart
    cat > rootfs/etc/xdg/autostart/terminal.desktop <<'EOF'
[Desktop Entry]
Type=Application
Name=Terminal
Exec=xfce4-terminal --geometry=100x30 --title="CLI Terminal" --working-directory=/root --hide-menubar
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
EOF

    # Enable services
    chroot rootfs systemctl enable xvfb
    chroot rootfs systemctl enable x11vnc

    log_info "Services configured"
}

# Setup VM API (OAuth Agent)
setup_vm_api() {
    log_info "Setting up VM API..."
    
    mkdir -p rootfs/opt/vm-browser-agent
    
    # OAuth Agent (server.js)
    cat > rootfs/opt/vm-browser-agent/server.js <<'EOF'
const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const app = express();
app.use(express.json());

let credentials = null;

app.post('/auth/:provider', (req, res) => {
    const { provider } = req.params;
    console.log(`Starting auth for ${provider}`);
    
    let cmd = '';
    if (provider === 'codex') cmd = 'codex login';
    else if (provider === 'claude_code') cmd = 'claude login';
    else if (provider === 'gemini_cli') cmd = 'gemini login';
    
    if (cmd) {
        exec(`DISPLAY=:1 ${cmd}`, (err) => {
            if (err) console.error('Auth command failed:', err);
        });
        res.json({ status: 'started' });
    } else {
        res.status(400).json({ error: 'Unknown provider' });
    }
});

app.get('/credentials/status', (req, res) => {
    let captured = false;
    if (fs.existsSync('/root/.codex/auth.json')) captured = true;
    if (fs.existsSync('/root/.config/claude/credentials.json')) captured = true;
    if (fs.existsSync('/root/.gemini/oauth_creds.json')) captured = true;
    
    res.json({ authenticated: captured });
});

app.get('/credentials/get', (req, res) => {
    let data = {};
    if (fs.existsSync('/root/.codex/auth.json')) 
        data.codex = JSON.parse(fs.readFileSync('/root/.codex/auth.json', 'utf8'));
    if (fs.existsSync('/root/.config/claude/credentials.json'))
        data.claude = JSON.parse(fs.readFileSync('/root/.config/claude/credentials.json', 'utf8'));
    if (fs.existsSync('/root/.gemini/oauth_creds.json'))
        data.gemini = JSON.parse(fs.readFileSync('/root/.gemini/oauth_creds.json', 'utf8'));
    res.json(data);
});

app.listen(8080, () => console.log('Auth agent running on 8080'));
EOF

    # Install dependencies
    chroot rootfs bash -c "cd /opt/vm-browser-agent && npm install express"

    # WebRTC Server (webrtc-server.js)
    cat > rootfs/opt/vm-browser-agent/webrtc-server.js <<'EOF'
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

const MASTER_CONTROLLER_URL = process.env.MASTER_CONTROLLER_URL || 'http://192.168.100.1:4000';
const SESSION_ID = process.env.SESSION_ID;
const DISPLAY = process.env.DISPLAY || ':1';

const config = {
  iceServers: [],
  videoCodec: 'VP8',
  videoBitrate: 2000,
  frameRate: 30,
  resolution: '1280x720'
};

class VMWebRTCServer {
  constructor() {
    this.peerConnection = null;
    this.gstreamerProcess = null;
  }

  async start() {
    try {
      await this.fetchICEServers();
      const offer = await this.waitForOffer();
      const answer = await this.createAnswer(offer);
      await this.sendAnswer(answer);
      await this.startGStreamer();
      
      setInterval(() => {
        console.log('[WebRTC] Server alive, streaming desktop...');
      }, 30000);
    } catch (error) {
      console.error('[WebRTC] Failed to start:', error.message);
      process.exit(1);
    }
  }

  async fetchICEServers() {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: MASTER_CONTROLLER_URL.replace('http://', '').split(':')[0],
        port: 4000,
        path: '/api/webrtc/ice-servers',
        method: 'GET'
      };
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            config.iceServers = result.iceServers;
            resolve();
          } catch (error) { reject(error); }
        });
      });
      req.on('error', reject);
      req.end();
    });
  }

  async waitForOffer(maxWaitMs = 60000) {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitMs) {
      try {
        const offer = await this.pollOffer();
        if (offer) return offer;
      } catch (error) { console.error(error.message); }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error('Timeout waiting for client offer');
  }

  async pollOffer() {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: MASTER_CONTROLLER_URL.replace('http://', '').split(':')[0],
        port: 4000,
        path: `/api/webrtc/session/${SESSION_ID}/offer`,
        method: 'GET'
      };
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 404) { resolve(null); return; }
          try { resolve(JSON.parse(data)); } catch (error) { reject(error); }
        });
      });
      req.on('error', reject);
      req.end();
    });
  }

  async createAnswer(offerData) {
    const answer = {
      type: 'answer',
      sdp: this.generateMockSDP(offerData.offer.sdp)
    };
    return { answer, candidates: [] };
  }

  generateMockSDP(offerSDP) {
    return `v=0
o=- ${Date.now()} 2 IN IP4 192.168.100.5
s=Polydev WebRTC Stream
t=0 0
a=group:BUNDLE 0
a=msid-semantic: WMS stream
m=video 9 UDP/TLS/RTP/SAVPF 96
c=IN IP4 0.0.0.0
a=rtcp:9 IN IP4 0.0.0.0
a=ice-ufrag:${this.randomString(8)}
a=ice-pwd:${this.randomString(24)}
a=ice-options:trickle
a=fingerprint:sha-256 ${this.randomFingerprint()}
a=setup:active
a=mid:0
a=sendonly
a=rtcp-mux
a=rtcp-rsize
a=rtpmap:96 VP8/90000
a=ssrc:${this.randomSSRC()} cname:stream
a=ssrc:${this.randomSSRC()} msid:stream video0
a=ssrc:${this.randomSSRC()} mslabel:stream
a=ssrc:${this.randomSSRC()} label:video0
`;
  }

  randomString(length) {
    return Array.from({ length }, () => Math.floor(Math.random() * 36).toString(36)).join('');
  }
  randomFingerprint() {
    return Array.from({ length: 32 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join(':').toUpperCase();
  }
  randomSSRC() { return Math.floor(Math.random() * 0xFFFFFFFF); }

  async sendAnswer(answerData) {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify(answerData);
      const options = {
        hostname: MASTER_CONTROLLER_URL.replace('http://', '').split(':')[0],
        port: 4000,
        path: `/api/webrtc/session/${SESSION_ID}/answer`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
      };
      const req = http.request(options, (res) => {
        if (res.statusCode === 200) resolve();
        else reject(new Error(`HTTP ${res.statusCode}`));
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  }

  async startGStreamer() {
    console.log('[WebRTC] Starting GStreamer pipeline...');
    const gstPipeline = [
      'gst-launch-1.0', '-v',
      `ximagesrc display-name=${DISPLAY} use-damage=0`,
      '!', 'video/x-raw,framerate=30/1',
      '!', 'videoscale', '!', `video/x-raw,width=1280,height=720`,
      '!', 'vp8enc', `target-bitrate=${config.videoBitrate}000`, 'deadline=1', 'cpu-used=4',
      '!', 'rtpvp8pay', '!', 'fakesink'
    ];
    this.gstreamerProcess = spawn(gstPipeline[0], gstPipeline.slice(1), {
      env: { ...process.env, DISPLAY },
      stdio: ['ignore', 'pipe', 'pipe']
    });
  }
}

if (require.main === module) {
  if (!SESSION_ID) {
    console.error('SESSION_ID required');
    process.exit(1);
  }
  new VMWebRTCServer().start();
}
EOF

    # Supervisor Script
    cat > rootfs/opt/vm-browser-agent/supervisor.sh <<'EOF'
#!/bin/bash
set -e
/usr/bin/node /opt/vm-browser-agent/server.js > /var/log/oauth-agent.log 2>&1 &
OAUTH_PID=$!
/usr/bin/node /opt/vm-browser-agent/webrtc-server.js > /var/log/webrtc-server.log 2>&1 &
WEBRTC_PID=$!

trap "kill $OAUTH_PID $WEBRTC_PID 2>/dev/null; exit 0" SIGTERM SIGINT

while true; do
    if ! kill -0 $OAUTH_PID 2>/dev/null; then
        /usr/bin/node /opt/vm-browser-agent/server.js > /var/log/oauth-agent.log 2>&1 &
        OAUTH_PID=$!
    fi
    if ! kill -0 $WEBRTC_PID 2>/dev/null; then
        /usr/bin/node /opt/vm-browser-agent/webrtc-server.js > /var/log/webrtc-server.log 2>&1 &
        WEBRTC_PID=$!
    fi
    sleep 10
done
EOF
    chmod +x rootfs/opt/vm-browser-agent/supervisor.sh

    # Supervisor Service
    cat > rootfs/etc/systemd/system/vm-browser-agent.service <<'EOF'
[Unit]
Description=VM Browser Supervisor
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/vm-browser-agent
ExecStart=/bin/bash /opt/vm-browser-agent/supervisor.sh
Restart=always
RestartSec=5
Environment=DISPLAY=:1

[Install]
WantedBy=multi-user.target
EOF

    chroot rootfs systemctl enable vm-browser-agent
}

# Cleanup
cleanup_rootfs() {
    log_info "Cleaning up..."
    chroot rootfs apt-get clean
    rm -rf rootfs/tmp/*
    umount rootfs
}

# Create snapshot
create_snapshot() {
    log_info "Finalizing snapshot..."
    mkdir -p "$SNAPSHOT_DIR"
    mv rootfs.ext4 "$SNAPSHOT_DIR/golden-rootfs.ext4"
    log_info "Snapshot created at $SNAPSHOT_DIR/golden-rootfs.ext4"
}

# Main
main() {
    check_prerequisites
    create_rootfs
    bootstrap_ubuntu
    configure_system
    install_packages
    install_cli_tools
    setup_services
    setup_vm_api
    cleanup_rootfs
    create_snapshot
}

trap 'umount rootfs 2>/dev/null || true' ERR
main
