/**
 * WebRTC Signaling API Routes
 *
 * Handles SDP offer/answer exchange and ICE candidate signaling
 * for WebRTC connections to Browser VMs
 */

const express = require('express');
const router = express.Router();
const { getWebRTCSignalingService } = require('../services/webrtc-signaling');
const logger = require('../utils/logger').module('webrtc-routes');

const signalingService = getWebRTCSignalingService();

/**
 * GET /api/webrtc/ice-servers
 * Get TURN/STUN server configuration
 */
router.get('/ice-servers', (req, res) => {
  try {
    const iceServers = signalingService.getICEServers();

    res.json({
      success: true,
      iceServers
    });

  } catch (error) {
    logger.error('Failed to get ICE servers', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/webrtc/session/:sessionId/offer
 * Client submits SDP offer
 */
router.post('/session/:sessionId/offer', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { offer, candidates } = req.body;

    if (!offer || !offer.type || !offer.sdp) {
      return res.status(400).json({ error: 'Invalid offer format' });
    }

    logger.info('Received WebRTC offer from client', {
      sessionId,
      offerType: offer.type,
      candidateCount: (candidates || []).length
    });

    await signalingService.storeOffer(sessionId, offer, candidates || []);

    res.json({ success: true });

  } catch (error) {
    logger.error('Failed to handle offer', {
      sessionId: req.params.sessionId,
      error: error.message
    });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/webrtc/session/:sessionId/answer
 * Client polls for VM's SDP answer
 */
router.get('/session/:sessionId/answer', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const result = await signalingService.getAnswer(sessionId);

    if (!result) {
      return res.status(404).json({
        error: 'Answer not ready yet',
        retry: true
      });
    }

    logger.info('Providing WebRTC answer to client', {
      sessionId,
      candidateCount: result.candidates.length
    });

    res.json({
      success: true,
      answer: result.answer,
      candidates: result.candidates
    });

  } catch (error) {
    logger.error('Failed to get answer', {
      sessionId: req.params.sessionId,
      error: error.message
    });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/webrtc/session/:sessionId/offer
 * VM requests client's SDP offer
 */
router.get('/session/:sessionId/offer', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const result = await signalingService.getOffer(sessionId);

    if (!result) {
      return res.status(404).json({
        error: 'Offer not found',
        retry: true
      });
    }

    logger.info('Providing WebRTC offer to VM', {
      sessionId,
      candidateCount: result.candidates.length
    });

    res.json({
      success: true,
      offer: result.offer,
      candidates: result.candidates
    });

  } catch (error) {
    logger.error('Failed to get offer for VM', {
      sessionId: req.params.sessionId,
      error: error.message
    });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/webrtc/session/:sessionId/answer
 * VM submits SDP answer
 */
router.post('/session/:sessionId/answer', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { answer, candidates } = req.body;

    if (!answer || !answer.type || !answer.sdp) {
      return res.status(400).json({ error: 'Invalid answer format' });
    }

    logger.info('Received WebRTC answer from VM', {
      sessionId,
      answerType: answer.type,
      candidateCount: (candidates || []).length
    });

    await signalingService.storeAnswer(sessionId, answer, candidates || []);

    res.json({ success: true });

  } catch (error) {
    logger.error('Failed to handle answer from VM', {
      sessionId: req.params.sessionId,
      error: error.message
    });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/webrtc/session/:sessionId/candidate
 * Add ICE candidate (from client or VM)
 */
router.post('/session/:sessionId/candidate', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { candidate, source } = req.body;

    if (!candidate) {
      return res.status(400).json({ error: 'Candidate required' });
    }

    await signalingService.addICECandidate(
      sessionId,
      candidate,
      source || 'client'
    );

    res.json({ success: true });

  } catch (error) {
    logger.error('Failed to add ICE candidate', {
      sessionId: req.params.sessionId,
      error: error.message
    });
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/webrtc/session/:sessionId
 * Cleanup WebRTC session
 */
router.delete('/session/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;

    signalingService.cleanup(sessionId);

    res.json({ success: true });

  } catch (error) {
    logger.error('Failed to cleanup session', {
      sessionId: req.params.sessionId,
      error: error.message
    });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/webrtc/stats
 * Get signaling service statistics
 */
router.get('/stats', (req, res) => {
  try {
    const stats = signalingService.getStats();
    res.json({ success: true, stats });

  } catch (error) {
    logger.error('Failed to get stats', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
