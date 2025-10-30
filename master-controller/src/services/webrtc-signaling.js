/**
 * WebRTC Signaling Service
 *
 * Handles WebRTC signaling for Browser VM connections
 * Replaces noVNC with WebRTC for <50ms latency
 *
 * Features:
 * - SDP offer/answer exchange
 * - ICE candidate exchange
 * - Session management
 * - TURN/STUN server configuration
 */

const logger = require('../utils/logger').module('webrtc-signaling');
const { db } = require('../db/supabase');

class WebRTCSignalingService {
  constructor() {
    // TURN/STUN server configuration
    this.iceServers = [
      {
        urls: 'stun:135.181.138.102:3478'
      },
      {
        urls: 'turn:135.181.138.102:3478',
        username: 'polydev',
        credential: 'PolydevWebRTC2025!'
      },
      {
        urls: 'turns:135.181.138.102:5349',
        username: 'polydev',
        credential: 'PolydevWebRTC2025!'
      },
      // Google's public STUN as fallback
      {
        urls: 'stun:stun.l.google.com:19302'
      }
    ];

    // Active signaling sessions
    this.sessions = new Map(); // sessionId -> { offers, answers, candidates }

    logger.info('WebRTC Signaling Service initialized', {
      iceServers: this.iceServers.length
    });
  }

  /**
   * Get ICE server configuration for a session
   * @param {string} sessionId - Session ID
   * @returns {Array} ICE servers configuration
   */
  getICEServers(sessionId) {
    logger.debug('Providing ICE servers', { sessionId });
    return this.iceServers;
  }

  /**
   * Store client's SDP offer
   * @param {string} sessionId - Session ID
   * @param {Object} offer - WebRTC SDP offer
   * @param {Array} candidates - ICE candidates from client
   */
  async storeOffer(sessionId, offer, candidates = []) {
    try {
      logger.info('Storing WebRTC offer', {
        sessionId,
        offerType: offer.type,
        candidateCount: candidates.length
      });

      // Store in memory for fast access
      this.sessions.set(sessionId, {
        clientOffer: offer,
        clientCandidates: candidates,
        vmAnswer: null,
        vmCandidates: [],
        createdAt: Date.now()
      });

      // Also persist to database
      await db.authSessions.update(sessionId, {
        webrtc_offer: JSON.stringify(offer),
        webrtc_client_candidates: JSON.stringify(candidates),
        updated_at: new Date().toISOString()
      });

      logger.info('Offer stored successfully', { sessionId });

      return { success: true };

    } catch (error) {
      logger.error('Failed to store offer', {
        sessionId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Store VM's SDP answer
   * @param {string} sessionId - Session ID
   * @param {Object} answer - WebRTC SDP answer
   * @param {Array} candidates - ICE candidates from VM
   */
  async storeAnswer(sessionId, answer, candidates = []) {
    try {
      logger.info('Storing WebRTC answer from VM', {
        sessionId,
        answerType: answer.type,
        candidateCount: candidates.length
      });

      // Get existing session
      const session = this.sessions.get(sessionId) || {};

      // Update with answer
      this.sessions.set(sessionId, {
        ...session,
        vmAnswer: answer,
        vmCandidates: candidates,
        answeredAt: Date.now()
      });

      // Persist to database
      await db.authSessions.update(sessionId, {
        webrtc_answer: JSON.stringify(answer),
        webrtc_vm_candidates: JSON.stringify(candidates),
        updated_at: new Date().toISOString()
      });

      logger.info('Answer stored successfully', { sessionId });

      return { success: true };

    } catch (error) {
      logger.error('Failed to store answer', {
        sessionId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get VM's SDP answer (for client)
   * @param {string} sessionId - Session ID
   * @returns {Object|null} Answer and candidates, or null if not ready
   */
  async getAnswer(sessionId) {
    try {
      // Check memory first (faster)
      const session = this.sessions.get(sessionId);
      if (session?.vmAnswer) {
        logger.debug('Answer retrieved from memory', { sessionId });
        return {
          answer: session.vmAnswer,
          candidates: session.vmCandidates || []
        };
      }

      // Fallback to database
      const { data } = await db.authSessions.findById(sessionId);

      if (!data?.webrtc_answer) {
        logger.debug('Answer not ready yet', { sessionId });
        return null;
      }

      const answer = {
        answer: JSON.parse(data.webrtc_answer),
        candidates: JSON.parse(data.webrtc_vm_candidates || '[]')
      };

      logger.debug('Answer retrieved from database', {
        sessionId,
        candidateCount: answer.candidates.length
      });

      return answer;

    } catch (error) {
      logger.error('Failed to get answer', {
        sessionId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Get client's offer (for VM)
   * @param {string} sessionId - Session ID
   * @returns {Object|null} Offer and candidates, or null if not found
   */
  async getOffer(sessionId) {
    try {
      // Check memory first
      const session = this.sessions.get(sessionId);
      if (session?.clientOffer) {
        logger.debug('Offer retrieved from memory', { sessionId });
        return {
          offer: session.clientOffer,
          candidates: session.clientCandidates || []
        };
      }

      // Fallback to database
      const { data } = await db.authSessions.findById(sessionId);

      if (!data?.webrtc_offer) {
        logger.debug('Offer not found', { sessionId });
        return null;
      }

      const offer = {
        offer: JSON.parse(data.webrtc_offer),
        candidates: JSON.parse(data.webrtc_client_candidates || '[]')
      };

      logger.debug('Offer retrieved from database', {
        sessionId,
        candidateCount: offer.candidates.length
      });

      return offer;

    } catch (error) {
      logger.error('Failed to get offer', {
        sessionId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Add ICE candidate
   * @param {string} sessionId - Session ID
   * @param {Object} candidate - ICE candidate
   * @param {string} source - 'client' or 'vm'
   */
  async addICECandidate(sessionId, candidate, source = 'client') {
    try {
      logger.debug('Adding ICE candidate', {
        sessionId,
        source,
        candidate: candidate.candidate?.substring(0, 50) + '...'
      });

      const session = this.sessions.get(sessionId) || {};
      const candidateKey = source === 'client' ? 'clientCandidates' : 'vmCandidates';

      const candidates = session[candidateKey] || [];
      candidates.push(candidate);

      this.sessions.set(sessionId, {
        ...session,
        [candidateKey]: candidates
      });

      return { success: true };

    } catch (error) {
      logger.error('Failed to add ICE candidate', {
        sessionId,
        source,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Cleanup session data
   * @param {string} sessionId - Session ID
   */
  cleanup(sessionId) {
    logger.info('Cleaning up WebRTC session', { sessionId });
    this.sessions.delete(sessionId);
  }

  /**
   * Get signaling stats
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      activeSessions: this.sessions.size,
      iceServers: this.iceServers.length
    };
  }
}

// Singleton instance
let signalingServiceInstance = null;

/**
 * Get WebRTC Signaling Service singleton
 * @returns {WebRTCSignalingService}
 */
function getWebRTCSignalingService() {
  if (!signalingServiceInstance) {
    signalingServiceInstance = new WebRTCSignalingService();
  }
  return signalingServiceInstance;
}

module.exports = {
  WebRTCSignalingService,
  getWebRTCSignalingService
};
