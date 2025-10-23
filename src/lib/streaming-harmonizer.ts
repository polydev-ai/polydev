/**
 * Streaming Harmonizer: Normalizes provider-specific streams into a unified format
 * Handles OpenAI, Gemini, Claude, and other providers with consistent buffering
 */

export interface StreamNormalizerOptions {
  provider: 'openai' | 'gemini' | 'claude' | 'anthropic' | 'google' | 'xai' | 'cerebras';
  model: string;
  rechunkSize?: number; // For Gemini re-chunking (default 30 chars)
  rechunkDelay?: number; // Delay between chunks in ms (default 10ms)
}

export class StreamNormalizer {
  private provider: string;
  private rechunkSize: number;
  private rechunkDelay: number;

  constructor(options: StreamNormalizerOptions) {
    this.provider = options.provider;
    this.rechunkSize = options.rechunkSize || 30;
    this.rechunkDelay = options.rechunkDelay || 10;
  }

  /**
   * Normalize any provider stream into unified SSE format
   * Yields: data: {"type": "delta", "token": "..."}\n\n
   */
  async *normalizeStream(
    stream: ReadableStream<Uint8Array>
  ): AsyncGenerator<string> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        if (this.provider === 'openai') {
          yield* this.handleOpenAI(chunk);
        } else if (this.provider === 'gemini') {
          yield* this.handleGemini(chunk);
        } else if (this.provider === 'claude' || this.provider === 'anthropic') {
          yield* this.handleClaude(chunk);
        } else if (this.provider === 'xai') {
          yield* this.handleXAI(chunk);
        } else if (this.provider === 'cerebras') {
          yield* this.handleCerebras(chunk);
        }
      }
    } finally {
      reader.releaseLock();
    }

    // End signal
    yield `data: ${JSON.stringify({ type: 'end' })}\n\n`;
  }

  /**
   * OpenAI SSE format: data: {"choices":[{"delta":{"content":"..."}}]}
   */
  private async *handleOpenAI(chunk: string) {
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const content =
            parsed.choices?.[0]?.delta?.content ||
            parsed.choices?.[0]?.text;

          if (content) {
            yield `data: ${JSON.stringify({
              type: 'delta',
              token: content,
            })}\n\n`;
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }

  /**
   * Gemini: Often sends larger chunks
   * Re-chunk for smoother rendering
   */
  private async *handleGemini(chunk: string) {
    let buffer = chunk;

    // Re-chunk large Gemini responses
    while (buffer.length > this.rechunkSize) {
      const token = buffer.substring(0, this.rechunkSize);
      yield `data: ${JSON.stringify({
        type: 'delta',
        token,
      })}\n\n`;

      buffer = buffer.substring(this.rechunkSize);

      // Artificial delay for smooth pacing
      await this.delay(this.rechunkDelay);
    }

    // Send remaining
    if (buffer.length > 0) {
      yield `data: ${JSON.stringify({
        type: 'delta',
        token: buffer,
      })}\n\n`;
    }
  }

  /**
   * Claude/Anthropic SSE format: event: content_block_delta
   * data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"..."}}
   */
  private async *handleClaude(chunk: string) {
    const lines = chunk.split('\n');
    let eventType = '';

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        eventType = line.slice(7);
      } else if (line.startsWith('data: ')) {
        const data = line.slice(6);

        try {
          const parsed = JSON.parse(data);

          if (
            eventType === 'content_block_delta' &&
            parsed.delta?.type === 'text_delta'
          ) {
            yield `data: ${JSON.stringify({
              type: 'delta',
              token: parsed.delta.text,
            })}\n\n`;
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }

  /**
   * X-AI (Grok) SSE format: Similar to OpenAI
   */
  private async *handleXAI(chunk: string) {
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const content =
            parsed.choices?.[0]?.delta?.content ||
            parsed.choices?.[0]?.text;

          if (content) {
            yield `data: ${JSON.stringify({
              type: 'delta',
              token: content,
            })}\n\n`;
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }

  /**
   * Cerebras: Standard OpenAI-compatible format
   */
  private async *handleCerebras(chunk: string) {
    yield* this.handleOpenAI(chunk);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
