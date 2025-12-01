const WebSocket = require('ws');

console.log('[noVNC-TEST] Simulating noVNC client connection...');
console.log('[noVNC-TEST] Target: ws://localhost:4000/vnc/192.168.100.3');

const ws = new WebSocket('ws://localhost:4000/vnc/192.168.100.3');

ws.on('open', () => {
  console.log('[noVNC-TEST] ✓ WebSocket opened');
});

ws.on('message', (data) => {
  const str = data.toString('utf8', 0, Math.min(20, data.length));
  console.log('[noVNC-TEST] ✓ Received from VNC:', str);
  
  if (str.startsWith('RFB')) {
    console.log('[noVNC-TEST] ✅ SUCCESS: RFB protocol handshake received!');
    console.log('[noVNC-TEST] VNC version:', str.trim());
    ws.close();
  }
});

ws.on('error', (err) => {
  console.log('[noVNC-TEST] ✗ Error:', err.message);
  process.exit(1);
});

ws.on('close', (code) => {
  console.log('[noVNC-TEST] Closed with code:', code);
  process.exit(0);
});

setTimeout(() => {
  console.log('[noVNC-TEST] Timeout');
  process.exit(1);
}, 10000);
