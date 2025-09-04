import { ApiHandler } from '../index'
import { ApiHandlerOptions, ModelInfo } from '../../../types/providers'

export class ClaudeCodeHandler implements ApiHandler {
  async createMessage(options: ApiHandlerOptions): Promise<Response> {
    try {
      // Use the MCP server bridge to communicate with Claude Code CLI
      const response = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          server: 'claude-code-cli-bridge',
          tool: 'send_to_claude_code',
          args: {
            message: this.formatMessagesForCLI(options.messages || []),
            system_prompt: options.systemPrompt,
            model: options.model || 'claude-3.5-sonnet'
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Claude Code CLI request failed: ${response.statusText}`)
      }

      const result = await response.json()
      
      // Transform MCP response to standard API response format
      return new Response(JSON.stringify({
        id: `claude-${Date.now()}`,
        type: 'message',
        role: 'assistant',
        content: [{
          type: 'text',
          text: result.result || result.content || 'No response from Claude Code CLI'
        }],
        model: options.model || 'claude-3.5-sonnet',
        usage: {
          input_tokens: this.estimateTokens(options.messages || []),
          output_tokens: this.estimateTokens([{ role: 'assistant', content: result.result || '' }])
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (error) {
      console.error('Claude Code CLI error:', error)
      throw new Error(`Claude Code CLI failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  async streamMessage(options: ApiHandlerOptions): Promise<ReadableStream> {
    // For CLI tools, we'll convert to non-streaming for simplicity
    const response = await this.createMessage(options)
    const data = await response.json()
    
    return new ReadableStream({
      start(controller) {
        const content = data.content?.[0]?.text || ''
        const chunks = content.split(' ')
        
        chunks.forEach((chunk: string, index: number) => {
          const streamChunk = {
            type: 'content_block_delta',
            index: 0,
            delta: {
              type: 'text_delta',
              text: chunk + (index < chunks.length - 1 ? ' ' : '')
            }
          }
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(streamChunk)}\n\n`))
        })
        
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
        controller.close()
      }
    })
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    // CLI authentication is handled by the CLI itself
    try {
      const response = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          server: 'claude-code-cli-bridge',
          tool: 'check_claude_code_status',
          args: {}
        })
      })

      if (!response.ok) {
        return false
      }

      const result = await response.json()
      return !result.result?.includes('❌')
    } catch {
      return false
    }
  }

  async getModels(): Promise<ModelInfo[]> {
    return [
      {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 3.0,
        outputPrice: 15.0,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: true,
        description: 'Claude 3.5 Sonnet (via Claude Code CLI)'
      },
      {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 0.25,
        outputPrice: 1.25,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: 'Claude 3.5 Haiku (via Claude Code CLI)'
      },
      {
        maxTokens: 8192,
        contextWindow: 200000,
        inputPrice: 15.0,
        outputPrice: 75.0,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: true,
        description: 'Claude 3 Opus (via Claude Code CLI)'
      }
    ]
  }

  private formatMessagesForCLI(messages: any[]): string {
    return messages.map(msg => {
      if (msg.role === 'system') {
        return `System: ${msg.content}`
      }
      return `${msg.role}: ${msg.content}`
    }).join('\n\n')
  }

  private estimateTokens(messages: any[]): number {
    // Simple token estimation - roughly 4 characters per token
    const text = messages.map(m => m.content || '').join(' ')
    return Math.ceil(text.length / 4)
  }
}