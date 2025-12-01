/**
 * Test WebRTC Signaling Flow End-to-End
 *
 * Verifies that the 404 forwarding fix in answer/route.ts works correctly
 *
 * Flow:
 * 1. Create VM session via /api/auth/start
 * 2. Simulate frontend sending WebRTC offer
 * 3. Poll for answer (should receive 404s initially, then 200 when ready)
 * 4. Verify 404 responses are correctly forwarded (not converted to 500)
 */

const http = require('http');

const NEXT_API_URL = 'http://localhost:3000';
const TEST_USER_ID = '5abacdd1-6a9b-48ce-b723-ca8056324c7a';

console.log('═══════════════════════════════════════════════════════════════');
console.log('🧪 TESTING WEBRTC SIGNALING FLOW');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');
console.log('This test verifies the 404 forwarding fix in answer/route.ts');
console.log('');

/**
 * Make HTTP request (Node.js native)
 */
function makeRequest(url, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      const bodyStr = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsedData = data ? JSON.parse(data) : null;
          resolve({
            status: res.statusCode,
            data: parsedData,
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

/**
 * Step 1: Create VM session
 */
async function createSession() {
  console.log('📝 Step 1: Creating VM session...');
  console.log('   Endpoint: POST /api/auth/start');
  console.log('   User ID:', TEST_USER_ID);
  console.log('');

  try {
    const response = await makeRequest(
      `${NEXT_API_URL}/api/auth/start`,
      'POST',
      {
        userId: TEST_USER_ID,
        provider: 'claude_code'
      }
    );

    if (response.status === 200 && response.data.sessionId) {
      console.log('   ✅ Session created successfully');
      console.log('   Session ID:', response.data.sessionId);
      console.log('   VM IP:', response.data.vmIp || 'Pending...');
      console.log('');
      return response.data.sessionId;
    } else {
      console.error('   ❌ Failed to create session');
      console.error('   Status:', response.status);
      console.error('   Response:', JSON.stringify(response.data, null, 2));
      return null;
    }
  } catch (error) {
    console.error('   ❌ Error creating session:', error.message);
    return null;
  }
}

/**
 * Step 2: Send mock WebRTC offer
 */
async function sendOffer(sessionId) {
  console.log('📤 Step 2: Sending WebRTC offer...');
  console.log('   Endpoint: POST /api/webrtc/session/:sessionId/offer');
  console.log('   Session ID:', sessionId);
  console.log('');

  const mockOffer = {
    offer: {
      type: 'offer',
      sdp: 'v=0\r\no=- 123 0 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\n'
    },
    candidates: []
  };

  try {
    const response = await makeRequest(
      `${NEXT_API_URL}/api/webrtc/session/${sessionId}/offer`,
      'POST',
      mockOffer
    );

    if (response.status === 200) {
      console.log('   ✅ Offer sent successfully');
      console.log('   Response:', JSON.stringify(response.data, null, 2));
      console.log('');
      return true;
    } else {
      console.error('   ❌ Failed to send offer');
      console.error('   Status:', response.status);
      console.error('   Response:', JSON.stringify(response.data, null, 2));
      return false;
    }
  } catch (error) {
    console.error('   ❌ Error sending offer:', error.message);
    return false;
  }
}

/**
 * Step 3: Poll for answer (CRITICAL TEST - verifies 404 forwarding)
 */
async function pollForAnswer(sessionId, maxAttempts = 10) {
  console.log('🔄 Step 3: Polling for WebRTC answer...');
  console.log('   Endpoint: GET /api/webrtc/session/:sessionId/answer');
  console.log('   Session ID:', sessionId);
  console.log('   Max attempts:', maxAttempts);
  console.log('');
  console.log('   🎯 TESTING: 404 responses should be forwarded (not converted to 500)');
  console.log('');

  const results = {
    total404s: 0,
    total500s: 0,
    total200s: 0,
    other: 0,
    success: false,
    answer: null
  };

  for (let i = 1; i <= maxAttempts; i++) {
    try {
      console.log(`   Attempt ${i}/${maxAttempts}...`);

      const response = await makeRequest(
        `${NEXT_API_URL}/api/webrtc/session/${sessionId}/answer`,
        'GET'
      );

      // Track status codes
      if (response.status === 404) {
        results.total404s++;
        console.log(`      ✅ Received 404 (answer not ready) - CORRECT BEHAVIOR`);
        console.log(`         Message: ${response.data?.error || 'No message'}`);
      } else if (response.status === 500) {
        results.total500s++;
        console.log(`      ❌ Received 500 - THIS IS THE BUG WE FIXED!`);
        console.log(`         Error: ${response.data?.error || 'Unknown error'}`);
      } else if (response.status === 200) {
        results.total200s++;
        console.log(`      ✅ Received 200 - Answer ready!`);
        console.log(`         Answer type: ${response.data?.answer?.type || 'N/A'}`);
        console.log(`         Candidates: ${response.data?.candidates?.length || 0}`);
        results.success = true;
        results.answer = response.data;
        break;
      } else {
        results.other++;
        console.log(`      ⚠️  Unexpected status: ${response.status}`);
        console.log(`         Response: ${JSON.stringify(response.data, null, 2)}`);
      }

      // Wait 2 seconds before next poll
      if (i < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } catch (error) {
      console.error(`      ❌ Request failed:`, error.message);
      results.other++;
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📊 POLLING RESULTS');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`   Total attempts: ${maxAttempts}`);
  console.log(`   404 responses (expected): ${results.total404s} ${results.total404s > 0 ? '✅' : ''}`);
  console.log(`   500 responses (BUG): ${results.total500s} ${results.total500s > 0 ? '❌' : '✅'}`);
  console.log(`   200 responses (success): ${results.total200s} ${results.total200s > 0 ? '✅' : ''}`);
  console.log(`   Other responses: ${results.other}`);
  console.log('');

  if (results.total500s > 0) {
    console.log('   ❌ CRITICAL: Received 500 errors - the fix did NOT work!');
    console.log('      The Next.js proxy is still converting 404s to 500s');
  } else if (results.total404s > 0 && results.total500s === 0) {
    console.log('   ✅ SUCCESS: 404 responses correctly forwarded!');
    console.log('      The fix is working - 404s are no longer converted to 500s');
  }

  if (results.success) {
    console.log('   ✅ Answer received successfully');
  } else {
    console.log('   ⚠️  Answer not received (VM may not be running WebRTC server yet)');
  }

  console.log('');
  return results;
}

/**
 * Main test flow
 */
async function runTest() {
  try {
    // Step 1: Create session
    const sessionId = await createSession();

    if (!sessionId) {
      console.error('❌ Test failed: Could not create session');
      console.error('   Make sure Next.js dev server is running on http://localhost:3000');
      process.exit(1);
    }

    // Wait for VM to boot (give it time to start)
    console.log('⏳ Waiting 10 seconds for VM to boot...');
    console.log('');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Step 2: Send offer
    const offerSent = await sendOffer(sessionId);

    if (!offerSent) {
      console.error('❌ Test failed: Could not send offer');
      process.exit(1);
    }

    // Wait for VM to receive offer
    console.log('⏳ Waiting 5 seconds for VM to receive offer...');
    console.log('');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Step 3: Poll for answer (MAIN TEST)
    const results = await pollForAnswer(sessionId, 10);

    // Final verdict
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🏁 TEST VERDICT');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');

    if (results.total500s > 0) {
      console.log('❌ TEST FAILED: Still receiving 500 errors');
      console.log('   The 404 forwarding fix did NOT work correctly');
      console.log('   Check the answer/route.ts file to verify the fix was applied');
      process.exit(1);
    } else if (results.total404s > 0 && results.total500s === 0) {
      console.log('✅ TEST PASSED: 404 forwarding works correctly!');
      console.log('   The fix successfully prevents 404s from being converted to 500s');
      console.log('   Frontend polling loop will now work as expected');

      if (!results.success) {
        console.log('');
        console.log('ℹ️  Note: Answer was not received, but this is expected because:');
        console.log('   - The VM may not have the WebRTC server running yet');
        console.log('   - The WebRTC server needs to be started in the VM');
        console.log('   - The important part is that 404s are correctly forwarded');
      }

      process.exit(0);
    } else {
      console.log('⚠️  TEST INCONCLUSIVE: No 404 or 500 responses received');
      console.log('   This may indicate a different issue');
      process.exit(1);
    }

  } catch (error) {
    console.error('');
    console.error('❌ Test failed with exception:', error.message);
    console.error('');
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
runTest();
