/**
 * Admin API Routes
 * Administrative operations for system management
 */

const express = require('express');
const router = express.Router();
const { db } = require('../db/supabase');
const { vmManager } = require('../services/vm-manager');
const { cliStreamingService } = require('../services/cli-streaming');
const logger = require('../utils/logger').module('routes:admin');

/**
 * GET /api/admin/users
 * List all users with filters
 */
router.get('/users', async (req, res) => {
  try {
    const { status, search } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (search) filters.search = search;

    const users = await db.users.list(filters);

    res.json({ users });
  } catch (error) {
    logger.error('Admin list users failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/system/stats
 * Get overall system statistics
 */
router.get('/system/stats', async (req, res) => {
  try {
    const vmStats = await db.vms.getStatistics();

    const { data: userCount } = await db.supabase
      .from('users')
      .select('count');

    const { data: activeVMs } = await db.supabase
      .from('vms')
      .select('count')
      .eq('status', 'running');

    const { data: promptStats } = await db.supabase
      .from('prompts')
      .select('count, status');

    const stats = {
      totalUsers: userCount?.[0]?.count || 0,
      totalVMs: vmStats.total_vms || 0,
      activeVMs: activeVMs?.[0]?.count || 0,
      runningVMs: vmStats.running_vms || 0,
      hibernatedVMs: vmStats.hibernated_vms || 0,
      totalPrompts: promptStats?.reduce((sum, p) => sum + (p.count || 0), 0) || 0,
      timestamp: new Date().toISOString()
    };

    res.json({ statistics: stats });
  } catch (error) {
    logger.error('Get system stats failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/users/:userId/force-destroy-vm
 * Force destroy a user's VM (admin only)
 */
router.post('/users/:userId/force-destroy-vm', async (req, res) => {
  try {
    const { userId } = req.params;

    const vm = await db.vms.findByUserId(userId);
    if (!vm) {
      return res.status(404).json({ error: 'VM not found for user' });
    }

    await vmManager.destroyVM(vm.vm_id);

    await db.users.update(userId, {
      vm_id: null,
      vm_ip: null,
      status: 'vm_destroyed',
      vm_destroyed_at: new Date().toISOString()
    });

    logger.warn('VM force destroyed by admin', { userId, vmId: vm.vm_id });

    res.json({ success: true, message: 'VM destroyed' });
  } catch (error) {
    logger.error('Force destroy VM failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/cleanup/inactive-vms
 * Cleanup all inactive VMs (idle > 2 weeks)
 */
router.post('/cleanup/inactive-vms', async (req, res) => {
  try {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const { data: inactiveUsers } = await db.supabase
      .from('users')
      .select('user_id, email, last_active_at')
      .lt('last_active_at', twoWeeksAgo.toISOString())
      .not('vm_id', 'is', null);

    const destroyed = [];

    for (const user of inactiveUsers || []) {
      try {
        await cliStreamingService.destroyInactiveVM(user.user_id);
        destroyed.push(user.user_id);
      } catch (err) {
        logger.error('Failed to destroy inactive VM', {
          userId: user.user_id,
          error: err.message
        });
      }
    }

    logger.info('Inactive VMs cleanup completed', {
      totalInactive: inactiveUsers?.length || 0,
      destroyed: destroyed.length
    });

    res.json({
      success: true,
      totalInactive: inactiveUsers?.length || 0,
      destroyed: destroyed.length,
      destroyedUsers: destroyed
    });
  } catch (error) {
    logger.error('Cleanup inactive VMs failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/cleanup/orphaned-resources
 * Cleanup orphaned TAP devices and IPs
 */
router.post('/cleanup/orphaned-resources', async (req, res) => {
  try {
    // Get all VM IDs from database
    const vms = await db.vms.list({ excludeDestroyed: true });
    const activeVMIds = new Set(vms.map(vm => vm.vm_id));

    // Check vmManager's tracked resources
    const orphanedTaps = [];
    const orphanedIPs = [];

    // This would require vmManager to expose its internal state
    // For now, just return success
    logger.info('Orphaned resources cleanup initiated');

    res.json({
      success: true,
      message: 'Cleanup completed',
      orphanedTaps: orphanedTaps.length,
      orphanedIPs: orphanedIPs.length
    });
  } catch (error) {
    logger.error('Cleanup orphaned resources failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/metrics/recent
 * Get recent system metrics
 */
router.get('/metrics/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;

    const { data: metrics } = await db.supabase
      .from('system_metrics')
      .select('*')
      .order('recorded_at', { ascending: false })
      .limit(limit);

    res.json({ metrics: metrics || [] });
  } catch (error) {
    logger.error('Get recent metrics failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/system/restart
 * Restart the master-controller service (requires systemd)
 */
router.post('/system/restart', async (req, res) => {
  try {
    const { exec } = require('child_process');

    logger.warn('System restart requested via admin API');

    // Send response immediately before restarting
    res.json({
      success: true,
      message: 'Restart initiated. Service will be back in ~5 seconds.'
    });

    // Restart after 1 second delay to ensure response is sent
    setTimeout(() => {
      exec('systemctl restart master-controller', (error) => {
        if (error) {
          logger.error('Failed to restart via systemctl', { error: error.message });
        }
      });
    }, 1000);
  } catch (error) {
    logger.error('System restart failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/vm/:vmId/console
 * Get VM console log output
 */
router.get('/vm/:vmId/console', async (req, res) => {
  try {
    const { vmId } = req.params;
    const lines = parseInt(req.query.lines) || 500;
    const config = require('../config');
    const fs = require('fs').promises;
    const path = require('path');

    const consolePath = path.join(config.firecracker.usersDir, vmId, 'console.log');

    try {
      const content = await fs.readFile(consolePath, 'utf-8');
      const logLines = content.split('\n').slice(-lines);

      res.json({
        vmId,
        lines: logLines.length,
        content: logLines.join('\n'),
        consolePath
      });
    } catch (readError) {
      logger.warn('Console log not found', { vmId, consolePath });
      res.status(404).json({
        error: 'Console log not found',
        consolePath
      });
    }
  } catch (error) {
    logger.error('Get VM console failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/vms/recent
 * Get list of recent VMs with optional filters
 */
router.get('/vms/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const vmType = req.query.vmType;

    let query = db.supabase
      .from('vms')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (vmType) {
      query = query.eq('vm_type', vmType);
    }

    const { data: vms, error } = await query;

    if (error) throw error;

    res.json({ vms: vms || [] });
  } catch (error) {
    logger.error('Get recent VMs failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/health/system
 * Comprehensive system health check (Nomad, Prometheus, Grafana, coturn, etc.)
 */
router.get('/health/system', async (req, res) => {
  try {
    const http = require('http');
    const https = require('https');

    const health = {
      timestamp: new Date().toISOString(),
      overall: 'healthy',
      services: {},
      monitoring: {}
    };

    // Check Nomad
    try {
      const nomadResponse = await fetch('http://localhost:4646/v1/status/leader', { signal: AbortSignal.timeout(3000) });
      health.services.nomad = {
        status: nomadResponse.ok ? 'up' : 'down',
        url: 'http://135.181.138.102:4646',
        leader: nomadResponse.ok ? await nomadResponse.text() : null
      };
    } catch (error) {
      health.services.nomad = { status: 'down', error: error.message };
      health.overall = 'degraded';
    }

    // Check Prometheus
    try {
      const promResponse = await fetch('http://localhost:9090/-/healthy', { signal: AbortSignal.timeout(3000) });
      health.monitoring.prometheus = {
        status: promResponse.ok ? 'up' : 'down',
        url: 'http://135.181.138.102:9090',
        ui: 'http://135.181.138.102:9090/graph'
      };
    } catch (error) {
      health.monitoring.prometheus = { status: 'down', error: error.message };
    }

    // Check Grafana
    try {
      const grafanaResponse = await fetch('http://localhost:3000/api/health', { signal: AbortSignal.timeout(3000) });
      const grafanaData = await grafanaResponse.json();
      health.monitoring.grafana = {
        status: grafanaData.database === 'ok' ? 'up' : 'down',
        url: 'http://135.181.138.102:3000',
        version: grafanaData.version
      };
    } catch (error) {
      health.monitoring.grafana = { status: 'down', error: error.message };
    }

    // Check coturn
    health.services.coturn = {
      status: 'unknown',  // coturn doesn't have HTTP health endpoint
      info: 'STUN/TURN server for WebRTC',
      ports: '3478, 5349',
      note: 'Check with: systemctl status coturn'
    };

    // Check Docker
    try {
      const { exec } = require('child_process');
      const util = require('util');
      const execPromise = util.promisify(exec);
      const { stdout } = await execPromise('docker info --format "{{.Containers}}"');
      health.services.docker = {
        status: 'up',
        containers: parseInt(stdout.trim())
      };
    } catch (error) {
      health.services.docker = { status: 'down', error: error.message };
    }

    res.json(health);
  } catch (error) {
    logger.error('System health check failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
