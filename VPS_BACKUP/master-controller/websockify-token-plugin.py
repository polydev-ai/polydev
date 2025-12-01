#!/usr/bin/env python3
"""
Dynamic Token Plugin for websockify
Maps tokens (VM IPs) to actual VNC targets dynamically
Supports all active VMs without hardcoded config
"""

class DynamicVMTokenPlugin:
    def lookup(self, token):
        """
        Token format: VM_IP (e.g., "192.168.100.3")
        Returns: (host, port) tuple or None

        This plugin allows any VM in the 192.168.100.0/24 range
        to be accessible via its IP as the token.
        """
        # Validate token is a valid IP in our VM network
        if not token:
            return None

        # Check if token matches VM IP format
        if not token.startswith('192.168.100.'):
            return None

        try:
            # Extract last octet
            parts = token.split('.')
            if len(parts) != 4:
                return None

            last_octet = int(parts[3])

            # Valid VM IPs are 192.168.100.2 through 192.168.100.254
            if last_octet < 2 or last_octet > 254:
                return None

            # Return the VM IP and VNC port
            return (token, 5901)

        except (ValueError, IndexError):
            return None
