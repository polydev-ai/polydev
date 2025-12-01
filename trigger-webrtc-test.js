/**
 * Trigger WebRTC Test
 *
 * Sends a mock WebRTC offer to test VM session to trigger GStreamer execution
 * This allows us to verify the ximagesrc property separation fix
 */

const http = require('http');

const SESSION_ID = '42865345-73cd-49ea-b5d3-9b38ca9d5ac9';
const MASTER_CONTROLLER = '135.181.138.102';

// Mock WebRTC offer (simplified but valid structure)
const mockOffer = {
  type: 'offer',
  sdp: `v=0
o=- ${Date.now()} 2 IN IP4 127.0.0.1
s=WebRTC Test Client
t=0 0
a=group:BUNDLE 0
a=msid-semantic: WMS
m=video 9 UDP/TLS/RTP/SAVPF 96
c=IN IP4 0.0.0.0
a=rtcp:9 IN IP4 0.0.0.0
a=ice-ufrag:test1234
a=ice-pwd:testpassword1234567890123
a=ice-options:trickle
a=fingerprint:sha-256 AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99
a=setup:actpass
a=mid:0
a=recvonly
a=rtcp-mux
a=rtcp-rsize
a=rtpmap:96 VP8/90000
`
};

async function sendOffer() {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      offer: mockOffer,
      candidates: []
    });

    const options = {
      hostname: MASTER_CONTROLLER,
      port: 4000,
      path: `/api/webrtc/session/${SESSION_ID}/offer`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    console.log('[TEST] Sending WebRTC offer to session:', SESSION_ID);

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('[TEST] ✅ Offer sent successfully');
          console.log('[TEST] Response:', data);
          resolve(JSON.parse(data));
        } else {
          console.error('[TEST] ❌ Failed to send offer');
          console.error('[TEST] Status:', res.statusCode);
          console.error('[TEST] Response:', data);
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('[TEST] ❌ Request error:', error.message);
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(payload);
    req.end();
  });
}

async function waitForAnswer(maxAttempts = 30) {
  console.log('[TEST] Waiting for VM to create answer and start GStreamer...');

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const answer = await checkAnswer();
      if (answer) {
        console.log('[TEST] ✅ Answer received from VM!');
        console.log('[TEST] Answer type:', answer.answer.type);
        return answer;
      }
    } catch (error) {
      // 404 is expected while VM processes offer
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
    if (i % 5 === 0) {
      console.log(`[TEST] Still waiting... (${i * 2}s elapsed)`);
    }
  }

  throw new Error('Timeout waiting for answer');
}

async function checkAnswer() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: MASTER_CONTROLLER,
      port: 4000,
      path: `/api/webrtc/session/${SESSION_ID}/answer`,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else if (res.statusCode === 404) {
          resolve(null);  // Not ready yet
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(3000, () => req.destroy());
    req.end();
  });
}

async function main() {
  try {
    console.log('='.repeat(60));
    console.log('WebRTC GStreamer Fix Verification Test');
    console.log('='.repeat(60));
    console.log('');
    console.log('Session ID:', SESSION_ID);
    console.log('Master Controller:', MASTER_CONTROLLER);
    console.log('');

    // Step 1: Send offer to trigger GStreamer
    await sendOffer();
    console.log('');

    // Step 2: Wait for VM to process and create answer
    const answer = await waitForAnswer();
    console.log('');

    console.log('='.repeat(60));
    console.log('✅ TEST SUCCESSFUL - WebRTC signaling complete');
    console.log('='.repeat(60));
    console.log('');
    console.log('Next step: Check VM console logs for GStreamer execution');
    console.log('Expected: NO syntax errors, separate ximagesrc properties');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('❌ TEST FAILED:', error.message);
    console.error('='.repeat(60));
    process.exit(1);
  }
}

main();
