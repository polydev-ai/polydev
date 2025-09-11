import { ApiHandlerOptions } from '../../../types/providers'
import { OpenAITransformer } from '../transform'

export class OpenAIHandler {
  private transformer = new OpenAITransformer()
  private baseUrl = 'https://api.openai.com/v1'
  
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
    const { apiKey, openAiBaseUrl, model } = options
    
    if (!apiKey) {
      throw new Error('API key is required for OpenAI')
    }
    
    // Use the model ID as provided (model name resolution is handled at the API route level)
    const requestBody = this.transformer.transformRequest(options)
    requestBody.stream = false
    
    const endpoint = openAiBaseUrl || this.baseUrl
    
    // GPT-5 models use the Responses API endpoint
    const isGPT5Model = model && (model === 'gpt-5' || model.includes('gpt-5'))
    const apiEndpoint = isGPT5Model ? '/responses' : '/chat/completions'
    
    const controller = this.createAbortController()
    const response = await fetch(`${endpoint}${apiEndpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${error}`)
    }
    
    return response
  }
  
  async streamMessage(options: ApiHandlerOptions): Promise<ReadableStream> {
    const { apiKey, openAiBaseUrl, model } = options
    
    if (!apiKey) {
      throw new Error('API key is required for OpenAI')
    }
    
    const requestBody = this.transformer.transformRequest(options)
    
    const endpoint = openAiBaseUrl || this.baseUrl
    
    // GPT-5 models use the Responses API endpoint
    const isGPT5Model = model && (model === 'gpt-5' || model.includes('gpt-5'))
    const apiEndpoint = isGPT5Model ? '/responses' : '/chat/completions'
    
    const controller = this.createAbortController()
    const response = await fetch(`${endpoint}${apiEndpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${error}`)
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
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        },
        signal: controller.signal
      })
      
      return response.ok
    } catch (error) {
      console.error('Error validating OpenAI API key:', error)
      return false
    }
  }
}