import { StreamChunk } from '../index'
import { ApiHandlerOptions } from '../../../types/providers'
import { AnthropicTransformer } from '../transform'

export class AnthropicHandler {
  private transformer = new AnthropicTransformer()
  private baseUrl = 'https://api.anthropic.com'
  
  private createAbortController(timeoutMs: number = 30000): AbortController {
    // Ensure timeout is valid (not undefined, null, Infinity, or negative)
    if (!timeoutMs || timeoutMs === Infinity || timeoutMs < 1 || timeoutMs > 300000) {
      timeoutMs = 30000 // Default to 30 seconds
    }
    
    const controller = new AbortController()
    setTimeout(() => controller.abort(), timeoutMs)
    return controller
  }
  
  async createMessage(options: ApiHandlerOptions): Promise<Response> {
    const { apiKey } = options
    
    if (!apiKey) {
      throw new Error('API key is required for Anthropic')
    }
    
    // Use the model ID as provided (model name resolution is handled at the API route level)
    const requestBody = this.transformer.transformRequest(options)
    requestBody.stream = false // Non-streaming request
    
    const controller = this.createAbortController()
    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Anthropic API error: ${error}`)
    }
    
    return response
  }
  
  async streamMessage(options: ApiHandlerOptions): Promise<ReadableStream> {
    const { apiKey } = options
    
    if (!apiKey) {
      throw new Error('API key is required for Anthropic')
    }
    
    // Use the model ID as provided (model name resolution is handled at the API route level)
    const requestBody = this.transformer.transformRequest(options)
    
    const controller = this.createAbortController()
    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Anthropic API error: ${error}`)
    }
    
    if (!response.body) {
      throw new Error('No response body received')
    }
    
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    const transformer = this.transformer
    
    return new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read()
            
            if (done) {
              controller.close()
              break
            }
            
            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n')
            
            for (const line of lines) {
              if (line.trim()) {
                const transformed = transformer.transformStreamChunk(line)
                if (transformed) {
                  controller.enqueue(new TextEncoder().encode(JSON.stringify(transformed) + '\n'))
                  
                  if (transformed.type === 'done') {
                    controller.close()
                    return
                  }
                }
              }
            }
          }
        } catch (error) {
          controller.error(error)
        }
      }
    })
  }
  
  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const controller = this.createAbortController(10000) // 10 second timeout for validation
      const response = await fetch(`${this.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 1
        }),
        signal: controller.signal
      })
      
      // If we get a 401, the API key is invalid
      if (response.status === 401) {
        return false
      }
      
      // Any other response (including 400 for invalid request) means the API key is valid
      return true
    } catch (error) {
      console.error('Error validating Anthropic API key:', error)
      return false
    }
  }
}