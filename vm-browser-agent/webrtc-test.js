#!/usr/bin/env node
/**
 * MINIMAL TEST - WebRTC Server Diagnostics
 * This is a stripped-down version to identify the crash cause
 */

console.error('========================================');
console.error('TEST SCRIPT STARTING');
console.error('========================================');
console.error('PID:', process.pid);
console.error('Node Version:', process.version);
console.error('Platform:', process.platform);
console.error('argv:', process.argv);
console.error('env SESSION_ID:', process.env.SESSION_ID);
console.error('========================================');

try {
  console.error('Testing require("http")...');
  const http = require('http');
  console.error('✓ http module loaded successfully');
} catch (error) {
  console.error('✗ FAILED to load http:', error.message);
  process.exit(1);
}

try {
  console.error('Testing require("fs")...');
  const fs = require('fs');
  console.error('✓ fs module loaded successfully');
} catch (error) {
  console.error('✗ FAILED to load fs:', error.message);
  process.exit(1);
}

try {
  console.error('Testing require("child_process")...');
  const { spawn } = require('child_process');
  console.error('✓ child_process module loaded successfully');
} catch (error) {
  console.error('✗ FAILED to load child_process:', error.message);
  process.exit(1);
}

console.error('========================================');
console.error('ALL TESTS PASSED!');
console.error('Staying alive for 30 seconds to verify stability...');
console.error('========================================');

// Stay alive for 30 seconds
setTimeout(() => {
  console.error('Still alive after 30 seconds - SUCCESS!');
  process.exit(0);
}, 30000);
