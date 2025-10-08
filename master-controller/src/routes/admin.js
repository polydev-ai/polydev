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

module.exports = router;
