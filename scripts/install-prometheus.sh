#!/bin/bash

# Prometheus Installation Script for Polydev AI V2 - Phase 6
# Installs Prometheus for monitoring Nomad, Docker, and Master-Controller

set -e
set -u

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROMETHEUS_VERSION="2.48.0"
ARCH="amd64"  # x86_64

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Prometheus Installation${NC}"
echo -e "${GREEN}========================================${NC}"

# Check root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Error: Must run as root${NC}"
  exit 1
fi

# Step 1: Download Prometheus
echo -e "\n${GREEN}Step 1: Downloading Prometheus v${PROMETHEUS_VERSION}...${NC}"
cd /tmp
wget -q "https://github.com/prometheus/prometheus/releases/download/v${PROMETHEUS_VERSION}/prometheus-${PROMETHEUS_VERSION}.linux-${ARCH}.tar.gz"

# Step 2: Extract
echo -e "${GREEN}Step 2: Extracting...${NC}"
tar -xzf "prometheus-${PROMETHEUS_VERSION}.linux-${ARCH}.tar.gz"
cd "prometheus-${PROMETHEUS_VERSION}.linux-${ARCH}"

# Step 3: Install binaries
echo -e "${GREEN}Step 3: Installing binaries...${NC}"
cp prometheus /usr/local/bin/
cp promtool /usr/local/bin/
chmod +x /usr/local/bin/prometheus /usr/local/bin/promtool

# Verify
/usr/local/bin/prometheus --version
echo -e "${GREEN}✓ Prometheus installed${NC}"

# Step 4: Create directories
echo -e "${GREEN}Step 4: Creating directories...${NC}"
mkdir -p /etc/prometheus
mkdir -p /var/lib/prometheus
mkdir -p /var/log/prometheus

# Step 5: Copy configuration
echo -e "${GREEN}Step 5: Installing configuration...${NC}"
if [ -f "/tmp/monitoring/prometheus.yml" ]; then
  cp /tmp/monitoring/prometheus.yml /etc/prometheus/
  echo -e "${GREEN}✓ Configuration installed${NC}"
else
  cp prometheus.yml /etc/prometheus/
  echo -e "${YELLOW}⚠ Using default config${NC}"
fi

# Copy console libraries
cp -r consoles /etc/prometheus/
cp -r console_libraries /etc/prometheus/

# Step 6: Create user
echo -e "${GREEN}Step 6: Creating prometheus user...${NC}"
useradd --no-create-home --shell /bin/false prometheus 2>/dev/null || echo -e "${YELLOW}  User already exists${NC}"

# Set permissions
chown -R prometheus:prometheus /etc/prometheus
chown -R prometheus:prometheus /var/lib/prometheus
chown -R prometheus:prometheus /var/log/prometheus

# Step 7: Create systemd service
echo -e "${GREEN}Step 7: Creating systemd service...${NC}"
cat > /etc/systemd/system/prometheus.service << 'EOF'
[Unit]
Description=Prometheus - Monitoring System
Documentation=https://prometheus.io/docs/introduction/overview/
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=prometheus
Group=prometheus
ExecStart=/usr/local/bin/prometheus \
  --config.file=/etc/prometheus/prometheus.yml \
  --storage.tsdb.path=/var/lib/prometheus/ \
  --storage.tsdb.retention.time=15d \
  --web.console.templates=/etc/prometheus/consoles \
  --web.console.libraries=/etc/prometheus/console_libraries \
  --web.listen-address=0.0.0.0:9090 \
  --web.enable-lifecycle

ExecReload=/bin/kill -HUP $MAINPID
Restart=on-failure
RestartSec=5s

StandardOutput=journal
StandardError=journal
SyslogIdentifier=prometheus

[Install]
WantedBy=multi-user.target
EOF

# Step 8: Install Node Exporter (system metrics)
echo -e "${GREEN}Step 8: Installing Node Exporter...${NC}"
cd /tmp
wget -q "https://github.com/prometheus/node_exporter/releases/download/v1.7.0/node_exporter-1.7.0.linux-${ARCH}.tar.gz"
tar -xzf "node_exporter-1.7.0.linux-${ARCH}.tar.gz"
cp "node_exporter-1.7.0.linux-${ARCH}/node_exporter" /usr/local/bin/
chmod +x /usr/local/bin/node_exporter

# Node Exporter systemd service
cat > /etc/systemd/system/node-exporter.service << 'EOF'
[Unit]
Description=Node Exporter - System Metrics
After=network.target

[Service]
Type=simple
User=prometheus
Group=prometheus
ExecStart=/usr/local/bin/node_exporter

Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

# Step 9: Start services
echo -e "${GREEN}Step 9: Starting services...${NC}"
systemctl daemon-reload
systemctl enable prometheus
systemctl enable node-exporter
systemctl start node-exporter
systemctl start prometheus
sleep 3

# Verify
if systemctl is-active --quiet prometheus && systemctl is-active --quiet node-exporter; then
  echo -e "${GREEN}✓ Services running${NC}"
else
  echo -e "${RED}✗ Service start failed${NC}"
  journalctl -u prometheus -n 20 --no-pager
  exit 1
fi

# Step 10: Test endpoints
echo -e "${GREEN}Step 10: Testing endpoints...${NC}"
sleep 2

curl -s http://localhost:9090/-/healthy >/dev/null && echo -e "${GREEN}✓ Prometheus healthy${NC}" || echo -e "${RED}✗ Prometheus unhealthy${NC}"
curl -s http://localhost:9100/metrics | head -1 >/dev/null && echo -e "${GREEN}✓ Node Exporter working${NC}" || echo -e "${RED}✗ Node Exporter failed${NC}"

# Cleanup
cd /tmp
rm -rf prometheus-* node_exporter-*

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Prometheus Installation Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e ""
echo -e "Prometheus UI:    ${GREEN}http://$(hostname -I | awk '{print $1}'):9090${NC}"
echo -e "Targets Status:   ${GREEN}http://$(hostname -I | awk '{print $1}'):9090/targets${NC}"
echo -e ""
echo -e "Scraping:"
echo -e "  - Master-Controller: ${GREEN}http://localhost:4000/metrics${NC}"
echo -e "  - Nomad: ${GREEN}http://localhost:4646/v1/metrics${NC}"
echo -e "  - Node Exporter: ${GREEN}http://localhost:9100/metrics${NC}"
echo -e ""
echo -e "Useful commands:"
echo -e "  ${YELLOW}systemctl status prometheus${NC}    - Check status"
echo -e "  ${YELLOW}journalctl -u prometheus -f${NC}     - View logs"
echo -e "  ${YELLOW}promtool check config /etc/prometheus/prometheus.yml${NC} - Validate config"
echo -e ""
echo -e "${YELLOW}Next: Install Grafana for dashboards${NC}"
echo -e ""

exit 0
