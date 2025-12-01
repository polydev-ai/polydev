#!/bin/bash

# Deploy vm-manager.js to remote server via HTTP API
# This script creates a temporary admin endpoint to receive file updates

SERVER="http://192.168.5.82:4000"
FILE_PATH="/Users/venkat/Documents/polydev-ai/master-controller/src/services/vm-manager.js"

echo "=== Deploying vm-manager.js to Remote Server ==="
echo ""

# Read the file content
FILE_CONTENT=$(cat "$FILE_PATH")

# Send file content to remote server's admin API
# Note: This requires an admin endpoint to be implemented
curl -X POST "$SERVER/api/admin/deploy" \
  -H 'Content-Type: application/json' \
  -d "{
    \"file\": \"src/services/vm-manager.js\",
    \"content\": $(echo "$FILE_CONTENT" | jq -Rs .)
  }"

echo ""
echo "=== Deployment Complete ==="
