#!/bin/bash
echo "=== Checking for VM creation errors since restart ==="
sshpass -p 'backspace' ssh -o StrictHostKeyChecking=no backspace@192.168.5.82 \
  "sudo journalctl -u master-controller --since '2025-10-11 23:56:13 UTC' --no-pager | grep -E '(Creating VM|VM creation|Firecracker|TAP device|timeout|error|Error|failed|Failed)'"
