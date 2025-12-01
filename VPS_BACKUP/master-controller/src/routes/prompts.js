/**
 * Prompt Execution API Routes
 * Handles prompt submission and streaming responses
 */

const express = require('express');
const router = express.Router();
const { cliStreamingService } = require('../services/cli-streaming');
const logger = require('../utils/logger').module('routes:prompts');

/**
 * POST /api/prompts/execute
 * Execute a prompt on user's CLI VM with streaming response
 */
router.post('/execute', async (req, res) => {
  try {
    const { userId, provider, prompt } = req.body;

    if (!userId || !provider || !prompt) {
      return res.status(400).json({
        error: 'userId, provider, and prompt are required'
      });
    }

    const validProviders = ['codex', 'claude_code', 'gemini_cli'];
    if (!validProviders.includes(provider)) {
      return res.status(400).json({
        error: 'Invalid provider',
        validProviders
      });
    }

    logger.info('Executing prompt', {
      userId,
      provider,
      promptLength: prompt.length
    });

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Send initial connection event
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

    let completed = false;

    // Execute prompt with streaming
    await cliStreamingService.executePrompt(
      userId,
      provider,
      prompt,
      // onChunk callback
      (chunk) => {
        if (!completed) {
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
      },
      // onComplete callback
      (result) => {
        if (!completed) {
          completed = true;
          res.write(`data: ${JSON.stringify({
            type: 'done',
            exitCode: result.exitCode
          })}\n\n`);
          res.end();
        }
      },
      // onError callback
      (error) => {
        if (!completed) {
          completed = true;
          logger.error('Prompt execution error', {
            userId,
            provider,
            error: error.message
          });
          res.write(`data: ${JSON.stringify({
            type: 'error',
            message: error.message
          })}\n\n`);
          res.end();
        }
      }
    );

    // Handle client disconnect
    req.on('close', () => {
      if (!completed) {
        logger.info('Client disconnected during prompt execution', { userId });
        completed = true;
      }
    });
  } catch (error) {
    logger.error('Execute prompt failed', { error: error.message });

    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    } else {
      res.write(`data: ${JSON.stringify({
        type: 'error',
        message: error.message
      })}\n\n`);
      res.end();
    }
  }
});

/**
 * POST /api/prompts/:promptId/cancel
 * Cancel a running prompt
 */
router.post('/:promptId/cancel', async (req, res) => {
  try {
    const { promptId } = req.params;

    await cliStreamingService.cancelPrompt(promptId);

    logger.info('Prompt cancelled', { promptId });

    res.json({
      success: true,
      message: 'Prompt cancelled'
    });
  } catch (error) {
    logger.error('Cancel prompt failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/prompts/:promptId/status
 * Get prompt execution status
 */
router.get('/:promptId/status', async (req, res) => {
  try {
    const { promptId } = req.params;

    const status = await cliStreamingService.getPromptStatus(promptId);
    if (!status) {
      return res.status(404).json({ error: 'Prompt not found' });
    }

    res.json({ status });
  } catch (error) {
    logger.error('Get prompt status failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
