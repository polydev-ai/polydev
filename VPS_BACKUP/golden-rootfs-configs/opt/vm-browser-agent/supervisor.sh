#!/bin/bash
# Browser VM Supervisor Script
# Starts OAuth Agent and WebRTC Server

set -euo pipefail

export PORT="${PORT:-8080}"
export HOST="${HOST:-0.0.0.0}"
export DISPLAY="${DISPLAY:-:1}"

cd /opt/vm-browser-agent

echo "[SUPERVISOR] Starting OAuth agent on port $PORT..."
/usr/bin/node /opt/vm-browser-agent/server.js &
OAUTH_PID=$!
echo "[SUPERVISOR] OAuth agent PID: $OAUTH_PID"

echo "[SUPERVISOR] Starting WebRTC server..."
/usr/bin/node /opt/vm-browser-agent/webrtc-server.js &
WEBRTC_PID=$!
echo "[SUPERVISOR] WebRTC server PID: $WEBRTC_PID"

# Wait for either process to exit
wait -n $OAUTH_PID $WEBRTC_PID || true

# If we get here, restart the failed process
while true; do
    if ! kill -0 $OAUTH_PID 2>/dev/null; then
        echo "[SUPERVISOR] OAuth agent died, restarting..."
        /usr/bin/node /opt/vm-browser-agent/server.js &
        OAUTH_PID=$!
    fi
    if ! kill -0 $WEBRTC_PID 2>/dev/null; then
        echo "[SUPERVISOR] WebRTC server died, restarting..."
        /usr/bin/node /opt/vm-browser-agent/webrtc-server.js &
        WEBRTC_PID=$!
    fi
    sleep 10
done
