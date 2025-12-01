/**
 * VNC WebSocket Proxy
 *
 * Built-in WebSocket-to-TCP proxy for VNC connections
 * Eliminates need for Python websockify - pure Node.js solution
 *
 * Handles dynamic routing: ws://host/vnc/VM_IP → VM_IP:5901
 */

const net = require('net');
const logger = require('../utils/logger').module('vnc-proxy');

class VNCWebSocketProxy {
  constructor(wss) {
    this.wss = wss;
    this.connections = new Map(); // track active connections
  }

  /**
   * Handle WebSocket upgrade for VNC connections
   * URL format: ws://host/vnc/192.168.100.X
   */
  handleUpgrade(request, socket, head, vmIP) {
    logger.info('[VNC-PROXY] WebSocket upgrade request', {
      url: request.url,
      vmIP,
      remoteAddress: request.socket.remoteAddress
    });

    // Validate VM IP format
    if (!this.isValidVMIP(vmIP)) {
      logger.error('[VNC-PROXY] Invalid VM IP', { vmIP });
      socket.destroy();
      return;
    }

    // Complete WebSocket handshake
    this.wss.handleUpgrade(request, socket, head, (ws) => {
      logger.info('[VNC-PROXY] WebSocket connection established', { vmIP });

      const connectionId = `${vmIP}-${Date.now()}`;

      // PRODUCTION-GRADE: Retry logic for VNC connection
      this.connectToVNCWithRetry(ws, vmIP, connectionId, 0);
    });
  }

  /**
   * Connect to VNC server with automatic retry on failure
   * Retries up to 10 times with 2s delays for EHOSTUNREACH/ETIMEDOUT/ECONNREFUSED
   */
  async connectToVNCWithRetry(ws, vmIP, connectionId, attempt) {
    const MAX_RETRIES = 10;
    const RETRY_DELAY_MS = 2000;

    // Create TCP connection to VNC server
    const vncSocket = net.createConnection({
      host: vmIP,
      port: 5901,
      timeout: 5000  // 5s connection timeout
    });

    this.connections.set(connectionId, { ws, vncSocket });

    // Handle VNC connection established
    vncSocket.on('connect', () => {
      logger.info('[VNC-PROXY] Connected to VNC server', { vmIP, connectionId, attempt });
    });

    // Pipe VNC data to WebSocket
    vncSocket.on('data', (data) => {
      if (ws.readyState === 1) { // WebSocket.OPEN
        ws.send(data);
      }
    });

    // Pipe WebSocket data to VNC
    ws.on('message', (data) => {
      vncSocket.write(data);
    });

    // PRODUCTION-GRADE: Handle VNC errors with retry logic
    vncSocket.on('error', (err) => {
      const isRetryable = err.code === 'EHOSTUNREACH' ||
                          err.code === 'ETIMEDOUT' ||
                          err.code === 'ECONNREFUSED' ||
                          err.code === 'ENETUNREACH';

      if (isRetryable && attempt < MAX_RETRIES) {
        logger.warn('[VNC-PROXY] VNC connection failed, will retry', {
          vmIP,
          connectionId,
          attempt: attempt + 1,
          maxRetries: MAX_RETRIES,
          error: err.message,
          code: err.code
        });

        // Clean up failed socket
        vncSocket.destroy();
        this.connections.delete(connectionId);

        // Retry after delay
        setTimeout(() => {
          if (ws.readyState === 1) { // WebSocket still open
            this.connectToVNCWithRetry(ws, vmIP, connectionId, attempt + 1);
          }
        }, RETRY_DELAY_MS);
      } else {
        // Max retries exhausted or non-retryable error
        logger.error('[VNC-PROXY] VNC connection failed permanently', {
          vmIP,
          connectionId,
          attempt,
          error: err.message,
          code: err.code
        });
        ws.close(1011, `VNC connection error: ${err.message}`);
      }
    });

    // Handle VNC close
    vncSocket.on('close', () => {
      logger.info('[VNC-PROXY] VNC connection closed', { vmIP, connectionId });
      ws.close();
      this.connections.delete(connectionId);
    });

    // Handle WebSocket close
    ws.on('close', () => {
      logger.info('[VNC-PROXY] WebSocket closed', { vmIP, connectionId });
      vncSocket.destroy();
      this.connections.delete(connectionId);
    });

    // Handle WebSocket errors
    ws.on('error', (err) => {
      logger.error('[VNC-PROXY] WebSocket error', {
        vmIP,
        connectionId,
        error: err.message
      });
      vncSocket.destroy();
    });
  }

  /**
   * Validate VM IP is in allowed range
   */
  isValidVMIP(ip) {
    if (!ip) return false;

    // Must be 192.168.100.X where X is 2-254
    const match = ip.match(/^192\.168\.100\.(\d+)$/);
    if (!match) return false;

    const lastOctet = parseInt(match[1]);
    return lastOctet >= 2 && lastOctet <= 254;
  }

  /**
   * Get active connection count
   */
  getStats() {
    return {
      activeConnections: this.connections.size,
      connections: Array.from(this.connections.keys())
    };
  }
}

module.exports = VNCWebSocketProxy;
