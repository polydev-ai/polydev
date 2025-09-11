import { ApiHandler } from '../index'
import { ApiHandlerOptions, ModelInfo } from '../../../types/providers'

export class CodexCLIHandler implements ApiHandler {
  async createMessage(options: ApiHandlerOptions): Promise<Response> {
    try {
      // Use the MCP server bridge to communicate with Codex CLI
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.polydev.ai'
            const controller = this.createAbortController()
      const response = await fetch(`${baseUrl}/api/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          server: 'cross-llm-bridge-test',
          tool: 'send_to_codex',
          args: {
            message: this.formatMessagesForCLI(options.messages || []),
            system_prompt: options.systemPrompt
          }
        
      })

      if (!response.ok) {
        throw new Error(`Codex CLI request failed: ${response.statusText}`)
      }

      const result = await response.json()
      
      // Transform MCP response to standard API response format
      return new Response(JSON.stringify({
        choices: [{
          message: {
            role: 'assistant',
            content: result.result || result.content || 'No response from Codex CLI'
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: this.estimateTokens(options.messages || []),
          completion_tokens: this.estimateTokens([{ role: 'assistant', content: result.result || '' }]),
          total_tokens: 0
        },
        model: options.model || 'gpt-5'
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (error) {
      console.error('Codex CLI error:', error)
      throw new Error(`Codex CLI failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  async streamMessage(options: ApiHandlerOptions): Promise<ReadableStream> {
    // For CLI tools, we'll convert to non-streaming for simplicity
    const response = await this.createMessage(options)
    const data = await response.json()
    
    return new ReadableStream({
      start(controller) {
        const content = data.choices[0]?.message?.content || ''
        const chunks = content.split(' ')
        
        chunks.forEach((chunk: string, index: number) => {
          const streamChunk = {
            choices: [{
              delta: {
                content: chunk + (index < chunks.length - 1 ? ' ' : '')
              }
            }]
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
      const response = await fetch(`${baseUrl}/api/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          server: 'cross-llm-bridge-test',
          tool: 'check_codex_status',
          args: {}
        
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
        maxTokens: 128000,
        contextWindow: 128000,
        inputPrice: 2.5,
        outputPrice: 10.0,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: 'GPT-5 (via Codex CLI)'
      },
      {
        maxTokens: 128000,
        contextWindow: 128000,
        inputPrice: 2.5,
        outputPrice: 10.0,
        supportsImages: true,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: 'GPT-4o (via Codex CLI)'
      },
      {
        maxTokens: 200000,
        contextWindow: 200000,
        inputPrice: 15.0,
        outputPrice: 75.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: 'o1-preview (via Codex CLI)'
      },
      {
        maxTokens: 65536,
        contextWindow: 128000,
        inputPrice: 3.0,
        outputPrice: 12.0,
        supportsImages: false,
        supportsPromptCache: false,
        supportsComputerUse: false,
        description: 'o1-mini (via Codex CLI)'
      }
    ]
  }

  private formatMessagesForCLI(messages: any[]): string {
    return messages.map(msg => `${msg.role}: ${msg.content}`).join('\n\n')
  }

  private estimateTokens(messages: any[]): number {
    // Simple token estimation - roughly 4 characters per token
    const text = messages.map(m => m.content || '').join(' ')
    return Math.ceil(text.length / 4)
  }
}