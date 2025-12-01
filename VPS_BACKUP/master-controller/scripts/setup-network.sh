#!/bin/bash
#
# Setup Network Infrastructure for Firecracker VMs
# Creates bridge device and configures NAT for VM networking
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

# Configuration from environment or defaults
BRIDGE_DEVICE="${BRIDGE_DEVICE:-fcbr0}"
BRIDGE_IP="${BRIDGE_IP:-192.168.100.1}"
INTERNAL_NETWORK="${INTERNAL_NETWORK:-192.168.100.0/24}"
EXTERNAL_INTERFACE="${EXTERNAL_INTERFACE:-$(ip route | grep default | awk '{print $5}' | head -1)}"

# Check root
if [ "$EUID" -ne 0 ]; then
    log_error "This script must be run as root"
    exit 1
fi

log_info "Network configuration:"
log_info "  Bridge device: $BRIDGE_DEVICE"
log_info "  Bridge IP: $BRIDGE_IP"
log_info "  Internal network: $INTERNAL_NETWORK"
log_info "  External interface: $EXTERNAL_INTERFACE"

# Create bridge device
create_bridge() {
    log_info "Creating bridge device..."

    if ip link show "$BRIDGE_DEVICE" &>/dev/null; then
        log_warn "Bridge $BRIDGE_DEVICE already exists, recreating..."
        ip link set "$BRIDGE_DEVICE" down
        ip link delete "$BRIDGE_DEVICE"
    fi

    # Create bridge
    ip link add name "$BRIDGE_DEVICE" type bridge
    ip addr add "$BRIDGE_IP/24" dev "$BRIDGE_DEVICE"
    ip link set "$BRIDGE_DEVICE" up

    log_info "Bridge device created: $BRIDGE_DEVICE"
}

# Configure IP forwarding
configure_forwarding() {
    log_info "Configuring IP forwarding..."

    # Enable IP forwarding
    echo 1 > /proc/sys/net/ipv4/ip_forward

    # Make persistent
    if ! grep -q "^net.ipv4.ip_forward=1" /etc/sysctl.conf; then
        echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf
    fi

    log_info "IP forwarding enabled"
}

# Configure NAT
configure_nat() {
    log_info "Configuring NAT..."

    # Remove existing rules for this bridge
    iptables -t nat -D POSTROUTING -s "$INTERNAL_NETWORK" -o "$EXTERNAL_INTERFACE" -j MASQUERADE 2>/dev/null || true
    iptables -D FORWARD -i "$BRIDGE_DEVICE" -o "$EXTERNAL_INTERFACE" -j ACCEPT 2>/dev/null || true
    iptables -D FORWARD -i "$EXTERNAL_INTERFACE" -o "$BRIDGE_DEVICE" -m state --state RELATED,ESTABLISHED -j ACCEPT 2>/dev/null || true

    # Add NAT rule
    iptables -t nat -A POSTROUTING -s "$INTERNAL_NETWORK" -o "$EXTERNAL_INTERFACE" -j MASQUERADE

    # Add forwarding rules
    iptables -A FORWARD -i "$BRIDGE_DEVICE" -o "$EXTERNAL_INTERFACE" -j ACCEPT
    iptables -A FORWARD -i "$EXTERNAL_INTERFACE" -o "$BRIDGE_DEVICE" -m state --state RELATED,ESTABLISHED -j ACCEPT

    log_info "NAT configured"
}

# Save iptables rules
save_iptables() {
    log_info "Saving iptables rules..."

    if command -v iptables-save &>/dev/null; then
        iptables-save > /etc/iptables/rules.v4 2>/dev/null || true
    fi

    if command -v netfilter-persistent &>/dev/null; then
        netfilter-persistent save
    fi

    log_info "iptables rules saved"
}

# Create systemd service for network setup
create_systemd_service() {
    log_info "Creating systemd service..."

    cat > /etc/systemd/system/firecracker-network.service <<EOF
[Unit]
Description=Firecracker Network Setup
After=network.target

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=$(realpath "$0")
ExecStop=/usr/bin/ip link set $BRIDGE_DEVICE down
ExecStop=/usr/bin/ip link delete $BRIDGE_DEVICE

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable firecracker-network.service

    log_info "Systemd service created and enabled"
}

# Verify network setup
verify_setup() {
    log_info "Verifying network setup..."

    # Check bridge exists
    if ! ip link show "$BRIDGE_DEVICE" &>/dev/null; then
        log_error "Bridge device $BRIDGE_DEVICE not found!"
        return 1
    fi

    # Check bridge is up
    if ! ip link show "$BRIDGE_DEVICE" | grep -q "UP"; then
        log_error "Bridge device $BRIDGE_DEVICE is not UP!"
        return 1
    fi

    # Check IP forwarding
    if [ "$(cat /proc/sys/net/ipv4/ip_forward)" != "1" ]; then
        log_error "IP forwarding is not enabled!"
        return 1
    fi

    # Check NAT rule
    if ! iptables -t nat -L POSTROUTING -n | grep -q "$INTERNAL_NETWORK"; then
        log_error "NAT rule not found!"
        return 1
    fi

    log_info "Network setup verified successfully"
    return 0
}

# Show network status
show_status() {
    echo ""
    log_info "Network Status:"
    echo ""

    echo "Bridge device:"
    ip addr show "$BRIDGE_DEVICE" | sed 's/^/  /'
    echo ""

    echo "NAT rules:"
    iptables -t nat -L POSTROUTING -n -v | grep "$INTERNAL_NETWORK" | sed 's/^/  /'
    echo ""

    echo "Forward rules:"
    iptables -L FORWARD -n -v | grep "$BRIDGE_DEVICE" | sed 's/^/  /'
    echo ""
}

# Main execution
main() {
    log_info "Setting up Firecracker network infrastructure..."

    create_bridge
    configure_forwarding
    configure_nat
    save_iptables
    create_systemd_service

    if verify_setup; then
        show_status
        log_info "Network setup complete!"
        log_info "VMs can now use IPs in range: $INTERNAL_NETWORK"
    else
        log_error "Network setup verification failed!"
        exit 1
    fi
}

# Cleanup function
cleanup() {
    log_warn "Removing network configuration..."

    # Remove iptables rules
    iptables -t nat -D POSTROUTING -s "$INTERNAL_NETWORK" -o "$EXTERNAL_INTERFACE" -j MASQUERADE 2>/dev/null || true
    iptables -D FORWARD -i "$BRIDGE_DEVICE" -o "$EXTERNAL_INTERFACE" -j ACCEPT 2>/dev/null || true
    iptables -D FORWARD -i "$EXTERNAL_INTERFACE" -o "$BRIDGE_DEVICE" -m state --state RELATED,ESTABLISHED -j ACCEPT 2>/dev/null || true

    # Remove bridge
    ip link set "$BRIDGE_DEVICE" down 2>/dev/null || true
    ip link delete "$BRIDGE_DEVICE" 2>/dev/null || true

    log_info "Network configuration removed"
}

# Handle command line arguments
case "${1:-}" in
    cleanup)
        cleanup
        ;;
    verify)
        verify_setup && show_status
        ;;
    status)
        show_status
        ;;
    *)
        main
        ;;
esac
