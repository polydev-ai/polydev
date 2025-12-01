/**
 * Auto-Consultation: GStreamer Syntax Error Investigation
 *
 * Using Polydev + Exa to investigate why GStreamer fails with minimal error output
 */

import { polydev, exa } from '/Users/venkat/mcp-execution/dist/index.js';

async function investigateGStreamerIssue() {
  try {
    console.log('🔍 Starting automatic consultation for GStreamer issue...\n');

    // Initialize both services in parallel
    await Promise.all([polydev.initialize(), exa.initialize()]);

    console.log('='.repeat(80));
    console.log('🤖 STEP 1: Consulting AI Experts (Polydev)');
    console.log('='.repeat(80));
    console.log('');

    // Get expert perspectives on the GStreamer issue
    const perspectives = await polydev.getPerspectives(`
GStreamer consistently fails with MINIMAL error output in Firecracker VMs.

CONTEXT:
- Running inside Ubuntu 22.04 Firecracker VMs
- Node.js v18.20.8 spawning gst-launch-1.0
- Command: gst-launch-1.0 -v ximagesrc ! video/x-raw,framerate=30/1 ! videoscale ! video/x-raw,width=1280,height=720 ! vp8enc target-bitrate=2000000 deadline=1 cpu-used=4 ! rtpvp8pay ! fakesink
- Using spawn(['gst-launch-1.0', '-v', 'pipeline...'])

ERROR OUTPUT (ONLY THIS):
[GStreamer STDERR] WARNING: erroneous pipeline: syntax error
[GStreamer] Process exited with code: 1

WHAT'S UNUSUAL:
GStreamer normally provides DETAILED error messages (which element failed, which property is invalid, etc).
This provides NO details whatsoever despite logging ALL stderr output.

WHAT'S BEEN TRIED:
- ✅ Removed invalid properties (use-damage=0, display-name=:1)
- ✅ Fixed spawn() argument passing (entire pipeline as one string)
- ✅ Enabled full stderr logging (no filtering)
- ✅ Verified GStreamer plugins installed (gstreamer1.0-tools, -plugins-base, -plugins-good, -x)

QUESTIONS:
1. Why would GStreamer output only ONE line of error with no details?
2. Could this be a shell escaping issue with the pipeline string?
3. Should I test the pipeline directly in the VM shell instead of via Node.js spawn()?
4. Are there missing GStreamer dependencies that would cause immediate failure?
5. What's the proper syntax for ximagesrc X11 capture in GStreamer 1.20 (Ubuntu 22.04)?
    `);

    console.log('📋 Expert Perspectives:\n');
    console.log(perspectives);
    console.log('\n');

    console.log('='.repeat(80));
    console.log('📚 STEP 2: Research GStreamer Documentation (Exa)');
    console.log('='.repeat(80));
    console.log('');

    // Research GStreamer syntax errors
    console.log('🔍 Searching: GStreamer syntax error minimal output causes...\n');
    const syntaxResearch = await exa.search('GStreamer "erroneous pipeline syntax error" minimal output Ubuntu', {
      numResults: 5,
      type: 'deep',
      livecrawl: 'preferred'
    });

    console.log('Results:\n');
    for (let i = 0; i < Math.min(3, syntaxResearch.content.length); i++) {
      const item = syntaxResearch.content[i];
      console.log(`${i + 1}. ${item.title || 'Result'}`);
      console.log(`   URL: ${item.url}`);
      console.log(`   ${item.text.substring(0, 400)}...\n`);
    }

    console.log('='.repeat(80));
    console.log('📖 STEP 3: Find Working ximagesrc Pipeline Examples (Exa)');
    console.log('='.repeat(80));
    console.log('');

    // Get working pipeline examples
    console.log('🔍 Searching: Working GStreamer ximagesrc VP8 encode examples...\n');
    const exampleResearch = await exa.getCodeContext('gst-launch-1.0 ximagesrc videoscale vp8enc working example', 5000);

    console.log('Code Examples:\n');
    for (let i = 0; i < Math.min(2, exampleResearch.content.length); i++) {
      const item = exampleResearch.content[i];
      console.log(`${i + 1}. ${item.title || 'Example'}`);
      console.log(`   ${item.text.substring(0, 600)}...\n`);
    }

    console.log('='.repeat(80));
    console.log('🔧 STEP 4: Research GStreamer Debugging Techniques (Exa)');
    console.log('='.repeat(80));
    console.log('');

    // Research debugging techniques
    console.log('🔍 Searching: GStreamer debugging techniques pipeline failures...\n');
    const debugResearch = await exa.search('GStreamer debug pipeline "syntax error" gst-inspect', {
      numResults: 3,
      type: 'deep'
    });

    console.log('Debugging Techniques:\n');
    for (let i = 0; i < debugResearch.content.length; i++) {
      const item = debugResearch.content[i];
      console.log(`${i + 1}. ${item.title || 'Technique'}`);
      console.log(`   ${item.text.substring(0, 400)}...\n`);
    }

    console.log('='.repeat(80));
    console.log('✅ AUTO-CONSULTATION COMPLETE');
    console.log('='.repeat(80));
    console.log('');
    console.log('Results gathered from:');
    console.log('  🤖 Multi-model AI experts (GPT-4, Claude, Gemini, Grok)');
    console.log('  🔍 Web research on GStreamer syntax errors');
    console.log('  📖 Working code examples');
    console.log('  🔧 Debugging techniques');
    console.log('');

  } catch (error) {
    console.error('❌ Auto-consultation failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

investigateGStreamerIssue();
