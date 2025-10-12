#!/bin/bash

# Check recent authentication logs on production server
echo "=== Checking authentication logs since 23:56:13 UTC ==="
echo ""

sshpass -p 'backspace' ssh -o StrictHostKeyChecking=no backspace@192.168.5.82 \
  "sudo journalctl -u master-controller --since '2025-10-11 23:56:13 UTC' --no-pager | grep -E '(auth/start|TRANSFER|FINDBYUSERID|CLI VM not found)'"
