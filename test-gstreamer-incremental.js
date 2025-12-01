/**
 * Test GStreamer Pipelines Incrementally
 *
 * This script creates multiple versions of webrtc-server.js to test
 * GStreamer pipelines from simplest to most complex, identifying
 * exactly which element or property causes the syntax error
 */

const fs = require('fs');
const path = require('path');

// Test pipelines in order of complexity
const testPipelines = [
  {
    name: 'Test 1: Minimal (fakesrc → fakesink)',
    pipeline: 'fakesrc ! fakesink',
    description: 'Tests if spawn() invocation works at all'
  },
  {
    name: 'Test 2: ximagesrc without properties',
    pipeline: 'ximagesrc ! fakesink',
    description: 'Tests if ximagesrc element is available'
  },
  {
    name: 'Test 3: ximagesrc with framerate',
    pipeline: 'ximagesrc ! video/x-raw,framerate=30/1 ! fakesink',
    description: 'Tests if caps filtering works'
  },
  {
    name: 'Test 4: Add videoscale',
    pipeline: 'ximagesrc ! videoscale ! fakesink',
    description: 'Tests if videoscale element is available'
  },
  {
    name: 'Test 5: videoscale with resolution caps',
    pipeline: 'ximagesrc ! video/x-raw,framerate=30/1 ! videoscale ! video/x-raw,width=1280,height=720 ! fakesink',
    description: 'Tests full capture chain without encoding'
  },
  {
    name: 'Test 6: Add vp8enc without properties',
    pipeline: 'ximagesrc ! video/x-raw,framerate=30/1 ! vp8enc ! fakesink',
    description: 'Tests if vp8enc element is available'
  },
  {
    name: 'Test 7: vp8enc with target-bitrate only',
    pipeline: 'ximagesrc ! video/x-raw,framerate=30/1 ! vp8enc target-bitrate=2000000 ! fakesink',
    description: 'Tests if target-bitrate property is valid'
  },
  {
    name: 'Test 8: vp8enc with all properties',
    pipeline: 'ximagesrc ! video/x-raw,framerate=30/1 ! videoscale ! video/x-raw,width=1280,height=720 ! vp8enc target-bitrate=2000000 deadline=1 cpu-used=4 ! fakesink',
    description: 'Tests full pipeline without RTP payloader'
  },
  {
    name: 'Test 9: Full pipeline with rtpvp8pay',
    pipeline: 'ximagesrc ! video/x-raw,framerate=30/1 ! videoscale ! video/x-raw,width=1280,height=720 ! vp8enc target-bitrate=2000000 deadline=1 cpu-used=4 ! rtpvp8pay ! fakesink',
    description: 'Full production pipeline'
  }
];

function createTestVersion(testNum) {
  const test = testPipelines[testNum];

  console.log('='.repeat(80));
  console.log(`Creating: ${test.name}`);
  console.log(`Pipeline: ${test.pipeline}`);
  console.log(`Purpose:  ${test.description}`);
  console.log('='.repeat(80));
  console.log('');

  // Read the original webrtc-server.js
  const originalFile = '/Users/venkat/Documents/polydev-ai/vm-browser-agent/webrtc-server.js';
  let content = fs.readFileSync(originalFile, 'utf8');

  // Replace the pipeline (find the const gstPipeline = [ ... ] block)
  // Current pipeline is around line 311-315
  const pipelineRegex = /const gstPipeline = \[[^\]]+\];/s;

  const newPipeline = `const gstPipeline = [
      'gst-launch-1.0',
      '-v',
      \`${test.pipeline}\`
    ];`;

  content = content.replace(pipelineRegex, newPipeline);

  // Add a marker comment to identify which test this is
  const markerComment = `\n  /**\n   * GSTREAMER TEST: ${test.name}\n   * Pipeline: ${test.pipeline}\n   * ${test.description}\n   */\n  `;

  content = content.replace('async startGStreamer() {', `async startGStreamer() {${markerComment}`);

  // Write to test file
  const testFile = `/Users/venkat/Documents/polydev-ai/vm-browser-agent/webrtc-server-test${testNum + 1}.js`;
  fs.writeFileSync(testFile, content);

  console.log(`✅ Created: ${testFile}`);
  console.log('');

  return testFile;
}

function showInstructions(testFiles) {
  console.log('='.repeat(80));
  console.log('📋 DEPLOYMENT INSTRUCTIONS');
  console.log('='.repeat(80));
  console.log('');
  console.log('Test files created. To deploy and test:');
  console.log('');
  console.log('1. Copy a test file to webrtc-server.js:');
  testFiles.forEach((file, i) => {
    console.log(`   Test ${i + 1}: cp ${path.basename(file)} webrtc-server.js`);
  });
  console.log('');
  console.log('2. Rebuild golden rootfs:');
  console.log('   cd master-controller/scripts && ./build-golden-snapshot.sh');
  console.log('');
  console.log('3. Create test VM and check logs:');
  console.log('   curl -X POST http://135.181.138.102:4000/api/auth/start \\');
  console.log('     -H "Content-Type: application/json" \\');
  console.log('     -d \'{"userId": "test-gstreamer", "provider": "claude_code"}\'');
  console.log('');
  console.log('4. Check VM console log for GStreamer output');
  console.log('');
  console.log('RECOMMENDED APPROACH:');
  console.log('Start with Test 1 (fakesrc ! fakesink)');
  console.log('If it SUCCEEDS → Problem is with pipeline syntax/elements');
  console.log('If it FAILS → Problem is with spawn() invocation or GStreamer installation');
  console.log('');
}

// Main execution
console.log('');
console.log('🧪 Creating Incremental GStreamer Test Files');
console.log('');

const testFiles = [];
for (let i = 0; i < testPipelines.length; i++) {
  const file = createTestVersion(i);
  testFiles.push(file);
}

showInstructions(testFiles);
