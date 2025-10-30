#!/bin/bash

# Grafana Installation Script for Polydev AI V2 - Phase 6
# Installs Grafana for visualizing Prometheus metrics

set -e
set -u

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Grafana Installation${NC}"
echo -e "${GREEN}========================================${NC}"

# Check root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Error: Must run as root${NC}"
  exit 1
fi

# Step 1: Add Grafana APT repository
echo -e "\n${GREEN}Step 1: Adding Grafana repository...${NC}"
apt-get install -y apt-transport-https software-properties-common wget

wget -q -O - https://apt.grafana.com/gpg.key | gpg --dearmor | tee /usr/share/keyrings/grafana.gpg > /dev/null
echo "deb [signed-by=/usr/share/keyrings/grafana.gpg] https://apt.grafana.com stable main" | tee /etc/apt/sources.list.d/grafana.list

# Step 2: Install Grafana
echo -e "${GREEN}Step 2: Installing Grafana...${NC}"
apt-get update
apt-get install -y grafana

# Step 3: Configure Grafana
echo -e "${GREEN}Step 3: Configuring Grafana...${NC}"

# Set admin password (change in production!)
cat > /etc/grafana/grafana.ini.d/polydev.ini << 'EOF'
[server]
http_port = 3000
domain = 135.181.138.102
root_url = %(protocol)s://%(domain)s:%(http_port)s/

[security]
admin_user = admin
admin_password = PolydevGrafana2025!

[auth.anonymous]
enabled = false

[snapshots]
external_enabled = false
EOF

# Step 4: Create provisioning directories
echo -e "${GREEN}Step 4: Setting up data source provisioning...${NC}"
mkdir -p /etc/grafana/provisioning/datasources

# Create Prometheus datasource
cat > /etc/grafana/provisioning/datasources/prometheus.yml << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://localhost:9090
    isDefault: true
    editable: false
    jsonData:
      timeInterval: "15s"
EOF

# Step 5: Start Grafana
echo -e "${GREEN}Step 5: Starting Grafana...${NC}"
systemctl daemon-reload
systemctl enable grafana-server
systemctl start grafana-server
sleep 5

# Verify
if systemctl is-active --quiet grafana-server; then
  echo -e "${GREEN}✓ Grafana service running${NC}"
else
  echo -e "${RED}✗ Grafana service failed${NC}"
  journalctl -u grafana-server -n 20 --no-pager
  exit 1
fi

# Step 6: Test endpoint
echo -e "${GREEN}Step 6: Testing Grafana...${NC}"
sleep 3

curl -s http://localhost:3000/api/health | grep -q "ok" && echo -e "${GREEN}✓ Grafana healthy${NC}" || echo -e "${RED}✗ Grafana unhealthy${NC}"

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Grafana Installation Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e ""
echo -e "Grafana UI:     ${GREEN}http://135.181.138.102:3000${NC}"
echo -e "Username:       ${GREEN}admin${NC}"
echo -e "Password:       ${GREEN}PolydevGrafana2025!${NC}"
echo -e ""
echo -e "Datasource:     ${GREEN}Prometheus (pre-configured)${NC}"
echo -e ""
echo -e "Useful commands:"
echo -e "  ${YELLOW}systemctl status grafana-server${NC}  - Check status"
echo -e "  ${YELLOW}journalctl -u grafana-server -f${NC}   - View logs"
echo -e ""
echo -e "${YELLOW}Next: Create dashboards and alert rules${NC}"
echo -e ""

exit 0
