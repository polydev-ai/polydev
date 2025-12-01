#!/bin/bash
# Setup iptables rules to redirect HTTPS traffic through redsocks

# Create REDSOCKS chain
iptables -t nat -N REDSOCKS 2>/dev/null || iptables -t nat -F REDSOCKS

# Don't redirect traffic destined for localhost (avoids loops)
iptables -t nat -A REDSOCKS -d 127.0.0.0/8 -j RETURN

# Don't redirect traffic within VM network
iptables -t nat -A REDSOCKS -d 192.168.100.0/24 -j RETURN

# Don't redirect traffic to common internal networks
iptables -t nat -A REDSOCKS -d 10.0.0.0/8 -j RETURN
iptables -t nat -A REDSOCKS -d 172.16.0.0/12 -j RETURN

# Redirect all other HTTPS (port 443) traffic to redsocks
iptables -t nat -A REDSOCKS -p tcp --dport 443 -j REDIRECT --to-ports 12345

# Also redirect HTTP (port 80) for completeness
iptables -t nat -A REDSOCKS -p tcp --dport 80 -j REDIRECT --to-ports 12345

# Apply the REDSOCKS chain to OUTPUT
iptables -t nat -A OUTPUT -p tcp -j REDSOCKS

echo 'Redsocks iptables rules applied'
