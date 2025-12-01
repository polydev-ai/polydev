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
    const requestTime = new Date().toISOString();

    logger.info('[WEBRTC-ROUTE] GET /answer request', {
      sessionId,
      requestTime,
      ip: req.ip
    });

    const result = await signalingService.getAnswer(sessionId);

    if (!result) {
      logger.info('[WEBRTC-ROUTE] Answer not ready (200 response with retry flag)', {
        sessionId,
        responseTime: new Date().toISOString(),
        requestTime,
        elapsed_ms: new Date() - new Date(requestTime)
      });
      return res.status(200).json({
        error: 'Answer not ready yet',
        retry: true
      });
    }

    logger.info('[WEBRTC-ROUTE] Providing WebRTC answer to client (200 response)', {
      sessionId,
      candidateCount: result.candidates.length,
      responseTime: new Date().toISOString()
    });

    // Return answer in nested structure that WebRTCViewer expects
    res.json({
      answer: {
        sdp: result.answer.sdp,
        type: result.answer.type
      },
      candidates: result.candidates
    });

  } catch (error) {
    logger.error('[WEBRTC-ROUTE] Failed to get answer (500 response)', {
      sessionId: req.params.sessionId,
      error: error.message,
      errorStack: error.stack,
      timestamp: new Date().toISOString()
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

    // Return offer in nested structure that webrtc-server.js expects
    // VM code accesses: offerData.offer.sdp
    res.json({
      offer: {
        sdp: result.offer.sdp,
        type: result.offer.type
      },
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
    const requestTime = new Date().toISOString();

    logger.info('[WEBRTC-ROUTE] POST /answer request (from VM)', {
      sessionId,
      requestTime,
      ip: req.ip,
      bodyKeys: Object.keys(req.body)
    });

    if (!answer || !answer.type || !answer.sdp) {
      logger.error('[WEBRTC-ROUTE] Invalid answer format (400 response)', {
        sessionId,
        hasAnswer: !!answer,
        hasType: !!answer?.type,
        hasSdp: !!answer?.sdp
      });
      return res.status(400).json({ error: 'Invalid answer format' });
    }

    logger.info('[WEBRTC-ROUTE] Valid answer received from VM', {
      sessionId,
      answerType: answer.type,
      answerSdpLength: answer.sdp?.length || 0,
      candidateCount: (candidates || []).length,
      timestamp: requestTime
    });

    await signalingService.storeAnswer(sessionId, answer, candidates || []);

    logger.info('[WEBRTC-ROUTE] Answer stored successfully (200 response)', {
      sessionId,
      responseTime: new Date().toISOString(),
      requestTime,
      elapsed_ms: new Date() - new Date(requestTime)
    });

    res.json({ success: true });

  } catch (error) {
    logger.error('[WEBRTC-ROUTE] Failed to handle answer from VM (500 response)', {
      sessionId: req.params.sessionId,
      error: error.message,
      errorStack: error.stack,
      timestamp: new Date().toISOString()
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
    const { candidate, sdpMLineIndex, source, from } = req.body;

    if (!candidate) {
      return res.status(400).json({ error: 'Candidate required' });
    }

    // Support both 'source' and 'from' parameters for backward compatibility
    // 'from' is used by webrtcbin implementation, 'source' by legacy code
    const candidateSource = from || source || 'client';

    // Store candidate with full data including sdpMLineIndex
    await signalingService.addICECandidate(
      sessionId,
      { candidate, sdpMLineIndex },
      candidateSource === 'vm' ? 'vm' : 'client'
    );

    logger.debug('ICE candidate added', {
      sessionId,
      source: candidateSource,
      sdpMLineIndex
    });

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
 * GET /api/webrtc/session/:sessionId/candidates/:type
 * Retrieve ICE candidates for VM or browser
 * @param {string} type - 'vm' or 'browser'
 * @query {number} since - Timestamp to filter candidates added after this time
 */
router.get('/session/:sessionId/candidates/:type', async (req, res) => {
  try {
    const { sessionId, type } = req.params;
    const { since } = req.query;

    if (type !== 'vm' && type !== 'browser') {
      return res.status(400).json({
        error: 'Invalid type parameter. Must be "vm" or "browser"'
      });
    }

    logger.debug('Retrieving ICE candidates', {
      sessionId,
      type,
      since: since ? new Date(parseInt(since)).toISOString() : 'all'
    });

    // Get session from signaling service
    const session = signalingService.sessions.get(sessionId);

    if (!session) {
      logger.debug('Session not found for ICE candidates', { sessionId });
      // Return 200 with empty candidates instead of 404
      return res.json({
        success: true,
        candidates: []
      });
    }

    // Get the appropriate candidates array
    const candidateKey = type === 'vm' ? 'vmCandidates' : 'clientCandidates';
    const allCandidates = session[candidateKey] || [];

    // Filter by timestamp if 'since' parameter provided
    let candidates = allCandidates;
    if (since) {
      const sinceTimestamp = parseInt(since);
      candidates = allCandidates.filter(c => {
        // Candidates should have a timestamp when added
        return c.timestamp ? c.timestamp > sinceTimestamp : true;
      });
    }

    logger.debug('Retrieved ICE candidates', {
      sessionId,
      type,
      totalCandidates: allCandidates.length,
      filteredCandidates: candidates.length
    });

    res.json({
      success: true,
      candidates: candidates.map(c => ({
        candidate: c.candidate,
        sdpMLineIndex: c.sdpMLineIndex || 0
      }))
    });

  } catch (error) {
    logger.error('Failed to retrieve ICE candidates', {
      sessionId: req.params.sessionId,
      type: req.params.type,
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
