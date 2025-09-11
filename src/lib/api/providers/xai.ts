import { ApiHandler } from '../index'
import { ApiHandlerOptions } from '../../../types/providers'
import { OpenAITransformer } from '../transform'

export class XAIHandler implements ApiHandler {
  private transformer = new OpenAITransformer()
  private baseUrl = 'https://api.x.ai/v1'
  
  async createMessage(options: ApiHandlerOptions): Promise<Response> {
    const { apiKey } = options
    
    if (!apiKey) {
      throw new Error('API key is required for xAI')
    }
    
    const requestBody = this.transformer.transformRequest(options)
    requestBody.stream = false
    
        const controller = this.createAbortController()
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`xAI API error: ${error}`)
    }
    
    return response
  }
  
  async streamMessage(options: ApiHandlerOptions): Promise<ReadableStream> {
    const response = await this.createMessage({ ...options })
    return response.body || new ReadableStream()
  }
  
  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
          const controller = this.createAbortController()
    const response = await fetch(`${this.baseUrl}/models`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      
      return response.ok
    } catch { return false }
  }
}