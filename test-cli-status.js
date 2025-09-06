// Test script for CLI status update flow
const crypto = require('crypto');

// Simulate the MCP token generation process
function generateMCPToken() {
  return `mcp_${crypto.randomBytes(32).toString('hex')}`;
}

// Simulate CLI status update payload
function createTestPayload(userId, token) {
  return {
    provider: 'claude_code',
    status: 'available',
    message: 'Claude Code is available and authenticated',
    user_id: userId,
    mcp_token: token,
    cli_version: '0.14.0',
    cli_path: '/usr/local/bin/claude',
    authenticated: true,
    last_used: new Date().toISOString(),
    additional_info: {
      install_method: 'npm',
      platform: 'darwin'
    }
  };
}

// Test the API endpoint
async function testCLIStatusUpdate() {
  console.log('🧪 Testing CLI Status Update Flow...\n');
  
  // You would need to replace these with real values from your system
  const testUserId = 'test-user-id-replace-me';
  const testToken = generateMCPToken();
  
  console.log('Generated test token:', testToken.substring(0, 20) + '...');
  console.log('Test user ID:', testUserId);
  
  const payload = createTestPayload(testUserId, testToken);
  console.log('\nTest payload:', JSON.stringify(payload, null, 2));
  
  try {
    const response = await fetch('http://localhost:3002/api/cli-status-update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    console.log('\nAPI Response Status:', response.status);
    console.log('API Response:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ CLI Status Update Test PASSED');
    } else {
      console.log('❌ CLI Status Update Test FAILED');
    }
  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
}

// Only run if called directly
if (require.main === module) {
  console.log('⚠️  Note: You need to replace testUserId with a real user ID');
  console.log('⚠️  Note: You need to have the token in the database first');
  console.log('⚠️  Note: Server should be running on port 3002\n');
  
  // Uncomment to run the test (after updating user ID)
  // testCLIStatusUpdate();
}

module.exports = { generateMCPToken, createTestPayload, testCLIStatusUpdate };