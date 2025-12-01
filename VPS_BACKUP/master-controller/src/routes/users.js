/**
 * User Management API Routes
 */

const express = require('express');
const router = express.Router();
const { db } = require('../db/supabase');
const { vmManager } = require('../services/vm-manager');
const { cliStreamingService } = require('../services/cli-streaming');
const logger = require('../utils/logger').module('routes:users');

/**
 * GET /api/users/:userId
 * Get user details
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await db.users.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    logger.error('Get user failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/users
 * Create a new user
 */
router.post('/', async (req, res) => {
  try {
    const { email, supabaseAuthId } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists
    const existing = await db.users.findByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'User already exists', user: existing });
    }

    // Create user
    const user = await db.users.create(email, supabaseAuthId);

    logger.info('User created', { userId: user.user_id, email });

    res.status(201).json({ user });
  } catch (error) {
    logger.error('Create user failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/users/:userId
 * Update user details
 */
router.patch('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    // Validate updates
    const allowedFields = ['subscription_plan', 'status'];
    const filteredUpdates = {};

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const user = await db.users.update(userId, filteredUpdates);

    logger.info('User updated', { userId, updates: filteredUpdates });

    res.json({ user });
  } catch (error) {
    logger.error('Update user failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/users/:userId/vm
 * Get user's CLI VM details
 */
router.get('/:userId/vm', async (req, res) => {
  try {
    const { userId } = req.params;

    const vm = await db.vms.findByUserId(userId);
    if (!vm) {
      return res.status(404).json({ error: 'VM not found for user' });
    }

    res.json({ vm });
  } catch (error) {
    logger.error('Get user VM failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/users/:userId/vm/hibernate
 * Hibernate user's CLI VM
 */
router.post('/:userId/vm/hibernate', async (req, res) => {
  try {
    const { userId } = req.params;

    const vm = await db.vms.findByUserId(userId);
    if (!vm) {
      return res.status(404).json({ error: 'VM not found for user' });
    }

    if (vm.status !== 'running') {
      return res.status(400).json({ error: 'VM is not running' });
    }

    await vmManager.hibernateVM(vm.vm_id);

    logger.info('VM hibernated via API', { userId, vmId: vm.vm_id });

    res.json({ success: true, message: 'VM hibernated' });
  } catch (error) {
    logger.error('Hibernate VM failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/users/:userId/vm/resume
 * Resume user's hibernated CLI VM
 */
router.post('/:userId/vm/resume', async (req, res) => {
  try {
    const { userId } = req.params;

    const vm = await db.vms.findByUserId(userId);
    if (!vm) {
      return res.status(404).json({ error: 'VM not found for user' });
    }

    if (vm.status !== 'hibernated') {
      return res.status(400).json({ error: 'VM is not hibernated' });
    }

    await vmManager.resumeVM(vm.vm_id);

    logger.info('VM resumed via API', { userId, vmId: vm.vm_id });

    res.json({ success: true, message: 'VM resumed' });
  } catch (error) {
    logger.error('Resume VM failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/users/:userId/vm
 * Destroy user's CLI VM
 */
router.delete('/:userId/vm', async (req, res) => {
  try {
    const { userId } = req.params;

    const vm = await db.vms.findByUserId(userId);
    if (!vm) {
      return res.status(404).json({ error: 'VM not found for user' });
    }

    await vmManager.destroyVM(vm.vm_id);

    // Update user
    await db.users.update(userId, {
      vm_id: null,
      vm_ip: null,
      status: 'vm_destroyed',
      vm_destroyed_at: new Date().toISOString()
    });

    logger.info('VM destroyed via API', { userId, vmId: vm.vm_id });

    res.json({ success: true, message: 'VM destroyed' });
  } catch (error) {
    logger.error('Destroy VM failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/users/:userId/stats
 * Get user's usage statistics
 */
router.get('/:userId/stats', async (req, res) => {
  try {
    const { userId } = req.params;

    const stats = await cliStreamingService.getUserStats(userId);

    res.json({ stats });
  } catch (error) {
    logger.error('Get user stats failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/users/:userId/prompts
 * Get user's prompt history
 */
router.get('/:userId/prompts', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    const prompts = await cliStreamingService.listUserPrompts(userId, limit);

    res.json({ prompts });
  } catch (error) {
    logger.error('Get user prompts failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
