/**
 * VM-Side WebRTC Server (Real WebRTC Implementation)
 *
 * Runs inside Browser VM to stream desktop via WebRTC using GStreamer webrtcbin
 * Provides full ICE/DTLS/SRTP stack for real peer-to-peer WebRTC connection
 *
 * Requirements:
 * - GStreamer 1.0 with webrtcbin plugin
 * - Python 3 with PyGObject (GI bindings)
 * - gstreamer-webrtc-helper.py (Python helper)
 * - gstreamer-webrtc-controller.js (Node.js controller)
 *
 * Target: <50ms latency with real WebRTC
 */

const http = require('http');
const GStreamerWebRTCController = require('./gstreamer-webrtc-controller');

console.error('[DEBUG] webrtc-server.js START - PID:', process.pid);
console.error('[DEBUG] Process arguments:', process.argv);
console.error('[DEBUG] Node version:', process.version);
console.error('[DEBUG] Platform:', process.platform);

const MASTER_CONTROLLER_URL = process.env.MASTER_CONTROLLER_URL || 'http://192.168.100.1:4000';
const SESSION_ID = process.env.SESSION_ID;
const DISPLAY = process.env.DISPLAY || ':1';

console.error('[DEBUG] Environment Variables:');
console.error('[DEBUG]   SESSION_ID:', SESSION_ID);
console.error('[DEBUG]   MASTER_CONTROLLER_URL:', MASTER_CONTROLLER_URL);
console.error('[DEBUG]   DISPLAY:', DISPLAY);
console.error('[DEBUG]   PATH:', process.env.PATH);
console.error('[DEBUG] End environment check');

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
    this.gstreamerController = null;
    this.signaling = {
      offer: null,
      answer: null,
      localCandidates: [],
      remoteCandidates: []
    };
    this.iceCandidatePollInterval = null;

    console.log('[WebRTC] VM WebRTC Server initializing...');
    console.log('[WebRTC] Session ID:', SESSION_ID);
    console.log('[WebRTC] Display:', DISPLAY);
    console.log('[WebRTC] Master Controller:', MASTER_CONTROLLER_URL);
  }

  /**
   * Start WebRTC server with real GStreamer webrtcbin
   */
  async start() {
    try {
      console.log('[WebRTC] Starting WebRTC server with GStreamer webrtcbin...');

      // Fetch ICE servers configuration
      await this.fetchICEServers();

      // Initialize GStreamer WebRTC controller
      console.log('[WebRTC] Initializing GStreamer WebRTC controller...');
      this.gstreamerController = new GStreamerWebRTCController({
        display: DISPLAY,
        pythonPath: '/usr/bin/python3',
        helperScript: require('path').join(__dirname, 'gstreamer-webrtc-helper.py')
      });

      // Wire up GStreamer controller events
      this.setupGStreamerEvents();

      // Start GStreamer helper process
      console.log('[WebRTC] Starting GStreamer helper process...');
      await this.gstreamerController.start();
      console.log('[WebRTC] GStreamer helper started successfully');

      // Wait for client's SDP offer (10min timeout)
      console.log('[WebRTC] Waiting for client offer...');
      const offerData = await this.waitForOffer(600000);
      console.log('[WebRTC] Received client offer');

      // Send offer to GStreamer controller
      console.log('[WebRTC] Sending offer to GStreamer webrtcbin...');
      this.gstreamerController.setRemoteDescription(offerData.offer.sdp);

      // Start polling for remote ICE candidates from browser
      console.log('[WebRTC] Starting ICE candidate polling...');
      this.startICECandidatePolling();

      // GStreamer will automatically generate answer and ICE candidates
      // which will be sent to master controller via event handlers

      console.log('[WebRTC] WebRTC server running successfully with real WebRTC stack');

      // Keep alive
      setInterval(() => {
        console.log('[WebRTC] Server alive, streaming desktop via WebRTC...');
      }, 30000);

    } catch (error) {
      console.error('[WebRTC] Failed to start:', error.message);
      console.error('[WebRTC] Stack:', error.stack);
      process.exit(1);
    }
  }

  /**
   * Setup event handlers for GStreamer controller
   */
  setupGStreamerEvents() {
    // Handler for when GStreamer is ready
    this.gstreamerController.on('ready', () => {
      console.log('[WebRTC] GStreamer helper is ready for offer');
    });

    // Handler for SDP answer from GStreamer
    this.gstreamerController.on('local-description', async (sdp) => {
      console.log('[WebRTC] Received local SDP answer from GStreamer');

      const answerData = {
        answer: {
          type: 'answer',
          sdp: sdp
        },
        candidates: []  // ICE candidates will be sent separately
      };

      try {
        await this.sendAnswer(answerData);
        console.log('[WebRTC] Answer sent successfully to master controller');
      } catch (error) {
        console.error('[WebRTC] Failed to send answer:', error.message);
      }
    });

    // Handler for ICE candidates from GStreamer
    this.gstreamerController.on('ice-candidate', async (candidateData) => {
      console.log('[WebRTC] Received local ICE candidate from GStreamer:', candidateData.candidate);

      this.signaling.localCandidates.push(candidateData);

      try {
        await this.sendICECandidate(candidateData);
        console.log('[WebRTC] ICE candidate sent successfully to master controller');
      } catch (error) {
        console.error('[WebRTC] Failed to send ICE candidate:', error.message);
      }
    });

    // Handler for GStreamer process exit
    this.gstreamerController.on('exit', ({ code, signal }) => {
      console.error('[WebRTC] GStreamer helper process exited unexpectedly');
      console.error('[WebRTC] Exit code:', code, 'Signal:', signal);
      process.exit(1);
    });
  }

  /**
   * Start polling for remote ICE candidates from browser
   */
  startICECandidatePolling() {
    this.iceCandidatePollInterval = setInterval(async () => {
      try {
        const candidates = await this.pollRemoteICECandidates();

        if (candidates && candidates.length > 0) {
          console.log('[WebRTC] Received', candidates.length, 'remote ICE candidates from browser');

          for (const candidateData of candidates) {
            // Add each candidate to GStreamer webrtcbin
            this.gstreamerController.addIceCandidate(
              candidateData.candidate,
              candidateData.sdpMLineIndex || 0
            );

            this.signaling.remoteCandidates.push(candidateData);
          }
        }
      } catch (error) {
        // Don't log 404 errors (expected when no candidates yet)
        if (error.statusCode !== 404) {
          console.error('[WebRTC] Error polling remote ICE candidates:', error.message);
        }
      }
    }, 1000);  // Poll every 1 second
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
   * Send SDP answer to master-controller
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
   * Send ICE candidate to master-controller
   */
  async sendICECandidate(candidateData) {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify({
        candidate: candidateData.candidate,
        sdpMLineIndex: candidateData.sdpMLineIndex || 0,
        from: 'vm'  // Identify this candidate is from VM
      });

      const options = {
        hostname: MASTER_CONTROLLER_URL.replace('http://', '').split(':')[0],
        port: 4000,
        path: `/api/webrtc/session/${SESSION_ID}/candidate`,
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
            resolve();
          } else {
            const error = new Error(`HTTP ${res.statusCode}: ${data}`);
            error.statusCode = res.statusCode;
            reject(error);
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
   * Poll for remote ICE candidates from browser
   */
  async pollRemoteICECandidates() {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: MASTER_CONTROLLER_URL.replace('http://', '').split(':')[0],
        port: 4000,
        path: `/api/webrtc/session/${SESSION_ID}/candidates/browser`,
        method: 'GET'
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 404) {
            resolve([]);  // No candidates yet
            return;
          }

          if (res.statusCode === 200) {
            try {
              const result = JSON.parse(data);
              resolve(result.candidates || []);
            } catch (error) {
              reject(error);
            }
          } else {
            const error = new Error(`HTTP ${res.statusCode}: ${data}`);
            error.statusCode = res.statusCode;
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
   * Stop WebRTC server
   */
  async stop() {
    console.log('[WebRTC] Stopping WebRTC server...');

    // Stop ICE candidate polling
    if (this.iceCandidatePollInterval) {
      clearInterval(this.iceCandidatePollInterval);
      this.iceCandidatePollInterval = null;
    }

    // Stop GStreamer controller
    if (this.gstreamerController) {
      await this.gstreamerController.stop();
      this.gstreamerController = null;
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
  process.on('SIGTERM', async () => {
    console.log('[WebRTC] Received SIGTERM, shutting down...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('[WebRTC] Received SIGINT, shutting down...');
    await server.stop();
    process.exit(0);
  });
}

module.exports = { VMWebRTCServer };
