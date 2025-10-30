# Phase 3: WebRTC Streaming Configuration

**Goal**: Replace noVNC with WebRTC for <50ms latency Browser VM streaming

---

## Overview

WebRTC (Web Real-Time Communication) provides peer-to-peer video streaming with significantly lower latency than VNC-based solutions.

**Comparison**:
- noVNC: ~200ms latency (VNC protocol + WebSocket overhead)
- WebRTC: ~20-50ms latency (direct P2P with UDP)

---

## Architecture

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│   Frontend  │         │ Master-Controller│         │ Browser VM  │
│   (Client)  │         │ (Signaling)      │         │   (Peer)    │
└─────────────┘         └──────────────────┘         └─────────────┘
       │                        │                            │
       │ 1. GET /ice-servers   │                            │
       │───────────────────────>│                            │
       │ <ICE server config>    │                            │
       │<───────────────────────│                            │
       │                        │                            │
       │ 2. Create offer        │                            │
       │ POST /session/x/offer  │                            │
       │───────────────────────>│                            │
       │                        │ 3. GET /session/x/offer    │
       │                        │<───────────────────────────│
       │                        │ <SDP offer>                │
       │                        │────────────────────────────>│
       │                        │                            │
       │                        │ 4. POST /session/x/answer  │
       │                        │<───────────────────────────│
       │ 5. GET /session/x/answer                           │
       │───────────────────────>│                            │
       │ <SDP answer>           │                            │
       │<───────────────────────│                            │
       │                        │                            │
       │ 6. Direct P2P connection established               │
       │<═══════════════════════════════════════════════════>│
       │         Video stream (VP8/VP9)                      │
       └─────────────────────────────────────────────────────┘
```

---

## Components

### 1. coturn (TURN/STUN Server)

**Installed on**: VPS 135.181.138.102
**Config**: `/etc/turnserver.conf`
**Ports**:
- 3478: STUN/TURN (UDP/TCP)
- 5349: TURNS (TLS)
- 49152-65535: UDP relay

**Credentials**:
- Username: `polydev`
- Password: `PolydevWebRTC2025!`

**Installation**:
```bash
ssh root@135.181.138.102
cd /tmp
./scripts/install-coturn.sh
```

**Verification**:
```bash
systemctl status coturn
netstat -tulnp | grep 3478
```

---

### 2. WebRTC Signaling Service

**Location**: `master-controller/src/services/webrtc-signaling.js`

**Purpose**: Exchange SDP offers/answers and ICE candidates between client and VM

**Features**:
- ICE server configuration provider
- SDP offer/answer storage
- ICE candidate exchange
- Session management (memory + DB)

**Usage**:
```javascript
const { getWebRTCSignalingService } = require('./services/webrtc-signaling');
const signaling = getWebRTCSignalingService();

// Get ICE servers
const iceServers = signaling.getICEServers(sessionId);

// Store client offer
await signaling.storeOffer(sessionId, offer, candidates);

// Get VM answer
const answer = await signaling.getAnswer(sessionId);
```

---

### 3. WebRTC API Routes

**Location**: `master-controller/src/routes/webrtc.js`

**Endpoints**:

#### GET /api/webrtc/ice-servers
Returns TURN/STUN server configuration for WebRTC peer connection

**Response**:
```json
{
  "success": true,
  "iceServers": [
    { "urls": "stun:135.181.138.102:3478" },
    { "urls": "turn:135.181.138.102:3478", "username": "polydev", "credential": "..." },
    { "urls": "stun:stun.l.google.com:19302" }
  ]
}
```

#### POST /api/webrtc/session/:sessionId/offer
Client submits SDP offer

**Request**:
```json
{
  "offer": {
    "type": "offer",
    "sdp": "v=0\r\no=- ..."
  },
  "candidates": [...]
}
```

#### GET /api/webrtc/session/:sessionId/answer
Client polls for VM's SDP answer

**Response**:
```json
{
  "success": true,
  "answer": {
    "type": "answer",
    "sdp": "v=0\r\no=- ..."
  },
  "candidates": [...]
}
```

---

### 4. VM-Side WebRTC Server

**Location**: `vm-browser-agent/webrtc-server.js`

**Purpose**: Run inside Browser VM to stream desktop via WebRTC

**Features**:
- Poll for client's SDP offer
- Create SDP answer
- Start GStreamer pipeline for screen capture
- Stream via WebRTC

**Startup** (inside VM):
```bash
export SESSION_ID=session_abc123
export DISPLAY=:1
export MASTER_CONTROLLER_URL=http://192.168.100.1:4000
node /opt/vm-browser-agent/webrtc-server.js
```

**GStreamer Pipeline**:
```bash
gst-launch-1.0 \
  ximagesrc display-name=:1 use-damage=0 \
  ! video/x-raw,framerate=30/1 \
  ! videoscale ! video/x-raw,width=1280,height=720 \
  ! vp8enc target-bitrate=2000000 deadline=1 \
  ! rtpvp8pay \
  ! webrtcbin
```

---

### 5. Frontend WebRTC Client

**Location**: `src/components/WebRTCViewer.tsx`

**Purpose**: React component for WebRTC video streaming

**Features**:
- RTCPeerConnection setup
- SDP offer creation
- ICE candidate handling
- Automatic reconnection
- Fallback to noVNC on failure
- Latency monitoring
- Connection status indicators

**Usage**:
```tsx
import { WebRTCViewer } from '@/components/WebRTCViewer';

<WebRTCViewer
  sessionId={authSession.sessionId}
  onConnectionStateChange={(state) => console.log('State:', state)}
  onError={(error) => console.error('Error:', error)}
  fallbackToNoVNC={true}
/>
```

---

## Integration

### Update master-controller/src/index.js

Add WebRTC routes:

```javascript
const webrtcRoutes = require('./routes/webrtc');

// Mount WebRTC routes
app.use('/api/webrtc', webrtcRoutes);

console.log('✓ WebRTC signaling routes mounted');
```

### Update Browser VM startup

Modify VM Agent to start WebRTC server instead of/alongside VNC:

```javascript
// In vm-browser-agent startup
const webrtcServer = spawn('node', ['/opt/vm-browser-agent/webrtc-server.js'], {
  env: {
    ...process.env,
    SESSION_ID: sessionId,
    DISPLAY: ':1',
    MASTER_CONTROLLER_URL: 'http://192.168.100.1:4000'
  }
});
```

---

## Testing

### 1. Test STUN/TURN Server

```bash
# From local machine
npm install -g stun

# Test STUN
stun stun://135.181.138.102:3478

# Test TURN (requires credentials)
turnutils_uclient -v -u polydev -w PolydevWebRTC2025! 135.181.138.102
```

### 2. Test Signaling API

```bash
# Get ICE servers
curl http://135.181.138.102:4000/api/webrtc/ice-servers

# Submit offer
curl -X POST http://135.181.138.102:4000/api/webrtc/session/test123/offer \
  -H "Content-Type: application/json" \
  -d '{"offer":{"type":"offer","sdp":"..."},"candidates":[]}'

# Get answer
curl http://135.181.138.102:4000/api/webrtc/session/test123/answer
```

### 3. Test End-to-End

```bash
# 1. Start Browser VM with WebRTC support
# 2. Open frontend with WebRTC component
# 3. Check browser console for WebRTC connection logs
# 4. Verify video stream appears
# 5. Check latency indicator (<50ms target)
```

---

## Performance Tuning

### coturn Optimization

For production, adjust `/etc/turnserver.conf`:

```conf
# Increase max users
total-quota=200

# Increase bandwidth per user
max-bps=5000000  # 5 Mbps

# Add more relay threads
relay-threads=8
```

### WebRTC Configuration

Optimize video quality vs latency:

```javascript
// Low latency (gaming, fast interactions)
{
  codec: 'VP8',
  bitrate: 1000000,  // 1 Mbps
  framerate: 60,
  latency: 'ultra-low'
}

// Balanced (default)
{
  codec: 'VP8',
  bitrate: 2000000,  // 2 Mbps
  framerate: 30,
  latency: 'low'
}

// High quality (presentations)
{
  codec: 'VP9',
  bitrate: 4000000,  // 4 Mbps
  framerate: 30,
  latency: 'normal'
}
```

---

## Troubleshooting

### coturn not starting

```bash
# Check logs
journalctl -u coturn -n 50 --no-pager

# Common issues:
# - Port already in use
# - Invalid configuration syntax
# - Permission issues

# Test config
turnserver -c /etc/turnserver.conf --check-config
```

### WebRTC connection fails

**Check ICE gathering**:
- Browser console should show ICE candidates
- Both STUN and TURN candidates should appear
- Verify TURN credentials are correct

**Check firewall**:
```bash
# Ensure ports are open
netstat -tulnp | grep 3478
netstat -tulnp | grep 5349

# Check UFW if enabled
ufw status
```

### No video stream

**Verify GStreamer in VM**:
```bash
# Check if GStreamer is installed
gst-launch-1.0 --version

# Test screen capture
gst-launch-1.0 ximagesrc display-name=:1 ! fakesink
```

---

## Migration from noVNC

### Gradual Rollout

1. **Phase 1**: Deploy WebRTC alongside noVNC (both available)
2. **Phase 2**: Test with subset of users (10-20%)
3. **Phase 3**: Monitor latency metrics
4. **Phase 4**: Gradual increase to 100%
5. **Phase 5**: Deprecate noVNC

### Feature Flag

```javascript
// In frontend
const useWebRTC = process.env.NEXT_PUBLIC_ENABLE_WEBRTC === 'true';

{useWebRTC ? (
  <WebRTCViewer sessionId={sessionId} fallbackToNoVNC={true} />
) : (
  <NoVNCViewer sessionId={sessionId} />
)}
```

---

## Next Steps

1. ⏳ Integrate WebRTC routes into master-controller
2. ⏳ Deploy WebRTC server script to Browser VMs
3. ⏳ Test end-to-end connection
4. ⏳ Measure latency improvement
5. ⏳ Roll out to production

---

## References

- [WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [coturn Documentation](https://github.com/coturn/coturn/wiki)
- [GStreamer WebRTC](https://gstreamer.freedesktop.org/documentation/webrtc/index.html)
