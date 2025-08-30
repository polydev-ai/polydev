import { ApiHandler } from '../index'
import { ApiHandlerOptions } from '../../../types/providers'
import { OpenAITransformer } from '../transform'

export class OpenAIHandler implements ApiHandler {
  private transformer = new OpenAITransformer()
  private baseUrl = 'https://api.openai.com/v1'
  
  async createMessage(options: ApiHandlerOptions): Promise<Response> {
    const { apiKey, openAiBaseUrl } = options
    
    if (!apiKey) {
      throw new Error('API key is required for OpenAI')
    }
    
    const requestBody = this.transformer.transformRequest(options)
    requestBody.stream = false
    
    const endpoint = openAiBaseUrl || this.baseUrl
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${error}`)
    }
    
    return response
  }
  
  async streamMessage(options: ApiHandlerOptions): Promise<ReadableStream> {
    const { apiKey, openAiBaseUrl } = options
    
    if (!apiKey) {
      throw new Error('API key is required for OpenAI')
    }
    
    const requestBody = this.transformer.transformRequest(options)
    
    const endpoint = openAiBaseUrl || this.baseUrl
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
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
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      })
      
      return response.ok
    } catch (error) {
      console.error('Error validating OpenAI API key:', error)
      return false
    }
  }
}