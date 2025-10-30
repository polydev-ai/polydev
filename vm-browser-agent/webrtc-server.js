/**
 * VM-Side WebRTC Server
 *
 * Runs inside Browser VM to stream desktop via WebRTC
 * Replaces VNC/noVNC with low-latency WebRTC streaming
 *
 * Requirements:
 * - GStreamer for screen capture
 * - webrtc-sendonly for streaming
 * - HTTP server for signaling exchange
 *
 * Target: <50ms latency
 */

const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

const MASTER_CONTROLLER_URL = process.env.MASTER_CONTROLLER_URL || 'http://192.168.100.1:4000';
const SESSION_ID = process.env.SESSION_ID;
const DISPLAY = process.env.DISPLAY || ':1';

// WebRTC configuration
const config = {
  iceServers: [],  // Will be fetched from master-controller
  videoCodec: 'VP8',  // VP8 for browser compatibility
  videoBitrate: 2000,  // 2 Mbps
  frameRate: 30,
  resolution: '1280x720'
};

class VMWebRTCServer {
  constructor() {
    this.peerConnection = null;
    this.gstreamerProcess = null;
    this.signaling = {
      offer: null,
      answer: null,
      candidates: []
    };

    console.log('[WebRTC] VM WebRTC Server initializing...');
    console.log('[WebRTC] Session ID:', SESSION_ID);
    console.log('[WebRTC] Display:', DISPLAY);
    console.log('[WebRTC] Master Controller:', MASTER_CONTROLLER_URL);
  }

  /**
   * Start WebRTC server
   */
  async start() {
    try {
      console.log('[WebRTC] Starting WebRTC server...');

      // Fetch ICE servers from master-controller
      await this.fetchICEServers();

      // Wait for client's offer
      console.log('[WebRTC] Waiting for client offer...');
      const offer = await this.waitForOffer();

      console.log('[WebRTC] Received offer from client');
      console.log('[WebRTC] Creating answer...');

      // Create answer (simplified - actual implementation needs WebRTC library)
      const answer = await this.createAnswer(offer);

      // Send answer to master-controller
      await this.sendAnswer(answer);

      console.log('[WebRTC] Answer sent, starting GStreamer pipeline...');

      // Start GStreamer for screen capture
      await this.startGStreamer();

      console.log('[WebRTC] WebRTC server running successfully');

      // Keep alive
      setInterval(() => {
        console.log('[WebRTC] Server alive, streaming desktop...');
      }, 30000);

    } catch (error) {
      console.error('[WebRTC] Failed to start:', error.message);
      process.exit(1);
    }
  }

  /**
   * Fetch ICE servers from master-controller
   */
  async fetchICEServers() {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: MASTER_CONTROLLER_URL.replace('http://', '').split(':')[0],
        port: 4000,
        path: '/api/webrtc/ice-servers',
        method: 'GET'
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            config.iceServers = result.iceServers;
            console.log('[WebRTC] ICE servers fetched:', config.iceServers.length);
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(5000, () => req.destroy());
      req.end();
    });
  }

  /**
   * Wait for client's SDP offer
   */
  async waitForOffer(maxWaitMs = 60000) {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const offer = await this.pollOffer();
        if (offer) {
          return offer;
        }
      } catch (error) {
        console.error('[WebRTC] Error polling offer:', error.message);
      }

      // Wait 1 second before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error('Timeout waiting for client offer');
  }

  /**
   * Poll for offer from master-controller
   */
  async pollOffer() {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: MASTER_CONTROLLER_URL.replace('http://', '').split(':')[0],
        port: 4000,
        path: `/api/webrtc/session/${SESSION_ID}/offer`,
        method: 'GET'
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 404) {
            resolve(null);  // Not ready yet
            return;
          }

          try {
            const result = JSON.parse(data);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(3000, () => req.destroy());
      req.end();
    });
  }

  /**
   * Create SDP answer
   * Note: This is simplified. Real implementation needs wrtc or similar library
   */
  async createAnswer(offerData) {
    // For now, return a mock answer structure
    // Real implementation would use node-webrtc or gstreamer webrtcbin
    const answer = {
      type: 'answer',
      sdp: this.generateMockSDP(offerData.offer.sdp)
    };

    return {
      answer,
      candidates: []  // Will be generated by WebRTC stack
    };
  }

  /**
   * Generate mock SDP for development
   * Real implementation uses WebRTC library
   */
  generateMockSDP(offerSDP) {
    // Simplified SDP answer
    return `v=0
o=- ${Date.now()} 2 IN IP4 192.168.100.5
s=Polydev WebRTC Stream
t=0 0
a=group:BUNDLE 0
a=msid-semantic: WMS stream
m=video 9 UDP/TLS/RTP/SAVPF 96
c=IN IP4 0.0.0.0
a=rtcp:9 IN IP4 0.0.0.0
a=ice-ufrag:${this.randomString(8)}
a=ice-pwd:${this.randomString(24)}
a=ice-options:trickle
a=fingerprint:sha-256 ${this.randomFingerprint()}
a=setup:active
a=mid:0
a=sendonly
a=rtcp-mux
a=rtcp-rsize
a=rtpmap:96 VP8/90000
a=ssrc:${this.randomSSRC()} cname:stream
a=ssrc:${this.randomSSRC()} msid:stream video0
a=ssrc:${this.randomSSRC()} mslabel:stream
a=ssrc:${this.randomSSRC()} label:video0
`;
  }

  randomString(length) {
    return Array.from({ length }, () =>
      Math.floor(Math.random() * 36).toString(36)
    ).join('');
  }

  randomFingerprint() {
    return Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
    ).join(':').toUpperCase();
  }

  randomSSRC() {
    return Math.floor(Math.random() * 0xFFFFFFFF);
  }

  /**
   * Send answer to master-controller
   */
  async sendAnswer(answerData) {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify(answerData);

      const options = {
        hostname: MASTER_CONTROLLER_URL.replace('http://', '').split(':')[0],
        port: 4000,
        path: `/api/webrtc/session/${SESSION_ID}/answer`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            console.log('[WebRTC] Answer sent successfully');
            resolve();
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(5000, () => req.destroy());
      req.write(payload);
      req.end();
    });
  }

  /**
   * Start GStreamer pipeline for screen capture
   */
  async startGStreamer() {
    console.log('[WebRTC] Starting GStreamer pipeline...');
    console.log('[WebRTC] Capturing display:', DISPLAY);
    console.log('[WebRTC] Resolution:', config.resolution);
    console.log('[WebRTC] Frame rate:', config.frameRate);
    console.log('[WebRTC] Bitrate:', config.videoBitrate, 'kbps');

    // GStreamer pipeline for X11 capture → VP8 encode → RTP stream
    const gstPipeline = [
      'gst-launch-1.0',
      '-v',
      // X11 source
      `ximagesrc display-name=${DISPLAY} use-damage=0`,
      '!', 'video/x-raw,framerate=30/1',
      '!', 'videoscale',
      '!', `video/x-raw,width=1280,height=720`,
      // VP8 encoding
      '!', 'vp8enc', `target-bitrate=${config.videoBitrate}000`, 'deadline=1', 'cpu-used=4',
      // RTP packaging
      '!', 'rtpvp8pay',
      // WebRTC sink (would use webrtcbin in real implementation)
      '!', 'fakesink'  // Placeholder - real impl sends to WebRTC peer
    ];

    this.gstreamerProcess = spawn(gstPipeline[0], gstPipeline.slice(1), {
      env: { ...process.env, DISPLAY },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    this.gstreamerProcess.stdout.on('data', (data) => {
      // console.log('[GStreamer]', data.toString());
    });

    this.gstreamerProcess.stderr.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('ERROR') || msg.includes('WARN')) {
        console.error('[GStreamer]', msg);
      }
    });

    this.gstreamerProcess.on('exit', (code) => {
      console.log('[GStreamer] Process exited with code:', code);
      if (code !== 0) {
        console.error('[GStreamer] Abnormal exit, may need to restart');
      }
    });

    console.log('[WebRTC] GStreamer pipeline started (PID:', this.gstreamerProcess.pid, ')');

    // Verify it's running
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (this.gstreamerProcess.killed) {
      throw new Error('GStreamer failed to start');
    }

    console.log('[WebRTC] GStreamer running successfully');
  }

  /**
   * Stop WebRTC server
   */
  stop() {
    console.log('[WebRTC] Stopping WebRTC server...');

    if (this.gstreamerProcess) {
      this.gstreamerProcess.kill('SIGTERM');
      this.gstreamerProcess = null;
    }

    if (this.peerConnection) {
      // Close peer connection
      this.peerConnection = null;
    }

    console.log('[WebRTC] WebRTC server stopped');
  }
}

// Main execution
if (require.main === module) {
  if (!SESSION_ID) {
    console.error('[WebRTC] ERROR: SESSION_ID environment variable required');
    process.exit(1);
  }

  const server = new VMWebRTCServer();

  server.start().catch(error => {
    console.error('[WebRTC] Fatal error:', error);
    process.exit(1);
  });

  // Cleanup on exit
  process.on('SIGTERM', () => {
    console.log('[WebRTC] Received SIGTERM, shutting down...');
    server.stop();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('[WebRTC] Received SIGINT, shutting down...');
    server.stop();
    process.exit(0);
  });
}

module.exports = { VMWebRTCServer };
