#!/bin/bash

echo "=== Complete OAuth Flow Test ==="
echo ""

# Step 1: Start OAuth flow
echo "1. Starting OAuth flow..."
START_RESPONSE=$(curl -s -X POST http://192.168.5.82:4000/api/auth/start \
  -H 'Content-Type: application/json' \
  -d '{"userId":"5abacdd1-6a9b-48ce-b723-ca8056324c7a","provider":"claude_code"}')

echo "Start Response:"
echo "$START_RESPONSE" | python3 -m json.tool
echo ""

# Extract session ID
SESSION_ID=$(echo "$START_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('sessionId', ''))")

if [ -z "$SESSION_ID" ]; then
  echo "ERROR: No session ID returned!"
  exit 1
fi

echo "Session ID: $SESSION_ID"
echo ""

# Step 2: Wait for VMs to initialize
echo "2. Waiting 10 seconds for VMs to initialize..."
sleep 10
echo ""

# Step 3: Check auth session status
echo "3. Checking auth session status..."
SESSION_STATUS=$(curl -s http://192.168.5.82:4000/api/auth/session/$SESSION_ID)
echo "$SESSION_STATUS" | python3 -m json.tool
echo ""

# Extract auth_url from session
AUTH_URL=$(echo "$SESSION_STATUS" | python3 -c "import sys, json; print(json.load(sys.stdin).get('auth_url', ''))")

if [ -n "$AUTH_URL" ]; then
  echo "✓ OAuth URL Generated Successfully!"
  echo "Auth URL: $AUTH_URL"
  echo ""
  echo "To complete the test:"
  echo "1. Open this URL in a browser: $AUTH_URL"
  echo "2. Complete the authentication"
  echo "3. Check session status again with:"
  echo "   curl http://192.168.5.82:4000/api/auth/session/$SESSION_ID"
else
  echo "⚠ OAuth URL not yet available. Status:"
  echo "$SESSION_STATUS" | python3 -c "import sys, json; d=json.load(sys.stdin); print(f\"Status: {d.get('status')}\nVM Ready: {d.get('vm_ready')}\")"
fi

echo ""
echo "=== Test Complete ==="
