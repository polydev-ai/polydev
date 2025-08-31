#!/bin/bash

# Test script to simulate expired token UX flow
# This helps verify the seamless re-authentication experience

echo "🧪 Testing Polydev MCP Expired Token UX Flow"
echo "=============================================="

# Use a fake/expired token to simulate the scenario
EXPIRED_TOKEN="polydev_fake_expired_token_123"
BASE_URL="https://api.polydev.ai"

echo ""
echo "1️⃣ Testing with expired token..."
echo "Token: ${EXPIRED_TOKEN:0:20}..."

# Test the MCP endpoint with expired token
echo ""
echo "📤 Making request with expired token..."

curl -X POST "$BASE_URL/api/mcp" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EXPIRED_TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "get_perspectives",
      "arguments": {
        "prompt": "Test expired token handling",
        "models": ["gpt-4"]
      }
    }
  }' \
  -w "\n\n📊 Response Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || echo "Response received (not JSON formatted)"

echo ""
echo "2️⃣ Expected behavior:"
echo "   ✅ User-friendly error message about expired auth"
echo "   ✅ Clear re-authentication instructions" 
echo "   ✅ Direct re-auth URL provided"
echo "   ✅ Step-by-step guidance"

echo ""
echo "3️⃣ Manual test steps:"
echo "   1. User sees friendly 'authentication expired' message"
echo "   2. User clicks/visits the re-auth URL provided"
echo "   3. User completes OAuth flow"
echo "   4. User gets new token automatically"
echo "   5. User retries original request successfully"

echo ""
echo "🔗 Re-authentication URL that should be provided:"
echo "$BASE_URL/api/mcp/auth?client_id=claude-desktop&redirect_uri=http://localhost:8080/oauth/callback&response_type=code"

echo ""
echo "✨ Test completed! Check above for proper UX messaging."