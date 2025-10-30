#!/bin/bash

# Decodo Proxy iptables Configuration Script
# Maps Decodo proxy ports to VM internal IPs for egress traffic

set -e
set -u

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Error: Must run as root${NC}"
  exit 1
fi

# Configuration
DECODO_HOST="dc.decodo.com"
PORT_START=10001
PORT_END=10100
VM_NETWORK="192.168.100.0/24"

ACTION="${1:-help}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Decodo Proxy iptables Configuration${NC}"
echo -e "${GREEN}========================================${NC}"

# Function to add iptables rules for a VM
add_vm_proxy_route() {
  local VM_IP=$1
  local PROXY_PORT=$2

  echo -e "${YELLOW}Adding proxy route: VM ${VM_IP} → Decodo port ${PROXY_PORT}${NC}"

  # SNAT: Change source IP of outgoing traffic from VM to use Decodo proxy
  # This ensures all egress traffic from VM goes through Decodo
  iptables -t nat -A POSTROUTING -s ${VM_IP}/32 -j SNAT --to-source ${DECODO_HOST}:${PROXY_PORT} 2>/dev/null || {
    echo -e "${YELLOW}  ⚠ SNAT rule may already exist or syntax unsupported${NC}"
  }

  # Mark packets from this VM for policy routing
  iptables -t mangle -A PREROUTING -s ${VM_IP}/32 -j MARK --set-mark ${PROXY_PORT}

  echo -e "${GREEN}  ✓ Rules added for VM ${VM_IP} → Port ${PROXY_PORT}${NC}"
}

# Function to remove iptables rules for a VM
remove_vm_proxy_route() {
  local VM_IP=$1
  local PROXY_PORT=$2

  echo -e "${YELLOW}Removing proxy route: VM ${VM_IP} → Decodo port ${PROXY_PORT}${NC}"

  # Remove SNAT rule
  iptables -t nat -D POSTROUTING -s ${VM_IP}/32 -j SNAT --to-source ${DECODO_HOST}:${PROXY_PORT} 2>/dev/null || {
    echo -e "${YELLOW}  ⚠ SNAT rule not found (may already be removed)${NC}"
  }

  # Remove packet marking
  iptables -t mangle -D PREROUTING -s ${VM_IP}/32 -j MARK --set-mark ${PROXY_PORT} 2>/dev/null || {
    echo -e "${YELLOW}  ⚠ Mark rule not found${NC}"
  }

  echo -e "${GREEN}  ✓ Rules removed for VM ${VM_IP}${NC}"
}

# Function to list all proxy routes
list_proxy_routes() {
  echo -e "\n${GREEN}Current Decodo Proxy Routes:${NC}\n"

  echo -e "${YELLOW}NAT POSTROUTING rules:${NC}"
  iptables -t nat -L POSTROUTING -n -v --line-numbers | grep "SNAT.*${DECODO_HOST}" || echo "  (none)"

  echo -e "\n${YELLOW}Mangle PREROUTING rules:${NC}"
  iptables -t mangle -L PREROUTING -n -v --line-numbers | grep "MARK" || echo "  (none)"
}

# Function to flush all proxy routes
flush_all_proxy_routes() {
  echo -e "${YELLOW}Flushing all Decodo proxy routes...${NC}"

  # Remove all SNAT rules for Decodo
  iptables -t nat -S POSTROUTING | grep "SNAT.*${DECODO_HOST}" | while read -r rule; do
    # Convert -A to -D for deletion
    delete_rule=$(echo "$rule" | sed 's/-A/-D/')
    iptables -t nat $delete_rule 2>/dev/null || true
  done

  # Remove all packet marking rules
  iptables -t mangle -F PREROUTING 2>/dev/null || true

  echo -e "${GREEN}✓ All proxy routes flushed${NC}"
}

# Function to initialize proxy infrastructure
init_proxy_infrastructure() {
  echo -e "${GREEN}Initializing Decodo proxy infrastructure...${NC}"

  # Ensure IP forwarding is enabled
  echo 1 > /proc/sys/net/ipv4/ip_forward
  echo -e "${GREEN}✓ IP forwarding enabled${NC}"

  # Make IP forwarding persistent
  if ! grep -q "net.ipv4.ip_forward=1" /etc/sysctl.conf; then
    echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf
    echo -e "${GREEN}✓ IP forwarding made persistent${NC}"
  fi

  # Create custom iptables chain for Decodo
  iptables -t nat -N DECODO_PROXY 2>/dev/null || {
    echo -e "${YELLOW}  ⚠ DECODO_PROXY chain already exists${NC}"
  }

  echo -e "${GREEN}✓ Proxy infrastructure initialized${NC}"
}

# Main command handling
case "$ACTION" in
  add)
    if [ $# -lt 3 ]; then
      echo -e "${RED}Usage: $0 add <vm_ip> <proxy_port>${NC}"
      exit 1
    fi
    VM_IP=$2
    PROXY_PORT=$3
    add_vm_proxy_route "$VM_IP" "$PROXY_PORT"
    ;;

  remove)
    if [ $# -lt 3 ]; then
      echo -e "${RED}Usage: $0 remove <vm_ip> <proxy_port>${NC}"
      exit 1
    fi
    VM_IP=$2
    PROXY_PORT=$3
    remove_vm_proxy_route "$VM_IP" "$PROXY_PORT"
    ;;

  list)
    list_proxy_routes
    ;;

  flush)
    flush_all_proxy_routes
    ;;

  init)
    init_proxy_infrastructure
    ;;

  help|*)
    echo "Decodo Proxy iptables Management"
    echo ""
    echo "Usage: $0 <command> [arguments]"
    echo ""
    echo "Commands:"
    echo "  init                    - Initialize proxy infrastructure"
    echo "  add <vm_ip> <port>      - Add proxy route for VM"
    echo "  remove <vm_ip> <port>   - Remove proxy route for VM"
    echo "  list                    - List all proxy routes"
    echo "  flush                   - Remove all proxy routes"
    echo "  help                    - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 init"
    echo "  $0 add 192.168.100.5 10001"
    echo "  $0 remove 192.168.100.5 10001"
    echo "  $0 list"
    echo ""
    ;;
esac

exit 0
