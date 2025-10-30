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
}

export function WebRTCViewer({
  sessionId,
  onConnectionStateChange,
  onError,
  fallbackToNoVNC = true
}: WebRTCViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const [latency, setLatency] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [useFallback, setUseFallback] = useState(false);

  /**
   * Initialize WebRTC connection
   */
  const initWebRTC = useCallback(async () => {
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

      // Collect ICE candidates
      const iceCandidates: RTCIceCandidate[] = [];

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('[WebRTC] ICE candidate:', event.candidate.candidate.substring(0, 50));
          iceCandidates.push(event.candidate);
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

      // Create offer with video receive
      const offer = await pc.createOffer({
        offerToReceiveVideo: true,
        offerToReceiveAudio: false
      });

      await pc.setLocalDescription(offer);

      console.log('[WebRTC] Created offer, sending to server...');

      // Send offer to signaling server
      await fetch(`/api/webrtc/session/${sessionId}/offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offer: pc.localDescription,
          candidates: iceCandidates
        })
      });

      console.log('[WebRTC] Offer sent, waiting for answer...');

      // Poll for answer
      await pollForAnswer(pc);

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
    }
  }, [sessionId, onConnectionStateChange, onError, fallbackToNoVNC]);

  /**
   * Poll for VM's SDP answer
   */
  const pollForAnswer = async (pc: RTCPeerConnection, maxAttempts = 30) => {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(`/api/webrtc/session/${sessionId}/answer`);

        if (response.ok) {
          const { answer, candidates } = await response.json();

          console.log('[WebRTC] Received answer from VM');

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
