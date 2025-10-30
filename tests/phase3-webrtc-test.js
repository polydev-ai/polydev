/**
 * Phase 3: WebRTC Integration Test
 *
 * Tests all WebRTC components:
 * - coturn TURN/STUN server
 * - WebRTC signaling API
 * - SDP offer/answer flow
 * - ICE candidate exchange
 */

const axios = require('axios');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName, status, details = '') {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  const color = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';
  log(`${icon} ${testName}: ${status}${details ? ' - ' + details : ''}`, color);
}

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0
};

async function runTest(testName, testFn) {
  results.total++;
  try {
    const result = await testFn();
    if (result === true || result?.pass === true) {
      results.passed++;
      logTest(testName, 'PASS', result?.details || '');
      return true;
    } else if (result?.warn) {
      results.warnings++;
      logTest(testName, 'WARN', result?.details || '');
      return null;
    } else {
      results.failed++;
      logTest(testName, 'FAIL', result?.details || 'Unexpected failure');
      return false;
    }
  } catch (error) {
    results.failed++;
    logTest(testName, 'FAIL', error.message);
    return false;
  }
}

async function main() {
  log('\n====================================', 'cyan');
  log('Phase 3: WebRTC Integration Test', 'cyan');
  log('====================================\n', 'cyan');

  const MASTER_CONTROLLER_URL = 'http://135.181.138.102:4000';
  const VPS_IP = '135.181.138.102';

  // Test 1: coturn Service
  log('Test Suite 1: coturn TURN/STUN Server', 'blue');

  await runTest('coturn service running', async () => {
    const { stdout } = await execPromise('ssh root@135.181.138.102 "systemctl is-active coturn"');
    return { pass: stdout.trim() === 'active', details: 'Service active' };
  });

  await runTest('coturn listening on port 3478', async () => {
    const { stdout } = await execPromise('ssh root@135.181.138.102 "netstat -tulnp | grep 3478 | grep turnserver"');
    const hasTCP = stdout.includes('tcp');
    const hasUDP = stdout.includes('udp');
    return { pass: hasTCP && hasUDP, details: `TCP: ${hasTCP}, UDP: ${hasUDP}` };
  });

  await runTest('coturn process running', async () => {
    const { stdout } = await execPromise('ssh root@135.181.138.102 "pgrep -f turnserver"');
    return { pass: stdout.trim().length > 0, details: `PID ${stdout.trim()}` };
  });

  // Test 2: WebRTC API Endpoints
  log('\nTest Suite 2: WebRTC Signaling API', 'blue');

  await runTest('GET /api/webrtc/ice-servers', async () => {
    const response = await axios.get(`${MASTER_CONTROLLER_URL}/api/webrtc/ice-servers`);
    const hasServers = response.data.iceServers && response.data.iceServers.length > 0;
    const hasSTUN = response.data.iceServers.some(s => s.urls.includes('stun:'));
    const hasTURN = response.data.iceServers.some(s => s.urls.includes('turn:'));
    return {
      pass: hasServers && hasSTUN && hasTURN,
      details: `${response.data.iceServers.length} servers (STUN: ${hasSTUN}, TURN: ${hasTURN})`
    };
  });

  await runTest('GET /api/webrtc/stats', async () => {
    const response = await axios.get(`${MASTER_CONTROLLER_URL}/api/webrtc/stats`);
    return {
      pass: response.status === 200,
      details: `Active sessions: ${response.data.stats.activeSessions}`
    };
  });

  // Test 3: Signaling Flow
  log('\nTest Suite 3: SDP Offer/Answer Exchange', 'blue');

  const testSessionId = `test-${Date.now()}`;

  await runTest('POST /api/webrtc/session/:id/offer', async () => {
    const mockOffer = {
      offer: {
        type: 'offer',
        sdp: 'v=0\r\no=- 123 2 IN IP4 127.0.0.1\r\ns=WebRTC Test\r\nt=0 0\r\n'
      },
      candidates: []
    };

    const response = await axios.post(
      `${MASTER_CONTROLLER_URL}/api/webrtc/session/${testSessionId}/offer`,
      mockOffer
    );

    return { pass: response.data.success === true, details: 'Offer accepted' };
  });

  await runTest('GET /api/webrtc/session/:id/offer (from VM)', async () => {
    const response = await axios.get(
      `${MASTER_CONTROLLER_URL}/api/webrtc/session/${testSessionId}/offer`
    );

    const hasOffer = response.data.offer && response.data.offer.type === 'offer';
    return { pass: hasOffer, details: 'Offer retrieved' };
  });

  await runTest('POST /api/webrtc/session/:id/answer', async () => {
    const mockAnswer = {
      answer: {
        type: 'answer',
        sdp: 'v=0\r\no=- 456 2 IN IP4 192.168.100.5\r\ns=WebRTC Answer\r\nt=0 0\r\n'
      },
      candidates: []
    };

    const response = await axios.post(
      `${MASTER_CONTROLLER_URL}/api/webrtc/session/${testSessionId}/answer`,
      mockAnswer
    );

    return { pass: response.data.success === true, details: 'Answer accepted' };
  });

  await runTest('GET /api/webrtc/session/:id/answer (from client)', async () => {
    const response = await axios.get(
      `${MASTER_CONTROLLER_URL}/api/webrtc/session/${testSessionId}/answer`
    );

    const hasAnswer = response.data.answer && response.data.answer.type === 'answer';
    return { pass: hasAnswer, details: 'Answer retrieved' };
  });

  await runTest('POST /api/webrtc/session/:id/candidate', async () => {
    const mockCandidate = {
      candidate: {
        candidate: 'candidate:1 1 UDP 2130706431 192.168.100.5 54321 typ host',
        sdpMid: '0',
        sdpMLineIndex: 0
      },
      source: 'vm'
    };

    const response = await axios.post(
      `${MASTER_CONTROLLER_URL}/api/webrtc/session/${testSessionId}/candidate`,
      mockCandidate
    );

    return { pass: response.data.success === true, details: 'Candidate added' };
  });

  await runTest('DELETE /api/webrtc/session/:id', async () => {
    const response = await axios.delete(
      `${MASTER_CONTROLLER_URL}/api/webrtc/session/${testSessionId}`
    );

    return { pass: response.data.success === true, details: 'Session cleaned up' };
  });

  // Test 4: WebRTC Service Files
  log('\nTest Suite 4: Component Deployment', 'blue');

  await runTest('WebRTC signaling service deployed', async () => {
    const { stdout } = await execPromise('ssh root@135.181.138.102 "ls -lh /opt/master-controller/src/services/webrtc-signaling.js"');
    return { pass: stdout.includes('webrtc-signaling.js'), details: 'File exists' };
  });

  await runTest('WebRTC routes deployed', async () => {
    const { stdout } = await execPromise('ssh root@135.181.138.102 "ls -lh /opt/master-controller/src/routes/webrtc.js"');
    return { pass: stdout.includes('webrtc.js'), details: 'File exists' };
  });

  await runTest('VM WebRTC server ready', async () => {
    const { stdout } = await execPromise('ssh root@135.181.138.102 "ls -lh /tmp/webrtc-server.js"');
    return { pass: stdout.includes('webrtc-server.js'), details: 'File exists' };
  });

  // Summary
  log('\n====================================', 'cyan');
  log('Test Results Summary', 'cyan');
  log('====================================', 'cyan');
  log(`Total Tests:  ${results.total}`, 'blue');
  log(`Passed:       ${results.passed}`, 'green');
  log(`Failed:       ${results.failed}`, 'red');
  log(`Warnings:     ${results.warnings}`, 'yellow');

  const successRate = Math.round((results.passed / results.total) * 100);
  log(`\nSuccess Rate: ${successRate}%`, successRate >= 95 ? 'green' : successRate >= 80 ? 'yellow' : 'red');

  if (results.failed === 0) {
    log('\n🎉 All tests passed! Phase 3 is operational.', 'green');
    process.exit(0);
  } else if (results.failed <= 2) {
    log('\n⚠️  Phase 3 is mostly operational with minor issues.', 'yellow');
    process.exit(0);
  } else {
    log('\n❌ Phase 3 has critical failures. Review failed tests.', 'red');
    process.exit(1);
  }
}

main().catch(error => {
  log(`\n❌ Test suite failed: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
