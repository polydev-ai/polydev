#!/bin/bash

# Health Check Script for Polydev AI V2
# Verifies all services are operational before/after deployment

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

DEPLOY_SERVER="${1:-135.181.138.102}"
TIMEOUT="${2:-30}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Polydev AI Health Check${NC}"
echo -e "${GREEN}========================================${NC}"

CHECKS_PASSED=0
CHECKS_FAILED=0

check() {
  local name="$1"
  local command="$2"

  echo -n "Checking $name... "

  if eval "$command" &>/dev/null; then
    echo -e "${GREEN}✓ PASS${NC}"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
    return 0
  else
    echo -e "${RED}✗ FAIL${NC}"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
    return 1
  fi
}

# Core Services
echo -e "\n${YELLOW}Core Services:${NC}"
check "Master-Controller" "curl -s --max-time $TIMEOUT http://${DEPLOY_SERVER}:4000/health | grep -q healthy"
check "Master-Controller Auth" "curl -s --max-time $TIMEOUT http://${DEPLOY_SERVER}:4000/api/auth/health | grep -q healthy"

# Infrastructure
echo -e "\n${YELLOW}Infrastructure:${NC}"
check "Nomad API" "curl -s --max-time $TIMEOUT http://${DEPLOY_SERVER}:4646/v1/status/leader | grep -q ':'"
check "Prometheus" "curl -s --max-time $TIMEOUT http://${DEPLOY_SERVER}:9090/-/healthy | grep -q 'Prometheus Server is Healthy'"
check "Grafana" "curl -s --max-time $TIMEOUT http://${DEPLOY_SERVER}:3000/api/health | grep -q ok"

# WebRTC
echo -e "\n${YELLOW}WebRTC Infrastructure:${NC}"
check "WebRTC ICE Servers" "curl -s --max-time $TIMEOUT http://${DEPLOY_SERVER}:4000/api/webrtc/ice-servers | grep -q iceServers"
check "WebRTC Stats" "curl -s --max-time $TIMEOUT http://${DEPLOY_SERVER}:4000/api/webrtc/stats | grep -q success"

# Summary
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Health Check Summary${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Passed: ${GREEN}${CHECKS_PASSED}${NC}"
echo -e "Failed: ${RED}${CHECKS_FAILED}${NC}"

if [ $CHECKS_FAILED -eq 0 ]; then
  echo -e "\n${GREEN}✓ All health checks passed!${NC}"
  exit 0
else
  echo -e "\n${RED}✗ Some health checks failed!${NC}"
  exit 1
fi
