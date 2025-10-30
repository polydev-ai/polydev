#!/bin/bash

# Nomad Installation Script for Polydev AI V2
# This script installs and configures Nomad on Ubuntu 22.04

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
NOMAD_VERSION="1.7.3"
INSTALL_DIR="/usr/local/bin"
CONFIG_DIR="/etc/nomad.d"
DATA_DIR="/opt/nomad/data"
LOG_DIR="/var/log/nomad"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Nomad Installation for Polydev AI V2${NC}"
echo -e "${GREEN}========================================${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Error: This script must be run as root${NC}"
  exit 1
fi

# Detect architecture
ARCH=$(uname -m)
if [ "$ARCH" = "x86_64" ]; then
  NOMAD_ARCH="amd64"
elif [ "$ARCH" = "aarch64" ]; then
  NOMAD_ARCH="arm64"
else
  echo -e "${RED}Error: Unsupported architecture: $ARCH${NC}"
  exit 1
fi

echo -e "${YELLOW}Detected architecture: $ARCH (Nomad: $NOMAD_ARCH)${NC}"

# Step 1: Install Docker if not already installed
echo -e "\n${GREEN}Step 1: Checking Docker installation...${NC}"
if ! command -v docker &> /dev/null; then
  echo -e "${YELLOW}Docker not found. Installing Docker...${NC}"

  # Install Docker prerequisites
  apt-get update
  apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

  # Add Docker's official GPG key
  mkdir -p /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

  # Set up Docker repository
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

  # Install Docker Engine
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

  # Start and enable Docker
  systemctl start docker
  systemctl enable docker

  echo -e "${GREEN}Docker installed successfully${NC}"
else
  echo -e "${GREEN}Docker is already installed ($(docker --version))${NC}"
fi

# Step 2: Download and install Nomad
echo -e "\n${GREEN}Step 2: Installing Nomad v${NOMAD_VERSION}...${NC}"

# Download Nomad
NOMAD_ZIP="nomad_${NOMAD_VERSION}_linux_${NOMAD_ARCH}.zip"
NOMAD_URL="https://releases.hashicorp.com/nomad/${NOMAD_VERSION}/${NOMAD_ZIP}"

echo -e "${YELLOW}Downloading Nomad from: $NOMAD_URL${NC}"
cd /tmp
curl -O "$NOMAD_URL"

# Install unzip if not present
if ! command -v unzip &> /dev/null; then
  apt-get install -y unzip
fi

# Extract and install
unzip -o "$NOMAD_ZIP"
mv nomad "$INSTALL_DIR/nomad"
chmod +x "$INSTALL_DIR/nomad"

# Verify installation
INSTALLED_VERSION=$("$INSTALL_DIR/nomad" version | head -n1)
echo -e "${GREEN}Nomad installed: $INSTALLED_VERSION${NC}"

# Cleanup
rm -f "$NOMAD_ZIP"

# Step 3: Create directories
echo -e "\n${GREEN}Step 3: Creating Nomad directories...${NC}"
mkdir -p "$CONFIG_DIR"
mkdir -p "$DATA_DIR"
mkdir -p "$LOG_DIR"
mkdir -p /var/lib/firecracker/snapshots
mkdir -p /var/lib/firecracker/vms

echo -e "${GREEN}Directories created:${NC}"
echo -e "  - Config: $CONFIG_DIR"
echo -e "  - Data: $DATA_DIR"
echo -e "  - Logs: $LOG_DIR"

# Step 4: Copy configuration file
echo -e "\n${GREEN}Step 4: Installing Nomad configuration...${NC}"
if [ -f "../nomad-config/nomad.hcl" ]; then
  cp "../nomad-config/nomad.hcl" "$CONFIG_DIR/nomad.hcl"
  echo -e "${GREEN}Configuration file installed to $CONFIG_DIR/nomad.hcl${NC}"
else
  echo -e "${YELLOW}Warning: nomad.hcl not found in ../nomad-config/${NC}"
  echo -e "${YELLOW}You will need to manually create the configuration file${NC}"
fi

# Step 5: Install systemd service
echo -e "\n${GREEN}Step 5: Installing systemd service...${NC}"
if [ -f "../nomad-config/nomad.service" ]; then
  cp "../nomad-config/nomad.service" /etc/systemd/system/nomad.service

  # Reload systemd
  systemctl daemon-reload

  echo -e "${GREEN}Systemd service installed${NC}"
else
  echo -e "${YELLOW}Warning: nomad.service not found in ../nomad-config/${NC}"
  echo -e "${YELLOW}You will need to manually create the service file${NC}"
fi

# Step 6: Enable and start Nomad
echo -e "\n${GREEN}Step 6: Starting Nomad service...${NC}"
systemctl enable nomad
systemctl start nomad

# Wait for service to start
sleep 3

# Check service status
if systemctl is-active --quiet nomad; then
  echo -e "${GREEN}✓ Nomad service is running${NC}"
else
  echo -e "${RED}✗ Nomad service failed to start${NC}"
  echo -e "${YELLOW}Check logs with: journalctl -u nomad -f${NC}"
  exit 1
fi

# Step 7: Verify Nomad cluster
echo -e "\n${GREEN}Step 7: Verifying Nomad cluster...${NC}"
sleep 5  # Give Nomad time to bootstrap

# Check server status
if "$INSTALL_DIR/nomad" server members &> /dev/null; then
  echo -e "${GREEN}✓ Nomad server is operational${NC}"
  "$INSTALL_DIR/nomad" server members
else
  echo -e "${YELLOW}⚠ Nomad server status check failed (may still be initializing)${NC}"
fi

# Check node status
if "$INSTALL_DIR/nomad" node status &> /dev/null; then
  echo -e "${GREEN}✓ Nomad client is operational${NC}"
  "$INSTALL_DIR/nomad" node status
else
  echo -e "${YELLOW}⚠ Nomad client status check failed (may still be initializing)${NC}"
fi

# Step 8: Final instructions
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Nomad Installation Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e ""
echo -e "Nomad UI:     ${GREEN}http://$(hostname -I | awk '{print $1}'):4646${NC}"
echo -e "Nomad API:    ${GREEN}http://localhost:4646/v1/jobs${NC}"
echo -e "Metrics:      ${GREEN}http://localhost:4646/v1/metrics${NC}"
echo -e ""
echo -e "Useful commands:"
echo -e "  ${YELLOW}nomad status${NC}              - View cluster status"
echo -e "  ${YELLOW}nomad node status${NC}         - View node status"
echo -e "  ${YELLOW}nomad job run <file.nomad>${NC} - Run a job"
echo -e "  ${YELLOW}systemctl status nomad${NC}    - Check service status"
echo -e "  ${YELLOW}journalctl -u nomad -f${NC}    - View logs"
echo -e ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Build Docker images for runtime containers (Phase 5)"
echo -e "2. Deploy warm pool jobs (Phase 2)"
echo -e "3. Integrate with master-controller service"
echo -e ""

exit 0
