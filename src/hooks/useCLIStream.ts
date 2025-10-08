import { useState, useCallback, useRef } from 'react';

type Provider = 'codex_cli' | 'claude_code' | 'gemini_cli';

interface StreamState {
  streaming: boolean;
  response: string;
  error: string | null;
  sessionId: string | null;
}

export function useCLIStream() {
  const [state, setState] = useState<StreamState>({
    streaming: false,
    response: '',
    error: null,
    sessionId: null
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const sendPrompt = useCallback(async (prompt: string, provider: Provider) => {
    try {
      // Cancel any existing stream
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      setState({
        streaming: true,
        response: '',
        error: null,
        sessionId: crypto.randomUUID()
      });

      const response = await fetch('/api/vm/cli/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, provider }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send prompt');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // Read the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (data === '[DONE]') {
              setState(prev => ({
                ...prev,
                streaming: false
              }));
              break;
            }

            try {
              const parsed = JSON.parse(data);

              if (parsed.error) {
                throw new Error(parsed.error);
              }

              if (parsed.chunk) {
                fullResponse += parsed.chunk;
                setState(prev => ({
                  ...prev,
                  response: fullResponse
                }));
              }
            } catch (e) {
              // If it's not JSON, treat as plain text chunk
              if (data && data !== '[DONE]') {
                fullResponse += data;
                setState(prev => ({
                  ...prev,
                  response: fullResponse
                }));
              }
            }
          }
        }
      }

      setState(prev => ({
        ...prev,
        streaming: false
      }));

      return fullResponse;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setState(prev => ({
          ...prev,
          streaming: false,
          error: 'Stream cancelled'
        }));
      } else {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        setState(prev => ({
          ...prev,
          streaming: false,
          error: errorMsg
        }));
      }
      throw err;
    }
  }, []);

  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState(prev => ({
      ...prev,
      streaming: false
    }));
  }, []);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState({
      streaming: false,
      response: '',
      error: null,
      sessionId: null
    });
  }, []);

  return {
    ...state,
    sendPrompt,
    stopStream,
    reset
  };
}
