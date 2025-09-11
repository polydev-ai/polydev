import { ApiHandler } from '../index'
import { ApiHandlerOptions, ModelInfo } from '../../../types/providers'

export class GeminiCLIHandler implements ApiHandler {
  async createMessage(options: ApiHandlerOptions): Promise<Response> {
    try {
      // Use the MCP server bridge to communicate with Gemini CLI
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.polydev.ai'
            const controller = this.createAbortController()
      const response = await fetch(`${baseUrl}/api/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          server: 'gemini-cli-bridge',
          tool: 'send_to_gemini',
          args: {
            message: this.formatMessagesForCLI(options.messages || []),
            system_prompt: options.systemPrompt,
            model: options.model || 'gemini-2.0-flash'
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Gemini CLI request failed: ${response.statusText}`)
      }

      const result = await response.json()
      
      // Transform MCP response to standard API response format
      return new Response(JSON.stringify({
        id: `gemini-${Date.now()}`,
        type: 'message',
        role: 'assistant',
        content: [{
          type: 'text',
          text: result.result || result.content || 'No response from Gemini CLI'
        }],
        model: options.model || 'gemini-2.0-flash',
        usage: {
          input_tokens: this.estimateTokens(options.messages || []),
          output_tokens: this.estimateTokens([{ role: 'assistant', content: result.result || '' }])
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (error) {
      console.error('Gemini CLI error:', error)
      throw new Error(`Gemini CLI failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.polydev.ai'
            const controller = this.createAbortController()
      const response = await fetch(`${baseUrl}/api/cli-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          server: 'gemini-cli-bridge',
          tool: 'check_gemini_status',
          args: {}
        
      })

      if (!response.ok) {
        return false
      }

      const result = await response.json()
      return result.available === true
    } catch {
      return false
    }
  }

  async getModels(): Promise<ModelInfo[]> {
    return [
      {
        maxTokens: 8192,
        contextWindow: 1000000,
        inputPrice: 0.075,
        outputPrice: 0.3,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: 'Gemini 2.0 Flash (via Google Cloud CLI)'
      },
      {
        maxTokens: 8192,
        contextWindow: 2000000,
        inputPrice: 1.25,
        outputPrice: 5.0,
        supportsImages: true,
        supportsPromptCache: true,
        supportsComputerUse: false,
        description: 'Gemini 1.5 Pro (via Google Cloud CLI)'
      },
      {
        maxTokens: 8192,
        contextWindow: 1000000,
        inputPrice: 0.075,
        outputPrice: 0.3,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: 'Gemini 1.5 Flash (via Google Cloud CLI)'
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