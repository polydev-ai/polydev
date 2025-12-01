#!/bin/bash
# VM Startup Script - Runs after desktop loads
# This script is injected into each VM and runs at boot

# Wait for XFCE desktop to be fully loaded
sleep 5

# Source environment variables if they exist
if [ -f /etc/environment ]; then
    export $(cat /etc/environment | xargs)
fi

# Launch terminal if not already running
if ! pgrep -f xfce4-terminal > /dev/null; then
    DISPLAY=:1 xfce4-terminal --geometry=100x30 --title="CLI Terminal" --working-directory=/root --hide-menubar &
fi

# Log startup
echo "[$(date)] VM startup script completed - terminal launched, proxy configured" >> /var/log/vm-startup.log
