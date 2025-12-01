#!/bin/bash
#
# Simplified Supervisor Script for Browser VM
#
# With systemd services handling VNC, Xvfb, and desktop,
# this script only needs to manage:
# 1. OAuth Agent (port 8080)
# 2. WebRTC Server (for streaming)
#
# Systemd handles (pre-configured in golden rootfs):
# - xvfb.service (virtual display)
# - xfce-session.service (desktop environment)
# - x11vnc.service (VNC server with auto-restart)
#

set -Eeuo pipefail

LOG_DIR=/var/log/vm-browser-agent
mkdir -p "$LOG_DIR"

log() {
    echo "[SUPERVISOR] $(date -Is) $1" | tee -a "$LOG_DIR/supervisor.log"
}

log "Simplified Browser VM Supervisor Starting"
log "SESSION_ID=${SESSION_ID:-<unset>}"
log "DISPLAY=${DISPLAY:-:1}"
log "HTTP_PROXY=${HTTP_PROXY:-<unset>}"

# Ensure sane defaults
export PORT="${PORT:-8080}"
export HOST="${HOST:-0.0.0.0}"
export DISPLAY="${DISPLAY:-:1}"

# Change to agent directory
cd /opt/vm-browser-agent || {
    log "ERROR: /opt/vm-browser-agent not found"
    exit 1
}

# Verify systemd services are running
log "Verifying systemd services..."

for service in xvfb.service xfce-session.service x11vnc.service; do
    if systemctl is-active --quiet "$service"; then
        log "✓ $service is running"
    else
        log "⚠ $service is NOT running - attempting to start..."
        systemctl start "$service" 2>&1 | tee -a "$LOG_DIR/supervisor.log"
        sleep 2
        if systemctl is-active --quiet "$service"; then
            log "✓ $service started successfully"
        else
            log "✗ $service failed to start"
        fi
    fi
done

# Start OAuth agent
log "Starting OAuth agent on port $PORT..."
/usr/bin/node /opt/vm-browser-agent/server.js 2>&1 | tee -a "$LOG_DIR/oauth.log" &
OAUTH_PID=$!
log "OAuth agent PID: $OAUTH_PID"

# Start WebRTC server
log "Starting WebRTC server..."
/usr/bin/node /opt/vm-browser-agent/webrtc-server.js 2>&1 | tee -a "$LOG_DIR/webrtc.log" &
WEBRTC_PID=$!
log "WebRTC server PID: $WEBRTC_PID"

# Cleanup function
cleanup() {
    log "Shutting down..."
    kill "$OAUTH_PID" "$WEBRTC_PID" 2>/dev/null || true
    wait "$OAUTH_PID" "$WEBRTC_PID" 2>/dev/null || true
    log "Stopped"
}

# Trap signals
SHUTTING_DOWN=0
trap 'SHUTTING_DOWN=1; cleanup' TERM INT

# Monitor processes and restart if they die
log "Both services started successfully"
log "OAuth agent PID: $OAUTH_PID"
log "WebRTC server PID: $WEBRTC_PID"

while [ "$SHUTTING_DOWN" -eq 0 ]; do
    # Check OAuth agent
    if ! kill -0 "$OAUTH_PID" 2>/dev/null; then
        log "ERROR: OAuth agent died, restarting..."
        /usr/bin/node /opt/vm-browser-agent/server.js 2>&1 | tee -a "$LOG_DIR/oauth.log" &
        OAUTH_PID=$!
        log "OAuth agent restarted with PID: $OAUTH_PID"
    fi

    # Check WebRTC server
    if ! kill -0 "$WEBRTC_PID" 2>/dev/null; then
        log "ERROR: WebRTC server died, restarting..."
        /usr/bin/node /opt/vm-browser-agent/webrtc-server.js 2>&1 | tee -a "$LOG_DIR/webrtc.log" &
        WEBRTC_PID=$!
        log "WebRTC server restarted with PID: $WEBRTC_PID"
    fi

    sleep 10
done

log "Supervisor exiting"
exit 0
