/**
 * WebRTC Utility Functions
 *
 * Provides helper functions for WebRTC offer/answer generation
 * Used to fix race condition where VMs boot before offers are created
 */

export interface WebRTCOfferData {
  offer: RTCSessionDescriptionInit;
  candidates: RTCIceCandidateInit[];
}

/**
 * Generate WebRTC offer early (before session/VM creation)
 *
 * This function creates a temporary RTCPeerConnection, generates an offer,
 * and returns the offer data WITHOUT establishing a connection.
 *
 * The offer can then be sent to the backend BEFORE VM creation,
 * eliminating the race condition where VMs poll for offers that don't exist yet.
 *
 * @param iceServers - Optional ICE servers (STUN/TURN). If not provided, uses default STUN servers.
 * @returns Promise<WebRTCOfferData> - The generated offer and initial ICE candidates
 */
export async function generateEarlyWebRTCOffer(
  iceServers?: RTCIceServer[]
): Promise<WebRTCOfferData> {
  console.log('[WebRTC-Utils] Generating early offer (before VM creation)');

  // Use provided ICE servers or fetch from backend
  let finalIceServers = iceServers;
  if (!finalIceServers) {
    try {
      const response = await fetch('/api/webrtc/ice-servers');
      if (response.ok) {
        const data = await response.json();
        finalIceServers = data.iceServers;
        console.log('[WebRTC-Utils] Fetched ICE servers:', finalIceServers?.length || 0);
      }
    } catch (err) {
      console.warn('[WebRTC-Utils] Failed to fetch ICE servers, using defaults');
    }
  }

  // Fallback to public STUN servers if none provided
  if (!finalIceServers || finalIceServers.length === 0) {
    finalIceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ];
    console.log('[WebRTC-Utils] Using default STUN servers');
  }

  // Create temporary peer connection
  const pc = new RTCPeerConnection({ iceServers: finalIceServers });

  try {
    // Create offer with video receive
    const offer = await pc.createOffer({
      offerToReceiveVideo: true,
      offerToReceiveAudio: false
    });

    await pc.setLocalDescription(offer);

    console.log('[WebRTC-Utils] Offer generated successfully');

    // Wait for ICE gathering to complete (or timeout after 3 seconds)
    const candidates: RTCIceCandidateInit[] = [];

    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        console.log('[WebRTC-Utils] ICE gathering timeout (3s), proceeding with candidates collected so far');
        resolve();
      }, 3000);

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          candidates.push({
            candidate: event.candidate.candidate,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            sdpMid: event.candidate.sdpMid
          });
          console.log('[WebRTC-Utils] ICE candidate gathered:', candidates.length);
        } else {
          // ICE gathering complete
          clearTimeout(timeout);
          console.log('[WebRTC-Utils] ICE gathering complete');
          resolve();
        }
      };
    });

    console.log('[WebRTC-Utils] Generated offer with', candidates.length, 'candidates');

    return {
      offer: {
        type: offer.type,
        sdp: offer.sdp || ''
      },
      candidates
    };
  } finally {
    // Close temporary connection
    pc.close();
    console.log('[WebRTC-Utils] Temporary peer connection closed');
  }
}

/**
 * Create RTCPeerConnection with pre-existing offer
 *
 * Used by WebRTCViewer when an offer was already generated and sent to the backend.
 * This prevents creating duplicate offers and maintains consistency.
 *
 * @param sessionId - Session ID for this WebRTC connection
 * @param existingOffer - The offer that was already generated and sent to backend
 * @param iceServers - ICE servers to use
 * @returns RTCPeerConnection - Configured peer connection ready for answer
 */
export async function createPeerConnectionWithExistingOffer(
  sessionId: string,
  existingOffer: RTCSessionDescriptionInit,
  iceServers: RTCIceServer[]
): Promise<RTCPeerConnection> {
  console.log('[WebRTC-Utils] Creating peer connection with existing offer');

  const pc = new RTCPeerConnection({ iceServers });

  // Set the pre-existing offer as local description
  await pc.setLocalDescription(existingOffer);

  console.log('[WebRTC-Utils] Set existing offer as local description');

  return pc;
}
