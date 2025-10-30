#!/bin/bash

# Rollback Script for Polydev AI V2
# Restores from backup after failed deployment

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

DEPLOY_SERVER="${1:-135.181.138.102}"
DEPLOY_USER="${2:-root}"
DEPLOY_PASSWORD="${3:-}"
BACKUP_DIR="${4:-}"

echo -e "${RED}========================================${NC}"
echo -e "${RED}ROLLBACK IN PROGRESS${NC}"
echo -e "${RED}========================================${NC}"

# If no backup dir specified, use latest
if [ -z "$BACKUP_DIR" ]; then
  echo -e "${YELLOW}Finding latest backup...${NC}"
  BACKUP_DIR=$(sshpass -p "$DEPLOY_PASSWORD" ssh -o StrictHostKeyChecking=no "$DEPLOY_USER@$DEPLOY_SERVER" "ls -t /opt/backups | head -1")
  BACKUP_DIR="/opt/backups/$BACKUP_DIR"
  echo -e "Using backup: ${YELLOW}$BACKUP_DIR${NC}"
fi

# Verify backup exists
echo -e "\n${YELLOW}Verifying backup exists...${NC}"
sshpass -p "$DEPLOY_PASSWORD" ssh -o StrictHostKeyChecking=no "$DEPLOY_USER@$DEPLOY_SERVER" "
  if [ ! -d '$BACKUP_DIR' ]; then
    echo 'Backup not found: $BACKUP_DIR'
    exit 1
  fi
  echo 'Backup found'
  ls -lh $BACKUP_DIR/
"

# Stop services
echo -e "\n${YELLOW}Stopping services...${NC}"
sshpass -p "$DEPLOY_PASSWORD" ssh -o StrictHostKeyChecking=no "$DEPLOY_USER@$DEPLOY_SERVER" "
  systemctl stop master-controller 2>/dev/null || echo 'Service not running'
"

# Restore master-controller
echo -e "${YELLOW}Restoring master-controller...${NC}"
sshpass -p "$DEPLOY_PASSWORD" ssh -o StrictHostKeyChecking=no "$DEPLOY_USER@$DEPLOY_SERVER" "
  rm -rf /opt/master-controller.rollback
  mv /opt/master-controller /opt/master-controller.rollback
  cp -r $BACKUP_DIR/master-controller /opt/master-controller
  echo 'Master-controller restored'
"

# Restore .env
echo -e "${YELLOW}Restoring .env file...${NC}"
sshpass -p "$DEPLOY_PASSWORD" ssh -o StrictHostKeyChecking=no "$DEPLOY_USER@$DEPLOY_SERVER" "
  cp $BACKUP_DIR/master-controller/.env /opt/master-controller/.env 2>/dev/null || echo '.env not in backup'
"

# Start services
echo -e "\n${YELLOW}Starting services...${NC}"
sshpass -p "$DEPLOY_PASSWORD" ssh -o StrictHostKeyChecking=no "$DEPLOY_USER@$DEPLOY_SERVER" "
  systemctl start master-controller
  sleep 5
"

# Health check
echo -e "${YELLOW}Running health check...${NC}"
if ./scripts/health-check.sh "$DEPLOY_SERVER" 10; then
  echo -e "\n${GREEN}✓ Rollback successful - system healthy${NC}"
  exit 0
else
  echo -e "\n${RED}✗ Rollback completed but health check failed${NC}"
  echo -e "${RED}Manual intervention required${NC}"
  exit 1
fi
