/**
 * Authentication API Routes
 * Handles CLI tool authentication via Browser VMs
 */

const express = require('express');
const router = express.Router();
const { browserVMAuth } = require('../services/browser-vm-auth');
const logger = require('../utils/logger').module('routes:auth');

/**
 * POST /api/auth/start
 * Start authentication process for a CLI provider
 */
router.post('/start', async (req, res) => {
  try {
    const { userId, provider } = req.body;

    if (!userId || !provider) {
      return res.status(400).json({ error: 'userId and provider are required' });
    }

    const validProviders = ['codex', 'claude_code', 'gemini_cli'];
    if (!validProviders.includes(provider)) {
      return res.status(400).json({
        error: 'Invalid provider',
        validProviders
      });
    }

    logger.info('Starting authentication', { userId, provider });

    const result = await browserVMAuth.startAuthentication(userId, provider);

    res.json({
      success: true,
      sessionId: result.sessionId,
      provider: result.provider
    });
  } catch (error) {
    logger.error('Start authentication failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auth/session/:sessionId
 * Get authentication session status
 */
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await browserVMAuth.getSessionStatus(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ session });
  } catch (error) {
    logger.error('Get session status failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auth/session/:sessionId/cancel
 * Cancel an ongoing authentication session
 */
router.post('/session/:sessionId/cancel', async (req, res) => {
  try {
    const { sessionId } = req.params;

    await browserVMAuth.cancelSession(sessionId);

    logger.info('Auth session cancelled', { sessionId });

    res.json({
      success: true,
      message: 'Session cancelled'
    });
  } catch (error) {
    logger.error('Cancel session failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auth/rotate
 * Rotate credentials for a provider (re-authenticate)
 */
router.post('/rotate', async (req, res) => {
  try {
    const { userId, provider } = req.body;

    if (!userId || !provider) {
      return res.status(400).json({ error: 'userId and provider are required' });
    }

    logger.info('Rotating credentials', { userId, provider });

    const result = await browserVMAuth.rotateCredentials(userId, provider);

    res.json({
      success: true,
      sessionId: result.sessionId,
      provider: result.provider
    });
  } catch (error) {
    logger.error('Rotate credentials failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auth/credentials/:userId
 * List user's credentials
 */
router.get('/credentials/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const credentials = await browserVMAuth.listCredentials(userId);

    res.json({ credentials });
  } catch (error) {
    logger.error('List credentials failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auth/validate/:userId/:provider
 * Validate stored credentials for a provider
 */
router.get('/validate/:userId/:provider', async (req, res) => {
  try {
    const { userId, provider } = req.params;

    const result = await browserVMAuth.validateCredentials(userId, provider);

    res.json(result);
  } catch (error) {
    logger.error('Validate credentials failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
