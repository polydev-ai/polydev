#!/usr/bin/env node

/**
 * Quick WebRTC ICE Candidate Test
 * Tests if VM generates ICE candidates after receiving offer
 */

const SESSION_ID = '65a5139c-6405-4d55-81fe-73e51b22f177';
const MASTER_CONTROLLER_URL = 'http://135.181.138.102:4000';

console.log('🧪 WebRTC ICE Candidate Generation Test\n');
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
 * Main test function
 */
async function runTest() {
  try {
    // Step 1: Send WebRTC offer
    console.log('📤 Step 1: Sending WebRTC offer...');

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

    console.log('✅ Offer sent successfully\n');

    // Step 2: Poll for VM's answer
    console.log('⏳ Step 2: Polling for VM answer (max 30 seconds)...');

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
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      process.stdout.write(`   Attempt ${i + 1}/${maxAttempts}...\r`);
    }

    if (!answer) {
      throw new Error('Timeout waiting for VM answer (30 seconds)');
    }

    // Step 3: Poll for VM ICE candidates
    console.log('⏳ Step 3: Polling for VM ICE candidates (15 seconds)...');

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

    // Step 4: Result Summary
    console.log('======================================');
    if (vmCandidates.length > 0) {
      console.log('✅ TEST PASSED: ICE candidates generated!');
    } else {
      console.log('❌ TEST FAILED: NO ICE candidates generated');
    }
    console.log('======================================\n');
    console.log('Test Results:');
    console.log(`  ✅ Offer sent to VM`);
    console.log(`  ✅ VM answer received`);
    console.log(`  ${vmCandidates.length > 0 ? '✅' : '❌'} VM ICE candidates: ${vmCandidates.length}`);

    if (vmCandidates.length === 0) {
      console.log('\n⚠️  ISSUE: VM is not generating ICE candidates');
      console.log('This indicates webrtcbin GStreamer pipeline may not be running correctly.');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Test FAILED:', error.message);
    process.exit(1);
  }
}

// Run the test
runTest().catch(console.error);
