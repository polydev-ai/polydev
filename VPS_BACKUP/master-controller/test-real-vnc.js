const WebSocket = require('ws');

console.log('[VNC-REAL-TEST] Connecting to ws://localhost:4000/vnc/192.168.100.3');

const ws = new WebSocket('ws://localhost:4000/vnc/192.168.100.3');

ws.on('open', () => {
  console.log('[VNC-REAL-TEST] ✓✓✓ WebSocket OPENED - Connected to VNC!');
});

ws.on('message', (data) => {
  console.log('[VNC-REAL-TEST] ✓ Received VNC data:', data.length, 'bytes');
  console.log('[VNC-REAL-TEST] First 50 bytes:', data.slice(0, 50).toString('hex'));
  setTimeout(() => ws.close(), 1000);
});

ws.on('error', (err) => {
  console.log('[VNC-REAL-TEST] ✗ Error:', err.message);
  process.exit(1);
});

ws.on('close', (code) => {
  console.log('[VNC-REAL-TEST] Connection closed, code:', code);
  process.exit(0);
});

setTimeout(() => {
  console.log('[VNC-REAL-TEST] Timeout!');
  process.exit(1);
}, 10000);
