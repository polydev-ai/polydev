/**
 * VM Management API Routes
 */

const express = require('express');
const router = express.Router();
const { vmManager } = require('../services/vm-manager');
const { db } = require('../db/supabase');
const logger = require('../utils/logger').module('routes:vms');

/**
 * GET /api/vms
 * List all VMs with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const { status, type, excludeDestroyed } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (type) filters.type = type;
    if (excludeDestroyed === 'true') filters.excludeDestroyed = true;

    const vms = await vmManager.listVMs(filters);

    res.json({ vms });
  } catch (error) {
    logger.error('List VMs failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/vms/:vmId
 * Get VM details
 */
router.get('/:vmId', async (req, res) => {
  try {
    const { vmId } = req.params;

    const vm = await vmManager.getVMStats(vmId);
    if (!vm) {
      return res.status(404).json({ error: 'VM not found' });
    }

    res.json({ vm });
  } catch (error) {
    logger.error('Get VM failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/vms/:vmId/heartbeat
 * Update VM heartbeat and resource usage
 */
router.post('/:vmId/heartbeat', async (req, res) => {
  try {
    const { vmId } = req.params;
    const { cpuUsage, memoryUsage } = req.body;

    if (cpuUsage === undefined || memoryUsage === undefined) {
      return res.status(400).json({
        error: 'cpuUsage and memoryUsage are required'
      });
    }

    await vmManager.updateHeartbeat(vmId, cpuUsage, memoryUsage);

    res.json({ success: true });
  } catch (error) {
    logger.error('Update heartbeat failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/vms/statistics
 * Get overall VM statistics
 */
router.get('/statistics/summary', async (req, res) => {
  try {
    const stats = await db.vms.getStatistics();

    res.json({ statistics: stats });
  } catch (error) {
    logger.error('Get VM statistics failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
