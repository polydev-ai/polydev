/**
 * Nomad Manager Service
 *
 * Manages container orchestration via Nomad for Polydev AI V2.
 * Handles job submission, monitoring, and resource allocation.
 *
 * Features:
 * - Submit runtime container jobs
 * - Submit browser VM jobs
 * - Monitor job status
 * - Track resource usage
 * - Warm pool integration
 */

const axios = require('axios');
const logger = require('../utils/logger');

class NomadManager {
  constructor() {
    this.nomadAddress = process.env.NOMAD_ADDR || 'http://localhost:4646';
    this.region = process.env.NOMAD_REGION || 'global';
    this.datacenter = process.env.NOMAD_DATACENTER || 'dc1';

    // Cache for job statuses
    this.jobStatusCache = new Map();
    this.cacheTimeout = 5000; // 5 seconds

    // Metrics
    this.metrics = {
      jobsSubmitted: 0,
      jobsRunning: 0,
      jobsCompleted: 0,
      jobsFailed: 0,
      totalAllocations: 0
    };

    logger.info('NomadManager initialized', {
      address: this.nomadAddress,
      region: this.region,
      datacenter: this.datacenter
    });
  }

  /**
   * Submit a runtime container job for CLI execution
   *
   * @param {Object} options Job options
   * @param {string} options.userId User ID
   * @param {string} options.provider Provider (openai, anthropic, google)
   * @param {Object} options.credentials User credentials (encrypted)
   * @param {string} options.command Command to execute
   * @param {Object} options.env Additional environment variables
   * @returns {Promise<Object>} Job submission result
   */
  async submitRuntimeJob(options) {
    const { userId, provider, credentials, command, env = {} } = options;

    const jobId = `runtime-${provider}-${userId}-${Date.now()}`;

    // Build job specification
    const jobSpec = {
      Job: {
        ID: jobId,
        Name: jobId,
        Type: 'batch',
        Priority: 50,
        Region: this.region,
        Datacenters: [this.datacenter],

        // Task group
        TaskGroups: [{
          Name: 'runtime',
          Count: 1,

          // Restart policy - don't restart batch jobs
          RestartPolicy: {
            Attempts: 0,
            Interval: '5m',
            Delay: '15s',
            Mode: 'fail'
          },

          // Task definition
          Tasks: [{
            Name: 'cli-execution',
            Driver: 'docker',

            Config: {
              image: `polydev-${provider}-runtime:latest`,
              command: '/bin/sh',
              args: ['-c', command],

              // Network configuration
              network_mode: 'bridge',

              // Resource cleanup
              force_pull: false,

              // Logging configuration
              logging: {
                type: 'json-file',
                config: {
                  'max-size': '10m',
                  'max-file': '2'
                }
              }
            },

            // Environment variables (includes credentials)
            Env: {
              ...env,
              PROVIDER: provider,
              USER_ID: userId,
              // Credentials injected securely
              ...this._buildCredentialEnv(provider, credentials)
            },

            // Resource requirements
            Resources: {
              CPU: 500,      // 0.5 CPU
              MemoryMB: 512, // 512 MB

              Networks: [{
                Mode: 'bridge',
                MBits: 10
              }]
            },

            // Lifecycle
            Lifecycle: {
              Hook: 'poststop',
              Sidecar: false
            },

            // Kill timeout
            KillTimeout: '30s'
          }]
        }],

        // Job metadata
        Meta: {
          userId,
          provider,
          purpose: 'cli-execution',
          timestamp: new Date().toISOString()
        }
      }
    };

    try {
      logger.info('Submitting runtime job to Nomad', { jobId, provider, userId });

      const response = await axios.post(
        `${this.nomadAddress}/v1/jobs`,
        jobSpec,
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );

      this.metrics.jobsSubmitted++;
      this.metrics.jobsRunning++;

      logger.info('Runtime job submitted successfully', {
        jobId,
        evalId: response.data.EvalID,
        evalCreateIndex: response.data.EvalCreateIndex
      });

      return {
        success: true,
        jobId,
        evalId: response.data.EvalID,
        provider,
        userId
      };

    } catch (error) {
      logger.error('Failed to submit runtime job', {
        jobId,
        provider,
        userId,
        error: error.message,
        response: error.response?.data
      });

      this.metrics.jobsFailed++;

      throw new Error(`Nomad job submission failed: ${error.message}`);
    }
  }

  /**
   * Submit a browser VM job for OAuth flows
   *
   * @param {Object} options Job options
   * @param {string} options.userId User ID
   * @param {string} options.sessionId Auth session ID
   * @param {string} options.provider Provider (google, github, etc.)
   * @param {string} options.vmIp VM internal IP
   * @param {number} options.vncPort VNC port
   * @returns {Promise<Object>} Job submission result
   */
  async submitBrowserVMJob(options) {
    const { userId, sessionId, provider, vmIp, vncPort } = options;

    const jobId = `browser-vm-${sessionId}`;

    const jobSpec = {
      Job: {
        ID: jobId,
        Name: jobId,
        Type: 'service', // Service type for persistent VMs
        Priority: 75,
        Region: this.region,
        Datacenters: [this.datacenter],

        TaskGroups: [{
          Name: 'browser-vm',
          Count: 1,

          RestartPolicy: {
            Attempts: 2,
            Interval: '5m',
            Delay: '15s',
            Mode: 'fail'
          },

          Tasks: [{
            Name: 'firecracker-vm',
            Driver: 'exec', // Use exec driver for Firecracker

            Config: {
              command: '/usr/local/bin/firecracker',
              args: [
                '--api-sock', `/var/lib/firecracker/sockets/${sessionId}.sock`,
                '--config-file', `/var/lib/firecracker/configs/${sessionId}.json`
              ]
            },

            Env: {
              SESSION_ID: sessionId,
              USER_ID: userId,
              PROVIDER: provider,
              VM_IP: vmIp,
              VNC_PORT: String(vncPort)
            },

            Resources: {
              CPU: 1000,      // 1 CPU
              MemoryMB: 2048, // 2 GB

              Networks: [{
                Mode: 'bridge',
                MBits: 100
              }]
            }
          }]
        }],

        Meta: {
          userId,
          sessionId,
          provider,
          purpose: 'browser-vm',
          vmIp,
          vncPort: String(vncPort),
          timestamp: new Date().toISOString()
        }
      }
    };

    try {
      logger.info('Submitting browser VM job to Nomad', { jobId, sessionId, userId });

      const response = await axios.post(
        `${this.nomadAddress}/v1/jobs`,
        jobSpec,
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );

      this.metrics.jobsSubmitted++;
      this.metrics.jobsRunning++;

      logger.info('Browser VM job submitted successfully', {
        jobId,
        evalId: response.data.EvalID
      });

      return {
        success: true,
        jobId,
        evalId: response.data.EvalID,
        sessionId,
        userId
      };

    } catch (error) {
      logger.error('Failed to submit browser VM job', {
        jobId,
        sessionId,
        error: error.message
      });

      this.metrics.jobsFailed++;

      throw new Error(`Nomad browser VM job submission failed: ${error.message}`);
    }
  }

  /**
   * Get job status
   *
   * @param {string} jobId Job ID
   * @param {boolean} useCache Use cached status if available
   * @returns {Promise<Object>} Job status
   */
  async getJobStatus(jobId, useCache = true) {
    // Check cache first
    if (useCache && this.jobStatusCache.has(jobId)) {
      const cached = this.jobStatusCache.get(jobId);
      const age = Date.now() - cached.timestamp;

      if (age < this.cacheTimeout) {
        return cached.status;
      }
    }

    try {
      const response = await axios.get(
        `${this.nomadAddress}/v1/job/${jobId}`,
        { validateStatus: (status) => status === 200 || status === 404 }
      );

      if (response.status === 404) {
        return {
          exists: false,
          status: 'not-found',
          jobId
        };
      }

      const job = response.data;
      const status = {
        exists: true,
        jobId: job.ID,
        status: job.Status,
        statusDescription: job.StatusDescription,
        type: job.Type,
        priority: job.Priority,
        region: job.Region,
        datacenters: job.Datacenters,
        submitTime: job.SubmitTime,
        meta: job.Meta
      };

      // Cache the status
      this.jobStatusCache.set(jobId, {
        status,
        timestamp: Date.now()
      });

      return status;

    } catch (error) {
      logger.error('Failed to get job status', {
        jobId,
        error: error.message
      });

      throw new Error(`Failed to get job status: ${error.message}`);
    }
  }

  /**
   * Get job allocations (running containers)
   *
   * @param {string} jobId Job ID
   * @returns {Promise<Array>} List of allocations
   */
  async getJobAllocations(jobId) {
    try {
      const response = await axios.get(
        `${this.nomadAddress}/v1/job/${jobId}/allocations`
      );

      return response.data.map(alloc => ({
        id: alloc.ID,
        name: alloc.Name,
        nodeId: alloc.NodeID,
        taskGroup: alloc.TaskGroup,
        clientStatus: alloc.ClientStatus,
        desiredStatus: alloc.DesiredStatus,
        createTime: alloc.CreateTime,
        modifyTime: alloc.ModifyTime
      }));

    } catch (error) {
      logger.error('Failed to get job allocations', {
        jobId,
        error: error.message
      });

      return [];
    }
  }

  /**
   * Stop a job
   *
   * @param {string} jobId Job ID
   * @param {boolean} purge Remove job from Nomad after stopping
   * @returns {Promise<Object>} Stop result
   */
  async stopJob(jobId, purge = true) {
    try {
      logger.info('Stopping Nomad job', { jobId, purge });

      const response = await axios.delete(
        `${this.nomadAddress}/v1/job/${jobId}`,
        {
          params: { purge: purge ? 'true' : 'false' }
        }
      );

      this.metrics.jobsRunning = Math.max(0, this.metrics.jobsRunning - 1);
      this.metrics.jobsCompleted++;

      // Clear from cache
      this.jobStatusCache.delete(jobId);

      logger.info('Job stopped successfully', {
        jobId,
        evalId: response.data.EvalID
      });

      return {
        success: true,
        jobId,
        evalId: response.data.EvalID,
        purged: purge
      };

    } catch (error) {
      logger.error('Failed to stop job', {
        jobId,
        error: error.message
      });

      throw new Error(`Failed to stop job: ${error.message}`);
    }
  }

  /**
   * Get cluster status and resource availability
   *
   * @returns {Promise<Object>} Cluster status
   */
  async getClusterStatus() {
    try {
      // Get nodes
      const nodesResponse = await axios.get(`${this.nomadAddress}/v1/nodes`);
      const nodes = nodesResponse.data || [];

      // Get jobs
      const jobsResponse = await axios.get(`${this.nomadAddress}/v1/jobs`);
      const jobs = jobsResponse.data || [];

      // Calculate totals
      const totalNodes = nodes.length;
      const totalJobs = jobs.length;
      const runningJobs = jobs.filter(job => job.Status === 'running').length;

      // Get node resources
      let totalCPU = 0;
      let totalMemoryMB = 0;
      let usedCPU = 0;
      let usedMemoryMB = 0;

      for (const node of nodes) {
        if (node.Status === 'ready') {
          const nodeDetail = await axios.get(`${this.nomadAddress}/v1/node/${node.ID}`);
          const nodeData = nodeDetail.data;

          totalCPU += nodeData.Resources?.CPU || 0;
          totalMemoryMB += nodeData.Resources?.MemoryMB || 0;
          usedCPU += nodeData.Reserved?.CPU || 0;
          usedMemoryMB += nodeData.Reserved?.MemoryMB || 0;
        }
      }

      return {
        healthy: totalNodes > 0,
        nodes: {
          total: totalNodes,
          ready: nodes.filter(n => n.Status === 'ready').length
        },
        jobs: {
          total: totalJobs,
          running: runningJobs,
          pending: jobs.filter(job => job.Status === 'pending').length,
          dead: jobs.filter(job => job.Status === 'dead').length
        },
        resources: {
          cpu: {
            total: totalCPU,
            used: usedCPU,
            available: totalCPU - usedCPU,
            utilizationPercent: totalCPU > 0 ? Math.round((usedCPU / totalCPU) * 100) : 0
          },
          memory: {
            totalMB: totalMemoryMB,
            usedMB: usedMemoryMB,
            availableMB: totalMemoryMB - usedMemoryMB,
            utilizationPercent: totalMemoryMB > 0 ? Math.round((usedMemoryMB / totalMemoryMB) * 100) : 0
          }
        },
        metrics: this.metrics
      };

    } catch (error) {
      logger.error('Failed to get cluster status', {
        error: error.message
      });

      return {
        healthy: false,
        error: error.message,
        metrics: this.metrics
      };
    }
  }

  /**
   * Build credential environment variables for a provider
   *
   * @param {string} provider Provider name
   * @param {Object} credentials Decrypted credentials
   * @returns {Object} Environment variables
   * @private
   */
  _buildCredentialEnv(provider, credentials) {
    const env = {};

    switch (provider) {
      case 'openai':
        if (credentials.apiKey) {
          env.OPENAI_API_KEY = credentials.apiKey;
        }
        break;

      case 'anthropic':
        if (credentials.apiKey) {
          env.ANTHROPIC_API_KEY = credentials.apiKey;
        }
        break;

      case 'google':
        if (credentials.apiKey) {
          env.GOOGLE_API_KEY = credentials.apiKey;
        }
        if (credentials.projectId) {
          env.GOOGLE_PROJECT_ID = credentials.projectId;
        }
        break;
    }

    return env;
  }

  /**
   * Health check for Nomad connectivity
   *
   * @returns {Promise<boolean>} Health status
   */
  async healthCheck() {
    try {
      const response = await axios.get(`${this.nomadAddress}/v1/status/leader`, {
        timeout: 5000
      });

      return response.status === 200 && response.data !== '';

    } catch (error) {
      logger.error('Nomad health check failed', {
        error: error.message
      });

      return false;
    }
  }
}

// Singleton instance
let nomadManagerInstance = null;

/**
 * Get Nomad Manager singleton
 *
 * @returns {NomadManager} Nomad Manager instance
 */
function getNomadManager() {
  if (!nomadManagerInstance) {
    nomadManagerInstance = new NomadManager();
  }

  return nomadManagerInstance;
}

module.exports = {
  NomadManager,
  getNomadManager
};
