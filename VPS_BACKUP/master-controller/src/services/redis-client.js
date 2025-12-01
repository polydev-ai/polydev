/**
 * Redis Client Service
 *
 * Production-grade Redis client for ephemeral session state management with TTL.
 * Replaces Supabase for temporary session storage to fix ARCH-1 (Session Lifecycle Chaos).
 *
 * Key Features:
 * - Automatic session expiration with TTL (default 10 minutes)
 * - Connection retry with exponential backoff
 * - Graceful error handling
 * - Clean shutdown support
 *
 * Session Storage Pattern:
 * - Key: `session:{sessionId}`
 * - Value: JSON-serialized session data
 * - TTL: Auto-expires after configured duration (default 600s)
 *
 * When session not in Redis → VM is dead → Frontend shows "Start New Session"
 */

const Redis = require('ioredis');
const config = require('../config');
const logger = require('../utils/logger').module('redis');

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
  }

  /**
   * Initialize Redis connection with retry logic
   */
  async connect() {
    if (this.client && this.isConnected) {
      logger.warn('[REDIS] Already connected');
      return;
    }

    logger.info('[REDIS] Connecting to Redis', {
      url: config.redis.url,
      sessionTTL: config.redis.sessionTTL
    });

    this.client = new Redis(config.redis.url, {
      maxRetriesPerRequest: config.redis.maxRetries,
      retryStrategy: (times) => {
        if (times > config.redis.maxRetries) {
          logger.error('[REDIS] Max retries exceeded', { attempts: times });
          return null; // Stop retrying
        }

        const delay = Math.min(times * config.redis.retryDelay, 30000); // Max 30s delay
        logger.warn('[REDIS] Retry connection', {
          attempt: times,
          nextRetryMs: delay
        });
        return delay;
      },

      // Reconnect on error
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          logger.warn('[REDIS] Reconnecting on READONLY error');
          return true;
        }
        return false;
      }
    });

    // Connection events
    this.client.on('connect', () => {
      logger.info('[REDIS] Connected successfully');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.client.on('ready', () => {
      logger.info('[REDIS] Ready to accept commands');
    });

    this.client.on('error', (err) => {
      logger.error('[REDIS] Connection error', {
        error: err.message,
        code: err.code
      });
      this.isConnected = false;
    });

    this.client.on('close', () => {
      logger.warn('[REDIS] Connection closed');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      this.reconnectAttempts++;
      logger.info('[REDIS] Reconnecting...', {
        attempt: this.reconnectAttempts
      });
    });

    // Wait for initial connection
    await this.client.ping();
    logger.info('[REDIS] Initial connection verified (PING successful)');
  }

  /**
   * Set session data with automatic TTL expiration
   *
   * @param {string} sessionId - Unique session identifier
   * @param {object} sessionData - Session data to store
   * @param {number} [ttl] - Optional TTL override (seconds), defaults to config.redis.sessionTTL
   */
  async setSession(sessionId, sessionData, ttl = null) {
    const expirySeconds = ttl || config.redis.sessionTTL;
    const key = `session:${sessionId}`;

    try {
      const serialized = JSON.stringify(sessionData);
      await this.client.setex(key, expirySeconds, serialized);

      logger.info('[REDIS] Session saved with TTL', {
        sessionId,
        ttl: expirySeconds,
        dataSize: serialized.length
      });

      return true;
    } catch (error) {
      logger.error('[REDIS] Failed to set session', {
        sessionId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get session data from Redis
   *
   * @param {string} sessionId - Session identifier
   * @returns {object|null} - Session data or null if not found/expired
   */
  async getSession(sessionId) {
    const key = `session:${sessionId}`;

    try {
      const data = await this.client.get(key);

      if (!data) {
        logger.debug('[REDIS] Session not found (expired or never existed)', {
          sessionId
        });
        return null;
      }

      const sessionData = JSON.parse(data);

      logger.debug('[REDIS] Session retrieved', {
        sessionId,
        dataKeys: Object.keys(sessionData)
      });

      return sessionData;
    } catch (error) {
      logger.error('[REDIS] Failed to get session', {
        sessionId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Delete session from Redis (manual cleanup)
   *
   * @param {string} sessionId - Session identifier
   */
  async deleteSession(sessionId) {
    const key = `session:${sessionId}`;

    try {
      const deleted = await this.client.del(key);

      logger.info('[REDIS] Session deleted', {
        sessionId,
        existed: deleted === 1
      });

      return deleted === 1;
    } catch (error) {
      logger.error('[REDIS] Failed to delete session', {
        sessionId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Refresh session TTL (extend expiration)
   *
   * @param {string} sessionId - Session identifier
   * @param {number} [ttl] - New TTL in seconds (defaults to config.redis.sessionTTL)
   */
  async refreshSession(sessionId, ttl = null) {
    const key = `session:${sessionId}`;
    const expirySeconds = ttl || config.redis.sessionTTL;

    try {
      const exists = await this.client.expire(key, expirySeconds);

      if (!exists) {
        logger.warn('[REDIS] Cannot refresh non-existent session', {
          sessionId
        });
        return false;
      }

      logger.debug('[REDIS] Session TTL refreshed', {
        sessionId,
        newTTL: expirySeconds
      });

      return true;
    } catch (error) {
      logger.error('[REDIS] Failed to refresh session TTL', {
        sessionId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get TTL remaining for a session
   *
   * @param {string} sessionId - Session identifier
   * @returns {number} - Seconds remaining, -1 if no TTL, -2 if doesn't exist
   */
  async getSessionTTL(sessionId) {
    const key = `session:${sessionId}`;

    try {
      const ttl = await this.client.ttl(key);

      logger.debug('[REDIS] Session TTL checked', {
        sessionId,
        ttl,
        status: ttl === -2 ? 'not_found' : ttl === -1 ? 'no_expiry' : 'active'
      });

      return ttl;
    } catch (error) {
      logger.error('[REDIS] Failed to get session TTL', {
        sessionId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get all active session IDs (for debugging/monitoring)
   *
   * @returns {Array<string>} - List of session IDs
   */
  async getAllSessions() {
    try {
      const keys = await this.client.keys('session:*');
      const sessionIds = keys.map(key => key.replace('session:', ''));

      logger.debug('[REDIS] Retrieved all active sessions', {
        count: sessionIds.length
      });

      return sessionIds;
    } catch (error) {
      logger.error('[REDIS] Failed to get all sessions', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Graceful shutdown - close Redis connection
   */
  async disconnect() {
    if (!this.client) {
      logger.warn('[REDIS] No client to disconnect');
      return;
    }

    try {
      await this.client.quit();
      logger.info('[REDIS] Disconnected gracefully');
      this.isConnected = false;
      this.client = null;
    } catch (error) {
      logger.error('[REDIS] Error during disconnect', {
        error: error.message
      });
      // Force close
      this.client.disconnect();
      this.isConnected = false;
      this.client = null;
    }
  }

  /**
   * Health check
   *
   * @returns {object} - Health status
   */
  async healthCheck() {
    try {
      const startTime = Date.now();
      await this.client.ping();
      const latency = Date.now() - startTime;

      return {
        status: 'healthy',
        connected: this.isConnected,
        latency,
        reconnectAttempts: this.reconnectAttempts
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message,
        reconnectAttempts: this.reconnectAttempts
      };
    }
  }
}

// Singleton instance
const redisClient = new RedisClient();

module.exports = redisClient;
