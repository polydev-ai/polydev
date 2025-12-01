#!/bin/bash
# Start websockify for noVNC access to Firecracker VMs

# Kill any existing websockify
pkill -9 -f websockify
sleep 1

# Find a working VM
WORKING_VM=""
for ip in 192.168.100.2 192.168.100.3 192.168.100.4 192.168.100.5 192.168.100.6 192.168.100.7 192.168.100.8; do
  if nc -zv -w 1 $ip 5901 2>/dev/null; then
    WORKING_VM=$ip
    echo "Found working VM: $WORKING_VM"
    break
  fi
done

if [ -z "$WORKING_VM" ]; then
  echo "ERROR: No working VM found with VNC on port 5901"
  exit 1
fi

# Start websockify
echo "Starting websockify on port 6080, proxying to $WORKING_VM:5901"
websockify --web=/usr/share/novnc 0.0.0.0:6080 $WORKING_VM:5901 >/var/log/websockify.log 2>&1 &

sleep 2

# Verify
if netstat -tlnp | grep -q 6080; then
  echo "✅ websockify started successfully"
  echo "noVNC URL: http://135.181.138.102:6080/vnc.html?autoconnect=1&resize=scale&password=polydev123"
else
  echo "❌ websockify failed to start"
  tail -20 /var/log/websockify.log
  exit 1
fi
