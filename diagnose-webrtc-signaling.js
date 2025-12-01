/**
 * Diagnose WebRTC Signaling Failure
 *
 * Problem: VM WebRTC server times out waiting for client offer
 * Impact: GStreamer pipeline never starts, cannot validate UDP streaming
 *
 * Investigation:
 * 1. Why isn't the frontend sending WebRTC offers?
 * 2. Is the master controller signaling endpoint working?
 * 3. Is the session ID being passed correctly?
 */

import { polydev, exa } from '../../mcp-execution/dist/index.js';

console.log('═══════════════════════════════════════════════════════════════');
console.log('🔍 WEBRTC SIGNALING DIAGNOSIS');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');
console.log('Problem: VM waits 60s for client offer, times out');
console.log('Session: f988838d-a03c-4bbd-b12a-4b8c09c32d5b');
console.log('VM IP: 192.168.100.24');
console.log('');

async function diagnoseSignaling() {
  try {
    // Initialize both services
    console.log('🚀 Initializing Polydev and Exa...');
    await Promise.all([
      polydev.initialize(),
      exa.initialize()
    ]);
    console.log('✅ Services initialized');
    console.log('');

    // 1. Get expert perspectives on WebRTC signaling issues
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🤖 CONSULTING AI EXPERTS (Polydev)');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');

    const perspectives = await polydev.getPerspectives(`
WebRTC signaling failure - VM never receives client offer:

**System Architecture:**
- Frontend: Next.js app (presumably at localhost:3000 or deployed)
- Master Controller: Node.js server at 192.168.100.1:4000
- VM WebRTC Server: Running inside Firecracker VM at 192.168.100.24

**Signaling Flow (Expected):**
1. User opens frontend in browser
2. Frontend creates WebRTC offer (SDP)
3. Frontend sends offer to master controller: POST /api/webrtc/session/{sessionId}/offer
4. VM polls master controller: GET /api/webrtc/session/{sessionId}/offer
5. VM receives offer, creates answer
6. VM sends answer to master controller: POST /api/webrtc/session/{sessionId}/answer
7. Frontend polls for answer: GET /api/webrtc/session/{sessionId}/answer

**Current Issue:**
- VM starts WebRTC server successfully
- VM begins polling: "GET /api/webrtc/session/f988838d-.../offer"
- VM waits 60 seconds, times out: "Timeout waiting for client offer"
- GStreamer pipeline never starts

**Evidence from VM console log:**
\`\`\`
[   99.660682] [WebRTC] ICE servers fetched: 4
[   99.660948] [WebRTC] Waiting for client offer...
[  159.xxx] [WebRTC] Failed to start: Timeout waiting for client offer
\`\`\`

**Questions:**
1. Why would the frontend not send a WebRTC offer?
   - No frontend running?
   - Frontend doesn't know session ID?
   - Frontend route not implemented?
   - CORS blocking the request?

2. What should I check to diagnose this?
   - Master controller logs for incoming offer requests
   - Master controller /api/webrtc routes implementation
   - Frontend code that initiates WebRTC connection
   - Session storage/management

3. How do I test the signaling manually?
   - Can I curl a test offer to the master controller?
   - What does a valid WebRTC offer look like?

Please provide specific debugging steps and diagnostic commands.
    `);

    console.log('Expert Perspectives:');
    console.log('─────────────────────────────────────────────────────────────');
    console.log(perspectives);
    console.log('');

    // 2. Research WebRTC signaling architecture
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🔍 RESEARCHING SOLUTIONS (Exa)');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');

    console.log('📚 Query 1: WebRTC signaling server implementation');
    const signalingResearch = await exa.search(
      'WebRTC signaling server Node.js offer answer exchange implementation',
      {
        numResults: 5,
        type: 'deep',
        livecrawl: 'preferred'
      }
    );

    console.log('Results:');
    if (signalingResearch.results && signalingResearch.results.length > 0) {
      signalingResearch.results.slice(0, 3).forEach((result, idx) => {
        console.log(`\n${idx + 1}. ${result.title}`);
        console.log(`   URL: ${result.url}`);
        if (result.text) {
          console.log(`   Summary: ${result.text.substring(0, 250)}...`);
        }
      });
    }
    console.log('');

    console.log('📚 Query 2: WebRTC frontend client integration');
    const frontendResearch = await exa.search(
      'WebRTC browser client create offer send to signaling server',
      {
        numResults: 5,
        type: 'deep'
      }
    );

    console.log('Results:');
    if (frontendResearch.results && frontendResearch.results.length > 0) {
      frontendResearch.results.slice(0, 3).forEach((result, idx) => {
        console.log(`\n${idx + 1}. ${result.title}`);
        console.log(`   URL: ${result.url}`);
        if (result.text) {
          console.log(`   Summary: ${result.text.substring(0, 250)}...`);
        }
      });
    }
    console.log('');

    console.log('📚 Query 3: Debugging WebRTC signaling connection failures');
    const debugResearch = await exa.search(
      'WebRTC offer not received debugging signaling timeout',
      {
        numResults: 5,
        type: 'deep'
      }
    );

    console.log('Results:');
    if (debugResearch.results && debugResearch.results.length > 0) {
      debugResearch.results.slice(0, 3).forEach((result, idx) => {
        console.log(`\n${idx + 1}. ${result.title}`);
        console.log(`   URL: ${result.url}`);
        if (result.text) {
          console.log(`   Summary: ${result.text.substring(0, 250)}...`);
        }
      });
    }
    console.log('');

    // 4. Summary
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📋 DIAGNOSIS PLAN');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('Based on consultation, check these in order:');
    console.log('');
    console.log('1. Master Controller WebRTC Routes:');
    console.log('   - Check if /api/webrtc/session/:sessionId/offer exists');
    console.log('   - Verify POST endpoint stores offers');
    console.log('   - Verify GET endpoint retrieves offers');
    console.log('');
    console.log('2. Master Controller Logs:');
    console.log('   - Look for incoming offer requests');
    console.log('   - Check for errors in WebRTC routes');
    console.log('   - Verify session storage');
    console.log('');
    console.log('3. Frontend Implementation:');
    console.log('   - Find where WebRTC connection is initiated');
    console.log('   - Check if frontend has session ID');
    console.log('   - Verify frontend sends offer to correct endpoint');
    console.log('');
    console.log('4. Manual Test:');
    console.log('   - Create mock WebRTC offer');
    console.log('   - POST to master controller manually');
    console.log('   - Verify VM receives it');
    console.log('');

  } catch (error) {
    console.error('❌ Error during diagnosis:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run diagnosis
diagnoseSignaling().then(() => {
  console.log('✅ Diagnosis complete - proceeding with investigation');
  console.log('');
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
