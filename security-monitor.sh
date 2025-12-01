#!/bin/bash
#
# Security Monitoring Script for Polydev AI VPS
# Runs hourly via cron to detect suspicious activity
#
# Created: November 24, 2025
# Purpose: Prevent future DDoS attacks and unauthorized access

LOG_FILE="/var/log/security-monitor.log"
ALERT_FILE="/var/log/security-alerts.log"

timestamp() {
  date '+%Y-%m-%d %H:%M:%S'
}

log() {
  echo "[$(timestamp)] $1" >> "$LOG_FILE"
}

alert() {
  echo "[$(timestamp)] ALERT: $1" >> "$ALERT_FILE"
  echo "[$(timestamp)] ALERT: $1" >> "$LOG_FILE"
  logger -t security-monitor "ALERT: $1"
}

log "=== Security Monitor Starting ==="

# 0. Verify UFW firewall is enabled
log "Checking if UFW firewall is enabled..."
UFW_STATUS=$(ufw status | head -1 | grep -i "Status: active" || true)

if [ -z "$UFW_STATUS" ]; then
  alert "CRITICAL: UFW firewall is DISABLED! Enabling now..."
  ufw --force enable
  alert "UFW firewall has been enabled"
fi

# 1. Check for unauthorized ports listening
# Authorized ports: 22 (SSH), 80 (HTTP), 443 (HTTPS), 4000 (master controller - internal),
#                   9090 (Prometheus), 9100 (Node Exporter), 3000 (Next.js dev),
#                   3478 (STUN), 6080 (noVNC), 53 (DNS), 3128 (Squid)
log "Checking for unauthorized listening ports..."
SUSPICIOUS_PORTS=$(netstat -tulpn | grep LISTEN | grep -vE ':(22|80|443|4000|3478|6080|3000|53|3128|9090|9100)' | grep -v '127.0.0' || true)

if [ ! -z "$SUSPICIOUS_PORTS" ]; then
  alert "Unauthorized ports detected:\n$SUSPICIOUS_PORTS"
fi

# 2. Verify Nomad ports are NOT listening
log "Verifying Nomad ports are blocked..."
NOMAD_PORTS=$(netstat -tulpn | grep -E ':(4646|4647|4648)' || true)

if [ ! -z "$NOMAD_PORTS" ]; then
  alert "CRITICAL: Nomad ports are listening! Attack vector re-exposed:\n$NOMAD_PORTS"
fi

# 3. Check for suspicious processes
log "Checking for suspicious processes..."
SUSPICIOUS_PROCS=$(ps aux | grep -E '(wget.*\.sh|curl.*\.sh|/tmp/.*\.sh|hcl\.sh|91\.92\.242\.138)' | grep -v grep || true)

if [ ! -z "$SUSPICIOUS_PROCS" ]; then
  alert "Suspicious processes detected:\n$SUSPICIOUS_PROCS"
fi

# 4. Check for excessive failed SSH attempts (>100 in last hour)
log "Checking for SSH brute force attacks..."
FAILED_SSH=$(grep "Failed password" /var/log/auth.log 2>/dev/null | grep "$(date '+%b %d %H')" | wc -l)

if [ "$FAILED_SSH" -gt 100 ]; then
  alert "Excessive SSH failed login attempts: $FAILED_SSH in last hour"
  # Get top 5 attacking IPs
  TOP_ATTACKERS=$(grep "Failed password" /var/log/auth.log | grep "$(date '+%b %d %H')" | awk '{print $11}' | sort | uniq -c | sort -rn | head -5)
  alert "Top attacking IPs:\n$TOP_ATTACKERS"
fi

# 5. Verify firewall rules for Nomad are still in place
log "Verifying firewall protection..."
UFW_NOMAD=$(ufw status | grep -E '(4646|4647|4648)' | grep DENY || true)

if [ -z "$UFW_NOMAD" ]; then
  alert "CRITICAL: Firewall rules for Nomad ports are MISSING! Re-adding..."
  ufw deny 4646/tcp comment 'Nomad HTTP API - BLOCKED'
  ufw deny 4647/tcp comment 'Nomad RPC - BLOCKED'
  ufw deny 4648/tcp comment 'Nomad Serf - BLOCKED'
  ufw deny 4648/udp comment 'Nomad Serf UDP - BLOCKED'
  alert "Firewall rules re-added for Nomad ports"
fi

# 6. Check for Nomad service running (should be disabled)
log "Verifying Nomad service is disabled..."
NOMAD_STATUS=$(systemctl is-active nomad 2>/dev/null || echo "inactive")

if [ "$NOMAD_STATUS" != "inactive" ]; then
  alert "CRITICAL: Nomad service is RUNNING! Stopping immediately..."
  systemctl stop nomad
  systemctl disable nomad
  pkill -9 nomad
  alert "Nomad service stopped and disabled"
fi

# 7. Check for new cron jobs (potential backdoors)
log "Checking for suspicious cron jobs..."
CRON_JOBS=$(crontab -l 2>/dev/null | grep -vE '^#|^$|cleanup-browser-vms|security-monitor' || true)

if [ ! -z "$CRON_JOBS" ]; then
  log "Current cron jobs (excluding known scripts):\n$CRON_JOBS"
fi

# 8. Monitor disk space for rapid growth (malware downloads)
log "Checking disk space..."
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')

if [ "$DISK_USAGE" -gt 85 ]; then
  alert "High disk usage: ${DISK_USAGE}%"
fi

log "=== Security Monitor Completed ==="
log ""

# If alerts were generated, print summary
ALERT_COUNT=$(grep -c "$(date '+%Y-%m-%d %H')" "$ALERT_FILE" 2>/dev/null || echo 0)

if [ "$ALERT_COUNT" -gt 0 ]; then
  echo "⚠️  $ALERT_COUNT security alerts generated in the last hour"
  echo "Check $ALERT_FILE for details"
  exit 1
else
  exit 0
fi
