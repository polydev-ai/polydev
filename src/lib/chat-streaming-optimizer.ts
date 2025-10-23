/**
 * Chat Streaming Optimizer for OpenRouter Multi-Model Chat
 * Fixes jitter by buffering and batching updates with requestAnimationFrame
 */

export class ChatStreamingOptimizer {
  private buffers: Map<string, string> = new Map();
  private scheduledRenders: Map<string, boolean> = new Map();
  private renderCallbacks: Map<string, (content: string) => void> = new Map();

  /**
   * Register a model's render callback
   */
  registerModel(modelId: string, callback: (content: string) => void) {
    this.renderCallbacks.set(modelId, callback);
    this.buffers.set(modelId, '');
    this.scheduledRenders.set(modelId, false);
  }

  /**
   * Add a chunk to the buffer for a specific model
   * Uses requestAnimationFrame for smooth rendering
   */
  addChunk(modelId: string, token: string) {
    const currentBuffer = this.buffers.get(modelId) || '';
    this.buffers.set(modelId, currentBuffer + token);

    // Schedule render if not already scheduled
    if (!this.scheduledRenders.get(modelId)) {
      this.scheduledRenders.set(modelId, true);
      requestAnimationFrame(() => this.flushBuffer(modelId));
    }
  }

  /**
   * Flush buffer and call render callback
   */
  private flushBuffer(modelId: string) {
    const buffer = this.buffers.get(modelId);
    if (buffer && buffer.length > 0) {
      const callback = this.renderCallbacks.get(modelId);
      if (callback) {
        callback(buffer);
      }
      this.buffers.set(modelId, '');
    }
    this.scheduledRenders.set(modelId, false);
  }

  /**
   * Force flush all buffers (for stream end)
   */
  flushAll() {
    for (const [modelId] of this.buffers) {
      this.flushBuffer(modelId);
    }
  }

  /**
   * Clear a model's buffer
   */
  clear(modelId: string) {
    this.buffers.delete(modelId);
    this.scheduledRenders.delete(modelId);
    this.renderCallbacks.delete(modelId);
  }

  /**
   * Clear all buffers
   */
  clearAll() {
    this.buffers.clear();
    this.scheduledRenders.clear();
    this.renderCallbacks.clear();
  }
}

export const chatStreamingOptimizer = new ChatStreamingOptimizer();
