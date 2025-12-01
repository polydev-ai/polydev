'use client';

/**
 * WebRTC Viewer Component
 *
 * Displays Browser VM desktop stream via WebRTC (replacing noVNC)
 * Target: <50ms latency vs 200ms noVNC
 *
 * Features:
 * - Low-latency video streaming
 * - Automatic reconnection
 * - Fallback to noVNC if WebRTC fails
 * - Connection quality indicators
 */

import { useEffect, useRef, useState, useCallback } from 'react';

interface WebRTCViewerProps {
  sessionId: string;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  onError?: (error: Error) => void;
  fallbackToNoVNC?: boolean;
  skipOfferCreation?: boolean;  // If true, assumes offer was already created and sent
}

export function WebRTCViewer({
  sessionId,
  onConnectionStateChange,
  onError,
  fallbackToNoVNC = true,
  skipOfferCreation = false  // Default to false - let WebRTCViewer create its own offer
}: WebRTCViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const isConnectingRef = useRef<boolean>(false);  // Track connection state
  const abortControllerRef = useRef<AbortController | null>(null);  // For cleanup
  const iceCandidatePollIntervalRef = useRef<NodeJS.Timeout | null>(null);  // ICE candidate polling

  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const [latency, setLatency] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [useFallback, setUseFallback] = useState(false);

  /**
   * Initialize WebRTC connection
   */
  const initWebRTC = useCallback(async () => {
    // Prevent re-initialization if already connecting/connected
    if (isConnectingRef.current || peerConnectionRef.current) {
      console.log('[WebRTC] Already connecting/connected, skipping initialization');
      return;
    }

    isConnectingRef.current = true;

    // Create abort controller for cleanup
    abortControllerRef.current = new AbortController();

    try {
      console.log('[WebRTC] Initializing connection for session:', sessionId);

      // Fetch ICE servers from backend
      const iceServersResponse = await fetch('/api/webrtc/ice-servers');
      const { iceServers } = await iceServersResponse.json();

      console.log('[WebRTC] ICE servers received:', iceServers.length);

      // Create RTCPeerConnection
      const pc = new RTCPeerConnection({ iceServers });
      peerConnectionRef.current = pc;

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log('[WebRTC] Connection state:', pc.connectionState);
        setConnectionState(pc.connectionState);
        onConnectionStateChange?.(pc.connectionState);

        // Fallback to noVNC if connection fails
        if (pc.connectionState === 'failed' && fallbackToNoVNC) {
          console.warn('[WebRTC] Connection failed, falling back to noVNC');
          setUseFallback(true);
        }
      };

      // Handle ICE connection state
      pc.oniceconnectionstatechange = () => {
        console.log('[WebRTC] ICE connection state:', pc.iceConnectionState);
      };

      // Handle ICE gathering state
      pc.onicegatheringstatechange = () => {
        console.log('[WebRTC] ICE gathering state:', pc.iceGatheringState);
      };

      // Send ICE candidates individually as they're generated
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          console.log('[WebRTC] Sending ICE candidate to server:', event.candidate.candidate.substring(0, 50));

          try {
            await fetch(`/api/webrtc/session/${sessionId}/candidate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                candidate: event.candidate.candidate,
                sdpMLineIndex: event.candidate.sdpMLineIndex,
                from: 'browser'
              })
            });
          } catch (err) {
            console.error('[WebRTC] Failed to send ICE candidate:', err);
          }
        } else {
          console.log('[WebRTC] ICE gathering complete');
        }
      };

      // Handle incoming media stream
      pc.ontrack = (event) => {
        console.log('[WebRTC] Received remote track:', event.track.kind);

        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
          console.log('[WebRTC] Video stream attached to element');
        }
      };

      // RACE CONDITION FIX: Always create offer locally, but skip POSTing if already done
      console.log('[WebRTC] Creating local offer for this peer connection...');

      // Create offer with video receive
      const offer = await pc.createOffer({
        offerToReceiveVideo: true,
        offerToReceiveAudio: false
      });

      await pc.setLocalDescription(offer);

      if (!skipOfferCreation) {
        console.log('[WebRTC] Sending offer to server (skipOfferCreation=false)...');

        // Send offer to signaling server
        await fetch(`/api/webrtc/session/${sessionId}/offer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            offer: pc.localDescription,
            candidates: []  // Candidates sent individually via trickle ICE
          })
        });

        console.log('[WebRTC] Offer sent, waiting for answer...');
      } else {
        console.log('[WebRTC] Skipping offer POST - offer already sent before VM creation (RACE FIX)');
        console.log('[WebRTC] Waiting for VM to process pre-stored offer and generate answer...');
      }

      // Poll for answer
      await pollForAnswer(pc);

      // Start polling for VM ICE candidates (trickle ICE)
      startVMICECandidatePolling(pc);

    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('[WebRTC] Initialization failed:', error.message);
      setError(error.message);
      onError?.(error);

      // Fallback to noVNC
      if (fallbackToNoVNC) {
        console.log('[WebRTC] Falling back to noVNC');
        setUseFallback(true);
      }
    } finally {
      isConnectingRef.current = false;
    }
  }, [sessionId, skipOfferCreation]);

  /**
   * Poll for VM's SDP answer
   */
  const pollForAnswer = async (pc: RTCPeerConnection, maxAttempts = 60) => {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(`/api/webrtc/session/${sessionId}/answer`);

        if (response.ok) {
          const responseData = await response.json();

          console.log('[WebRTC] Answer response data:', {
            keys: Object.keys(responseData),
            hasAnswer: 'answer' in responseData,
            hasRetry: 'retry' in responseData,
            answer: responseData.answer,
            answerType: responseData.answer?.type,
            answerSdpLength: responseData.answer?.sdp?.length
          });

          // Check if answer is not ready yet (retry flag)
          if (responseData.retry === true && !responseData.answer) {
            console.log('[WebRTC] Answer not ready yet, retrying...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }

          const { answer, candidates } = responseData;

          if (!answer || !answer.type || !answer.sdp) {
            console.error('[WebRTC] Invalid answer format:', { answer, responseData });
            throw new Error('Invalid answer format from server');
          }

          console.log('[WebRTC] Received valid answer from VM');

          // Set remote description
          await pc.setRemoteDescription(new RTCSessionDescription(answer));

          // Add ICE candidates
          for (const candidate of candidates) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }

          console.log('[WebRTC] Answer and candidates applied');
          return;
        }

        // Not ready yet, wait and retry
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (err) {
        console.error('[WebRTC] Error polling answer:', err);
      }
    }

    throw new Error('Timeout waiting for VM answer');
  };

  /**
   * Start polling for VM's ICE candidates (trickle ICE)
   */
  const startVMICECandidatePolling = (pc: RTCPeerConnection) => {
    let lastPollTimestamp = Date.now();

    iceCandidatePollIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/webrtc/session/${sessionId}/candidates/vm?since=${lastPollTimestamp}`
        );

        if (!response.ok) {
          // Ignore 404 errors (expected when no new candidates)
          if (response.status === 404) return;
          console.error('[WebRTC] Failed to poll VM candidates:', response.status);
          return;
        }

        const { candidates } = await response.json();

        if (candidates && candidates.length > 0) {
          console.log(`[WebRTC] Received ${candidates.length} VM ICE candidate(s)`);

          for (const candidateData of candidates) {
            const candidate = new RTCIceCandidate({
              candidate: candidateData.candidate,
              sdpMLineIndex: candidateData.sdpMLineIndex
            });
            await pc.addIceCandidate(candidate);
            console.log('[WebRTC] Added VM ICE candidate');
          }

          lastPollTimestamp = Date.now();
        }
      } catch (error) {
        console.error('[WebRTC] Failed to poll VM ICE candidates:', error);
      }
    }, 500);  // Poll every 500ms

    console.log('[WebRTC] Started polling for VM ICE candidates');
  };

  /**
   * Measure latency
   */
  const measureLatency = useCallback(() => {
    if (!peerConnectionRef.current) return;

    peerConnectionRef.current.getStats().then(stats => {
      stats.forEach(report => {
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          const rtt = report.currentRoundTripTime;
          if (rtt) {
            setLatency(Math.round(rtt * 1000)); // Convert to ms
          }
        }
      });
    });
  }, []);

  // Initialize WebRTC on mount
  useEffect(() => {
    initWebRTC();

    // Measure latency every 5 seconds
    const latencyInterval = setInterval(measureLatency, 5000);

    // Cleanup on unmount
    return () => {
      clearInterval(latencyInterval);

      // Stop polling for VM ICE candidates
      if (iceCandidatePollIntervalRef.current) {
        clearInterval(iceCandidatePollIntervalRef.current);
        iceCandidatePollIntervalRef.current = null;
      }

      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
    };
  }, [initWebRTC, measureLatency]);

  // Render fallback noVNC if WebRTC fails
  if (useFallback) {
    return (
      <div className="w-full h-full">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <p className="text-sm text-yellow-700">
            WebRTC connection unavailable. Using noVNC fallback.
          </p>
        </div>
        <iframe
          src={`/novnc?sessionId=${sessionId}`}
          className="w-full h-full border-0"
          title="Browser VM (noVNC)"
        />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black">
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-contain"
      />

      {/* Connection status overlay */}
      <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-2 rounded-lg text-sm">
        <div className="flex items-center gap-2">
          {/* Connection indicator */}
          <div
            className={`w-2 h-2 rounded-full ${
              connectionState === 'connected' ? 'bg-green-500' :
              connectionState === 'connecting' ? 'bg-yellow-500 animate-pulse' :
              connectionState === 'failed' ? 'bg-red-500' :
              'bg-gray-500'
            }`}
          />

          {/* State text */}
          <span className="capitalize">{connectionState}</span>

          {/* Latency indicator */}
          {connectionState === 'connected' && latency > 0 && (
            <span className="ml-2 text-xs text-gray-300">
              {latency}ms
            </span>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-2 text-xs text-red-300">
            {error}
          </div>
        )}
      </div>

      {/* Loading state */}
      {connectionState === 'new' || connectionState === 'connecting' ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4" />
            <p className="text-white text-sm">Establishing WebRTC connection...</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
