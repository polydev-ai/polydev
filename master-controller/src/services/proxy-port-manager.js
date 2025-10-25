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
}

module.exports = new ProxyPortManager();
