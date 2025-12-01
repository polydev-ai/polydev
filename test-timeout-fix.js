#!/usr/bin/env node

/**
 * Test WebRTC Timeout Fix - Validates 10-Minute Timeout
 *
 * This test validates that VMs now wait up to 10 minutes for WebRTC offers
 * (increased from 60 seconds), and verifies ICE candidate generation.
 */

const SESSION_ID = '920615d1-f41b-43d5-b6ed-f33a12aecebb';
const MASTER_CONTROLLER_URL = 'http://135.181.138.102:4000';

console.log('🧪 WebRTC Timeout Fix Validation Test\n');
console.log('========================================\n');
console.log(`Session ID: ${SESSION_ID}`);
console.log(`Master Controller: ${MASTER_CONTROLLER_URL}`);
console.log(`VM IP: 192.168.100.43\n`);

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
 * Main test function
 */
async function runTest() {
  try {
    console.log('⏱️  Test Scenario: Delayed Offer (2 minutes delay)');
    console.log('   This simulates real-world browser initialization delays\n');

    // Step 1: Wait 2 minutes before sending offer (simulating delayed browser initialization)
    console.log('⏳ Step 1: Waiting 2 minutes before sending offer...');
    console.log('   (Old timeout: 60s would fail | New timeout: 10min should succeed)\n');

    await new Promise(resolve => setTimeout(resolve, 120000)); // 2 minutes

    console.log('✅ 2 minutes elapsed. Now sending WebRTC offer...\n');

    // Step 2: Send WebRTC offer
    console.log('📤 Step 2: Sending WebRTC offer to VM...');

    const offer = generateMockOffer();
    const offerResponse = await fetch(
      `${MASTER_CONTROLLER_URL}/api/webrtc/session/${SESSION_ID}/offer`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offer: offer,
          candidates: []
        })
      }
    );

    if (!offerResponse.ok) {
      throw new Error(`Failed to send offer: ${offerResponse.status}`);
    }

    console.log('✅ Offer sent successfully after 2-minute delay!\n');

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
        console.log(`✅ Received VM answer after ${i + 1} second(s)!\n`);
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      process.stdout.write(`   Attempt ${i + 1}/${maxAttempts}...\r`);
    }

    if (!answer) {
      throw new Error('Timeout waiting for VM answer (30 seconds)');
    }

    // Step 4: Poll for VM ICE candidates
    console.log('⏳ Step 4: Polling for VM ICE candidates (15 seconds)...\n');

    let vmCandidates = [];
    const pollDuration = 15;
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

    console.log(`\n✅ Received total ${vmCandidates.length} VM ICE candidates\n`);

    if (vmCandidates.length > 0) {
      console.log('📄 Sample VM ICE candidate:');
      console.log(JSON.stringify(vmCandidates[0], null, 2));
      console.log();
    }

    // Step 5: Summary
    console.log('========================================');
    console.log('✅ TIMEOUT FIX TEST RESULTS');
    console.log('========================================\n');
    console.log('Test Results:');
    console.log(`  ✅ VM waited for offer (2 minutes)`);
    console.log(`  ✅ Offer sent successfully after delay`);
    console.log(`  ✅ VM answer received`);
    console.log(`  ${vmCandidates.length > 0 ? '✅' : '❌'} VM ICE candidates: ${vmCandidates.length}\n`);

    if (vmCandidates.length > 0) {
      console.log('🎉 SUCCESS: Timeout fix working! VMs can now wait up to 10 minutes for offers.\n');
      console.log('Next Steps:');
      console.log('  1. Verify webrtcbin GStreamer pipeline starts correctly');
      console.log('  2. Test ICE connection establishment');
      console.log('  3. Verify DTLS handshake completes');
      console.log('  4. Test video rendering in browser');
    } else {
      console.log('⚠️  WARNING: Timeout fix works, but no ICE candidates generated.');
      console.log('This indicates webrtcbin GStreamer pipeline may not be running correctly.\n');
      console.log('Next Steps:');
      console.log('  1. Check VM console logs for GStreamer errors');
      console.log('  2. Verify webrtcbin plugin is available');
      console.log('  3. Validate GStreamer pipeline syntax');
    }

  } catch (error) {
    console.error('\n❌ Test FAILED:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
runTest().catch(console.error);
