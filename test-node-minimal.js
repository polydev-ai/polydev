#!/usr/bin/env node
// MINIMAL TEST - Should work in any Node.js environment

console.error('=== MINIMAL NODE TEST ===');
console.error('PID:', process.pid);
console.error('Node version:', process.version);
console.error('Platform:', process.platform);
console.error('Args:', process.argv);

console.error('Testing built-in modules...');
try {
  require('http');
  console.error('✓ http module loaded');
} catch(e) {
  console.error('✗ http module failed:', e.message);
}

try {
  require('fs');
  console.error('✓ fs module loaded');
} catch(e) {
  console.error('✗ fs module failed:', e.message);
}

try {
  require('child_process');
  console.error('✓ child_process module loaded');
} catch(e) {
  console.error('✗ child_process module failed:', e.message);
}

console.error('=== TEST COMPLETE - Waiting 20 seconds ===');
setTimeout(() => {
  console.error('Still alive after 20 seconds!');
  process.exit(0);
}, 20000);
