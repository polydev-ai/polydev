/**
 * GStreamer WebRTC Controller for Node.js
 *
 * This module spawns the Python GStreamer helper process and provides
 * a clean event-driven API for WebRTC signaling.
 *
 * Usage:
 *   const controller = new GStreamerWebRTCController();
 *
 *   controller.on('ready', () => {
 *     // Helper is ready to receive remote offer
 *   });
 *
 *   controller.on('local-description', (sdp) => {
 *     // Send SDP answer to master controller
 *   });
 *
 *   controller.on('ice-candidate', (candidate) => {
 *     // Send ICE candidate to master controller
 *   });
 *
 *   controller.setRemoteDescription(offerSDP);
 *   controller.addIceCandidate(candidate, sdpMLineIndex);
 */

const { spawn } = require('child_process');
const EventEmitter = require('events');
const path = require('path');

class GStreamerWebRTCController extends EventEmitter {
  constructor(options = {}) {
    super();

    this.options = {
      pythonPath: options.pythonPath || '/usr/bin/python3',
      helperScript: options.helperScript || path.join(__dirname, 'gstreamer-webrtc-helper.py'),
      display: options.display || ':0',
      ...options
    };

    this.process = null;
    this.lineBuffer = '';
  }

  /**
   * Start the GStreamer helper process
   */
  async start() {
    return new Promise((resolve, reject) => {
      try {
        console.log('[WebRTC Controller] Starting GStreamer helper process');
        console.log('[WebRTC Controller] Python:', this.options.pythonPath);
        console.log('[WebRTC Controller] Helper script:', this.options.helperScript);

        // Set environment variables for the child process
        const env = {
          ...process.env,
          DISPLAY: this.options.display,
          PYTHONUNBUFFERED: '1',  // Disable Python output buffering
        };

        // Spawn Python helper
        this.process = spawn(this.options.pythonPath, [this.options.helperScript], {
          env,
          stdio: ['pipe', 'pipe', 'pipe']  // stdin, stdout, stderr
        });

        // Handle stdout (JSON messages from Python)
        this.process.stdout.on('data', (data) => {
          this.handleStdout(data);
        });

        // Handle stderr (Python errors and logs)
        this.process.stderr.on('data', (data) => {
          console.error('[WebRTC Helper Error]', data.toString());
        });

        // Handle process exit
        this.process.on('exit', (code, signal) => {
          console.log(`[WebRTC Controller] Helper process exited (code: ${code}, signal: ${signal})`);
          this.emit('exit', { code, signal });
        });

        // Handle process errors
        this.process.on('error', (error) => {
          console.error('[WebRTC Controller] Failed to start helper process:', error);
          reject(error);
        });

        // Wait for READY_FOR_OFFER message before resolving
        this.once('ready', () => {
          console.log('[WebRTC Controller] Helper process ready');
          resolve();
        });

        // Timeout after 10 seconds
        setTimeout(() => {
          if (this.process && !this.process.killed) {
            reject(new Error('Timeout waiting for GStreamer helper to become ready'));
          }
        }, 10000);

      } catch (error) {
        console.error('[WebRTC Controller] Error starting helper:', error);
        reject(error);
      }
    });
  }

  /**
   * Handle stdout data from Python process
   */
  handleStdout(data) {
    // Append to line buffer
    this.lineBuffer += data.toString();

    // Process complete lines
    let newlineIndex;
    while ((newlineIndex = this.lineBuffer.indexOf('\n')) !== -1) {
      const line = this.lineBuffer.substring(0, newlineIndex).trim();
      this.lineBuffer = this.lineBuffer.substring(newlineIndex + 1);

      if (line.length > 0) {
        this.handleMessage(line);
      }
    }
  }

  /**
   * Handle a single JSON message from Python
   */
  handleMessage(line) {
    try {
      const msg = JSON.parse(line);
      const msgType = msg.type;

      switch (msgType) {
        case 'LOG':
          // Forward log messages
          console.log(`[WebRTC Helper ${msg.level}]`, msg.message);
          break;

        case 'READY_FOR_OFFER':
          // Helper is ready to receive remote offer
          this.emit('ready');
          break;

        case 'LOCAL_SDP':
          // Local SDP answer generated
          console.log('[WebRTC Controller] Received local SDP answer');
          this.emit('local-description', msg.sdp);
          break;

        case 'ICE_CANDIDATE':
          // Local ICE candidate generated
          console.log('[WebRTC Controller] Received local ICE candidate:', msg.candidate);
          this.emit('ice-candidate', {
            candidate: msg.candidate,
            sdpMLineIndex: msg.sdpMLineIndex
          });
          break;

        default:
          console.warn('[WebRTC Controller] Unknown message type:', msgType, msg);
      }
    } catch (error) {
      console.error('[WebRTC Controller] Failed to parse message:', line, error);
    }
  }

  /**
   * Send remote SDP offer to GStreamer
   */
  setRemoteDescription(sdp) {
    console.log('[WebRTC Controller] Sending remote SDP offer to helper');
    this.sendMessage({
      type: 'REMOTE_SDP',
      sdp: sdp
    });
  }

  /**
   * Send remote ICE candidate to GStreamer
   */
  addIceCandidate(candidate, sdpMLineIndex = 0) {
    console.log('[WebRTC Controller] Sending remote ICE candidate to helper');
    this.sendMessage({
      type: 'REMOTE_CANDIDATE',
      candidate: candidate,
      sdpMLineIndex: sdpMLineIndex
    });
  }

  /**
   * Send JSON message to Python process via stdin
   */
  sendMessage(msg) {
    if (!this.process || this.process.killed) {
      console.error('[WebRTC Controller] Cannot send message: process not running');
      return;
    }

    try {
      const json = JSON.stringify(msg) + '\n';
      this.process.stdin.write(json);
    } catch (error) {
      console.error('[WebRTC Controller] Failed to send message:', error);
    }
  }

  /**
   * Stop the GStreamer helper process
   */
  async stop() {
    return new Promise((resolve) => {
      if (!this.process || this.process.killed) {
        resolve();
        return;
      }

      console.log('[WebRTC Controller] Stopping helper process');

      // Send stop message
      this.sendMessage({ type: 'STOP' });

      // Wait for graceful exit
      const timeout = setTimeout(() => {
        console.log('[WebRTC Controller] Killing helper process (timeout)');
        this.process.kill('SIGKILL');
      }, 5000);

      this.process.once('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }
}

module.exports = GStreamerWebRTCController;
