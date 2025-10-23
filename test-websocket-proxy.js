#!/usr/bin/env node
/**
 * Minimal WebSocket Proxy Test
 * Replicates the exact behavior of server.js to diagnose ECONNRESET issue
 */

const http = require('http');

const BACKEND_HOST = '135.181.138.102';
const BACKEND_PORT = 4000;
const TEST_SESSION_ID = 'ad2bb118-3808-4732-88da-a0d3d5dd9a23';
const TEST_PATH = `/api/auth/session/${TEST_SESSION_ID}/novnc/websock`;

console.log('=== WebSocket Proxy Diagnostic Tool ===\n');
console.log('Testing connection to:', `${BACKEND_HOST}:${BACKEND_PORT}${TEST_PATH}`);
console.log('');

// Simulate WebSocket upgrade headers
const upgradeHeaders = {
  'Host': `${BACKEND_HOST}:${BACKEND_PORT}`,
  'Connection': 'Upgrade',
  'Upgrade': 'websocket',
  'Sec-WebSocket-Version': '13',
  'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
  'Sec-WebSocket-Protocol': 'binary',
  'Origin': 'http://localhost:3000'
};

console.log('Sending headers:');
console.log(JSON.stringify(upgradeHeaders, null, 2));
console.log('');

const options = {
  host: BACKEND_HOST,
  port: BACKEND_PORT,
  path: TEST_PATH,
  method: 'GET',
  headers: upgradeHeaders
};

console.log('[1] Creating HTTP request...');
const req = http.request(options);

req.on('socket', (socket) => {
  console.log('[2] Socket created:', {
    localAddress: socket.localAddress,
    localPort: socket.localPort,
    remoteAddress: socket.remoteAddress,
    remotePort: socket.remotePort
  });

  socket.on('connect', () => {
    console.log('[3] Socket connected to backend');
  });

  socket.on('error', (err) => {
    console.error('[ERROR] Socket error:', {
      message: err.message,
      code: err.code,
      syscall: err.syscall,
      errno: err.errno,
      stack: err.stack
    });
  });

  socket.on('close', (hadError) => {
    console.log('[CLOSE] Socket closed', { hadError });
  });

  socket.on('end', () => {
    console.log('[END] Socket ended by remote');
  });
});

req.on('error', (err) => {
  console.error('[ERROR] Request error:', {
    message: err.message,
    code: err.code,
    syscall: err.syscall,
    errno: err.errno
  });
  process.exit(1);
});

req.on('upgrade', (res, socket, head) => {
  console.log('[SUCCESS] Upgrade response received:', {
    statusCode: res.statusCode,
    statusMessage: res.statusMessage,
    headers: res.headers
  });

  if (head.length > 0) {
    console.log('[DATA] Received head data:', head.length, 'bytes');
    console.log('[DATA] First 50 bytes:', head.slice(0, 50).toString('hex'));
  }

  socket.destroy();
  console.log('\n✅ WebSocket upgrade successful!');
  process.exit(0);
});

req.on('response', (res) => {
  console.log('[RESPONSE] Got HTTP response instead of upgrade:', {
    statusCode: res.statusCode,
    statusMessage: res.statusMessage,
    headers: res.headers
  });

  let body = '';
  res.on('data', (chunk) => {
    body += chunk.toString();
  });

  res.on('end', () => {
    console.log('[RESPONSE BODY]:', body);
    process.exit(1);
  });
});

console.log('[4] Sending request...');
req.end();

// Timeout after 5 seconds
setTimeout(() => {
  console.error('\n❌ TIMEOUT: No response after 5 seconds');
  process.exit(1);
}, 5000);
