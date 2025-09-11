import { ApiHandlerOptions } from '../../../types/providers'
import { GoogleTransformer } from '../transform'

export class GoogleHandler {
  private transformer = new GoogleTransformer()
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta'
  
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
    const { apiKey, model } = options
    
    if (!apiKey) {
      throw new Error('API key is required for Google AI')
    }
    
    // Use the model ID as provided (model name resolution is handled at the API route level)
    const requestBody = this.transformer.transformRequest(options)
    
    const controller = this.createAbortController()
    const response = await fetch(`${this.baseUrl}/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Google AI API error: ${error}`)
    }
    
    return response
  }
  
  async streamMessage(options: ApiHandlerOptions): Promise<ReadableStream> {
    const { apiKey, model } = options
    
    if (!apiKey) {
      throw new Error('API key is required for Google AI')
    }
    
    const requestBody = this.transformer.transformRequest(options)
    
    const controller = this.createAbortController()
    const response = await fetch(`${this.baseUrl}/models/${model}:streamGenerateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Google AI API error: ${error}`)
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
            const transformed = transformer.transformStreamChunk(chunk)
            
            if (transformed) {
              controller.enqueue(new TextEncoder().encode(JSON.stringify(transformed) + '\n'))
              
              if (transformed.type === 'done') {
                controller.close()
                return
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
      const response = await fetch(`${this.baseUrl}/models?key=${apiKey}`, {
        signal: controller.signal
      })
      return response.ok
    } catch (error) {
      console.error('Error validating Google AI API key:', error)
      return false
    }
  }
}