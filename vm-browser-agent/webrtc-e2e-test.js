#!/usr/bin/env node

/**
 * Comprehensive End-to-End WebRTC Signaling Flow Test
 * Tests the complete signaling sequence through Next.js proxy routes
 */

const http = require('http');
const crypto = require('crypto');

const PROXY_BASE_URL = 'http://localhost:3000';
// Will be set after creating auth session
let SESSION_ID = null;

// Mock WebRTC SDP offer
const MOCK_OFFER = {
  type: 'offer',
  sdp: `v=0
o=- 4611731400430051336 2 IN IP4 127.0.0.1
s=-
t=0 0
a=group:BUNDLE 0
a=extmap-allow-mixed
a=msid-semantic: WMS
m=application 9 UDP/DTLS/SCTP webrtc-datachannel
c=IN IP4 0.0.0.0
a=ice-ufrag:EsAd
a=ice-pwd:P2uYro0UCOQ4zxjKXaWCBKUy
a=ice-options:trickle
a=fingerprint:sha-256 00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF
a=setup:actpass
a=mid:0
a=sctp-port:5000
a=max-message-size:262144`
};

// Mock WebRTC SDP answer
const MOCK_ANSWER = {
  type: 'answer',
  sdp: `v=0
o=- 4611731400430051337 2 IN IP4 127.0.0.1
s=-
t=0 0
a=group:BUNDLE 0
a=extmap-allow-mixed
a=msid-semantic: WMS
m=application 9 UDP/DTLS/SCTP webrtc-datachannel
c=IN IP4 0.0.0.0
a=ice-ufrag:BcDe
a=ice-pwd:Q3vZsp1VDPR5ayuLYbXDCLVz
a=ice-options:trickle
a=fingerprint:sha-256 FF:EE:DD:CC:BB:AA:99:88:77:66:55:44:33:22:11:00:FF:EE:DD:CC:BB:AA:99:88:77:66:55:44:33:22:11:00
a=setup:active
a=mid:0
a=sctp-port:5000
a=max-message-size:262144`
};

// Mock ICE candidates
const MOCK_CLIENT_CANDIDATE = {
  candidate: 'candidate:1 1 UDP 2130706431 192.168.1.100 54321 typ host',
  sdpMLineIndex: 0,
  sdpMid: '0',
  type: 'local'
};

const MOCK_VM_CANDIDATE = {
  candidate: 'candidate:2 1 UDP 2130706431 192.168.100.5 12345 typ host',
  sdpMLineIndex: 0,
  sdpMid: '0',
  type: 'remote'
};

// Helper function to make HTTP requests
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, PROXY_BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (error) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test steps
const tests = [
  {
    name: '0. Create auth session (prerequisite)',
    run: async () => {
      // Create auth session to satisfy database constraints
      // This mimics what a real client does before WebRTC signaling
      const result = await makeRequest(
        'POST',
        '/api/auth/start',
        { userId: crypto.randomUUID(), provider: 'claude_code' }
      );
      if (result.status !== 200 && result.status !== 201) {
        throw new Error(`Expected 200/201, got ${result.status}: ${JSON.stringify(result.data)}`);
      }
      if (!result.data.sessionId) {
        throw new Error('No sessionId returned from auth/start');
      }
      // Set global SESSION_ID for all subsequent tests
      SESSION_ID = result.data.sessionId;
      console.log(`   Created session: ${SESSION_ID}`);
      return result;
    }
  },
  {
    name: '1. Client POSTs WebRTC offer',
    run: async () => {
      const result = await makeRequest(
        'POST',
        `/api/webrtc/session/${SESSION_ID}/offer`,
        { offer: MOCK_OFFER, candidates: [] }  // Wrap offer in expected format
      );
      if (result.status !== 200 && result.status !== 201) {
        throw new Error(`Expected 200/201, got ${result.status}: ${JSON.stringify(result.data)}`);
      }
      return result;
    }
  },
  {
    name: '2. VM GETs WebRTC offer',
    run: async () => {
      const result = await makeRequest(
        'GET',
        `/api/webrtc/session/${SESSION_ID}/offer`
      );
      if (result.status !== 200) {
        throw new Error(`Expected 200, got ${result.status}: ${JSON.stringify(result.data)}`);
      }
      if (!result.data.sdp) {
        throw new Error('Offer SDP not found in response');
      }
      return result;
    }
  },
  {
    name: '3. VM POSTs WebRTC answer',
    run: async () => {
      const result = await makeRequest(
        'POST',
        `/api/webrtc/session/${SESSION_ID}/answer`,
        { answer: MOCK_ANSWER, candidates: [] }  // Wrap answer in expected format
      );
      if (result.status !== 200 && result.status !== 201) {
        throw new Error(`Expected 200/201, got ${result.status}: ${JSON.stringify(result.data)}`);
      }
      return result;
    }
  },
  {
    name: '4. Client GETs WebRTC answer',
    run: async () => {
      const result = await makeRequest(
        'GET',
        `/api/webrtc/session/${SESSION_ID}/answer`
      );
      if (result.status !== 200) {
        throw new Error(`Expected 200, got ${result.status}: ${JSON.stringify(result.data)}`);
      }
      if (!result.data.sdp) {
        throw new Error('Answer SDP not found in response');
      }
      return result;
    }
  },
  {
    name: '5. Client POSTs ICE candidate',
    run: async () => {
      const result = await makeRequest(
        'POST',
        `/api/webrtc/session/${SESSION_ID}/candidate`,
        MOCK_CLIENT_CANDIDATE
      );
      if (result.status !== 200 && result.status !== 201) {
        throw new Error(`Expected 200/201, got ${result.status}: ${JSON.stringify(result.data)}`);
      }
      return result;
    }
  },
  {
    name: '6. VM POSTs ICE candidate',
    run: async () => {
      const result = await makeRequest(
        'POST',
        `/api/webrtc/session/${SESSION_ID}/candidate`,
        MOCK_VM_CANDIDATE
      );
      if (result.status !== 200 && result.status !== 201) {
        throw new Error(`Expected 200/201, got ${result.status}: ${JSON.stringify(result.data)}`);
      }
      return result;
    }
  },
  {
    name: '7. Client GETs local candidates',
    run: async () => {
      const result = await makeRequest(
        'GET',
        `/api/webrtc/session/${SESSION_ID}/candidates/browser`
      );
      if (result.status !== 200) {
        throw new Error(`Expected 200, got ${result.status}: ${JSON.stringify(result.data)}`);
      }
      return result;
    }
  },
  {
    name: '8. VM GETs remote candidates',
    run: async () => {
      const result = await makeRequest(
        'GET',
        `/api/webrtc/session/${SESSION_ID}/candidates/vm`
      );
      if (result.status !== 200) {
        throw new Error(`Expected 200, got ${result.status}: ${JSON.stringify(result.data)}`);
      }
      return result;
    }
  }
];

// Run all tests
async function runTests() {
  console.log('========================================');
  console.log('WebRTC End-to-End Signaling Flow Test');
  console.log('========================================');
  console.log(`Session ID: ${SESSION_ID}`);
  console.log(`Proxy URL: ${PROXY_BASE_URL}`);
  console.log('========================================\n');

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`Running: ${test.name}`);
      const result = await test.run();
      console.log(`✅ PASS: ${test.name}`);
      console.log(`   Status: ${result.status}`);
      if (result.data && typeof result.data === 'object') {
        console.log(`   Response: ${JSON.stringify(result.data).substring(0, 100)}...`);
      }
      console.log('');
      passed++;
    } catch (error) {
      console.log(`❌ FAIL: ${test.name}`);
      console.log(`   Error: ${error.message}`);
      console.log('');
      failed++;
    }
  }

  console.log('========================================');
  console.log('TEST RESULTS');
  console.log('========================================');
  console.log(`Total Tests: ${tests.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('========================================');

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
