/**
 * Test 404 Forwarding Fix in answer/route.ts
 *
 * Verifies that the Next.js API correctly forwards 404 responses
 * from the master controller instead of converting them to 500 errors
 *
 * The Bug: When master controller returns 404 (answer not ready),
 *          Next.js API was throwing an error and returning 500
 *
 * The Fix: Added lines 54-58 to check for 404 status before
 *          the general !response.ok check and forward it
 */

const http = require('http');

console.log('═══════════════════════════════════════════════════════════════');
console.log('🧪 TESTING 404 FORWARDING FIX');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');
console.log('This test verifies the fix in:');
console.log('  /src/app/api/webrtc/session/[sessionId]/answer/route.ts');
console.log('');

/**
 * Make HTTP request to Next.js API
 */
function testEndpoint(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsedData = data ? JSON.parse(data) : null;
          resolve({
            status: res.statusCode,
            data: parsedData
          });
        } catch (e) {
          // If parsing fails, return raw data
          resolve({
            status: res.statusCode,
            data,
            parseError: e.message
          });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

/**
 * Main test
 */
async function runTest() {
  try {
    console.log('📝 Test Setup:');
    console.log('   Endpoint: GET /api/webrtc/session/:sessionId/answer');
    console.log('   Session ID: fake-session-id-that-does-not-exist');
    console.log('   Expected: 404 (answer not ready)');
    console.log('   Bug behavior: 500 (error thrown)');
    console.log('');

    console.log('🔄 Sending request...');
    console.log('');

    const response = await testEndpoint('/api/webrtc/session/fake-session-id-that-does-not-exist/answer');

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 RESULT');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log(`   HTTP Status: ${response.status}`);
    console.log('');

    if (response.data && !response.parseError) {
      console.log('   Response body:');
      console.log('   ' + JSON.stringify(response.data, null, 2).split('\n').join('\n   '));
    } else if (response.parseError) {
      console.log('   Response (not JSON):');
      console.log('   ' + String(response.data).substring(0, 200));
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🏁 TEST VERDICT');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');

    if (response.status === 404) {
      console.log('✅ TEST PASSED: 404 response correctly forwarded!');
      console.log('');
      console.log('   The fix is working correctly:');
      console.log('   - Next.js API received 404 from master controller');
      console.log('   - Next.js API forwarded 404 to frontend (not 500)');
      console.log('   - Frontend polling loop will work as expected');
      console.log('');

      if (response.data && response.data.error) {
        console.log(`   Message from master controller: "${response.data.error}"`);
      }

      process.exit(0);

    } else if (response.status === 500) {
      console.log('❌ TEST FAILED: Received 500 error');
      console.log('');
      console.log('   The fix did NOT work:');
      console.log('   - Next.js API is still converting 404s to 500s');
      console.log('   - Check that the fix was applied to answer/route.ts');
      console.log('   - Frontend polling loop will break');
      console.log('');

      if (response.data && response.data.error) {
        console.log(`   Error message: "${response.data.error}"`);
      }

      process.exit(1);

    } else {
      console.log(`⚠️  TEST INCONCLUSIVE: Unexpected status ${response.status}`);
      console.log('');
      console.log('   Expected 404 (answer not ready) or 500 (bug)');
      console.log('   Got something else - check the response above');
      console.log('');

      process.exit(1);
    }

  } catch (error) {
    console.error('');
    console.error('❌ Test failed with exception:', error.message);
    console.error('');

    if (error.code === 'ECONNREFUSED') {
      console.error('   Next.js dev server is not running on http://localhost:3000');
      console.error('   Please start the dev server with: npm run dev');
    }

    console.error('');
    process.exit(1);
  }
}

// Run the test
runTest();
