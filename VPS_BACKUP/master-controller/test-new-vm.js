const WebSocket = require('ws');
const vmIP = process.argv[2] || '192.168.100.2';
console.log('[NEW-VM-TEST] Testing VNC proxy with:', vmIP);
const ws = new WebSocket(`ws://localhost:4000/vnc/${vmIP}`);
ws.on('open', () => console.log('[NEW-VM-TEST] ✓ Connected to', vmIP));
ws.on('message', (d) => {
  console.log('[NEW-VM-TEST] ✓ RFB:', d.toString('utf8', 0, 12));
  ws.close();
});
ws.on('error', (e) => console.log('[NEW-VM-TEST] ✗ Error:', e.message));
ws.on('close', () => process.exit(0));
setTimeout(() => process.exit(1), 5000);
