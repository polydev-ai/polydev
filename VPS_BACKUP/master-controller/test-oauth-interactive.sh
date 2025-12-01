#!/bin/bash

SERVER="http://192.168.5.82:4000"
USER_ID="5abacdd1-6a9b-48ce-b723-ca8056324c7a"
PROVIDER="claude_code"

echo "======================================"
echo "Interactive OAuth Flow Test"
echo "======================================"
echo ""

# Step 1: Start OAuth
echo "[1/5] Starting OAuth flow..."
START_RESP=$(curl -s -w "\n%{http_code}" -X POST "$SERVER/api/auth/start" \
  -H 'Content-Type: application/json' \
  -d "{\"userId\":\"$USER_ID\",\"provider\":\"$PROVIDER\"}")

HTTP_CODE=$(echo "$START_RESP" | tail -n1)
BODY=$(echo "$START_RESP" | sed '$d')

if [ "$HTTP_CODE" != "200" ]; then
  echo "❌ Failed to start OAuth (HTTP $HTTP_CODE)"
  echo "$BODY"
  exit 1
fi

echo "$BODY" | python3 -m json.tool
SESSION_ID=$(echo "$BODY" | python3 -c "import sys, json; print(json.load(sys.stdin).get('sessionId', ''))")

if [ -z "$SESSION_ID" ]; then
  echo "❌ No session ID received"
  exit 1
fi

echo "✓ Session started: $SESSION_ID"
echo ""

# Step 2: Poll for OAuth URL
echo "[2/5] Waiting for OAuth URL (this may take 10-20 seconds)..."
MAX_ATTEMPTS=30
ATTEMPT=0
AUTH_URL=""

while [ $ATTEMPT -lt $MAX_ATTEMPTS ] && [ -z "$AUTH_URL" ]; do
  sleep 2
  ATTEMPT=$((ATTEMPT + 1))

  SESSION_RESP=$(curl -s "$SERVER/api/auth/session/$SESSION_ID")
  AUTH_URL=$(echo "$SESSION_RESP" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('session', {}).get('auth_url', ''))" 2>/dev/null)

  STATUS=$(echo "$SESSION_RESP" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('session', {}).get('status', 'unknown'))" 2>/dev/null)

  if [ -n "$AUTH_URL" ]; then
    break
  fi

  printf "."
done

echo ""

if [ -z "$AUTH_URL" ]; then
  echo "❌ OAuth URL not generated after $MAX_ATTEMPTS attempts"
  echo "Last session status:"
  curl -s "$SERVER/api/auth/session/$SESSION_ID" | python3 -m json.tool
  exit 1
fi

echo "✓ OAuth URL generated!"
echo ""
echo "======================================"
echo "MANUAL TEST REQUIRED"
echo "======================================"
echo ""
echo "OAuth URL:"
echo "$AUTH_URL"
echo ""
echo "Next steps:"
echo "1. Open the URL above in your browser"
echo "2. Complete the Claude authentication"
echo "3. The browser will show 'Authentication Complete'"
echo "4. Run this command to verify:"
echo ""
echo "   curl -s $SERVER/api/auth/session/$SESSION_ID | python3 -m json.tool"
echo ""
echo "5. Check if status changed to 'completed' and credentials are stored"
echo ""
echo "======================================"
echo "Session ID for reference: $SESSION_ID"
echo "======================================"
