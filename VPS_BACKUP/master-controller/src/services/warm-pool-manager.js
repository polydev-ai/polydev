/**
 * Warm Pool Manager Service
 *
 * Maintains a pool of pre-warmed containers for fast allocation to users.
 * Pre-warming reduces cold-start latency from ~5s to <500ms.
 *
 * Features:
 * - Maintain configurable pool size per provider
 * - Auto-replenish when containers are allocated
 * - Health monitoring and automatic replacement
 * - Metrics for pool utilization
 *
 * Architecture:
 * - Warm containers are idle and waiting
 * - When user requests, allocate from pool
 * - Inject credentials and execute command
 * - After completion, create new warm container
 */

const { getNomadManager } = require('./nomad-manager');
const logger = require('../utils/logger');

class WarmPoolManager {
  constructor() {
    this.nomadManager = getNomadManager();

    // Pool configuration
    this.poolConfig = {
      openai: {
        targetSize: parseInt(process.env.WARM_POOL_OPENAI_SIZE) || 10,
        current: 0,
        allocated: 0
      },
      anthropic: {
        targetSize: parseInt(process.env.WARM_POOL_ANTHROPIC_SIZE) || 10,
        current: 0,
        allocated: 0
      },
      google: {
        targetSize: parseInt(process.env.WARM_POOL_GOOGLE_SIZE) || 10,
        current: 0,
        allocated: 0
      }
    };

    // Pool state tracking
    this.warmContainers = {
      openai: [],
      anthropic: [],
      google: []
    };

    // Allocation tracking
    this.allocatedContainers = new Map(); // containerId -> { userId, provider, allocatedAt }

    // Health check interval
    this.healthCheckInterval = null;
    this.healthCheckIntervalMs = 30000; // 30 seconds

    // Replenishment settings
    this.replenishEnabled = true;
    this.replenishCheckInterval = null;
    this.replenishCheckIntervalMs = 10000; // 10 seconds

    logger.info('WarmPoolManager initialized', { poolConfig: this.poolConfig });
  }

  /**
   * Start the warm pool manager
   * - Initialize pools
   * - Start health checks
   * - Start replenishment monitor
   */
  async start() {
    try {
      logger.info('Starting WarmPoolManager...');

      // Verify Nomad connectivity
      const nomadHealthy = await this.nomadManager.healthCheck();
      if (!nomadHealthy) {
        throw new Error('Nomad is not healthy, cannot start warm pool');
      }

      // Initialize pools for each provider
      await Promise.all([
        this.initializePool('openai'),
        this.initializePool('anthropic'),
        this.initializePool('google')
      ]);

      // Start health check monitoring
      this.startHealthChecks();

      // Start automatic replenishment
      this.startReplenishmentMonitor();

      logger.info('WarmPoolManager started successfully', {
        pools: this.getPoolStats()
      });

    } catch (error) {
      logger.error('Failed to start WarmPoolManager', {
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Stop the warm pool manager
   */
  async stop() {
    logger.info('Stopping WarmPoolManager...');

    // Stop monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.replenishCheckInterval) {
      clearInterval(this.replenishCheckInterval);
      this.replenishCheckInterval = null;
    }

    // Drain all warm containers
    await Promise.all([
      this.drainPool('openai'),
      this.drainPool('anthropic'),
      this.drainPool('google')
    ]);

    logger.info('WarmPoolManager stopped');
  }

  /**
   * Initialize pool for a provider
   *
   * @param {string} provider Provider name (openai, anthropic, google)
   */
  async initializePool(provider) {
    const targetSize = this.poolConfig[provider].targetSize;

    logger.info(`Initializing warm pool for ${provider}`, { targetSize });

    const promises = [];
    for (let i = 0; i < targetSize; i++) {
      promises.push(this.createWarmContainer(provider));
    }

    try {
      await Promise.all(promises);

      logger.info(`Warm pool initialized for ${provider}`, {
        targetSize,
        current: this.warmContainers[provider].length
      });

    } catch (error) {
      logger.error(`Failed to fully initialize pool for ${provider}`, {
        error: error.message,
        created: this.warmContainers[provider].length,
        target: targetSize
      });
    }
  }

  /**
   * Create a warm container
   *
   * @param {string} provider Provider name
   * @returns {Promise<Object>} Container info
   */
  async createWarmContainer(provider) {
    const containerId = `warm-${provider}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Submit warm pool job to Nomad
      const jobSpec = {
        Job: {
          ID: containerId,
          Name: containerId,
          Type: 'service', // Service type for persistent containers
          Priority: 40,    // Lower priority than active executions

          TaskGroups: [{
            Name: 'warm-container',
            Count: 1,

            RestartPolicy: {
              Attempts: 3,
              Interval: '5m',
              Delay: '15s',
              Mode: 'delay'
            },

            Tasks: [{
              Name: 'runtime',
              Driver: 'docker',

              Config: {
                image: `polydev-${provider}-runtime:latest`,
                command: '/bin/sh',
                args: ['-c', 'tail -f /dev/null'], // Keep container running

                network_mode: 'bridge',

                logging: {
                  type: 'json-file',
                  config: {
                    'max-size': '5m',
                    'max-file': '1'
                  }
                }
              },

              Env: {
                PROVIDER: provider,
                WARM_POOL: 'true',
                CONTAINER_ID: containerId
              },

              Resources: {
                CPU: 100,      // Minimal CPU for idle container
                MemoryMB: 256, // Minimal memory for idle container

                Networks: [{
                  Mode: 'bridge',
                  MBits: 5
                }]
              }
            }]
          }],

          Meta: {
            provider,
            purpose: 'warm-pool',
            containerId,
            createdAt: new Date().toISOString()
          }
        }
      };

      // Submit job via Nomad Manager's raw API
      const response = await this.nomadManager.submitRuntimeJob({
        userId: 'warm-pool',
        provider,
        credentials: {},
        command: 'tail -f /dev/null', // Idle command
        env: { WARM_POOL: 'true' }
      });

      const container = {
        id: containerId,
        provider,
        jobId: response.jobId,
        evalId: response.evalId,
        createdAt: Date.now(),
        status: 'warming',
        healthy: true
      };

      this.warmContainers[provider].push(container);
      this.poolConfig[provider].current++;

      logger.debug('Warm container created', {
        containerId,
        provider,
        jobId: response.jobId
      });

      return container;

    } catch (error) {
      logger.error('Failed to create warm container', {
        containerId,
        provider,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Allocate a warm container from the pool
   *
   * @param {string} provider Provider name
   * @param {string} userId User ID
   * @returns {Promise<Object|null>} Allocated container or null if pool empty
   */
  async allocateContainer(provider, userId) {
    const pool = this.warmContainers[provider];

    if (pool.length === 0) {
      logger.warn('Warm pool empty, cannot allocate', { provider, userId });
      return null;
    }

    // Pop container from pool (FIFO)
    const container = pool.shift();
    this.poolConfig[provider].current--;
    this.poolConfig[provider].allocated++;

    // Track allocation
    this.allocatedContainers.set(container.id, {
      userId,
      provider,
      allocatedAt: Date.now()
    });

    logger.info('Container allocated from warm pool', {
      containerId: container.id,
      provider,
      userId,
      remainingInPool: pool.length
    });

    // Trigger async replenishment
    setImmediate(() => this.replenishPool(provider));

    return container;
  }

  /**
   * Release an allocated container back to the pool (after execution)
   *
   * @param {string} containerId Container ID
   */
  async releaseContainer(containerId) {
    const allocation = this.allocatedContainers.get(containerId);

    if (!allocation) {
      logger.warn('Attempted to release unknown container', { containerId });
      return;
    }

    const { provider, userId } = allocation;

    try {
      // Stop the Nomad job
      await this.nomadManager.stopJob(containerId, true);

      // Remove from tracking
      this.allocatedContainers.delete(containerId);
      this.poolConfig[provider].allocated--;

      logger.info('Container released', {
        containerId,
        provider,
        userId,
        runtime: Date.now() - allocation.allocatedAt
      });

      // Create new warm container to replace it
      await this.createWarmContainer(provider);

    } catch (error) {
      logger.error('Failed to release container', {
        containerId,
        provider,
        error: error.message
      });
    }
  }

  /**
   * Replenish pool to target size
   *
   * @param {string} provider Provider name
   */
  async replenishPool(provider) {
    if (!this.replenishEnabled) {
      return;
    }

    const pool = this.warmContainers[provider];
    const targetSize = this.poolConfig[provider].targetSize;
    const currentSize = pool.length;
    const deficit = targetSize - currentSize;

    if (deficit <= 0) {
      return; // Pool is full
    }

    logger.debug(`Replenishing pool for ${provider}`, {
      current: currentSize,
      target: targetSize,
      deficit
    });

    // Create missing containers (limit concurrency to 5)
    const batchSize = Math.min(deficit, 5);
    const promises = [];

    for (let i = 0; i < batchSize; i++) {
      promises.push(
        this.createWarmContainer(provider).catch(error => {
          logger.error(`Failed to create warm container during replenishment`, {
            provider,
            error: error.message
          });
        })
      );
    }

    await Promise.allSettled(promises);
  }

  /**
   * Drain all containers from a pool
   *
   * @param {string} provider Provider name
   */
  async drainPool(provider) {
    const pool = this.warmContainers[provider];

    logger.info(`Draining warm pool for ${provider}`, {
      count: pool.length
    });

    const promises = pool.map(container =>
      this.nomadManager.stopJob(container.jobId, true).catch(error => {
        logger.error('Failed to stop warm container during drain', {
          containerId: container.id,
          error: error.message
        });
      })
    );

    await Promise.allSettled(promises);

    // Clear pool
    this.warmContainers[provider] = [];
    this.poolConfig[provider].current = 0;

    logger.info(`Pool drained for ${provider}`);
  }

  /**
   * Start health check monitoring
   */
  startHealthChecks() {
    if (this.healthCheckInterval) {
      return; // Already running
    }

    logger.info('Starting warm pool health checks');

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthChecks();
      } catch (error) {
        logger.error('Health check failed', { error: error.message });
      }
    }, this.healthCheckIntervalMs);
  }

  /**
   * Perform health checks on all warm containers
   */
  async performHealthChecks() {
    const providers = ['openai', 'anthropic', 'google'];

    for (const provider of providers) {
      const pool = this.warmContainers[provider];

      for (const container of pool) {
        try {
          // Check job status via Nomad
          const status = await this.nomadManager.getJobStatus(container.jobId);

          if (!status.exists || status.status !== 'running') {
            logger.warn('Warm container unhealthy, removing from pool', {
              containerId: container.id,
              provider,
              status: status.status
            });

            // Remove from pool
            const index = pool.indexOf(container);
            if (index > -1) {
              pool.splice(index, 1);
              this.poolConfig[provider].current--;
            }

            // Trigger replenishment
            setImmediate(() => this.replenishPool(provider));
          }

        } catch (error) {
          logger.error('Failed to check container health', {
            containerId: container.id,
            provider,
            error: error.message
          });
        }
      }
    }
  }

  /**
   * Start automatic replenishment monitor
   */
  startReplenishmentMonitor() {
    if (this.replenishCheckInterval) {
      return; // Already running
    }

    logger.info('Starting replenishment monitor');

    this.replenishCheckInterval = setInterval(async () => {
      const providers = ['openai', 'anthropic', 'google'];

      for (const provider of providers) {
        await this.replenishPool(provider);
      }
    }, this.replenishCheckIntervalMs);
  }

  /**
   * Get pool statistics
   *
   * @returns {Object} Pool stats
   */
  getPoolStats() {
    return {
      openai: {
        target: this.poolConfig.openai.targetSize,
        current: this.warmContainers.openai.length,
        allocated: this.poolConfig.openai.allocated,
        utilizationPercent: Math.round(
          (this.poolConfig.openai.allocated / this.poolConfig.openai.targetSize) * 100
        )
      },
      anthropic: {
        target: this.poolConfig.anthropic.targetSize,
        current: this.warmContainers.anthropic.length,
        allocated: this.poolConfig.anthropic.allocated,
        utilizationPercent: Math.round(
          (this.poolConfig.anthropic.allocated / this.poolConfig.anthropic.targetSize) * 100
        )
      },
      google: {
        target: this.poolConfig.google.targetSize,
        current: this.warmContainers.google.length,
        allocated: this.poolConfig.google.allocated,
        utilizationPercent: Math.round(
          (this.poolConfig.google.allocated / this.poolConfig.google.targetSize) * 100
        )
      },
      totalAllocated: this.allocatedContainers.size
    };
  }

  /**
   * Update pool size for a provider
   *
   * @param {string} provider Provider name
   * @param {number} newSize New target size
   */
  async updatePoolSize(provider, newSize) {
    if (newSize < 0 || newSize > 100) {
      throw new Error('Pool size must be between 0 and 100');
    }

    const oldSize = this.poolConfig[provider].targetSize;
    this.poolConfig[provider].targetSize = newSize;

    logger.info(`Updated pool size for ${provider}`, {
      oldSize,
      newSize
    });

    // Adjust pool immediately
    if (newSize > oldSize) {
      // Grow pool
      await this.replenishPool(provider);
    } else if (newSize < oldSize) {
      // Shrink pool (drain excess)
      const pool = this.warmContainers[provider];
      const excess = pool.length - newSize;

      if (excess > 0) {
        const toRemove = pool.splice(0, excess);

        for (const container of toRemove) {
          await this.nomadManager.stopJob(container.jobId, true);
          this.poolConfig[provider].current--;
        }

        logger.info(`Drained ${excess} containers from ${provider} pool`);
      }
    }
  }
}

// Singleton instance
let warmPoolManagerInstance = null;

/**
 * Get Warm Pool Manager singleton
 *
 * @returns {WarmPoolManager} Warm Pool Manager instance
 */
function getWarmPoolManager() {
  if (!warmPoolManagerInstance) {
    warmPoolManagerInstance = new WarmPoolManager();
  }

  return warmPoolManagerInstance;
}

module.exports = {
  WarmPoolManager,
  getWarmPoolManager
};
