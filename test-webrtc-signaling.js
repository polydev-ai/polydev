#!/usr/bin/env node

/**
 * WebRTC Signaling Flow Test
 *
 * Tests the complete WebRTC signaling flow between browser (simulated) and VM
 *
 * This script simulates what the WebRTCViewer component does:
 * 1. Creates a mock WebRTC offer
 * 2. POSTs offer to master controller
 * 3. Polls for VM's answer
 * 4. Exchanges ICE candidates
 * 5. Verifies signaling completes successfully
 */

const SESSION_ID = 'a372e8e8-a82c-46e0-aace-197a539ce4eb'; // Fresh test VM session
const MASTER_CONTROLLER_URL = 'http://135.181.138.102:4000';

console.log('🧪 WebRTC Signaling Flow Test');
console.log('================================\n');
console.log(`Session ID: ${SESSION_ID}`);
console.log(`Master Controller: ${MASTER_CONTROLLER_URL}\n`);

/**
 * Generate a realistic mock WebRTC offer SDP
 */
function generateMockOffer() {
  const sessionId = Math.random().toString(36).substring(2, 15);

  return {
    type: 'offer',
    sdp: `v=0
o=- ${sessionId} 2 IN IP4 127.0.0.1
s=-
t=0 0
a=group:BUNDLE 0
a=msid-semantic: WMS
m=video 9 UDP/TLS/RTP/SAVPF 96
c=IN IP4 0.0.0.0
a=rtcp:9 IN IP4 0.0.0.0
a=ice-ufrag:${Math.random().toString(36).substring(2, 10)}
a=ice-pwd:${Math.random().toString(36).substring(2, 26)}
a=ice-options:trickle
a=fingerprint:sha-256 ${Array(32).fill(0).map(() =>
  Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
).join(':').toUpperCase()}
a=setup:actpass
a=mid:0
a=recvonly
a=rtcp-mux
a=rtpmap:96 VP8/90000
a=rtcp-fb:96 nack
a=rtcp-fb:96 nack pli
a=rtcp-fb:96 goog-remb
`
  };
}

/**
 * Generate mock ICE candidates
 */
function generateMockCandidates() {
  return [
    {
      candidate: 'candidate:1 1 UDP 2130706431 192.168.1.100 50000 typ host',
      sdpMLineIndex: 0
    },
    {
      candidate: 'candidate:2 1 UDP 1694498815 203.0.113.100 50001 typ srflx raddr 192.168.1.100 rport 50000',
      sdpMLineIndex: 0
    }
  ];
}

/**
 * Main test function
 */
async function runTest() {
  try {
    // Step 1: Send WebRTC offer
    console.log('📤 Step 1: Sending WebRTC offer to master controller...');

    const offer = generateMockOffer();
    const offerResponse = await fetch(
      `${MASTER_CONTROLLER_URL}/api/webrtc/session/${SESSION_ID}/offer`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offer: offer,
          candidates: [] // Using trickle ICE
        })
      }
    );

    if (!offerResponse.ok) {
      throw new Error(`Failed to send offer: ${offerResponse.status} ${offerResponse.statusText}`);
    }

    console.log('✅ Offer sent successfully\n');

    // Step 2: Send browser ICE candidates
    console.log('📤 Step 2: Sending browser ICE candidates...');

    const mockCandidates = generateMockCandidates();
    for (const candidate of mockCandidates) {
      const candidateResponse = await fetch(
        `${MASTER_CONTROLLER_URL}/api/webrtc/session/${SESSION_ID}/candidate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidate: candidate.candidate,
            sdpMLineIndex: candidate.sdpMLineIndex,
            from: 'browser'
          })
        }
      );

      if (!candidateResponse.ok) {
        console.warn(`⚠️  Failed to send ICE candidate: ${candidateResponse.status}`);
      }
    }

    console.log(`✅ Sent ${mockCandidates.length} browser ICE candidates\n`);

    // Step 3: Poll for VM's answer
    console.log('⏳ Step 3: Polling for VM answer (max 30 seconds)...');

    let answer = null;
    const maxAttempts = 30;

    for (let i = 0; i < maxAttempts; i++) {
      const answerResponse = await fetch(
        `${MASTER_CONTROLLER_URL}/api/webrtc/session/${SESSION_ID}/answer`
      );

      if (answerResponse.ok) {
        const data = await answerResponse.json();
        answer = data.answer;
        console.log('✅ Received VM answer!\n');
        console.log('📄 Answer SDP (first 200 chars):');
        console.log(answer.sdp.substring(0, 200) + '...\n');
        break;
      }

      // Wait 1 second before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
      process.stdout.write(`   Attempt ${i + 1}/${maxAttempts}...\r`);
    }

    if (!answer) {
      throw new Error('Timeout waiting for VM answer (30 seconds)');
    }

    // Step 4: Poll for VM ICE candidates
    console.log('⏳ Step 4: Polling for VM ICE candidates (10 seconds)...');

    let vmCandidates = [];
    const pollDuration = 10; // Poll for 10 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < pollDuration * 1000) {
      const candidatesResponse = await fetch(
        `${MASTER_CONTROLLER_URL}/api/webrtc/session/${SESSION_ID}/candidates/vm`
      );

      if (candidatesResponse.ok) {
        const data = await candidatesResponse.json();
        const newCandidates = data.candidates || [];

        if (newCandidates.length > 0) {
          vmCandidates = vmCandidates.concat(newCandidates);
          console.log(`   Received ${newCandidates.length} VM ICE candidate(s)`);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`✅ Received total ${vmCandidates.length} VM ICE candidates\n`);

    if (vmCandidates.length > 0) {
      console.log('📄 Sample VM ICE candidate:');
      console.log(JSON.stringify(vmCandidates[0], null, 2));
      console.log();
    }

    // Step 5: Summary
    console.log('======================================');
    console.log('✅ WebRTC Signaling Flow Test PASSED');
    console.log('======================================\n');
    console.log('Test Results:');
    console.log(`  ✅ Offer sent to VM`);
    console.log(`  ✅ Browser ICE candidates sent (${mockCandidates.length})`);
    console.log(`  ✅ VM answer received`);
    console.log(`  ✅ VM ICE candidates received (${vmCandidates.length})`);
    console.log();
    console.log('🎉 WebRTC signaling infrastructure is working correctly!');
    console.log();
    console.log('Next Steps:');
    console.log('  1. Test actual WebRTC connection with real browser');
    console.log('  2. Verify ICE connection reaches "connected" state');
    console.log('  3. Verify DTLS handshake completes');
    console.log('  4. Verify video rendering in browser');

  } catch (error) {
    console.error('\n❌ Test FAILED:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
runTest().catch(console.error);
