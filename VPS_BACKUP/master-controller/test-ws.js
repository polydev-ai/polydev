const WebSocket = require('ws');

console.log('[WS-TEST] Starting WebSocket connection test...');
console.log('[WS-TEST] Target: ws://localhost:4000/vnc/192.168.100.2');

const ws = new WebSocket('ws://localhost:4000/vnc/192.168.100.2');

ws.on('open', () => {
  console.log('[WS-TEST] ✓ Connection OPENED!');
  setTimeout(() => ws.close(), 500);
});

ws.on('error', (err) => {
  console.log('[WS-TEST] ✗ Error:', err.message);
  process.exit(1);
});

ws.on('close', (code) => {
  console.log('[WS-TEST] Connection closed, code:', code);
  process.exit(0);
});

setTimeout(() => {
  console.log('[WS-TEST] Timeout!');
  process.exit(1);
}, 5000);
