#!/bin/bash

# Backup Script for Polydev AI V2
# Creates timestamped backup before deployment

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

DEPLOY_SERVER="${1:-135.181.138.102}"
DEPLOY_USER="${2:-root}"
DEPLOY_PASSWORD="${3:-}"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups/polydev-${TIMESTAMP}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Creating Backup${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Server: $DEPLOY_SERVER"
echo -e "Timestamp: $TIMESTAMP"
echo -e "Backup location: $BACKUP_DIR"

# Create backup directory on server
echo -e "\n${YELLOW}Creating backup directory...${NC}"
sshpass -p "$DEPLOY_PASSWORD" ssh -o StrictHostKeyChecking=no "$DEPLOY_USER@$DEPLOY_SERVER" "mkdir -p $BACKUP_DIR"

# Backup master-controller
echo -e "${YELLOW}Backing up master-controller...${NC}"
sshpass -p "$DEPLOY_PASSWORD" ssh -o StrictHostKeyChecking=no "$DEPLOY_USER@$DEPLOY_SERVER" "
  cp -r /opt/master-controller $BACKUP_DIR/ 2>/dev/null || echo 'Master-controller not found'
"

# Backup environment file
echo -e "${YELLOW}Backing up .env file...${NC}"
sshpass -p "$DEPLOY_PASSWORD" ssh -o StrictHostKeyChecking=no "$DEPLOY_USER@$DEPLOY_SERVER" "
  cp /opt/master-controller/.env $BACKUP_DIR/master-controller/.env 2>/dev/null || echo '.env not found'
"

# Save current git commit
echo -e "${YELLOW}Saving deployment metadata...${NC}"
sshpass -p "$DEPLOY_PASSWORD" ssh -o StrictHostKeyChecking=no "$DEPLOY_USER@$DEPLOY_SERVER" "
  echo 'timestamp=$TIMESTAMP' > $BACKUP_DIR/metadata.txt
  echo 'backup_dir=$BACKUP_DIR' >> $BACKUP_DIR/metadata.txt
  echo 'backup_type=pre-deployment' >> $BACKUP_DIR/metadata.txt
"

# List backup contents
echo -e "${YELLOW}Backup contents:${NC}"
sshpass -p "$DEPLOY_PASSWORD" ssh -o StrictHostKeyChecking=no "$DEPLOY_USER@$DEPLOY_SERVER" "
  du -sh $BACKUP_DIR
  ls -lh $BACKUP_DIR/
"

# Cleanup old backups (keep last 5)
echo -e "\n${YELLOW}Cleaning up old backups...${NC}"
sshpass -p "$DEPLOY_PASSWORD" ssh -o StrictHostKeyChecking=no "$DEPLOY_USER@$DEPLOY_SERVER" "
  cd /opt/backups
  ls -t | tail -n +6 | xargs -r rm -rf
  echo 'Kept last 5 backups:'
  ls -lt | head -6
"

echo -e "\n${GREEN}✓ Backup created successfully${NC}"
echo -e "Backup location: ${GREEN}$BACKUP_DIR${NC}"

# Return backup directory for rollback
echo "$BACKUP_DIR"

exit 0
