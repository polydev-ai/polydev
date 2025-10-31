#!/bin/bash

#
# Setup Firecracker Network Bridge
# Creates fcbr0 bridge for VM networking
#

set -e

echo "========================================="
echo "Setting up Firecracker Network"
echo "========================================="

# Get the main network interface
MAIN_INTERFACE=$(ip route | grep default | awk '{print $5}' | head -1)
echo "Main interface: $MAIN_INTERFACE"

# Create bridge if it doesn't exist
if ip link show fcbr0 >/dev/null 2>&1; then
  echo "✓ Bridge fcbr0 already exists"
else
  echo "[1/4] Creating bridge fcbr0..."
  ip link add fcbr0 type bridge
  echo "✓ Bridge created"
fi

# Configure bridge IP
echo "[2/4] Configuring bridge IP (192.168.100.1/24)..."
ip addr flush dev fcbr0 2>/dev/null || true
ip addr add 192.168.100.1/24 dev fcbr0
ip link set fcbr0 up
echo "✓ Bridge configured"

# Enable IP forwarding
echo "[3/4] Enabling IP forwarding..."
echo 1 > /proc/sys/net/ipv4/ip_forward
sysctl -w net.ipv4.ip_forward=1
echo "✓ IP forwarding enabled"

# Add NAT rules
echo "[4/4] Configuring NAT..."
iptables -t nat -C POSTROUTING -o $MAIN_INTERFACE -j MASQUERADE 2>/dev/null || \
  iptables -t nat -A POSTROUTING -o $MAIN_INTERFACE -j MASQUERADE
echo "✓ NAT configured"

echo ""
echo "========================================="
echo "✅ Firecracker network ready!"
echo "========================================="
echo ""
echo "Bridge: fcbr0 (192.168.100.1/24)"
echo "NAT: Enabled via $MAIN_INTERFACE"
echo ""
ip addr show fcbr0
echo ""
