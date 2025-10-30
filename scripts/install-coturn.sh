#!/bin/bash

# Coturn Installation Script for Polydev AI V2 - Phase 3
# Installs and configures coturn TURN/STUN server for WebRTC streaming

set -e
set -u

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Coturn TURN/STUN Server Installation${NC}"
echo -e "${GREEN}========================================${NC}"

# Check root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Error: Must run as root${NC}"
  exit 1
fi

# Step 1: Install coturn
echo -e "\n${GREEN}Step 1: Installing coturn...${NC}"
apt-get update
apt-get install -y coturn

# Verify installation
if ! command -v turnserver &> /dev/null; then
  echo -e "${RED}Error: coturn installation failed${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Coturn installed: $(turnserver --version 2>&1 | head -1)${NC}"

# Step 2: Create log directory
echo -e "\n${GREEN}Step 2: Creating log directory...${NC}"
mkdir -p /var/log/turnserver
chown turnserver:turnserver /var/log/turnserver

# Step 3: Copy configuration
echo -e "\n${GREEN}Step 3: Installing configuration...${NC}"
if [ -f "../webrtc-config/turnserver.conf" ]; then
  cp ../webrtc-config/turnserver.conf /etc/turnserver.conf
  echo -e "${GREEN}✓ Configuration installed${NC}"
else
  echo -e "${YELLOW}Warning: turnserver.conf not found${NC}"
  echo -e "${YELLOW}Creating basic configuration...${NC}"

  cat > /etc/turnserver.conf << 'EOFCONF'
listening-port=3478
tls-listening-port=5349
external-ip=135.181.138.102
listening-ip=0.0.0.0
relay-ip=135.181.138.102
realm=polydev.ai
server-name=turn.polydev.ai
lt-cred-mech
user=polydev:PolydevWebRTC2025!
min-port=49152
max-port=65535
fingerprint
log-file=/var/log/turnserver/turnserver.log
verbose
no-stdout-log
syslog
no-loopback-peers
no-multicast-peers
no-cli
max-bps=1000000
total-quota=100
stale-nonce=600
mobility
relay-threads=4
proc-user=turnserver
proc-group=turnserver
EOFCONF

  echo -e "${GREEN}✓ Basic configuration created${NC}"
fi

# Step 4: Enable coturn in default config
echo -e "\n${GREEN}Step 4: Enabling coturn service...${NC}"
sed -i 's/#TURNSERVER_ENABLED=1/TURNSERVER_ENABLED=1/' /etc/default/coturn
echo -e "${GREEN}✓ Coturn enabled in /etc/default/coturn${NC}"

# Step 5: Configure firewall
echo -e "\n${GREEN}Step 5: Configuring firewall...${NC}"
echo -e "${YELLOW}Opening required ports:${NC}"
echo -e "  - 3478 (STUN/TURN UDP/TCP)"
echo -e "  - 5349 (TURNS TLS)"
echo -e "  - 49152-65535 (UDP relay)"

# Check if ufw is active
if command -v ufw &> /dev/null && ufw status | grep -q "Status: active"; then
  ufw allow 3478/tcp
  ufw allow 3478/udp
  ufw allow 5349/tcp
  ufw allow 5349/udp
  ufw allow 49152:65535/udp
  echo -e "${GREEN}✓ Firewall rules added${NC}"
else
  echo -e "${YELLOW}⚠ UFW not active, skipping firewall config${NC}"
  echo -e "${YELLOW}  Ensure ports 3478, 5349, 49152-65535 are open${NC}"
fi

# Step 6: Start coturn
echo -e "\n${GREEN}Step 6: Starting coturn service...${NC}"
systemctl enable coturn
systemctl restart coturn
sleep 2

# Check if running
if systemctl is-active --quiet coturn; then
  echo -e "${GREEN}✓ Coturn service is running${NC}"
else
  echo -e "${RED}✗ Coturn service failed to start${NC}"
  echo -e "${YELLOW}Check logs: journalctl -u coturn -n 50${NC}"
  exit 1
fi

# Step 7: Test STUN server
echo -e "\n${GREEN}Step 7: Testing STUN server...${NC}"
if command -v stunclient &> /dev/null; then
  stunclient 135.181.138.102 3478 || echo -e "${YELLOW}⚠ STUN test failed (stunclient may not be installed)${NC}"
else
  echo -e "${YELLOW}⚠ stunclient not installed, skipping STUN test${NC}"
  echo -e "${YELLOW}  Install with: apt-get install stuntman-client${NC}"
fi

# Step 8: Display summary
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Coturn Installation Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e ""
echo -e "STUN Server:  ${GREEN}stun:135.181.138.102:3478${NC}"
echo -e "TURN Server:  ${GREEN}turn:135.181.138.102:3478${NC}"
echo -e "TURNS (TLS):  ${GREEN}turns:135.181.138.102:5349${NC}"
echo -e "Username:     ${GREEN}polydev${NC}"
echo -e "Password:     ${GREEN}PolydevWebRTC2025!${NC}"
echo -e ""
echo -e "Useful commands:"
echo -e "  ${YELLOW}systemctl status coturn${NC}     - Check service status"
echo -e "  ${YELLOW}journalctl -u coturn -f${NC}     - View logs"
echo -e "  ${YELLOW}netstat -tulnp | grep turn${NC}  - Check listening ports"
echo -e ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Test STUN/TURN connectivity from client"
echo -e "2. Implement WebRTC signaling server"
echo -e "3. Create VM-side WebRTC peer connection"
echo -e "4. Build frontend WebRTC client"
echo -e ""

exit 0
