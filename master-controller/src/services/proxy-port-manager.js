const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const { HttpsProxyAgent } = require('https-proxy-agent');

/**
 * Decodo Proxy Port Manager
 *
 * Assigns each user a dedicated proxy port for consistent IP addressing.
 * - Port range: 10001-19999
 * - Each port provides a stable external IP via Decodo proxy
 * - Used for both Browser VMs and CLI VMs
 */
class ProxyPortManager {
  constructor() {
    // Lazy-load Supabase client to avoid initialization issues
    this._supabase = null;

    this.DECODO_USERNAME = 'sp9dso1iga';
    this.DECODO_PASSWORD = 'GjHd8bKd3hizw05qZ=';
    this.DECODO_HOST = 'dc.decodo.com';
    this.PORT_MIN = 10001;
    this.PORT_MAX = 19999;
  }

  /**
   * Lazy-load Supabase client when first needed
   * This ensures environment variables are loaded before client creation
   */
  get supabase() {
    if (!this._supabase) {
      this._supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      );
    }
    return this._supabase;
  }

  /**
   * Get or assign a proxy port for a user
   * @param {string} userId - User UUID
   * @returns {Promise<{port: number, ip: string, username: string, password: string, host: string}>}
   */
  async getOrAssignPort(userId) {
    try {
      // Check if user already has a port assigned
      const { data: existing, error: fetchError } = await this.supabase
        .from('user_proxy_ports')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (existing && !fetchError) {
        console.log('[Proxy Port Manager] User already has port assigned:', {
          userId,
          port: existing.proxy_port,
          ip: existing.proxy_ip
        });

        return {
          port: existing.proxy_port,
          ip: existing.proxy_ip,
          username: this.DECODO_USERNAME,
          password: this.DECODO_PASSWORD,
          host: this.DECODO_HOST
        };
      }

      // Assign new port
      const newPort = await this._assignNewPort(userId);

      // Verify the port and get its IP
      const ip = await this._verifyPort(newPort);

      // Update database with verified IP
      await this.supabase
        .from('user_proxy_ports')
        .update({
          proxy_ip: ip,
          last_verified_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      console.log('[Proxy Port Manager] New port assigned:', {
        userId,
        port: newPort,
        ip
      });

      return {
        port: newPort,
        ip,
        username: this.DECODO_USERNAME,
        password: this.DECODO_PASSWORD,
        host: this.DECODO_HOST
      };
    } catch (error) {
      console.error('[Proxy Port Manager] Error getting/assigning port:', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Assign a new port to a user
   * @private
   */
  async _assignNewPort(userId) {
    // Get the highest assigned port
    const { data: maxPort, error } = await this.supabase
      .from('user_proxy_ports')
      .select('proxy_port')
      .order('proxy_port', { ascending: false })
      .limit(1)
      .single();

    const nextPort = (maxPort && !error) ? maxPort.proxy_port + 1 : this.PORT_MIN;

    if (nextPort > this.PORT_MAX) {
      throw new Error('No available proxy ports (range exhausted)');
    }

    // Insert new assignment
    const { error: insertError } = await this.supabase
      .from('user_proxy_ports')
      .insert({
        user_id: userId,
        proxy_port: nextPort
      });

    if (insertError) {
      // Handle race condition - another request might have assigned the same port
      if (insertError.code === '23505') { // Unique constraint violation
        // Retry with next port
        return this._assignNewPort(userId);
      }
      throw insertError;
    }

    return nextPort;
  }

  /**
   * Verify a proxy port and get its external IP
   * @private
   */
  async _verifyPort(port) {
    return new Promise((resolve, reject) => {
      // Create proxy URL with authentication
      const proxyUrl = `http://${this.DECODO_USERNAME}:${encodeURIComponent(this.DECODO_PASSWORD)}@${this.DECODO_HOST}:${port}`;
      const agent = new HttpsProxyAgent(proxyUrl);

      const req = https.request({
        hostname: 'ip.decodo.com',
        path: '/json',
        method: 'GET',
        agent: agent,
        timeout: 10000
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json.proxy?.ip || 'unknown');
          } catch (error) {
            reject(new Error('Failed to parse IP response'));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Proxy verification timeout'));
      });

      req.end();
    });
  }

  /**
   * Get proxy environment variables for a user's VMs
   * @param {string} userId - User UUID
   * @returns {Promise<{HTTP_PROXY: string, HTTPS_PROXY: string, http_proxy: string, https_proxy: string}>}
   */
  async getProxyEnvVars(userId) {
    const config = await this.getOrAssignPort(userId);
    const proxyUrl = `http://${config.username}:${encodeURIComponent(config.password)}@${config.host}:${config.port}`;

    return {
      HTTP_PROXY: proxyUrl,
      HTTPS_PROXY: proxyUrl,
      http_proxy: proxyUrl,
      https_proxy: proxyUrl,
      NO_PROXY: 'localhost,127.0.0.1,192.168.0.0/16',
      no_proxy: 'localhost,127.0.0.1,192.168.0.0/16'
    };
  }

  /**
   * Get user's proxy configuration for display
   * @param {string} userId - User UUID
   * @returns {Promise<{port: number, ip: string, curlExample: string}>}
   */
  async getUserProxyInfo(userId) {
    const config = await this.getOrAssignPort(userId);

    return {
      port: config.port,
      ip: config.ip,
      host: config.host,
      curlExample: `curl -U "${config.username}:${config.password}" -x "${config.host}:${config.port}" "https://ip.decodo.com/json"`
    };
  }

  /**
   * Health check for a specific proxy port
   * @param {number} port - Proxy port to check
   * @returns {Promise<{healthy: boolean, ip: string, latency: number}>}
   */
  async healthCheckPort(port) {
    const startTime = Date.now();

    try {
      const ip = await this._verifyPort(port);
      const latency = Date.now() - startTime;

      console.log('[Proxy Health] Port check passed:', {
        port,
        ip,
        latency: `${latency}ms`
      });

      return {
        healthy: true,
        ip,
        latency
      };
    } catch (error) {
      const latency = Date.now() - startTime;

      console.error('[Proxy Health] Port check failed:', {
        port,
        error: error.message,
        latency: `${latency}ms`
      });

      return {
        healthy: false,
        ip: null,
        latency,
        error: error.message
      };
    }
  }

  /**
   * Health check all assigned ports
   * @returns {Promise<{total: number, healthy: number, unhealthy: number, results: Array}>}
   */
  async healthCheckAll() {
    try {
      // Get all assigned ports from database
      const { data: assignments, error } = await this.supabase
        .from('user_proxy_ports')
        .select('user_id, proxy_port, proxy_ip');

      if (error) throw error;

      console.log(`[Proxy Health] Checking ${assignments.length} assigned ports...`);

      const results = [];
      let healthy = 0;
      let unhealthy = 0;

      // Check each port (limit concurrency to avoid overwhelming Decodo)
      for (const assignment of assignments) {
        const result = await this.healthCheckPort(assignment.proxy_port);

        results.push({
          userId: assignment.user_id,
          port: assignment.proxy_port,
          expectedIP: assignment.proxy_ip,
          actualIP: result.ip,
          healthy: result.healthy,
          latency: result.latency
        });

        if (result.healthy) {
          healthy++;

          // Update last_verified_at in database
          await this.supabase
            .from('user_proxy_ports')
            .update({ last_verified_at: new Date().toISOString() })
            .eq('proxy_port', assignment.proxy_port);
        } else {
          unhealthy++;
        }

        // Rate limit (avoid overwhelming Decodo)
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log(`[Proxy Health] Check complete:`, {
        total: assignments.length,
        healthy,
        unhealthy
      });

      return {
        total: assignments.length,
        healthy,
        unhealthy,
        results
      };
    } catch (error) {
      console.error('[Proxy Health] Health check failed:', error.message);
      throw error;
    }
  }

  /**
   * Start periodic health monitoring
   * @param {number} intervalMs - Check interval in milliseconds (default: 5 minutes)
   */
  startHealthMonitoring(intervalMs = 300000) {
    console.log('[Proxy Health] Starting health monitoring', {
      interval: `${intervalMs / 1000}s`
    });

    // Run initial check after 30 seconds
    setTimeout(() => {
      this.healthCheckAll().catch(error => {
        console.error('[Proxy Health] Initial check failed:', error.message);
      });
    }, 30000);

    // Then run periodically
    this.healthMonitorInterval = setInterval(() => {
      this.healthCheckAll().catch(error => {
        console.error('[Proxy Health] Periodic check failed:', error.message);
      });
    }, intervalMs);
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring() {
    if (this.healthMonitorInterval) {
      clearInterval(this.healthMonitorInterval);
      this.healthMonitorInterval = null;
      console.log('[Proxy Health] Health monitoring stopped');
    }
  }
}

module.exports = new ProxyPortManager();
