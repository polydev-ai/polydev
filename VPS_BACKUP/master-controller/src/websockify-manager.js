/**
 * WebSockify Manager
 *
 * Manages websockify process for noVNC access to Firecracker VMs
 */

const { spawn } = require('child_process');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const logger = require('../utils/logger');

class WebSockifyManager {
  constructor() {
    this.process = null;
    this.currentTarget = null;
  }

  /**
   * Start websockify proxy
   * @param {string} vmIP - VM IP address to proxy to (e.g., "192.168.100.3")
   * @param {number} vncPort - VNC port on VM (default: 5901)
   * @param {number} listenPort - Port for websockify to listen on (default: 6080)
   */
  async start(vmIP = null, vncPort = 5901, listenPort = 6080) {
    try {
      // If no VM IP specified, find a working one
      if (!vmIP) {
        vmIP = await this.findWorkingVM();
        if (!vmIP) {
          throw new Error('No working VM found with VNC port accessible');
        }
      }

      const target = `${vmIP}:${vncPort}`;

      // If already running with same target, don't restart
      if (this.process && this.currentTarget === target) {
        logger.info('[WEBSOCKIFY] Already running with target', { target });
        return;
      }

      // Stop existing process
      await this.stop();

      logger.info('[WEBSOCKIFY] Starting websockify', {
        listenPort,
        target,
        webRoot: '/usr/share/novnc'
      });

      // Start websockify
      this.process = spawn('websockify', [
        '--web=/usr/share/novnc',
        `0.0.0.0:${listenPort}`,
        target
      ], {
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      this.currentTarget = target;

      // Handle process output
      this.process.stdout.on('data', (data) => {
        logger.debug('[WEBSOCKIFY]', { output: data.toString().trim() });
      });

      this.process.stderr.on('data', (data) => {
        const msg = data.toString().trim();
        if (msg.includes('ERROR') || msg.includes('error')) {
          logger.error('[WEBSOCKIFY]', { error: msg });
        } else {
          logger.debug('[WEBSOCKIFY]', { output: msg });
        }
      });

      this.process.on('exit', (code, signal) => {
        logger.warn('[WEBSOCKIFY] Process exited', { code, signal, target: this.currentTarget });
        this.process = null;
        this.currentTarget = null;

        // Auto-restart after 5 seconds
        setTimeout(() => {
          logger.info('[WEBSOCKIFY] Auto-restarting after exit');
          this.start(null, vncPort, listenPort).catch(err => {
            logger.error('[WEBSOCKIFY] Failed to auto-restart', { error: err.message });
          });
        }, 5000);
      });

      this.process.on('error', (err) => {
        logger.error('[WEBSOCKIFY] Process error', { error: err.message });
        this.process = null;
        this.currentTarget = null;
      });

      // Wait a moment for it to start
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify it's listening
      const listening = await this.isListening(listenPort);
      if (listening) {
        logger.info('[WEBSOCKIFY] Started successfully', {
          listenPort,
          target,
          url: `http://0.0.0.0:${listenPort}/vnc.html`
        });
      } else {
        throw new Error('websockify started but not listening on port');
      }

    } catch (error) {
      logger.error('[WEBSOCKIFY] Failed to start', { error: error.message });
      throw error;
    }
  }

  /**
   * Stop websockify
   */
  async stop() {
    if (this.process) {
      logger.info('[WEBSOCKIFY] Stopping websockify', { target: this.currentTarget });

      try {
        this.process.kill('SIGTERM');

        // Wait for graceful shutdown
        await new Promise((resolve) => {
          const timeout = setTimeout(resolve, 3000);
          this.process.once('exit', () => {
            clearTimeout(timeout);
            resolve();
          });
        });

        // Force kill if still alive
        if (this.process && !this.process.killed) {
          this.process.kill('SIGKILL');
        }
      } catch (err) {
        logger.warn('[WEBSOCKIFY] Error stopping process', { error: err.message });
      }

      this.process = null;
      this.currentTarget = null;
    }

    // Also kill any orphaned websockify processes
    try {
      await execAsync('pkill -9 -f "websockify.*6080"');
      logger.debug('[WEBSOCKIFY] Killed any orphaned processes');
    } catch (err) {
      // Ignore if no processes found
    }
  }

  /**
   * Find a working VM with VNC port accessible
   * @returns {string|null} VM IP address or null
   */
  async findWorkingVM() {
    logger.info('[WEBSOCKIFY] Searching for working VM with VNC port');

    for (let i = 2; i <= 10; i++) {
      const vmIP = `192.168.100.${i}`;

      try {
        // Test if VNC port is accessible
        const { stdout } = await execAsync(`nc -zv -w 1 ${vmIP} 5901 2>&1`);
        if (stdout.includes('succeeded') || stdout.includes('open')) {
          logger.info('[WEBSOCKIFY] Found working VM', { vmIP });
          return vmIP;
        }
      } catch (err) {
        // Port not accessible, try next
        continue;
      }
    }

    logger.warn('[WEBSOCKIFY] No working VM found');
    return null;
  }

  /**
   * Check if websockify is listening on port
   * @param {number} port
   * @returns {boolean}
   */
  async isListening(port) {
    try {
      const { stdout } = await execAsync(`netstat -tlnp | grep ${port}`);
      return stdout.includes(`${port}`);
    } catch (err) {
      return false;
    }
  }

  /**
   * Get status
   * @returns {object}
   */
  getStatus() {
    return {
      running: !!this.process,
      target: this.currentTarget,
      pid: this.process?.pid || null
    };
  }
}

module.exports = new WebSockifyManager();
