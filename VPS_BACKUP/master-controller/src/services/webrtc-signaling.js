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

      // Also persist to database (upsert to handle new or existing sessions)
      await db.authSessions.upsert(sessionId, {
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
      logger.info('[WEBRTC-SIGNALING] Storing WebRTC answer from VM', {
        sessionId,
        answerType: answer.type,
        answerSdpLength: answer.sdp?.length || 0,
        candidateCount: candidates.length,
        timestamp: new Date().toISOString()
      });

      // Get existing session
      const session = this.sessions.get(sessionId) || {};
      logger.debug('[WEBRTC-SIGNALING] Existing session data', {
        sessionId,
        hasExistingSession: !!session.clientOffer,
        existingKeys: Object.keys(session)
      });

      // Update with answer
      this.sessions.set(sessionId, {
        ...session,
        vmAnswer: answer,
        vmCandidates: candidates,
        answeredAt: Date.now()
      });

      logger.debug('[WEBRTC-SIGNALING] Answer stored in memory', {
        sessionId,
        memoryVerification: this.sessions.get(sessionId)?.vmAnswer ? 'SUCCESS' : 'FAILED'
      });

      // Persist to database
      logger.debug('[WEBRTC-SIGNALING] Persisting answer to database', {
        sessionId,
        dbUpdatePayload: {
          webrtc_answer: `<SDP ${answer.sdp?.length || 0} bytes>`,
          webrtc_vm_candidates: `<${candidates.length} candidates>`
        }
      });

      const dbResult = await db.authSessions.upsert(sessionId, {
        webrtc_answer: JSON.stringify(answer),
        webrtc_vm_candidates: JSON.stringify(candidates),
        updated_at: new Date().toISOString()
      });

      logger.info('[WEBRTC-SIGNALING] Answer stored successfully', {
        sessionId,
        dbResult,
        memorySessions: this.sessions.size
      });

      return { success: true };

    } catch (error) {
      logger.error('[WEBRTC-SIGNALING] Failed to store answer', {
        sessionId,
        errorMessage: error.message,
        errorStack: error.stack,
        timestamp: new Date().toISOString()
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
      logger.debug('[WEBRTC-SIGNALING] Checking for answer', {
        sessionId,
        memorySessions: Array.from(this.sessions.keys()).slice(0, 5),
        totalSessions: this.sessions.size,
        timestamp: new Date().toISOString()
      });

      // Check memory first (faster)
      const session = this.sessions.get(sessionId);
      if (session?.vmAnswer) {
        logger.info('[WEBRTC-SIGNALING] Answer retrieved from memory', {
          sessionId,
          answerType: session.vmAnswer.type,
          candidateCount: session.vmCandidates?.length || 0
        });
        return {
          answer: session.vmAnswer,
          candidates: session.vmCandidates || []
        };
      }

      logger.debug('[WEBRTC-SIGNALING] Not in memory, checking database', { sessionId });

      // Fallback to database
      const data = await db.authSessions.findById(sessionId);

      logger.debug('[WEBRTC-SIGNALING] Database query result', {
        sessionId,
        found: !!data,
        hasAnswer: !!data?.webrtc_answer,
        dbData: data ? { id: data.id, hasAnswer: !!data.webrtc_answer, hasCandidates: !!data.webrtc_vm_candidates } : null
      });

      if (!data?.webrtc_answer) {
        logger.warn('[WEBRTC-SIGNALING] Answer not ready', {
          sessionId,
          reason: !data ? 'Session not found' : 'No answer field',
          allDataFields: data ? Object.keys(data) : null
        });
        return null;
      }

      const answer = {
        answer: JSON.parse(data.webrtc_answer),
        candidates: JSON.parse(data.webrtc_vm_candidates || '[]')
      };

      logger.info('[WEBRTC-SIGNALING] Answer retrieved from database', {
        sessionId,
        answerType: answer.answer.type,
        candidateCount: answer.candidates.length
      });

      return answer;

    } catch (error) {
      logger.error('[WEBRTC-SIGNALING] Failed to get answer', {
        sessionId,
        errorMessage: error.message,
        errorStack: error.stack,
        timestamp: new Date().toISOString()
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
      const data = await db.authSessions.findById(sessionId);

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

      // Add timestamp for filtering
      const candidateWithTimestamp = {
        ...candidate,
        timestamp: Date.now()
      };

      candidates.push(candidateWithTimestamp);

      this.sessions.set(sessionId, {
        ...session,
        [candidateKey]: candidates
      });

      logger.debug('ICE candidate stored', {
        sessionId,
        source,
        totalCandidates: candidates.length,
        timestamp: candidateWithTimestamp.timestamp
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
