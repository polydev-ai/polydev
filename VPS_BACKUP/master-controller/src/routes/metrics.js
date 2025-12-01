/**
 * Prometheus Metrics Exporter
 * Exposes system metrics in Prometheus format
 */

const express = require('express');
const router = express.Router();
const client = require('prom-client');
const { db } = require('../db/supabase');
const config = require('../config');
const logger = require('../utils/logger').module('metrics');

// Create Prometheus registry
const register = new client.Registry();

// Add default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// Custom metrics
const totalUsers = new client.Gauge({
  name: 'polydev_total_users',
  help: 'Total number of users',
  registers: [register]
});

const totalVMs = new client.Gauge({
  name: 'polydev_total_vms',
  help: 'Total number of VMs',
  labelNames: ['status', 'type'],
  registers: [register]
});

const activeVMs = new client.Gauge({
  name: 'polydev_active_vms',
  help: 'Number of active VMs',
  registers: [register]
});

const promptsTotal = new client.Counter({
  name: 'polydev_prompts_total',
  help: 'Total number of prompts executed',
  labelNames: ['provider', 'status'],
  registers: [register]
});

const promptDuration = new client.Histogram({
  name: 'polydev_prompt_duration_seconds',
  help: 'Prompt execution duration in seconds',
  labelNames: ['provider'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300],
  registers: [register]
});

const vmResourceUsage = new client.Gauge({
  name: 'polydev_vm_resource_usage',
  help: 'VM resource usage',
  labelNames: ['vm_id', 'resource'],
  registers: [register]
});

const ipPoolAvailable = new client.Gauge({
  name: 'polydev_ip_pool_available',
  help: 'Number of available IPs in pool',
  registers: [register]
});

const decodoPortsUsed = new client.Gauge({
  name: 'polydev_decodo_ports_used',
  help: 'Number of Decodo ports in use',
  registers: [register]
});

/**
 * Update metrics from database
 */
async function updateMetrics() {
  try {
    // User count
    const { data: users } = await db.supabase
      .from('users')
      .select('count');
    totalUsers.set(users?.[0]?.count || 0);

    // VM statistics
    const vmStats = await db.vms.getStatistics();
    totalVMs.set({ status: 'running', type: 'all' }, vmStats.running_vms || 0);
    totalVMs.set({ status: 'hibernated', type: 'all' }, vmStats.hibernated_vms || 0);
    activeVMs.set(vmStats.running_vms || 0);

    // VM resource usage
    const { data: vms } = await db.supabase
      .from('vms')
      .select('vm_id, cpu_usage_percent, memory_usage_mb')
      .eq('status', 'running');

    for (const vm of vms || []) {
      if (vm.cpu_usage_percent !== null) {
        vmResourceUsage.set(
          { vm_id: vm.vm_id, resource: 'cpu_percent' },
          vm.cpu_usage_percent
        );
      }
      if (vm.memory_usage_mb !== null) {
        vmResourceUsage.set(
          { vm_id: vm.vm_id, resource: 'memory_mb' },
          vm.memory_usage_mb
        );
      }
    }

    // Decodo ports in use
    const { data: portsInUse } = await db.supabase
      .from('users')
      .select('count')
      .not('decodo_proxy_port', 'is', null);
    decodoPortsUsed.set(portsInUse?.[0]?.count || 0);

    // Calculate IP pool availability (would need vmManager state)
    // For now, estimate from total VMs
    const maxIPs = 253; // 192.168.100.2 - 254
    const usedIPs = vmStats.total_vms || 0;
    ipPoolAvailable.set(Math.max(0, maxIPs - usedIPs));

    // Prompt statistics (recent window)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const { data: recentPrompts } = await db.supabase
      .from('prompts')
      .select('provider, status, duration_ms')
      .gte('created_at', oneHourAgo.toISOString());

    // Group by provider and status
    const promptCounts = {};
    for (const prompt of recentPrompts || []) {
      const key = `${prompt.provider}_${prompt.status}`;
      promptCounts[key] = (promptCounts[key] || 0) + 1;

      // Record duration histogram
      if (prompt.status === 'completed' && prompt.duration_ms) {
        promptDuration.observe(
          { provider: prompt.provider },
          prompt.duration_ms / 1000 // Convert to seconds
        );
      }
    }

    // Update counters (note: Prometheus counters should only increase)
    // This is a simplified version - in production, use increment instead
    for (const [key, count] of Object.entries(promptCounts)) {
      const [provider, status] = key.split('_');
      // Would need to track previous values to only increment
    }

    logger.debug('Metrics updated', {
      totalUsers: users?.[0]?.count || 0,
      activeVMs: vmStats.running_vms || 0
    });
  } catch (error) {
    logger.error('Failed to update metrics', { error: error.message });
  }
}

// Update metrics periodically
if (config.monitoring.prometheusEnabled) {
  setInterval(updateMetrics, config.monitoring.metricsInterval);
  // Initial update
  updateMetrics();
}

/**
 * GET /metrics
 * Prometheus metrics endpoint
 */
router.get('/', async (req, res) => {
  try {
    // Update metrics before serving
    await updateMetrics();

    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    logger.error('Metrics endpoint error', { error: error.message });
    res.status(500).end();
  }
});

/**
 * GET /metrics/json
 * JSON metrics endpoint (for debugging)
 */
router.get('/json', async (req, res) => {
  try {
    await updateMetrics();

    const metrics = await register.getMetricsAsJSON();
    res.json({ metrics });
  } catch (error) {
    logger.error('JSON metrics endpoint error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
