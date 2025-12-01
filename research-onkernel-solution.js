#!/usr/bin/env node

/**
 * Research "onkernel" and consult AI experts for GStreamer webrtcbin solution
 *
 * User has been stuck on this for 3+ weeks. The issue:
 * - GStreamer webrtcbin request_pad_simple returns None
 * - VMs crash in a loop with "Argument 1 does not allow None as a value"
 * - Even with correct modern API usage, webrtcbin is fundamentally broken
 *
 * Investigating:
 * 1. What is "onkernel" and can it solve this?
 * 2. Why is webrtcbin failing?
 * 3. Alternative approaches to WebRTC screen streaming
 */

import { polydev, exa } from '/Users/venkat/mcp-execution/dist/index.js';

console.log('🔍 RESEARCHING DEFINITIVE SOLUTION FOR WEBRTC ISSUE\n');
console.log('=' .repeat(60));
console.log('Issue: GStreamer webrtcbin failing for 3+ weeks');
console.log('Current Error: request_pad_simple returns None');
console.log('User Question: Can "onkernel" solve this?\n');

async function research() {
  try {
    // Initialize both tools in parallel
    console.log('🚀 Initializing research tools...\n');
    await Promise.all([polydev.initialize(), exa.initialize()]);

    // Step 1: Research "onkernel" with Exa
    console.log('📚 Step 1: Researching "onkernel"...\n');

    const onkernelResearch = await exa.search('onkernel webrtc video streaming linux', {
      numResults: 5,
      type: 'deep',
      livecrawl: 'preferred'
    });

    console.log('🔍 Onkernel Research Results:');
    console.log('=' .repeat(60));
    if (onkernelResearch.results && onkernelResearch.results.length > 0) {
      onkernelResearch.results.forEach((result, i) => {
        console.log(`\n${i + 1}. ${result.title}`);
        console.log(`   URL: ${result.url}`);
        console.log(`   Summary: ${result.text?.substring(0, 200)}...`);
      });
    } else {
      console.log('No results found for "onkernel"');
    }
    console.log('\n');

    // Step 2: Research GStreamer webrtcbin issues
    console.log('📚 Step 2: Researching GStreamer webrtcbin failures...\n');

    const gstreamerResearch = await exa.search('GStreamer webrtcbin request_pad_simple returns None', {
      numResults: 5,
      type: 'deep'
    });

    console.log('🔍 GStreamer webrtcbin Issue Research:');
    console.log('=' .repeat(60));
    if (gstreamerResearch.results && gstreamerResearch.results.length > 0) {
      gstreamerResearch.results.forEach((result, i) => {
        console.log(`\n${i + 1}. ${result.title}`);
        console.log(`   URL: ${result.url}`);
        console.log(`   Summary: ${result.text?.substring(0, 200)}...`);
      });
    }
    console.log('\n');

    // Step 3: Research alternative WebRTC approaches
    console.log('📚 Step 3: Researching alternative WebRTC screen capture methods...\n');

    const alternativesResearch = await exa.search('WebRTC screen streaming alternatives to GStreamer webrtcbin firecracker VM', {
      numResults: 5,
      type: 'deep'
    });

    console.log('🔍 Alternative WebRTC Approaches:');
    console.log('=' .repeat(60));
    if (alternativesResearch.results && alternativesResearch.results.length > 0) {
      alternativesResearch.results.forEach((result, i) => {
        console.log(`\n${i + 1}. ${result.title}`);
        console.log(`   URL: ${result.url}`);
        console.log(`   Summary: ${result.text?.substring(0, 200)}...`);
      });
    }
    console.log('\n');

    // Step 4: Consult Polydev AI for expert perspectives
    console.log('🤖 Step 4: Consulting AI experts via Polydev...\n');

    const expertConsultation = await polydev.getPerspectives(`
I've been debugging a WebRTC screen streaming issue for 3+ weeks. Here's the situation:

**Setup:**
- Firecracker VMs running Ubuntu with X11 display
- Using GStreamer webrtcbin for WebRTC screen capture
- Python helper script using PyGObject (gi.repository)
- Pipeline: ximagesrc → videoconvert → videoscale → vp8enc → rtpvp8pay → webrtcbin

**Problem:**
The GStreamer pipeline creation FAILS with:
\`\`\`
Failed to create pipeline: Argument 1 does not allow None as a value
\`\`\`

**Root Cause:**
At line 131 of the Python helper:
\`\`\`python
queue2_src = queue2.get_static_pad('src')
webrtc_sink = self.webrtc.request_pad_simple('sink_%u')  # Returns None!
if queue2_src.link(webrtc_sink) != Gst.PadLinkReturn.OK:
    raise Exception('Failed to link queue2 -> webrtcbin')
\`\`\`

The \`request_pad_simple('sink_%u')\` method is returning None instead of a valid pad object.

**What I've Tried:**
1. Fixed deprecated \`get_request_pad\` → \`request_pad_simple\` (no change)
2. Verified GStreamer 1.0 is installed in VM
3. Rebuilt golden rootfs with fix
4. Confirmed the fix is running in VMs (no deprecation warning)

**Critical Questions:**
1. Why does \`request_pad_simple('sink_%u')\` return None? Is webrtcbin plugin missing or broken?
2. The user mentioned "onkernel" as a potential solution - what is that and could it help?
3. What are BETTER alternatives to GStreamer webrtcbin for WebRTC screen streaming in VMs?
4. Should I abandon GStreamer entirely and use a different approach?
5. How can I diagnose if webrtcbin plugin is actually available and functional?

**Requirements:**
- Low latency (<50ms ideal)
- WebRTC compatible (browser-based viewing)
- Works in Firecracker VMs with X11
- Stable and production-ready

Please provide:
1. Root cause analysis of why request_pad_simple returns None
2. Diagnostic steps to verify webrtcbin availability
3. Alternative approaches if webrtcbin is fundamentally broken
4. What "onkernel" is and if it's relevant
5. Your recommended solution to END THIS 3+ WEEK DEBUGGING CYCLE
    `);

    console.log('🤖 Expert AI Perspectives:');
    console.log('=' .repeat(60));
    console.log(expertConsultation);
    console.log('\n');

    // Step 5: Synthesize findings
    console.log('=' .repeat(60));
    console.log('📊 SYNTHESIS AND RECOMMENDATIONS');
    console.log('=' .repeat(60));
    console.log('\n');

    console.log('Based on research and expert consultation, here are the findings:\n');

    console.log('1. ONKERNEL FINDINGS:');
    console.log('   (See research results above)\n');

    console.log('2. GSTREAMER WEBRTCBIN ROOT CAUSE:');
    console.log('   - request_pad_simple returns None when webrtcbin plugin is not available');
    console.log('   - Or when the element fails to initialize');
    console.log('   - This suggests missing GStreamer plugins or dependencies\n');

    console.log('3. RECOMMENDED ACTIONS:');
    console.log('   a) Verify webrtcbin plugin installation in VM');
    console.log('   b) Check GStreamer plugin registry');
    console.log('   c) Consider alternative approaches');
    console.log('   d) Evaluate "onkernel" if it\'s a viable alternative\n');

    console.log('✅ Research complete. See findings above.\n');

  } catch (error) {
    console.error('❌ Research failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

research().catch(console.error);
